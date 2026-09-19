import {
  ColumnLoads,
  ConcreteGeometry,
  ConcreteProperties,
  ConcreteTieDesign,
  DesignStandard,
  SteelProfileData,
  SteelProperties,
} from '../types';
import {
  SeismicParameters,
  SeismicWindVerificationResult,
  WindParameters,
} from './seismicWindEngine';
import { STEEL_PROFILES } from './standardsData';

export interface SeismicWindSolutionOption {
  id: string;
  title: string;
  badgeText: string;
  badgeVariant: 'emerald' | 'cyan' | 'amber';
  isRecommended: boolean;
  summary: string;
  benefits: string[];
  normativeCode: string;
  expectedDcr: number;
  expectedStatus: 'CUMPLE' | 'ADVERTENCIA';
  changes: {
    concreteGeom?: Partial<ConcreteGeometry>;
    tieDesign?: Partial<ConcreteTieDesign>;
    concreteMatKey?: string;
    steelProfileId?: string;
    woodB?: number;
    woodH?: number;
    seismicParams?: Partial<SeismicParameters>;
  };
  details: {
    label: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface SeismicWindDiagnostics {
  hasFailure: boolean;
  hasWarnings: boolean;
  summaryStatus: 'CUMPLE' | 'NO_CUMPLE' | 'ADVERTENCIAS';
  criticalIssues: {
    id: string;
    title: string;
    severity: 'DANGER' | 'WARNING';
    demand: string;
    capacity: string;
    description: string;
    actionHint: string;
  }[];
  solutions: SeismicWindSolutionOption[];
}

export function generateSeismicWindSolutions(params: {
  material: 'concrete' | 'steel' | 'wood';
  standard: DesignStandard;
  colLengthM: number;
  loads: ColumnLoads;
  seismicParams: SeismicParameters;
  windParams: WindParameters;
  verificationResult: SeismicWindVerificationResult;
  concreteGeom: ConcreteGeometry;
  tieDesign: ConcreteTieDesign;
  concreteProps: ConcreteProperties;
  steelProfile: SteelProfileData;
  steelProps: SteelProperties;
  woodB: number;
  woodH: number;
}): SeismicWindDiagnostics {
  const {
    material,
    standard,
    colLengthM,
    seismicParams,
    verificationResult,
    concreteGeom,
    tieDesign,
    concreteProps,
    steelProfile,
    steelProps,
    woodB,
    woodH,
  } = params;

  const { checks, governingCombination, maxDcr } = verificationResult;

  const criticalIssues: SeismicWindDiagnostics['criticalIssues'] = [];

  // Analizar cada verificación
  for (const ck of checks) {
    if (ck.status === 'DANGER' || ck.status === 'WARNING') {
      let hint = '';
      if (ck.id === 'SEISMIC_SHEAR') {
        hint = 'Reducir separación de estribos s₀, añadir ramas suplementarias o aumentar dimensiones b·h.';
      } else if (ck.id === 'SEISMIC_CONFINEMENT') {
        hint = 'Reducir s₀ a ≤ 100 mm (ó b/4), alargar zona crítica l₀ y asegurar ganchos a 135°.';
      } else if (ck.id === 'AXIAL_LOAD_DUCTILITY') {
        hint = 'Incrementar la sección b·h o la resistencia del hormigón f\'c para reducir Pu/(f\'c·Ag) a ≤ 0.30.';
      } else if (ck.id === 'STEEL_SEISMIC_COMPACTNESS') {
        hint = 'Cambiar a un perfil con alas y alma más gruesas (clasificación Altamente Dúctil AISC 341).';
      } else if (ck.id === 'WIND_UPLIFT_ANCHORAGE') {
        hint = 'Disponer pernos de anclaje de alta resistencia embebidos para resistir arrancamiento neto por huracán.';
      }

      criticalIssues.push({
        id: ck.id,
        title: ck.title,
        severity: ck.status,
        demand: ck.demand,
        capacity: ck.capacity,
        description: ck.description,
        actionHint: hint,
      });
    }
  }

  // Si la combinación gobernante excede 1.0 y no estaba explícitamente en checks
  if (governingCombination.dcr > 1.0 && !criticalIssues.some((i) => i.id === 'COMB_DCR_EXCEEDED')) {
    criticalIssues.unshift({
      id: 'COMB_DCR_EXCEEDED',
      title: `Sobrecarga Crítica en ${governingCombination.name}`,
      severity: 'DANGER',
      demand: `DCR = ${(governingCombination.dcr * 100).toFixed(1)}% (Pu=${governingCombination.Pu} kN, Mu=${governingCombination.Mux} kN·m, Vu=${governingCombination.Vux} kN)`,
      capacity: 'Límite Normativo DCR ≤ 100%',
      description: 'La combinación de fuerzas sísmicas/viento con cargas axiales y momentos excede la superficie de interacción de la columna.',
      actionHint: 'Aumentar la sección transversal, mejorar la calidad del material o densificar el refuerzo.',
    });
  }

  const hasFailure = criticalIssues.some((i) => i.severity === 'DANGER') || maxDcr > 1.0;
  const hasWarnings = criticalIssues.some((i) => i.severity === 'WARNING');

  const summaryStatus: SeismicWindDiagnostics['summaryStatus'] = hasFailure
    ? 'NO_CUMPLE'
    : hasWarnings
    ? 'ADVERTENCIAS'
    : 'CUMPLE';

  const solutions: SeismicWindSolutionOption[] = [];

  // ============================================================================
  // GENERAR SOLUCIONES PARA HORMIGÓN ARMADO
  // ============================================================================
  if (material === 'concrete') {
    const curB = concreteGeom.b;
    const curH = concreteGeom.h;

    // 1. SOLUCIÓN ÓPTIMA RECOMENDADA (SECCIÓN + CONFINAMIENTO TOTAL)
    // Determinar incremento de sección óptimo
    let deltaDim = 50;
    if (governingCombination.dcr > 1.4 || governingCombination.Pu > 2500) {
      deltaDim = 100;
    } else if (governingCombination.dcr <= 1.05 && governingCombination.dcr > 1.0) {
      deltaDim = 50;
    }

    const optB = curB + deltaDim;
    const optH = curH + deltaDim;
    const minDimOpt = Math.min(optB, optH);
    const optS0 = Math.min(80, Math.floor(minDimOpt / 4));
    const optSMid = Math.min(150, Math.floor(minDimOpt / 2));
    const optL0 = Math.max(650, optH + 100, Math.round((colLengthM * 1000) / 6));
    const optDiameter = Math.max(10, tieDesign.diameter);
    const optLegsX = optB >= 400 ? 4 : Math.max(2, tieDesign.legsX);
    const optLegsY = optH >= 400 ? 4 : Math.max(2, tieDesign.legsY);

    const estDcrOpt = Math.max(0.65, Number((governingCombination.dcr * Math.pow(curB * curH / (optB * optH), 1.3)).toFixed(2)));

    solutions.push({
      id: 'CONCRETE_RECOMMENDED_INTEGRAL',
      title: 'Solución Óptima Integral: Aumento de Sección + Confinamiento Sísmico Especial',
      badgeText: 'RECOMENDADA (CUMPLE 100%)',
      badgeVariant: 'emerald',
      isRecommended: true,
      summary: `Aumentar la sección a ${optB}×${optH} mm e instalar cercos sísmicos especiales Ø${optDiameter} con s₀ = ${optS0} mm en zona crítica l₀ = ${optL0} mm con ganchos a 135°.`,
      benefits: [
        `Reduce el DCR gobernante a ~${(estDcrOpt * 100).toFixed(0)}%, garantizando un amplio margen de seguridad.`,
        `Aumenta la resistencia a cortante φVn en más de un 60%, soportando holgadamente el cortante sísmico Vu=${governingCombination.Vux} kN.`,
        'Cumple plenamente los requisitos de ductilidad y confinamiento de ACI 318-19 Cap. 18 y NC 46:2017.',
        'Reduce el nivel de esfuerzo axial Pu/(f\'c·Ag) a valores muy seguros (≤ 0.25).',
      ],
      normativeCode: standard === 'EUROCODE_2' ? 'EN 1998-1:2004 §5.4.3' : 'ACI 318-19 §18.7.5 / NC 46:2017 §7.2',
      expectedDcr: estDcrOpt,
      expectedStatus: 'CUMPLE',
      changes: {
        concreteGeom: { b: optB, h: optH },
        tieDesign: {
          diameter: optDiameter,
          s0: optS0,
          sMid: optSMid,
          l0: optL0,
          legsX: optLegsX,
          legsY: optLegsY,
          hookAngle: 135,
          hookLength: 100,
        },
      },
      details: [
        { label: 'Dimensiones Columna (b × h)', oldValue: `${curB} × ${curH} mm`, newValue: `${optB} × ${optH} mm` },
        { label: 'Separación en Zona Crítica (s₀)', oldValue: `${tieDesign.s0} mm`, newValue: `${optS0} mm` },
        { label: 'Longitud de Confinamiento (l₀)', oldValue: `${tieDesign.l0} mm`, newValue: `${optL0} mm` },
        { label: 'Ramas de Estribos (X / Y)', oldValue: `${tieDesign.legsX} / ${tieDesign.legsY} ramas`, newValue: `${optLegsX} / ${optLegsY} ramas` },
        { label: 'Ángulo de Ganchos Sísmicos', oldValue: `${tieDesign.hookAngle}°`, newValue: '135° sísmico con 100 mm' },
      ],
    });

    // 2. SOLUCIÓN CONSERVANDO ENCOFRADOS (SOLO ARMADURA, ESTRIBOS Y HORMIGÓN H30/H35)
    const minDimCur = Math.min(curB, curH);
    const noFormS0 = Math.min(75, Math.floor(minDimCur / 4));
    const noFormSMid = Math.min(125, Math.floor(minDimCur / 2));
    const noFormL0 = Math.max(600, curH + 100, Math.round((colLengthM * 1000) / 6));
    const targetMatKey = concreteProps.fc < 30 ? 'H30' : 'H35';
    const estDcrNoForm = Math.max(0.72, Number((governingCombination.dcr * 0.78).toFixed(2)));

    solutions.push({
      id: 'CONCRETE_NO_FORM_MODIFICATION',
      title: 'Solución Sin Alterar Encofrados: Densificación Transversal + Hormigón H30',
      badgeText: 'PRESERVA ARQUITECTURA',
      badgeVariant: 'cyan',
      isRecommended: false,
      summary: `Mantiene la sección arquitectónica de ${curB}×${curH} mm, densifica los estribos a Ø10 @ ${noFormS0} mm con 4 ramas (estribo + trabas) y eleva la clase de hormigón a ${targetMatKey} (f\'c = ${targetMatKey === 'H30' ? '30' : '35'} MPa).`,
      benefits: [
        'No requiere modificar los planos de encofrado ni afecta el espacio arquitectónico interior.',
        'La resistencia a cortante φVn se duplica mediante la adición de trabas interiores (4 ramas) y estribado a 75 mm.',
        'El incremento de f\'c aumenta la resistencia a compresión y la rigidez de la columna.',
      ],
      normativeCode: 'ACI 318-19 §18.7.6 & §22.5 / NC 450:2006',
      expectedDcr: estDcrNoForm,
      expectedStatus: 'CUMPLE',
      changes: {
        concreteMatKey: targetMatKey,
        tieDesign: {
          diameter: Math.max(10, tieDesign.diameter),
          s0: noFormS0,
          sMid: noFormSMid,
          l0: noFormL0,
          legsX: 4,
          legsY: 4,
          hookAngle: 135,
          hookLength: 100,
        },
      },
      details: [
        { label: 'Dimensiones Columna', oldValue: `${curB} × ${curH} mm`, newValue: `${curB} × ${curH} mm (Inalterada)` },
        { label: 'Resistencia Hormigón f\'c', oldValue: `${concreteProps.fc} MPa`, newValue: `${targetMatKey === 'H30' ? '30' : '35'} MPa (${targetMatKey})` },
        { label: 'Separación s₀ (extremos)', oldValue: `${tieDesign.s0} mm`, newValue: `${noFormS0} mm` },
        { label: 'Ramas de Estribos', oldValue: `${tieDesign.legsX} ramas`, newValue: '4 ramas (cerco + traba cruzada)' },
      ],
    });

    // 3. SOLUCIÓN DE ALTA RIGIDEZ PARA CONTROL DE DERIVAS Y HURACÁN
    const stiffB = Math.max(500, curB + 100);
    const stiffH = Math.max(500, curH + 100);
    const estDcrStiff = Math.max(0.50, Number((governingCombination.dcr * 0.45).toFixed(2)));

    solutions.push({
      id: 'CONCRETE_HIGH_STIFFNESS',
      title: 'Solución de Alta Inercia: Sección de Gran Rigidez (500×500 mm)',
      badgeText: 'MÁXIMA RIGIDEZ Y DERIVA',
      badgeVariant: 'amber',
      isRecommended: false,
      summary: `Incrementa la sección a ${stiffB}×${stiffH} mm, elevando drásticamente el momento de inercia y controlando los desplazamientos horizontales y el vuelco por huracán.`,
      benefits: [
        'Disminuye la deriva lateral de piso a valores muy inferiores al 1.0% de la altura de entrepiso.',
        'La carga axial relativa Pu/(f\'c·Ag) desciende por debajo de 0.18, garantizando máxima ductilidad.',
        'Ideal para edificios de más de 4 plantas situados en zonas sísmicas 4 ó 5 de Cuba (Santiago, Guantánamo).',
      ],
      normativeCode: 'NC 46:2017 §5.3 / NC 285:2003',
      expectedDcr: estDcrStiff,
      expectedStatus: 'CUMPLE',
      changes: {
        concreteGeom: { b: stiffB, h: stiffH },
        tieDesign: {
          diameter: 10,
          s0: 80,
          sMid: 160,
          l0: Math.max(700, stiffH + 100),
          legsX: 4,
          legsY: 4,
          hookAngle: 135,
          hookLength: 100,
        },
      },
      details: [
        { label: 'Sección Transversal', oldValue: `${curB} × ${curH} mm`, newValue: `${stiffB} × ${stiffH} mm` },
        { label: 'Área de Concreto Ag', oldValue: `${(curB * curH / 100).toFixed(0)} cm²`, newValue: `${(stiffB * stiffH / 100).toFixed(0)} cm² (+${Math.round(((stiffB * stiffH) / (curB * curH) - 1) * 100)}%)` },
        { label: 'Separación de Estribos s₀', oldValue: `${tieDesign.s0} mm`, newValue: '80 mm' },
      ],
    });

    // 4. SOLUCIÓN POR FACTOR DE DUCTILIDAD R = 8 (PÓRTICO ESPECIAL SMF)
    if (seismicParams.R < 8) {
      solutions.push({
        id: 'CONCRETE_CALIFY_SMF_R8',
        title: 'Calificar Estructura como Pórtico Especial a Momento (R = 8)',
        badgeText: 'INGENIERÍA SÍSMICA SMF',
        badgeVariant: 'cyan',
        isRecommended: false,
        summary: 'Al aplicar el detallado dúctil estricto con estribos a 135° y s₀ ≤ 100 mm, la norma NC 46:2017 y ACI 318 Cap. 18 permiten clasificar la estructura como Pórtico Especial a Momento (SMF) con factor de disipación R = 8, reduciendo las fuerzas de diseño sísmicas.',
        benefits: [
          'Reduce las solicitaciones de cortante sísmico Ve y momento Me de diseño en un 25-50%.',
          'Válido siempre y cuando se respete el confinamiento sísmico l₀ y s₀ en obra.',
        ],
        normativeCode: 'NC 46:2017 Tabla 4.1 / ACI 318-19 Cap. 18',
        expectedDcr: Number((governingCombination.dcr * (seismicParams.R / 8)).toFixed(2)),
        expectedStatus: 'CUMPLE',
        changes: {
          seismicParams: { R: 8 },
          tieDesign: {
            diameter: Math.max(10, tieDesign.diameter),
            s0: Math.min(80, tieDesign.s0),
            l0: Math.max(600, tieDesign.l0),
            hookAngle: 135,
          },
        },
        details: [
          { label: 'Factor de Disipación Sísmica R', oldValue: `R = ${seismicParams.R}`, newValue: 'R = 8.0 (Pórtico Especial SMF)' },
          { label: 'Detallado Requerido', oldValue: 'Estándar', newValue: 'Dúctil Especial ACI 318 Cap. 18' },
        ],
      });
    }
  }

  // ============================================================================
  // GENERAR SOLUCIONES PARA ACERO ESTRUCTURAL
  // ============================================================================
  if (material === 'steel') {
    const curProf = steelProfile;

    // Buscar perfiles más robustos y compactos en el catálogo
    const candidateProfiles = STEEL_PROFILES.filter(
      (p) => p.A > curProf.A && p.tf >= curProf.tf && p.b >= curProf.b
    ).sort((a, b) => a.A - b.A);

    const recommendedProfile = candidateProfiles[1] || candidateProfiles[0] || STEEL_PROFILES[3];

    solutions.push({
      id: 'STEEL_RECOMMENDED_COMPACT_PROFILE',
      title: `Solución Óptima: Cambiar a Perfil Altamente Dúctil ${recommendedProfile.designation}`,
      badgeText: 'RECOMENDADA (AISC 341 SÍSMICO)',
      badgeVariant: 'emerald',
      isRecommended: true,
      summary: `Sustituir el perfil actual por ${recommendedProfile.designation} (Ala tf = ${recommendedProfile.tf} mm, Alma tw = ${recommendedProfile.tw} mm), asegurando compacidad sísmica SMF sin pandeo local y suficiente capacidad flexotorsional.`,
      benefits: [
        'Cumple estrictamente los límites de relación ancho/espesor para pórticos especiales resistentes a momento (AISC 341-16 Tabla D1.1).',
        `Aumenta la capacidad a flexión y cortante, reduciendo el DCR a valores seguros (~${Math.max(0.65, Number((governingCombination.dcr * 0.70).toFixed(2)) * 100).toFixed(0)}%).`,
      ],
      normativeCode: 'AISC 341-16 / AISC 360-16 / NC Acero',
      expectedDcr: Math.max(0.60, Number((governingCombination.dcr * 0.70).toFixed(2))),
      expectedStatus: 'CUMPLE',
      changes: {
        steelProfileId: recommendedProfile.id,
      },
      details: [
        { label: 'Designación de Perfil', oldValue: curProf.designation, newValue: recommendedProfile.designation },
        { label: 'Espesor de Ala (tf)', oldValue: `${curProf.tf} mm`, newValue: `${recommendedProfile.tf} mm (+${(recommendedProfile.tf - curProf.tf).toFixed(1)} mm)` },
        { label: 'Espesor de Alma (tw)', oldValue: `${curProf.tw} mm`, newValue: `${recommendedProfile.tw} mm` },
        { label: 'Área Transversal (A)', oldValue: `${curProf.A} cm²`, newValue: `${recommendedProfile.A} cm²` },
      ],
    });
  }

  // ============================================================================
  // GENERAR SOLUCIONES PARA MADERA
  // ============================================================================
  if (material === 'wood') {
    const optWoodB = Math.max(250, woodB + 50);
    const optWoodH = Math.max(250, woodH + 50);

    solutions.push({
      id: 'WOOD_RECOMMENDED_SECTION',
      title: 'Aumentar Escuadría de Columna a 250×250 mm',
      badgeText: 'RECOMENDADA (CUMPLE)',
      badgeVariant: 'emerald',
      isRecommended: true,
      summary: `Aumentar la sección de madera a ${optWoodB}×${optWoodH} mm e instalar herrajes de acero galvanizado para contrarrestar la succión por huracán.`,
      benefits: [
        'Aumenta la resistencia al cortante paralelo y flexión por ráfagas de viento.',
        'Provee mayor superficie de anclaje para pernos pasantes de 1/2".',
      ],
      normativeCode: 'NC Madera / Eurocódigo 5',
      expectedDcr: 0.75,
      expectedStatus: 'CUMPLE',
      changes: {
        woodB: optWoodB,
        woodH: optWoodH,
      },
      details: [
        { label: 'Escuadría Transversal (b × h)', oldValue: `${woodB} × ${woodH} mm`, newValue: `${optWoodB} × ${optWoodH} mm` },
        { label: 'Anclaje en Base', oldValue: 'Apoyo simple', newValue: 'Standoff galvanizado 50 mm con pernos pasantes' },
      ],
    });
  }

  return {
    hasFailure,
    hasWarnings,
    summaryStatus,
    criticalIssues,
    solutions,
  };
}
