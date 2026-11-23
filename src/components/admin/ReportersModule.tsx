import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  MessageCircle,
  Newspaper,
  Plus,
  Search,
  Send,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { NEWS_SEALS, NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  CimbajuCity,
  EditorialPauta,
  NewsSeal,
  PautaStatus,
  ReporterProfile,
} from '../../types/fortmidia';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';

const PAUTA_STATUSES: PautaStatus[] = [
  'Apuração de Rua',
  'Roteiro & Entrevista',
  'Edição & Cortes',
  'Publicado',
];

function sanitizeWhatsAppDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export const ReportersModule: React.FC = () => {
  const {
    reporters,
    pautas,
    teamMembers,
    activeAdminUserId,
    addReporter,
    updateReporter,
    deleteReporter,
    assignPautaToReporter,
    addPauta,
    updatePautaStatus,
  } = useFortMidia();

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1;
  const canManageReporters =
    isSuperAdmin ||
    activeOperator.role === 'Administrador' ||
    activeOperator.role === 'Redator-Chefe';

  const [activeTab, setActiveTab] = useState<'distribuicao' | 'cadastro'>('distribuicao');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reporter Create/Edit Form
  const [showReporterForm, setShowReporterForm] = useState(false);
  const [editingReporterId, setEditingReporterId] = useState<string | null>(null);
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repCity, setRepCity] = useState<CimbajuCity>('Franco da Rocha');
  const [repBeat, setRepBeat] = useState('Cidades, Mobilidade & Fala Cidadão');
  const [repNotes, setRepNotes] = useState('');
  const [repActive, setRepActive] = useState(true);
  const [createLoginAccess, setCreateLoginAccess] = useState(true);
  const [repPassword, setRepPassword] = useState('fortnews2026');

  // Quick New Pauta Distribution Form
  const [showQuickPauta, setShowQuickPauta] = useState(false);
  const [pautaTitle, setPautaTitle] = useState('');
  const [pautaCity, setPautaCity] = useState<CimbajuCity>('Franco da Rocha');
  const [pautaSeal, setPautaSeal] = useState<NewsSeal>('Cidade & Política');
  const [pautaFormat, setPautaFormat] = useState<EditorialPauta['format']>('Portal 24/7');
  const [pautaReporterId, setPautaReporterId] = useState<string>(reporters[0]?.id ?? '');
  const [pautaSummary, setPautaSummary] = useState('');

  // Distribution filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReporterId, setFilterReporterId] = useState<'Todos' | 'SemRepórter' | string>('Todos');
  const [filterStatus, setFilterStatus] = useState<'Todos' | PautaStatus>('Todos');

  const activeReporters = useMemo(() => reporters.filter((r) => r.active), [reporters]);

  const matchReporterForPauta = (pauta: EditorialPauta): ReporterProfile | undefined => {
    if (pauta.assignedReporterId) {
      return reporters.find((r) => r.id === pauta.assignedReporterId);
    }
    const lowerName = pauta.reporter.trim().toLowerCase();
    return reporters.find((r) => r.name.trim().toLowerCase() === lowerName);
  };

  const reporterStats = useMemo(() => {
    const map = new Map<string, { total: number; inProgress: number; published: number }>();
    reporters.forEach((r) => map.set(r.id, { total: 0, inProgress: 0, published: 0 }));
    pautas.forEach((p) => {
      const rep = matchReporterForPauta(p);
      if (!rep) return;
      const cur = map.get(rep.id) ?? { total: 0, inProgress: 0, published: 0 };
      cur.total += 1;
      if (p.approvalStatus === 'Publicada no Site') cur.published += 1;
      else cur.inProgress += 1;
      map.set(rep.id, cur);
    });
    return map;
  }, [reporters, pautas]);

  const distributedCount = useMemo(
    () => pautas.filter((p) => Boolean(matchReporterForPauta(p))).length,
    [pautas, reporters]
  );
  const unassignedCount = pautas.length - distributedCount;
  const publishedCount = useMemo(
    () => pautas.filter((p) => p.approvalStatus === 'Publicada no Site').length,
    [pautas]
  );

  const filteredPautas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pautas.filter((p) => {
      const matchedRep = matchReporterForPauta(p);
      const okReporter =
        filterReporterId === 'Todos'
          ? true
          : filterReporterId === 'SemRepórter'
            ? !matchedRep
            : matchedRep?.id === filterReporterId;
      const okStatus = filterStatus === 'Todos' || p.status === filterStatus;
      const okSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.reporter.toLowerCase().includes(q) ||
        (p.sourceProtocol || '').toLowerCase().includes(q);
      return okReporter && okStatus && okSearch;
    });
  }, [pautas, reporters, filterReporterId, filterStatus, searchQuery]);

  const resetReporterForm = () => {
    setEditingReporterId(null);
    setRepName('');
    setRepPhone('');
    setRepEmail('');
    setRepCity('Franco da Rocha');
    setRepBeat('Cidades, Mobilidade & Fala Cidadão');
    setRepNotes('');
    setRepActive(true);
    setCreateLoginAccess(true);
    setRepPassword('fortnews2026');
  };

  const openEditReporter = (rep: ReporterProfile) => {
    setEditingReporterId(rep.id);
    setRepName(rep.name);
    setRepPhone(rep.phone);
    setRepEmail(rep.email);
    setRepCity(rep.city);
    setRepBeat(rep.beat);
    setRepNotes(rep.notes || '');
    setRepActive(rep.active);
    setCreateLoginAccess(false);
    setShowReporterForm(true);
    setActiveTab('cadastro');
  };

  const handleSaveReporter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repName.trim() || !repPhone.trim()) return;

    if (editingReporterId) {
      updateReporter(editingReporterId, {
        name: repName.trim(),
        phone: repPhone.trim(),
        email: repEmail.trim(),
        city: repCity,
        beat: repBeat.trim() || 'Reportagem Geral',
        notes: repNotes.trim() || undefined,
        active: repActive,
      });
      setFeedback(`Cadastro do repórter ${repName.trim()} atualizado com sucesso.`);
    } else {
      addReporter(
        {
          name: repName.trim(),
          phone: repPhone.trim(),
          email: repEmail.trim(),
          city: repCity,
          beat: repBeat.trim() || 'Reportagem Geral',
          notes: repNotes.trim() || undefined,
          active: repActive,
        },
        createLoginAccess && repEmail.trim() ? repPassword : undefined
      );
      setFeedback(
        createLoginAccess && repEmail.trim()
          ? `Repórter ${repName.trim()} cadastrado e acesso criado no painel (perfil Repórter / Jornalista).`
          : `Repórter ${repName.trim()} cadastrado para distribuição de matérias.`
      );
    }
    resetReporterForm();
    setShowReporterForm(false);
  };

  const handleQuickCreatePauta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pautaTitle.trim()) return;
    const chosenRep = reporters.find((r) => r.id === pautaReporterId);
    addPauta({
      title: pautaTitle.trim(),
      city: pautaCity,
      seal: pautaSeal,
      format: pautaFormat,
      reporter: chosenRep ? chosenRep.name : 'Redação Central FortNews',
      assignedReporterId: chosenRep?.id,
      deadline: new Date().toLocaleDateString('pt-BR'),
      status: 'Apuração de Rua',
      approvalStatus: 'Em Apuração',
      summary: pautaSummary.trim() || pautaTitle.trim(),
      body:
        pautaSummary.trim() ||
        'Pauta distribuída pelo módulo de Repórteres integrada à mesa da Redação FortNews.',
    });
    setPautaTitle('');
    setPautaSummary('');
    setShowQuickPauta(false);
    setFeedback(
      chosenRep
        ? `Pauta criada na Redação e distribuída imediatamente para ${chosenRep.name}.`
        : 'Pauta criada e integrada à Redação FortNews.'
    );
  };

  const buildBriefingWhatsAppUrl = (pauta: EditorialPauta, rep: ReporterProfile) => {
    const digits = sanitizeWhatsAppDigits(rep.phone);
    const lines = [
      `*PAUTA DISTRIBUÍDA · REDAÇÃO FORTNEWS*`,
      `Repórter: ${rep.name}`,
      `Matéria: ${pauta.title}`,
      `Praça: ${pauta.city} · Editoria: ${pauta.seal}`,
      `Formato: ${pauta.format} · Prazo: ${pauta.deadline}`,
      pauta.sourceProtocol ? `Protocolo Fala Cidadão: ${pauta.sourceProtocol}` : '',
      pauta.summary ? `Briefing: ${pauta.summary}` : '',
      `Envie o texto e fotos pelo painel CRM FortMídia (Redação).`,
    ]
      .filter(Boolean)
      .join('\n');
    return digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Repórteres &amp; Distribuição de Matérias
          </h2>
          <p className="text-xs text-zinc-400">
            Cadastre a equipe de reportagem e distribua pautas diretamente integradas com a Redação FortNews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowQuickPauta((v) => !v);
              setActiveTab('distribuicao');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Newspaper className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
            Nova Pauta Distribuída
          </button>

          {canManageReporters && (
            <button
              type="button"
              onClick={() => {
                resetReporterForm();
                setShowReporterForm((v) => !v);
                setActiveTab('cadastro');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Cadastrar Repórter
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-xs text-zinc-400">Repórteres Ativos</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
            {activeReporters.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-xs text-zinc-400">Matérias Distribuídas</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#fa6607] tabular-nums">
            {distributedCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-xs text-zinc-400">Pautas Sem Repórter Fixo</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-amber-400 tabular-nums">
            {unassignedCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-xs text-zinc-400">Publicadas no Portal</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {publishedCount}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            {feedback}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Segmented View Switcher */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#111114] p-1.5 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('distribuicao')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'distribuicao'
              ? 'bg-[#fa6607] text-white'
              : 'text-zinc-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          Distribuição de Matérias ({pautas.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cadastro')}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'cadastro'
              ? 'bg-[#fa6607] text-white'
              : 'text-zinc-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          Cadastro de Repórteres ({reporters.length})
        </button>
      </div>

      {/* Quick Create & Assign Pauta Form */}
      {showQuickPauta && (
        <form
          onSubmit={handleQuickCreatePauta}
          className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Criar e Distribuir Pauta Integrada à Redação
              </h3>
              <p className="text-xs text-zinc-400">
                A pauta entra automaticamente no módulo Redação &amp; Cidadão e no Portal · Matérias.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickPauta(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
              aria-label="Fechar formulário de pauta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              required
              value={pautaTitle}
              onChange={(e) => setPautaTitle(e.target.value)}
              placeholder="Título / Assunto da pauta *"
              className="lg:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
            />
            <select
              value={pautaReporterId}
              onChange={(e) => setPautaReporterId(e.target.value)}
              aria-label="Selecionar repórter"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              <option value="">Redação Central (sem repórter fixo)</option>
              {activeReporters.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  Repórter: {rep.name} ({rep.city})
                </option>
              ))}
            </select>
            <select
              value={pautaCity}
              onChange={(e) => setPautaCity(e.target.value as CimbajuCity)}
              aria-label="Selecionar cidade da pauta"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              {NEWS_TERRITORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={pautaSeal}
              onChange={(e) => setPautaSeal(e.target.value as NewsSeal)}
              aria-label="Selecionar selo editorial"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              {NEWS_SEALS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={pautaFormat}
              onChange={(e) => setPautaFormat(e.target.value as EditorialPauta['format'])}
              aria-label="Selecionar formato editorial"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              <option value="Portal 24/7">Portal 24/7</option>
              <option value="Reportagem Investigativa">Reportagem Investigativa</option>
              <option value="Tabloide Quinzenal">Tabloide Quinzenal</option>
              <option value="Revista A4 Mensal">Revista A4 Mensal</option>
            </select>
            <input
              type="text"
              value={pautaSummary}
              onChange={(e) => setPautaSummary(e.target.value)}
              placeholder="Briefing / orientações de apuração para o repórter"
              className="lg:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowQuickPauta(false)}
              className="rounded-lg border border-white/15 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Criar e Distribuir
            </button>
          </div>
        </form>
      )}

      {/* Create/Edit Reporter Form */}
      {showReporterForm && canManageReporters && (
        <form
          onSubmit={handleSaveReporter}
          className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-semibold text-white">
              {editingReporterId ? 'Editar Cadastro do Repórter' : 'Cadastrar Novo Repórter'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowReporterForm(false);
                resetReporterForm();
              }}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
              aria-label="Fechar cadastro de repórter"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="Ex: João Pedro Almeida"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">WhatsApp / Telefone *</label>
              <input
                type="text"
                required
                value={repPhone}
                onChange={(e) => setRepPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">E-mail de Acesso</label>
              <input
                type="email"
                value={repEmail}
                onChange={(e) => setRepEmail(e.target.value)}
                placeholder="nome@jornalfortnews.com.br"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Praça / Cidade Principal</label>
              <select
                value={repCity}
                onChange={(e) => setRepCity(e.target.value as CimbajuCity)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              >
                {NEWS_TERRITORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Editoria / Cobertura</label>
              <input
                type="text"
                value={repBeat}
                onChange={(e) => setRepBeat(e.target.value)}
                placeholder="Ex: Política, Cidades, Esportes..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Observações</label>
              <input
                type="text"
                value={repNotes}
                onChange={(e) => setRepNotes(e.target.value)}
                placeholder="Disponibilidade, plantão, equipamento..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repActive}
                  onChange={(e) => setRepActive(e.target.checked)}
                  className="accent-[#fa6607]"
                />
                Repórter ativo para receber pautas
              </label>

              {!editingReporterId && (
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createLoginAccess}
                    onChange={(e) => setCreateLoginAccess(e.target.checked)}
                    className="accent-[#fa6607]"
                  />
                  Criar login no sistema (acesso à Redação e às próprias Fontes)
                </label>
              )}

              {!editingReporterId && createLoginAccess && (
                <input
                  type="text"
                  value={repPassword}
                  onChange={(e) => setRepPassword(e.target.value)}
                  placeholder="Senha inicial"
                  className="w-36 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReporterForm(false);
                  resetReporterForm();
                }}
                className="rounded-lg border border-white/15 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                {editingReporterId ? 'Salvar Alterações' : 'Salvar Repórter'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 1: DISTRIBUTION BOARD INTEGRATED WITH REDAÇÃO */}
      {activeTab === 'distribuicao' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar matéria, cidade, repórter ou protocolo..."
                className="w-full rounded-lg border border-white/10 bg-[#121215] py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por repórter"
                value={filterReporterId}
                onChange={(e) => setFilterReporterId(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#121215] px-3 py-2 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
              >
                <option value="Todos">Todos os Repórteres</option>
                <option value="SemRepórter">Sem Repórter Fixo</option>
                {reporters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por estágio na redação"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'Todos' | PautaStatus)}
                className="rounded-lg border border-white/10 bg-[#121215] px-3 py-2 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
              >
                <option value="Todos">Todos os Estágios</option>
                {PAUTA_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FloatingHorizontalScroll
            label="Rolagem lateral — Distribuição de Matérias"
            scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
          >
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Matéria &amp; Origem</th>
                  <th className="px-4 py-3 font-medium">Praça / Editoria</th>
                  <th className="px-4 py-3 font-medium">Repórter Designado</th>
                  <th className="px-4 py-3 font-medium">Estágio Redação</th>
                  <th className="px-4 py-3 font-medium">Aprovação Site</th>
                  <th className="px-4 py-3 font-medium text-right">Encaminhar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredPautas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                      Nenhuma matéria encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredPautas.map((pauta) => {
                    const matchedRep = matchReporterForPauta(pauta);
                    return (
                      <tr key={pauta.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3.5 max-w-sm">
                          <div className="font-medium text-white">{pauta.title}</div>
                          <div className="mt-0.5 text-[11px] text-zinc-400">
                            <span>{pauta.format}</span>
                            <span className="mx-1.5">·</span>
                            <span className="font-mono tabular-nums">{pauta.deadline}</span>
                            {pauta.sourceProtocol && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span className="font-mono text-[#D4AF37] tabular-nums">
                                  Fala Cidadão {pauta.sourceProtocol}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-zinc-200">{pauta.city}</div>
                          <div className="text-[11px] text-[#fa6607]">{pauta.seal}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <select
                            aria-label={`Distribuir matéria ${pauta.title}`}
                            value={matchedRep?.id ?? ''}
                            onChange={(e) => {
                              const nextId = e.target.value || null;
                              assignPautaToReporter(pauta.id, nextId);
                              const chosen = reporters.find((r) => r.id === nextId);
                              setFeedback(
                                chosen
                                  ? `Matéria "${pauta.title}" distribuída para ${chosen.name}.`
                                  : `Matéria "${pauta.title}" devolvida à fila geral da Redação.`
                              );
                            }}
                            className="rounded-md border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-white focus:border-[#fa6607] focus:outline-none cursor-pointer"
                          >
                            <option value="">Redação Central (sem repórter)</option>
                            {reporters.map((rep) => (
                              <option key={rep.id} value={rep.id}>
                                {rep.name} {!rep.active ? '(Inativo)' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <select
                            aria-label={`Estágio de ${pauta.title}`}
                            value={pauta.status}
                            onChange={(e) =>
                              updatePautaStatus(pauta.id, e.target.value as PautaStatus)
                            }
                            className="rounded-md border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none cursor-pointer"
                          >
                            {PAUTA_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              pauta.approvalStatus === 'Publicada no Site'
                                ? 'text-emerald-400'
                                : pauta.approvalStatus === 'Aprovada pelo Redator-Chefe'
                                  ? 'text-[#D4AF37]'
                                  : 'text-amber-400'
                            }`}
                          >
                            {pauta.approvalStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {matchedRep ? (
                            <a
                              href={buildBriefingWhatsAppUrl(pauta, matchedRep)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap"
                            >
                              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              WhatsApp Repórter
                            </a>
                          ) : (
                            <span className="text-[11px] text-zinc-500">Selecione um repórter</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </FloatingHorizontalScroll>
        </div>
      )}

      {/* TAB 2: REPORTERS DIRECTORY */}
      {activeTab === 'cadastro' && (
        <FloatingHorizontalScroll
          label="Rolagem lateral — Equipe de Repórteres"
          scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
        >
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Repórter</th>
                <th className="px-4 py-3 font-medium">Contato &amp; Acesso</th>
                <th className="px-4 py-3 font-medium">Praça / Cobertura</th>
                <th className="px-4 py-3 font-medium text-right">Pautas Ativas</th>
                <th className="px-4 py-3 font-medium text-right">Publicadas</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManageReporters && (
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {reporters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    Nenhum repórter cadastrado ainda. Clique em &quot;Cadastrar Repórter&quot; para iniciar.
                  </td>
                </tr>
              ) : (
                reporters.map((rep) => {
                  const stats = reporterStats.get(rep.id) ?? {
                    total: 0,
                    inProgress: 0,
                    published: 0,
                  };
                  const digits = sanitizeWhatsAppDigits(rep.phone);
                  return (
                    <tr key={rep.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fa6607]/15 text-[#fa6607]">
                            <UserCheck className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{rep.name}</div>
                            <div className="text-[11px] text-zinc-500">
                              Desde {rep.createdAt}
                              {rep.linkedUserId ? ' · Login vinculado' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-zinc-200 tabular-nums">{rep.phone}</div>
                        {rep.email && (
                          <div className="text-[11px] text-zinc-400">{rep.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-zinc-200">{rep.city}</div>
                        <div className="text-[11px] text-zinc-400">{rep.beat}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-amber-400 tabular-nums">
                        {stats.inProgress}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-emerald-400 tabular-nums">
                        {stats.published}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            rep.active ? 'text-emerald-400' : 'text-zinc-500'
                          }`}
                        >
                          {rep.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {canManageReporters && (
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {digits && (
                              <a
                                href={`https://wa.me/${digits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir WhatsApp do repórter"
                                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20"
                              >
                                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditReporter(rep)}
                              title="Editar repórter"
                              className="rounded-md border border-white/15 p-1.5 text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteReporter(rep.id);
                                setFeedback(`Repórter ${rep.name} removido do cadastro.`);
                              }}
                              title="Remover repórter"
                              className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </FloatingHorizontalScroll>
      )}
    </div>
  );
};
