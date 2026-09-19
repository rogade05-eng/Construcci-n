/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  COMPLETE_STEEL_CATALOG,
  COMPLETE_CONCRETE_CATALOG,
  COMPLETE_WOOD_CATALOG,
  COMPLETE_STEEL_MATERIALS,
  ExtendedSteelProfile,
} from '../engine/materialsLibrary';
import { MaterialType } from '../types';

interface MaterialsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMaterial: MaterialType;
  onSelectSteelProfile: (profileId: string) => void;
  onSelectSteelGrade: (gradeKey: string) => void;
  onSelectConcreteMix: (concreteKey: string) => void;
  onSelectWoodSpecies: (woodKey: string) => void;
}

export function MaterialsCatalogModal({
  isOpen,
  onClose,
  currentMaterial,
  onSelectSteelProfile,
  onSelectSteelGrade,
  onSelectConcreteMix,
  onSelectWoodSpecies,
}: MaterialsCatalogModalProps) {
  const [catalogTab, setCatalogTab] = useState<'steel_profiles' | 'steel_grades' | 'concrete' | 'wood'>(
    currentMaterial === 'steel'
      ? 'steel_profiles'
      : currentMaterial === 'wood'
      ? 'wood'
      : 'concrete'
  );

  const [steelFilter, setSteelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filtrado de perfiles de acero
  const filteredProfiles = COMPLETE_STEEL_CATALOG.filter((p) => {
    const matchesType =
      steelFilter === 'ALL' ||
      (steelFilter === 'HOT_ROLLED' && p.category === 'hot_rolled') ||
      (steelFilter === 'COLD_FORMED' && p.category === 'cold_formed') ||
      (steelFilter === 'TUBULAR' && (p.type === 'HSS_RECT' || p.type === 'HSS_ROUND')) ||
      (steelFilter === 'IPN' && p.id.startsWith('IPN')) ||
      (steelFilter === 'IPE' && p.id.startsWith('IPE')) ||
      (steelFilter === 'HEB' && p.id.startsWith('HEB')) ||
      (steelFilter === 'UPN' && p.id.startsWith('UPN')) ||
      (steelFilter === 'W' && p.family === 'W_SHAPE');

    const matchesSearch =
      p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.standardRef && p.standardRef.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });

  // Filtrado de hormigones
  const filteredConcrete = Object.entries(COMPLETE_CONCRETE_CATALOG).filter(([key, item]) => {
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.eurocodeClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filtrado de maderas
  const filteredWood = Object.entries(COMPLETE_WOOD_CATALOG).filter(([key, item]) => {
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.standardRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filtrado de aceros
  const filteredSteelMaterials = Object.entries(COMPLETE_STEEL_MATERIALS).filter(([key, item]) => {
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.standardRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ENCABEZADO */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold">
              📚
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">
                Biblioteca Integral de Perfiles y Materiales
              </h2>
              <p className="text-xs text-slate-400">
                Propiedades mecánicas y geométricas precargadas según Normas Cubanas (NC), Eurocódigos y ACI/AISC/ASTM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            ✕
          </button>
        </div>

        {/* SELECTOR DE TABS Y BÚSQUEDA */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setCatalogTab('steel_profiles')}
              className={`px-3 py-1.5 rounded-lg transition ${
                catalogTab === 'steel_profiles'
                  ? 'bg-cyan-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔩 Perfiles de Acero ({COMPLETE_STEEL_CATALOG.length})
            </button>
            <button
              onClick={() => setCatalogTab('concrete')}
              className={`px-3 py-1.5 rounded-lg transition ${
                catalogTab === 'concrete'
                  ? 'bg-cyan-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🧱 Hormigones ({Object.keys(COMPLETE_CONCRETE_CATALOG).length})
            </button>
            <button
              onClick={() => setCatalogTab('wood')}
              className={`px-3 py-1.5 rounded-lg transition ${
                catalogTab === 'wood'
                  ? 'bg-cyan-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌲 Maderas Estructurales ({Object.keys(COMPLETE_WOOD_CATALOG).length})
            </button>
            <button
              onClick={() => setCatalogTab('steel_grades')}
              className={`px-3 py-1.5 rounded-lg transition ${
                catalogTab === 'steel_grades'
                  ? 'bg-cyan-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚙️ Calidades de Acero ({Object.keys(COMPLETE_STEEL_MATERIALS).length})
            </button>
          </div>

          {/* Campo de búsqueda */}
          <div className="flex-1 min-w-[200px] max-w-xs relative">
            <input
              type="text"
              placeholder="Buscar en catálogo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CONTENIDO DEL CATÁLOGO CON SCROLL */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs font-mono">
          {/* 1. PERFILES DE ACERO */}
          {catalogTab === 'steel_profiles' && (
            <div className="space-y-3">
              {/* Filtros de tipos de perfiles */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { key: 'ALL', label: 'Todos' },
                  { key: 'HOT_ROLLED', label: '🔥 Laminados en Caliente' },
                  { key: 'COLD_FORMED', label: '❄️ Conformados en Frío' },
                  { key: 'IPN', label: 'IPN' },
                  { key: 'IPE', label: 'IPE' },
                  { key: 'HEB', label: 'HEB' },
                  { key: 'UPN', label: 'UPN' },
                  { key: 'W', label: 'W-Shapes (ASTM)' },
                  { key: 'TUBULAR', label: 'Tubulares HSS/CHS' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSteelFilter(f.key)}
                    className={`px-2.5 py-1 rounded-lg border transition ${
                      steelFilter === f.key
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tabla de perfiles */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px]">
                      <th className="p-2.5">Designación</th>
                      <th className="p-2.5">Tipo / Proceso</th>
                      <th className="p-2.5">h × b (mm)</th>
                      <th className="p-2.5">tw / tf (mm)</th>
                      <th className="p-2.5">Área A (cm²)</th>
                      <th className="p-2.5">Peso (kg/m)</th>
                      <th className="p-2.5">Ix / Iy (cm⁴)</th>
                      <th className="p-2.5">rx / ry (cm)</th>
                      <th className="p-2.5">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11px]">
                    {filteredProfiles.map((p) => (
                      <tr key={p.id} className="hover:bg-cyan-950/20 transition group">
                        <td className="p-2.5 text-slate-100 font-bold">
                          {p.designation}
                          <span className="block text-[9px] text-slate-400 font-normal">
                            {p.standardRef || p.type}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              p.category === 'cold_formed'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {p.category === 'cold_formed' ? 'Conformado en Frío' : 'Laminado Caliente'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {p.d} × {p.b}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {p.tw} / {p.tf}
                        </td>
                        <td className="p-2.5 text-cyan-300 font-semibold">{p.A.toFixed(1)}</td>
                        <td className="p-2.5 text-slate-300">{p.weightKgM ? p.weightKgM.toFixed(1) : '-'}</td>
                        <td className="p-2.5 text-slate-300">
                          {Math.round(p.Ix)} / {Math.round(p.Iy)}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {p.rx} / {p.ry}
                        </td>
                        <td className="p-2.5">
                          <button
                            onClick={() => {
                              onSelectSteelProfile(p.id);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded bg-cyan-600/80 hover:bg-cyan-500 text-white text-[10px] font-semibold transition"
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. HORMIGONES */}
          {catalogTab === 'concrete' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredConcrete.map(([key, item]) => (
                <div
                  key={key}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-cyan-700/60 transition flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                        {item.eurocodeClass}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{item.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Resistencia f'c:</span>
                      <strong className="text-emerald-400 text-xs">{item.fc} MPa</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Módulo Ec:</span>
                      <strong className="text-cyan-300 text-xs">{item.Ec.toLocaleString()} MPa</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Densidad ρ:</span>
                      <span className="text-slate-300">{item.density} kg/m³</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cálculo Rb (NC):</span>
                      <span className="text-amber-300 font-semibold">{item.Rb_NC} MPa</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectConcreteMix(key);
                      onClose();
                    }}
                    className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
                  >
                    Usar este Hormigón
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 3. MADERAS ESTRUCTURALES */}
          {catalogTab === 'wood' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredWood.map(([key, item]) => (
                <div
                  key={key}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-amber-700/60 transition flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300">
                        {item.standardRef}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                      Especies: {item.species}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{item.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Compresión fc,0:</span>
                      <strong className="text-emerald-400 text-xs">{item.fc0} MPa</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tracción ft,0:</span>
                      <strong className="text-cyan-300 text-xs">{item.ft0} MPa</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cortante fv:</span>
                      <strong className="text-slate-200 text-xs">{item.fv} MPa</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Módulo E0,mean:</span>
                      <span className="text-slate-300 font-semibold">{item.E0mean} MPa</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Módulo E0,05:</span>
                      <span className="text-slate-300">{item.E005} MPa</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Factor kmod:</span>
                      <span className="text-amber-300 font-bold">{item.kmod}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectWoodSpecies(key);
                      onClose();
                    }}
                    className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition"
                  >
                    Usar esta Madera
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 4. CALIDADES DE ACERO */}
          {catalogTab === 'steel_grades' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSteelMaterials.map(([key, item]) => (
                <div
                  key={key}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-cyan-700/60 transition flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 block mt-0.5">{item.standardRef}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Fluencia Fy:</span>
                      <strong className="text-emerald-400 text-xs">{item.Fy} MPa</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Última Fu:</span>
                      <strong className="text-cyan-300 text-xs">{item.Fu} MPa</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Módulo E:</span>
                      <span className="text-slate-300">200 GPa</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectSteelGrade(key);
                      onClose();
                    }}
                    className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
                  >
                    Seleccionar Calidad de Acero
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIE */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>* Todas las propiedades cumplen con los ensayos y tolerancias normativas vigentes.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Cerrar Biblioteca
          </button>
        </div>
      </div>
    </div>
  );
}
