/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ColumnLoads,
  ConcreteGeometry,
  DesignStandard,
  MaterialType,
  SteelProfileData,
  SteelProperties,
  WoodProperties,
  InteractionPoint,
} from '../types';

export interface PDeltaSlendernessAnalysis {
  material: MaterialType;
  standard: DesignStandard;

  // Parámetros de esbeltez
  colLengthM: number;
  kx: number;
  ky: number;
  kEffective: number;
  rxMm: number;
  ryMm: number;
  slendernessX: number;
  slendernessY: number;
  governingSlenderness: number;
  slendernessLimit: number;
  isSlender: boolean;
  classification: 'Corta (Efectos P-Δ despreciables)' | 'Moderadamente Esbelta' | 'Críticamente Esbelta (Alto riesgo de inestabilidad)';

  // Rigidez y Pandeo de Euler
  EIeffKNm2: number;
  PcEulerKN: number;
  stabilityMarginPct: number; // Pu / (0.75 Pc) * 100

  // Momentos de 1er y 2do orden
  M0xKNm: number;
  M0yKNm: number;
  MminKNm: number;
  governingM0KNm: number;
  deltaNs: number; // Factor de amplificación no-traslacional
  deltaS: number; // Factor de amplificación traslacional
  governingDelta: number;
  McKNm: number; // Momento de segundo orden total
  deltaMKNm: number; // Incremento de momento flector por P-Delta (Mc - M0)
  momentIncreasePct: number; // ((Mc - M0) / M0) * 100

  // Deformación transversal física (flecha lateral)
  deltaSmallMm: number; // P-delta interna por curvatura
  deltaBigMm: number; // P-Delta por desplazamiento lateral
  totalDeflectionMm: number;

  // Impacto en Capacidad y Ratios DCR
  phiPnPureKN: number; // Capacidad axial pura sin reducción por esbeltez
  phiPnEffectiveKN: number; // Capacidad axial reducida con esbeltez
  axialCapacityLossPct: number; // ((phiPnPure - phiPnEffective) / phiPnPure) * 100
  dcr1stOrder: number;
  dcr2ndOrder: number;
  dcrDelta: number;
  dcrIncreasePct: number;

  // Curva de capacidad resistente vs Esbeltez λ (0 a 160+)
  slendernessCapacityCurve: {
    lambda: number;
    phiPn1stKN: number;
    phiPn2ndKN: number;
    deltaNs: number;
    capacityLossPct: number;
  }[];

  // Datos para gráfico P-M con salto vectorial P-Delta
  pmTrajectory: {
    firstOrderPoint: { M: number; P: number };
    secondOrderPoint: { M: number; P: number };
    designCurve: InteractionPoint[];
    nominalCurve: InteractionPoint[];
  };

  normativeSteps: {
    title: string;
    codeRef: string;
    formula: string;
    value: string;
    status: 'OK' | 'WARNING' | 'DANGER';
    explanation: string;
  }[];
}

/**
 * Calcula exhaustivamente la influencia de los efectos P-Delta y la esbeltez
 * en la capacidad final de la columna según la norma y material seleccionados.
 */
export function computePDeltaAnalysis(
  material: MaterialType,
  standard: DesignStandard,
  colLengthM: number,
  kx: number,
  ky: number,
  loads: ColumnLoads,
  concreteGeom: ConcreteGeometry,
  concreteFc: number,
  concreteEc: number,
  rebarFy: number,
  steelProfile: SteelProfileData,
  steelProps: SteelProperties,
  woodB: number,
  woodH: number,
  woodProps: WoodProperties,
  designCurve: InteractionPoint[] = [],
  nominalCurve: InteractionPoint[] = []
): PDeltaSlendernessAnalysis {
  const Pu_abs = Math.max(1, Math.abs(loads?.Pu ?? 1200));
  const Mux_abs = Math.abs(loads?.Mux ?? 0);
  const Muy_abs = Math.abs(loads?.Muy ?? 0);
  const Vux_abs = Math.abs(loads?.Vux ?? 0);

  const safeConcreteFc = Number.isFinite(concreteFc) && concreteFc > 0 ? concreteFc : 25;
  const safeConcreteEc = Number.isFinite(concreteEc) && concreteEc > 0 ? concreteEc : 4700 * Math.sqrt(safeConcreteFc);
  const safeRebarFy = Number.isFinite(rebarFy) && rebarFy > 0 ? rebarFy : 500;

  let rxMm = 100;
  let ryMm = 100;
  let EIeffKNm2 = 10000;
  let phiPnPureKN = 1000;
  let slendernessLimit = 22;

  // 1. CÁLCULO DE PROPIEDADES SEGÚN MATERIAL
  if (material === 'concrete') {
    const b = Math.max(150, concreteGeom?.b || 400);
    const h = Math.max(150, concreteGeom?.h || 400);
    rxMm = 0.30 * h;
    ryMm = 0.30 * b;

    // Rigidez efectiva a flexión según ACI 318-19 §6.6.4.4.4 / NC 450:
    // EI = 0.4 * Ec * Ig / (1 + beta_dns)
    const Ig_m4 = ((b / 1000) * Math.pow(h / 1000, 3)) / 12;
    const Ec_kPa = safeConcreteEc * 1000;
    const beta_dns = 0.3; // Relación de carga sostenida conservadora
    EIeffKNm2 = Math.max(10, (0.4 * Ec_kPa * Ig_m4) / (1 + beta_dns));

    // Límite de esbeltez para marcos arriostrados: kL/r <= 22 (ACI 318 / NC 450)
    slendernessLimit = standard === 'EUROCODE_2' ? 25 : 22;

    // Capacidad axial pura teórica
    const Ag_mm2 = b * h;
    const Ast_mm2 = Ag_mm2 * 0.015; // Estimación ~1.5%
    const P0_kN = (0.85 * safeConcreteFc * (Ag_mm2 - Ast_mm2) + safeRebarFy * Ast_mm2) / 1000;
    phiPnPureKN = Math.max(50, 0.65 * 0.80 * P0_kN);
  } else if (material === 'steel') {
    const safeSteelA = steelProfile?.A ? steelProfile.A * 100 : 8000;
    const safeSteelFy = Number.isFinite(steelProps?.Fy) && steelProps.Fy > 0 ? steelProps.Fy : 345;
    const safeSteelE = Number.isFinite(steelProps?.E) && steelProps.E > 0 ? steelProps.E : 200000;

    rxMm = Math.max(10, (steelProfile?.rx || 10) * 10);
    ryMm = Math.max(10, (steelProfile?.ry || 5) * 10);

    const Ix_m4 = (steelProfile?.Ix || 10000) * 1e-8;
    const E_kPa = safeSteelE * 1000;
    EIeffKNm2 = Math.max(10, E_kPa * Ix_m4);

    // Límite inelástico de AISC 360-16: 4.71 * sqrt(E / Fy)
    slendernessLimit = Number((4.71 * Math.sqrt(safeSteelE / safeSteelFy)).toFixed(1));

    phiPnPureKN = Math.max(50, (0.90 * safeSteelFy * safeSteelA) / 1000);
  } else {
    // Madera
    const safeWoodB = Math.max(50, woodB || 200);
    const safeWoodH = Math.max(50, woodH || 200);
    const safeWoodE = Number.isFinite(woodProps?.E0mean) && woodProps.E0mean > 0 ? woodProps.E0mean : 10000;
    const safeWoodFc0 = Number.isFinite(woodProps?.fc0) && woodProps.fc0 > 0 ? woodProps.fc0 : 18;

    rxMm = safeWoodH / Math.sqrt(12);
    ryMm = safeWoodB / Math.sqrt(12);

    const Ix_m4 = ((safeWoodB / 1000) * Math.pow(safeWoodH / 1000, 3)) / 12;
    const E_kPa = safeWoodE * 1000;
    EIeffKNm2 = Math.max(10, E_kPa * Ix_m4);

    slendernessLimit = 50; // NC 206 / Eurocódigo 5 límite de columna corta
    const Ag_mm2 = safeWoodB * safeWoodH;
    phiPnPureKN = Math.max(20, (safeWoodFc0 * Ag_mm2) / 1000);
  }

  // 2. ESBELTEZ CALCULADA EN AMBOS EJES
  const L_mm = colLengthM * 1000;
  const slendernessX = (kx * L_mm) / Math.max(1, rxMm);
  const slendernessY = (ky * L_mm) / Math.max(1, ryMm);
  const governingSlenderness = Math.max(slendernessX, slendernessY);
  const kEffective = governingSlenderness === slendernessX ? kx : ky;

  const isSlender = governingSlenderness > slendernessLimit;
  let classification: PDeltaSlendernessAnalysis['classification'] = 'Corta (Efectos P-Δ despreciables)';
  if (governingSlenderness > 90 || (material === 'steel' && governingSlenderness > 130)) {
    classification = 'Críticamente Esbelta (Alto riesgo de inestabilidad)';
  } else if (isSlender) {
    classification = 'Moderadamente Esbelta';
  }

  // 3. CARGA CRÍTICA DE PANDEO DE EULER Pc
  const kL_m = kEffective * colLengthM;
  const PcEulerKN = (Math.PI * Math.PI * EIeffKNm2) / Math.max(0.01, Math.pow(kL_m, 2));

  // Margen de estabilidad frente a inestabilidad elástica: Pu / (0.75 Pc)
  const stabilityRatio = Pu_abs / (0.75 * Math.max(1, PcEulerKN));
  const stabilityMarginPct = Number((stabilityRatio * 100).toFixed(1));

  // 4. MOMENTOS DE PRIMER ORDEN (INCLUYENDO EXCENTRICIDAD ACCIDENTAL MÍNIMA)
  let emin_m = 0.02;
  if (material === 'concrete') {
    emin_m = (15 + 0.03 * concreteGeom.h) / 1000;
  } else if (material === 'steel') {
    emin_m = (steelProfile.d * 0.03) / 1000;
  } else {
    emin_m = (woodH * 0.03) / 1000;
  }

  const MminKNm = Pu_abs * emin_m;
  const M0xKNm = Math.max(Mux_abs, (Vux_abs * colLengthM) / 4);
  const M0yKNm = Muy_abs;
  const governingM0KNm = Math.max(M0xKNm, MminKNm);

  // 5. FACTOR DE AMPLIFICACIÓN δns (P-delta miembro) Y δs (P-Delta traslacional)
  // Según ACI 318-19 §6.6.4.5: delta_ns = Cm / (1 - Pu / (0.75 Pc)) >= 1.0
  const Cm = 1.0; // Conservador para cargas laterales / curvatura simple
  let deltaNs = 1.0;
  if (isSlender) {
    if (stabilityRatio < 0.95) {
      deltaNs = Math.max(1.0, Cm / (1 - stabilityRatio));
    } else {
      deltaNs = 3.5; // Límite de inestabilidad severa
    }
  }
  deltaNs = Number(Math.min(3.5, deltaNs).toFixed(3));

  // Factor de amplificación por desplazamiento de entrepiso (P-Delta lateral)
  const deltaS = isSlender ? Number(Math.min(2.5, 1.0 + (deltaNs - 1.0) * 0.55).toFixed(3)) : 1.0;
  const governingDelta = deltaNs;

  // Momento flector total amplificado Mc
  const McKNm = Number((governingM0KNm * governingDelta).toFixed(2));
  const deltaMKNm = Number((McKNm - governingM0KNm).toFixed(2));
  const momentIncreasePct = Number((((McKNm - governingM0KNm) / Math.max(0.1, governingM0KNm)) * 100).toFixed(1));

  // 6. ESTIMACIÓN DE FLECHAS FÍSICAS (mm)
  // Flecha lateral máxima elástica viga-columna:
  const deltaSmallMm = Number(
    (((governingM0KNm * Math.pow(colLengthM, 2)) / (9.6 * Math.max(1, EIeffKNm2))) * 1000 * governingDelta).toFixed(2)
  );
  const deltaBigMm = Number((deltaSmallMm * 0.45).toFixed(2));
  const totalDeflectionMm = Number((deltaSmallMm + deltaBigMm).toFixed(2));

  // 7. CAPACIDAD RESISTENTE EFECTIVA CON ESBELTEZ
  let phiPnEffectiveKN = phiPnPureKN;
  if (material === 'steel') {
    const Fe = (Math.PI * Math.PI * steelProps.E) / Math.pow(Math.max(1, governingSlenderness), 2);
    let Fcr: number;
    if (governingSlenderness <= slendernessLimit) {
      Fcr = Math.pow(0.658, steelProps.Fy / Fe) * steelProps.Fy;
    } else {
      Fcr = 0.877 * Fe;
    }
    phiPnEffectiveKN = (0.90 * Fcr * (steelProfile.A * 100)) / 1000;
  } else if (material === 'concrete') {
    // Reducción por esbeltez en hormigón (ACI / NC)
    if (isSlender) {
      const reductionFactor = Math.max(0.25, 1 - (governingSlenderness - slendernessLimit) * 0.008);
      phiPnEffectiveKN = phiPnPureKN * reductionFactor;
    }
  } else {
    // Madera
    const c = 0.8;
    const Fce = (0.822 * (woodProps.E0mean || 10000)) / Math.pow(Math.max(1, governingSlenderness), 2);
    const fc = woodProps.fc0 || 18;
    const ratio = Fce / fc;
    const cp = (1 + ratio) / (2 * c) - Math.sqrt(Math.max(0, Math.pow((1 + ratio) / (2 * c), 2) - ratio / c));
    phiPnEffectiveKN = ((Math.max(0.05, cp) * fc * (woodB * woodH)) / 1000) * 0.8;
  }
  phiPnEffectiveKN = Number(phiPnEffectiveKN.toFixed(1));

  const axialCapacityLossPct = Number(
    (Math.max(0, (phiPnPureKN - phiPnEffectiveKN) / Math.max(1, phiPnPureKN)) * 100).toFixed(1)
  );

  // 8. EVALUACIÓN DE RATIOS DCR (1er vs 2do Orden)
  // Momento resistente disponible a la carga Pu
  let phiMnAtPu = 100;
  if (designCurve.length > 0) {
    for (let i = 0; i < designCurve.length - 1; i++) {
      const pA = designCurve[i].P;
      const pB = designCurve[i + 1].P;
      if ((Pu_abs <= pA && Pu_abs >= pB) || (Pu_abs >= pA && Pu_abs <= pB)) {
        const denom = pB - pA || 1e-5;
        const t = (Pu_abs - pA) / denom;
        phiMnAtPu = Math.max(1.0, designCurve[i].M + t * (designCurve[i + 1].M - designCurve[i].M));
        break;
      }
    }
  }

  const dcr1stOrder = Number(
    Math.max(Pu_abs / Math.max(1, phiPnPureKN), governingM0KNm / Math.max(1, phiMnAtPu)).toFixed(3)
  );
  const dcr2ndOrder = Number(
    Math.max(Pu_abs / Math.max(1, phiPnEffectiveKN), McKNm / Math.max(1, phiMnAtPu)).toFixed(3)
  );
  const dcrDelta = Number((dcr2ndOrder - dcr1stOrder).toFixed(3));
  const dcrIncreasePct = Number((((dcr2ndOrder - dcr1stOrder) / Math.max(0.01, dcr1stOrder)) * 100).toFixed(1));

  // 9. GENERACIÓN DE CURVA DE CAPACIDAD RESISTENTE vs ESBELTEZ λ (0 a 160)
  const slendernessCapacityCurve: PDeltaSlendernessAnalysis['slendernessCapacityCurve'] = [];
  const maxLambda = Math.max(160, Math.ceil(governingSlenderness * 1.35 / 10) * 10);
  const stepLambda = 5;

  for (let lam = 0; lam <= maxLambda; lam += stepLambda) {
    let cap1st = phiPnPureKN;
    let cap2nd = phiPnPureKN;
    let lamDeltaNs = 1.0;

    // Calcular Pc para este lambda: Pc = pi² * EI / (lam * r)²
    const r_m = rxMm / 1000;
    const effectiveKL_m = (lam * r_m);
    const Pc_lam = (Math.PI * Math.PI * EIeffKNm2) / Math.max(0.01, Math.pow(effectiveKL_m, 2));

    if (material === 'steel') {
      const Fe_lam = (Math.PI * Math.PI * steelProps.E) / Math.max(1, Math.pow(lam, 2));
      let Fcr_lam: number;
      if (lam <= slendernessLimit) {
        Fcr_lam = Math.pow(0.658, steelProps.Fy / Fe_lam) * steelProps.Fy;
      } else {
        Fcr_lam = 0.877 * Fe_lam;
      }
      cap2nd = (0.90 * Fcr_lam * (steelProfile.A * 100)) / 1000;
      cap1st = (0.90 * steelProps.Fy * (steelProfile.A * 100)) / 1000;
    } else if (material === 'concrete') {
      cap1st = phiPnPureKN;
      if (lam > slendernessLimit) {
        const stabRatio = Pu_abs / (0.75 * Math.max(1, Pc_lam));
        lamDeltaNs = stabRatio < 0.95 ? Math.min(3.5, 1 / (1 - stabRatio)) : 3.5;
        const red = Math.max(0.15, 1 - (lam - slendernessLimit) * 0.009);
        cap2nd = phiPnPureKN * red;
      } else {
        cap2nd = phiPnPureKN;
      }
    } else {
      cap1st = phiPnPureKN;
      const c = 0.8;
      const Fce_lam = (0.822 * (woodProps.E0mean || 10000)) / Math.max(1, Math.pow(lam, 2));
      const fc = woodProps.fc0 || 18;
      const ratio = Fce_lam / fc;
      const cp_lam = (1 + ratio) / (2 * c) - Math.sqrt(Math.max(0, Math.pow((1 + ratio) / (2 * c), 2) - ratio / c));
      cap2nd = ((cp_lam * fc * (woodB * woodH)) / 1000) * 0.8;
    }

    const loss = cap1st > 0 ? Number(Math.max(0, ((cap1st - cap2nd) / cap1st) * 100).toFixed(1)) : 0;

    slendernessCapacityCurve.push({
      lambda: lam,
      phiPn1stKN: Number(cap1st.toFixed(1)),
      phiPn2ndKN: Number(cap2nd.toFixed(1)),
      deltaNs: Number(lamDeltaNs.toFixed(2)),
      capacityLossPct: loss,
    });
  }

  // 10. PASOS EXPLICATIVOS NORMATIVOS
  const normativeSteps: PDeltaSlendernessAnalysis['normativeSteps'] = [
    {
      title: '1. Relación de Esbeltez Mecánica (λ = k·L / r)',
      codeRef:
        material === 'concrete'
          ? standard === 'NC_450_2006'
            ? 'NC 450:2006 Art. 9.4'
            : 'ACI 318-19 Tabla 6.2.5.1'
          : material === 'steel'
          ? 'AISC 360-16 §E2 / EN 1993-1-1'
          : 'NC 206 / EN 1995-1-1',
      formula: 'λ = max(kx·L / rx, ky·L / ry)',
      value: `λx = ${slendernessX.toFixed(1)}, λy = ${slendernessY.toFixed(1)} → λgob = ${governingSlenderness.toFixed(1)} (Límite = ${slendernessLimit})`,
      status: governingSlenderness <= slendernessLimit ? 'OK' : governingSlenderness <= 90 ? 'WARNING' : 'DANGER',
      explanation: isSlender
        ? `Columna esbelta (λ = ${governingSlenderness.toFixed(1)} > ${slendernessLimit}). Es obligatorio considerar los efectos de segundo orden (P-Δ).`
        : `Columna corta (λ = ${governingSlenderness.toFixed(1)} ≤ ${slendernessLimit}). Los efectos de esbeltez pueden despreciarse con seguridad normativa.`,
    },
    {
      title: '2. Carga Crítica de Pandeo de Euler y Margen de Estabilidad',
      codeRef:
        material === 'concrete'
          ? 'ACI 318-19 Ec. (6.6.4.4.2)'
          : material === 'steel'
          ? 'AISC 360-16 Ec. (C2-2)'
          : 'EN 1995-1-1 §6.3.2',
      formula: 'Pc = π² · (EI)eff / (k·L)² ; Pu ≤ 0.75·Pc',
      value: `Pc = ${Math.round(PcEulerKN)} kN | Demanda Pu = ${Math.round(Pu_abs)} kN (Uso estabilidad = ${stabilityMarginPct}%)`,
      status: stabilityRatio < 0.6 ? 'OK' : stabilityRatio < 0.85 ? 'WARNING' : 'DANGER',
      explanation:
        stabilityRatio < 0.75
          ? `Excelente margen de estabilidad contra inestabilidad global por pandeo (${(100 - stabilityMarginPct).toFixed(0)}% de holgura).`
          : `Riesgo de inestabilidad elástica. La carga Pu se aproxima peligrosamente a 0.75·Pc (${stabilityMarginPct}%).`,
    },
    {
      title: '3. Factor de Amplificación de Momentos δns (P-Delta Miembro)',
      codeRef:
        material === 'concrete'
          ? 'ACI 318-19 §6.6.4.5.1'
          : material === 'steel'
          ? 'AISC 360-16 Apéndice 8 (B1)'
          : 'Eurocódigo 5 §6.3',
      formula: 'δns = Cm / (1 - Pu / 0.75·Pc) ≥ 1.0',
      value: `δns = ${deltaNs.toFixed(2)} (Incremento de solicitación = +${momentIncreasePct}%)`,
      status: deltaNs <= 1.05 ? 'OK' : deltaNs <= 1.35 ? 'WARNING' : 'DANGER',
      explanation:
        deltaNs > 1.0
          ? `El momento flector de diseño se amplifica de M0 = ${governingM0KNm.toFixed(1)} kN·m a Mc = ${McKNm.toFixed(1)} kN·m (sobrecosto por segundo orden ΔM = +${deltaMKNm.toFixed(1)} kN·m).`
          : 'No se requiere amplificación de momentos de segundo orden.',
    },
    {
      title: '4. Degradación de la Capacidad Resistente Axial y DCR',
      codeRef: 'Interacción P-M con Segundo Orden',
      formula: 'DCR = max(Pu / φPn, Mc / φMn)',
      value: `DCR 1er Orden: ${(dcr1stOrder * 100).toFixed(1)}% → DCR 2do Orden: ${(dcr2ndOrder * 100).toFixed(1)}% (ΔDCR = +${(dcrDelta * 100).toFixed(1)}%)`,
      status: dcr2ndOrder <= 1.0 ? 'OK' : 'DANGER',
      explanation:
        dcr2ndOrder <= 1.0
          ? `La sección absorbe los efectos P-Delta manteniendo un DCR global seguro (${(dcr2ndOrder * 100).toFixed(1)}% ≤ 100%).`
          : `Falla inducida por esbeltez. Los efectos P-Delta empujan la demanda fuera de la envolvente resistente (DCR = ${(dcr2ndOrder * 100).toFixed(1)}% > 100%).`,
    },
  ];

  return {
    material,
    standard,
    colLengthM,
    kx,
    ky,
    kEffective,
    rxMm,
    ryMm,
    slendernessX,
    slendernessY,
    governingSlenderness,
    slendernessLimit,
    isSlender,
    classification,
    EIeffKNm2,
    PcEulerKN,
    stabilityMarginPct,
    M0xKNm,
    M0yKNm,
    MminKNm,
    governingM0KNm,
    deltaNs,
    deltaS,
    governingDelta,
    McKNm,
    deltaMKNm,
    momentIncreasePct,
    deltaSmallMm,
    deltaBigMm,
    totalDeflectionMm,
    phiPnPureKN,
    phiPnEffectiveKN,
    axialCapacityLossPct,
    dcr1stOrder,
    dcr2ndOrder,
    dcrDelta,
    dcrIncreasePct,
    slendernessCapacityCurve,
    pmTrajectory: {
      firstOrderPoint: { M: governingM0KNm, P: Pu_abs },
      secondOrderPoint: { M: McKNm, P: Pu_abs },
      designCurve,
      nominalCurve,
    },
    normativeSteps,
  };
}
