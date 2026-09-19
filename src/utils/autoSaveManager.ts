/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppInputsState, DEFAULT_APP_INPUTS_STATE, HistorySnapshot } from '../types';

export const KEY_AUTOSAVE_STATE = 'colum_master_autosave_state_v1';
export const KEY_HISTORY_SNAPSHOTS = 'colum_master_history_snapshots_v1';
export const MAX_HISTORY_SNAPSHOTS = 35;

/**
 * Carga el estado autoguardado desde localStorage si existe y es válido.
 */
export function loadAutoSavedState(): AppInputsState | null {
  try {
    const raw = localStorage.getItem(KEY_AUTOSAVE_STATE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Validación básica de estructura
    if (parsed && typeof parsed === 'object' && parsed.material && parsed.loads) {
      // Fusionar con DEFAULT para garantizar compatibilidad si hay campos nuevos
      return {
        ...DEFAULT_APP_INPUTS_STATE,
        ...parsed,
        projectMetadata: {
          ...DEFAULT_APP_INPUTS_STATE.projectMetadata,
          ...(parsed.projectMetadata || {}),
        },
        loads: {
          ...DEFAULT_APP_INPUTS_STATE.loads,
          ...(parsed.loads || {}),
        },
        concreteGeom: {
          ...DEFAULT_APP_INPUTS_STATE.concreteGeom,
          ...(parsed.concreteGeom || {}),
        },
        tieDesign: {
          ...DEFAULT_APP_INPUTS_STATE.tieDesign,
          ...(parsed.tieDesign || {}),
        },
        seismicParams: {
          ...DEFAULT_APP_INPUTS_STATE.seismicParams,
          ...(parsed.seismicParams || {}),
        },
        windParams: {
          ...DEFAULT_APP_INPUTS_STATE.windParams,
          ...(parsed.windParams || {}),
        },
      };
    }
  } catch (err) {
    console.warn('[AutoSave] Error al leer estado de localStorage:', err);
  }
  return null;
}

/**
 * Guarda inmediatamente el estado actual en localStorage
 */
export function saveAutoSavedState(state: AppInputsState): boolean {
  try {
    const stateToSave: AppInputsState = {
      ...state,
      lastModified: Date.now(),
    };
    localStorage.setItem(KEY_AUTOSAVE_STATE, JSON.stringify(stateToSave));
    return true;
  } catch (err) {
    console.error('[AutoSave] Error al persistir estado en localStorage:', err);
    return false;
  }
}

/**
 * Genera un resumen legible del estado para visualización en el historial
 */
export function generateStateSummary(state: AppInputsState): string {
  const parts: string[] = [];

  if (state.material === 'concrete') {
    const dim = state.concreteGeom.shape === 'circular'
      ? `Ø${state.concreteGeom.b}mm`
      : `${state.concreteGeom.b}x${state.concreteGeom.h}mm`;
    parts.push(`Hormigón ${dim} (${state.concreteMatKey})`);
    if (state.selectedComboName) {
      parts.push(state.selectedComboName);
    }
  } else if (state.material === 'steel') {
    parts.push(`Acero ${state.selectedProfileId} (${state.steelMatKey})`);
  } else if (state.material === 'wood') {
    parts.push(`Madera ${state.woodB}x${state.woodH}mm (${state.woodMatKey})`);
  }

  parts.push(`Pu=${state.loads.Pu}kN, Mux=${state.loads.Mux}kN·m`);
  parts.push(`L=${state.colLength}m`);
  parts.push(state.standard);

  if (state.projectMetadata?.projectName) {
    parts.push(`[${state.projectMetadata.projectName}]`);
  }

  return parts.join(' • ');
}

/**
 * Carga la lista de instantáneas del historial
 */
export function loadHistorySnapshots(): HistorySnapshot[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY_SNAPSHOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[History] Error al cargar historial:', err);
  }
  return [];
}

/**
 * Guarda la lista de instantáneas en localStorage
 */
export function saveHistorySnapshots(snapshots: HistorySnapshot[]): boolean {
  try {
    localStorage.setItem(KEY_HISTORY_SNAPSHOTS, JSON.stringify(snapshots.slice(0, MAX_HISTORY_SNAPSHOTS)));
    return true;
  } catch (err) {
    console.error('[History] Error al guardar historial:', err);
    return false;
  }
}

/**
 * Agrega una instantánea al historial evitando duplicados consecutivos idénticos
 */
export function addHistorySnapshot(
  state: AppInputsState,
  title: string,
  trigger: HistorySnapshot['trigger'] = 'auto'
): HistorySnapshot[] {
  const currentHistory = loadHistorySnapshots();

  // Si la última instantánea tiene exactamente el mismo resumen y estado básico, solo actualizamos su timestamp
  const latest = currentHistory[0];
  const summary = generateStateSummary(state);

  if (latest && trigger === 'auto' && latest.summary === summary) {
    // Si no ha cambiado nada sustancialmente en 60 segundos, no duplicar
    if (Date.now() - latest.timestamp < 60000) {
      latest.timestamp = Date.now();
      latest.formattedDate = new Date().toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });
      latest.state = state;
      saveHistorySnapshots(currentHistory);
      return currentHistory;
    }
  }

  const newSnapshot: HistorySnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    formattedDate: new Date().toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }),
    title: title || (trigger === 'manual' ? 'Punto de Control Manual' : 'Cambio de Estado'),
    trigger,
    summary,
    state: JSON.parse(JSON.stringify(state)),
  };

  const updated = [newSnapshot, ...currentHistory].slice(0, MAX_HISTORY_SNAPSHOTS);
  saveHistorySnapshots(updated);
  return updated;
}

/**
 * Elimina una instantánea específica
 */
export function deleteHistorySnapshot(id: string): HistorySnapshot[] {
  const current = loadHistorySnapshots();
  const updated = current.filter((s) => s.id !== id);
  saveHistorySnapshots(updated);
  return updated;
}

/**
 * Limpia todo el historial de cambios
 */
export function clearAllHistory(): void {
  try {
    localStorage.removeItem(KEY_HISTORY_SNAPSHOTS);
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Exporta el estado y el historial a un archivo JSON para respaldo externo
 */
export function exportStateToJson(state: AppInputsState, history: HistorySnapshot[]): string {
  const payload = {
    app: 'ColumMaster Pro',
    exportDate: new Date().toISOString(),
    version: 1,
    state,
    history,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Importa y valida un archivo JSON de respaldo
 */
export function importStateFromJson(jsonString: string): { state: AppInputsState; history?: HistorySnapshot[] } | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed) return null;

    const rawState = parsed.state || (parsed.loads ? parsed : null);
    if (!rawState) return null;

    const validatedState: AppInputsState = {
      ...DEFAULT_APP_INPUTS_STATE,
      ...rawState,
      projectMetadata: {
        ...DEFAULT_APP_INPUTS_STATE.projectMetadata,
        ...(rawState.projectMetadata || {}),
      },
      loads: {
        ...DEFAULT_APP_INPUTS_STATE.loads,
        ...(rawState.loads || {}),
      },
      concreteGeom: {
        ...DEFAULT_APP_INPUTS_STATE.concreteGeom,
        ...(rawState.concreteGeom || {}),
      },
      tieDesign: {
        ...DEFAULT_APP_INPUTS_STATE.tieDesign,
        ...(rawState.tieDesign || {}),
      },
    };

    const validatedHistory = Array.isArray(parsed.history) ? parsed.history : undefined;

    return {
      state: validatedState,
      history: validatedHistory,
    };
  } catch (err) {
    console.error('[Import] JSON inválido:', err);
    return null;
  }
}
