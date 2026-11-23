import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CalendarClock,
  DollarSign,
  FileText,
  Globe,
  Megaphone,
  Newspaper,
  Users,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { AdminTabId } from '../../types/fortmidia';

export type CockpitTargetTab = AdminTabId;

interface CockpitModuleProps {
  onNavigateTab: (tab: CockpitTargetTab) => void;
  onOpenFortNewsPortal: () => void;
}

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const CockpitModule: React.FC<CockpitModuleProps> = ({
  onNavigateTab,
  onOpenFortNewsPortal,
}) => {
  const {
    financialEntries,
    contracts,
    leads,
    pautas,
    citizenReports,
    studioBookings,
    advertisingCampaigns,
    mediaBudgets,
    agendaEvents,
    notifications,
  } = useFortMidia();

  // Financeiro & Receita
  const realizedIncome = financialEntries
    .filter((f) => f.type === 'Receita' && f.status === 'Pago')
    .reduce((s, f) => s + f.amount, 0);
  const pendingIncome = financialEntries
    .filter((f) => f.type === 'Receita' && f.status !== 'Pago')
    .reduce((s, f) => s + f.amount, 0);
  const overdueEntries = financialEntries.filter((f) => f.status === 'Atrasado');
  const overdueAmount = overdueEntries.reduce((s, f) => s + f.amount, 0);
  const studioRevenue = studioBookings
    .filter((b) => b.bookingType === 'Locação Avulsa')
    .reduce((s, b) => s + b.durationHours * b.hourlyRate, 0);

  // Orçamentos
  const openBudgets = mediaBudgets.filter(
    (b) => b.status === 'Enviado ao Cliente' || b.status === 'Rascunho'
  );
  const approvedBudgets = mediaBudgets.filter((b) => b.status === 'Aprovado');
  const budgetConversionRate =
    mediaBudgets.length > 0
      ? Math.round((approvedBudgets.length / mediaBudgets.length) * 100)
      : 0;

  // Publicidade & Contratos
  const activeAds = advertisingCampaigns.filter((c) => c.status === 'Em Veiculação');
  const adsPendingArt = advertisingCampaigns.filter(
    (c) => c.artworkStatus === 'Aguardando Material' || c.artworkStatus === 'Em Criação'
  );
  const activeContracts = contracts.filter((c) => c.status !== 'Encerrado');

  // Redação & Fala Cidadão
  const publishedNews = pautas.filter((p) => p.approvalStatus === 'Publicada no Site');
  const pendingChiefApproval = pautas.filter(
    (p) =>
      p.approvalStatus === 'Aguardando Redator-Chefe' ||
      p.approvalStatus === 'Em Apuração'
  );
  const pendingCitizen = citizenReports.filter((r) => r.status === 'Aguardando Triagem');
  const newLeads = leads.filter((l) => l.status === 'Novo Lead');
  const unreadNotifs = notifications.filter((n) => !n.read);
  const upcomingAgenda = agendaEvents.filter(
    (ev) => ev.status !== 'Concluído' && ev.status !== 'Cancelado'
  );

  // Channel revenue distribution
  const adChannelStats = ['Outdoor', 'Podcast', 'Revista', 'Eventos', 'Patrocínio', 'Cota'].map(
    (channel) => {
      const total = advertisingCampaigns
        .filter((c) => c.adType === channel && c.status !== 'Encerrada')
        .reduce((sum, c) => sum + c.value, 0);
      return { channel, total };
    }
  );
  const maxChannelVal = Math.max(...adChannelStats.map((x) => x.total), 1);

  // Territory coverage distribution
  const territoryStats = [
    'Franco da Rocha',
    'Caieiras',
    'Francisco Morato',
    'Cajamar',
    'Mairiporã',
    'Regional CIMBAJU',
  ].map((city) => {
    const adVal = advertisingCampaigns
      .filter((c) => c.city === city && c.status !== 'Encerrada')
      .reduce((s, c) => s + c.value, 0);
    const ctrVal = activeContracts
      .filter((c) => c.city === city)
      .reduce((s, c) => s + c.monthlyValue, 0);
    const newsCount = publishedNews.filter((n) => n.city === city).length;
    return { city, totalVal: adVal + ctrVal, newsCount };
  });

  const actionItems = [
    {
      id: 'act-fin',
      title: `${overdueEntries.length} título(s) financeiro(s) em atraso`,
      detail:
        overdueEntries.length > 0
          ? `${formatBRL(overdueAmount)} pendentes de regularização no caixa.`
          : 'Nenhum título em atraso hoje.',
      urgent: overdueEntries.length > 0,
      cta: 'Abrir Financeiro',
      tab: 'financeiro' as CockpitTargetTab,
    },
    {
      id: 'act-art',
      title: `${adsPendingArt.length} campanha(s) aguardando arte ou material`,
      detail:
        adsPendingArt.length > 0
          ? adsPendingArt.map((a) => a.advertiser).slice(0, 2).join(', ')
          : 'Todos os anunciantes com arte aprovada.',
      urgent: adsPendingArt.length > 0,
      cta: 'Ver Publicidade',
      tab: 'publicidade' as CockpitTargetTab,
    },
    {
      id: 'act-chief',
      title: `${pendingChiefApproval.length} matéria(s) aguardando Redator-Chefe`,
      detail: `${pendingCitizen.length} relato(s) do Fala Cidadão na fila de triagem.`,
      urgent: pendingChiefApproval.length > 0 || pendingCitizen.length > 0,
      cta: 'Mesa Editorial',
      tab: 'jornalismo' as CockpitTargetTab,
    },
    {
      id: 'act-leads',
      title: `${newLeads.length} novo(s) lead(s) e ${openBudgets.length} orçamento(s) abertos`,
      detail: 'Acompanhar fechamento comercial e converter propostas aprovadas.',
      urgent: newLeads.length > 0,
      cta: 'Ver Orçamentos',
      tab: 'orcamento' as CockpitTargetTab,
    },
    {
      id: 'act-agenda',
      title: `${upcomingAgenda.length} compromisso(s) ativos na Agenda Corporativa`,
      detail: upcomingAgenda[0]
        ? `Próximo: ${upcomingAgenda[0].date} · ${upcomingAgenda[0].startTime} — ${upcomingAgenda[0].title}`
        : 'Nenhum compromisso pendente na agenda.',
      urgent: false,
      cta: 'Abrir Agenda',
      tab: 'agenda' as CockpitTargetTab,
    },
    {
      id: 'act-notif',
      title: `${unreadNotifs.length} notificação(ões) não lida(s) na equipe`,
      detail: unreadNotifs[0]
        ? unreadNotifs[0].title
        : 'Todos os alertas corporativos e aprovações em dia.',
      urgent: unreadNotifs.length > 0,
      cta: 'Notificações',
      tab: 'notificacoes' as CockpitTargetTab,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Executivo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Cockpit Executivo · Visão Geral da Holding
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Controle centralizado do Grupo FortMídia e Portal Jornal FortNews: caixa, orçamentos, publicidade, redação e estúdio em um único ERP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenFortNewsPortal}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap"
          >
            <Globe className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
            Abrir Portal FortNews
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('agenda')}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap"
          >
            <CalendarClock className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
            Agenda ({upcomingAgenda.length})
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('notificacoes')}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap"
          >
            <Bell className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
            Notificações ({unreadNotifs.length})
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('catalogo')}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap"
          >
            Preços & Outdoors
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('orcamento')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Novo Orçamento 360°
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Receita Realizada + Estúdio</span>
            <DollarSign className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {formatBRL(realizedIncome + studioRevenue)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 tabular-nums">
            + {formatBRL(pendingIncome)} a receber no pipeline
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Orçamentos & Conversão</span>
            <FileText className="h-4 w-4 text-[#FF6600]" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#FF6600] tabular-nums">
            {budgetConversionRate}% aprovação
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 tabular-nums">
            {approvedBudgets.length} aprovados · {openBudgets.length} em negociação
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Publicidade & Contratos</span>
            <Megaphone className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {activeAds.length} no ar · {activeContracts.length} fixos
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 tabular-nums">
            {adsPendingArt.length} aguardando arte/checking
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Portal FortNews & Estúdio</span>
            <Newspaper className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {publishedNews.length} no ar · {studioBookings.length} gravações
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 tabular-nums">
            {pendingChiefApproval.length} pautas p/ Redator-Chefe
          </div>
        </div>
      </div>

      {/* Radar de Pendências do Dia + Atalhos ERP */}
      <section className="rounded-xl border border-white/10 bg-[#121215] p-6 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Fila de Decisão Rápida — Prioridades de Hoje
            </h2>
            <p className="text-xs text-zinc-400">
              Ações críticas detectadas automaticamente nos módulos do ERP.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('relatorios')}
            className="text-xs font-semibold text-[#D4AF37] hover:underline cursor-pointer self-start sm:self-auto"
          >
            Ir para Central de Relatórios & Checking →
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {actionItems.map((act) => (
            <div
              key={act.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0A0A0A] p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  {act.urgent && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#FF6600]" aria-hidden="true" />
                  )}
                  <span className="truncate">{act.title}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1">{act.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab(act.tab)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 hover:border-[#FF6600] hover:text-white cursor-pointer whitespace-nowrap shrink-0"
              >
                {act.cta}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Grade Analítica: Receita por Canal + Agenda de Estúdio */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Canal de Mídia */}
        <section className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-sm font-semibold text-white">
              Volume Ativo por Canal de Publicidade
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('publicidade')}
              className="text-xs text-[#FF6600] hover:underline cursor-pointer"
            >
              Gerenciar
            </button>
          </div>

          <div className="space-y-3">
            {adChannelStats.map((st) => {
              const pct = Math.round((st.total / maxChannelVal) * 100);
              return (
                <div key={st.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">{st.channel}</span>
                    <span className="font-mono text-white tabular-nums">
                      {formatBRL(st.total)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FF6600]"
                      style={{ width: `${Math.max(st.total > 0 ? 6 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Agenda Estúdio + Redação */}
        <section className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold text-white">
                Próximas Gravações — Estúdio Podcast (16h–20h)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('estudio')}
              className="text-xs text-[#FF6600] hover:underline cursor-pointer"
            >
              Agenda Completa
            </button>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {studioBookings.slice(0, 5).map((bk) => (
              <div
                key={bk.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{bk.programOrClient}</div>
                  <div className="text-[11px] text-zinc-400">
                    {bk.hostOrResponsible} · {bk.bookingType}
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <div className="text-zinc-200">
                    {bk.date} · {bk.startHour}
                  </div>
                  <div className="text-[11px] text-[#D4AF37]">
                    {bk.durationHours}h ({bk.status})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Cobertura Territorial CIMBAJU */}
      <section className="rounded-xl border border-white/10 bg-[#121215] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#FF6600]" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-white">
              Presença Comercial & Editorial por Praça (CIMBAJU)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('relatorios')}
            className="text-xs text-zinc-300 hover:text-white cursor-pointer"
          >
            Ver DRE & Relatório Completo
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {territoryStats.map((t) => (
            <div
              key={t.city}
              className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-white">{t.city}</div>
                <div className="mt-1 text-[11px] text-zinc-400 tabular-nums">
                  {t.newsCount} matéria(s) no FortNews
                </div>
              </div>
              <div className="text-right font-mono text-sm font-bold text-[#FF6600] tabular-nums">
                {formatBRL(t.totalVal)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
