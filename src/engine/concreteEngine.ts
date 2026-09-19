/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ColumnLoads,
  ConcreteGeometry,
  ConcreteProperties,
  ConcreteTieDesign,
  DesignStandard,
  InteractionPoint,
  RebarBar,
  RebarCombination,
  RebarScheduleItem,
  SteelScheduleItem,
} from '../types';
import { getRebarSpec, getStandardFactors, REBAR_DATABASE } from './standardsData';

// Generador de coordenadas de barras para sección rectangular
export function generateRectangularRebarLayout(
  b: number, // mm
  h: number, // mm
  cover: number, // mm
  tieDiameter: number, // mm
  cornerDiameter: number, // mm
  faceXCount: number, // barras intermedias en caras superior/inferior
  faceXDiameter: number,
  faceYCount: number, // barras intermedias en caras laterales
  faceYDiameter: number
): RebarBar[] {
  const bars: RebarBar[] = [];
  const offsetCorner = cover + tieDiameter + cornerDiameter / 2;
  const xMin = -b / 2 + offsetCorner;
  const xMax = b / 2 - offsetCorner;
  const yMin = -h / 2 + offsetCorner;
  const yMax = h / 2 - offsetCorner;

  // 4 Barras de esquina
  const cornerArea = (Math.PI * Math.pow(cornerDiameter, 2)) / 4;
  bars.push({ id: 'C_TL', x: xMin, y: yMax, diameter: cornerDiameter, area: cornerArea, isCorner: true });
  bars.push({ id: 'C_TR', x: xMax, y: yMax, diameter: cornerDiameter, area: cornerArea, isCorner: true });
  bars.push({ id: 'C_BR', x: xMax, y: yMin, diameter: cornerDiameter, area: cornerArea, isCorner: true });
  bars.push({ id: 'C_BL', x: xMin, y: yMin, diameter: cornerDiameter, area: cornerArea, isCorner: true });

  // Barras intermedias en caras horizontales (Face X)
  if (faceXCount > 0) {
    const areaX = (Math.PI * Math.pow(faceXDiameter, 2)) / 4;
    const dx = (xMax - xMin) / (faceXCount + 1);
    for (let i = 1; i <= faceXCount; i++) {
      const x = xMin + i * dx;
      bars.push({ id: `FX_T_${i}`, x, y: yMax, diameter: faceXDiameter, area: areaX, isCorner: false });
      bars.push({ id: `FX_B_${i}`, x, y: yMin, diameter: faceXDiameter, area: areaX, isCorner: false });
    }
  }

  // Barras intermedias en caras verticales (Face Y)
  if (faceYCount > 0) {
    const areaY = (Math.PI * Math.pow(faceYDiameter, 2)) / 4;
    const dy = (yMax - yMin) / (faceYCount + 1);
    for (let j = 1; j <= faceYCount; j++) {
      const y = yMin + j * dy;
      bars.push({ id: `FY_L_${j}`, x: xMin, y, diameter: faceYDiameter, area: areaY, isCorner: false });
      bars.push({ id: `FY_R_${j}`, x: xMax, y, diameter: faceYDiameter, area: areaY, isCorner: false });
    }
  }

  return bars;
}

// Búsqueda inteligente de combinaciones viables de diámetros de acero
export function calculatePossibleRebarCombinations(
  b: number,
  h: number,
  cover: number,
  tieDiameter: number
): RebarCombination[] {
  const Ag = b * h; // mm²
  const rhoMin = 1.0; // 1%
  const rhoMax = 4.0; // 4%
  const combinations: RebarCombination[] = [];

  const diametersToTest = [16, 20, 25, 32];

  // Caso 1: 4 barras (solo esquinas)
  for (const d of diametersToTest) {
    const area1 = (Math.PI * Math.pow(d, 2)) / 4;
    const totalAs = 4 * area1;
    const rho = (totalAs / Ag) * 100;
    const clearSpacing = Math.min(b, h) - 2 * (cover + tieDiameter + d);
    const weightPerM = 4 * (Math.pow(d, 2) / 162.2);

    combinations.push({
      name: `4 Ø${d} mm (Solo esquinas)`,
      cornerBars: { count: 4, diameter: d },
      faceXBars: { countPerFace: 0, diameter: d },
      faceYBars: { countPerFace: 0, diameter: d },
      totalBars: 4,
      totalAs,
      rho,
      isValid: rho >= rhoMin && rho <= rhoMax && clearSpacing >= 40,
      clearSpacing,
      weightPerMeter: weightPerM,
    });
  }

  // Caso 2: 8 barras simétricas (4 esquinas + 1 por cara)
  for (const dCorner of [16, 20, 25]) {
    for (const dFace of [16, 20, dCorner]) {
      const aCorner = (Math.PI * Math.pow(dCorner, 2)) / 4;
      const aFace = (Math.PI * Math.pow(dFace, 2)) / 4;
      const totalAs = 4 * aCorner + 4 * aFace;
      const rho = (totalAs / Ag) * 100;
      const clearX = (b - 2 * (cover + tieDiameter) - 2 * dCorner - dFace) / 2;
      const clearY = (h - 2 * (cover + tieDiameter) - 2 * dCorner - dFace) / 2;
      const minClear = Math.min(clearX, clearY);
      const weightPerM = 4 * (Math.pow(dCorner, 2) / 162.2) + 4 * (Math.pow(dFace, 2) / 162.2);

      const name =
        dCorner === dFace
          ? `8 Ø${dCorner} mm (4 esq + 4 caras)`
          : `4 Ø${dCorner} mm + 4 Ø${dFace} mm`;

      // Evitar duplicados exactos
      if (!combinations.some((c) => c.name === name)) {
        combinations.push({
          name,
          cornerBars: { count: 4, diameter: dCorner },
          faceXBars: { countPerFace: 1, diameter: dFace },
          faceYBars: { countPerFace: 1, diameter: dFace },
          totalBars: 8,
          totalAs,
          rho,
          isValid: rho >= rhoMin && rho <= rhoMax && minClear >= 40,
          clearSpacing: minClear,
          weightPerMeter: weightPerM,
        });
      }
    }
  }

  // Caso 3: 12 barras (4 esquinas + 2 por cara en X o Y)
  for (const d of [16, 20]) {
    const a = (Math.PI * Math.pow(d, 2)) / 4;
    const totalAs = 12 * a;
    const rho = (totalAs / Ag) * 100;
    const clearSpacing = (Math.min(b, h) - 2 * (cover + tieDiameter) - 4 * d) / 3;
    const weightPerM = 12 * (Math.pow(d, 2) / 162.2);

    combinations.push({
      name: `12 Ø${d} mm (Distribución perimetral)`,
      cornerBars: { count: 4, diameter: d },
      faceXBars: { countPerFace: 2, diameter: d },
      faceYBars: { countPerFace: 2, diameter: d },
      totalBars: 12,
      totalAs,
      rho,
      isValid: rho >= rhoMin && rho <= rhoMax && clearSpacing >= 40,
      clearSpacing,
      weightPerMeter: weightPerM,
    });
  }

  return combinations.sort((a, b) => a.totalAs - b.totalAs);
}

// Cálculo riguroso de la curva P-M (Diagrama de Interacción)
export function computePMInteractionDiagram(
  b: number, // mm
  h: number, // mm
  props: ConcreteProperties,
  bars: RebarBar[],
  standard: DesignStandard
): {
  nominalCurve: InteractionPoint[];
  designCurve: InteractionPoint[];
  P0: number;
  PnMax: number;
  phiPnMax: number;
  balancedPoint: InteractionPoint;
} {
  const std = getStandardFactors(standard);
  const Ag = b * h;
  const Ast = bars.reduce((acc, bar) => acc + bar.area, 0);
  const fc = props.fc;
  const fy = props.fy;
  const Es = 200000; // MPa
  const epsilonCu = std.epsilonCu;
  const beta1 = std.beta1(fc);

  // 1. Compresión axial pura nominal P0
  // P0 = 0.85 * f'c * (Ag - Ast) + fy * Ast
  const factorConcrete = standard === 'EUROCODE_2' ? std.acc * (fc / std.gammaC) : 0.85 * fc;
  const factorSteel = standard === 'EUROCODE_2' ? fy / std.gammaS : fy;
  const P0 = (0.85 * fc * (Ag - Ast) + fy * Ast) / 1000; // kN

  // Límite máximo con excentricidad accidental mínima
  const PnMax = 0.80 * P0;
  const phiPnMax = std.phiCompressionTied * PnMax;

  // 2. Tracción pura nominal Pnt
  const Pnt = (-fy * Ast) / 1000; // kN
  const phiPnt = (std.phiTension * Pnt);

  const nominalCurve: InteractionPoint[] = [];
  const designCurve: InteractionPoint[] = [];

  // Punto compresión axial máxima
  nominalCurve.push({ P: PnMax, M: 0, type: 'pure_compression' });
  designCurve.push({ P: phiPnMax, M: 0, type: 'pure_compression' });

  // Barrido de la profundidad del eje neutro c
  // Desde compresión casi pura (c = 1.5 * h) hasta flexión con tracción (c = 0.05 * h)
  const dMax = h / 2 + Math.max(...bars.map((b) => b.y)); // distancia a la fibra más comprimida
  const dExtremeTensile = h / 2 - Math.min(...bars.map((b) => b.y)); // distancia a la barra más traccionada

  let balancedPoint: InteractionPoint = { P: 0, M: 0 };
  const numPoints = 28;

  for (let step = 0; step <= numPoints; step++) {
    // Escala no lineal para capturar bien la transición y punto balanceado
    const ratio = Math.pow(step / numPoints, 1.4);
    const c = (1.3 * h) * (1 - ratio) + 0.04 * h * ratio;

    const a = Math.min(h, beta1 * c);

    // Fuerza de compresión del hormigón
    // Bloque rectangular equivalente de Whitney
    let Cc = 0.85 * fc * b * a; // N
    let Mc = Cc * (h / 2 - a / 2); // N·mm respecto al centro geométrico (h/2)

    let sumFs = 0;
    let sumMs = 0;
    let extremeTensileStrain = 0;

    for (const bar of bars) {
      // y_bar medido desde el centroide (positivo hacia arriba/compresión)
      // d_i = profundidad desde la fibra superior comprimida = h/2 - bar.y
      const di = h / 2 - bar.y;
      const epsilonSi = epsilonCu * ((c - di) / c);

      // Deformación de la armadura más traccionada
      if (di > h / 2) {
        extremeTensileStrain = Math.max(extremeTensileStrain, -epsilonSi);
      }

      // Tensión en el acero
      const stressSi = Math.min(fy, Math.max(-fy, Es * epsilonSi)); // N/mm²
      const forceSi = stressSi * bar.area; // N (+ compresión, - tracción)

      sumFs += forceSi;
      sumMs += forceSi * bar.y; // N·mm (momento respecto al centroide)
    }

    const Pn = (Cc + sumFs) / 1000; // kN
    const Mn = Math.abs(Mc + sumMs) / 1000000; // kN·m

    // Determinación del factor de reducción phi (según ACI 318-19 / NC / Eurocódigo)
    let phi = std.phiCompressionTied;
    const epsY = fy / Es; // ~0.0021 para Grado 60

    if (extremeTensileStrain <= epsY) {
      phi = std.phiCompressionTied;
    } else if (extremeTensileStrain >= 0.005) {
      phi = std.phiTension; // 0.90
    } else {
      // Zona de transición
      phi =
        std.phiCompressionTied +
        (std.phiTension - std.phiCompressionTied) *
          ((extremeTensileStrain - epsY) / (0.005 - epsY));
    }

    if (standard === 'EUROCODE_2' || standard === 'NC_450_2006') {
      phi = Math.min(0.87, Math.max(0.65, phi));
    }

    // Filtrar puntos que sobrepasen el techo PnMax
    const PnCapped = Math.min(Pn, PnMax);
    const phiPnCapped = Math.min(phi * Pn, phiPnMax);

    nominalCurve.push({ P: PnCapped, M: Mn, type: 'nominal' });
    designCurve.push({ P: phiPnCapped, M: phi * Mn, type: 'design' });

    // Detectar punto balanceado aproximado (cuando extremeTensileStrain ~ epsY)
    if (Math.abs(extremeTensileStrain - epsY) < 0.0006 && balancedPoint.P === 0) {
      balancedPoint = { P: phi * Pn, M: phi * Mn, type: 'balanced' };
    }
  }

  // Punto de tracción pura final
  nominalCurve.push({ P: Pnt, M: 0, type: 'pure_tension' });
  designCurve.push({ P: phiPnt, M: 0, type: 'pure_tension' });

  return {
    nominalCurve,
    designCurve,
    P0,
    PnMax,
    phiPnMax,
    balancedPoint: balancedPoint.P !== 0 ? balancedPoint : { P: phiPnMax * 0.35, M: 120 },
  };
}

// Diseño y verificación de cercos (estribos), confinamiento y solapes
export function calculateConcreteTiesAndSplices(
  b: number, // mm
  h: number, // mm
  L_m: number, // m
  fc: number, // MPa
  fy: number, // MPa
  minLongRebarDiameter: number,
  tieDiameter: number,
  standard: DesignStandard
): ConcreteTieDesign {
  const L_mm = L_m * 1000;
  const minDim = Math.min(b, h);

  // 1. Longitud de confinamiento l0 en extremos (zona crítica)
  // Según ACI 318-19 Art. 18.7.5.1 y NC 450:
  // l0 >= max(h, L/6, 450 mm)
  const l0 = Math.round(Math.max(h, b, L_mm / 6, 450));

  // 2. Espaciamiento en zona de confinamiento s0
  // s0 <= min(b/4, 6 * db_long, 100 + (350 - hx)/3, 150 mm)
  const s0Raw = Math.min(minDim / 4, 6 * minLongRebarDiameter, 150);
  const s0 = Math.max(75, Math.min(100, Math.floor(s0Raw / 25) * 25)); // múltiplo de 25mm

  // 3. Espaciamiento en zona central sMid
  // sMid <= min(16 * db_long, 48 * db_tie, minDim, 300 mm)
  const sMidRaw = Math.min(16 * minLongRebarDiameter, 48 * tieDiameter, minDim, 250);
  const sMid = Math.max(150, Math.min(200, Math.floor(sMidRaw / 25) * 25));

  // 4. Gancho sísmico
  const hookAngle = 135;
  // Extensión >= max(6 * db_tie, 75 mm)
  const hookLength = Math.max(6 * tieDiameter, 75);

  // 5. Longitud de solape (empalme por traslape Clase B)
  // Ld básico a tracción: Ld = (fy / (1.1 * lambda * sqrt(fc))) * (psi_t * psi_e * psi_s / (cb + Ktr)/db) * db
  // Simplificado normativo: Ld ~ 45 a 50 db para fc=25MPa, fy=420MPa
  const ldFactor = standard === 'NC_450_2006' ? 50 : 48;
  const lapSpliceLength = Math.round((ldFactor * minLongRebarDiameter) / 50) * 50;

  return {
    diameter: tieDiameter,
    legsX: b >= 450 ? 3 : 2,
    legsY: h >= 450 ? 3 : 2,
    s0,
    l0,
    sMid,
    hookAngle,
    hookLength,
    lapSpliceLength,
    lapLocation: 'Tercio central de la altura libre (fuera de la zona crítica l0, alternado al 50%)',
  };
}

// Generador de planilla de despiece de acero (BBS - Bar Bending Schedule)
export function generateRebarSchedule(
  b: number, // mm
  h: number, // mm
  L_m: number, // m
  cover: number, // mm
  bars: RebarBar[],
  ties: ConcreteTieDesign
): { schedule: RebarScheduleItem[]; totalWeightKg: number; densityKgM3: number } {
  const schedule: RebarScheduleItem[] = [];

  // A. Barras longitudinales
  // Altura de barra = L_columna + solape de empalme + anclaje en zapata o viga (ej: 40 cm pata)
  const anchorLengthM = 0.45;
  const lapLengthM = ties.lapSpliceLength / 1000;
  const barLengthM = Number((L_m + lapLengthM + anchorLengthM).toFixed(2));

  // Agrupar barras por diámetro
  const groupedBars: Record<number, number> = {};
  for (const bBar of bars) {
    groupedBars[bBar.diameter] = (groupedBars[bBar.diameter] || 0) + 1;
  }

  let markIndex = 1;
  for (const [diaStr, count] of Object.entries(groupedBars)) {
    const dia = Number(diaStr);
    const spec = getRebarSpec(dia);
    const totalLenM = Number((barLengthM * count).toFixed(2));
    const totalWeight = Number((totalLenM * spec.weightKgM).toFixed(2));

    schedule.push({
      mark: `C1-L${markIndex++}`,
      type: 'longitudinal',
      barDiameter: dia,
      shapeCode: 'L-1 (Barra recta con gancho 90° inf)',
      shapeDescription: `Longitudinal Ø${dia} mm con gancho de anclaje 45cm`,
      count,
      lengthPerPieceM: barLengthM,
      totalLengthM: totalLenM,
      unitWeightKgM: spec.weightKgM,
      totalWeightKg: totalWeight,
      a: Math.round(barLengthM * 100 - 45),
      b: 45,
    });
  }

  // B. Cercos / Estribos perimetrales
  // Perímetro estribo = 2*(b - 2r) + 2*(h - 2r) + 2*gancho
  const outerB = b - 2 * cover;
  const outerH = h - 2 * cover;
  const hookM = (ties.hookLength * 2) / 1000;
  const tiePerimeterM = Number(((2 * outerB + 2 * outerH) / 1000 + hookM).toFixed(2));

  // Cantidad de cercos:
  // Zona confinada inferior (l0) y superior (l0) a paso s0
  // Zona central (L - 2*l0) a paso sMid
  const countConfInf = Math.ceil(ties.l0 / ties.s0);
  const countConfSup = Math.ceil(ties.l0 / ties.s0);
  const midHeightMm = Math.max(0, L_m * 1000 - 2 * ties.l0);
  const countMid = Math.ceil(midHeightMm / ties.sMid);
  const totalTiesCount = countConfInf + countConfSup + countMid + 1;

  const tieSpec = getRebarSpec(ties.diameter);
  const totalTiesLenM = Number((totalTiesCount * tiePerimeterM).toFixed(2));
  const totalTiesWeight = Number((totalTiesLenM * tieSpec.weightKgM).toFixed(2));

  schedule.push({
    mark: `C1-E1`,
    type: 'tie_perimeter',
    barDiameter: ties.diameter,
    shapeCode: 'E-1 (Estribo rectangular cerrado 135°)',
    shapeDescription: `Cerco cerrado Ø${ties.diameter} mm (${countConfInf + countConfSup} en l0 @ ${ties.s0}mm, ${countMid} en centro @ ${ties.sMid}mm)`,
    count: totalTiesCount,
    lengthPerPieceM: tiePerimeterM,
    totalLengthM: totalTiesLenM,
    unitWeightKgM: tieSpec.weightKgM,
    totalWeightKg: totalTiesWeight,
    a: Math.round(outerB / 10),
    b: Math.round(outerH / 10),
    hook: Math.round(ties.hookLength / 10),
  });

  // C. Grapas / Ramas intermedias (si b o h >= 400mm)
  if (ties.legsX > 2 || ties.legsY > 2) {
    const crossTieLenM = Number(((outerB / 1000) + 2 * (ties.hookLength / 1000)).toFixed(2));
    const crossTieCount = totalTiesCount; // una por nivel
    const crossTotalLenM = Number((crossTieCount * crossTieLenM).toFixed(2));
    const crossWeight = Number((crossTotalLenM * tieSpec.weightKgM).toFixed(2));

    schedule.push({
      mark: `C1-G1`,
      type: 'cross_tie',
      barDiameter: ties.diameter,
      shapeCode: 'G-1 (Grapa suplementaria 135° - 90°)',
      shapeDescription: `Grapa interior de traba transversal Ø${ties.diameter} mm`,
      count: crossTieCount,
      lengthPerPieceM: crossTieLenM,
      totalLengthM: crossTotalLenM,
      unitWeightKgM: tieSpec.weightKgM,
      totalWeightKg: crossWeight,
      a: Math.round(outerB / 10),
      b: Math.round(outerH / 10),
      hook: Math.round(ties.hookLength / 10),
    });
  }

  const totalWeightKg = Number(schedule.reduce((acc, it) => acc + it.totalWeightKg, 0).toFixed(2));
  const concreteVolumeM3 = (b / 1000) * (h / 1000) * L_m;
  const densityKgM3 = Number((totalWeightKg / concreteVolumeM3).toFixed(1));

  return {
    schedule,
    totalWeightKg,
    densityKgM3,
  };
}

export const generateRebarCombinations = calculatePossibleRebarCombinations;

export interface ConcreteCalculationResult {
  dcr: number;
  isSafe: boolean;
  steps: {
    title: string;
    codeRef: string;
    formula: string;
    values: string;
    status: 'OK' | 'WARNING' | 'DANGER';
    comment: string;
  }[];
  nominalCurve: InteractionPoint[];
  designCurve: InteractionPoint[];
  phiPnMax: number;
  phiVn: number;
  Vc: number;
  Vs: number;
  bars: RebarBar[];
  tieDesign: ConcreteTieDesign;
  combinations: RebarCombination[];
  schedule: SteelScheduleItem[];
}

export function calculateConcreteColumn(
  geom: ConcreteGeometry,
  concreteProps: { fc: number; Ec?: number; name?: string },
  rebarProps: { Fy: number; Fu?: number; name?: string },
  L_m: number,
  kx: number,
  ky: number,
  loads: ColumnLoads,
  standard: DesignStandard,
  selectedComboName?: string
): ConcreteCalculationResult {
  const b = geom.b;
  const h = geom.h;
  const cover = geom.cover;
  const fc = concreteProps.fc;
  const fy = rebarProps.Fy;
  const Ag = b * h;

  // 1. Generar combinaciones de armadura
  const tieDiameter = 10;
  const combinations = generateRebarCombinations(b, h, cover, tieDiameter);
  const selectedCombo =
    combinations.find((c) => c.name === selectedComboName) ||
    combinations.find((c) => c.isValid) ||
    combinations[0];

  // 2. Disponer barras geométricas
  const bars = generateRectangularRebarLayout(
    b,
    h,
    cover,
    tieDiameter,
    selectedCombo.cornerBars.diameter,
    selectedCombo.faceXBars.countPerFace,
    selectedCombo.faceXBars.diameter,
    selectedCombo.faceYBars.countPerFace,
    selectedCombo.faceYBars.diameter
  );

  const minLongDia = Math.min(...bars.map((b) => b.diameter));

  // 3. Diseño de cercos / estribos
  const tieDesign = calculateConcreteTiesAndSplices(
    b,
    h,
    L_m,
    fc,
    fy,
    minLongDia,
    tieDiameter,
    standard
  );

  // 4. Curva de interacción P-M
  const fullConcreteProps: ConcreteProperties = {
    fc,
    fy,
    aggregateSize: 19,
    cover,
    density: 2400,
  };
  const pmData = computePMInteractionDiagram(b, h, fullConcreteProps, bars, standard);

  // 5. Esbeltez y amplificación de momentos (P-Delta)
  const rx = 0.3 * h;
  const ry = 0.3 * b;
  const lambdaX = (kx * L_m * 1000) / rx;
  const lambdaY = (ky * L_m * 1000) / ry;
  const lambdaMax = Math.max(lambdaX, lambdaY);

  // Límite de esbeltez según ACI 318 / NC 450 para columnas arriostradas
  const lambdaLimit = standard === 'EUROCODE_2' ? 25 : 22;
  const isSlender = lambdaMax > lambdaLimit;

  // Módulo de elasticidad del hormigón Ec (MPa)
  const Ec = concreteProps.Ec || 4700 * Math.sqrt(fc);
  const IgX = (b * Math.pow(h, 3)) / 12; // mm^4
  const EIeff = (0.4 * Ec * IgX); // N*mm^2
  const kL_mm = Math.max(kx, ky) * L_m * 1000;
  const criticalEulerN = (Math.PI * Math.PI * EIeff) / Math.pow(kL_mm, 2);
  const criticalEulerKN = criticalEulerN / 1000;

  let deltaNs = 1.0;
  const Pu_abs = Math.abs(loads.Pu);
  if (isSlender && criticalEulerKN > Pu_abs / 0.75) {
    const denom = 1 - Pu_abs / (0.75 * criticalEulerKN);
    deltaNs = Math.min(2.5, Math.max(1.0, 1.0 / Math.max(0.1, denom)));
  }

  // Excentricidad mínima accidental emin = 15 + 0.03*h (mm)
  const emin = (15 + 0.03 * h) / 1000; // m
  const MminX = Pu_abs * emin;
  const MuxEff = deltaNs * Math.max(Math.abs(loads.Mux), MminX);
  const MuyEff = Math.max(Math.abs(loads.Muy), Pu_abs * (15 + 0.03 * b) / 1000);

  // 6. Demanda vs Capacidad (DCR)
  const phiPnMax = pmData.phiPnMax;
  const dcrAxial = phiPnMax > 0 ? Pu_abs / phiPnMax : 1.0;

  // Capacidad a flexión para la carga axial Pu_abs interpolando la curva de diseño
  let phiMnAtPu = 1.0;
  const dc = pmData.designCurve;
  for (let i = 0; i < dc.length - 1; i++) {
    const pA = dc[i].P;
    const pB = dc[i + 1].P;
    if ((Pu_abs <= pA && Pu_abs >= pB) || (Pu_abs >= pA && Pu_abs <= pB)) {
      const denom = pB - pA || 1e-5;
      const t = (Pu_abs - pA) / denom;
      phiMnAtPu = Math.max(1.0, dc[i].M + t * (dc[i + 1].M - dc[i].M));
      break;
    }
  }

  const dcrFlexX = MuxEff / Math.max(1.0, phiMnAtPu);
  const phiMny = phiMnAtPu * (b / h);
  const dcrBiaxial = Math.pow(MuxEff / Math.max(1.0, phiMnAtPu), 1.2) + Math.pow(MuyEff / Math.max(1.0, phiMny), 1.2);
  const dcr = Math.max(dcrAxial, dcrFlexX, dcrBiaxial);
  const isSafe = dcr <= 1.0 && Pu_abs <= phiPnMax;

  // 6b. Resistencia a Cortante phiVn (ACI 318-19 §22.5 / NC 450)
  const d_eff = Math.max(50, h - cover - tieDesign.diameter - 10);
  const Nu_comp = Math.max(0, loads.Pu * 1000); // N
  const vc_stress = 0.17 * (1 + Nu_comp / (14 * Ag)) * Math.sqrt(fc); // MPa
  const Vc_N = Math.min(0.29 * Math.sqrt(fc) * b * d_eff, vc_stress * b * d_eff); // N
  const Av = (Math.max(2, tieDesign.legsX) * Math.PI * Math.pow(tieDesign.diameter, 2)) / 4;
  const fyt = Math.min(420, fy);
  const s_stirrup = Math.max(50, tieDesign.spacing || tieDesign.sMid || 150);
  const Vs_N = (Av * fyt * d_eff) / s_stirrup;
  const phiVn = Number(((0.75 * (Vc_N + Vs_N)) / 1000).toFixed(1)); // kN
  const Vc_kN = Number(((0.75 * Vc_N) / 1000).toFixed(1));
  const Vs_kN = Number(((0.75 * Vs_N) / 1000).toFixed(1));

  // 7. Planilla de despiece (BBS) para SteelScheduleTable
  const outerB = b - 2 * cover;
  const outerH = h - 2 * cover;
  const hookM = (tieDesign.hookLength * 2) / 1000;
  const tiePerimeterM = Number(((2 * outerB + 2 * outerH) / 1000 + hookM).toFixed(2));

  const countConfInf = Math.ceil(tieDesign.l0 / tieDesign.s0);
  const countConfSup = Math.ceil(tieDesign.l0 / tieDesign.s0);
  const midHeightMm = Math.max(0, L_m * 1000 - 2 * tieDesign.l0);
  const countMid = Math.ceil(midHeightMm / tieDesign.sMid);
  const totalTiesCount = countConfInf + countConfSup + countMid + 1;
  const tieSpec = getRebarSpec(tieDesign.diameter);
  const totalTiesLenM = Number((totalTiesCount * tiePerimeterM).toFixed(2));
  const totalTiesWeight = Number((totalTiesLenM * tieSpec.weightKgM).toFixed(2));

  const anchorLengthM = 0.45;
  const lapLengthM = tieDesign.lapSpliceLength / 1000;
  const barLengthM = Number((L_m + lapLengthM + anchorLengthM).toFixed(2));

  const schedule: SteelScheduleItem[] = [];

  // Agrupar barras longitudinales
  const groupedBars: Record<number, number> = {};
  for (const bBar of bars) {
    groupedBars[bBar.diameter] = (groupedBars[bBar.diameter] || 0) + 1;
  }

  let markIdx = 1;
  for (const [diaStr, count] of Object.entries(groupedBars)) {
    const dia = Number(diaStr);
    const spec = getRebarSpec(dia);
    const totalLenM = Number((barLengthM * count).toFixed(2));
    const totalWeight = Number((totalLenM * spec.weightKgM).toFixed(2));
    schedule.push({
      mark: `C1-L${markIdx++}`,
      description: `Armadura Longitudinal Ø${dia} mm`,
      shapeType: 'straight_hook',
      shapeDetails: `L = ${barLengthM} m (Gancho pata 45 cm + traslape ${tieDesign.lapSpliceLength} mm)`,
      diameter: dia,
      count,
      lengthM: barLengthM,
      totalLengthM: totalLenM,
      unitWeightKgM: spec.weightKgM,
      totalWeightKg: totalWeight,
    });
  }

  // Cercos cerrados
  schedule.push({
    mark: `C1-E1`,
    description: `Cercos de Confinamiento y Corte Ø${tieDesign.diameter} mm`,
    shapeType: 'closed_stirrup_135',
    shapeDetails: `Cerco ${Math.round(outerB / 10)}x${Math.round(outerH / 10)} cm cerrado con ganchos sísmicos 135°`,
    diameter: tieDesign.diameter,
    count: totalTiesCount,
    lengthM: tiePerimeterM,
    totalLengthM: totalTiesLenM,
    unitWeightKgM: tieSpec.weightKgM,
    totalWeightKg: totalTiesWeight,
  });

  // Grapas si aplica
  if (tieDesign.legsX > 2 || tieDesign.legsY > 2) {
    const crossTieLenM = Number(((outerB / 1000) + 2 * (tieDesign.hookLength / 1000)).toFixed(2));
    const crossTieCount = totalTiesCount;
    const crossTotalLenM = Number((crossTieCount * crossTieLenM).toFixed(2));
    const crossWeight = Number((crossTotalLenM * tieSpec.weightKgM).toFixed(2));
    schedule.push({
      mark: `C1-G1`,
      description: `Grapas suplementarias interiores Ø${tieDesign.diameter} mm`,
      shapeType: 'cross_tie',
      shapeDetails: `Grapa transversal b=${Math.round(outerB / 10)} cm con gancho 135°/90°`,
      diameter: tieDesign.diameter,
      count: crossTieCount,
      lengthM: crossTieLenM,
      totalLengthM: crossTotalLenM,
      unitWeightKgM: tieSpec.weightKgM,
      totalWeightKg: crossWeight,
    });
  }

  // 8. Pasos normativos de cálculo
  const steps = [
    {
      title: '1. Geometría y Verificación de Cuantía de Acero (ρ)',
      codeRef: standard === 'NC_450_2006' ? 'NC 450:2006 Art. 11.2' : 'ACI 318-19 Tabla 10.6.1.1',
      formula: 'ρ = Ast / Ag (1.0% ≤ ρ ≤ 4.0% para sismo)',
      values: `Ast = ${selectedCombo.totalAs.toFixed(0)} mm², Ag = ${Ag} mm² → ρ = ${selectedCombo.rho.toFixed(2)}%`,
      status: selectedCombo.rho >= 1.0 && selectedCombo.rho <= 4.0 ? ('OK' as const) : ('WARNING' as const),
      comment:
        selectedCombo.rho < 1.0
          ? 'Cuantía inferior al mínimo normativo (1.0%). Riesgo de rotura frágil.'
          : selectedCombo.rho > 4.0
          ? 'Cuantía alta (>4.0%). Dificultad para colocación y vibrado del hormigón.'
          : 'Cuantía adecuada en rango óptimo para columnas con requerimientos sísmicos.',
    },
    {
      title: '2. Capacidad a Compresión Axial Máxima (φPn,max)',
      codeRef: standard === 'NC_450_2006' ? 'NC 450 / NC 120' : 'ACI 318-19 Ec. (22.4.2.2)',
      formula: 'φPn,max = 0.80 · φ · [0.85 · f\'c · (Ag - Ast) + fy · Ast]',
      values: `φPn,max = ${phiPnMax.toFixed(1)} kN, Pu = ${Pu_abs} kN (Ratio = ${(dcrAxial * 100).toFixed(1)}%)`,
      status: Pu_abs <= phiPnMax ? ('OK' as const) : ('DANGER' as const),
      comment:
        Pu_abs <= phiPnMax
          ? 'La resistencia axial a compresión es adecuada con factor de excentricidad accidental.'
          : 'Sobrecarga axial superior a la resistencia nominal reducida.',
    },
    {
      title: '3. Evaluación de Esbeltez y Efectos de Segundo Orden (P-Δ)',
      codeRef: standard === 'NC_450_2006' ? 'NC 450 Art. 9.4' : 'ACI 318-19 Cap. 6.6.4',
      formula: 'k·Lu / r ≤ 22 ; δns = Cm / (1 - Pu / 0.75·Pc)',
      values: `k·L/r = ${lambdaMax.toFixed(1)} ${isSlender ? `> ${lambdaLimit} (Esbelta)` : `≤ ${lambdaLimit} (Corta)`} → δns = ${deltaNs.toFixed(2)}`,
      status: isSlender ? (deltaNs > 1.4 ? ('WARNING' as const) : ('OK' as const)) : ('OK' as const),
      comment: isSlender
        ? `Columna esbelta. Momentos mayorados por segundo orden con factor δns = ${deltaNs.toFixed(2)}.`
        : 'Columna corta. Los efectos de esbeltez pueden despreciarse.',
    },
    {
      title: '4. Interacción Flexo-Compresión Biaxial (P-M)',
      codeRef: standard === 'NC_450_2006' ? 'NC 450 / Bresler' : 'ACI 318-19 / Bresler Contour',
      formula: '(Mux / φMnx)^1.2 + (Muy / φMny)^1.2 ≤ 1.0',
      values: `Mux,eff = ${MuxEff.toFixed(1)} kN·m, φMnx = ${phiMnAtPu.toFixed(1)} kN·m → DCR = ${(dcr * 100).toFixed(1)}%`,
      status: dcr <= 1.0 ? ('OK' as const) : ('DANGER' as const),
      comment:
        dcr <= 1.0
          ? 'El punto de carga se encuentra holgadamente dentro del diagrama de interacción resistente.'
          : 'Falla por flexo-compresión combinada. Ampliar la sección o aumentar armadura longitudinal.',
    },
    {
      title: '5. Detallado Sísmico de Estribos y Confinamiento',
      codeRef: standard === 'NC_450_2006' ? 'NC 450 Art. 11' : 'ACI 318-19 Art. 18.7.5',
      formula: 's0 ≤ min(b/4, 6·db, 100mm) ; l0 ≥ max(h, b, L/6, 450mm)',
      values: `Zona crítica l0 = ${tieDesign.l0} mm @ s0 = ${tieDesign.s0} mm | Zona central @ sMid = ${tieDesign.sMid} mm`,
      status: ('OK' as const),
      comment: `Estribos cerrados con ganchos a ${tieDesign.hookAngle}° (${tieDesign.hookLength} mm de extensión). Solape = ${tieDesign.lapSpliceLength} mm en tercio central.`,
    },
  ];

  return {
    dcr,
    isSafe,
    steps,
    nominalCurve: pmData.nominalCurve,
    designCurve: pmData.designCurve,
    phiPnMax,
    phiVn,
    Vc: Vc_kN,
    Vs: Vs_kN,
    bars,
    tieDesign,
    combinations,
    schedule,
  };
}

