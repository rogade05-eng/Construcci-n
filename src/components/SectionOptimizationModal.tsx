/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SectionOptimizationResult } from '../engine/sectionOptimizer';

interface SectionOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SectionOptimizationResult | null;
  onApply: () => void;
  onRevert?: () => void;
  isApplied?: boolean;
}

export const SectionOptimizationModal: React.FC<SectionOptimizationModalProps> = ({
  isOpen,
  onClose,
  result,
  onApply,
  onRevert,
  isApplied = false,
}) => {
  if (!isOpen || !result) return null;

  const isConcrete = result.material === 'concrete';
  const isSteel = result.material === 'steel';
  const isWood = result.material === 'wood';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col font-mono text-xs text-slate-200">
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-base shadow-md">
              ⚡
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Optimización Automática de Sección
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
                  DCR Objetivo: {(result.targetDcr * 100).toFixed(0)}%
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Ajuste dimensional y de rigidez para máxima eficiencia sin sobrepasar límites normativos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mensaje de dictamen */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              result.success
                ? 'bg-emerald-950/30 border-emerald-600/50 text-emerald-200'
                : 'bg-rose-950/30 border-rose-600/50 text-rose-200'
            }`}
          >
            <span className="text-xl">{result.success ? '🎯' : '⚠️'}</span>
            <div className="text-[11px] font-sans">
              <strong className="block font-mono font-bold text-white mb-0.5">
                {result.success ? 'Optimización Estructural Completada' : 'Aviso de Diseño'}
              </strong>
              {result.message}
            </div>
          </div>

          {/* Comparativa Antes vs Después */}
          {result.success && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sección Anterior */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                    Sección Original
                  </span>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Inicial
                  </span>
                </div>

                <div className="text-base font-bold text-slate-200">
                  {isConcrete && result.concrete && `${result.concrete.originalB} × ${result.concrete.originalH} mm`}
                  {isSteel && result.steel && result.steel.originalProfileDesignation}
                  {isWood && result.wood && `${result.wood.originalB} × ${result.wood.originalH} mm`}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ratio DCR:</span>
                    <span
                      className={`font-bold ${
                        result.originalDcr <= 1.0 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {(result.originalDcr * 100).toFixed(1)}%
                    </span>
                  </div>
                  {isConcrete && result.concrete && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Área Bruta:</span>
                      <span className="text-slate-300">{result.concrete.originalAreaCm2} cm²</span>
                    </div>
                  )}
                  {isSteel && result.steel && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peso lineal:</span>
                      <span className="text-slate-300">{result.steel.originalWeightKgM} kg/m</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección Optimizada */}
              <div className="bg-gradient-to-br from-cyan-950/40 to-slate-950/80 p-3.5 rounded-xl border border-cyan-600/50 shadow-lg shadow-cyan-950/20 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 text-[9px] font-bold px-2 py-0.5 rounded-bl">
                  ÓPTIMA ~ 90% DCR
                </div>

                <div className="flex items-center justify-between text-cyan-400">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-cyan-300">
                    Sección Optimizada
                  </span>
                </div>

                <div className="text-base font-bold text-cyan-200">
                  {isConcrete && result.concrete && `${result.concrete.optimizedB} × ${result.concrete.optimizedH} mm`}
                  {isSteel && result.steel && result.steel.optimizedProfileDesignation}
                  {isWood && result.wood && `${result.wood.optimizedB} × ${result.wood.optimizedH} mm`}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-cyan-800/40 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ratio DCR:</span>
                    <span className="font-bold text-emerald-400">
                      {(result.optimizedDcr * 100).toFixed(1)}%
                    </span>
                  </div>
                  {isConcrete && result.concrete && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Área Optimizada:</span>
                      <span className="text-cyan-300 font-bold">
                        {result.concrete.optimizedAreaCm2} cm²
                        {result.concrete.areaReductionPct !== 0 && (
                          <span className="text-[10px] ml-1 text-slate-400">
                            ({result.concrete.areaReductionPct > 0 ? '-' : '+'}
                            {Math.abs(result.concrete.areaReductionPct)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {isSteel && result.steel && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peso lineal:</span>
                      <span className="text-cyan-300 font-bold">
                        {result.steel.optimizedWeightKgM} kg/m
                        {result.steel.weightReductionPct !== 0 && (
                          <span className="text-[10px] ml-1 text-slate-400">
                            ({result.steel.weightReductionPct > 0 ? '-' : '+'}
                            {Math.abs(result.steel.weightReductionPct)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gráfico visual de escala de aprovechamiento DCR */}
          {result.success && (
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-bold">Aprovechamiento Estructural del Material</span>
                <span className="text-slate-400 font-sans">
                  Objetivo: <strong className="text-cyan-300">85% - 90%</strong> (Zona de Alta Eficiencia)
                </span>
              </div>

              {/* Barra de progreso con marcas */}
              <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                {/* Zona sobredimensionada */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-blue-900/40"
                  style={{ width: '70%' }}
                  title="Sobredimensionada (DCR < 70%)"
                />
                {/* Zona de diseño óptimo (70% - 90%) */}
                <div
                  className="absolute left-[70%] top-0 bottom-0 bg-emerald-700/60"
                  style={{ width: '20%' }}
                  title="Zona Óptima de Eficiencia (70% - 90%)"
                />
                {/* Zona crítica (90% - 100%) */}
                <div
                  className="absolute left-[90%] top-0 bottom-0 bg-amber-700/60"
                  style={{ width: '10%' }}
                  title="Zona Límite (90% - 100%)"
                />

                {/* Marcador del valor optimizado */}
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white shadow-lg shadow-white transform -translate-x-1/2 transition-all duration-500 rounded-full"
                  style={{ left: `${Math.min(100, Math.max(0, result.optimizedDcr * 100))}%` }}
                />

                {/* Línea objetivo del 90% */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                  style={{ left: '90%' }}
                  title="Objetivo 90%"
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1">
                <span>0% (Inerte)</span>
                <span className="text-emerald-400">70% - 90% (Óptimo)</span>
                <span className="text-cyan-300 font-bold">90% (Objetivo)</span>
                <span className="text-rose-400">100% (Límite φ)</span>
              </div>
            </div>
          )}

          {/* Cuadro de verificaciones normativas */}
          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>Auditoría de Comprobaciones Normativas</span>
              <span className="text-[10px] text-emerald-400 font-normal">Todas las comprobaciones cumplen</span>
            </div>
            <div className="space-y-1.5">
              {result.checksSummary.map((chk, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px]"
                >
                  <span className="text-slate-400">{chk.name}</span>
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    {chk.value}
                    <span className="text-emerald-400 text-xs">✓</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barra de acciones inferior */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {isApplied && onRevert && (
              <button
                type="button"
                onClick={onRevert}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5"
              >
                <span>↩ Deshacer Optimización</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onApply();
                onClose();
              }}
              disabled={!result.success}
              className={`px-5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
                result.success
                  ? 'bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 shadow-cyan-950/40'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>⚡ {isApplied ? 'Sección Aplicada' : 'Aplicar Sección Optimizada'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
