/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RebarCombination } from '../types';

interface RebarCombinationsSelectorProps {
  combinations: RebarCombination[];
  selectedComboName: string;
  onSelectCombination: (combo: RebarCombination) => void;
  Ag: number; // mm²
  onOpenCombinedBarsTieModal?: () => void;
}

export const RebarCombinationsSelector: React.FC<RebarCombinationsSelectorProps> = ({
  combinations,
  selectedComboName,
  onSelectCombination,
  Ag,
  onOpenCombinedBarsTieModal,
}) => {
  const isCombined = selectedComboName.includes('+') || selectedComboName.includes('Caras') || selectedComboName.includes('Esquinas');
  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Combinaciones Posibles de Diámetros de Acero
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Alternativas de armado longitudinal que cumplen con cuantía mínima (ρ ≥ 1.0%), máxima (ρ ≤ 4.0%) y separación libre libre de áridos (s ≥ 40 mm).
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
          Ag = {(Ag / 100).toFixed(0)} cm²
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {combinations.map((combo) => {
          const isSelected = selectedComboName === combo.name;
          return (
            <div
              key={combo.name}
              onClick={() => onSelectCombination(combo)}
              className={`p-3 rounded-lg border transition cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-bl">
                  SELECCIONADO
                </div>
              )}

              <div>
                <div className="font-mono text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="text-amber-400">●</span>
                  {combo.name}
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Área Acero As</span>
                    <strong className="text-cyan-300">{Math.round(combo.totalAs)} mm²</strong>
                  </div>

                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Cuantía ρ</span>
                    <strong className={combo.rho >= 1.0 && combo.rho <= 3.5 ? 'text-emerald-400' : 'text-amber-400'}>
                      {combo.rho.toFixed(2)}%
                    </strong>
                  </div>

                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Sep. Libre</span>
                    <strong className={combo.clearSpacing >= 40 ? 'text-slate-200' : 'text-rose-400'}>
                      {Math.round(combo.clearSpacing)} mm
                    </strong>
                  </div>

                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px]">Peso Lineal</span>
                    <strong className="text-slate-200">{combo.weightPerMeter.toFixed(2)} kg/m</strong>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className={combo.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {combo.isValid ? '✓ Cumple Normativa' : '✗ Revisar Separación'}
                </span>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isSelected ? 'Activo' : 'Aplicar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* BANNER INFORMATIVO Y ACCIÓN DE CERCOS PARA BARRAS COMBINADAS */}
      {isCombined && onOpenCombinedBarsTieModal && (
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-800/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <span className="text-base">🪝</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-white font-bold">
                  Verificación de Cercos para Armado Combinado ({selectedComboName})
                </strong>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px]">
                  Normas ACI 318 / NC 450 / EC2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Al usar barras combinadas en esquinas y caras, el espaciamiento máximo debe regirse por la barra menor y las barras intermedias requieren trabas suplementarias (cross-ties a 135°) si la distancia libre excede 150 mm.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCombinedBarsTieModal}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20 whitespace-nowrap"
          >
            <span>⚡ Diagnóstico y Soluciones de Cercos</span>
          </button>
        </div>
      )}
    </div>
  );
};
