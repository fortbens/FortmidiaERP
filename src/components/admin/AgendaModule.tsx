import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Edit3,
  MapPin,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  AgendaEvent,
  AgendaEventCategory,
  AgendaEventStatus,
  CimbajuCity,
} from '../../types/fortmidia';

const CATEGORIES: AgendaEventCategory[] = [
  'Podcast & Estúdio',
  'Reunião Comercial',
  'Pauta Jornalística',
  'Instalação OOH / Checking',
  'Eventos & Trio Elétrico',
];

const STATUSES: AgendaEventStatus[] = [
  'Agendado',
  'Confirmado',
  'Em Andamento',
  'Concluído',
  'Cancelado',
];

export const AgendaModule: React.FC = () => {
  const {
    agendaEvents,
    teamMembers,
    activeAdminUserId,
    addAgendaEvent,
    updateAgendaEvent,
    deleteAgendaEvent,
  } = useFortMidia();

  const activeUser =
    teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    activeUser?.role === 'Super Admin / Diretoria' || activeUser?.hierarchyLevel === 1;
  const canEdit = isSuperAdmin || activeUser?.permissions?.canEdit !== false;
  const canDelete = isSuperAdmin || activeUser?.permissions?.canDelete === true;

  const [categoryFilter, setCategoryFilter] = useState<'Todas' | AgendaEventCategory>('Todas');
  const [statusFilter, setStatusFilter] = useState<'Todos' | AgendaEventStatus>('Todos');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AgendaEventCategory>('Podcast & Estúdio');
  const [date, setDate] = useState('2026-11-24');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:30');
  const [location, setLocation] = useState('Estúdio Principal FortMídia');
  const [city, setCity] = useState<CimbajuCity>('Franco da Rocha');
  const [responsibleName, setResponsibleName] = useState(
    activeUser?.role === 'Super Admin / Diretoria' ? 'Emerson Carneiro' : activeUser?.name || 'Emerson Carneiro'
  );
  const [clientOrGuest, setClientOrGuest] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<AgendaEventStatus>('Agendado');

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Podcast & Estúdio');
    setDate('2026-11-24');
    setStartTime('16:00');
    setEndTime('17:30');
    setLocation('Estúdio Principal FortMídia');
    setCity('Franco da Rocha');
    setResponsibleName(
      activeUser?.role === 'Super Admin / Diretoria' ? 'Emerson Carneiro' : activeUser?.name || 'Emerson Carneiro'
    );
    setClientOrGuest('');
    setDescription('');
    setStatus('Agendado');
  };

  const handleEdit = (ev: AgendaEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setCategory(ev.category);
    setDate(ev.date);
    setStartTime(ev.startTime);
    setEndTime(ev.endTime);
    setLocation(ev.location);
    setCity(ev.city);
    setResponsibleName(ev.responsibleName);
    setClientOrGuest(ev.clientOrGuest || '');
    setDescription(ev.description);
    setStatus(ev.status);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      category,
      date,
      startTime,
      endTime,
      location: location.trim() || 'Sede Grupo FortMídia',
      city,
      responsibleName,
      clientOrGuest: clientOrGuest.trim() || undefined,
      description: description.trim() || 'Compromisso registrado na agenda corporativa.',
      status,
    };

    if (editingId) {
      updateAgendaEvent(editingId, payload);
      flash('Compromisso atualizado na agenda.');
    } else {
      addAgendaEvent(payload);
      flash('Novo compromisso adicionado à agenda corporativa.');
    }
    resetForm();
    setShowForm(false);
  };

  const sortedEvents = useMemo(() => {
    return [...agendaEvents]
      .filter((ev) => {
        const mCat = categoryFilter === 'Todas' || ev.category === categoryFilter;
        const mSt = statusFilter === 'Todos' || ev.status === statusFilter;
        return mCat && mSt;
      })
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  }, [agendaEvents, categoryFilter, statusFilter]);

  const categoryColor = (cat: AgendaEventCategory) => {
    if (cat === 'Podcast & Estúdio') return 'text-[#FF6600] border-[#FF6600]/30 bg-[#FF6600]/10';
    if (cat === 'Reunião Comercial') return 'text-sky-300 border-sky-500/30 bg-sky-500/10';
    if (cat === 'Pauta Jornalística') return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
    if (cat === 'Instalação OOH / Checking') return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    return 'text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Agenda Corporativa, Gravações & Compromissos
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Organize pautas externas de repórteres, gravações de apresentadores no estúdio, reuniões comerciais e vistorias OOH.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Fechar Formulário' : 'Novo Compromisso'}
          </button>
        )}
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Summary Counters */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#121215] p-4">
          <div className="text-xs text-zinc-400">Total na Agenda</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {agendaEvents.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#121215] p-4">
          <div className="text-xs text-zinc-400">Confirmados</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {agendaEvents.filter((e) => e.status === 'Confirmado').length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#121215] p-4">
          <div className="text-xs text-zinc-400">Podcasts & Estúdio</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#FF6600] tabular-nums">
            {agendaEvents.filter((e) => e.category === 'Podcast & Estúdio').length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#121215] p-4">
          <div className="text-xs text-zinc-400">Pautas & Checkings</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#D4AF37] tabular-nums">
            {
              agendaEvents.filter(
                (e) =>
                  e.category === 'Pauta Jornalística' ||
                  e.category === 'Instalação OOH / Checking'
              ).length
            }
          </div>
        </div>
      </div>

      {/* Create / Edit Event Form */}
      {showForm && canEdit && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#FF6600]/40 bg-[#121215] p-5 space-y-4"
        >
          <div className="text-sm font-bold text-white border-b border-white/10 pb-2">
            {editingId ? 'Editar Compromisso da Agenda' : 'Agendar Novo Compromisso'}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do evento / gravação *"
              className="lg:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AgendaEventCategory)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AgendaEventStatus)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Início</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Término</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Responsável</label>
              <select
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Cidade / Praça</label>
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local / Endereço ou Link da Reunião"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              value={clientOrGuest}
              onChange={(e) => setClientOrGuest(e.target.value)}
              placeholder="Cliente, Convidado ou Pauta vinculada (opcional)"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            />
          </div>

          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes operacionais, equipamentos ou pauta do encontro..."
            className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
            >
              {editingId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121215] p-3">
        <div className="flex flex-wrap gap-1.5">
          {(['Todas', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#FF6600] text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <select
          aria-label="Filtrar agenda por status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'Todos' | AgendaEventStatus)}
          className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
        >
          <option value="Todos">Todos os Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#121215] p-10 text-center text-xs text-zinc-400">
            Nenhum compromisso localizado para os filtros selecionados.
          </div>
        ) : (
          sortedEvents.map((ev) => (
            <div
              key={ev.id}
              className="rounded-xl border border-white/10 bg-[#121215] p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-center shrink-0 min-w-[78px]">
                  <div className="font-mono text-xs font-bold text-[#FF6600] tabular-nums">
                    {ev.date.split('-').reverse().slice(0, 2).join('/')}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-zinc-300 tabular-nums">
                    {ev.startTime}
                  </div>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${categoryColor(
                        ev.category
                      )}`}
                    >
                      {ev.category}
                    </span>
                    <span className="text-[11px] text-zinc-400">{ev.city}</span>
                    {ev.clientOrGuest && (
                      <span className="text-[11px] text-[#D4AF37] font-medium">
                        · {ev.clientOrGuest}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-sm sm:text-base font-bold text-white break-words">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{ev.description}</p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#FF6600]" />
                      {ev.startTime} às {ev.endTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#FF6600]" />
                      {ev.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-[#D4AF37]" />
                      Resp.: {ev.responsibleName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                <select
                  aria-label={`Status de ${ev.title}`}
                  disabled={!canEdit}
                  value={ev.status}
                  onChange={(e) =>
                    updateAgendaEvent(ev.id, { status: e.target.value as AgendaEventStatus })
                  }
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white disabled:opacity-60 cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleEdit(ev)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteAgendaEvent(ev.id);
                      flash('Compromisso removido da agenda.');
                    }}
                    aria-label={`Excluir ${ev.title}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
