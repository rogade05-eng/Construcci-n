/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialType = 'concrete' | 'steel' | 'wood';

export type DesignStandard = 'ACI_318_19' | 'EUROCODE_2' | 'NC_450_2006';

export type EndCondition =
  | 'pinned_pinned'       // Articulado - Articulado (k = 1.0)
  | 'fixed_free'           // Empotrado - Libre (k = 2.0)
  | 'fixed_pinned'         // Empotrado - Articulado (k = 0.7)
  | 'fixed_fixed'          // Empotrado - Empotrado (k = 0.5)
  | 'sway_fixed_pinned'    // Desplazable Empotrado - Articulado (k = 2.0)
  | 'sway_fixed_fixed';    // Desplazable Empotrado - Empotrado (k = 1.2)

// Hormigón Armado
export interface ConcreteGeometry {
  shape: 'rectangular' | 'circular';
  b: number; // mm
  h: number; // mm
  cover: number; // mm
}

export interface ConcreteProperties {
  fc: number; // Resistencia a compresión f'c (MPa), ej: 25, 30, 35 MPa
  fy: number; // Límite de fluencia fy del acero (MPa), ej: 420 MPa (Grado 60), 500 MPa
  aggregateSize: number; // Tamaño máximo de agregado (mm), ej: 19 mm (3/4")
  cover: number; // Recubrimiento libre al estribo (mm), ej: 40 mm
  density: number; // kg/m³, ej: 2400
}

export interface RebarBar {
  id: string;
  x: number; // mm desde el centroide
  y: number; // mm desde el centroide
  diameter: number; // mm (12, 16, 20, 25, 32)
  area: number; // mm²
  isCorner: boolean;
}

export interface RebarCombination {
  name: string;
  cornerBars: { count: 4; diameter: number };
  faceXBars: { countPerFace: number; diameter: number };
  faceYBars: { countPerFace: number; diameter: number };
  totalBars: number;
  totalAs: number; // mm²
  rho: number; // % cuantía
  isValid: boolean;
  clearSpacing: number; // mm
  weightPerMeter: number; // kg/m
}

export type TiePatternType =
  | 'perimeter_only'            // Estribo perimetral simple (2 ramas)
  | 'perimeter_crossties'       // Perimetral + Trabas suplementarias (cross-ties en X y/o Y)
  | 'perimeter_diamond'         // Perimetral + Rombo interior
  | 'overlapping_perimeter';    // Dos cercos perimetrales solapados (4 ramas)

export interface ConcreteTieDesign {
  diameter: number; // mm (8, 10, 12, 16)
  spacing?: number; // espaciamiento general (mm)
  legsX: number; // ramas en X (2, 3, 4)
  legsY: number; // ramas en Y (2, 3, 4)
  s0: number; // espaciamiento en zona de confinamiento (mm)
  l0: number; // longitud de confinamiento en extremos (mm)
  sMid: number; // espaciamiento en tercio central (mm)
  hookAngle: number; // 135° sismo resistente
  hookLength: number; // mm extensión del gancho (>= 6db ó 75mm)
  lapSpliceLength: number; // mm longitud de solape (traslape)
  lapLocation: string; // ej: "Tercio central de la columna"
  patternType?: TiePatternType;
  crossTieDiameter?: number; // mm
  crossTieSpacing?: number; // mm
  crossTiesX?: number; // número de trabas en dirección X
  crossTiesY?: number; // número de trabas en dirección Y
  bundledBars?: boolean; // si hay paquetes de barras
  bundleCount?: number; // 2 ó 3 barras por paquete
}

// Acero Estructural
export type SteelProfileType = 'W_SHAPE' | 'HSS_RECT' | 'HSS_ROUND' | 'BOX_BUILT';

export interface SteelProperties {
  id?: string;
  name?: string;
  grade?: string;
  Fy: number; // MPa
  Fu: number; // MPa
  E: number; // MPa (200000)
}

export interface SteelProfileData {
  id?: string;
  type: SteelProfileType;
  designation: string; // ej: "W12x65", "HEB 300", "HSS 250x250x12"
  d: number; // Altura total (mm)
  b: number; // Ancho del ala (mm)
  tw: number; // Espesor del alma (mm)
  tf: number; // Espesor del ala (mm)
  A: number; // Área (cm²)
  Ix: number; // Inercia X (cm⁴)
  Iy: number; // Inercia Y (cm⁴)
  rx: number; // Radio de giro X (cm)
  ry: number; // Radio de giro Y (cm)
  Zx: number; // Módulo plástico Zx (cm³)
  Zy: number; // Módulo plástico Zy (cm³)
}

export interface SteelConnectionDesign {
  // Placa base
  basePlateWidth: number; // mm (B)
  basePlateLength: number; // mm (N)
  basePlateThickness: number; // mm (tp)
  plateGrade: string; // ej: A36
  // Pernos de anclaje
  boltDiameter: number; // mm (16, 20, 24, 30)
  boltGrade: 'A307' | 'A325' | 'A490' | 'Grado_8.8';
  boltCount: number; // 4, 6, 8
  boltDistanceEdge: number; // mm
  // Soldadura
  weldType: 'fillet' | 'full_penetration';
  weldLegSize: number; // mm (tamaño de pierna 'a')
  weldElectrode: 'E70XX' | 'E60XX' | 'E80XX';
  weldThroat: number; // garganta eficaz 'te' = 0.707 * a
  weldCapacityKN: number;
  // Unión viga-columna (Nodal)
  shearTabThickness: number;
  connectionBoltsCount: number;
  connectionWeldSize: number;
}

// Madera Estructural
export type WoodSpeciesGroup = 'NC_GRUPO_A' | 'NC_GRUPO_B' | 'NC_GRUPO_C' | 'PINO_ESTRUCTURAL' | 'ROBLE_D40';

export interface WoodProperties {
  id?: string;
  name?: string;
  species?: string;
  speciesGroup?: WoodSpeciesGroup;
  fc0: number; // Compresión paralela a las fibras (MPa)
  ft0: number; // Tracción paralela (MPa)
  fv: number; // Cortante paralelo (MPa)
  E0?: number; // Módulo de elasticidad medio (MPa)
  E0mean?: number;
  E005: number; // Módulo elástico al 5to percentil (MPa)
  serviceClass?: 1 | 2 | 3; // Clase de servicio según humedad
  loadDuration?: 'permanent' | 'long_term' | 'medium_term' | 'short_term' | 'instantaneous';
  kmod: number; // Factor de modificación
}

// Solicitaciones de Carga
export interface ColumnLoads {
  Pu: number; // Carga axial de compresión (kN)
  Mux: number; // Momento flector en eje fuerte X (kN·m)
  Muy: number; // Momento flector en eje débil Y (kN·m)
  Vux: number; // Cortante en eje X (kN)
  Vuy: number; // Cortante en eje Y (kN)
}

// Geometría General
export interface ColumnGeometry {
  material: MaterialType;
  standard: DesignStandard;
  heightL: number; // Altura libre L (m)
  endConditionX: EndCondition;
  endConditionY: EndCondition;
  kx: number; // Factor de longitud efectiva
  ky: number;
  // Dimensiones para hormigón y madera
  b: number; // Ancho b (mm)
  h: number; // Peralte h (mm)
  shape: 'rectangular' | 'circular';
  diameter: number; // mm para circular
}

// P-M Interaction Point
export interface InteractionPoint {
  P: number; // Axial en kN (+ compresión, - tracción)
  M: number; // Momento en kN·m
  curvature?: number;
  type?: 'pure_compression' | 'balanced' | 'pure_tension' | 'decompression' | 'nominal' | 'design';
}

// Despiece de Acero (Bar Bending Schedule)
export interface SteelScheduleItem {
  mark: string;
  description: string;
  shapeType: 'straight_hook' | 'closed_stirrup_135' | 'cross_tie';
  shapeDetails: string;
  diameter: number;
  count: number;
  lengthM: number;
  totalLengthM: number;
  unitWeightKgM: number;
  totalWeightKg: number;
}

export interface RebarScheduleItem {
  mark: string; // ej: "C1-B1"
  type: 'longitudinal' | 'tie_perimeter' | 'tie_interior' | 'cross_tie';
  barDiameter: number; // mm
  shapeCode: string; // Rectangular cerrado, Gancho 135°, Barra recta con patas
  shapeDescription: string;
  count: number;
  lengthPerPieceM: number;
  totalLengthM: number;
  unitWeightKgM: number;
  totalWeightKg: number;
  a: number; // cota a en cm
  b: number; // cota b en cm
  c?: number; // cota c en cm
  hook?: number; // longitud gancho cm
}

// Resultado completo de verificación y diseño
export interface CalculationResult {
  // Esbeltez
  slendernessX: number;
  slendernessY: number;
  slendernessLimit: number;
  isSlender: boolean;
  momentMagnifierDeltaNs: number;
  magnifiedMux: number; // Mc = delta_ns * M2
  magnifiedMuy: number;

  // Capacidad Axial y Flexión
  phiPnMax: number; // Capacidad axial pura máxima (kN)
  PnMax: number; // Nominal máxima (kN)
  dcrAxial: number; // Ratio Demanda/Capacidad P
  dcrFlexure: number; // Ratio Demanda/Capacidad M
  dcrBiaxial: number; // Interacción biaxial (Bresler o contorno)
  isSafe: boolean;

  // Capacidad a Cortante
  Vc: number; // Capacidad hormigón (kN)
  Vs: number; // Capacidad estribos (kN)
  Vn: number; // Nominal total (kN)
  phiVn: number; // Diseño total (kN)
  dcrShear: number;
  isShearSafe: boolean;

  // Curvas de Interacción
  nominalCurve: InteractionPoint[];
  designCurve: InteractionPoint[];
  currentPoint: { P: number; M: number };

  // Deformación elástica y momento a lo largo del elemento
  heightPoints: {
    z: number; // m
    deflectionMm: number;
    momentKNm: number;
    stressMPa: number;
  }[];

  // Despiece de armadura
  schedule: RebarScheduleItem[];
  totalSteelWeightKg: number;
  steelRatioKgM3: number; // Densidad de armadura (kg/m³)

  // Resumen normativo paso a paso
  steps: {
    title: string;
    codeRef: string;
    formula: string;
    values: string;
    status: 'OK' | 'WARNING' | 'DANGER';
    comment: string;
  }[];
}

// Datos de la Obra y Responsable de Cálculos
export interface ProjectMetadata {
  projectName: string; // Nombre del Proyecto u Obra
  location: string; // Ubicación / Dirección de la Obra
  clientName: string; // Cliente o Propietario
  elementId: string; // Identificación del Elemento (ej. Columna C-1, Nivel +3.00m)
  engineerName: string; // Ingeniero Responsable del Cálculo
  professionalLicense: string; // Matrícula Profesional / Registro / Cédula
  companyName: string; // Empresa o Consultora Estructural
  calculationDate: string; // Fecha de Emisión (YYYY-MM-DD o formato local)
  notes: string; // Notas adicionales u observaciones técnicas
}

export const DEFAULT_PROJECT_METADATA: ProjectMetadata = {
  projectName: 'Edificio Residencial Plaza',
  location: 'Av. Principal #452, Sector Norte',
  clientName: 'Inmobiliaria del Caribe S.A.',
  elementId: 'Columna C-1 (Nivel +0.00 a +3.00m)',
  engineerName: 'Ing. Roberto García M.',
  professionalLicense: 'Reg. Profesional #48291 / UNAICC',
  companyName: 'Consultoría e Ingeniería Estructural',
  calculationDate: new Date().toISOString().split('T')[0],
  notes: 'Diseño sismorresistente de columna conforme a ACI 318-19, NC 450:2006 y Eurocódigo.',
};

// Parámetros Sísmicos y de Viento
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
  ag: number; // Aceleración pico ag/g
  tributaryWeightKN: number; // Carga tributaria sísmica W (kN)
}

export interface WindParameters {
  zone: WindZoneCuba;
  terrain: TerrainCategory;
  V0: number; // Velocidad básica de referencia (m/s)
  tributaryWidthM: number; // Ancho tributario de fachada (m)
  Cd: number; // Coeficiente de forma o arrastre
  Cp: number; // Coeficiente de presión neta eólica
}

// Estado completo de inputs de la aplicación para autoguardado en localStorage
export interface AppInputsState {
  version: number;
  lastModified: number; // timestamp
  projectMetadata: ProjectMetadata;
  material: MaterialType;
  standard: DesignStandard;
  activeTab: 'cad' | 'curves' | 'pdelta' | 'load_combos' | 'rebar' | 'bbs' | 'ties_combined' | 'connections' | 'failure_sim' | 'seismic_wind' | 'ai';
  activeHousingTitle: string | null;
  loads: ColumnLoads;
  colLength: number;
  kx: number;
  ky: number;
  // Hormigón
  concreteGeom: ConcreteGeometry;
  concreteMatKey: string;
  rebarMatKey: string;
  selectedComboName: string;
  tieDesign: ConcreteTieDesign;
  // Acero
  selectedProfileId: string;
  steelMatKey: string;
  // Madera
  woodB: number;
  woodH: number;
  woodMatKey: string;
  // Sísmico y Eólico
  seismicParams: SeismicParameters;
  windParams: WindParameters;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  formattedDate: string;
  title: string;
  trigger: 'auto' | 'manual' | 'preset' | 'optimization' | 'session_restore';
  summary: string;
  state: AppInputsState;
}

export const DEFAULT_APP_INPUTS_STATE: AppInputsState = {
  version: 1,
  lastModified: Date.now(),
  projectMetadata: DEFAULT_PROJECT_METADATA,
  material: 'concrete',
  standard: 'ACI_318_19',
  activeTab: 'cad',
  activeHousingTitle: null,
  loads: {
    Pu: 1250,
    Mux: 120,
    Muy: 45,
    Vux: 65,
    Vuy: 35,
  },
  colLength: 3.5,
  kx: 1.0,
  ky: 1.0,
  concreteGeom: {
    shape: 'rectangular',
    b: 400,
    h: 500,
    cover: 30,
  },
  concreteMatKey: 'H25',
  rebarMatKey: 'B500S',
  selectedComboName: '4Ø20 (Esquinas) + 4Ø16 (Caras)',
  tieDesign: {
    diameter: 10,
    spacing: 150,
    s0: 100,
    sMid: 200,
    l0: 600,
    legsX: 2,
    legsY: 2,
    hookAngle: 135,
    hookLength: 100,
    lapSpliceLength: 850,
    lapLocation: 'Tercio central de la columna',
    patternType: 'perimeter_only',
  },
  selectedProfileId: 'W12x65',
  steelMatKey: 'A572_Gr50',
  woodB: 200,
  woodH: 200,
  woodMatKey: 'NC_GRUPO_A',
  seismicParams: {
    zone: 'ZONA_5',
    soil: 'SUELO_C',
    importance: 'ORDINARIO',
    ductility: 'ALTA',
    R: 6.0,
    I: 1.0,
    ag: 0.35,
    tributaryWeightKN: 850,
  },
  windParams: {
    zone: 'ZONA_VIENTO_I',
    terrain: 'TERRENO_A',
    V0: 60.0,
    tributaryWidthM: 4.5,
    Cd: 1.35,
    Cp: 1.30,
  },
};


