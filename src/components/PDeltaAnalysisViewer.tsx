/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PDeltaSlendernessAnalysis } from '../engine/pDeltaEngine';

interface PDeltaAnalysisViewerProps {
  analysis: PDeltaSlendernessAnalysis;
  onUpdateColLength?: (newL: number) => void;
  onUpdateK?: (newKx: number, newKy: number) => void;
}

export const PDeltaAnalysisViewer: React.FC<PDeltaAnalysisViewerProps> = ({
  analysis,
  onUpdateColLength,
  onUpdateK,
}) => {
  const [activeVisualMode, setActiveVisualMode] = useState<'capacity_curve' | 'pm_jump' | 'physical_deflection'>('capacity_curve');
  const [hoveredPoint, setHoveredPoint] = useState<{ lambda: number; phiPn: number; deltaNs: number; loss: number } | null>(null);

  // Estados locales para simulación interactiva rápida
  const [simLength, setSimLength] = useState<number>(analysis.colLengthM);
  const [simK, setSimK] = useState<number>(analysis.kEffective);
  const isSimulationActive = simLength !== analysis.colLengthM || simK !== analysis.kEffective;

  // Recálculo rápido de esbeltez simulada
  const rMin = Math.max(1, Math.min(Number.isFinite(analysis?.rxMm) ? analysis.rxMm : 100, Number.isFinite(analysis?.ryMm) ? analysis.ryMm : 100));
  const simSlenderness = Number(((simK * simLength * 1000) / rMin).toFixed(1));
  const simIsSlender = simSlenderness > (analysis?.slendernessLimit || 22);
  const simPc = (Math.PI * Math.PI * Math.max(10, analysis?.EIeffKNm2 || 1000)) / Math.max(0.01, Math.pow(simK * simLength, 2));
  const simStabRatio = Math.abs(analysis?.pmTrajectory?.firstOrderPoint?.P || 0) / (0.75 * Math.max(1, simPc));
  const simDeltaNs = simIsSlender
    ? Number(Math.min(3.5, 1.0 / Math.max(0.05, 1 - Math.min(0.92, simStabRatio))).toFixed(2))
    : 1.0;

  // Dimensiones SVG
  const svgWidth = 620;
  const svgHeight = 360;
  const pad = { top: 30, right: 35, bottom: 45, left: 65 };
  const graphW = svgWidth - pad.left - pad.right;
  const graphH = svgHeight - pad.top - pad.bottom;

  // Valores seguros
  const safePureKN = Number.isFinite(analysis?.phiPnPureKN) && analysis.phiPnPureKN > 0 ? analysis.phiPnPureKN : 1000;
  const safeEffKN = Number.isFinite(analysis?.phiPnEffectiveKN) && analysis.phiPnEffectiveKN > 0 ? analysis.phiPnEffectiveKN : safePureKN;
  const safeGovSlender = Number.isFinite(analysis?.governingSlenderness) ? analysis.governingSlenderness : 20;

  // Escalas para Curva de Capacidad vs Esbeltez
  const validLambdas = (analysis?.slendernessCapacityCurve || []).map((c) => c.lambda).filter(Number.isFinite);
  const maxLambda = Math.max(160, ...validLambdas);

  const validCaps = (analysis?.slendernessCapacityCurve || []).map((c) => c.phiPn1stKN).filter(Number.isFinite);
  const maxCap = Math.max(safePureKN * 1.15, ...validCaps, 100);

  const scaleX = (lam: number) => {
    const val = Number.isFinite(lam) ? lam : 0;
    return pad.left + (val / Math.max(1, maxLambda)) * graphW;
  };
  const scaleY = (cap: number) => {
    const val = Number.isFinite(cap) ? cap : 0;
    return pad.top + graphH - (val / Math.max(1, maxCap)) * graphH;
  };

  // Trayectoria de curva 1er Orden y 2do Orden
  const path1stOrder = (analysis?.slendernessCapacityCurve || [])
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.lambda).toFixed(1)} ${scaleY(pt.phiPn1stKN).toFixed(1)}`)
    .join(' ');

  const path2ndOrder = (analysis?.slendernessCapacityCurve || [])
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(pt.lambda).toFixed(1)} ${scaleY(pt.phiPn2ndKN).toFixed(1)}`)
    .join(' ');

  // Área sombreada de degradación entre 1er orden y 2do orden
  const reverse2nd = [...(analysis?.slendernessCapacityCurve || [])].reverse();
  const areaLossPath = `${path1stOrder} ${reverse2nd
    .map((pt) => `L ${scaleX(pt.lambda).toFixed(1)} ${scaleY(pt.phiPn2ndKN).toFixed(1)}`)
    .join(' ')} Z`;

  // Escalas para Diagrama P-M con salto P-Delta
  const validM = (analysis?.pmTrajectory?.designCurve || []).map((p) => p.M).filter(Number.isFinite);
  const validP = (analysis?.pmTrajectory?.designCurve || []).map((p) => p.P).filter(Number.isFinite);

  const safeMc = Number.isFinite(analysis?.McKNm) ? analysis.McKNm : 100;
  const maxM_PM = Math.max(safeMc * 1.35, ...validM, 50);
  const maxP_PM = Math.max(safePureKN * 1.1, ...validP, 100);

  const scaleM_PM = (m: number) => {
    const val = Number.isFinite(m) ? m : 0;
    return pad.left + (val / Math.max(1, maxM_PM)) * graphW;
  };
  const scaleP_PM = (p: number) => {
    const val = Number.isFinite(p) ? p : 0;
    return pad.top + graphH - (val / Math.max(1, maxP_PM)) * graphH;
  };

  const pathDesignPM = (analysis?.pmTrajectory?.designCurve || [])
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleM_PM(pt.M).toFixed(1)} ${scaleP_PM(pt.P).toFixed(1)}`)
    .join(' ');

  const pathNominalPM = (analysis?.pmTrajectory?.nominalCurve || [])
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleM_PM(pt.M).toFixed(1)} ${scaleP_PM(pt.P).toFixed(1)}`)
    .join(' ');

  return (
    <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 md:p-6 shadow-2xl space-y-5 text-slate-200 font-mono text-xs">
      {/* 1. CABECERA PRINCIPAL Y DICTAMEN DE ESBELTEZ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-bold text-base shadow-md">
              📐
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Influencia de Efectos P-Delta y Esbeltez
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    !analysis.isSlender
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : analysis.governingSlenderness > 90
                      ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                  }`}
                >
                  {analysis.classification}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans">
                Análisis de segundo orden ($P-\delta$ interno y $P-\Delta$ global) según {analysis.standard}.
              </p>
            </div>
          </div>
        </div>

        {/* Indicador de esbeltez λ actual */}
        <div className="flex items-center gap-3 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400">Esbeltez Máxima (λ):</div>
            <div className="text-base font-bold text-white flex items-center gap-1">
              <span className={analysis.isSlender ? 'text-amber-400' : 'text-emerald-400'}>
                {analysis.governingSlenderness.toFixed(1)}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                / Límite {analysis.slendernessLimit}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400">Factor Amplificador (δns):</div>
            <div className="text-base font-bold text-cyan-300">
              {analysis.deltaNs.toFixed(2)}
              <span className="text-[10px] text-slate-400 ml-1">
                ({analysis.momentIncreasePct > 0 ? `+${analysis.momentIncreasePct}%` : 'Sin cambio'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TARJETAS DE INDICADORES CLAVE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Carga Euler (Pc)</div>
          <div className="text-sm font-bold text-cyan-300">{Math.round(analysis.PcEulerKN)} kN</div>
          <div className="text-[10px] text-slate-500">
            Uso estabilidad: <strong className={analysis.stabilityMarginPct > 75 ? 'text-rose-400' : 'text-slate-300'}>{analysis.stabilityMarginPct}%</strong>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Momento 1er → 2do Ord.</div>
          <div className="text-sm font-bold text-amber-300">
            {analysis.governingM0KNm.toFixed(1)} → {analysis.McKNm.toFixed(1)} kN·m
          </div>
          <div className="text-[10px] text-amber-400/90 font-bold">
            ΔM = +{analysis.deltaMKNm.toFixed(1)} kN·m (+{analysis.momentIncreasePct}%)
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Capacidad Axial φPn</div>
          <div className="text-sm font-bold text-slate-200">
            {Math.round(analysis.phiPnPureKN)} → {Math.round(analysis.phiPnEffectiveKN)} kN
          </div>
          <div className="text-[10px] text-rose-400 font-bold">
            Pérdida por P-Δ: -{analysis.axialCapacityLossPct}%
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Impacto en DCR Global</div>
          <div className="text-sm font-bold flex items-center gap-1.5">
            <span className="text-slate-400">{(analysis.dcr1stOrder * 100).toFixed(1)}%</span>
            <span>→</span>
            <span className={analysis.dcr2ndOrder <= 1.0 ? 'text-emerald-400' : 'text-rose-400'}>
              {(analysis.dcr2ndOrder * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            ΔDCR = +{(analysis.dcrDelta * 100).toFixed(1)}% ({analysis.dcr2ndOrder <= 1.0 ? 'Cumple' : 'Sobrecarga'})
          </div>
        </div>
      </div>

      {/* 3. BARRA DE SELECCIÓN DE VISTA TÉCNICA */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveVisualMode('capacity_curve')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeVisualMode === 'capacity_curve'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📉 Curva φPn vs Esbeltez (λ)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveVisualMode('pm_jump')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeVisualMode === 'pm_jump'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎯 Salto P-Delta en Diagrama P-M</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveVisualMode('physical_deflection')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeVisualMode === 'physical_deflection'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📏 Mecánica Física P-δ vs P-Δ</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-sans hidden sm:block">
          {activeVisualMode === 'capacity_curve' && 'Evolución de resistencia frente al pandeo'}
          {activeVisualMode === 'pm_jump' && 'Desplazamiento del punto de solicitación hacia la falla'}
          {activeVisualMode === 'physical_deflection' && 'Componentes de curvatura interna y desplazamiento'}
        </div>
      </div>

      {/* 4. CANVAS GRÁFICO INTERACTIVO */}
      <div className="bg-slate-950 rounded-xl border border-slate-800/90 p-3 relative overflow-hidden">
        {/* VISTA 1: CURVA DE CAPACIDAD vs ESBELTEZ */}
        {activeVisualMode === 'capacity_curve' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block border-t border-dashed" />
                  Capacidad Teórica 1er Orden (Sin P-Δ)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-amber-400 inline-block rounded-full" />
                  Capacidad Real con Efectos P-Delta
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-500/20 border border-rose-500/40 inline-block rounded" />
                  Pérdida por Pandeo / P-Δ
                </span>
              </div>
              <span className="text-slate-500 font-mono">Pasa el cursor sobre la gráfica</span>
            </div>

            <div className="relative w-full overflow-x-auto flex justify-center">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full max-w-[620px] h-auto select-none bg-slate-900/60 rounded-lg border border-slate-800"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  {/* Gradiente de pérdida de capacidad */}
                  <linearGradient id="pDeltaLossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Grilla y ejes */}
                <g stroke="#1e293b" strokeWidth="1">
                  {/* Eje Y (Capacidad kN) */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const capVal = (i / 5) * maxCap;
                    const y = scaleY(capVal);
                    return (
                      <g key={`y-grid-${i}`}>
                        <line x1={pad.left} y1={y} x2={svgWidth - pad.right} y2={y} strokeDasharray="3 3" />
                        <text x={pad.left - 8} y={y + 4} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                          {Math.round(capVal)} kN
                        </text>
                      </g>
                    );
                  })}

                  {/* Eje X (Esbeltez lambda) */}
                  {Array.from({ length: 7 }).map((_, j) => {
                    const lamVal = (j / 6) * maxLambda;
                    const x = scaleX(lamVal);
                    return (
                      <g key={`x-grid-${j}`}>
                        <line x1={x} y1={pad.top} x2={x} y2={pad.top + graphH} strokeDasharray="3 3" />
                        <text x={x} y={pad.top + graphH + 16} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                          λ={Math.round(lamVal)}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Zona de Columna Corta vs Columna Esbelta */}
                <rect
                  x={pad.left}
                  y={pad.top}
                  width={scaleX(analysis.slendernessLimit) - pad.left}
                  height={graphH}
                  fill="#10b981"
                  fillOpacity="0.04"
                />
                <line
                  x1={scaleX(analysis.slendernessLimit)}
                  y1={pad.top}
                  x2={scaleX(analysis.slendernessLimit)}
                  y2={pad.top + graphH}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={scaleX(analysis.slendernessLimit) - 6}
                  y={pad.top + 14}
                  fill="#10b981"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                  fontWeight="bold"
                >
                  Límite Corta (λ={analysis.slendernessLimit})
                </text>

                {/* Sombreado de pérdida de capacidad por P-Delta */}
                <path d={areaLossPath} fill="url(#pDeltaLossGrad)" />

                {/* Curva 1er Orden (Azul discontinua) */}
                <path d={path1stOrder} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 4" opacity="0.8" />

                {/* Curva 2do Orden (Ámbar continua) */}
                <path d={path2ndOrder} fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />

                {/* Demanda axial actual Pu (Línea horizontal roja discontinua) */}
                <line
                  x1={pad.left}
                  y1={scaleY(Math.abs(analysis.pmTrajectory.firstOrderPoint.P))}
                  x2={svgWidth - pad.right}
                  y2={scaleY(Math.abs(analysis.pmTrajectory.firstOrderPoint.P))}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  opacity="0.75"
                />
                <text
                  x={svgWidth - pad.right}
                  y={scaleY(Math.abs(analysis.pmTrajectory.firstOrderPoint.P)) - 4}
                  fill="#f87171"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  Pu = {Math.round(Math.abs(analysis.pmTrajectory.firstOrderPoint.P))} kN
                </text>

                {/* PUNTO DE OPERACIÓN ACTUAL DE LA COLUMNA */}
                {(() => {
                  const currentX = scaleX(safeGovSlender);
                  const currentY = scaleY(safeEffKN);
                  const pureY = scaleY(safePureKN);

                  return (
                    <g>
                      {/* Línea vertical de caída */}
                      <line
                        x1={currentX}
                        y1={pad.top + graphH}
                        x2={currentX}
                        y2={currentY}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />

                      {/* Flecha de pérdida vertical entre 1er orden y 2do orden */}
                      {Math.abs(pureY - currentY) > 8 && (
                        <g>
                          <line x1={currentX} y1={pureY} x2={currentX} y2={currentY} stroke="#f43f5e" strokeWidth="2.5" />
                          <circle cx={currentX} cy={pureY} r="3" fill="#38bdf8" />
                          <text
                            x={currentX + 8}
                            y={(pureY + currentY) / 2 + 3}
                            fill="#f43f5e"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            -{analysis.axialCapacityLossPct || 0}%
                          </text>
                        </g>
                      )}

                      {/* Halo pulsante sobre el punto de operación */}
                      <circle cx={currentX} cy={currentY} r="8" fill="#f59e0b" fillOpacity="0.25" className="animate-ping" />
                      <circle cx={currentX} cy={currentY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.8" />

                      {/* Caja de etiqueta flotante */}
                      <g transform={`translate(${Math.min(svgWidth - 170, Math.max(pad.left + 10, currentX - 60))}, ${Math.max(pad.top + 10, currentY - 32)})`}>
                        <rect x="0" y="0" width="135" height="24" rx="5" fill="#020617" stroke="#f59e0b" strokeWidth="1.2" opacity="0.95" />
                        <text x="6" y="15" fill="#fde68a" fontSize="9" fontFamily="monospace" fontWeight="bold">
                          λ={safeGovSlender.toFixed(1)} | φPn={Math.round(safeEffKN)} kN
                        </text>
                      </g>
                    </g>
                  );
                })()}

                {/* Línea de mouse hover interactivo */}
                {analysis.slendernessCapacityCurve.map((pt, idx) => {
                  const px = scaleX(pt.lambda);
                  return (
                    <rect
                      key={`hit-${idx}`}
                      x={px - 8}
                      y={pad.top}
                      width={16}
                      height={graphH}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          lambda: pt.lambda,
                          phiPn: pt.phiPn2ndKN,
                          deltaNs: pt.deltaNs,
                          loss: pt.capacityLossPct,
                        })
                      }
                    />
                  );
                })}

                {/* Tooltip de punto inspeccionado */}
                {hoveredPoint && (
                  <g transform={`translate(${scaleX(hoveredPoint.lambda)}, ${scaleY(hoveredPoint.phiPn)})`}>
                    <circle r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                    <rect
                      x={hoveredPoint.lambda > maxLambda / 2 ? -135 : 10}
                      y="-35"
                      width="125"
                      height="32"
                      rx="4"
                      fill="#090d16"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x={hoveredPoint.lambda > maxLambda / 2 ? -128 : 17}
                      y="-22"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      λ = {hoveredPoint.lambda} | φPn = {hoveredPoint.phiPn} kN
                    </text>
                    <text
                      x={hoveredPoint.lambda > maxLambda / 2 ? -128 : 17}
                      y="-10"
                      fill="#f43f5e"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      δns={hoveredPoint.deltaNs} (Pérdida -{hoveredPoint.loss}%)
                    </text>
                  </g>
                )}

                {/* Título de eje X y Y */}
                <text
                  x={pad.left + graphW / 2}
                  y={svgHeight - 10}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  Grado de Esbeltez Mecánica λ = k·L / r
                </text>
                <text
                  x={pad.left + 5}
                  y={pad.top - 12}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  Capacidad Axial φPn (kN)
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* VISTA 2: SALTO P-DELTA EN DIAGRAMA P-M */}
        {activeVisualMode === 'pm_jump' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  Demanda 1er Orden (M0, Pu)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-gradient-to-r from-cyan-400 to-amber-400 inline-block" />
                  Vector Salto P-Delta (ΔM = Pu·Δ)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  Demanda Final 2do Orden (Mc, Pu)
                </span>
              </div>
              <span className="text-amber-400 font-bold">
                Consumo de Capacidad por P-Δ: +{(analysis.dcrDelta * 100).toFixed(1)}% DCR
              </span>
            </div>

            <div className="relative w-full overflow-x-auto flex justify-center">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full max-w-[620px] h-auto select-none bg-slate-900/60 rounded-lg border border-slate-800"
              >
                <defs>
                  {/* Flecha para el vector de desplazamiento P-Delta */}
                  <marker id="arrowPDelta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                  </marker>
                </defs>

                {/* Grilla y ejes */}
                <g stroke="#1e293b" strokeWidth="1">
                  {/* Eje P */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const pVal = (i / 5) * maxP_PM;
                    const y = scaleP_PM(pVal);
                    return (
                      <g key={`pm-y-${i}`}>
                        <line x1={pad.left} y1={y} x2={svgWidth - pad.right} y2={y} strokeDasharray="3 3" />
                        <text x={pad.left - 8} y={y + 4} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                          {Math.round(pVal)} kN
                        </text>
                      </g>
                    );
                  })}

                  {/* Eje M */}
                  {Array.from({ length: 6 }).map((_, j) => {
                    const mVal = (j / 5) * maxM_PM;
                    const x = scaleM_PM(mVal);
                    return (
                      <g key={`pm-x-${j}`}>
                        <line x1={x} y1={pad.top} x2={x} y2={pad.top + graphH} strokeDasharray="3 3" />
                        <text x={x} y={pad.top + graphH + 16} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                          {Math.round(mVal)} kNm
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Envolvente Nominal Pn - Mn */}
                {pathNominalPM && (
                  <path d={pathNominalPM} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
                )}

                {/* Envolvente de Diseño phiPn - phiMn */}
                {pathDesignPM && (
                  <path d={pathDesignPM} fill="#10b981" fillOpacity="0.06" stroke="#10b981" strokeWidth="2.5" />
                )}

                {/* VECTOR Y PUNTOS DE SALTO P-DELTA */}
                {(() => {
                  const pt1 = analysis?.pmTrajectory?.firstOrderPoint || { M: 0, P: 0 };
                  const pt2 = analysis?.pmTrajectory?.secondOrderPoint || { M: 0, P: 0 };
                  const safePt1M = Number.isFinite(pt1.M) ? pt1.M : 0;
                  const safePt1P = Number.isFinite(pt1.P) ? pt1.P : 0;
                  const safePt2M = Number.isFinite(pt2.M) ? pt2.M : 0;
                  const safePt2P = Number.isFinite(pt2.P) ? pt2.P : 0;
                  const x1 = scaleM_PM(safePt1M);
                  const y1 = scaleP_PM(safePt1P);
                  const x2 = scaleM_PM(safePt2M);
                  const y2 = scaleP_PM(safePt2P);

                  return (
                    <g>
                      {/* Vector P-Delta con flecha */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#f59e0b"
                        strokeWidth="3"
                        markerEnd="url(#arrowPDelta)"
                      />

                      {/* Punto 1er Orden */}
                      <circle cx={x1} cy={y1} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      <text x={x1} y={y1 - 10} fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                        1er Ord: {safePt1M.toFixed(1)} kN·m
                      </text>

                      {/* Punto 2do Orden */}
                      <circle cx={x2} cy={y2} r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                      <text x={x2} y={y2 - 12} fill="#fde68a" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                        2do Ord (Mc): {safePt2M.toFixed(1)} kN·m
                      </text>

                      {/* Rótulo del incremento ΔM */}
                      <text
                        x={(x1 + x2) / 2}
                        y={Math.min(svgHeight - 20, y1 + 18)}
                        fill="#f59e0b"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        +ΔM = {(analysis?.deltaMKNm || 0).toFixed(1)} kN·m ({(analysis?.momentIncreasePct || 0) > 0 ? `+${analysis.momentIncreasePct}%` : '0%'})
                      </text>
                    </g>
                  );
                })()}

                {/* Títulos */}
                <text
                  x={pad.left + graphW / 2}
                  y={svgHeight - 10}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  Momento Flector Mayorado Mu (kN·m)
                </text>
                <text
                  x={pad.left + 5}
                  y={pad.top - 12}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  Carga Axial Pu (kN)
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* VISTA 3: MECÁNICA FÍSICA P-pequeña-delta vs P-gran-Delta */}
        {activeVisualMode === 'physical_deflection' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Diagrama esquemático en corte de la columna deformada */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
              <div className="text-[11px] font-bold text-slate-300 mb-2">
                Cinemática de Deformación de la Columna
              </div>

              <svg viewBox="0 0 280 260" className="w-full max-w-[280px] h-auto bg-slate-950/60 rounded border border-slate-800">
                {/* Apoyo inferior articulado */}
                <polygon points="100,230 110,245 90,245" fill="#64748b" />
                <line x1="85" y1="245" x2="115" y2="245" stroke="#94a3b8" strokeWidth="2" />

                {/* Eje recto original no deformado */}
                <line x1="100" y1="30" x2="100" y2="230" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* Curva deformada viga-columna (con pequeña delta y gran Delta) */}
                <path
                  d="M 100 230 Q 155 130 145 30"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Apoyo superior desplazado */}
                <circle cx="145" cy="30" r="4" fill="#38bdf8" />

                {/* Carga axial Pu en cabeza */}
                <line x1="145" y1="8" x2="145" y2="28" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRed)" />
                <text x="145" y="6" fill="#f87171" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  Pu = {Math.round(Math.abs(analysis.pmTrajectory.firstOrderPoint.P))} kN
                </text>

                {/* Cota de Desplazamiento Lateral P-Gran-Delta (Δ) */}
                <line x1="100" y1="30" x2="145" y2="30" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="122" y="44" fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  Δ = {analysis.deltaBigMm} mm
                </text>

                {/* Cota de Curvatura Interna P-pequeña-delta (δ) */}
                <line x1="100" y1="130" x2="135" y2="130" stroke="#ec4899" strokeWidth="1.5" />
                <text x="142" y="133" fill="#ec4899" fontSize="9" fontFamily="monospace" textAnchor="start">
                  δ = {analysis.deltaSmallMm} mm
                </text>

                {/* Flecha total en centro */}
                <text x="100" y="220" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="end">
                  Base (z=0)
                </text>
                <text x="160" y="35" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                  Cabeza (z=L)
                </text>
              </svg>

              <div className="mt-2 text-[10px] text-slate-400 text-center font-sans">
                Excentricidad total del esfuerzo axial: <strong className="text-white">e_tot = e₀ + δ + Δ</strong>
              </div>
            </div>

            {/* Explicación cuantitativa y despiece */}
            <div className="space-y-2.5">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-bold text-cyan-300 flex items-center justify-between">
                  <span>Efecto P-δ (Pequeña Delta - Curvatura del Elemento)</span>
                  <span className="text-[10px] bg-cyan-950 px-2 py-0.5 rounded text-cyan-300 border border-cyan-800">
                    δ = {analysis.deltaSmallMm} mm
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Provocado por la flexión a lo largo del fuste de la columna entre sus nudos de apoyo. La carga axial actúa sobre la deformada interna generando un momento adicional flector:
                  <code className="text-cyan-300 block font-mono mt-1">M_δ = Pu · δ ≈ {(Math.abs(analysis.pmTrajectory.firstOrderPoint.P) * (analysis.deltaSmallMm / 1000)).toFixed(1)} kN·m</code>
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                  <span>Efecto P-Δ (Gran Delta - Desplazamiento Lateral de Entrepiso)</span>
                  <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded text-amber-300 border border-amber-800">
                    Δ = {analysis.deltaBigMm} mm
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Generado por el desplazamiento lateral de los extremos de la columna (deriva sísmica o eólica). Se magnifica en marcos no arriostrados o traslacionales (sway):
                  <code className="text-amber-300 block font-mono mt-1">M_Δ = Pu · Δ ≈ {(Math.abs(analysis.pmTrajectory.firstOrderPoint.P) * (analysis.deltaBigMm / 1000)).toFixed(1)} kN·m</code>
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>Momento flector nominal de 1er orden (M0):</span>
                  <strong className="text-white">{analysis.governingM0KNm.toFixed(1)} kN·m</strong>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Incremento por segundo orden (+ΔM):</span>
                  <strong>+{analysis.deltaMKNm.toFixed(1)} kN·m (+{analysis.momentIncreasePct}%)</strong>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-1">
                  <span>Momento total amplificado de cálculo (Mc):</span>
                  <span>{analysis.McKNm.toFixed(1)} kN·m</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. SIMULADOR INTERACTIVO DE SENSIBILIDAD A LA ESBELTEZ */}
      <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">⚡ Simulador de Sensibilidad</span>
            <span className="text-[11px] text-slate-400 font-sans">
              Explora cómo varía la amplificación P-Delta al modificar la altura libre o condiciones de apoyo
            </span>
          </div>

          {isSimulationActive && (
            <button
              type="button"
              onClick={() => {
                setSimLength(analysis.colLengthM);
                setSimK(analysis.kEffective);
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold"
            >
              Restablecer a valores de proyecto
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Slider Altura L */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Longitud no arriostrada (L):</span>
              <strong className="text-cyan-300">{simLength.toFixed(1)} m</strong>
            </div>
            <input
              type="range"
              min="1.5"
              max="7.0"
              step="0.1"
              value={simLength}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSimLength(val);
                if (onUpdateColLength) onUpdateColLength(val);
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>1.5m (Muy rígida)</span>
              <span>4.0m (Estándar)</span>
              <span>7.0m (Gran altura)</span>
            </div>
          </div>

          {/* Slider Factor de longitud efectiva K */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300">Factor de Longitud Efectiva (K):</span>
              <strong className="text-amber-300">{simK.toFixed(2)}</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.1"
              step="0.05"
              value={simK}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSimK(val);
                if (onUpdateK) onUpdateK(val, val);
              }}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>0.5 (Empotrado-Empotrado)</span>
              <span>1.0 (Biarticulado)</span>
              <span>2.0 (Ménsula / Voladizo)</span>
            </div>
          </div>
        </div>

        {/* Resumen dinámico de la simulación */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div>
            <span className="text-slate-400">Esbeltez resultante: </span>
            <strong className={simIsSlender ? 'text-amber-300' : 'text-emerald-400'}>
              λ = {simSlenderness} ({simIsSlender ? 'Esbelta' : 'Corta'})
            </strong>
          </div>
          <div>
            <span className="text-slate-400">Amplificador P-Δ simulado: </span>
            <strong className={simDeltaNs > 1.3 ? 'text-rose-400' : 'text-cyan-300'}>
              δns = {simDeltaNs}
            </strong>
          </div>
          <div>
            <span className="text-slate-400">Carga Crítica Pc: </span>
            <strong className="text-slate-200">{Math.round(simPc)} kN</strong>
          </div>
        </div>
      </div>

      {/* 6. AUDITORÍA Y JUSTIFICACIÓN NORMATIVA (PASOS DE CÁLCULO) */}
      <div className="space-y-2.5">
        <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
          <span>Auditoría de Requisitos Normativos de Segundo Orden ({analysis.standard})</span>
          <span className="text-[10px] text-slate-400">Verificaciones de Pandeo y Bifurcación</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.normativeSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border space-y-1.5 ${
                step.status === 'OK'
                  ? 'bg-slate-900/70 border-slate-800'
                  : step.status === 'WARNING'
                  ? 'bg-amber-950/20 border-amber-800/50'
                  : 'bg-rose-950/25 border-rose-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">{step.title}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    step.status === 'OK'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : step.status === 'WARNING'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {step.status}
                </span>
              </div>

              <div className="text-[10px] text-cyan-400/90 font-mono flex items-center justify-between">
                <span>{step.codeRef}</span>
                <span className="text-slate-400 font-sans">{step.formula}</span>
              </div>

              <div className="bg-slate-950/80 p-1.5 rounded font-mono text-[10px] text-slate-200 border border-slate-800/70">
                {step.value}
              </div>

              <p className="text-[10px] text-slate-400 font-sans">{step.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
