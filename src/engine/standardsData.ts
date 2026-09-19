/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SteelProfileData, WoodProperties, DesignStandard } from '../types';
import {
  COMPLETE_STEEL_CATALOG,
  COMPLETE_WOOD_CATALOG,
  COMPLETE_CONCRETE_CATALOG,
  COMPLETE_STEEL_MATERIALS,
  ExtendedSteelProfile,
} from './materialsLibrary';

// Diámetros de barras corrugadas estándar (Métrico y designación ASTM)
export interface RebarSpec {
  diameterMm: number;
  nominalName: string;
  areaMm2: number;
  weightKgM: number; // kg por metro lineal
}

export const REBAR_DATABASE: RebarSpec[] = [
  { diameterMm: 8, nominalName: 'Ø8 mm (#2.5)', areaMm2: 50.27, weightKgM: 0.395 },
  { diameterMm: 10, nominalName: 'Ø10 mm (#3)', areaMm2: 78.54, weightKgM: 0.617 },
  { diameterMm: 12, nominalName: 'Ø12 mm (#4)', areaMm2: 113.1, weightKgM: 0.888 },
  { diameterMm: 16, nominalName: 'Ø16 mm (#5)', areaMm2: 201.06, weightKgM: 1.578 },
  { diameterMm: 20, nominalName: 'Ø20 mm (#6)', areaMm2: 314.16, weightKgM: 2.466 },
  { diameterMm: 25, nominalName: 'Ø25 mm (#8)', areaMm2: 490.87, weightKgM: 3.853 },
  { diameterMm: 32, nominalName: 'Ø32 mm (#10)', areaMm2: 804.25, weightKgM: 6.313 },
];

export function getRebarSpec(diameterMm: number): RebarSpec {
  const match = REBAR_DATABASE.find((r) => r.diameterMm === diameterMm);
  if (match) return match;
  const area = (Math.PI * Math.pow(diameterMm, 2)) / 4;
  const weight = Math.pow(diameterMm, 2) / 162.2;
  return {
    diameterMm,
    nominalName: `Ø${diameterMm} mm`,
    areaMm2: area,
    weightKgM: weight,
  };
}

// Catálogo completo de perfiles estructurales de acero (Laminados en caliente y conformados en frío)
export const STEEL_PROFILES_CATALOG: ExtendedSteelProfile[] = COMPLETE_STEEL_CATALOG;
export const STEEL_PROFILES = COMPLETE_STEEL_CATALOG;

// Maderas estructurales con énfasis en grupos de la Norma Cubana (NC 206) y maderas comerciales
export const WOOD_DATABASE: Record<string, WoodProperties> = COMPLETE_WOOD_CATALOG;
export const WOOD_MATERIALS: Record<string, any> = COMPLETE_WOOD_CATALOG;

export interface ConcreteMaterialItem {
  id: string;
  name: string;
  fc: number;
  Ec: number;
  density: number;
  eurocodeClass?: string;
  Rb_NC?: number;
}

export const CONCRETE_MATERIALS: Record<string, any> = COMPLETE_CONCRETE_CATALOG;

export interface SteelMaterialItem {
  id: string;
  name: string;
  Fy: number;
  Fu: number;
  E: number;
  standardRef?: string;
}

export const STEEL_MATERIALS: Record<string, any> = COMPLETE_STEEL_MATERIALS;

export function getStandardFactors(standard: DesignStandard) {
  switch (standard) {
    case 'ACI_318_19':
      return {
        name: 'ACI 318-19 (American Concrete Institute)',
        country: 'EE.UU. / Internacional',
        phiCompressionTied: 0.65,
        phiCompressionSpiral: 0.75,
        phiTension: 0.90,
        phiShear: 0.75,
        concreteEModulus: (fc: number) => 4700 * Math.sqrt(fc), // MPa
        concreteTensileStrength: (fc: number) => 0.62 * Math.sqrt(fc), // MPa
        beta1: (fc: number) => {
          if (fc <= 28) return 0.85;
          return Math.max(0.65, 0.85 - (0.05 * (fc - 28)) / 7);
        },
        epsilonCu: 0.003,
        safetyMethod: 'Factores de reducción de resistencia φ (LRFD)',
      };
    case 'EUROCODE_2':
      return {
        name: 'Eurocódigo 2 (EN 1992-1-1)',
        country: 'Comunidad Europea',
        gammaC: 1.5,
        gammaS: 1.15,
        acc: 0.85, // coeficiente para efectos a largo plazo en compresión
        phiCompressionTied: 0.67, // equiv 1/1.5
        phiCompressionSpiral: 0.72,
        phiTension: 0.87, // equiv 1/1.15
        phiShear: 0.75,
        concreteEModulus: (fc: number) => 22000 * Math.pow((fc + 8) / 10, 0.3),
        concreteTensileStrength: (fc: number) => 0.3 * Math.pow(fc, 2 / 3),
        beta1: (fc: number) => (fc <= 50 ? 0.8 : 0.8 - (fc - 50) / 400),
        epsilonCu: 0.0035,
        safetyMethod: 'Coeficientes parciales de seguridad γc y γs (Estados Límites Últimos)',
      };
    case 'NC_450_2006':
      return {
        name: 'Norma Cubana NC 450:2006 / NC 120 (Estructuras de Hormigón)',
        country: 'República de Cuba',
        gammaB: 1.5, // Hormigón Rb = fck / 1.5
        gammaS: 1.15, // Acero Rs = fyk / 1.15
        gammaB1: 1.0, // Coeficiente de condiciones de trabajo
        phiCompressionTied: 0.65,
        phiCompressionSpiral: 0.75,
        phiTension: 0.87,
        phiShear: 0.75,
        concreteEModulus: (fc: number) => 5000 * Math.sqrt(fc), // Según NC
        concreteTensileStrength: (fc: number) => 0.55 * Math.sqrt(fc), // Rbt
        beta1: (fc: number) => 0.85 - 0.008 * Math.max(0, fc - 25),
        epsilonCu: 0.0035,
        safetyMethod: 'Método de los Estados Límites con resistencias de cálculo Rb y Rs (NC 450)',
      };
  }
}
