import React, { useMemo, useState } from 'react';
import {
  Download,
  History,
  Lock,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { PresetAuditAction, PresetAuditScope } from '../../types/fortmidia';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';

const ACTION_OPTIONS: ('Todas' | PresetAuditAction)[] = [
  'Todas',
  'Criou',
  'Alterou',
  'Carregou',
  'Travou',
  'Destravou',
  'Excluiu',
  'Tentativa Bloqueada',
];

const SCOPE_OPTIONS: ('Todos' | PresetAuditScope)[] = [
  'Todos',
  'Layout Global',
  'CMS Portais',
  'Estúdio Marketing',
];

export const AuditLogModule: React.FC = () => {
  const {
    presetAuditLogs,
    clearPresetAuditLogs,
    teamMembers,
    activeAdminUserId,
  } = useFortMidia();

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1;

  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'Todas' | PresetAuditAction>('Todas');
  const [scopeFilter, setScopeFilter] = useState<'Todos' | PresetAuditScope>('Todos');

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presetAuditLogs.filter((entry) => {
      if (actionFilter !== 'Todas' && entry.action !== actionFilter) return false;
      if (scopeFilter !== 'Todos' && entry.presetScope !== scopeFilter) return false;
      if (!q) return true;
      return (
        entry.actorId.toLowerCase().includes(q) ||
        entry.actorName.toLowerCase().includes(q) ||
        entry.presetName.toLowerCase().includes(q) ||
        entry.presetId.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
      );
    });
  }, [presetAuditLogs, query, actionFilter, scopeFilter]);

  const blockedCount = presetAuditLogs.filter((l) => l.action === 'Tentativa Bloqueada').length;
  const changesCount = presetAuditLogs.filter(
    (l) => l.action === 'Criou' || l.action === 'Alterou' || l.action === 'Excluiu'
  ).length;
  const uniqueActorsCount = new Set(presetAuditLogs.map((l) => l.actorId)).size;

  const handleExportCsv = () => {
    const header = [
      'ID Registro',
      'Timestamp',
      'ID Usuário Admin',
      'Operador',
      'Perfil',
      'Ação',
      'Escopo',
      'ID Preset',
      'Nome do Preset',
      'Detalhes',
    ];
    const rows = filteredLogs.map((l) =>
      [
        l.id,
        l.timestamp,
        l.actorId,
        l.actorName,
        l.actorRole,
        l.action,
        l.presetScope,
        l.presetId,
        l.presetName,
        l.details,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';')
    );
    const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FortMidia_Auditoria_Presets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionTone = (action: PresetAuditAction) => {
    switch (action) {
      case 'Criou':
        return 'text-emerald-400';
      case 'Alterou':
        return 'text-sky-400';
      case 'Carregou':
        return 'text-[#FF6600]';
      case 'Travou':
        return 'text-[#D4AF37]';
      case 'Destravou':
        return 'text-amber-300';
      case 'Excluiu':
      case 'Tentativa Bloqueada':
        return 'text-red-400';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">
            Log de Auditoria de Presets &amp; Rastreabilidade
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Histórico completo com timestamp e ID do usuário administrador de todas as criações, alterações, carregamentos, travas, exclusões e tentativas bloqueadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Exportar CSV
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={clearPresetAuditLogs}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Arquivar Log Antigo
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">Eventos Auditados</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {presetAuditLogs.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">Mutações (Criar / Editar / Excluir)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#FF6600] tabular-nums">
            {changesCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">Tentativas Bloqueadas</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-400 tabular-nums">
            {blockedCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">IDs de Usuários Rastreados</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#D4AF37] tabular-nums">
            {uniqueActorsCount}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111114] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por ID do usuário (ex: usr-01), nome ou preset..."
            className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] pl-9 pr-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por ação"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as 'Todas' | PresetAuditAction)}
            className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 cursor-pointer"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Ação: {opt}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por escopo de preset"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as 'Todos' | PresetAuditScope)}
            className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 cursor-pointer"
          >
            {SCOPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Escopo: {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <FloatingHorizontalScroll
        label="Rolagem lateral — Log de Auditoria"
        scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
      >
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <History className="mx-auto h-7 w-7 text-zinc-600" aria-hidden="true" />
            <div className="text-sm font-semibold text-white">Nenhum evento encontrado</div>
            <p className="text-xs text-zinc-400">
              Ajuste os filtros ou realize alterações nos presets globais, CMS ou Estúdio Marketing.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">ID Admin &amp; Operador</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Ação</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Escopo</th>
                <th className="px-4 py-3 font-medium">Preset Alvo</th>
                <th className="px-4 py-3 font-medium">Detalhes de Rastreabilidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-zinc-300 tabular-nums whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#D4AF37] tabular-nums">
                        {entry.actorId}
                      </span>
                      <span className="font-semibold text-white">{entry.actorName}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{entry.actorRole}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 font-semibold ${getActionTone(entry.action)}`}>
                      {entry.action === 'Tentativa Bloqueada' && (
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {entry.action === 'Travou' && (
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{entry.presetScope}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{entry.presetName}</div>
                    <div className="font-mono text-[10px] text-zinc-500">{entry.presetId}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 leading-relaxed min-w-[240px]">
                    {entry.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </FloatingHorizontalScroll>
    </div>
  );
};
