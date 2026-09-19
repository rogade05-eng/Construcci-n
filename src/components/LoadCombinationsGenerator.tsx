/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  DesignStandard,
  ColumnLoads,
  MaterialType,
} from '../types';
import {
  ServiceLoads,
  LoadCombinationSummary,
  LoadCombinationResult,
  EconomicHousingExample,
  ECONOMIC_HOUSING_EXAMPLES,
  generateLoadCombinations,
} from '../engine/loadCombinationsEngine';
import {
  Calculator,
  Home,
  Layers,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Scale,
  Zap,
  Info,
  Building,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

interface LoadCombinationsGeneratorProps {
  standard: DesignStandard;
  onSelectStandard?: (std: DesignStandard) => void;
  currentLoads: ColumnLoads;
  material: MaterialType;
  onApplyLoads: (
    loads: ColumnLoads,
    service: ServiceLoads,
    exampleName?: string,
    recommendedSection?: EconomicHousingExample['recommendedSection']
  ) => void;
  onSelectMaterial?: (mat: MaterialType) => void;
}

export const LoadCombinationsGenerator: React.FC<LoadCombinationsGeneratorProps> = ({
  standard,
  onSelectStandard,
  currentLoads,
  material,
  onApplyLoads,
  onSelectMaterial,
}) => {
  // Estado de cargas de servicio iniciales (derivadas de la vivienda económica por defecto o estimadas de ULS)
  const defaultHousing = ECONOMIC_HOUSING_EXAMPLES[0];

  const [serviceLoads, setServiceLoads] = useState<ServiceLoads>({
    PD: Math.round(currentLoads.Pu * 0.65),
    PL: Math.round(currentLoads.Pu * 0.35 / 1.6),
    PLr: 0,
    MDx: Math.round(currentLoads.Mux * 0.6),
    MLx: Math.round(currentLoads.Mux * 0.4),
    MDy: Math.round(currentLoads.Muy * 0.6),
    MLy: Math.round(currentLoads.Muy * 0.4),
    VDx: Math.round(currentLoads.Vux * 0.6),
    VLx: Math.round(currentLoads.Vux * 0.4),
    VDy: Math.round(currentLoads.Vuy * 0.6),
    VLy: Math.round(currentLoads.Vuy * 0.4),
    PW: 0,
    MWx: 0,
    VWx: 0,
    PE: 0,
    MEx: 0,
    VEx: 0,
  });

  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(defaultHousing.id);
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);
  const [showLateralLoads, setShowLateralLoads] = useState(false);
  const [justAppliedNotification, setJustAppliedNotification] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'concrete' | 'steel' | 'wood'>('ALL');

  // Cálculo reactivo de combinaciones según la norma seleccionada
  const summary: LoadCombinationSummary = useMemo(() => {
    return generateLoadCombinations(serviceLoads, standard);
  }, [serviceLoads, standard]);

  // Combinación seleccionada (por defecto la gobernante)
  const activeCombination: LoadCombinationResult = useMemo(() => {
    if (selectedComboId) {
      const found = summary.combinations.find((c) => c.id === selectedComboId);
      if (found) return found;
    }
    return summary.governingCombination;
  }, [selectedComboId, summary]);

  // Manejar cambio de inputs de servicio
  const handleServiceChange = (field: keyof ServiceLoads, value: number) => {
    setServiceLoads((prev) => ({
      ...prev,
      [field]: isNaN(value) ? 0 : value,
    }));
    setSelectedExampleId(null); // Al editar manualmente, desvincula el preset
    setSelectedComboId(null); // Vuelve a la combinación gobernante automática
  };

  // Cargar un ejemplo de vivienda económica
  const handleLoadHousingExample = (example: EconomicHousingExample) => {
    setServiceLoads({ ...example.serviceLoads });
    setSelectedExampleId(example.id);
    setSelectedComboId(null);
  };

  // Aplicar la combinación seleccionada/gobernante al cálculo estructural ULS
  const handleApplyToModel = () => {
    const matchedExample = ECONOMIC_HOUSING_EXAMPLES.find((e) => e.id === selectedExampleId);
    onApplyLoads(
      activeCombination.loads,
      serviceLoads,
      matchedExample ? matchedExample.title : undefined,
      matchedExample?.recommendedSection
    );

    if (matchedExample && onSelectMaterial && matchedExample.recommendedMaterial !== material) {
      onSelectMaterial(matchedExample.recommendedMaterial);
    }

    setJustAppliedNotification(true);
    setTimeout(() => {
      setJustAppliedNotification(false);
    }, 4000);
  };

  // Filtrar ejemplos de viviendas
  const filteredExamples = ECONOMIC_HOUSING_EXAMPLES.filter((ex) => {
    if (selectedCategoryFilter === 'ALL') return true;
    return ex.recommendedMaterial === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* CABECERA: TÍTULO, NORMA Y DESCRIPCIÓN */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Módulo Especializado ULS & SLS
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Generador de Combinaciones de Carga & Solicitaciones de Servicio
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed font-sans">
              Ingresa cargas permanentes (<strong>D / Gk</strong>) y sobrecargas de uso (<strong>L / Qk</strong>) separadas. 
              El motor aplicará automáticamente los factores de mayoración de resistencia (LRFD / Estados Límites) según la norma vigente 
              (<strong>ACI 318-19</strong>, <strong>NC 450:2006</strong> o <strong>Eurocódigo 2</strong>) antes de enviar las solicitaciones al cálculo estructural.
            </p>
          </div>

          {/* Selector interactivo de norma de mayoración */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/90 flex flex-col gap-1 min-w-[240px]">
            <label className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
              <span>Normativa de Mayoración:</span>
              <Scale className="w-3 h-3 text-cyan-400" />
            </label>
            <select
              value={standard}
              onChange={(e) => onSelectStandard && onSelectStandard(e.target.value as DesignStandard)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ACI_318_19">🇺🇸 ACI 318-19 / ASCE 7 (1.2D + 1.6L)</option>
              <option value="NC_450_2006">🇨🇺 NC 450:2006 / NC 46 (1.2D + 1.6L / 1.35D)</option>
              <option value="EUROCODE_2">🇪🇺 Eurocódigo 2 EN 1990 (1.35G + 1.5Q)</option>
            </select>
            <div className="text-[10px] font-mono text-slate-500 flex justify-between">
              <span>Método: {standard === 'EUROCODE_2' ? 'STR / Coeficientes γ' : 'Factores LRFD (Mayoración)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* SECCIÓN 1: BANCO DE EJEMPLOS DE VIVIENDAS ECONÓMICAS E INTERÉS SOCIAL                     */}
      {/* ========================================================================================= */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Ejemplos de Viviendas Económicas con sus Solicitaciones y Cargas
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-normal">
                  6 Tipologías Reales
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Modelos de viviendas unifamiliares, bifamiliares, progresivas y rurales con desgloses detallados de peso propio y sobrecarga.
              </p>
            </div>
          </div>

          {/* Filtro por material de la vivienda */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-2.5 py-1 rounded transition ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas (6)
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('concrete')}
              className={`px-2.5 py-1 rounded transition ${
                selectedCategoryFilter === 'concrete'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hormigón (4)
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('steel')}
              className={`px-2.5 py-1 rounded transition ${
                selectedCategoryFilter === 'steel'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Acero (1)
            </button>
            <button
              onClick={() => setSelectedCategoryFilter('wood')}
              className={`px-2.5 py-1 rounded transition ${
                selectedCategoryFilter === 'wood'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Madera (1)
            </button>
          </div>
        </div>

        {/* Tarjetas de ejemplos de viviendas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredExamples.map((example) => {
            const isSelected = selectedExampleId === example.id;
            return (
              <div
                key={example.id}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition duration-200 ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        example.recommendedMaterial === 'concrete'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : example.recommendedMaterial === 'steel'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {example.recommendedMaterial === 'concrete'
                        ? 'Hormigón Armado'
                        : example.recommendedMaterial === 'steel'
                        ? 'Acero Estructural'
                        : 'Madera Estructural'}
                      {' · ' + example.levelsCount + (example.levelsCount === 1 ? ' Nivel' : ' Niveles')}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                        <CheckCircle2 className="w-3 h-3" /> Seleccionado
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 leading-snug">
                    {example.title}
                  </h4>
                  <p className="text-[11px] text-cyan-400/90 font-mono mt-0.5">
                    {example.subtitle}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 font-sans">
                    {example.description}
                  </p>

                  {/* Resumen numérico de cargas de servicio */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">CARGA MUERTA (D)</span>
                      <strong className="text-amber-300 text-xs">{example.serviceLoads.PD} kN</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        MDx = {example.serviceLoads.MDx} kN·m
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">CARGA VIVA (L)</span>
                      <strong className="text-cyan-300 text-xs">{example.serviceLoads.PL} kN</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        MLx = {example.serviceLoads.MLx} kN·m
                      </span>
                    </div>
                  </div>

                  {/* Recomendación de sección constructiva */}
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[10px] font-mono text-slate-300">
                    <div className="text-slate-400 text-[9px] font-bold">SECCIÓN ECONÓMICA RECOMENDADA:</div>
                    <div className="text-cyan-300 font-semibold">{example.recommendedSection.dimensions}</div>
                    <div className="text-slate-400 truncate">{example.recommendedSection.reinforcementOrProfile}</div>
                  </div>
                </div>

                {/* Botón de selección rápida */}
                <button
                  type="button"
                  onClick={() => handleLoadHousingExample(example)}
                  className={`w-full mt-3.5 py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{isSelected ? 'Cargado en Generador' : 'Cargar este Ejemplo de Vivienda'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* SECCIÓN 2: ENTRADA DE CARGAS DE SERVICIO (D, L, Lr) Y FACTORES DE MAYORACIÓN              */}
      {/* ========================================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sub-panel Izquierdo: Inputs de Cargas de Servicio D y L (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">
                1. Cargas de Servicio sin Mayorar (D, L, Lr)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setServiceLoads({
                  PD: 100,
                  PL: 30,
                  PLr: 0,
                  MDx: 12,
                  MLx: 6,
                  MDy: 8,
                  MLy: 4,
                  VDx: 14,
                  VLx: 7,
                  VDy: 0,
                  VLy: 0,
                  PW: 0,
                  MWx: 0,
                  VWx: 0,
                  PE: 0,
                  MEx: 0,
                  VEx: 0,
                });
                setSelectedExampleId(null);
              }}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              title="Restablecer valores estándar de prueba"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          </div>

          {/* Cargas axiales principales: PD y PL */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-900/40">
              <label className="text-[10px] font-mono text-amber-300 font-bold block mb-1 flex items-center justify-between">
                <span>Axial Muerto (PD)</span>
                <span className="text-[9px] text-slate-500 font-normal">kN</span>
              </label>
              <input
                type="number"
                step="5"
                min="0"
                value={serviceLoads.PD}
                onChange={(e) => handleServiceChange('PD', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-sm font-bold focus:border-amber-400 focus:outline-none"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Peso propio + losa + muros</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-900/40">
              <label className="text-[10px] font-mono text-cyan-300 font-bold block mb-1 flex items-center justify-between">
                <span>Axial Vivo (PL)</span>
                <span className="text-[9px] text-slate-500 font-normal">kN</span>
              </label>
              <input
                type="number"
                step="5"
                min="0"
                value={serviceLoads.PL}
                onChange={(e) => handleServiceChange('PL', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-sm font-bold focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Sobrecarga habitacional</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <label className="text-[10px] font-mono text-slate-400 font-bold block mb-1 flex items-center justify-between">
                <span>Techo / Nieve (PLr)</span>
                <span className="text-[9px] text-slate-500 font-normal">kN</span>
              </label>
              <input
                type="number"
                step="2"
                min="0"
                value={serviceLoads.PLr || 0}
                onChange={(e) => handleServiceChange('PLr', parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-sm focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Cubierta inaccesible</span>
            </div>
          </div>

          {/* Momentos Flectores de Servicio en Eje Fuerte X y Eje Débil Y */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-400 font-bold block">
              Momentos Flectores de Servicio (kN·m):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">MDx (Muerto X)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.MDx}
                  onChange={(e) => handleServiceChange('MDx', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">MLx (Vivo X)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.MLx}
                  onChange={(e) => handleServiceChange('MLx', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">MDy (Muerto Y)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.MDy}
                  onChange={(e) => handleServiceChange('MDy', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">MLy (Vivo Y)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.MLy}
                  onChange={(e) => handleServiceChange('MLy', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cortantes de Servicio VDx y VLx */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-400 font-bold block">
              Cortantes de Servicio (kN):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">VDx (Muerto X)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.VDx}
                  onChange={(e) => handleServiceChange('VDx', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">VLx (Vivo X)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.VLx}
                  onChange={(e) => handleServiceChange('VLx', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">VDy (Muerto Y)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.VDy || 0}
                  onChange={(e) => handleServiceChange('VDy', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-0.5">VLy (Vivo Y)</label>
                <input
                  type="number"
                  step="1"
                  value={serviceLoads.VLy || 0}
                  onChange={(e) => handleServiceChange('VLy', parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Desplegable para acciones laterales opcionales (Viento W / Sismo E) */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowLateralLoads(!showLateralLoads)}
              className="flex items-center justify-between w-full text-xs font-mono text-cyan-400 hover:text-cyan-300 py-1"
            >
              <span className="flex items-center gap-1.5 font-bold">
                {showLateralLoads ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Acciones Laterales de Servicio (Viento W / Sismo E)
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                {showLateralLoads ? 'Ocultar' : 'Expandir'}
              </span>
            </button>

            {showLateralLoads && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[9px] text-slate-400 block">Viento Axial PW (kN)</label>
                    <input
                      type="number"
                      step="2"
                      value={serviceLoads.PW || 0}
                      onChange={(e) => handleServiceChange('PW', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Viento MWx (kN·m)</label>
                    <input
                      type="number"
                      step="2"
                      value={serviceLoads.MWx || 0}
                      onChange={(e) => handleServiceChange('MWx', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Viento Cortante VWx (kN)</label>
                    <input
                      type="number"
                      step="2"
                      value={serviceLoads.VWx || 0}
                      onChange={(e) => handleServiceChange('VWx', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-2 border-t border-slate-800/60">
                  <div>
                    <label className="text-[9px] text-slate-400 block">Sismo Axial PE (kN)</label>
                    <input
                      type="number"
                      step="2"
                      value={serviceLoads.PE || 0}
                      onChange={(e) => handleServiceChange('PE', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Sismo MEx (kN·m)</label>
                    <input
                      type="number"
                      step="2"
                      value={serviceLoads.MEx || 0}
                      onChange={(e) => handleServiceChange('MEx', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Sismo Cortante VEx (kN)</label>
                    <input
                      type="number"
                      step="2"
                      value={serviceLoads.VEx || 0}
                      onChange={(e) => handleServiceChange('VEx', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen del balance de cargas de servicio */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL AXIAL DE SERVICIO (PD + PL):</span>
              <strong className="text-slate-100 text-sm">{summary.totalServiceAxial} kN</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">RELACIÓN VIVA / MUERTA (L/D):</span>
              <strong className="text-cyan-400 text-sm">{(summary.ratioLoverD * 100).toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">MAYORACIÓN GLOBAL EFECTIVA:</span>
              <strong className="text-amber-300 text-sm">{summary.effectiveAmplificationFactor.toFixed(3)}x</strong>
            </div>
          </div>
        </div>

        {/* Sub-panel Derecho: Combinación Crítica Gobernadora y Acción ULS (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Tarjeta de la Combinación Gobernadora para el Diseño */}
          <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 p-5 rounded-2xl border border-cyan-800/50 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wide">
                  ⭐ Combinación Crítica de Diseño (ULS)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                {activeCombination.codeReference}
              </span>
            </div>

            <div className="my-2">
              <h4 className="text-base font-bold text-slate-100 font-mono">
                {activeCombination.name}
              </h4>
              <div className="text-cyan-300 font-mono font-bold text-sm bg-slate-950/80 px-3 py-1.5 rounded-lg border border-cyan-800/50 inline-block mt-1">
                {activeCombination.formula}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                {activeCombination.description}
              </p>
            </div>

            {/* Valores ULS resultantes de esta combinación */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 pt-3 border-t border-slate-800 text-xs font-mono">
              <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">AXIAL MAYORADO (Pu)</span>
                <strong className="text-amber-300 text-base">{activeCombination.loads.Pu}</strong>
                <span className="text-[9px] text-slate-400 ml-1">kN</span>
              </div>
              <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">MOMENTO MAYORADO (Mux)</span>
                <strong className="text-cyan-300 text-base">{activeCombination.loads.Mux}</strong>
                <span className="text-[9px] text-slate-400 ml-1">kN·m</span>
              </div>
              <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">MOMENTO BIAXIAL (Muy)</span>
                <strong className="text-slate-200 text-base">{activeCombination.loads.Muy}</strong>
                <span className="text-[9px] text-slate-400 ml-1">kN·m</span>
              </div>
              <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">CORTANTE (Vux)</span>
                <strong className="text-slate-200 text-base">{activeCombination.loads.Vux}</strong>
                <span className="text-[9px] text-slate-400 ml-1">kN</span>
              </div>
            </div>

            {/* BOTÓN DE ACCIÓN: APLICAR AL CÁLCULO ESTRUCTURAL */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyToModel}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-mono font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-600/30 transition transform active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current text-slate-950" />
                <span>Aplicar Solicitaciones Mayoradas al Cálculo ULS</span>
              </button>

              {justAppliedNotification && (
                <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/90 border border-emerald-600 text-emerald-300 font-mono text-xs text-center flex items-center justify-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>¡Cargas ULS transferidas exitosamente al análisis y diagramas P-M!</span>
                </div>
              )}
            </div>
          </div>

          {/* Comparativa Multi-Norma de Mayoración para la misma vivienda */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400" />
                Comparativa Multi-Norma para las Mismas Cargas (D={serviceLoads.PD} kN, L={serviceLoads.PL} kN)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {summary.comparisons.map((comp) => {
                const isCurrent = comp.standard === standard;
                return (
                  <div
                    key={comp.standard}
                    className={`p-2.5 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-cyan-950/60 border-cyan-600 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold">{comp.country}</span>
                      {isCurrent && <span className="text-[9px] bg-cyan-900 px-1 rounded text-cyan-300">Activa</span>}
                    </div>
                    <div className="text-[11px] font-bold text-slate-200 mt-1 truncate">
                      {comp.standardName}
                    </div>
                    <div className="text-xs font-bold text-amber-300 mt-1">
                      Pu = {comp.Pu} kN
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {comp.governingFormula}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 border-t border-slate-800/80 pt-1">
                      Factor: {comp.ratioToService.toFixed(2)}x
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* SECCIÓN 3: TABLA COMPLETA DE TODAS LAS COMBINACIONES NORMATIVAS GENERADAS                 */}
      {/* ========================================================================================= */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Tabla Completa de Combinaciones de Carga Generadas ({summary.standardName})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Haz clic en cualquier fila para seleccionar una combinación alternativa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">ID / Referencia</th>
                <th className="py-2.5 px-3">Fórmula Reglamentaria</th>
                <th className="py-2.5 px-3 text-right">Axial Pu (kN)</th>
                <th className="py-2.5 px-3 text-right">Momento Mux (kN·m)</th>
                <th className="py-2.5 px-3 text-right">Cortante Vux (kN)</th>
                <th className="py-2.5 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary.combinations.map((combo) => {
                const isSelected = activeCombination.id === combo.id;
                const isGov = combo.isGoverning;
                return (
                  <tr
                    key={combo.id}
                    onClick={() => setSelectedComboId(combo.id)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-cyan-950/50 text-cyan-200'
                        : isGov
                        ? 'bg-amber-950/20 text-slate-200'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isGov ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                          ⭐ GOBERNANTE
                        </span>
                      ) : isSelected ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                          SELECCIONADA
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Secundaria</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                      <div>{combo.name}</div>
                      <div className="text-[9px] text-slate-500 font-normal">{combo.codeReference}</div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-cyan-300 whitespace-nowrap">
                      {combo.formula}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-300 whitespace-nowrap">
                      {combo.loads.Pu}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {combo.loads.Mux}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {combo.loads.Vux}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComboId(combo.id);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? 'Activa' : 'Elegir'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
