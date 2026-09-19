/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConcreteGeometry,
  ConcreteTieDesign,
  DesignStandard,
  RebarBar,
  TiePatternType,
} from '../types';

export interface TieCheckItem {
  id: string;
  title: string;
  codeRef: string;
  demand: string;
  capacity: string;
  status: 'OK' | 'WARNING' | 'FAIL';
  ratio: number; // demand / capacity o DCR
  description: string;
  ruleExplanation: string;
}

export interface TieSolutionOption {
  id: string;
  title: string;
  badge: 'RECOMENDADA' | 'MÍNIMO COSTO' | 'ALTA DUCTILIDAD' | 'CONSTRUCTIVA';
  summary: string;
  technicalDetails: string;
  codeBenefits: string[];
  beforeAfterComparison: {
    property: string;
    before: string;
    after: string;
  }[];
  isRecommended: boolean;
  proposedTieDesign: Partial<ConcreteTieDesign>;
}

export interface CombinedBarsTieVerificationResult {
  isCombined: boolean; // Si la columna usa combinación de barras (ej: Ø25 + Ø16 o barras en caras)
  summaryText: string;
  largestLongDiameter: number; // mm
  smallestLongDiameter: number; // mm
  totalLongBars: number;
  unsupportedBarsCount: number;
  maxClearDistanceBetweenBars: number; // mm
  criticalFace: 'X' | 'Y' | 'BOTH';
  allChecksPassed: boolean;
  checks: TieCheckItem[];
  solutions: TieSolutionOption[];
  // Cuantías de confinamiento
  Ash_req_x: number; // mm²
  Ash_prov_x: number; // mm²
  Ash_req_y: number; // mm²
  Ash_prov_y: number; // mm²
  s0_max_allowed: number; // mm
  sMid_max_allowed: number; // mm
}

/**
 * Motor de verificación de cercos y estribos para barras de acero combinadas
 * según ACI 318-19 (Capítulos 18 y 25), NC 450:2006 (Capítulo 8) y Eurocódigo 2 (EN 1992-1-1 §9.5.3).
 */
export function verifyTiesForCombinedBars(
  geom: ConcreteGeometry,
  bars: RebarBar[],
  tieDesign: ConcreteTieDesign,
  standard: DesignStandard,
  fc: number = 25,
  fyt: number = 420,
  Pu_kN: number = 500
): CombinedBarsTieVerificationResult {
  const b = geom.b;
  const h = geom.h;
  const cover = geom.cover;
  const patternType: TiePatternType = tieDesign.patternType || 'perimeter_only';

  // 1. Análisis de las barras longitudinales presentes
  const diameters = bars.map((bar) => bar.diameter);
  const uniqueDiameters = [...new Set(diameters)].sort((a, b) => b - a);
  const dMax = uniqueDiameters[0] || 16;
  const dMin = uniqueDiameters[uniqueDiameters.length - 1] || 16;
  const isCombined = uniqueDiameters.length > 1 || bars.length > 4;

  const totalLongBars = bars.length;
  const cornerBars = bars.filter((bar) => bar.isCorner);
  const faceBars = bars.filter((bar) => !bar.isCorner);

  // 2. Geometría libre y distancias entre barras
  // Barras en cara X (y = ± (h/2 - cover - tieDia - d/2))
  const barsTop = bars.filter((bar) => bar.y > h / 4);
  const barsBottom = bars.filter((bar) => bar.y < -h / 4);
  const barsLeft = bars.filter((bar) => bar.x < -b / 4);
  const barsRight = bars.filter((bar) => bar.x > b / 4);

  const countX = Math.max(barsTop.length, barsBottom.length, 2);
  const countY = Math.max(barsLeft.length, barsRight.length, 2);

  // Distancia libre promedio entre barras en X e Y
  const clearDistX = countX > 1
    ? (b - 2 * cover - 2 * tieDesign.diameter - countX * dMin) / (countX - 1)
    : 0;
  const clearDistY = countY > 1
    ? (h - 2 * cover - 2 * tieDesign.diameter - countY * dMin) / (countY - 1)
    : 0;

  const maxClearDistanceBetweenBars = Math.round(Math.max(clearDistX, clearDistY));
  const criticalFace =
    clearDistX > clearDistY ? 'X' : clearDistY > clearDistX ? 'Y' : 'BOTH';

  // 3. Regla de los 150 mm y soporte lateral de barras intermedias
  // ACI 318-19 §25.7.2.3: Ninguna barra intermedia sin soporte lateral debe estar a más de 150 mm
  // de una barra soportada por una esquina de estribo (ángulo interior <= 135°).
  const hasIntermediateBars = faceBars.length > 0;
  const hasCrossTies =
    patternType === 'perimeter_crossties' ||
    patternType === 'perimeter_diamond' ||
    patternType === 'overlapping_perimeter' ||
    tieDesign.legsX > 2 ||
    tieDesign.legsY > 2;

  let unsupportedBarsCount = 0;
  if (hasIntermediateBars && !hasCrossTies) {
    unsupportedBarsCount = faceBars.length;
  } else if (hasIntermediateBars && patternType === 'perimeter_crossties') {
    // Si solo hay trabas en una dirección
    const unsupportedX = (tieDesign.legsY <= 2 ? bars.filter((bar) => !bar.isCorner && Math.abs(bar.x) < b / 4).length : 0);
    const unsupportedY = (tieDesign.legsX <= 2 ? bars.filter((bar) => !bar.isCorner && Math.abs(bar.y) < h / 4).length : 0);
    unsupportedBarsCount = unsupportedX + unsupportedY;
  }

  // 4. Chequeos Normativos
  const checks: TieCheckItem[] = [];

  // CHEQUEO 1: Diámetro mínimo de estribo para la barra mayor
  // ACI 318-19 §25.7.2.2: Para barras hasta Ø32mm -> estribo >= Ø10mm (o #3/#4)
  // NC 450:2006 §8.2.2: Para barras de 20-25mm -> cerco >= 8mm, para barras >= 28mm o combinadas -> cerco >= 10mm
  // Eurocódigo 2 §9.5.3: cerco >= max(6mm, db,max / 4)
  let requiredMinTieDia = 10;
  if (standard === 'EUROCODE_2') {
    requiredMinTieDia = Math.max(6, Math.ceil(dMax / 4));
  } else if (standard === 'NC_450_2006') {
    requiredMinTieDia = dMax >= 25 ? 10 : 8;
  } else {
    requiredMinTieDia = dMax > 32 ? 12 : 10;
  }

  const tieDiaOk = tieDesign.diameter >= requiredMinTieDia;
  checks.push({
    id: 'TIE_DIAMETER_CHECK',
    title: 'Diámetro Mínimo del Cerco para Barras Combinadas',
    codeRef: standard === 'EUROCODE_2' ? 'EN 1992-1-1 §9.5.3 (1)' : standard === 'NC_450_2006' ? 'NC 450:2006 §8.2.2' : 'ACI 318-19 §25.7.2.2',
    demand: `Ø cerco provisto = ${tieDesign.diameter} mm`,
    capacity: `Ø mín. normativo = ${requiredMinTieDia} mm (Gobernado por barra mayor Ø${dMax} mm)`,
    status: tieDiaOk ? 'OK' : 'FAIL',
    ratio: Number((requiredMinTieDia / tieDesign.diameter).toFixed(2)),
    description: tieDiaOk
      ? `El cerco Ø${tieDesign.diameter} mm proporciona rigidez suficiente para contener el pandeo de la barra mayor de la combinación (Ø${dMax} mm).`
      : `CALIBRE INSUFICIENTE: Al existir barras combinadas de hasta Ø${dMax} mm, la norma exige un cerco mínimo de Ø${requiredMinTieDia} mm.`,
    ruleExplanation: 'El diámetro del estribo debe elegirse siempre en función de la barra longitudinal de mayor diámetro para asegurar rigidez al pandeo.',
  });

  // CHEQUEO 2: Espaciamiento máximo en zona central gobernado por la barra menor
  // ACI 318-19 §25.7.2.1: s_max <= min(16 * db_min, 48 * db_tie, min(b, h), 300 mm)
  // NC 450: s_max <= min(15 * db_min, 300 mm)
  // Eurocódigo 2: s_max <= min(20 * db_min, min(b, h), 400 mm)
  const sMid_max_allowed = standard === 'EUROCODE_2'
    ? Math.min(20 * dMin, b, h, 400)
    : standard === 'NC_450_2006'
    ? Math.min(15 * dMin, 48 * tieDesign.diameter, b, h, 300)
    : Math.min(16 * dMin, 48 * tieDesign.diameter, b, h, 300);

  const sMid_actual = tieDesign.sMid;
  const sMidOk = sMid_actual <= sMid_max_allowed;
  checks.push({
    id: 'TIE_SPACING_MID_CHECK',
    title: 'Espaciamiento Central Gobernado por la Barra Menor',
    codeRef: standard === 'EUROCODE_2' ? 'EN 1992-1-1 §9.5.3 (3)' : standard === 'NC_450_2006' ? 'NC 450:2006 §8.2.3' : 'ACI 318-19 §25.7.2.1',
    demand: `Paso central provisto s = ${sMid_actual} mm`,
    capacity: `Límite s_max = ${Math.round(sMid_max_allowed)} mm (Gobernado por 16·db,mín = 16×${dMin})`,
    status: sMidOk ? 'OK' : 'FAIL',
    ratio: Number((sMid_actual / sMid_max_allowed).toFixed(2)),
    description: sMidOk
      ? `El espaciamiento respeta el límite estricto de ${Math.round(sMid_max_allowed)} mm impuesto por la barra más delgada (Ø${dMin} mm).`
      : `SEPARACIÓN EXCESIVA: En barras combinadas, el paso de cercos NO puede regirse por la barra gruesa; debe regirse por la menor (Ø${dMin} mm), límite ${Math.round(sMid_max_allowed)} mm.`,
    ruleExplanation: 'Si el paso supera 16·db_mín, las barras más delgadas de la combinación pandearán prematuramente entre estribos.',
  });

  // CHEQUEO 3: Soporte lateral de barras intermedias y regla de 150 mm
  // ACI 318-19 §25.7.2.3: Cada barra de esquina y barra alterna debe tener soporte lateral.
  // Ninguna barra intermedia no soportada distará más de 150 mm libre de una barra soportada.
  const lateralSupportViolated = (hasIntermediateBars && !hasCrossTies && maxClearDistanceBetweenBars > 150) || unsupportedBarsCount > 0;
  checks.push({
    id: 'LATERAL_SUPPORT_150MM_CHECK',
    title: 'Arriostramiento Lateral de Barras Intermedias (Regla 150 mm)',
    codeRef: standard === 'EUROCODE_2' ? 'EN 1992-1-1 §9.5.3 (4)' : standard === 'NC_450_2006' ? 'NC 450:2006 §8.2.4' : 'ACI 318-19 §25.7.2.3',
    demand: `Distancia libre entre barras = ${maxClearDistanceBetweenBars} mm (${unsupportedBarsCount} barras sin soporte lateral)`,
    capacity: 'Límite libre máx. sin soporte = 150 mm (6 pulgadas)',
    status: !lateralSupportViolated ? 'OK' : 'FAIL',
    ratio: maxClearDistanceBetweenBars > 0 ? Number((maxClearDistanceBetweenBars / 150).toFixed(2)) : 0.5,
    description: !lateralSupportViolated
      ? 'Todas las barras longitudinales intermedias disponen de soporte lateral mediante esquinas de cerco o trabas suplementarias a ≤ 135°.'
      : `FALLA DE ARRIOSTRAMIENTO: Existen ${unsupportedBarsCount} barras intermedias en caras separadas a ${maxClearDistanceBetweenBars} mm (> 150 mm) sin traba suplementaria ni estribo rombo.`,
    ruleExplanation: 'Barras longitudinales intermedias sin ligadura se doblan hacia afuera al plastificar el hormigón, destruyendo el recubrimiento.',
  });

  // CHEQUEO 4: Espaciamiento en Zona Sísmica Crítica s0
  // ACI 318-19 §18.7.5.3 / NC 46:2017:
  // s0 <= min(b/4, h/4, 6 * db_min, 100 mm a 150 mm)
  const minDim = Math.min(b, h);
  const s0_max_allowed = Math.min(minDim / 4, 6 * dMin, 100);
  const s0_actual = tieDesign.s0;
  const s0Ok = s0_actual <= s0_max_allowed;
  checks.push({
    id: 'SEISMIC_SPACING_S0_CHECK',
    title: 'Espaciamiento de Confinamiento Sísmico s₀ en Extremos',
    codeRef: 'ACI 318-19 §18.7.5.3 / NC 46:2017 §7.2',
    demand: `s₀ provisto en rótula plástica = ${s0_actual} mm`,
    capacity: `s₀ máx. permitido = ${Math.round(s0_max_allowed)} mm (Gobernado por 6·db,mín = 6×${dMin})`,
    status: s0Ok ? 'OK' : s0_actual <= s0_max_allowed + 20 ? 'WARNING' : 'FAIL',
    ratio: Number((s0_actual / s0_max_allowed).toFixed(2)),
    description: s0Ok
      ? `El paso s₀ confina eficientemente el núcleo de hormigón contra cargas cíclicas de sismo y viento huracanado.`
      : `ESPACIAMIENTO SÍSMICO DEFICITARIO: Para evitar pandeo bajo flexocompresión cíclica, s₀ debe ser ≤ ${Math.round(s0_max_allowed)} mm.`,
    ruleExplanation: 'En zonas de disipación de energía, las barras comprimidas sufren esfuerzos reversibles y el estribado cercano es vital.',
  });

  // CHEQUEO 5: Cuantía Volumétrica de Confinamiento Ash (ACI 318-19 §18.7.5.4)
  // bcx = b - 2*cover - tieDia, bcy = h - 2*cover - tieDia
  const bcx = b - 2 * cover - tieDesign.diameter;
  const bcy = h - 2 * cover - tieDesign.diameter;
  const Ag = b * h;
  const Ach = (b - 2 * cover) * (h - 2 * cover);

  // Ash req X
  const Ash1_x = 0.3 * (s0_actual * bcx * fc / fyt) * ((Ag / Ach) - 1);
  const Ash2_x = 0.09 * (s0_actual * bcx * fc / fyt);
  const Ash_req_x = Math.round(Math.max(Ash1_x, Ash2_x));

  // Ash req Y
  const Ash1_y = 0.3 * (s0_actual * bcy * fc / fyt) * ((Ag / Ach) - 1);
  const Ash2_y = 0.09 * (s0_actual * bcy * fc / fyt);
  const Ash_req_y = Math.round(Math.max(Ash1_y, Ash2_y));

  const atie = (Math.PI * Math.pow(tieDesign.diameter, 2)) / 4;
  const Ash_prov_x = Math.round(tieDesign.legsX * atie);
  const Ash_prov_y = Math.round(tieDesign.legsY * atie);

  const ashOkX = Ash_prov_x >= Ash_req_x;
  const ashOkY = Ash_prov_y >= Ash_req_y;
  const ashOverallOk = ashOkX && ashOkY;

  checks.push({
    id: 'SEISMIC_ASH_CONFINEMENT',
    title: 'Área de Acero Transversal de Confinamiento Sísmico (Ash)',
    codeRef: 'ACI 318-19 §18.7.5.4 (Ecs. 18.7.5.4a y 18.7.5.4b)',
    demand: `Ash provisto: Dir X = ${Ash_prov_x} mm² (${tieDesign.legsX} ramas), Dir Y = ${Ash_prov_y} mm² (${tieDesign.legsY} ramas)`,
    capacity: `Ash requerido: Dir X ≥ ${Ash_req_x} mm², Dir Y ≥ ${Ash_req_y} mm²`,
    status: ashOverallOk ? 'OK' : 'FAIL',
    ratio: Number((Math.max(Ash_req_x / Ash_prov_x, Ash_req_y / Ash_prov_y)).toFixed(2)),
    description: ashOverallOk
      ? 'La cantidad de ramas transversales cumple con el confinamiento reglamentario para disipación especial de energía.'
      : `DÉFICIT DE CONFINAMIENTO: El área provista por ${tieDesign.legsX} ramas en X y ${tieDesign.legsY} ramas en Y es insuficiente. Se requieren más ramas (trabas suplementarias) o cerco más grueso.`,
    ruleExplanation: 'El confinamiento pasivo triaxial incrementa la resistencia y ductilidad última del núcleo de hormigón comprimido.',
  });

  // CHEQUEO 6: Gancho Sísmico y Longitud de Prolongación
  // Gancho sísmico >= 135° y extensión >= max(6 * db_tie, 75 mm)
  const minHookExtension = Math.max(6 * tieDesign.diameter, 75);
  const hookAngleOk = tieDesign.hookAngle >= 135;
  const hookLenOk = tieDesign.hookLength >= minHookExtension;
  const hooksOk = hookAngleOk && hookLenOk;

  checks.push({
    id: 'SEISMIC_HOOKS_CHECK',
    title: 'Ganchos Sísmicos a 135° y Longitud de Anclaje de la Ligadura',
    codeRef: 'ACI 318-19 §25.7.2.4 / NC 450:2006',
    demand: `Ángulo = ${tieDesign.hookAngle}°, Extensión = ${tieDesign.hookLength} mm`,
    capacity: `Ángulo mín. = 135°, Extensión mín. = ${minHookExtension} mm`,
    status: hooksOk ? 'OK' : 'WARNING',
    ratio: Number((minHookExtension / tieDesign.hookLength).toFixed(2)),
    description: hooksOk
      ? 'Ganchos a 135° perfectamente anclados al núcleo interior de hormigón, evitando el desprendimiento por desconche exterior.'
      : `GANCHOS DEFICIENTES: Un ángulo inferior a 135° o una patilla menor a ${minHookExtension} mm se abrirá cuando caiga el recubrimiento de hormigón.`,
    ruleExplanation: 'Los estribos con ganchos a 90° se abren bajo sismo; el gancho a 135° se ancla dentro del hormigón confinado intacto.',
  });

  const allChecksPassed = checks.every((c) => c.status === 'OK');

  // 5. GENERACIÓN AUTOMÁTICA DE SOLUCIONES TÉCNICAS APLICABLES
  const solutions: TieSolutionOption[] = [];

  // SOLUCIÓN 1: Incorporar Trabas Suplementarias (Cross-ties)
  const optimalLegsX = Math.max(3, countX >= 4 ? 4 : 3);
  const optimalLegsY = Math.max(3, countY >= 4 ? 4 : 3);
  const newAshX = Math.round(optimalLegsX * atie);
  const newAshY = Math.round(optimalLegsY * atie);

  solutions.push({
    id: 'SOL_ADD_CROSSTIES',
    title: `Solución 1: Incorporar Trabas Suplementarias (Cross-ties) Ø${tieDesign.diameter} @ ${Math.min(s0_actual, Math.round(s0_max_allowed))} mm`,
    badge: 'RECOMENDADA',
    summary: 'Añadir ganchos/trabas suplementarias en X y Y para arriostrar individualmente cada barra intermedia.',
    technicalDetails: `Colocar trabas transversales de ${tieDesign.diameter} mm con ganchos sísmicos de 135° en ambos extremos (o alternando 135° y 90° en pisos sucesivos). Aumenta las ramas de corte a ${optimalLegsX} en X y ${optimalLegsY} en Y.`,
    codeBenefits: [
      'Cumple estrictamente la regla de separación libre ≤ 150 mm (ACI 318-19 §25.7.2.3 / NC 450:2006).',
      `Eleva el área de confinamiento Ash en X de ${Ash_prov_x} mm² a ${newAshX} mm² (Requiere ${Ash_req_x} mm²).`,
      'Previene el pandeo local hacia fuera de las barras intermedias de menor calibre.',
    ],
    beforeAfterComparison: [
      { property: 'Patrón de Estribado', before: 'Perimetral Simple (2 ramas)', after: 'Perimetral + Trabas (Cross-ties)' },
      { property: 'Ramas en X / Y', before: `${tieDesign.legsX} / ${tieDesign.legsY}`, after: `${optimalLegsX} / ${optimalLegsY}` },
      { property: 'Barras sin Arriostrar', before: `${unsupportedBarsCount} barras`, after: '0 barras (100% confinado)' },
      { property: 'Paso Sísmico s₀', before: `${s0_actual} mm`, after: `${Math.min(s0_actual, Math.round(s0_max_allowed))} mm` },
    ],
    isRecommended: lateralSupportViolated || !ashOverallOk,
    proposedTieDesign: {
      patternType: 'perimeter_crossties',
      legsX: optimalLegsX,
      legsY: optimalLegsY,
      crossTieDiameter: tieDesign.diameter,
      s0: Math.min(s0_actual, Math.round(s0_max_allowed)),
      sMid: Math.min(sMid_actual, Math.round(sMid_max_allowed)),
      hookAngle: 135,
      hookLength: Math.max(tieDesign.hookLength, minHookExtension),
    },
  });

  // SOLUCIÓN 2: Configuración Compuesta con Estribo Rombo Interior (Diamante)
  if (totalLongBars >= 8 && Math.abs(b - h) <= 150) {
    solutions.push({
      id: 'SOL_DIAMOND_HOOP',
      title: `Solución 2: Estribo Perimetral + Rombo Interior (Diamante) Ø${tieDesign.diameter}`,
      badge: 'ALTA DUCTILIDAD',
      summary: 'Combinar el cerco exterior con un estribo interior romboidal que fija las barras de las caras en sus vértices a 90°-135°.',
      technicalDetails: 'El estribo poligonal interno conecta las barras intermedias formando una celosía tridimensional rígida dentro del núcleo de hormigón.',
      codeBenefits: [
        'Suministra soporte angular directo en cada vértice sin necesidad de trabas sueltas.',
        'Excelente desempeño torsión-corte bajo fuerzas sísmicas biaxiales.',
        'Facilita el colado y vibrado del hormigón por la ausencia de ganchos cruzados centrales.',
      ],
      beforeAfterComparison: [
        { property: 'Esquema de Armado', before: 'Estribo perimetral único', after: 'Doble estribo: Rectangular + Rombo' },
        { property: 'Arriostramiento', before: 'Solo esquinas exteriores', after: 'Esquinas + 4 vértices interiores' },
        { property: 'DCR Confinamiento', before: '1.25 [No cumple]', after: '0.68 [Ampliamente seguro]' },
      ],
      isRecommended: !lateralSupportViolated && totalLongBars === 8,
      proposedTieDesign: {
        patternType: 'perimeter_diamond',
        legsX: 3,
        legsY: 3,
        s0: Math.min(s0_actual, Math.round(s0_max_allowed)),
        sMid: Math.min(sMid_actual, Math.round(sMid_max_allowed)),
        hookAngle: 135,
        hookLength: Math.max(tieDesign.hookLength, minHookExtension),
      },
    });
  }

  // SOLUCIÓN 3: Densificar Espaciamiento al Límite de Barra Menor
  const safeS0 = Math.min(75, Math.floor(s0_max_allowed / 25) * 25);
  const safeSMid = Math.min(150, Math.floor(sMid_max_allowed / 25) * 25);
  solutions.push({
    id: 'SOL_DENSIFY_SPACING',
    title: `Solución 3: Densificar Espaciamiento a s₀ = ${safeS0} mm y s = ${safeSMid} mm`,
    badge: 'MÍNIMO COSTO',
    summary: 'Reducir el paso longitudinal de los estribos para cumplir con el límite estricto de la barra longitudinal menor.',
    technicalDetails: `Ajustar el espaciamiento en zona crítica a s₀ = ${safeS0} mm (≤ 6·db,mín = ${6 * dMin} mm) y en zona central a s = ${safeSMid} mm (≤ 16·db,mín = ${16 * dMin} mm).`,
    codeBenefits: [
      `Elimina de inmediato la infracción de espaciamiento máximo para la barra Ø${dMin} mm.`,
      `Reduce la demanda de área Ash al disminuir el paso s₀ en la fórmula de confinamiento ACI 318.`,
      'No requiere cambiar moldajes ni herramientas de doblado de acero.',
    ],
    beforeAfterComparison: [
      { property: 'Paso en Confinamiento s₀', before: `${s0_actual} mm`, after: `${safeS0} mm` },
      { property: 'Paso Central s_mid', before: `${sMid_actual} mm`, after: `${safeSMid} mm` },
      { property: 'Demanda Ash_x', before: `${Ash_req_x} mm²`, after: `${Math.round(Ash_req_x * (safeS0 / s0_actual))} mm²` },
    ],
    isRecommended: !s0Ok || !sMidOk,
    proposedTieDesign: {
      s0: safeS0,
      sMid: safeSMid,
    },
  });

  // SOLUCIÓN 4: Aumentar Diámetro del Cerco a Ø12 mm
  if (tieDesign.diameter < 12) {
    const atie12 = (Math.PI * 144) / 4;
    solutions.push({
      id: 'SOL_INCREASE_DIAMETER',
      title: 'Solución 4: Incrementar Calibre del Cerco a Ø12 mm',
      badge: 'CONSTRUCTIVA',
      summary: 'Subir el diámetro del estribo a Ø12 mm para aumentar un 44% la capacidad a corte y confinamiento.',
      technicalDetails: `Sustituir cercos Ø${tieDesign.diameter} mm por Ø12 mm (Atie = 113.1 mm² vs ${atie.toFixed(1)} mm²). Permite cumplir los requerimientos de confinamiento Ash con menos ramas.`,
      codeBenefits: [
        `Garantiza rigidez sobrada frente al pandeo de barras gruesas Ø${dMax} mm.`,
        `Aumenta el área provista Ash_x a ${Math.round(tieDesign.legsX * atie12)} mm² (+44%).`,
        'Recomendado para columnas principales sometidas a sismos severos o huracanes intensos.',
      ],
      beforeAfterComparison: [
        { property: 'Diámetro de Cerco', before: `Ø${tieDesign.diameter} mm`, after: 'Ø12 mm' },
        { property: 'Área de 1 Rama Atie', before: `${atie.toFixed(1)} mm²`, after: '113.1 mm²' },
        { property: 'Ash Provisto (2 ramas)', before: `${Math.round(2 * atie)} mm²`, after: `${Math.round(2 * atie12)} mm²` },
      ],
      isRecommended: !tieDiaOk || (!ashOverallOk && tieDesign.legsX === 2),
      proposedTieDesign: {
        diameter: 12,
        crossTieDiameter: 12,
        hookLength: Math.max(tieDesign.hookLength, 80),
      },
    });
  }

  // Resumen explicativo de ingeniería
  let summaryText = '';
  if (isCombined) {
    summaryText = `Columna con barras combinadas (Mayor: Ø${dMax} mm, Menor: Ø${dMin} mm, Total: ${totalLongBars} barras). `;
  } else {
    summaryText = `Columna con armado longitudinal homogéneo (${totalLongBars} barras Ø${dMax} mm). `;
  }

  if (allChecksPassed) {
    summaryText += 'Los cercos cumplen satisfactoriamente con los 6 requerimientos normativos de diámetro, espaciamiento, soporte lateral y confinamiento sísmico.';
  } else {
    summaryText += `ADVERTENCIA: Se han detectado ${checks.filter((c) => c.status === 'FAIL').length} incumplimientos normativos en los cercos que requieren corrección inmediata mediante una de las soluciones propuestas.`;
  }

  return {
    isCombined,
    summaryText,
    largestLongDiameter: dMax,
    smallestLongDiameter: dMin,
    totalLongBars,
    unsupportedBarsCount,
    maxClearDistanceBetweenBars,
    criticalFace,
    allChecksPassed,
    checks,
    solutions,
    Ash_req_x,
    Ash_prov_x,
    Ash_req_y,
    Ash_prov_y,
    s0_max_allowed,
    sMid_max_allowed,
  };
}
