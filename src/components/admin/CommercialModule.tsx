import React, { useState } from 'react';
import { Check, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  CaptationOrigin,
  CimbajuCity,
  CommercialContract,
  CommercialLead,
  ContractStatus,
} from '../../types/fortmidia';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';

const STATUS_OPTIONS: ContractStatus[] = ['Ativo', 'Em Instalação', 'Em Renovação', 'Encerrado'];
const PILLAR_OPTIONS = [
  'Mídia Exterior OOH',
  'FortNews Podcast (16h–20h)',
  'Portal FortNews + Revista A4',
  'Agência & Consultoria 360°',
];

export const CommercialModule: React.FC = () => {
  const {
    contracts,
    leads,
    addContract,
    updateContract,
    updateContractStatus,
    deleteContract,
    updateLead,
    updateLeadStatus,
    deleteLead,
    teamMembers,
    activeAdminUserId,
  } = useFortMidia();
  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const canEdit =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.role === 'Administrador' ||
    activeOperator.hierarchyLevel === 1 ||
    activeOperator.hierarchyLevel === 2 ||
    Boolean(activeOperator.permissions?.canEdit);
  const canDelete =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1 ||
    Boolean(activeOperator.permissions?.canDelete);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | ContractStatus>('Todos');
  const [showNewForm, setShowNewForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New contract form state
  const [clientName, setClientName] = useState('');
  const [segment, setSegment] = useState('Varejo & Comércio');
  const [pillar, setPillar] = useState('Mídia Exterior OOH');
  const [city, setCity] = useState<CimbajuCity>('Franco da Rocha');
  const [planName, setPlanName] = useState('Circuito Outdoor Bimestral');
  const [monthlyValue, setMonthlyValue] = useState('4600');
  const [origin, setOrigin] = useState<CaptationOrigin>('Captação da Casa (100%)');
  const [oohPoint, setOohPoint] = useState('');

  // Admin edit modals
  const [editingContract, setEditingContract] = useState<CommercialContract | null>(null);
  const [editingLead, setEditingLead] = useState<CommercialLead | null>(null);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 3200);
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
    const matchesQuery =
      !search.trim() ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.pillar.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    addContract({
      clientName: clientName.trim(),
      segment,
      pillar,
      city,
      planName,
      monthlyValue: Number(monthlyValue) || 0,
      origin,
      oohPoint: oohPoint.trim() || undefined,
      status: 'Ativo',
      startDate: new Date().toLocaleDateString('pt-BR'),
      endDate: '17/05/2027',
      impressionsEstimate: '95 mil / mês',
    });

    setClientName('');
    setOohPoint('');
    setShowNewForm(false);
    flash('Novo contrato comercial registrado com sucesso.');
  };

  const handleSaveContractEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract || !editingContract.clientName.trim()) return;
    updateContract(editingContract.id, {
      clientName: editingContract.clientName.trim(),
      segment: editingContract.segment.trim(),
      pillar: editingContract.pillar,
      city: editingContract.city,
      planName: editingContract.planName.trim(),
      monthlyValue: Number(editingContract.monthlyValue) || 0,
      origin: editingContract.origin,
      oohPoint: editingContract.oohPoint?.trim() || undefined,
      status: editingContract.status,
      startDate: editingContract.startDate.trim(),
      endDate: editingContract.endDate.trim(),
      impressionsEstimate: editingContract.impressionsEstimate.trim(),
    });
    flash(`Contrato "${editingContract.clientName}" atualizado pelo perfil administrativo.`);
    setEditingContract(null);
  };

  const handleSaveLeadEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !editingLead.companyOrName.trim()) return;
    updateLead(editingLead.id, {
      companyOrName: editingLead.companyOrName.trim(),
      contact: editingLead.contact.trim(),
      city: editingLead.city,
      quotaTitle: editingLead.quotaTitle.trim(),
      notes: editingLead.notes.trim(),
      status: editingLead.status,
    });
    flash(`Lead "${editingLead.companyOrName}" atualizado.`);
    setEditingLead(null);
  };

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Gestão Comercial, Contratos &amp; Outdoors
          </h2>
          <p className="text-xs text-zinc-400">
            Controle e edição administrativa de patrocinadores ativos, pontos OOH no CIMBAJU e leads recebidos pelo portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showNewForm ? 'Fechar Cadastro' : 'Novo Contrato'}
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200"
        >
          <Check className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Inline New Contract Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreateContract}
          className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-white">Registrar Novo Contrato Comercial</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Cliente / Anunciante *"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
            />
            <input
              type="text"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="Segmento"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            />
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              {PILLAR_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value as CimbajuCity)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              {NEWS_TERRITORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Cota / Plano"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(e.target.value)}
              placeholder="Valor Mensal (R$)"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#fa6607] focus:outline-none"
            />
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value as CaptationOrigin)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
            >
              <option value="Captação da Casa (100%)">Captação da Casa (100%)</option>
              <option value="Captação Própria (50/50)">Captação Própria (50/50)</option>
            </select>
            <input
              type="text"
              value={oohPoint}
              onChange={(e) => setOohPoint(e.target.value)}
              placeholder="Ponto OOH / Observação"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
            >
              Salvar Contrato
            </button>
          </div>
        </form>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, cidade ou pilar..."
            className="w-full rounded-lg border border-white/10 bg-[#121215] pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#121215] p-1">
          {(['Todos', ...STATUS_OPTIONS] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === st ? 'bg-[#fa6607] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts High-Density Table */}
      <FloatingHorizontalScroll
        label="Rolagem lateral — Contratos Comerciais"
        scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
      >
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Anunciante / Segmento</th>
              <th className="px-4 py-3 font-medium">Pilar &amp; Ponto OOH</th>
              <th className="px-4 py-3 font-medium">Município</th>
              <th className="px-4 py-3 font-medium">Modelo Repasse</th>
              <th className="px-4 py-3 font-medium text-right">Valor Mensal</th>
              <th className="px-4 py-3 font-medium">Status Campanha</th>
              {(canEdit || canDelete) && (
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={canEdit || canDelete ? 7 : 6} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum contrato localizado com os filtros atuais.
                </td>
              </tr>
            ) : (
              filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-white">{contract.clientName}</div>
                    <div className="text-[11px] text-zinc-400">
                      {contract.segment} · {contract.planName}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-zinc-200">{contract.pillar}</div>
                    {contract.oohPoint && (
                      <div className="text-[11px] text-zinc-400">{contract.oohPoint}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300 whitespace-nowrap">{contract.city}</td>
                  <td className="px-4 py-3.5 text-zinc-300 whitespace-nowrap">{contract.origin}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-white tabular-nums whitespace-nowrap">
                    R$ {contract.monthlyValue.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      aria-label={`Alterar status de ${contract.clientName}`}
                      value={contract.status}
                      onChange={(e) =>
                        updateContractStatus(contract.id, e.target.value as ContractStatus)
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium bg-[#0A0A0A] focus:outline-none cursor-pointer ${
                        contract.status === 'Ativo'
                          ? 'border-emerald-500/40 text-emerald-400'
                          : contract.status === 'Em Instalação'
                            ? 'border-[#fa6607]/40 text-[#fa6607]'
                            : contract.status === 'Em Renovação'
                              ? 'border-amber-500/40 text-amber-400'
                              : 'border-white/15 text-zinc-400'
                      }`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditingContract({ ...contract })}
                            title="Editar contrato (Admin)"
                            className="inline-flex items-center gap-1 rounded-md border border-[#fa6607]/40 bg-[#fa6607]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteContract(contract.id)}
                            title="Excluir contrato"
                            className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FloatingHorizontalScroll>

      {/* Incoming Leads from Public Portal */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-white">
            Leads Comerciais Recebidos pelo Portal ({leads.length})
          </h3>
          <span className="text-xs text-zinc-400">Sincronizado com Vitrine de Cotas</span>
        </div>

        <FloatingHorizontalScroll
          label="Rolagem lateral — Leads Comerciais"
          scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
        >
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa / Contato</th>
                <th className="px-4 py-3 font-medium">Cota Solicitada</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Recebido em</th>
                <th className="px-4 py-3 font-medium">Funil</th>
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{lead.companyOrName}</div>
                    <div className="text-[11px] text-zinc-400">{lead.contact}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-200">{lead.quotaTitle}</div>
                    <div className="text-[11px] text-zinc-500 truncate max-w-xs">{lead.notes}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{lead.city}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400 tabular-nums whitespace-nowrap">
                    {lead.createdAt}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Status do lead ${lead.companyOrName}`}
                      value={lead.status}
                      onChange={(e) =>
                        updateLeadStatus(lead.id, e.target.value as CommercialLead['status'])
                      }
                      className="rounded-md border border-white/15 bg-[#0A0A0A] px-2.5 py-1 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none cursor-pointer"
                    >
                      <option value="Novo Lead">Novo Lead</option>
                      <option value="Em Negociação">Em Negociação</option>
                      <option value="Proposta Enviada">Proposta Enviada</option>
                      <option value="Fechado">Fechado</option>
                    </select>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setEditingLead({ ...lead })}
                            title="Editar lead (Admin)"
                            className="inline-flex items-center gap-1 rounded-md border border-[#fa6607]/40 bg-[#fa6607]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteLead(lead.id)}
                            title="Excluir lead"
                            className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </FloatingHorizontalScroll>
      </div>

      {/* Admin Edit Contract Modal */}
      {editingContract && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-contract-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveContractEdit}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#fa6607]">
                  Edição Administrativa de Contrato
                </div>
                <h3 id="edit-contract-title" className="mt-0.5 font-display text-lg font-bold text-white">
                  {editingContract.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                aria-label="Fechar edição de contrato"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Anunciante / Cliente *</label>
                <input
                  type="text"
                  required
                  value={editingContract.clientName}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, clientName: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Segmento</label>
                <input
                  type="text"
                  value={editingContract.segment}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, segment: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Pilar Comercial</label>
                <select
                  value={editingContract.pillar}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, pillar: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {PILLAR_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  {!PILLAR_OPTIONS.includes(editingContract.pillar) && (
                    <option value={editingContract.pillar}>{editingContract.pillar}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Município</label>
                <select
                  value={editingContract.city}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, city: e.target.value as CimbajuCity })
                  }
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
                <label className="block text-[11px] text-zinc-400 mb-1">Cota / Plano</label>
                <input
                  type="text"
                  value={editingContract.planName}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, planName: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Valor Mensal (R$)</label>
                <input
                  type="number"
                  min="0"
                  value={editingContract.monthlyValue}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      monthlyValue: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Modelo de Repasse</label>
                <select
                  value={editingContract.origin}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      origin: e.target.value as CaptationOrigin,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  <option value="Captação da Casa (100%)">Captação da Casa (100%)</option>
                  <option value="Captação Própria (50/50)">Captação Própria (50/50)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Status da Campanha</label>
                <select
                  value={editingContract.status}
                  onChange={(e) =>
                    setEditingContract({
                      ...editingContract,
                      status: e.target.value as ContractStatus,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">Ponto OOH / Observação</label>
                <input
                  type="text"
                  value={editingContract.oohPoint || ''}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, oohPoint: e.target.value })
                  }
                  placeholder="Ex: Av. Prefeito Hirant Sanazar — Painel 04"
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Início Vigência</label>
                <input
                  type="text"
                  value={editingContract.startDate}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, startDate: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Fim Vigência</label>
                <input
                  type="text"
                  value={editingContract.endDate}
                  onChange={(e) =>
                    setEditingContract({ ...editingContract, endDate: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Edit Lead Modal */}
      {editingLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-lead-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveLeadEdit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#fa6607]">
                  Edição Administrativa de Lead
                </div>
                <h3 id="edit-lead-title" className="mt-0.5 font-display text-lg font-bold text-white">
                  {editingLead.companyOrName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                aria-label="Fechar edição de lead"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Empresa / Nome *</label>
                <input
                  type="text"
                  required
                  value={editingLead.companyOrName}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, companyOrName: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Contato / WhatsApp / E-mail</label>
                  <input
                    type="text"
                    value={editingLead.contact}
                    onChange={(e) => setEditingLead({ ...editingLead, contact: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Cidade</label>
                  <select
                    value={editingLead.city}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, city: e.target.value as CimbajuCity })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  >
                    {NEWS_TERRITORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Cota Solicitada</label>
                  <input
                    type="text"
                    value={editingLead.quotaTitle}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, quotaTitle: e.target.value })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Status no Funil</label>
                  <select
                    value={editingLead.status}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        status: e.target.value as CommercialLead['status'],
                      })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                  >
                    <option value="Novo Lead">Novo Lead</option>
                    <option value="Em Negociação">Em Negociação</option>
                    <option value="Proposta Enviada">Proposta Enviada</option>
                    <option value="Fechado">Fechado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Observações Comerciais</label>
                <textarea
                  rows={3}
                  value={editingLead.notes}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Salvar Lead
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
