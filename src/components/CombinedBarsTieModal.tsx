/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ConcreteGeometry,
  ConcreteTieDesign,
  DesignStandard,
  RebarBar,
  TiePatternType,
} from '../types';
import {
  CombinedBarsTieVerificationResult,
  TieSolutionOption,
  verifyTiesForCombinedBars,
} from '../engine/combinedBarsTieEngine';

interface CombinedBarsTieModalProps {
  isOpen: boolean;
  onClose: () => void;
  geom: ConcreteGeometry;
  bars: RebarBar[];
  tieDesign: ConcreteTieDesign;
  onUpdateTieDesign: (updated: ConcreteTieDesign) => void;
  standard: DesignStandard;
  fc: number;
  fy: number;
  Pu_kN: number;
}

export const CombinedBarsTieModal: React.FC<CombinedBarsTieModalProps> = ({
  isOpen,
  onClose,
  geom,
  bars,
  tieDesign,
  onUpdateTieDesign,
  standard,
  fc,
  fy,
  Pu_kN,
}) => {
  const [activeTab, setActiveTab] = useState<'solutions' | 'checks' | 'customizer' | 'theory'>('solutions');
  const [appliedSolutionId, setAppliedSolutionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const result: CombinedBarsTieVerificationResult = verifyTiesForCombinedBars(
    geom,
    bars,
    tieDesign,
    standard,
    fc,
    fy,
    Pu_kN
  );

  const handleApplySolution = (sol: TieSolutionOption) => {
    const updated: ConcreteTieDesign = {
      ...tieDesign,
      ...sol.proposedTieDesign,
    };
    onUpdateTieDesign(updated);
    setAppliedSolutionId(sol.id);
    setTimeout(() => {
      setAppliedSolutionId(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-800/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        {/* HEADER MODAL */}
        <div className="p-4 md:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <span className="text-xl">🪝</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white font-mono tracking-tight">
                  Cercos y Estribos en Barras Combinadas
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    result.allChecksPassed
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-rose-950/80 text-rose-300 border-rose-700/60 animate-pulse'
                  }`}
                >
                  {result.allChecksPassed ? '✓ Cumple Normativa' : '⚠️ No Cumple — Requiere Corrección'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Verificación de Diámetro, Espaciamiento s_máx, Regla de los 150 mm y Confinamiento Ash ({standard})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs font-mono px-3"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* BANNER DE RESUMEN DE LA SECCIÓN Y BARRAS COMBINADAS */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 md:px-5 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Sección Hormigón</span>
              <strong className="text-white font-bold">{geom.b} × {geom.h} mm</strong>
              <span className="text-[9px] text-slate-500 block">Recubr. = {geom.cover} mm</span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Barras Totales</span>
              <strong className="text-amber-300 font-bold">{result.totalLongBars} barras</strong>
              <span className="text-[9px] text-slate-500 block">
                {result.isCombined ? 'Combinación Mixta' : 'Homogéneas'}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Mayor / Menor Ø</span>
              <strong className="text-cyan-300 font-bold">
                Ø{result.largestLongDiameter} / Ø{result.smallestLongDiameter} mm
              </strong>
              <span className="text-[9px] text-slate-500 block">
                {result.largestLongDiameter !== result.smallestLongDiameter ? '⚠️ Diámetros Mixtos' : 'Mismo Diámetro'}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Separación Libre Máx.</span>
              <strong className={result.maxClearDistanceBetweenBars > 150 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {result.maxClearDistanceBetweenBars} mm
              </strong>
              <span className="text-[9px] text-slate-500 block">
                {result.maxClearDistanceBetweenBars > 150 ? 'Excede 150 mm (Falla)' : '≤ 150 mm (Admisible)'}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Cerco Actual</span>
              <strong className="text-slate-100 font-bold">
                Ø{tieDesign.diameter} mm @ {tieDesign.s0}/{tieDesign.sMid} mm
              </strong>
              <span className="text-[9px] text-slate-500 block">
                Ramas: {tieDesign.legsX}X / {tieDesign.legsY}Y
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Barras Sin Arriostrar</span>
              <strong className={result.unsupportedBarsCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {result.unsupportedBarsCount} de {result.totalLongBars}
              </strong>
              <span className="text-[9px] text-slate-500 block">
                {result.unsupportedBarsCount > 0 ? 'Riesgo Pandeo' : '100% Soportadas'}
              </span>
            </div>
          </div>

          {/* MENSAJE TÉCNICO RESUMIDO */}
          <div className="mt-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono flex items-center justify-between gap-2">
            <div className="text-slate-300 flex items-center gap-2">
              <span className="text-cyan-400 font-bold">Diagnóstico:</span>
              <span>{result.summaryText}</span>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS DENTRO DEL MODAL */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 md:px-5 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('solutions')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'solutions'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>💡 Soluciones Aplicables ({result.solutions.length})</span>
            {!result.allChecksPassed && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('checks')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'checks'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📋 Chequeos Normativos (6)</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded ${
                result.allChecksPassed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
              }`}
            >
              {result.checks.filter((c) => c.status === 'OK').length}/6 OK
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customizer')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'customizer'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🛠️ Personalizador Manual de Cercos</span>
          </button>

          <button
            onClick={() => setActiveTab('theory')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'theory'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📖 Fundamentos y Regla de 150 mm</span>
          </button>
        </div>

        {/* CONTENIDO DE PESTAÑAS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {/* TAB 1: SOLUCIONES APLICABLES DIRECTAMENTE */}
          {activeTab === 'solutions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    Soluciones de Ingeniería para Resolver el No Cumplimiento
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Seleccione y aplique con un solo clic la alternativa constructiva más conveniente para su proyecto.
                  </p>
                </div>
                {appliedSolutionId && (
                  <div className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-lg animate-bounce">
                    ✓ ¡Solución aplicada con éxito al modelo!
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.solutions.map((sol) => {
                  const isCurrentApplied = appliedSolutionId === sol.id;
                  return (
                    <div
                      key={sol.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                        sol.isRecommended
                          ? 'bg-slate-950/80 border-cyan-600/80 shadow-lg shadow-cyan-950/20'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              sol.badge === 'RECOMENDADA'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                                : sol.badge === 'ALTA DUCTILIDAD'
                                ? 'bg-purple-950 text-purple-300 border-purple-600'
                                : sol.badge === 'MÍNIMO COSTO'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                : 'bg-amber-950 text-amber-300 border-amber-600'
                            }`}
                          >
                            {sol.badge}
                          </span>
                          {sol.isRecommended && (
                            <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                              ★ Recomendación del Motor
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white font-mono mb-1">
                          {sol.title}
                        </h4>
                        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                          {sol.summary}
                        </p>

                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono space-y-1.5 mb-3 text-slate-300">
                          <span className="text-slate-400 text-[10px] block font-semibold">Detalles Técnicos:</span>
                          <p>{sol.technicalDetails}</p>
                        </div>

                        {/* Comparativa Antes vs Después */}
                        <div className="space-y-1.5 mb-3">
                          <span className="text-[10px] font-mono text-slate-400 block font-semibold">
                            Impacto en Parámetros de Diseño:
                          </span>
                          <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                            {sol.beforeAfterComparison.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 border border-slate-800/80"
                              >
                                <span className="text-slate-400">{item.property}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-rose-400 line-through text-[10px]">{item.before}</span>
                                  <span className="text-slate-500">➔</span>
                                  <span className="text-emerald-400 font-bold">{item.after}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Beneficios Normativos */}
                        <div className="space-y-1 text-[11px] font-mono text-slate-400 mb-4">
                          {sol.codeBenefits.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-1.5">
                              <span className="text-cyan-400">✓</span>
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Botón de Aplicación Directa */}
                      <button
                        type="button"
                        onClick={() => handleApplySolution(sol)}
                        className={`w-full py-2 px-3 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                          isCurrentApplied
                            ? 'bg-emerald-600 text-white'
                            : sol.isRecommended
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <span>{isCurrentApplied ? '✓ ¡Solución Aplicada!' : '⚡ Aplicar esta Solución'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CHEQUEOS NORMATIVOS DETALLADOS */}
          {activeTab === 'checks' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Desglose de Comprobaciones Normativas de Estribado</h4>
                  <p className="text-slate-400 text-[11px]">
                    Evaluado según {standard === 'EUROCODE_2' ? 'Eurocódigo 2 (EN 1992-1-1)' : standard === 'NC_450_2006' ? 'NC 450:2006 (Cuba)' : 'ACI 318-19 (Cap. 18 y 25)'}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  f'c = {fc} MPa | fy = {fy} MPa
                </span>
              </div>

              <div className="space-y-2.5">
                {result.checks.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl border transition ${
                      c.status === 'OK'
                        ? 'bg-slate-950/80 border-emerald-800/40'
                        : c.status === 'WARNING'
                        ? 'bg-amber-950/20 border-amber-800/60'
                        : 'bg-rose-950/25 border-rose-700/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            c.status === 'OK'
                              ? 'bg-emerald-400'
                              : c.status === 'WARNING'
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                        />
                        <h5 className="font-bold text-slate-100">{c.title}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {c.codeRef}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'OK'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : c.status === 'WARNING'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-rose-950 text-rose-300 border border-rose-700'
                          }`}
                        >
                          {c.status === 'OK' ? 'CUMPLE' : 'NO CUMPLE'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] mb-2">
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px]">Demanda / Estado Provisto:</span>
                        <strong className={c.status === 'OK' ? 'text-slate-200' : 'text-rose-300'}>
                          {c.demand}
                        </strong>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[10px]">Límite Normativo Exigido:</span>
                        <strong className="text-cyan-300">{c.capacity}</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 mb-1">{c.description}</p>
                    <p className="text-[10px] text-slate-500 italic">
                      <strong className="text-slate-400 not-italic">Justificación física: </strong>
                      {c.ruleExplanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PERSONALIZADOR MANUAL DE CERCOS */}
          {activeTab === 'customizer' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-1">Configurador y Ajuste Manual del Estribado</h4>
                <p className="text-slate-400 text-[11px]">
                  Modifique libremente el patrón de ligaduras, ramas en X/Y, calibres y espaciamientos para analizar la respuesta.
                </p>
              </div>

              {/* Selector de Patrón de Estribado */}
              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block text-xs">
                  Patrón Geométrico de Estribado:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateTieDesign({ ...tieDesign, patternType: 'perimeter_only', legsX: 2, legsY: 2 })}
                    className={`p-3 rounded-xl border text-left transition ${
                      tieDesign.patternType === 'perimeter_only' || !tieDesign.patternType
                        ? 'bg-cyan-950/40 border-cyan-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">Perimetral Simple</div>
                    <p className="text-[10px] text-slate-400">
                      Estribo cerrado único (2 ramas X, 2 ramas Y). Apto solo si s libre ≤ 150 mm.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateTieDesign({ ...tieDesign, patternType: 'perimeter_crossties', legsX: 3, legsY: 3 })}
                    className={`p-3 rounded-xl border text-left transition ${
                      tieDesign.patternType === 'perimeter_crossties'
                        ? 'bg-cyan-950/40 border-cyan-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">Perimetral + Trabas (Cross-ties)</div>
                    <p className="text-[10px] text-slate-400">
                      Estribo exterior + ganchos suplementarios a 135° en barras de caras intermedias.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateTieDesign({ ...tieDesign, patternType: 'perimeter_diamond', legsX: 3, legsY: 3 })}
                    className={`p-3 rounded-xl border text-left transition ${
                      tieDesign.patternType === 'perimeter_diamond'
                        ? 'bg-cyan-950/40 border-cyan-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">Perimetral + Rombo Interior</div>
                    <p className="text-[10px] text-slate-400">
                      Estribo rectangular exterior + rombo poligonal que abraza las 4 barras de caras.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateTieDesign({ ...tieDesign, patternType: 'overlapping_perimeter', legsX: 4, legsY: 4 })}
                    className={`p-3 rounded-xl border text-left transition ${
                      tieDesign.patternType === 'overlapping_perimeter'
                        ? 'bg-cyan-950/40 border-cyan-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">Doble Perimetral Solapado</div>
                    <p className="text-[10px] text-slate-400">
                      Dos estribos rectangulares entrelazados para columnas de gran ancho (4 ramas).
                    </p>
                  </button>
                </div>
              </div>

              {/* Controles de Parámetros de Estribos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Ø Diámetro del Cerco:</label>
                  <select
                    value={tieDesign.diameter}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, diameter: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  >
                    <option value={8}>Ø 8 mm</option>
                    <option value={10}>Ø 10 mm (Estándar)</option>
                    <option value={12}>Ø 12 mm (Alto Confinamiento)</option>
                    <option value={16}>Ø 16 mm (Pesado)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Ramas en Dirección X:</label>
                  <select
                    value={tieDesign.legsX}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, legsX: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  >
                    <option value={2}>2 Ramas (Perimetral)</option>
                    <option value={3}>3 Ramas (Con 1 traba central)</option>
                    <option value={4}>4 Ramas (Doble estribo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Ramas en Dirección Y:</label>
                  <select
                    value={tieDesign.legsY}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, legsY: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  >
                    <option value={2}>2 Ramas (Perimetral)</option>
                    <option value={3}>3 Ramas (Con 1 traba central)</option>
                    <option value={4}>4 Ramas (Doble estribo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Paso s₀ Confinamiento:</label>
                  <input
                    type="number"
                    step="10"
                    min="50"
                    max="200"
                    value={tieDesign.s0}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, s0: Number(e.target.value) || 100 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Paso s Central:</label>
                  <input
                    type="number"
                    step="10"
                    min="100"
                    max="350"
                    value={tieDesign.sMid}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, sMid: Number(e.target.value) || 200 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Longitud Zona Crítica l₀:</label>
                  <input
                    type="number"
                    step="50"
                    min="450"
                    value={tieDesign.l0}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, l0: Number(e.target.value) || 600 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Ángulo de Gancho:</label>
                  <select
                    value={tieDesign.hookAngle}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, hookAngle: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  >
                    <option value={135}>135° (Sismorresistente)</option>
                    <option value={90}>90° (No recomendado)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Extensión de Gancho:</label>
                  <input
                    type="number"
                    step="5"
                    min="60"
                    value={tieDesign.hookLength}
                    onChange={(e) => onUpdateTieDesign({ ...tieDesign, hookLength: Number(e.target.value) || 80 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FUNDAMENTOS TÉCNICOS Y REGLA DE LOS 150 MM */}
          {activeTab === 'theory' && (
            <div className="space-y-4 font-mono text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📐</span>
                  ¿Por Qué Falla una Columna con Barras Combinadas sin Cercos Adecuados?
                </h4>
                <p>
                  Cuando una columna combina barras de diferentes diámetros (por ejemplo, 4 Ø25 mm en esquinas para tomar los momentos flectores biaxiales y barras intermedias de Ø16 mm en las caras para controlar fisuración y satisfacer cuantías mínimas), surgen dos fenómenos críticos:
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li>
                    <strong className="text-amber-300">Pandeo prematuro de la barra menor: </strong>
                    La barra de menor diámetro (Ø16 mm) tiene una esbeltez local k·s/r mucho mayor que la barra gruesa. Si el proyectista calcula la separación de estribos con la barra mayor (16 × 25 mm = 400 mm), la barra de 16 mm pandeará catastróficamente a apenas 16 × 16 = 256 mm. Por ello, <strong className="text-white">el espaciamiento máximo SIEMPRE debe regirse por la barra menor de la combinación</strong>.
                  </li>
                  <li>
                    <strong className="text-rose-300">Empuje lateral hacia el exterior (Regla de los 150 mm): </strong>
                    Las barras intermedias ubicadas a lo largo de las caras de la columna experimentan compresión pura y, al dilatarse transversalmente por efecto Poisson y agrietarse el recubrimiento exterior, intentan pandearse hacia afuera. Un estribo perimetral simple solo arriostra las esquinas; la cara recta del cerco se deforma como una cuerda elástica si la distancia libre excede 150 mm.
                  </li>
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-cyan-400 font-bold block mb-1">ACI 318-19 §25.7.2.3</span>
                  <p className="text-[11px] text-slate-400">
                    «Toda barra de esquina y barra alterna debe tener soporte lateral suministrado por la esquina de un estribo con ángulo interior no mayor de 135°. Ninguna barra que no tenga soporte lateral debe estar a una distancia libre mayor de 150 mm a cada lado de una barra soportada».
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-cyan-400 font-bold block mb-1">NC 450:2006 (Cuba) §8.2</span>
                  <p className="text-[11px] text-slate-400">
                    «En columnas con más de 4 barras longitudinales, si la distancia entre barras contiguas es superior a 150 mm, se dispondrán ramas intermedias, cercos adicionales o estribos poligonales interiores para evitar el pandeo».
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-cyan-400 font-bold block mb-1">Eurocódigo 2 EN 1992-1-1 §9.5.3</span>
                  <p className="text-[11px] text-slate-400">
                    «Ninguna barra de la armadura longitudinal debe distar más de 150 mm de una barra arriostrada. Si el número de barras en una cara supera 3, se requieren ligaduras interiores o grapas cruzadas».
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-3 md:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400">
            {result.allChecksPassed ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <span>✓</span> Configuración de cercos conforme a normativa internacional
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1.5 font-bold">
                <span>⚠️</span> No cumple normativa actual. Aplique una solución para corregir.
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-cyan-600/20"
          >
            Aceptar y Volver al Modelo
          </button>
        </div>
      </div>
    </div>
  );
};
