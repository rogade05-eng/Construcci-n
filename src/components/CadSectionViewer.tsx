/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MaterialType, RebarBar, ConcreteTieDesign, SteelProfileData, SteelConnectionDesign, WoodProperties } from '../types';

interface CadSectionViewerProps {
  material: MaterialType;
  b: number; // mm
  h: number; // mm
  cover: number; // mm
  bars: RebarBar[];
  ties: ConcreteTieDesign;
  steelProfile?: SteelProfileData;
  steelConnection?: SteelConnectionDesign;
  woodProps?: WoodProperties;
  onOpenCombinedBarsModal?: () => void;
}

export const CadSectionViewer: React.FC<CadSectionViewerProps> = ({
  material,
  b,
  h,
  cover,
  bars,
  ties,
  steelProfile,
  steelConnection,
  onOpenCombinedBarsModal,
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

  const [hoveredBar, setHoveredBar] = useState<RebarBar | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSpacingDetails, setShowSpacingDetails] = useState(true);

  // Dimensiones del viewBox SVG
  const svgWidth = 560;
  const svgHeight = 440;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2 - 10;

  // Escala para que quepa en el canvas
  const maxDim = Math.max(b, h, 350);
  const scale = (250 / maxDim) * zoomLevel;

  const bPx = b * scale;
  const hPx = h * scale;

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 relative overflow-hidden shadow-2xl">
      {/* Barra de controles técnicos */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono font-semibold text-slate-200 uppercase tracking-wide">
            Plano CAD: Sección Transversal A-A
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
            Escala 1:{Math.round(100 / scale)}
          </span>
          {material === 'concrete' && onOpenCombinedBarsModal && (
            <button
              onClick={onOpenCombinedBarsModal}
              className="ml-2 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Abrir verificación de cercos y catálogo de soluciones para barras combinadas"
            >
              <span>🪝</span>
              <span>Cercos & Soluciones</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {material === 'concrete' && (
            <button
              onClick={() => setShowSpacingDetails((v) => !v)}
              className={`px-2 py-1 rounded font-mono text-[11px] transition border ${
                showSpacingDetails
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {showSpacingDetails ? '📐 Ocultar Cotas' : '📐 Ver Cotas 150mm'}
            </button>
          )}
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
            title="Alejar"
          >
            -
          </button>
          <span className="font-mono text-slate-400 text-xs">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
            title="Acercar"
          >
            +
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition"
          >
            Ajustar
          </button>
        </div>
      </div>

      {/* SVG Canvas Técnico */}
      <div className="relative w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[560px] h-auto select-none bg-slate-900/60 rounded-lg border border-slate-800/80"
        >
          <defs>
            {/* Patrón de sombreado de hormigón */}
            <pattern id="concreteHatch" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M0 16 L16 0 M-4 4 L4 -4 M12 20 L20 12" stroke="#334155" strokeWidth="0.75" />
              <circle cx="4" cy="12" r="0.8" fill="#475569" />
              <circle cx="12" cy="4" r="0.8" fill="#475569" />
            </pattern>
            {/* Patrón de veta de madera */}
            <pattern id="woodGrain" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M0 12 Q 12 18, 24 12 M0 4 Q 12 -2, 24 4 M0 20 Q 12 26, 24 20" stroke="#78350f" strokeWidth="0.8" fill="none" opacity="0.6" />
            </pattern>
            {/* Marcador de flecha de cota */}
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#38bdf8" />
            </marker>
            <marker id="arrowAmber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Cuadrícula de fondo estilo ingeniería */}
          <g stroke="#1e293b" strokeWidth="1" opacity="0.6">
            {Array.from({ length: 15 }).map((_, i) => (
              <line key={`gx-${i}`} x1={i * 40} y1="0" x2={i * 40} y2={svgHeight} strokeDasharray="3 3" />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`gy-${i}`} x1="0" y1={i * 40} x2={svgWidth} y2={i * 40} strokeDasharray="3 3" />
            ))}
          </g>

          {/* Ejes centroidales principales */}
          <g stroke="#0ea5e9" strokeWidth="1" strokeDasharray="6 3 2 3" opacity="0.5">
            <line x1={centerX - bPx / 2 - 40} y1={centerY} x2={centerX + bPx / 2 + 40} y2={centerY} />
            <line x1={centerX} y1={centerY - hPx / 2 - 40} x2={centerX} y2={centerY + hPx / 2 + 40} />
            <text x={centerX + bPx / 2 + 45} y={centerY + 4} fill="#0ea5e9" fontSize="10" fontFamily="monospace">
              X
            </text>
            <text x={centerX - 4} y={centerY - hPx / 2 - 45} fill="#0ea5e9" fontSize="10" fontFamily="monospace">
              Y
            </text>
          </g>

          {/* CASO 1: HORMIGÓN ARMADO */}
          {material === 'concrete' && (
            <g>
              {/* Sección exterior de hormigón */}
              <rect
                x={centerX - bPx / 2}
                y={centerY - hPx / 2}
                width={bPx}
                height={hPx}
                fill="url(#concreteHatch)"
                stroke="#94a3b8"
                strokeWidth="2.5"
                rx="2"
              />

              {/* Estribo perimetral / Cerco */}
              {ties && (
                <>
                  <rect
                    x={centerX - bPx / 2 + cover * scale}
                    y={centerY - hPx / 2 + cover * scale}
                    width={bPx - 2 * cover * scale}
                    height={hPx - 2 * cover * scale}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                    rx={safeTies.diameter * scale}
                  />

                  {/* Gancho sísmico perimetral a 135° (esquina superior izquierda) */}
                  <path
                    d={`M ${centerX - bPx / 2 + cover * scale + 15} ${centerY - hPx / 2 + cover * scale}
                        L ${centerX - bPx / 2 + cover * scale} ${centerY - hPx / 2 + cover * scale + 15}
                        L ${centerX - bPx / 2 + cover * scale + 18} ${centerY - hPx / 2 + cover * scale + 30}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                    strokeLinecap="round"
                  />

                  {/* CASO A: ESTRIBO ROMBO INTERIOR (DIAMANTE) */}
                  {safeTies.patternType === 'perimeter_diamond' && bars.length >= 8 && (
                    (() => {
                      const topFace = bars.filter((b) => !b.isCorner && b.y > 0).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0];
                      const botFace = bars.filter((b) => !b.isCorner && b.y < 0).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0];
                      const leftFace = bars.filter((b) => !b.isCorner && b.x < 0).sort((a, b) => Math.abs(a.y) - Math.abs(b.y))[0];
                      const rightFace = bars.filter((b) => !b.isCorner && b.x > 0).sort((a, b) => Math.abs(a.y) - Math.abs(b.y))[0];

                      if (topFace && botFace && leftFace && rightFace) {
                        const pt = `${centerX + topFace.x * scale},${centerY - topFace.y * scale}`;
                        const pr = `${centerX + rightFace.x * scale},${centerY - rightFace.y * scale}`;
                        const pb = `${centerX + botFace.x * scale},${centerY - botFace.y * scale}`;
                        const pl = `${centerX + leftFace.x * scale},${centerY - leftFace.y * scale}`;
                        return (
                          <g>
                            <polygon
                              points={`${pt} ${pr} ${pb} ${pl}`}
                              fill="none"
                              stroke="#c084fc"
                              strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                              strokeLinejoin="round"
                            />
                            {/* Gancho interior del rombo */}
                            <path
                              d={`M ${centerX + topFace.x * scale} ${centerY - topFace.y * scale}
                                  L ${centerX + topFace.x * scale + 12} ${centerY - topFace.y * scale + 14}`}
                              stroke="#c084fc"
                              strokeWidth={Math.max(1.8, safeTies.diameter * scale * 0.65)}
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      }
                      return null;
                    })()
                  )}

                  {/* CASO B: TRABAS SUPLEMENTARIAS (CROSS-TIES) */}
                  {(safeTies.patternType === 'perimeter_crossties' || (safeTies.legsX > 2 && safeTies.patternType !== 'perimeter_diamond')) && (
                    (() => {
                      // Trabas verticales conectando barras de cara superior con inferior
                      const topFaceBars = bars.filter((b) => !b.isCorner && b.y > h / 6);
                      const botFaceBars = bars.filter((b) => !b.isCorner && b.y < -h / 6);

                      return topFaceBars.map((tBar, idx) => {
                        const bBar = botFaceBars.find((b) => Math.abs(b.x - tBar.x) < 20) || botFaceBars[idx];
                        const tx = centerX + tBar.x * scale;
                        const ty = centerY - tBar.y * scale;
                        const by = bBar ? centerY - bBar.y * scale : centerY + hPx / 2 - cover * scale;

                        return (
                          <g key={`crosstie-v-${idx}`}>
                            {/* Rama vertical */}
                            <line
                              x1={tx}
                              y1={ty - 8}
                              x2={tx}
                              y2={by + 8}
                              stroke="#22d3ee"
                              strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                            />
                            {/* Gancho 135° superior */}
                            <path
                              d={`M ${tx - 10} ${ty - 2} Q ${tx} ${ty - 10} ${tx + 12} ${ty + 4}`}
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                              strokeLinecap="round"
                            />
                            {/* Gancho 135° inferior */}
                            <path
                              d={`M ${tx + 10} ${by + 2} Q ${tx} ${by + 10} ${tx - 12} ${by - 4}`}
                              fill="none"
                              stroke="#22d3ee"
                              strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      });
                    })()
                  )}

                  {/* Trabas horizontales conectando barras de cara izquierda con derecha */}
                  {(safeTies.patternType === 'perimeter_crossties' || (safeTies.legsY > 2 && safeTies.patternType !== 'perimeter_diamond')) && (
                    (() => {
                      const leftFaceBars = bars.filter((b) => !b.isCorner && b.x < -b / 6);
                      const rightFaceBars = bars.filter((b) => !b.isCorner && b.x > b / 6);

                      return leftFaceBars.map((lBar, idx) => {
                        const rBar = rightFaceBars.find((b) => Math.abs(b.y - lBar.y) < 20) || rightFaceBars[idx];
                        const ly = centerY - lBar.y * scale;
                        const lx = centerX + lBar.x * scale;
                        const rx = rBar ? centerX + rBar.x * scale : centerX + bPx / 2 - cover * scale;

                        return (
                          <g key={`crosstie-h-${idx}`}>
                            {/* Rama horizontal */}
                            <line
                              x1={lx - 8}
                              y1={ly}
                              x2={rx + 8}
                              y2={ly}
                              stroke="#38bdf8"
                              strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                            />
                            {/* Gancho 135° izquierdo */}
                            <path
                              d={`M ${lx - 2} ${ly - 10} Q ${lx - 10} ${ly} ${lx + 4} ${ly + 12}`}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                              strokeLinecap="round"
                            />
                            {/* Gancho 135° derecho */}
                            <path
                              d={`M ${rx + 2} ${ly + 10} Q ${rx + 10} ${ly} ${rx - 4} ${ly - 12}`}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth={Math.max(2, safeTies.diameter * scale * 0.7)}
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      });
                    })()
                  )}

                  {/* CASO C: DOBLE ESTRIBO PERIMETRAL SOLAPADO */}
                  {safeTies.patternType === 'overlapping_perimeter' && (
                    <rect
                      x={centerX - bPx / 4 + cover * scale * 0.5}
                      y={centerY - hPx / 2 + cover * scale}
                      width={bPx / 2 - cover * scale}
                      height={hPx - 2 * cover * scale}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth={Math.max(1.8, safeTies.diameter * scale * 0.65)}
                      strokeDasharray="4 2"
                      rx={safeTies.diameter * scale}
                    />
                  )}
                </>
              )}

              {/* Barras longitudinales */}
              {bars.map((bar) => {
                const bx = centerX + bar.x * scale;
                const by = centerY - bar.y * scale; // Invertir Y para dibujo CAD
                const rPx = (bar.diameter / 2) * scale;
                const isHovered = hoveredBar?.id === bar.id;

                return (
                  <g key={bar.id} className="cursor-pointer" onMouseEnter={() => setHoveredBar(bar)} onMouseLeave={() => setHoveredBar(null)}>
                    {/* Sombra de resaltado al hacer hover */}
                    {isHovered && <circle cx={bx} cy={by} r={rPx + 5} fill="#f59e0b" opacity="0.4" />}
                    {/* Barra de acero con textura de resalte */}
                    <circle
                      cx={bx}
                      cy={by}
                      r={Math.max(4, rPx)}
                      fill={bar.isCorner ? '#f59e0b' : '#fbbf24'}
                      stroke="#78350f"
                      strokeWidth="1.5"
                    />
                    {/* Núcleo de la barra */}
                    <circle cx={bx - rPx * 0.25} cy={by - rPx * 0.25} r={Math.max(1.2, rPx * 0.4)} fill="#fef3c7" opacity="0.8" />
                  </g>
                );
              })}

              {/* Cotas técnicas de recubrimiento libre */}
              <g stroke="#38bdf8" strokeWidth="1">
                <line
                  x1={centerX - bPx / 2}
                  y1={centerY + hPx / 2 + 10}
                  x2={centerX - bPx / 2 + cover * scale}
                  y2={centerY + hPx / 2 + 10}
                />
                <text
                  x={centerX - bPx / 2 + (cover * scale) / 2}
                  y={centerY + hPx / 2 + 22}
                  fill="#38bdf8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  r={cover}mm
                </text>
              </g>
            </g>
          )}

          {/* CASO 2: ACERO ESTRUCTURAL */}
          {material === 'steel' && steelProfile && (
            <g>
              {/* Placa base (si está definida) */}
              {steelConnection && (
                <rect
                  x={centerX - (steelConnection.basePlateWidth * scale) / 2}
                  y={centerY - (steelConnection.basePlateLength * scale) / 2}
                  width={steelConnection.basePlateWidth * scale}
                  height={steelConnection.basePlateLength * scale}
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  rx="4"
                />
              )}

              {/* Perfil W (Doble T) */}
              {steelProfile.type === 'W_SHAPE' && (
                <g fill="#0284c7" stroke="#38bdf8" strokeWidth="2">
                  {/* Ala superior */}
                  <rect
                    x={centerX - (steelProfile.b * scale) / 2}
                    y={centerY - (steelProfile.d * scale) / 2}
                    width={steelProfile.b * scale}
                    height={steelProfile.tf * scale}
                    rx="1"
                  />
                  {/* Alma */}
                  <rect
                    x={centerX - (steelProfile.tw * scale) / 2}
                    y={centerY - (steelProfile.d * scale) / 2 + steelProfile.tf * scale}
                    width={steelProfile.tw * scale}
                    height={(steelProfile.d - 2 * steelProfile.tf) * scale}
                  />
                  {/* Ala inferior */}
                  <rect
                    x={centerX - (steelProfile.b * scale) / 2}
                    y={centerY + (steelProfile.d * scale) / 2 - steelProfile.tf * scale}
                    width={steelProfile.b * scale}
                    height={steelProfile.tf * scale}
                    rx="1"
                  />
                  {/* Filete de soldadura perfil-placa en las 4 esquinas del ala */}
                  <path
                    d={`M ${centerX - (steelProfile.b * scale) / 2} ${centerY - (steelProfile.d * scale) / 2}
                        L ${centerX - (steelProfile.b * scale) / 2 - 8} ${centerY - (steelProfile.d * scale) / 2}
                        L ${centerX - (steelProfile.b * scale) / 2} ${centerY - (steelProfile.d * scale) / 2 - 8} Z`}
                    fill="#f59e0b"
                  />
                </g>
              )}

              {/* Perfil Tubo Cajón HSS */}
              {steelProfile.type === 'HSS_RECT' && (
                <g fill="#0284c7" stroke="#38bdf8" strokeWidth="2">
                  <rect
                    x={centerX - (steelProfile.b * scale) / 2}
                    y={centerY - (steelProfile.d * scale) / 2}
                    width={steelProfile.b * scale}
                    height={steelProfile.d * scale}
                    rx="6"
                  />
                  {/* Hueco interior */}
                  <rect
                    x={centerX - (steelProfile.b * scale) / 2 + steelProfile.tw * scale}
                    y={centerY - (steelProfile.d * scale) / 2 + steelProfile.tw * scale}
                    width={(steelProfile.b - 2 * steelProfile.tw) * scale}
                    height={(steelProfile.d - 2 * steelProfile.tw) * scale}
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    rx="3"
                  />
                </g>
              )}

              {/* Pernos de anclaje si hay placa base */}
              {steelConnection &&
                Array.from({ length: steelConnection.boltCount }).map((_, i) => {
                  const xOff = (i % 2 === 0 ? -1 : 1) * ((steelConnection.basePlateWidth * scale) / 2 - 20);
                  const yOff = (i < 2 ? -1 : 1) * ((steelConnection.basePlateLength * scale) / 2 - 20);
                  return (
                    <g key={`bolt-${i}`}>
                      <circle cx={centerX + xOff} cy={centerY + yOff} r={7} fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                      <circle cx={centerX + xOff} cy={centerY + yOff} r={3} fill="#e2e8f0" />
                    </g>
                  );
                })}
            </g>
          )}

          {/* CASO 3: MADERA ESTRUCTURAL */}
          {material === 'wood' && (
            <g>
              <rect
                x={centerX - bPx / 2}
                y={centerY - hPx / 2}
                width={bPx}
                height={hPx}
                fill="url(#woodGrain)"
                stroke="#b45309"
                strokeWidth="2.5"
                rx="4"
              />
              {/* Vértices achaflanados / pernos pasantes de herraje */}
              <circle cx={centerX - bPx / 4} cy={centerY} r={6} fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx={centerX + bPx / 4} cy={centerY} r={6} fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x={centerX} y={centerY - 12} fill="#d97706" fontSize="9" fontFamily="monospace" textAnchor="middle">
                2 Pernos Pasantes Ø16mm
              </text>
            </g>
          )}

          {/* COTAS TÉCNICAS (DIMENSION LINES) */}
          {/* Cota horizontal ancho b */}
          <g stroke="#38bdf8" strokeWidth="1.2">
            <line x1={centerX - bPx / 2} y1={centerY - hPx / 2 - 25} x2={centerX + bPx / 2} y2={centerY - hPx / 2 - 25} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
            <line x1={centerX - bPx / 2} y1={centerY - hPx / 2 - 32} x2={centerX - bPx / 2} y2={centerY - hPx / 2 - 5} />
            <line x1={centerX + bPx / 2} y1={centerY - hPx / 2 - 32} x2={centerX + bPx / 2} y2={centerY - hPx / 2 - 5} />
            <rect x={centerX - 35} y={centerY - hPx / 2 - 38} width="70" height="16" fill="#0f172a" rx="3" stroke="#1e293b" strokeWidth="0.5" />
            <text x={centerX} y={centerY - hPx / 2 - 26} fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              b = {b} mm
            </text>
          </g>

          {/* Cota vertical peralte h */}
          <g stroke="#38bdf8" strokeWidth="1.2">
            <line x1={centerX + bPx / 2 + 25} y1={centerY - hPx / 2} x2={centerX + bPx / 2 + 25} y2={centerY + hPx / 2} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
            <line x1={centerX + bPx / 2 + 5} y1={centerY - hPx / 2} x2={centerX + bPx / 2 + 32} y2={centerY - hPx / 2} />
            <line x1={centerX + bPx / 2 + 5} y1={centerY + hPx / 2} x2={centerX + bPx / 2 + 32} y2={centerY + hPx / 2} />
            <rect x={centerX + bPx / 2 + 10} y={centerY - 10} width="70" height="18" fill="#0f172a" rx="3" stroke="#1e293b" strokeWidth="0.5" />
            <text x={centerX + bPx / 2 + 45} y={centerY + 3} fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              h = {h} mm
            </text>
          </g>

          {/* Indicador de Espaciamiento Libre entre Barras para la regla de 150 mm */}
          {material === 'concrete' && showSpacingDetails && bars.length > 4 && (
            (() => {
              const topBars = bars.filter((b) => b.y > h / 6).sort((a, b) => a.x - b.x);
              if (topBars.length >= 2) {
                const b1 = topBars[0];
                const b2 = topBars[topBars.length - 1];
                const count = topBars.length;
                const dMin = Math.min(...topBars.map((b) => b.diameter));
                const sClear = Math.round((b - 2 * cover - 2 * safeTies.diameter - count * dMin) / (count - 1));
                const isViolated = sClear > 150 && safeTies.legsX <= 2 && safeTies.patternType !== 'perimeter_crossties' && safeTies.patternType !== 'perimeter_diamond';

                return (
                  <g>
                    <line
                      x1={centerX + b1.x * scale}
                      y1={centerY - b1.y * scale - 14}
                      x2={centerX + b2.x * scale}
                      y2={centerY - b2.y * scale - 14}
                      stroke={isViolated ? '#f43f5e' : '#10b981'}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={centerX}
                      y={centerY - b1.y * scale - 18}
                      fill={isViolated ? '#f43f5e' : '#34d399'}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {isViolated ? `⚠️ s_libre = ${sClear} mm (> 150 mm: Requiere Traba)` : `✓ s_libre = ${sClear} mm (≤ 150 mm OK)`}
                    </text>
                  </g>
                );
              }
              return null;
            })()
          )}

          {/* Símbolo de sección A-A */}
          <text x="30" y="30" fill="#94a3b8" fontSize="13" fontWeight="bold" fontFamily="monospace">
            SECCIÓN A-A
          </text>
          <text x="30" y="46" fill="#64748b" fontSize="10" fontFamily="monospace">
            {material === 'concrete'
              ? `Hormigón Armado | Recubrimiento: ${cover} mm`
              : material === 'steel'
              ? `Acero: ${steelProfile?.designation || ''}`
              : 'Madera Estructural'}
          </text>
        </svg>
      </div>

      {/* Tarjeta de información de barra seleccionada y estado de cercos */}
      {material === 'concrete' && (
        <div className="mt-3 bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-slate-400">
              Armadura:{' '}
              <strong className="text-amber-400">
                {bars.length} Barras (Total As = {Math.round(bars.reduce((a, b) => a + b.area, 0))} mm²)
              </strong>
            </span>
            {(() => {
              const uniqueDia: number[] = Array.from(new Set(bars.map((bar) => bar.diameter)))
                .map((d) => Number(d))
                .sort((a, b) => b - a);
              if (uniqueDia.length > 1) {
                return (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                    BARRAS COMBINADAS: Ø{uniqueDia[0]} + Ø{uniqueDia[uniqueDia.length - 1]} mm
                  </span>
                );
              }
              return null;
            })()}
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-400">
              Cercos:{' '}
              <strong className="text-cyan-400">
                Ø{safeTies.diameter} mm @ {safeTies.s0}/{safeTies.sMid} mm ({safeTies.legsX}X / {safeTies.legsY}Y)
              </strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              {safeTies.patternType === 'perimeter_diamond'
                ? 'Rombo Interior + Perimetral'
                : safeTies.patternType === 'perimeter_crossties'
                ? 'Perimetral + Trabas (Cross-ties)'
                : safeTies.patternType === 'overlapping_perimeter'
                ? 'Doble Perimetral Solapado'
                : 'Perimetral Simple (2 ramas)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hoveredBar && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">
                <span>Barra {hoveredBar.id}:</span>
                <span>Ø{hoveredBar.diameter} mm</span>
                <span>(x: {Math.round(hoveredBar.x)} mm, y: {Math.round(hoveredBar.y)} mm)</span>
              </div>
            )}

            {onOpenCombinedBarsModal && (
              <button
                onClick={onOpenCombinedBarsModal}
                className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <span>⚡ Diagnóstico & Soluciones</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
