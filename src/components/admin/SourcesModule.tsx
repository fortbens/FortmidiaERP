import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  Lock,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { CimbajuCity, JournalisticSource } from '../../types/fortmidia';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';

const SOURCE_CATEGORIES = [
  'Liderança Comunitária',
  'Servidor / Órgão Público',
  'Saúde e Educação',
  'Segurança Pública',
  'Economia & Comércio',
  'Política / Bastidores',
  'Transporte & Infraestrutura',
  'Outros',
];

function sanitizeWhatsAppDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export const SourcesModule: React.FC = () => {
  const {
    journalisticSources,
    teamMembers,
    activeAdminUserId,
    addJournalisticSource,
    updateJournalisticSource,
    deleteJournalisticSource,
  } = useFortMidia();

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1;

  // STRICT VISIBILITY RULE:
  // Only the reporter who registered the source AND Super Admin can see it.
  const visibleSources = useMemo(() => {
    if (isSuperAdmin) return journalisticSources;
    return journalisticSources.filter((s) => s.ownerUserId === activeOperator?.id);
  }, [journalisticSources, isSuperAdmin, activeOperator?.id]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<CimbajuCity>('Franco da Rocha');
  const [neighborhood, setNeighborhood] = useState('');
  const [category, setCategory] = useState(SOURCE_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState(activeOperator?.id || 'usr-01');

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<'Todas' | CimbajuCity>('Todas');
  const [ownerFilter, setOwnerFilter] = useState<string>('Todos');
  const [feedback, setFeedback] = useState<string | null>(null);

  const uniqueOwners = useMemo(() => {
    const map = new Map<string, string>();
    visibleSources.forEach((s) => map.set(s.ownerUserId, s.ownerName));
    return Array.from(map.entries());
  }, [visibleSources]);

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleSources.filter((src) => {
      const okCity = cityFilter === 'Todas' || src.city === cityFilter;
      const okOwner = !isSuperAdmin || ownerFilter === 'Todos' || src.ownerUserId === ownerFilter;
      const okSearch =
        !q ||
        src.name.toLowerCase().includes(q) ||
        src.phone.toLowerCase().includes(q) ||
        src.city.toLowerCase().includes(q) ||
        (src.neighborhood || '').toLowerCase().includes(q) ||
        (src.notes || '').toLowerCase().includes(q);
      return okCity && okOwner && okSearch;
    });
  }, [visibleSources, cityFilter, ownerFilter, isSuperAdmin, searchQuery]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setCity('Franco da Rocha');
    setNeighborhood('');
    setCategory(SOURCE_CATEGORIES[0]);
    setNotes('');
    setSelectedOwnerId(activeOperator?.id || 'usr-01');
  };

  const openEdit = (src: JournalisticSource) => {
    setEditingId(src.id);
    setName(src.name);
    setPhone(src.phone);
    setCity(src.city);
    setNeighborhood(src.neighborhood || '');
    setCategory(src.category || SOURCE_CATEGORIES[0]);
    setNotes(src.notes || '');
    setSelectedOwnerId(src.ownerUserId);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const ownerUser = teamMembers.find((m) => m.id === selectedOwnerId);

    if (editingId) {
      const ok = updateJournalisticSource(editingId, {
        name: name.trim(),
        phone: phone.trim(),
        city,
        neighborhood: neighborhood.trim() || undefined,
        category,
        notes: notes.trim() || undefined,
        ...(isSuperAdmin && ownerUser
          ? { ownerUserId: ownerUser.id, ownerName: ownerUser.name }
          : {}),
      });
      setFeedback(
        ok
          ? `Fonte "${name.trim()}" atualizada com sigilo preservado.`
          : 'Apenas o repórter responsável ou o Super Admin pode editar esta fonte.'
      );
    } else {
      addJournalisticSource({
        name: name.trim(),
        phone: phone.trim(),
        city,
        neighborhood: neighborhood.trim() || undefined,
        category,
        notes: notes.trim() || undefined,
        ...(isSuperAdmin && ownerUser
          ? { ownerUserId: ownerUser.id, ownerName: ownerUser.name }
          : {}),
      });
      setFeedback(`Fonte "${name.trim()}" cadastrada com acesso restrito ao responsável e Super Admin.`);
    }

    resetForm();
    setShowForm(false);
  };

  const handleDelete = (src: JournalisticSource) => {
    const ok = deleteJournalisticSource(src.id);
    if (ok) {
      setFeedback(`Fonte "${src.name}" removida da base sigilosa.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Fontes Jornalísticas · Cadastro Sigiloso
          </h2>
          <p className="text-xs text-zinc-400">
            Agenda restrita de fontes com nome, telefone e cidade — protegida por sigilo de autoria.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova Fonte
        </button>
      </div>

      {/* Privacy Policy Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-400/[0.06] px-4 py-3.5 text-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            {isSuperAdmin ? (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Lock className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="font-semibold text-amber-200">
              {isSuperAdmin
                ? 'Visão Super Admin · Auditoria Completa de Fontes'
                : 'Sigilo de Fonte Ativo · Acesso Exclusivo do Repórter'}
            </div>
            <p className="text-[11px] text-zinc-300 mt-0.5">
              {isSuperAdmin
                ? `Você visualiza todas as ${visibleSources.length} fonte(s) cadastradas pela equipe. Cada repórter enxerga apenas as próprias fontes.`
                : `Conectado como ${activeOperator?.name}. Apenas você e o Super Admin têm acesso às fontes cadastradas nesta conta.`}
            </p>
          </div>
        </div>
        <div className="font-mono text-xs text-amber-300 tabular-nums whitespace-nowrap shrink-0">
          {visibleSources.length} fonte(s) visível(is)
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

      {/* Add / Edit Source Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? 'Editar Fonte Jornalística' : 'Cadastrar Nova Fonte'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
              aria-label="Fechar cadastro de fonte"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Nome da Fonte *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome ou codinome da fonte"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Cidade *</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as CimbajuCity)}
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
              <label className="block text-[11px] text-zinc-400 mb-1">Bairro / Órgão (opcional)</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Centro, Câmara, UBS..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Área / Segmento</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              >
                {SOURCE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {isSuperAdmin ? (
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Repórter Responsável (Proprietário)
                </label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Cadastrado por</label>
                <input
                  type="text"
                  disabled
                  value={activeOperator?.name || ''}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A]/70 px-3 py-2 text-xs text-zinc-400"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              Anotações Sigilosas (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Assuntos que esta fonte acompanha, melhor horário de contato ou restrição de off..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-white/15 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
            >
              {editingId ? 'Salvar Alterações' : 'Salvar Fonte'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filters */}
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
            placeholder="Buscar fonte por nome, telefone ou cidade..."
            className="w-full rounded-lg border border-white/10 bg-[#121215] py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar fontes por cidade"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value as 'Todas' | CimbajuCity)}
            className="rounded-lg border border-white/10 bg-[#121215] px-3 py-2 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
          >
            <option value="Todas">Todas as Cidades</option>
            {NEWS_TERRITORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {isSuperAdmin && uniqueOwners.length > 0 && (
            <select
              aria-label="Filtrar fontes por repórter responsável"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#121215] px-3 py-2 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
            >
              <option value="Todos">Todos os Repórteres</option>
              {uniqueOwners.map(([ownerId, ownerName]) => (
                <option key={ownerId} value={ownerId}>
                  {ownerName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sources Table */}
      <FloatingHorizontalScroll
        label="Rolagem lateral — Fontes Jornalísticas"
        scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
      >
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nome da Fonte</th>
              <th className="px-4 py-3 font-medium">Telefone / WhatsApp</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              {isSuperAdmin && <th className="px-4 py-3 font-medium">Cadastrado por</th>}
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredSources.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-10 text-center text-zinc-400">
                  <div>Nenhuma fonte cadastrada para os filtros atuais.</div>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Cadastrar Primeira Fonte
                  </button>
                </td>
              </tr>
            ) : (
              filteredSources.map((src) => {
                const digits = sanitizeWhatsAppDigits(src.phone);
                return (
                  <tr key={src.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="font-semibold text-white">{src.name}</div>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {src.category || 'Fonte Geral'}
                        {src.neighborhood ? ` · ${src.neighborhood}` : ''}
                        <span className="mx-1.5">·</span>
                        <span className="font-mono tabular-nums">{src.createdAt}</span>
                      </div>
                      {src.notes && (
                        <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{src.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <a
                        href={`tel:${src.phone.replace(/\D/g, '')}`}
                        className="inline-flex items-center gap-1.5 font-mono text-zinc-200 hover:text-[#fa6607] tabular-nums"
                      >
                        <Phone className="h-3 w-3 text-zinc-500" aria-hidden="true" />
                        {src.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-zinc-200">{src.city}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3.5 whitespace-nowrap text-zinc-300">
                        {src.ownerName}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {digits && (
                          <a
                            href={`https://wa.me/${digits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"
                          >
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(src)}
                          title="Editar fonte"
                          className="rounded-md border border-white/15 p-1.5 text-zinc-300 hover:bg-white/5 hover:text-white cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(src)}
                          title="Excluir fonte"
                          className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </FloatingHorizontalScroll>
    </div>
  );
};
