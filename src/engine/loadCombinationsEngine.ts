/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DesignStandard, ColumnLoads, MaterialType } from '../types';

export interface ServiceLoads {
  // Cargas axiales de servicio (kN)
  PD: number; // Carga muerta permanente (D / Gk)
  PL: number; // Carga viva de uso (L / Qk)
  PLr?: number; // Carga viva de techo o nieve (Lr / S)

  // Momentos flectores en eje X (kN·m)
  MDx: number;
  MLx: number;

  // Momentos flectores en eje Y (kN·m)
  MDy: number;
  MLy: number;

  // Cortantes en eje X (kN)
  VDx: number;
  VLx: number;

  // Cortantes en eje Y (kN)
  VDy?: number;
  VLy?: number;

  // Acciones laterales opcionales (kN, kN·m)
  PW?: number; // Viento axial
  MWx?: number; // Viento momento
  VWx?: number; // Viento cortante

  PE?: number; // Sismo axial
  MEx?: number; // Sismo momento
  VEx?: number; // Sismo cortante
}

export interface LoadCombinationResult {
  id: string;
  name: string;
  codeReference: string;
  description: string;
  formula: string;
  loads: ColumnLoads;
  isGoverning: boolean;
  factors: {
    D: number;
    L: number;
    Lr?: number;
    W?: number;
    E?: number;
  };
}

export interface StandardLoadComparisonItem {
  standard: DesignStandard;
  standardName: string;
  country: string;
  governingCombinationName: string;
  governingFormula: string;
  Pu: number;
  Mux: number;
  diffPctWithBase: number; // Diferencia porcentual respecto a la norma actual
  ratioToService: number; // Factor global de mayoración efectivo Pu / (PD + PL)
}

export interface LoadCombinationSummary {
  standard: DesignStandard;
  standardName: string;
  serviceLoads: ServiceLoads;
  combinations: LoadCombinationResult[];
  governingCombination: LoadCombinationResult;
  totalServiceAxial: number;
  ratioLoverD: number;
  effectiveAmplificationFactor: number;
  comparisons: StandardLoadComparisonItem[];
}

export interface EconomicHousingExample {
  id: string;
  title: string;
  category: 'unifamiliar_1p' | 'bifamiliar_2p' | 'progresiva_social' | 'mamposteria_confinada' | 'madera_rural' | 'acero_modular';
  recommendedMaterial: MaterialType;
  subtitle: string;
  description: string;
  dimensionsText: string;
  tributaryAreaM2: number;
  levelsCount: number;
  loadsBreakdown: {
    deadLoadDetails: string[];
    liveLoadDetails: string[];
    lateralWindOrSeismicDetails?: string;
  };
  recommendedSection: {
    material: MaterialType;
    dimensions: string;
    reinforcementOrProfile: string;
    rationale: string;
  };
  serviceLoads: ServiceLoads;
  typicalFloorHeightM: number;
}

// =========================================================================================
// CATÁLOGO DETALLADO DE EJEMPLOS DE VIVIENDAS ECONÓMICAS E INTERÉS SOCIAL
// =========================================================================================
export const ECONOMIC_HOUSING_EXAMPLES: EconomicHousingExample[] = [
  {
    id: 'viv_social_1p_ligera',
    title: 'Vivienda Social Básica (1 Nivel) - Cubierta Ligera',
    category: 'unifamiliar_1p',
    recommendedMaterial: 'concrete',
    subtitle: 'Autoconstrucción asistida / Sistema Sandino o mampostería',
    description:
      'Vivienda económica de 1 planta para familias de bajos ingresos. Cuenta con cubierta inclinada ligera de planchas de fibrocemento o zinc sobre correas metálicas o de madera y solera de amarre perimetral.',
    dimensionsText: 'Módulos de 3.20 m x 3.20 m (Área techada: 42 m²)',
    tributaryAreaM2: 10.24,
    levelsCount: 1,
    typicalFloorHeightM: 2.7,
    loadsBreakdown: {
      deadLoadDetails: [
        'Cubierta ligera (chapa galvanizada / fibrocemento + correas): 0.25 kN/m² (2.56 kN)',
        'Cielo raso liviano y falso techo: 0.15 kN/m² (1.54 kN)',
        'Vigas de coronación y amarre (20x20 cm): 7.20 kN',
        'Muros divisorios de bloque hueco de hormigón e=15cm: 22.5 kN',
        'Peso propio estimado de columna (20x20 cm x 2.7m): 2.65 kN',
        'Total Carga Muerta PD = 36.5 kN',
      ],
      liveLoadDetails: [
        'Sobrecarga de mantenimiento de cubierta inclinada no transitable: 0.40 kN/m²',
        'Carga Viva Tributaria PL = 4.10 kN',
      ],
      lateralWindOrSeismicDetails:
        'Efectos de viento leve costero o excentricidad de montaje: MDx = 2.8 kN·m, VDx = 3.5 kN',
    },
    recommendedSection: {
      material: 'concrete',
      dimensions: '200 x 200 mm (o 250 x 250 mm)',
      reinforcementOrProfile: '4 Ø12 mm (#4) + cercos Ø8 mm @ 150 mm (c/100 mm en extremos)',
      rationale:
        'Sección muy económica, fácil de encofrar y hormigonar artesanalmente, garantizando recubrimiento mínimo de 25 mm y cuantía geométrica ρ ≈ 1.13%.',
    },
    serviceLoads: {
      PD: 38.5,
      PL: 4.5,
      MDx: 2.8,
      MLx: 1.2,
      MDy: 1.8,
      MLy: 0.8,
      VDx: 4.2,
      VLx: 1.5,
    },
  },
  {
    id: 'viv_bifamiliar_2p_esquinera',
    title: 'Vivienda Bi-Familiar (2 Niveles) - Columna Esquinera',
    category: 'bifamiliar_2p',
    recommendedMaterial: 'concrete',
    subtitle: 'Entrepiso de vigueta y bovedilla + cubierta superior',
    description:
      'Columna esquinera de planta baja sometida a flexión biaxial por la asimetría de vigas perimetrales y muros de fachada. La solución con entrepiso semi-prefabricado de vigueta pretensada y bovedilla alivia el peso muerto.',
    dimensionsText: 'Luces de 3.50 m x 3.00 m (Área tributaria At = 10.5 m²)',
    tributaryAreaM2: 10.5,
    levelsCount: 2,
    typicalFloorHeightM: 2.8,
    loadsBreakdown: {
      deadLoadDetails: [
        'Entrepiso vigueta y bovedilla h=20cm con capa de compresión 5cm: 2.60 kN/m² (27.3 kN)',
        'Piso de baldosas cerámicas y mortero de nivelación: 1.00 kN/m² (10.5 kN)',
        'Muros exteriores de fachada e=15cm en 2 pisos (L=6.5m x H=5.6m): 52.4 kN',
        'Vigas perimetrales de hormigón armado (25x30 cm): 14.2 kN',
        'Cubierta superior ligera con pretil: 5.6 kN',
        'Total Carga Muerta PD = 110.0 kN',
      ],
      liveLoadDetails: [
        'Sobrecarga de uso residencial en entrepiso: 2.00 kN/m² (21.0 kN)',
        'Sobrecarga de cubierta superior: 0.50 kN/m² (5.25 kN)',
        'Total Carga Viva PL = 26.5 kN',
      ],
      lateralWindOrSeismicDetails:
        'Momento flector biaxial relevante por excentricidad esquinera: MDx = 14.5 kN·m, MLx = 7.8 kN·m, MDy = 11.2 kN·m, MLy = 5.6 kN·m',
    },
    recommendedSection: {
      material: 'concrete',
      dimensions: '300 x 300 mm (o 250 x 350 mm)',
      reinforcementOrProfile: '4 Ø16 mm (esquinas) + 4 Ø12 mm (caras) + cercos Ø8 mm @ 100/150 mm',
      rationale:
        'Absorbe simultáneamente la carga axial y la flexión biaxial sin sobredimensionar la sección, manteniendo un DCR seguro y ductilidad adecuada en zonas de sismo moderado.',
    },
    serviceLoads: {
      PD: 110.0,
      PL: 26.5,
      MDx: 14.5,
      MLx: 7.8,
      MDy: 11.2,
      MLy: 5.6,
      VDx: 16.5,
      VLx: 9.0,
    },
  },
  {
    id: 'viv_progresiva_central_2p',
    title: 'Vivienda Social Progresiva - Columna Central (2 Plantas)',
    category: 'progresiva_social',
    recommendedMaterial: 'concrete',
    subtitle: 'Máxima carga gravitatoria con losa maciza de hormigón',
    description:
      'Columna interior central en vivienda de interés social proyectada con crecimiento vertical en dos etapas. En la etapa final soporta losa de entrepiso maciza de hormigón (h=11 cm) más tabiquería completa.',
    dimensionsText: 'Crujías de 4.00 m x 3.80 m (Área tributaria At = 15.2 m²)',
    tributaryAreaM2: 15.2,
    levelsCount: 2,
    typicalFloorHeightM: 2.9,
    loadsBreakdown: {
      deadLoadDetails: [
        'Losa maciza de hormigón armado e=11cm (2 pisos): 2 x 2.75 kN/m² = 5.50 kN/m² (83.6 kN)',
        'Acabados, mortero de piso e impermeabilización: 1.40 kN/m² (21.3 kN)',
        'Tabiques interiores de ladrillo hueco / bloques: 42.0 kN',
        'Vigas principales y secundarias de hormigón: 21.5 kN',
        'Peso columna 2 niveles: 7.6 kN',
        'Total Carga Muerta PD = 176.0 kN',
      ],
      liveLoadDetails: [
        'Sobrecarga reglamentaria vivienda (primer nivel habitacional): 2.0 kN/m² (30.4 kN)',
        'Sobrecarga de terraza/techo superior accesible: 1.5 kN/m² (22.8 kN)',
        'Total Carga Viva PL = 53.2 kN',
      ],
      lateralWindOrSeismicDetails:
        'Momento flector por asimetría de sobrecargas vivas y luces: MDx = 16.8 kN·m, MLx = 10.5 kN·m, VDx = 19.5 kN',
    },
    recommendedSection: {
      material: 'concrete',
      dimensions: '350 x 350 mm (o 300 x 400 mm)',
      reinforcementOrProfile: '8 Ø16 mm (4 esquinas + 4 caras) + cercos dobles con trabas Ø10 mm @ 120 mm',
      rationale:
        'Soporta holgadamente más de 300 kN mayorados con una cuantía de acero equilibrada (~1.3%), ideal para soportar variaciones durante la autoconstrucción.',
    },
    serviceLoads: {
      PD: 176.0,
      PL: 53.2,
      MDx: 16.8,
      MLx: 10.5,
      MDy: 9.5,
      MLy: 6.2,
      VDx: 19.5,
      VLx: 12.0,
    },
  },
  {
    id: 'viv_mamposteria_confinada_castillo',
    title: 'Mampostería Confinada - Columna de Confinamiento (Castillo)',
    category: 'mamposteria_confinada',
    recommendedMaterial: 'concrete',
    subtitle: 'Castillo de amarre sísmico en muro portante de ladrillo',
    description:
      'Elemento de hormigón armado de confinamiento (castillo) colado contra el muro dentado para evitar el desmoronamiento de la mampostería bajo sismos o cargas gravitatorias concentradas.',
    dimensionsText: 'Crujía de 3.00 m x 3.00 m con viga corona superior',
    tributaryAreaM2: 9.0,
    levelsCount: 1,
    typicalFloorHeightM: 2.6,
    loadsBreakdown: {
      deadLoadDetails: [
        'Carga muerta transmitida por viga dintel y viga corona: 28.0 kN',
        'Peso propio muro adyacente y losa de cubierta: 44.5 kN',
        'Peso propio columna de confinamiento: 2.5 kN',
        'Total Carga Muerta PD = 75.0 kN',
      ],
      liveLoadDetails: [
        'Sobrecarga de servicio de cubierta: 1.0 kN/m² x 9.0 m² = 9.0 kN',
        'Carga Viva PL = 15.0 kN (con contingencias)',
      ],
      lateralWindOrSeismicDetails:
        'Momento flector inducido por flexión del muro fuera del plano: MDx = 6.5 kN·m, MLx = 3.8 kN·m',
    },
    recommendedSection: {
      material: 'concrete',
      dimensions: '200 x 200 mm (o 150 x 250 mm coincidente con espesor del muro)',
      reinforcementOrProfile: '4 Ø12 mm (#4) con estribos cerrados Ø8 mm @ 100 mm en nudos y 150 mm centro',
      rationale:
        'Se integra en el espesor del muro sin generar mochetas interiores, cumpliendo estrictamente los requisitos de ductilidad y anclaje normativo.',
    },
    serviceLoads: {
      PD: 75.0,
      PL: 15.0,
      MDx: 6.5,
      MLx: 3.8,
      MDy: 4.2,
      MLy: 2.1,
      VDx: 9.5,
      VLx: 4.8,
    },
  },
  {
    id: 'viv_madera_rural_economica',
    title: 'Vivienda Rural Económica en Madera (1 Nivel)',
    category: 'madera_rural',
    recommendedMaterial: 'wood',
    subtitle: 'Pies derechos de pino estructural o maderas tropicales',
    description:
      'Estructura de pies derechos / postes de madera aserrada autóctona para zonas rurales, suburbanas o planes de emergencia. Sistema rápido, sostenible y de muy bajo costo de cimentación.',
    dimensionsText: 'Módulos de 3.00 m x 3.00 m (Entramado liviano)',
    tributaryAreaM2: 9.0,
    levelsCount: 1,
    typicalFloorHeightM: 2.6,
    loadsBreakdown: {
      deadLoadDetails: [
        'Cubierta de chapa ondulada galvanizada o teja asfáltica: 0.20 kN/m² (1.8 kN)',
        'Estructura de cerchas y correas de madera: 0.15 kN/m² (1.35 kN)',
        'Tabiquería de madera machihembrada o paneles de fibrocemento: 12.5 kN',
        'Vigas de madera solera y dinteles: 2.85 kN',
        'Total Carga Muerta PD = 18.5 kN',
      ],
      liveLoadDetails: [
        'Sobrecarga de mantenimiento de cubierta: 0.50 kN/m² (4.5 kN)',
        'Carga Viva PL = 6.5 kN',
      ],
      lateralWindOrSeismicDetails:
        'Efecto del viento en estructuras livianas: Succión neta y empuje transversal. MWx = 4.2 kN·m, VWx = 5.5 kN',
    },
    recommendedSection: {
      material: 'wood',
      dimensions: '140 x 140 mm (o 150 x 150 mm escuadría aserrada)',
      reinforcementOrProfile: 'Pie derecho de Pino Estructural o Maderas NC Grupo B/C (fc,0 ≈ 14 - 18 MPa)',
      rationale:
        'Escuadría comercial estándar con esbeltez controlada (λ < 60) y suficiente rigidez frente a vientos tropicales.',
    },
    serviceLoads: {
      PD: 18.5,
      PL: 6.5,
      MDx: 3.2,
      MLx: 1.8,
      MDy: 2.0,
      MLy: 1.0,
      VDx: 5.5,
      VLx: 2.8,
      PW: -4.0,
      MWx: 4.2,
      VWx: 5.5,
    },
  },
  {
    id: 'viv_acero_modular_social',
    title: 'Vivienda Modular Rápida en Acero (2 Niveles)',
    category: 'acero_modular',
    recommendedMaterial: 'steel',
    subtitle: 'Columnas de tubo estructural HSS o perfiles conformados',
    description:
      'Solución industrializada para urbanismos de vivienda social de montaje en seco. Emplea perfiles tubulares cuadrados HSS o perfiles conformados en frío con conexiones empernadas a placas base.',
    dimensionsText: 'Pórticos de 3.60 m x 3.60 m (Área At = 12.96 m²)',
    tributaryAreaM2: 12.96,
    levelsCount: 2,
    typicalFloorHeightM: 2.8,
    loadsBreakdown: {
      deadLoadDetails: [
        'Entrepiso liviano de chapa colaborante (steel deck) con loseta e=7cm: 1.80 kN/m² (23.3 kN)',
        'Muros secos perimetrales tipo Drywall / paneles sándwich EPS: 18.5 kN',
        'Vigas de acero y cubierta superior ligera: 12.2 kN',
        'Total Carga Muerta PD = 54.0 kN',
      ],
      liveLoadDetails: [
        'Sobrecarga habitacional entrepiso: 2.00 kN/m² (25.9 kN)',
        'Sobrecarga techo: 0.50 kN/m² (6.5 kN)',
        'Total Carga Viva PL = 32.4 kN',
      ],
      lateralWindOrSeismicDetails:
        'Momento flector en nudo viga-columna por pórtico a momento: MDx = 11.5 kN·m, MLx = 7.2 kN·m, VDx = 14.0 kN',
    },
    recommendedSection: {
      material: 'steel',
      dimensions: 'Tubo Cuadrado HSS 140x140x6 (o W8x24 / HEB 140)',
      reinforcementOrProfile: 'Acero ASTM A500 Gr. B / A36 (Fy = 315 - 250 MPa) con placa base de 16 mm',
      rationale:
        'Perfil tubular cerrado con radios de giro idénticos rx = ry, eliminando la debilidad en el eje menor y facilitando acabados arquitectónicos limpios.',
    },
    serviceLoads: {
      PD: 54.0,
      PL: 32.4,
      MDx: 11.5,
      MLx: 7.2,
      MDy: 7.0,
      MLy: 4.5,
      VDx: 14.0,
      VLx: 8.5,
    },
  },
];

// =========================================================================================
// MOTOR DE GENERACIÓN DE COMBINACIONES DE CARGA SEGÚN NORMA
// =========================================================================================

export function generateLoadCombinations(
  service: ServiceLoads,
  standard: DesignStandard
): LoadCombinationSummary {
  const PD = Number(service.PD) || 0;
  const PL = Number(service.PL) || 0;
  const PLr = Number(service.PLr) || 0;

  const MDx = Number(service.MDx) || 0;
  const MLx = Number(service.MLx) || 0;
  const MDy = Number(service.MDy) || 0;
  const MLy = Number(service.MLy) || 0;

  const VDx = Number(service.VDx) || 0;
  const VLx = Number(service.VLx) || 0;
  const VDy = Number(service.VDy) || 0;
  const VLy = Number(service.VLy) || 0;

  const PW = Number(service.PW) || 0;
  const MWx = Number(service.MWx) || 0;
  const VWx = Number(service.VWx) || 0;

  const PE = Number(service.PE) || 0;
  const MEx = Number(service.MEx) || 0;
  const VEx = Number(service.VEx) || 0;

  const combinations: LoadCombinationResult[] = [];

  const round = (val: number, decimals = 2) => {
    return Number(val.toFixed(decimals));
  };

  const buildCombo = (
    id: string,
    name: string,
    codeReference: string,
    description: string,
    formula: string,
    fD: number,
    fL: number,
    fLr = 0,
    fW = 0,
    fE = 0
  ): LoadCombinationResult => {
    const Pu = fD * PD + fL * PL + fLr * PLr + fW * PW + fE * PE;
    const Mux = fD * MDx + fL * MLx + fW * MWx + fE * MEx;
    const Muy = fD * MDy + fL * MLy;
    const Vux = fD * VDx + fL * VLx + fW * VWx + fE * VEx;
    const Vuy = fD * VDy + fL * VLy;

    return {
      id,
      name,
      codeReference,
      description,
      formula,
      loads: {
        Pu: round(Pu),
        Mux: round(Mux),
        Muy: round(Muy),
        Vux: round(Vux),
        Vuy: round(Vuy),
      },
      isGoverning: false,
      factors: {
        D: fD,
        L: fL,
        Lr: fLr,
        W: fW,
        E: fE,
      },
    };
  };

  if (standard === 'ACI_318_19') {
    // ACI 318-19 / ASCE 7-16
    // U1: 1.4 D
    combinations.push(
      buildCombo(
        'ACI_U1',
        'U1: Carga Muerta Preponderante',
        'ACI 318-19 §5.3.1a',
        'Aplica cuando la carga viva es nula o despreciable.',
        '1.4 D',
        1.4,
        0
      )
    );

    // U2: 1.2 D + 1.6 L + 0.5 (Lr or S or R)
    combinations.push(
      buildCombo(
        'ACI_U2',
        'U2: Gravedad Básica (D + L)',
        'ACI 318-19 §5.3.1b',
        'Combinación gravitatoria fundamental para el diseño estructural.',
        '1.2 D + 1.6 L + 0.5 Lr',
        1.2,
        1.6,
        0.5
      )
    );

    // U3: 1.2 D + 1.6 Lr + 1.0 L
    combinations.push(
      buildCombo(
        'ACI_U3',
        'U3: Cubierta / Nieve Preponderante',
        'ACI 318-19 §5.3.1c',
        'Preponderancia de sobrecarga en techo o nieve con carga viva concomitante.',
        '1.2 D + 1.6 Lr + 1.0 L',
        1.2,
        1.0,
        1.6
      )
    );

    // U4: 1.2 D + 1.0 W + 1.0 L + 0.5 Lr
    combinations.push(
      buildCombo(
        'ACI_U4',
        'U4: Viento + Cargas Gravitatorias',
        'ACI 318-19 §5.3.1d',
        'Viento lateral pleno actuando simultáneamente con carga viva y muerta.',
        '1.2 D + 1.0 W + 1.0 L + 0.5 Lr',
        1.2,
        1.0,
        0.5,
        1.0
      )
    );

    // U5: 1.2 D + 1.0 E + 1.0 L
    combinations.push(
      buildCombo(
        'ACI_U5',
        'U5: Sismo + Cargas de Gravedad',
        'ACI 318-19 §5.3.1e',
        'Fuerza sísmica mayorada combinada con peso propio y sobrecarga viva.',
        '1.2 D + 1.0 E + 1.0 L',
        1.2,
        1.0,
        0,
        0,
        1.0
      )
    );

    // U6: 0.9 D + 1.0 W (Levantamiento / Vuelco)
    combinations.push(
      buildCombo(
        'ACI_U6',
        'U6: Levantamiento por Viento',
        'ACI 318-19 §5.3.1f',
        'Minimización de carga muerta para verificar descompresión, tracción o vuelco.',
        '0.9 D + 1.0 W',
        0.9,
        0,
        0,
        1.0
      )
    );

    // U7: 0.9 D + 1.0 E (Sismo con mínimo D)
    combinations.push(
      buildCombo(
        'ACI_U7',
        'U7: Tracción / Vuelco Sísmico',
        'ACI 318-19 §5.3.1g',
        'Efecto sísmico adverso con el menor peso propio posible (0.9D).',
        '0.9 D + 1.0 E',
        0.9,
        0,
        0,
        0,
        1.0
      )
    );
  } else if (standard === 'NC_450_2006') {
    // NC 450:2006 / NC 46:2017 / NC 285:2003
    // NC-1: 1.35 D (solo permanentes desfavorables)
    combinations.push(
      buildCombo(
        'NC_1',
        'NC-1: Solo Acciones Permanentes Desfavorables',
        'NC 450:2006 §6.2',
        'Coeficiente de mayoración γg = 1.35 para hormigón moldeado in situ sin sobrecarga.',
        '1.35 D',
        1.35,
        0
      )
    );

    // NC-2: 1.2 D + 1.6 L (Combinación fundamental estándar)
    combinations.push(
      buildCombo(
        'NC_2',
        'NC-2: Fundamental Gravitatoria (D + L)',
        'NC 450:2006 §6.2.1',
        'Combinación fundamental principal con γg = 1.20 y sobrecarga de piso γq = 1.60.',
        '1.20 D + 1.60 L',
        1.20,
        1.60
      )
    );

    // NC-3: 1.35 D + 1.50 L (Variante conservadora de control)
    combinations.push(
      buildCombo(
        'NC_3',
        'NC-3: Fundamental con Mayoración Adicional de Peso Propio',
        'NC 450:2006 / NC 120',
        'Aplica cuando el peso propio presenta incertidumbre constructiva artesanal.',
        '1.35 D + 1.50 L',
        1.35,
        1.50
      )
    );

    // NC-4: 1.2 D + 1.2 L + 1.2 W (Viento huracanado NC 285)
    combinations.push(
      buildCombo(
        'NC_4',
        'NC-4: Viento Huracanado (NC 285)',
        'NC 285:2003 / NC 450',
        'Acción del viento tropical/huracán con factor de concomitancia ψ = 0.75-0.90.',
        '1.20 D + 1.20 L + 1.20 W',
        1.20,
        1.20,
        0,
        1.20
      )
    );

    // NC-5: 1.2 D + 0.5 L + 1.0 E (Combinación sísmica NC 46)
    combinations.push(
      buildCombo(
        'NC_5',
        'NC-5: Situación Especial Sísmica (NC 46)',
        'NC 46:2017 §7.3',
        'Carga sísmica de diseño con factor de participación de sobrecarga viva ψ2 = 0.50.',
        '1.20 D + 0.50 L + 1.00 E',
        1.20,
        0.50,
        0,
        0,
        1.0
      )
    );

    // NC-6: 0.9 D + 1.2 W (Sustentación / Vuelco por huracán)
    combinations.push(
      buildCombo(
        'NC_6',
        'NC-6: Descompresión por Huracán',
        'NC 285:2003',
        'Control de succión de viento con peso propio mínimo favorable (0.90D).',
        '0.90 D + 1.20 W',
        0.90,
        0,
        0,
        1.20
      )
    );
  } else {
    // EUROCODE 2 / EN 1990 (EC0 / EC2)
    // EC-1: 1.35 Gk
    combinations.push(
      buildCombo(
        'EC_1',
        'EC-1: Solo Permanentes (STR/GEO)',
        'EN 1990 Eq. (6.10)',
        'Acciones permanentes desfavorables con factor γG = 1.35.',
        '1.35 Gk',
        1.35,
        0
      )
    );

    // EC-2: 1.35 Gk + 1.50 Qk (Expresión estándar 6.10)
    combinations.push(
      buildCombo(
        'EC_2',
        'EC-2: Fundamental Básica (STR 6.10)',
        'EN 1990 Eq. (6.10)',
        'Combinación persistente general con γG = 1.35 y γQ = 1.50 para la sobrecarga.',
        '1.35 Gk + 1.50 Qk',
        1.35,
        1.50
      )
    );

    // EC-3: 1.35 Gk + 1.05 Qk (Expresión 6.10a con ψ0 = 0.70)
    combinations.push(
      buildCombo(
        'EC_3',
        'EC-3: Fundamental con ψ0 (STR 6.10a)',
        'EN 1990 Eq. (6.10a)',
        'Expresión alternativa con coeficiente de simultaneidad ψ0 = 0.70 para residencias.',
        '1.35 Gk + 1.05 Qk',
        1.35,
        1.05
      )
    );

    // EC-4: 1.15 Gk + 1.50 Qk (Expresión 6.10b con ξ = 0.85)
    combinations.push(
      buildCombo(
        'EC_4',
        'EC-4: Reducción ξ·γG (STR 6.10b)',
        'EN 1990 Eq. (6.10b)',
        'Sobrecarga variable plena combinada con permanentes reducidas (ξ = 0.85).',
        '1.15 Gk + 1.50 Qk',
        1.15,
        1.50
      )
    );

    // EC-5: 1.35 Gk + 1.05 Qk + 0.90 Wk (Viento concomitante)
    combinations.push(
      buildCombo(
        'EC_5',
        'EC-5: Viento Concomitante',
        'EN 1990 §6.4.3',
        'Viento lateral combinado con ψ0 = 0.60 y sobrecarga de uso ψ0 = 0.70.',
        '1.35 Gk + 1.05 Qk + 0.90 Wk',
        1.35,
        1.05,
        0,
        0.90
      )
    );

    // EC-6: 1.00 Gk + 0.30 Qk + 1.00 AEd (Situación sísmica)
    combinations.push(
      buildCombo(
        'EC_6',
        'EC-6: Situación Sísmica (AEd)',
        'EN 1990 / EN 1998-1',
        'Acción sísmica con valor casi-permanente de la sobrecarga viva (ψ2 = 0.30).',
        '1.00 Gk + 0.30 Qk + 1.00 AEd',
        1.00,
        0.30,
        0,
        0,
        1.0
      )
    );
  }

  // Determinar la combinación gobernante (la que produce mayor demanda axial y flectora combinada)
  // Usamos una función de demanda equivalente: P_eq = Pu + 2.5 * |Mux| / 0.4 (en kN)
  let bestIdx = 0;
  let maxDemandScore = -1e9;

  combinations.forEach((c, idx) => {
    // Si hay viento o sismo significativo, evaluamos también el momento flector
    const demandScore = c.loads.Pu + 4.0 * Math.abs(c.loads.Mux) + 3.0 * Math.abs(c.loads.Muy);
    if (demandScore > maxDemandScore) {
      maxDemandScore = demandScore;
      bestIdx = idx;
    }
  });

  combinations[bestIdx].isGoverning = true;
  const governing = combinations[bestIdx];

  const totalServiceAxial = PD + PL + PLr;
  const ratioLoverD = PD > 0 ? PL / PD : 0;
  const effectiveAmplificationFactor =
    totalServiceAxial > 0 ? governing.loads.Pu / totalServiceAxial : 1.0;

  // Realizar comparativa simultánea entre las 3 normas para las mismas cargas de servicio
  const comparisons = computeStandardsComparison(service, governing.loads.Pu);

  return {
    standard,
    standardName: getStandardDisplayName(standard),
    serviceLoads: service,
    combinations,
    governingCombination: governing,
    totalServiceAxial: round(totalServiceAxial),
    ratioLoverD: round(ratioLoverD),
    effectiveAmplificationFactor: round(effectiveAmplificationFactor, 3),
    comparisons,
  };
}

function getStandardDisplayName(standard: DesignStandard): string {
  switch (standard) {
    case 'ACI_318_19':
      return 'ACI 318-19 / ASCE 7-16 (EE.UU.)';
    case 'NC_450_2006':
      return 'NC 450:2006 / NC 46 (Normas Cubanas)';
    case 'EUROCODE_2':
      return 'Eurocódigo 2 / EN 1990 (Comunidad Europea)';
  }
}

function computeStandardsComparison(
  service: ServiceLoads,
  basePu: number
): StandardLoadComparisonItem[] {
  const PD = Number(service.PD) || 0;
  const PL = Number(service.PL) || 0;
  const MDx = Number(service.MDx) || 0;
  const MLx = Number(service.MLx) || 0;
  const totalService = Math.max(1, PD + PL);

  // 1. ACI 318: 1.2 D + 1.6 L
  const puAci = 1.2 * PD + 1.6 * PL;
  const muxAci = 1.2 * MDx + 1.6 * MLx;

  // 2. NC 450: 1.2 D + 1.6 L (o 1.35 D + 1.5 L)
  const puNc = Math.max(1.2 * PD + 1.6 * PL, 1.35 * PD + 1.5 * PL);
  const muxNc = Math.max(1.2 * MDx + 1.6 * MLx, 1.35 * MDx + 1.5 * MLx);

  // 3. Eurocódigo: 1.35 Gk + 1.50 Qk
  const puEc = 1.35 * PD + 1.5 * PL;
  const muxEc = 1.35 * MDx + 1.5 * MLx;

  const round = (v: number) => Number(v.toFixed(1));

  const items: StandardLoadComparisonItem[] = [
    {
      standard: 'ACI_318_19',
      standardName: 'ACI 318-19 / ASCE 7',
      country: 'Internacional / EE.UU.',
      governingCombinationName: '1.2D + 1.6L',
      governingFormula: '1.20 D + 1.60 L',
      Pu: round(puAci),
      Mux: round(muxAci),
      diffPctWithBase: basePu > 0 ? round(((puAci - basePu) / basePu) * 100) : 0,
      ratioToService: round(puAci / totalService),
    },
    {
      standard: 'NC_450_2006',
      standardName: 'NC 450:2006 / NC 120',
      country: 'Cuba',
      governingCombinationName: '1.35D + 1.50L / 1.20D + 1.60L',
      governingFormula: '1.35 D + 1.50 L',
      Pu: round(puNc),
      Mux: round(muxNc),
      diffPctWithBase: basePu > 0 ? round(((puNc - basePu) / basePu) * 100) : 0,
      ratioToService: round(puNc / totalService),
    },
    {
      standard: 'EUROCODE_2',
      standardName: 'Eurocódigo EN 1990 (EC2)',
      country: 'Europa',
      governingCombinationName: '1.35Gk + 1.50Qk',
      governingFormula: '1.35 Gk + 1.50 Qk',
      Pu: round(puEc),
      Mux: round(muxEc),
      diffPctWithBase: basePu > 0 ? round(((puEc - basePu) / basePu) * 100) : 0,
      ratioToService: round(puEc / totalService),
    },
  ];

  return items;
}
