import React, { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  FinancialCounterpartyRole,
  FinancialEntry,
  FinancialEntryType,
  FinancialPaymentStatus,
} from '../../types/fortmidia';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';

const ROLES: FinancialCounterpartyRole[] = [
  'Anunciante / Cliente',
  'Fornecedor',
  'Prestador de Serviço',
  'Apresentador / Repasse 50/50',
  'Estrutura & Operação',
];

const PAYMENT_STATUSES: FinancialPaymentStatus[] = ['Pago', 'Pendente', 'Atrasado'];

export const FinanceModule: React.FC = () => {
  const {
    contracts,
    studioBookings,
    financialEntries,
    addFinancialEntry,
    updateFinancialStatus,
    deleteFinancialEntry,
  } = useFortMidia();

  const [typeFilter, setTypeFilter] = useState<'Todos' | FinancialEntryType>('Todos');
  const [roleFilter, setRoleFilter] = useState<'Todos' | FinancialCounterpartyRole>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | FinancialPaymentStatus>('Todos');
  const [showNewForm, setShowNewForm] = useState(false);

  // New Entry Form
  const [entryType, setEntryType] = useState<FinancialEntryType>('Despesa');
  const [description, setDescription] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyRole, setCounterpartyRole] =
    useState<FinancialCounterpartyRole>('Fornecedor');
  const [costCenter, setCostCenter] = useState('Mídia Exterior OOH');
  const [dueDate, setDueDate] = useState('2026-11-25');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<FinancialPaymentStatus>('Pendente');
  const [paymentMethod, setPaymentMethod] =
    useState<FinancialEntry['paymentMethod']>('PIX');
  const [invoiceRef, setInvoiceRef] = useState('');

  // Consolidated Agency KPIs
  const activeContracts = contracts.filter((c) => c.status !== 'Encerrado');
  const contractualMRR = activeContracts.reduce((sum, c) => sum + c.monthlyValue, 0);

  const studioRevenue = studioBookings
    .filter((b) => b.bookingType === 'Locação Avulsa')
    .reduce((sum, b) => sum + b.durationHours * b.hourlyRate, 0);

  const totalReceivables = financialEntries
    .filter((f) => f.type === 'Receita')
    .reduce((sum, f) => sum + f.amount, 0);

  const realizedRevenue = financialEntries
    .filter((f) => f.type === 'Receita' && f.status === 'Pago')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalPayables = financialEntries
    .filter((f) => f.type === 'Despesa')
    .reduce((sum, f) => sum + f.amount, 0);

  const paidExpenses = financialEntries
    .filter((f) => f.type === 'Despesa' && f.status === 'Pago')
    .reduce((sum, f) => sum + f.amount, 0);

  const overdueAmount = financialEntries
    .filter((f) => f.status === 'Atrasado')
    .reduce((sum, f) => sum + f.amount, 0);

  const projectedNetMargin = totalReceivables + studioRevenue - totalPayables;
  const cashBalance = realizedRevenue + studioRevenue - paidExpenses;

  // Expenses breakdown by role (Fornecedores vs Prestadores vs Repasses 50/50 vs Estrutura)
  const expenseRoles = [
    'Fornecedor',
    'Prestador de Serviço',
    'Apresentador / Repasse 50/50',
    'Estrutura & Operação',
  ] as const;

  const expenseBreakdown = expenseRoles.map((role) => {
    const val = financialEntries
      .filter((f) => f.type === 'Despesa' && f.counterpartyRole === role)
      .reduce((sum, f) => sum + f.amount, 0);
    return { role, val };
  });
  const maxExpense = Math.max(...expenseBreakdown.map((e) => e.val), 1);

  const filteredEntries = financialEntries.filter((f) => {
    const mType = typeFilter === 'Todos' || f.type === typeFilter;
    const mRole = roleFilter === 'Todos' || f.counterpartyRole === roleFilter;
    const mStatus = statusFilter === 'Todos' || f.status === statusFilter;
    return mType && mRole && mStatus;
  });

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !counterpartyName.trim() || !amount) return;

    addFinancialEntry({
      type: entryType,
      description: description.trim(),
      counterpartyName: counterpartyName.trim(),
      counterpartyRole,
      costCenter,
      dueDate,
      amount: Number(amount) || 0,
      status,
      paymentMethod,
      invoiceRef: invoiceRef.trim() || undefined,
    });

    setDescription('');
    setCounterpartyName('');
    setAmount('');
    setInvoiceRef('');
    setShowNewForm(false);
  };

  const handleExportCSV = () => {
    const header = [
      'Tipo',
      'Descricao',
      'Favorecido_ou_Anunciante',
      'Categoria_Terceiro',
      'Centro_de_Custo',
      'Vencimento',
      'Valor_BRL',
      'Status',
      'Forma_Pagamento',
      'NF_Ref',
    ];
    const rows = financialEntries.map((f) =>
      [
        `"${f.type}"`,
        `"${f.description}"`,
        `"${f.counterpartyName}"`,
        `"${f.counterpartyRole}"`,
        `"${f.costCenter}"`,
        `"${f.dueDate}"`,
        f.amount.toFixed(2),
        `"${f.status}"`,
        `"${f.paymentMethod}"`,
        `"${f.invoiceRef || ''}"`,
      ].join(',')
    );

    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fortmidia_fluxo_caixa_agencia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Financeiro da Agência · Fluxo de Caixa, Fornecedores & Prestadores
          </h2>
          <p className="text-xs text-zinc-400">
            DRE gerencial com contas a receber de anunciantes, contas a pagar a fornecedores/prestadores, repasses 50/50 e conciliação de NF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#141417] px-4 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 text-[#FF6600]" aria-hidden="true" />
            Exportar Fluxo CSV
          </button>
          <button
            type="button"
            onClick={() => setShowNewForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {showNewForm ? 'Fechar Lançamento' : 'Novo Lançamento'}
          </button>
        </div>
      </div>

      {/* 4 Agency DRE KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
          <div className="text-xs text-zinc-400">Receita Contratual + Estúdio</div>
          <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            R$ {(contractualMRR + studioRevenue).toLocaleString('pt-BR')}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">
            Realizado em caixa: R$ {(realizedRevenue + studioRevenue).toLocaleString('pt-BR')}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
          <div className="text-xs text-zinc-400">Fornecedores, Prestadores & Repasses</div>
          <div className="mt-2 font-mono text-2xl font-bold text-amber-400 tabular-nums">
            R$ {totalPayables.toLocaleString('pt-BR')}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">
            Já liquidados: R$ {paidExpenses.toLocaleString('pt-BR')}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
          <div className="text-xs text-zinc-400">Resultado Líquido Projetado (DRE)</div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
              projectedNetMargin >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            R$ {projectedNetMargin.toLocaleString('pt-BR')}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">
            Saldo líquido atual: R$ {cashBalance.toLocaleString('pt-BR')}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
          <div className="text-xs text-zinc-400">Pendências / Títulos em Atraso</div>
          <div className="mt-2 font-mono text-2xl font-bold text-red-400 tabular-nums">
            R$ {overdueAmount.toLocaleString('pt-BR')}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            Requer cobrança ou baixa imediata
          </div>
        </div>
      </div>

      {/* New Financial Entry Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreateEntry}
          className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-white">
            Novo Lançamento Financeiro (Anunciante, Fornecedor ou Prestador)
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={entryType}
              onChange={(e) => {
                const nextType = e.target.value as FinancialEntryType;
                setEntryType(nextType);
                setCounterpartyRole(
                  nextType === 'Receita' ? 'Anunciante / Cliente' : 'Fornecedor'
                );
              }}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              <option value="Despesa">Despesa / Conta a Pagar</option>
              <option value="Receita">Receita / Conta a Receber</option>
            </select>

            <select
              value={counterpartyRole}
              onChange={(e) =>
                setCounterpartyRole(e.target.value as FinancialCounterpartyRole)
              }
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <input
              type="text"
              required
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              placeholder="Nome (Fornecedor, Prestador ou Cliente) *"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
            />

            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do lançamento *"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              <option value="Mídia Exterior OOH">Mídia Exterior OOH</option>
              <option value="FortNews Podcast">FortNews Podcast</option>
              <option value="Portal FortNews">Portal FortNews</option>
              <option value="Divisão de Impressos">Divisão de Impressos</option>
              <option value="Agência & Consultoria 360°">Agência & Consultoria 360°</option>
              <option value="Administrativo Matriz">Administrativo Matriz</option>
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#FF6600] focus:outline-none"
            />

            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor (R$) *"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white focus:border-[#FF6600] focus:outline-none"
            />

            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as FinancialEntry['paymentMethod'])
              }
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              <option value="PIX">PIX</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência">Transferência</option>
              <option value="Cartão Corporativo">Cartão Corporativo</option>
            </select>

            <input
              type="text"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="NF / RPA / Recibo (opcional)"
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FinancialPaymentStatus)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              {PAYMENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  Status: {st}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                Registrar Lançamento
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Cost Center & Supplier/Freelancer Allocation Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#111114] p-6">
          <h3 className="font-display text-base font-bold text-white">
            Estrutura de Custos & Repasses da Agência
          </h3>
          <p className="text-xs text-zinc-400 mb-5">
            Distribuição de pagamentos entre fornecedores, prestadores MEI/PJ e comissão 50/50
          </p>

          <div className="space-y-4">
            {expenseBreakdown.map(({ role, val }) => {
              const pct = Math.round((val / maxExpense) * 100);
              return (
                <div key={role} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-200 truncate pr-2">{role}</span>
                    <span className="font-mono font-semibold text-white tabular-nums shrink-0">
                      R$ {val.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-[#FF6600]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Split + Quick Advertiser Summary */}
        <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#111114] p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Desempenho de Anunciantes & Regra de Compliance
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Contratos ativos com retenção 100% matriz vs captações próprias 50/50
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-zinc-400">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Anunciante</th>
                    <th className="py-2 px-3 font-medium">Impacto Mensal</th>
                    <th className="py-2 px-3 font-medium text-right">Bruto</th>
                    <th className="py-2 pl-3 font-medium text-right">Líquido Matriz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {activeContracts.map((c) => {
                    const isSplit = c.origin === 'Captação Própria (50/50)';
                    const net = isSplit ? c.monthlyValue * 0.5 : c.monthlyValue;
                    return (
                      <tr key={c.id}>
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-white">{c.clientName}</div>
                          <div className="text-[11px] text-zinc-500">{c.origin}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-300 tabular-nums whitespace-nowrap">
                          {c.impressionsEstimate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-zinc-300 tabular-nums whitespace-nowrap">
                          R$ {c.monthlyValue.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono font-semibold text-emerald-400 tabular-nums whitespace-nowrap">
                          R$ {net.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Full Ledger Table (Contas a Receber e Pagar) */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="font-display text-base font-bold text-white">
            Livro-Caixa Operacional ({filteredEntries.length} lançamentos)
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <div className="inline-flex rounded-lg border border-white/10 bg-[#121215] p-1">
              {(['Todos', 'Receita', 'Despesa'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-md px-3 py-1 text-xs font-medium cursor-pointer ${
                    typeFilter === t ? 'bg-[#FF6600] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Counterparty Role Filter */}
            <select
              aria-label="Filtrar por categoria de terceiro"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as 'Todos' | FinancialCounterpartyRole)
              }
              className="rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#FF6600] focus:outline-none"
            >
              <option value="Todos">Todos os Terceiros</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filtrar por status de pagamento"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'Todos' | FinancialPaymentStatus)
              }
              className="rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#FF6600] focus:outline-none"
            >
              <option value="Todos">Todos os Status</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FloatingHorizontalScroll
          label="Rolagem lateral — Fluxo Financeiro"
          scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
        >
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Lançamento & NF</th>
                <th className="px-4 py-3 font-medium">Fornecedor / Prestador / Cliente</th>
                <th className="px-4 py-3 font-medium">Centro de Custo</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                    Nenhum lançamento encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                        <span
                          className={
                            entry.type === 'Receita' ? 'text-emerald-400' : 'text-[#FF6600]'
                          }
                        >
                          {entry.type}
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-400">{entry.paymentMethod}</span>
                        {entry.invoiceRef && (
                          <>
                            <span className="text-zinc-500">·</span>
                            <span className="text-[#D4AF37]">{entry.invoiceRef}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-0.5 font-medium text-white">{entry.description}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-zinc-200 font-medium">{entry.counterpartyName}</div>
                      <div className="text-[11px] text-zinc-400">{entry.counterpartyRole}</div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300 whitespace-nowrap">
                      {entry.costCenter}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-400 tabular-nums whitespace-nowrap">
                      {entry.dueDate}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        entry.type === 'Receita' ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {entry.type === 'Receita' ? '+' : '-'} R${' '}
                      {entry.amount.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        aria-label={`Status de ${entry.description}`}
                        value={entry.status}
                        onChange={(e) =>
                          updateFinancialStatus(
                            entry.id,
                            e.target.value as FinancialPaymentStatus
                          )
                        }
                        className={`rounded-md border bg-[#0A0A0A] px-2.5 py-1 text-xs font-medium focus:outline-none cursor-pointer ${
                          entry.status === 'Pago'
                            ? 'border-emerald-500/40 text-emerald-400'
                            : entry.status === 'Pendente'
                              ? 'border-amber-500/40 text-amber-400'
                              : 'border-red-500/40 text-red-400'
                        }`}
                      >
                        {PAYMENT_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteFinancialEntry(entry.id)}
                        aria-label={`Excluir lançamento ${entry.description}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FloatingHorizontalScroll>
      </div>
    </div>
  );
};
