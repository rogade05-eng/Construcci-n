/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MaterialType,
  DesignStandard,
  ConcreteGeometry,
  ConcreteTieDesign,
  ColumnLoads,
  SteelProfileData,
  SteelProperties,
  WoodProperties,
} from '../types';
import { FailureReliabilitySection } from './FailureReliabilitySection';
import { SectionOptimizationResult } from '../engine/sectionOptimizer';
import { Activity, BarChart2 } from 'lucide-react';

export type FailureScenarioId =
  | 'axial_crushing'
  | 'brittle_compression'
  | 'ductile_tension'
  | 'shear_diagonal'
  | 'global_buckling'
  | 'splice_bond_slip'
  | 'steel_local_buckling'
  | 'wood_grain_shear';

interface ScenarioDef {
  id: FailureScenarioId;
  title: string;
  shortLabel: string;
  badge: string;
  type: 'FRÁGIL (CATASTRÓFICA)' | 'DÚCTIL (CON AVISO PREVIO)' | 'INESTABILIDAD (2DO ORDEN)';
  applicableMaterials: MaterialType[];
  description: string;
  physicalCause: string;
  codeReference: string;
  governingEquation: string;
  preventionAdvice: string[];
}

const FAILURE_SCENARIOS: ScenarioDef[] = [
  {
    id: 'shear_diagonal',
    title: 'Falla por Cortante Sísmico / Tracción Diagonal (Fisuración en X)',
    shortLabel: 'Cortante Sísmico (X)',
    badge: '💥 MUY FRÁGIL',
    type: 'FRÁGIL (CATASTRÓFICA)',
    applicableMaterials: ['concrete'],
    description:
      'Falla repentina por insuficiencia de armadura transversal (estribos). Los ciclos alternantes de sismo inducen grietas a 45° que se cruzan formando una "X", separando la columna en cuñas independientes y perdiendo la capacidad de carga vertical.',
    physicalCause:
      'La tensión principal de tracción diagonal excede la resistencia del hormigón (ft > 0.17·λ·√f\'c) y los estribos están muy separados o tienen área insuficiente (Vs < Vu/φ - Vc).',
    codeReference: 'ACI 318-19 §18.7.5 / NC 450:2006 Cap. 8 / NC 46:2017',
    governingEquation: 'Vu > φ(Vc + Vs) con Vs = (Av · fyt · d) / s',
    preventionAdvice: [
      'Reducir la separación de cercos a s0 ≤ 100 mm (o b/4) en los extremos l0.',
      'Añadir ramas intermedias (cross-ties) amarrando cada barra longitudinal.',
      'Ganchos sísmicos cerrados a 135° con extensión de 6db (≥75 mm) para evitar que se abran.',
    ],
  },
  {
    id: 'axial_crushing',
    title: 'Aplastamiento por Compresión Axial Pura y Pandeo de Barras',
    shortLabel: 'Aplastamiento Axial Puro',
    badge: '💥 FRÁGIL / EXPLOSIVA',
    type: 'FRÁGIL (CATASTRÓFICA)',
    applicableMaterials: ['concrete'],
    description:
      'Sobrecarga axial extrema sin flexión. El hormigón alcanza su deformación última de aplastamiento (εcu ≈ 0.003). Se desprende violentamente el recubrimiento (spalling) y, al no tener estribos cercanos, las barras longitudinales pandean hacia afuera desintegrando el núcleo.',
    physicalCause:
      'La carga axial Pu sobrepasa la capacidad nominal máxima φPn,max. Si los estribos no están a ≤ 16db, la longitud no arriostrada de la barra permite el pandeo plástico individual.',
    codeReference: 'ACI 318-19 §22.4.2 / NC 450 §6.1 / Eurocódigo 2 §9.5.3',
    governingEquation: 'Pu > φPn,max = 0.80·φ·[0.85·f\'c·(Ag - Ast) + fy·Ast]',
    preventionAdvice: [
      'Limitar la separación de cercos a ≤ 16db de la barra menor y ≤ 48db del cerco.',
      'Garantizar la cuantía volumétrica de confinamiento Ash según Cap. 18 de ACI.',
      'Aumentar la sección bruta Ag para mantener Pu / (f\'c·Ag) ≤ 0.35.',
    ],
  },
  {
    id: 'brittle_compression',
    title: 'Flexocompresión con Falla Primaria Frágil por Compresión (Pu > Pb)',
    shortLabel: 'Falla Frágil Compresión',
    badge: '⚠️ FRÁGIL',
    type: 'FRÁGIL (CATASTRÓFICA)',
    applicableMaterials: ['concrete'],
    description:
      'Ocurre bajo cargas axiales elevadas combinadas con momento flector moderado (por encima del punto balanceado Pb). El hormigón del borde comprimido se aplasta súbitamente mientras el acero a tracción permanece elástico (εs < εy), sin deformación visible previa.',
    physicalCause:
      'La profundidad del eje neutro c es grande (c/d > 0.6). El hormigón alcanza εcu = 0.003 antes de que el acero fluya, produciendo una rotura por compresión sin preaviso.',
    codeReference: 'ACI 318-19 §21.2.2 (Factor φ = 0.65)',
    governingEquation: 'c > c_bal = d · [0.003 / (0.003 + fy/Es)]',
    preventionAdvice: [
      'Aumentar las dimensiones de la columna para reducir la profundidad relativa del eje neutro.',
      'Incrementar la resistencia f\'c del hormigón de 25 MPa a 30 o 35 MPa.',
      'Proveer estribos densificados en la zona comprimida para aumentar la ductilidad del hormigón confinado.',
    ],
  },
  {
    id: 'ductile_tension',
    title: 'Flexocompresión con Falla Dúctil Controlada por Tracción (Pu < Pb)',
    shortLabel: 'Falla Dúctil Tracción',
    badge: '✓ DÚCTIL (PREAVISO)',
    type: 'DÚCTIL (CON AVISO PREVIO)',
    applicableMaterials: ['concrete'],
    description:
      'Modo de falla ideal y deseado en ingeniería sismorresistente. El acero longitudinal traccionado fluye extensamente (εs ≥ 0.005), abriendo grandes fisuras horizontales de aviso antes de que el hormigón comprimido falle secundariamente. Disipa abundante energía.',
    physicalCause:
      'El momento flector predomina sobre la carga axial. La armadura a tracción plastifica y absorbe deformaciones inelásticas considerables.',
    codeReference: 'ACI 318-19 §21.2.2 (Factor de seguridad favorable φ = 0.90)',
    governingEquation: 'εt ≥ 0.005  =>  φ = 0.90 (Controlado por Tracción)',
    preventionAdvice: [
      'Es el comportamiento objetivo en diseño sismorresistente.',
      'Asegurar una adecuada longitud de anclaje ld para evitar el arrancamiento del acero.',
      'Verificar que la cuantía no sea excesiva (mantener ρ entre 1.5% y 3.0%).',
    ],
  },
  {
    id: 'global_buckling',
    title: 'Pandeo Global por Esbeltez (Efectos P-Δ de 2do Orden)',
    shortLabel: 'Pandeo Global (P-Δ)',
    badge: '📐 INESTABILIDAD',
    type: 'INESTABILIDAD (2DO ORDEN)',
    applicableMaterials: ['concrete', 'steel', 'wood'],
    description:
      'Columna esbelta (kL/r elevado). La deformación lateral elástica genera una excentricidad adicional e = Δ. La carga axial Pu multiplicada por esta deflexión crea un momento flector de 2do orden que amplifica exponencialmente la curvatura hasta el colapso.',
    physicalCause:
      'La carga axial se acerca a la carga crítica de Euler Pc = π²·EI / (kL)². El amplificador de momentos δns se dispara a infinito.',
    codeReference: 'ACI 318-19 §6.6.4 / Eurocódigo 2 §5.8 / AISC 360-16 Cap. C',
    governingEquation: 'Mc = δns · M2   con   δns = Cm / [1 - Pu / (0.75·Pc)]',
    preventionAdvice: [
      'Aumentar la inercia de la sección transversal en el eje débil (aumentar b).',
      'Arriostrar la estructura para reducir la longitud efectiva kL.',
      'Limitar la relación de esbeltez kL/r a menos de 40 para evitar efectos desestabilizantes.',
    ],
  },
  {
    id: 'splice_bond_slip',
    title: 'Falla de Confinamiento y Deslizamiento en Empalme por Traslape',
    shortLabel: 'Deslizamiento Traslape',
    badge: '💥 DESPRENDIMIENTO',
    type: 'FRÁGIL (CATASTRÓFICA)',
    applicableMaterials: ['concrete'],
    description:
      'Fisuración longitudinal a lo largo de las barras solapadas. Las fuerzas de cuña de las corrugaciones inducen tensiones de tracción en el recubrimiento. Al no haber estribos suficientes amarrando el traslape, el hormigón se raja longitudinalmente y las barras se deslizan.',
    physicalCause:
      'Longitud de traslape insuficiente (lst < 1.3·ld) o ubicación incorrecta del empalme en zonas de máximo momento o nudos sísmicos con escaso confinamiento.',
    codeReference: 'ACI 318-19 §25.5 y §18.7.4 / NC 450:2006 Cap. 9',
    governingEquation: 'lst ≥ 1.3 · ld  (Empalme Clase B)',
    preventionAdvice: [
      'Ubicar los empalmes estrictamente en el tercio central de la altura de la columna.',
      'Prohibir traslapes dentro de las zonas de confinamiento l0 y dentro de los nudos.',
      'Densificar los estribos a lo largo de toda la longitud del empalme a ≤ 100 mm.',
    ],
  },
  {
    id: 'steel_local_buckling',
    title: 'Pandeo Local de Alas y Alma del Perfil de Acero (Local Flange Buckling)',
    shortLabel: 'Pandeo Local Ala/Alma',
    badge: '⚠️ PANDEO LOCAL',
    type: 'FRÁGIL (CATASTRÓFICA)',
    applicableMaterials: ['steel'],
    description:
      'En perfiles no compactos o esbeltos sometidos a compresión severa, las alas delgadas ondulan (arrugan) antes de que la sección alcance su capacidad plástica Py o Mp.',
    physicalCause:
      'La relación ancho/espesor b/tf o h/tw supera los límites de compacidad λp o λr según AISC 360 y AISC 341.',
    codeReference: 'AISC 360-16 Tabla B4.1a / AISC 341-16 (Sísmico)',
    governingEquation: 'b / tf > 0.38 · √(E / Fy)   (Sección No Compacta)',
    preventionAdvice: [
      'Seleccionar perfiles W con alas más gruesas (tf) y relación b/tf ≤ λp.',
      'Usar perfiles sísmicamente compactos según AISC 341 para miembros dúctiles.',
      'Añadir rigidizadores transversales en zonas de alta concentración de tensiones.',
    ],
  },
  {
    id: 'wood_grain_shear',
    title: 'Aplastamiento de Fibras y Cizallamiento Longitudinal en Madera',
    shortLabel: 'Aplastamiento Fibras',
    badge: '💥 APLASTAMIENTO',
    type: 'FRÁGIL (CATASTRÓFICA)',
    applicableMaterials: ['wood'],
    description:
      'Falla por sobrepasar la tensión admisible de compresión paralela a las fibras (fc,0,d) con astillamiento visible o por cizallamiento longitudinal en nudos con humedad excesiva.',
    physicalCause:
      'La tensión σc,0 = N / A excede kmod · fc,0,k / γM o pandeo por esbeltez en madera no arriostrada.',
    codeReference: 'Eurocódigo 5 (EN 1995-1-1 §6.1.4) / NC Madera',
    governingEquation: 'σc,0,d ≤ fc,0,d = kmod · (fc,0,k / γM)',
    preventionAdvice: [
      'Aumentar la sección transversal de madera escuadrada.',
      'Verificar la clase de servicio y contenido de humedad para no penalizar kmod.',
      'Disponer pernos pasantes con arandelas de reparto de carga para evitar aplastamiento localizado.',
    ],
  },
];

interface StructuralFailureSimulationViewerProps {
  material: MaterialType;
  standard: DesignStandard;
  onSelectStandard?: (std: DesignStandard) => void;
  concreteGeom?: ConcreteGeometry;
  concreteFc?: number;
  concreteEc?: number;
  rebarFy?: number;
  rebarProps?: { Fy: number; Fu?: number; name?: string };
  tieDesign?: ConcreteTieDesign;
  colLoads?: ColumnLoads;
  colLengthM?: number;
  fc?: number;
  steelProfile?: SteelProfileData;
  steelProps?: SteelProperties;
  woodB?: number;
  woodH?: number;
  woodProps?: WoodProperties;
  kx?: number;
  ky?: number;
  onApplyOptimizedSection?: (optimizedResult: SectionOptimizationResult) => void;
  onOpenOptimizationModal?: () => void;
}

export const StructuralFailureSimulationViewer: React.FC<StructuralFailureSimulationViewerProps> = ({
  material,
  standard,
  onSelectStandard,
  concreteGeom = { shape: 'rectangular' as const, b: 400, h: 400, cover: 40 },
  concreteFc,
  concreteEc,
  rebarFy,
  rebarProps,
  tieDesign = {
    diameter: 10,
    s0: 100,
    sMid: 200,
    l0: 600,
    legsX: 2,
    legsY: 2,
    hookAngle: 135,
    hookLength: 80,
    lapSpliceLength: 600,
    lapLocation: 'Tercio central',
  },
  colLoads = { Pu: 800, Mux: 120, Muy: 30, Vux: 90, Vuy: 20 },
  colLengthM = 3.0,
  fc = 25,
  steelProfile,
  steelProps,
  woodB = 200,
  woodH = 200,
  woodProps,
  kx = 1.0,
  ky = 1.0,
  onApplyOptimizedSection,
  onOpenOptimizationModal,
}) => {
  // Pestaña activa del Visor: Histograma de Confiabilidad o Cinemática 2D
  const [activeViewerTab, setActiveViewerTab] = useState<'reliability_histogram' | 'kinematic_sim'>('reliability_histogram');

  // Filtrar escenarios aplicables al material actual
  const applicableScenarios = FAILURE_SCENARIOS.filter((s) =>
    s.applicableMaterials.includes(material)
  );

  const [selectedScenarioId, setSelectedScenarioId] = useState<FailureScenarioId>(
    material === 'steel'
      ? 'steel_local_buckling'
      : material === 'wood'
      ? 'wood_grain_shear'
      : 'shear_diagonal'
  );

  // Si cambia de material y el escenario actual no aplica, seleccionar el primero válido
  useEffect(() => {
    if (!applicableScenarios.some((s) => s.id === selectedScenarioId)) {
      if (applicableScenarios.length > 0) {
        setSelectedScenarioId(applicableScenarios[0].id);
      }
    }
  }, [material]);

  // Nivel de Carga / Progresión de Daño (0% a 150%)
  const [loadLevel, setLoadLevel] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const animRef = useRef<number | null>(null);

  const activeScenario =
    FAILURE_SCENARIOS.find((s) => s.id === selectedScenarioId) || FAILURE_SCENARIOS[0];

  // Animación suave de aumento de carga
  useEffect(() => {
    if (isPlaying) {
      const step = () => {
        setLoadLevel((prev) => {
          if (prev >= 150) {
            return 0; // Reinicio en bucle
          }
          return Math.min(150, prev + 0.7);
        });
        animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    } else if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  // Parámetros calculados dinámicamente según el nivel de carga
  const damageFactor = Math.max(0, (loadLevel - 60) / 90); // 0 a 1 entre 60% y 150%
  const isYielded = loadLevel >= 80;
  const isFailed = loadLevel >= 115;
  const isCollapsed = loadLevel >= 135;

  // Deformaciones y curvaturas para el SVG (escaladas según loadLevel y escenario)
  const colWidthPx = 80;
  const colHeightPx = 320;
  const centerX = 200;
  const topY = 40;
  const bottomY = topY + colHeightPx;

  // Deflexión lateral máxima en píxeles
  let maxLateralDelta = 0;
  let axialShortening = 0;
  let shearDrift = 0;

  if (selectedScenarioId === 'global_buckling') {
    maxLateralDelta = (loadLevel / 100) * 45;
  } else if (selectedScenarioId === 'ductile_tension') {
    maxLateralDelta = (loadLevel / 100) * 32;
  } else if (selectedScenarioId === 'brittle_compression') {
    maxLateralDelta = (loadLevel / 100) * 18;
  } else if (selectedScenarioId === 'axial_crushing') {
    axialShortening = Math.pow(loadLevel / 100, 2) * 16;
  } else if (selectedScenarioId === 'shear_diagonal') {
    shearDrift = (loadLevel / 100) * 26;
  }

  // Generador de coordenadas para la columna deformada
  // Columna modelada con 7 puntos de altura
  const numPts = 9;
  const leftEdgePts: { x: number; y: number }[] = [];
  const rightEdgePts: { x: number; y: number }[] = [];

  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts; // 0 (arriba) a 1 (abajo)
    const y = topY + t * (colHeightPx - axialShortening);

    // Curvatura sinusoidal lateral
    let dx = 0;
    if (selectedScenarioId === 'global_buckling' || selectedScenarioId === 'ductile_tension' || selectedScenarioId === 'brittle_compression') {
      dx = maxLateralDelta * Math.sin(Math.PI * t);
    } else if (selectedScenarioId === 'shear_diagonal') {
      // Deformación de entrepiso cortante (lineal o cúbica)
      dx = shearDrift * (1 - t);
    }

    // Efecto Poisson en compresión pura (ensanchamiento)
    const poissonDx = selectedScenarioId === 'axial_crushing' ? Math.sin(Math.PI * t) * (loadLevel / 100) * 12 : 0;

    const lx = centerX - colWidthPx / 2 + dx - poissonDx;
    const rx = centerX + colWidthPx / 2 + dx + poissonDx;

    leftEdgePts.push({ x: lx, y });
    rightEdgePts.push({ x: rx, y });
  }

  // Construir path SVG de la columna deformada
  const pathLeft = leftEdgePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const pathRight = [...rightEdgePts].reverse().map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const columnPolyPath = `${pathLeft} ${pathRight} Z`;

  // Estimación de Deformaciones Unitarias
  const eps_c = (0.0035 * (loadLevel / 120)).toFixed(4);
  const eps_s = (0.0055 * (loadLevel / 100)).toFixed(4);

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl space-y-4 font-mono">
      {/* Encabezado Principal */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            Simulador de Falla Estructural, Confiabilidad y Modos de Colapso
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Muestreo probabilístico de falla con Recharts (Monte Carlo), comparativas de normas internacionales (ACI 318, NC 450, Eurocódigo) y cinemática 2D.
          </p>
        </div>

        {/* Badge del Modo Activo */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              activeViewerTab === 'reliability_histogram'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : activeScenario.type.includes('DÚCTIL')
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : activeScenario.type.includes('INESTABILIDAD')
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-rose-950 text-rose-300 border-rose-700'
            }`}
          >
            {activeViewerTab === 'reliability_histogram'
              ? '📊 ANÁLISIS PROBABILÍSTICO'
              : `${activeScenario.badge} - ${activeScenario.type}`}
          </span>
        </div>
      </div>

      {/* Selector de Pestañas del Simulador: Histograma de Confiabilidad vs Cinemática 2D */}
      <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveViewerTab('reliability_histogram')}
          className={`w-full sm:w-auto flex-1 py-2 px-3.5 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeViewerTab === 'reliability_histogram'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Histograma de Probabilidad (Monte Carlo), Normas & Optimización</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-700/60 font-mono">
            Recharts
          </span>
        </button>

        <button
          onClick={() => setActiveViewerTab('kinematic_sim')}
          className={`w-full sm:w-auto flex-1 py-2 px-3.5 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeViewerTab === 'kinematic_sim'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Cinemática y Mecanismos de Colapso Físico 2D</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            0% - 150%
          </span>
        </button>
      </div>

      {/* 1. SECCIÓN DE HISTOGRAMA DE CONFIABILIDAD, COMPARATIVAS DE NORMAS Y ASISTENTE DE OPTIMIZACIÓN */}
      {activeViewerTab === 'reliability_histogram' && (
        <FailureReliabilitySection
          material={material}
          standard={standard}
          onSelectStandard={onSelectStandard}
          concreteGeom={concreteGeom}
          concreteFc={concreteFc ?? fc}
          concreteEc={concreteEc}
          rebarFy={rebarFy}
          rebarProps={rebarProps}
          steelProfile={steelProfile}
          steelProps={steelProps}
          woodB={woodB}
          woodH={woodH}
          woodProps={woodProps}
          colLoads={colLoads}
          colLengthM={colLengthM}
          kx={kx}
          ky={ky}
          onApplyOptimizedSection={onApplyOptimizedSection}
          onOpenOptimizationModal={onOpenOptimizationModal}
        />
      )}

      {/* 2. SECCIÓN DE CINEMÁTICA Y MODOS DE FALLA 2D */}
      {activeViewerTab === 'kinematic_sim' && (
        <div className="space-y-4">
          {/* Selector de Escenarios Específicos de Falla */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold block">
              SELECCIONAR ESCENARIO ESPECÍFICO DE FALLA:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {applicableScenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenarioId(sc.id);
                    setLoadLevel(100);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition border cursor-pointer ${
                    selectedScenarioId === sc.id
                      ? 'bg-cyan-600 border-cyan-400 text-white font-bold shadow-lg'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {sc.shortLabel}
                </button>
              ))}
            </div>
          </div>

      {/* Panel Central: Lienzo Gráfico SVG (Izquierda) + Panel de Control y Diagnóstico (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LIENZO GRÁFICO SVG DE SIMULACIÓN */}
        <div className="lg:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-between relative overflow-hidden min-h-[460px]">
          {/* Etiquetas Superiores de Telemetría */}
          <div className="w-full flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5 z-10">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              SIMULACIÓN CINEMÁTICA 2D
            </span>
            <span className="font-mono">
              ESTADO: <strong className={isCollapsed ? 'text-rose-400' : isYielded ? 'text-amber-400' : 'text-emerald-400'}>
                {loadLevel < 70 ? 'ELÁSTICO (SERVICIO)' : loadLevel <= 100 ? 'LÍMITE NOMINAL (100%)' : loadLevel < 130 ? 'PLASTIFICACIÓN AVANZADA' : 'COLAPSO ESTRUCTURAL'}
              </strong>
            </span>
          </div>

          {/* Gráfico SVG Reactivo */}
          <div className="w-full flex items-center justify-center my-auto py-2">
            <svg viewBox="0 0 400 420" className="w-full max-w-[360px] h-auto select-none">
              <defs>
                <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <polygon points="3,0 6,6 0,6" fill="#f43f5e" />
                </marker>
                <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <polygon points="3,6 6,0 0,0" fill="#f43f5e" />
                </marker>
                <marker id="arrowRight" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <polygon points="6,3 0,0 0,6" fill="#38bdf8" />
                </marker>
                <pattern id="hatchHormigon" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#1e293b" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Apoyos Superior e Inferior */}
              {/* Placa/Viga superior */}
              <rect
                x={centerX - 70 + (selectedScenarioId === 'shear_diagonal' ? shearDrift : 0)}
                y={topY - 18}
                width={140}
                height={18}
                fill="#1e293b"
                stroke="#64748b"
                strokeWidth="1.5"
                rx="2"
              />
              {/* Cimiento/Zapata inferior */}
              <rect x={centerX - 80} y={bottomY} width={160} height={25} fill="#1e293b" stroke="#64748b" strokeWidth="1.5" rx="2" />
              {/* Achurado de suelo bajo la zapata */}
              <line x1={centerX - 70} y1={bottomY + 25} x2={centerX - 50} y2={bottomY + 35} stroke="#475569" />
              <line x1={centerX - 30} y1={bottomY + 25} x2={centerX - 10} y2={bottomY + 35} stroke="#475569" />
              <line x1={centerX + 10} y1={bottomY + 25} x2={centerX + 30} y2={bottomY + 35} stroke="#475569" />
              <line x1={centerX + 50} y1={bottomY + 25} x2={centerX + 70} y2={bottomY + 35} stroke="#475569" />

              {/* Cuerpo Deformado de la Columna */}
              <path
                d={columnPolyPath}
                fill={material === 'wood' ? '#78350f' : material === 'steel' ? '#0369a1' : '#0f172a'}
                stroke={isCollapsed ? '#f43f5e' : isYielded ? '#f59e0b' : '#38bdf8'}
                strokeWidth={isCollapsed ? '2.5' : '1.8'}
                className="transition-all duration-75"
              />

              {/* Barras Longitudinales Interiores Deformadas (si hormigón) */}
              {material === 'concrete' && (
                <>
                  {/* Barra izquierda */}
                  <path
                    d={leftEdgePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x + 14).toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
                    fill="none"
                    stroke={selectedScenarioId === 'axial_crushing' && isCollapsed ? '#ef4444' : '#f59e0b'}
                    strokeWidth={selectedScenarioId === 'axial_crushing' && isCollapsed ? '4' : '2.5'}
                    strokeDasharray={selectedScenarioId === 'splice_bond_slip' && isYielded ? '4 2' : 'none'}
                  />
                  {/* Barra derecha */}
                  <path
                    d={rightEdgePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x - 14).toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
                    fill="none"
                    stroke={selectedScenarioId === 'ductile_tension' && isYielded ? '#10b981' : '#f59e0b'}
                    strokeWidth={selectedScenarioId === 'ductile_tension' && isYielded ? '3.5' : '2.5'}
                  />

                  {/* Estribos Transversales */}
                  {[0.12, 0.22, 0.35, 0.5, 0.65, 0.78, 0.88].map((ratio, idx) => {
                    const idxPt = Math.min(numPts, Math.round(ratio * numPts));
                    const lp = leftEdgePts[idxPt];
                    const rp = rightEdgePts[idxPt];
                    if (!lp || !rp) return null;
                    const isZone0 = ratio <= 0.25 || ratio >= 0.75;
                    const tieBroken = selectedScenarioId === 'shear_diagonal' && isCollapsed && (idx === 2 || idx === 3);

                    if (tieBroken) {
                      return (
                        <g key={idx}>
                          <line x1={lp.x + 10} y1={lp.y} x2={lp.x + (rp.x - lp.x) * 0.4} y2={lp.y} stroke="#ef4444" strokeWidth="1.8" />
                          <line x1={lp.x + (rp.x - lp.x) * 0.6} y1={lp.y} x2={rp.x - 10} y2={rp.y} stroke="#ef4444" strokeWidth="1.8" />
                          {/* Marca de fractura de cerco */}
                          <circle cx={lp.x + (rp.x - lp.x) * 0.5} cy={lp.y} r="2.5" fill="#ef4444" />
                        </g>
                      );
                    }

                    return (
                      <line
                        key={idx}
                        x1={lp.x + 10}
                        y1={lp.y}
                        x2={rp.x - 10}
                        y2={rp.y}
                        stroke={isZone0 ? '#38bdf8' : '#64748b'}
                        strokeWidth={isZone0 ? '1.8' : '1.2'}
                      />
                    );
                  })}
                </>
              )}

              {/* FISURAS Y DAÑOS PROGRESIVOS ESPECÍFICOS */}
              {damageFactor > 0.05 && (
                <g className="transition-opacity duration-150" opacity={Math.min(1, damageFactor * 1.3)}>
                  {/* ESCENARIO 1: CORTANTE SÍSMICO (Fisuras en X diagonales a 45°) */}
                  {selectedScenarioId === 'shear_diagonal' && (
                    <g stroke="#f43f5e" strokeWidth={Math.max(1.5, damageFactor * 3.5)} strokeLinecap="round">
                      <path d="M 175 140 Q 200 190 230 240" fill="none" />
                      <path d="M 230 145 Q 200 190 170 235" fill="none" />
                      {damageFactor > 0.4 && (
                        <>
                          <path d="M 165 160 L 225 220" fill="none" />
                          <path d="M 225 160 L 165 220" fill="none" />
                          <path d="M 180 120 L 210 150" fill="none" />
                        </>
                      )}
                    </g>
                  )}

                  {/* ESCENARIO 2: APLASTAMIENTO AXIAL PURO (Spalling y pandeo exterior) */}
                  {selectedScenarioId === 'axial_crushing' && (
                    <g>
                      {/* Descascaramiento lateral de recubrimiento (spalling) */}
                      <path d="M 152 160 Q 140 185 152 210" stroke="#f43f5e" strokeWidth="2.5" fill="#f43f5e" fillOpacity="0.3" />
                      <path d="M 248 160 Q 260 185 248 210" stroke="#f43f5e" strokeWidth="2.5" fill="#f43f5e" fillOpacity="0.3" />
                      {/* Fisuras verticales de rotura */}
                      <line x1="170" y1="130" x2="170" y2="230" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
                      <line x1="230" y1="130" x2="230" y2="230" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
                    </g>
                  )}

                  {/* ESCENARIO 3: FALLA FRÁGIL POR COMPRESIÓN (Cuña de compresión en borde comprimido) */}
                  {selectedScenarioId === 'brittle_compression' && (
                    <g>
                      {/* Borde comprimido izquierdo: Cuña de aplastamiento */}
                      <polygon points="155,170 175,190 155,210" fill="#f43f5e" fillOpacity="0.6" stroke="#ef4444" strokeWidth="2" />
                      <line x1="155" y1="160" x2="170" y2="175" stroke="#f43f5e" strokeWidth="2" />
                      <line x1="155" y1="220" x2="170" y2="205" stroke="#f43f5e" strokeWidth="2" />
                    </g>
                  )}

                  {/* ESCENARIO 4: FALLA DÚCTIL POR TRACCIÓN (Grietas horizontales de tracción en cara estirada) */}
                  {selectedScenarioId === 'ductile_tension' && (
                    <g stroke="#38bdf8" strokeWidth={Math.max(1.5, damageFactor * 3.2)} strokeLinecap="round">
                      <line x1="200" y1="150" x2="252" y2="150" />
                      <line x1="205" y1="175" x2="255" y2="175" />
                      <line x1="200" y1="200" x2="252" y2="200" />
                      {damageFactor > 0.5 && (
                        <>
                          <line x1="210" y1="125" x2="245" y2="125" />
                          <line x1="210" y1="225" x2="245" y2="225" />
                        </>
                      )}
                    </g>
                  )}

                  {/* ESCENARIO 5: PANDEO GLOBAL POR ESBELTEZ */}
                  {selectedScenarioId === 'global_buckling' && (
                    <g>
                      {/* Rótula plástica central */}
                      <circle cx={centerX + maxLateralDelta} cy={topY + colHeightPx / 2} r={damageFactor * 14} fill="#f59e0b" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="2" />
                      {/* Fisuras de flexión máxima */}
                      <line x1={centerX + maxLateralDelta} y1={topY + colHeightPx / 2 - 15} x2={centerX + maxLateralDelta + 25} y2={topY + colHeightPx / 2 - 15} stroke="#ef4444" strokeWidth="2.5" />
                      <line x1={centerX + maxLateralDelta} y1={topY + colHeightPx / 2 + 15} x2={centerX + maxLateralDelta + 25} y2={topY + colHeightPx / 2 + 15} stroke="#ef4444" strokeWidth="2.5" />
                    </g>
                  )}

                  {/* ESCENARIO 6: TRASLAPE / ADHERENCIA */}
                  {selectedScenarioId === 'splice_bond_slip' && (
                    <g stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3">
                      <line x1="165" y1="180" x2="165" y2="290" />
                      <line x1="235" y1="180" x2="235" y2="290" />
                    </g>
                  )}

                  {/* ESCENARIO 7: ACERO PANDEO LOCAL */}
                  {selectedScenarioId === 'steel_local_buckling' && (
                    <g stroke="#f43f5e" strokeWidth="3" fill="none">
                      <path d="M 155 170 Q 140 185 155 200" />
                      <path d="M 245 170 Q 260 185 245 200" />
                    </g>
                  )}

                  {/* ESCENARIO 8: MADERA CIZALLAMIENTO */}
                  {selectedScenarioId === 'wood_grain_shear' && (
                    <g stroke="#f43f5e" strokeWidth="2" strokeDasharray="8 4">
                      <line x1="185" y1="120" x2="185" y2="260" />
                      <line x1="215" y1="140" x2="215" y2="280" />
                    </g>
                  )}
                </g>
              )}

              {/* VECTORES DE FUERZAS ACTUANTES (Flechas de carga) */}
              {/* Carga Axial Pu */}
              <g>
                <line
                  x1={centerX + (selectedScenarioId === 'shear_diagonal' ? shearDrift : 0)}
                  y1={topY - 45}
                  x2={centerX + (selectedScenarioId === 'shear_diagonal' ? shearDrift : 0)}
                  y2={topY - 20}
                  stroke="#f43f5e"
                  strokeWidth="3.5"
                  markerEnd="url(#arrowDown)"
                />
                <text
                  x={centerX + (selectedScenarioId === 'shear_diagonal' ? shearDrift : 0) + 8}
                  y={topY - 32}
                  fill="#f43f5e"
                  fontSize="10"
                  fontWeight="bold"
                >
                  Pu = {Math.round(colLoads.Pu * (loadLevel / 100))} kN
                </text>
              </g>

              {/* Cortante Vu (si cortante o sismo) */}
              {(selectedScenarioId === 'shear_diagonal' || selectedScenarioId === 'ductile_tension') && (
                <g>
                  <line
                    x1={centerX - 80}
                    y1={topY - 10}
                    x2={centerX - 35}
                    y2={topY - 10}
                    stroke="#38bdf8"
                    strokeWidth="3"
                    markerEnd="url(#arrowRight)"
                  />
                  <text x={centerX - 80} y={topY - 18} fill="#38bdf8" fontSize="9" fontWeight="bold">
                    Vu = {Math.round(colLoads.Vux * (loadLevel / 100))} kN
                  </text>
                </g>
              )}

              {/* Momento Flector Mu curvado */}
              {(selectedScenarioId === 'ductile_tension' || selectedScenarioId === 'brittle_compression' || selectedScenarioId === 'global_buckling') && (
                <g>
                  <path d="M 230 45 Q 260 55 245 80" fill="none" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrowDown)" />
                  <text x="265" y="70" fill="#f59e0b" fontSize="9" fontWeight="bold">
                    Mu = {Math.round(colLoads.Mux * (loadLevel / 100))} kN·m
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Barra de Progresión de Carga y Controles de Simulación */}
          <div className="w-full bg-slate-900/95 p-3 rounded-lg border border-slate-800 space-y-2 z-10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <span>Nivel de Solicitación:</span>
                <span className={loadLevel > 100 ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold'}>
                  {loadLevel.toFixed(0)}% de Capacidad Límite
                </span>
              </span>

              {/* Botones de Control de Animación */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isPlaying ? '⏸ Pausar' : '▶ Animar'}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setLoadLevel(100);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                >
                  100%
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setLoadLevel(0);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                >
                  ↺ 0%
                </button>
              </div>
            </div>

            {/* Slider de Carga */}
            <input
              type="range"
              min="0"
              max="150"
              step="1"
              value={loadLevel}
              onChange={(e) => {
                setIsPlaying(false);
                setLoadLevel(Number(e.target.value));
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />

            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Sin Carga)</span>
              <span>100% (Diseño Nominal φPn)</span>
              <span className="text-rose-400 font-bold">150% (Colapso Total)</span>
            </div>
          </div>
        </div>

        {/* PANEL DE DIAGNÓSTICO, FÍSICA Y REMEDIOS DE DISEÑO */}
        <div className="lg:col-span-6 space-y-3">
          {/* Tarjeta de Título y Clasificación */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 block font-mono">DIAGNÓSTICO DEL MODO DE FALLA</span>
              <span className="text-[10px] text-cyan-400 font-mono">{activeScenario.codeReference}</span>
            </div>
            <h4 className="text-sm font-bold text-white leading-snug">
              {activeScenario.title}
            </h4>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {activeScenario.description}
            </p>
          </div>

          {/* Telemetría de Tensiones y Deformaciones Teóricas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Deformación Hormigón εc</span>
              <span className={`text-sm font-bold ${Number(eps_c) >= 0.003 ? 'text-rose-400' : 'text-slate-100'}`}>
                {eps_c} {Number(eps_c) >= 0.003 ? '(APLASTAMIENTO εcu)' : ''}
              </span>
              <span className="text-[10px] text-slate-500 block">Límite norma: 0.0030</span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Deformación Acero εs</span>
              <span className={`text-sm font-bold ${Number(eps_s) >= 0.002 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {eps_s} {Number(eps_s) >= 0.002 ? '(FLUENCIA εy)' : '(ELÁSTICO)'}
              </span>
              <span className="text-[10px] text-slate-500 block">fy / Es = 0.0021</span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 col-span-2">
              <span className="text-[10px] text-slate-400 block">Ecuación Normativa de Control:</span>
              <span className="text-cyan-300 font-bold text-xs">{activeScenario.governingEquation}</span>
              <span className="text-[10px] text-slate-400 block font-sans mt-0.5">{activeScenario.physicalCause}</span>
            </div>
          </div>

          {/* Medidas Preventivas para Evitar este Colapso */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <span className="text-emerald-400 font-bold">🛡️</span>
              <h5 className="text-xs font-bold text-slate-100">
                ¿Cómo Evitar Esta Falla en el Diseño Real?
              </h5>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
              {activeScenario.preventionAdvice.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
};
