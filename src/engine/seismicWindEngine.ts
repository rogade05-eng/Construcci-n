/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColumnLoads, ConcreteGeometry, ConcreteTieDesign, DesignStandard, MaterialType, SteelProfileData, SteelProperties, WoodProperties } from '../types';

// ============================================================================
// DEFINICIÓN DE TIPOS Y PARÁMETROS SÍSMICOS Y DE VIENTO
// ============================================================================

export type SeismicZoneCuba = 'ZONA_5' | 'ZONA_4' | 'ZONA_3' | 'ZONA_2' | 'ZONA_1';

export type SoilType = 'SUELO_A' | 'SUELO_B' | 'SUELO_C' | 'SUELO_D';

export type ImportanceCategory = 'ESENCIAL' | 'IMPORTANTE' | 'ORDINARIO' | 'MENOR';

export type WindZoneCuba = 'ZONA_VIENTO_I' | 'ZONA_VIENTO_II' | 'ZONA_VIENTO_III' | 'ZONA_COSTERA_EXTREMA';

export type TerrainCategory = 'TERRENO_A' | 'TERRENO_B' | 'TERRENO_C';

export type DuctilityLevel = 'ALTA' | 'MEDIA' | 'BAJA';

export interface SeismicParameters {
  zone: SeismicZoneCuba;
  soil: SoilType;
  importance: ImportanceCategory;
  ductility: DuctilityLevel;
  R: number; // Factor de comportamiento sísmico R (o q)
  I: number; // Factor de importancia
  ag: number; // Aceleración máxima del suelo (g)
  tributaryWeightKN: number; // Peso sísmico tributario sobre la columna W (kN)
}

export interface WindParameters {
  zone: WindZoneCuba;
  terrain: TerrainCategory;
  V0: number; // Velocidad básica del viento (m/s)
  tributaryWidthM: number; // Ancho tributario de fachada (m)
  Cd: number; // Factor de ráfaga
  Cp: number; // Coeficiente aerodinámico neto
}

export interface SpectrumPoint {
  T: number; // Período (s)
  Sa_elastic: number; // Aceleración espectral elástica Sa (g)
  Sa_design: number; // Aceleración espectral de diseño Sd = Sa * I / R (g)
}

export interface LoadCombinationEvaluation {
  id: string;
  name: string;
  codeFormula: string;
  Pu: number; // kN (+ compresión, - tracción)
  Mux: number; // kN·m
  Vux: number; // kN
  dcr: number;
  isSafe: boolean;
  governingReason: string;
}

export interface SeismicWindVerificationResult {
  isSafe: boolean; // Cumplimiento global ante sismo y viento (DCR <= 1.0 y sin fallas críticas)
  maxDcr: number; // Relación Demanda/Capacidad crítica de las combinaciones
  // Parámetros calculados
  periodT1: number; // Período fundamental aproximado (s)
  Sa_T1: number; // Aceleración espectral en T1 (g)
  Cs: number; // Coeficiente sísmico de diseño Cs
  seismicShearVe: number; // Cortante sísmico actuante en la columna (kN)
  seismicMomentMe: number; // Momento sísmico en base de columna (kN·m)

  // Viento
  q10: number; // Presión dinámica básica (kN/m²)
  qz: number; // Presión neta de viento a la altura L (kN/m²)
  windForceFw: number; // Fuerza total de viento en la columna (kN)
  windMomentMw: number; // Momento por viento en base (kN·m)
  windUpliftKN: number; // Tracción por succión/vuelco (kN)

  // Espectro de diseño
  spectrumPoints: SpectrumPoint[];

  // Evaluaciones de combinaciones
  combinations: LoadCombinationEvaluation[];
  governingCombination: LoadCombinationEvaluation;

  // Verificaciones específicas de seguridad
  checks: {
    id: string;
    title: string;
    standardRef: string;
    demand: string;
    capacity: string;
    ratio: number;
    status: 'OK' | 'WARNING' | 'DANGER';
    description: string;
  }[];

  // Recomendaciones técnicas de diseño
  recommendations: {
    category: 'SEISMIC_CONFINEMENT' | 'WIND_ANCHORAGE' | 'STEEL_COMPACTNESS' | 'TIMBER_CONNECTORS' | 'GENERAL_DRIFT';
    title: string;
    priority: 'ALTA' | 'MEDIA' | 'INFORMATIVA';
    message: string;
    actionItem: string;
  }[];
}

// ============================================================================
// VALORES DE REFERENCIA NORMATIVA CUBANA (NC 46:2017 & NC 285:2003)
// ============================================================================

export const SEISMIC_ZONES_CUBA: Record<SeismicZoneCuba, { name: string; ag: number; description: string }> = {
  ZONA_5: {
    name: 'Zona 5 (Santiago de Cuba - Falla Oriente)',
    ag: 0.35,
    description: 'Sismicidad Muy Alta. Aceleración máxima del terreno ag = 0.35g. Falla transformante Bartlett-Caimán.',
  },
  ZONA_4: {
    name: 'Zona 4 (Guantánamo, Granma, Pilón)',
    ag: 0.25,
    description: 'Sismicidad Alta. Aceleración ag = 0.25g. Requiere diseño sismorresistente estricto.',
  },
  ZONA_3: {
    name: 'Zona 3 (Holguín, Las Tunas)',
    ag: 0.15,
    description: 'Sismicidad Moderada. Aceleración ag = 0.15g.',
  },
  ZONA_2: {
    name: 'Zona 2 (Camagüey, Ciego de Ávila, Cienfuegos, Villa Clara)',
    ag: 0.08,
    description: 'Sismicidad Baja. Aceleración ag = 0.08g.',
  },
  ZONA_1: {
    name: 'Zona 1 (La Habana, Matanzas, Pinar del Río, Mayabeque)',
    ag: 0.05,
    description: 'Sismicidad Muy Baja / Intraplaca. Aceleración ag = 0.05g.',
  },
};

export const SOIL_PROPERTIES: Record<SoilType, { name: string; S: number; TB: number; TC: number; TD: number; description: string }> = {
  SUELO_A: {
    name: 'Suelo A (Roca sana compacta)',
    S: 1.0,
    TB: 0.08,
    TC: 0.30,
    TD: 2.0,
    description: 'Roca no intemperizada (vs > 800 m/s). No amplifica aceleraciones.',
  },
  SUELO_B: {
    name: 'Suelo B (Roca blanda o suelo muy denso)',
    S: 1.15,
    TB: 0.10,
    TC: 0.40,
    TD: 2.2,
    description: 'Gravas muy compactas o tobas consolidadas (vs = 400 - 800 m/s).',
  },
  SUELO_C: {
    name: 'Suelo C (Suelo denso o arcilla firme)',
    S: 1.35,
    TB: 0.15,
    TC: 0.60,
    TD: 2.5,
    description: 'Arenas densas o arcillas rígidas de consistencia media (vs = 200 - 400 m/s). Muy común.',
  },
  SUELO_D: {
    name: 'Suelo D (Suelo blando / arenas sueltas)',
    S: 1.65,
    TB: 0.20,
    TC: 0.85,
    TD: 3.0,
    description: 'Limos blandos, turba o depósitos aluviales (vs < 200 m/s). Alta amplificación sísmica.',
  },
};

export const WIND_ZONES_CUBA: Record<WindZoneCuba, { name: string; V0: number; description: string }> = {
  ZONA_VIENTO_I: {
    name: 'Zona I (Costa Norte y Occidente - Huracanes Cat. 4/5)',
    V0: 60.0,
    description: 'Velocidad básica V0 = 60 m/s (216 km/h). Zonas costeras de La Habana, Matanzas, Villa Clara y Pinar del Río.',
  },
  ZONA_VIENTO_II: {
    name: 'Zona II (Interior Centro-Occidental)',
    V0: 50.0,
    description: 'Velocidad básica V0 = 50 m/s (180 km/h). Llanuras centrales de Cuba.',
  },
  ZONA_VIENTO_III: {
    name: 'Zona III (Región Oriental Interior)',
    V0: 45.0,
    description: 'Velocidad básica V0 = 45 m/s (162 km/h). Zonas protegidas por orografía en Oriente.',
  },
  ZONA_COSTERA_EXTREMA: {
    name: 'Zona Extrema (Cayería Norte y Penínsulas expuestas)',
    V0: 65.0,
    description: 'Velocidad básica V0 = 65 m/s (234 km/h). Cayo Coco, Cayo Santa María, Varadero extremo.',
  },
};

// ============================================================================
// MOTOR DE CÁLCULO SÍSMICO Y EÓLICO INTEGRADO
// ============================================================================

export function verifySeismicAndWind(
  material: MaterialType,
  standard: DesignStandard,
  colLengthM: number,
  baseLoads: ColumnLoads,
  seismicParams: SeismicParameters,
  windParams: WindParameters,
  sectionProps: {
    b: number; // mm
    h: number; // mm
    fc?: number; // MPa
    Fy?: number; // MPa
    steelProfile?: SteelProfileData;
    concreteGeom?: ConcreteGeometry;
    tieDesign?: ConcreteTieDesign;
    woodProps?: WoodProperties;
    phiPnMax: number;
    phiMnx: number;
    phiVn: number;
  }
): SeismicWindVerificationResult {
  const { zone, soil, importance, ductility, tributaryWeightKN } = seismicParams;
  const { V0, tributaryWidthM, Cd, Cp } = windParams;

  const soilData = SOIL_PROPERTIES[soil];
  const S = soilData.S;
  const TB = soilData.TB;
  const TC = soilData.TC;
  const TD = soilData.TD;

  const ag = SEISMIC_ZONES_CUBA[zone].ag;

  // Factor de importancia I
  let I = 1.0;
  if (importance === 'ESENCIAL') I = 1.5;
  else if (importance === 'IMPORTANTE') I = 1.25;
  else if (importance === 'MENOR') I = 0.8;

  // Factor de ductilidad R según material y nivel
  let R = seismicParams.R;
  if (!R || R <= 1) {
    if (material === 'concrete') {
      R = ductility === 'ALTA' ? 6.0 : ductility === 'MEDIA' ? 4.0 : 2.5;
    } else if (material === 'steel') {
      R = ductility === 'ALTA' ? 8.0 : ductility === 'MEDIA' ? 5.0 : 3.0;
    } else {
      R = ductility === 'ALTA' ? 4.0 : ductility === 'MEDIA' ? 2.5 : 1.5;
    }
  }

  // 1. ESTIMACIÓN DEL PERÍODO FUNDAMENTAL T1 (NC 46:2017 & ACI 318)
  // T1 aprox = Ct * H^(3/4)
  const Ct = material === 'steel' ? 0.085 : material === 'concrete' ? 0.075 : 0.05;
  const periodT1 = Number((Ct * Math.pow(colLengthM * 2.5, 0.75)).toFixed(3)); // asumimos pórtico de aprox 2.5 pisos o altura equivalente

  // 2. CONSTRUCCIÓN DEL ESPECTRO DE RESPUESTA ELÁSTICO E INELÁSTICO
  // Sa_max = 2.5 * ag * S
  const Sa_plateau = 2.5 * ag * S;
  const spectrumPoints: SpectrumPoint[] = [];

  const tValues = [0, 0.05, TB, (TB + TC) / 2, TC, 0.8, 1.0, 1.2, 1.5, 2.0, TD, 3.5, 4.0];
  tValues.sort((a, b) => a - b);

  let Sa_T1 = 0;

  for (const T of tValues) {
    let Sa_el = 0;
    if (T < TB) {
      Sa_el = ag * S * (1 + (T / TB) * (2.5 - 1));
    } else if (T <= TC) {
      Sa_el = Sa_plateau;
    } else if (T <= TD) {
      Sa_el = Sa_plateau * (TC / T);
    } else {
      Sa_el = Sa_plateau * (TC * TD) / Math.pow(T, 2);
    }

    const Sa_des = (Sa_el * I) / R;
    spectrumPoints.push({
      T: Number(T.toFixed(2)),
      Sa_elastic: Number(Sa_el.toFixed(3)),
      Sa_design: Number(Sa_des.toFixed(3)),
    });
  }

  // Interpolar Sa para T1
  if (periodT1 <= TB) {
    Sa_T1 = ag * S * (1 + (periodT1 / TB) * (2.5 - 1));
  } else if (periodT1 <= TC) {
    Sa_T1 = Sa_plateau;
  } else if (periodT1 <= TD) {
    Sa_T1 = Sa_plateau * (TC / periodT1);
  } else {
    Sa_T1 = Sa_plateau * (TC * TD) / Math.pow(periodT1, 2);
  }

  // Coeficiente Sísmico de Diseño Cs
  const Cs = Number(((Sa_T1 * I) / R).toFixed(4));

  // Cortante sísmico basal atribuible Ve = Cs * Wtrib
  const seismicShearVe = Number((Cs * tributaryWeightKN).toFixed(1));

  // Momento sísmico en el extremo de la columna: Me = Ve * colLengthM / 2 (pórtico doble empotramiento)
  const seismicMomentMe = Number((seismicShearVe * (colLengthM / 2)).toFixed(1));

  // 3. ANÁLISIS DE FUERZAS DE VIENTO SEGÚN NC 285:2003 / EUROCÓDIGO 1
  // Presión básica q10 = 0.5 * rho * V0^2 (rho = 1.225 kg/m3) -> q10 (kN/m2) = 0.613 * V0^2 * 10^-3
  const q10 = Number((0.613 * Math.pow(V0, 2) * 0.001).toFixed(3)); // kN/m²

  // Coeficiente de altura cz según categoría de terreno
  let cz = 1.0;
  if (windParams.terrain === 'TERRENO_A') {
    cz = 1.15 + 0.15 * Math.log10(Math.max(colLengthM, 3) / 10);
  } else if (windParams.terrain === 'TERRENO_B') {
    cz = 1.0 + 0.12 * Math.log10(Math.max(colLengthM, 3) / 10);
  } else {
    cz = 0.85 + 0.10 * Math.log10(Math.max(colLengthM, 3) / 10);
  }
  cz = Math.max(0.85, cz);

  // Presión neta de viento qz = q10 * cz * Cd * Cp
  const qz = Number((q10 * cz * Cd * Cp).toFixed(3)); // kN/m²

  // Carga total de viento en la columna: Fw = qz * tributaryWidthM * colLengthM
  const windForceFw = Number((qz * tributaryWidthM * colLengthM).toFixed(1)); // kN

  // Momento por viento en columna Mw = Fw * colLengthM / 4 (aproximación para marco continuo)
  const windMomentMw = Number(((windForceFw * colLengthM) / 4).toFixed(1)); // kN·m

  // Succión vertical por viento / Uplift (sobre cubierta tributaria)
  const tributaryRoofAreaM2 = tributaryWidthM * 5.0; // 5m de crujía tributaria
  const windUpliftKN = Number((qz * 0.8 * tributaryRoofAreaM2).toFixed(1));

  // 4. EVALUACIÓN DE LAS 5 COMBINACIONES DE CARGA ULS
  // Suponemos que baseLoads.Pu proviene de una estimación típica D + L
  // Dividimos la carga de gravedad en D (65%) y L (35%)
  const D_axial = baseLoads.Pu * 0.65;
  const L_axial = baseLoads.Pu * 0.35;
  const D_Mux = baseLoads.Mux * 0.65;
  const L_Mux = baseLoads.Mux * 0.35;
  const D_Vux = baseLoads.Vux * 0.65;

  const combos: LoadCombinationEvaluation[] = [
    {
      id: 'COMB_1_GRAVITY',
      name: 'Comb. 1: Gravitatoria Pura (1.2 D + 1.6 L)',
      codeFormula: '1.2·D + 1.6·L',
      Pu: Math.round(1.2 * D_axial + 1.6 * L_axial),
      Mux: Math.round(1.2 * D_Mux + 1.6 * L_Mux),
      Vux: Math.round(1.2 * D_Vux + 1.6 * (baseLoads.Vux * 0.35)),
      dcr: 0,
      isSafe: true,
      governingReason: 'Cargas gravitatorias de ocupación máxima sin sismo ni huracán.',
    },
    {
      id: 'COMB_2_SEISMIC_MAX',
      name: 'Comb. 2: Sismo Máxima Compresión (1.2 D + 1.0 E + 1.0 L)',
      codeFormula: '1.2·D + 1.0·E + 1.0·L',
      Pu: Math.round(1.2 * D_axial + 1.0 * L_axial + seismicShearVe * 0.2), // efecto axial inducido
      Mux: Math.round(1.2 * D_Mux + 1.0 * L_Mux + seismicMomentMe),
      Vux: Math.round(1.2 * D_Vux + seismicShearVe),
      dcr: 0,
      isSafe: true,
      governingReason: 'Efecto sísmico máximo de diseño sumado a compresión axial plena.',
    },
    {
      id: 'COMB_3_SEISMIC_UPLIFT',
      name: 'Comb. 3: Sismo Deslastre / Vuelco (0.9 D - 1.0 E)',
      codeFormula: '0.9·D - 1.0·E',
      Pu: Math.max(0, Math.round(0.9 * D_axial - seismicShearVe * 0.2)),
      Mux: Math.round(0.9 * D_Mux + seismicMomentMe),
      Vux: Math.round(seismicShearVe),
      dcr: 0,
      isSafe: true,
      governingReason: 'Tracción o compresión mínima con máximo momento sísmico (riesgo de falla por tracción o volcamiento).',
    },
    {
      id: 'COMB_4_WIND_LATERAL',
      name: 'Comb. 4: Viento Huracanado Lateral (1.2 D + 1.0 W + 1.0 L)',
      codeFormula: '1.2·D + 1.0·W + 1.0·L',
      Pu: Math.round(1.2 * D_axial + 1.0 * L_axial),
      Mux: Math.round(1.2 * D_Mux + 1.0 * L_Mux + windMomentMw),
      Vux: Math.round(1.2 * D_Vux + windForceFw / 2),
      dcr: 0,
      isSafe: true,
      governingReason: 'Fuerza de ráfaga extrema por huracán con flexión biaxial severa.',
    },
    {
      id: 'COMB_5_WIND_UPLIFT',
      name: 'Comb. 5: Viento Succión y Vuelco (0.9 D - 1.0 W)',
      codeFormula: '0.9·D - 1.0·W',
      Pu: Math.round(0.9 * D_axial - windUpliftKN),
      Mux: Math.round(0.9 * D_Mux + windMomentMw),
      Vux: Math.round(windForceFw / 2),
      dcr: 0,
      isSafe: true,
      governingReason: 'Succión aerodinámica de huracán que aligera la columna y causa tracción en anclajes.',
    },
  ];

  // Evaluar DCR aproximado de cada combinación contra capacidades nominales reducidas
  const phiPn = Math.max(1, sectionProps.phiPnMax);
  const phiMn = Math.max(1, sectionProps.phiMnx);
  const phiVn = Math.max(1, sectionProps.phiVn);

  let maxDcr = 0;
  let governingCombination = combos[0];

  for (const c of combos) {
    const axialRatio = c.Pu / phiPn;
    const flexRatio = c.Mux / phiMn;
    const shearRatio = c.Vux / phiVn;

    // Interacción combinada P-M y cortante
    let comboDcr = 0;
    if (material === 'concrete') {
      comboDcr = Math.sqrt(Math.pow(axialRatio, 2) + Math.pow(flexRatio, 2));
    } else if (material === 'steel') {
      comboDcr = axialRatio >= 0.2 ? axialRatio + (8 / 9) * flexRatio : axialRatio / 2 + flexRatio;
    } else {
      comboDcr = axialRatio + flexRatio;
    }
    comboDcr = Math.max(comboDcr, shearRatio);
    c.dcr = Number(comboDcr.toFixed(3));
    c.isSafe = comboDcr <= 1.0;

    if (comboDcr > maxDcr) {
      maxDcr = comboDcr;
      governingCombination = c;
    }
  }

  // 5. COMPROBACIONES DE SEGURIDAD ESPECÍFICAS
  const checks: SeismicWindVerificationResult['checks'] = [];
  const recommendations: SeismicWindVerificationResult['recommendations'] = [];

  // Check A: Cortante Sísmico vs Resistencia a Cortante (ACI 318 Cap. 18 / NC 450)
  const shearDemand = governingCombination.Vux;
  const shearCapacity = phiVn;
  const shearDcr = Number((shearDemand / shearCapacity).toFixed(3));
  const shearOk = shearDcr <= 1.0;

  checks.push({
    id: 'SEISMIC_SHEAR',
    title: 'Resistencia a Cortante Bajo Solicitación Sísmica y Viento (Vu ≤ φVn)',
    standardRef: standard === 'EUROCODE_2' ? 'EN 1998-1 §5.4.2' : standard === 'NC_450_2006' ? 'NC 450 / NC 46' : 'ACI 318-19 §18.7.6',
    demand: `Vu,max = ${shearDemand} kN (${governingCombination.name})`,
    capacity: `φVn = ${shearCapacity.toFixed(1)} kN`,
    ratio: shearDcr,
    status: shearOk ? 'OK' : 'DANGER',
    description: shearOk
      ? 'La capacidad a cortante provista por el hormigón y estribos/perfil supera el cortante máximo generado por el sismo o viento.'
      : 'FALLA POR CORTANTE SÍSMICO: Se requiere densificar estribos transversales o aumentar la sección transversal.',
  });

  if (!shearOk) {
    recommendations.push({
      category: 'SEISMIC_CONFINEMENT',
      title: 'Déficit de Resistencia a Cortante Sísmico',
      priority: 'ALTA',
      message: `El cortante mayorado Vu = ${shearDemand} kN supera la capacidad φVn = ${shearCapacity.toFixed(1)} kN en la combinación sísmica/viento.`,
      actionItem: 'Reducir la separación de estribos s (ej: colocar cercos a 75-100 mm) o aumentar diámetro a Ø12 mm.',
    });
  }

  // Check B: Requisitos de Confinamiento Sísmico en Hormigón (ACI 318-19 / NC 46)
  if (material === 'concrete' && sectionProps.concreteGeom && sectionProps.tieDesign) {
    const minDim = Math.min(sectionProps.concreteGeom.b, sectionProps.concreteGeom.h);
    const s0_actual = sectionProps.tieDesign.s0;
    // Límite de espaciamiento sísmico en zona crítica s0 <= min(b/4, 6*db, 100mm)
    const s0_max_allowed = Math.min(minDim / 4, 6 * 16, 100);
    const l0_min_required = Math.max(sectionProps.concreteGeom.h, sectionProps.concreteGeom.b, (colLengthM * 1000) / 6, 450);
    const l0_actual = sectionProps.tieDesign.l0;

    const confinementOk = s0_actual <= s0_max_allowed + 10 && l0_actual >= l0_min_required - 20;

    checks.push({
      id: 'SEISMIC_CONFINEMENT',
      title: 'Detallado de Confinamiento en Zonas Críticas Sísmicas (l₀ y s₀)',
      standardRef: 'ACI 318-19 §18.7.5 / NC 46:2017 §7.2',
      demand: `s₀ requerido ≤ ${Math.round(s0_max_allowed)} mm, l₀ mín ≥ ${Math.round(l0_min_required)} mm`,
      capacity: `s₀ provisto = ${s0_actual} mm, l₀ provisto = ${l0_actual} mm (Ganchos a ${sectionProps.tieDesign.hookAngle}°)`,
      ratio: Number((s0_actual / s0_max_allowed).toFixed(2)),
      status: confinementOk ? 'OK' : 'WARNING',
      description: confinementOk
        ? 'El estribado confina adecuadamente el núcleo de hormigón para disipación de energía inelástica.'
        : 'ADVERTENCIA SÍSMICA: Los estribos en los extremos de la columna exceden la separación máxima de confinamiento para pórticos especiales.',
    });

    if (!confinementOk) {
      recommendations.push({
        category: 'SEISMIC_CONFINEMENT',
        title: 'Adecuar Separación de Cercos en Zonas Críticas',
        priority: 'ALTA',
        message: `Para zona de sismicidad ${zone}, el estribado en extremos debe cumplir s₀ ≤ ${Math.round(s0_max_allowed)} mm en una longitud l₀ ≥ ${Math.round(l0_min_required)} mm.`,
        actionItem: `Ajustar s₀ a ${Math.min(100, Math.round(s0_max_allowed))} mm y verificar ganchos sísmicos de 135° con extensión de 75 mm.`,
      });
    }

    // Check C: Nivel de Carga Axial Sísmica Pu / (f'c * Ag) <= 0.30 para ductilidad
    const Ag = sectionProps.concreteGeom.b * sectionProps.concreteGeom.h;
    const fc = sectionProps.fc || 25;
    const axialStressRatio = (governingCombination.Pu * 1000) / (fc * Ag);

    checks.push({
      id: 'AXIAL_LOAD_DUCTILITY',
      title: 'Límite de Carga Axial Sísmica para Ductilidad (Pu / f\'c·Ag ≤ 0.30)',
      standardRef: 'ACI 318-19 §18.7.2 / NC 46:2017',
      demand: `Pu / (f\'c·Ag) = ${axialStressRatio.toFixed(3)}`,
      capacity: 'Límite dúctil = 0.30 (ó 0.35 para pórticos intermedios)',
      ratio: Number((axialStressRatio / 0.30).toFixed(2)),
      status: axialStressRatio <= 0.30 ? 'OK' : axialStressRatio <= 0.40 ? 'WARNING' : 'DANGER',
      description: axialStressRatio <= 0.30
        ? 'La carga axial permite que la columna desarrolle rótulas plásticas dúctiles con fluencia del acero antes del aplastamiento del hormigón.'
        : 'ADVERTENCIA: Carga axial elevada para sismo severo. Riesgo de falla frágil sin aviso.',
    });
  }

  // Check D: Compacidad Sísmica en Perfiles de Acero (AISC 341-16)
  if (material === 'steel' && sectionProps.steelProfile) {
    const prof = sectionProps.steelProfile;
    const Fy = sectionProps.Fy || 345;
    const E = 200000;

    // Relación ancho/espesor del ala: b / (2*tf)
    const lambda_f = prof.b / (2 * prof.tf);
    const lambda_hd_flange = 0.30 * Math.sqrt(E / Fy); // Altamente dúctil (SMF)
    const flangeCompact = lambda_f <= lambda_hd_flange;

    // Relación altura/espesor del alma: h / tw
    const lambda_w = (prof.d - 2 * prof.tf) / prof.tw;
    const lambda_hd_web = 2.45 * Math.sqrt(E / Fy);
    const webCompact = lambda_w <= lambda_hd_web;

    const steelCompactOk = flangeCompact && webCompact;

    checks.push({
      id: 'STEEL_SEISMIC_COMPACTNESS',
      title: 'Compacidad Sísmica de Secciones de Acero (AISC 341 Sísmico)',
      standardRef: 'AISC 341-16 Tabla D1.1 / NC Acero',
      demand: `Alas b/(2·tf) = ${lambda_f.toFixed(1)}, Alma h/tw = ${lambda_w.toFixed(1)}`,
      capacity: `Límites Altamente Dúctiles: Ala ≤ ${lambda_hd_flange.toFixed(1)}, Alma ≤ ${lambda_hd_web.toFixed(1)}`,
      ratio: Number((lambda_f / lambda_hd_flange).toFixed(2)),
      status: steelCompactOk ? 'OK' : 'WARNING',
      description: steelCompactOk
        ? 'La sección es sísmicamente compacta (Altamente Dúctil). No sufrirá pandeo local prematuro antes de fluir.'
        : 'ADVERTENCIA: La sección clasifica como moderadamente dúctil o no compacta. Puede sufrir pandeo local bajo ciclos sísmicos severos.',
    });

    if (!steelCompactOk) {
      recommendations.push({
        category: 'STEEL_COMPACTNESS',
        title: 'Rigidización o Perfil de Mayor Espesor de Ala',
        priority: 'MEDIA',
        message: `El perfil ${prof.designation} presenta una relación de esbeltez local que podría limitar su ductilidad en pórticos especiales sismorresistentes (SMF).`,
        actionItem: 'Seleccionar un perfil con mayor espesor de ala tf o utilizar arriostramientos concéntricos (CBF).',
      });
    }
  }

  // Check E: Anclaje y Vuelco por Viento Huracanado / Succión (NC 285 / ASCE 7)
  const upliftForce = combos[4].Pu < 0 ? Math.abs(combos[4].Pu) : (windUpliftKN - 0.9 * D_axial > 0 ? windUpliftKN - 0.9 * D_axial : 0);
  const upliftOk = upliftForce <= 0;

  checks.push({
    id: 'WIND_UPLIFT_ANCHORAGE',
    title: 'Verificación de Succión Vertical y Vuelco por Viento Huracanado',
    standardRef: 'NC 285:2003 §6 / ASCE 7-16',
    demand: `Fuerza neta de arrancamiento = ${upliftForce.toFixed(1)} kN (V0 = ${V0} m/s)`,
    capacity: upliftOk ? 'Peso propio compensa la succión (Pu,neto > 0)' : 'Requiere anclaje mecánico a tracción',
    ratio: upliftOk ? 0.4 : Number((upliftForce / 100).toFixed(2)),
    status: upliftOk ? 'OK' : 'WARNING',
    description: upliftOk
      ? 'La carga gravitatoria permanente estabiliza la columna frente al levantamiento provocado por el huracán.'
      : 'ALERTA DE DESLASTRE: El viento genera levantamiento neto. Se deben verificar pernos de anclaje a tracción pura en la base.',
  });

  if (!upliftOk) {
    recommendations.push({
      category: 'WIND_ANCHORAGE',
      title: 'Pernos de Anclaje Resistentes a Tracción por Huracán',
      priority: 'ALTA',
      message: `Bajo viento de ${V0} m/s (Zona ${windParams.zone}), la columna experimenta una fuerza neta de levantamiento de ${upliftForce.toFixed(1)} kN.`,
      actionItem: 'Disponer al menos 4 pernos de anclaje de alta resistencia (Ø20 - Ø24 mm Gr. 8.8 o A325) con longitud de anclaje embebida mínima de 400 mm en el pedestal.',
    });
  }

  // Check F: Verificación en Madera frente a Cortante y Duración de Carga
  if (material === 'wood') {
    recommendations.push({
      category: 'TIMBER_CONNECTORS',
      title: 'Uniones y Herrajes Anti-Huracán para Madera',
      priority: 'ALTA',
      message: 'Las columnas de madera en el Caribe deben asegurarse contra arrancamiento mediante herrajes de acero galvanizado con standoff de 50 mm y pernos pasantes pasantes.',
      actionItem: 'Verificar la resistencia al aplastamiento en los taladros de los pernos y aplicar factor kmod = 1.10 para acciones de viento instantáneo.',
    });
  }

  // Recomendación de Rigidez y Deriva de Piso (Drift)
  recommendations.push({
    category: 'GENERAL_DRIFT',
    title: 'Control de Deriva Lateral de Piso (Drift Limit Δ ≤ 0.015h)',
    priority: 'INFORMATIVA',
    message: `Para sismo según NC 46:2017 y viento según NC 285, la deriva máxima elástica multiplicada por R no debe superar el 1.5% de la altura entre pisos (Δmáx = ${(colLengthM * 1000 * 0.015).toFixed(1)} mm).`,
    actionItem: 'Verificar en el análisis espacial del edificio que los desplazamientos relativos no dañen cerramientos rígidos.',
  });

  const isSafe = maxDcr <= 1.0 && checks.every((ck) => ck.status !== 'DANGER');

  return {
    isSafe,
    maxDcr: Number(maxDcr.toFixed(3)),
    periodT1,
    Sa_T1: Number(Sa_T1.toFixed(3)),
    Cs,
    seismicShearVe,
    seismicMomentMe,
    q10,
    qz,
    windForceFw,
    windMomentMw,
    windUpliftKN,
    spectrumPoints,
    combinations: combos,
    governingCombination,
    checks,
    recommendations,
  };
}
