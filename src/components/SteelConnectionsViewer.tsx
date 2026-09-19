/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SteelConnectionDesign, SteelProfileData } from '../types';

interface SteelConnectionsViewerProps {
  connection: SteelConnectionDesign;
  profile: SteelProfileData;
  Pu: number;
  Mux: number;
  Vux: number;
}

export const SteelConnectionsViewer: React.FC<SteelConnectionsViewerProps> = ({
  connection,
  profile,
  Pu,
  Mux,
  Vux,
}) => {
  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Diseño de Conexiones en Acero: Placa Base y Nudo Viga-Columna
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Verificación según AISC Design Guide 1, AISC 360-16 y Norma Cubana de Acero.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Detalle 1: Placa Base y Pernos de Anclaje */}
        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200 font-mono flex items-center gap-2">
              <span className="text-amber-400">■</span> Conexión 1: Placa Base a Zapata
            </h4>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-cyan-400 border border-slate-700">
              {connection.plateGrade}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Dimensiones Placa (B x N)</span>
              <span className="text-slate-100 font-bold">
                {connection.basePlateWidth} x {connection.basePlateLength} mm
              </span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Espesor Placa tp</span>
              <span className="text-amber-400 font-bold">{connection.basePlateThickness} mm</span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Pernos de Anclaje</span>
              <span className="text-slate-100 font-bold">
                {connection.boltCount} Pernos Ø{connection.boltDiameter} mm
              </span>
              <span className="text-[10px] text-slate-500 block">{connection.boltGrade}</span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Soldadura Filete a Base</span>
              <span className="text-cyan-400 font-bold">a = {connection.weldLegSize} mm</span>
              <span className="text-[10px] text-slate-500 block">Electrodo {connection.weldElectrode}</span>
            </div>
          </div>

          {/* Mini diagrama técnico de placa base */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-center">
            <svg viewBox="0 0 240 140" className="w-full max-w-[240px] h-auto">
              <rect x="30" y="20" width="180" height="100" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
              {/* Perfil en el centro */}
              <rect x="70" y="45" width="100" height="12" fill="#0284c7" />
              <rect x="114" y="57" width="12" height="26" fill="#0284c7" />
              <rect x="70" y="83" width="100" height="12" fill="#0284c7" />
              {/* 4 Pernos */}
              <circle cx="48" cy="35" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
              <circle cx="192" cy="35" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
              <circle cx="48" cy="105" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
              <circle cx="192" cy="105" r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
              {/* Cotas */}
              <text x="120" y="15" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                B = {connection.basePlateWidth} mm
              </text>
              <text x="15" y="75" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle" transform="rotate(-90, 15, 75)">
                N = {connection.basePlateLength} mm
              </text>
            </svg>
          </div>
        </div>

        {/* Detalle 2: Unión Nodal Viga-Columna (Atornillada / Soldada) */}
        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200 font-mono flex items-center gap-2">
              <span className="text-cyan-400">■</span> Conexión 2: Nudo Viga - Columna
            </h4>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-emerald-400 border border-slate-700">
              Conexión Atornillada a Cortante
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Chapa de Cortante (Shear Tab)</span>
              <span className="text-slate-100 font-bold">Espesor e = {connection.shearTabThickness} mm</span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Pernos Alta Resistencia</span>
              <span className="text-amber-400 font-bold">{connection.connectionBoltsCount} Pernos Ø20 mm (A325)</span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Soldadura a Columna</span>
              <span className="text-cyan-400 font-bold">Filete a = {connection.connectionWeldSize} mm</span>
            </div>

            <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Cortante Actuante Vu</span>
              <span className="text-slate-100 font-bold">{Vux} kN</span>
            </div>
          </div>

          {/* Diagrama nudo viga-columna */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-center">
            <svg viewBox="0 0 240 140" className="w-full max-w-[240px] h-auto">
              {/* Columna vertical */}
              <rect x="40" y="10" width="35" height="120" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Viga horizontal */}
              <rect x="85" y="45" width="130" height="50" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
              {/* Chapa de cortante soldada a la columna */}
              <rect x="75" y="50" width="10" height="40" fill="#f59e0b" />
              {/* Cordón de soldadura filete columna-chapa */}
              <line x1="75" y1="50" x2="75" y2="90" stroke="#f59e0b" strokeWidth="3" />
              {/* Pernos pasantes al alma de la viga */}
              <circle cx="100" cy="58" r="4" fill="#e2e8f0" stroke="#000" strokeWidth="1" />
              <circle cx="100" cy="70" r="4" fill="#e2e8f0" stroke="#000" strokeWidth="1" />
              <circle cx="100" cy="82" r="4" fill="#e2e8f0" stroke="#000" strokeWidth="1" />
              <text x="145" y="75" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                Viga Acero
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
