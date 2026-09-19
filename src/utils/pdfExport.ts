/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  ProjectMetadata,
} from '../types';
import { SeismicWindVerificationResult } from '../engine/seismicWindEngine';
import { CombinedBarsTieVerificationResult } from '../engine/combinedBarsTieEngine';

export interface PdfExportData {
  projectName: string;
  engineerName: string;
  projectMetadata?: ProjectMetadata;
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

/**
 * Genera una imagen en formato DataURL a partir de los datos de la curva de interacción P-M
 */
function renderInteractionChartToDataUrl(
  nominalCurve: InteractionPoint[] = [],
  designCurve: InteractionPoint[] = [],
  Pu: number,
  Mu: number,
  phiPnMax: number = 1000
): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo blanco técnico
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padLeft = 70;
    const padRight = 40;
    const padTop = 50;
    const padBottom = 60;
    const chartW = canvas.width - padLeft - padRight;
    const chartH = canvas.height - padTop - padBottom;

    // Sanitizar puntos
    const safeNominal = nominalCurve.filter((p) => Number.isFinite(p.M) && Number.isFinite(p.P));
    const safeDesign = designCurve.filter((p) => Number.isFinite(p.M) && Number.isFinite(p.P));

    const allM = [...safeNominal.map((p) => p.M), ...safeDesign.map((p) => p.M), Math.abs(Mu)];
    const allP = [...safeNominal.map((p) => p.P), ...safeDesign.map((p) => p.P), Pu, phiPnMax];

    const maxM = Math.max(...allM, 50) * 1.15;
    const minP = Math.min(...allP, 0);
    const maxP = Math.max(...allP, 500) * 1.15;

    const scaleX = (m: number) => padLeft + (m / maxM) * chartW;
    const scaleY = (p: number) => padTop + chartH - ((p - minP) / (maxP - minP)) * chartH;

    // Cuadrícula técnica sutil
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const numGrid = 6;
    for (let i = 0; i <= numGrid; i++) {
      // Líneas horizontales P
      const pVal = minP + (i / numGrid) * (maxP - minP);
      const y = scaleY(pVal);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(pVal)}`, padLeft - 8, y + 4);

      // Líneas verticales M
      const mVal = (i / numGrid) * maxM;
      const x = scaleX(mVal);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + chartH);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(mVal)}`, x, padTop + chartH + 18);
    }

    // Ejes principales
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + chartH);
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.stroke();

    // Título del gráfico
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DIAGRAMA DE INTERACCIÓN P-M (FLEXO-COMPRESIÓN)', padLeft, 28);

    // Rótulos de ejes
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.fillText('Momento Flector Mu (kN·m)', padLeft + chartW / 2, padTop + chartH + 38);

    ctx.save();
    ctx.translate(18, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Carga Axial Pu (kN)', 0, 0);
    ctx.restore();

    // 1. Curva Nominal (Gris/Azul punteada)
    if (safeNominal.length > 1) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      safeNominal.forEach((pt, idx) => {
        const x = scaleX(pt.M);
        const y = scaleY(pt.P);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Curva de Diseño Minorada (Azul sólida)
    if (safeDesign.length > 1) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      safeDesign.forEach((pt, idx) => {
        const x = scaleX(pt.M);
        const y = scaleY(pt.P);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 3. Límite de compresión máxima phiPnMax
    if (phiPnMax > 0 && phiPnMax < maxP) {
      const yMax = scaleY(phiPnMax);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padLeft, yMax);
      ctx.lineTo(padLeft + chartW, yMax);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#b45309';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`φPn,max = ${Math.round(phiPnMax)} kN`, padLeft + chartW - 5, yMax - 4);
    }

    // 4. Punto de Solicitación Actuante (Pu, Mu)
    const actX = scaleX(Math.abs(Mu));
    const actY = scaleY(Pu);

    // Vector de excentricidad desde el origen
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(0));
    ctx.lineTo(actX, actY);
    ctx.stroke();

    // Punto rojo
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(actX, actY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Etiqueta del punto actuante
    ctx.fillStyle = '#9f1239';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`(Mu=${Math.abs(Mu).toFixed(1)} kN·m, Pu=${Math.round(Pu)} kN)`, actX + 9, actY + 4);

    // Leyenda
    const legX = padLeft + chartW - 190;
    const legY = padTop + 15;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(legX - 8, legY - 10, 200, 70);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(legX - 8, legY - 10, 200, 70);

    // Item nominal
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(legX, legY);
    ctx.lineTo(legX + 25, legY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Nominal (Pn - Mn)', legX + 32, legY + 3);

    // Item diseño
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX, legY + 18);
    ctx.lineTo(legX + 25, legY + 18);
    ctx.stroke();
    ctx.fillText('Diseño (φPn - φMn)', legX + 32, legY + 21);

    // Item punto actuante
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(legX + 12, legY + 36, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText('Carga Actuante (Pu, Mu)', legX + 32, legY + 39);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error renderizando gráfico P-M:', err);
    return null;
  }
}

/**
 * Genera una imagen en formato DataURL a partir de la sección transversal CAD
 */
function renderSectionCadToDataUrl(
  material: MaterialType,
  concreteGeom?: ConcreteGeometry,
  bars?: RebarBar[],
  ties?: ConcreteTieDesign,
  steelProfile?: SteelProfileData,
  woodB: number = 200,
  woodH: number = 200
): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 10;

    // Título
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DETALLE DE SECCIÓN TRANSVERSAL (CAD)', centerX, 28);

    if (material === 'concrete' && concreteGeom) {
      const b = concreteGeom.b;
      const h = concreteGeom.h;
      const cover = concreteGeom.cover || 40;
      const maxDim = Math.max(b, h, 300);
      const scale = 260 / maxDim;

      const pxB = b * scale;
      const pxH = h * scale;
      const left = centerX - pxB / 2;
      const top = centerY - pxH / 2;

      // 1. Hormigón Exterior
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(left, top, pxB, pxH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(left, top, pxB, pxH);

      // Textura de hormigón sutil
      ctx.fillStyle = '#cbd5e1';
      for (let i = 0; i < 15; i++) {
        const rx = left + 10 + (Math.sin(i * 99) * 0.5 + 0.5) * (pxB - 20);
        const ry = top + 10 + (Math.cos(i * 77) * 0.5 + 0.5) * (pxH - 20);
        ctx.beginPath();
        ctx.arc(rx, ry, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // 2. Estribo perimetral
      const pxCover = cover * scale;
      const tieLeft = left + pxCover;
      const tieTop = top + pxCover;
      const tieW = pxB - 2 * pxCover;
      const tieH = pxH - 2 * pxCover;

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(tieLeft, tieTop, tieW, tieH);

      // Ganchos a 135° en una esquina
      ctx.beginPath();
      ctx.moveTo(tieLeft, tieTop + 16);
      ctx.lineTo(tieLeft + 16, tieTop);
      ctx.stroke();

      // 3. Barras longitudinales
      if (bars && bars.length > 0) {
        bars.forEach((bar) => {
          const bx = centerX + bar.x * scale;
          const by = centerY - bar.y * scale;
          const r = Math.max(3.5, (bar.diameter / 2) * scale);

          // Círculo de barra con degradado/sombra
          ctx.fillStyle = bar.isCorner ? '#1e293b' : '#334155';
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // 4. Cotas y Acotado técnico
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';

      // Cota ancho b (inferior)
      const cotaY = top + pxH + 28;
      ctx.beginPath();
      ctx.moveTo(left, cotaY);
      ctx.lineTo(left + pxB, cotaY);
      ctx.stroke();
      // Flechas
      ctx.beginPath();
      ctx.moveTo(left, cotaY - 5);
      ctx.lineTo(left, cotaY + 5);
      ctx.moveTo(left + pxB, cotaY - 5);
      ctx.lineTo(left + pxB, cotaY + 5);
      ctx.stroke();
      ctx.fillText(`b = ${b} mm`, centerX, cotaY - 6);

      // Cota peralte h (lateral derecha)
      const cotaX = left + pxB + 28;
      ctx.beginPath();
      ctx.moveTo(cotaX, top);
      ctx.lineTo(cotaX, top + pxH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cotaX - 5, top);
      ctx.lineTo(cotaX + 5, top);
      ctx.moveTo(cotaX - 5, top + pxH);
      ctx.lineTo(cotaX + 5, top + pxH);
      ctx.stroke();

      ctx.save();
      ctx.translate(cotaX + 16, centerY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`h = ${h} mm`, 0, 0);
      ctx.restore();

      // Notas al pie del CAD
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      const tieInfo = ties ? `Estribos Ø${ties.diameter} mm @ s0=${ties.s0}mm` : 'Estribos sísmicos';
      ctx.fillText(`Recubrimiento libre r = ${cover} mm | ${tieInfo} | ${bars?.length || 0} barras long.`, centerX, canvas.height - 15);
    } else if (material === 'steel') {
      // Perfil de acero
      const desig = steelProfile?.designation || 'Perfil de Acero Estructural';
      const d = steelProfile?.d || 300;
      const b = steelProfile?.b || 200;
      const maxDim = Math.max(d, b, 250);
      const scale = 240 / maxDim;

      const pxD = d * scale;
      const pxB = b * scale;
      const tf = (steelProfile?.tf || 12) * scale;
      const tw = (steelProfile?.tw || 8) * scale;

      const left = centerX - pxB / 2;
      const top = centerY - pxD / 2;

      // Dibujar perfil I
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;

      ctx.beginPath();
      // Ala superior
      ctx.rect(left, top, pxB, tf);
      // Alma
      ctx.rect(centerX - tw / 2, top + tf, tw, pxD - 2 * tf);
      // Ala inferior
      ctx.rect(left, top + pxD - tf, pxB, tf);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(desig, centerX, top + pxD + 35);
    } else {
      // Madera
      const maxDim = Math.max(woodB, woodH, 200);
      const scale = 240 / maxDim;
      const pxB = woodB * scale;
      const pxH = woodH * scale;
      const left = centerX - pxB / 2;
      const top = centerY - pxH / 2;

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(left, top, pxB, pxH);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(left, top, pxB, pxH);

      // Vetas de madera
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1;
      for (let y = top + 15; y < top + pxH - 10; y += 20) {
        ctx.beginPath();
        ctx.moveTo(left + 5, y);
        ctx.lineTo(left + pxB - 5, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Escuadría de Madera: ${woodB} x ${woodH} mm`, centerX, top + pxH + 35);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error renderizando sección CAD:', err);
    return null;
  }
}

/**
 * Función principal para exportar la Memoria de Cálculo completa a PDF estructurado
 */
export async function exportCalculationReportPdf(data: PdfExportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;

  const standardTitle =
    data.standard === 'ACI_318_19'
      ? 'ACI 318-19 (Hormigón Estructural / AISC 360-16 / NDS)'
      : data.standard === 'NC_450_2006'
      ? 'Normas Cubanas: NC 450:2006 / NC 46:2017 / NC 285:2003'
      : 'Eurocódigo 2: EN 1992-1-1 / EN 1993-1-1 / EN 1995-1-1';

  const materialTitle =
    data.material === 'concrete'
      ? 'Hormigón Armado'
      : data.material === 'steel'
      ? 'Acero Estructural'
      : 'Madera Estructural';

  // ==========================================
  // PÁGINA 1: PORTADA EJECUTIVA Y GRÁFICOS P-M / CAD
  // ==========================================

  // Barra de cabecera superior
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('COLUMMASTER PRO — MEMORIA TÉCNICA DE CÁLCULO ESTRUCTURAL', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('INGENIERÍA ESTRUCTURAL Y VALIDACIÓN REGULATORIA', pageWidth - margin, 12, { align: 'right' });

  // Cuadro de identificación del proyecto y responsable técnico
  let currentY = 25;
  const boxHeight = data.projectMetadata ? 26 : 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');

  const meta = data.projectMetadata;
  if (meta) {
    // Fila 1: Obra, Elemento, Ubicación, Dictamen
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.text('OBRA / PROYECTO:', margin + 4, currentY + 5);
    doc.text('ELEMENTO:', margin + 65, currentY + 5);
    doc.text('UBICACIÓN:', margin + 115, currentY + 5);
    doc.text('DICTAMEN:', margin + 158, currentY + 5);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(meta.projectName || data.projectName, margin + 4, currentY + 10, { maxWidth: 58 });
    doc.text(meta.elementId || 'Columna C-1', margin + 65, currentY + 10, { maxWidth: 46 });
    doc.text(meta.location || 'Sector Urbano', margin + 115, currentY + 10, { maxWidth: 38 });

    // Fila 2: Responsable, Matrícula/Cédula, Empresa
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.text('RESPONSABLE:', margin + 4, currentY + 17);
    doc.text('REGISTRO / CÉDULA:', margin + 65, currentY + 17);
    doc.text('EMPRESA / CONSULTORÍA:', margin + 115, currentY + 17);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(meta.engineerName || data.engineerName, margin + 4, currentY + 22, { maxWidth: 58 });
    doc.text(meta.professionalLicense || '-', margin + 65, currentY + 22, { maxWidth: 46 });
    doc.text(meta.companyName || '-', margin + 115, currentY + 22, { maxWidth: 38 });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PROYECTO:', margin + 4, currentY + 6);
    doc.text('INGENIERO RESPONSABLE:', margin + 65, currentY + 6);
    doc.text('FECHA:', margin + 125, currentY + 6);
    doc.text('DICTAMEN GLOBAL:', margin + 152, currentY + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(data.projectName || 'Edificio de Estructuras', margin + 4, currentY + 13);
    doc.text(data.engineerName || 'Ing. Estructural', margin + 65, currentY + 13);
    doc.text(new Date().toLocaleDateString('es-ES'), margin + 125, currentY + 13);
  }

  // Badge de Estado Global
  if (data.isSafe) {
    doc.setFillColor(220, 252, 231); // emerald-100
    doc.setDrawColor(34, 197, 94); // emerald-500
    doc.roundedRect(margin + 154, currentY + (meta ? 7 : 9), 24, 9, 1.5, 1.5, 'FD');
    doc.setTextColor(21, 128, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('✓ CUMPLE', margin + 166, currentY + (meta ? 13 : 15), { align: 'center' });
  } else {
    doc.setFillColor(254, 226, 226); // rose-100
    doc.setDrawColor(239, 68, 68); // rose-500
    doc.roundedRect(margin + 154, currentY + (meta ? 7 : 9), 24, 9, 1.5, 1.5, 'FD');
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('✕ NO CUMPLE', margin + 166, currentY + (meta ? 13 : 15), { align: 'center' });
  }

  // Cuadro de Resumen Ejecutivo y Bases de Cálculo
  currentY += boxHeight + 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, data.housingExampleTitle ? 34 : 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199); // cyan-600
  doc.text('1. BASES DE DISEÑO, PARÁMETROS Y SOLICITACIONES', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text(`• Norma Aplicada: ${standardTitle}`, margin + 4, currentY + 12);
  doc.text(`• Material y Geometría: ${materialTitle} | ${data.dimensionsText}`, margin + 4, currentY + 17);
  doc.text(`• Materiales: ${data.materialsText}`, margin + 4, currentY + 22);

  const loadsSummary = `• Solicitaciones Mayoradas ULS: ${data.loadsText} (DCR = ${(data.dcr * 100).toFixed(1)}%)`;
  doc.text(loadsSummary, margin + 4, currentY + 27);

  if (data.housingExampleTitle) {
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(`• Prototipo de Vivienda Económica: ${data.housingExampleTitle} | ${data.serviceLoadsText || ''}`, margin + 4, currentY + 32);
    currentY += 36;
  } else {
    currentY += 30;
  }

  // Título de Gráficos de Ingeniería
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('GRÁFICOS DE DISEÑO ESTRUCTURAL (INTERACCIÓN P-M & SECCIÓN CAD)', margin, currentY + 5);

  // Renderizar gráficos a imágenes DataURL
  const pmImg = renderInteractionChartToDataUrl(
    data.nominalCurve,
    data.designCurve,
    data.loads.Pu,
    data.loads.Mux,
    data.phiPnMax
  );

  const cadImg = renderSectionCadToDataUrl(
    data.material,
    data.concreteGeom,
    data.bars,
    data.tieDesign,
    data.steelProfile,
    data.woodB,
    data.woodH
  );

  const imgY = currentY + 8;
  const imgWidth = (contentWidth - 4) / 2; // ~89 mm cada una
  const imgHeight = 65; // mm

  if (pmImg) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, imgY, imgWidth, imgHeight);
    doc.addImage(pmImg, 'PNG', margin + 0.5, imgY + 0.5, imgWidth - 1, imgHeight - 1);
  }

  if (cadImg) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + imgWidth + 4, imgY, imgWidth, imgHeight);
    doc.addImage(cadImg, 'PNG', margin + imgWidth + 4.5, imgY + 0.5, imgWidth - 1, imgHeight - 1);
  }

  // Conclusión / Dictamen Preliminar en Página 1
  const conclusionY = imgY + imgHeight + 6;
  const isOk = data.isSafe;

  doc.setFillColor(isOk ? 240 : 254, isOk ? 253 : 242, isOk ? 244 : 242);
  doc.setDrawColor(isOk ? 187 : 254, isOk ? 247 : 202, isOk ? 208 : 202);
  doc.roundedRect(margin, conclusionY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isOk ? 22 : 159, isOk ? 101 : 18, isOk ? 52 : 57);
  doc.text(`DICTAMEN TÉCNICO PRELIMINAR (DCR = ${(data.dcr * 100).toFixed(1)}%):`, margin + 4, conclusionY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(51, 65, 85);
  const conclusionText = isOk
    ? `La sección estructural propuesta satisface los requerimientos de resistencia axial, flexión biaxial, cortante y control de esbeltez de la norma ${data.standard} con un margen de seguridad adecuado.`
    : `La sección sobrepasa los límites de capacidad resistente permitidos (DCR > 100%). Se requiere rediseñar incrementando la sección transversal, aumentando el refuerzo o reduciendo la altura libre no arriostrada.`;
  doc.text(doc.splitTextToSize(conclusionText, contentWidth - 8), margin + 4, conclusionY + 12);

  // Pie de página 1
  addFooter(doc, 1, data.standard);

  // ==========================================
  // PÁGINA 2: COMPROBACIONES DE SEGURIDAD DETALLADAS
  // ==========================================
  doc.addPage();
  addHeader(doc, data.projectName, 'COMPROBACIONES DE SEGURIDAD Y RESISTENCIA');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);
  doc.text('2. COMPROBACIONES NORMATIVAS DETALLADAS Y ECUACIONES DE RESISTENCIA', margin, 26);

  // Tabla de comprobaciones paso a paso
  const stepsTableData = data.steps.map((st, i) => [
    `2.${i + 1}`,
    st.title,
    st.codeRef,
    `${st.formula}\n${st.values}`,
    st.status,
    st.comment,
  ]);

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [['#', 'Verificación', 'Referencia', 'Ecuación y Valores Aplicados', 'Estado', 'Diagnóstico / Criterio']],
    body: stepsTableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 26, fontSize: 7 },
      3: { cellWidth: 54, font: 'courier', fontSize: 7 },
      4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 38, fontSize: 7 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const val = hookData.cell.raw as string;
        if (val === 'OK') {
          hookData.cell.styles.textColor = [21, 128, 61];
          hookData.cell.styles.fillColor = [240, 253, 244];
        } else if (val === 'WARNING') {
          hookData.cell.styles.textColor = [180, 83, 9];
          hookData.cell.styles.fillColor = [254, 243, 199];
        } else {
          hookData.cell.styles.textColor = [185, 28, 28];
          hookData.cell.styles.fillColor = [254, 226, 226];
        }
      }
    },
  });

  let nextY = (doc as any).lastAutoTable.finalY + 8;

  // Verificaciones Sísmicas y de Viento si existen
  if (data.seismicWindResult) {
    if (nextY > 210) {
      addFooter(doc, 2, data.standard);
      doc.addPage();
      addHeader(doc, data.projectName, 'VERIFICACIONES SÍSMICAS Y EÓLICAS');
      nextY = 26;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text('3. VERIFICACIONES SÍSMICAS Y EÓLICAS (NC 46:2017 & NC 285:2003 / ACI / EC2)', margin, nextY);

    const sw = data.seismicWindResult;
    const swRows = sw.checks.map((ck) => [
      ck.title,
      ck.demand,
      ck.capacity,
      ck.status,
      ck.status === 'OK' ? 'Satisface límite' : 'Excede valor admisible',
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      margin: { left: margin, right: margin },
      head: [['Comprobación', 'Demanda Calculada', 'Capacidad / Exigencia', 'Estado', 'Evaluación']],
      body: swRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      columnStyles: {
        3: { halign: 'center', fontStyle: 'bold' },
      },
    });

    nextY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Verificación de Cercos y Barras Combinadas
  if (data.material === 'concrete' && data.combinedBarsTieResult) {
    if (nextY > 210) {
      addFooter(doc, 2, data.standard);
      doc.addPage();
      addHeader(doc, data.projectName, 'DETALLADO DE ESTRIBOS Y ARRIOSTRAMIENTO');
      nextY = 26;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text('4. DETALLADO DE ESTRIBOS Y ARRIOSTRAMIENTO DE BARRAS (ACI 318-19 §25.7.2 / NC 450)', margin, nextY);

    const tieRows = data.combinedBarsTieResult.checks.map((ck) => [
      ck.title,
      ck.codeRef,
      ck.demand,
      ck.capacity,
      ck.status,
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      margin: { left: margin, right: margin },
      head: [['Parámetro de Armado', 'Código', 'Demanda / Medida', 'Exigencia Reglamentaria', 'Estado']],
      body: tieRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      columnStyles: {
        4: { halign: 'center', fontStyle: 'bold' },
      },
    });

    nextY = (doc as any).lastAutoTable.finalY + 6;
  }

  addFooter(doc, 2, data.standard);

  // ==========================================
  // PÁGINA 3: PLANILLA DE DESPIECE DE ACERO (BBS) Y FIRMAS
  // ==========================================
  doc.addPage();
  addHeader(doc, data.projectName, 'PLANILLA TÉCNICA DE DESPIECE (BBS)');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);

  if (data.material === 'concrete' && data.schedule && data.schedule.length > 0) {
    doc.text('5. PLANILLA DE DESPIECE DE ACERO Y CÓMPUTO MÉTRICO (BAR BENDING SCHEDULE - BBS)', margin, 26);

    const bbsRows = data.schedule.map((item) => {
      let formaCroquis = 'Barra Recta';
      if (item.shapeType === 'straight_hook') formaCroquis = 'Gancho 90° (L con pata)';
      if (item.shapeType === 'closed_stirrup_135') formaCroquis = 'Cerco cerrado 135°';
      if (item.shapeType === 'cross_tie') formaCroquis = 'Traba 135°/90°';

      return [
        item.mark,
        item.description,
        formaCroquis,
        `Ø${item.diameter}`,
        `${item.count}`,
        item.lengthM.toFixed(2),
        item.totalLengthM.toFixed(2),
        item.unitWeightKgM.toFixed(3),
        item.totalWeightKg.toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: 30,
      margin: { left: margin, right: margin },
      head: [
        [
          'Marca',
          'Descripción del Elemento',
          'Croquis / Forma',
          'Ø (mm)',
          'Cant.',
          'Long. (m)',
          'Total (m)',
          'kg/m',
          'Peso (kg)',
        ],
      ],
      body: bbsRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 38 },
        3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 16, halign: 'right' },
        7: { cellWidth: 14, halign: 'right' },
        8: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      },
    });

    const summaryY = (doc as any).lastAutoTable.finalY + 6;

    // Resumen de cubicación y cuantía
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, summaryY, contentWidth, 22, 2, 2, 'FD');

    const totalWeight = data.totalSteelWeightKg || data.schedule.reduce((acc, s) => acc + s.totalWeightKg, 0);
    const volume = data.concreteVolumeM3 || 0;
    const ratio = volume > 0 ? totalWeight / volume : 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('RESUMEN DE MATERIALES Y RENDIMIENTOS:', margin + 4, summaryY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Peso Total de Acero Corrugado: ${totalWeight.toFixed(2)} kg`, margin + 4, summaryY + 12);
    doc.text(`• Volumen Geométrico de Hormigón: ${volume.toFixed(3)} m³`, margin + 4, summaryY + 17);
    doc.text(`• Cuantía Volumétrica de Acero: ${ratio.toFixed(1)} kg/m³ de hormigón`, margin + 95, summaryY + 12);
    doc.text(`• Acabado y Plegado: Según ACI 318-19 §25 / NC 450 con ganchos sísmicos a 135°`, margin + 95, summaryY + 17);

    nextY = summaryY + 28;
  } else if (data.material === 'steel') {
    doc.text('5. ESPECIFICACIONES TÉCNICAS DEL PERFIL Y CONEXIONES (ACERO ESTRUCTURAL)', margin, 26);
    const sp = data.steelProfile;
    const sc = data.steelConnection;

    const steelSpecs = [
      ['Designación del Perfil', sp?.designation || 'W-Shape'],
      ['Peralte total (d)', `${sp?.d || 0} mm`],
      ['Ancho del ala (b)', `${sp?.b || 0} mm`],
      ['Espesor del alma (tw)', `${sp?.tw || 0} mm`],
      ['Espesor del ala (tf)', `${sp?.tf || 0} mm`],
      ['Área de la sección (A)', `${sp?.A || 0} cm²`],
      ['Inercia fuerte / débil (Ix / Iy)', `${sp?.Ix || 0} cm⁴ / ${sp?.Iy || 0} cm⁴`],
      ['Placa base recomendada', `${sc?.basePlateWidth || 350} x ${sc?.basePlateLength || 350} x ${sc?.basePlateThickness || 20} mm`],
      ['Pernos de anclaje', `${sc?.boltCount || 4}x Ø${sc?.boltDiameter || 20} mm (${sc?.boltGrade || 'A325'})`],
      ['Soldadura de pie', `Filete continuo garganta te = ${sc?.weldThroat?.toFixed(1) || 5} mm`],
    ];

    autoTable(doc, {
      startY: 30,
      margin: { left: margin, right: margin },
      head: [['Parámetro Técnico', 'Valor']],
      body: steelSpecs,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.text('5. ESPECIFICACIONES TÉCNICAS DE MADERA ESTRUCTURAL', margin, 26);
    const wp = data.woodProps;
    const woodSpecs = [
      ['Especie / Grupo de Madera', wp?.species || 'Pino Estructural'],
      ['Escuadría Transversal (b x h)', `${data.woodB || 200} x ${data.woodH || 200} mm`],
      ['Resistencia Compresión Paralela (fc0)', `${wp?.fc0 || 14} MPa`],
      ['Resistencia Tracción Paralela (ft0)', `${wp?.ft0 || 9} MPa`],
      ['Módulo de Elasticidad (E005)', `${wp?.E005 || 8000} MPa`],
      ['Factor de Modificación kmod', `${wp?.kmod || 0.8}`],
    ];

    autoTable(doc, {
      startY: 30,
      margin: { left: margin, right: margin },
      head: [['Propiedad Mecánica', 'Valor']],
      body: woodSpecs,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Cuadro de Certificación y Firmas de Ingeniería
  if (nextY > 215) {
    addFooter(doc, 3, data.standard);
    doc.addPage();
    addHeader(doc, data.projectName, 'CONFORMIDAD Y FIRMAS');
    nextY = 26;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, nextY, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DECLARACIÓN DE CONFORMIDAD Y RESPONSABILIDAD PROFESIONAL:', margin + 4, nextY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const legalText = `El suscrito profesional certifica que los cálculos presentados en esta memoria han sido elaborados siguiendo las prescripciones vigentes de la norma ${standardTitle}. Los resultados reflejan el comportamiento del elemento bajo las cargas de servicio y combinaciones últimas declaradas por el proyectista.`;
  doc.text(doc.splitTextToSize(legalText, contentWidth - 8), margin + 4, nextY + 12);

  // Líneas de firma
  const signY = nextY + 30;
  doc.setDrawColor(100, 116, 139);
  doc.line(margin + 20, signY, margin + 75, signY);
  doc.line(margin + 105, signY, margin + 160, signY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  const engName = data.projectMetadata?.engineerName || data.engineerName || 'Ing. Proyectista Estructural';
  const license = data.projectMetadata?.professionalLicense
    ? `Matrícula/Reg: ${data.projectMetadata.professionalLicense}`
    : 'Ingeniero Estructural Responsable';
  const company = data.projectMetadata?.companyName || 'Consultoría e Ingeniería Estructural';

  doc.text(engName, margin + 47.5, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(license, margin + 47.5, signY + 8, { align: 'center' });
  doc.text(company, margin + 47.5, signY + 11.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Revisión y Aprobación Técnica', margin + 132.5, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Conforme a ${data.standard}`, margin + 132.5, signY + 8, { align: 'center' });
  doc.text(data.projectMetadata?.projectName || data.projectName || 'Proyecto Estructural', margin + 132.5, signY + 11.5, { align: 'center' });

  addFooter(doc, 3, data.standard);

  // Guardar y descargar archivo PDF
  const cleanName = (data.projectName || 'Proyecto').replace(/[^a-zA-Z0-9_\-]/g, '_');
  doc.save(`Memoria_Calculo_ColumMaster_${cleanName}.pdf`);
}

/**
 * Cabecera uniforme para páginas interiores
 */
function addHeader(doc: jsPDF, projectName: string, sectionTitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 16, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COLUMMASTER PRO — MEMORIA TÉCNICA DE CÁLCULO', margin, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`${projectName} | ${sectionTitle}`, pageWidth - margin, 10, { align: 'right' });
}

/**
 * Pie de página reglamentario con numeración
 */
function addFooter(doc: jsPDF, pageNum: number, standard: DesignStandard) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`ColumMaster Pro v2.5 — Conforme a ${standard} | Documento Oficial de Cálculo`, margin, pageHeight - 7);
  doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
}
