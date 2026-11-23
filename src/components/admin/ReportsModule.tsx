import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileBarChart,
  MessageCircle,
  Printer,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  downloadCheckingReportPdf,
  downloadExecutiveDrePdf,
} from '../../utils/pdfGenerator';
import { FortMidiaLogo, OFFICIAL_FORTMIDIA_LOGO_URL } from '../FortMidiaLogo';

type ReportSubTab = 'executivo' | 'checking';

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate || '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export const ReportsModule: React.FC = () => {
  const {
    financialEntries,
    contracts,
    advertisingCampaigns,
    studioBookings,
    mediaBudgets,
    pautas,
    siteSettings,
  } = useFortMidia();

  const [subTab, setSubTab] = useState<ReportSubTab>('executivo');
  const [managerFilter, setManagerFilter] = useState('Todos');
  const [pdfBusy, setPdfBusy] = useState<'dre' | 'checking' | null>(null);

  // Checking Report State
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    advertisingCampaigns[0]?.id ?? ''
  );
  const [checkingImpressions, setCheckingImpressions] = useState(
    '85.000+ impressões estimadas na região do CIMBAJU'
  );
  const [checkingEvidenceUrl, setCheckingEvidenceUrl] = useState(
    'https://jornalfortnews.com.br/checking-fotografico'
  );
  const [checkingNotes, setCheckingNotes] = useState(
    'Veiculação conferida pela equipe técnica do Grupo FortMídia. Materiais aplicados dentro do padrão visual contratado, sem avarias ou interrupções no período.'
  );
  const [checkingDate, setCheckingDate] = useState('2026-11-17');

  const selectedCampaign =
    advertisingCampaigns.find((c) => c.id === selectedCampaignId) ??
    advertisingCampaigns[0] ??
    null;

  // Filtered advertising & budgets by account manager
  const filteredAds = useMemo(
    () =>
      advertisingCampaigns.filter(
        (c) => managerFilter === 'Todos' || c.accountManager === managerFilter
      ),
    [advertisingCampaigns, managerFilter]
  );

  const filteredBudgets = useMemo(
    () =>
      mediaBudgets.filter(
        (b) => managerFilter === 'Todos' || b.accountManager === managerFilter
      ),
    [mediaBudgets, managerFilter]
  );

  // Consolidated DRE numbers
  const totalIncome = financialEntries
    .filter((f) => f.type === 'Receita')
    .reduce((s, f) => s + f.amount, 0);
  const paidIncome = financialEntries
    .filter((f) => f.type === 'Receita' && f.status === 'Pago')
    .reduce((s, f) => s + f.amount, 0);
  const totalExpenses = financialEntries
    .filter((f) => f.type === 'Despesa')
    .reduce((s, f) => s + f.amount, 0);
  const studioTotal = studioBookings
    .filter((b) => b.bookingType === 'Locação Avulsa')
    .reduce((s, b) => s + b.durationHours * b.hourlyRate, 0);
  const mrrTotal = contracts
    .filter((c) => c.status !== 'Encerrado')
    .reduce((s, c) => s + c.monthlyValue, 0);
  const netResult = totalIncome + studioTotal - totalExpenses;

  const expenseByRole = [
    'Fornecedor',
    'Prestador de Serviço',
    'Apresentador / Repasse 50/50',
    'Estrutura & Operação',
  ].map((role) => ({
    role,
    amount: financialEntries
      .filter((f) => f.type === 'Despesa' && f.counterpartyRole === role)
      .reduce((s, f) => s + f.amount, 0),
  }));

  const adVolumeTotal = filteredAds.reduce((s, c) => s + c.value, 0);
  const approvedBudgetsCount = filteredBudgets.filter((b) => b.status === 'Aprovado').length;

  const handleExportExecutiveCsv = () => {
    const rows = [
      ['Indicador / Conta', 'Categoria', 'Valor_BRL'],
      ['Receitas Lançadas (Anunciantes)', 'Financeiro', totalIncome.toFixed(2)],
      ['Receitas Liquidadas (Caixa)', 'Financeiro', paidIncome.toFixed(2)],
      ['Receita Locação Estúdio Podcast', 'Estúdio', studioTotal.toFixed(2)],
      ['MRR Contratos Recorrentes', 'Comercial', mrrTotal.toFixed(2)],
      ['Despesas Totais (Fornecedores/Prestadores/Repasses)', 'Financeiro', totalExpenses.toFixed(2)],
      ['Resultado Operacional Projetado', 'DRE', netResult.toFixed(2)],
      ...expenseByRole.map((e) => [`Despesa: ${e.role}`, 'Centro de Custo', e.amount.toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'fortmidia_relatorio_executivo.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExecutivePdf = async () => {
    setPdfBusy('dre');
    try {
      await downloadExecutiveDrePdf(
        {
          managerFilter,
          totalIncome,
          paidIncome,
          studioTotal,
          totalExpenses,
          netResult,
          mrrTotal,
          expenseByRole,
          campaigns: filteredAds,
        },
        siteSettings
      );
    } finally {
      setPdfBusy(null);
    }
  };

  const handleDownloadCheckingPdf = async () => {
    if (!selectedCampaign) return;
    setPdfBusy('checking');
    try {
      await downloadCheckingReportPdf(
        {
          campaign: selectedCampaign,
          checkingDate,
          impressions: checkingImpressions,
          evidenceUrl: checkingEvidenceUrl,
          notes: checkingNotes,
        },
        siteSettings
      );
    } finally {
      setPdfBusy(null);
    }
  };

  const checkingWhatsappHref = selectedCampaign
    ? `https://wa.me/?text=${encodeURIComponent(
        [
          `*RELATÓRIO DE CHECKING & VEICULAÇÃO — GRUPO FORTMÍDIA*`,
          `Anunciante: ${selectedCampaign.advertiser}`,
          `Campanha: ${selectedCampaign.title} (${selectedCampaign.adType})`,
          `Ponto / Especificação: ${selectedCampaign.placementSpec}`,
          `Praça: ${selectedCampaign.city}`,
          `Período: ${formatDateBR(selectedCampaign.startDate)} até ${formatDateBR(selectedCampaign.endDate)}`,
          `Alcance / Entregas: ${checkingImpressions}`,
          `Comprovação: ${checkingEvidenceUrl}`,
          `Parecer Técnico: ${checkingNotes}`,
          ``,
          `Atendimento: ${selectedCampaign.accountManager} · ${siteSettings.contactEmail}`,
        ].join('\n')
      )}`
    : '#';

  return (
    <div className="space-y-8">
      {/* Header + Sub-tabs (hidden on print) */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Relatórios Gerenciais & Checking
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Fechamento financeiro consolidado por canal/executivo e emissão de Relatório Timbrado de Checking para anunciantes.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#121215] p-1">
          <button
            type="button"
            onClick={() => setSubTab('executivo')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              subTab === 'executivo'
                ? 'bg-[#FF6600] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Relatório Executivo (DRE)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('checking')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              subTab === 'checking'
                ? 'bg-[#FF6600] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Checking do Anunciante (PDF)
          </button>
        </div>
      </div>

      {/* ==================== SUB-TAB 1: RELATÓRIO EXECUTIVO ==================== */}
      {subTab === 'executivo' && (
        <div className="space-y-6">
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-[#121215] p-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-400">Filtrar Executivo:</label>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
              >
                <option value="Todos">Todos (Governança Completa)</option>
                <option value="Emerson Carneiro">Emerson Carneiro</option>
                <option value="Diretoria Comercial">Diretoria Comercial</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportExecutiveCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Exportar DRE (.CSV)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleDownloadExecutivePdf}
                disabled={pdfBusy === 'dre'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {pdfBusy === 'dre' ? 'Gerando PDF...' : 'Gerar PDF (DRE)'}
              </button>
            </div>
          </div>

          <div
            id="printable-checking-sheet"
            className="space-y-6 rounded-xl border border-white/10 bg-[#121215] p-6"
          >
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-[#FF6600]" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-white">
                  Fechamento Consolidado — {siteSettings.brandName} {siteSettings.brandHighlight}
                </h2>
              </div>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                Visão: {managerFilter} · {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            {/* KPIs DRE */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4">
                <div className="text-[11px] text-zinc-400">Receitas + Estúdio</div>
                <div className="mt-1 font-mono text-xl font-bold text-emerald-400 tabular-nums">
                  {formatBRL(totalIncome + studioTotal)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">
                  Caixa liquidado: {formatBRL(paidIncome + studioTotal)}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4">
                <div className="text-[11px] text-zinc-400">Despesas & Repasses 50/50</div>
                <div className="mt-1 font-mono text-xl font-bold text-red-400 tabular-nums">
                  {formatBRL(totalExpenses)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">Fornecedores e prestadores</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4">
                <div className="text-[11px] text-zinc-400">Resultado Líquido Projetado</div>
                <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                  {formatBRL(netResult)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">
                  MRR Recorrente: {formatBRL(mrrTotal)}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4">
                <div className="text-[11px] text-zinc-400">Publicidade & Redação</div>
                <div className="mt-1 font-mono text-xl font-bold text-[#FF6600] tabular-nums">
                  {formatBRL(adVolumeTotal)}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">
                  {approvedBudgetsCount} orçamentos aprovados · {pautas.length} pautas
                </div>
              </div>
            </div>

            {/* Breakdown de Custos vs Campanhas por Executivo */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-5 space-y-3">
                <h3 className="text-xs font-semibold text-[#D4AF37]">
                  Despesas por Natureza (Práticas de Agência)
                </h3>
                <div className="divide-y divide-white/[0.06] text-xs">
                  {expenseByRole.map((e) => (
                    <div key={e.role} className="py-2.5 flex items-center justify-between">
                      <span className="text-zinc-300">{e.role}</span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {formatBRL(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-5 space-y-3">
                <h3 className="text-xs font-semibold text-[#D4AF37]">
                  Carteira de Publicidade Filtrada ({filteredAds.length} campanhas)
                </h3>
                <div className="divide-y divide-white/[0.06] text-xs max-h-60 overflow-y-auto">
                  {filteredAds.map((ad) => (
                    <div key={ad.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">
                          {ad.advertiser} — {ad.adType}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {ad.city} · {ad.status} · {ad.artworkStatus}
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-[#FF6600] tabular-nums shrink-0">
                        {formatBRL(ad.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: CHECKING TIMBRADO DO ANUNCIANTE ==================== */}
      {subTab === 'checking' && (
        <div className="space-y-6">
          {/* Painel de Configuração (oculto no PDF) */}
          <div className="no-print rounded-xl border border-white/10 bg-[#121215] p-6 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">
                  Configurar Relatório de Checking (Comprovação de Veiculação)
                </h2>
                <p className="text-xs text-zinc-400">
                  Selecione uma campanha para gerar o comprovante timbrado pronto para enviar ao cliente.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedCampaign && (
                  <a
                    href={checkingWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-[#062010]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Enviar Checking WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCheckingPdf}
                  disabled={!selectedCampaign || pdfBusy === 'checking'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  {pdfBusy === 'checking' ? 'Gerando PDF...' : 'Gerar PDF Checking'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Campanha / Anunciante</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                >
                  {advertisingCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.advertiser} — {c.adType} ({c.title})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Data do Checking</label>
                <input
                  type="date"
                  value={checkingDate}
                  onChange={(e) => setCheckingDate(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Alcance / Entregas Estimadas
                </label>
                <input
                  type="text"
                  value={checkingImpressions}
                  onChange={(e) => setCheckingImpressions(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Link de Comprovação / Galeria Fotográfica
                </label>
                <input
                  type="text"
                  value={checkingEvidenceUrl}
                  onChange={(e) => setCheckingEvidenceUrl(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Parecer Técnico da Equipe FortMídia
                </label>
                <input
                  type="text"
                  value={checkingNotes}
                  onChange={(e) => setCheckingNotes(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Documento Timbrado A4 de Checking */}
          {selectedCampaign && (
            <article
              id="printable-checking-sheet"
              className="mx-auto max-w-[900px] rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl overflow-hidden"
            >
              <div className="h-2 w-full bg-gradient-to-r from-[#FF6600] to-[#D4AF37]" />
              <div className="p-6 sm:p-10 space-y-6">
                <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <FortMidiaLogo
                      src={siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
                      alt={siteSettings.brandHighlight}
                      className="h-12 sm:h-14"
                      onLightSurface
                    />
                    <div>
                      <div className="font-display text-xl font-bold text-zinc-950">
                        {siteSettings.brandName}{' '}
                        <span className="text-[#FF6600]">{siteSettings.brandHighlight}</span>
                      </div>
                      <div className="text-xs text-zinc-600">
                        Relatório Oficial de Checking & Comprovação de Mídia
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {siteSettings.siteDomain} · {siteSettings.contactEmail}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 sm:text-right">
                    <div className="text-[11px] font-semibold text-[#FF6600]">
                      CHECKING CERTIFICADO
                    </div>
                    <div className="font-mono text-sm font-bold text-zinc-900 tabular-nums">
                      Data: {formatDateBR(checkingDate)}
                    </div>
                    <div className="text-[11px] text-zinc-600">{selectedCampaign.artworkStatus}</div>
                  </div>
                </header>

                <div className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-zinc-500">ANUNCIANTE</div>
                    <div className="font-display text-base font-bold text-zinc-950">
                      {selectedCampaign.advertiser}
                    </div>
                    <div className="text-zinc-600">
                      Praça / Abrangência: <strong>{selectedCampaign.city}</strong>
                    </div>
                    <div className="text-zinc-600">
                      Executivo de Conta: {selectedCampaign.accountManager}
                    </div>
                  </div>
                  <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:pl-5">
                    <div className="text-[11px] font-semibold text-zinc-500">
                      CAMPANHA VEICULADA
                    </div>
                    <div className="font-display text-base font-bold text-zinc-950">
                      {selectedCampaign.title}
                    </div>
                    <div className="text-zinc-600">
                      Formato: <strong>{selectedCampaign.adType}</strong> · Status:{' '}
                      {selectedCampaign.status}
                    </div>
                    <div className="text-zinc-600 tabular-nums">
                      Período: {formatDateBR(selectedCampaign.startDate)} até{' '}
                      {formatDateBR(selectedCampaign.endDate)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <h3 className="font-display text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-2">
                    Detalhamento da Entrega & Comprovação
                  </h3>
                  <div className="rounded-lg border border-zinc-200 p-4 space-y-2.5">
                    <div>
                      <strong className="text-zinc-900">Ponto / Local de Exibição:</strong>{' '}
                      <span className="text-zinc-700">{selectedCampaign.placementSpec}</span>
                    </div>
                    <div>
                      <strong className="text-zinc-900">Impacto / Alcance Estimado:</strong>{' '}
                      <span className="text-zinc-700">{checkingImpressions}</span>
                    </div>
                    <div>
                      <strong className="text-zinc-900">Link de Evidência / Clipping:</strong>{' '}
                      <span className="font-mono text-[#FF6600]">{checkingEvidenceUrl}</span>
                    </div>
                    <div className="pt-2 border-t border-zinc-200 flex items-start gap-2 text-zinc-700">
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{checkingNotes}</span>
                    </div>
                  </div>
                </div>

                <footer className="border-t border-zinc-200 pt-4 flex flex-col gap-1 text-[11px] text-zinc-500 sm:flex-row sm:justify-between">
                  <span>
                    {siteSettings.brandName} {siteSettings.brandHighlight} · Governança:{' '}
                    {siteSettings.governanceNames}
                  </span>
                  <span>
                    {siteSettings.siteDomain} · {siteSettings.contactEmail}
                  </span>
                </footer>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
};
