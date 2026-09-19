/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DeformationProfilePoint } from '../engine/deformationEngine';

interface DeformationMomentChartsProps {
  heightPoints: DeformationProfilePoint[];
  deltaMaxMm: number;
  maxMomentKNm: number;
  deltaNsMagnifier: number;
  criticalEulerLoadKN: number;
  heightL: number;
}

export const DeformationMomentCharts: React.FC<DeformationMomentChartsProps> = ({
  heightPoints,
  deltaMaxMm,
  maxMomentKNm,
  deltaNsMagnifier,
  criticalEulerLoadKN,
  heightL,
}) => {
  const [activeTab, setActiveTab] = useState<'deflection' | 'moment' | 'stress'>('deflection');

  const svgWidth = 560;
  const svgHeight = 320;
  const padding = { top: 25, right: 35, bottom: 45, left: 65 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Valores máximos según la pestaña activa
  let maxVal = 1;
  let unit = '';
  let title = '';
  let color = '#38bdf8';

  const safeHeightL = Number.isFinite(heightL) && heightL > 0 ? heightL : 3.0;

  if (activeTab === 'deflection') {
    const safeDelta = Number.isFinite(deltaMaxMm) ? deltaMaxMm : 0;
    maxVal = Math.max(0.5, safeDelta * 1.25);
    unit = 'mm';
    title = 'Deformada Lateral elástica Δ(z)';
    color = '#38bdf8';
  } else if (activeTab === 'moment') {
    const safeM = Number.isFinite(maxMomentKNm) ? maxMomentKNm : 0;
    maxVal = Math.max(10, safeM * 1.2);
    unit = 'kN·m';
    title = 'Diagrama de Momento Flector M(z) con 2do Orden (P-Δ)';
    color = '#f59e0b';
  } else {
    const validStresses = (heightPoints || []).map((p) => p.stressMPa).filter(Number.isFinite);
    const maxStress = Math.max(...validStresses, 5);
    maxVal = maxStress * 1.2;
    unit = 'MPa';
    title = 'Tensión Máxima en Fibra Extrema σ(z)';
    color = '#ec4899';
  }

  const safeMaxVal = Number.isFinite(maxVal) && maxVal > 0 ? maxVal : 10;

  // Escalas: Eje Y es la altura z (0 en base a L en cabeza)
  const scaleZ = (z: number) => {
    const safeZ = Number.isFinite(z) ? z : 0;
    return padding.top + chartH - (safeZ / safeHeightL) * chartH;
  };
  // Eje X es el valor (deflexión, momento o tensión)
  const scaleVal = (val: number) => {
    const safeV = Number.isFinite(val) ? val : 0;
    return padding.left + (safeV / safeMaxVal) * chartW;
  };

  // Generar path
  const pathD = heightPoints
    .map((pt, idx) => {
      let val = 0;
      if (activeTab === 'deflection') val = pt.deflectionMm;
      else if (activeTab === 'moment') val = pt.momentKNm;
      else val = pt.stressMPa;

      const x = scaleVal(val);
      const y = scaleZ(pt.z);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 relative overflow-hidden shadow-2xl">
      {/* Selector de pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('deflection')}
            className={`px-3 py-1 rounded font-mono text-xs transition ${
              activeTab === 'deflection' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deformación Δ(z)
          </button>
          <button
            onClick={() => setActiveTab('moment')}
            className={`px-3 py-1 rounded font-mono text-xs transition ${
              activeTab === 'moment' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Momento Flector M(z)
          </button>
          <button
            onClick={() => setActiveTab('stress')}
            className={`px-3 py-1 rounded font-mono text-xs transition ${
              activeTab === 'stress' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tensión σ(z)
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Amplificador δns: <strong className="text-amber-400">{deltaNsMagnifier}</strong>
          </span>
          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Pcr Euler: <strong className="text-cyan-400">{criticalEulerLoadKN} kN</strong>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[560px] h-auto select-none bg-slate-900/60 rounded-lg border border-slate-800/80"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grilla y ejes */}
          <g stroke="#1e293b" strokeWidth="1">
            {/* Altura z en eje Y */}
            {Array.from({ length: 6 }).map((_, i) => {
              const zVal = (i / 5) * heightL;
              const yPos = scaleZ(zVal);
              return (
                <g key={`z-grid-${i}`}>
                  <line x1={padding.left} y1={yPos} x2={svgWidth - padding.right} y2={yPos} strokeDasharray="3 3" />
                  <text x={padding.left - 8} y={yPos + 4} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                    z={zVal.toFixed(1)}m
                  </text>
                </g>
              );
            })}

            {/* Valores en eje X */}
            {Array.from({ length: 6 }).map((_, j) => {
              const xVal = (j / 5) * maxVal;
              const xPos = scaleVal(xVal);
              return (
                <g key={`val-grid-${j}`}>
                  <line x1={xPos} y1={padding.top} x2={xPos} y2={padding.top + chartH} strokeDasharray="3 3" />
                  <text x={xPos} y={padding.top + chartH + 16} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    {xVal.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Eje columna vertical neutro (x=0) */}
          <line
            x1={scaleVal(0)}
            y1={padding.top}
            x2={scaleVal(0)}
            y2={padding.top + chartH}
            stroke="#94a3b8"
            strokeWidth="2"
          />

          {/* Área rellena bajo la curva */}
          <path
            d={`${pathD} L ${scaleVal(0)} ${scaleZ(heightL)} L ${scaleVal(0)} ${scaleZ(0)} Z`}
            fill="url(#areaGrad)"
          />

          {/* Curva principal */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />

          {/* Puntos destacados sobre la curva */}
          {heightPoints.map((pt, idx) => {
            let val = 0;
            if (activeTab === 'deflection') val = pt.deflectionMm;
            else if (activeTab === 'moment') val = pt.momentKNm;
            else val = pt.stressMPa;

            if (idx % 4 !== 0 && idx !== Math.floor(heightPoints.length / 2)) return null;

            return (
              <g key={`pt-${idx}`}>
                <circle cx={scaleVal(val)} cy={scaleZ(pt.z)} r="4" fill={color} stroke="#0f172a" strokeWidth="1.5" />
                <text
                  x={scaleVal(val) + 8}
                  y={scaleZ(pt.z) + 3}
                  fill={color}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {val.toFixed(1)} {unit}
                </text>
              </g>
            );
          })}

          {/* Título de eje X */}
          <text
            x={padding.left + chartW / 2}
            y={svgHeight - 10}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {title} ({unit})
          </text>
        </svg>
      </div>

      {/* Rótulos explicativos técnicos */}
      <div className="mt-3 text-xs text-slate-400 font-mono flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
        <span>
          Flecha máxima lateral: <strong className="text-cyan-400">{deltaMaxMm} mm</strong> (L/{Math.round((heightL * 1000) / Math.max(0.1, deltaMaxMm))})
        </span>
        <span>
          Momento de 2do orden Mc: <strong className="text-amber-400">{maxMomentKNm.toFixed(1)} kN·m</strong>
        </span>
      </div>
    </div>
  );
};
