import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Kanban,
  MapPin,
  MessageSquare,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { CimbajuCity, ClientKanbanStage, ClientServiceTask } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';
import { OFFICIAL_FORTMIDIA_LOGO_URL } from '../FortMidiaLogo';

interface ClientPortalBoardProps {
  onBackToPortal?: () => void;
  adminMode?: boolean;
  lockedClientName?: string;
}

const KANBAN_COLUMNS: {
  stage: ClientKanbanStage;
  accent: string;
  subtitle: string;
}[] = [
  {
    stage: 'Briefing & Material',
    accent: '#71717A',
    subtitle: 'Recebimento de pauta, fotos e logos',
  },
  {
    stage: 'Em Produção / Arte',
    accent: '#3B82F6',
    subtitle: 'Estúdio, edição ou criação gráfica',
  },
  {
    stage: 'Aprovação do Cliente',
    accent: '#F59E0B',
    subtitle: 'Aguardando seu OK final',
  },
  {
    stage: 'Em Veiculação / No Ar',
    accent: '#fa6607',
    subtitle: 'Ativo em Outdoor, Podcast ou Portal',
  },
  {
    stage: 'Checking & Concluído',
    accent: '#10B981',
    subtitle: 'Entregue com comprovação fotográfica',
  },
];

export const ClientPortalBoard: React.FC<ClientPortalBoardProps> = ({
  onBackToPortal,
  adminMode = false,
  lockedClientName,
}) => {
  const {
    clientTasks,
    siteSettings,
    teamMembers,
    addClientTask,
    updateClientTask,
    moveClientTaskStage,
    toggleClientChecklistItem,
    deleteClientTask,
  } = useFortMidia();

  const distinctClients = useMemo(
    () => Array.from(new Set(clientTasks.map((t) => t.clientName))),
    [clientTasks]
  );

  const [selectedClient, setSelectedClient] = useState<string>(
    lockedClientName || (adminMode ? 'Todos' : distinctClients[0] || 'Todos')
  );
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [activeCard, setActiveCard] = useState<ClientServiceTask | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Admin Create Card State
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newClientName, setNewClientName] = useState('Auto Shopping Franco');
  const [newTitle, setNewTitle] = useState('');
  const [newServiceType, setNewServiceType] = useState('Outdoor OOH');
  const [newCity, setNewCity] = useState<CimbajuCity>('Franco da Rocha');
  const [newDueDate, setNewDueDate] = useState('2026-12-10');
  const [newPriority, setNewPriority] = useState<ClientServiceTask['priority']>('Alta');
  const [newAssignee, setNewAssignee] = useState('Emerson Carneiro');
  const [newDescription, setNewDescription] = useState('');
  const [newOutdoorCode, setNewOutdoorCode] = useState('');

  const showTempNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const visibleTasks = useMemo(() => {
    if (lockedClientName) {
      return clientTasks.filter((t) => t.clientName === lockedClientName);
    }
    const code = accessCodeInput.trim().toUpperCase();
    return clientTasks.filter((t) => {
      if (code) {
        return t.accessCode.toUpperCase() === code;
      }
      return selectedClient === 'Todos' || t.clientName === selectedClient;
    });
  }, [clientTasks, selectedClient, accessCodeInput, lockedClientName]);

  const syncedActiveCard = useMemo(
    () => (activeCard ? clientTasks.find((t) => t.id === activeCard.id) ?? null : null),
    [activeCard, clientTasks]
  );

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newClientName.trim()) return;
    const matchedMember = teamMembers.find((m) => m.name === newAssignee);
    const accessCode = newClientName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 6)
      .concat('-26');

    addClientTask({
      clientName: newClientName.trim(),
      accessCode,
      title: newTitle.trim(),
      serviceType: newServiceType,
      city: newCity,
      stage: 'Briefing & Material',
      priority: newPriority,
      dueDate: newDueDate,
      assigneeName: newAssignee,
      assigneeAvatar: matchedMember?.avatarUrl || OFFICIAL_FORTMIDIA_LOGO_URL,
      description: newDescription.trim() || 'Etapa de serviço gerenciada pelo Grupo FortMídia.',
      checklist: [
        { id: `ck-${Date.now()}-1`, label: 'Alinhamento de briefing e referências', done: false },
        { id: `ck-${Date.now()}-2`, label: 'Validação e aprovação final', done: false },
      ],
      outdoorCode: newOutdoorCode.trim() || undefined,
    });

    setNewTitle('');
    setNewDescription('');
    setNewOutdoorCode('');
    setShowNewCardForm(false);
    showTempNotice('Novo cartão adicionado ao Pipeline do Cliente.');
  };

  const handleMoveStep = (task: ClientServiceTask, direction: -1 | 1) => {
    const idx = KANBAN_COLUMNS.findIndex((c) => c.stage === task.stage);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= KANBAN_COLUMNS.length) return;
    moveClientTaskStage(task.id, KANBAN_COLUMNS[nextIdx].stage);
    showTempNotice(`"${task.title}" movido para ${KANBAN_COLUMNS[nextIdx].stage}.`);
  };

  const handleClientApprove = (task: ClientServiceTask) => {
    moveClientTaskStage(task.id, 'Em Veiculação / No Ar');
    updateClientTask(task.id, {
      clientFeedback: task.clientFeedback
        ? `${task.clientFeedback} | Aprovado pelo cliente.`
        : 'Arte/serviço aprovado pelo cliente para veiculação.',
    });
    showTempNotice('Aprovação registrada! Cartão avançou para Em Veiculação / No Ar.');
  };

  return (
    <div className={adminMode ? 'space-y-6' : 'min-h-screen bg-[#0A0A0A] text-[#F5F5F7] pb-16'}>
      {/* Top Bar when viewed as Standalone Client Portal (#/cliente) */}
      {!adminMode && (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0D0D0F]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              {onBackToPortal && (
                <button
                  type="button"
                  onClick={onBackToPortal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Site FortMídia
                </button>
              )}
              <div>
                <div className="flex items-center gap-2 font-display text-base sm:text-lg font-bold text-white">
                  <Kanban className="h-4 w-4 text-[#FF6600]" aria-hidden="true" />
                  <span>Central de Acompanhamento do Cliente</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  {siteSettings.brandName} {siteSettings.brandHighlight} · Quadro Kanban de Serviços em Tempo Real
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                placeholder="Código (ex: AUTO-2026)"
                className="w-40 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 font-mono text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
              <select
                aria-label="Selecionar empresa cliente"
                value={selectedClient}
                onChange={(e) => {
                  setAccessCodeInput('');
                  setSelectedClient(e.target.value);
                }}
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white"
              >
                <option value="Todos">Todos os Clientes (Demo)</option>
                {distinctClients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
      )}

      <div className={adminMode ? 'space-y-6' : 'mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-6'}>
        {/* Header inside Admin or Portal Sub-banner */}
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#121215] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
              <Kanban className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
              {lockedClientName
                ? 'Área Exclusiva do Anunciante · Acompanhe Veiculações & Aprove Entregas'
                : adminMode
                  ? 'Pipeline — Entregas dos Clientes (Sincronizado ao Vivo)'
                  : 'Acompanhe cada etapa da sua campanha — arraste ou aprove entregas'}
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-white">
              {lockedClientName
                ? `Pipeline · ${lockedClientName}`
                : selectedClient === 'Todos'
                  ? 'Pipeline · Visão Geral de Entregas em Andamento'
                  : `Pipeline · ${selectedClient}`}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {adminMode && !lockedClientName && (
              <>
                <select
                  aria-label="Filtrar pipeline por cliente"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                >
                  <option value="Todos">Todos os Clientes ({clientTasks.length})</option>
                  {distinctClients.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCardForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {showNewCardForm ? 'Fechar Cartão' : 'Novo Cartão no Pipeline'}
                </button>
              </>
            )}

            {!adminMode && (
              <div className="text-right text-[11px] text-zinc-400">
                Códigos Demo:{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAccessCodeInput('AUTO-2026');
                  }}
                  className="font-mono text-[#FF6600] hover:underline cursor-pointer mr-2"
                >
                  AUTO-2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccessCodeInput('MORATO-27');
                  }}
                  className="font-mono text-[#FF6600] hover:underline cursor-pointer"
                >
                  MORATO-27
                </button>
              </div>
            )}
          </div>
        </div>

        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {/* Admin Form to Add Service Card */}
        {adminMode && !lockedClientName && showNewCardForm && (
          <form
            onSubmit={handleCreateTask}
            className="rounded-xl border border-[#FF6600]/40 bg-[#121215] p-5 space-y-4"
          >
            <div className="text-sm font-bold text-white border-b border-white/10 pb-2">
              Adicionar Novo Cartão de Serviço ao Quadro do Cliente
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="text"
                required
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nome da Empresa / Cliente *"
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título do Serviço / Entrega *"
                className="lg:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={newServiceType}
                onChange={(e) => setNewServiceType(e.target.value)}
                placeholder="Tipo (Outdoor, Podcast, Reels...)"
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <select
                value={newCity}
                onChange={(e) => setNewCity(e.target.value as CimbajuCity)}
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {NEWS_TERRITORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={newPriority}
                onChange={(e) =>
                  setNewPriority(e.target.value as ClientServiceTask['priority'])
                }
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value="Normal">Prioridade Normal</option>
                <option value="Alta">Prioridade Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    Resp.: {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descrição da entrega ou observações..."
                className="sm:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={newOutdoorCode}
                onChange={(e) => setNewOutdoorCode(e.target.value)}
                placeholder="Código Outdoor opcional (ex: OUT-FRC-01)"
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewCardForm(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                Criar Cartão no Quadro
              </button>
            </div>
          </form>
        )}

        {/* Horizontal 5-Column Pipeline Board with Floating Horizontal Scrollbar */}
        <FloatingHorizontalScroll
          label="Arraste para ver todas as colunas do Pipeline"
          scrollClassName="pb-2"
        >
        <div className="flex gap-4 pb-2 items-start min-w-max">
          {KANBAN_COLUMNS.map((col, colIdx) => {
            const colTasks = visibleTasks.filter((t) => t.stage === col.stage);
            return (
              <div
                key={col.stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedTaskId) {
                    moveClientTaskStage(draggedTaskId, col.stage);
                    setDraggedTaskId(null);
                    showTempNotice(`Cartão movido para "${col.stage}".`);
                  }
                }}
                className="w-[292px] sm:w-[308px] shrink-0 rounded-xl border border-white/10 bg-[#111114] p-3.5 min-h-[380px] flex flex-col gap-3"
              >
                {/* Column Header */}
                <div className="border-b border-white/10 pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: col.accent }}
                      />
                      <h3 className="font-display text-xs font-bold text-white truncate">
                        {col.stage}
                      </h3>
                    </div>
                    <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-300 tabular-nums">
                      {colTasks.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500">{col.subtitle}</p>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-[11px] text-zinc-600">
                      Arraste um cartão aqui
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const doneCount = task.checklist.filter((c) => c.done).length;
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          className="rounded-lg border border-white/10 bg-[#18181C] p-3 space-y-2.5 hover:border-[#FF6600]/50 transition-colors cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="font-semibold text-[#FF6600] truncate">
                              {task.serviceType}
                            </span>
                            <span
                              className={`font-semibold px-1.5 py-0.5 rounded ${
                                task.priority === 'Urgente'
                                  ? 'bg-red-500/20 text-red-300'
                                  : task.priority === 'Alta'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-zinc-700/40 text-zinc-300'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveCard(task)}
                            className="block w-full text-left font-display text-xs font-bold leading-snug text-white hover:text-[#FF6600] cursor-pointer"
                          >
                            {task.title}
                          </button>

                          <div className="text-[11px] text-zinc-400 truncate">
                            {task.clientName} · {task.city}
                          </div>

                          {task.outdoorCode && (
                            <div className="inline-flex items-center gap-1 rounded bg-[#0A0A0A] border border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#D4AF37]">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {task.outdoorCode}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-[11px] text-zinc-400">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="h-5 w-5 overflow-hidden rounded-full border border-white/15 shrink-0">
                                <MediaFrame
                                  src={task.assigneeAvatar}
                                  alt={task.assigneeName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <span className="truncate max-w-[120px]">{task.assigneeName}</span>
                            </div>

                            <div className="flex items-center gap-2.5 font-mono tabular-nums shrink-0">
                              {task.checklist.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <CheckSquare className="h-3 w-3" aria-hidden="true" />
                                  {doneCount}/{task.checklist.length}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                {task.dueDate.slice(5).split('-').reverse().join('/')}
                              </span>
                            </div>
                          </div>

                          {/* Quick actions for Client Approval & Move */}
                          <div className="flex items-center justify-between gap-1.5 pt-1">
                            {colIdx > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleMoveStep(task, -1)}
                                title="Voltar etapa"
                                className="rounded border border-white/10 px-2 py-1.5 text-[11px] text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer shrink-0"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span />
                            )}

                            {task.stage === 'Aprovação do Cliente' && (
                              <button
                                type="button"
                                onClick={() => handleClientApprove(task)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                Aprovar Entrega
                              </button>
                            )}

                            {colIdx < KANBAN_COLUMNS.length - 1 ? (
                              <button
                                type="button"
                                onClick={() => handleMoveStep(task, 1)}
                                title="Avançar etapa"
                                className="rounded border border-white/10 px-2 py-1.5 text-[11px] text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer shrink-0"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span />
                            )}
                          </div>
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
      </div>

      {/* Card Detail Modal */}
      {syncedActiveCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kanban-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono text-[#D4AF37]">
                  {syncedActiveCard.clientName} · Código {syncedActiveCard.accessCode}
                </div>
                <h3 id="kanban-modal-title" className="mt-1 font-display text-lg font-bold text-white">
                  {syncedActiveCard.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCard(null)}
                aria-label="Fechar detalhes do serviço"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3">
                <div className="text-[10px] text-zinc-500">Coluna Atual</div>
                <select
                  value={syncedActiveCard.stage}
                  onChange={(e) =>
                    moveClientTaskStage(syncedActiveCard.id, e.target.value as ClientKanbanStage)
                  }
                  className="mt-1 w-full bg-transparent font-semibold text-[#FF6600] focus:outline-none"
                >
                  {KANBAN_COLUMNS.map((c) => (
                    <option key={c.stage} value={c.stage} className="bg-[#121215] text-white">
                      {c.stage}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3">
                <div className="text-[10px] text-zinc-500">Responsável Agência</div>
                <div className="mt-1 font-semibold text-white">
                  {syncedActiveCard.assigneeName}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3">
                <div className="text-[10px] text-zinc-500">Prazo Previsto</div>
                <div className="mt-1 font-mono font-semibold text-white">
                  {syncedActiveCard.dueDate}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-300 mb-1">Escopo & Detalhes</div>
              <p className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3 text-xs leading-relaxed text-zinc-300">
                {syncedActiveCard.description}
              </p>
            </div>

            {/* Interactive Checklist */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">
                Checklist de Entregas ({syncedActiveCard.checklist.filter((c) => c.done).length}/
                {syncedActiveCard.checklist.length})
              </div>
              <div className="space-y-1.5">
                {syncedActiveCard.checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleClientChecklistItem(syncedActiveCard.id, item.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-left text-xs hover:bg-white/5 cursor-pointer"
                  >
                    {item.done ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-500 shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Client Feedback / Approval Note */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <MessageSquare className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                Comentário / Solicitação de Ajuste do Cliente
              </label>
              <textarea
                rows={2}
                value={syncedActiveCard.clientFeedback || ''}
                onChange={(e) =>
                  updateClientTask(syncedActiveCard.id, { clientFeedback: e.target.value })
                }
                placeholder="Digite seu feedback ou observação sobre a arte/serviço..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              {adminMode ? (
                <button
                  type="button"
                  onClick={() => {
                    deleteClientTask(syncedActiveCard.id);
                    setActiveCard(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Excluir Cartão
                </button>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  Atualizado: {syncedActiveCard.updatedAt}
                </span>
              )}

              <div className="flex items-center gap-2">
                {syncedActiveCard.stage === 'Aprovação do Cliente' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClientApprove(syncedActiveCard);
                      setActiveCard(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Aprovar & Liberar Veiculação
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveCard(null)}
                  className="rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
