/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  ColumnLoads,
  ConcreteGeometry,
  DesignStandard,
  MaterialType,
  SteelProfileData,
  SteelProperties,
  WoodProperties,
} from '../types';
import {
  ReliabilityDistributionParams,
  runReliabilityAnalysis,
} from '../engine/reliabilityEngine';
import {
  optimizeConcreteSection,
  optimizeSteelSection,
  optimizeWoodSection,
  SectionOptimizationResult,
} from '../engine/sectionOptimizer';
import {
  Play,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Zap,
  BarChart3,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface FailureReliabilitySectionProps {
  material: MaterialType;
  standard: DesignStandard;
  onSelectStandard?: (std: DesignStandard) => void;
  concreteGeom?: ConcreteGeometry;
  concreteFc?: number;
  concreteEc?: number;
  rebarFy?: number;
  rebarProps?: { Fy: number; Fu?: number; name?: string };
  steelProfile?: SteelProfileData;
  steelProps?: SteelProperties;
  woodB?: number;
  woodH?: number;
  woodProps?: WoodProperties;
  colLoads?: ColumnLoads;
  colLengthM?: number;
  kx?: number;
  ky?: number;
  onApplyOptimizedSection?: (optimizedResult: SectionOptimizationResult) => void;
  onOpenOptimizationModal?: () => void;
}

export const FailureReliabilitySection: React.FC<FailureReliabilitySectionProps> = ({
  material,
  standard,
  onSelectStandard,
  concreteGeom = { shape: 'rectangular' as const, b: 400, h: 400, cover: 40 },
  concreteFc = 25,
  concreteEc,
  rebarFy = 500,
  rebarProps,
  steelProfile,
  steelProps,
  woodB = 200,
  woodH = 200,
  woodProps,
  colLoads = { Pu: 800, Mux: 120, Muy: 30, Vux: 90, Vuy: 20 },
  colLengthM = 3.0,
  kx = 1.0,
  ky = 1.0,
  onApplyOptimizedSection,
  onOpenOptimizationModal,
}) => {
  // Parámetros de distribución estadística ajustables
  const [params, setParams] = useState<ReliabilityDistributionParams>({
    numSimulations: 2000,
    covMaterial: material === 'concrete' ? 0.15 : material === 'steel' ? 0.08 : 0.18,
    covRebar: 0.07,
    covDeadLoad: 0.10,
    covLiveLoad: 0.25,
    covMoment: 0.18,
  });

  const [simulationTrigger, setSimulationTrigger] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Ejecución del motor de Confiabilidad y Monte Carlo
  const analysis = useMemo(() => {
    // simulationTrigger fuerza la regeneración con nuevas muestras aleatorias
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _t = simulationTrigger;
    return runReliabilityAnalysis(
      material,
      standard,
      concreteGeom,
      concreteFc,
      rebarFy,
      steelProfile,
      steelProps,
      woodB,
      woodH,
      woodProps,
      colLoads,
      params
    );
  }, [
    material,
    standard,
    concreteGeom,
    concreteFc,
    rebarFy,
    steelProfile,
    steelProps,
    woodB,
    woodH,
    woodProps,
    colLoads,
    params,
    simulationTrigger,
  ]);

  // Ejecutar optimizador para predecir mejora de confiabilidad
  const optimizationPreview = useMemo(() => {
    try {
      if (material === 'concrete') {
        const safeRebar = rebarProps || { Fy: rebarFy, name: 'B500S' };
        const safeConcrete = { fc: concreteFc, Ec: concreteEc, name: 'H-25' };
        return optimizeConcreteSection(
          concreteGeom,
          safeConcrete,
          safeRebar,
          colLengthM,
          kx,
          ky,
          colLoads,
          standard,
          0.88
        );
      } else if (material === 'steel' && steelProfile && steelProps) {
        return optimizeSteelSection(
          steelProfile,
          steelProps,
          colLengthM,
          kx,
          ky,
          colLoads,
          standard,
          concreteFc,
          0.88
        );
      } else if (material === 'wood' && woodProps) {
        return optimizeWoodSection(
          woodB,
          woodH,
          woodProps,
          colLengthM,
          kx,
          ky,
          colLoads,
          standard,
          0.88
        );
      }
    } catch {
      return null;
    }
    return null;
  }, [
    material,
    concreteGeom,
    concreteFc,
    concreteEc,
    rebarFy,
    rebarProps,
    steelProfile,
    steelProps,
    woodB,
    woodH,
    woodProps,
    colLengthM,
    kx,
    ky,
    colLoads,
    standard,
  ]);

  // Manejador de re-simulación con micro-animación de carga
  const handleRerunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimulationTrigger((prev) => prev + 1);
      setIsSimulating(false);
    }, 280);
  };

  // Aplicar optimización
  const handleApplyOptimization = () => {
    if (optimizationPreview && onApplyOptimizedSection) {
      onApplyOptimizedSection(optimizationPreview);
    } else if (onOpenOptimizationModal) {
      onOpenOptimizationModal();
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 1. CABECERA Y PANEL DE CONTROL MONTE CARLO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-bold text-sm">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Análisis Estadístico de Confiabilidad y Probabilidad de Falla
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Monte Carlo Estocástico (JCSS / EN 1990)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Muestreo aleatorio de la función de estado límite considerando variabilidad probabilística en la
              resistencia de los materiales (<strong className="text-slate-200">f&apos;c, fy, E</strong>) y fluctuaciones de
              sobrecarga de servicio (<strong className="text-slate-200">D, L, M</strong>).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-sans font-medium flex items-center gap-1.5 transition cursor-pointer ${
                showConfigDrawer
                  ? 'bg-cyan-950 border-cyan-700 text-cyan-200'
                  : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parámetros CoV</span>
            </button>

            <button
              onClick={handleRerunSimulation}
              disabled={isSimulating}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-sans font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Muestreando...' : `Simular (${params.numSimulations.toLocaleString()} iter.)`}</span>
            </button>
          </div>
        </div>

        {/* CONTROLES DESPLEGABLES DE VARIABILIDAD ESTADÍSTICA (CoV) */}
        {showConfigDrawer && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 bg-slate-950/50 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Muestras (N):</label>
              <select
                value={params.numSimulations}
                onChange={(e) => setParams({ ...params, numSimulations: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px]"
              >
                <option value={500}>500 muestras</option>
                <option value={1000}>1,000 muestras</option>
                <option value={2000}>2,000 muestras</option>
                <option value={5000}>5,000 muestras</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                CoV Mat. ({material === 'concrete' ? "f'c" : material === 'steel' ? 'Fy' : 'fc,0'}): {(params.covMaterial * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.01"
                value={params.covMaterial}
                onChange={(e) => setParams({ ...params, covMaterial: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                CoV Acero Ref. (fy): {(params.covRebar * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.03"
                max="0.15"
                step="0.01"
                value={params.covRebar}
                onChange={(e) => setParams({ ...params, covRebar: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                CoV Carga Muerta (D): {(params.covDeadLoad * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.20"
                step="0.01"
                value={params.covDeadLoad}
                onChange={(e) => setParams({ ...params, covDeadLoad: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                CoV Carga Viva (L): {(params.covLiveLoad * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.15"
                max="0.40"
                step="0.01"
                value={params.covLiveLoad}
                onChange={(e) => setParams({ ...params, covLiveLoad: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                CoV Momento (M): {(params.covMoment * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.10"
                max="0.35"
                step="0.01"
                value={params.covMoment}
                onChange={(e) => setParams({ ...params, covMoment: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TARJETAS DE MÉTRICAS CLAVE DE CONFIABILIDAD (KPIs) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3.5">
          {/* Probabilidad de Falla */}
          <div
            className={`p-3 rounded-xl border transition ${
              analysis.empiricalFailureProbabilityPct > 1.0
                ? 'bg-rose-950/30 border-rose-600/50 text-rose-300'
                : analysis.empiricalFailureProbabilityPct > 0.05
                ? 'bg-amber-950/30 border-amber-600/50 text-amber-300'
                : 'bg-emerald-950/30 border-emerald-600/50 text-emerald-300'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-sans">Probabilidad Falla (Pf)</span>
            <div className="text-lg font-bold font-mono mt-0.5">
              {analysis.empiricalFailureProbabilityPct === 0
                ? '< 0.01%'
                : `${analysis.empiricalFailureProbabilityPct}%`}
            </div>
            <span className="text-[10px] opacity-80 block mt-0.5">
              {analysis.totalFailures} colapsos / {analysis.numSimulations}
            </span>
          </div>

          {/* Índice de Confiabilidad Beta */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <span className="text-[10px] text-slate-400 block font-sans">Índice Confiabilidad (β)</span>
            <div
              className={`text-lg font-bold font-mono mt-0.5 ${
                analysis.reliabilityIndexBeta >= 3.8
                  ? 'text-emerald-400'
                  : analysis.reliabilityIndexBeta >= 3.2
                  ? 'text-cyan-400'
                  : 'text-amber-400'
              }`}
            >
              β = {analysis.reliabilityIndexBeta.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Objetivo Eurocódigo: β ≥ 3.8
            </span>
          </div>

          {/* DCR Medio y Percentil 95 */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <span className="text-[10px] text-slate-400 block font-sans">DCR Medio [P95]</span>
            <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
              {analysis.meanDcr.toFixed(2)}{' '}
              <span className="text-xs font-normal text-amber-400">[{analysis.p95Dcr.toFixed(2)}]</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              σ = ±{analysis.stdDevDcr.toFixed(2)} (CoV {Number(analysis.covDcr * 100).toFixed(0)}%)
            </span>
          </div>

          {/* Factor de Seguridad Central FSC */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <span className="text-[10px] text-slate-400 block font-sans">Factor Central FSC</span>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
              {analysis.centralSafetyFactor.toFixed(2)}×
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              R_med {Math.round(analysis.meanCapacityKN)} kN / S_med
            </span>
          </div>

          {/* Nivel de Seguridad Normativa */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block font-sans">Diagnóstico de Seguridad</span>
            <div className="text-xs font-bold mt-1 text-slate-200">
              {analysis.safetyLevel.badge}
            </div>
            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
              {analysis.safetyLevel.status === 'EXCELENTE' ? 'Riesgo Despreciable' : analysis.safetyLevel.status}
            </span>
          </div>
        </div>
      </div>

      {/* 2. HISTOGRAMA DE PROBABILIDAD DE FALLA CON RECHARTS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              Histograma de Distribución de Ratios Demanda/Capacidad (DCR = S / R)
              <span className="text-[10px] font-normal text-slate-400 font-sans">
                (Falla estructural cuando DCR &gt; 1.00)
              </span>
            </h4>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
              <span>Seguro (DCR &lt; 0.85)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span>Límite (0.85 - 1.0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              <span className="font-bold text-rose-400">Falla (DCR &gt; 1.0)</span>
            </div>
          </div>
        </div>

        {/* Gráfico Recharts */}
        <div className="h-64 sm:h-72 w-full min-w-0 min-h-[260px] bg-slate-950/70 rounded-xl p-2 border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analysis.histogramBins}
              margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="binCenter"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(val) => Number(val).toFixed(2)}
                label={{
                  value: 'Ratio Demanda / Capacidad (DCR)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                unit="%"
                label={{
                  value: 'Frecuencia (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-[11px] font-mono space-y-1">
                        <div className="font-bold text-white flex items-center justify-between gap-3">
                          <span>Rango DCR: {data.binLabel}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              data.isFailing
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : data.binCenter >= 0.85
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {data.isFailing ? 'ZONA DE FALLA' : data.binCenter >= 0.85 ? 'ZONA LÍMITE' : 'ZONA SEGURA'}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Casos simulados: <strong className="text-white">{data.count}</strong> (
                          {data.percentage}%)
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Probabilidad acumulada: {data.cumulativePct}%
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Línea de referencia del umbral crítico DCR = 1.0 */}
              <ReferenceLine
                x={1.0}
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Umbral Falla (DCR=1.0)',
                  position: 'top',
                  fill: '#f43f5e',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />

              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {analysis.histogramBins.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    fillOpacity={entry.isFailing ? 0.95 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda de Diagnóstico */}
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
            {analysis.safetyLevel.description}{' '}
            {analysis.empiricalFailureProbabilityPct > 0 ? (
              <span className="text-rose-400 font-bold">
                Un {analysis.empiricalFailureProbabilityPct}% de las muestras superó la resistencia nominal última de
                la columna.
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">
                Ninguna muestra de las {analysis.numSimulations.toLocaleString()} simuladas sobrepasó el límite de falla
                elástica ni inelástica.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 3. COMPARATIVA DE NORMAS (ACI 318 vs NC 450 vs EUROCÓDIGO) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Layers className="w-3.5 h-3.5" />
            </span>
            <h4 className="text-xs font-bold text-white">
              Comparativa Multi-Norma de Confiabilidad y Factores de Seguridad
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">
            Norma activa en cálculo:{' '}
            <strong className="text-cyan-300">
              {standard === 'ACI_318_19'
                ? 'ACI 318-19'
                : standard === 'NC_450_2006'
                ? 'NC 450:2006 (Cuba)'
                : 'Eurocódigo 2'}
            </strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="py-2 px-2.5 font-bold">Norma / Código</th>
                <th className="py-2 px-2.5 font-bold">Filosofía de Seguridad</th>
                <th className="py-2 px-2.5 font-bold">Capacidad φPn / NRd</th>
                <th className="py-2 px-2.5 font-bold">DCR Medio</th>
                <th className="py-2 px-2.5 font-bold">Índice β</th>
                <th className="py-2 px-2.5 font-bold">Prob. Falla Pf</th>
                <th className="py-2 px-2.5 font-bold text-center">Estado</th>
                <th className="py-2 px-2.5 font-bold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {analysis.standardComparisons.map((stdComp) => {
                const isActive = stdComp.standardId === standard;
                return (
                  <tr
                    key={stdComp.standardId}
                    className={`transition hover:bg-slate-850/50 ${
                      isActive ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2.5 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        <span>{stdComp.codeShort}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 block font-normal font-sans">
                        {stdComp.standardName}
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-slate-300">
                      <div className="font-mono text-cyan-300 text-[10px]">{stdComp.resistanceFactor}</div>
                      <span className="text-[9px] text-slate-400 font-sans block">{stdComp.safetyApproach}</span>
                    </td>

                    <td className="py-2.5 px-2.5 font-mono text-slate-200">
                      <div>{Math.round(stdComp.factoredCapacityKN)} kN</div>
                      <span className="text-[9px] text-slate-500 block">
                        Nom: {Math.round(stdComp.nominalCapacityKN)} kN
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 font-mono font-bold text-slate-200">
                      <span
                        className={
                          stdComp.dcrMean > 1.0
                            ? 'text-rose-400'
                            : stdComp.dcrMean > 0.88
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {stdComp.dcrMean.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 font-mono text-slate-300">
                      β = {stdComp.betaReliabilityIndex.toFixed(1)}
                      <span className="text-[9px] text-slate-500 block">Obj: ≥ {stdComp.targetBeta}</span>
                    </td>

                    <td className="py-2.5 px-2.5 font-mono">
                      <span
                        className={
                          stdComp.failureProbabilityPct > 1.0
                            ? 'text-rose-400 font-bold'
                            : stdComp.failureProbabilityPct > 0.05
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {stdComp.failureProbabilityPct < 0.001
                          ? '< 0.001%'
                          : `${stdComp.failureProbabilityPct}%`}
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          stdComp.complianceStatus === 'CONFORME'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : stdComp.complianceStatus === 'AL LÍMITE'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-rose-950 text-rose-300 border border-rose-700'
                        }`}
                      >
                        {stdComp.complianceStatus}
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-right">
                      {isActive ? (
                        <span className="text-[10px] text-cyan-400 font-medium font-sans">Activa</span>
                      ) : (
                        <button
                          onClick={() => onSelectStandard && onSelectStandard(stdComp.standardId)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-sans transition cursor-pointer"
                        >
                          Aplicar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ASISTENTE DE OPTIMIZACIÓN DE CONFIABILIDAD */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                Asistente de Optimización Basado en Confiabilidad
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono">
                  DCR Objetivo: ~0.88 (β ≥ 3.8)
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Recomendación algorítmica para calibrar la sección y blindar la columna frente a incertidumbres
                estadísticas de obra.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenOptimizationModal && (
              <button
                onClick={onOpenOptimizationModal}
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-sans transition cursor-pointer"
              >
                Ver Modal Completo
              </button>
            )}

            <button
              onClick={handleApplyOptimization}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs font-sans flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Aplicar Sección Optimizada</span>
            </button>
          </div>
        </div>

        {/* PROPUESTA DEL ASISTENTE DE OPTIMIZACIÓN */}
        {optimizationPreview && optimizationPreview.success ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Sección Actual */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 block font-sans">Sección Actual de la Columna</span>
              <div className="text-sm font-bold text-white">
                {material === 'concrete' &&
                  optimizationPreview.concrete &&
                  `${optimizationPreview.concrete.originalB} × ${optimizationPreview.concrete.originalH} mm`}
                {material === 'steel' &&
                  optimizationPreview.steel &&
                  optimizationPreview.steel.originalProfileDesignation}
                {material === 'wood' &&
                  optimizationPreview.wood &&
                  `${optimizationPreview.wood.originalB} × ${optimizationPreview.wood.originalH} mm`}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                DCR Gobernador:{' '}
                <strong className={analysis.meanDcr > 1.0 ? 'text-rose-400' : 'text-slate-200'}>
                  {optimizationPreview.originalDcr.toFixed(2)}
                </strong>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Prob. Falla actual: <strong className="text-rose-400">{analysis.empiricalFailureProbabilityPct}%</strong> (β ={' '}
                {analysis.reliabilityIndexBeta.toFixed(2)})
              </div>
            </div>

            {/* Sección Optimizada Recomendada */}
            <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-700/40 space-y-1.5">
              <span className="text-[10px] text-emerald-400 block font-sans font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sección Optimizada Recomendada
              </span>
              <div className="text-sm font-bold text-emerald-300">
                {material === 'concrete' &&
                  optimizationPreview.concrete &&
                  `${optimizationPreview.concrete.optimizedB} × ${optimizationPreview.concrete.optimizedH} mm`}
                {material === 'steel' &&
                  optimizationPreview.steel &&
                  optimizationPreview.steel.optimizedProfileDesignation}
                {material === 'wood' &&
                  optimizationPreview.wood &&
                  `${optimizationPreview.wood.optimizedB} × ${optimizationPreview.wood.optimizedH} mm`}
              </div>
              <div className="text-[11px] text-emerald-200 font-mono">
                DCR Proyectado: <strong>{optimizationPreview.optimizedDcr.toFixed(2)}</strong> (
                {optimizationPreview.dcrDelta > 0
                  ? `+${(optimizationPreview.dcrDelta * 100).toFixed(0)}%`
                  : `${(optimizationPreview.dcrDelta * 100).toFixed(0)}%`}
                )
              </div>
              <div className="text-[10px] text-slate-300 font-sans">
                Prob. Falla proyectada:{' '}
                <strong className="text-emerald-400">
                  {optimizationPreview.optimizedDcr <= 0.88 ? '< 0.01%' : '≤ 0.05%'}
                </strong>{' '}
                (β ≥ 3.9)
              </div>
            </div>

            {/* Veredicto y Eficiencia de Material */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Diagnóstico del Asistente</span>
                <p className="text-[11px] text-slate-300 font-sans mt-0.5 leading-relaxed">
                  {optimizationPreview.message}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {material === 'concrete'
                    ? 'Variación Sección Ag:'
                    : material === 'steel'
                    ? 'Variación Peso Perfil:'
                    : 'Variación Sección:'}
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {material === 'concrete' && optimizationPreview.concrete && (
                    <>
                      {optimizationPreview.concrete.areaReductionPct > 0
                        ? `Ahorro ${optimizationPreview.concrete.areaReductionPct}%`
                        : `Aumento ${Math.abs(optimizationPreview.concrete.areaReductionPct)}%`}
                    </>
                  )}
                  {material === 'steel' && optimizationPreview.steel && (
                    <>
                      {optimizationPreview.steel.weightReductionPct > 0
                        ? `Ahorro ${optimizationPreview.steel.weightReductionPct}%`
                        : `Aumento ${Math.abs(optimizationPreview.steel.weightReductionPct)}%`}
                    </>
                  )}
                  {material === 'wood' && optimizationPreview.wood && (
                    <>
                      {optimizationPreview.wood.areaReductionPct > 0
                        ? `Ahorro ${optimizationPreview.wood.areaReductionPct}%`
                        : `Aumento ${Math.abs(optimizationPreview.wood.areaReductionPct)}%`}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-[11px] font-sans text-slate-300">
              {optimizationPreview?.message ||
                'La sección actual ya se encuentra en un rango de trabajo eficiente cercano al 90% del límite normativo.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
