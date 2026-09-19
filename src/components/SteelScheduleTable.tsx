/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SteelScheduleItem } from '../types';

interface SteelScheduleTableProps {
  schedule: SteelScheduleItem[];
  concreteVolumeM3: number;
  totalSteelWeightKg: number;
}

export const SteelScheduleTable: React.FC<SteelScheduleTableProps> = ({
  schedule,
  concreteVolumeM3,
  totalSteelWeightKg,
}) => {
  const steelRatioKgM3 = concreteVolumeM3 > 0 ? totalSteelWeightKg / concreteVolumeM3 : 0;

  const handleExportCsv = () => {
    const headers = 'Marca,Elemento,Forma,Diametro(mm),Cantidad,Longitud(m),LongitudTotal(m),PesoTotal(kg)\n';
    const rows = schedule
      .map(
        (s) =>
          `"${s.mark}","${s.description}","${s.shapeType}",${s.diameter},${s.count},${s.lengthM.toFixed(2)},${s.totalLengthM.toFixed(2)},${s.totalWeightKg.toFixed(2)}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'planilla_despiece_acero_columna.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Planilla Técnica de Despiece de Acero (Bar Bending Schedule - BBS)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cómputo métrico detallado para corte, doblado y armado en obra.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs flex items-center gap-1.5 transition"
          >
            <span>↓ Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabla con scroll horizontal */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
              <th className="py-2.5 px-3">Marca</th>
              <th className="py-2.5 px-3">Descripción</th>
              <th className="py-2.5 px-3">Croquis / Forma</th>
              <th className="py-2.5 px-3">Ø (mm)</th>
              <th className="py-2.5 px-3">Cant.</th>
              <th className="py-2.5 px-3">Long. (m)</th>
              <th className="py-2.5 px-3">Total (m)</th>
              <th className="py-2.5 px-3 text-right">Peso (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {schedule.map((item) => (
              <tr key={item.mark} className="hover:bg-slate-900/40 transition">
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                    {item.mark}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  <div className="font-medium text-slate-200">{item.description}</div>
                  <div className="text-[10px] text-slate-500">{item.shapeDetails}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="px-2 py-1 bg-slate-900 rounded border border-slate-800 text-[11px] text-amber-400 inline-block">
                    {item.shapeType === 'straight_hook' && '└──┐ Gancho 90°'}
                    {item.shapeType === 'closed_stirrup_135' && '▢ Cerco 135°'}
                    {item.shapeType === 'cross_tie' && 'S Grapa 135°/90°'}
                  </div>
                </td>
                <td className="py-2.5 px-3 font-bold text-amber-300">Ø{item.diameter}</td>
                <td className="py-2.5 px-3">{item.count}</td>
                <td className="py-2.5 px-3">{item.lengthM.toFixed(2)}</td>
                <td className="py-2.5 px-3">{item.totalLengthM.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                  {item.totalWeightKg.toFixed(1)} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumen de cómputo y ratios de obra */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Volumen de Hormigón</span>
          <span className="text-sm font-bold font-mono text-slate-100">{concreteVolumeM3.toFixed(3)} m³</span>
        </div>
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Peso Total de Acero</span>
          <span className="text-sm font-bold font-mono text-amber-400">{totalSteelWeightKg.toFixed(1)} kg</span>
        </div>
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Cuantía Volumétrica de Acero</span>
          <span className="text-sm font-bold font-mono text-cyan-400">
            {steelRatioKgM3.toFixed(1)} kg/m³
          </span>
          <span className="text-[10px] text-slate-500 block">Rango típico columnas: 90 - 140 kg/m³</span>
        </div>
      </div>
    </div>
  );
};
