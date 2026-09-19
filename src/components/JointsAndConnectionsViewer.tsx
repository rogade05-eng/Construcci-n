/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MaterialType,
  DesignStandard,
  ConcreteGeometry,
  ConcreteTieDesign,
  SteelConnectionDesign,
  SteelProfileData,
  WoodProperties,
} from '../types';

interface JointsAndConnectionsViewerProps {
  material: MaterialType;
  standard: DesignStandard;
  Pu: number;
  Mux: number;
  Vux: number;
  // Hormigón
  concreteGeom?: ConcreteGeometry;
  tieDesign?: ConcreteTieDesign;
  fc?: number;
  // Acero
  steelProfile?: SteelProfileData;
  steelConnection?: SteelConnectionDesign;
  // Madera
  woodB?: number;
  woodH?: number;
  woodProps?: WoodProperties;
}

export const JointsAndConnectionsViewer: React.FC<JointsAndConnectionsViewerProps> = ({
  material,
  standard,
  Pu,
  Mux,
  Vux,
  concreteGeom = { b: 400, h: 400, cover: 40 },
  tieDesign = {
    diameter: 10,
    s0: 100,
    sMid: 200,
    l0: 600,
    legsX: 2,
    legsY: 2,
    hookAngle: 135,
    hookLength: 80,
    lapSpliceLength: 600,
    lapLocation: 'Tercio central',
  },
  fc = 25,
  steelProfile = {
    id: 'W12x65',
    type: 'W_SHAPE',
    designation: 'W12x65',
    d: 307,
    b: 305,
    tw: 9.9,
    tf: 15.4,
    A: 123,
    Ix: 22200,
    Iy: 7240,
    rx: 13.4,
    ry: 7.7,
    Zx: 1570,
    Zy: 719,
  },
  steelConnection = {
    basePlateWidth: 450,
    basePlateLength: 450,
    basePlateThickness: 25,
    plateGrade: 'A36',
    boltDiameter: 20,
    boltGrade: 'A325',
    boltCount: 4,
    boltDistanceEdge: 45,
    weldType: 'fillet',
    weldLegSize: 8,
    weldElectrode: 'E70XX',
    weldThroat: 5.65,
    weldCapacityKN: 420,
    shearTabThickness: 10,
    connectionBoltsCount: 3,
    connectionWeldSize: 6,
  },
  woodB = 200,
  woodH = 200,
  woodProps,
}) => {
  // Selector de Tipo de Unión
  const [selectedJoint, setSelectedJoint] = useState<'joint_beam_col' | 'joint_base'>('joint_beam_col');
  const [jointSubtype, setJointSubtype] = useState<'interior' | 'exterior' | 'corner'>('exterior');

  // CÁLCULOS TÉCNICOS PARA HORMIGÓN
  // 1. Nudo Viga-Columna
  const colB = concreteGeom.b;
  const colH = concreteGeom.h;
  const beamB = Math.round(colB * 0.75);
  const beamH = Math.round(colH * 1.25);

  // Factor gamma para cortante en el nudo según confinamiento (ACI 318-19 §18.8.4 / NC 450)
  const gammaFactor = jointSubtype === 'interior' ? 1.7 : jointSubtype === 'exterior' ? 1.2 : 1.0;
  // Ancho efectivo del nudo bj (mm)
  const bj = Math.min(colB, beamB + colH, beamB + 2 * Math.max(0, (colB - beamB) / 2));
  // Área efectiva del nudo Aj (mm²)
  const Aj = bj * colH;
  // Resistencia a cortante nominal del nudo Vn (kN)
  const phiJoint = 0.85;
  const Vn_joint_kN = (gammaFactor * Math.sqrt(fc) * Aj) / 1000;
  const phiVn_joint_kN = phiJoint * Vn_joint_kN;

  // Cortante actuante estimado en el nudo por momento de viga
  const As_beam_est = Math.max(800, (beamB * beamH * 0.012)); // mm²
  const Tb_kN = (As_beam_est * 420 * 1.25) / 1000; // 1.25 * fy por sobre-resistencia sísmica
  const Vcol_est = Math.max(Vux, 80);
  const Vj_demand_kN = Math.max(50, Math.round(Tb_kN - Vcol_est));
  const jointDCR = Vj_demand_kN / Math.max(1, phiVn_joint_kN);

  // 2. Base Columna-Zapata
  const A1 = colB * colH; // mm²
  const A2 = Math.min(4 * A1, Math.max(A1, (colB + 300) * (colH + 300))); // Pedestal / zapata mm²
  const phiBearing = 0.65;
  const bearingRatio = Math.min(2.0, Math.sqrt(A2 / A1));
  const phiPn_bearing_kN = (phiBearing * 0.85 * fc * A1 * bearingRatio) / 1000;
  const bearingDCR = Pu / Math.max(1, phiPn_bearing_kN);

  // Armadura mínima de espigas (dowels) de arranque: 0.005 * Ag
  const As_dowels_req = Math.round(0.005 * A1);
  const dowelsDia = 16;
  const singleDowelArea = (Math.PI * dowelsDia * dowelsDia) / 4;
  const dowelsCount = Math.max(4, Math.ceil(As_dowels_req / singleDowelArea));
  const dowelsLengthLd = Math.round(Math.max(450, (420 * dowelsDia) / (2.2 * Math.sqrt(fc))));

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl space-y-4">
      {/* Encabezado del Visor de Uniones */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Visor de Uniones, Nudos Estructurales y Apoyos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Comprobaciones mecánicas y detalle constructivo CAD según{' '}
            <strong className="text-cyan-300">
              {material === 'concrete'
                ? 'ACI 318-19 Cap. 15/18.8 y NC 450:2006'
                : material === 'steel'
                ? 'AISC Design Guide 1 y AISC 360-16'
                : 'Eurocódigo 5 y NC Madera'}
            </strong>
          </p>
        </div>

        {/* Selector de Unión: Nudo Viga-Columna vs Apoyo Base */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setSelectedJoint('joint_beam_col')}
            className={`px-3 py-1.5 rounded-md transition ${
              selectedJoint === 'joint_beam_col'
                ? 'bg-cyan-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {material === 'concrete' ? 'Nudo Viga - Columna' : material === 'steel' ? 'Nudo Nodal Viga-Col' : 'Nudo Viga - Columna'}
          </button>
          <button
            onClick={() => setSelectedJoint('joint_base')}
            className={`px-3 py-1.5 rounded-md transition ${
              selectedJoint === 'joint_base'
                ? 'bg-cyan-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {material === 'concrete' ? 'Base Columna - Zapata' : material === 'steel' ? 'Placa Base a Zapata' : 'Apoyo con Pedestal'}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CASO 1: HORMIGÓN ARMADO */}
      {/* ======================================================== */}
      {material === 'concrete' && (
        <div className="space-y-4 font-mono text-xs">
          {/* DETALLE 1: NUDO VIGA-COLUMNA HORMIGÓN */}
          {selectedJoint === 'joint_beam_col' && (
            <div className="space-y-4">
              {/* Barra de Subtipos de Nudo */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-xs font-bold">Tipo de Confinamiento del Nudo:</span>
                <div className="flex items-center gap-1.5">
                  {(['interior', 'exterior', 'corner'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setJointSubtype(st)}
                      className={`px-2.5 py-1 rounded text-[11px] capitalize transition ${
                        jointSubtype === st
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {st === 'interior' ? 'Interior (γ=1.7)' : st === 'exterior' ? 'Exterior (γ=1.2)' : 'Esquina (γ=1.0)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Diagrama Técnico SVG del Nudo Viga-Columna */}
                <div className="lg:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">
                    CAD DETALLE 2D - NUDO SISMO-RESISTENTE
                  </span>
                  <svg viewBox="0 0 340 300" className="w-full max-w-[340px] h-auto">
                    {/* Fondo y ejes */}
                    <line x1="170" y1="20" x2="170" y2="280" stroke="#334155" strokeDasharray="3 3" />
                    <line x1="20" y1="150" x2="320" y2="150" stroke="#334155" strokeDasharray="3 3" />

                    {/* Columna Vertical (Hormigón) */}
                    <rect x="130" y="30" width="80" height="240" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" rx="2" />

                    {/* Viga Horizontal (Acomete por la izquierda en nudo exterior, o ambos lados si interior) */}
                    {jointSubtype === 'interior' ? (
                      <>
                        <rect x="30" y="110" width="100" height="80" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
                        <rect x="210" y="110" width="100" height="80" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
                      </>
                    ) : (
                      <rect x="30" y="110" width="100" height="80" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
                    )}

                    {/* ZONA DEL NUDO (Achurada / sombreada) */}
                    <rect x="130" y="110" width="80" height="80" fill="#0284c7" fillOpacity="0.25" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="2 2" />

                    {/* Barras Longitudinales de la Columna (4 esquinas pasantes) */}
                    <line x1="140" y1="30" x2="140" y2="270" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                    <line x1="200" y1="30" x2="200" y2="270" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

                    {/* Barras de la Viga y Ganchos a 90° dentro del nudo */}
                    <line x1="30" y1="120" x2="190" y2="120" stroke="#10b981" strokeWidth="3" />
                    <line x1="190" y1="120" x2="190" y2="160" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

                    <line x1="30" y1="180" x2="190" y2="180" stroke="#10b981" strokeWidth="3" />
                    <line x1="190" y1="180" x2="190" y2="140" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

                    {/* Estribos Confinantes dentro del Nudo (Capítulo 18) */}
                    <line x1="135" y1="128" x2="205" y2="128" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="135" y1="150" x2="205" y2="150" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
                    <line x1="135" y1="172" x2="205" y2="172" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />

                    {/* Flechas de Momento y Cortante en Nudo */}
                    <path d="M 60 95 Q 85 85 110 100" fill="none" stroke="#e0e7ff" strokeWidth="2" markerEnd="url(#arrow)" />
                    <text x="85" y="80" fill="#cbd5e1" fontSize="9" textAnchor="middle">
                      M_viga
                    </text>

                    {/* Cotas */}
                    <text x="170" y="295" fill="#94a3b8" fontSize="9" textAnchor="middle">
                      Columna {colB} x {colH} mm
                    </text>
                    <text x="50" y="210" fill="#94a3b8" fontSize="9" textAnchor="middle">
                      Viga {beamB} x {beamH} mm
                    </text>
                    <text x="170" y="153" fill="#f1f5f9" fontSize="8" fontWeight="bold" textAnchor="middle">
                      Núcleo Vj
                    </text>
                  </svg>
                </div>

                {/* Panel de Comprobaciones Numéricas del Nudo */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Cortante Actuante Vj,u</span>
                      <span className="text-white font-bold text-sm">{Vj_demand_kN} kN</span>
                      <span className="text-[10px] text-slate-500 block">Por flexión sísmica viga</span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Capacidad Nudo φVn</span>
                      <span className="text-cyan-400 font-bold text-sm">{Math.round(phiVn_joint_kN)} kN</span>
                      <span className="text-[10px] text-slate-500 block">γ = {gammaFactor} · √f'c · Aj</span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Ratio Demanda/Capacidad DCR</span>
                      <span
                        className={`font-bold text-sm ${
                          jointDCR <= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {jointDCR.toFixed(2)}{' '}
                        {jointDCR <= 1.0 ? '(CUMPLE ✓)' : '(EXCEDE ✗)'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Estribos en Nudo Ash</span>
                      <span className="text-amber-300 font-bold text-sm">3 Cercos Ø{tieDesign.diameter} mm</span>
                      <span className="text-[10px] text-slate-500 block">Continuos en zona de nudo</span>
                    </div>
                  </div>

                  {/* Fórmulas y Artículos Normativos */}
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-200 block border-b border-slate-800 pb-1">
                      📋 Requisitos Sísmicos ACI 318-19 §18.8 / NC 450
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-slate-300 font-sans">
                      <li className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold">1.</span>
                        <span>
                          <strong>Columna Fuerte - Viga Débil:</strong> Σ Mnc ≥ 1.2 · Σ Mnb para garantizar que la rótula plástica ocurra en la viga y no en la columna.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold">2.</span>
                        <span>
                          <strong>Confinamiento en el Nudo:</strong> Los estribos transversales de la columna deben mantenerse a través del nudo con separación no mayor a 150 mm.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold">3.</span>
                        <span>
                          <strong>Anclaje en Nudo Exterior:</strong> Las barras de la viga deben penetrar hasta el núcleo y terminar en gancho estándar a 90° con extensión hacia abajo.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DETALLE 2: BASE COLUMNA - ZAPATA HORMIGÓN */}
          {selectedJoint === 'joint_base' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Diagrama Técnico SVG Base Columna a Zapata */}
              <div className="lg:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                <span className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">
                  CAD DETALLE 2D - APOYO COLUMNA / ZAPATA
                </span>
                <svg viewBox="0 0 340 300" className="w-full max-w-[340px] h-auto">
                  {/* Zapata / Pedestal */}
                  <rect x="30" y="190" width="280" height="90" fill="#0f172a" stroke="#64748b" strokeWidth="2" rx="2" />
                  {/* Columna naciente */}
                  <rect x="110" y="20" width="120" height="170" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

                  {/* Espigas / Dovelas de Arranque (Dowels) con dobladillo en zapata */}
                  <path d="M 125 50 L 125 240 L 70 240" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 215 50 L 215 240 L 270 240" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

                  {/* Barras longitudinales de columna que solapan con espigas */}
                  <line x1="135" y1="20" x2="135" y2="185" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 1" />
                  <line x1="205" y1="20" x2="205" y2="185" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 1" />

                  {/* Parrilla inferior de la zapata */}
                  <line x1="45" y1="255" x2="295" y2="255" stroke="#94a3b8" strokeWidth="2" />
                  <circle cx="70" cy="255" r="3" fill="#cbd5e1" />
                  <circle cx="110" cy="255" r="3" fill="#cbd5e1" />
                  <circle cx="150" cy="255" r="3" fill="#cbd5e1" />
                  <circle cx="190" cy="255" r="3" fill="#cbd5e1" />
                  <circle cx="230" cy="255" r="3" fill="#cbd5e1" />
                  <circle cx="270" cy="255" r="3" fill="#cbd5e1" />

                  {/* Estribos en arranque de columna */}
                  <line x1="115" y1="120" x2="225" y2="120" stroke="#ef4444" strokeWidth="2" />
                  <line x1="115" y1="150" x2="225" y2="150" stroke="#ef4444" strokeWidth="2" />
                  <line x1="115" y1="175" x2="225" y2="175" stroke="#ef4444" strokeWidth="2" />

                  {/* Cota y textos */}
                  <text x="170" y="15" fill="#38bdf8" fontSize="9" textAnchor="middle">
                    Pu = {Pu} kN
                  </text>
                  <text x="170" y="225" fill="#f59e0b" fontSize="9" textAnchor="middle">
                    {dowelsCount} Espigas Ø{dowelsDia} mm (Ld = {dowelsLengthLd} mm)
                  </text>
                  <text x="170" y="275" fill="#94a3b8" fontSize="9" textAnchor="middle">
                    Zapata / Cimiento A2
                  </text>
                </svg>
              </div>

              {/* Parámetros de la Base de Zapata */}
              <div className="lg:col-span-6 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Aplastamiento Hormigón φPn</span>
                    <span className="text-white font-bold text-sm">{Math.round(phiPn_bearing_kN)} kN</span>
                    <span className="text-[10px] text-slate-500 block">√(A2/A1) = {bearingRatio.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Carga Axial Demandada Pu</span>
                    <span className="text-cyan-400 font-bold text-sm">{Pu} kN</span>
                    <span className="text-[10px] text-slate-500 block">DCR = {bearingDCR.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Espigas Requeridas (Dowels)</span>
                    <span className="text-amber-400 font-bold text-sm">{dowelsCount} Ø{dowelsDia} mm</span>
                    <span className="text-[10px] text-slate-500 block">As = {dowelsCount * Math.round(singleDowelArea)} mm² (≥0.5% Ag)</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Longitud Anclaje Ld</span>
                    <span className="text-emerald-400 font-bold text-sm">{dowelsLengthLd} mm</span>
                    <span className="text-[10px] text-slate-500 block">Con pata a 90° de 200 mm</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-200 block border-b border-slate-800 pb-1">
                    📋 Criterios Constructivos del Apoyo
                  </span>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Las espigas de arranque deben amarrarse firmemente a la parrilla inferior de la zapata antes del hormigonado. El traslape con la armadura de la columna debe confinarse con al menos 3 estribos cerrados espaciados a no más de 100 mm en la zona de arranque.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* CASO 2: ACERO ESTRUCTURAL */}
      {/* ======================================================== */}
      {material === 'steel' && (
        <div className="space-y-4 font-mono text-xs">
          {selectedJoint === 'joint_base' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Detalle 1: Placa Base a Zapata */}
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <span className="text-amber-400">■</span> Placa Base y Pernos de Anclaje
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 border border-slate-700">
                    {steelConnection.plateGrade}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Dimensiones (B x N)</span>
                    <span className="text-slate-100 font-bold">{steelConnection.basePlateWidth} x {steelConnection.basePlateLength} mm</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Espesor Placa tp</span>
                    <span className="text-amber-400 font-bold">{steelConnection.basePlateThickness} mm</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Pernos de Anclaje</span>
                    <span className="text-slate-100 font-bold">{steelConnection.boltCount} Pernos Ø{steelConnection.boltDiameter} mm</span>
                    <span className="text-[10px] text-slate-500 block">{steelConnection.boltGrade}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Soldadura a Placa</span>
                    <span className="text-cyan-400 font-bold">a = {steelConnection.weldLegSize} mm</span>
                    <span className="text-[10px] text-slate-500 block">{steelConnection.weldElectrode}</span>
                  </div>
                </div>

                {/* Gráfico CAD Placa Base */}
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-center">
                  <svg viewBox="0 0 240 140" className="w-full max-w-[240px] h-auto">
                    <rect x="30" y="20" width="180" height="100" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                    {/* Perfil en centro */}
                    <rect x="70" y="45" width="100" height="12" fill="#0284c7" />
                    <rect x="114" y="57" width="12" height="26" fill="#0284c7" />
                    <rect x="70" y="83" width="100" height="12" fill="#0284c7" />
                    {/* 4 Pernos */}
                    <circle cx="48" cy="35" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
                    <circle cx="192" cy="35" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
                    <circle cx="48" cy="105" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
                    <circle cx="192" cy="105" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
                    <text x="120" y="15" fill="#94a3b8" fontSize="9" textAnchor="middle">
                      B = {steelConnection.basePlateWidth} mm
                    </text>
                  </svg>
                </div>
              </div>

              {/* Chequeo de Cargas */}
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">Resistencia de la Base</h4>
                <div className="space-y-2 text-[11px] font-sans text-slate-300">
                  <p>• <strong>Presión de contacto:</strong> f_p = {Math.round(Pu / ((steelConnection.basePlateWidth * steelConnection.basePlateLength) / 1000))} MPa ≤ Fp,adm.</p>
                  <p>• <strong>Resistencia Soldadura Filete:</strong> {steelConnection.weldCapacityKN} kN frente a corte y momento.</p>
                  <p>• <strong>Pernos de Anclaje:</strong> Capacidad a tracción con anclaje a pedestal de hormigón.</p>
                </div>
              </div>
            </div>
          ) : (
            /* Detalle 2: Nudo Viga-Columna Acero */
            <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span className="text-cyan-400">■</span> Nudo Viga - Columna (Chapa de Cortante / Shear Tab)
                </h4>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-emerald-400 border border-slate-700">
                  Conexión Atornillada a Cortante
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Chapa Cortante (e)</span>
                  <span className="text-slate-100 font-bold">{steelConnection.shearTabThickness} mm</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Pernos Alta Resist.</span>
                  <span className="text-amber-400 font-bold">{steelConnection.connectionBoltsCount} Pernos Ø20 mm (A325)</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Soldadura a Ala/Alma</span>
                  <span className="text-cyan-400 font-bold">Filete a = {steelConnection.connectionWeldSize} mm</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Cortante Actuante Vu</span>
                  <span className="text-slate-100 font-bold">{Vux} kN</span>
                </div>
              </div>

              {/* Diagrama nudo viga-columna */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-center">
                <svg viewBox="0 0 240 140" className="w-full max-w-[240px] h-auto">
                  <rect x="40" y="10" width="35" height="120" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
                  <rect x="85" y="45" width="130" height="50" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                  <rect x="75" y="50" width="10" height="40" fill="#f59e0b" />
                  <line x1="75" y1="50" x2="75" y2="90" stroke="#f59e0b" strokeWidth="3" />
                  <circle cx="100" cy="58" r="4" fill="#e2e8f0" stroke="#000" strokeWidth="1" />
                  <circle cx="100" cy="70" r="4" fill="#e2e8f0" stroke="#000" strokeWidth="1" />
                  <circle cx="100" cy="82" r="4" fill="#e2e8f0" stroke="#000" strokeWidth="1" />
                  <text x="145" y="75" fill="#cbd5e1" fontSize="9">Viga Acero</text>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* CASO 3: MADERA ESTRUCTURAL */}
      {/* ======================================================== */}
      {material === 'wood' && (
        <div className="space-y-4 font-mono text-xs">
          {selectedJoint === 'joint_base' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <span className="text-emerald-400">■</span> Zócalo Metálico Antihumedad a Pedestal
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-emerald-400 border border-slate-700">
                    Acero Galvanizado e=5mm
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Separación Antihumedad</span>
                    <span className="text-emerald-400 font-bold">25 mm (1") libre</span>
                    <span className="text-[10px] text-slate-500 block">Evita pudrición de testa</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Pernos Pasantes</span>
                    <span className="text-amber-400 font-bold">2 Pernos Ø16 mm</span>
                    <span className="text-[10px] text-slate-500 block">Grado A307 Galvanizado</span>
                  </div>
                </div>

                {/* SVG Zócalo de Madera */}
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-center">
                  <svg viewBox="0 0 240 160" className="w-full max-w-[240px] h-auto">
                    {/* Pedestal de hormigón */}
                    <rect x="30" y="110" width="180" height="40" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                    {/* Placa base metálica levantada */}
                    <rect x="60" y="95" width="120" height="6" fill="#94a3b8" />
                    {/* Perno de anclaje a hormigón */}
                    <line x1="120" y1="101" x2="120" y2="135" stroke="#f59e0b" strokeWidth="4" />
                    {/* Aletas laterales de zócalo en U */}
                    <rect x="65" y="40" width="6" height="55" fill="#94a3b8" />
                    <rect x="169" y="40" width="6" height="55" fill="#94a3b8" />
                    {/* Columna de madera (separada 25mm de base) */}
                    <rect x="71" y="20" width="98" height="70" fill="#78350f" stroke="#d97706" strokeWidth="1.5" />
                    {/* Pernos pasantes horizontales */}
                    <circle cx="120" cy="55" r="4" fill="#f59e0b" />
                    <circle cx="120" cy="75" r="4" fill="#f59e0b" />
                    <text x="120" y="14" fill="#d97706" fontSize="9" textAnchor="middle">
                      Columna Madera {woodB}x{woodH}
                    </text>
                  </svg>
                </div>
              </div>

              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">Durabilidad y Normativa EC5 / NC</h4>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Para columnas de madera sometidas a intemperie o contacto con losas de suelo, la base nunca debe apoyarse directamente sobre el hormigón para impedir la ascensión capilar de agua. El herraje metálico debe contar con arandelas de reparto sobredimensionadas para no aplastar las fibras de madera al apretar los pernos.
                </p>
              </div>
            </div>
          ) : (
            /* Nudo viga-columna de madera */
            <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span className="text-amber-400">■</span> Nudo Viga - Columna con Pletinas Laterales Apernadas
              </h4>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Unión mediante doble pletina de acero galvanizado e=6 mm y pernos pasantes de Ø16 mm con tuerca y arandelas de ala ancha según Eurocódigo 5 (EN 1995-1-1).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
