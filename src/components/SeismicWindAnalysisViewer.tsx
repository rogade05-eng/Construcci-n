/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  SeismicParameters,
  WindParameters,
  SeismicWindVerificationResult,
  SEISMIC_ZONES_CUBA,
  SOIL_PROPERTIES,
  WIND_ZONES_CUBA,
  SeismicZoneCuba,
  SoilType,
  ImportanceCategory,
  WindZoneCuba,
  TerrainCategory,
  DuctilityLevel,
} from '../engine/seismicWindEngine';
import {
  DesignStandard,
  MaterialType,
  ConcreteGeometry,
  ConcreteTieDesign,
  ConcreteProperties,
  SteelProperties,
  SteelProfileData,
  ColumnLoads,
} from '../types';
import {
  generateSeismicWindSolutions,
  SeismicWindSolutionOption,
} from '../engine/seismicWindSolver';
import { SeismicWindSolutionsModal } from './SeismicWindSolutionsModal';

interface SeismicWindAnalysisViewerProps {
  material: MaterialType;
  standard: DesignStandard;
  colLengthM: number;
  seismicParams: SeismicParameters;
  onUpdateSeismicParams: (params: SeismicParameters) => void;
  windParams: WindParameters;
  onUpdateWindParams: (params: WindParameters) => void;
  verificationResult: SeismicWindVerificationResult;
  // Parámetros y callbacks para auto-solución y rediseño:
  concreteGeom?: ConcreteGeometry;
  onUpdateConcreteGeom?: (geom: ConcreteGeometry) => void;
  tieDesign?: ConcreteTieDesign;
  onUpdateTieDesign?: (tie: ConcreteTieDesign) => void;
  concreteProps?: ConcreteProperties;
  onUpdateConcreteMatKey?: (matKey: string) => void;
  steelProfile?: SteelProfileData;
  onUpdateSteelProfile?: (profileId: string) => void;
  steelProps?: SteelProperties;
  woodB?: number;
  woodH?: number;
  onUpdateWoodDimensions?: (b: number, h: number) => void;
  loads?: ColumnLoads;
}

export function SeismicWindAnalysisViewer({
  material,
  standard,
  colLengthM,
  seismicParams,
  onUpdateSeismicParams,
  windParams,
  onUpdateWindParams,
  verificationResult,
  concreteGeom,
  onUpdateConcreteGeom,
  tieDesign,
  onUpdateTieDesign,
  concreteProps,
  onUpdateConcreteMatKey,
  steelProfile,
  onUpdateSteelProfile,
  steelProps,
  woodB,
  woodH,
  onUpdateWoodDimensions,
  loads,
}: SeismicWindAnalysisViewerProps) {
  const [showSolutionsModal, setShowSolutionsModal] = useState(false);
  const [showInlineSolutions, setShowInlineSolutions] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const {
    periodT1,
    Sa_T1,
    Cs,
    seismicShearVe,
    seismicMomentMe,
    q10,
    qz,
    windForceFw,
    windMomentMw,
    windUpliftKN,
    spectrumPoints,
    combinations,
    governingCombination,
    checks,
    recommendations,
  } = verificationResult;

  // Diagnóstico inteligente y generación de soluciones para cumplimiento
  const diagnostics = useMemo(() => {
    return generateSeismicWindSolutions({
      material,
      standard,
      colLengthM,
      loads: loads || { Pu: 500, Mux: 50, Muy: 20, Vux: 60, Vuy: 25 },
      seismicParams,
      windParams,
      verificationResult,
      concreteGeom: concreteGeom || { shape: 'rectangular', b: 400, h: 500, cover: 30 },
      tieDesign: tieDesign || {
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
      },
      concreteProps: concreteProps || {
        fc: 25,
        fy: 420,
        aggregateSize: 19,
        cover: 30,
        density: 2400,
      },
      steelProfile: steelProfile || {
        id: 'W12x65',
        type: 'W_SHAPE',
        designation: 'W12x65',
        d: 307,
        b: 305,
        tf: 15.4,
        tw: 9.9,
        A: 123,
        Ix: 22100,
        Iy: 7240,
        rx: 13.4,
        ry: 7.7,
        Zx: 1570,
        Zy: 719,
      },
      steelProps: steelProps || { Fy: 345, Fu: 450, E: 200000 },
      woodB: woodB || 200,
      woodH: woodH || 200,
    });
  }, [
    material,
    standard,
    colLengthM,
    loads,
    seismicParams,
    windParams,
    verificationResult,
    concreteGeom,
    tieDesign,
    concreteProps,
    steelProfile,
    steelProps,
    woodB,
    woodH,
  ]);

  const recommendedSolution =
    diagnostics.solutions.find((s) => s.isRecommended) || diagnostics.solutions[0];

  const handleApplySolution = (solution: SeismicWindSolutionOption) => {
    if (solution.changes.concreteGeom && onUpdateConcreteGeom && concreteGeom) {
      onUpdateConcreteGeom({
        ...concreteGeom,
        ...solution.changes.concreteGeom,
      });
    }
    if (solution.changes.tieDesign && onUpdateTieDesign && tieDesign) {
      onUpdateTieDesign({
        ...tieDesign,
        ...solution.changes.tieDesign,
      });
    }
    if (solution.changes.concreteMatKey && onUpdateConcreteMatKey) {
      onUpdateConcreteMatKey(solution.changes.concreteMatKey);
    }
    if (solution.changes.steelProfileId && onUpdateSteelProfile) {
      onUpdateSteelProfile(solution.changes.steelProfileId);
    }
    if ((solution.changes.woodB || solution.changes.woodH) && onUpdateWoodDimensions) {
      onUpdateWoodDimensions(
        solution.changes.woodB || woodB || 200,
        solution.changes.woodH || woodH || 200
      );
    }
    if (solution.changes.seismicParams && onUpdateSeismicParams) {
      onUpdateSeismicParams({
        ...seismicParams,
        ...solution.changes.seismicParams,
      });
    }
    setSuccessToast(`¡Solución aplicada con éxito! Parámetros actualizados según ${solution.title}.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Generación de coordenadas SVG para el espectro de respuesta
  const svgWidth = 600;
  const svgHeight = 260;
  const padLeft = 55;
  const padBottom = 40;
  const padTop = 20;
  const padRight = 25;

  const maxT = 4.0;
  const maxSa = Math.max(1.2, ...spectrumPoints.map((p) => p.Sa_elastic * 1.15));

  const scaleX = (t: number) => padLeft + (t / maxT) * (svgWidth - padLeft - padRight);
  const scaleY = (sa: number) => svgHeight - padBottom - (sa / maxSa) * (svgHeight - padTop - padBottom);

  // Path elástico
  const elasticPath = spectrumPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(p.T).toFixed(1)} ${scaleY(p.Sa_elastic).toFixed(1)}`)
    .join(' ');

  // Path de diseño
  const designPath = spectrumPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(p.T).toFixed(1)} ${scaleY(p.Sa_design).toFixed(1)}`)
    .join(' ');

  // Punto de operación de la columna
  const colX = scaleX(Math.min(periodT1, maxT));
  const colY = scaleY(Sa_T1);

  const isCalculationSafe = verificationResult.isSafe && !diagnostics.hasFailure;

  return (
    <div className="space-y-4 font-sans text-slate-200 animate-fade-in">
      {/* TOAST DE ÉXITO */}
      {successToast && (
        <div className="bg-emerald-950/95 border-2 border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-mono font-bold animate-bounce-subtle">
          <div className="flex items-center gap-2">
            <span className="text-base">🎉</span>
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-100 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BANNER PRINCIPAL DE ESTADO Y SOLUCIÓN AL "NO CUMPLE" */}
      {/* ========================================================================= */}
      {!isCalculationSafe ? (
        <div className="bg-gradient-to-br from-rose-950/90 via-slate-900 to-rose-950/70 border-2 border-rose-600/90 rounded-2xl p-4 shadow-2xl space-y-3 font-mono">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-rose-900/60 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-900/80 border border-rose-500 flex items-center justify-center text-xl shrink-0 shadow-lg animate-pulse">
                ⚠️
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-rose-100 tracking-wide">
                    NO CUMPLE EL CÁLCULO SISMO & VIENTO
                  </h3>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black shadow">
                    DCR GOBERNANTE = {(governingCombination.dcr * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300">
                    {diagnostics.criticalIssues.length} {diagnostics.criticalIssues.length === 1 ? 'falla crítica' : 'fallas críticas'}
                  </span>
                </div>
                <p className="text-[11px] text-rose-300/90 mt-1 leading-relaxed">
                  {governingCombination.name}: solicitaciones laterales de sismo/huracán exceden la capacidad nominal de la columna o violan requisitos de confinamiento y ductilidad (ACI 318 Cap. 18 / NC 46).
                </p>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN RÁPIDA */}
            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
              {recommendedSolution && (
                <button
                  onClick={() => handleApplySolution(recommendedSolution)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition cursor-pointer"
                  title={recommendedSolution.summary}
                >
                  <span className="text-sm">⚡</span>
                  <span>SOLUCIONAR AUTOMÁTICAMENTE (1 CLIC)</span>
                </button>
              )}
              <button
                onClick={() => setShowSolutionsModal(true)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔍</span>
                <span>Ver Opciones de Solución</span>
              </button>
            </div>
          </div>

          {/* LISTA RÁPIDA DE CAUSAS Y SOLUCIONES PROPUESTAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            {diagnostics.solutions.map((sol) => (
              <div
                key={sol.id}
                className={`p-3 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                  sol.isRecommended
                    ? 'bg-emerald-950/20 border-emerald-600/70 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-100 text-[11px] flex items-center gap-1">
                      {sol.isRecommended && <span className="text-amber-400">★</span>}
                      {sol.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                        sol.badgeVariant === 'emerald'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}
                    >
                      {sol.badgeText}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      DCR: <strong className="text-emerald-400">{(sol.expectedDcr * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1.5 leading-snug line-clamp-2">
                    {sol.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400">{sol.normativeCode}</span>
                  <button
                    onClick={() => handleApplySolution(sol)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-black rounded-lg shadow transition active:scale-95 cursor-pointer"
                  >
                    ✓ Aplicar Esta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* BANNER POSITIVO CUANDO CUMPLE */
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-700/60 rounded-2xl p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-600 flex items-center justify-center text-emerald-300 text-sm font-bold">
              ✓
            </span>
            <div>
              <span className="font-bold text-emerald-300 block text-xs">
                LA COLUMNA CUMPLE CON EL ANÁLISIS SÍSMICO Y EÓLICO (DCR = {(governingCombination.dcr * 100).toFixed(1)}%)
              </span>
              <span className="text-[10px] text-slate-400">
                Gobernante: {governingCombination.name} · Sin fallas críticas en cortante ni confinamiento.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowSolutionsModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-slate-100 text-[11px] font-semibold transition cursor-pointer"
          >
            🛠️ Opciones de Optimización y Rediseño
          </button>
        </div>
      )}
      {/* TARJETA SUPERIOR: PARÁMETROS INTERACTIVOS SÍSMICOS Y DE VIENTO */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-4 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              Verificación Sismorresistente y Eólica (Normas Cubanas · ACI 318 · Eurocódigo)
            </h3>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-semibold">
            NC 46:2017 & NC 285:2003
          </span>
        </div>

        {/* CONTROLES DE ENTRADA EN DOS COLUMNAS: SISMO Y VIENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PANEL SISMO */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-amber-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>⚡</span> Parámetros Sísmicos (NC 46:2017)
              </span>
              <span className="text-[10px] text-slate-400">ag = {SEISMIC_ZONES_CUBA[seismicParams.zone].ag}g</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Zona Sísmica (Cuba):</label>
                <select
                  value={seismicParams.zone}
                  onChange={(e) =>
                    onUpdateSeismicParams({ ...seismicParams, zone: e.target.value as SeismicZoneCuba })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                >
                  {Object.entries(SEISMIC_ZONES_CUBA).map(([key, z]) => (
                    <option key={key} value={key}>
                      {z.name} (ag={z.ag}g)
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                  {SEISMIC_ZONES_CUBA[seismicParams.zone].description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Perfil de Suelo:</label>
                  <select
                    value={seismicParams.soil}
                    onChange={(e) =>
                      onUpdateSeismicParams({ ...seismicParams, soil: e.target.value as SoilType })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    {Object.entries(SOIL_PROPERTIES).map(([key, s]) => (
                      <option key={key} value={key}>
                        {s.name} (S={s.S})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Importancia / Uso:</label>
                  <select
                    value={seismicParams.importance}
                    onChange={(e) =>
                      onUpdateSeismicParams({
                        ...seismicParams,
                        importance: e.target.value as ImportanceCategory,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ESENCIAL">Esencial (Hospitales) [I=1.5]</option>
                    <option value="IMPORTANTE">Importante (Escuelas) [I=1.25]</option>
                    <option value="ORDINARIO">Ordinario (Vivienda/Oficina) [I=1.0]</option>
                    <option value="MENOR">Menor (Almacén) [I=0.8]</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Ductilidad:</label>
                  <select
                    value={seismicParams.ductility}
                    onChange={(e) =>
                      onUpdateSeismicParams({
                        ...seismicParams,
                        ductility: e.target.value as DuctilityLevel,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ALTA">Alta (Pórtico Especial SMF)</option>
                    <option value="MEDIA">Media (Pórtico Intermedio IMF)</option>
                    <option value="BAJA">Baja (Pórtico Ordinario OMF)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Peso Trib. W (kN):</label>
                  <input
                    type="number"
                    step="50"
                    min="100"
                    value={seismicParams.tributaryWeightKN}
                    onChange={(e) =>
                      onUpdateSeismicParams({
                        ...seismicParams,
                        tributaryWeightKN: parseFloat(e.target.value) || 800,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PANEL VIENTO */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-cyan-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>🌪️</span> Parámetros de Viento y Huracán (NC 285:2003)
              </span>
              <span className="text-[10px] text-slate-400">V0 = {windParams.V0} m/s</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Región Eólica de Cuba:</label>
                <select
                  value={windParams.zone}
                  onChange={(e) => {
                    const z = e.target.value as WindZoneCuba;
                    onUpdateWindParams({
                      ...windParams,
                      zone: z,
                      V0: WIND_ZONES_CUBA[z].V0,
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                >
                  {Object.entries(WIND_ZONES_CUBA).map(([key, w]) => (
                    <option key={key} value={key}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                  {WIND_ZONES_CUBA[windParams.zone].description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tipo de Terreno:</label>
                  <select
                    value={windParams.terrain}
                    onChange={(e) =>
                      onUpdateWindParams({ ...windParams, terrain: e.target.value as TerrainCategory })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="TERRENO_A">Terreno A (Costa Abierta)</option>
                    <option value="TERRENO_B">Terreno B (Campo / Suburbano)</option>
                    <option value="TERRENO_C">Terreno C (Urbano Denso)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Ancho Trib. Fachada (m):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={windParams.tributaryWidthM}
                    onChange={(e) =>
                      onUpdateWindParams({
                        ...windParams,
                        tributaryWidthM: parseFloat(e.target.value) || 4.0,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Coef. Ráfaga (Cd):</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="1.8"
                    value={windParams.Cd}
                    onChange={(e) =>
                      onUpdateWindParams({ ...windParams, Cd: parseFloat(e.target.value) || 1.35 })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Coef. Presión Neta (Cp):</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.6"
                    value={windParams.Cp}
                    onChange={(e) =>
                      onUpdateWindParams({ ...windParams, Cp: parseFloat(e.target.value) || 1.3 })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILA DE RESULTADOS CLAVE: ESPECTRO DE RESPUESTA Y SOLICITACIONES LATERALES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* GRÁFICO DEL ESPECTRO DE RESPUESTA (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Espectro de Respuesta Sísmica Sa(T) vs Período T
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-1 bg-amber-400 inline-block rounded" /> Sa Elástico
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-1 bg-cyan-400 inline-block rounded" /> Sd Diseño (R={seismicParams.R || 6})
              </span>
            </div>
          </div>

          {/* SVG DEL ESPECTRO */}
          <div className="w-full overflow-x-auto bg-slate-950/80 rounded-xl border border-slate-800/80 p-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
              {/* Grid horizontal */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((val) => {
                if (val > maxSa) return null;
                const y = scaleY(val);
                return (
                  <g key={val}>
                    <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                    <text x={padLeft - 8} y={y + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                      {val.toFixed(1)}g
                    </text>
                  </g>
                );
              })}

              {/* Grid vertical */}
              {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].map((t) => {
                const x = scaleX(t);
                return (
                  <g key={t}>
                    <line x1={x} y1={padTop} x2={x} y2={svgHeight - padBottom} stroke="#1e293b" strokeDasharray="3 3" />
                    <text x={x} y={svgHeight - padBottom + 15} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      {t.toFixed(1)}s
                    </text>
                  </g>
                );
              })}

              {/* Ejes */}
              <line
                x1={padLeft}
                y1={svgHeight - padBottom}
                x2={svgWidth - padRight}
                y2={svgHeight - padBottom}
                stroke="#475569"
                strokeWidth="1.5"
              />
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={svgHeight - padBottom} stroke="#475569" strokeWidth="1.5" />

              {/* Etiquetas de Ejes */}
              <text x={svgWidth - padRight} y={svgHeight - padBottom + 28} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                Período T (segundos) →
              </text>
              <text x={padLeft} y={padTop - 6} fill="#94a3b8" fontSize="10" textAnchor="start" fontFamily="monospace">
                ↑ Aceleración Espectral Sa (g)
              </text>

              {/* Curva Elástica */}
              <path d={elasticPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

              {/* Curva Inelástica de Diseño */}
              <path d={designPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

              {/* Línea de Período de la Columna T1 */}
              <line
                x1={colX}
                y1={padTop}
                x2={colX}
                y2={svgHeight - padBottom}
                stroke="#e11d48"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Marcador Columna */}
              <circle cx={colX} cy={colY} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
              <text
                x={colX + 8}
                y={Math.max(padTop + 15, colY - 8)}
                fill="#f43f5e"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                T₁ = {periodT1}s (Sd = {Cs}g)
              </text>
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span>
              Período Fundamental Estimado: <strong className="text-rose-400">{periodT1} s</strong>
            </span>
            <span>
              Coef. Sísmico Diseño Cs: <strong className="text-cyan-400">{Cs}</strong>
            </span>
            <span>
              Acel. Terreno ag: <strong className="text-amber-400">{SEISMIC_ZONES_CUBA[seismicParams.zone].ag} g</strong>
            </span>
          </div>
        </div>

        {/* TARJETA DE DEMANDAS LATERALES Y EÓLICAS (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between space-y-3 font-mono text-xs">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Demandas Laterales Calculadas
          </div>

          {/* Bloque Sismo */}
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-1.5">
            <div className="text-amber-300 font-bold flex items-center justify-between">
              <span>⚡ Solicitación Sísmica Lateral</span>
              <span className="text-[10px] text-amber-400/80">W = {seismicParams.tributaryWeightKN} kN</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Cortante Sísmico Ve:</span>
                <strong className="text-amber-300 text-sm">{seismicShearVe} kN</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Momento Sísmico Me:</span>
                <strong className="text-amber-300 text-sm">{seismicMomentMe} kN·m</strong>
              </div>
            </div>
          </div>

          {/* Bloque Viento */}
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-1.5">
            <div className="text-cyan-300 font-bold flex items-center justify-between">
              <span>🌪️ Solicitación Eólica / Huracán</span>
              <span className="text-[10px] text-cyan-400/80">V0 = {windParams.V0} m/s</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block text-[9px]">Presión neta qz:</span>
                <strong className="text-cyan-300 text-xs">{qz} kPa</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Fuerza Fw:</span>
                <strong className="text-cyan-300 text-xs">{windForceFw} kN</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Momento Mw:</span>
                <strong className="text-cyan-300 text-xs">{windMomentMw} kN·m</strong>
              </div>
            </div>
            <div className="pt-1 border-t border-cyan-900/40 text-[10px] text-slate-300 flex justify-between">
              <span>Succión / Deslastre Vertical:</span>
              <strong className="text-rose-400">{windUpliftKN} kN</strong>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
            * Cargas laterales mayoradas y transferidas a la base de la columna para la longitud L = {colLengthM} m.
          </div>
        </div>
      </div>

      {/* MATRIZ DE LAS 5 COMBINACIONES DE CARGA ULS */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Evaluación de Combinaciones de Carga ULS (Sismo, Viento y Gravitatorias)
          </div>
          <span className="text-[11px] text-amber-400">
            Gobernante: <strong>{governingCombination.id}</strong> (DCR = {(governingCombination.dcr * 100).toFixed(1)}%)
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px]">
                <th className="p-2.5">Combinación</th>
                <th className="p-2.5">Fórmula Normativa</th>
                <th className="p-2.5">Pu (kN)</th>
                <th className="p-2.5">Mux (kN·m)</th>
                <th className="p-2.5">Vux (kN)</th>
                <th className="p-2.5">DCR</th>
                <th className="p-2.5">Estado</th>
                <th className="p-2.5">Criterio Crítico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {combinations.map((c) => {
                const isGov = c.id === governingCombination.id;
                return (
                  <tr
                    key={c.id}
                    className={`transition ${
                      isGov
                        ? 'bg-amber-950/30 font-semibold text-slate-100'
                        : 'hover:bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <td className="p-2.5 flex items-center gap-1.5">
                      {isGov && <span className="text-amber-400 font-bold">★</span>}
                      {c.name}
                    </td>
                    <td className="p-2.5 font-bold text-cyan-400">{c.codeFormula}</td>
                    <td className="p-2.5 text-amber-300">{c.Pu}</td>
                    <td className="p-2.5 text-cyan-300">{c.Mux}</td>
                    <td className="p-2.5 text-slate-200">{c.Vux}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.dcr <= 0.8
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : c.dcr <= 1.0
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                        }`}
                      >
                        {(c.dcr * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2.5">
                      {c.isSafe ? (
                        <span className="text-emerald-400 font-bold">✓ CUMPLE</span>
                      ) : (
                        <span className="text-rose-400 font-bold">✗ FALLA</span>
                      )}
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-400">{c.governingReason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPROBACIONES NORMATIVAS ESPECÍFICAS DE SEGURIDAD */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3 font-mono text-xs">
        <div className="font-semibold text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          Verificaciones Estructurales Sísmicas y de Huracán (Requisitos Normativos Detallados)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checks.map((ck) => {
            const isOk = ck.status === 'OK';
            const isWarn = ck.status === 'WARNING';
            return (
              <div
                key={ck.id}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                  isOk
                    ? 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                    : isWarn
                    ? 'bg-amber-950/20 border-amber-700/60'
                    : 'bg-rose-950/25 border-rose-700/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-100 text-xs">{ck.title}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                        isOk
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isWarn
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {isOk ? 'CUMPLE' : isWarn ? 'ADVERTENCIA' : 'NO CUMPLE'}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 block mt-0.5">{ck.standardRef}</span>
                </div>

                <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 text-[10px] space-y-1">
                  <div className="text-slate-300">
                    <span className="text-slate-500">Demanda: </span>
                    {ck.demand}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">Capacidad / Límite: </span>
                    {ck.capacity}
                  </div>
                  <div className="text-slate-400 pt-1 border-t border-slate-800/80 text-[10px] flex items-center justify-between gap-2">
                    <span className="flex-1">{ck.description}</span>
                    {!isOk && (
                      <button
                        onClick={() => setShowSolutionsModal(true)}
                        className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-[9px] font-bold shrink-0 transition cursor-pointer"
                      >
                        💡 Ver Solución
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECOMENDACIONES TÉCNICAS DE DISEÑO */}
      {recommendations.length > 0 && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3 font-mono text-xs">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Recomendaciones Técnicas de Diseño y Ejecución en Obra
          </div>

          <div className="space-y-2.5">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-start gap-3"
              >
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold mt-0.5 ${
                    rec.priority === 'ALTA'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : rec.priority === 'MEDIA'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}
                >
                  {rec.priority}
                </span>

                <div className="space-y-1 flex-1">
                  <div className="font-bold text-slate-100 text-xs">{rec.title}</div>
                  <p className="text-[11px] text-slate-300">{rec.message}</p>
                  <div className="text-[10px] text-cyan-300 font-semibold bg-slate-900/90 p-1.5 rounded border border-slate-800">
                    💡 Acción recomendada: {rec.actionItem}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE SOLUCIONES DE INCUMPLIMIENTO SISMO-VIENTO */}
      <SeismicWindSolutionsModal
        isOpen={showSolutionsModal}
        onClose={() => setShowSolutionsModal(false)}
        diagnostics={diagnostics}
        material={material}
        standard={standard}
        onApplySolution={handleApplySolution}
      />
    </div>
  );
}
