/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ColumnLoads,
  ConcreteGeometry,
  ConcreteTieDesign,
  DesignStandard,
  MaterialType,
  RebarBar,
  RebarCombination,
  SteelProfileData,
  ProjectMetadata,
  DEFAULT_PROJECT_METADATA,
  AppInputsState,
  DEFAULT_APP_INPUTS_STATE,
  HistorySnapshot,
} from './types';
import {
  CONCRETE_MATERIALS,
  STEEL_MATERIALS,
  WOOD_MATERIALS,
  STEEL_PROFILES,
} from './engine/standardsData';
import { calculateConcreteColumn } from './engine/concreteEngine';
import { calculateSteelColumn } from './engine/steelEngine';
import { calculateWoodColumn } from './engine/woodEngine';
import { computeColumnDeformationProfile } from './engine/deformationEngine';
import {
  verifySeismicAndWind,
  SeismicParameters,
  WindParameters,
} from './engine/seismicWindEngine';

import { CadSectionViewer } from './components/CadSectionViewer';
import { CadElevationViewer } from './components/CadElevationViewer';
import { InteractionDiagramChart } from './components/InteractionDiagramChart';
import { DeformationMomentCharts } from './components/DeformationMomentCharts';
import { RebarCombinationsSelector } from './components/RebarCombinationsSelector';
import { SteelScheduleTable } from './components/SteelScheduleTable';
import { SteelConnectionsViewer } from './components/SteelConnectionsViewer';
import { CalculationReportModal } from './components/CalculationReportModal';
import { AiStructuralAdvisor } from './components/AiStructuralAdvisor';
import { PWAInstallButton } from './components/PWAInstallButton';
import { MaterialsCatalogModal } from './components/MaterialsCatalogModal';
import { SeismicWindAnalysisViewer } from './components/SeismicWindAnalysisViewer';
import { CombinedBarsTieModal } from './components/CombinedBarsTieModal';
import { verifyTiesForCombinedBars } from './engine/combinedBarsTieEngine';
import { TieValidationViewer } from './components/TieValidationViewer';
import { JointsAndConnectionsViewer } from './components/JointsAndConnectionsViewer';
import { StructuralFailureSimulationViewer } from './components/StructuralFailureSimulationViewer';
import {
  optimizeConcreteSection,
  optimizeSteelSection,
  optimizeWoodSection,
  SectionOptimizationResult,
} from './engine/sectionOptimizer';
import { SectionOptimizationModal } from './components/SectionOptimizationModal';
import { computePDeltaAnalysis } from './engine/pDeltaEngine';
import { PDeltaAnalysisViewer } from './components/PDeltaAnalysisViewer';
import { LoadCombinationsGenerator } from './components/LoadCombinationsGenerator';
import { ServiceLoads } from './engine/loadCombinationsEngine';
import { Scale, Home, FileDown, FileSignature, Building2, Edit3, X, CheckCircle2 } from 'lucide-react';
import { exportCalculationReportPdf } from './utils/pdfExport';
import { ProjectMetadataModal } from './components/ProjectMetadataModal';
import {
  loadAutoSavedState,
  saveAutoSavedState,
  loadHistorySnapshots,
  addHistorySnapshot,
  generateStateSummary,
} from './utils/autoSaveManager';
import { AutoSaveBadge } from './components/AutoSaveBadge';
import { HistoryModal } from './components/HistoryModal';

export default function App() {
  // Estado inicial recuperado automáticamente desde localStorage
  const initialAutoSaved = useMemo(() => loadAutoSavedState(), []);

  // Configuración de datos del proyecto y responsable técnico
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>(() => {
    if (initialAutoSaved?.projectMetadata) return initialAutoSaved.projectMetadata;
    try {
      const saved = localStorage.getItem('colum_master_project_metadata');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read saved metadata', e);
    }
    return DEFAULT_PROJECT_METADATA;
  });

  const [showProjectMetadataModal, setShowProjectMetadataModal] = useState(false);

  const handleSaveProjectMetadata = (updated: ProjectMetadata) => {
    setProjectMetadata(updated);
    setProjectName(updated.projectName);
    setEngineerName(updated.engineerName);
    try {
      localStorage.setItem('colum_master_project_metadata', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist metadata', e);
    }
  };

  // Configuración general
  const [projectName, setProjectName] = useState(initialAutoSaved?.projectMetadata?.projectName || projectMetadata.projectName);
  const [engineerName, setEngineerName] = useState(initialAutoSaved?.projectMetadata?.engineerName || projectMetadata.engineerName);
  const [material, setMaterial] = useState<MaterialType>(initialAutoSaved?.material || 'concrete');
  const [standard, setStandard] = useState<DesignStandard>(initialAutoSaved?.standard || 'ACI_318_19');
  const [activeTab, setActiveTab] = useState<'cad' | 'curves' | 'pdelta' | 'load_combos' | 'rebar' | 'bbs' | 'ties_combined' | 'connections' | 'failure_sim' | 'seismic_wind' | 'ai'>(
    initialAutoSaved?.activeTab || 'cad'
  );
  const [activeHousingTitle, setActiveHousingTitle] = useState<string | null>(initialAutoSaved?.activeHousingTitle || null);
  const [lastServiceLoads, setLastServiceLoads] = useState<ServiceLoads | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showCombinedBarsTieModal, setShowCombinedBarsTieModal] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<SectionOptimizationResult | null>(null);
  const [isOptimizationApplied, setIsOptimizationApplied] = useState(false);
  const [optimizationBackup, setOptimizationBackup] = useState<{
    concreteGeom?: ConcreteGeometry;
    selectedComboName?: string;
    selectedProfileId?: string;
    woodB?: number;
    woodH?: number;
  } | null>(null);

  // Parámetros sísmicos y eólicos (NC 46:2017 & NC 285:2003 / ACI 318 / Eurocódigo)
  const [seismicParams, setSeismicParams] = useState<SeismicParameters>(
    initialAutoSaved?.seismicParams || {
      zone: 'ZONA_5', // Santiago de Cuba (ag = 0.35g)
      soil: 'SUELO_C', // Suelo denso / firme (S = 1.35)
      importance: 'ORDINARIO', // I = 1.0
      ductility: 'ALTA', // Pórtico especial SMF
      R: 6.0,
      I: 1.0,
      ag: 0.35,
      tributaryWeightKN: 850,
    }
  );

  const [windParams, setWindParams] = useState<WindParameters>(
    initialAutoSaved?.windParams || {
      zone: 'ZONA_VIENTO_I', // Costa Norte y Occidente de Cuba (V0 = 60 m/s, huracán Cat. 4/5)
      terrain: 'TERRENO_A', // Costa abierta
      V0: 60.0,
      tributaryWidthM: 4.5,
      Cd: 1.35,
      Cp: 1.30,
    }
  );

  // Solicitaciones de carga (ULS)
  const [loads, setLoads] = useState<ColumnLoads>(
    initialAutoSaved?.loads || {
      Pu: 1250, // kN
      Mux: 120, // kN·m
      Muy: 45, // kN·m
      Vux: 65, // kN
      Vuy: 35, // kN
    }
  );

  // Longitud y coeficientes de pandeo
  const [colLength, setColLength] = useState(initialAutoSaved?.colLength ?? 3.5); // metros
  const [kx, setKx] = useState(initialAutoSaved?.kx ?? 1.0);
  const [ky, setKy] = useState(initialAutoSaved?.ky ?? 1.0);

  // --- PARÁMETROS HORMIGÓN ---
  const [concreteGeom, setConcreteGeom] = useState<ConcreteGeometry>(
    initialAutoSaved?.concreteGeom || {
      shape: 'rectangular',
      b: 400, // mm
      h: 500, // mm
      cover: 30, // mm
    }
  );
  const [concreteMatKey, setConcreteMatKey] = useState(initialAutoSaved?.concreteMatKey || 'H25');
  const [rebarMatKey, setRebarMatKey] = useState(initialAutoSaved?.rebarMatKey || 'B500S');
  const [selectedComboName, setSelectedComboName] = useState(
    initialAutoSaved?.selectedComboName || '4Ø20 (Esquinas) + 4Ø16 (Caras)'
  );

  // Cercos de hormigón
  const [tieDesign, setTieDesign] = useState<ConcreteTieDesign>(
    initialAutoSaved?.tieDesign || {
      diameter: 10,
      spacing: 150,
      s0: 100,
      sMid: 200,
      l0: 600,
      legsX: 2,
      legsY: 2,
      hookAngle: 135,
      hookLength: 100,
      lapSpliceLength: 850,
      patternType: 'perimeter_only',
    }
  );

  // --- PARÁMETROS ACERO ---
  const [selectedProfileId, setSelectedProfileId] = useState(initialAutoSaved?.selectedProfileId || 'W12x65');
  const [steelMatKey, setSteelMatKey] = useState(initialAutoSaved?.steelMatKey || 'A572_Gr50');

  // --- PARÁMETROS MADERA ---
  const [woodB, setWoodB] = useState(initialAutoSaved?.woodB ?? 200); // mm
  const [woodH, setWoodH] = useState(initialAutoSaved?.woodH ?? 200); // mm
  const [woodMatKey, setWoodMatKey] = useState(initialAutoSaved?.woodMatKey || 'NC_GRUPO_A');

  // --- GESTIÓN DE AUTOGUARDADO E HISTORIAL DE CAMBIOS ---
  const [historySnapshots, setHistorySnapshots] = useState<HistorySnapshot[]>(() => {
    const loaded = loadHistorySnapshots();
    if (loaded.length === 0 && initialAutoSaved) {
      return addHistorySnapshot(initialAutoSaved, 'Sesión Previa Recuperada', 'session_restore');
    }
    return loaded;
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(() =>
    initialAutoSaved?.lastModified ? new Date(initialAutoSaved.lastModified) : new Date()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [sessionRestoredNotice, setSessionRestoredNotice] = useState<string | null>(() => {
    if (initialAutoSaved && initialAutoSaved.lastModified) {
      const d = new Date(initialAutoSaved.lastModified);
      return `Sesión restaurada automáticamente del ${d.toLocaleDateString('es-ES')} a las ${d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })}. Todos tus datos están listos.`;
    }
    return null;
  });

  // Estado consolidado actual para autoguardado continuo
  const currentState: AppInputsState = useMemo(
    () => ({
      version: 1,
      lastModified: Date.now(),
      projectMetadata,
      material,
      standard,
      activeTab,
      activeHousingTitle,
      loads,
      colLength,
      kx,
      ky,
      concreteGeom,
      concreteMatKey,
      rebarMatKey,
      selectedComboName,
      tieDesign,
      selectedProfileId,
      steelMatKey,
      woodB,
      woodH,
      woodMatKey,
      seismicParams,
      windParams,
    }),
    [
      projectMetadata,
      material,
      standard,
      activeTab,
      activeHousingTitle,
      loads,
      colLength,
      kx,
      ky,
      concreteGeom,
      concreteMatKey,
      rebarMatKey,
      selectedComboName,
      tieDesign,
      selectedProfileId,
      steelMatKey,
      woodB,
      woodH,
      woodMatKey,
      seismicParams,
      windParams,
    ]
  );

  // Referencia persistente para guardar síncronamente al cerrar pestaña (beforeunload)
  const latestStateRef = useRef<AppInputsState>(currentState);
  useEffect(() => {
    latestStateRef.current = currentState;
  }, [currentState]);

  // Guardado síncrono al recargar o cerrar el navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAutoSavedState(latestStateRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Autoguardado continuo con debounce para fluidez en sliders/inputs
  useEffect(() => {
    setIsSaving(true);
    const saveTimer = setTimeout(() => {
      saveAutoSavedState(currentState);
      setLastSavedTime(new Date());
      setIsSaving(false);
    }, 350);

    return () => clearTimeout(saveTimer);
  }, [currentState]);

  // Registro periódico de instantáneas en el historial de cambios tras pausas de edición
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const historyDebounceTimer = setTimeout(() => {
      const updated = addHistorySnapshot(currentState, 'Modificación de parámetros', 'auto');
      setHistorySnapshots(updated);
    }, 2800);

    return () => clearTimeout(historyDebounceTimer);
  }, [currentState]);

  // Restauración completa de una versión del historial o backup
  const handleRestoreState = (targetState: AppInputsState, snapshotTitle?: string) => {
    // Guardamos primero el estado actual en el historial para permitir deshacer
    const backupHistory = addHistorySnapshot(
      currentState,
      `Punto previo a: ${snapshotTitle || 'Restauración'}`,
      'auto'
    );
    setHistorySnapshots(backupHistory);

    // Restaurar cada variable de estado
    const meta = targetState.projectMetadata || DEFAULT_PROJECT_METADATA;
    setProjectMetadata(meta);
    setProjectName(meta.projectName);
    setEngineerName(meta.engineerName);
    setMaterial(targetState.material);
    setStandard(targetState.standard);
    if (targetState.activeTab) setActiveTab(targetState.activeTab);
    setActiveHousingTitle(targetState.activeHousingTitle || null);
    setLoads(targetState.loads);
    setColLength(targetState.colLength);
    setKx(targetState.kx);
    setKy(targetState.ky);
    setConcreteGeom(targetState.concreteGeom);
    setConcreteMatKey(targetState.concreteMatKey);
    setRebarMatKey(targetState.rebarMatKey);
    setSelectedComboName(targetState.selectedComboName);
    setTieDesign(targetState.tieDesign);
    setSelectedProfileId(targetState.selectedProfileId);
    setSteelMatKey(targetState.steelMatKey);
    setWoodB(targetState.woodB);
    setWoodH(targetState.woodH);
    setWoodMatKey(targetState.woodMatKey);
    setSeismicParams(targetState.seismicParams);
    setWindParams(targetState.windParams);

    // Persistir de inmediato
    saveAutoSavedState(targetState);
    setLastSavedTime(new Date());
  };

  // Restablecer a valores de fábrica iniciales
  const handleResetToDefaults = () => {
    addHistorySnapshot(currentState, 'Antes de restablecer a fábrica', 'manual');
    handleRestoreState(DEFAULT_APP_INPUTS_STATE, 'Valores de fábrica');
  };

  // Deshacer rápido (restaurar la versión previa más reciente que difiera del estado actual)
  const currentSummary = useMemo(() => generateStateSummary(currentState), [currentState]);

  const undoTarget = useMemo(() => {
    return (
      historySnapshots.find((s) => s.summary !== currentSummary) ||
      (historySnapshots.length > 1 ? historySnapshots[1] : null)
    );
  }, [historySnapshots, currentSummary]);

  const handleQuickUndo = () => {
    if (!undoTarget) return;
    handleRestoreState(undoTarget.state, undoTarget.title);
  };

  // Material seleccionado
  const concreteProps = CONCRETE_MATERIALS[concreteMatKey] || CONCRETE_MATERIALS['H25'];
  const rebarProps = STEEL_MATERIALS[rebarMatKey] || STEEL_MATERIALS['B500S'];
  const steelProfile: SteelProfileData = STEEL_PROFILES.find((p) => p.id === selectedProfileId) || STEEL_PROFILES[1];
  const steelProps = STEEL_MATERIALS[steelMatKey] || STEEL_MATERIALS['A572_Gr50'];
  const woodProps = WOOD_MATERIALS[woodMatKey] || WOOD_MATERIALS['NC_GRUPO_A'];

  // CÁLCULO REACTIVO HORMIGÓN
  const concreteResult = useMemo(() => {
    return calculateConcreteColumn(
      concreteGeom,
      concreteProps,
      rebarProps,
      colLength,
      kx,
      ky,
      loads,
      standard,
      selectedComboName
    );
  }, [concreteGeom, concreteProps, rebarProps, colLength, kx, ky, loads, standard, selectedComboName]);

  // CÁLCULO REACTIVO ACERO
  const steelResult = useMemo(() => {
    return calculateSteelColumn(
      steelProfile,
      steelProps,
      colLength,
      kx,
      ky,
      loads,
      standard,
      concreteProps.fc
    );
  }, [steelProfile, steelProps, colLength, kx, ky, loads, standard, concreteProps.fc]);

  // CÁLCULO REACTIVO MADERA
  const woodResult = useMemo(() => {
    return calculateWoodColumn(
      woodB,
      woodH,
      colLength,
      kx,
      ky,
      loads,
      woodProps,
      standard
    );
  }, [woodB, woodH, colLength, kx, ky, loads, woodProps, standard]);

  // PERFIL DE DEFORMADA Y MOMENTOS (E·I según material)
  const deformationResult = useMemo(() => {
    let EI = 25000;
    let Area = 0.2;
    let W = 0.016;

    if (material === 'concrete') {
      const isCirc = concreteGeom.shape === 'circular';
      const b_m = (concreteGeom.b || 400) / 1000;
      const h_m = isCirc ? b_m : (concreteGeom.h || 400) / 1000;
      const Ig_m4 = isCirc
        ? (Math.PI * Math.pow(b_m, 4)) / 64
        : (b_m * Math.pow(h_m, 3)) / 12;
      const Ec_kPa = (concreteProps.Ec || 25000) * 1000;
      EI = 0.4 * Ec_kPa * Ig_m4; // Rigidez agrietada 0.4 Ec Ig
      Area = isCirc ? (Math.PI * Math.pow(b_m, 2)) / 4 : b_m * h_m;
      W = isCirc ? (Math.PI * Math.pow(b_m, 3)) / 32 : (b_m * Math.pow(h_m, 2)) / 6;
    } else if (material === 'steel') {
      const Ix_m4 = steelProfile.Ix * 1e-8;
      const E_kPa = steelProps.E * 1000;
      EI = E_kPa * Ix_m4;
      Area = (steelProfile.A * 100) / 1e6;
      W = (steelProfile.Zx * 1000) / 1e9;
    } else {
      const Ix_m4 = (woodB / 1000 * Math.pow(woodH / 1000, 3)) / 12;
      const E_kPa = woodProps.E0mean * 1000;
      EI = E_kPa * Ix_m4;
      Area = (woodB / 1000) * (woodH / 1000);
      W = (woodB / 1000 * Math.pow(woodH / 1000, 2)) / 6;
    }

    return computeColumnDeformationProfile(
      colLength,
      loads.Pu,
      loads.Mux,
      loads.Vux,
      EI,
      Area,
      W,
      kx
    );
  }, [material, colLength, loads, concreteGeom, concreteProps, steelProfile, steelProps, woodB, woodH, woodProps, kx]);

  // Variables activas según material
  const currentDcr =
    material === 'concrete'
      ? concreteResult.dcr
      : material === 'steel'
      ? steelResult.dcrCombined
      : woodResult.dcrCombined;

  const currentIsSafe =
    material === 'concrete'
      ? concreteResult.isSafe
      : material === 'steel'
      ? steelResult.isSafe
      : woodResult.isSafe;

  const currentSteps =
    material === 'concrete'
      ? concreteResult.steps
      : material === 'steel'
      ? steelResult.steps
      : woodResult.steps;

  const currentNominalCurve =
    material === 'concrete'
      ? concreteResult.nominalCurve
      : material === 'steel'
      ? steelResult.nominalCurve
      : woodResult.nominalCurve;

  const currentDesignCurve =
    material === 'concrete'
      ? concreteResult.designCurve
      : material === 'steel'
      ? steelResult.designCurve
      : woodResult.designCurve;

  const currentPhiPnMax =
    material === 'concrete'
      ? concreteResult.phiPnMax
      : material === 'steel'
      ? steelResult.phiPn
      : (woodResult.kcStabilityFactor * woodResult.fc0d * woodB * woodH) / 1000;

  const currentPhiMnx =
    material === 'concrete'
      ? concreteResult.phiMnx
      : material === 'steel'
      ? steelResult.phiMnx
      : (woodResult.fmd * ((woodB * Math.pow(woodH, 2)) / 6)) / 1e6;

  const currentPhiVn =
    material === 'concrete'
      ? concreteResult.phiVn
      : material === 'steel'
      ? (0.9 * 0.6 * steelProps.Fy * steelProfile.d * steelProfile.tw) / 1000
      : (0.75 * 0.67 * (woodProps.fv || 2.0) * woodB * woodH) / 1000;

  // CÁLCULO REACTIVO DE VERIFICACIÓN SÍSMICA Y EÓLICA (NC 46:2017 & NC 285:2003 / ACI 318 / EUROCÓDIGOS)
  const seismicWindResult = useMemo(() => {
    return verifySeismicAndWind(
      material,
      standard,
      colLength,
      loads,
      seismicParams,
      windParams,
      {
        b: material === 'concrete' ? concreteGeom.b : material === 'steel' ? steelProfile.b : woodB,
        h: material === 'concrete' ? concreteGeom.h : material === 'steel' ? steelProfile.d : woodH,
        fc: concreteProps.fc,
        Fy: steelProps.Fy,
        steelProfile,
        concreteGeom,
        tieDesign,
        woodProps,
        phiPnMax: currentPhiPnMax,
        phiMnx: currentPhiMnx,
        phiVn: currentPhiVn,
      }
    );
  }, [
    material,
    standard,
    colLength,
    loads,
    seismicParams,
    windParams,
    concreteGeom,
    steelProfile,
    woodB,
    woodH,
    concreteProps.fc,
    steelProps.Fy,
    tieDesign,
    woodProps,
    currentPhiPnMax,
    currentPhiMnx,
    currentPhiVn,
  ]);

  // CÁLCULO REACTIVO DE VERIFICACIÓN DE CERCOS EN BARRAS COMBINADAS (ACI 318 / NC 450 / EC2)
  const combinedBarsTieResult = useMemo(() => {
    if (material !== 'concrete') return undefined;
    return verifyTiesForCombinedBars(
      concreteGeom,
      concreteResult.bars,
      tieDesign,
      standard,
      concreteProps.fc,
      rebarProps.Fy || (rebarProps as any).fy || 500,
      Math.abs(loads.Pu)
    );
  }, [
    material,
    concreteGeom,
    concreteResult.bars,
    tieDesign,
    standard,
    concreteProps.fc,
    rebarProps.Fy,
    loads.Pu,
  ]);

  // CÁLCULO REACTIVO DE EFECTOS P-DELTA Y ESBELTEZ (ACI 318 / AISC 360 / NC 450)
  const pDeltaAnalysis = useMemo(() => {
    return computePDeltaAnalysis(
      material,
      standard,
      colLength,
      kx,
      ky,
      loads,
      concreteGeom,
      concreteProps.fc,
      concreteProps.Ec,
      rebarProps.Fy || (rebarProps as any).fy || 500,
      steelProfile,
      steelProps,
      woodB,
      woodH,
      woodProps,
      currentDesignCurve,
      currentNominalCurve
    );
  }, [
    material,
    standard,
    colLength,
    kx,
    ky,
    loads,
    concreteGeom,
    concreteProps.fc,
    concreteProps.Ec,
    rebarProps.Fy,
    steelProfile,
    steelProps,
    woodB,
    woodH,
    woodProps,
    currentDesignCurve,
    currentNominalCurve,
  ]);

  // Presets de carga rápida
  const applyPreset = (preset: 'residential' | 'industrial' | 'heavy' | 'economic_housing') => {
    let presetName = 'Edificio Residencial';
    if (preset === 'economic_housing') {
      presetName = 'Vivienda Social Progresiva';
      // Vivienda social 1-2 niveles (combinación mayorada representativa)
      setLoads({ Pu: 155, Mux: 18, Muy: 12, Vux: 20, Vuy: 10 });
      setColLength(2.7);
      setActiveHousingTitle('Vivienda Social Progresiva');
      setLastServiceLoads({
        PD: 110,
        PL: 26.5,
        MDx: 14.5,
        MLx: 7.8,
        MDy: 11.2,
        MLy: 5.6,
        VDx: 16.5,
        VLx: 9.0,
      });
      setActiveTab('load_combos');
    } else if (preset === 'residential') {
      presetName = 'Edificio Residencial';
      setLoads({ Pu: 1100, Mux: 90, Muy: 30, Vux: 55, Vuy: 25 });
      setColLength(3.0);
      setActiveHousingTitle(null);
    } else if (preset === 'industrial') {
      presetName = 'Nave Industrial';
      setLoads({ Pu: 550, Mux: 160, Muy: 50, Vux: 95, Vuy: 40 });
      setColLength(4.5);
      setActiveHousingTitle(null);
    } else {
      presetName = 'Torre Cargas Pesadas';
      setLoads({ Pu: 2200, Mux: 240, Muy: 110, Vux: 130, Vuy: 70 });
      setColLength(3.8);
      setActiveHousingTitle(null);
    }
    const updated = addHistorySnapshot(currentState, `Preset cargado: ${presetName}`, 'preset');
    setHistorySnapshots(updated);
  };

  // Optimización automática de sección (DCR objetivo ~ 0.90 sin exceder límites)
  const handleOptimizeSection = () => {
    // Guardar copia de seguridad del estado antes de optimizar
    setOptimizationBackup({
      concreteGeom: { ...concreteGeom },
      selectedComboName,
      selectedProfileId,
      woodB,
      woodH,
    });
    const updatedHistory = addHistorySnapshot(currentState, 'Estado previo a Optimización de Sección', 'optimization');
    setHistorySnapshots(updatedHistory);

    if (material === 'concrete') {
      const res = optimizeConcreteSection(
        concreteGeom,
        concreteProps,
        rebarProps,
        colLength,
        kx,
        ky,
        loads,
        standard,
        0.90
      );
      setOptimizationResult(res);
      if (res.success && res.concrete) {
        setConcreteGeom({
          ...concreteGeom,
          b: res.concrete.optimizedB,
          h: res.concrete.optimizedH,
        });
        if (res.concrete.recommendedComboName) {
          setSelectedComboName(res.concrete.recommendedComboName);
        }
        // Si las dimensiones aumentan sustancialmente (>450mm), ajustar ramas de estribos
        if (res.concrete.optimizedB >= 500 || res.concrete.optimizedH >= 500) {
          setTieDesign((prev) => ({
            ...prev,
            legsX: Math.max(prev.legsX, 3),
            legsY: Math.max(prev.legsY, 3),
            patternType: 'perimeter_crossties',
          }));
        }
        setIsOptimizationApplied(true);
      }
      setShowOptimizationModal(true);
    } else if (material === 'steel') {
      const res = optimizeSteelSection(
        steelProfile,
        steelProps,
        colLength,
        kx,
        ky,
        loads,
        standard,
        concreteProps.fc,
        0.90
      );
      setOptimizationResult(res);
      if (res.success && res.steel) {
        setSelectedProfileId(res.steel.optimizedProfileId);
        setIsOptimizationApplied(true);
      }
      setShowOptimizationModal(true);
    } else {
      const res = optimizeWoodSection(
        woodB,
        woodH,
        woodProps,
        colLength,
        kx,
        ky,
        loads,
        standard,
        0.90
      );
      setOptimizationResult(res);
      if (res.success && res.wood) {
        setWoodB(res.wood.optimizedB);
        setWoodH(res.wood.optimizedH);
        setIsOptimizationApplied(true);
      }
      setShowOptimizationModal(true);
    }
  };

  const handleRevertOptimization = () => {
    if (!optimizationBackup) return;
    if (material === 'concrete' && optimizationBackup.concreteGeom) {
      setConcreteGeom(optimizationBackup.concreteGeom);
      if (optimizationBackup.selectedComboName) {
        setSelectedComboName(optimizationBackup.selectedComboName);
      }
    } else if (material === 'steel' && optimizationBackup.selectedProfileId) {
      setSelectedProfileId(optimizationBackup.selectedProfileId);
    } else if (material === 'wood' && optimizationBackup.woodB && optimizationBackup.woodH) {
      setWoodB(optimizationBackup.woodB);
      setWoodH(optimizationBackup.woodH);
    }
    setIsOptimizationApplied(false);
  };

  // Resúmenes de texto para memoria de cálculo
  const dimensionsText =
    material === 'concrete'
      ? `Sección ${concreteGeom.b} x ${concreteGeom.h} mm, Altura L = ${colLength} m, Recubrimiento libre r = ${concreteGeom.cover} mm`
      : material === 'steel'
      ? `Perfil ${steelProfile.designation} (${steelProfile.type}), Altura L = ${colLength} m`
      : `Escuadría de madera ${woodB} x ${woodH} mm, Altura L = ${colLength} m`;

  const loadsText = `Pu = ${loads.Pu} kN, Mux = ${loads.Mux} kN·m, Muy = ${loads.Muy} kN·m, Vux = ${loads.Vux} kN`;

  const materialsText =
    material === 'concrete'
      ? `Hormigón: ${concreteProps.name} (f'c = ${concreteProps.fc} MPa), Acero de refuerzo: ${rebarProps.name} (fy = ${rebarProps.Fy} MPa)`
      : material === 'steel'
      ? `Acero estructural: ${steelProps.name} (Fy = ${steelProps.Fy} MPa, Fu = ${steelProps.Fu} MPa)`
      : `Madera: ${woodProps.name} (${woodProps.species}, fc,0,k = ${woodProps.fc0} MPa)`;

  // Estado y función para exportar la Memoria de Cálculo a PDF directamente
  const [isExportingPdfDirectly, setIsExportingPdfDirectly] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  const handleExportPdfDirectly = async () => {
    try {
      setIsExportingPdfDirectly(true);
      setPdfSuccessToast(null);
      await exportCalculationReportPdf({
        projectName: projectMetadata.projectName || projectName,
        engineerName: projectMetadata.engineerName || engineerName,
        projectMetadata,
        material,
        standard,
        dimensionsText,
        loadsText,
        materialsText,
        steps: currentSteps,
        isSafe: currentIsSafe,
        dcr: currentDcr,
        loads,
        colLengthM: colLength,
        nominalCurve:
          material === 'concrete'
            ? concreteResult.nominalCurve
            : material === 'steel'
            ? steelResult.nominalCurve
            : woodResult.nominalCurve,
        designCurve:
          material === 'concrete'
            ? concreteResult.designCurve
            : material === 'steel'
            ? steelResult.designCurve
            : woodResult.designCurve,
        phiPnMax:
          material === 'concrete'
            ? concreteResult.phiPnMax
            : material === 'steel'
            ? steelResult.phiPnMax
            : woodResult.phiPnMax,
        schedule: material === 'concrete' ? concreteResult.schedule : undefined,
        concreteVolumeM3: (concreteGeom.b / 1000) * (concreteGeom.h / 1000) * colLength,
        totalSteelWeightKg:
          material === 'concrete'
            ? concreteResult.schedule.reduce((acc, s) => acc + s.totalWeightKg, 0)
            : 0,
        concreteGeom,
        bars: concreteResult.bars,
        tieDesign,
        steelProfile,
        steelConnection: steelResult.connection,
        woodB,
        woodH,
        woodProps,
        seismicWindResult,
        combinedBarsTieResult,
        housingExampleTitle: activeHousingTitle || undefined,
        serviceLoadsText: lastServiceLoads
          ? `PD = ${lastServiceLoads.PD} kN (muerta), PL = ${lastServiceLoads.PL} kN (viva), MDx = ${lastServiceLoads.MDx} kN·m, MLx = ${lastServiceLoads.MLx} kN·m`
          : undefined,
      });
      setPdfSuccessToast('¡Memoria de Cálculo exportada a PDF con éxito!');
      setTimeout(() => setPdfSuccessToast(null), 4000);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      setPdfSuccessToast('Abriendo Memoria de Cálculo técnica...');
      setTimeout(() => setPdfSuccessToast(null), 3000);
      setShowReportModal(true);
    } finally {
      setIsExportingPdfDirectly(false);
    }
  };

  // Auto-cerrar el aviso de sesión restaurada a los 10 segundos
  useEffect(() => {
    if (!sessionRestoredNotice) return;
    const timer = setTimeout(() => {
      setSessionRestoredNotice(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [sessionRestoredNotice]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 relative">
      {/* Notificación flotante de descarga de PDF */}
      {pdfSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border-2 border-emerald-500 text-emerald-200 px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2 animate-bounce">
          <FileDown className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">{pdfSuccessToast}</span>
        </div>
      )}

      {/* BARRA SUPERIOR DE APLICACIÓN (ENGINEERING WORKBENCH HEADER) */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-950 fill-current">
                <path d="M4 2h16v3H4zm2 5h12v10H6zm-2 12h16v3H4z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight font-mono">
                  ColumMaster Pro
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                  v2.0 Structural Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Diseño y Verificación de Columnas: Hormigón, Acero y Madera (ACI 318 · Eurocódigos · NC)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* INDICADOR DE AUTOGUARDADO EN LOCALSTORAGE E HISTORIAL */}
            <AutoSaveBadge
              lastSavedTime={lastSavedTime}
              isSaving={isSaving}
              historyCount={historySnapshots.length}
              onOpenHistory={() => setShowHistoryModal(true)}
              onQuickUndo={handleQuickUndo}
              canUndo={!!undoTarget}
            />

            <PWAInstallButton />

            {/* BOTÓN DATOS DE LA OBRA Y RESPONSABLE TÉCNICO */}
            <button
              onClick={() => setShowProjectMetadataModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs font-semibold border border-amber-700/60 flex items-center gap-1.5 transition shadow cursor-pointer"
              title="Editar el responsable de los cálculos, matrícula profesional, nombre de la obra, cliente y ubicación"
            >
              <FileSignature className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">✍️ Obra & Responsable</span>
              <span className="sm:hidden">✍️ Obra</span>
            </button>

            <button
              onClick={() => setShowMaterialsModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-semibold border border-cyan-800/60 flex items-center gap-1.5 transition shadow"
              title="Abrir catálogo completo de perfiles laminados, hormigones y maderas"
            >
              <span>📚 Catálogo</span>
            </button>

            {/* BOTÓN DESTACADO: EXPORTAR A PDF DIRECTO */}
            <button
              onClick={handleExportPdfDirectly}
              disabled={isExportingPdfDirectly}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-red-950/80 flex items-center gap-2 transition active:scale-95 border border-red-400/50 cursor-pointer"
              title="Descargar inmediatamente la Memoria de Cálculo en archivo PDF estructurado (A4)"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>{isExportingPdfDirectly ? 'Generando PDF...' : '⬇️ Exportar PDF'}</span>
            </button>

            {/* BOTÓN MEMORIA DE CÁLCULO */}
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold shadow flex items-center gap-1.5 transition"
              title="Ver la memoria de cálculo técnica en pantalla con dictamen y comprobaciones"
            >
              <span>📄 Ver Memoria</span>
            </button>
          </div>
        </div>
      </header>

      {/* BANNER INFORMATIVO DE SESIÓN RECUPERADA (AUTOGUARDADO LOCALSTORAGE) */}
      {sessionRestoredNotice && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-b border-emerald-700/60 px-4 py-2 text-xs font-mono text-emerald-200 shadow-sm animate-in fade-in">
          <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-white">Sesión Restaurada:</span>
              <span className="text-emerald-300">{sessionRestoredNotice}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-cyan-300 hover:text-white underline font-bold transition cursor-pointer"
              >
                Ver Historial de Versiones
              </button>
              <button
                onClick={() => setSessionRestoredNotice(null)}
                className="text-slate-400 hover:text-white transition p-0.5 rounded hover:bg-slate-800"
                title="Ocultar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL: PANEL LATERAL DE ENTRADA + TABS DE VISUALIZACIÓN */}
      <main className="max-w-7xl mx-auto w-full p-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ==================================================================== */}
        {/* PANEL IZQUIERDO: CONTROLES DE INGENIERÍA Y ENTRADA DE DATOS (4 cols) */}
        {/* ==================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* Ficha Rápida de Obra y Responsable del Cálculo */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 shadow-xl space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                <Building2 className="w-3.5 h-3.5" />
                <span>Datos de la Obra & Responsable</span>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectMetadataModal(true)}
                className="px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="Editar nombre del proyecto, ubicación, cliente, matrícula e ingeniero responsable"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar</span>
              </button>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Proyecto:</span>
                <span className="font-semibold text-slate-100 truncate max-w-[210px]" title={projectMetadata.projectName}>
                  {projectMetadata.projectName}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Elemento:</span>
                <span className="text-cyan-300 font-semibold truncate max-w-[210px]" title={projectMetadata.elementId}>
                  {projectMetadata.elementId}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Responsable:</span>
                <span className="text-amber-200 font-semibold truncate max-w-[210px]" title={projectMetadata.engineerName}>
                  {projectMetadata.engineerName}
                </span>
              </div>
              {projectMetadata.professionalLicense && (
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Matrícula:</span>
                  <span className="text-slate-300 font-mono text-[10px] truncate max-w-[210px]">
                    {projectMetadata.professionalLicense}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selector de Material y Norma */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Configuración de Material y Norma
              </div>
              <button
                type="button"
                onClick={() => setShowMaterialsModal(true)}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
              >
                <span>📚 Catálogo</span>
              </button>
            </div>

            {/* Botón destacado de acceso a Biblioteca */}
            <button
              type="button"
              onClick={() => setShowMaterialsModal(true)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-700/40 text-cyan-300 font-mono text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              <span>🔍 Explorar Biblioteca de Perfiles y Materiales</span>
            </button>

            {/* Selector de Material */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setMaterial('concrete')}
                className={`py-1.5 rounded transition font-medium ${
                  material === 'concrete'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hormigón
              </button>
              <button
                type="button"
                onClick={() => setMaterial('steel')}
                className={`py-1.5 rounded transition font-medium ${
                  material === 'steel'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Acero
              </button>
              <button
                type="button"
                onClick={() => setMaterial('wood')}
                className={`py-1.5 rounded transition font-medium ${
                  material === 'wood'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Madera
              </button>
            </div>

            {/* Selector de Norma Técnica */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Norma de Diseño Estructural:
              </label>
              <select
                value={standard}
                onChange={(e) => setStandard(e.target.value as DesignStandard)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="ACI_318_19">ACI 318-19 / AISC 360-16 / NDS (EE.UU.)</option>
                <option value="EUROCODE_2">Eurocódigos EN 1992 / EN 1993 / EN 1995</option>
                <option value="NC_450_2006">Normas Cubanas: NC 450 / NC Acero / NC 206</option>
              </select>
            </div>
          </div>

          {/* PARÁMETROS GEOMÉTRICOS Y SECCIÓN */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 shadow-xl space-y-3 text-xs">
            <div className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Geometría de la Columna
              </span>
              <button
                type="button"
                onClick={handleOptimizeSection}
                className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-bold"
              >
                <span>⚡ Auto-Optimizar</span>
              </button>
            </div>

            {/* Botón de Optimizar Sección destacado */}
            <button
              type="button"
              onClick={handleOptimizeSection}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-mono text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm active:scale-[0.98]"
              title="Ajusta automáticamente las dimensiones o perfil al DCR más cercano a 0.90 sin exceder límites normativos"
            >
              <span>⚡ Optimizar Sección Automáticamente</span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60 font-semibold">
                DCR ~ 0.90
              </span>
            </button>

            {/* Altura de columna y esbeltez K */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Altura L (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={colLength}
                  onChange={(e) => setColLength(parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Factor Kx</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3.0"
                  value={kx}
                  onChange={(e) => setKx(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Factor Ky</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3.0"
                  value={ky}
                  onChange={(e) => setKy(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
            </div>

            {/* SUB-PANEL: CASO HORMIGÓN */}
            {material === 'concrete' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block">Ancho b (mm)</label>
                    <input
                      type="number"
                      step="25"
                      min="200"
                      max="1500"
                      value={concreteGeom.b}
                      onChange={(e) =>
                        setConcreteGeom({ ...concreteGeom, b: parseInt(e.target.value) || 300 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block">Peralte h (mm)</label>
                    <input
                      type="number"
                      step="25"
                      min="200"
                      max="1500"
                      value={concreteGeom.h}
                      onChange={(e) =>
                        setConcreteGeom({ ...concreteGeom, h: parseInt(e.target.value) || 300 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block">Recubr. r (mm)</label>
                    <input
                      type="number"
                      step="5"
                      min="20"
                      max="75"
                      value={concreteGeom.cover}
                      onChange={(e) =>
                        setConcreteGeom({ ...concreteGeom, cover: parseInt(e.target.value) || 30 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block">Resistencia f'c</label>
                    <select
                      value={concreteMatKey}
                      onChange={(e) => setConcreteMatKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                    >
                      {Object.entries(CONCRETE_MATERIALS).map(([key, mat]) => (
                        <option key={key} value={key}>
                          {mat.name} ({mat.fc} MPa)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block">Acero Barras fy</label>
                    <select
                      value={rebarMatKey}
                      onChange={(e) => setRebarMatKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono"
                    >
                      {Object.entries(STEEL_MATERIALS)
                        .filter(([k]) => k.startsWith('B500') || k.startsWith('Grado'))
                        .map(([key, mat]) => (
                          <option key={key} value={key}>
                            {mat.name} ({mat.Fy} MPa)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Parámetros de cercos / estribos con soporte para barras combinadas */}
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-cyan-400">
                      Cercos y Confinamiento Sísmico
                    </span>
                    {combinedBarsTieResult && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          combinedBarsTieResult.allChecksPassed
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                        }`}
                      >
                        {combinedBarsTieResult.allChecksPassed ? '✓ OK' : '⚠️ FALLA'}
                      </span>
                    )}
                  </div>

                  {/* Configuración de patrón de estribado */}
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Patrón de Cercos</label>
                    <select
                      value={tieDesign.patternType || 'perimeter_only'}
                      onChange={(e) =>
                        setTieDesign({
                          ...tieDesign,
                          patternType: e.target.value as any,
                          legsX: e.target.value === 'perimeter_crossties' || e.target.value === 'overlapping_perimeter' ? 3 : 2,
                          legsY: e.target.value === 'perimeter_crossties' || e.target.value === 'overlapping_perimeter' ? 3 : 2,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-mono text-[11px]"
                    >
                      <option value="perimeter_only">Perimetral Simple (2 ramas)</option>
                      <option value="perimeter_crossties">Perimetral + Trabas (Cross-ties)</option>
                      <option value="perimeter_diamond">Perimetral + Rombo Interior</option>
                      <option value="overlapping_perimeter">Doble Perimetral Solapado</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 block">Ø Cerco</label>
                      <select
                        value={tieDesign.diameter}
                        onChange={(e) => setTieDesign({ ...tieDesign, diameter: parseInt(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-mono text-xs"
                      >
                        <option value={8}>Ø 8 mm</option>
                        <option value={10}>Ø 10 mm</option>
                        <option value={12}>Ø 12 mm</option>
                        <option value={16}>Ø 16 mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 block">Paso s₀ conf.</label>
                      <input
                        type="number"
                        step="10"
                        value={tieDesign.s0}
                        onChange={(e) => setTieDesign({ ...tieDesign, s0: parseInt(e.target.value) || 100 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 block">Paso s centro</label>
                      <input
                        type="number"
                        step="10"
                        value={tieDesign.sMid}
                        onChange={(e) => setTieDesign({ ...tieDesign, sMid: parseInt(e.target.value) || 200 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 block">Ramas X (legsX)</label>
                      <select
                        value={tieDesign.legsX}
                        onChange={(e) => setTieDesign({ ...tieDesign, legsX: parseInt(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-mono text-xs"
                      >
                        <option value={2}>2 ramas</option>
                        <option value={3}>3 ramas</option>
                        <option value={4}>4 ramas</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-slate-400 block">Ramas Y (legsY)</label>
                      <select
                        value={tieDesign.legsY}
                        onChange={(e) => setTieDesign({ ...tieDesign, legsY: parseInt(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 font-mono text-xs"
                      >
                        <option value={2}>2 ramas</option>
                        <option value={3}>3 ramas</option>
                        <option value={4}>4 ramas</option>
                      </select>
                    </div>
                  </div>

                  {/* Botón de acción para diagnóstico de barras combinadas */}
                  <button
                    type="button"
                    onClick={() => setShowCombinedBarsTieModal(true)}
                    className="w-full mt-1.5 py-1.5 px-2 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <span>⚡ Diagnóstico de Cercos & Soluciones</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-PANEL: CASO ACERO ESTRUCTURAL */}
            {material === 'steel' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-mono text-slate-400">Perfil Estructural:</label>
                    <button
                      type="button"
                      onClick={() => setShowMaterialsModal(true)}
                      className="text-[9px] font-mono text-cyan-400 hover:underline"
                    >
                      Ver Catálogo IPN/HEB/UPN...
                    </button>
                  </div>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                  >
                    <optgroup label="🇪🇺 Perfiles Europeos Laminados (IPN / IPE / HEB / HEA)">
                      {STEEL_PROFILES.filter((p: any) => ['IPN', 'IPE', 'HEB', 'HEA'].includes(p.family)).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.designation} (A = {p.A} cm², rx = {p.rx} cm, ry = {p.ry} cm)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🇪🇺 Perfiles en Canal (UPN)">
                      {STEEL_PROFILES.filter((p: any) => p.family === 'UPN').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.designation} (A = {p.A} cm², rx = {p.rx} cm, ry = {p.ry} cm)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🇺🇸 Perfiles W (AISC Wide Flange)">
                      {STEEL_PROFILES.filter((p: any) => p.family === 'W_SHAPE').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.designation} (A = {p.A} cm², rx = {p.rx} cm, ry = {p.ry} cm)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📐 Conformados en Frío (C / Z)">
                      {STEEL_PROFILES.filter((p: any) => ['C_CHANNEL', 'Z_PROFILE'].includes(p.family)).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.designation} (A = {p.A} cm², rx = {p.rx} cm, ry = {p.ry} cm)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="⭕ Tubulares Estructurales (HSS / CHS)">
                      {STEEL_PROFILES.filter((p: any) => ['HSS_RECT', 'HSS_ROUND'].includes(p.family)).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.designation} (A = {p.A} cm², rx = {p.rx} cm, ry = {p.ry} cm)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Grado de Acero:</label>
                  <select
                    value={steelMatKey}
                    onChange={(e) => setSteelMatKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  >
                    {Object.entries(STEEL_MATERIALS)
                      .filter(([k]) => !k.startsWith('B500'))
                      .map(([key, mat]) => (
                        <option key={key} value={key}>
                          {mat.name} (Fy = {mat.Fy} MPa)
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* SUB-PANEL: CASO MADERA */}
            {material === 'wood' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block">Ancho b (mm)</label>
                    <input
                      type="number"
                      step="25"
                      min="100"
                      max="400"
                      value={woodB}
                      onChange={(e) => setWoodB(parseInt(e.target.value) || 150)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block">Peralte h (mm)</label>
                    <input
                      type="number"
                      step="25"
                      min="100"
                      max="400"
                      value={woodH}
                      onChange={(e) => setWoodH(parseInt(e.target.value) || 150)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block">Especie / Clase Resistente:</label>
                  <select
                    value={woodMatKey}
                    onChange={(e) => setWoodMatKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  >
                    {Object.entries(WOOD_MATERIALS).map(([key, mat]) => (
                      <option key={key} value={key}>
                        {mat.name} ({mat.species} - fc0 = {mat.fc0} MPa)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SOLICITACIONES DE CARGA MAYORADAS (LOAD COMBINATIONS) */}
          <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 shadow-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Cargas Mayoradas de Diseño (ULS)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">kN, kN·m</span>
            </div>

            {/* Presets rápidos */}
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => applyPreset('economic_housing')}
                className="py-1 px-1 text-[9px] font-mono bg-cyan-950/80 hover:bg-cyan-900/90 rounded border border-cyan-700/60 text-cyan-300 font-bold transition truncate"
                title="Cargar ejemplo de Vivienda Económica"
              >
                🏠 Vivienda
              </button>
              <button
                type="button"
                onClick={() => applyPreset('residential')}
                className="py-1 px-1 text-[9px] font-mono bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-slate-300 transition truncate"
              >
                Residencial
              </button>
              <button
                type="button"
                onClick={() => applyPreset('industrial')}
                className="py-1 px-1 text-[9px] font-mono bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-slate-300 transition truncate"
              >
                Industrial
              </button>
              <button
                type="button"
                onClick={() => applyPreset('heavy')}
                className="py-1 px-1 text-[9px] font-mono bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-slate-300 transition truncate"
              >
                Carga Alta
              </button>
            </div>

            {/* Acceso directo al generador D+L y selector de viviendas económicas */}
            <button
              type="button"
              onClick={() => setActiveTab('load_combos')}
              className="w-full py-2 px-2.5 rounded-lg bg-gradient-to-r from-slate-950 via-cyan-950/80 to-slate-950 hover:border-cyan-500/80 border border-cyan-800/70 text-cyan-300 font-mono text-[11px] font-bold flex items-center justify-between transition shadow-sm cursor-pointer group"
            >
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition shrink-0" />
                <span className="truncate">Generador D + L (Viviendas)</span>
              </span>
              <span className="text-[9px] bg-cyan-900/80 text-cyan-200 px-1.5 py-0.5 rounded border border-cyan-700/60 font-mono shrink-0">
                Abrir ↗
              </span>
            </button>

            {activeHousingTitle && (
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-mono text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-1 truncate">
                  <Home className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Ejemplo: {activeHousingTitle}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHousingTitle(null)}
                  className="text-[9px] text-slate-400 hover:text-slate-200 ml-1 shrink-0"
                  title="Quitar etiqueta"
                >
                  ×
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Axial Pu (kN)</label>
                <input
                  type="number"
                  step="25"
                  value={loads.Pu}
                  onChange={(e) => setLoads({ ...loads, Pu: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Momento Mux (kN·m)</label>
                <input
                  type="number"
                  step="5"
                  value={loads.Mux}
                  onChange={(e) => setLoads({ ...loads, Mux: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Momento Muy (kN·m)</label>
                <input
                  type="number"
                  step="5"
                  value={loads.Muy}
                  onChange={(e) => setLoads({ ...loads, Muy: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block">Cortante Vux (kN)</label>
                <input
                  type="number"
                  step="5"
                  value={loads.Vux}
                  onChange={(e) => setLoads({ ...loads, Vux: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PANEL DERECHO: VISUALIZACIÓN MULTIFACÉTICA (8 cols)                  */}
        {/* ==================================================================== */}
        <div className="lg:col-span-8 space-y-4">
          {/* BARRA DE ESTADO / DICTAMEN ESTRUCTURAL GLOBAL */}
          <div
            className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 font-mono text-xs transition ${
              currentIsSafe
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-600/50 text-rose-300 animate-pulse'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  currentIsSafe ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-rose-500 shadow-md shadow-rose-500'
                }`}
              />
              <span className="font-bold text-slate-100 text-sm">
                {currentIsSafe ? 'ESTADO: CUMPLE NORMATIVA' : 'ESTADO: NO CUMPLE (FALLA)'}
              </span>
              <span className="text-slate-400 text-xs">
                (Ratio DCR = {(currentDcr * 100).toFixed(1)}%)
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-slate-300 hidden sm:inline">
                Límite φPn: <strong className="text-cyan-300">{Math.round(currentPhiPnMax)} kN</strong>
              </span>
              <span className="text-slate-300 hidden sm:inline">
                Pu: <strong className="text-amber-300">{loads.Pu} kN</strong>
              </span>

              {/* BOTÓN DE OPTIMIZAR SECCIÓN DIRECTO EN EL DICTAMEN DE DCR */}
              <button
                type="button"
                onClick={handleOptimizeSection}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                title="Ajusta automáticamente el ancho (b) y peralte (h) o el perfil metálico para alcanzar DCR ~ 0.90 sin exceder límites normativos"
              >
                <span>⚡ Optimizar Sección</span>
                <span className="text-[10px] bg-slate-950/30 text-slate-950 px-1.5 py-0.2 rounded font-mono font-bold">
                  DCR ~ 0.90
                </span>
              </button>

              {/* BOTÓN DIRECTO DE EXPORTAR PDF */}
              <button
                type="button"
                onClick={handleExportPdfDirectly}
                disabled={isExportingPdfDirectly}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-950/60 transition active:scale-95 cursor-pointer border border-red-400/40"
                title="Descargar la memoria de cálculo oficial en formato PDF con gráficos y tablas BBS"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExportingPdfDirectly ? 'Generando...' : '⬇️ Exportar PDF'}</span>
              </button>
            </div>
          </div>

          {/* BARRA DE PESTAÑAS (TABS) */}
          <div className="flex flex-wrap gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('cad')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'cad' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📐 Planos CAD
            </button>
            <button
              onClick={() => setActiveTab('curves')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'curves' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 Curvas P-M y Deformación
            </button>
            <button
              onClick={() => setActiveTab('pdelta')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'pdelta' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📐 Efectos P-Delta</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                  pDeltaAnalysis.isSlender
                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}
              >
                {pDeltaAnalysis.isSlender ? `δns=${pDeltaAnalysis.deltaNs.toFixed(2)}` : 'Corta'}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('load_combos')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'load_combos'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>⚖️ Cargas D+L (Viviendas)</span>
              {activeHousingTitle ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1 py-0.2 rounded font-mono">
                  ULS
                </span>
              )}
            </button>
            {material === 'concrete' && (
              <button
                onClick={() => setActiveTab('rebar')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'rebar' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔩 Combinaciones Acero
              </button>
            )}
            {material === 'concrete' && (
              <button
                onClick={() => setActiveTab('bbs')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'bbs' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📋 Despiece BBS
              </button>
            )}
            {material === 'concrete' && (
              <button
                onClick={() => setActiveTab('ties_combined')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'ties_combined' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🪝 Validación de Estribos</span>
                {combinedBarsTieResult && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      combinedBarsTieResult.allChecksPassed ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
                    }`}
                  />
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'connections' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔗 Visor de Uniones</span>
            </button>
            <button
              onClick={() => setActiveTab('failure_sim')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'failure_sim' ? 'bg-rose-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>💥 Simulación de Falla</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            </button>
            <button
              onClick={() => setActiveTab('seismic_wind')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'seismic_wind' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌪️ Sismo & Viento</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  seismicWindResult.isSafe ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'ai' ? 'bg-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ✨ Asesor IA
            </button>
          </div>

          {/* CONTENIDO DE PESTAÑAS */}
          {/* TAB 1: PLANOS TÉCNICOS CAD */}
          {activeTab === 'cad' && (
            <div className="space-y-4">
              <CadSectionViewer
                material={material}
                b={material === 'concrete' ? concreteGeom.b : material === 'steel' ? steelProfile.b : woodB}
                h={material === 'concrete' ? concreteGeom.h : material === 'steel' ? steelProfile.d : woodH}
                cover={material === 'concrete' ? concreteGeom.cover : 0}
                bars={concreteResult.bars}
                ties={tieDesign}
                steelProfile={steelProfile}
                steelConnection={steelResult.connection}
                woodProps={woodProps}
                onOpenCombinedBarsModal={() => setShowCombinedBarsTieModal(true)}
              />

              <CadElevationViewer
                material={material}
                b={material === 'concrete' ? concreteGeom.b : material === 'steel' ? steelProfile.b : woodB}
                h={material === 'concrete' ? concreteGeom.h : material === 'steel' ? steelProfile.d : woodH}
                heightL={colLength}
                ties={tieDesign}
                steelConnection={steelResult.connection}
              />
            </div>
          )}

          {/* TAB 2: CURVAS INTERACTIVAS P-M Y DEFORMACIÓN */}
          {activeTab === 'curves' && (
            <div className="space-y-4">
              <InteractionDiagramChart
                nominalCurve={currentNominalCurve}
                designCurve={currentDesignCurve}
                Pu={loads.Pu}
                Mu={loads.Mux}
                Muy={loads.Muy}
                phiPnMax={currentPhiPnMax}
                dcr={currentDcr}
                isSafe={currentIsSafe}
                materialName={material === 'concrete' ? 'Hormigón Armado' : material === 'steel' ? 'Acero AISC' : 'Madera NC 206'}
              />

              <DeformationMomentCharts
                heightPoints={deformationResult.points}
                deltaMaxMm={deformationResult.deltaMaxMm}
                maxMomentKNm={deformationResult.maxMomentKNm}
                deltaNsMagnifier={deformationResult.deltaNsMagnifier}
                criticalEulerLoadKN={deformationResult.criticalEulerLoadKN}
                heightL={colLength}
              />

              {/* Tarjeta de Acceso e Influencia P-Delta */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
                    📐
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      Influencia de Efectos P-Delta y Esbeltez (λ = {pDeltaAnalysis.governingSlenderness.toFixed(1)})
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded font-bold border ${
                          pDeltaAnalysis.isSlender
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        }`}
                      >
                        {pDeltaAnalysis.isSlender
                          ? `Esbelta (+${pDeltaAnalysis.momentIncreasePct}% Momento)`
                          : 'Columna Corta (P-Δ Despreciable)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      {pDeltaAnalysis.isSlender
                        ? `Factor amplificador δns = ${pDeltaAnalysis.deltaNs.toFixed(2)} | Pérdida de capacidad axial: -${pDeltaAnalysis.axialCapacityLossPct}%`
                        : `La esbeltez λ = ${pDeltaAnalysis.governingSlenderness.toFixed(1)} ≤ ${pDeltaAnalysis.slendernessLimit} permite no amplificar por segundo orden.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('pdelta')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <span>Ver Análisis P-Delta Completo →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: ANÁLISIS EXHAUSTIVO DE EFECTOS P-DELTA Y ESBELTEZ */}
          {activeTab === 'pdelta' && (
            <PDeltaAnalysisViewer
              analysis={pDeltaAnalysis}
              onUpdateColLength={setColLength}
              onUpdateK={(newKx, newKy) => {
                setKx(newKx);
                setKy(newKy);
              }}
            />
          )}

          {/* TAB: GENERADOR DE COMBINACIONES DE CARGA D+L & VIVIENDAS ECONÓMICAS */}
          {activeTab === 'load_combos' && (
            <LoadCombinationsGenerator
              standard={standard}
              onSelectStandard={setStandard}
              currentLoads={loads}
              material={material}
              onSelectMaterial={setMaterial}
              onApplyLoads={(appliedLoads, service, exampleName, recSection) => {
                setLoads(appliedLoads);
                setLastServiceLoads(service);
                if (exampleName) {
                  setActiveHousingTitle(exampleName);
                }
                if (recSection) {
                  if (recSection.material === 'concrete' && material === 'concrete') {
                    if (recSection.dimensions.includes('200 x 200')) {
                      setConcreteGeom((prev) => ({ ...prev, b: 200, h: 200 }));
                    } else if (recSection.dimensions.includes('300 x 300')) {
                      setConcreteGeom((prev) => ({ ...prev, b: 300, h: 300 }));
                    } else if (recSection.dimensions.includes('350 x 350')) {
                      setConcreteGeom((prev) => ({ ...prev, b: 350, h: 350 }));
                    }
                  } else if (recSection.material === 'wood' && material === 'wood') {
                    if (recSection.dimensions.includes('140 x 140')) {
                      setWoodB(140);
                      setWoodH(140);
                    }
                  }
                }
              }}
            />
          )}

          {/* TAB 3: COMBINACIONES POSIBLES DE ACERO */}
          {activeTab === 'rebar' && material === 'concrete' && (
            <RebarCombinationsSelector
              combinations={concreteResult.combinations}
              selectedComboName={selectedComboName}
              onSelectCombination={(c: RebarCombination) => setSelectedComboName(c.name)}
              Ag={concreteGeom.b * concreteGeom.h}
              onOpenCombinedBarsTieModal={() => setShowCombinedBarsTieModal(true)}
            />
          )}

          {/* TAB: VALIDACIÓN DE ESTRIBOS Y CONFINAMIENTO SÍSMICO */}
          {activeTab === 'ties_combined' && material === 'concrete' && (
            <TieValidationViewer
              geom={concreteGeom}
              onUpdateGeom={setConcreteGeom}
              bars={concreteResult.bars}
              tieDesign={tieDesign}
              onUpdateTieDesign={setTieDesign}
              standard={standard}
              fc={concreteProps.fc}
              colLengthM={colLength}
              Pu_kN={loads.Pu}
              onOpenCombinedBarsModal={() => setShowCombinedBarsTieModal(true)}
            />
          )}

          {/* TAB 4: PLANILLA DE DESPIECE DE ACERO (BBS) */}
          {activeTab === 'bbs' && material === 'concrete' && (
            <SteelScheduleTable
              schedule={concreteResult.schedule}
              concreteVolumeM3={(concreteGeom.b / 1000) * (concreteGeom.h / 1000) * colLength}
              totalSteelWeightKg={concreteResult.schedule.reduce((acc, s) => acc + s.totalWeightKg, 0)}
            />
          )}

          {/* TAB 5: VISOR DE UNIONES Y NUDOS ESTRUCTURALES (HORMIGÓN, ACERO Y MADERA) */}
          {activeTab === 'connections' && (
            <JointsAndConnectionsViewer
              material={material}
              standard={standard}
              Pu={loads.Pu}
              Mux={loads.Mux}
              Vux={loads.Vux}
              concreteGeom={concreteGeom}
              tieDesign={tieDesign}
              fc={concreteProps.fc}
              steelProfile={steelProfile}
              steelConnection={steelResult.connection}
              woodB={woodB}
              woodH={woodH}
              woodProps={woodProps}
            />
          )}

          {/* TAB: SIMULADOR GRÁFICO DE MODOS DE FALLA */}
          {activeTab === 'failure_sim' && (
            <StructuralFailureSimulationViewer
              material={material}
              standard={standard}
              onSelectStandard={setStandard}
              concreteGeom={concreteGeom}
              concreteFc={concreteProps.fc}
              concreteEc={concreteProps.Ec}
              rebarFy={rebarProps.Fy}
              rebarProps={rebarProps}
              tieDesign={tieDesign}
              colLoads={loads}
              colLengthM={colLength}
              kx={kx}
              ky={ky}
              fc={concreteProps.fc}
              steelProfile={steelProfile}
              steelProps={steelProps}
              woodB={woodB}
              woodH={woodH}
              woodProps={woodProps}
              onApplyOptimizedSection={(optResult) => {
                setOptimizationResult(optResult);
                if (optResult.success) {
                  if (material === 'concrete' && optResult.concrete) {
                    setConcreteGeom((prev) => ({
                      ...prev,
                      b: optResult.concrete!.optimizedB,
                      h: optResult.concrete!.optimizedH,
                    }));
                    if (optResult.concrete.recommendedComboName) {
                      setSelectedComboName(optResult.concrete.recommendedComboName);
                    }
                  } else if (material === 'steel' && optResult.steel) {
                    setSelectedProfileId(optResult.steel.optimizedProfileId);
                  } else if (material === 'wood' && optResult.wood) {
                    setWoodB(optResult.wood.optimizedB);
                    setWoodH(optResult.wood.optimizedH);
                  }
                  setIsOptimizationApplied(true);
                }
              }}
              onOpenOptimizationModal={handleOptimizeSection}
            />
          )}

          {/* TAB 6: VERIFICACIÓN SÍSMICA Y EÓLICA (NC 46:2017 & NC 285:2003 / ACI 318 / EUROCÓDIGOS) */}
          {activeTab === 'seismic_wind' && (
            <SeismicWindAnalysisViewer
              material={material}
              standard={standard}
              colLengthM={colLength}
              seismicParams={seismicParams}
              onUpdateSeismicParams={setSeismicParams}
              windParams={windParams}
              onUpdateWindParams={setWindParams}
              verificationResult={seismicWindResult}
              concreteGeom={concreteGeom}
              onUpdateConcreteGeom={setConcreteGeom}
              tieDesign={tieDesign}
              onUpdateTieDesign={setTieDesign}
              concreteProps={concreteProps}
              onUpdateConcreteMatKey={setConcreteMatKey}
              steelProfile={steelProfile}
              onUpdateSteelProfile={setSelectedProfileId}
              steelProps={steelProps}
              woodB={woodB}
              woodH={woodH}
              onUpdateWoodDimensions={(b, h) => {
                setWoodB(b);
                setWoodH(h);
              }}
              loads={loads}
            />
          )}

          {/* TAB 7: ASESOR ESTRUCTURAL INTELIGENTE (GEMINI AI) */}
          {activeTab === 'ai' && (
            <AiStructuralAdvisor
              currentContext={{
                material,
                standard,
                dimensions: dimensionsText,
                loads: loadsText,
                dcr: currentDcr,
                isSafe: currentIsSafe,
                confinement: `s₀=${tieDesign.s0}mm, sMid=${tieDesign.sMid}mm, Ld=${tieDesign.lapSpliceLength}mm`,
              }}
            />
          )}
        </div>
      </main>

      {/* MODAL DE CATÁLOGO Y BIBLIOTECA DE MATERIALES Y PERFILES */}
      <MaterialsCatalogModal
        isOpen={showMaterialsModal}
        onClose={() => setShowMaterialsModal(false)}
        currentMaterial={material}
        onSelectSteelProfile={(profileId) => {
          setSelectedProfileId(profileId);
          setMaterial('steel');
        }}
        onSelectSteelGrade={(gradeKey) => {
          setSteelMatKey(gradeKey);
          setMaterial('steel');
        }}
        onSelectConcreteMix={(concreteKey) => {
          setConcreteMatKey(concreteKey);
          setMaterial('concrete');
        }}
        onSelectWoodSpecies={(woodKey) => {
          setWoodMatKey(woodKey);
          setMaterial('wood');
        }}
      />

      {/* MODAL DE MEMORIA DE CÁLCULO DETALLADA */}
      <CalculationReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        projectName={projectMetadata.projectName || projectName}
        engineerName={projectMetadata.engineerName || engineerName}
        projectMetadata={projectMetadata}
        onOpenEditMetadata={() => setShowProjectMetadataModal(true)}
        material={material}
        standard={standard}
        dimensionsText={dimensionsText}
        loadsText={loadsText}
        materialsText={materialsText}
        steps={currentSteps}
        isSafe={currentIsSafe}
        dcr={currentDcr}
        loads={loads}
        colLengthM={colLength}
        nominalCurve={
          material === 'concrete'
            ? concreteResult.nominalCurve
            : material === 'steel'
            ? steelResult.nominalCurve
            : woodResult.nominalCurve
        }
        designCurve={
          material === 'concrete'
            ? concreteResult.designCurve
            : material === 'steel'
            ? steelResult.designCurve
            : woodResult.designCurve
        }
        phiPnMax={
          material === 'concrete'
            ? concreteResult.phiPnMax
            : material === 'steel'
            ? steelResult.phiPnMax
            : woodResult.phiPnMax
        }
        schedule={material === 'concrete' ? concreteResult.schedule : undefined}
        concreteVolumeM3={(concreteGeom.b / 1000) * (concreteGeom.h / 1000) * colLength}
        totalSteelWeightKg={
          material === 'concrete'
            ? concreteResult.schedule.reduce((acc, s) => acc + s.totalWeightKg, 0)
            : 0
        }
        concreteGeom={concreteGeom}
        bars={concreteResult.bars}
        tieDesign={tieDesign}
        steelProfile={steelProfile}
        steelConnection={steelResult.connection}
        woodB={woodB}
        woodH={woodH}
        woodProps={woodProps}
        seismicWindResult={seismicWindResult}
        combinedBarsTieResult={combinedBarsTieResult}
        housingExampleTitle={activeHousingTitle || undefined}
        serviceLoadsText={
          lastServiceLoads
            ? `PD = ${lastServiceLoads.PD} kN (muerta), PL = ${lastServiceLoads.PL} kN (viva), MDx = ${lastServiceLoads.MDx} kN·m, MLx = ${lastServiceLoads.MLx} kN·m`
            : undefined
        }
      />

      {/* MODAL DE EDICIÓN DE METADATOS DE LA OBRA Y RESPONSABLE DEL CÁLCULO */}
      <ProjectMetadataModal
        isOpen={showProjectMetadataModal}
        onClose={() => setShowProjectMetadataModal(false)}
        metadata={projectMetadata}
        onSave={handleSaveProjectMetadata}
      />

      {/* MODAL DE DIAGNÓSTICO Y SOLUCIONES DE CERCOS EN BARRAS COMBINADAS */}
      <CombinedBarsTieModal
        isOpen={showCombinedBarsTieModal}
        onClose={() => setShowCombinedBarsTieModal(false)}
        geom={concreteGeom}
        bars={concreteResult.bars}
        tieDesign={tieDesign}
        onUpdateTieDesign={setTieDesign}
        standard={standard}
        fc={concreteProps.fc}
        fy={rebarProps.Fy || (rebarProps as any).fy || 500}
        Pu_kN={Math.abs(loads.Pu)}
      />

      {/* MODAL DE RESULTADOS DE OPTIMIZACIÓN AUTOMÁTICA DE SECCIÓN (DCR ~ 0.90) */}
      <SectionOptimizationModal
        isOpen={showOptimizationModal}
        onClose={() => setShowOptimizationModal(false)}
        result={optimizationResult}
        isApplied={isOptimizationApplied}
        onApply={() => setIsOptimizationApplied(true)}
        onRevert={handleRevertOptimization}
      />

      {/* MODAL DE HISTORIAL DE VERSIONES, CAMBIOS Y AUTOGUARDADO */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        currentState={currentState}
        historySnapshots={historySnapshots}
        onRestoreState={handleRestoreState}
        onUpdateHistory={setHistorySnapshots}
        onResetToDefaults={handleResetToDefaults}
      />
    </div>
  );
}

