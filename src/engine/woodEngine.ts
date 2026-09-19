/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColumnLoads, DesignStandard, InteractionPoint, WoodProperties } from '../types';

export interface WoodCalculationResult {
  slendernessX: number;
  slendernessY: number;
  governingSlenderness: number;
  lambdaRel: number;
  kcStabilityFactor: number; // Factor de pandeo kc (o Cp)
  fc0d: number; // Resistencia de cálculo a compresión paralela (MPa)
  fmd: number; // Resistencia de cálculo a flexión (MPa)
  sigmaC: number; // Tensión actuante de compresión (MPa)
  sigmaM: number; // Tensión actuante de flexión (MPa)
  dcrAxial: number;
  dcrCombined: number;
  isSafe: boolean;
  nominalCurve: InteractionPoint[];
  designCurve: InteractionPoint[];
  baseBracket: {
    standoffHeightMm: number; // 50 mm anti-humedad
    plateThicknessMm: number; // 6 mm
    boltDiameterMm: number; // 16 mm
    boltCount: number; // 2 o 4 pernos pasantes
    steelGrade: string;
  };
  steps: {
    title: string;
    codeRef: string;
    formula: string;
    values: string;
    status: 'OK' | 'WARNING' | 'DANGER';
    comment: string;
  }[];
}

export function calculateWoodColumn(
  b: number, // mm
  h: number, // mm
  L_m: number,
  kx: number,
  ky: number,
  loads: ColumnLoads,
  woodProps: WoodProperties,
  standard: DesignStandard
): WoodCalculationResult {
  const steps: WoodCalculationResult['steps'] = [];
  const L_mm = L_m * 1000;
  const gammaM = standard === 'EUROCODE_2' ? 1.3 : 1.25; // Coeficiente de seguridad material madera
  const kmod = woodProps.kmod;

  // Resistencias de cálculo
  const fc0d = (kmod * woodProps.fc0) / gammaM; // MPa compresión paralela
  const fmd = (kmod * (woodProps.ft0 * 1.4)) / gammaM; // MPa flexión aproximada

  // Área y momentos de inercia
  const A = b * h; // mm²
  const Ix = (b * Math.pow(h, 3)) / 12;
  const Iy = (h * Math.pow(b, 3)) / 12;
  const rx = Math.sqrt(Ix / A); // h / sqrt(12)
  const ry = Math.sqrt(Iy / A); // b / sqrt(12)

  // Esbeltez geométrica lambda
  const lambdaX = (kx * L_mm) / rx;
  const lambdaY = (ky * L_mm) / ry;
  const governingSlenderness = Math.max(lambdaX, lambdaY);

  // Límite de esbeltez en columnas de madera: lambda <= 50 (o 75 para elementos secundarios)
  const slendernessOk = governingSlenderness <= 60;
  steps.push({
    title: 'Esbeltez Mecánica en Madera (λ = KL/r ≤ 60)',
    codeRef: standard === 'EUROCODE_2' ? 'Eurocódigo 5 (EN 1995-1-1 §6.3.2)' : 'Norma Cubana NC 206 / NDS',
    formula: 'λ = max(Kx·L / rx, Ky·L / ry), r = d / √12',
    values: `λx = ${lambdaX.toFixed(1)}, λy = ${lambdaY.toFixed(1)} → λmax = ${governingSlenderness.toFixed(1)} ${governingSlenderness <= 60 ? '≤ 60 (Apto)' : '> 60 (Excesivo)'}`,
    status: slendernessOk ? 'OK' : 'WARNING',
    comment: slendernessOk
      ? 'Esbeltez adecuada contra pandeo excesivo en madera.'
      : 'ADVERTENCIA: Sección muy esbelta para madera. Se recomienda incrementar la escuadría transversal.',
  });

  // Esbeltez relativa lambda_rel según Eurocódigo 5:
  // lambda_rel = (lambda / pi) * sqrt(fc0k / E005)
  const lambdaRel = (governingSlenderness / Math.PI) * Math.sqrt(woodProps.fc0 / woodProps.E005);

  // Factor de inestabilidad kc (o Cp en NDS)
  // beta_c = 0.2 para madera aserrada maciza (0.1 para madera laminada encolada)
  const betaC = 0.2;
  const kFactor = 0.5 * (1 + betaC * (lambdaRel - 0.3) + Math.pow(lambdaRel, 2));
  let kc = 1.0;
  if (lambdaRel > 0.3) {
    kc = 1 / (kFactor + Math.sqrt(Math.pow(kFactor, 2) - Math.pow(lambdaRel, 2)));
  }
  kc = Math.min(1.0, Math.max(0.05, kc));

  // Tensiones actuantes
  const sigmaC = (loads.Pu * 1000) / A; // MPa
  const Wx = (b * Math.pow(h, 2)) / 6; // mm³
  const sigmaM = (loads.Mux * 1000000) / Wx; // MPa

  // Ratio a compresión con pandeo
  const dcrAxial = Number((sigmaC / (kc * fc0d)).toFixed(3));

  // Interacción Flexo-Compresión:
  // (sigma_c / (kc * fc0d)) + (sigma_m / fmd) <= 1.0
  const dcrCombined = Number((sigmaC / (kc * fc0d) + sigmaM / fmd).toFixed(3));

  steps.push({
    title: 'Resistencia a Compresión con Pandeo (Factor kc / Cp)',
    codeRef: 'EN 1995-1-1 §6.3.2 / NC 206',
    formula: 'σc / (kc · fc,0,d) + σm / fm,d ≤ 1.0',
    values: `kc = ${kc.toFixed(3)}, fc,0,d = ${fc0d.toFixed(1)} MPa, σc = ${sigmaC.toFixed(2)} MPa, σm = ${sigmaM.toFixed(2)} MPa → DCR = ${(dcrCombined * 100).toFixed(1)}%`,
    status: dcrCombined <= 1.0 ? 'OK' : 'DANGER',
    comment: dcrCombined <= 1.0
      ? 'La sección de madera soporta las solicitaciones de carga con margen de seguridad.'
      : 'FALLA: La columna de madera sobrepasa su capacidad última admisible.',
  });

  // Curvas de interacción P-M para madera
  const P_max = (kc * fc0d * A) / 1000; // kN
  const M_max = (fmd * Wx) / 1000000; // kN·m
  const nominalCurve: InteractionPoint[] = [];
  const designCurve: InteractionPoint[] = [];

  for (let i = 0; i <= 20; i++) {
    const fraction = i / 20;
    const P = P_max * fraction;
    // Interacción lineal para madera: P/Pmax + M/Mmax = 1 -> M = Mmax * (1 - P/Pmax)
    const M = Math.max(0, M_max * (1 - fraction));
    nominalCurve.push({ P: P * 1.25, M: M * 1.25 });
    designCurve.push({ P, M });
  }

  // Detalle de herraje metálico de base (Standoff boot)
  const baseBracket = {
    standoffHeightMm: 50, // Elevación para evitar contacto con agua
    plateThicknessMm: 6,
    boltDiameterMm: 16,
    boltCount: b >= 200 ? 4 : 2,
    steelGrade: 'Acero galvanizado en caliente ASTM A36',
  };

  steps.push({
    title: 'Detalle de Conexión en Base y Protección contra Humedad',
    codeRef: 'NC 206 / AITC Timber Construction Manual',
    formula: 'Herraje tipo U con placa de elevación 50mm + pernos pasantes',
    values: `Herraje chapa e = 6 mm, ${baseBracket.boltCount} pernos pasantes Ø16 mm con arandelas de presión. Separación de cimiento = 50 mm.`,
    status: 'OK',
    comment: 'Cumple con los requisitos de preservación estructural de la madera evitando pudrición basal.',
  });

  return {
    slendernessX: lambdaX,
    slendernessY: lambdaY,
    governingSlenderness,
    lambdaRel,
    kcStabilityFactor: kc,
    fc0d,
    fmd,
    sigmaC,
    sigmaM,
    dcrAxial,
    dcrCombined,
    isSafe: dcrCombined <= 1.0 && slendernessOk,
    nominalCurve,
    designCurve,
    baseBracket,
    steps,
  };
}
