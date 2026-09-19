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
  verifyTiesForCombinedBars,
  CombinedBarsTieVerificationResult,
} from '../engine/combinedBarsTieEngine';
import { CadSectionViewer } from './CadSectionViewer';
import { CadElevationViewer } from './CadElevationViewer';

interface TieValidationViewerProps {
  geom: ConcreteGeometry;
  onUpdateGeom: (geom: ConcreteGeometry) => void;
  bars: RebarBar[];
  tieDesign: ConcreteTieDesign;
  onUpdateTieDesign: (ties: ConcreteTieDesign) => void;
  standard: DesignStandard;
  fc?: number;
  colLengthM?: number;
  Pu_kN?: number;
  onOpenCombinedBarsModal?: () => void;
}

export const TieValidationViewer: React.FC<TieValidationViewerProps> = ({
  geom,
  onUpdateGeom,
  bars,
  tieDesign,
  onUpdateTieDesign,
  standard,
  fc = 25,
  colLengthM = 3.0,
  Pu_kN = 600,
  onOpenCombinedBarsModal,
}) => {
  const [viewMode, setViewMode] = useState<'section' | 'elevation' | 'both'>('both');

  // Ejecutar verificación rigurosa de estribos y confinamiento
  const verification: CombinedBarsTieVerificationResult = verifyTiesForCombinedBars(
    geom,
    bars,
    tieDesign,
    standard,
    fc,
    420,
    Pu_kN
  );

  // Helper para aplicar solución automática en 1 clic
  const handleApplyOptimalTie = () => {
    if (verification.solutions && verification.solutions.length > 0) {
      const best = verification.solutions[0];
      onUpdateTieDesign({
        ...tieDesign,
        ...best.proposedTieDesign,
      });
    } else {
      // Fallback a diseño normativo estándar
      onUpdateTieDesign({
        ...tieDesign,
        diameter: Math.max(10, tieDesign.diameter),
        s0: Math.min(100, Math.round(geom.b / 4)),
        sMid: Math.min(200, Math.round(geom.b / 2)),
        l0: Math.max(600, Math.round(Math.max(geom.b, geom.h, (colLengthM * 1000) / 6))),
        patternType: bars.length > 4 ? 'perimeter_crossties' : 'perimeter_only',
        legsX: bars.length > 4 ? 3 : 2,
        legsY: bars.length > 4 ? 3 : 2,
        hookAngle: 135,
        hookLength: Math.max(80, 6 * tieDesign.diameter),
      });
    }
  };

  const pattern = tieDesign.patternType || 'perimeter_only';

  return (
    <div className="space-y-4">
      {/* Banner Principal de Estado de Estribos */}
      <div
        className={`p-4 rounded-xl border font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-xl transition-all ${
          verification.allChecksPassed
            ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
            : 'bg-rose-950/40 border-rose-600/50 text-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
              verification.allChecksPassed ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white animate-pulse'
            }`}
          >
            {verification.allChecksPassed ? '✓' : '!'}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>
                {verification.allChecksPassed
                  ? 'VALIDACIÓN DE ESTRIBOS: CUMPLE TOTALMENTE NORMATIVA'
                  : 'VALIDACIÓN DE ESTRIBOS: DETECTADOS INCUMPLIMIENTOS'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-cyan-300">
                {standard === 'ACI_318_19' ? 'ACI 318-19 Cap. 18/25' : standard === 'NC_450_2006' ? 'NC 450:2006 Cap. 8' : 'Eurocódigo 2 §9.5'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              {verification.summaryText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!verification.allChecksPassed && (
            <button
              onClick={handleApplyOptimalTie}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <span>⚡ Ajustar Automáticamente (1 Clic)</span>
            </button>
          )}

          {onOpenCombinedBarsModal && (
            <button
              onClick={onOpenCombinedBarsModal}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition border border-slate-700 cursor-pointer"
            >
              🔍 Diagnóstico Detallado
            </button>
          )}
        </div>
      </div>

      {/* Controles Interactivos de Edición Rápida de Estribos */}
      <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Parámetros y Detallado Sísmico de Cercos
            </h4>
          </div>

          {/* Selector de Vista Gráfica */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setViewMode('section')}
              className={`px-2.5 py-1 rounded transition ${
                viewMode === 'section' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sección Transversal
            </button>
            <button
              onClick={() => setViewMode('elevation')}
              className={`px-2.5 py-1 rounded transition ${
                viewMode === 'elevation' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Elevación Longitudinal
            </button>
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded transition ${
                viewMode === 'both' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ambas Vistas
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          {/* Diámetro de Estribo */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <label className="text-[10px] text-slate-400 block">Diámetro Cerco (db)</label>
            <select
              value={tieDesign.diameter}
              onChange={(e) =>
                onUpdateTieDesign({ ...tieDesign, diameter: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value={8}>Ø8 mm (#2.5)</option>
              <option value={10}>Ø10 mm (#3)</option>
              <option value={12}>Ø12 mm (#4)</option>
              <option value={16}>Ø16 mm (#5)</option>
            </select>
          </div>

          {/* Espaciamiento Confinamiento s0 */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Espac. s0 (l0)</span>
              <span className="text-cyan-400 font-bold">{tieDesign.s0} mm</span>
            </div>
            <select
              value={tieDesign.s0}
              onChange={(e) =>
                onUpdateTieDesign({ ...tieDesign, s0: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value={50}>50 mm (2")</option>
              <option value={75}>75 mm (3")</option>
              <option value={100}>100 mm (4")</option>
              <option value={125}>125 mm (5")</option>
              <option value={150}>150 mm (6")</option>
              <option value={200}>200 mm (8")</option>
            </select>
          </div>

          {/* Espaciamiento Central sMid */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Espac. Central sMid</span>
              <span className="text-cyan-400 font-bold">{tieDesign.sMid} mm</span>
            </div>
            <select
              value={tieDesign.sMid}
              onChange={(e) =>
                onUpdateTieDesign({ ...tieDesign, sMid: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value={100}>100 mm</option>
              <option value={150}>150 mm</option>
              <option value={200}>200 mm</option>
              <option value={250}>250 mm</option>
              <option value={300}>300 mm</option>
            </select>
          </div>

          {/* Longitud Confinamiento l0 */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Long. l0</span>
              <span className="text-cyan-400 font-bold">{tieDesign.l0} mm</span>
            </div>
            <select
              value={tieDesign.l0}
              onChange={(e) =>
                onUpdateTieDesign({ ...tieDesign, l0: Number(e.target.value) })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value={450}>450 mm</option>
              <option value={500}>500 mm</option>
              <option value={600}>600 mm</option>
              <option value={750}>750 mm</option>
              <option value={900}>900 mm</option>
              <option value={1000}>1000 mm</option>
            </select>
          </div>

          {/* Patrón de Estribado */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <label className="text-[10px] text-slate-400 block">Patrón Estribos</label>
            <select
              value={pattern}
              onChange={(e) =>
                onUpdateTieDesign({
                  ...tieDesign,
                  patternType: e.target.value as TiePatternType,
                  legsX: e.target.value === 'perimeter_only' ? 2 : 3,
                  legsY: e.target.value === 'perimeter_only' ? 2 : 3,
                })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="perimeter_only">Perimetral Simple (2 Ramas)</option>
              <option value="perimeter_crossties">Perimetral + Trabas (Cross-Ties)</option>
              <option value="perimeter_diamond">Perimetral + Rombo</option>
              <option value="overlapping_perimeter">Doble Perimetral (4 Ramas)</option>
            </select>
          </div>

          {/* Ganchos Sísmicos */}
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
            <label className="text-[10px] text-slate-400 block">Gancho Sísmico</label>
            <div className="flex items-center justify-between pt-1">
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold">
                135° (Sísmico)
              </span>
              <span className="text-[10px] text-slate-400">
                ext: {tieDesign.hookLength}mm
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vistas Gráficas CAD: Sección y Elevación */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Renderizado de Sección */}
        {(viewMode === 'section' || viewMode === 'both') && (
          <div className={viewMode === 'both' ? 'lg:col-span-6' : 'lg:col-span-12'}>
            <CadSectionViewer
              material="concrete"
              b={geom.b}
              h={geom.h}
              cover={geom.cover}
              bars={bars}
              ties={tieDesign}
              onOpenCombinedBarsModal={onOpenCombinedBarsModal}
            />
          </div>
        )}

        {/* Renderizado de Elevación */}
        {(viewMode === 'elevation' || viewMode === 'both') && (
          <div className={viewMode === 'both' ? 'lg:col-span-6' : 'lg:col-span-12'}>
            <CadElevationViewer
              material="concrete"
              b={geom.b}
              h={geom.h}
              heightL={colLengthM}
              ties={tieDesign}
            />
          </div>
        )}
      </div>

      {/* Grid de Auditoría de Comprobaciones Normativas */}
      <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h4 className="font-bold text-slate-100">
              Auditoría Normativa de Estribos y Confinamiento
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">
            {verification.checks.filter((c) => c.status === 'OK').length} de {verification.checks.length} comprobaciones conformes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {verification.checks.map((ck) => {
            const isOk = ck.status === 'OK';
            return (
              <div
                key={ck.id}
                className={`p-3 rounded-lg border transition space-y-2 ${
                  isOk
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-rose-950/20 border-rose-800 shadow-md shadow-rose-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-200 text-xs leading-tight">
                    {ck.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isOk
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}
                  >
                    {ck.status} ({ck.codeRef})
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Demanda: <strong className="text-slate-200">{ck.demand}</strong>
                  </span>
                  <span>
                    Límite: <strong className="text-cyan-300">{ck.capacity}</strong>
                  </span>
                </div>

                {/* Barra de ratio DCR */}
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ck.ratio <= 1.0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, ck.ratio * 100))}%` }}
                  />
                </div>

                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  {ck.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
