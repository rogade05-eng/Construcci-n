/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  FileJson,
  Download,
  Upload,
  Copy,
  Check,
  Share2,
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  Building2,
  Scale,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ClipboardPaste,
  FileCheck,
} from 'lucide-react';
import {
  AppInputsState,
  HistorySnapshot,
  ProjectExportPackage,
} from '../types';
import {
  buildProjectPackage,
  serializeProjectToJson,
  downloadProjectJson,
  copyProjectJsonToClipboard,
  parseAndValidateProjectJson,
  ParseProjectJsonResult,
  BuildProjectPackageParams,
} from '../utils/projectJsonManager';

interface ProjectJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: AppInputsState;
  historySnapshots: HistorySnapshot[];
  dcr: number;
  isSafe: boolean;
  phiPnMax: number;
  phiMnx: number;
  phiVn: number;
  steps: Array<{
    title: string;
    codeRef: string;
    formula: string;
    values: string;
    status: 'OK' | 'WARNING' | 'DANGER';
    comment: string;
  }>;
  concreteResult?: any;
  steelResult?: any;
  woodResult?: any;
  pDeltaAnalysis?: any;
  seismicWindResult?: any;
  onRestoreState: (state: AppInputsState, snapshotTitle?: string) => void;
  onUpdateHistory?: (updated: HistorySnapshot[]) => void;
}

export const ProjectJsonModal: React.FC<ProjectJsonModalProps> = ({
  isOpen,
  onClose,
  currentState,
  historySnapshots,
  dcr,
  isSafe,
  phiPnMax,
  phiMnx,
  phiVn,
  steps,
  concreteResult,
  steelResult,
  woodResult,
  pDeltaAnalysis,
  seismicWindResult,
  onRestoreState,
  onUpdateHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [downloadSuccessName, setDownloadSuccessName] = useState<string | null>(null);

  // Import State
  const [importInputMode, setImportInputMode] = useState<'file' | 'paste'>('file');
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [parsedImport, setParsedImport] = useState<ParseProjectJsonResult | null>(null);
  const [importSuccessNotice, setImportSuccessNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Empaquetar proyecto actual
  const projectPackage: ProjectExportPackage = useMemo(() => {
    return buildProjectPackage({
      state: currentState,
      history: historySnapshots,
      dcr,
      isSafe,
      phiPnMax,
      phiMnx,
      phiVn,
      steps,
      concreteResult,
      steelResult,
      woodResult,
      pDeltaAnalysis,
      seismicWindResult,
    });
  }, [
    currentState,
    historySnapshots,
    dcr,
    isSafe,
    phiPnMax,
    phiMnx,
    phiVn,
    steps,
    concreteResult,
    steelResult,
    woodResult,
    pDeltaAnalysis,
    seismicWindResult,
  ]);

  const jsonString = useMemo(() => {
    return serializeProjectToJson(projectPackage);
  }, [projectPackage]);

  const jsonSizeBytes = useMemo(() => {
    return new Blob([jsonString]).size;
  }, [jsonString]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const filename = downloadProjectJson(projectPackage);
    setDownloadSuccessName(filename);
    setTimeout(() => setDownloadSuccessName(null), 4000);
  };

  const handleCopyClipboard = async () => {
    const ok = await copyProjectJsonToClipboard(projectPackage);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Manejo de archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileContent(file);
    e.target.value = '';
  };

  const readFileContent = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseAndValidateProjectJson(text);
      setParsedImport(res);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFileContent(file);
    }
  };

  const handlePasteChange = (text: string) => {
    setPastedJsonText(text);
    if (text.trim()) {
      const res = parseAndValidateProjectJson(text);
      setParsedImport(res);
    } else {
      setParsedImport(null);
    }
  };

  const handleApplyImport = () => {
    if (!parsedImport?.isValid || !parsedImport.inputsState) return;

    const sourceName = parsedImport.summary?.projectName || 'Archivo JSON';
    onRestoreState(parsedImport.inputsState, `Importado desde JSON: ${sourceName}`);

    if (parsedImport.history && onUpdateHistory && parsedImport.history.length > 0) {
      onUpdateHistory(parsedImport.history);
    }

    setImportSuccessNotice(`¡Proyecto "${sourceName}" importado exitosamente!`);
    setTimeout(() => {
      setImportSuccessNotice(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:px-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-600/20">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight">
                  Gestor de Proyecto JSON
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                  v2.0 Full-State
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Exporta o importa la configuración completa: cargas, geometría, materiales y resultados analíticos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de navegación: Exportar vs Importar */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-4 sm:px-6 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar & Compartir</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 ml-1">
              {(jsonSizeBytes / 1024).toFixed(1)} KB
            </span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 font-mono text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importar Configuración</span>
          </button>
        </div>

        {/* Notificaciones flotantes */}
        {downloadSuccessName && (
          <div className="bg-emerald-950/90 border-b border-emerald-600/70 text-emerald-200 px-4 py-2 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Archivo descargado exitosamente: <strong>{downloadSuccessName}</strong></span>
          </div>
        )}

        {importSuccessNotice && (
          <div className="bg-emerald-950 border-b border-emerald-600 text-emerald-200 px-4 py-2 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{importSuccessNotice}</span>
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: EXPORTAR */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              {/* Tarjetas informativas de lo que contiene el archivo JSON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Tarjeta 1: Obra y Geometría */}
                <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold border-b border-slate-800/80 pb-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Obra & Geometría del Elemento</span>
                  </div>
                  <div className="text-xs space-y-1 font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Proyecto:</span>
                      <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                        {currentState.projectMetadata?.projectName || 'Sin título'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Elemento:</span>
                      <span className="font-semibold text-slate-200">
                        {currentState.projectMetadata?.elementId || 'C-1'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Material:</span>
                      <span className="font-semibold text-cyan-300 capitalize">
                        {currentState.material} ({currentState.standard})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sección:</span>
                      <span className="font-semibold text-slate-200">
                        {projectPackage.geometryInfo.sectionDescription}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Altura Libre:</span>
                      <span className="font-semibold text-slate-200">
                        L = {currentState.colLength} m (kx={currentState.kx}, ky={currentState.ky})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta 2: Cargas y Resultados */}
                <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs font-bold">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Cargas & Resultados de Capacidad</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                        isSafe
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                          : 'bg-red-950 text-red-300 border-red-700/60'
                      }`}
                    >
                      {isSafe ? 'SEGURO' : 'COLAPSO'} (DCR {(dcr * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-xs space-y-1 font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cargas Solicitantes:</span>
                      <span className="font-semibold text-slate-200">
                        Pu={currentState.loads.Pu}kN, Mux={currentState.loads.Mux}kN·m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cortantes de Diseño:</span>
                      <span className="font-semibold text-slate-200">
                        Vux={currentState.loads.Vux}kN, Vuy={currentState.loads.Vuy}kN
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacidad Axial φPn,max:</span>
                      <span className="font-semibold text-slate-200">{phiPnMax.toFixed(1)} kN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacidad Flexión φMnx:</span>
                      <span className="font-semibold text-slate-200">{phiMnx.toFixed(1)} kN·m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacidad Cortante φVn:</span>
                      <span className="font-semibold text-slate-200">{phiVn.toFixed(1)} kN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Comprobaciones:</span>
                      <span className="font-semibold text-slate-200">
                        {projectPackage.results.checksCount.passed} OK / {projectPackage.results.checksCount.failed} Fallas
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción principales para exportación */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">
                      Exportación Estructurada ColumMaster
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Incluye historial de autoguardado, parámetros sísmicos y memoria técnica completa
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Botón Copiar al portapapeles */}
                  <button
                    onClick={handleCopyClipboard}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
                    title="Copiar contenido JSON al portapapeles para compartir por chat o correo"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-cyan-400" />
                        <span>Copiar JSON</span>
                      </>
                    )}
                  </button>

                  {/* Botón Descargar Archivo JSON */}
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-950 flex items-center gap-2 transition active:scale-95 border border-cyan-400/50 cursor-pointer"
                    title="Descargar archivo .json en tu ordenador"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Archivo JSON (.json)</span>
                  </button>
                </div>
              </div>

              {/* Visor desplegable del código JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {showJsonPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showJsonPreview ? 'Ocultar código fuente JSON' : 'Inspeccionar código fuente JSON'}</span>
                  </button>
                  <span className="text-[11px] font-mono text-slate-500">
                    {jsonString.split('\n').length} líneas de datos técnicos
                  </span>
                </div>

                {showJsonPreview && (
                  <div className="relative">
                    <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-[11px] font-mono text-cyan-300/90 max-h-72 overflow-auto select-all scrollbar-thin">
                      {jsonString}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: IMPORTAR */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Selector de modo de importación */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400 font-mono">Selecciona el método de entrada:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setImportInputMode('file')}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
                      importInputMode === 'file'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Archivo (.json)
                  </button>
                  <button
                    onClick={() => setImportInputMode('paste')}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition cursor-pointer ${
                      importInputMode === 'paste'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pegar Texto JSON
                  </button>
                </div>
              </div>

              {/* Modo 1: Carga por Archivo (Drag & Drop) */}
              {importInputMode === 'file' && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 scale-[1.01]'
                        : 'border-slate-700 hover:border-cyan-500 bg-slate-950/60 hover:bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-cyan-400 mb-3 shadow">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-200 font-mono mb-1">
                      Haz clic para seleccionar o arrastra un archivo .json aquí
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      Compatible con paquetes ColumMaster v2.0, respaldos previos y estados JSON
                    </p>
                  </div>
                </div>
              )}

              {/* Modo 2: Pegar texto directo */}
              {importInputMode === 'paste' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                      Pega aquí el contenido JSON compartido:
                    </span>
                    {pastedJsonText && (
                      <button
                        onClick={() => handlePasteChange('')}
                        className="text-red-400 hover:text-red-300 transition text-[11px]"
                      >
                        Limpiar texto
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={pastedJsonText}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    placeholder="Pega el contenido JSON copiado aquí... (ej: { app: 'ColumMaster Pro', ... })"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 scrollbar-thin"
                  />
                </div>
              )}

              {/* Vista previa de validación antes de aplicar */}
              {parsedImport && (
                <div className="space-y-3">
                  {parsedImport.isValid && parsedImport.summary ? (
                    <div className="bg-emerald-950/30 border border-emerald-700/60 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Configuración de Proyecto Válida Reconocida</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Formato: {parsedImport.format}
                        </span>
                      </div>

                      {/* Resumen de datos detectados */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-slate-300">
                        <div>
                          <span className="text-slate-500">Proyecto: </span>
                          <strong className="text-white">{parsedImport.summary.projectName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Elemento: </span>
                          <span className="text-slate-200">{parsedImport.summary.elementId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Responsable: </span>
                          <span className="text-slate-200">{parsedImport.summary.engineerName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Material & Norma: </span>
                          <span className="text-cyan-300 capitalize">
                            {parsedImport.summary.material} ({parsedImport.summary.standard})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Sección: </span>
                          <span className="text-slate-200">{parsedImport.summary.section}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Cargas: </span>
                          <span className="text-slate-200">{parsedImport.summary.loadsText}</span>
                        </div>
                        {parsedImport.summary.dcr !== undefined && (
                          <div className="sm:col-span-2 pt-1 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-slate-500">Resultados calculados incluidos en el archivo:</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                parsedImport.summary.isSafe
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-red-950 text-red-300'
                              }`}
                            >
                              {parsedImport.summary.isSafe ? 'SEGURO' : 'COLAPSO'} (DCR{' '}
                              {(parsedImport.summary.dcr * 100).toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Botón para aplicar */}
                      <div className="flex items-center justify-end gap-3 pt-1">
                        <button
                          onClick={() => {
                            setParsedImport(null);
                            setPastedJsonText('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-mono transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleApplyImport}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Cargar Esta Configuración en el Proyecto</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-950/40 border border-red-700/60 rounded-xl p-4 text-xs font-mono text-red-300 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span>Archivo o contenido JSON no compatible</span>
                      </div>
                      <p className="text-red-300/80">{parsedImport.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="p-3 sm:px-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>ColumMaster Pro Suite · Formato JSON Abierto e Interoperable</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
