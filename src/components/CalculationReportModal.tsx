/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DesignStandard,
  MaterialType,
  ColumnLoads,
  InteractionPoint,
  SteelScheduleItem,
  ConcreteGeometry,
  RebarBar,
  ConcreteTieDesign,
  SteelProfileData,
  SteelConnectionDesign,
  WoodProperties,
} from '../types';
import { SeismicWindVerificationResult } from '../engine/seismicWindEngine';
import { CombinedBarsTieVerificationResult } from '../engine/combinedBarsTieEngine';
import { exportCalculationReportPdf } from '../utils/pdfExport';
import { InteractionDiagramChart } from './InteractionDiagramChart';
import { CadSectionViewer } from './CadSectionViewer';
import { FileDown, Printer, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Edit3, Building2, UserCheck } from 'lucide-react';
import { ProjectMetadata } from '../types';

interface CalculationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  engineerName: string;
  projectMetadata?: ProjectMetadata;
  onOpenEditMetadata?: () => void;
  material: MaterialType;
  standard: DesignStandard;
  dimensionsText: string;
  loadsText: string;
  materialsText: string;
  steps: {
    title: string;
    codeRef: string;
    formula: string;
    values: string;
    status: 'OK' | 'WARNING' | 'DANGER';
    comment: string;
  }[];
  isSafe: boolean;
  dcr: number;
  loads: ColumnLoads;
  colLengthM?: number;
  nominalCurve?: InteractionPoint[];
  designCurve?: InteractionPoint[];
  phiPnMax?: number;
  schedule?: SteelScheduleItem[];
  concreteVolumeM3?: number;
  totalSteelWeightKg?: number;
  concreteGeom?: ConcreteGeometry;
  bars?: RebarBar[];
  tieDesign?: ConcreteTieDesign;
  steelProfile?: SteelProfileData;
  steelConnection?: SteelConnectionDesign;
  woodB?: number;
  woodH?: number;
  woodProps?: WoodProperties;
  seismicWindResult?: SeismicWindVerificationResult;
  combinedBarsTieResult?: CombinedBarsTieVerificationResult;
  housingExampleTitle?: string;
  serviceLoadsText?: string;
}

export const CalculationReportModal: React.FC<CalculationReportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  engineerName,
  projectMetadata,
  onOpenEditMetadata,
  material,
  standard,
  dimensionsText,
  loadsText,
  materialsText,
  steps,
  isSafe,
  dcr,
  loads,
  colLengthM = 3.0,
  nominalCurve = [],
  designCurve = [],
  phiPnMax = 1000,
  schedule = [],
  concreteVolumeM3 = 0,
  totalSteelWeightKg = 0,
  concreteGeom,
  bars = [],
  tieDesign,
  steelProfile,
  steelConnection,
  woodB = 200,
  woodH = 200,
  woodProps,
  seismicWindResult,
  combinedBarsTieResult,
  housingExampleTitle,
  serviceLoadsText,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setPdfSuccessMessage(null);

      await exportCalculationReportPdf({
        projectName: projectMetadata?.projectName || projectName,
        engineerName: projectMetadata?.engineerName || engineerName,
        projectMetadata,
        material,
        standard,
        dimensionsText,
        loadsText,
        materialsText,
        steps,
        isSafe,
        dcr,
        loads,
        colLengthM,
        nominalCurve,
        designCurve,
        phiPnMax,
        schedule,
        concreteVolumeM3,
        totalSteelWeightKg,
        concreteGeom,
        bars,
        tieDesign,
        steelProfile,
        steelConnection,
        woodB,
        woodH,
        woodProps,
        seismicWindResult,
        combinedBarsTieResult,
        housingExampleTitle,
        serviceLoadsText,
      });

      setPdfSuccessMessage('¡Memoria de cálculo exportada a PDF con éxito!');
      setPdfErrorMessage(null);
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      setPdfErrorMessage('Ocurrió un problema al generar el archivo PDF. Intente nuevamente o use la opción de imprimir.');
      setTimeout(() => setPdfErrorMessage(null), 5000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getStandardTitle = () => {
    switch (standard) {
      case 'ACI_318_19':
        return 'ACI 318-19 (Building Code Requirements for Structural Concrete / AISC 360-16 / NDS)';
      case 'EUROCODE_2':
        return 'Eurocódigos EN 1992-1-1 / EN 1993-1-1 / EN 1995-1-1';
      case 'NC_450_2006':
        return 'Normas Cubanas: NC 450:2006 (Hormigón), NC Acero y NC 206 (Madera)';
      default:
        return standard;
    }
  };

  const materialTitle =
    material === 'concrete'
      ? 'Hormigón Armado'
      : material === 'steel'
      ? 'Acero Estructural'
      : 'Madera Estructural';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Cabecera del modal */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <h2 className="text-sm md:text-base font-bold tracking-wide font-mono flex items-center gap-2">
                Memoria de Cálculo Estructural y Reporte Técnico
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Documento técnico reglamentario oficial con gráficos P-M, CAD y despiece BBS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón principal destacado: Exportar PDF Estructurado */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-rose-950/60 disabled:opacity-50 cursor-pointer border border-rose-400/40 active:scale-95"
              title="Descargar archivo PDF completo y estructurado con todos los gráficos y tablas"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>{isExportingPdf ? 'Generando PDF...' : '⬇️ EXPORTAR PDF'}</span>
            </button>

            {/* Botón secundario: Imprimir navegador */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold flex items-center gap-1.5 transition"
              title="Imprimir o guardar como PDF desde el navegador"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition ml-1"
            >
              Cerrar ✕
            </button>
          </div>
        </div>

        {/* Mensaje de éxito de exportación */}
        {pdfSuccessMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-700/60 px-6 py-2 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
        )}

        {/* Mensaje de error de exportación */}
        {pdfErrorMessage && (
          <div className="bg-rose-950/80 border-b border-rose-700/60 px-6 py-2 text-xs font-mono text-rose-300 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{pdfErrorMessage}</span>
          </div>
        )}

        {/* Contenido imprimible */}
        <div className="p-6 overflow-y-auto space-y-6 font-sans text-sm print:p-0 print:text-black">
          {/* Encabezado formal de ingeniería y datos de la obra */}
          <div className="border border-slate-700 rounded-xl p-4 bg-slate-950/60 space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Building2 className="w-4 h-4" />
                <span>IDENTIFICACIÓN DEL PROYECTO Y RESPONSABILIDAD TÉCNICA</span>
              </div>

              {onOpenEditMetadata && (
                <button
                  type="button"
                  onClick={onOpenEditMetadata}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Modificar nombre de la obra, ubicación, cliente, ingeniero calculista y matrícula profesional"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>✏️ Editar Datos de Obra y Responsable</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px]">OBRA / PROYECTO:</span>
                <strong className="text-slate-100 text-xs">
                  {projectMetadata?.projectName || projectName || 'Edificio de Estructuras'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ELEMENTO ESTRUCTURAL:</span>
                <strong className="text-cyan-300 text-xs">
                  {projectMetadata?.elementId || 'Columna C-1 (Nivel +3.00m)'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">UBICACIÓN:</span>
                <strong className="text-slate-200 text-xs">
                  {projectMetadata?.location || 'Sector Urbano'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ESTADO GLOBAL:</span>
                <span
                  className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                    isSafe
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                      : 'bg-rose-950 border border-rose-500 text-rose-400'
                  }`}
                >
                  {isSafe ? '✓ CUMPLE NORMATIVA' : '✕ NO CUMPLE (REDISEÑAR)'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">INGENIERO RESPONSABLE:</span>
                <strong className="text-slate-200">
                  {projectMetadata?.engineerName || engineerName || 'Ing. Estructural'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">MATRÍCULA / CÉDULA:</span>
                <strong className="text-slate-200">
                  {projectMetadata?.professionalLicense || '-'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">EMPRESA / CONSULTORÍA:</span>
                <strong className="text-slate-200">
                  {projectMetadata?.companyName || '-'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">FECHA DE EMISIÓN:</span>
                <strong className="text-slate-200">
                  {projectMetadata?.calculationDate || new Date().toLocaleDateString('es-ES')}
                </strong>
              </div>
            </div>
          </div>

          {/* Resumen de Datos de Entrada */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                1. Base Reglamentaria y Parámetros de Entrada
              </h4>
              <span className="text-slate-400 text-[10px]">
                Material: <strong className="text-slate-200">{materialTitle}</strong>
              </span>
            </div>
            <div className="text-slate-300">
              • <strong>Norma Aplicada:</strong> {getStandardTitle()}
            </div>
            <div className="text-slate-300">
              • <strong>Geometría del Elemento:</strong> {dimensionsText}
            </div>
            <div className="text-slate-300">
              • <strong>Materiales:</strong> {materialsText}
            </div>
            <div className="text-slate-300">
              • <strong>Solicitaciones Mayoradas (ULS):</strong> {loadsText}
            </div>
            {housingExampleTitle && (
              <div className="text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-800/50">
                • <strong>Prototipo de Vivienda Económica:</strong> {housingExampleTitle}
                {serviceLoadsText && <div className="text-slate-300 text-[10px] mt-0.5">{serviceLoadsText}</div>}
              </div>
            )}
          </div>

          {/* Gráficos de Diseño Estructural: Interacción P-M y Sección CAD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-xs font-mono">
                Gráficos de Comportamiento Estructural y Sección Transversal
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                P-M Interaction & CAD Section
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Diagrama de Interacción P-M */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                <div className="w-full text-xs font-mono font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Diagrama de Interacción Flexo-Compresión</span>
                  <span className="text-[10px] text-amber-400">
                    Pu = {Math.round(loads.Pu)} kN, Mu = {Math.abs(loads.Mux).toFixed(1)} kN·m
                  </span>
                </div>
                <div className="w-full overflow-hidden flex items-center justify-center">
                  <InteractionDiagramChart
                    nominalCurve={nominalCurve}
                    designCurve={designCurve}
                    Pu={loads.Pu}
                    Mu={loads.Mux}
                    Muy={loads.Muy}
                    phiPnMax={phiPnMax}
                    dcr={dcr}
                    isSafe={isSafe}
                    materialName={materialTitle}
                  />
                </div>
              </div>

              {/* Plano CAD de la Sección Transversal */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                <div className="w-full text-xs font-mono font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Detalle de Armado y Geometría CAD</span>
                  <span className="text-[10px] text-cyan-400">
                    {concreteGeom ? `${concreteGeom.b} x ${concreteGeom.h} mm` : dimensionsText}
                  </span>
                </div>
                <div className="w-full overflow-hidden flex items-center justify-center">
                  {material === 'concrete' && concreteGeom ? (
                    <CadSectionViewer
                      material={material}
                      b={concreteGeom.b}
                      h={concreteGeom.h}
                      cover={concreteGeom.cover}
                      bars={bars}
                      ties={
                        tieDesign || {
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
                        }
                      }
                    />
                  ) : (
                    <div className="py-12 text-center text-xs font-mono text-slate-400">
                      {material === 'steel'
                        ? `Perfil de Acero: ${steelProfile?.designation || 'W-Shape'} (${steelProfile?.d} x ${steelProfile?.b} mm)`
                        : `Escuadría de Madera: ${woodB} x ${woodH} mm`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pasos de Comprobación Detallada */}
          <div className="space-y-4">
            <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-xs font-mono">
              2. Comprobaciones de Seguridad y Ecuaciones de Resistencia
            </h4>

            {steps.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-1.5 text-xs font-mono"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-100 flex items-center gap-2">
                    <span className="text-cyan-400">2.{idx + 1}</span> {step.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {step.codeRef}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        step.status === 'OK'
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/40'
                          : step.status === 'WARNING'
                          ? 'bg-amber-900/60 text-amber-300 border border-amber-600/40'
                          : 'bg-rose-900/60 text-rose-300 border border-rose-600/40'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                </div>

                <div className="text-slate-400 text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800/80">
                  <div className="text-cyan-300 font-semibold mb-0.5">Ecuación: {step.formula}</div>
                  <div className="text-slate-300">{step.values}</div>
                </div>

                <p className="text-slate-300 text-[11px] font-sans pt-0.5">{step.comment}</p>
              </div>
            ))}
          </div>

          {/* Capítulo 3: Verificación Sismorresistente y Eólica */}
          {seismicWindResult && (
            <div className="space-y-4">
              <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-xs font-mono">
                3. Verificación Bajo Cargas Sísmicas y Huracanadas (NC 46:2017 & NC 285:2003 / ACI / Eurocódigo)
              </h4>

              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Período T₁:</span>
                    <strong className="text-amber-300">{seismicWindResult.periodT1} s</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Coef. Sísmico Cs:</span>
                    <strong className="text-cyan-300">{seismicWindResult.Cs}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cortante Sismo Ve:</span>
                    <strong className="text-amber-300">{seismicWindResult.seismicShearVe} kN</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Momento Viento Mw:</span>
                    <strong className="text-cyan-300">{seismicWindResult.windMomentMw} kN·m</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px]">
                  <strong>Combinación Gobernadora ULS: </strong>
                  <span className="text-amber-300">{seismicWindResult.governingCombination.name}</span> (DCR = {(seismicWindResult.governingCombination.dcr * 100).toFixed(1)}%)
                </div>
              </div>

              {/* Comprobaciones sísmicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {seismicWindResult.checks.map((ck, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 text-xs font-mono">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-slate-200 text-[11px]">{ck.title}</strong>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        ck.status === 'OK' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {ck.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Demanda: {ck.demand} | Capacidad: {ck.capacity}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recomendaciones */}
              {seismicWindResult.recommendations.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="text-amber-400 font-bold text-[11px]">
                    Recomendaciones de Detallado y Seguridad Estructural:
                  </div>
                  {seismicWindResult.recommendations.map((rec, i) => (
                    <div key={i} className="text-slate-300 text-[11px]">
                      • <strong>[{rec.priority}] {rec.title}:</strong> {rec.message} ({rec.actionItem})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Capítulo 4: Verificación Detallada de Cercos en Barras Combinadas */}
          {material === 'concrete' && combinedBarsTieResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-xs font-mono">
                  {seismicWindResult ? '4' : '3'}. Verificación de Cercos y Estribos para Barras Combinadas (ACI 318-19 §25.7.2 / NC 450 / EC2)
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    combinedBarsTieResult.allChecksPassed
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border border-rose-700'
                  }`}
                >
                  {combinedBarsTieResult.allChecksPassed ? '✓ CUMPLE DETALLADO' : '⚠️ REQUIERE SOLUCIÓN TÉCNICA'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                <div className="text-slate-300">
                  <strong>Estado del Armado: </strong>
                  {combinedBarsTieResult.summaryText}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mayor / Menor Barra:</span>
                    <strong className="text-amber-300">Ø{combinedBarsTieResult.largestLongDiameter} / Ø{combinedBarsTieResult.smallestLongDiameter} mm</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Separación Libre Máx:</span>
                    <strong className={combinedBarsTieResult.maxClearDistanceBetweenBars > 150 ? 'text-rose-400' : 'text-emerald-400'}>
                      {combinedBarsTieResult.maxClearDistanceBetweenBars} mm (Límite 150 mm)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Barras sin Arriostrar:</span>
                    <strong className={combinedBarsTieResult.unsupportedBarsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {combinedBarsTieResult.unsupportedBarsCount} barras
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Paso Sísmico s₀ máx:</span>
                    <strong className="text-cyan-300">≤ {Math.round(combinedBarsTieResult.s0_max_allowed)} mm</strong>
                  </div>
                </div>
              </div>

              {/* Lista de chequeos */}
              <div className="space-y-2">
                {combinedBarsTieResult.checks.map((ck) => (
                  <div
                    key={ck.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-200">{ck.title}</strong>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          ck.status === 'OK'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-rose-950 text-rose-300 border border-rose-700'
                        }`}
                      >
                        {ck.status} ({ck.codeRef})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Demanda: <span className="text-slate-200">{ck.demand}</span> | Exigencia: <span className="text-cyan-300">{ck.capacity}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 italic">{ck.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capítulo 5: Planilla Técnica de Despiece de Acero (BBS) */}
          {material === 'concrete' && schedule && schedule.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-xs font-mono">
                  {seismicWindResult && combinedBarsTieResult ? '5' : (seismicWindResult || combinedBarsTieResult) ? '4' : '3'}. Planilla Técnica de Despiece de Acero (Bar Bending Schedule - BBS)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  Cómputo métrico oficial de armaduras
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                      <th className="py-2.5 px-3">Marca</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3">Forma / Croquis</th>
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
                        <td className="py-2 px-3 font-bold text-cyan-400">{item.mark}</td>
                        <td className="py-2 px-3 font-sans text-xs">
                          <div className="font-medium text-slate-200">{item.description}</div>
                          <div className="text-[10px] text-slate-500">{item.shapeDetails}</div>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-amber-400">
                          {item.shapeType === 'straight_hook' && '└──┐ Gancho 90°'}
                          {item.shapeType === 'closed_stirrup_135' && '▢ Cerco 135°'}
                          {item.shapeType === 'cross_tie' && 'S Grapa 135°/90°'}
                        </td>
                        <td className="py-2 px-3 font-bold text-amber-300">Ø{item.diameter}</td>
                        <td className="py-2 px-3">{item.count}</td>
                        <td className="py-2 px-3">{item.lengthM.toFixed(2)}</td>
                        <td className="py-2 px-3">{item.totalLengthM.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-100">
                          {item.totalWeightKg.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen de cómputo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Peso Total Acero:</span>
                  <strong className="text-cyan-300">
                    {(totalSteelWeightKg || schedule.reduce((acc, s) => acc + s.totalWeightKg, 0)).toFixed(2)} kg
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Volumen Hormigón:</span>
                  <strong className="text-slate-200">{concreteVolumeM3.toFixed(3)} m³</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Cuantía Volumétrica:</span>
                  <strong className="text-amber-300">
                    {concreteVolumeM3 > 0
                      ? ((totalSteelWeightKg || schedule.reduce((acc, s) => acc + s.totalWeightKg, 0)) / concreteVolumeM3).toFixed(1)
                      : '0.0'}{' '}
                    kg/m³
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Confinamiento Sísmico:</span>
                  <strong className="text-emerald-400">Ganchos a 135°</strong>
                </div>
              </div>
            </div>
          )}

          {/* Dictamen Estructural Final */}
          <div
            className={`p-4 rounded-xl border font-mono text-xs ${
              isSafe
                ? 'bg-emerald-950/30 border-emerald-600/60 text-emerald-200'
                : 'bg-rose-950/30 border-rose-600/60 text-rose-200'
            }`}
          >
            <div className="font-bold text-sm mb-1 flex items-center gap-2">
              {isSafe ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>CONCLUSIÓN Y DICTAMEN ESTRUCTURAL:</span>
            </div>
            <p className="font-sans leading-relaxed">
              {isSafe
                ? `La sección estructural propuesta SATISFACE todos los Estados Límite Últimos (ELU) de capacidad resistente axial, flexión biaxial, cortante y esbeltez reglamentaria con un ratio máximo de demanda/capacidad (DCR) de ${(dcr * 100).toFixed(1)}%. El elemento es apto para construcción segura y eficiente conforme a las normas vigentes.`
                : `La sección NO CUMPLE los requisitos de seguridad estructural (DCR = ${(dcr * 100).toFixed(1)}% > 100%). Se requiere incrementar las dimensiones de la sección transversal, mejorar la calidad del material o incrementar la armadura de refuerzo.`}
            </p>
          </div>

          {/* Banner de Descarga / Exportación Rápida a PDF */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-red-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/60 flex items-center justify-center text-red-400 shrink-0 shadow-md">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-white text-xs font-mono flex items-center gap-2">
                  <span>MEMORIA TÉCNICA OFICIAL EN FORMATO PDF</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-700 font-bold">
                    A4 ESTRUCTURADO
                  </span>
                </h5>
                <p className="text-[11px] text-slate-400 font-mono">
                  Incluye portada ejecutiva, diagramas de interacción P-M, sección CAD, comprobaciones normativas y planilla de despiece BBS.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-950/80 cursor-pointer shrink-0 border border-red-400/50 active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generando PDF...' : '⬇️ EXPORTAR A PDF AHORA'}</span>
            </button>
          </div>

          {/* Bloque de Firmas y Responsabilidad Profesional */}
          <div className="border-t border-slate-800 pt-6 pb-2 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
              <div className="space-y-2">
                <div className="h-14 border-b border-slate-700 flex items-end justify-center pb-1">
                  <span className="text-slate-500 italic text-[11px]">[Firma Digital / Sello Colegiado]</span>
                </div>
                <div className="font-bold text-slate-200">
                  {projectMetadata?.engineerName || engineerName || 'Ing. Proyectista Estructural'}
                </div>
                <div className="text-[10px] text-cyan-300">
                  {projectMetadata?.professionalLicense || 'Ingeniero Estructural Responsable'}
                </div>
                <div className="text-[9px] text-slate-400">
                  {projectMetadata?.companyName || 'Consultoría e Ingeniería Estructural'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-14 border-b border-slate-700 flex items-end justify-center pb-1">
                  <span className="text-slate-500 italic text-[11px]">[Aprobación Técnica y Visto Bueno]</span>
                </div>
                <div className="font-bold text-slate-200">Revisión de Proyecto Estructural</div>
                <div className="text-[10px] text-slate-300">
                  Conforme a {getStandardTitle()}
                </div>
                <div className="text-[9px] text-slate-400">
                  Obra: {projectMetadata?.projectName || projectName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
