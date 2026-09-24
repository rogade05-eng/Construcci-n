/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProjectMetadata, DEFAULT_PROJECT_METADATA } from '../types';
import { Building2, UserCheck, Calendar, MapPin, Briefcase, FileSignature, Save, RotateCcw, X, Check } from 'lucide-react';

interface ProjectMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ProjectMetadata;
  onSave: (updated: ProjectMetadata) => void;
}

export const ProjectMetadataModal: React.FC<ProjectMetadataModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSave,
}) => {
  const [form, setForm] = useState<ProjectMetadata>({ ...metadata });
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof ProjectMetadata, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave(form);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleResetDefaults = () => {
    setForm({ ...DEFAULT_PROJECT_METADATA });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white font-mono flex items-center gap-2">
                Datos de la Obra y Responsable Técnico
              </h2>
              <p className="text-xs text-slate-400">
                Esta información se reflejará en la portada, encabezados y firmas de la Memoria de Cálculo y PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {/* SECCIÓN 1: DATOS DE LA OBRA Y PROYECTO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>1. Identificación del Proyecto y Ubicación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Nombre de la Obra o Proyecto <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.projectName}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  placeholder="ej. Edificio Residencial Las Palmas - Torre A"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Ubicación / Dirección de la Obra
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="ej. Av. 5ta y 42, Playa, La Habana"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Cliente / Propietario
                </label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  placeholder="ej. Inmobiliaria del Caribe S.A."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Elemento / Designación Estructural
                </label>
                <input
                  type="text"
                  value={form.elementId}
                  onChange={(e) => handleChange('elementId', e.target.value)}
                  placeholder="ej. Columna C-1 (Eje B-2 / Nivel +3.00m)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha de Emisión de Cálculos
                </label>
                <input
                  type="date"
                  value={form.calculationDate}
                  onChange={(e) => handleChange('calculationDate', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: RESPONSABLE TÉCNICO Y CONSULTORÍA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              <span>2. Profesional Responsable y Empresa Proyectista</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Ingeniero(a) Responsable del Cálculo <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.engineerName}
                  onChange={(e) => handleChange('engineerName', e.target.value)}
                  placeholder="ej. Ing. Roberto García M."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Matrícula Profesional / Registro / Cédula
                </label>
                <input
                  type="text"
                  value={form.professionalLicense}
                  onChange={(e) => handleChange('professionalLicense', e.target.value)}
                  placeholder="ej. UNAICC #14285 / CIP #78420"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Empresa o Estudio de Ingeniería Estructural
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="ej. Consultores Estructurales Asociados S.L."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Observaciones Técnicas Generales
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Notas adicionales sobre el análisis, solicitaciones de sismo o especificaciones del proyecto..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-sans focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* VISTA PREVIA DEL MEMBRETE / CUADRO DE FIRMAS */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
              Vista Previa del Membrete Oficial (Encabezado y Pie del PDF):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300 pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 text-[10px] block">PROYECTO:</span>
                <strong className="text-slate-100 truncate block">{form.projectName || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">ELEMENTO:</span>
                <strong className="text-slate-100 truncate block">{form.elementId || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">RESPONSABLE:</span>
                <strong className="text-slate-100 truncate block">{form.engineerName || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">REGISTRO:</span>
                <strong className="text-cyan-300 truncate block">{form.professionalLicense || '-'}</strong>
              </div>
            </div>
          </div>
        </form>

        {/* Botones de acción al pie */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80 gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-mono text-xs flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer sugeridos</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/40 transition active:scale-95 cursor-pointer"
            >
              {isSavedNotice ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{isSavedNotice ? '¡Guardado!' : 'Guardar y Aplicar Datos'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
