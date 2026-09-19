/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, Check, Save, RotateCcw, Cloud, ShieldCheck } from 'lucide-react';

interface AutoSaveBadgeProps {
  lastSavedTime: Date | null;
  isSaving: boolean;
  historyCount: number;
  onOpenHistory: () => void;
  onQuickUndo?: () => void;
  canUndo?: boolean;
}

export const AutoSaveBadge: React.FC<AutoSaveBadgeProps> = ({
  lastSavedTime,
  isSaving,
  historyCount,
  onOpenHistory,
  onQuickUndo,
  canUndo = false,
}) => {
  const formattedTime = lastSavedTime
    ? lastSavedTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-mono shadow-sm">
      {/* Indicador de estado de guardado */}
      <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-800">
        {isSaving ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="text-amber-300 text-[11px] hidden sm:inline">Guardando...</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" />
            <span className="text-emerald-400 font-semibold text-[11px] hidden sm:inline flex items-center gap-1">
              <span>Autoguardado</span>
              {formattedTime && <span className="text-slate-400 font-normal">({formattedTime})</span>}
            </span>
          </>
        )}
      </div>

      {/* Botón rápido de deshacer si está habilitado */}
      {canUndo && onQuickUndo && (
        <button
          type="button"
          onClick={onQuickUndo}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
          title="Deshacer último cambio (restaurar versión previa del historial)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Botón para abrir el historial completo */}
      <button
        type="button"
        onClick={onOpenHistory}
        className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
        title="Ver historial de versiones y cambios guardados en localStorage"
      >
        <History className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] font-bold text-cyan-300">Historial</span>
        {historyCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
            {historyCount}
          </span>
        )}
      </button>
    </div>
  );
};
