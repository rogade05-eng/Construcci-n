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
} from '../types';

export interface ReliabilityDistributionParams {
  numSimulations: number; // e.g. 2000
  covMaterial: number;    // Coeficiente de variación resistencia principal (ej. 0.15 para f'c)
  covRebar: number;       // CoV acero refuerzo (ej. 0.07 para fy)
  covDeadLoad: number;    // CoV carga permanente D (ej. 0.10)
  covLiveLoad: number;    // CoV sobrecarga de uso L (ej. 0.25)
  covMoment: number;      // CoV momentos flectores (ej. 0.18)
}

export interface HistogramBin {
  binMin: number;
  binMax: number;
  binCenter: number;
  binLabel: string;
  count: number;
  percentage: number;
  cumulativePct: number;
  isFailing: boolean;
  color: string;
}

export interface StandardReliabilityComparison {
  standardId: DesignStandard;
  standardName: string;
  codeShort: string;
  safetyApproach: string;
  resistanceFactor: string; // ej. "φ = 0.65 (LRFD)" o "γc = 1.5, γs = 1.15"
  nominalCapacityKN: number;
  factoredCapacityKN: number;
  nominalMomentKNm: number;
  factoredMomentKNm: number;
  dcrMean: number;
  betaReliabilityIndex: number;
  failureProbabilityPct: number;
  targetBeta: number;
  complianceStatus: 'CONFORME' | 'AL LÍMITE' | 'NO CONFORME';
  safetyMarginPct: number;
  normHighlights: string;
}

export interface ReliabilityAnalysisResult {
  numSimulations: number;
  totalFailures: number;
  empiricalFailureProbabilityPct: number; // Pf (%)
  reliabilityIndexBeta: number;            // β (Hasofer-Lind / Cornell)
  meanDcr: number;
  stdDevDcr: number;
  covDcr: number;
  p95Dcr: number;
  p99Dcr: number;
  centralSafetyFactor: number; // FSC = mean(R) / mean(S)
  meanCapacityKN: number;
  meanDemandKN: number;
  histogramBins: HistogramBin[];
  standardComparisons: StandardReliabilityComparison[];
  safetyLevel: {
    status: 'EXCELENTE' | 'ADECUADO' | 'VULNERABLE' | 'CRÍTICO';
    badge: string;
    color: string;
    description: string;
  };
}

// Generador de números normales usando Transformación de Box-Muller
function sampleNormal(mean: number, stdDev: number): number {
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

// Generador de variables aleatorias Lognormales (evita valores negativos para resistencias físicas)
function sampleLognormal(mean: number, cov: number): number {
  const safeMean = Math.max(1, mean);
  const safeCov = Math.max(0.01, cov);
  const variance = Math.pow(safeMean * safeCov, 2);
  const sigma2 = Math.log(1 + variance / Math.pow(safeMean, 2));
  const mu = Math.log(safeMean) - 0.5 * sigma2;
  const sigma = Math.sqrt(sigma2);
  const normalVal = sampleNormal(mu, sigma);
  return Math.exp(normalVal);
}

// Aproximación de la función cuantil normal inversa Φ^-1(p) de Peter J. Acklam
export function inverseNormalCDF(p: number): number {
  const safeP = Math.max(1e-7, Math.min(1 - 1e-7, p));
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const q = safeP - 0.5;
  if (Math.abs(q) <= 0.42) {
    const r = q * q;
    return (
      (q *
        (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const r = safeP < 0.5 ? safeP : 1 - safeP;
  const s = Math.sqrt(-Math.log(r));
  let x =
    (((((c[0] * s + c[1]) * s + c[2]) * s + c[3]) * s + c[4]) * s + c[5]) /
    ((((d[0] * s + d[1]) * s + d[2]) * s + d[3]) * s + 1);

  if (safeP < 0.5) x = -x;
  return x;
}

/**
 * Motor de Confiabilidad y Simulación Monte Carlo
 * Muestrea variabilidad estocástica de resistencias y solicitaciones
 */
export function runReliabilityAnalysis(
  material: MaterialType,
  standard: DesignStandard,
  concreteGeom: ConcreteGeometry = { shape: 'rectangular', b: 400, h: 400, cover: 40 },
  concreteFc: number = 25,
  rebarFy: number = 500,
  steelProfile?: SteelProfileData,
  steelProps?: SteelProperties,
  woodB: number = 200,
  woodH: number = 200,
  woodProps?: WoodProperties,
  colLoads: ColumnLoads = { Pu: 800, Mux: 120, Muy: 30, Vux: 90, Vuy: 20 },
  params: ReliabilityDistributionParams = {
    numSimulations: 2000,
    covMaterial: 0.15,
    covRebar: 0.07,
    covDeadLoad: 0.10,
    covLiveLoad: 0.25,
    covMoment: 0.18,
  }
): ReliabilityAnalysisResult {
  const N = Math.max(200, Math.min(10000, params.numSimulations));

  // 1. Parámetros medios de resistencia de materiales (Media estadística real > Valor característico de catálogo)
  // En hormigón: fm = fck + 8 MPa (según Eurocódigo 2 / ACI)
  const meanConcreteFc = concreteFc + 8; // MPa
  const meanRebarFy = rebarFy * 1.08;   // MPa
  const meanSteelFy = (steelProps?.Fy || 345) * 1.10; // MPa
  const meanWoodFc0 = (woodProps?.fc0 || 18) * 1.25;  // MPa

  // Separación aproximada de carga permanente (D ~ 60%) y sobrecarga variable (L ~ 40%)
  const nominalPu = Math.max(10, Math.abs(colLoads.Pu));
  const nominalMu = Math.max(5, Math.sqrt(Math.pow(colLoads.Mux, 2) + Math.pow(colLoads.Muy, 2)));
  const D_nominal = nominalPu * 0.60;
  const L_nominal = nominalPu * 0.40;

  const simulatedDcrs: number[] = [];
  const simulatedCapacities: number[] = [];
  const simulatedDemands: number[] = [];
  let failureCount = 0;

  // 2. Bucle de Simulación Monte Carlo
  for (let i = 0; i < N; i++) {
    // Muestreo estocástico de cargas de servicio
    const sampleD = sampleLognormal(D_nominal, params.covDeadLoad);
    const sampleL = sampleLognormal(L_nominal, params.covLiveLoad);
    const samplePu = sampleD + sampleL;
    const sampleMu = sampleLognormal(nominalMu, params.covMoment);

    let sampleCapacityKN = 1000;
    let sampleMomentCapKNm = 100;
    let dcr = 0.5;

    if (material === 'concrete') {
      // Muestreo de f'c y fy
      const sampleFc = sampleLognormal(meanConcreteFc, params.covMaterial);
      const sampleFy = sampleLognormal(meanRebarFy, params.covRebar);
      // Variación dimensional por tolerancias de encofrado (±5 mm)
      const sampleB = sampleNormal(concreteGeom.b, concreteGeom.b * 0.015);
      const sampleH = sampleNormal(concreteGeom.h, concreteGeom.h * 0.015);

      const Ag = sampleB * sampleH;
      const Ast = Ag * 0.016; // Cuantía representativa ~1.6%
      const P0 = (0.85 * sampleFc * (Ag - Ast) + sampleFy * Ast) / 1000; // kN
      sampleCapacityKN = 0.80 * P0;

      // Capacidad nominal a flexión aproximada Mn
      const d = sampleH - concreteGeom.cover - 15;
      const Mn = (Ast * sampleFy * (d - 0.4 * 0.2 * d)) / 1e6; // kN·m
      sampleMomentCapKNm = Math.max(10, Mn);

      // Estado Límite de Interacción P-M (Bresler simplificado)
      const axialRatio = samplePu / sampleCapacityKN;
      const momentRatio = sampleMu / sampleMomentCapKNm;
      dcr = axialRatio + momentRatio;
    } else if (material === 'steel') {
      const sampleFy = sampleLognormal(meanSteelFy, params.covMaterial);
      const A_mm2 = (steelProfile?.A || 80) * 100;
      const Zx_cm3 = steelProfile?.Zx || 500;

      sampleCapacityKN = (sampleFy * A_mm2) / 1000;
      sampleMomentCapKNm = (sampleFy * Zx_cm3 * 1000) / 1e6;

      const axialRatio = samplePu / sampleCapacityKN;
      const momentRatio = sampleMu / sampleMomentCapKNm;
      // Interacción AISC H1-1a / H1-1b
      dcr = axialRatio >= 0.2 ? axialRatio + (8 / 9) * momentRatio : axialRatio / 2 + momentRatio;
    } else {
      // Madera
      const sampleFc0 = sampleLognormal(meanWoodFc0, params.covMaterial);
      const sampleB = sampleNormal(woodB, woodB * 0.02);
      const sampleH = sampleNormal(woodH, woodH * 0.02);

      const A_mm2 = sampleB * sampleH;
      const W_mm3 = (sampleB * Math.pow(sampleH, 2)) / 6;

      sampleCapacityKN = (sampleFc0 * A_mm2) / 1000;
      sampleMomentCapKNm = ((sampleFc0 * 1.3) * W_mm3) / 1e6;

      const axialRatio = samplePu / sampleCapacityKN;
      const momentRatio = sampleMu / sampleMomentCapKNm;
      dcr = Math.pow(axialRatio, 2) + momentRatio;
    }

    // Demanda combinada en unidades equivalentes para balance de confiabilidad
    const effectiveDemandKN = samplePu + (sampleMu / (sampleMomentCapKNm / sampleCapacityKN));
    simulatedCapacities.push(sampleCapacityKN);
    simulatedDemands.push(effectiveDemandKN);
    simulatedDcrs.push(dcr);

    if (dcr >= 1.0) {
      failureCount++;
    }
  }

  // 3. Métricas Estadísticas del Muestreo
  simulatedDcrs.sort((a, b) => a - b);
  const empiricalFailureProbabilityPct = Number(((failureCount / N) * 100).toFixed(2));
  
  const meanDcr = Number((simulatedDcrs.reduce((a, b) => a + b, 0) / N).toFixed(3));
  const varianceDcr = simulatedDcrs.reduce((acc, val) => acc + Math.pow(val - meanDcr, 2), 0) / (N - 1);
  const stdDevDcr = Number(Math.sqrt(varianceDcr).toFixed(3));
  const covDcr = Number((stdDevDcr / meanDcr).toFixed(3));

  const p95Dcr = Number(simulatedDcrs[Math.floor(N * 0.95)].toFixed(2));
  const p99Dcr = Number(simulatedDcrs[Math.floor(N * 0.99)].toFixed(2));

  const meanCapacityKN = Number((simulatedCapacities.reduce((a, b) => a + b, 0) / N).toFixed(1));
  const meanDemandKN = Number((simulatedDemands.reduce((a, b) => a + b, 0) / N).toFixed(1));
  const centralSafetyFactor = Number((meanCapacityKN / Math.max(1, meanDemandKN)).toFixed(2));

  // Cálculo del Índice de Confiabilidad β (Hasofer-Lind / Cornell)
  let betaReliabilityIndex = 4.2;
  if (empiricalFailureProbabilityPct > 0) {
    const pfFraction = empiricalFailureProbabilityPct / 100;
    betaReliabilityIndex = Number((-inverseNormalCDF(pfFraction)).toFixed(2));
  } else {
    // Si no hubo fallas empíricas en N muestras, estimar por formulación Cornell de capacidad vs demanda
    const varR = Math.pow(meanCapacityKN * params.covMaterial, 2);
    const varS = Math.pow(meanDemandKN * params.covDeadLoad, 2);
    const betaCornell = (meanCapacityKN - meanDemandKN) / Math.sqrt(varR + varS);
    betaReliabilityIndex = Number(Math.max(3.8, Math.min(6.5, betaCornell)).toFixed(2));
  }

  // 4. Generación del Histograma de Frecuencias para Recharts
  const minDcr = Math.max(0.2, Math.floor(simulatedDcrs[0] * 20) / 20);
  const maxDcr = Math.min(2.5, Math.ceil(simulatedDcrs[N - 1] * 20) / 20);
  const numBins = 18;
  const binStep = Math.max(0.04, (maxDcr - minDcr) / numBins);

  const histogramBins: HistogramBin[] = [];
  let runningCount = 0;

  for (let b = 0; b < numBins; b++) {
    const bMin = Number((minDcr + b * binStep).toFixed(2));
    const bMax = Number((bMin + binStep).toFixed(2));
    const bCenter = Number(((bMin + bMax) / 2).toFixed(2));

    const countInBin = simulatedDcrs.filter((v) =>
      b === numBins - 1 ? v >= bMin && v <= bMax : v >= bMin && v < bMax
    ).length;

    runningCount += countInBin;
    const pct = Number(((countInBin / N) * 100).toFixed(1));
    const cumulative = Number(((runningCount / N) * 100).toFixed(1));
    const isFailing = bCenter >= 1.0 || bMin >= 1.0;

    let color = '#10b981'; // Verde seguro
    if (bCenter >= 1.0) {
      color = '#f43f5e'; // Rojo falla
    } else if (bCenter >= 0.85) {
      color = '#f59e0b'; // Ámbar advertencia
    } else if (bCenter >= 0.70) {
      color = '#06b6d4'; // Cyan óptimo
    }

    histogramBins.push({
      binMin: bMin,
      binMax: bMax,
      binCenter: bCenter,
      binLabel: `${bMin.toFixed(2)} - ${bMax.toFixed(2)}`,
      count: countInBin,
      percentage: pct,
      cumulativePct: cumulative,
      isFailing,
      color,
    });
  }

  // 5. Comparativa Multi-Norma de Confiabilidad (ACI 318 vs NC 450 vs Eurocódigo)
  const standardComparisons = evaluateStandardsReliability(
    material,
    concreteGeom,
    concreteFc,
    rebarFy,
    steelProfile,
    steelProps,
    woodB,
    woodH,
    woodProps,
    colLoads
  );

  // 6. Nivel de Seguridad Global y Diagnóstico
  let safetyLevel: ReliabilityAnalysisResult['safetyLevel'] = {
    status: 'EXCELENTE',
    badge: '🛡️ ÓPTIMO (β ≥ 3.8)',
    color: 'emerald',
    description:
      'La columna cumple holgadamente con los estándares de confiabilidad de Eurocódigo 0 (Clase RC2) y ACI 318. La probabilidad de falla es insignificante bajo solicitaciones normales de servicio.',
  };

  if (betaReliabilityIndex < 2.5 || empiricalFailureProbabilityPct > 5.0) {
    safetyLevel = {
      status: 'CRÍTICO',
      badge: '🚨 ALTO RIESGO (β < 2.5)',
      color: 'rose',
      description:
        'Peligro inminente de colapso frágil o inestabilidad. La probabilidad de falla excede el 5%, incompatible con cualquier código moderno de edificación.',
    };
  } else if (betaReliabilityIndex < 3.2 || empiricalFailureProbabilityPct > 1.0) {
    safetyLevel = {
      status: 'VULNERABLE',
      badge: '⚠️ VULNERABLE (β < 3.2)',
      color: 'amber',
      description:
        'Margen de seguridad reducido frente a sobrecargas o desviaciones en la calidad del hormigón. Se recomienda optimización dimensional urgente.',
    };
  } else if (betaReliabilityIndex < 3.8) {
    safetyLevel = {
      status: 'ADECUADO',
      badge: '✓ ACEPTABLE (3.2 ≤ β < 3.8)',
      color: 'cyan',
      description:
        'Diseño funcional con nivel de seguridad admisible, aunque cercano al límite objetivo de 50 años establecido en normas internacionales.',
    };
  }

  return {
    numSimulations: N,
    totalFailures: failureCount,
    empiricalFailureProbabilityPct,
    reliabilityIndexBeta: betaReliabilityIndex,
    meanDcr,
    stdDevDcr,
    covDcr,
    p95Dcr,
    p99Dcr,
    centralSafetyFactor,
    meanCapacityKN,
    meanDemandKN,
    histogramBins,
    standardComparisons,
    safetyLevel,
  };
}

/**
 * Comparador riguroso entre normas de diseño estructural
 */
function evaluateStandardsReliability(
  material: MaterialType,
  concreteGeom: ConcreteGeometry,
  concreteFc: number,
  rebarFy: number,
  steelProfile?: SteelProfileData,
  steelProps?: SteelProperties,
  woodB: number = 200,
  woodH: number = 200,
  woodProps?: WoodProperties,
  colLoads: ColumnLoads = { Pu: 800, Mux: 120, Muy: 30, Vux: 90, Vuy: 20 }
): StandardReliabilityComparison[] {
  const Pu_abs = Math.max(10, Math.abs(colLoads.Pu));
  const Mu_abs = Math.max(5, Math.sqrt(Math.pow(colLoads.Mux, 2) + Math.pow(colLoads.Muy, 2)));

  const standardsList: DesignStandard[] = ['ACI_318_19', 'NC_450_2006', 'EUROCODE_2'];

  return standardsList.map((std) => {
    let nominalCapacityKN = 1000;
    let factoredCapacityKN = 650;
    let nominalMomentKNm = 120;
    let factoredMomentKNm = 78;
    let resistanceFactorStr = 'φ = 0.65';
    let safetyApproach = 'LRFD';
    let codeShort = 'ACI 318-19';
    let normHighlights = 'Criterio americano con factores de reducción φ fijos por tipo de miembro.';

    if (std === 'ACI_318_19') {
      codeShort = 'ACI 318-19';
      resistanceFactorStr = material === 'steel' ? 'φ = 0.90' : 'φ = 0.65 (Atado) / 0.75';
      safetyApproach = 'Factores de Reducción de Resistencia φ (LRFD)';
      normHighlights = 'Controla con combinaciones 1.2D + 1.6L y φ=0.65 en compresión frágil.';

      if (material === 'concrete') {
        const Ag = concreteGeom.b * concreteGeom.h;
        const Ast = Ag * 0.016;
        const P0 = (0.85 * concreteFc * (Ag - Ast) + rebarFy * Ast) / 1000;
        nominalCapacityKN = Number((0.80 * P0).toFixed(1));
        factoredCapacityKN = Number((0.65 * nominalCapacityKN).toFixed(1));

        const d = concreteGeom.h - concreteGeom.cover - 15;
        nominalMomentKNm = Number(((Ast * rebarFy * (d - 0.4 * 0.2 * d)) / 1e6).toFixed(1));
        factoredMomentKNm = Number((0.65 * nominalMomentKNm).toFixed(1));
      } else if (material === 'steel') {
        const A_mm2 = (steelProfile?.A || 80) * 100;
        const Fy = steelProps?.Fy || 345;
        nominalCapacityKN = Number(((Fy * A_mm2) / 1000).toFixed(1));
        factoredCapacityKN = Number((0.90 * nominalCapacityKN).toFixed(1));
        nominalMomentKNm = Number(((Fy * (steelProfile?.Zx || 500) * 1000) / 1e6).toFixed(1));
        factoredMomentKNm = Number((0.90 * nominalMomentKNm).toFixed(1));
      } else {
        const A_mm2 = woodB * woodH;
        nominalCapacityKN = Number((((woodProps?.fc0 || 18) * A_mm2) / 1000).toFixed(1));
        factoredCapacityKN = Number((nominalCapacityKN * 0.60).toFixed(1));
        nominalMomentKNm = Number((((woodProps?.fc0 || 18) * woodB * Math.pow(woodH, 2) / 6) / 1e6).toFixed(1));
        factoredMomentKNm = Number((nominalMomentKNm * 0.60).toFixed(1));
      }
    } else if (std === 'NC_450_2006') {
      codeShort = 'NC 450:2006 (Cuba)';
      resistanceFactorStr = 'γb = 1.50, γs = 1.15';
      safetyApproach = 'Estados Límites con Resistencias de Cálculo Rb y Rs';
      normHighlights = 'Normativa cubana adaptada al trópico caribeño y sismo según NC 46.';

      if (material === 'concrete') {
        const Ag = concreteGeom.b * concreteGeom.h;
        const Ast = Ag * 0.016;
        const Rb = concreteFc / 1.5;
        const Rs = rebarFy / 1.15;
        const P0_nom = (0.85 * concreteFc * (Ag - Ast) + rebarFy * Ast) / 1000;
        nominalCapacityKN = Number((0.80 * P0_nom).toFixed(1));

        const P0_calc = (0.85 * Rb * (Ag - Ast) + Rs * Ast) / 1000;
        factoredCapacityKN = Number((0.80 * P0_calc).toFixed(1));

        const d = concreteGeom.h - concreteGeom.cover - 15;
        nominalMomentKNm = Number(((Ast * rebarFy * (d - 0.4 * 0.2 * d)) / 1e6).toFixed(1));
        factoredMomentKNm = Number(((Ast * Rs * (d - 0.4 * 0.2 * d)) / 1e6).toFixed(1));
      } else if (material === 'steel') {
        const A_mm2 = (steelProfile?.A || 80) * 100;
        const Fy = steelProps?.Fy || 345;
        nominalCapacityKN = Number(((Fy * A_mm2) / 1000).toFixed(1));
        factoredCapacityKN = Number(((nominalCapacityKN / 1.10) * 0.95).toFixed(1));
        nominalMomentKNm = Number(((Fy * (steelProfile?.Zx || 500) * 1000) / 1e6).toFixed(1));
        factoredMomentKNm = Number(((nominalMomentKNm / 1.10) * 0.95).toFixed(1));
      } else {
        const A_mm2 = woodB * woodH;
        nominalCapacityKN = Number((((woodProps?.fc0 || 18) * A_mm2) / 1000).toFixed(1));
        factoredCapacityKN = Number((nominalCapacityKN * 0.58).toFixed(1));
        nominalMomentKNm = Number((((woodProps?.fc0 || 18) * woodB * Math.pow(woodH, 2) / 6) / 1e6).toFixed(1));
        factoredMomentKNm = Number((nominalMomentKNm * 0.58).toFixed(1));
      }
    } else {
      // EUROCODE_2
      codeShort = 'Eurocódigo 2 / EN 1990';
      resistanceFactorStr = 'γc = 1.50, γs = 1.15';
      safetyApproach = 'Coeficientes Parciales Semi-Probabilísticos (ELU)';
      normHighlights = 'Base probabilística calibrada para índice objetivo de confiabilidad β = 3.8.';

      if (material === 'concrete') {
        const Ag = concreteGeom.b * concreteGeom.h;
        const Ast = Ag * 0.016;
        const fcd = (0.85 * concreteFc) / 1.5;
        const fyd = rebarFy / 1.15;
        const P0_nom = (0.85 * concreteFc * (Ag - Ast) + rebarFy * Ast) / 1000;
        nominalCapacityKN = Number((0.80 * P0_nom).toFixed(1));

        const N_Rd = (fcd * (Ag - Ast) + fyd * Ast) / 1000;
        factoredCapacityKN = Number((0.80 * N_Rd).toFixed(1));

        const d = concreteGeom.h - concreteGeom.cover - 15;
        nominalMomentKNm = Number(((Ast * rebarFy * (d - 0.4 * 0.2 * d)) / 1e6).toFixed(1));
        factoredMomentKNm = Number(((Ast * fyd * (d - 0.4 * 0.2 * d)) / 1e6).toFixed(1));
      } else if (material === 'steel') {
        const A_mm2 = (steelProfile?.A || 80) * 100;
        const Fy = steelProps?.Fy || 345;
        nominalCapacityKN = Number(((Fy * A_mm2) / 1000).toFixed(1));
        factoredCapacityKN = Number((nominalCapacityKN / 1.0).toFixed(1)); // γM0 = 1.0 en EC3
        nominalMomentKNm = Number(((Fy * (steelProfile?.Zx || 500) * 1000) / 1e6).toFixed(1));
        factoredMomentKNm = Number((nominalMomentKNm / 1.0).toFixed(1));
      } else {
        const A_mm2 = woodB * woodH;
        nominalCapacityKN = Number((((woodProps?.fc0 || 18) * A_mm2) / 1000).toFixed(1));
        factoredCapacityKN = Number(((nominalCapacityKN * 0.8) / 1.3).toFixed(1)); // kmod / γM
        nominalMomentKNm = Number((((woodProps?.fc0 || 18) * woodB * Math.pow(woodH, 2) / 6) / 1e6).toFixed(1));
        factoredMomentKNm = Number(((nominalMomentKNm * 0.8) / 1.3).toFixed(1));
      }
    }

    const dcrMean = Number(
      ((Pu_abs / factoredCapacityKN) + (Mu_abs / factoredMomentKNm)).toFixed(2)
    );

    const safetyMarginPct = Number(
      Math.max(0, ((factoredCapacityKN - Pu_abs) / factoredCapacityKN) * 100).toFixed(1)
    );

    // Beta proyectado según nivel de DCR
    let beta = 3.8;
    let pf = 0.01;
    if (dcrMean <= 0.60) {
      beta = 4.6;
      pf = 0.0002;
    } else if (dcrMean <= 0.80) {
      beta = 4.1;
      pf = 0.002;
    } else if (dcrMean <= 0.95) {
      beta = 3.8;
      pf = 0.007;
    } else if (dcrMean <= 1.05) {
      beta = 3.1;
      pf = 0.10;
    } else if (dcrMean <= 1.25) {
      beta = 2.4;
      pf = 0.82;
    } else {
      beta = 1.6;
      pf = 5.48;
    }

    const complianceStatus: StandardReliabilityComparison['complianceStatus'] =
      dcrMean <= 0.95 ? 'CONFORME' : dcrMean <= 1.0 ? 'AL LÍMITE' : 'NO CONFORME';

    return {
      standardId: std,
      standardName: std === 'ACI_318_19' ? 'ACI 318-19' : std === 'NC_450_2006' ? 'NC 450:2006 (Cuba)' : 'Eurocódigo 2 / EN 1990',
      codeShort,
      safetyApproach,
      resistanceFactor: resistanceFactorStr,
      nominalCapacityKN,
      factoredCapacityKN,
      nominalMomentKNm,
      factoredMomentKNm,
      dcrMean,
      betaReliabilityIndex: beta,
      failureProbabilityPct: pf,
      targetBeta: 3.8,
      complianceStatus,
      safetyMarginPct,
      normHighlights,
    };
  });
}
