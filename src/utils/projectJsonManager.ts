/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppInputsState,
  ColumnLoads,
  ConcreteGeometry,
  DEFAULT_APP_INPUTS_STATE,
  DEFAULT_PROJECT_METADATA,
  HistorySnapshot,
  MaterialType,
  ProjectExportPackage,
  ProjectExportResultsSummary,
  ProjectMetadata,
} from '../types';
import { CONCRETE_MATERIALS, STEEL_MATERIALS, STEEL_PROFILES, WOOD_MATERIALS } from '../engine/standardsData';

export interface BuildProjectPackageParams {
  state: AppInputsState;
  history?: HistorySnapshot[];
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
}

/**
 * Empaqueta el estado completo del proyecto incluyendo cargas, geometría, materiales y resultados analíticos.
 */
export function buildProjectPackage(params: BuildProjectPackageParams): ProjectExportPackage {
  const {
    state,
    history,
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
  } = params;

  // Material y propiedades seleccionadas
  const concreteMat = CONCRETE_MATERIALS[state.concreteMatKey] || CONCRETE_MATERIALS['H25'];
  const rebarMat = STEEL_MATERIALS[state.rebarMatKey] || STEEL_MATERIALS['B500S'];
  const steelProfile = STEEL_PROFILES.find((p) => p.id === state.selectedProfileId) || STEEL_PROFILES[1];
  const steelMat = STEEL_MATERIALS[state.steelMatKey] || STEEL_MATERIALS['A572_Gr50'];
  const woodMat = WOOD_MATERIALS[state.woodMatKey] || WOOD_MATERIALS['NC_GRUPO_A'];

  // Descripción de la sección
  let sectionDesc = '';
  if (state.material === 'concrete') {
    sectionDesc =
      state.concreteGeom.shape === 'circular'
        ? `Circular Ø${state.concreteGeom.b} mm, rec. ${state.concreteGeom.cover} mm`
        : `Rectangular ${state.concreteGeom.b} x ${state.concreteGeom.h} mm, rec. ${state.concreteGeom.cover} mm`;
  } else if (state.material === 'steel') {
    sectionDesc = `Perfil de Acero ${steelProfile.designation} (${steelProfile.type}) d=${steelProfile.d}mm b=${steelProfile.b}mm`;
  } else {
    sectionDesc = `Escuadría de Madera ${state.woodB} x ${state.woodH} mm`;
  }

  // Ratios parciales
  const dcrAxial = phiPnMax > 0 ? Math.abs(state.loads.Pu) / phiPnMax : 0;
  const dcrFlexure = phiMnx > 0 ? Math.abs(state.loads.Mux) / phiMnx : 0;
  const dcrShear = phiVn > 0 ? Math.max(Math.abs(state.loads.Vux), Math.abs(state.loads.Vuy)) / phiVn : 0;

  // Conteo de comprobaciones
  const passedChecks = steps.filter((s) => s.status === 'OK').length;
  const warningChecks = steps.filter((s) => s.status === 'WARNING').length;
  const failedChecks = steps.filter((s) => s.status === 'DANGER').length;

  const resultsSummary: ProjectExportResultsSummary = {
    isSafe,
    dcr: Number(dcr.toFixed(3)),
    status: isSafe ? (dcr > 0.95 ? 'WARNING' : 'OK') : 'DANGER',
    statusText: isSafe
      ? dcr > 0.95
        ? 'ADECUADO AL LÍMITE (DCR > 95%)'
        : 'DISEÑO ESTRUCTURAL ADECUADO (CUMPLE)'
      : 'COLAPSO O SOBRECARGA ESTRUCTURAL (NO CUMPLE)',
    axialCapacityKN: Number(phiPnMax.toFixed(2)),
    momentCapacityKNm: Number(phiMnx.toFixed(2)),
    shearCapacityKN: Number(phiVn.toFixed(2)),
    dcrAxial: Number(dcrAxial.toFixed(3)),
    dcrFlexure: Number(dcrFlexure.toFixed(3)),
    dcrShear: Number(dcrShear.toFixed(3)),
    slenderness: pDeltaAnalysis
      ? {
          isSlender: pDeltaAnalysis.isSlender,
          slendernessRatio: Number(Math.max(pDeltaAnalysis.slendernessX || 0, pDeltaAnalysis.slendernessY || 0).toFixed(2)),
          deltaNs: Number((pDeltaAnalysis.momentMagnifierDeltaNs || 1).toFixed(3)),
          magnifiedMomentKNm: Number((pDeltaAnalysis.magnifiedMux || state.loads.Mux).toFixed(2)),
        }
      : undefined,
    reinforcement:
      state.material === 'concrete'
        ? {
            summary: state.selectedComboName,
            totalSteelWeightKg: concreteResult?.schedule
              ? Number(
                  concreteResult.schedule
                    .reduce((acc: number, item: any) => acc + (item.totalWeightKg || 0), 0)
                    .toFixed(2)
                )
              : undefined,
            steelRatioKgM3: concreteResult?.steelRatioKgM3
              ? Number(concreteResult.steelRatioKgM3.toFixed(2))
              : undefined,
            tieSpacingZoneS0: state.tieDesign?.s0,
            tieSpacingMidSpan: state.tieDesign?.sMid,
          }
        : undefined,
    seismicWind: seismicWindResult
      ? {
          isSeismicSafe: seismicWindResult.isSeismicSafe,
          seismicDCR: Number(seismicWindResult.seismicDCR.toFixed(3)),
          isWindSafe: seismicWindResult.isWindSafe,
          windDCR: Number(seismicWindResult.windDCR.toFixed(3)),
        }
      : undefined,
    checksCount: {
      total: steps.length,
      passed: passedChecks,
      warning: warningChecks,
      failed: failedChecks,
    },
    stepsSummary: steps.map((s) => ({
      title: s.title,
      codeRef: s.codeRef,
      formula: s.formula,
      values: s.values,
      status: s.status,
      comment: s.comment,
    })),
  };

  const projectPackage: ProjectExportPackage = {
    app: 'ColumMaster Pro - Structural Engineering Suite',
    schema: 'colum_master_project_v2',
    version: 2,
    exportedAt: new Date().toISOString(),
    projectMetadata: state.projectMetadata || DEFAULT_PROJECT_METADATA,
    inputs: JSON.parse(JSON.stringify(state)),
    geometryInfo: {
      material: state.material,
      heightM: state.colLength,
      kx: state.kx,
      ky: state.ky,
      sectionDescription: sectionDesc,
      concrete: state.material === 'concrete' ? state.concreteGeom : undefined,
      steel:
        state.material === 'steel'
          ? {
              profileId: steelProfile.id,
              designation: steelProfile.designation,
              dimensions: {
                d: steelProfile.d,
                b: steelProfile.b,
                tw: steelProfile.tw,
                tf: steelProfile.tf,
                A: steelProfile.A,
                Ix: steelProfile.Ix,
                Iy: steelProfile.Iy,
              },
            }
          : undefined,
      wood: state.material === 'wood' ? { b: state.woodB, h: state.woodH } : undefined,
    },
    materialsInfo: {
      material: state.material,
      standard: state.standard,
      concrete:
        state.material === 'concrete'
          ? {
              name: concreteMat.name,
              fc: concreteMat.fc,
              Ec: concreteMat.Ec,
              density: concreteMat.density,
            }
          : undefined,
      rebar:
        state.material === 'concrete'
          ? {
              name: rebarMat.name,
              fy: rebarMat.Fy || (rebarMat as any).fy || 500,
            }
          : undefined,
      steel:
        state.material === 'steel'
          ? {
              name: steelMat.name,
              designation: steelProfile.designation,
              Fy: steelMat.Fy,
              Fu: steelMat.Fu,
              E: steelMat.E,
            }
          : undefined,
      wood:
        state.material === 'wood'
          ? {
              name: woodMat.name,
              species: woodMat.species,
              fc0: woodMat.fc0,
              ft0: woodMat.ft0,
              fv: woodMat.fv,
              E0mean: woodMat.E0mean,
            }
          : undefined,
    },
    loadsInfo: state.loads,
    results: resultsSummary,
    history: history && history.length > 0 ? history : undefined,
  };

  return projectPackage;
}

/**
 * Serializa el paquete a cadena JSON formateada
 */
export function serializeProjectToJson(pkg: ProjectExportPackage): string {
  return JSON.stringify(pkg, null, 2);
}

/**
 * Descarga el archivo JSON en el navegador del usuario
 */
export function downloadProjectJson(pkg: ProjectExportPackage, customFilename?: string): string {
  const jsonStr = serializeProjectToJson(pkg);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const safeProjName = (pkg.projectMetadata?.projectName || 'columna')
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();

  const safeElem = (pkg.projectMetadata?.elementId || 'c1')
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `colum_master_${safeProjName}_${safeElem}_${dateStr}.json`;

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Copia el archivo JSON al portapapeles del sistema
 */
export async function copyProjectJsonToClipboard(pkg: ProjectExportPackage): Promise<boolean> {
  const jsonStr = serializeProjectToJson(pkg);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(jsonStr);
    return true;
  }
  return false;
}

export interface ParseProjectJsonResult {
  isValid: boolean;
  error?: string;
  format: 'v2_complete' | 'legacy_package' | 'raw_state';
  inputsState?: AppInputsState;
  projectMetadata?: ProjectMetadata;
  results?: ProjectExportResultsSummary;
  history?: HistorySnapshot[];
  summary?: {
    projectName: string;
    elementId: string;
    engineerName: string;
    material: MaterialType;
    section: string;
    standard: string;
    loadsText: string;
    dcr?: number;
    isSafe?: boolean;
    exportedAt?: string;
  };
}

/**
 * Analiza, valida e interpreta un archivo JSON para importación
 */
export function parseAndValidateProjectJson(jsonContent: string): ParseProjectJsonResult {
  try {
    if (!jsonContent || typeof jsonContent !== 'string') {
      return { isValid: false, error: 'El contenido JSON está vacío.', format: 'raw_state' };
    }

    const parsed = JSON.parse(jsonContent);
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'El contenido analizado no es un objeto JSON válido.', format: 'raw_state' };
    }

    let detectedInputs: any = null;
    let detectedFormat: 'v2_complete' | 'legacy_package' | 'raw_state' = 'raw_state';
    let detectedResults: ProjectExportResultsSummary | undefined = undefined;
    let detectedHistory: HistorySnapshot[] | undefined = undefined;
    let detectedMetadata: ProjectMetadata | undefined = undefined;
    let exportedAt: string | undefined = undefined;

    // Caso 1: Paquete v2 completo con inputs y results
    if (parsed.schema === 'colum_master_project_v2' && parsed.inputs) {
      detectedFormat = 'v2_complete';
      detectedInputs = parsed.inputs;
      detectedResults = parsed.results;
      detectedHistory = parsed.history;
      detectedMetadata = parsed.projectMetadata || parsed.inputs.projectMetadata;
      exportedAt = parsed.exportedAt;
    }
    // Caso 2: Paquete previo { app, state, history }
    else if (parsed.state && (parsed.app || parsed.version)) {
      detectedFormat = 'legacy_package';
      detectedInputs = parsed.state;
      detectedHistory = parsed.history;
      detectedMetadata = parsed.state.projectMetadata;
      exportedAt = parsed.exportDate;
    }
    // Caso 3: Estado directo AppInputsState
    else if (parsed.material && parsed.loads) {
      detectedFormat = 'raw_state';
      detectedInputs = parsed;
      detectedMetadata = parsed.projectMetadata;
    } else {
      return {
        isValid: false,
        error: 'El archivo JSON no contiene una estructura reconocida de proyecto ColumMaster (faltan parámetros de cargas o materiales).',
        format: 'raw_state',
      };
    }

    // Normalizar y blindar inputsState contra campos ausentes
    const normalizedInputs: AppInputsState = {
      ...DEFAULT_APP_INPUTS_STATE,
      ...detectedInputs,
      projectMetadata: {
        ...DEFAULT_APP_INPUTS_STATE.projectMetadata,
        ...(detectedMetadata || detectedInputs.projectMetadata || {}),
      },
      loads: {
        ...DEFAULT_APP_INPUTS_STATE.loads,
        ...(detectedInputs.loads || {}),
      },
      concreteGeom: {
        ...DEFAULT_APP_INPUTS_STATE.concreteGeom,
        ...(detectedInputs.concreteGeom || {}),
      },
      tieDesign: {
        ...DEFAULT_APP_INPUTS_STATE.tieDesign,
        ...(detectedInputs.tieDesign || {}),
      },
      seismicParams: {
        ...DEFAULT_APP_INPUTS_STATE.seismicParams,
        ...(detectedInputs.seismicParams || {}),
      },
      windParams: {
        ...DEFAULT_APP_INPUTS_STATE.windParams,
        ...(detectedInputs.windParams || {}),
      },
    };

    // Crear resumen legible para preview previo a la carga
    const meta = normalizedInputs.projectMetadata;
    let sectionSummary = '';
    if (normalizedInputs.material === 'concrete') {
      sectionSummary =
        normalizedInputs.concreteGeom.shape === 'circular'
          ? `Ø${normalizedInputs.concreteGeom.b} mm (${normalizedInputs.concreteMatKey})`
          : `${normalizedInputs.concreteGeom.b}x${normalizedInputs.concreteGeom.h} mm (${normalizedInputs.concreteMatKey})`;
      if (normalizedInputs.selectedComboName) {
        sectionSummary += ` · ${normalizedInputs.selectedComboName}`;
      }
    } else if (normalizedInputs.material === 'steel') {
      sectionSummary = `${normalizedInputs.selectedProfileId} (${normalizedInputs.steelMatKey})`;
    } else {
      sectionSummary = `${normalizedInputs.woodB}x${normalizedInputs.woodH} mm (${normalizedInputs.woodMatKey})`;
    }

    const loadsText = `Pu=${normalizedInputs.loads.Pu}kN, Mux=${normalizedInputs.loads.Mux}kN·m, Vux=${normalizedInputs.loads.Vux}kN (L=${normalizedInputs.colLength}m)`;

    return {
      isValid: true,
      format: detectedFormat,
      inputsState: normalizedInputs,
      projectMetadata: normalizedInputs.projectMetadata,
      results: detectedResults,
      history: detectedHistory,
      summary: {
        projectName: meta.projectName || 'Proyecto sin nombre',
        elementId: meta.elementId || 'Columna',
        engineerName: meta.engineerName || 'No especificado',
        material: normalizedInputs.material,
        section: sectionSummary,
        standard: normalizedInputs.standard,
        loadsText,
        dcr: detectedResults?.dcr,
        isSafe: detectedResults?.isSafe,
        exportedAt,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Error de sintaxis JSON: ${err?.message || 'Archivo corrupto o mal formado'}`,
      format: 'raw_state',
    };
  }
}
