import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  Image as ImageIcon,
  Mic2,
  Minus,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { PodcastShow, StudioBooking } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';
import { OFFICIAL_FORTMIDIA_LOGO_URL, OFFICIAL_FORTNEWS_LOGO_URL } from '../FortMidiaLogo';

const DEFAULT_GOAL = 2000;
const DEFAULT_QUOTA_VALUE = 400;

const WEEK_DATES = [
  { date: '2026-11-16', shortDay: 'Seg', label: 'Seg · 16/11' },
  { date: '2026-11-17', shortDay: 'Ter', label: 'Ter · 17/11' },
  { date: '2026-11-18', shortDay: 'Qua', label: 'Qua · 18/11' },
  { date: '2026-11-19', shortDay: 'Qui', label: 'Qui · 19/11' },
  { date: '2026-11-20', shortDay: 'Sex', label: 'Sex · 20/11' },
  { date: '2026-11-21', shortDay: 'Sáb', label: 'Sáb · 21/11' },
];

const HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '21:00',
  '22:00',
];

const DURATION_OPTIONS = [
  { value: 1, label: '1 hora' },
  { value: 1.5, label: '1h30' },
  { value: 2, label: '2 horas' },
  { value: 2.5, label: '2h30' },
  { value: 3, label: '3 horas' },
  { value: 4, label: '4 horas' },
];

function isPrimeTimeHour(hhmm: string): boolean {
  const [hStr, mStr] = hhmm.split(':');
  const dec = parseInt(hStr || '0', 10) + parseInt(mStr || '0', 10) / 60;
  return dec >= 16 && dec < 20;
}

function formatEndTime(startHour: string, durationHours: number): string {
  const [hStr, mStr] = startHour.split(':');
  const totalMinutes =
    parseInt(hStr || '0', 10) * 60 + parseInt(mStr || '0', 10) + Math.round(durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export interface SponsorshipStats {
  goal: number;
  quotaValue: number;
  totalQuotas: number;
  soldQuotas: number;
  raised: number;
  remainingQuotas: number;
  pct: number;
  color: string;
  bgTint: string;
  borderTint: string;
  statusLabel: string;
}

function getSponsorshipStats(show?: PodcastShow): SponsorshipStats {
  const goal = Math.max(100, show?.sponsorshipGoal ?? DEFAULT_GOAL);
  const quotaValue = Math.max(50, show?.quotaValue ?? DEFAULT_QUOTA_VALUE);
  const totalQuotas = Math.max(1, Math.round(goal / quotaValue));
  const soldQuotas = Math.max(0, Math.min(totalQuotas, show?.soldQuotas ?? 0));
  const raised = soldQuotas * quotaValue;
  const pct = Math.min(100, Math.round((raised / goal) * 100));
  const remainingQuotas = Math.max(0, totalQuotas - soldQuotas);

  if (pct >= 100) {
    return {
      goal,
      quotaValue,
      totalQuotas,
      soldQuotas,
      raised,
      remainingQuotas,
      pct,
      color: '#10B981',
      bgTint: 'rgba(16, 185, 129, 0.14)',
      borderTint: 'rgba(16, 185, 129, 0.45)',
      statusLabel: 'Meta Batida!',
    };
  }
  if (pct >= 80) {
    return {
      goal,
      quotaValue,
      totalQuotas,
      soldQuotas,
      raised,
      remainingQuotas,
      pct,
      color: '#38BDF8',
      bgTint: 'rgba(56, 189, 248, 0.14)',
      borderTint: 'rgba(56, 189, 248, 0.45)',
      statusLabel: 'Quase Batida',
    };
  }
  if (pct >= 40) {
    return {
      goal,
      quotaValue,
      totalQuotas,
      soldQuotas,
      raised,
      remainingQuotas,
      pct,
      color: '#F59E0B',
      bgTint: 'rgba(245, 158, 11, 0.14)',
      borderTint: 'rgba(245, 158, 11, 0.45)',
      statusLabel: 'Em Andamento',
    };
  }
  if (pct > 0) {
    return {
      goal,
      quotaValue,
      totalQuotas,
      soldQuotas,
      raised,
      remainingQuotas,
      pct,
      color: '#fa6607',
      bgTint: 'rgba(250, 102, 7, 0.16)',
      borderTint: 'rgba(250, 102, 7, 0.45)',
      statusLabel: 'Iniciando',
    };
  }
  return {
    goal,
    quotaValue,
    totalQuotas,
    soldQuotas,
    raised,
    remainingQuotas,
    pct: 0,
    color: '#EF4444',
    bgTint: 'rgba(239, 68, 68, 0.14)',
    borderTint: 'rgba(239, 68, 68, 0.45)',
    statusLabel: 'Sem Cotas',
  };
}

interface ProgramLogoMeterProps {
  logoUrl?: string;
  title: string;
  stats?: SponsorshipStats;
  size?: 'sm' | 'md' | 'lg';
}

const ProgramLogoMeter: React.FC<ProgramLogoMeterProps> = ({
  logoUrl,
  title,
  stats,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 40 : size === 'md' ? 48 : 72;
  const strokeWidth = size === 'sm' ? 3.5 : size === 'md' ? 4 : 5;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressPct = stats ? stats.pct : 0;
  // Always draw a minimal visible arc (10%) even at 0% in red so the color ring is immediately readable
  const visualPct = stats ? (progressPct === 0 ? 100 : progressPct) : 0;
  const strokeDashoffset = circumference - (visualPct / 100) * circumference;
  const ringColor = stats ? stats.color : '#52525B';
  const ringOpacity = stats && progressPct === 0 ? 0.45 : 1;

  const innerInset = size === 'sm' ? 5 : size === 'md' ? 6 : 8;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: dim, height: dim }}
      title={
        stats
          ? `${title} — Meta: R$ ${stats.raised.toLocaleString('pt-BR')} / R$ ${stats.goal.toLocaleString('pt-BR')} (${stats.soldQuotas}/${stats.totalQuotas} cotas · ${stats.pct}% · ${stats.statusLabel})`
          : title
      }
    >
      {/* Colored Sponsorship Progress Ring over the Program Icon */}
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="-rotate-90 absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={strokeWidth}
        />
        {stats && (
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeOpacity={ringOpacity}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        )}
      </svg>

      {/* Program Icon / Logo */}
      <div
        className="overflow-hidden rounded-full bg-[#09090B] border border-white/15 flex items-center justify-center"
        style={{
          width: dim - innerInset * 2,
          height: dim - innerInset * 2,
        }}
      >
        {logoUrl ? (
          <MediaFrame
            src={logoUrl}
            alt={`Logo ${title}`}
            className="h-full w-full object-contain p-0.5 bg-[#0A0A0A]"
          />
        ) : (
          <Mic2
            className={size === 'sm' ? 'h-3.5 w-3.5 text-[#fa6607]' : 'h-5 w-5 text-[#fa6607]'}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Colored Quota Badge Overlay */}
      {stats && (
        <span
          className={`absolute -bottom-1 -right-1 rounded-full font-mono font-bold leading-none text-white shadow-md border border-[#0A0A0A] tabular-nums ${
            size === 'sm'
              ? 'px-1 py-[2px] text-[8px]'
              : size === 'md'
              ? 'px-1.5 py-[2px] text-[9px]'
              : 'px-1.5 py-0.5 text-[10px]'
          }`}
          style={{ backgroundColor: stats.color }}
        >
          {stats.soldQuotas}/{stats.totalQuotas}
        </span>
      )}
    </div>
  );
};

export const StudioScheduleModule: React.FC = () => {
  const {
    studioBookings,
    addStudioBooking,
    updateStudioBooking,
    updateStudioBookingStatus,
    deleteStudioBooking,
    podcastShows,
    updatePodcastShow,
    addPodcastShow,
    deletePodcastShow,
    teamMembers,
    activeAdminUserId,
  } = useFortMidia();

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const canDelete =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1 ||
    Boolean(activeOperator.permissions?.canDelete);

  /* ---------------- New Booking Form State ---------------- */
  const [selectedDate, setSelectedDate] = useState('2026-11-16');
  const [startHour, setStartHour] = useState('16:00');
  const [durationHours, setDurationHours] = useState(2);
  const [linkedShowId, setLinkedShowId] = useState('');
  const [programOrClient, setProgramOrClient] = useState('');
  const [bookingType, setBookingType] =
    useState<StudioBooking['bookingType']>('Grade Oficial (16h–20h)');
  const [hostOrResponsible, setHostOrResponsible] = useState('');
  const [bookingLogoUrl, setBookingLogoUrl] = useState('');
  const [error, setError] = useState('');

  /* ---------------- Edit Booking Modal State ---------------- */
  const [editingBooking, setEditingBooking] = useState<StudioBooking | null>(null);
  const [editError, setEditError] = useState('');

  /* ---------------- Add New Podcast Show Form State ---------------- */
  const [newShowTitle, setNewShowTitle] = useState('');
  const [newShowHost, setNewShowHost] = useState('');
  const [newShowSlot, setNewShowSlot] = useState('SÁB · 16H');
  const [newShowLogoUrl, setNewShowLogoUrl] = useState(OFFICIAL_FORTNEWS_LOGO_URL);

  /* Helper: match booking to an official PodcastShow */
  const resolveShowForBooking = (bk: StudioBooking): PodcastShow | undefined => {
    if (bk.podcastShowId) {
      const byId = podcastShows.find((s) => s.id === bk.podcastShowId);
      if (byId) return byId;
    }
    const lower = bk.programOrClient.toLowerCase();
    return podcastShows.find((s) => lower.includes(s.title.toLowerCase()));
  };

  /* Helper: read uploaded file as DataURL */
  const readImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLinkShowOnCreate = (showId: string) => {
    setLinkedShowId(showId);
    const show = podcastShows.find((s) => s.id === showId);
    if (show) {
      setProgramOrClient(show.title);
      setHostOrResponsible(show.host);
      setBookingType('Grade Oficial (16h–20h)');
      setBookingLogoUrl(show.programLogoUrl || OFFICIAL_FORTNEWS_LOGO_URL);
    }
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!programOrClient.trim() || !hostOrResponsible.trim()) {
      setError('Informe o cliente/programa e o responsável pela sessão.');
      return;
    }

    const res = addStudioBooking({
      date: selectedDate,
      startHour,
      durationHours,
      programOrClient: programOrClient.trim(),
      bookingType,
      hostOrResponsible: hostOrResponsible.trim(),
      hourlyRate: bookingType === 'Locação Avulsa' ? 300 : 0,
      status: 'Confirmado',
      podcastShowId: linkedShowId || undefined,
      programLogoUrl: bookingLogoUrl.trim() || undefined,
    });

    if (!res.ok) {
      setError(res.error || 'Horário indisponível.');
      return;
    }

    setError('');
    setLinkedShowId('');
    setProgramOrClient('');
    setHostOrResponsible('');
    setBookingLogoUrl('');
  };

  const openEditModal = (bk: StudioBooking) => {
    const matchedShow = resolveShowForBooking(bk);
    setEditingBooking({
      ...bk,
      podcastShowId: bk.podcastShowId ?? matchedShow?.id ?? '',
      programLogoUrl: bk.programLogoUrl ?? matchedShow?.programLogoUrl ?? '',
    });
    setEditError('');
  };

  const handleSaveEditBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    if (!editingBooking.programOrClient.trim() || !editingBooking.hostOrResponsible.trim()) {
      setEditError('Informe o programa/cliente e o responsável.');
      return;
    }

    const res = updateStudioBooking(editingBooking.id, {
      date: editingBooking.date,
      startHour: editingBooking.startHour,
      durationHours: editingBooking.durationHours,
      programOrClient: editingBooking.programOrClient.trim(),
      bookingType: editingBooking.bookingType,
      hostOrResponsible: editingBooking.hostOrResponsible.trim(),
      hourlyRate: editingBooking.bookingType === 'Locação Avulsa' ? 300 : 0,
      status: editingBooking.status,
      podcastShowId: editingBooking.podcastShowId || undefined,
      programLogoUrl: editingBooking.programLogoUrl?.trim() || undefined,
    });

    if (!res.ok) {
      setEditError(res.error || 'Conflito de horário detectado.');
      return;
    }

    setEditingBooking(null);
    setEditError('');
  };

  const handleAddPodcastShow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShowTitle.trim() || !newShowHost.trim()) return;
    addPodcastShow({
      title: newShowTitle.trim(),
      host: newShowHost.trim(),
      hostAvatarUrl: '/assets/aistudio/Microfone_dc305011.jpg',
      programLogoUrl: newShowLogoUrl || OFFICIAL_FORTNEWS_LOGO_URL,
      schedule: newShowSlot.trim() || 'Horário Especial · 16h00 às 17h30',
      daySlot: newShowSlot.trim() || 'ESP · 16H',
      focus: 'Programa oficial do Estúdio FortNews Podcast.',
      episodeTitle: `Estreia — ${newShowTitle.trim()}`,
      durationSec: 2700,
      baseFreqHz: 220,
      accentNote: 'Grade FortNews',
      sponsorshipGoal: DEFAULT_GOAL,
      quotaValue: DEFAULT_QUOTA_VALUE,
      soldQuotas: 0,
      sponsors: [],
    });
    setNewShowTitle('');
    setNewShowHost('');
    setNewShowLogoUrl(OFFICIAL_FORTNEWS_LOGO_URL);
  };

  /* ---------------- Aggregated KPIs ---------------- */
  const totalRentalRevenue = studioBookings
    .filter((b) => b.bookingType === 'Locação Avulsa')
    .reduce((acc, b) => acc + b.durationHours * b.hourlyRate, 0);

  const sponsorshipTotals = useMemo(() => {
    return podcastShows.reduce(
      (acc, show) => {
        const s = getSponsorshipStats(show);
        acc.raised += s.raised;
        acc.goal += s.goal;
        acc.soldQuotas += s.soldQuotas;
        acc.totalQuotas += s.totalQuotas;
        if (s.pct >= 100) acc.completedShows += 1;
        return acc;
      },
      { raised: 0, goal: 0, soldQuotas: 0, totalQuotas: 0, completedShows: 0 }
    );
  }, [podcastShows]);

  const globalPct =
    sponsorshipTotals.goal > 0
      ? Math.min(100, Math.round((sponsorshipTotals.raised / sponsorshipTotals.goal) * 100))
      : 0;

  const extraDates = useMemo(() => {
    const known = new Set(WEEK_DATES.map((d) => d.date));
    return Array.from(
      new Set(studioBookings.map((b) => b.date).filter((d) => !known.has(d)))
    ).sort();
  }, [studioBookings]);

  const sortedBookings = useMemo(
    () =>
      [...studioBookings].sort((a, b) =>
        a.date === b.date ? a.startHour.localeCompare(b.startHour) : a.date.localeCompare(b.date)
      ),
    [studioBookings]
  );

  return (
    <div className="space-y-8">
      {/* Header & Top KPIs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Agendamento de Estúdio — FortNews Podcast
          </h2>
          <p className="text-xs text-zinc-400">
            Grade semanal editável (Faixa Nobre 16h–20h destacada), logos dos programas e controle
            visual de metas de patrocínio (R$ 2.000,00 · cotas de R$ 400,00).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-emerald-500/25 bg-[#141417] px-4 py-2.5 min-w-[210px]">
            <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Meta Patrocínio ({sponsorshipTotals.soldQuotas}/{sponsorshipTotals.totalQuotas}{' '}
                cotas)
              </span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {globalPct}%
              </span>
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-white tabular-nums">
              R$ {sponsorshipTotals.raised.toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-zinc-400">
                / R$ {sponsorshipTotals.goal.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#fa6607] via-amber-400 to-emerald-500 transition-all duration-300"
                style={{ width: `${globalPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#141417] px-4 py-2.5 text-right">
            <div className="text-[11px] text-zinc-400">Receita Locações na Semana</div>
            <div className="font-mono text-base font-bold text-[#fa6607] tabular-nums">
              R$ {totalRentalRevenue.toLocaleString('pt-BR')}
            </div>
            <div className="text-[10px] text-zinc-500">R$ 300,00/h avulso</div>
          </div>
        </div>
      </div>

      {/* Interactive Weekly Matrix + Booking Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* New Booking Form */}
        <form
          onSubmit={handleBook}
          className="lg:col-span-4 rounded-xl border border-white/10 bg-[#121215] p-5 space-y-3.5 self-start"
        >
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <CalendarDays className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold text-white">Novo Agendamento</h3>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Vincular Programa Oficial (opcional)
            </label>
            <select
              value={linkedShowId}
              onChange={(e) => handleLinkShowOnCreate(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              <option value="">— Sessão Avulsa ou Personalizada —</option>
              {podcastShows.map((show) => {
                const st = getSponsorshipStats(show);
                return (
                  <option key={show.id} value={show.id}>
                    {show.title} ({show.daySlot} · {st.soldQuotas}/{st.totalQuotas} cotas)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Dia na Grade</label>
              <select
                value={WEEK_DATES.some((d) => d.date === selectedDate) ? selectedDate : ''}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              >
                {WEEK_DATES.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.label}
                  </option>
                ))}
                {!WEEK_DATES.some((d) => d.date === selectedDate) && (
                  <option value="">Outra data</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Ou Data Exata
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Início</label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h} {isPrimeTimeHour(h) ? '★ Nobre' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Duração</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Modalidade</label>
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value as StudioBooking['bookingType'])}
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              <option value="Grade Oficial (16h–20h)">Grade Oficial FortNews (16h–20h)</option>
              <option value="Locação Avulsa">Locação Avulsa (R$ 300/h)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Programa ou Cliente *
            </label>
            <input
              type="text"
              value={programOrClient}
              onChange={(e) => setProgramOrClient(e.target.value)}
              placeholder="Ex: ReVira / Empresa X"
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Apresentador ou Responsável *
            </label>
            <input
              type="text"
              value={hostOrResponsible}
              onChange={(e) => setHostOrResponsible(e.target.value)}
              placeholder="Nome completo"
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Logo do Programa / Cliente (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={bookingLogoUrl}
                onChange={(e) => setBookingLogoUrl(e.target.value)}
                placeholder="URL da imagem ou faça upload..."
                className="flex-1 min-w-0 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 focus:border-[#fa6607] focus:outline-none"
              />
              <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#18181B] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-[#fa6607]/60 cursor-pointer shrink-0">
                <Upload className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                <span>Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => readImageFile(e, (url) => setBookingLogoUrl(url))}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
            <span className="text-zinc-400">
              Horário: <strong className="font-mono text-zinc-200">{startHour}–{formatEndTime(startHour, durationHours)}</strong>
            </span>
            <span className="font-mono font-bold text-white tabular-nums">
              {bookingType === 'Locação Avulsa'
                ? `R$ ${(durationHours * 300).toLocaleString('pt-BR')}`
                : 'Grade Interna'}
            </span>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Confirmar Reserva de Estúdio
          </button>
        </form>

        {/* Visual Weekly Slot Grid + Bookings Table */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          <div className="rounded-xl border border-white/10 bg-[#111114] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                  Grade Semanal do Estúdio (Faixa Nobre 16h–20h destacada)
                </span>
                <p className="text-[11px] text-zinc-400">
                  Clique em <strong className="text-zinc-200">Alterar Horário</strong> em qualquer
                  bloco para editar dia, hora, duração ou logo do programa.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1 rounded border border-[#fa6607]/40 bg-[#fa6607]/15 px-2 py-0.5 font-semibold text-[#fa6607]">
                  ★ Faixa Nobre 16h–20h
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2 py-0.5 font-semibold text-[#D4AF37]">
                  Locação Avulsa
                </span>
              </div>
            </div>

            <FloatingHorizontalScroll label="Role a Grade Semanal lateralmente">
              <div className="grid min-w-[760px] grid-cols-6 gap-2.5 pb-1">
                {WEEK_DATES.map((day) => {
                  const dayBookings = studioBookings
                    .filter((b) => b.date === day.date)
                    .sort((a, b) => a.startHour.localeCompare(b.startHour));
                  const isActiveDay = selectedDate === day.date;

                  return (
                    <div
                      key={day.date}
                      onClick={() => setSelectedDate(day.date)}
                      className={`rounded-lg border p-2.5 transition-colors cursor-pointer flex flex-col ${
                        isActiveDay
                          ? 'border-[#fa6607] bg-[#fa6607]/[0.07]'
                          : 'border-white/10 bg-[#16161A] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-mono text-xs font-semibold text-white tabular-nums">
                          {day.label}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {dayBookings.length}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-2 flex-1">
                        {dayBookings.length === 0 ? (
                          <div className="rounded-md border border-dashed border-white/10 py-6 text-center text-[11px] text-zinc-500">
                            Horários livres
                          </div>
                        ) : (
                          dayBookings.map((bk) => {
                            const matchedShow = resolveShowForBooking(bk);
                            const stats = matchedShow
                              ? getSponsorshipStats(matchedShow)
                              : undefined;
                            const logo = bk.programLogoUrl || matchedShow?.programLogoUrl;
                            const prime = isPrimeTimeHour(bk.startHour);
                            const isOfficial = bk.bookingType === 'Grade Oficial (16h–20h)';

                            return (
                              <div
                                key={bk.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(bk);
                                }}
                                className={`group relative rounded-lg border p-2 text-[11px] transition-all hover:brightness-110 cursor-pointer ${
                                  prime || isOfficial
                                    ? 'border-[#fa6607]/45 bg-[#fa6607]/12 text-zinc-100'
                                    : 'border-[#D4AF37]/35 bg-[#D4AF37]/10 text-zinc-100'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <ProgramLogoMeter
                                    logoUrl={logo}
                                    title={matchedShow?.title || bk.programOrClient}
                                    stats={stats}
                                    size="sm"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono font-bold tabular-nums text-[10px] text-white">
                                        {bk.startHour}–{formatEndTime(bk.startHour, bk.durationHours)}
                                      </span>
                                    </div>
                                    {prime && (
                                      <span className="inline-block mt-0.5 rounded bg-[#fa6607]/25 px-1 py-[1px] text-[8px] font-bold uppercase tracking-wide text-[#ff9d5c]">
                                        Faixa Nobre
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-1.5 font-semibold leading-snug text-white line-clamp-2">
                                  {bk.programOrClient}
                                </div>
                                <div className="mt-0.5 text-[10px] text-zinc-400 truncate">
                                  {bk.hostOrResponsible}
                                </div>

                                {stats && (
                                  <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-white/10 pt-1 text-[9px]">
                                    <span className="font-mono font-semibold" style={{ color: stats.color }}>
                                      R$ {stats.raised.toLocaleString('pt-BR')}
                                    </span>
                                    <span className="text-zinc-400 font-mono">
                                      {stats.pct}% meta
                                    </span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(bk);
                                  }}
                                  className="mt-1.5 w-full inline-flex items-center justify-center gap-1 rounded border border-white/15 bg-black/40 px-1.5 py-1 text-[10px] font-medium text-zinc-200 hover:border-[#fa6607] hover:text-white cursor-pointer"
                                >
                                  <Edit3 className="h-2.5 w-2.5 text-[#fa6607]" aria-hidden="true" />
                                  Alterar Horário
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </FloatingHorizontalScroll>

            {extraDates.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-200">
                  Agendamentos em outras datas:
                </span>
                {extraDates.map((d) => (
                  <span
                    key={d}
                    className="rounded border border-white/15 bg-[#16161A] px-2 py-0.5 font-mono text-[10px] text-zinc-300"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bookings Management Table */}
          <div className="rounded-xl border border-white/10 bg-[#111114] overflow-hidden">
            <FloatingHorizontalScroll label="Deslize a tabela de reservas lateralmente">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data &amp; Horário</th>
                    <th className="px-4 py-3 font-medium">Programa / Logo &amp; Meta</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {sortedBookings.map((b) => {
                    const matchedShow = resolveShowForBooking(b);
                    const stats = matchedShow ? getSponsorshipStats(matchedShow) : undefined;
                    const logo = b.programLogoUrl || matchedShow?.programLogoUrl;
                    const prime = isPrimeTimeHour(b.startHour);

                    return (
                      <tr key={b.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono text-zinc-200 tabular-nums font-medium">
                            {b.date}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                              {b.startHour}–{formatEndTime(b.startHour, b.durationHours)} ({b.durationHours}h)
                            </span>
                            {prime && (
                              <span className="rounded bg-[#fa6607]/20 px-1.5 py-[1px] text-[9px] font-bold text-[#fa6607]">
                                Nobre
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProgramLogoMeter
                              logoUrl={logo}
                              title={matchedShow?.title || b.programOrClient}
                              stats={stats}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-white">{b.programOrClient}</div>
                              <div className="text-[11px] text-zinc-400">{b.hostOrResponsible}</div>
                              {stats && (
                                <div className="text-[10px] font-mono" style={{ color: stats.color }}>
                                  Patrocínio: R$ {stats.raised.toLocaleString('pt-BR')} / R${' '}
                                  {stats.goal.toLocaleString('pt-BR')} ({stats.soldQuotas}/
                                  {stats.totalQuotas} cotas)
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                          {b.bookingType}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white tabular-nums whitespace-nowrap">
                          {b.hourlyRate > 0
                            ? `R$ ${(b.hourlyRate * b.durationHours).toLocaleString('pt-BR')}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Status de reserva ${b.programOrClient}`}
                            value={b.status}
                            onChange={(e) =>
                              updateStudioBookingStatus(
                                b.id,
                                e.target.value as StudioBooking['status']
                              )
                            }
                            className="rounded-md border border-white/15 bg-[#0A0A0A] px-2.5 py-1 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none cursor-pointer"
                          >
                            <option value="Confirmado">Confirmado</option>
                            <option value="Reservado">Reservado</option>
                            <option value="Gravado">Gravado</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(b)}
                              title="Alterar horário e logo"
                              className="inline-flex items-center gap-1 rounded-md border border-[#fa6607]/40 bg-[#fa6607]/10 px-2 py-1 text-[11px] font-medium text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" aria-hidden="true" />
                              Editar
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => deleteStudioBooking(b.id)}
                                title="Excluir reserva"
                                className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </FloatingHorizontalScroll>
          </div>
        </div>
      </div>

      {/* Podcast Lineup, Program Logos & Sponsorship Goals (R$ 2.000 / Cotas R$ 400) */}
      <div className="rounded-xl border border-white/10 bg-[#111114] p-5 space-y-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-2.5">
              <Mic2 className="h-5 w-5 text-[#fa6607] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Grade Oficial de Podcasts — Logo do Programa, Horário &amp; Meta de Patrocínio
                </h3>
                <p className="text-xs text-zinc-400">
                  Meta padrão de <strong className="text-white">R$ 2.000,00 por programa</strong>{' '}
                  dividida em <strong className="text-white">5 cotas de R$ 400,00</strong>. O anel
                  colorido ao redor do ícone/logo do programa indica o progresso em tempo real.
                </p>
              </div>
            </div>

            {/* Add New Show Form */}
            <form onSubmit={handleAddPodcastShow} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newShowTitle}
                onChange={(e) => setNewShowTitle(e.target.value)}
                placeholder="Novo programa..."
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white w-36 focus:border-[#fa6607] focus:outline-none"
              />
              <input
                type="text"
                value={newShowHost}
                onChange={(e) => setNewShowHost(e.target.value)}
                placeholder="Apresentador..."
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white w-32 focus:border-[#fa6607] focus:outline-none"
              />
              <input
                type="text"
                value={newShowSlot}
                onChange={(e) => setNewShowSlot(e.target.value)}
                placeholder="SÁB · 16H"
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 font-mono text-xs text-white w-24 focus:border-[#fa6607] focus:outline-none"
              />
              <label
                title="Escolher logo do novo programa"
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-zinc-300 hover:border-[#fa6607] cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                <span>Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => readImageFile(e, (url) => setNewShowLogoUrl(url))}
                  className="hidden"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-[#fa6607] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Incluir Programa
              </button>
            </form>
          </div>

          {/* Color Meter Legend */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-[11px]">
            <span className="font-semibold text-zinc-300 mr-1">Medidor no Ícone:</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              0% (0 cotas)
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-2.5 w-2.5 rounded-full bg-[#fa6607]" />
              20% (1 cota · R$ 400)
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
              40%–60% (2–3 cotas · R$ 800–1.200)
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="h-2.5 w-2.5 rounded-full bg-[#38BDF8]" />
              80% (4 cotas · R$ 1.600)
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              100% (5/5 cotas · R$ 2.000 Meta Batida!)
            </span>
          </div>
        </div>

        {/* Podcast Show Cards */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {podcastShows.map((show) => {
            const stats = getSponsorshipStats(show);
            const quotaNumbers = Array.from({ length: stats.totalQuotas }, (_, i) => i + 1);

            return (
              <div
                key={show.id}
                className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 space-y-4 transition-colors hover:border-white/20"
              >
                {/* Top Row: Program Logo + Meter, Host Avatar, Main Fields */}
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Visual Column: Program Logo w/ Colored Meter + Host Profile Photo */}
                  <div className="flex sm:flex-col items-center gap-3 shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <ProgramLogoMeter
                        logoUrl={show.programLogoUrl}
                        title={show.title}
                        stats={stats}
                        size="lg"
                      />
                      <label className="inline-flex items-center gap-1 rounded-md border border-[#fa6607]/40 bg-[#fa6607]/10 px-2 py-1 text-[10px] font-semibold text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer whitespace-nowrap">
                        <Upload className="h-3 w-3" aria-hidden="true" />
                        <span>Logo Programa</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            readImageFile(e, (url) =>
                              updatePodcastShow(show.id, { programLogoUrl: url })
                            )
                          }
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                      <div className="relative">
                        <MediaFrame
                          src={show.hostAvatarUrl || '/assets/aistudio/Microfone_dc305011.jpg'}
                          alt={show.host}
                          className="h-11 w-11 rounded-full object-cover border border-white/25 bg-black"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[#121215] border border-white/20 p-0.5">
                          <Camera className="h-2.5 w-2.5 text-[#fa6607]" aria-hidden="true" />
                        </span>
                      </div>
                      <label className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#121215] px-2 py-0.5 text-[10px] font-medium text-zinc-300 hover:border-[#fa6607]/50 cursor-pointer whitespace-nowrap">
                        <Upload className="h-2.5 w-2.5 text-[#fa6607]" aria-hidden="true" />
                        <span>Foto Host</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            readImageFile(e, (url) =>
                              updatePodcastShow(show.id, { hostAvatarUrl: url })
                            )
                          }
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Editable Program Info & Schedule */}
                  <div className="flex-1 min-w-0 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={show.daySlot}
                          onChange={(e) => updatePodcastShow(show.id, { daySlot: e.target.value })}
                          aria-label="Dia e horário resumido"
                          className="w-28 rounded-md border border-[#fa6607]/40 bg-[#fa6607]/10 px-2 py-1 font-mono text-[11px] font-bold text-[#fa6607] focus:border-[#fa6607] focus:outline-none"
                        />
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: stats.bgTint,
                            color: stats.color,
                            border: `1px solid ${stats.borderTint}`,
                          }}
                        >
                          {stats.pct >= 100 && (
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          )}
                          {stats.statusLabel} · {stats.pct}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Escolher foto de membro cadastrado para ${show.title}`}
                          value=""
                          onChange={(e) => {
                            const member = teamMembers.find((m) => m.id === e.target.value);
                            if (member) {
                              updatePodcastShow(show.id, {
                                hostAvatarUrl: member.avatarUrl,
                              });
                            }
                          }}
                          className="rounded border border-white/15 bg-[#121215] px-2 py-1 text-[10px] text-zinc-300"
                        >
                          <option value="" disabled>
                            Foto da Equipe...
                          </option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deletePodcastShow(show.id)}
                            title="Remover programa"
                            className="rounded border border-red-500/25 p-1 text-red-400 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-0.5">
                          Nome do Programa
                        </label>
                        <input
                          type="text"
                          value={show.title}
                          onChange={(e) => updatePodcastShow(show.id, { title: e.target.value })}
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs font-semibold text-white focus:border-[#fa6607] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-0.5">
                          Apresentador
                        </label>
                        <input
                          type="text"
                          value={show.host}
                          onChange={(e) => updatePodcastShow(show.id, { host: e.target.value })}
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-0.5">
                        Horário Oficial na Grade (exibido no site e convites)
                      </label>
                      <div className="relative">
                        <Clock
                          className="h-3.5 w-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          value={show.schedule}
                          onChange={(e) =>
                            updatePodcastShow(show.id, { schedule: e.target.value })
                          }
                          placeholder="Ex: Segunda-feira · 16h00 às 17h30"
                          className="w-full rounded-lg border border-white/15 bg-[#121215] pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] text-zinc-500">URL do Logo do Programa</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updatePodcastShow(show.id, {
                                programLogoUrl: OFFICIAL_FORTNEWS_LOGO_URL,
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-[#fa6607] cursor-pointer"
                          >
                            Logo FortNews
                          </button>
                          <span className="text-zinc-700">|</span>
                          <button
                            type="button"
                            onClick={() =>
                              updatePodcastShow(show.id, {
                                programLogoUrl: OFFICIAL_FORTMIDIA_LOGO_URL,
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-[#fa6607] cursor-pointer"
                          >
                            Logo FortMídia
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={show.programLogoUrl || ''}
                        onChange={(e) =>
                          updatePodcastShow(show.id, { programLogoUrl: e.target.value })
                        }
                        placeholder="URL da logo do programa..."
                        className="w-full rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1 font-mono text-[10px] text-zinc-400 focus:border-[#fa6607] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Sponsorship Goal Panel (R$ 2.000,00 / Cotas de R$ 400,00) */}
                <div
                  className="rounded-lg border p-3 space-y-2.5"
                  style={{
                    borderColor: stats.borderTint,
                    backgroundColor: 'rgba(18, 18, 21, 0.9)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" style={{ color: stats.color }} />
                      <span className="text-xs font-bold text-white">
                        Meta de Patrocínio: R$ {stats.raised.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        / R$ {stats.goal.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Quick Stepper - / + */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400">Cotas:</span>
                      <button
                        type="button"
                        onClick={() =>
                          updatePodcastShow(show.id, {
                            soldQuotas: Math.max(0, stats.soldQuotas - 1),
                          })
                        }
                        disabled={stats.soldQuotas <= 0}
                        aria-label={`Reduzir cotas de ${show.title}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-white/15 bg-[#0A0A0A] text-zinc-200 hover:border-[#fa6607] disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span
                        className="min-w-[40px] text-center font-mono text-xs font-bold tabular-nums"
                        style={{ color: stats.color }}
                      >
                        {stats.soldQuotas}/{stats.totalQuotas}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updatePodcastShow(show.id, {
                            soldQuotas: Math.min(stats.totalQuotas, stats.soldQuotas + 1),
                          })
                        }
                        disabled={stats.soldQuotas >= stats.totalQuotas}
                        aria-label={`Adicionar cota em ${show.title}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-white/15 bg-[#0A0A0A] text-zinc-200 hover:border-[#fa6607] disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Quota Slots (e.g. 5 x R$ 400) */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {quotaNumbers.map((num) => {
                      const filled = num <= stats.soldQuotas;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            const nextSold = stats.soldQuotas === num ? num - 1 : num;
                            updatePodcastShow(show.id, { soldQuotas: nextSold });
                          }}
                          className="rounded-md border px-1.5 py-1.5 text-center transition-all cursor-pointer"
                          style={{
                            backgroundColor: filled ? stats.bgTint : '#0A0A0A',
                            borderColor: filled ? stats.color : 'rgba(255,255,255,0.12)',
                            color: filled ? '#FFFFFF' : '#71717A',
                          }}
                          title={`Clique para marcar ${num} cota(s) vendida(s) (R$ ${(num * stats.quotaValue).toLocaleString('pt-BR')})`}
                        >
                          <div className="font-mono text-[10px] font-bold leading-none">
                            Cota {num}
                          </div>
                          <div className="mt-0.5 font-mono text-[9px] tabular-nums opacity-90">
                            R$ {stats.quotaValue}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Goal/Quota Customization & Sponsors Row */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 pt-1">
                    <div className="sm:col-span-3">
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500">
                        Meta (R$)
                      </label>
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={show.sponsorshipGoal ?? DEFAULT_GOAL}
                        onChange={(e) =>
                          updatePodcastShow(show.id, {
                            sponsorshipGoal: Math.max(100, Number(e.target.value) || DEFAULT_GOAL),
                          })
                        }
                        className="mt-0.5 w-full rounded border border-white/15 bg-[#0A0A0A] px-2 py-1 font-mono text-[11px] text-white focus:border-[#fa6607] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500">
                        Cota (R$)
                      </label>
                      <input
                        type="number"
                        min={50}
                        step={50}
                        value={show.quotaValue ?? DEFAULT_QUOTA_VALUE}
                        onChange={(e) =>
                          updatePodcastShow(show.id, {
                            quotaValue: Math.max(50, Number(e.target.value) || DEFAULT_QUOTA_VALUE),
                          })
                        }
                        className="mt-0.5 w-full rounded border border-white/15 bg-[#0A0A0A] px-2 py-1 font-mono text-[11px] text-white focus:border-[#fa6607] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500">
                        Patrocinadores Ativos (separar por vírgula)
                      </label>
                      <input
                        type="text"
                        value={(show.sponsors ?? []).join(', ')}
                        onChange={(e) =>
                          updatePodcastShow(show.id, {
                            sponsors: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Ex: Auto Shopping Franco, Ótica Visão..."
                        className="mt-0.5 w-full rounded border border-white/15 bg-[#0A0A0A] px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-[#fa6607] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Studio Booking Modal (Alterar Horário & Logo) */}
      {editingBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Alterar horário do agendamento de estúdio"
        >
          <form
            onSubmit={handleSaveEditBooking}
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#121215] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                <h3 className="font-display text-base font-bold text-white">
                  Alterar Horário &amp; Dados da Grade do Estúdio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                aria-label="Fechar modal"
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Vincular Programa Oficial (atualiza logo e medidor de meta)
              </label>
              <select
                value={editingBooking.podcastShowId || ''}
                onChange={(e) => {
                  const showId = e.target.value;
                  const show = podcastShows.find((s) => s.id === showId);
                  setEditingBooking((prev) =>
                    prev
                      ? {
                          ...prev,
                          podcastShowId: showId,
                          programOrClient: show ? show.title : prev.programOrClient,
                          hostOrResponsible: show ? show.host : prev.hostOrResponsible,
                          programLogoUrl: show
                            ? show.programLogoUrl || OFFICIAL_FORTNEWS_LOGO_URL
                            : prev.programLogoUrl,
                        }
                      : null
                  );
                }}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              >
                <option value="">— Nenhum (Locação ou Evento Avulso) —</option>
                {podcastShows.map((show) => (
                  <option key={show.id} value={show.id}>
                    {show.title} ({show.daySlot})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Dia na Grade Semanal
                </label>
                <select
                  value={
                    WEEK_DATES.some((d) => d.date === editingBooking.date)
                      ? editingBooking.date
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      setEditingBooking((prev) =>
                        prev ? { ...prev, date: e.target.value } : null
                      );
                    }
                  }}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {WEEK_DATES.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.label}
                    </option>
                  ))}
                  {!WEEK_DATES.some((d) => d.date === editingBooking.date) && (
                    <option value="">Data personalizada</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Data Exata
                </label>
                <input
                  type="date"
                  value={editingBooking.date}
                  onChange={(e) =>
                    setEditingBooking((prev) => (prev ? { ...prev, date: e.target.value } : null))
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Novo Horário de Início
                </label>
                <select
                  value={editingBooking.startHour}
                  onChange={(e) =>
                    setEditingBooking((prev) =>
                      prev ? { ...prev, startHour: e.target.value } : null
                    )
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h} {isPrimeTimeHour(h) ? '★ Faixa Nobre' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Duração</label>
                <select
                  value={editingBooking.durationHours}
                  onChange={(e) =>
                    setEditingBooking((prev) =>
                      prev ? { ...prev, durationHours: Number(e.target.value) } : null
                    )
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Modalidade
                </label>
                <select
                  value={editingBooking.bookingType}
                  onChange={(e) =>
                    setEditingBooking((prev) =>
                      prev
                        ? {
                            ...prev,
                            bookingType: e.target.value as StudioBooking['bookingType'],
                          }
                        : null
                    )
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  <option value="Grade Oficial (16h–20h)">Grade Oficial (16h–20h)</option>
                  <option value="Locação Avulsa">Locação Avulsa (R$ 300/h)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Status</label>
                <select
                  value={editingBooking.status}
                  onChange={(e) =>
                    setEditingBooking((prev) =>
                      prev
                        ? { ...prev, status: e.target.value as StudioBooking['status'] }
                        : null
                    )
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  <option value="Confirmado">Confirmado</option>
                  <option value="Reservado">Reservado</option>
                  <option value="Gravado">Gravado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Programa ou Cliente *
              </label>
              <input
                type="text"
                value={editingBooking.programOrClient}
                onChange={(e) =>
                  setEditingBooking((prev) =>
                    prev ? { ...prev, programOrClient: e.target.value } : null
                  )
                }
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Apresentador ou Responsável *
              </label>
              <input
                type="text"
                value={editingBooking.hostOrResponsible}
                onChange={(e) =>
                  setEditingBooking((prev) =>
                    prev ? { ...prev, hostOrResponsible: e.target.value } : null
                  )
                }
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Logo do Programa no Agendamento
              </label>
              <div className="flex items-center gap-3">
                <ProgramLogoMeter
                  logoUrl={editingBooking.programLogoUrl}
                  title={editingBooking.programOrClient}
                  stats={
                    editingBooking.podcastShowId
                      ? getSponsorshipStats(
                          podcastShows.find((s) => s.id === editingBooking.podcastShowId)
                        )
                      : undefined
                  }
                  size="md"
                />
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={editingBooking.programLogoUrl || ''}
                    onChange={(e) =>
                      setEditingBooking((prev) =>
                        prev ? { ...prev, programLogoUrl: e.target.value } : null
                      )
                    }
                    placeholder="URL da logo..."
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 focus:border-[#fa6607] focus:outline-none"
                  />
                  <label className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-[#18181B] px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-[#fa6607] cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                    <span>Carregar Nova Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        readImageFile(e, (url) =>
                          setEditingBooking((prev) =>
                            prev ? { ...prev, programLogoUrl: url } : null
                          )
                        )
                      }
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                Salvar Novo Horário
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
