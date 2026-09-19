/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DeformationProfilePoint {
  z: number; // Altura en metros (0 a L)
  deflectionMm: number; // Deformada lateral en mm
  momentKNm: number; // Momento flector total (incluyendo 2do orden P-delta)
  stressMPa: number; // Tensión máxima en fibra extrema en MPa
  curvatureRadM: number; // Curvatura 1/m
}

export function computeColumnDeformationProfile(
  heightM: number,
  Pu_kN: number,
  Mux_kNm: number,
  Vux_kN: number,
  EI_kNm2: number, // Rigidez flexional efectiva E·I
  sectionAreaM2: number,
  sectionModulusM3: number,
  kFactor: number = 1.0,
  numPoints: number = 21
): {
  points: DeformationProfilePoint[];
  deltaMaxMm: number;
  maxMomentKNm: number;
  deltaNsMagnifier: number;
  criticalEulerLoadKN: number;
} {
  // 1. Carga crítica de pandeo de Euler Pc = pi² * EI / (k * L)²
  const kL = kFactor * heightM;
  const Pc = (Math.PI * Math.PI * EI_kNm2) / Math.pow(kL, 2); // kN

  // 2. Factor de amplificación de momentos por segundo orden delta_ns
  // delta_ns = Cm / (1 - Pu / (0.75 * Pc)) >= 1.0
  const Cm = 1.0; // Conservador para cargas laterales o curvatura simple
  const denom = 1 - Math.min(0.92, (Pu_kN) / (0.75 * Math.max(Pu_kN * 1.05, Pc)));
  const deltaNsMagnifier = Math.max(1.0, Math.min(3.5, Cm / denom));

  // 3. Momento amplificado máximo Mc
  const M0 = Math.max(Mux_kNm, (Vux_kN * heightM) / 4);
  const maxMomentKNm = M0 * deltaNsMagnifier;

  // 4. Flecha lateral máxima elástica delta_max (mm)
  // Deformación de viga-columna: delta = (M0 * L²) / (9.6 * EI) * delta_ns
  const deltaMaxM = (M0 * Math.pow(heightM, 2)) / (9.6 * Math.max(1, EI_kNm2)) * deltaNsMagnifier;
  const deltaMaxMm = Number((deltaMaxM * 1000).toFixed(2));

  const points: DeformationProfilePoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1); // 0 a 1
    const z = Number((fraction * heightM).toFixed(2));

    // Perfil senoidal de deformada de columna
    const shapeFactor = Math.sin(Math.PI * fraction);
    const deflectionMm = Number((deltaMaxMm * shapeFactor).toFixed(2));

    // Distribución de momento a lo largo de la altura:
    // M(z) = M_lineal(z) + P * delta(z)
    const baseMoment = Mux_kNm * (1 - 0.4 * fraction);
    const pDeltaMoment = (Pu_kN * (deflectionMm / 1000));
    const momentKNm = Number((baseMoment * shapeFactor + pDeltaMoment).toFixed(2));

    // Tensión en fibra extrema: sigma = P / A + M / W
    const sigmaAxial = (Pu_kN / 1000) / sectionAreaM2; // MPa
    const sigmaBend = (momentKNm / 1000) / sectionModulusM3; // MPa
    const stressMPa = Number((sigmaAxial + sigmaBend).toFixed(2));

    // Curvatura kappa = M / EI (rad/m)
    const curvatureRadM = Number((momentKNm / Math.max(1, EI_kNm2)).toFixed(5));

    points.push({
      z,
      deflectionMm,
      momentKNm,
      stressMPa,
      curvatureRadM,
    });
  }

  return {
    points,
    deltaMaxMm,
    maxMomentKNm,
    deltaNsMagnifier: Number(deltaNsMagnifier.toFixed(2)),
    criticalEulerLoadKN: Number(Pc.toFixed(1)),
  };
}
