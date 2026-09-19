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
import { calculateConcreteColumn } from './concreteEngine';
import { calculateSteelColumn } from './steelEngine';
import { calculateWoodColumn } from './woodEngine';
import { STEEL_PROFILES } from './standardsData';

export interface SectionOptimizationResult {
  material: MaterialType;
  success: boolean;
  message: string;
  originalDcr: number;
  optimizedDcr: number;
  dcrDelta: number;
  targetDcr: number;

  // Hormigón
  concrete?: {
    originalB: number;
    originalH: number;
    optimizedB: number;
    optimizedH: number;
    recommendedComboName?: string;
    areaReductionPct: number;
    originalAreaCm2: number;
    optimizedAreaCm2: number;
  };

  // Acero
  steel?: {
    originalProfileId: string;
    originalProfileDesignation: string;
    optimizedProfileId: string;
    optimizedProfileDesignation: string;
    originalWeightKgM: number;
    optimizedWeightKgM: number;
    weightReductionPct: number;
  };

  // Madera
  wood?: {
    originalB: number;
    originalH: number;
    optimizedB: number;
    optimizedH: number;
    originalAreaCm2: number;
    optimizedAreaCm2: number;
    areaReductionPct: number;
  };

  checksSummary: {
    name: string;
    value: string;
    status: 'OK' | 'WARNING';
  }[];
}

/**
 * Optimizador de sección para columnas de hormigón armado.
 * Busca las dimensiones óptimas (b x h) en pasos modulares (25/50 mm)
 * para que el DCR gobernante esté lo más cercano a 0.90 sin exceder 1.00.
 */
export function optimizeConcreteSection(
  currentGeom: ConcreteGeometry,
  concreteProps: { fc: number; Ec?: number; name?: string },
  rebarProps: { Fy: number; Fu?: number; name?: string },
  colLength: number,
  kx: number,
  ky: number,
  loads: ColumnLoads,
  standard: DesignStandard,
  targetDcr: number = 0.90
): SectionOptimizationResult {
  const originalResult = calculateConcreteColumn(
    currentGeom,
    concreteProps,
    rebarProps,
    colLength,
    kx,
    ky,
    loads,
    standard
  );

  const originalDcr = originalResult.dcr;
  const originalArea = (currentGeom.b * currentGeom.h) / 100; // cm²

  // Rango de búsqueda para b y h (en mm)
  // Límites normativos mínimos: b >= 250 mm, h >= 250 mm para marcos sismorresistentes
  const minDim = 250;
  const maxDim = 1200;
  const step = 50;

  interface Candidate {
    b: number;
    h: number;
    dcr: number;
    comboName?: string;
    cost: number;
    area: number;
    isSafe: boolean;
    phiPnMax: number;
    phiVn: number;
  }

  const candidates: Candidate[] = [];

  // Decidir si mantener la tendencia de la relación de aspecto b/h actual
  const currentAspect = currentGeom.h / currentGeom.b;
  const isSquarePreference = Math.abs(currentAspect - 1.0) < 0.15;

  for (let b = minDim; b <= maxDim; b += step) {
    for (let h = minDim; h <= maxDim; h += step) {
      // Filtrar relaciones de aspecto extremas (0.4 <= b/h <= 2.5)
      const aspect = h / b;
      if (aspect < 0.45 || aspect > 2.2) continue;

      // Si el usuario tenía columna cuadrada, priorizar h == b o cercanas
      if (isSquarePreference && Math.abs(h - b) > 100) continue;

      const testGeom: ConcreteGeometry = {
        ...currentGeom,
        b,
        h,
      };

      const res = calculateConcreteColumn(
        testGeom,
        concreteProps,
        rebarProps,
        colLength,
        kx,
        ky,
        loads,
        standard
      );

      // Verificaciones normativas esenciales
      // 1. Debe existir al menos una combinación de barras válida
      const validCombo = res.combinations.find((c) => c.isValid);
      if (!validCombo) continue;

      // 2. Capacidad axial no superada
      if (Math.abs(loads.Pu) > res.phiPnMax) continue;

      // 3. Cortante no superado
      if (Math.abs(loads.Vux) > res.phiVn) continue;

      // 4. Debe ser estructuralmente seguro
      if (!res.isSafe || res.dcr > 1.00) continue;

      const dcr = res.dcr;

      // Función de costo: queremos acercarnos lo más posible a targetDcr (0.90) sin superarlo
      // Si dcr > targetDcr, penalizamos severamente para preferir estar bajo 0.90
      let dcrPenalty = 0;
      if (dcr > targetDcr) {
        dcrPenalty = (dcr - targetDcr) * 8.0; // Fuerte penalización por exceder 0.90
      } else {
        dcrPenalty = (targetDcr - dcr) * 1.5; // Menor penalización por quedar debajo
      }

      // Penalización leve por área excesiva (eficiencia económica de hormigón)
      const areaM2 = (b * h) / 1e6;
      const areaPenalty = areaM2 * 0.05;

      const totalCost = dcrPenalty + areaPenalty;

      candidates.push({
        b,
        h,
        dcr,
        comboName: validCombo.name,
        cost: totalCost,
        area: (b * h) / 100, // cm²
        isSafe: res.isSafe,
        phiPnMax: res.phiPnMax,
        phiVn: res.phiVn,
      });
    }
  }

  // Ordenar candidatos por menor costo
  candidates.sort((a, b) => a.cost - b.cost);

  if (candidates.length === 0) {
    // Si no encontró candidato bajo 1.0 en el rango estándar, aumentar dimensiones
    return {
      material: 'concrete',
      success: false,
      message:
        'No se encontró una sección estándar con DCR ≤ 0.90 para las cargas actuales. Considere aumentar la resistencia del hormigón (f\'c) o utilizar refuerzo de mayor límite elástico.',
      originalDcr,
      optimizedDcr: originalDcr,
      dcrDelta: 0,
      targetDcr,
      checksSummary: [
        {
          name: 'Capacidad Resistente',
          value: `DCR actual = ${(originalDcr * 100).toFixed(1)}%`,
          status: originalDcr <= 1.0 ? 'OK' : 'WARNING',
        },
      ],
    };
  }

  const best = candidates[0];
  const areaReductionPct = Number((((originalArea - best.area) / originalArea) * 100).toFixed(1));

  return {
    material: 'concrete',
    success: true,
    message: `Sección optimizada a ${best.b} × ${best.h} mm con DCR = ${(best.dcr * 100).toFixed(1)}% (Objetivo: ${(targetDcr * 100).toFixed(0)}%).`,
    originalDcr,
    optimizedDcr: best.dcr,
    dcrDelta: Number((best.dcr - originalDcr).toFixed(3)),
    targetDcr,
    concrete: {
      originalB: currentGeom.b,
      originalH: currentGeom.h,
      optimizedB: best.b,
      optimizedH: best.h,
      recommendedComboName: best.comboName,
      areaReductionPct,
      originalAreaCm2: originalArea,
      optimizedAreaCm2: best.area,
    },
    checksSummary: [
      {
        name: 'Dimensiones b × h',
        value: `${best.b} × ${best.h} mm (ant: ${currentGeom.b} × ${currentGeom.h} mm)`,
        status: 'OK',
      },
      {
        name: 'Ratio DCR',
        value: `${(best.dcr * 100).toFixed(1)}% (antes: ${(originalDcr * 100).toFixed(1)}%)`,
        status: best.dcr <= 0.92 ? 'OK' : 'WARNING',
      },
      {
        name: 'Capacidad Axial φPn,max',
        value: `${Math.round(best.phiPnMax)} kN (Demanda Pu = ${Math.round(Math.abs(loads.Pu))} kN)`,
        status: 'OK',
      },
      {
        name: 'Capacidad Cortante φVn',
        value: `${best.phiVn.toFixed(1)} kN (Demanda Vu = ${Math.round(Math.abs(loads.Vux))} kN)`,
        status: 'OK',
      },
      {
        name: 'Volumen de Hormigón',
        value: `${areaReductionPct >= 0 ? 'Ahorro de ' + areaReductionPct + '%' : 'Incremento de ' + Math.abs(areaReductionPct) + '%'} de sección`,
        status: 'OK',
      },
    ],
  };
}

/**
 * Optimizador de perfil metálico para columnas de acero estructural.
 * Evalúa los perfiles del catálogo para encontrar el perfil cuyo
 * DCR gobernante esté lo más cercano a 0.90 sin superar 1.00.
 */
export function optimizeSteelSection(
  currentProfile: SteelProfileData,
  steelProps: SteelProperties,
  colLength: number,
  kx: number,
  ky: number,
  loads: ColumnLoads,
  standard: DesignStandard,
  concreteFc: number = 25,
  targetDcr: number = 0.90
): SectionOptimizationResult {
  const originalResult = calculateSteelColumn(
    currentProfile,
    steelProps,
    colLength,
    kx,
    ky,
    loads,
    standard,
    concreteFc
  );

  const originalDcr = originalResult.dcrCombined;
  const originalWeight = (currentProfile as any).weightKgM || currentProfile.A * 0.785;

  interface ProfileCandidate {
    profile: SteelProfileData;
    dcr: number;
    weightKgM: number;
    cost: number;
    slenderness: number;
    isSafe: boolean;
    phiPn: number;
  }

  const candidates: ProfileCandidate[] = [];

  // Categorizar por tipo o evaluar catálogo completo
  // Priorizar perfiles de columnas comunes (W_SHAPE, HEB, HEA, HSS)
  for (const prof of STEEL_PROFILES) {
    const res = calculateSteelColumn(
      prof,
      steelProps,
      colLength,
      kx,
      ky,
      loads,
      standard,
      concreteFc
    );

    // 1. Verificación de esbeltez límite (KL/r <= 200)
    if (res.governingSlenderness > 200) continue;

    // 2. No exceder capacidad resistente máxima
    if (!res.isSafe || res.dcrCombined > 1.00) continue;

    const dcr = res.dcrCombined;
    const weight = (prof as any).weightKgM || prof.A * 0.785;

    // Función de costo: cercanía a targetDcr (0.90)
    let dcrPenalty = 0;
    if (dcr > targetDcr) {
      dcrPenalty = (dcr - targetDcr) * 8.0;
    } else {
      dcrPenalty = (targetDcr - dcr) * 1.5;
    }

    // Penalización por peso (economía de acero)
    const weightPenalty = (weight / 100) * 0.04;

    const totalCost = dcrPenalty + weightPenalty;

    candidates.push({
      profile: prof,
      dcr,
      weightKgM: weight,
      cost: totalCost,
      slenderness: res.governingSlenderness,
      isSafe: res.isSafe,
      phiPn: res.phiPn,
    });
  }

  candidates.sort((a, b) => a.cost - b.cost);

  if (candidates.length === 0) {
    return {
      material: 'steel',
      success: false,
      message:
        'No se encontró ningún perfil en el catálogo que cumpla simultáneamente con esbeltez (KL/r ≤ 200) y DCR ≤ 0.90 para las cargas solicitadas. Considere aumentar el grado de acero (ej: A572 Gr. 50 o S355).',
      originalDcr,
      optimizedDcr: originalDcr,
      dcrDelta: 0,
      targetDcr,
      checksSummary: [
        {
          name: 'Capacidad Resistente',
          value: `DCR actual = ${(originalDcr * 100).toFixed(1)}%`,
          status: originalDcr <= 1.0 ? 'OK' : 'WARNING',
        },
      ],
    };
  }

  const best = candidates[0];
  const weightReductionPct = Number(
    (((originalWeight - best.weightKgM) / originalWeight) * 100).toFixed(1)
  );

  return {
    material: 'steel',
    success: true,
    message: `Perfil óptimo seleccionado: ${best.profile.designation} con DCR = ${(best.dcr * 100).toFixed(1)}% (Objetivo: ${(targetDcr * 100).toFixed(0)}%).`,
    originalDcr,
    optimizedDcr: best.dcr,
    dcrDelta: Number((best.dcr - originalDcr).toFixed(3)),
    targetDcr,
    steel: {
      originalProfileId: currentProfile.id || 'current',
      originalProfileDesignation: currentProfile.designation,
      optimizedProfileId: best.profile.id || best.profile.designation,
      optimizedProfileDesignation: best.profile.designation,
      originalWeightKgM: Number(originalWeight.toFixed(1)),
      optimizedWeightKgM: Number(best.weightKgM.toFixed(1)),
      weightReductionPct,
    },
    checksSummary: [
      {
        name: 'Perfil Seleccionado',
        value: `${best.profile.designation} (ant: ${currentProfile.designation})`,
        status: 'OK',
      },
      {
        name: 'Ratio DCR Combinado',
        value: `${(best.dcr * 100).toFixed(1)}% (antes: ${(originalDcr * 100).toFixed(1)}%)`,
        status: best.dcr <= 0.92 ? 'OK' : 'WARNING',
      },
      {
        name: 'Esbeltez Máxima KL/r',
        value: `${best.slenderness.toFixed(1)} ≤ 200`,
        status: 'OK',
      },
      {
        name: 'Capacidad Axial φPn',
        value: `${Math.round(best.phiPn)} kN (Pu = ${Math.round(Math.abs(loads.Pu))} kN)`,
        status: 'OK',
      },
      {
        name: 'Peso de Acero',
        value: `${best.weightKgM.toFixed(1)} kg/m (${weightReductionPct >= 0 ? 'Ahorro de ' + weightReductionPct + '%' : 'Incremento de ' + Math.abs(weightReductionPct) + '%'})`,
        status: 'OK',
      },
    ],
  };
}

/**
 * Optimizador de sección para columnas de madera estructural.
 */
export function optimizeWoodSection(
  currentB: number,
  currentH: number,
  woodProps: WoodProperties,
  colLength: number,
  kx: number,
  ky: number,
  loads: ColumnLoads,
  standard: DesignStandard,
  targetDcr: number = 0.90
): SectionOptimizationResult {
  const originalResult = calculateWoodColumn(
    currentB,
    currentH,
    colLength,
    kx,
    ky,
    loads,
    woodProps,
    standard
  );

  const originalDcr = originalResult.dcrCombined;
  const originalArea = (currentB * currentH) / 100;

  const standardSizes = [100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400];

  interface WoodCandidate {
    b: number;
    h: number;
    dcr: number;
    cost: number;
    area: number;
    slenderness: number;
  }

  const candidates: WoodCandidate[] = [];

  for (const b of standardSizes) {
    for (const h of standardSizes) {
      if (h / b < 0.6 || h / b > 1.8) continue;

      const res = calculateWoodColumn(
        b,
        h,
        colLength,
        kx,
        ky,
        loads,
        woodProps,
        standard
      );

      if (res.governingSlenderness > 175) continue;
      if (!res.isSafe || res.dcrCombined > 1.00) continue;

      const dcr = res.dcrCombined;
      let dcrPenalty = 0;
      if (dcr > targetDcr) {
        dcrPenalty = (dcr - targetDcr) * 8.0;
      } else {
        dcrPenalty = (targetDcr - dcr) * 1.5;
      }

      const areaPenalty = ((b * h) / 1e6) * 0.05;
      const totalCost = dcrPenalty + areaPenalty;

      candidates.push({
        b,
        h,
        dcr,
        cost: totalCost,
        area: (b * h) / 100,
        slenderness: res.governingSlenderness,
      });
    }
  }

  candidates.sort((a, b) => a.cost - b.cost);

  if (candidates.length === 0) {
    return {
      material: 'wood',
      success: false,
      message:
        'No se encontró sección comercial de madera con DCR ≤ 0.90 para las solicitaciones actuales. Considere madera laminada encolada (Glulam) o reducir la altura de pandeo.',
      originalDcr,
      optimizedDcr: originalDcr,
      dcrDelta: 0,
      targetDcr,
      checksSummary: [
        {
          name: 'Capacidad Resistente',
          value: `DCR actual = ${(originalDcr * 100).toFixed(1)}%`,
          status: originalDcr <= 1.0 ? 'OK' : 'WARNING',
        },
      ],
    };
  }

  const best = candidates[0];
  const areaReductionPct = Number((((originalArea - best.area) / originalArea) * 100).toFixed(1));

  return {
    material: 'wood',
    success: true,
    message: `Sección de madera optimizada a ${best.b} × ${best.h} mm con DCR = ${(best.dcr * 100).toFixed(1)}% (Objetivo: ${(targetDcr * 100).toFixed(0)}%).`,
    originalDcr,
    optimizedDcr: best.dcr,
    dcrDelta: Number((best.dcr - originalDcr).toFixed(3)),
    targetDcr,
    wood: {
      originalB: currentB,
      originalH: currentH,
      optimizedB: best.b,
      optimizedH: best.h,
      originalAreaCm2: originalArea,
      optimizedAreaCm2: best.area,
      areaReductionPct,
    },
    checksSummary: [
      {
        name: 'Sección b × h',
        value: `${best.b} × ${best.h} mm (ant: ${currentB} × ${currentH} mm)`,
        status: 'OK',
      },
      {
        name: 'Ratio DCR',
        value: `${(best.dcr * 100).toFixed(1)}% (antes: ${(originalDcr * 100).toFixed(1)}%)`,
        status: best.dcr <= 0.92 ? 'OK' : 'WARNING',
      },
      {
        name: 'Esbeltez λ',
        value: `${best.slenderness.toFixed(1)} ≤ 175`,
        status: 'OK',
      },
    ],
  };
}
