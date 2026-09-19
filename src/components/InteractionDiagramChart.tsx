/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InteractionPoint } from '../types';

interface InteractionDiagramChartProps {
  nominalCurve: InteractionPoint[];
  designCurve: InteractionPoint[];
  Pu: number; // kN
  Mu: number; // kN·m
  Muy?: number; // kN·m
  phiPnMax: number;
  dcr: number;
  isSafe: boolean;
  materialName: string;
}

export const InteractionDiagramChart: React.FC<InteractionDiagramChartProps> = ({
  nominalCurve,
  designCurve,
  Pu,
  Mu,
  Muy = 0,
  phiPnMax,
  dcr,
  isSafe,
  materialName,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ P: number; M: number; label: string } | null>(null);
  const [showBiaxialBresler, setShowBiaxialBresler] = useState(false);

  const svgWidth = 560;
  const svgHeight = 440;
  const padding = { top: 35, right: 35, bottom: 55, left: 65 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Determinar límites de la gráfica con sanitización estricta
  const validNominal = (nominalCurve || []).filter((p) => Number.isFinite(p.M) && Number.isFinite(p.P));
  const validDesign = (designCurve || []).filter((p) => Number.isFinite(p.M) && Number.isFinite(p.P));

  const safeMu = Number.isFinite(Mu) ? Math.abs(Mu) : 0;
  const safeMuy = Number.isFinite(Muy) ? Math.abs(Muy) : 0;
  const safePu = Number.isFinite(Pu) ? Pu : 0;
  const safePhiPnMax = Number.isFinite(phiPnMax) && phiPnMax > 0 ? phiPnMax : 1000;

  const validNominalM = validNominal.map((p) => p.M);
  const validNominalP = validNominal.map((p) => p.P);
  const validDesignM = validDesign.map((p) => p.M);
  const validDesignP = validDesign.map((p) => p.P);

  const maxM_val = Math.max(
    ...validNominalM,
    ...validDesignM,
    safeMu * 1.3,
    50
  );
  const maxP_val = Math.max(
    ...validNominalP,
    ...validDesignP,
    safePu * 1.25,
    safePhiPnMax * 1.1,
    100
  );
  const minP_val = Math.min(
    ...validNominalP,
    ...validDesignP,
    0
  );

  // Escalas seguras contra división por cero o NaN
  const scaleX = (m: number) => {
    const val = Number.isFinite(m) ? m : 0;
    return padding.left + (val / Math.max(1, maxM_val)) * chartW;
  };

  const scaleY = (p: number) => {
    const val = Number.isFinite(p) ? p : 0;
    const rangeP = Math.max(10, maxP_val - minP_val);
    return padding.top + chartH - ((val - minP_val) / rangeP) * chartH;
  };

  // Convertir puntos a comandos SVG Path
  const buildSvgPath = (points: InteractionPoint[]) => {
    const validPts = (points || []).filter((p) => Number.isFinite(p.M) && Number.isFinite(p.P));
    if (!validPts.length) return '';
    return validPts
      .map((pt, idx) => {
        const x = scaleX(pt.M);
        const y = scaleY(pt.P);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const nominalPath = buildSvgPath(validNominal);
  const designPath = buildSvgPath(validDesign);

  // Bresler Biaxial Point aproximado si Muy > 0
  const effectiveMu = Math.sqrt(Math.pow(safeMu, 2) + Math.pow(safeMuy, 2));

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 relative overflow-hidden shadow-2xl">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="font-mono font-semibold text-slate-200 uppercase tracking-wide">
            Diagrama de Interacción P - M ({materialName})
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
              isSafe ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-400' : 'bg-rose-950/80 border border-rose-500/50 text-rose-400 animate-pulse'
            }`}
          >
            DCR = {(dcr * 100).toFixed(1)}% ({isSafe ? 'APTO' : 'FALLA'})
          </span>
        </div>

        {Muy > 0 && (
          <button
            onClick={() => setShowBiaxialBresler(!showBiaxialBresler)}
            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] hover:bg-slate-700 transition"
          >
            {showBiaxialBresler ? 'Ver Mux puro' : 'Ver Biaxial Bresler'}
          </button>
        )}
      </div>

      {/* Canvas SVG */}
      <div className="relative w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[560px] h-auto select-none bg-slate-900/60 rounded-lg border border-slate-800/80"
        >
          <defs>
            <linearGradient id="curveFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grilla técnica y ejes */}
          <g stroke="#1e293b" strokeWidth="1">
            {Array.from({ length: 7 }).map((_, i) => {
              const yVal = minP_val + (i / 6) * (maxP_val - minP_val);
              const yPos = scaleY(yVal);
              return (
                <g key={`grid-y-${i}`}>
                  <line x1={padding.left} y1={yPos} x2={svgWidth - padding.right} y2={yPos} strokeDasharray="3 3" />
                  <text x={padding.left - 8} y={yPos + 4} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                    {Math.round(yVal)} kN
                  </text>
                </g>
              );
            })}

            {Array.from({ length: 6 }).map((_, j) => {
              const xVal = (j / 5) * maxM_val;
              const xPos = scaleX(xVal);
              return (
                <g key={`grid-x-${j}`}>
                  <line x1={xPos} y1={padding.top} x2={xPos} y2={padding.top + chartH} strokeDasharray="3 3" />
                  <text x={xPos} y={padding.top + chartH + 18} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    {Math.round(xVal)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Eje 0 de carga axial si minP_val < 0 */}
          {minP_val < 0 && (
            <line
              x1={padding.left}
              y1={scaleY(0)}
              x2={svgWidth - padding.right}
              y2={scaleY(0)}
              stroke="#475569"
              strokeWidth="1.5"
            />
          )}

          {/* Área sombreada bajo la curva de diseño */}
          <path d={`${designPath} L ${scaleX(0)} ${scaleY(minP_val)} Z`} fill="url(#curveFill)" />

          {/* Curva Nominal Pn - Mn (Línea gris punteada) */}
          <path d={nominalPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />

          {/* Curva de Diseño φPn - φMn (Línea cian brillante) */}
          <path d={designPath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

          {/* Techo de compresión máxima axial φPn,max */}
          <line
            x1={scaleX(0)}
            y1={scaleY(safePhiPnMax)}
            x2={scaleX(maxM_val * 0.4)}
            y2={scaleY(safePhiPnMax)}
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="4 2"
          />
          <text
            x={scaleX(maxM_val * 0.42)}
            y={scaleY(safePhiPnMax) + 3}
            fill="#f59e0b"
            fontSize="9"
            fontFamily="monospace"
          >
            Límite φPn,max = {Math.round(safePhiPnMax)} kN
          </text>

          {/* Punto de Demanda Actual (Pu, Mu) */}
          <g>
            {/* Cruz de coordenadas */}
            <line
              x1={scaleX(safeMu)}
              y1={padding.top}
              x2={scaleX(safeMu)}
              y2={padding.top + chartH}
              stroke={isSafe ? '#10b981' : '#ef4444'}
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
            <line
              x1={padding.left}
              y1={scaleY(safePu)}
              x2={svgWidth - padding.right}
              y2={scaleY(safePu)}
              stroke={isSafe ? '#10b981' : '#ef4444'}
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />

            {/* Círculo pulsante */}
            <circle
              cx={scaleX(safeMu)}
              cy={scaleY(safePu)}
              r="8"
              fill={isSafe ? '#10b981' : '#ef4444'}
              opacity="0.35"
              className="animate-ping"
            />
            <circle
              cx={scaleX(safeMu)}
              cy={scaleY(safePu)}
              r="5.5"
              fill={isSafe ? '#10b981' : '#ef4444'}
              stroke="#ffffff"
              strokeWidth="2"
            />

            <rect
              x={scaleX(safeMu) + 10}
              y={scaleY(safePu) - 24}
              width="135"
              height="30"
              fill="#0f172a"
              stroke={isSafe ? '#10b981' : '#ef4444'}
              strokeWidth="1"
              rx="4"
            />
            <text x={scaleX(safeMu) + 16} y={scaleY(safePu) - 13} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
              Solicitación (Pu, Mu)
            </text>
            <text x={scaleX(safeMu) + 16} y={scaleY(safePu) - 2} fill={isSafe ? '#34d399' : '#f87171'} fontSize="9" fontFamily="monospace">
              P={Math.round(safePu)} kN, M={Math.round(safeMu)} kN·m
            </text>
          </g>

          {/* Rótulo de Ejes */}
          <text
            x={padding.left + chartW / 2}
            y={svgHeight - 15}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="middle"
            fontWeight="bold"
          >
            Momento Flector M (kN·m)
          </text>
          <text
            x={18}
            y={padding.top + chartH / 2}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="middle"
            transform={`rotate(-90, 18, ${padding.top + chartH / 2})`}
            fontWeight="bold"
          >
            Carga Axial P (kN)
          </text>

          {/* Leyenda */}
          <g>
            <rect x={svgWidth - 175} y="15" width="155" height="52" fill="#0f172a" stroke="#334155" rx="5" />
            <line x1={svgWidth - 165} y1="28" x2={svgWidth - 145} y2="28" stroke="#38bdf8" strokeWidth="2.5" />
            <text x={svgWidth - 138} y="31" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              Curva Diseño (φPn, φMn)
            </text>
            <line x1={svgWidth - 165} y1="46" x2={svgWidth - 145} y2="46" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x={svgWidth - 138} y="49" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              Curva Nominal (Pn, Mn)
            </text>
          </g>
        </svg>
      </div>

      {/* Indicador de estado al pie */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <div className="text-slate-400 text-[10px]">Carga Axial Pu</div>
          <div className="font-mono font-bold text-slate-100">{Pu} kN</div>
        </div>
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <div className="text-slate-400 text-[10px]">Momento Mux</div>
          <div className="font-mono font-bold text-slate-100">{Mu} kN·m</div>
        </div>
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <div className="text-slate-400 text-[10px]">Capacidad φPn,max</div>
          <div className="font-mono font-bold text-amber-400">{Math.round(phiPnMax)} kN</div>
        </div>
        <div className={`p-2 rounded border ${isSafe ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'}`}>
          <div className="text-[10px] opacity-80">Ratio DCR</div>
          <div className="font-mono font-bold">{(dcr * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
};
