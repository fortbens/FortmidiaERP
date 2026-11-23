import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AdvertisingCampaign,
  BudgetCatalogItem,
  MediaPlanBudget,
  OfficialLetterDocument,
  OutdoorPoint,
  SiteSettings,
} from '../types/fortmidia';

import {
  OFFICIAL_FORTMIDIA_LOGO_URL,
  OFFICIAL_FORTNEWS_LOGO_URL,
  isOfficialFortMidiaLogo,
  isOfficialFortNewsLogo,
} from '../components/FortMidiaLogo';

const OFFICIAL_CONTACT_EMAIL = 'comercial@fortmidia.com.br';

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate || '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function calcDaysBetween(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

async function loadCleanLogoDataUrl(
  src: string
): Promise<{ dataUrl: string; aspect: number } | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 2500);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const w = img.naturalWidth || 240;
        const h = img.naturalHeight || 120;
        const canvas = document.createElement('canvas');

        // Trim transparent/white whitespace tightly for the official 2000x2000 FortMídia logo
        if (isOfficialFortMidiaLogo(src) && w >= 1000 && Math.abs(w - h) < 10) {
          const sx = Math.round(w * 0.05);
          const sy = Math.round(h * 0.28);
          const sw = Math.round(w * 0.9);
          const sh = Math.round(h * 0.52);
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, sw, sh);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          resolve({ dataUrl: canvas.toDataURL('image/png'), aspect: sw / Math.max(1, sh) });
          return;
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        // Keep clean transparent/white background (never black!)
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), aspect: w / Math.max(1, h) });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = (hex || '#fa6607').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [250, 102, 7];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function resolveOfficialLetterLogoUrl(letter: OfficialLetterDocument): string {
  const isFortNewsLetter =
    letter.type === 'convite_podcast' ||
    isOfficialFortNewsLogo(letter.headerLogoUrl) ||
    /fortnews/i.test(letter.headerLogoUrl || '');
  return isFortNewsLetter ? OFFICIAL_FORTNEWS_LOGO_URL : OFFICIAL_FORTMIDIA_LOGO_URL;
}

async function drawLetterhead(
  doc: jsPDF,
  siteSettings: SiteSettings,
  docLabel: string,
  docCode: string,
  subMeta: string,
  brand: 'fortmidia' | 'fortnews' = 'fortmidia'
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();

  // Top official orange #fa6607 & gold corporate bar
  doc.setFillColor(250, 102, 7);
  doc.rect(0, 0, pageW * 0.72, 3.5, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(pageW * 0.72, 0, pageW * 0.28, 3.5, 'F');

  const logoSrc =
    brand === 'fortnews' ? OFFICIAL_FORTNEWS_LOGO_URL : OFFICIAL_FORTMIDIA_LOGO_URL;
  const logoInfo = await loadCleanLogoDataUrl(logoSrc);

  let textStartX = 14;
  if (logoInfo) {
    try {
      const targetH = brand === 'fortnews' ? 14.5 : 16.5;
      const targetW = Math.min(42, Math.max(24, targetH * logoInfo.aspect));
      const logoY = 10 + (17 - targetH) / 2;
      doc.addImage(logoInfo.dataUrl, 'PNG', 14, logoY, targetW, targetH);
      textStartX = 14 + targetW + 4.5;
    } catch {
      textStartX = 14;
    }
  }

  // Brand title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(20, 20, 24);
  doc.text(
    brand === 'fortnews'
      ? 'Jornal FortNews'
      : `${siteSettings.brandName} ${siteSettings.brandHighlight}`,
    textStartX,
    15.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 100);
  doc.text(
    'Holding de Mídia, Jornalismo Multiplataforma & Agência 360°',
    textStartX,
    20.2
  );
  doc.text(
    `${siteSettings.siteDomain} · jornalfortnews.com.br · ${OFFICIAL_CONTACT_EMAIL}`,
    textStartX,
    24.5
  );

  // Right document info box
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(224, 224, 230);
  doc.roundedRect(pageW - 72, 10, 58, 17, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.3);
  doc.setTextColor(250, 102, 7);
  doc.text(docLabel, pageW - 17, 14.8, { align: 'right' });

  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 24);
  doc.text(docCode, pageW - 17, 20.2, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(95, 95, 105);
  doc.text(subMeta, pageW - 17, 24.5, { align: 'right' });

  // Divider line
  doc.setDrawColor(225, 225, 230);
  doc.line(14, 30, pageW - 14, 30);

  return 35;
}

function drawFooter(doc: jsPDF, siteSettings: SiteSettings) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(230, 230, 235);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 130);
    doc.text(
      `${siteSettings.brandName} ${siteSettings.brandHighlight} · Governança: ${siteSettings.governanceNames} · ${siteSettings.siteDomain} · ${OFFICIAL_CONTACT_EMAIL}`,
      14,
      pageH - 9
    );
    doc.text(`Página ${i} de ${pageCount}`, pageW - 14, pageH - 9, { align: 'right' });
  }
}

export async function downloadBudgetMediaPlanPdf(
  budget: MediaPlanBudget,
  siteSettings: SiteSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  let y = await drawLetterhead(
    doc,
    siteSettings,
    'ORÇAMENTO & PLANO DE MÍDIA',
    budget.code,
    `Emissão: ${budget.createdAt} · Validade: ${formatDateBR(budget.validUntil)}`
  );

  // Client & Campaign Info Box
  doc.setFillColor(249, 249, 251);
  doc.setDrawColor(226, 226, 232);
  doc.roundedRect(14, y, pageW - 28, 28, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 120);
  doc.text('ANUNCIANTE / CLIENTE', 18, y + 5.5);
  doc.text('ESCOPO & VIGÊNCIA DO PLANO', pageW / 2 + 4, y + 5.5);

  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text(budget.clientName.slice(0, 44), 18, y + 10.5);
  doc.text(budget.title.slice(0, 44), pageW / 2 + 4, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 75, 85);
  const docLine = budget.clientDocument ? `CNPJ/CPF: ${budget.clientDocument} · ` : '';
  doc.text(`${docLine}Praça: ${budget.city}`, 18, y + 15.5);
  doc.text(`Contato: ${budget.clientContact.slice(0, 46)}`, 18, y + 20.5);

  const totalDays = calcDaysBetween(budget.campaignStartDate, budget.campaignEndDate);
  doc.text(
    `Período: ${formatDateBR(budget.campaignStartDate)} até ${formatDateBR(budget.campaignEndDate)} (${totalDays} dias)`,
    pageW / 2 + 4,
    y + 15.5
  );
  doc.text(
    `Executivo: ${budget.accountManager} · Status: ${budget.status}`,
    pageW / 2 + 4,
    y + 20.5
  );

  y += 34;

  // Section 1: Itemized Budget Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text('01. Discriminação Orçamentária de Produtos & Serviços', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['#', 'Produto / Canal & Especificação', 'Datas & Prazo', 'Qtd', 'Unitário', 'Subtotal']],
    body: budget.items.map((it, idx) => [
      String(idx + 1).padStart(2, '0'),
      `${it.productName} (${it.category})\n${it.description}`,
      `${formatDateBR(it.startDate)} a ${formatDateBR(it.endDate)}\n${it.periodLabel}`,
      `${it.quantity} ${it.unitLabel}`,
      formatBRL(it.unitValue),
      formatBRL(it.quantity * it.unitValue),
    ]),
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.8, textColor: [39, 39, 42], cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 66 },
      2: { cellWidth: 36 },
      3: { cellWidth: 21, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
  });

  const lastTableY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y = lastTableY + 8;

  // Totals math
  const gross = budget.items.reduce((sum, it) => sum + it.quantity * it.unitValue, 0);
  const feeAmount = (gross * Math.max(0, budget.agencyFeePercent ?? 0)) / 100;
  const grossWithFee = gross + feeAmount;
  const discountAmount =
    budget.discountType === 'fixed'
      ? Math.min(grossWithFee, Math.max(0, budget.discountValue ?? 0))
      : (grossWithFee * Math.min(100, Math.max(0, budget.discountPercent || 0))) / 100;
  const net = Math.max(0, grossWithFee - discountAmount);
  const parcels = Math.max(1, budget.installmentsCount ?? 1);

  if (y > 225) {
    doc.addPage();
    y = 18;
  }

  // Section 2: Media Schedule Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text('02. Cronograma Detalhado do Plano de Mídia', 14, y);
  y += 3;

  const sortedSchedule = [...budget.items].sort((a, b) => a.startDate.localeCompare(b.startDate));
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Canal / Produto', 'Início', 'Término', 'Duração', 'Prazo Comercial']],
    body: sortedSchedule.map((it) => [
      it.productName,
      formatDateBR(it.startDate),
      formatDateBR(it.endDate),
      `${calcDaysBetween(it.startDate, it.endDate)} dia(s)`,
      it.periodLabel,
    ]),
    headStyles: { fillColor: [250, 102, 7], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.8, textColor: [39, 39, 42], cellPadding: 2.2 },
    alternateRowStyles: { fillColor: [255, 248, 243] },
  });

  const schedEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y = schedEndY + 8;

  if (y > 220) {
    doc.addPage();
    y = 18;
  }

  // Financial Summary & Terms
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(220, 220, 226);
  doc.roundedRect(14, y, pageW - 28, 38, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 24);
  doc.text('Condições de Pagamento & Observações:', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(80, 80, 90);
  const payLines = doc.splitTextToSize(budget.paymentTerms || 'Conforme negociação.', 96);
  doc.text(payLines, 18, y + 11);
  const noteLines = doc.splitTextToSize(budget.notes || '', 96);
  doc.text(noteLines.slice(0, 3), 18, y + 21);

  // Right Total Box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 90);
  doc.text(`Subtotal: ${formatBRL(gross)}`, pageW - 18, y + 8, { align: 'right' });
  if (feeAmount > 0) {
    doc.text(
      `Taxa/Comissão (${budget.agencyFeePercent}%): +${formatBRL(feeAmount)}`,
      pageW - 18,
      y + 13,
      { align: 'right' }
    );
  }
  if (discountAmount > 0) {
    doc.setTextColor(22, 163, 74);
    doc.text(`Desconto: -${formatBRL(discountAmount)}`, pageW - 18, y + 18, {
      align: 'right',
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(250, 102, 7);
  doc.text(`TOTAL: ${formatBRL(net)}`, pageW - 18, y + 27, { align: 'right' });

  if (parcels > 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 70);
    doc.text(
      `Parcelamento: ${parcels}x de ${formatBRL(net / parcels)}`,
      pageW - 18,
      y + 32.5,
      { align: 'right' }
    );
  }

  y += 50;
  if (y > 265) {
    doc.addPage();
    y = 30;
  }

  // Signature lines
  doc.setDrawColor(160, 160, 170);
  doc.line(20, y, 92, y);
  doc.line(pageW - 92, y, pageW - 20, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 35);
  doc.text(budget.accountManager, 56, y + 4.5, { align: 'center' });
  doc.text(budget.clientName.slice(0, 34), pageW - 56, y + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(110, 110, 120);
  doc.text(`Comercial · ${siteSettings.brandName} ${siteSettings.brandHighlight}`, 56, y + 8.5, {
    align: 'center',
  });
  doc.text('Aceite do Anunciante · Data: ___/___/2026', pageW - 56, y + 8.5, {
    align: 'center',
  });

  drawFooter(doc, siteSettings);
  const safeClient = budget.clientName.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 28);
  doc.save(`${budget.code}_${safeClient}.pdf`);
}

export async function downloadCheckingReportPdf(
  params: {
    campaign: AdvertisingCampaign;
    checkingDate: string;
    impressions: string;
    evidenceUrl: string;
    notes: string;
  },
  siteSettings: SiteSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const { campaign, checkingDate, impressions, evidenceUrl, notes } = params;

  let y = await drawLetterhead(
    doc,
    siteSettings,
    'RELATÓRIO DE CHECKING',
    formatDateBR(checkingDate),
    campaign.artworkStatus
  );

  doc.setFillColor(249, 249, 251);
  doc.setDrawColor(225, 225, 232);
  doc.roundedRect(14, y, pageW - 28, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 120);
  doc.text('ANUNCIANTE', 18, y + 6);
  doc.text('CAMPANHA & PERÍODO', pageW / 2 + 4, y + 6);

  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 24);
  doc.text(campaign.advertiser, 18, y + 12);
  doc.text(campaign.title.slice(0, 42), pageW / 2 + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(75, 75, 85);
  doc.text(`Praça: ${campaign.city}`, 18, y + 18);
  doc.text(`Executivo: ${campaign.accountManager}`, 18, y + 23.5);
  doc.text(`Formato: ${campaign.adType} (${campaign.status})`, pageW / 2 + 4, y + 18);
  doc.text(
    `Veiculação: ${formatDateBR(campaign.startDate)} até ${formatDateBR(campaign.endDate)}`,
    pageW / 2 + 4,
    y + 23.5
  );

  y += 38;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Item de Comprovação', 'Especificação Registrada']],
    body: [
      ['Ponto / Local de Exibição', campaign.placementSpec],
      ['Impacto / Alcance Estimado', impressions],
      ['Status do Material / Arte', campaign.artworkStatus],
      ['Link de Evidência / Clipping', evidenceUrl],
      ['Parecer Técnico FortMídia', notes],
    ],
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [39, 39, 42], cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
    },
  });

  drawFooter(doc, siteSettings);
  const safeAdv = campaign.advertiser.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 25);
  doc.save(`Checking_${safeAdv}_${checkingDate}.pdf`);
}

export async function downloadExecutiveDrePdf(
  params: {
    managerFilter: string;
    totalIncome: number;
    paidIncome: number;
    studioTotal: number;
    totalExpenses: number;
    netResult: number;
    mrrTotal: number;
    expenseByRole: { role: string; amount: number }[];
    campaigns: AdvertisingCampaign[];
  },
  siteSettings: SiteSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('pt-BR');

  let y = await drawLetterhead(
    doc,
    siteSettings,
    'RELATÓRIO EXECUTIVO DRE',
    today,
    `Executivo: ${params.managerFilter}`
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Indicador Consolidado da Agência', 'Valor (R$)']],
    body: [
      ['Receitas Lançadas + Estúdio Podcast', formatBRL(params.totalIncome + params.studioTotal)],
      ['Caixa Efetivamente Liquidado', formatBRL(params.paidIncome + params.studioTotal)],
      ['MRR Contratos Recorrentes Ativos', formatBRL(params.mrrTotal)],
      ['Despesas Totais (Fornecedores, Prestadores, Repasses)', formatBRL(params.totalExpenses)],
      ['Resultado Operacional Líquido Projetado', formatBRL(params.netResult)],
    ],
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.8 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Despesas por Natureza Operacional', 'Valor (R$)']],
    body: params.expenseByRole.map((e) => [e.role, formatBRL(e.amount)]),
    headStyles: { fillColor: [250, 102, 7], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 35;
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Anunciante', 'Tipo', 'Praça', 'Status', 'Valor (R$)']],
    body: params.campaigns.map((c) => [
      c.advertiser,
      c.adType,
      c.city,
      c.status,
      formatBRL(c.value),
    ]),
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.8, cellPadding: 2.2 },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
  });

  drawFooter(doc, siteSettings);
  doc.save(`FortMidia_Relatorio_Executivo_${today.replace(/\//g, '-')}.pdf`);
}

export async function downloadPriceTablePdf(
  catalog: BudgetCatalogItem[],
  siteSettings: SiteSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('pt-BR');

  const y = await drawLetterhead(
    doc,
    siteSettings,
    'TABELA OFICIAL DE PREÇOS',
    'MÍDIA KIT 2026',
    `Atualizada em ${today}`
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Produto / Serviço', 'Categoria', 'Prazo Padrão', 'Unidade', 'Valor Tabela']],
    body: catalog.map((it) => [
      `${it.productName}\n${it.defaultDescription}`,
      it.category,
      it.defaultPeriodLabel,
      it.defaultUnitLabel,
      formatBRL(it.defaultUnitValue),
    ]),
    headStyles: { fillColor: [250, 102, 7], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 7.8, textColor: [39, 39, 42], cellPadding: 2.6 },
    columnStyles: {
      0: { cellWidth: 74 },
      1: { cellWidth: 36 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
  });

  drawFooter(doc, siteSettings);
  doc.save('FortMidia_Tabela_Precos_Oficial.pdf');
}

export async function downloadOutdoorInventoryPdf(
  outdoors: OutdoorPoint[],
  siteSettings: SiteSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('pt-BR');

  const y = await drawLetterhead(
    doc,
    siteSettings,
    'MAPA DE OUTDOORS OOH',
    `${outdoors.length} PONTOS`,
    `Atualizado em ${today}`
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      [
        'Código',
        'Ponto & Endereço Completo',
        'Cidade',
        'Tamanho',
        'Iluminação',
        'Valor Ciclo',
        'Disponibilidade',
      ],
    ],
    body: outdoors.map((o) => [
      o.code,
      `${o.title}\n${o.address}`,
      o.city,
      o.dimensions,
      o.lighting,
      formatBRL(o.bimonthlyPrice),
      o.currentAdvertiser ? `${o.availability} (${o.currentAdvertiser})` : o.availability,
    ]),
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [39, 39, 42], cellPadding: 2.5 },
    columnStyles: {
      5: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
  });

  drawFooter(doc, siteSettings);
  doc.save('FortMidia_Mapa_Outdoors_OOH.pdf');
}

export async function downloadOfficialLetterPdf(
  letter: OfficialLetterDocument,
  siteSettings: SiteSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const [r, g, b] = hexToRgbTuple(letter.accentColor || '#fa6607');

  // Top accent corporate rule
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageW * 0.72, 3.2, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(pageW * 0.72, 0, pageW * 0.28, 3.2, 'F');

  const resolvedLogoUrl = resolveOfficialLetterLogoUrl(letter);
  const logoInfo = await loadCleanLogoDataUrl(resolvedLogoUrl);

  let y = 10.5;
  if (logoInfo) {
    try {
      const isFortNews = resolvedLogoUrl === OFFICIAL_FORTNEWS_LOGO_URL;
      const targetH = isFortNews ? 16 : 18.5;
      const targetW = Math.min(54, Math.max(26, targetH * logoInfo.aspect));
      doc.addImage(logoInfo.dataUrl, 'PNG', 16, y, targetW, targetH);
    } catch {
      // ignore image error
    }
  }

  // Right aligned doc reference & city/date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(r, g, b);
  const typeLabelMap: Record<OfficialLetterDocument['type'], string> = {
    convite_podcast: 'CARTA CONVITE OFICIAL · PODCAST',
    apresentacao_fortmidia: 'CARTA DE APRESENTAÇÃO INSTITUCIONAL',
    convite_patrocinio: 'CARTA CONVITE DE PATROCÍNIO',
    assessoria_mandato: 'PROPOSTA EXECUTIVA DE ASSESSORIA',
  };
  doc.text(typeLabelMap[letter.type], pageW - 16, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(65, 65, 75);
  doc.text(letter.dateCityLine, pageW - 16, 20.5, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 130);
  doc.text(`Protocolo: ${letter.code}`, pageW - 16, 25, { align: 'right' });

  // Clean hairline rule under letterhead
  y = 33;
  doc.setDrawColor(210, 210, 218);
  doc.line(16, y, pageW - 16, y);
  y += 8;

  // Recipient block
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(230, 230, 236);
  doc.roundedRect(16, y, pageW - 32, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 120);
  doc.text('A/C (DESTINATÁRIO):', 20, y + 6);
  doc.text('CARGO / FUNÇÃO:', pageW / 2 + 4, y + 6);

  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text((letter.recipientName || 'À Diretoria Executiva').slice(0, 42), 20, y + 11.2);
  doc.text((letter.recipientRole || 'Representante').slice(0, 38), pageW / 2 + 4, y + 11.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(70, 70, 80);
  doc.text(`Instituição / Empresa: ${(letter.recipientCompany || '—').slice(0, 40)}`, 20, y + 17.5);
  doc.text(`Contato: ${(letter.recipientContact || '—').slice(0, 40)}`, pageW / 2 + 4, y + 17.5);

  y += 31;

  // Subject REF
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(r, g, b);
  const subjectLines = doc.splitTextToSize(letter.subjectRef, pageW - 32);
  doc.text(subjectLines, 16, y);
  y += subjectLines.length * 5 + 4;

  // Podcast Session Schedule Box if convite_podcast
  if (letter.type === 'convite_podcast' && letter.podcastShowTitle) {
    doc.setFillColor(255, 248, 243);
    doc.setDrawColor(r, g, b);
    doc.roundedRect(16, y, pageW - 32, 19, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(r, g, b);
    doc.text(`PROGRAMA: ${letter.podcastShowTitle.toUpperCase()}`, 20, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 35, 42);
    doc.text(
      `Data Sugerida: ${letter.podcastEpisodeDate || 'A definir'}   ·   Horário: ${letter.podcastEpisodeTime || '16h00 às 20h00'}`,
      20,
      y + 11.2
    );
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 90);
    doc.text(
      `Local: ${letter.podcastStudioAddress || 'Estúdio Oficial Grupo FortNews · Franco da Rocha - SP'}`,
      20,
      y + 16
    );
    y += 25;
  }

  // Greeting
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 28);
  doc.text(letter.greeting || 'Prezado(a),', 16, y);
  y += 7;

  // Body paragraphs
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.8);
  doc.setTextColor(42, 42, 48);
  const paragraphs = (letter.bodyText || '').split(/\n\s*\n/).filter(Boolean);
  for (const para of paragraphs) {
    const lines = doc.splitTextToSize(para.trim(), pageW - 32);
    if (y + lines.length * 4.8 > pageH - 48) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, 16, y);
    y += lines.length * 4.7 + 4.5;
  }

  // Highlights bullets
  const validBullets = (letter.highlights || []).filter((h) => h.trim().length > 0);
  if (validBullets.length > 0) {
    if (y + validBullets.length * 6 + 14 > pageH - 42) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(225, 225, 232);
    const boxH = 10 + validBullets.length * 6.2;
    doc.roundedRect(16, y, pageW - 32, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(r, g, b);
    doc.text('DIFERENCIAIS & ENTREGAS OFICIAIS', 20, y + 6);

    let by = y + 11.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(35, 35, 42);
    for (const item of validBullets) {
      doc.setFillColor(r, g, b);
      doc.circle(21.5, by - 1.1, 0.9, 'F');
      const bulletLines = doc.splitTextToSize(item.trim(), pageW - 46);
      doc.text(bulletLines[0], 25, by);
      by += 6;
    }
    y += boxH + 7;
  }

  // Closing & Signature
  if (y > pageH - 52) {
    doc.addPage();
    y = 24;
  }
  if (letter.closingLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(42, 42, 48);
    const closingLines = doc.splitTextToSize(letter.closingLine, pageW - 32);
    doc.text(closingLines, 16, y);
    y += closingLines.length * 4.8 + 10;
  }

  doc.setDrawColor(160, 160, 170);
  doc.line(16, y + 6, 98, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text(letter.senderName || 'Emerson Carneiro dos Santos', 16, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(80, 80, 90);
  doc.text(
    letter.senderRole || 'Editor-Chefe & Diretor Executivo · Grupo FortMídia / FortNews',
    16,
    y + 16
  );
  doc.text(
    `${letter.senderPhone || '(11) 95779-2424'} · ${OFFICIAL_CONTACT_EMAIL}`,
    16,
    y + 20.5
  );

  // Corporate legal footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(230, 230, 235);
    doc.line(16, pageH - 14, pageW - 16, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(120, 120, 130);
    doc.text(
      `GRUPO FORT NEWS LTDA · CNPJ 66.550.817/0001-41 · ${siteSettings.siteDomain} · jornalfortnews.com.br`,
      16,
      pageH - 9
    );
    doc.text(`Página ${i} de ${pageCount}`, pageW - 16, pageH - 9, { align: 'right' });
  }

  const safeCode = letter.code.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`${safeCode}_${letter.type}.pdf`);
}

export async function downloadInstitutionalDossierPdf(
  siteSettings: SiteSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  let y = await drawLetterhead(
    doc,
    siteSettings,
    'APRESENTAÇÃO INSTITUCIONAL 360°',
    'FORTMÍDIA, FORTNEWS & FORTTECH',
    'CNPJ 66.550.817/0001-41 · CIMBAJU'
  );

  // Intro executive summary block
  doc.setFillColor(249, 249, 251);
  doc.setDrawColor(225, 225, 232);
  doc.roundedRect(14, y, pageW - 28, 35, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(250, 102, 7);
  doc.text('A MAIOR POTÊNCIA DE COMUNICAÇÃO E TECNOLOGIA DO CIMBAJU', 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(45, 45, 55);
  const introText = doc.splitTextToSize(
    'O Grupo FortMídia e o Grupo FortNews integram jornalismo digital 24/7, mídia exterior OOH (Outdoors 9x3m), estúdio próprio de Podcasts (16h–20h), divisão impressa (Revista A4 & Tabloide Quinzenal), Agência 360° e soluções FortTech com Inteligência Artificial (FortChat e ERP/CRM AcertGo).',
    pageW - 36
  );
  doc.text(introText, 18, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(24, 24, 28);
  doc.text(
    'Direção Executiva & Editorial: Emerson Carneiro dos Santos (Editor-Chefe & Diretor Executivo) · +22 anos · +R$ 2 Bi VGV',
    18,
    y + 30
  );
  y += 41;

  // Section 1: 6 Verticais
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text('01. Ecossistema de Verticais Estratégicas & Soluções FortTech', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Vertical / Canal', 'Alcance & Infraestrutura', 'Diferencial Competitivo']],
    body: [
      [
        'Portal Jornal FortNews & Fala Cidadão',
        'Jornalismo 24/7 em 5 cidades do CIMBAJU + SP/Brasil',
        'Apuração investigativa com Editor-Chefe Emerson Carneiro dos Santos e canal Fala Cidadão',
      ],
      [
        'Rede FortMídia OOH (Outdoors 9x3m)',
        '+420 mil impactos/dia nas 5 cidades do CIMBAJU',
        'Pontos Frontlight iluminados em rodovias e acessos centrais com mapa de disponibilidade ao vivo',
      ],
      [
        'Estúdio FortNews Podcast (16h–20h)',
        '7 programas semanais oficiais + locação R$ 300/h',
        'Captação multicâmera, cortes ágeis em Reels/Shorts e repasse transparente 50/50',
      ],
      [
        'Impresso & Eventos Proprietários',
        'Revista Mensal A4, Tabloide Quinzenal e Melhores do Ano',
        'Troféu corporativo, Trio Elétrico FortNews e Espaço Próprio de Eventos no CIMBAJU',
      ],
      [
        'FortTech · FortChat (Multiatendimento IA)',
        'WhatsApp, Instagram, Messenger e Web com IA 24/7',
        'Plataforma empresarial de multiatendimento com filas inteligentes, funil Kanban e agentes IA',
      ],
      [
        'FortTech · ERP/CRM AcertGo Imobiliárias',
        'ERP + CRM + Site Imobiliário Próprio + IA',
        'Alta performance para imobiliárias com qualificação automática de leads, site SEO e gestão de VGV',
      ],
    ],
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.6, textColor: [39, 39, 42], cellPadding: 2.3 },
    alternateRowStyles: { fillColor: [250, 250, 252] },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 50;
  y += 7;

  // Section 2: Regional CIMBAJU Coverage & Channels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text('02. Cobertura Regional & Estrutura de Canais CIMBAJU 2026', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Canal / Ativo de Mídia', 'Formato / Frequência', 'Alcance Estimado', 'Diferenciais de Entrega']],
    body: [
      ['Portal Jornal FortNews', 'Digital 24/7 + Selos', '185 mil leitores/mês', 'Publieditorial, Superbanner e integração Fala Cidadão'],
      ['Rede Outdoors CIMBAJU', 'Lona 9x3m / 10x4m', '420 mil impactos/dia', 'Iluminação Frontlight, instalação e checking fotográfico'],
      ['Estúdio FortNews Podcast', 'Grade 16h–20h (7 shows)', '310 mil views/mês', 'Transmissão multicâmera, QR Code ao vivo e cortes Reels'],
      ['Revista A4 & Tabloide', 'Mensal / Quinzenal', 'Distribuição dirigida', 'Acabamento couché em empresas, clínicas e gabinetes'],
    ],
    headStyles: { fillColor: [250, 102, 7], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.6, textColor: [39, 39, 42], cellPadding: 2.2 },
    alternateRowStyles: { fillColor: [255, 248, 243] },
  });

  doc.addPage();
  y = await drawLetterhead(
    doc,
    siteSettings,
    'PLANOS, FORTTECH & REGRAS',
    'MÍDIA KIT 2026',
    'Atendimento: (11) 95779-2424'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text('03. Planos Oficiais de Mídia & Produtos FortTech IA', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Plano / Solução', 'Investimento', 'Escopo Incluído', 'Periodicidade']],
    body: [
      ['Editorial & Revista A4', 'R$ 2.950', 'Matéria especial no Portal FortNews + Página dupla Revista A4', 'Edição mensal'],
      ['Cota Master Podcast', 'R$ 3.800', 'Vinheta, QR Code nos 7 programas (16h–20h) + 8 Reels/Shorts', 'Mensal (trimestral)'],
      ['Circuito Outdoor 9x3m', 'R$ 4.600', 'Veiculação contínua 9x3m + lona + instalação + checking', 'Bimestral (60 dias)'],
      ['Agência & Branding 360°', 'R$ 5.400', '12 vídeos verticais + tráfego pago por CEP + assessoria', 'Mensal recorrente'],
      ['FortTech · FortChat IA', 'R$ 497', 'Plataforma de multiatendimento empresarial (WhatsApp/IG/Web) com IA', 'Mensal (SaaS)'],
      ['FortTech · ERP/CRM AcertGo', 'R$ 790', 'ERP/CRM para imobiliárias de alta performance com site próprio e IA', 'Mensal (SaaS)'],
    ],
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.8, textColor: [39, 39, 42], cellPadding: 2.5 },
    columnStyles: { 1: { fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 252] },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 24);
  doc.text('04. Diretrizes de Governança Comercial & Locação de Estúdio', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Modalidade Operacional', 'Regra de Repasse / Tarifa', 'Benefícios & Escopo']],
    body: [
      [
        'Captação Própria (Apresentadores / Parceiros)',
        'Repasse 50% / 50%',
        'Apresentador ou parceiro capta o patrocinador usando estrutura, mídia e estúdio FortNews',
      ],
      [
        'Captação da Casa (Comercial FortMídia)',
        'Retenção 100% Matriz',
        'Contratos diretos da diretoria comercial aplicados nos pacotes de grade e combos OOH',
      ],
      [
        'Locação Avulsa de Estúdio Podcast',
        'R$ 300,00 / hora',
        'Locatário utiliza cenário, áudio e vídeo multicâmera e retém 100% de seus patrocinadores',
      ],
    ],
    headStyles: { fillColor: [250, 102, 7], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [39, 39, 42], cellPadding: 2.6 },
    columnStyles: { 1: { fontStyle: 'bold' } },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 10;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(220, 220, 226);
  doc.roundedRect(14, y, pageW - 28, 30, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 24);
  doc.text('Canais Oficiais de Atendimento & Redes Sociais', 18, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(65, 65, 75);
  doc.text('GRUPO FORT NEWS LTDA · CNPJ: 66.550.817/0001-41 · Franco da Rocha / SP', 18, y + 12.5);
  doc.text(
    `WhatsApp Executivo: (11) 95779-2424 · E-mail Oficial: ${OFFICIAL_CONTACT_EMAIL}`,
    18,
    y + 18
  );
  doc.text(
    'Instagram: @grupofortnews · Facebook: /portalfortnew · YouTube: @FortnewsPodcast',
    18,
    y + 23.5
  );

  drawFooter(doc, siteSettings);
  doc.save('Grupo_FortMidia_Apresentacao_Institucional_360.pdf');
}

