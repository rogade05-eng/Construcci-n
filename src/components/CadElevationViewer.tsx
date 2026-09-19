/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MaterialType, ConcreteTieDesign, SteelConnectionDesign } from '../types';

interface CadElevationViewerProps {
  material: MaterialType;
  b: number; // mm
  h: number; // mm
  heightL: number; // m
  ties: ConcreteTieDesign;
  steelConnection?: SteelConnectionDesign;
}

export const CadElevationViewer: React.FC<CadElevationViewerProps> = ({
  material,
  b,
  h,
  heightL,
  ties,
  steelConnection,
}) => {
  const safeTies: ConcreteTieDesign = ties || {
    diameter: 10,
    s0: 100,
    sMid: 200,
    legsX: 2,
    legsY: 2,
    l0: 600,
    hookAngle: 135,
    hookLength: 80,
    lapSpliceLength: 600,
    lapLocation: 'Tercio central',
    patternType: 'perimeter_only',
  };

  const [showSpliceDetail, setShowSpliceDetail] = useState(false);

  const svgWidth = 560;
  const svgHeight = 520;

  // Escala vertical y horizontal
  const colHeightM = heightL;
  const colWidthMm = Math.max(b, h);

  const colHeightPx = 360;
  const colWidthPx = Math.min(100, Math.max(50, (colWidthMm / 500) * 60));
  const colX = svgWidth / 2 - colWidthPx / 2 - 40;
  const colTopY = 70;
  const colBottomY = colTopY + colHeightPx;

  // Zonas de confinamiento en píxeles
  const l0Fraction = (safeTies.l0 / (colHeightM * 1000));
  const l0Px = Math.min(colHeightPx * 0.35, Math.max(50, l0Fraction * colHeightPx));

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 relative overflow-hidden shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="font-mono font-semibold text-slate-200 uppercase tracking-wide">
            Plano CAD: Alzado Técnico y Despiece Longitudinal
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
            H = {heightL.toFixed(2)} m
          </span>
        </div>
        <button
          onClick={() => setShowSpliceDetail(!showSpliceDetail)}
          className="px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/60 font-mono text-[11px] transition"
        >
          {showSpliceDetail ? 'Ocultar Detalle Solape' : 'Ver Detalle Solape (Ld)'}
        </button>
      </div>

      <div className="relative w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[560px] h-auto select-none bg-slate-900/60 rounded-lg border border-slate-800/80"
        >
          <defs>
            <marker id="arrowElev" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#38bdf8" />
            </marker>
            <marker id="arrowGreen" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#10b981" />
            </marker>
          </defs>

          {/* Viga superior / Nudo */}
          <rect x={colX - 80} y={colTopY - 35} width={colWidthPx + 160} height="35" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
          <text x={colX + colWidthPx / 2} y={colTopY - 14} fill="#cbd5e1" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            VIGA / NUDO SUPERIOR
          </text>

          {/* Zapata / Cimiento inferior */}
          <rect x={colX - 100} y={colBottomY} width={colWidthPx + 200} height="45" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
          <text x={colX + colWidthPx / 2} y={colBottomY + 28} fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            CIMIENTO / ZAPATA
          </text>

          {/* CASO HORMIGÓN ARMADO */}
          {material === 'concrete' && (
            <g>
              {/* Cuerpo de la columna */}
              <rect x={colX} y={colTopY} width={colWidthPx} height={colHeightPx} fill="#1e293b" stroke="#94a3b8" strokeWidth="2" opacity="0.9" />

              {/* Barras longitudinales (líneas verticales) */}
              <line x1={colX + 12} y1={colTopY - 20} x2={colX + 12} y2={colBottomY + 30} stroke="#f59e0b" strokeWidth="3.5" />
              <line x1={colX + colWidthPx - 12} y1={colTopY - 20} x2={colX + colWidthPx - 12} y2={colBottomY + 30} stroke="#f59e0b" strokeWidth="3.5" />
              {/* Ganchos inferiores de anclaje a 90° en zapata */}
              <line x1={colX + 12} y1={colBottomY + 30} x2={colX - 25} y2={colBottomY + 30} stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
              <line x1={colX + colWidthPx - 12} y1={colBottomY + 30} x2={colX + colWidthPx + 25} y2={colBottomY + 30} stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />

              {/* Zona confinada superior (l0) */}
              <rect x={colX} y={colTopY} width={colWidthPx} height={l0Px} fill="#0284c7" opacity="0.15" />
              {/* Cercos en zona confinada superior (paso s0 = 100mm aprox) */}
              {Array.from({ length: 7 }).map((_, i) => (
                <line
                  key={`tie-top-${i}`}
                  x1={colX + 5}
                  y1={colTopY + i * (l0Px / 6)}
                  x2={colX + colWidthPx - 5}
                  y2={colTopY + i * (l0Px / 6)}
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              ))}

              {/* Zona central (L - 2*l0) con cercos a paso sMid (200mm aprox) */}
              {Array.from({ length: 6 }).map((_, i) => (
                <line
                  key={`tie-mid-${i}`}
                  x1={colX + 5}
                  y1={colTopY + l0Px + (i + 1) * ((colHeightPx - 2 * l0Px) / 7)}
                  x2={colX + colWidthPx - 5}
                  y2={colTopY + l0Px + (i + 1) * ((colHeightPx - 2 * l0Px) / 7)}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              ))}

              {/* Zona confinada inferior (l0) */}
              <rect x={colX} y={colBottomY - l0Px} width={colWidthPx} height={l0Px} fill="#0284c7" opacity="0.15" />
              {/* Cercos en zona confinada inferior (paso s0) */}
              {Array.from({ length: 7 }).map((_, i) => (
                <line
                  key={`tie-bot-${i}`}
                  x1={colX + 5}
                  y1={colBottomY - i * (l0Px / 6)}
                  x2={colX + colWidthPx - 5}
                  y2={colBottomY - i * (l0Px / 6)}
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              ))}

              {/* ZONA DE SOLAPE / TRASLAPE EN TERCIO MEDIO */}
              <g>
                <rect
                  x={colX + 4}
                  y={colTopY + colHeightPx * 0.42}
                  width={colWidthPx - 8}
                  height={colHeightPx * 0.16}
                  fill="#f59e0b"
                  opacity="0.2"
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  rx="3"
                />
                {/* Doble barra en solape */}
                <line
                  x1={colX + 16}
                  y1={colTopY + colHeightPx * 0.40}
                  x2={colX + 16}
                  y2={colTopY + colHeightPx * 0.60}
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                  strokeDasharray="2 1"
                />
                <text
                  x={colX + colWidthPx / 2}
                  y={colTopY + colHeightPx * 0.50 + 4}
                  fill="#fbbf24"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  SOLAPE Ld = {safeTies.lapSpliceLength} mm
                </text>
              </g>

              {/* Cotas de zonas de confinamiento y centro */}
              <g stroke="#38bdf8" strokeWidth="1">
                {/* Cota l0 sup */}
                <line x1={colX - 25} y1={colTopY} x2={colX - 25} y2={colTopY + l0Px} markerStart="url(#arrowElev)" markerEnd="url(#arrowElev)" />
                <text x={colX - 30} y={colTopY + l0Px / 2 + 4} fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="end">
                  l₀={safeTies.l0}mm @ {safeTies.s0}mm
                </text>

                {/* Cota zona central */}
                <line x1={colX - 25} y1={colTopY + l0Px} x2={colX - 25} y2={colBottomY - l0Px} markerStart="url(#arrowElev)" markerEnd="url(#arrowElev)" />
                <text x={colX - 30} y={colTopY + colHeightPx / 2 + 4} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
                  Centro @ {safeTies.sMid}mm
                </text>

                {/* Cota l0 inf */}
                <line x1={colX - 25} y1={colBottomY - l0Px} x2={colX - 25} y2={colBottomY} markerStart="url(#arrowElev)" markerEnd="url(#arrowElev)" />
                <text x={colX - 30} y={colBottomY - l0Px / 2 + 4} fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="end">
                  l₀={safeTies.l0}mm @ {safeTies.s0}mm
                </text>
              </g>
            </g>
          )}

          {/* CASO ACERO ESTRUCTURAL */}
          {material === 'steel' && steelConnection && (
            <g>
              {/* Columna metálica */}
              <rect x={colX + 10} y={colTopY} width={colWidthPx - 20} height={colHeightPx} fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
              {/* Placa base */}
              <rect x={colX - 20} y={colBottomY - 12} width={colWidthPx + 40} height="12" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
              {/* Cordón de soldadura */}
              <polygon points={`${colX + 10},${colBottomY - 12} ${colX + 2},${colBottomY - 12} ${colX + 10},${colBottomY - 20}`} fill="#f59e0b" />
              <polygon points={`${colX + colWidthPx - 10},${colBottomY - 12} ${colX + colWidthPx - 2},${colBottomY - 12} ${colX + colWidthPx - 10},${colBottomY - 20}`} fill="#f59e0b" />
              {/* Pernos de anclaje embebidos en hormigón */}
              <line x1={colX - 10} y1={colBottomY - 15} x2={colX - 10} y2={colBottomY + 38} stroke="#e2e8f0" strokeWidth="4" />
              <line x1={colX + colWidthPx + 10} y1={colBottomY - 15} x2={colX + colWidthPx + 10} y2={colBottomY + 38} stroke="#e2e8f0" strokeWidth="4" />
              {/* Tuercas */}
              <rect x={colX - 14} y={colBottomY - 20} width="8" height="6" fill="#cbd5e1" />
              <rect x={colX + colWidthPx + 6} y={colBottomY - 20} width="8" height="6" fill="#cbd5e1" />
              <text x={colX + colWidthPx / 2} y={colBottomY + 18} fill="#f59e0b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Placa Base e={steelConnection.basePlateThickness}mm + {steelConnection.boltCount} Pernos Ø{steelConnection.boltDiameter}
              </text>
            </g>
          )}

          {/* CASO MADERA ESTRUCTURAL */}
          {material === 'wood' && (
            <g>
              {/* Poste de madera */}
              <rect x={colX} y={colTopY} width={colWidthPx} height={colHeightPx - 15} fill="#78350f" stroke="#b45309" strokeWidth="2" />
              {/* Herraje metálico tipo U de base (Standoff boot) con 50mm de separación */}
              <rect x={colX - 5} y={colBottomY - 35} width={colWidthPx + 10} height="25" fill="none" stroke="#94a3b8" strokeWidth="3" />
              <rect x={colX} y={colBottomY - 10} width={colWidthPx} height="10" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
              <text x={colX + colWidthPx / 2} y={colBottomY - 18} fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Herraje U + Pernos
              </text>
            </g>
          )}

          {/* Cota total de altura libre L */}
          <g stroke="#10b981" strokeWidth="1.4">
            <line x1={colX + colWidthPx + 35} y1={colTopY} x2={colX + colWidthPx + 35} y2={colBottomY} markerStart="url(#arrowGreen)" markerEnd="url(#arrowGreen)" />
            <line x1={colX + colWidthPx + 5} y1={colTopY} x2={colX + colWidthPx + 42} y2={colTopY} />
            <line x1={colX + colWidthPx + 5} y1={colBottomY} x2={colX + colWidthPx + 42} y2={colBottomY} />
            <rect x={colX + colWidthPx + 45} y={colTopY + colHeightPx / 2 - 12} width="85" height="22" fill="#0f172a" rx="4" stroke="#10b981" strokeWidth="0.8" />
            <text x={colX + colWidthPx + 87} y={colTopY + colHeightPx / 2 + 3} fill="#10b981" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              L = {heightL.toFixed(2)} m
            </text>
          </g>

          {/* Cuadro de llamadas técnicas constructivas a la derecha */}
          <g>
            <rect x={svgWidth - 170} y="60" width="155" height="150" fill="#0f172a" stroke="#334155" rx="6" />
            <text x={svgWidth - 160} y="80" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
              NOTAS DE CONSTRUCCIÓN
            </text>
            <text x={svgWidth - 160} y="98" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              1. Cercos conf. s₀: {safeTies.s0} mm
            </text>
            <text x={svgWidth - 160} y="114" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              2. Cercos centro: {safeTies.sMid} mm
            </text>
            <text x={svgWidth - 160} y="130" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              3. Gancho sísmico: 135° ({safeTies.hookLength}mm)
            </text>
            <text x={svgWidth - 160} y="146" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              4. Solape: Ld={safeTies.lapSpliceLength} mm
            </text>
            <text x={svgWidth - 160} y="162" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              5. Ubicación: 1/3 central
            </text>
            <text x={svgWidth - 160} y="178" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              6. Recubrimiento: r={30} mm
            </text>
            <text x={svgWidth - 160} y="196" fill="#f59e0b" fontSize="9" fontFamily="monospace">
              7. Alternar empalmes 50%
            </text>
          </g>
        </svg>
      </div>

      {/* Explicación de normativa de solapes y cercos */}
      {showSpliceDetail && (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold font-mono">
            <span>Reglamentación de Empalmes y Zonas Críticas (ACI 318-19 Cap. 18 / NC 450:2006):</span>
          </div>
          <p className="text-slate-300">
            • <strong>Prohibición en extremos:</strong> Los empalmes por traslape están estrictamente prohibidos dentro de las zonas de confinamiento <em>l₀</em> ni dentro de los nudos viga-columna debido a la formación esperada de rótulas plásticas durante sismos.
          </p>
          <p className="text-slate-300">
            • <strong>Longitud de traslape Ld = {safeTies.lapSpliceLength} mm:</strong> Cumple con empalme Clase B (1.3 Ld a tracción), asegurando transferencia íntegra de esfuerzos por adherencia hormigón-acero.
          </p>
          <p className="text-slate-300">
            • <strong>Ganchos sísmicos a 135°:</strong> Tienen una extensión mínima de {safeTies.hookLength} mm para evitar que el cerco se abra si se produce desprendimiento del recubrimiento exterior de hormigón.
          </p>
        </div>
      )}
    </div>
  );
};
