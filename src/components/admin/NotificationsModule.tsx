import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  MailOpen,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  AdminTabId,
  AppNotificationType,
  TeamRole,
} from '../../types/fortmidia';

interface NotificationsModuleProps {
  onNavigateTab?: (tab: AdminTabId) => void;
}

const NOTIF_TYPES: AppNotificationType[] = [
  'Veiculação de Anúncio',
  'Aprovação Editorial',
  'Agenda & Podcast',
  'Financeiro',
  'Fala Cidadão',
  'Sistema',
];

const AUDIENCE_ROLES: ('Todos' | TeamRole)[] = [
  'Todos',
  'Cliente / Anunciante',
  'Redator-Chefe',
  'Apresentador',
  'Repórter / Jornalista',
  'Designer / Social Media',
  'Produtor Podcast',
  'Executivo Comercial',
  'Financeiro',
  'Administrador',
  'Super Admin / Diretoria',
];

export const NotificationsModule: React.FC<NotificationsModuleProps> = ({
  onNavigateTab,
}) => {
  const {
    notifications,
    teamMembers,
    activeAdminUserId,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useFortMidia();

  const activeUser =
    teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const isSuperAdmin =
    activeUser?.role === 'Super Admin / Diretoria' || activeUser?.hierarchyLevel === 1;
  const canEdit = isSuperAdmin || activeUser?.permissions?.canEdit !== false;
  const canDelete = isSuperAdmin || activeUser?.permissions?.canDelete === true;

  const [readFilter, setReadFilter] = useState<'Todas' | 'Não Lidas'>('Todas');
  const [typeFilter, setTypeFilter] = useState<'Todos' | AppNotificationType>('Todos');
  const [showComposer, setShowComposer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Composer State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AppNotificationType>('Veiculação de Anúncio');
  const [priority, setPriority] = useState<'Baixa' | 'Normal' | 'Alta' | 'Urgente'>('Normal');
  const [targetAudience, setTargetAudience] = useState<'Todos' | TeamRole>('Todos');
  const [targetClientName, setTargetClientName] = useState('');
  const [actionTab, setActionTab] = useState<AdminTabId | ''>('clientes');

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (readFilter === 'Não Lidas' && n.read) return false;
      if (typeFilter !== 'Todos' && n.type !== typeFilter) return false;
      if (
        !isSuperAdmin &&
        activeUser?.role === 'Cliente / Anunciante' &&
        n.targetAudience !== 'Todos' &&
        n.targetAudience !== 'Cliente / Anunciante'
      ) {
        return false;
      }
      if (
        !isSuperAdmin &&
        activeUser?.role === 'Cliente / Anunciante' &&
        n.targetClientName &&
        activeUser.linkedClientName &&
        n.targetClientName !== activeUser.linkedClientName
      ) {
        return false;
      }
      return true;
    });
  }, [notifications, readFilter, typeFilter, isSuperAdmin, activeUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    addNotification({
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      targetAudience,
      targetClientName:
        targetAudience === 'Cliente / Anunciante' && targetClientName.trim()
          ? targetClientName.trim()
          : undefined,
      actionTab: actionTab || undefined,
    });
    setTitle('');
    setMessage('');
    setTargetClientName('');
    setShowComposer(false);
    flash('Notificação publicada na central da equipe/cliente.');
  };

  const priorityClass = (p: string) => {
    if (p === 'Urgente') return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (p === 'Alta') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (p === 'Normal') return 'bg-[#FF6600]/15 text-[#FF6600] border-[#FF6600]/30';
    return 'bg-zinc-800 text-zinc-300 border-white/10';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Central de Notificações & Alertas Operacionais
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Avisos em tempo real sobre veiculação de anúncios, aprovações editoriais, gravações de podcast e notificações diretas para clientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              markAllNotificationsRead();
              flash('Todas as notificações marcadas como lidas.');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#121215] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
            Marcar Todas Lidas
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowComposer((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
            >
              {showComposer ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showComposer ? 'Fechar Envio' : 'Enviar Notificação / Aviso'}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Composer */}
      {showComposer && canEdit && (
        <form
          onSubmit={handleSendNotification}
          className="rounded-xl border border-[#FF6600]/40 bg-[#121215] p-5 space-y-4"
        >
          <div className="text-sm font-bold text-white border-b border-white/10 pb-2">
            Disparar Novo Aviso / Notificação Interna ou ao Cliente
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da notificação *"
              className="lg:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AppNotificationType)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            >
              {NOTIF_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as 'Baixa' | 'Normal' | 'Alta' | 'Urgente')
              }
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
            >
              <option value="Normal">Prioridade Normal</option>
              <option value="Alta">Prioridade Alta</option>
              <option value="Urgente">Urgente</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Público-Alvo / Perfil</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as 'Todos' | TeamRole)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {AUDIENCE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Cliente Específico (se Anunciante)
              </label>
              <input
                type="text"
                value={targetClientName}
                onChange={(e) => setTargetClientName(e.target.value)}
                placeholder="Ex.: Auto Shopping Franco"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Módulo de Destino</label>
              <select
                value={actionTab}
                onChange={(e) => setActionTab(e.target.value as AdminTabId | '')}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value="">Sem atalho</option>
                <option value="clientes">Pipeline</option>
                <option value="publicidade">Gestão de Publicidade</option>
                <option value="portal_noticias">Portal · Matérias</option>
                <option value="agenda">Agenda & Prazos</option>
                <option value="relatorios">Relatórios & Checking</option>
                <option value="financeiro">Financeiro & Fluxo</option>
              </select>
            </div>
          </div>

          <textarea
            rows={2}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensagem detalhada da notificação..."
            className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar Notificação
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121215] p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReadFilter('Todas')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              readFilter === 'Todas' ? 'bg-[#FF6600] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setReadFilter('Não Lidas')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              readFilter === 'Não Lidas'
                ? 'bg-[#FF6600] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Não Lidas ({unreadCount})
          </button>
        </div>

        <select
          aria-label="Filtrar notificações por tipo"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'Todos' | AppNotificationType)}
          className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
        >
          <option value="Todos">Todos os Tipos</option>
          {NOTIF_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Notification Cards */}
      <div className="space-y-3">
        {visibleNotifications.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#121215] p-10 text-center text-xs text-zinc-400">
            Nenhuma notificação nesta visualização.
          </div>
        ) : (
          visibleNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-xl border p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                notif.read
                  ? 'border-white/10 bg-[#111114] opacity-80'
                  : 'border-[#FF6600]/40 bg-[#151314]'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    notif.read ? 'bg-white/5 text-zinc-400' : 'bg-[#FF6600]/20 text-[#FF6600]'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`rounded border px-2 py-0.5 font-semibold ${priorityClass(
                        notif.priority
                      )}`}
                    >
                      {notif.priority}
                    </span>
                    <span className="font-medium text-[#D4AF37]">{notif.type}</span>
                    <span className="text-zinc-500">· Destino: {notif.targetAudience}</span>
                    {notif.targetClientName && (
                      <span className="text-sky-300">({notif.targetClientName})</span>
                    )}
                    <span className="font-mono text-zinc-500 tabular-nums">{notif.createdAt}</span>
                  </div>

                  <h3 className="font-display text-sm font-bold text-white">{notif.title}</h3>
                  <p className="text-xs leading-relaxed text-zinc-300">{notif.message}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                {notif.actionTab && onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(notif.id, true);
                      onNavigateTab(notif.actionTab as AdminTabId);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#FF6600] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                  >
                    Abrir Módulo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => markNotificationRead(notif.id, !notif.read)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                >
                  <MailOpen className="h-3.5 w-3.5" />
                  {notif.read ? 'Marcar Não Lida' : 'Marcar Lida'}
                </button>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteNotification(notif.id);
                      flash('Notificação excluída.');
                    }}
                    aria-label={`Excluir notificação ${notif.title}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
