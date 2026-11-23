import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  citizenApi,
  crmApi,
  getApiAuthToken,
  newsApi,
  stateApi,
} from '../services/api';
import {
  getNextPautaInternalCode,
  hydratePautasWithInternalCodes,
} from '../utils/pautaCode';
import {
  ALL_ADMIN_TABS,
  BUDGET_PRODUCT_CATALOG,
  COMMERCIAL_QUOTAS,
  INITIAL_ADVERTISING_CAMPAIGNS,
  INITIAL_AGENDA_EVENTS,
  INITIAL_CITIZEN_REPORTS,
  INITIAL_CLIENT_TASKS,
  INITIAL_CONTRACTS,
  INITIAL_FINANCIAL_ENTRIES,
  INITIAL_GALLERY_ITEMS,
  INITIAL_GLOBAL_LAYOUT_PRESETS,
  INITIAL_JOURNALISTIC_SOURCES,
  INITIAL_LEADS,
  INITIAL_MARKETING_PRESETS,
  INITIAL_MEDIA_BUDGETS,
  INITIAL_NEWS_PORTAL_SETTINGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_OFFICIAL_LETTERS,
  INITIAL_OUTDOOR_POINTS,
  INITIAL_PAUTAS,
  INITIAL_POPUP_CONFIG,
  INITIAL_PRESET_AUDIT_LOGS,
  INITIAL_REPORTERS,
  INITIAL_SITE_AD_BANNERS,
  INITIAL_SITE_ADS_CONFIG,
  INITIAL_SITE_CMS_PRESETS,
  INITIAL_SITE_SETTINGS,
  INITIAL_STUDIO_BOOKINGS,
  INITIAL_TEAM_MEMBERS,
  OFFICIAL_PODCASTS,
  ROLE_PRESETS,
} from '../data/initialData';
import {
  AdvertisingCampaign,
  AdvertisingStatus,
  AgendaEvent,
  AppNotification,
  ArtworkStatus,
  BudgetCatalogItem,
  BudgetStatus,
  CitizenCategory,
  CitizenReport,
  CitizenStatus,
  CimbajuCity,
  ClientKanbanStage,
  ClientServiceTask,
  CmsPopupConfig,
  CommercialContract,
  CommercialLead,
  CommercialQuota,
  ContractStatus,
  EditorialPauta,
  FinancialEntry,
  FinancialPaymentStatus,
  GalleryItem,
  GlobalLayoutPreset,
  GlobalPresetScope,
  JournalisticSource,
  MarketingArtPreset,
  MediaPlanBudget,
  NewsPortalSettings,
  NewsSeal,
  OfficialLetterDocument,
  OutdoorPoint,
  PautaStatus,
  PodcastShow,
  PresetAuditAction,
  PresetAuditLogEntry,
  PresetAuditScope,
  ReporterProfile,
  SiteAdBanner,
  SiteAdsConfig,
  SiteCmsPreset,
  SiteSettings,
  StudioBooking,
  TeamMember,
  TeamRole,
} from '../types/fortmidia';

interface FortMidiaState {
  citizenReports: CitizenReport[];
  contracts: CommercialContract[];
  leads: CommercialLead[];
  pautas: EditorialPauta[];
  studioBookings: StudioBooking[];
  financialEntries: FinancialEntry[];
  advertisingCampaigns: AdvertisingCampaign[];
  mediaBudgets: MediaPlanBudget[];
  budgetCatalog: BudgetCatalogItem[];
  outdoorPoints: OutdoorPoint[];
  siteSettings: SiteSettings;
  newsPortalSettings: NewsPortalSettings;
  quotas: CommercialQuota[];
  galleryItems: GalleryItem[];
  popupConfig: CmsPopupConfig;
  teamMembers: TeamMember[];
  activeAdminUserId: string;
  clientTasks: ClientServiceTask[];
  agendaEvents: AgendaEvent[];
  notifications: AppNotification[];
  marketingPresets: MarketingArtPreset[];
  marketingPresetsLocked: boolean;
  siteCmsPresets: SiteCmsPreset[];
  siteCmsPresetsLocked: boolean;
  globalLayoutPresets: GlobalLayoutPreset[];
  activeGlobalPresetId: string | null;
  onlySuperAdminCreatesGlobalPresets: boolean;
  podcastShows: PodcastShow[];
  officialLetters: OfficialLetterDocument[];
  presetAuditLogs: PresetAuditLogEntry[];
  reporters: ReporterProfile[];
  journalisticSources: JournalisticSource[];
  siteAdBanners: SiteAdBanner[];
  siteAdsConfig: SiteAdsConfig;
}

interface FortMidiaContextValue extends FortMidiaState {
  submitCitizenReport: (payload: {
    citizenName: string;
    contact: string;
    city: CimbajuCity;
    neighborhood: string;
    category: CitizenCategory;
    urgency: 'Normal' | 'Alta' | 'Crítica';
    title: string;
    description: string;
  }) => CitizenReport;
  runAutoTriage: () => number;
  updateCitizenStatus: (id: string, status: CitizenStatus) => void;
  updateCitizenReport: (id: string, patch: Partial<CitizenReport>) => void;
  deleteCitizenReport: (id: string) => void;
  promoteReportToPauta: (reportId: string, format: EditorialPauta['format'], reporterId?: string) => void;
  submitCommercialLead: (payload: {
    companyOrName: string;
    contact: string;
    city: CimbajuCity;
    quotaTitle: string;
    notes: string;
  }) => CommercialLead;
  updateLead: (id: string, patch: Partial<CommercialLead>) => void;
  updateLeadStatus: (id: string, status: CommercialLead['status']) => void;
  deleteLead: (id: string) => void;
  addContract: (contract: Omit<CommercialContract, 'id'>) => void;
  updateContract: (id: string, patch: Partial<CommercialContract>) => void;
  updateContractStatus: (id: string, status: ContractStatus) => void;
  deleteContract: (id: string) => void;
  addPauta: (pauta: Omit<EditorialPauta, 'id'>) => void;
  updatePautaStatus: (id: string, status: PautaStatus) => void;
  updatePautaSeal: (id: string, seal: NewsSeal) => void;
  updatePautaContent: (id: string, patch: Partial<EditorialPauta>) => void;
  deletePauta: (id: string) => void;
  chiefEditorApprovePauta: (id: string, chiefName: string, publishNow?: boolean) => void;
  publishPautaToSite: (id: string) => void;
  unpublishPauta: (id: string) => void;
  addStudioBooking: (booking: Omit<StudioBooking, 'id'>) => { ok: boolean; error?: string };
  updateStudioBooking: (
    id: string,
    patch: Partial<Omit<StudioBooking, 'id'>>
  ) => { ok: boolean; error?: string };
  updateStudioBookingStatus: (id: string, status: StudioBooking['status']) => void;
  deleteStudioBooking: (id: string) => void;

  /* Gestão de Publicidade */
  addAdvertisingCampaign: (campaign: Omit<AdvertisingCampaign, 'id'>) => void;
  updateAdvertisingStatus: (id: string, status: AdvertisingStatus) => void;
  updateArtworkStatus: (id: string, artworkStatus: ArtworkStatus) => void;
  deleteAdvertisingCampaign: (id: string) => void;

  /* Financeiro de Agência */
  addFinancialEntry: (entry: Omit<FinancialEntry, 'id'>) => void;
  updateFinancialStatus: (id: string, status: FinancialPaymentStatus) => void;
  deleteFinancialEntry: (id: string) => void;

  /* Orçamento & Plano de Mídia */
  addMediaBudget: (budget: Omit<MediaPlanBudget, 'id'>) => MediaPlanBudget;
  updateMediaBudget: (id: string, patch: Partial<MediaPlanBudget>) => void;
  updateMediaBudgetStatus: (id: string, status: BudgetStatus) => void;
  deleteMediaBudget: (id: string) => void;
  convertBudgetToErp: (budgetId: string) => { campaignsCreated: number; entriesCreated: number };

  /* Tabela de Serviços/Produtos & Inventário de Outdoors */
  addCatalogItem: (item: Omit<BudgetCatalogItem, 'id'>) => void;
  updateCatalogItem: (id: string, patch: Partial<BudgetCatalogItem>) => void;
  deleteCatalogItem: (id: string) => void;
  addOutdoorPoint: (point: Omit<OutdoorPoint, 'id'>) => void;
  updateOutdoorPoint: (id: string, patch: Partial<OutdoorPoint>) => void;
  deleteOutdoorPoint: (id: string) => void;

  /* Equipe, Hierarquia & Permissões */
  addTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'>) => void;
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
  setActiveAdminUserId: (id: string) => void;

  /* Agenda Corporativa */
  addAgendaEvent: (event: Omit<AgendaEvent, 'id'>) => void;
  updateAgendaEvent: (id: string, patch: Partial<AgendaEvent>) => void;
  deleteAgendaEvent: (id: string) => void;

  /* Central de Notificações */
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string, read?: boolean) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;

  /* Painel do Cliente (Quadro Kanban) */
  addClientTask: (task: Omit<ClientServiceTask, 'id' | 'updatedAt'>) => void;
  updateClientTask: (id: string, patch: Partial<ClientServiceTask>) => void;
  moveClientTaskStage: (id: string, stage: ClientKanbanStage) => void;
  toggleClientChecklistItem: (taskId: string, checklistId: string) => void;
  deleteClientTask: (id: string) => void;

  /* CMS Completo (FortMídia & Jornal FortNews) */
  updateSiteSettings: (patch: Partial<SiteSettings>) => void;
  updateNewsPortalSettings: (patch: Partial<NewsPortalSettings>) => void;
  addQuota: (quota: Omit<CommercialQuota, 'id'>) => void;
  updateQuota: (id: string, patch: Partial<CommercialQuota>) => void;
  deleteQuota: (id: string) => void;
  addGalleryItem: (item: Omit<GalleryItem, 'id'>) => void;
  deleteGalleryItem: (id: string) => void;
  updatePopupConfig: (patch: Partial<CmsPopupConfig>) => void;
  popupPreviewOpen: boolean;
  setPopupPreviewOpen: (open: boolean) => void;

  /* Presets Travados pelo Super Admin */
  saveMarketingPreset: (preset: MarketingArtPreset) => boolean;
  deleteMarketingPreset: (id: string) => boolean;
  setMarketingPresetsLocked: (locked: boolean) => boolean;
  saveSiteCmsPreset: (preset: SiteCmsPreset) => boolean;
  deleteSiteCmsPreset: (id: string) => boolean;
  setSiteCmsPresetsLocked: (locked: boolean) => boolean;

  /* Gerenciador Central de Presets de Layout Globais */
  saveGlobalLayoutPreset: (payload: {
    id?: string;
    name: string;
    description: string;
    category: GlobalLayoutPreset['category'];
    lockRecord?: boolean;
    defaultMarketingPresetId?: string;
  }) => { ok: boolean; error?: string; preset?: GlobalLayoutPreset };
  updateGlobalPresetMeta: (
    id: string,
    patch: Partial<Pick<GlobalLayoutPreset, 'name' | 'description' | 'category' | 'defaultMarketingPresetId'>>
  ) => { ok: boolean; error?: string };
  loadGlobalLayoutPreset: (
    id: string,
    scope?: GlobalPresetScope
  ) => { ok: boolean; error?: string; preset?: GlobalLayoutPreset };
  toggleGlobalLayoutPresetLock: (id: string) => { ok: boolean; error?: string };
  deleteGlobalLayoutPreset: (id: string) => { ok: boolean; error?: string };
  setOnlySuperAdminCreatesGlobalPresets: (enabled: boolean) => boolean;

  /* Grade de Podcasts & Fotos dos Apresentadores */
  addPodcastShow: (show: Omit<PodcastShow, 'id'>) => void;
  updatePodcastShow: (id: string, patch: Partial<PodcastShow>) => void;
  deletePodcastShow: (id: string) => void;

  /* Cartas Oficiais, Convites & Propostas PDF */
  addOfficialLetter: (letter: Omit<OfficialLetterDocument, 'id' | 'createdAt' | 'updatedAt'>) => OfficialLetterDocument;
  updateOfficialLetter: (id: string, patch: Partial<OfficialLetterDocument>) => void;
  deleteOfficialLetter: (id: string) => void;

  /* Log de Auditoria de Presets */
  clearPresetAuditLogs: () => boolean;

  /* Repórteres & Distribuição de Matérias */
  addReporter: (
    reporter: Omit<ReporterProfile, 'id' | 'createdAt'>,
    loginPassword?: string
  ) => ReporterProfile;
  updateReporter: (id: string, patch: Partial<ReporterProfile>) => void;
  deleteReporter: (id: string) => void;
  assignPautaToReporter: (pautaId: string, reporterId: string | null) => void;

  /* Fontes Jornalísticas (Sigilo por Repórter + Super Admin) */
  addJournalisticSource: (
    source: Omit<JournalisticSource, 'id' | 'createdAt' | 'ownerUserId' | 'ownerName'> & {
      ownerUserId?: string;
      ownerName?: string;
    }
  ) => JournalisticSource;
  updateJournalisticSource: (id: string, patch: Partial<JournalisticSource>) => boolean;
  deleteJournalisticSource: (id: string) => boolean;

  /* Publicidade no Site (Banners Topo, Intervalo entre Matérias & Lateral) */
  addSiteAdBanner: (banner: Omit<SiteAdBanner, 'id' | 'updatedAt'>) => SiteAdBanner;
  updateSiteAdBanner: (id: string, patch: Partial<SiteAdBanner>) => void;
  deleteSiteAdBanner: (id: string) => void;
  updateSiteAdsConfig: (patch: Partial<SiteAdsConfig>) => void;

  resetDemoData: () => void;
}

const STORAGE_KEY = 'fortmidia_portal_state_v7';

const DEFAULT_STATE: FortMidiaState = {
  citizenReports: INITIAL_CITIZEN_REPORTS,
  contracts: INITIAL_CONTRACTS,
  leads: INITIAL_LEADS,
  pautas: hydratePautasWithInternalCodes(INITIAL_PAUTAS),
  studioBookings: INITIAL_STUDIO_BOOKINGS,
  financialEntries: INITIAL_FINANCIAL_ENTRIES,
  advertisingCampaigns: INITIAL_ADVERTISING_CAMPAIGNS,
  mediaBudgets: INITIAL_MEDIA_BUDGETS,
  budgetCatalog: BUDGET_PRODUCT_CATALOG,
  outdoorPoints: INITIAL_OUTDOOR_POINTS,
  siteSettings: INITIAL_SITE_SETTINGS,
  newsPortalSettings: INITIAL_NEWS_PORTAL_SETTINGS,
  quotas: COMMERCIAL_QUOTAS,
  galleryItems: INITIAL_GALLERY_ITEMS,
  popupConfig: INITIAL_POPUP_CONFIG,
  teamMembers: INITIAL_TEAM_MEMBERS,
  activeAdminUserId: INITIAL_TEAM_MEMBERS[0].id,
  clientTasks: INITIAL_CLIENT_TASKS,
  agendaEvents: INITIAL_AGENDA_EVENTS,
  notifications: INITIAL_NOTIFICATIONS,
  marketingPresets: INITIAL_MARKETING_PRESETS,
  marketingPresetsLocked: true,
  siteCmsPresets: INITIAL_SITE_CMS_PRESETS,
  siteCmsPresetsLocked: true,
  globalLayoutPresets: INITIAL_GLOBAL_LAYOUT_PRESETS,
  activeGlobalPresetId: INITIAL_GLOBAL_LAYOUT_PRESETS[0].id,
  onlySuperAdminCreatesGlobalPresets: false,
  podcastShows: OFFICIAL_PODCASTS,
  officialLetters: INITIAL_OFFICIAL_LETTERS,
  presetAuditLogs: INITIAL_PRESET_AUDIT_LOGS,
  reporters: INITIAL_REPORTERS,
  journalisticSources: INITIAL_JOURNALISTIC_SOURCES,
  siteAdBanners: INITIAL_SITE_AD_BANNERS,
  siteAdsConfig: INITIAL_SITE_ADS_CONFIG,
};

function hydrateTeamMembers(rawMembers?: TeamMember[]): TeamMember[] {
  if (!rawMembers || rawMembers.length === 0) return INITIAL_TEAM_MEMBERS;
  const migrated = rawMembers
    .filter((m) => !(m.id === 'usr-02' && m.name.toLowerCase().includes('emerson carneiro')))
    .map((m) => {
      const legacyRole = m.role as string;
      const normalizedRole: TeamRole =
        legacyRole === 'Administrador / Diretoria'
          ? 'Super Admin / Diretoria'
          : legacyRole in ROLE_PRESETS
            ? (legacyRole as TeamRole)
            : 'Super Admin / Diretoria';
      const preset = ROLE_PRESETS[normalizedRole];
      const isLegacySuperAdmin = m.id === 'usr-01' && m.name.toLowerCase().includes('asafe');
      const baseModules =
        m.allowedModules && m.allowedModules.length > 0
          ? [...m.allowedModules]
          : normalizedRole === 'Super Admin / Diretoria'
            ? [...ALL_ADMIN_TABS]
            : [...preset.allowedModules];

      if (
        normalizedRole === 'Super Admin / Diretoria' ||
        normalizedRole === 'Administrador' ||
        normalizedRole === 'Redator-Chefe' ||
        normalizedRole === 'Repórter / Jornalista'
      ) {
        if (!baseModules.includes('reporteres')) baseModules.push('reporteres');
        if (!baseModules.includes('fontes')) baseModules.push('fontes');
      }

      return {
        ...m,
        name: isLegacySuperAdmin ? 'Emerson Carneiro dos Santos' : m.name,
        phone:
          isLegacySuperAdmin || m.phone === '(11) 98655-5223' || m.phone === '(11) 99999-0001'
            ? '(11) 95779-2424'
            : m.phone,
        department: isLegacySuperAdmin
          ? 'Diretoria Executiva, Editor-Chefe & Super Admin'
          : m.department,
        role: normalizedRole,
        hierarchyLevel: m.hierarchyLevel ?? preset.hierarchyLevel,
        allowedModules: baseModules,
        permissions: m.permissions ?? { ...preset.permissions },
      };
    });
  return migrated.length > 0 ? migrated : INITIAL_TEAM_MEMBERS;
}

function hydrateBudgetCatalog(rawCatalog?: BudgetCatalogItem[]): BudgetCatalogItem[] {
  if (!rawCatalog || rawCatalog.length === 0) return BUDGET_PRODUCT_CATALOG;
  const existingIds = new Set(rawCatalog.map((c) => c.id));
  const missingFortTech = BUDGET_PRODUCT_CATALOG.filter(
    (item) => item.category === 'FortTech & Soluções IA' && !existingIds.has(item.id)
  );
  return missingFortTech.length > 0 ? [...rawCatalog, ...missingFortTech] : rawCatalog;
}

const FortMidiaContext = createContext<FortMidiaContextValue | null>(null);

export const FortMidiaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false);

  const [state, setState] = useState<FortMidiaState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FortMidiaState>;
        const mergedSite = { ...INITIAL_SITE_SETTINGS, ...(parsed.siteSettings ?? {}) };
        if (
          !mergedSite.whatsappNumber ||
          mergedSite.whatsappNumber === '5511999990000' ||
          mergedSite.whatsappNumber === '5511986555223'
        ) {
          mergedSite.whatsappNumber = '5511957792424';
        }
        if (!mergedSite.instagramUrl) mergedSite.instagramUrl = INITIAL_SITE_SETTINGS.instagramUrl;
        if (!mergedSite.facebookUrl) mergedSite.facebookUrl = INITIAL_SITE_SETTINGS.facebookUrl;
        if (!mergedSite.youtubeUrl) mergedSite.youtubeUrl = INITIAL_SITE_SETTINGS.youtubeUrl;

        const hydratedMembers = hydrateTeamMembers(parsed.teamMembers);
        const validActiveId = hydratedMembers.some((m) => m.id === parsed.activeAdminUserId)
          ? (parsed.activeAdminUserId as string)
          : hydratedMembers[0].id;

        return {
          citizenReports: parsed.citizenReports ?? INITIAL_CITIZEN_REPORTS,
          contracts: parsed.contracts ?? INITIAL_CONTRACTS,
          leads: parsed.leads ?? INITIAL_LEADS,
          pautas: hydratePautasWithInternalCodes(parsed.pautas ?? INITIAL_PAUTAS),
          studioBookings: parsed.studioBookings ?? INITIAL_STUDIO_BOOKINGS,
          financialEntries: parsed.financialEntries ?? INITIAL_FINANCIAL_ENTRIES,
          advertisingCampaigns: parsed.advertisingCampaigns ?? INITIAL_ADVERTISING_CAMPAIGNS,
          mediaBudgets: parsed.mediaBudgets ?? INITIAL_MEDIA_BUDGETS,
          budgetCatalog: hydrateBudgetCatalog(parsed.budgetCatalog),
          outdoorPoints: (parsed.outdoorPoints ?? INITIAL_OUTDOOR_POINTS).map((pt) => ({
            ...pt,
            lat: typeof pt.lat === 'number' ? pt.lat : -23.3219,
            lng: typeof pt.lng === 'number' ? pt.lng : -46.7272,
          })),
          siteSettings: mergedSite,
          newsPortalSettings: {
            ...INITIAL_NEWS_PORTAL_SETTINGS,
            ...(parsed.newsPortalSettings ?? {}),
          },
          quotas: parsed.quotas ?? COMMERCIAL_QUOTAS,
          galleryItems: parsed.galleryItems ?? INITIAL_GALLERY_ITEMS,
          popupConfig: { ...INITIAL_POPUP_CONFIG, ...(parsed.popupConfig ?? {}) },
          teamMembers: hydratedMembers,
          activeAdminUserId: validActiveId,
          clientTasks: parsed.clientTasks ?? INITIAL_CLIENT_TASKS,
          agendaEvents: parsed.agendaEvents ?? INITIAL_AGENDA_EVENTS,
          notifications: parsed.notifications ?? INITIAL_NOTIFICATIONS,
          marketingPresets:
            parsed.marketingPresets && parsed.marketingPresets.length > 0
              ? parsed.marketingPresets
              : INITIAL_MARKETING_PRESETS,
          marketingPresetsLocked: parsed.marketingPresetsLocked ?? true,
          siteCmsPresets:
            parsed.siteCmsPresets && parsed.siteCmsPresets.length > 0
              ? parsed.siteCmsPresets
              : INITIAL_SITE_CMS_PRESETS,
          siteCmsPresetsLocked: parsed.siteCmsPresetsLocked ?? true,
          globalLayoutPresets:
            parsed.globalLayoutPresets && parsed.globalLayoutPresets.length > 0
              ? parsed.globalLayoutPresets
              : INITIAL_GLOBAL_LAYOUT_PRESETS,
          activeGlobalPresetId:
            parsed.activeGlobalPresetId !== undefined
              ? parsed.activeGlobalPresetId
              : INITIAL_GLOBAL_LAYOUT_PRESETS[0].id,
          onlySuperAdminCreatesGlobalPresets:
            parsed.onlySuperAdminCreatesGlobalPresets ?? false,
          podcastShows:
            parsed.podcastShows && parsed.podcastShows.length > 0
              ? parsed.podcastShows
              : OFFICIAL_PODCASTS,
          officialLetters:
            parsed.officialLetters && parsed.officialLetters.length > 0
              ? parsed.officialLetters
              : INITIAL_OFFICIAL_LETTERS,
          presetAuditLogs:
            parsed.presetAuditLogs && parsed.presetAuditLogs.length > 0
              ? parsed.presetAuditLogs
              : INITIAL_PRESET_AUDIT_LOGS,
          reporters:
            parsed.reporters && parsed.reporters.length > 0
              ? parsed.reporters
              : INITIAL_REPORTERS,
          journalisticSources:
            parsed.journalisticSources !== undefined
              ? parsed.journalisticSources
              : INITIAL_JOURNALISTIC_SOURCES,
          siteAdBanners:
            parsed.siteAdBanners && parsed.siteAdBanners.length > 0
              ? parsed.siteAdBanners
              : INITIAL_SITE_AD_BANNERS,
          siteAdsConfig: {
            ...INITIAL_SITE_ADS_CONFIG,
            ...(parsed.siteAdsConfig ?? {}),
          },
        };
      }
    } catch {
      // Fallback to default seed data if storage is unavailable
    }
    return DEFAULT_STATE;
  });

  // Sync CMS color theme dynamically with CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--fort-primary', state.siteSettings.primaryColor);
    root.style.setProperty('--fort-gold', state.siteSettings.goldColor);
    root.style.setProperty('--fort-bg', state.siteSettings.backgroundColor);
  }, [
    state.siteSettings.primaryColor,
    state.siteSettings.goldColor,
    state.siteSettings.backgroundColor,
  ]);

  const hasHydratedFromApi = useRef(false);

  // Tenta hidratar estado inicial a partir da API REST (PHP/MySQL); mantém localStorage como fallback transparente
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snapshotRes = await stateApi.fetchSnapshot<FortMidiaState>();
      if (!cancelled && snapshotRes.ok && snapshotRes.data?.state) {
        const remote = snapshotRes.data.state;
        setState((prev) => ({
          ...prev,
          ...remote,
          pautas: hydratePautasWithInternalCodes(remote.pautas ?? prev.pautas),
          siteSettings: { ...prev.siteSettings, ...(remote.siteSettings ?? {}) },
          newsPortalSettings: { ...prev.newsPortalSettings, ...(remote.newsPortalSettings ?? {}) },
          teamMembers: remote.teamMembers ? hydrateTeamMembers(remote.teamMembers) : prev.teamMembers,
          budgetCatalog: remote.budgetCatalog
            ? hydrateBudgetCatalog(remote.budgetCatalog)
            : prev.budgetCatalog,
        }));
        hasHydratedFromApi.current = true;
        return;
      }

      // Mesmo sem snapshot completo autenticado, tenta buscar notícias públicas do Portal FortNews
      const publicNewsRes = await newsApi.list();
      if (!cancelled && publicNewsRes.ok && Array.isArray(publicNewsRes.data?.items) && publicNewsRes.data.items.length > 0) {
        setState((prev) => ({
          ...prev,
          pautas: hydratePautasWithInternalCodes(publicNewsRes.data!.items),
        }));
      }
      hasHydratedFromApi.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors in restricted sandboxes
    }

    if (!hasHydratedFromApi.current || !getApiAuthToken()) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      void stateApi.saveSnapshot(state);
    }, 900);

    return () => window.clearTimeout(syncTimer);
  }, [state]);

  const formatNow = () => {
    const now = new Date();
    const d = now.toLocaleDateString('pt-BR');
    const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${d} · ${t}`;
  };

  const submitCitizenReport: FortMidiaContextValue['submitCitizenReport'] = (payload) => {
    const code = Math.floor(1000 + Math.random() * 9000);
    const newReport: CitizenReport = {
      id: `rep-${Date.now()}`,
      protocol: `FC-2026-${code}`,
      ...payload,
      createdAt: formatNow(),
      status: 'Aguardando Triagem',
    };
    setState((prev) => ({
      ...prev,
      citizenReports: [newReport, ...prev.citizenReports],
    }));
    void citizenApi.submit(newReport);
    return newReport;
  };

  const runAutoTriage = () => {
    let triagedCount = 0;
    setState((prev) => {
      const updated = prev.citizenReports.map((report) => {
        if (report.status !== 'Aguardando Triagem') return report;
        triagedCount += 1;

        const text = `${report.title} ${report.description}`.toLowerCase();
        const highImpactKeywords = [
          'cratera',
          'risco',
          'ubs',
          'hospital',
          'escola',
          'segurança',
          'iluminação',
          'trânsito',
          'ônibus',
          'alagamento',
          'prefeitura',
        ];
        const keywordHits = highImpactKeywords.filter((kw) => text.includes(kw)).length;
        const baseScore = report.urgency === 'Crítica' ? 88 : report.urgency === 'Alta' ? 76 : 62;
        const finalScore = Math.min(99, baseScore + keywordHits * 4);

        const assignedEditor =
          report.city === 'Franco da Rocha' || report.city === 'Francisco Morato'
            ? 'Equipe de Rua · Franco/Morato'
            : report.city === 'Caieiras' || report.city === 'Mairiporã'
              ? 'Núcleo Editorial · Caieiras/Serra'
              : 'Correspondente · Cajamar/Anhanguera';

        return {
          ...report,
          status: 'Triado · Alta Prioridade' as CitizenStatus,
          triageScore: finalScore,
          assignedEditor,
        };
      });
      return { ...prev, citizenReports: updated };
    });
    return triagedCount;
  };

  const updateCitizenStatus = (id: string, status: CitizenStatus) => {
    setState((prev) => ({
      ...prev,
      citizenReports: prev.citizenReports.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    if (getApiAuthToken()) {
      void citizenApi.updateStatus(id, status);
    }
  };

  const updateCitizenReport = (id: string, patch: Partial<CitizenReport>) => {
    setState((prev) => ({
      ...prev,
      citizenReports: prev.citizenReports.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    if (patch.status && getApiAuthToken()) {
      void citizenApi.updateStatus(id, patch.status);
    }
  };

  const deleteCitizenReport = (id: string) => {
    setState((prev) => ({
      ...prev,
      citizenReports: prev.citizenReports.filter((r) => r.id !== id),
    }));
    if (getApiAuthToken()) {
      void citizenApi.remove(id);
    }
  };

  const promoteReportToPauta = (
    reportId: string,
    format: EditorialPauta['format'],
    reporterId?: string
  ) => {
    setState((prev) => {
      const target = prev.citizenReports.find((r) => r.id === reportId);
      if (!target) return prev;

      const selectedReporter = reporterId
        ? prev.reporters.find((rep) => rep.id === reporterId)
        : undefined;

      const alreadyExists = prev.pautas.some((p) => p.sourceProtocol === target.protocol);
      const nextPautas = alreadyExists
        ? prev.pautas
        : [
            {
              id: `pau-${Date.now()}`,
              internalCode: getNextPautaInternalCode(prev.pautas),
              title: `${target.title} (${target.neighborhood})`,
              city: target.city,
              seal: (target.urgency === 'Crítica' ? 'Urgente' : 'Cidade & Política') as NewsSeal,
              format,
              reporter:
                selectedReporter?.name || target.assignedEditor || 'Redação Central FortNews',
              assignedReporterId: selectedReporter?.id,
              deadline: new Date().toLocaleDateString('pt-BR'),
              status: 'Apuração de Rua' as PautaStatus,
              approvalStatus: 'Aguardando Redator-Chefe' as const,
              summary: target.description.slice(0, 160),
              body: target.officialResponseNote
                ? `${target.description}\n\nNota devolutiva registrada:\n${target.officialResponseNote}`
                : target.description,
              sourceProtocol: target.protocol,
            },
            ...prev.pautas,
          ];

      return {
        ...prev,
        citizenReports: prev.citizenReports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: 'Convertido em Pauta',
                assignedEditor: selectedReporter?.name || r.assignedEditor,
              }
            : r
        ),
        pautas: nextPautas,
      };
    });
  };

  const submitCommercialLead: FortMidiaContextValue['submitCommercialLead'] = (payload) => {
    const newLead: CommercialLead = {
      id: `lead-${Date.now()}`,
      ...payload,
      createdAt: formatNow(),
      status: 'Novo Lead',
    };
    setState((prev) => ({
      ...prev,
      leads: [newLead, ...prev.leads],
    }));
    void crmApi.createLead(newLead);
    return newLead;
  };

  const updateLead = (id: string, patch: Partial<CommercialLead>) => {
    setState((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const updateLeadStatus = (id: string, status: CommercialLead['status']) => {
    setState((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === id ? { ...l, status } : l)),
    }));
  };

  const deleteLead = (id: string) => {
    setState((prev) => ({
      ...prev,
      leads: prev.leads.filter((l) => l.id !== id),
    }));
  };

  const addContract = (contract: Omit<CommercialContract, 'id'>) => {
    const newContract: CommercialContract = {
      ...contract,
      id: `ctr-${Date.now().toString().slice(-4)}`,
    };
    setState((prev) => ({
      ...prev,
      contracts: [newContract, ...prev.contracts],
    }));
  };

  const updateContract = (id: string, patch: Partial<CommercialContract>) => {
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const updateContractStatus = (id: string, status: ContractStatus) => {
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  };

  const deleteContract = (id: string) => {
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((c) => c.id !== id),
    }));
  };

  const addPauta = (pauta: Omit<EditorialPauta, 'id'>) => {
    setState((prev) => ({
      ...prev,
      pautas: [
        {
          ...pauta,
          id: `pau-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          internalCode: pauta.internalCode || getNextPautaInternalCode(prev.pautas),
        },
        ...prev.pautas,
      ],
    }));
  };

  const updatePautaStatus = (id: string, status: PautaStatus) => {
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  };

  const updatePautaSeal = (id: string, seal: NewsSeal) => {
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, seal } : p)),
    }));
  };

  const updatePautaContent = (id: string, patch: Partial<EditorialPauta>) => {
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const deletePauta = (id: string) => {
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.filter((p) => p.id !== id),
    }));
  };

  const chiefEditorApprovePauta = (id: string, chiefName: string, publishNow = false) => {
    const nowLabel = formatNow();
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) =>
        p.id === id
          ? {
              ...p,
              approvalStatus: publishNow
                ? 'Publicada no Site'
                : 'Aprovada pelo Redator-Chefe',
              status: publishNow ? 'Publicado' : p.status,
              approvedBy: `${chiefName} (Editor-Chefe)`,
              publishedAt: publishNow ? nowLabel : p.publishedAt,
            }
          : p
      ),
    }));
  };

  const publishPautaToSite = (id: string) => {
    const nowLabel = formatNow();
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) =>
        p.id === id
          ? {
              ...p,
              approvalStatus: 'Publicada no Site',
              status: 'Publicado',
              publishedAt: nowLabel,
            }
          : p
      ),
    }));
  };

  const unpublishPauta = (id: string) => {
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) =>
        p.id === id
          ? {
              ...p,
              approvalStatus: 'Aguardando Redator-Chefe',
              status: 'Edição & Cortes',
            }
          : p
      ),
    }));
  };

  const parseHourDecimal = (hhmm: string) => {
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    return h + m / 60;
  };

  const addStudioBooking: FortMidiaContextValue['addStudioBooking'] = (booking) => {
    const startH = parseHourDecimal(booking.startHour);
    const endH = startH + booking.durationHours;

    const conflict = state.studioBookings.find((b) => {
      if (b.date !== booking.date) return false;
      const bStart = parseHourDecimal(b.startHour);
      const bEnd = bStart + b.durationHours;
      return startH < bEnd && endH > bStart;
    });

    if (conflict) {
      return {
        ok: false,
        error: `Conflito de horário com "${conflict.programOrClient}" (${conflict.startHour}).`,
      };
    }

    setState((prev) => ({
      ...prev,
      studioBookings: [{ ...booking, id: `stb-${Date.now()}` }, ...prev.studioBookings],
    }));
    return { ok: true };
  };

  const updateStudioBooking: FortMidiaContextValue['updateStudioBooking'] = (id, patch) => {
    const current = state.studioBookings.find((b) => b.id === id);
    if (!current) {
      return { ok: false, error: 'Agendamento não encontrado.' };
    }

    const merged: StudioBooking = { ...current, ...patch };
    const startH = parseHourDecimal(merged.startHour);
    const endH = startH + merged.durationHours;

    const conflict = state.studioBookings.find((b) => {
      if (b.id === id) return false;
      if (b.date !== merged.date) return false;
      const bStart = parseHourDecimal(b.startHour);
      const bEnd = bStart + b.durationHours;
      return startH < bEnd && endH > bStart;
    });

    if (conflict) {
      return {
        ok: false,
        error: `Conflito de horário com "${conflict.programOrClient}" (${conflict.startHour}).`,
      };
    }

    setState((prev) => ({
      ...prev,
      studioBookings: prev.studioBookings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
    return { ok: true };
  };

  const updateStudioBookingStatus = (id: string, status: StudioBooking['status']) => {
    setState((prev) => ({
      ...prev,
      studioBookings: prev.studioBookings.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
  };

  const deleteStudioBooking = (id: string) => {
    setState((prev) => ({
      ...prev,
      studioBookings: prev.studioBookings.filter((b) => b.id !== id),
    }));
  };

  /* Gestão de Publicidade */
  const addAdvertisingCampaign = (campaign: Omit<AdvertisingCampaign, 'id'>) => {
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: [
        { ...campaign, id: `adv-${Date.now()}` },
        ...prev.advertisingCampaigns,
      ],
    }));
  };

  const updateAdvertisingStatus = (id: string, status: AdvertisingStatus) => {
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: prev.advertisingCampaigns.map((c) =>
        c.id === id ? { ...c, status } : c
      ),
    }));
  };

  const updateArtworkStatus = (id: string, artworkStatus: ArtworkStatus) => {
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: prev.advertisingCampaigns.map((c) =>
        c.id === id ? { ...c, artworkStatus } : c
      ),
    }));
  };

  const deleteAdvertisingCampaign = (id: string) => {
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: prev.advertisingCampaigns.filter((c) => c.id !== id),
    }));
  };

  /* Financeiro de Agência */
  const addFinancialEntry = (entry: Omit<FinancialEntry, 'id'>) => {
    setState((prev) => ({
      ...prev,
      financialEntries: [{ ...entry, id: `fin-${Date.now()}` }, ...prev.financialEntries],
    }));
  };

  const updateFinancialStatus = (id: string, status: FinancialPaymentStatus) => {
    setState((prev) => ({
      ...prev,
      financialEntries: prev.financialEntries.map((f) => (f.id === id ? { ...f, status } : f)),
    }));
  };

  const deleteFinancialEntry = (id: string) => {
    setState((prev) => ({
      ...prev,
      financialEntries: prev.financialEntries.filter((f) => f.id !== id),
    }));
  };

  /* Orçamento & Plano de Mídia */
  const addMediaBudget: FortMidiaContextValue['addMediaBudget'] = (budget) => {
    const created: MediaPlanBudget = {
      ...budget,
      id: `bdg-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      mediaBudgets: [created, ...prev.mediaBudgets],
    }));
    return created;
  };

  const updateMediaBudget = (id: string, patch: Partial<MediaPlanBudget>) => {
    setState((prev) => ({
      ...prev,
      mediaBudgets: prev.mediaBudgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const updateMediaBudgetStatus = (id: string, status: BudgetStatus) => {
    setState((prev) => ({
      ...prev,
      mediaBudgets: prev.mediaBudgets.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
  };

  const deleteMediaBudget = (id: string) => {
    setState((prev) => ({
      ...prev,
      mediaBudgets: prev.mediaBudgets.filter((b) => b.id !== id),
    }));
  };

  const convertBudgetToErp: FortMidiaContextValue['convertBudgetToErp'] = (budgetId) => {
    const budget = state.mediaBudgets.find((b) => b.id === budgetId);
    if (!budget) return { campaignsCreated: 0, entriesCreated: 0 };

    const gross = budget.items.reduce((sum, it) => sum + it.quantity * it.unitValue, 0);
    const feeMultiplier = 1 + Math.max(0, budget.agencyFeePercent ?? 0) / 100;
    const grossWithFee = gross * feeMultiplier;
    const discountVal =
      budget.discountType === 'fixed'
        ? Math.min(grossWithFee, Math.max(0, budget.discountValue ?? 0))
        : (grossWithFee * Math.min(100, Math.max(0, budget.discountPercent || 0))) / 100;
    const netTotal = Math.max(0, grossWithFee - discountVal);

    const mapAdType = (
      cat: string,
      productName: string
    ): AdvertisingCampaign['adType'] => {
      const lower = `${cat} ${productName}`.toLowerCase();
      if (lower.includes('outdoor') || lower.includes('ooh')) return 'Outdoor';
      if (lower.includes('patroc')) return 'Patrocínio';
      if (lower.includes('podcast')) return 'Podcast';
      if (lower.includes('revista') || lower.includes('tabloide')) return 'Revista';
      if (lower.includes('evento')) return 'Eventos';
      if (lower.includes('cota')) return 'Cota';
      if (lower.includes('apoio')) return 'Apoio';
      return 'Outros';
    };

    const ts = Date.now();
    const newCampaigns: AdvertisingCampaign[] = budget.items.map((item, idx) => ({
      id: `adv-erp-${ts}-${idx}`,
      advertiser: budget.clientName,
      adType: mapAdType(item.category, item.productName),
      title: `${item.productName} (${budget.code})`,
      placementSpec: item.description,
      city: budget.city,
      startDate: item.startDate,
      endDate: item.endDate,
      value: Math.round(item.quantity * item.unitValue * 100) / 100,
      status: 'Programada',
      artworkStatus: 'Aguardando Material',
      accountManager: budget.accountManager,
    }));

    const clientAccessCode = budget.clientName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 6)
      .concat('-26');

    const newClientTasks: ClientServiceTask[] = budget.items.map((item, idx) => ({
      id: `tsk-erp-${ts}-${idx}`,
      clientName: budget.clientName,
      accessCode: clientAccessCode,
      title: `${item.productName} (${budget.code})`,
      serviceType: item.category,
      city: budget.city,
      stage: 'Briefing & Material',
      priority: 'Alta',
      dueDate: item.startDate || budget.campaignStartDate,
      assigneeName: budget.accountManager,
      assigneeAvatar: '/assets/aistudio/Logo_FortM_dia_ded2b7d7.png',
      description: item.description,
      checklist: [
        { id: `ck-${ts}-${idx}-1`, label: 'Receber briefing e logotipos do cliente', done: false },
        { id: `ck-${ts}-${idx}-2`, label: 'Aprovação final de arte/roteiro', done: false },
      ],
      updatedAt: formatNow(),
    }));

    const installments = Math.max(1, Math.min(12, budget.installmentsCount ?? 1));
    const perInstallment = Math.round((netTotal / installments) * 100) / 100;
    const baseDate = new Date(`${budget.campaignStartDate || '2026-12-01'}T12:00:00`);

    const newEntries: FinancialEntry[] = Array.from({ length: installments }).map((_, idx) => {
      const due = new Date(baseDate);
      due.setMonth(due.getMonth() + idx);
      const dueStr = Number.isNaN(due.getTime())
        ? budget.campaignStartDate
        : due.toISOString().slice(0, 10);

      return {
        id: `fin-erp-${ts}-${idx}`,
        type: 'Receita',
        description:
          installments > 1
            ? `${budget.title} — Parcela ${idx + 1}/${installments} (${budget.code})`
            : `${budget.title} (${budget.code})`,
        counterpartyName: budget.clientName,
        counterpartyRole: 'Anunciante / Cliente',
        costCenter: 'Orçamentos & Planos 360°',
        dueDate: dueStr,
        amount: perInstallment,
        status: 'Pendente',
        paymentMethod: 'Boleto',
        invoiceRef: budget.code,
      };
    });

    const nowStamp = formatNow();
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: [...newCampaigns, ...prev.advertisingCampaigns],
      financialEntries: [...newEntries, ...prev.financialEntries],
      clientTasks: [...newClientTasks, ...prev.clientTasks],
      mediaBudgets: prev.mediaBudgets.map((b) =>
        b.id === budgetId
          ? { ...b, status: 'Aprovado', convertedToErpAt: nowStamp }
          : b
      ),
    }));

    return { campaignsCreated: newCampaigns.length, entriesCreated: newEntries.length };
  };

  /* Tabela de Serviços/Produtos & Inventário de Outdoors */
  const addCatalogItem = (item: Omit<BudgetCatalogItem, 'id'>) => {
    setState((prev) => ({
      ...prev,
      budgetCatalog: [{ ...item, id: `cat-${Date.now()}` }, ...prev.budgetCatalog],
    }));
  };

  const updateCatalogItem = (id: string, patch: Partial<BudgetCatalogItem>) => {
    setState((prev) => ({
      ...prev,
      budgetCatalog: prev.budgetCatalog.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const deleteCatalogItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      budgetCatalog: prev.budgetCatalog.filter((c) => c.id !== id),
    }));
  };

  const addOutdoorPoint = (point: Omit<OutdoorPoint, 'id'>) => {
    setState((prev) => ({
      ...prev,
      outdoorPoints: [{ ...point, id: `out-${Date.now()}` }, ...prev.outdoorPoints],
    }));
  };

  const updateOutdoorPoint = (id: string, patch: Partial<OutdoorPoint>) => {
    setState((prev) => ({
      ...prev,
      outdoorPoints: prev.outdoorPoints.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  };

  const deleteOutdoorPoint = (id: string) => {
    setState((prev) => ({
      ...prev,
      outdoorPoints: prev.outdoorPoints.filter((o) => o.id !== id),
    }));
  };

  /* Equipe & Pessoas */
  const addTeamMember = (member: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const newMember: TeamMember = {
      ...member,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };
    setState((prev) => ({
      ...prev,
      teamMembers: [newMember, ...prev.teamMembers],
    }));
  };

  const updateTeamMember = (id: string, patch: Partial<TeamMember>) => {
    setState((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const deleteTeamMember = (id: string) => {
    setState((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
      activeAdminUserId:
        prev.activeAdminUserId === id
          ? (prev.teamMembers.find((m) => m.id !== id)?.id ?? '')
          : prev.activeAdminUserId,
    }));
  };

  const setActiveAdminUserId = (id: string) => {
    setState((prev) => ({ ...prev, activeAdminUserId: id }));
  };

  /* Agenda Corporativa */
  const addAgendaEvent = (event: Omit<AgendaEvent, 'id'>) => {
    setState((prev) => ({
      ...prev,
      agendaEvents: [{ ...event, id: `agd-${Date.now()}` }, ...prev.agendaEvents],
    }));
  };

  const updateAgendaEvent = (id: string, patch: Partial<AgendaEvent>) => {
    setState((prev) => ({
      ...prev,
      agendaEvents: prev.agendaEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  };

  const deleteAgendaEvent = (id: string) => {
    setState((prev) => ({
      ...prev,
      agendaEvents: prev.agendaEvents.filter((e) => e.id !== id),
    }));
  };

  /* Central de Notificações */
  const addNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `ntf-${Date.now()}`,
      createdAt: formatNow(),
      read: false,
    };
    setState((prev) => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications],
    }));
  };

  const markNotificationRead = (id: string, read = true) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read } : n)),
    }));
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const deleteNotification = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  };

  /* Painel do Cliente — Quadro Kanban */
  const addClientTask = (task: Omit<ClientServiceTask, 'id' | 'updatedAt'>) => {
    const newTask: ClientServiceTask = {
      ...task,
      id: `tsk-${Date.now()}`,
      updatedAt: formatNow(),
    };
    setState((prev) => ({
      ...prev,
      clientTasks: [newTask, ...prev.clientTasks],
    }));
  };

  const updateClientTask = (id: string, patch: Partial<ClientServiceTask>) => {
    const now = formatNow();
    setState((prev) => ({
      ...prev,
      clientTasks: prev.clientTasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: now } : t
      ),
    }));
  };

  const moveClientTaskStage = (id: string, stage: ClientKanbanStage) => {
    const now = formatNow();
    setState((prev) => ({
      ...prev,
      clientTasks: prev.clientTasks.map((t) =>
        t.id === id ? { ...t, stage, updatedAt: now } : t
      ),
    }));
  };

  const toggleClientChecklistItem = (taskId: string, checklistId: string) => {
    const now = formatNow();
    setState((prev) => ({
      ...prev,
      clientTasks: prev.clientTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              updatedAt: now,
              checklist: t.checklist.map((c) =>
                c.id === checklistId ? { ...c, done: !c.done } : c
              ),
            }
          : t
      ),
    }));
  };

  const deleteClientTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      clientTasks: prev.clientTasks.filter((t) => t.id !== id),
    }));
  };

  /* CMS Completo */
  const updateSiteSettings = (patch: Partial<SiteSettings>) => {
    setState((prev) => ({
      ...prev,
      siteSettings: { ...prev.siteSettings, ...patch },
    }));
  };

  const updateNewsPortalSettings = (patch: Partial<NewsPortalSettings>) => {
    setState((prev) => ({
      ...prev,
      newsPortalSettings: { ...prev.newsPortalSettings, ...patch },
    }));
  };

  const addQuota = (quota: Omit<CommercialQuota, 'id'>) => {
    setState((prev) => ({
      ...prev,
      quotas: [{ ...quota, id: `quota-${Date.now()}` }, ...prev.quotas],
    }));
  };

  const updateQuota = (id: string, patch: Partial<CommercialQuota>) => {
    setState((prev) => ({
      ...prev,
      quotas: prev.quotas.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  };

  const deleteQuota = (id: string) => {
    setState((prev) => ({
      ...prev,
      quotas: prev.quotas.filter((q) => q.id !== id),
    }));
  };

  const addGalleryItem = (item: Omit<GalleryItem, 'id'>) => {
    setState((prev) => ({
      ...prev,
      galleryItems: [{ ...item, id: `gal-${Date.now()}` }, ...prev.galleryItems],
    }));
  };

  const deleteGalleryItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      galleryItems: prev.galleryItems.filter((g) => g.id !== id),
    }));
  };

  const updatePopupConfig = (patch: Partial<CmsPopupConfig>) => {
    setState((prev) => ({
      ...prev,
      popupConfig: { ...prev.popupConfig, ...patch },
    }));
  };

  /* Presets Travados pelo Super Admin & Auditoria */
  const isCurrentUserSuperAdmin = (): boolean => {
    const active = state.teamMembers.find((m) => m.id === state.activeAdminUserId);
    return !active || active.role === 'Super Admin / Diretoria' || active.hierarchyLevel === 1;
  };

  const buildAuditEntry = (
    action: PresetAuditAction,
    presetScope: PresetAuditScope,
    presetId: string,
    presetName: string,
    details: string
  ): PresetAuditLogEntry => {
    const active = state.teamMembers.find((m) => m.id === state.activeAdminUserId);
    return {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatNow(),
      actorId: active?.id || state.activeAdminUserId || 'usr-01',
      actorName: active?.name || 'Super Admin',
      actorRole: active?.role || 'Super Admin / Diretoria',
      action,
      presetScope,
      presetId,
      presetName,
      details,
    };
  };

  const appendAuditEntry = (entry: PresetAuditLogEntry) => {
    setState((prev) => ({
      ...prev,
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
  };

  const saveMarketingPreset = (preset: MarketingArtPreset): boolean => {
    if (!isCurrentUserSuperAdmin()) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'Estúdio Marketing',
          preset.id,
          preset.name,
          'Tentativa bloqueada de salvar/alterar preset do Estúdio Marketing por usuário sem perfil Super Admin.'
        )
      );
      return false;
    }
    const exists = state.marketingPresets.some((p) => p.id === preset.id);
    const entry = buildAuditEntry(
      exists ? 'Alterou' : 'Criou',
      'Estúdio Marketing',
      preset.id,
      preset.name,
      exists
        ? 'Preset visual de marketing atualizado pelo Super Admin.'
        : 'Novo preset visual de marketing salvo pelo Super Admin.'
    );
    setState((prev) => {
      const hasPreset = prev.marketingPresets.some((p) => p.id === preset.id);
      return {
        ...prev,
        marketingPresets: hasPreset
          ? prev.marketingPresets.map((p) => (p.id === preset.id ? preset : p))
          : [...prev.marketingPresets, preset],
        presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
      };
    });
    return true;
  };

  const deleteMarketingPreset = (id: string): boolean => {
    const target = state.marketingPresets.find((p) => p.id === id);
    if (!isCurrentUserSuperAdmin()) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'Estúdio Marketing',
          id,
          target?.name || id,
          'Tentativa bloqueada de exclusão de preset de marketing.'
        )
      );
      return false;
    }
    const entry = buildAuditEntry(
      'Excluiu',
      'Estúdio Marketing',
      id,
      target?.name || id,
      'Preset de arte removido do Estúdio Marketing.'
    );
    setState((prev) => ({
      ...prev,
      marketingPresets: prev.marketingPresets.filter((p) => p.id !== id),
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return true;
  };

  const setMarketingPresetsLocked = (locked: boolean): boolean => {
    if (!isCurrentUserSuperAdmin()) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'Estúdio Marketing',
          'all-marketing',
          'Todos os Presets de Marketing',
          `Tentativa bloqueada de ${locked ? 'travar' : 'destravar'} trava global de marketing.`
        )
      );
      return false;
    }
    const entry = buildAuditEntry(
      locked ? 'Travou' : 'Destravou',
      'Estúdio Marketing',
      'all-marketing',
      'Catálogo de Presets de Marketing',
      locked
        ? 'Trava global ativada para proteger artes oficiais contra alterações.'
        : 'Trava global de marketing liberada pelo Super Admin.'
    );
    setState((prev) => ({
      ...prev,
      marketingPresetsLocked: locked,
      marketingPresets: prev.marketingPresets.map((p) => ({
        ...p,
        lockedBySuperAdmin: locked,
      })),
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return true;
  };

  const saveSiteCmsPreset = (preset: SiteCmsPreset): boolean => {
    if (!isCurrentUserSuperAdmin()) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'CMS Portais',
          preset.id,
          preset.name,
          'Tentativa bloqueada de salvar preset de identidade dos portais.'
        )
      );
      return false;
    }
    const exists = state.siteCmsPresets.some((p) => p.id === preset.id);
    const entry = buildAuditEntry(
      exists ? 'Alterou' : 'Criou',
      'CMS Portais',
      preset.id,
      preset.name,
      exists
        ? 'Preset de identidade visual dos portais atualizado.'
        : 'Novo preset de identidade visual dos portais salvo.'
    );
    setState((prev) => {
      const hasPreset = prev.siteCmsPresets.some((p) => p.id === preset.id);
      return {
        ...prev,
        siteCmsPresets: hasPreset
          ? prev.siteCmsPresets.map((p) => (p.id === preset.id ? preset : p))
          : [...prev.siteCmsPresets, preset],
        presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
      };
    });
    return true;
  };

  const deleteSiteCmsPreset = (id: string): boolean => {
    const target = state.siteCmsPresets.find((p) => p.id === id);
    if (!isCurrentUserSuperAdmin()) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'CMS Portais',
          id,
          target?.name || id,
          'Tentativa bloqueada de excluir preset CMS.'
        )
      );
      return false;
    }
    const entry = buildAuditEntry(
      'Excluiu',
      'CMS Portais',
      id,
      target?.name || id,
      'Preset de identidade CMS removido.'
    );
    setState((prev) => ({
      ...prev,
      siteCmsPresets: prev.siteCmsPresets.filter((p) => p.id !== id),
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return true;
  };

  const setSiteCmsPresetsLocked = (locked: boolean): boolean => {
    if (!isCurrentUserSuperAdmin()) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'CMS Portais',
          'all-cms',
          'Identidade Visual dos Portais',
          `Tentativa bloqueada de ${locked ? 'travar' : 'destravar'} identidade dos portais.`
        )
      );
      return false;
    }
    const entry = buildAuditEntry(
      locked ? 'Travou' : 'Destravou',
      'CMS Portais',
      'all-cms',
      'Identidade Visual dos Portais',
      locked
        ? 'Identidade visual (logos, cores e tamanhos) travada pelo Super Admin.'
        : 'Identidade visual dos portais liberada para edição.'
    );
    setState((prev) => ({
      ...prev,
      siteCmsPresetsLocked: locked,
      siteCmsPresets: prev.siteCmsPresets.map((p) => ({
        ...p,
        lockedBySuperAdmin: locked,
      })),
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return true;
  };

  /* Gerenciador Central de Presets de Layout Globais */
  const cloneGlobalSettingsSnapshot = (
    site: SiteSettings,
    news: NewsPortalSettings,
    popup: CmsPopupConfig
  ) => ({
    siteSettings: { ...site },
    newsPortalSettings: {
      ...news,
      marqueeAiItems: [...(news.marqueeAiItems || [])],
      enabledSeals: [...(news.enabledSeals || [])],
    },
    popupConfig: { ...popup },
  });

  const saveGlobalLayoutPreset: FortMidiaContextValue['saveGlobalLayoutPreset'] = (payload) => {
    const active = state.teamMembers.find((m) => m.id === state.activeAdminUserId);
    const superAdmin = isCurrentUserSuperAdmin();
    const nowLabel = formatNow();
    const trimmedName = payload.name.trim();

    if (!trimmedName) {
      return { ok: false, error: 'Informe um nome identificador para o preset global.' };
    }

    if (payload.id) {
      const existing = state.globalLayoutPresets.find((p) => p.id === payload.id);
      if (!existing) {
        return { ok: false, error: 'Preset global não encontrado.' };
      }
      if ((existing.definedBySuperAdmin || existing.lockedBySuperAdmin) && !superAdmin) {
        appendAuditEntry(
          buildAuditEntry(
            'Tentativa Bloqueada',
            'Layout Global',
            existing.id,
            existing.name,
            'Tentativa bloqueada de sobrescrever preset protegido pelo Super Admin.'
          )
        );
        return {
          ok: false,
          error:
            'Ação bloqueada: usuários comuns não podem alterar registros de preset definidos pelo Super Admin.',
        };
      }

      const snapshot = cloneGlobalSettingsSnapshot(
        state.siteSettings,
        state.newsPortalSettings,
        state.popupConfig
      );

      const updated: GlobalLayoutPreset = {
        ...existing,
        name: trimmedName,
        description: payload.description.trim() || existing.description,
        category: payload.category,
        ...snapshot,
        defaultMarketingPresetId:
          payload.defaultMarketingPresetId ?? existing.defaultMarketingPresetId,
        lockedBySuperAdmin: superAdmin
          ? (payload.lockRecord ?? existing.lockedBySuperAdmin)
          : existing.lockedBySuperAdmin,
        definedBySuperAdmin: superAdmin ? true : existing.definedBySuperAdmin,
        updatedBy: active?.name || 'Super Admin',
        updatedAt: nowLabel,
      };

      const entry = buildAuditEntry(
        'Alterou',
        'Layout Global',
        updated.id,
        updated.name,
        `Snapshot global atualizado (Logo FortMídia ${updated.siteSettings.logoHeightPx || 48}px · FortNews ${updated.newsPortalSettings.logoHeightPx}px).`
      );

      setState((prev) => ({
        ...prev,
        activeGlobalPresetId: updated.id,
        globalLayoutPresets: prev.globalLayoutPresets.map((p) =>
          p.id === updated.id ? updated : p
        ),
        presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
      }));
      return { ok: true, preset: updated };
    }

    if (state.onlySuperAdminCreatesGlobalPresets && !superAdmin) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'Layout Global',
          'new-preset',
          trimmedName,
          'Tentativa bloqueada de criação de novo preset global com modo estrito ativo.'
        )
      );
      return {
        ok: false,
        error:
          'Modo de governança estrita ativo: apenas o Super Admin pode criar novos presets globais.',
      };
    }

    const snapshot = cloneGlobalSettingsSnapshot(
      state.siteSettings,
      state.newsPortalSettings,
      state.popupConfig
    );

    const created: GlobalLayoutPreset = {
      id: `gpreset-${Date.now()}`,
      name: trimmedName,
      description:
        payload.description.trim() ||
        'Snapshot completo das configurações de layout globais do Grupo FortMídia e FortNews.',
      category: payload.category,
      ...snapshot,
      defaultMarketingPresetId: payload.defaultMarketingPresetId,
      lockedBySuperAdmin: superAdmin ? (payload.lockRecord ?? true) : false,
      definedBySuperAdmin: superAdmin,
      createdBy: active?.name || 'Super Admin',
      createdByRole: active?.role || 'Super Admin / Diretoria',
      updatedBy: active?.name || 'Super Admin',
      createdAt: nowLabel,
      updatedAt: nowLabel,
      lastAppliedAt: nowLabel,
    };

    const entry = buildAuditEntry(
      'Criou',
      'Layout Global',
      created.id,
      created.name,
      `Novo preset criado na categoria "${created.category}" (${created.lockedBySuperAdmin ? 'Travado pelo Super Admin' : 'Editável pela equipe'}).`
    );

    setState((prev) => ({
      ...prev,
      activeGlobalPresetId: created.id,
      globalLayoutPresets: [created, ...prev.globalLayoutPresets],
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));

    return { ok: true, preset: created };
  };

  const updateGlobalPresetMeta: FortMidiaContextValue['updateGlobalPresetMeta'] = (id, patch) => {
    const existing = state.globalLayoutPresets.find((p) => p.id === id);
    if (!existing) return { ok: false, error: 'Preset global não encontrado.' };

    const superAdmin = isCurrentUserSuperAdmin();
    if ((existing.definedBySuperAdmin || existing.lockedBySuperAdmin) && !superAdmin) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'Layout Global',
          existing.id,
          existing.name,
          'Tentativa bloqueada de editar metadados de preset protegido pelo Super Admin.'
        )
      );
      return {
        ok: false,
        error:
          'Ação bloqueada: somente o Super Admin pode editar este registro de preset.',
      };
    }

    const active = state.teamMembers.find((m) => m.id === state.activeAdminUserId);
    const nowLabel = formatNow();
    const entry = buildAuditEntry(
      'Alterou',
      'Layout Global',
      existing.id,
      patch.name || existing.name,
      `Metadados atualizados (Categoria: ${patch.category || existing.category}).`
    );

    setState((prev) => ({
      ...prev,
      globalLayoutPresets: prev.globalLayoutPresets.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              updatedBy: active?.name || 'Super Admin',
              updatedAt: nowLabel,
            }
          : p
      ),
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return { ok: true };
  };

  const loadGlobalLayoutPreset: FortMidiaContextValue['loadGlobalLayoutPreset'] = (
    id,
    scope = 'all'
  ) => {
    const target = state.globalLayoutPresets.find((p) => p.id === id);
    if (!target) {
      return { ok: false, error: 'Preset global não encontrado.' };
    }

    const nowLabel = formatNow();
    const cloned = cloneGlobalSettingsSnapshot(
      target.siteSettings,
      target.newsPortalSettings,
      target.popupConfig
    );

    const scopeLabel: Record<GlobalPresetScope, string> = {
      all: 'Portais FortMídia + FortNews + Pop-up',
      fortmidia: 'Somente Site FortMídia',
      fortnews: 'Somente Portal FortNews',
      popup: 'Somente Pop-up Global',
    };

    const entry = buildAuditEntry(
      'Carregou',
      'Layout Global',
      target.id,
      target.name,
      `Configuração carregada no escopo: ${scopeLabel[scope]}.`
    );

    setState((prev) => ({
      ...prev,
      activeGlobalPresetId: target.id,
      siteSettings:
        scope === 'all' || scope === 'fortmidia'
          ? { ...prev.siteSettings, ...cloned.siteSettings }
          : prev.siteSettings,
      newsPortalSettings:
        scope === 'all' || scope === 'fortnews'
          ? { ...prev.newsPortalSettings, ...cloned.newsPortalSettings }
          : prev.newsPortalSettings,
      popupConfig:
        scope === 'all' || scope === 'popup'
          ? { ...prev.popupConfig, ...cloned.popupConfig }
          : prev.popupConfig,
      globalLayoutPresets: prev.globalLayoutPresets.map((p) =>
        p.id === target.id ? { ...p, lastAppliedAt: nowLabel } : p
      ),
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));

    return { ok: true, preset: target };
  };

  const toggleGlobalLayoutPresetLock: FortMidiaContextValue['toggleGlobalLayoutPresetLock'] = (
    id
  ) => {
    const target = state.globalLayoutPresets.find((p) => p.id === id);
    if (!isCurrentUserSuperAdmin()) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'Layout Global',
          id,
          target?.name || id,
          'Tentativa bloqueada de alterar trava de proteção do preset.'
        )
      );
      return {
        ok: false,
        error: 'Apenas o Super Admin pode travar ou destravar registros de presets globais.',
      };
    }

    const active = state.teamMembers.find((m) => m.id === state.activeAdminUserId);
    const nowLabel = formatNow();
    const nextLocked = target ? !target.lockedBySuperAdmin : true;
    const entry = buildAuditEntry(
      nextLocked ? 'Travou' : 'Destravou',
      'Layout Global',
      id,
      target?.name || id,
      nextLocked
        ? 'Registro travado pelo Super Admin contra edição ou exclusão de usuários comuns.'
        : 'Registro destravado pelo Super Admin para colaboração da equipe.'
    );

    setState((prev) => ({
      ...prev,
      globalLayoutPresets: prev.globalLayoutPresets.map((p) =>
        p.id === id
          ? {
              ...p,
              lockedBySuperAdmin: !p.lockedBySuperAdmin,
              definedBySuperAdmin: true,
              updatedBy: active?.name || 'Super Admin',
              updatedAt: nowLabel,
            }
          : p
      ),
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return { ok: true };
  };

  const deleteGlobalLayoutPreset: FortMidiaContextValue['deleteGlobalLayoutPreset'] = (id) => {
    const target = state.globalLayoutPresets.find((p) => p.id === id);
    if (!target) return { ok: false, error: 'Preset não encontrado.' };

    const superAdmin = isCurrentUserSuperAdmin();
    if (
      (target.definedBySuperAdmin ||
        target.lockedBySuperAdmin ||
        state.onlySuperAdminCreatesGlobalPresets) &&
      !superAdmin
    ) {
      appendAuditEntry(
        buildAuditEntry(
          'Tentativa Bloqueada',
          'Layout Global',
          target.id,
          target.name,
          'Tentativa bloqueada de exclusão de preset definido/travado pelo Super Admin.'
        )
      );
      return {
        ok: false,
        error:
          'Acesso negado: presets definidos ou travados pelo Super Admin não podem ser excluídos por usuários comuns.',
      };
    }

    if (state.globalLayoutPresets.length <= 1) {
      return {
        ok: false,
        error: 'Mantenha pelo menos 1 preset global cadastrado no sistema.',
      };
    }

    const entry = buildAuditEntry(
      'Excluiu',
      'Layout Global',
      target.id,
      target.name,
      `Preset removido permanentemente da lista global (Autor original: ${target.createdBy}).`
    );

    setState((prev) => ({
      ...prev,
      globalLayoutPresets: prev.globalLayoutPresets.filter((p) => p.id !== id),
      activeGlobalPresetId:
        prev.activeGlobalPresetId === id ? null : prev.activeGlobalPresetId,
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return { ok: true };
  };

  const setOnlySuperAdminCreatesGlobalPresets = (enabled: boolean): boolean => {
    if (!isCurrentUserSuperAdmin()) return false;
    const entry = buildAuditEntry(
      enabled ? 'Travou' : 'Destravou',
      'Layout Global',
      'policy-strict-presets',
      'Política Global de Criação',
      enabled
        ? 'Restrição estrita ativada: apenas o Super Admin pode criar novos presets globais.'
        : 'Restrição estrita desativada: equipe autorizada a criar rascunhos próprios.'
    );
    setState((prev) => ({
      ...prev,
      onlySuperAdminCreatesGlobalPresets: enabled,
      presetAuditLogs: [entry, ...prev.presetAuditLogs].slice(0, 250),
    }));
    return true;
  };

  /* Grade de Podcasts & Fotos dos Apresentadores */
  const addPodcastShow = (show: Omit<PodcastShow, 'id'>) => {
    setState((prev) => ({
      ...prev,
      podcastShows: [...prev.podcastShows, { ...show, id: `pod-${Date.now()}` }],
    }));
  };

  const updatePodcastShow = (id: string, patch: Partial<PodcastShow>) => {
    setState((prev) => ({
      ...prev,
      podcastShows: prev.podcastShows.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const deletePodcastShow = (id: string) => {
    setState((prev) => ({
      ...prev,
      podcastShows: prev.podcastShows.filter((s) => s.id !== id),
    }));
  };

  /* Cartas Oficiais, Convites & Propostas PDF */
  const addOfficialLetter: FortMidiaContextValue['addOfficialLetter'] = (letter) => {
    const nowLabel = formatNow();
    const created: OfficialLetterDocument = {
      ...letter,
      id: `ltr-${Date.now()}`,
      createdAt: nowLabel,
      updatedAt: nowLabel,
    };
    setState((prev) => ({
      ...prev,
      officialLetters: [created, ...prev.officialLetters],
    }));
    return created;
  };

  const updateOfficialLetter = (id: string, patch: Partial<OfficialLetterDocument>) => {
    const nowLabel = formatNow();
    setState((prev) => ({
      ...prev,
      officialLetters: prev.officialLetters.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: nowLabel } : l
      ),
    }));
  };

  const deleteOfficialLetter = (id: string) => {
    setState((prev) => ({
      ...prev,
      officialLetters: prev.officialLetters.filter((l) => l.id !== id),
    }));
  };

  const clearPresetAuditLogs = (): boolean => {
    if (!isCurrentUserSuperAdmin()) return false;
    const entry = buildAuditEntry(
      'Excluiu',
      'Layout Global',
      'audit-reset',
      'Histórico de Auditoria',
      'Registros anteriores arquivados/limpos pelo Super Admin.'
    );
    setState((prev) => ({
      ...prev,
      presetAuditLogs: [entry],
    }));
    return true;
  };

  /* ---------------- REPÓRTERES & DISTRIBUIÇÃO DE MATÉRIAS ---------------- */

  const addReporter: FortMidiaContextValue['addReporter'] = (payload, loginPassword) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const newId = `rptr-${Date.now()}`;
    let linkedUserId = payload.linkedUserId;

    setState((prev) => {
      let nextTeamMembers = prev.teamMembers;
      const cleanEmail = payload.email.trim().toLowerCase();

      if (!linkedUserId && cleanEmail) {
        const existingMember = prev.teamMembers.find(
          (m) => m.email.toLowerCase() === cleanEmail
        );
        if (existingMember) {
          linkedUserId = existingMember.id;
        } else if (loginPassword && loginPassword.trim().length >= 4) {
          const newUserId = `usr-${Date.now()}`;
          linkedUserId = newUserId;
          const preset = ROLE_PRESETS['Repórter / Jornalista'];
          const newMember: TeamMember = {
            id: newUserId,
            name: payload.name.trim(),
            role: 'Repórter / Jornalista',
            hierarchyLevel: preset.hierarchyLevel,
            department: `Reportagem · ${payload.city}`,
            email: payload.email.trim(),
            phone: payload.phone.trim(),
            password: loginPassword.trim(),
            avatarUrl: '/assets/aistudio/Logo_FortNews_Vetorizado_Nova_Marca__Usar_Esse__9741accd.png',
            bio: `Repórter credenciado FortNews (${payload.beat}).`,
            active: payload.active,
            createdAt: today,
            allowedModules: [...preset.allowedModules],
            permissions: { ...preset.permissions },
          };
          nextTeamMembers = [...prev.teamMembers, newMember];
        }
      }

      const created: ReporterProfile = {
        ...payload,
        id: newId,
        linkedUserId,
        createdAt: today,
      };

      return {
        ...prev,
        teamMembers: nextTeamMembers,
        reporters: [created, ...prev.reporters],
      };
    });

    return {
      ...payload,
      id: newId,
      linkedUserId,
      createdAt: today,
    };
  };

  const updateReporter = (id: string, patch: Partial<ReporterProfile>) => {
    setState((prev) => ({
      ...prev,
      reporters: prev.reporters.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const deleteReporter = (id: string) => {
    setState((prev) => ({
      ...prev,
      reporters: prev.reporters.filter((r) => r.id !== id),
    }));
  };

  const assignPautaToReporter = (pautaId: string, reporterId: string | null) => {
    setState((prev) => {
      const rep = reporterId ? prev.reporters.find((r) => r.id === reporterId) : null;
      const targetPauta = prev.pautas.find((p) => p.id === pautaId);
      const nextPautas = prev.pautas.map((p) =>
        p.id === pautaId
          ? {
              ...p,
              assignedReporterId: rep ? rep.id : undefined,
              reporter: rep ? rep.name : 'Redação Central FortNews',
            }
          : p
      );

      const nextNotifications =
        rep && targetPauta
          ? [
              {
                id: `notif-${Date.now()}`,
                title: `Pauta distribuída para ${rep.name}`,
                message: `Matéria "${targetPauta.title}" (${targetPauta.city}) foi atribuída ao repórter ${rep.name} pela redação.`,
                type: 'Aprovação Editorial' as const,
                priority: 'Normal' as const,
                targetAudience: 'Repórter / Jornalista' as const,
                createdAt: formatNow(),
                read: false,
                actionTab: 'reporteres' as const,
              },
              ...prev.notifications,
            ]
          : prev.notifications;

      return {
        ...prev,
        pautas: nextPautas,
        notifications: nextNotifications,
      };
    });
  };

  /* ---------------- FONTES JORNALÍSTICAS (SIGILO ESTRITO) ---------------- */

  const addJournalisticSource: FortMidiaContextValue['addJournalisticSource'] = (payload) => {
    const activeMember =
      state.teamMembers.find((m) => m.id === state.activeAdminUserId) ?? state.teamMembers[0];
    const isSuper =
      activeMember?.role === 'Super Admin / Diretoria' || activeMember?.hierarchyLevel === 1;

    const ownerUserId =
      isSuper && payload.ownerUserId ? payload.ownerUserId : activeMember?.id || 'usr-01';
    const resolvedOwner = state.teamMembers.find((m) => m.id === ownerUserId);
    const ownerName =
      isSuper && payload.ownerName
        ? payload.ownerName
        : resolvedOwner?.name || activeMember?.name || 'Repórter FortNews';

    const created: JournalisticSource = {
      id: `src-${Date.now()}`,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      city: payload.city,
      neighborhood: payload.neighborhood?.trim() || undefined,
      category: payload.category?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      ownerUserId,
      ownerName,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };

    setState((prev) => ({
      ...prev,
      journalisticSources: [created, ...prev.journalisticSources],
    }));

    return created;
  };

  const updateJournalisticSource = (id: string, patch: Partial<JournalisticSource>): boolean => {
    const activeMember =
      state.teamMembers.find((m) => m.id === state.activeAdminUserId) ?? state.teamMembers[0];
    const isSuper =
      activeMember?.role === 'Super Admin / Diretoria' || activeMember?.hierarchyLevel === 1;
    const existing = state.journalisticSources.find((s) => s.id === id);
    if (!existing) return false;
    if (!isSuper && existing.ownerUserId !== activeMember?.id) {
      return false;
    }

    setState((prev) => ({
      ...prev,
      journalisticSources: prev.journalisticSources.map((s) =>
        s.id === id
          ? {
              ...s,
              ...patch,
              // Non-super-admin cannot reassign ownership
              ownerUserId: isSuper && patch.ownerUserId ? patch.ownerUserId : s.ownerUserId,
              ownerName: isSuper && patch.ownerName ? patch.ownerName : s.ownerName,
            }
          : s
      ),
    }));
    return true;
  };

  const deleteJournalisticSource = (id: string): boolean => {
    const activeMember =
      state.teamMembers.find((m) => m.id === state.activeAdminUserId) ?? state.teamMembers[0];
    const isSuper =
      activeMember?.role === 'Super Admin / Diretoria' || activeMember?.hierarchyLevel === 1;
    const existing = state.journalisticSources.find((s) => s.id === id);
    if (!existing) return false;
    if (!isSuper && existing.ownerUserId !== activeMember?.id) {
      return false;
    }

    setState((prev) => ({
      ...prev,
      journalisticSources: prev.journalisticSources.filter((s) => s.id !== id),
    }));
    return true;
  };

  /* ---------------- PUBLICIDADE NO SITE (TOPO, ENTRE MATÉRIAS & LATERAL) ---------------- */

  const addSiteAdBanner: FortMidiaContextValue['addSiteAdBanner'] = (payload) => {
    const created: SiteAdBanner = {
      ...payload,
      id: `sitead-${Date.now()}`,
      updatedAt: new Date().toLocaleDateString('pt-BR'),
    };
    setState((prev) => ({
      ...prev,
      siteAdBanners: [created, ...prev.siteAdBanners],
    }));
    return created;
  };

  const updateSiteAdBanner = (id: string, patch: Partial<SiteAdBanner>) => {
    setState((prev) => ({
      ...prev,
      siteAdBanners: prev.siteAdBanners.map((b) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              updatedAt: new Date().toLocaleDateString('pt-BR'),
            }
          : b
      ),
    }));
  };

  const deleteSiteAdBanner = (id: string) => {
    setState((prev) => ({
      ...prev,
      siteAdBanners: prev.siteAdBanners.filter((b) => b.id !== id),
    }));
  };

  const updateSiteAdsConfig = (patch: Partial<SiteAdsConfig>) => {
    setState((prev) => ({
      ...prev,
      siteAdsConfig: {
        ...prev.siteAdsConfig,
        ...patch,
      },
    }));
  };

  const resetDemoData = () => {
    setState(DEFAULT_STATE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  return (
    <FortMidiaContext.Provider
      value={{
        ...state,
        submitCitizenReport,
        runAutoTriage,
        updateCitizenStatus,
        updateCitizenReport,
        deleteCitizenReport,
        promoteReportToPauta,
        submitCommercialLead,
        updateLead,
        updateLeadStatus,
        deleteLead,
        addContract,
        updateContract,
        updateContractStatus,
        deleteContract,
        addPauta,
        updatePautaStatus,
        updatePautaSeal,
        updatePautaContent,
        deletePauta,
        chiefEditorApprovePauta,
        publishPautaToSite,
        unpublishPauta,
        addStudioBooking,
        updateStudioBooking,
        updateStudioBookingStatus,
        deleteStudioBooking,
        addAdvertisingCampaign,
        updateAdvertisingStatus,
        updateArtworkStatus,
        deleteAdvertisingCampaign,
        addFinancialEntry,
        updateFinancialStatus,
        deleteFinancialEntry,
        addMediaBudget,
        updateMediaBudget,
        updateMediaBudgetStatus,
        deleteMediaBudget,
        convertBudgetToErp,
        addCatalogItem,
        updateCatalogItem,
        deleteCatalogItem,
        addOutdoorPoint,
        updateOutdoorPoint,
        deleteOutdoorPoint,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        setActiveAdminUserId,
        addAgendaEvent,
        updateAgendaEvent,
        deleteAgendaEvent,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        addClientTask,
        updateClientTask,
        moveClientTaskStage,
        toggleClientChecklistItem,
        deleteClientTask,
        updateSiteSettings,
        updateNewsPortalSettings,
        addQuota,
        updateQuota,
        deleteQuota,
        addGalleryItem,
        deleteGalleryItem,
        updatePopupConfig,
        popupPreviewOpen,
        setPopupPreviewOpen,
        saveMarketingPreset,
        deleteMarketingPreset,
        setMarketingPresetsLocked,
        saveSiteCmsPreset,
        deleteSiteCmsPreset,
        setSiteCmsPresetsLocked,
        saveGlobalLayoutPreset,
        updateGlobalPresetMeta,
        loadGlobalLayoutPreset,
        toggleGlobalLayoutPresetLock,
        deleteGlobalLayoutPreset,
        setOnlySuperAdminCreatesGlobalPresets,
        addPodcastShow,
        updatePodcastShow,
        deletePodcastShow,
        addOfficialLetter,
        updateOfficialLetter,
        deleteOfficialLetter,
        clearPresetAuditLogs,
        addReporter,
        updateReporter,
        deleteReporter,
        assignPautaToReporter,
        addJournalisticSource,
        updateJournalisticSource,
        deleteJournalisticSource,
        addSiteAdBanner,
        updateSiteAdBanner,
        deleteSiteAdBanner,
        updateSiteAdsConfig,
        resetDemoData,
      }}
    >
      {children}
    </FortMidiaContext.Provider>
  );
};

export function useFortMidia() {
  const ctx = useContext(FortMidiaContext);
  if (!ctx) {
    throw new Error('useFortMidia must be used inside FortMidiaProvider');
  }
  return ctx;
}
