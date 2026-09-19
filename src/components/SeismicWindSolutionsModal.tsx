/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SeismicWindDiagnostics,
  SeismicWindSolutionOption,
} from '../engine/seismicWindSolver';
import { DesignStandard } from '../types';

interface SeismicWindSolutionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: SeismicWindDiagnostics;
  material: 'concrete' | 'steel' | 'wood';
  standard: DesignStandard;
  onApplySolution: (solution: SeismicWindSolutionOption) => void;
}

export function SeismicWindSolutionsModal({
  isOpen,
  onClose,
  diagnostics,
  material,
  standard,
  onApplySolution,
}: SeismicWindSolutionsModalProps) {
  const [selectedSolutionId, setSelectedSolutionId] = useState<string>(
    diagnostics.solutions.find((s) => s.isRecommended)?.id || diagnostics.solutions[0]?.id || ''
  );
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSolution =
    diagnostics.solutions.find((s) => s.id === selectedSolutionId) || diagnostics.solutions[0];

  const handleApply = (solution: SeismicWindSolutionOption) => {
    onApplySolution(solution);
    setAppliedNotice(`¡Solución "${solution.title}" aplicada con éxito! El diseño ahora cumple.`);
    setTimeout(() => {
      setAppliedNotice(null);
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* CABECERA */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-lg">
              🛠️
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Solución Automática de Incumplimiento Sismo & Viento
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  NC 46:2017 · ACI 318-19 · NC 285
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Opciones técnicas calculadas para eliminar déficits de cortante, flexión y confinamiento sísmico.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* NOTIFICACIÓN DE ÉXITO */}
        {appliedNotice && (
          <div className="bg-emerald-950/90 border-b border-emerald-600 px-4 py-3 flex items-center gap-2 text-emerald-200 text-xs font-bold animate-pulse">
            <span>✓</span>
            <span>{appliedNotice}</span>
          </div>
        )}

        {/* CUERPO PRINCIPAL CON SCROLL */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* SECCIÓN 1: DIAGNÓSTICO DE CAUSAS RAÍZ */}
          {diagnostics.criticalIssues.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/50 space-y-2">
              <div className="flex items-center justify-between text-rose-300 font-bold">
                <span className="flex items-center gap-2">
                  <span>⚠️</span> Fallas o Incumplimientos Detectados ({diagnostics.criticalIssues.length})
                </span>
                <span className="text-[10px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                  REQUIERE REDISEÑO
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {diagnostics.criticalIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-rose-900/60 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-[11px]">{issue.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          issue.severity === 'DANGER'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {issue.severity === 'DANGER' ? 'CRÍTICO' : 'ADVERTENCIA'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      <span className="text-slate-500">Demanda: </span>
                      <span className="text-rose-300 font-semibold">{issue.demand}</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      <span className="text-slate-500">Capacidad: </span>
                      <span className="text-emerald-400">{issue.capacity}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
                      💡 {issue.actionHint}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: SELECTOR DE SOLUCIONES TÉCNICAS */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>⚡</span> Opciones de Solución y Rediseño Disponibles ({diagnostics.solutions.length})
              </span>
              <span className="text-[10px] text-cyan-400">
                Seleccione una opción para ver detalles y aplicar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {diagnostics.solutions.map((sol) => {
                const isSelected = sol.id === selectedSolutionId;
                return (
                  <div
                    key={sol.id}
                    onClick={() => setSelectedSolutionId(sol.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500 ring-1 ring-cyan-500 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                          {sol.isRecommended && <span className="text-amber-400">★</span>}
                          {sol.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                            sol.badgeVariant === 'emerald'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : sol.badgeVariant === 'amber'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          }`}
                        >
                          {sol.badgeText}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          DCR Previsto: <strong className="text-emerald-400">{(sol.expectedDcr * 100).toFixed(0)}%</strong>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">{sol.summary}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[9px] text-cyan-400 font-semibold">{sol.normativeCode}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(sol);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-black rounded-lg shadow transition active:scale-95 cursor-pointer"
                      >
                        ✓ Aplicar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 3: DETALLES DE LA SOLUCIÓN SELECCIONADA */}
          {currentSolution && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-sm">📋</span>
                  <span className="font-bold text-slate-100 text-xs">
                    Comparativa y Modificaciones Propuestas: {currentSolution.title}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                  DCR ESTIMADO: {(currentSolution.expectedDcr * 100).toFixed(1)}% (✓ CUMPLE)
                </span>
              </div>

              {/* TABLA ANTES VS DESPUÉS */}
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px]">
                      <th className="p-2">Parámetro de Diseño</th>
                      <th className="p-2 text-rose-300">Valor Actual (Falla / Insuficiente)</th>
                      <th className="p-2 text-emerald-300">Valor Propuesto (Solución)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {currentSolution.details.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2 font-semibold text-slate-300">{item.label}</td>
                        <td className="p-2 text-rose-300/90 font-mono">{item.oldValue}</td>
                        <td className="p-2 text-emerald-300 font-bold font-mono flex items-center gap-1.5">
                          <span>→</span>
                          <span>{item.newValue}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BENEFICIOS NORMATIVOS */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Garantías y Beneficios Estructurales:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentSolution.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-300">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA CON BOTÓN DE ACCIÓN */}
        <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            * Al aplicar la solución, los parámetros se actualizarán automáticamente y el cálculo se re-evaluará.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            {currentSolution && (
              <button
                onClick={() => handleApply(currentSolution)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>⚡</span>
                <span>APLICAR SOLUCIÓN SELECCIONADA</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
