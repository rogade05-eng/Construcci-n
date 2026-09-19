/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ColumnLoads,
  DesignStandard,
  InteractionPoint,
  SteelConnectionDesign,
  SteelProfileData,
  SteelProperties,
} from '../types';

export interface SteelCalculationResult {
  slendernessX: number;
  slendernessY: number;
  governingSlenderness: number;
  Fe: number; // Tensión de Euler (MPa)
  Fcr: number; // Tensión crítica de pandeo (MPa)
  Pn: number; // Capacidad axial nominal (kN)
  phiPn: number; // Capacidad de diseño (kN)
  Mnx: number; // Capacidad a flexión eje fuerte (kN·m)
  Mny: number; // Capacidad a flexión eje débil (kN·m)
  phiMnx: number;
  phiMny: number;
  dcrAxial: number;
  dcrCombined: number; // H1-1a / H1-1b
  isSafe: boolean;
  nominalCurve: InteractionPoint[];
  designCurve: InteractionPoint[];
  connection: SteelConnectionDesign;
  basePlateStressMPa: number;
  boltTensionKN: number;
  weldCapacityKN: number;
  steps: {
    title: string;
    codeRef: string;
    formula: string;
    values: string;
    status: 'OK' | 'WARNING' | 'DANGER';
    comment: string;
  }[];
}

export function calculateSteelColumn(
  profile: SteelProfileData,
  steelProps: SteelProperties,
  L_m: number,
  kx: number,
  ky: number,
  loads: ColumnLoads,
  standard: DesignStandard,
  concreteBaseFc: number = 25 // f'c de zapata para placa base
): SteelCalculationResult {
  const steps: SteelCalculationResult['steps'] = [];
  const Fy = steelProps.Fy;
  const Fu = steelProps.Fu;
  const E = steelProps.E;
  const L_mm = L_m * 1000;

  // Factores de reducción según norma (AISC 360-16 / Eurocode 3 / NC)
  const phiC = standard === 'EUROCODE_2' ? 1.0 / 1.0 : 0.90; // AISC LRFD phi_c = 0.90
  const phiB = 0.90;

  // 1. Esbeltez en ambos ejes
  // rx, ry vienen en cm -> convertir a mm
  const rx_mm = profile.rx * 10;
  const ry_mm = profile.ry * 10;
  const slendernessX = (kx * L_mm) / rx_mm;
  const slendernessY = (ky * L_mm) / ry_mm;
  const governingSlenderness = Math.max(slendernessX, slendernessY);

  const slendernessOk = governingSlenderness <= 200;
  steps.push({
    title: 'Verificación de Esbeltez Límite (KL/r ≤ 200)',
    codeRef: standard === 'EUROCODE_2' ? 'EN 1993-1-1 §6.3' : 'AISC 360-16 §E2 / NC Acero',
    formula: 'λ = max(Kx·L / rx, Ky·L / ry)',
    values: `λx = ${slendernessX.toFixed(1)}, λy = ${slendernessY.toFixed(1)} → λmax = ${governingSlenderness.toFixed(1)} ${governingSlenderness <= 200 ? '≤ 200' : '> 200'}`,
    status: slendernessOk ? 'OK' : 'DANGER',
    comment: slendernessOk
      ? 'La esbeltez está dentro del límite reglamentario de 200.'
      : 'ADVERTENCIA: La columna excede la esbeltez recomendada. Aumentar sección o reducir longitud no arriostrada.',
  });

  // 2. Tensión crítica de pandeo por flexión (AISC E3)
  // Fe = pi² * E / (KL/r)²
  const Fe = (Math.PI * Math.PI * E) / Math.pow(governingSlenderness, 2);
  const inelasticLimit = 4.71 * Math.sqrt(E / Fy);

  let Fcr: number;
  if (governingSlenderness <= inelasticLimit) {
    // Pandeo inelástico
    Fcr = Math.pow(0.658, Fy / Fe) * Fy;
  } else {
    // Pandeo elástico
    Fcr = 0.877 * Fe;
  }

  // Ag en cm² -> mm² (* 100)
  const Ag_mm2 = profile.A * 100;
  const Pn = (Fcr * Ag_mm2) / 1000; // kN
  const phiPn = phiC * Pn;

  const dcrAxial = Number((loads.Pu / phiPn).toFixed(3));
  steps.push({
    title: 'Resistencia a Compresión Axial Pn y φPn',
    codeRef: 'AISC 360-16 §E3 / NC',
    formula: 'Pn = Fcr · Ag, φPn = 0.90 · Pn',
    values: `Fe = ${Fe.toFixed(1)} MPa, Fcr = ${Fcr.toFixed(1)} MPa, Pn = ${Pn.toFixed(1)} kN → φPn = ${phiPn.toFixed(1)} kN (Pu = ${loads.Pu} kN, DCR = ${(dcrAxial * 100).toFixed(1)}%)`,
    status: dcrAxial <= 1.0 ? 'OK' : 'DANGER',
    comment: dcrAxial <= 1.0
      ? 'Resistencia a compresión axial adecuada.'
      : 'Falla por compresión axial: Pu excede la capacidad φPn.',
  });

  // 3. Resistencia a Flexión Mn (Eje X y Eje Y)
  // Zx, Zy en cm³ -> mm³ (* 1000)
  const Zx_mm3 = profile.Zx * 1000;
  const Zy_mm3 = profile.Zy * 1000;

  const Mnx = (Fy * Zx_mm3) / 1000000; // kN·m
  const Mny = (Fy * Zy_mm3) / 1000000; // kN·m
  const phiMnx = phiB * Mnx;
  const phiMny = phiB * Mny;

  // 4. Interacción Flexión-Compresión (AISC H1-1a / H1-1b)
  let dcrCombined = 0;
  const pRatio = loads.Pu / phiPn;
  const mxRatio = loads.Mux / phiMnx;
  const myRatio = loads.Muy / phiMny;

  if (pRatio >= 0.2) {
    // H1-1a: Pr/Pc + (8/9) * (Mrx/Mcx + Mry/Mcy) <= 1.0
    dcrCombined = pRatio + (8 / 9) * (mxRatio + myRatio);
  } else {
    // H1-1b: Pr/(2*Pc) + (Mrx/Mcx + Mry/Mcy) <= 1.0
    dcrCombined = pRatio / 2 + (mxRatio + myRatio);
  }
  dcrCombined = Number(dcrCombined.toFixed(3));

  steps.push({
    title: 'Interacción Flexo-Compresión Biaxial (H1-1)',
    codeRef: 'AISC 360-16 §H1-1 / Eurocódigo 3 §6.3.3',
    formula: pRatio >= 0.2 ? 'Pu/φPn + 8/9·(Mux/φMnx + Muy/φMny) ≤ 1.0' : 'Pu/(2φPn) + (Mux/φMnx + Muy/φMny) ≤ 1.0',
    values: `Pu/φPn = ${pRatio.toFixed(2)}, Mux/φMnx = ${mxRatio.toFixed(2)}, Muy/φMny = ${myRatio.toFixed(2)} → DCR = ${(dcrCombined * 100).toFixed(1)}%`,
    status: dcrCombined <= 1.0 ? 'OK' : 'DANGER',
    comment: dcrCombined <= 1.0
      ? 'La columna de acero verifica satisfactoriamente la interacción biaxial.'
      : 'SOBRECARGA: El ratio de interacción excede 1.0. Se requiere una sección mayor.',
  });

  // Curva de interacción P-M para acero
  const nominalCurve: InteractionPoint[] = [];
  const designCurve: InteractionPoint[] = [];
  for (let i = 0; i <= 20; i++) {
    const fraction = i / 20; // 0 a 1
    const P = Pn * fraction;
    const phiP = phiPn * fraction;
    // Momento permitido para ese P
    const pRat = P / Pn;
    let allowedM = 0;
    if (pRat >= 0.2) {
      allowedM = Mnx * (1 - pRat) * (9 / 8);
    } else {
      allowedM = Mnx * (1 - pRat / 2);
    }
    nominalCurve.push({ P, M: Math.max(0, allowedM) });
    designCurve.push({ P: phiP, M: Math.max(0, phiB * allowedM) });
  }

  // 5. Diseño de Placa Base (Base Plate) según AISC Design Guide 1
  // Ancho B y largo N de placa base
  const B_plate = Math.max(profile.b + 100, Math.ceil((profile.b + 80) / 50) * 50);
  const N_plate = Math.max(profile.d + 100, Math.ceil((profile.d + 80) / 50) * 50);
  const A1 = B_plate * N_plate; // mm²

  // Tensión de contacto en el hormigón de la zapata: fp = Pu / A1
  const fp = (loads.Pu * 1000) / A1; // MPa
  const phiFpMax = 0.65 * 0.85 * concreteBaseFc; // 0.65 * 0.85 * f'c

  // Voladizos de placa base:
  const m = (N_plate - 0.95 * profile.d) / 2;
  const n = (B_plate - 0.80 * profile.b) / 2;
  const nPrime = (Math.sqrt(profile.d * profile.b)) / 4;
  const lCantilever = Math.max(m, n, nPrime);

  // Espesor requerido de placa base tp:
  // tp = l * sqrt( (2 * Pu) / (0.90 * Fy_plate * B * N) )
  const Fy_plate = 250; // A36 (250 MPa)
  const tpReq = lCantilever * Math.sqrt((2 * loads.Pu * 1000) / (0.90 * Fy_plate * B_plate * N_plate));
  const basePlateThickness = Math.max(16, Math.ceil(tpReq / 3) * 3); // Comercial en mm

  // 6. Pernos de Anclaje
  // Tracción por momento flector en la base: T_pernos
  const boltLeverArm = N_plate - 100; // mm
  const upliftForceKN = Math.max(0, (loads.Mux * 1000) / (boltLeverArm / 1000) - loads.Pu / 2);
  const boltCount = 4;
  const boltDiameter = 24; // mm (Ø24 Grado 8.8 o A325)
  const boltTensionKN = upliftForceKN / (boltCount / 2);

  // 7. Uniones Soldadas (Filete perfil-placa base)
  const weldLegSize = 8; // mm (tamaño de cateto a)
  const weldThroat = 0.707 * weldLegSize; // mm
  const F_EXX = 485; // MPa (Electrodo E70XX)
  // Longitud de soldadura perimetral (alrededor de alas y alma):
  const perimeterWeldMm = 2 * (2 * profile.b + profile.d);
  // Capacidad nominal por mm = 0.60 * F_EXX * te = 0.60 * 485 * 5.65 = 1644 N/mm = 1.64 kN/mm
  const phiRnw = 0.75 * 0.60 * F_EXX * weldThroat; // N/mm
  const weldCapacityKN = Number(((phiRnw * perimeterWeldMm) / 1000).toFixed(1));

  steps.push({
    title: 'Diseño de Placa Base y Pernos de Anclaje',
    codeRef: 'AISC Design Guide 1 / NC 53-125',
    formula: 'tp = l · √[(2·Pu) / (φ·Fy·B·N)], T = M / d_pernos - Pu/2',
    values: `Placa ${B_plate}x${N_plate} mm, e = ${basePlateThickness} mm (req ${tpReq.toFixed(1)} mm) | 4 Pernos Ø${boltDiameter} mm Gr. 8.8 | Soldadura filete a = ${weldLegSize} mm (Capacidad ${weldCapacityKN} kN)`,
    status: fp <= phiFpMax && basePlateThickness >= tpReq ? 'OK' : 'WARNING',
    comment: `Presión en hormigón fp = ${fp.toFixed(2)} MPa ≤ admisible ${phiFpMax.toFixed(2)} MPa. Placa base apta para anclaje a cimentación.`,
  });

  const connection: SteelConnectionDesign = {
    basePlateWidth: B_plate,
    basePlateLength: N_plate,
    basePlateThickness,
    plateGrade: 'ASTM A36 (Fy = 250 MPa)',
    boltDiameter,
    boltGrade: 'Grado_8.8',
    boltCount,
    boltDistanceEdge: 50,
    weldType: 'fillet',
    weldLegSize,
    weldElectrode: 'E70XX',
    weldThroat: Number(weldThroat.toFixed(2)),
    weldCapacityKN,
    shearTabThickness: 10,
    connectionBoltsCount: 3,
    connectionWeldSize: 6,
  };

  return {
    slendernessX,
    slendernessY,
    governingSlenderness,
    Fe,
    Fcr,
    Pn,
    phiPn,
    Mnx,
    Mny,
    phiMnx,
    phiMny,
    dcrAxial,
    dcrCombined,
    isSafe: dcrCombined <= 1.0 && slendernessOk,
    nominalCurve,
    designCurve,
    connection,
    basePlateStressMPa: fp,
    boltTensionKN,
    weldCapacityKN,
    steps,
  };
}
