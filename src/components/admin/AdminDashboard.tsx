import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  BookUser,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Database,
  DollarSign,
  FileText,
  Globe,
  History,
  Kanban,
  Layers,
  LayoutDashboard,
  Link2,
  Megaphone,
  Menu,
  Newspaper,
  Package,
  Palette,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Sliders,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { ALL_ADMIN_TABS, ROLE_PRESETS } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { authApi, stateApi } from '../../services/api';
import { AdminTabId } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';
import { FortMidiaLogo, OFFICIAL_FORTMIDIA_LOGO_URL } from '../FortMidiaLogo';
import { ClientPortalBoard } from '../public/ClientPortalBoard';
import { InstitutionalPresentation } from '../public/InstitutionalPresentation';
import { AdminLoginPage } from './AdminLoginPage';
import { AdvertisingModule } from './AdvertisingModule';
import { AgendaModule } from './AgendaModule';
import { AuditLogModule } from './AuditLogModule';
import { BudgetMediaPlanModule } from './BudgetMediaPlanModule';
import { CatalogOutdoorModule } from './CatalogOutdoorModule';
import { CmsModule } from './CmsModule';
import { CockpitModule } from './CockpitModule';
import { CommercialModule } from './CommercialModule';
import { FinanceModule } from './FinanceModule';
import { JournalismModule } from './JournalismModule';
import { LettersModule } from './LettersModule';
import { MarketingStudioModule } from './MarketingStudioModule';
import { NotificationsModule } from './NotificationsModule';
import { PortalNewsEditorModule } from './PortalNewsEditorModule';
import { PresetsManagerModule } from './PresetsManagerModule';
import { ReportersModule } from './ReportersModule';
import { ReportsModule } from './ReportsModule';
import { SourcesModule } from './SourcesModule';
import { StudioScheduleModule } from './StudioScheduleModule';
import { TeamUsersModule } from './TeamUsersModule';

interface AdminDashboardProps {
  onBackToPortal: () => void;
  onOpenFortNewsPortal?: () => void;
}

const NAV_ITEMS: { id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { id: 'cockpit', label: 'Cockpit Executivo', icon: LayoutDashboard },
    { id: 'financeiro', label: 'Financeiro & Fluxo', icon: DollarSign },
    { id: 'orcamento', label: 'Orçamentos & Mídia', icon: FileText },
    { id: 'catalogo', label: 'Preços & Outdoors', icon: Package },
    { id: 'publicidade', label: 'Publicidade & Anúncios', icon: Megaphone },
    { id: 'comercial', label: 'Contratos & Leads', icon: Briefcase },
    { id: 'cartas', label: 'Cartas & Convites PDF', icon: ScrollText },
    { id: 'clientes', label: 'Pipeline', icon: Kanban },
    { id: 'portal_noticias', label: 'Portal · Matérias', icon: Globe },
    { id: 'jornalismo', label: 'Redação & Cidadão', icon: Newspaper },
    { id: 'reporteres', label: 'Repórteres', icon: UserCheck },
    { id: 'fontes', label: 'Fontes', icon: BookUser },
    { id: 'marketing', label: 'Marketing & Artes', icon: Palette },
    { id: 'estudio', label: 'Estúdio Podcast', icon: Calendar },
    { id: 'agenda', label: 'Agenda Corporativa', icon: CalendarClock },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'relatorios', label: 'Relatórios & Checking', icon: BarChart3 },
    { id: 'institucional', label: 'Apresentação Empresa', icon: Building2 },
    { id: 'equipe', label: 'Equipe & Permissões', icon: Users },
    { id: 'presets', label: 'Presets & Layout Global', icon: Layers },
    { id: 'auditoria', label: 'Log de Auditoria', icon: History },
    { id: 'cms', label: 'CMS Portais & Deploy', icon: Sliders },
  ];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToPortal,
  onOpenFortNewsPortal,
}) => {
  const {
    citizenReports,
    leads,
    clientTasks,
    teamMembers,
    activeAdminUserId,
    setActiveAdminUserId,
    notifications,
    siteSettings,
    apiMode,
    apiSyncLoading,
    apiSyncError,
    apiSyncMessage,
    isDatabaseEmpty,
    isAdminAuthenticated,
    setIsAdminAuthenticated,
    adminSessionChecking,
    logoutAdminSession,
    clearApiFeedback,
    refreshFromMysql,
    syncInitialDataToMysql,
    resetDemoData,
  } = useFortMidia();

  const readTabFromUrl = (): AdminTabId => {
    if (typeof window === 'undefined') return 'cockpit';
    try {
      const searchTab = new URLSearchParams(window.location.search).get('tab');
      if (searchTab && ALL_ADMIN_TABS.includes(searchTab as AdminTabId)) {
        return searchTab as AdminTabId;
      }
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashTab = new URLSearchParams(hashQuery).get('tab');
        if (hashTab && ALL_ADMIN_TABS.includes(hashTab as AdminTabId)) {
          return hashTab as AdminTabId;
        }
      }
    } catch {
      // Ignore malformed query
    }
    return 'cockpit';
  };

  const [activeTab, setActiveTabState] = useState<AdminTabId>(readTabFromUrl);
  const activeTabRef = useRef<AdminTabId>(activeTab);
  const tabHistoryRef = useRef<AdminTabId[]>([activeTab]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studioPautaId, setStudioPautaId] = useState<string | null>(null);
  const [copiedDirectUrl, setCopiedDirectUrl] = useState(false);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const buildAdminUrlForTab = useCallback((tab: AdminTabId): string => {
    if (typeof window === 'undefined') return `/crm?tab=${tab}`;
    const hasHashAdmin = /^#\/(admin|crm|sistema|dashboard|painel)/i.test(window.location.hash);
    if (hasHashAdmin) {
      const baseHash = window.location.hash.split('?')[0] || '#/crm';
      return `${window.location.pathname}${window.location.search}${baseHash}?tab=${tab}`;
    }
    const cleanPath =
      /^\/(admin|crm|sistema|dashboard|painel)/i.test(window.location.pathname)
        ? window.location.pathname
        : '/crm';
    return `${cleanPath}?tab=${tab}`;
  }, []);

  const setActiveTab = useCallback(
    (nextTab: AdminTabId, pushHistory = true) => {
      setActiveTabState((prev) => {
        if (prev === nextTab) return prev;
        activeTabRef.current = nextTab;
        if (pushHistory) {
          tabHistoryRef.current = [...tabHistoryRef.current.slice(-20), nextTab];
          try {
            window.history.pushState(
              { fortAdminGuard: true, tab: nextTab },
              '',
              buildAdminUrlForTab(nextTab)
            );
          } catch {
            // Ignore restricted history APIs
          }
        }
        return nextTab;
      });
    },
    [buildAdminUrlForTab]
  );

  // Força permanência no painel ao clicar em "Voltar" ou fazer gesto voltar (Desktop e Mobile)
  useEffect(() => {
    if (!isAdminAuthenticated || typeof window === 'undefined') return;

    const initialTab = activeTabRef.current || readTabFromUrl();
    try {
      // Cria âncora + camada superior para interceptar o botão Voltar sem sair nem deslogar
      if (!window.history.state?.fortAdminGuard || window.history.state?.anchor) {
        window.history.replaceState(
          { fortAdminGuard: true, tab: initialTab, anchor: true },
          '',
          buildAdminUrlForTab(initialTab)
        );
        window.history.pushState(
          { fortAdminGuard: true, tab: initialTab },
          '',
          buildAdminUrlForTab(initialTab)
        );
      }
    } catch {
      // Ignore restricted history APIs
    }

    const handlePopState = (event: PopStateEvent) => {
      const st = event.state as {
        fortAdminGuard?: boolean;
        tab?: AdminTabId;
        anchor?: boolean;
      } | null;

      // Ao atingir o estado âncora (primeiro nível do painel), re-empurra a guarda para
      // que múltiplos cliques/gestos em "Voltar" nunca derrubem o usuário para o login/portal.
      if (st?.fortAdminGuard && st.anchor) {
        const stayTab =
          st.tab && ALL_ADMIN_TABS.includes(st.tab) ? st.tab : activeTabRef.current || 'cockpit';
        setActiveTabState(stayTab);
        activeTabRef.current = stayTab;
        try {
          window.history.pushState(
            { fortAdminGuard: true, tab: stayTab },
            '',
            buildAdminUrlForTab(stayTab)
          );
        } catch {
          // Ignore
        }
        return;
      }

      if (st?.fortAdminGuard && st.tab && ALL_ADMIN_TABS.includes(st.tab)) {
        setActiveTabState(st.tab);
        activeTabRef.current = st.tab;
        return;
      }

      // Se houver aba anterior no histórico interno do painel, retorna para ela
      if (tabHistoryRef.current.length > 1) {
        tabHistoryRef.current.pop();
        const prevTab = tabHistoryRef.current[tabHistoryRef.current.length - 1] || 'cockpit';
        setActiveTabState(prevTab);
        activeTabRef.current = prevTab;
        try {
          window.history.pushState(
            { fortAdminGuard: true, tab: prevTab },
            '',
            buildAdminUrlForTab(prevTab)
          );
        } catch {
          // Ignore
        }
        return;
      }

      // Mesmo sem estado anterior, mantém o operador autenticado dentro do painel
      const current = activeTabRef.current || 'cockpit';
      try {
        window.history.pushState(
          { fortAdminGuard: true, tab: current },
          '',
          buildAdminUrlForTab(current)
        );
      } catch {
        // Ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdminAuthenticated, buildAdminUrlForTab]);

  const directSystemUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/#/sistema`
      : 'https://fortmidia.com.br/sistema';

  const handleCopyDirectUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(directSystemUrl);
      setCopiedDirectUrl(true);
      window.setTimeout(() => setCopiedDirectUrl(false), 2500);
    }
  };

  const pendingCitizenCount = citizenReports.filter(
    (r) => r.status === 'Aguardando Triagem'
  ).length;
  const newLeadsCount = leads.filter((l) => l.status === 'Novo Lead').length;
  const awaitingClientApprovalCount = clientTasks.filter(
    (t) => t.stage === 'Aprovação do Cliente'
  ).length;

  const activeOperator =
    teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];

  const isSuperAdmin =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1;

  const allowedTabIds = useMemo<AdminTabId[]>(() => {
    if (isSuperAdmin) return ALL_ADMIN_TABS;
    if (activeOperator?.allowedModules && activeOperator.allowedModules.length > 0) {
      return activeOperator.allowedModules;
    }
    return activeOperator ? ROLE_PRESETS[activeOperator.role].allowedModules : ALL_ADMIN_TABS;
  }, [activeOperator, isSuperAdmin]);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => allowedTabIds.includes(item.id)),
    [allowedTabIds]
  );

  useEffect(() => {
    if (!allowedTabIds.includes(activeTab)) {
      setActiveTab(allowedTabIds[0] || 'clientes');
    }
  }, [allowedTabIds, activeTab]);

  const unreadNotificationsCount = useMemo(
    () =>
      notifications.filter((n) => {
        if (n.read) return false;
        if (isSuperAdmin) return true;
        if (n.targetAudience === 'Todos') return true;
        if (activeOperator && n.targetAudience === activeOperator.role) {
          if (
            activeOperator.role === 'Cliente / Anunciante' &&
            n.targetClientName &&
            activeOperator.linkedClientName
          ) {
            return n.targetClientName.toLowerCase() === activeOperator.linkedClientName.toLowerCase();
          }
          return true;
        }
        return false;
      }).length,
    [notifications, isSuperAdmin, activeOperator]
  );

  const resolvedTab: AdminTabId = allowedTabIds.includes(activeTab)
    ? activeTab
    : allowedTabIds[0] || 'clientes';

  const normalizeSimpleLogin = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const handleAuthenticate = async (
    rawUsername: string,
    rawPassword: string
  ): Promise<string | null> => {
    const normalizedUser = normalizeSimpleLogin(rawUsername);
    const password = rawPassword.trim();
    if (!normalizedUser || !password) {
      return 'Informe usuário e senha para continuar.';
    }

    // 0. Garante verificação de /api/health caso o usuário clique em Entrar antes da checagem inicial concluir
    let isApiOnline = apiMode === 'online';
    if (apiMode === 'checking') {
      const health = await stateApi.health();
      isApiOnline = Boolean(health.ok && health.data?.ok === true && health.data?.database !== false);
    }

    // 1. Autenticação real na API REST (PHP/MySQL em produção — grava cookie HttpOnly + token em memória)
    const apiLogin = await authApi.login(rawUsername.trim(), password);
    if (apiLogin.ok && apiLogin.data?.user) {
      const apiUser = apiLogin.data.user;
      setActiveAdminUserId(apiUser.id);
      await refreshFromMysql(apiUser);
      setIsAdminAuthenticated(true);
      return null;
    }

    // Se a API está online (/api/health ok) ou respondeu com erro HTTP real (401/403/500),
    // nunca faz fallback silencioso para credenciais de demonstração locais.
    if (isApiOnline || !apiLogin.networkUnavailable) {
      return apiLogin.error || 'Usuário ou senha inválidos no banco MySQL.';
    }

    // 2. Fallback automático apenas em ambiente offline/preview sem backend PHP disponível
    const matchedMember = teamMembers.find((m) => {
      const email = normalizeSimpleLogin(m.email);
      const emailPrefix = email.split('@')[0];
      const loginName = normalizeSimpleLogin(m.loginName || '');
      const name = normalizeSimpleLogin(m.name);
      const firstName = name.split(' ')[0];
      if (
        (loginName && normalizedUser === loginName) ||
        normalizedUser === email ||
        normalizedUser === emailPrefix ||
        normalizedUser === name ||
        normalizedUser === firstName
      ) {
        return true;
      }
      const isSuperAdminAccount =
        m.role === 'Super Admin / Diretoria' || m.hierarchyLevel === 1;
      if (
        isSuperAdminAccount &&
        (normalizedUser === 'admin' ||
          normalizedUser === 'diretoria' ||
          normalizedUser === 'emerson' ||
          normalizedUser === 'emerson carneiro' ||
          normalizedUser === 'comercial@fortmidia.com.br')
      ) {
        return true;
      }
      return false;
    });

    if (!matchedMember || matchedMember.password !== password) {
      return 'Usuário ou senha inválidos.';
    }

    if (!matchedMember.active) {
      return 'Este usuário encontra-se inativo.';
    }

    setActiveAdminUserId(matchedMember.id);
    try {
      sessionStorage.setItem('fortmidia_preview_admin_uid', matchedMember.id);
    } catch {
      // Ignore storage restrictions
    }
    setIsAdminAuthenticated(true);
    return null;
  };

  if (adminSessionChecking && !isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-200 flex flex-col items-center justify-center gap-3 px-4">
        <RefreshCw className="h-6 w-6 animate-spin text-[#fa6607]" aria-hidden="true" />
        <p className="text-xs text-zinc-400">Restaurando sessão administrativa...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <AdminLoginPage
        logoUrl={siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
        onAuthenticate={handleAuthenticate}
        onBack={onBackToPortal}
      />
    );
  }

  const currentTabLabel = NAV_ITEMS.find((t) => t.id === resolvedTab)?.label || '';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex print-container-reset">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-white/10 bg-[#0D0D0F] p-5">
        <div>
          <div className="border-b border-white/10 pb-4">
            <FortMidiaLogo
              src={siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
              alt="FortMídia"
              className="h-12"
            />
            <div className="mt-2.5 text-[11px] text-zinc-400 truncate">
              {activeOperator?.role || 'Sistema Administrativo'}
            </div>
          </div>

          <nav aria-label="Módulos administrativos" className="mt-5 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = resolvedTab === item.id;
              const badgeCount =
                item.id === 'jornalismo'
                  ? pendingCitizenCount
                  : item.id === 'comercial'
                    ? newLeadsCount
                    : item.id === 'clientes'
                      ? awaitingClientApprovalCount
                      : item.id === 'notificacoes'
                        ? unreadNotificationsCount
                        : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#fa6607] text-white'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {badgeCount > 0 && (
                    <span
                      className={`font-mono text-[11px] tabular-nums shrink-0 ${
                        isActive ? 'text-white' : 'text-[#fa6607]'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          {onOpenFortNewsPortal && (
            <button
              type="button"
              onClick={onOpenFortNewsPortal}
              className="flex w-full items-center gap-2 rounded-lg border border-[#fa6607]/30 bg-[#fa6607]/10 px-3 py-2 text-xs font-medium text-[#fa6607] hover:bg-[#fa6607]/20 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Portal FortNews
            </button>
          )}
          {apiMode === 'online' ? (
            <>
              <button
                type="button"
                disabled={apiSyncLoading}
                onClick={() => void refreshFromMysql()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[0.04] hover:text-white disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${apiSyncLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Recarregar do MySQL
              </button>
              {isSuperAdmin && (
                <button
                  type="button"
                  disabled={apiSyncLoading}
                  onClick={() => void syncInitialDataToMysql()}
                  className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 cursor-pointer text-left"
                >
                  <Database className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Popular Dados Iniciais</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={resetDemoData}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restaurar Dados Base
            </button>
          )}
          <button
            type="button"
            onClick={onBackToPortal}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.05] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Ver Portal FortMídia
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 print-container-reset">
        {/* Top Bar with Breadcrumb & Active Operator Profile */}
        <header className="no-print sticky top-0 z-40 flex flex-col gap-2 border-b border-white/10 bg-[#0A0A0A]/95 px-3 py-2.5 backdrop-blur-md md:h-16 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-0 lg:px-8">
          {/* Row 1 (mobile) / Left zone (desktop): Menu, Logo & Page Title */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-3 min-w-0 md:flex-1 md:justify-start">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Alternar menu administrativo"
                aria-expanded={mobileMenuOpen}
                className={`lg:hidden inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  mobileMenuOpen
                    ? 'border-[#fa6607] bg-[#fa6607] text-white'
                    : 'border-white/15 bg-[#121215] text-zinc-200 hover:border-[#fa6607]/70'
                }`}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <FortMidiaLogo
                src={siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
                alt="CRM FORTMIDIA"
                className="lg:hidden h-8 sm:h-9 shrink-0"
                rounded="md"
              />
              <div className="min-w-0 flex-1 truncate text-xs sm:text-sm text-zinc-400">
                <span className="hidden lg:inline font-semibold text-white">CRM FORTMIDIA</span>
                <span className="hidden lg:inline mx-2 text-zinc-600">/</span>
                <span className="text-zinc-100 font-semibold truncate">{currentTabLabel}</span>
              </div>
            </div>

            {/* Mobile-only quick exit buttons kept aligned on Row 1 right */}
            <div className="flex items-center gap-1.5 shrink-0 md:hidden">
              <button
                type="button"
                onClick={onBackToPortal}
                className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/5 cursor-pointer"
              >
                Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  void logoutAdminSession();
                }}
                className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Sair
              </button>
            </div>
          </div>

          {/* Row 2 (mobile < 768px) / Right zone (desktop >= 768px): Status (errors only), Direct URL, Notifications & Profile */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 md:flex-nowrap md:justify-end md:border-t-0 md:pt-0 md:gap-2.5 lg:gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {/* Indicador de conexão exibido SOMENTE quando houver erro de API ou falha de sincronização */}
              {(apiSyncError || apiMode === 'offline') && (
                <button
                  type="button"
                  disabled={apiSyncLoading}
                  onClick={() => void refreshFromMysql()}
                  title={
                    apiSyncError
                      ? `Erro de API: ${apiSyncError}`
                      : 'API PHP /api/health indisponível neste ambiente. Clique para tentar reconectar.'
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/50 px-2.5 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-950/70 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full shrink-0 bg-red-500" aria-hidden="true" />
                  <span>Erro de API</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyDirectUrl}
                title={`Copiar link direto do sistema: ${directSystemUrl}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-[#fa6607]/60 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedDirectUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">URL Copiada</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                    <span>URL Direta /sistema</span>
                  </>
                )}
              </button>

              {allowedTabIds.includes('notificacoes') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('notificacoes')}
                  aria-label="Abrir central de notificações"
                  title="Central de Notificações"
                  className="relative inline-flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#121215] text-zinc-200 hover:border-[#fa6607]/60 hover:text-white cursor-pointer"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#fa6607] px-1 font-mono text-[10px] font-bold text-white tabular-nums">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeOperator && (
                <button
                  type="button"
                  onClick={() => {
                    if (allowedTabIds.includes('equipe')) setActiveTab('equipe');
                  }}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-right hover:bg-white/[0.04] cursor-pointer max-w-[190px] sm:max-w-[240px] md:max-w-none"
                  title="Perfil do operador ativo"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[11px] md:text-xs font-medium text-white">
                      {activeOperator.name}
                    </div>
                    <div className="hidden xl:block truncate text-[11px] text-zinc-400">
                      Nível {activeOperator.hierarchyLevel} · {activeOperator.role}
                    </div>
                  </div>
                  <MediaFrame
                    src={activeOperator.avatarUrl}
                    alt={activeOperator.name}
                    className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-full object-cover border border-[#fa6607]/40 bg-black"
                  />
                </button>
              )}

              <button
                type="button"
                onClick={onBackToPortal}
                className="hidden md:inline-flex lg:hidden rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 cursor-pointer"
              >
                Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  void logoutAdminSession();
                }}
                className="hidden md:inline-flex rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {/* Fixed Mobile Admin Drawer — sempre abre no viewport atual independente do scroll */}
        {mobileMenuOpen && (
          <div className="no-print lg:hidden fixed inset-0 z-50 flex">
            <div className="relative z-10 w-full max-w-xs h-full overflow-y-auto border-r border-white/10 bg-[#0D0D0F] p-4 shadow-2xl space-y-1.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
                <div>
                  <div className="text-xs font-bold text-white">CRM FORTMIDIA</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {activeOperator?.name} · {activeOperator?.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = resolvedTab === item.id;
                const badgeCount =
                  item.id === 'jornalismo'
                    ? pendingCitizenCount
                    : item.id === 'comercial'
                      ? newLeadsCount
                      : item.id === 'clientes'
                        ? awaitingClientApprovalCount
                        : item.id === 'notificacoes'
                          ? unreadNotificationsCount
                          : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium cursor-pointer ${
                      isActive ? 'bg-[#fa6607] text-white' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {badgeCount > 0 && (
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-white' : 'text-[#fa6607]'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="pt-3 mt-3 border-t border-white/10 space-y-1.5">
                {onOpenFortNewsPortal && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenFortNewsPortal();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg border border-[#fa6607]/30 bg-[#fa6607]/10 px-3 py-2 text-xs font-medium text-[#fa6607] cursor-pointer"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Portal FortNews
                  </button>
                )}
                {apiMode === 'online' && (
                  <>
                    <button
                      type="button"
                      disabled={apiSyncLoading}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        void refreshFromMysql();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${apiSyncLoading ? 'animate-spin' : ''}`} />
                      Recarregar do MySQL
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        disabled={apiSyncLoading}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          void syncInitialDataToMysql();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 disabled:opacity-50 cursor-pointer"
                      >
                        <Database className="h-3.5 w-3.5" />
                        Popular Dados Iniciais no MySQL
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onBackToPortal();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Ver Portal FortMídia
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar menu lateral"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 bg-black/70 backdrop-blur-xs"
            />
          </div>
        )}

        {/* Active Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print-container-reset">
          {/* Alerta Visual de Erro da API PHP/MySQL */}
          {apiSyncError && (
            <div
              role="alert"
              className="no-print mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-xs text-red-100"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-semibold text-red-200">
                    Falha ao sincronizar operação com o MySQL
                  </div>
                  <p className="mt-0.5 text-red-100/90 break-words">{apiSyncError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={apiSyncLoading}
                  onClick={() => void refreshFromMysql()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-[11px] font-medium text-red-100 hover:bg-red-500/30 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${apiSyncLoading ? 'animate-spin' : ''}`} />
                  Recarregar do MySQL
                </button>
                <button
                  type="button"
                  onClick={clearApiFeedback}
                  aria-label="Fechar alerta de erro"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-400/30 text-red-200 hover:bg-red-500/20 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Confirmação Visual de Sincronização com o MySQL */}
          {apiSyncMessage && !apiSyncError && (
            <div
              role="status"
              className="no-print mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-100"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <p className="break-words">{apiSyncMessage}</p>
              </div>
              <button
                type="button"
                onClick={clearApiFeedback}
                aria-label="Fechar aviso"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Ação de Primeiro Acesso quando o Banco MySQL está Vazio */}
          {apiMode === 'online' && isDatabaseEmpty && isSuperAdmin && (
            <div className="no-print mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-[#fa6607]/40 bg-[#141110] p-4 sm:p-5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fa6607]/15 text-[#fa6607]">
                  <Database className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">
                    Banco MySQL conectado e pronto para primeiro uso
                  </h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    As tabelas <code className="text-zinc-200">crm_contracts</code>,{' '}
                    <code className="text-zinc-200">crm_leads</code> e{' '}
                    <code className="text-zinc-200">news_pautas</code> estão vazias no MySQL. Você pode começar cadastrando manualmente ou popular os registros iniciais com um clique.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={apiSyncLoading}
                onClick={() => void syncInitialDataToMysql()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer"
              >
                <Database className="h-4 w-4" aria-hidden="true" />
                {apiSyncLoading
                  ? 'Populando banco MySQL...'
                  : 'Popular Dados Iniciais no MySQL'}
              </button>
            </div>
          )}

          {resolvedTab === 'cockpit' && (
            <CockpitModule
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenFortNewsPortal={onOpenFortNewsPortal ?? onBackToPortal}
            />
          )}
          {resolvedTab === 'financeiro' && <FinanceModule />}
          {resolvedTab === 'orcamento' && <BudgetMediaPlanModule />}
          {resolvedTab === 'catalogo' && <CatalogOutdoorModule />}
          {resolvedTab === 'publicidade' && <AdvertisingModule />}
          {resolvedTab === 'comercial' && <CommercialModule />}
          {resolvedTab === 'cartas' && <LettersModule />}
          {resolvedTab === 'clientes' && (
            <ClientPortalBoard
              adminMode
              lockedClientName={
                activeOperator?.role === 'Cliente / Anunciante'
                  ? activeOperator.linkedClientName || activeOperator.name
                  : undefined
              }
            />
          )}
          {resolvedTab === 'portal_noticias' && (
            <PortalNewsEditorModule
              onOpenFortNewsPortal={onOpenFortNewsPortal ?? onBackToPortal}
              onOpenMarketingStudio={(pautaId) => {
                setStudioPautaId(pautaId ?? null);
                setActiveTab('marketing');
              }}
            />
          )}
          {resolvedTab === 'jornalismo' && <JournalismModule />}
          {resolvedTab === 'reporteres' && <ReportersModule />}
          {resolvedTab === 'fontes' && <SourcesModule />}
          {resolvedTab === 'marketing' && <MarketingStudioModule initialPautaId={studioPautaId} />}
          {resolvedTab === 'estudio' && <StudioScheduleModule />}
          {resolvedTab === 'agenda' && <AgendaModule />}
          {resolvedTab === 'notificacoes' && (
            <NotificationsModule onNavigateTab={(tab) => setActiveTab(tab)} />
          )}
          {resolvedTab === 'relatorios' && <ReportsModule />}
          {resolvedTab === 'institucional' && (
            <InstitutionalPresentation
              adminMode
              onBackToPortal={onBackToPortal}
              onOpenFortNews={onOpenFortNewsPortal}
            />
          )}
          {resolvedTab === 'equipe' && <TeamUsersModule />}
          {resolvedTab === 'presets' && (
            <PresetsManagerModule
              onPreviewPortal={onBackToPortal}
              onOpenFortNewsPortal={onOpenFortNewsPortal}
            />
          )}
          {resolvedTab === 'auditoria' && <AuditLogModule />}
          {resolvedTab === 'cms' && (
            <CmsModule
              onPreviewPortal={onBackToPortal}
              onOpenFortNewsPortal={onOpenFortNewsPortal}
            />
          )}
        </main>
      </div>
    </div>
  );
};
