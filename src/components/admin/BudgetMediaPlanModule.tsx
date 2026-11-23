import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Layers,
  MapPin,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  BudgetCatalogItem,
  BudgetItemCategory,
  BudgetLineItem,
  BudgetStatus,
  CimbajuCity,
  MediaPlanBudget,
  OutdoorPoint,
} from '../../types/fortmidia';
import { downloadBudgetMediaPlanPdf } from '../../utils/pdfGenerator';
import { FortMidiaLogo, OFFICIAL_FORTMIDIA_LOGO_URL } from '../FortMidiaLogo';

type ModuleView = 'list' | 'builder' | 'document';

const BUDGET_STATUSES: BudgetStatus[] = [
  'Rascunho',
  'Enviado ao Cliente',
  'Aprovado',
  'Recusado',
];

const BUDGET_CATEGORIES: BudgetItemCategory[] = [
  'Redes Sociais & Story',
  'Podcast & Estúdio',
  'Mídia Exterior (Outdoors 9x3m)',
  'Portal & Impressos',
  'FortTech & Soluções IA',
  'Eventos & Outros',
];

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
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

function calcBudgetTotals(
  items: BudgetLineItem[],
  discountPercent: number,
  discountType: 'percent' | 'fixed' = 'percent',
  discountValue = 0,
  agencyFeePercent = 0
) {
  const gross = items.reduce((sum, it) => sum + it.quantity * it.unitValue, 0);
  const feeRate = Math.max(0, agencyFeePercent || 0);
  const feeAmount = (gross * feeRate) / 100;
  const grossWithFee = gross + feeAmount;
  const discountAmount =
    discountType === 'fixed'
      ? Math.min(grossWithFee, Math.max(0, discountValue || 0))
      : (grossWithFee * Math.min(100, Math.max(0, discountPercent || 0))) / 100;
  const net = Math.max(0, grossWithFee - discountAmount);
  return { gross, feeAmount, grossWithFee, discountAmount, net };
}

function getBudgetTotals(b: MediaPlanBudget) {
  return calcBudgetTotals(
    b.items,
    b.discountPercent,
    b.discountType ?? 'percent',
    b.discountValue ?? 0,
    b.agencyFeePercent ?? 0
  );
}

export const BudgetMediaPlanModule: React.FC = () => {
  const {
    mediaBudgets,
    budgetCatalog,
    outdoorPoints,
    siteSettings,
    addMediaBudget,
    updateMediaBudget,
    updateMediaBudgetStatus,
    deleteMediaBudget,
    convertBudgetToErp,
  } = useFortMidia();

  const [view, setView] = useState<ModuleView>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | BudgetStatus>('Todos');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(
    mediaBudgets[0]?.id ?? null
  );
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [erpNotice, setErpNotice] = useState<string | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  // Builder state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [city, setCity] = useState<CimbajuCity>('Regional CIMBAJU');
  const [validUntil, setValidUntil] = useState('2026-12-15');
  const [campaignStartDate, setCampaignStartDate] = useState('2026-12-01');
  const [campaignEndDate, setCampaignEndDate] = useState('2027-01-31');
  const [paymentTerms, setPaymentTerms] = useState(
    '50% na aprovação do Plano de Mídia + 50% em 30 dias via PIX ou Boleto Corporativo.'
  );
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountInput, setDiscountInput] = useState('0');
  const [agencyFeePercent, setAgencyFeePercent] = useState('0');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [notes, setNotes] = useState(
    'Artes, roteiros e materiais em alta resolução devem ser enviados com até 5 dias úteis antes da data de início. Inclui relatório fotográfico e checking de veiculação.'
  );
  const [accountManager, setAccountManager] = useState('Emerson Carneiro');
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus>('Enviado ao Cliente');
  const [items, setItems] = useState<BudgetLineItem[]>([]);
  const [formError, setFormError] = useState('');

  // KPI metrics
  const totalBudgets = mediaBudgets.length;
  const approvedValue = mediaBudgets
    .filter((b) => b.status === 'Aprovado')
    .reduce((sum, b) => sum + getBudgetTotals(b).net, 0);
  const activeProposalsValue = mediaBudgets
    .filter((b) => b.status === 'Enviado ao Cliente' || b.status === 'Rascunho')
    .reduce((sum, b) => sum + getBudgetTotals(b).net, 0);
  const totalContractedChannels = mediaBudgets.reduce((sum, b) => sum + b.items.length, 0);

  const filteredBudgets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mediaBudgets.filter((b) => {
      const mStatus = statusFilter === 'Todos' || b.status === statusFilter;
      const mQuery =
        !q ||
        b.code.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q);
      return mStatus && mQuery;
    });
  }, [mediaBudgets, search, statusFilter]);

  const activeDocumentBudget =
    mediaBudgets.find((b) => b.id === selectedBudgetId) ?? mediaBudgets[0] ?? null;

  const startNewBuilder = () => {
    const nextNum = 105 + mediaBudgets.length;
    setEditingId(null);
    setCode(`ORC-2026-0${nextNum}`);
    setTitle('Plano de Mídia Integrado 360°');
    setClientName('');
    setClientDocument('');
    setClientContact('');
    setCity('Regional CIMBAJU');
    setValidUntil('2026-12-15');
    setCampaignStartDate('2026-12-01');
    setCampaignEndDate('2026-12-31');
    setPaymentTerms(
      '50% na assinatura do Pedido de Inserção + 50% em 30 dias via PIX ou Boleto Corporativo.'
    );
    setDiscountType('percent');
    setDiscountInput('0');
    setAgencyFeePercent('0');
    setInstallmentsCount('1');
    setNotes(
      'Artes finais e materiais devem ser enviados até 5 dias úteis antes do início de cada veiculação. Inclui checking fotográfico e acompanhamento comercial.'
    );
    setAccountManager('Emerson Carneiro');
    setBudgetStatus('Enviado ao Cliente');
    setItems([]);
    setFormError('');
    setView('builder');
  };

  const openEditBuilder = (b: MediaPlanBudget) => {
    setEditingId(b.id);
    setCode(b.code);
    setTitle(b.title);
    setClientName(b.clientName);
    setClientDocument(b.clientDocument);
    setClientContact(b.clientContact);
    setCity(b.city);
    setValidUntil(b.validUntil);
    setCampaignStartDate(b.campaignStartDate);
    setCampaignEndDate(b.campaignEndDate);
    setPaymentTerms(b.paymentTerms);
    const dType = b.discountType ?? 'percent';
    setDiscountType(dType);
    setDiscountInput(String(dType === 'fixed' ? (b.discountValue ?? 0) : b.discountPercent));
    setAgencyFeePercent(String(b.agencyFeePercent ?? 0));
    setInstallmentsCount(String(b.installmentsCount ?? 1));
    setNotes(b.notes);
    setAccountManager(b.accountManager);
    setBudgetStatus(b.status);
    setItems(b.items.map((it) => ({ ...it })));
    setFormError('');
    setView('builder');
  };

  const handleDuplicateBudget = (b: MediaPlanBudget) => {
    const nextNum = 105 + mediaBudgets.length;
    const duplicated = addMediaBudget({
      ...b,
      code: `ORC-2026-0${nextNum}`,
      title: `${b.title} (Cópia)`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      status: 'Rascunho',
      convertedToErpAt: undefined,
      items: b.items.map((it, idx) => ({ ...it, id: `bli-${Date.now()}-${idx}` })),
    });
    setSelectedBudgetId(duplicated.id);
    openEditBuilder(duplicated);
  };

  const handleAddCatalogProduct = (catalogItem: BudgetCatalogItem) => {
    const days = calcDaysBetween(campaignStartDate, campaignEndDate);
    const newItem: BudgetLineItem = {
      id: `bli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productName: catalogItem.productName,
      category: catalogItem.category,
      description: catalogItem.defaultDescription,
      quantity: 1,
      unitLabel: catalogItem.defaultUnitLabel,
      unitValue: catalogItem.defaultUnitValue,
      startDate: campaignStartDate,
      endDate: campaignEndDate,
      periodLabel: catalogItem.defaultPeriodLabel || `${days} dias`,
    };
    setItems((prev) => [...prev, newItem]);
    setFormError('');
  };

  const handleAddOutdoorPoint = (point: OutdoorPoint) => {
    const days = calcDaysBetween(campaignStartDate, campaignEndDate);
    const newItem: BudgetLineItem = {
      id: `bli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productName: `Outdoor ${point.code} (${point.dimensions}) — ${point.city}`,
      category: 'Mídia Exterior (Outdoors 9x3m)',
      description: `${point.title} · Endereço: ${point.address} · ${point.lighting}`,
      quantity: 1,
      unitLabel: 'face / bimestre',
      unitValue: point.bimonthlyPrice,
      startDate: campaignStartDate,
      endDate: campaignEndDate,
      periodLabel: `${days} dias (Ciclo OOH)`,
    };
    setItems((prev) => [...prev, newItem]);
    setFormError('');
  };

  const handleAddCustomProduct = () => {
    const days = calcDaysBetween(campaignStartDate, campaignEndDate);
    const newItem: BudgetLineItem = {
      id: `bli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productName: 'Serviço / Produto Personalizado',
      category: 'Eventos & Outros',
      description: 'Descreva o entregável, formato e local de veiculação contratado.',
      quantity: 1,
      unitLabel: 'unidade',
      unitValue: 1000,
      startDate: campaignStartDate,
      endDate: campaignEndDate,
      periodLabel: `${days} dias`,
    };
    setItems((prev) => [...prev, newItem]);
    setFormError('');
  };

  const updateLineItem = (id: string, patch: Partial<BudgetLineItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const merged = { ...it, ...patch };
        if (patch.startDate !== undefined || patch.endDate !== undefined) {
          const days = calcDaysBetween(merged.startDate, merged.endDate);
          merged.periodLabel = `${days} ${days === 1 ? 'dia' : 'dias'}`;
        }
        return merged;
      })
    );
  };

  const removeLineItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSaveAndGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !title.trim()) {
      setFormError('Informe o nome do cliente/empresa e o título do Plano de Mídia.');
      return;
    }
    if (items.length === 0) {
      setFormError('Selecione pelo menos um produto contratado no plano de mídia.');
      return;
    }

    const numericDiscount = Math.max(0, Number(discountInput) || 0);
    const payload: Omit<MediaPlanBudget, 'id'> = {
      code: code.trim() || `ORC-2026-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      clientName: clientName.trim(),
      clientDocument: clientDocument.trim(),
      clientContact: clientContact.trim() || 'Contato comercial não informado',
      city,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      validUntil,
      campaignStartDate,
      campaignEndDate,
      paymentTerms: paymentTerms.trim(),
      discountType,
      discountPercent: discountType === 'percent' ? Math.min(100, numericDiscount) : 0,
      discountValue: discountType === 'fixed' ? numericDiscount : 0,
      agencyFeePercent: Math.max(0, Number(agencyFeePercent) || 0),
      installmentsCount: Math.max(1, Math.min(12, Number(installmentsCount) || 1)),
      notes: notes.trim(),
      accountManager: accountManager.trim() || 'Emerson Carneiro',
      status: budgetStatus,
      items,
    };

    if (editingId) {
      updateMediaBudget(editingId, payload);
      setSelectedBudgetId(editingId);
    } else {
      const created = addMediaBudget(payload);
      setSelectedBudgetId(created.id);
    }
    setFormError('');
    setView('document');
  };

  const handleLaunchBudgetToErp = (budgetId: string) => {
    const res = convertBudgetToErp(budgetId);
    setErpNotice(
      `Orçamento aprovado e integrado: ${res.campaignsCreated} campanha(s) em Publicidade e ${res.entriesCreated} parcela(s) no Financeiro.`
    );
    window.setTimeout(() => setErpNotice(null), 5000);
  };

  const numericDiscount = Math.max(0, Number(discountInput) || 0);
  const builderTotals = calcBudgetTotals(
    items,
    discountType === 'percent' ? numericDiscount : 0,
    discountType,
    discountType === 'fixed' ? numericDiscount : 0,
    Number(agencyFeePercent) || 0
  );

  // Build plain-text share message for WhatsApp / Copy / Web Share API
  const buildShareText = (budget: MediaPlanBudget) => {
    const totals = getBudgetTotals(budget);
    const parcels = Math.max(1, budget.installmentsCount ?? 1);
    const lines = [
      `*ORÇAMENTO & PLANO DE MÍDIA — GRUPO FORTMÍDIA*`,
      `Código: ${budget.code} | Emissão: ${budget.createdAt}`,
      `Cliente: ${budget.clientName}`,
      `Plano: ${budget.title}`,
      `Abrangência: ${budget.city}`,
      `Período Global: ${formatDateBR(budget.campaignStartDate)} até ${formatDateBR(budget.campaignEndDate)}`,
      `Validade da Proposta: ${formatDateBR(budget.validUntil)}`,
      ``,
      `*ITENS & DATAS DE VEICULAÇÃO:*`,
      ...budget.items.map(
        (it, i) =>
          `${i + 1}. ${it.productName} (${it.quantity}x ${it.unitLabel}) — ${formatDateBR(it.startDate)} a ${formatDateBR(it.endDate)} (${it.periodLabel}) = ${formatBRL(it.quantity * it.unitValue)}`
      ),
      ``,
      `Subtotal: ${formatBRL(totals.gross)}`,
      ...(totals.feeAmount > 0
        ? [`Taxa/Comissão (${budget.agencyFeePercent}%): +${formatBRL(totals.feeAmount)}`]
        : []),
      ...(totals.discountAmount > 0
        ? [`Desconto aplicado: -${formatBRL(totals.discountAmount)}`]
        : []),
      `*INVESTIMENTO TOTAL: ${formatBRL(totals.net)}*${parcels > 1 ? ` (${parcels}x de ${formatBRL(totals.net / parcels)})` : ''}`,
      `Condições: ${budget.paymentTerms}`,
      ``,
      `Atendimento Comercial: ${budget.accountManager} · ${siteSettings.contactEmail}`,
      `Portal: ${siteSettings.siteDomain} | ${siteSettings.newsPortalUrl}`,
    ];
    return lines.join('\n');
  };

  const handleCopySummary = async (budget: MediaPlanBudget) => {
    const text = buildShareText(budget);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2600);
    } catch {
      setCopiedFeedback(false);
    }
  };

  const handleNativeShare = async (budget: MediaPlanBudget) => {
    const text = buildShareText(budget);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${budget.code} · ${budget.title}`,
          text,
        });
        return;
      } catch {
        // User cancelled or share unsupported in iframe -> fallback to clipboard
      }
    }
    await handleCopySummary(budget);
  };

  const handleDownloadPdf = async (budget: MediaPlanBudget) => {
    setPdfBusyId(budget.id);
    try {
      await downloadBudgetMediaPlanPdf(budget, siteSettings);
    } finally {
      setPdfBusyId(null);
    }
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const handleDownloadHtmlDocument = (budget: MediaPlanBudget) => {
    const totals = getBudgetTotals(budget);
    const logoPath = siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL;
    const resolvedLogo = logoPath.startsWith('data:') || logoPath.startsWith('http')
      ? logoPath
      : `${window.location.origin}${logoPath}`;

    const rowsHtml = budget.items
      .map(
        (it, idx) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;font-size:12px;">${idx + 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;font-size:12px;">
          <strong>${it.productName}</strong><br/>
          <span style="color:#52525b;font-size:11px;">${it.description}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;font-size:11px;white-space:nowrap;">
          ${formatDateBR(it.startDate)} a ${formatDateBR(it.endDate)}<br/>
          <span style="color:#71717a;">${it.periodLabel}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;font-size:12px;text-align:center;">${it.quantity} ${it.unitLabel}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;font-size:12px;text-align:right;">${formatBRL(it.unitValue)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;font-size:12px;text-align:right;font-weight:700;">${formatBRL(it.quantity * it.unitValue)}</td>
      </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${budget.code} — ${budget.clientName} | Grupo FortMídia</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #18181b; margin: 32px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #FF6600; padding-bottom: 16px; margin-bottom: 24px; }
  .brand-wrap { display: flex; align-items: center; gap: 14px; }
  .brand-logo { width: 52px; height: 52px; object-fit: contain; background: #0a0a0a; border-radius: 6px; padding: 4px; }
  .brand { font-size: 22px; font-weight: 800; }
  .brand span { color: #FF6600; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #18181b; color: #fff; text-align: left; padding: 10px 8px; font-size: 11px; text-transform: uppercase; }
  .summary { margin-top: 24px; background: #fafafa; border: 1px solid #e4e4e7; padding: 16px; border-radius: 6px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand-wrap">
      <img class="brand-logo" src="${resolvedLogo}" alt="${siteSettings.brandName} ${siteSettings.brandHighlight}" />
      <div>
        <div class="brand">${siteSettings.brandName} <span>${siteSettings.brandHighlight}</span></div>
        <div style="font-size:12px;color:#52525b;">Holding de Mídia, Jornalismo & Agência 360° · Região do CIMBAJU</div>
        <div style="font-size:11px;color:#71717a;">${siteSettings.siteDomain} · jornalfortnews.com.br · ${siteSettings.contactEmail}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:14px;font-weight:700;">ORÇAMENTO & PLANO DE MÍDIA</div>
      <div style="font-size:13px;font-family:monospace;">${budget.code}</div>
      <div style="font-size:11px;color:#52525b;">Emissão: ${budget.createdAt} · Validade: ${formatDateBR(budget.validUntil)}</div>
    </div>
  </div>
  <div style="margin-bottom:20px;font-size:13px;">
    <strong>Anunciante:</strong> ${budget.clientName} ${budget.clientDocument ? `(${budget.clientDocument})` : ''}<br/>
    <strong>Plano:</strong> ${budget.title}<br/>
    <strong>Contato:</strong> ${budget.clientContact} · <strong>Abrangência:</strong> ${budget.city}<br/>
    <strong>Vigência Global:</strong> ${formatDateBR(budget.campaignStartDate)} até ${formatDateBR(budget.campaignEndDate)}
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Produto / Entregáveis</th><th>Prazos & Datas</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Unitário</th><th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="summary">
    <div><strong>Subtotal Bruto:</strong> ${formatBRL(totals.gross)}</div>
    ${budget.discountPercent > 0 ? `<div><strong>Desconto (${budget.discountPercent}%):</strong> -${formatBRL(totals.discountAmount)}</div>` : ''}
    <div style="font-size:18px;margin-top:8px;color:#FF6600;"><strong>Total Líquido: ${formatBRL(totals.net)}</strong></div>
    <div style="margin-top:8px;font-size:12px;"><strong>Condições de Pagamento:</strong> ${budget.paymentTerms}</div>
    <div style="margin-top:6px;font-size:12px;"><strong>Observações:</strong> ${budget.notes}</div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `${budget.code}_${budget.clientName.replace(/\s+/g, '_')}.html`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ==================== VIEW 3: DOCUMENTO TIMBRADO / PDF ==================== */
  if (view === 'document' && activeDocumentBudget) {
    const b = activeDocumentBudget;
    const totals = getBudgetTotals(b);
    const parcels = Math.max(1, b.installmentsCount ?? 1);
    const globalDays = calcDaysBetween(b.campaignStartDate, b.campaignEndDate);
    const sortedSchedule = [...b.items].sort((x, y) => x.startDate.localeCompare(y.startDate));
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(buildShareText(b))}`;

    // Calculate relative span percentages for the visual media schedule bar
    const globalStartMs = new Date(`${b.campaignStartDate}T00:00:00`).getTime();
    const globalEndMs = new Date(`${b.campaignEndDate}T00:00:00`).getTime();
    const globalSpanMs = Math.max(86400000, globalEndMs - globalStartMs + 86400000);

    return (
      <div className="space-y-6">
        {erpNotice && (
          <div className="no-print rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
            {erpNotice}
          </div>
        )}

        {/* Toolbar (Oculta na impressão / PDF) */}
        <div className="no-print flex flex-col gap-4 rounded-xl border border-white/10 bg-[#121215] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Voltar aos Orçamentos
            </button>
            <button
              type="button"
              onClick={() => openEditBuilder(b)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Editar Valores & Prazos
            </button>
            <button
              type="button"
              onClick={() => handleLaunchBudgetToErp(b.id)}
              disabled={Boolean(b.convertedToErpAt)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                b.convertedToErpAt
                  ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 cursor-default'
                  : 'border border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25'
              }`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {b.convertedToErpAt
                ? `Lançado no ERP (${b.convertedToErpAt})`
                : 'Aprovar & Lançar no ERP'}
            </button>
            <select
              value={b.status}
              onChange={(e) => updateMediaBudgetStatus(b.id, e.target.value as BudgetStatus)}
              aria-label="Alterar status do orçamento"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-white focus:border-[#FF6600] focus:outline-none"
            >
              {BUDGET_STATUSES.map((st) => (
                <option key={st} value={st}>
                  Status: {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-[#062010] hover:opacity-95 whitespace-nowrap"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Compartilhar WhatsApp
            </a>
            <button
              type="button"
              onClick={() => handleNativeShare(b)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
            >
              {copiedFeedback ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copiedFeedback ? 'Resumo Copiado!' : 'Compartilhar / Copiar'}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadHtmlDocument(b)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              .HTML
            </button>
            <button
              type="button"
              onClick={handlePrintSheet}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPdf(b)}
              disabled={pdfBusyId === b.id}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {pdfBusyId === b.id ? 'Gerando PDF...' : 'Gerar PDF'}
            </button>
          </div>
        </div>

        {/* Papel Timbrado A4 Executivo */}
        <article
          id="printable-budget-sheet"
          className="mx-auto max-w-[920px] rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl overflow-hidden"
        >
          {/* Faixa Superior Institucional Laranja + Dourado */}
          <div className="h-2 w-full bg-gradient-to-r from-[#FF6600] via-[#FF6600] to-[#D4AF37]" />

          <div className="p-6 sm:p-10 space-y-8">
            {/* Cabeçalho Timbrado Oficial */}
            <header className="flex flex-col gap-6 border-b-2 border-zinc-900/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <FortMidiaLogo
                  src={siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
                  alt={`${siteSettings.brandName} ${siteSettings.brandHighlight}`}
                  className="h-12 sm:h-14"
                  onLightSurface
                />
                <div>
                  <div className="font-display text-2xl font-bold tracking-tight text-zinc-950">
                    {siteSettings.brandName}{' '}
                    <span className="text-[#FF6600]">{siteSettings.brandHighlight}</span>
                  </div>
                  <div className="text-xs font-medium text-zinc-600">
                    Holding de Mídia, Jornalismo Multiplataforma & Agência 360°
                  </div>
                  <div className="mt-1.5 text-[11px] text-zinc-500">
                    <span>{siteSettings.siteDomain}</span>
                    <span className="mx-1.5">·</span>
                    <span>jornalfortnews.com.br</span>
                    <span className="mx-1.5">·</span>
                    <span>{siteSettings.contactEmail}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    Governança Executiva: {siteSettings.governanceNames}
                  </div>
                </div>
              </div>

              <div className="sm:text-right shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="text-[11px] font-semibold tracking-wide text-[#FF6600]">
                  ORÇAMENTO & PLANO DE MÍDIA
                </div>
                <div className="mt-0.5 font-mono text-lg font-bold text-zinc-950 tabular-nums">
                  {b.code}
                </div>
                <div className="mt-1 text-[11px] text-zinc-600 tabular-nums">
                  Emissão: {b.createdAt} · Validade: {formatDateBR(b.validUntil)}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-zinc-700">
                  Situação: {b.status}
                </div>
              </div>
            </header>

            {/* Identificação do Anunciante & Escopo da Campanha */}
            <section className="print-avoid-break grid gap-6 rounded-lg border border-zinc-200 bg-zinc-50/70 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-500">
                  DADOS DO ANUNCIANTE / CLIENTE
                </div>
                <div className="font-display text-base font-bold text-zinc-950">
                  {b.clientName}
                </div>
                {b.clientDocument && (
                  <div className="text-xs text-zinc-600 font-mono tabular-nums">
                    CNPJ / CPF: {b.clientDocument}
                  </div>
                )}
                <div className="text-xs text-zinc-600">Contato: {b.clientContact}</div>
                <div className="text-xs text-zinc-600">Praça / Abrangência: {b.city}</div>
              </div>

              <div className="space-y-1.5 sm:border-l sm:border-zinc-200 sm:pl-6">
                <div className="text-[11px] font-semibold text-zinc-500">
                  ESCOPO & VIGÊNCIA DO PLANO DE MÍDIA
                </div>
                <div className="font-display text-base font-bold text-zinc-950">{b.title}</div>
                <div className="text-xs text-zinc-700 tabular-nums">
                  Período Global: <strong>{formatDateBR(b.campaignStartDate)}</strong> até{' '}
                  <strong>{formatDateBR(b.campaignEndDate)}</strong> ({globalDays} dias)
                </div>
                <div className="text-xs text-zinc-600">
                  Atendimento Responsável: {b.accountManager}
                </div>
                <div className="text-xs text-zinc-600 tabular-nums">
                  Canais Contratados: {b.items.length} frente(s) de mídia
                </div>
              </div>
            </section>

            {/* Quadro 01: Orçamento Detalhado */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <h2 className="font-display text-sm font-bold text-zinc-950">
                  01. Discriminação Orçamentária de Produtos & Serviços
                </h2>
                <span className="text-xs text-zinc-500">Valores expressos em Reais (BRL)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 bg-zinc-900 text-white text-[11px] font-semibold">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Produto / Canal & Entregáveis</th>
                      <th className="py-2.5 px-3">Prazo & Datas</th>
                      <th className="py-2.5 px-3 text-center">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Valor Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs">
                    {b.items.map((it, idx) => (
                      <tr key={it.id} className="print-avoid-break">
                        <td className="py-3 px-3 font-mono text-zinc-500 tabular-nums align-top">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-zinc-950">{it.productName}</div>
                          <div className="text-[11px] text-[#FF6600] font-medium">
                            {it.category}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                            {it.description}
                          </p>
                        </td>
                        <td className="py-3 px-3 align-top whitespace-nowrap tabular-nums">
                          <div className="font-medium text-zinc-900">
                            {formatDateBR(it.startDate)} → {formatDateBR(it.endDate)}
                          </div>
                          <div className="text-[11px] text-zinc-500">{it.periodLabel}</div>
                        </td>
                        <td className="py-3 px-3 align-top text-center whitespace-nowrap tabular-nums text-zinc-800">
                          {it.quantity} {it.unitLabel}
                        </td>
                        <td className="py-3 px-3 align-top text-right whitespace-nowrap font-mono tabular-nums text-zinc-700">
                          {formatBRL(it.unitValue)}
                        </td>
                        <td className="py-3 px-3 align-top text-right whitespace-nowrap font-mono font-bold tabular-nums text-zinc-950">
                          {formatBRL(it.quantity * it.unitValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Quadro 02: Cronograma Visual do Plano de Mídia */}
            <section className="print-avoid-break space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <h2 className="font-display text-sm font-bold text-zinc-950">
                  02. Cronograma de Veiculação & Linha do Tempo do Plano de Mídia
                </h2>
                <span className="text-xs text-zinc-500 tabular-nums">
                  Janela: {formatDateBR(b.campaignStartDate)} a {formatDateBR(b.campaignEndDate)}
                </span>
              </div>

              <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
                {sortedSchedule.map((it) => {
                  const sMs = new Date(`${it.startDate}T00:00:00`).getTime();
                  const eMs = new Date(`${it.endDate}T00:00:00`).getTime();
                  const offsetPct = Math.max(
                    0,
                    Math.min(92, ((sMs - globalStartMs) / globalSpanMs) * 100)
                  );
                  const widthPct = Math.max(
                    8,
                    Math.min(100 - offsetPct, ((eMs - sMs + 86400000) / globalSpanMs) * 100)
                  );
                  const itemDays = calcDaysBetween(it.startDate, it.endDate);

                  return (
                    <div key={`sched-${it.id}`} className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-zinc-900">{it.productName}</span>
                        <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                          {formatDateBR(it.startDate)} até {formatDateBR(it.endDate)} · {itemDays}{' '}
                          {itemDays === 1 ? 'dia' : 'dias'} ({it.periodLabel})
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-zinc-100 overflow-hidden relative">
                        <div
                          className="absolute top-0 bottom-0 rounded-full bg-[#FF6600]"
                          style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quadro 03: Resumo Financeiro, Condições & Assinaturas */}
            <section className="print-avoid-break grid gap-6 sm:grid-cols-12">
              <div className="sm:col-span-7 space-y-4 rounded-lg border border-zinc-200 p-4 text-xs">
                <div>
                  <div className="font-semibold text-zinc-900">Condições de Pagamento</div>
                  <p className="mt-1 text-zinc-600 leading-relaxed">{b.paymentTerms}</p>
                </div>
                <div className="border-t border-zinc-200 pt-3">
                  <div className="font-semibold text-zinc-900">
                    Observações Técnicas, Materiais & Checking
                  </div>
                  <p className="mt-1 text-zinc-600 leading-relaxed">{b.notes}</p>
                </div>
              </div>

              <div className="sm:col-span-5 flex flex-col justify-between rounded-lg border border-zinc-900/15 bg-zinc-50 p-5">
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Subtotal Bruto dos Serviços</span>
                    <span className="font-mono tabular-nums">{formatBRL(totals.gross)}</span>
                  </div>
                  {totals.feeAmount > 0 && (
                    <div className="flex items-center justify-between text-zinc-700">
                      <span>Taxa / Comissão ({b.agencyFeePercent}%)</span>
                      <span className="font-mono tabular-nums">
                        + {formatBRL(totals.feeAmount)}
                      </span>
                    </div>
                  )}
                  {totals.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>
                        Bonificação / Desconto{' '}
                        {b.discountType === 'fixed' ? '(Valor Fixo)' : `(${b.discountPercent}%)`}
                      </span>
                      <span className="font-mono tabular-nums">
                        - {formatBRL(totals.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-zinc-300 pt-3 flex items-baseline justify-between">
                    <span className="font-display text-sm font-bold text-zinc-950">
                      Investimento Total
                    </span>
                    <span className="font-mono text-2xl font-bold text-[#FF6600] tabular-nums">
                      {formatBRL(totals.net)}
                    </span>
                  </div>
                  {parcels > 1 && (
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-700">
                      <span>Parcelamento Previsto</span>
                      <span className="font-mono tabular-nums">
                        {parcels}x de {formatBRL(totals.net / parcels)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-zinc-200 pt-3 text-[11px] text-zinc-500">
                  Proposta válida até <strong>{formatDateBR(b.validUntil)}</strong>. Valores
                  sujeitos à disponibilidade de agenda e pontos OOH no ato do aceite.
                </div>
              </div>
            </section>

            {/* Bloco de Assinaturas & Rodapé Timbrado */}
            <footer className="print-avoid-break pt-6 space-y-6">
              <div className="grid gap-8 sm:grid-cols-2 pt-4">
                <div className="border-t border-zinc-400 pt-2 text-center">
                  <div className="text-xs font-semibold text-zinc-900">{b.accountManager}</div>
                  <div className="text-[11px] text-zinc-500">
                    Diretoria Comercial · {siteSettings.brandName} {siteSettings.brandHighlight}
                  </div>
                </div>
                <div className="border-t border-zinc-400 pt-2 text-center">
                  <div className="text-xs font-semibold text-zinc-900">{b.clientName}</div>
                  <div className="text-[11px] text-zinc-500">
                    De acordo / Aprovação do Anunciante · Data: ___/___/2026
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-4 flex flex-col gap-1 text-center text-[10px] text-zinc-500 sm:flex-row sm:justify-between sm:text-left">
                <span>
                  {siteSettings.brandName} {siteSettings.brandHighlight} · Informação que conecta
                  você.
                </span>
                <span>
                  CIMBAJU & Grande SP · {siteSettings.siteDomain} · {siteSettings.contactEmail}
                </span>
              </div>
            </footer>
          </div>
        </article>
      </div>
    );
  }

  /* ==================== VIEW 2: CONSTRUTOR DE ORÇAMENTO & PLANO DE MÍDIA ==================== */
  if (view === 'builder') {
    return (
      <form onSubmit={handleSaveAndGenerate} className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setView('list')}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Voltar à lista de orçamentos
            </button>
            <h1 className="font-display text-2xl font-bold text-white">
              {editingId
                ? `Editar Orçamento · ${code}`
                : 'Novo Orçamento & Plano de Mídia'}
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Selecione os produtos contratados, defina valores unitários, prazos e datas para gerar a proposta timbrada.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Salvar & Gerar Documento Timbrado
          </button>
        </div>

        {formError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {formError}
          </div>
        )}

        {/* Bloco 1: Dados do Cliente & Prazos Globais */}
        <section className="rounded-xl border border-white/10 bg-[#121215] p-6 space-y-5">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-display text-sm font-semibold text-white">
              01. Identificação do Cliente, Prazo Global & Abrangência
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Código da Proposta</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">
                Título do Plano de Mídia *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Campanha Institucional 360° — Verão CIMBAJU"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Cliente / Razão Social *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex.: Rede Supermercados Cantareira"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">CNPJ ou CPF (opcional)</label>
              <input
                type="text"
                value={clientDocument}
                onChange={(e) => setClientDocument(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Contato & Responsável do Cliente
              </label>
              <input
                type="text"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="Nome · WhatsApp · E-mail"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-5">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Praça / Território</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as CimbajuCity)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {NEWS_TERRITORIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Início da Campanha</label>
              <input
                type="date"
                value={campaignStartDate}
                onChange={(e) => setCampaignStartDate(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Término da Campanha</label>
              <input
                type="date"
                value={campaignEndDate}
                onChange={(e) => setCampaignEndDate(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Validade do Orçamento</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Executivo de Contas</label>
              <input
                type="text"
                value={accountManager}
                onChange={(e) => setAccountManager(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </section>

        {/* Bloco 2: Seletor de Produtos Contratados */}
        <section className="rounded-xl border border-white/10 bg-[#121215] p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-white">
                02. Selecionar Produtos Contratados para o Plano de Mídia
              </h2>
              <p className="text-xs text-zinc-400">
                Clique nos produtos abaixo para adicioná-los ao plano e personalize valores e prazos em seguida.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCustomProduct}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/20 cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Item Personalizado
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {budgetCatalog.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleAddCatalogProduct(cat)}
                className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0A0A0A] p-4 text-left transition-colors hover:border-[#FF6600]/60 hover:bg-white/[0.03] cursor-pointer"
              >
                <div>
                  <div className="text-[11px] font-medium text-[#D4AF37]">{cat.category}</div>
                  <div className="mt-1 font-display text-sm font-semibold text-white">
                    {cat.productName}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
                    {cat.defaultDescription}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                  <span className="font-mono font-semibold text-[#FF6600] tabular-nums">
                    {formatBRL(cat.defaultUnitValue)} / {cat.defaultUnitLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300">
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Incluir
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Seletor Direto de Pontos de Outdoor do Estoque */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                <span>Incluir Ponto Específico de Outdoor (Endereços & Disponibilidade)</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                {outdoorPoints.filter((o) => o.availability === 'Disponível').length} disponível(is)
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {outdoorPoints.map((out) => (
                <button
                  key={out.id}
                  type="button"
                  onClick={() => handleAddOutdoorPoint(out)}
                  className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#0A0A0A] p-3 text-left transition-colors hover:border-[#FF6600]/60 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono font-bold text-[#D4AF37]">
                      {out.code} · {out.dimensions}
                    </span>
                    <span
                      className={`font-medium ${
                        out.availability === 'Disponível'
                          ? 'text-emerald-400'
                          : out.availability === 'Reservado'
                            ? 'text-amber-300'
                            : 'text-zinc-400'
                      }`}
                    >
                      {out.availability}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white truncate">
                    {out.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400 truncate">
                    {out.address} ({out.city})
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-[#FF6600] tabular-nums">
                      {formatBRL(out.bimonthlyPrice)}
                    </span>
                    <span className="text-zinc-300">+ Incluir ponto</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Bloco 3: Itens Selecionados com Valores & Prazos Editáveis */}
        <section className="rounded-xl border border-white/10 bg-[#121215] p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-sm font-semibold text-white">
              03. Valores, Quantidades & Prazos por Produto ({items.length})
            </h2>
            <span className="font-mono text-sm font-bold text-[#FF6600] tabular-nums">
              Total Líquido: {formatBRL(builderTotals.net)}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-[#0A0A0A] p-8 text-center">
              <Layers className="mx-auto h-6 w-6 text-zinc-500" aria-hidden="true" />
              <div className="mt-2 text-sm font-medium text-white">
                Nenhum produto selecionado ainda
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Clique nos cartões do catálogo acima (ex.: Gestão de Redes, Horas de Podcast, Story, Outdoor, Revista A4) para montar o plano.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const itemSubtotal = item.quantity * item.unitValue;
                const itemDays = calcDaysBetween(item.startDate, item.endDate);

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 space-y-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-mono text-xs font-bold text-[#FF6600] tabular-nums">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) =>
                            updateLineItem(item.id, { productName: e.target.value })
                          }
                          aria-label="Nome do produto contratado"
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-1.5 text-sm font-semibold text-white focus:border-[#FF6600] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <select
                          value={item.category}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              category: e.target.value as BudgetItemCategory,
                            })
                          }
                          className="rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-zinc-300"
                        >
                          {BUDGET_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>

                        <span className="font-mono text-sm font-bold text-white tabular-nums">
                          {formatBRL(itemSubtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          aria-label="Remover item do orçamento"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Especificação & Entregáveis do Item
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, { description: e.target.value })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#121215] px-3 py-2 text-xs text-zinc-200"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-7">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Quantidade</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 font-mono text-xs text-white tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Unidade</label>
                        <input
                          type="text"
                          value={item.unitLabel}
                          onChange={(e) =>
                            updateLineItem(item.id, { unitLabel: e.target.value })
                          }
                          placeholder="mês, horas, face..."
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#FF6600] font-medium mb-1">
                          Valor Unitário (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitValue}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              unitValue: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full rounded-lg border border-[#FF6600]/40 bg-[#121215] px-3 py-2 font-mono text-xs font-semibold text-white tabular-nums focus:border-[#FF6600] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#D4AF37] font-medium mb-1">
                          Valor Total Item (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={Math.round(itemSubtotal * 100) / 100}
                          onChange={(e) => {
                            const newTotal = Math.max(0, Number(e.target.value) || 0);
                            const qty = Math.max(1, item.quantity);
                            updateLineItem(item.id, {
                              unitValue: Math.round((newTotal / qty) * 100) / 100,
                            });
                          }}
                          className="w-full rounded-lg border border-[#D4AF37]/40 bg-[#121215] px-3 py-2 font-mono text-xs font-semibold text-white tabular-nums focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Data Início
                        </label>
                        <input
                          type="date"
                          value={item.startDate}
                          onChange={(e) =>
                            updateLineItem(item.id, { startDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Data Término
                        </label>
                        <input
                          type="date"
                          value={item.endDate}
                          onChange={(e) =>
                            updateLineItem(item.id, { endDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Prazo ({itemDays}d)
                        </label>
                        <input
                          type="text"
                          value={item.periodLabel}
                          onChange={(e) =>
                            updateLineItem(item.id, { periodLabel: e.target.value })
                          }
                          placeholder="Ex.: 30 dias / Bimestral"
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bloco 4: Condições Comerciais & Fechamento */}
        <section className="rounded-xl border border-white/10 bg-[#121215] p-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-sm font-semibold text-white border-b border-white/10 pb-2">
              04. Personalização de Valores, Parcelamento & Observações
            </h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tipo Desconto</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                >
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {discountType === 'fixed' ? 'Desconto (R$)' : 'Desconto (%)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Taxa / Imposto (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={agencyFeePercent}
                  onChange={(e) => setAgencyFeePercent(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Parcelas (ERP)</label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x {n === 1 ? '(À vista)' : 'mensais'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Condições de Pagamento</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Status Inicial</label>
                <select
                  value={budgetStatus}
                  onChange={(e) => setBudgetStatus(e.target.value as BudgetStatus)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                >
                  {BUDGET_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Observações, Prazos de Arte & Checking
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/10 bg-[#0A0A0A] p-5">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#D4AF37]">
                Resumo Financeiro do Orçamento
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Subtotal Bruto ({items.length} itens)</span>
                <span className="font-mono tabular-nums text-white">
                  {formatBRL(builderTotals.gross)}
                </span>
              </div>
              {builderTotals.feeAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Taxa / Imposto ({Number(agencyFeePercent) || 0}%)</span>
                  <span className="font-mono tabular-nums text-zinc-200">
                    + {formatBRL(builderTotals.feeAmount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Desconto Aplicado{' '}
                  {discountType === 'fixed' ? '(R$ Fixo)' : `(${Number(discountInput) || 0}%)`}
                </span>
                <span className="font-mono tabular-nums text-emerald-400">
                  - {formatBRL(builderTotals.discountAmount)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-white">Total Líquido</span>
                <span className="font-mono text-2xl font-bold text-[#FF6600] tabular-nums">
                  {formatBRL(builderTotals.net)}
                </span>
              </div>
              {(Number(installmentsCount) || 1) > 1 && (
                <div className="text-right font-mono text-xs text-zinc-400 tabular-nums">
                  {installmentsCount}x de{' '}
                  {formatBRL(builderTotals.net / Math.max(1, Number(installmentsCount) || 1))}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF6600] px-4 py-3 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Salvar & Abrir Proposta Timbrada / PDF
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </section>
      </form>
    );
  }

  /* ==================== VIEW 1: LISTA DE ORÇAMENTOS & PLANOS DE MÍDIA ==================== */
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Orçamentos & Planos de Mídia
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Monte propostas comerciais personalizadas com produtos, valores, prazos detalhados e gere documento timbrado pronto para impressão, PDF ou WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewBuilder}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo Orçamento & Plano de Mídia
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="text-xs text-zinc-400">Orçamentos Emitidos</div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {totalBudgets}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Propostas registradas</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="text-xs text-zinc-400">Em Negociação / Abertos</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#FF6600] tabular-nums">
            {formatBRL(activeProposalsValue)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Rascunhos e enviados</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="text-xs text-zinc-400">Planos Aprovados</div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {formatBRL(approvedValue)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Prontos para veiculação</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="text-xs text-zinc-400">Frentes de Mídia Planejadas</div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#D4AF37] tabular-nums">
            {totalContractedChannels}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Redes, Podcast, OOH & Portal</div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cliente, plano ou cidade..."
            className="w-full rounded-lg border border-white/15 bg-[#121215] pl-9 pr-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['Todos', ...BUDGET_STATUSES] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-[#FF6600] text-white'
                  : 'border border-white/10 bg-[#121215] text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Budgets Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#121215]">
        {filteredBudgets.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="mx-auto h-7 w-7 text-zinc-500" aria-hidden="true" />
            <div className="mt-2 text-sm font-semibold text-white">
              Nenhum orçamento encontrado
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Crie um novo Plano de Mídia selecionando os produtos, prazos e valores desejados.
            </p>
            <button
              type="button"
              onClick={startNewBuilder}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Criar Primeiro Orçamento
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-medium text-zinc-400">
                <th className="py-3.5 px-4">Código & Emissão</th>
                <th className="py-3.5 px-4">Anunciante & Plano de Mídia</th>
                <th className="py-3.5 px-4">Vigência & Canais</th>
                <th className="py-3.5 px-4 text-right">Investimento</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs">
              {filteredBudgets.map((b) => {
                const totals = getBudgetTotals(b);
                return (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 whitespace-nowrap align-top">
                      <div className="font-mono font-semibold text-white tabular-nums">
                        {b.code}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
                        Emissão: {b.createdAt}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-semibold text-white">{b.clientName}</div>
                      <div className="mt-0.5 text-zinc-300">{b.title}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        {b.city} · Executivo: {b.accountManager}
                        {b.convertedToErpAt && (
                          <span className="ml-2 text-emerald-400">· Integrado ERP</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap align-top tabular-nums">
                      <div className="text-zinc-200">
                        {formatDateBR(b.campaignStartDate)} → {formatDateBR(b.campaignEndDate)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {b.items.length} produto(s) · Válido até {formatDateBR(b.validUntil)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                      <div className="font-mono font-bold text-[#FF6600] tabular-nums">
                        {formatBRL(totals.net)}
                      </div>
                      {totals.discountAmount > 0 && (
                        <div className="text-[11px] text-emerald-400 tabular-nums">
                          Desc. -{formatBRL(totals.discountAmount)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <select
                        value={b.status}
                        onChange={(e) =>
                          updateMediaBudgetStatus(b.id, e.target.value as BudgetStatus)
                        }
                        aria-label={`Status de ${b.code}`}
                        className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white"
                      >
                        {BUDGET_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                      <div className="inline-flex items-center gap-1.5">
                        {!b.convertedToErpAt && (
                          <button
                            type="button"
                            onClick={() => handleLaunchBudgetToErp(b.id)}
                            title="Aprovar e lançar automaticamente em Publicidade + Financeiro"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Lançar ERP
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(b)}
                          disabled={pdfBusyId === b.id}
                          title="Gerar e baixar PDF timbrado"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FF6600] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#FF5500] cursor-pointer disabled:opacity-60"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          {pdfBusyId === b.id ? 'Gerando...' : 'Gerar PDF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBudgetId(b.id);
                            setView('document');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FF6600]/15 border border-[#FF6600]/40 px-2.5 py-1.5 text-[11px] font-semibold text-[#FF6600] hover:bg-[#FF6600]/25 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Visualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditBuilder(b)}
                          title="Editar orçamento"
                          aria-label="Editar orçamento"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateBudget(b)}
                          title="Duplicar orçamento"
                          aria-label="Duplicar orçamento"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMediaBudget(b.id)}
                          title="Excluir orçamento"
                          aria-label="Excluir orçamento"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
