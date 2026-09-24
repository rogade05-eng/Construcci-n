/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppInputsState, HistorySnapshot } from '../types';
import {
  History,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Plus,
  Bookmark,
  CheckCircle2,
  Clock,
  HardDrive,
  X,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import {
  exportStateToJson,
  importStateFromJson,
  addHistorySnapshot,
  deleteHistorySnapshot,
  clearAllHistory,
} from '../utils/autoSaveManager';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AppInputsState;
  historySnapshots: HistorySnapshot[];
  onRestoreState: (state: AppInputsState, snapshotTitle?: string) => void;
  onUpdateHistory: (updated: HistorySnapshot[]) => void;
  onResetToDefaults: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  currentState,
  historySnapshots,
  onRestoreState,
  onUpdateHistory,
  onResetToDefaults,
}) => {
  const [manualTitle, setManualTitle] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmResetFactory, setConfirmResetFactory] = useState(false);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleCreateManualCheckpoint = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = manualTitle.trim() || 'Punto de Control Manual';
    const updated = addHistorySnapshot(currentState, title, 'manual');
    onUpdateHistory(updated);
    setManualTitle('');
    showNotification(`✓ Punto de control guardado: "${title}"`);
  };

  const handleRestore = (snapshot: HistorySnapshot) => {
    onRestoreState(snapshot.state, snapshot.title);
    showNotification(`✓ Estado restaurado a: ${snapshot.title}`);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteHistorySnapshot(id);
    onUpdateHistory(updated);
    showNotification('Instantánea eliminada del historial');
  };

  const handleClearAll = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 4000);
      return;
    }
    clearAllHistory();
    onUpdateHistory([]);
    setConfirmClearAll(false);
    showNotification('Historial de cambios vaciado');
  };

  const handleExportJson = () => {
    try {
      const jsonStr = exportStateToJson(currentState, historySnapshots);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      const safeProjName = (currentState.projectMetadata?.projectName || 'columna')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      a.download = `colum_master_${safeProjName}_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('✓ Copia de seguridad exportada con éxito (.json)');
    } catch (err) {
      console.error(err);
      showNotification('⚠️ Error al exportar archivo JSON');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importStateFromJson(text);
        if (!imported) {
          showNotification('⚠️ El archivo no contiene un formato de proyecto válido de ColumMaster.');
          return;
        }

        onRestoreState(imported.state, 'Importado de archivo');
        if (imported.history && imported.history.length > 0) {
          onUpdateHistory(imported.history);
        } else {
          const updated = addHistorySnapshot(imported.state, 'Archivo importado', 'manual');
          onUpdateHistory(updated);
        }
        showNotification('✓ Proyecto e historial restaurados con éxito');
        setTimeout(() => onClose(), 600);
      } catch (err) {
        console.error(err);
        showNotification('⚠️ Error al leer o procesar el archivo JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getTriggerBadge = (trigger: HistorySnapshot['trigger']) => {
    switch (trigger) {
      case 'manual':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1">
            <Bookmark className="w-2.5 h-2.5" /> Manual
          </span>
        );
      case 'optimization':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
            ⚡ Optimización
          </span>
        );
      case 'preset':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700/60">
            📚 Catálogo
          </span>
        );
      case 'session_restore':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/60">
            🔄 Sesión
          </span>
        );
      case 'auto':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            ⏱️ Auto
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white font-mono">
                  Historial de Cambios y Autoguardado
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Almacenamiento Local Activo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tus inputs se preservan continuamente ante recargas o cierres del navegador. Puedes explorar y restaurar cualquier versión anterior.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación flotante de feedback */}
        {feedbackNotice && (
          <div className="bg-cyan-950/90 border-b border-cyan-800 px-6 py-2 text-xs font-mono text-cyan-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* Formulario de punto de control manual */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <div className="relative">
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateManualCheckpoint()}
                placeholder="Nombre para guardar este punto de control (ej. 'Alternativa Hormigón 45x45 con 8Ø20')..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-24 py-2 text-xs text-slate-100 placeholder:text-slate-500 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => handleCreateManualCheckpoint()}
                className="absolute right-1 top-1 bottom-1 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-mono font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition"
              title="Descargar copia de seguridad en archivo .json"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar Backup</span>
            </button>

            <label className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Importar</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Lista de versiones / instantáneas */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1">
            <span>REGISTROS HISTÓRICOS ({historySnapshots.length})</span>
            {historySnapshots.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-rose-300">¿Vaciar todo?</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-rose-400 hover:text-white bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-700 text-[11px] font-bold"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="text-slate-400 hover:text-slate-200 text-[11px]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Vaciar historial</span>
                </button>
              )
            )}
          </div>

          {historySnapshots.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-3">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400 font-sans">
                Aún no hay instantáneas en el historial. A medida que ajustes cargas, secciones o materiales, las versiones se guardarán automáticamente aquí.
              </p>
              <button
                type="button"
                onClick={() => handleCreateManualCheckpoint()}
                className="px-4 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-xs font-semibold inline-flex items-center gap-2 hover:bg-emerald-900 transition"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Guardar estado actual como primera versión</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {historySnapshots.map((item, idx) => {
                const isSelected = selectedSnapshotId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedSnapshotId(isSelected ? null : item.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md'
                        : idx === 0
                        ? 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getTriggerBadge(item.trigger)}
                        <h4 className="font-mono text-xs font-bold text-slate-100 truncate">
                          {item.title}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 ml-auto sm:ml-0">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {item.formattedDate}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            Más reciente
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 font-mono line-clamp-2">
                        {item.summary}
                      </p>

                      {isSelected && (
                        <div className="pt-2 text-[11px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-700/60 mt-2">
                          <div>
                            <span className="text-slate-500 block text-[9px]">MATERIAL:</span>
                            <span className="text-slate-200 uppercase">{item.state.material}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">NORMA:</span>
                            <span className="text-slate-200">{item.state.standard}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">SOLICITACIONES:</span>
                            <span className="text-slate-200">Pu={item.state.loads.Pu} kN</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">LONGITUD:</span>
                            <span className="text-slate-200">L={item.state.colLength} m</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(item);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow"
                        title="Restaurar todas las entradas de esta versión"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                        title="Eliminar esta versión del historial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie de acciones y restablecimiento */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80 gap-3">
          {confirmResetFactory ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-300 font-mono">¿Confirmar reseteo total?</span>
              <button
                type="button"
                onClick={() => {
                  onResetToDefaults();
                  setConfirmResetFactory(false);
                  showNotification('Valores restablecidos a configuración de fábrica');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition shadow"
              >
                Sí, restablecer
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetFactory(false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetFactory(true)}
              className="px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Restablecer a valores de fábrica</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
