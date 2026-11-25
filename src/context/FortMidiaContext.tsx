import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ApiResult,
  authApi,
  campaignsApi,
  citizenApi,
  clearApiAuthToken,
  crmApi,
  financeApi,
  hasApiSession,
  newsApi,
  stateApi,
  usersApi,
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
  addTeamMember: (
    member: Omit<TeamMember, 'id' | 'createdAt'>
  ) => Promise<{ ok: boolean; error?: string; savedInMysql?: boolean }>;
  updateTeamMember: (
    id: string,
    patch: Partial<TeamMember>
  ) => Promise<{ ok: boolean; error?: string; savedInMysql?: boolean }>;
  deleteTeamMember: (id: string) => Promise<{ ok: boolean; error?: string }>;
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
  saveCmsChangesNow: () => Promise<{ ok: boolean; message: string }>;
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

  /* Integração Real MySQL / PHP (/api) & Permanência de Sessão */
  apiMode: 'checking' | 'online' | 'offline';
  apiSyncLoading: boolean;
  apiSyncError: string | null;
  apiSyncMessage: string | null;
  isDatabaseEmpty: boolean;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (authenticated: boolean) => void;
  adminSessionChecking: boolean;
  logoutAdminSession: () => Promise<void>;
  clearApiFeedback: () => void;
  refreshFromMysql: (authenticatedUser?: Partial<TeamMember>) => Promise<boolean>;
  syncInitialDataToMysql: () => Promise<{ ok: boolean; summary: string }>;

  resetDemoData: () => void;
}

const STORAGE_KEY = 'fortmidia_portal_state_v7';
const FAVICON_STORAGE_KEY = 'fortmidia_favicons_v1';
const LEGACY_SITE_FAVICON = '/assets/aistudio/Logo_FortM_dia_ded2b7d7.png';
const LEGACY_NEWS_FAVICON =
  '/assets/aistudio/Logo_FortNews_Vetorizado_Nova_Marca__Usar_Esse__9741accd.png';
const LEGACY_FORTNEWS_GRAY_LOGO = '/assets/aistudio/Logotipo_FortNews_vetorizado__9__b9ef51c4.png';
const OFFICIAL_FORTNEWS_NEW_LOGO =
  '/assets/aistudio/Logo_FortNews_Vetorizado_Nova_Marca__Usar_Esse__26069d61.png';

interface PersistedFavicons {
  siteFaviconUrl?: string;
  newsFaviconUrl?: string;
  updatedAt?: number;
}

function readPersistedFavicons(): PersistedFavicons {
  try {
    const raw = localStorage.getItem(FAVICON_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedFavicons;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePersistedFavicons(patch: Partial<PersistedFavicons>) {
  try {
    const current = readPersistedFavicons();
    const next: PersistedFavicons = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    };
    localStorage.setItem(FAVICON_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage restrictions
  }
}

function persistStateSafely(nextState: FortMidiaState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    return true;
  } catch {
    // If localStorage quota is exceeded by heavy embedded media, keep CMS settings & favicons persisted
    try {
      const compactState: FortMidiaState = {
        ...nextState,
        pautas: nextState.pautas.map((p) =>
          p.videoUrl?.startsWith('data:video/')
            ? { ...p, videoUrl: undefined }
            : p
        ),
        siteSettings: {
          ...nextState.siteSettings,
          heroVideoUrl:
            nextState.siteSettings.heroVideoUrl?.startsWith('data:video/')
              ? INITIAL_SITE_SETTINGS.heroVideoUrl
              : nextState.siteSettings.heroVideoUrl,
        },
        newsPortalSettings: {
          ...nextState.newsPortalSettings,
          featuredVideoUrl:
            nextState.newsPortalSettings.featuredVideoUrl?.startsWith('data:video/')
              ? INITIAL_NEWS_PORTAL_SETTINGS.featuredVideoUrl
              : nextState.newsPortalSettings.featuredVideoUrl,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactState));
      return true;
    } catch {
      return false;
    }
  }
}

function migrateMarketingPresets(presets?: MarketingArtPreset[]): MarketingArtPreset[] {
  if (!presets || presets.length === 0) return INITIAL_MARKETING_PRESETS;
  return presets.map((p) =>
    p.editorialLogoUrl === LEGACY_FORTNEWS_GRAY_LOGO
      ? { ...p, editorialLogoUrl: OFFICIAL_FORTNEWS_NEW_LOGO }
      : p
  );
}

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

function hydrateTeamMembers(rawMembers?: TeamMember[], allowFallback = true): TeamMember[] {
  if (!rawMembers || rawMembers.length === 0) return allowFallback ? INITIAL_TEAM_MEMBERS : [];
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
  return migrated.length > 0 ? migrated : allowFallback ? INITIAL_TEAM_MEMBERS : [];
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
    const persistedFavicons = readPersistedFavicons();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FortMidiaState>;
        const mergedSite = { ...INITIAL_SITE_SETTINGS, ...(parsed.siteSettings ?? {}) };
        if (persistedFavicons.siteFaviconUrl?.trim()) {
          mergedSite.faviconUrl = persistedFavicons.siteFaviconUrl.trim();
        } else if (mergedSite.faviconUrl === LEGACY_SITE_FAVICON) {
          mergedSite.faviconUrl = INITIAL_SITE_SETTINGS.faviconUrl;
        }
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

        const mergedNews = {
          ...INITIAL_NEWS_PORTAL_SETTINGS,
          ...(parsed.newsPortalSettings ?? {}),
        };
        if (persistedFavicons.newsFaviconUrl?.trim()) {
          mergedNews.faviconUrl = persistedFavicons.newsFaviconUrl.trim();
        } else if (mergedNews.faviconUrl === LEGACY_NEWS_FAVICON) {
          mergedNews.faviconUrl = INITIAL_NEWS_PORTAL_SETTINGS.faviconUrl;
        }

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
          newsPortalSettings: mergedNews,
          quotas: parsed.quotas ?? COMMERCIAL_QUOTAS,
          galleryItems: parsed.galleryItems ?? INITIAL_GALLERY_ITEMS,
          popupConfig: { ...INITIAL_POPUP_CONFIG, ...(parsed.popupConfig ?? {}) },
          teamMembers: hydratedMembers,
          activeAdminUserId: validActiveId,
          clientTasks: parsed.clientTasks ?? INITIAL_CLIENT_TASKS,
          agendaEvents: parsed.agendaEvents ?? INITIAL_AGENDA_EVENTS,
          notifications: parsed.notifications ?? INITIAL_NOTIFICATIONS,
          marketingPresets: migrateMarketingPresets(parsed.marketingPresets),
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
    return {
      ...DEFAULT_STATE,
      siteSettings: {
        ...DEFAULT_STATE.siteSettings,
        faviconUrl: persistedFavicons.siteFaviconUrl?.trim() || DEFAULT_STATE.siteSettings.faviconUrl,
      },
      newsPortalSettings: {
        ...DEFAULT_STATE.newsPortalSettings,
        faviconUrl:
          persistedFavicons.newsFaviconUrl?.trim() || DEFAULT_STATE.newsPortalSettings.faviconUrl,
      },
    };
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

  const [apiMode, setApiMode] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiSyncLoading, setApiSyncLoading] = useState(false);
  const [apiSyncError, setApiSyncError] = useState<string | null>(null);
  const [apiSyncMessage, setApiSyncMessage] = useState<string | null>(null);
  const [isDatabaseEmpty, setIsDatabaseEmpty] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminSessionChecking, setAdminSessionChecking] = useState(true);

  const apiModeRef = useRef<'checking' | 'online' | 'offline'>('checking');
  apiModeRef.current = apiMode;

  const stateRef = useRef<FortMidiaState>(state);
  stateRef.current = state;

  const hasHydratedFromApi = useRef(false);
  const skipNextSnapshotSave = useRef(false);

  const clearApiFeedback = useCallback(() => {
    setApiSyncError(null);
    setApiSyncMessage(null);
  }, []);

  const reportApiError = useCallback((actionLabel: string, res: ApiResult<unknown>) => {
    const statusLabel = res.status > 0 ? ` (HTTP ${res.status})` : '';
    const detail = res.error || 'Falha desconhecida ao gravar no MySQL.';
    setApiSyncMessage(null);
    setApiSyncError(`Erro ao ${actionLabel} no MySQL${statusLabel}: ${detail}`);
  }, []);

  const runApiMutation = useCallback(
    <T,>(
      actionLabel: string,
      execute: () => Promise<ApiResult<T>>,
      options: {
        skipAuth?: boolean;
        onRollback?: () => void;
        onSuccess?: (data: T | undefined) => void;
      } = {}
    ) => {
      const { skipAuth = false, onRollback, onSuccess } = options;
      const mode = apiModeRef.current;

      if (mode === 'offline') {
        return;
      }

      if (!skipAuth && !hasApiSession()) {
        if (mode === 'online') {
          onRollback?.();
          setApiSyncMessage(null);
          setApiSyncError(
            `Não foi possível ${actionLabel}: sessão sem autenticação ativa na API. Faça login novamente.`
          );
        }
        return;
      }

      void (async () => {
        const res = await execute();
        if (!res.ok) {
          if (apiModeRef.current === 'online' || !res.networkUnavailable) {
            onRollback?.();
            reportApiError(actionLabel, res);
          }
          return;
        }
        setApiSyncError(null);
        onSuccess?.(res.data);
      })();
    },
    [reportApiError]
  );

  const refreshFromMysql = useCallback(
    async (authenticatedUser?: Partial<TeamMember>): Promise<boolean> => {
      const health = await stateApi.health();
      const online = Boolean(health.ok && health.data?.ok === true && health.data?.database !== false);
      setApiMode(online ? 'online' : 'offline');
      apiModeRef.current = online ? 'online' : 'offline';

      if (!online) {
        // Ambiente preview/offline sem backend PHP: restaura sessão apenas no preview se existir marcação
        try {
          const previewUid = sessionStorage.getItem('fortmidia_preview_admin_uid');
          if (previewUid) {
            setState((prev) =>
              prev.teamMembers.some((m) => m.id === previewUid)
                ? { ...prev, activeAdminUserId: previewUid }
                : prev
            );
            setIsAdminAuthenticated(true);
          }
        } catch {
          // Ignore storage restrictions
        }
        hasHydratedFromApi.current = true;
        setAdminSessionChecking(false);
        return false;
      }

      // API MySQL confirmada online: descarta cache local antigo para nunca sobrescrever o banco
      try {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('fortmidia_preview_admin_uid');
      } catch {
        // Ignore storage restrictions
      }

      setApiSyncLoading(true);
      setApiSyncError(null);

      try {
        // Se não há token em memória ainda (ex.: após F5 / refresh ou botão Voltar),
        // valida automaticamente o cookie HttpOnly de sessão no servidor (/api/auth/me)
        let resolvedAuthUser = authenticatedUser;
        if (!hasApiSession()) {
          const meRes = await authApi.me();
          if (meRes.ok && meRes.data?.user) {
            resolvedAuthUser = meRes.data.user;
            setIsAdminAuthenticated(true);
          }
        } else {
          setIsAdminAuthenticated(true);
        }

        const hasSession = hasApiSession();

        if (!hasSession) {
          const [publicNewsRes, publicStateRes] = await Promise.all([
            newsApi.list(),
            stateApi.fetchPublicState<FortMidiaState>(),
          ]);
          const publicSnapshot =
            publicStateRes.ok && publicStateRes.data?.state ? publicStateRes.data.state : null;

          const persistedFavicons = readPersistedFavicons();
          const resolvedPublicSiteFavicon =
            publicSnapshot?.siteSettings?.faviconUrl?.trim() &&
            publicSnapshot.siteSettings.faviconUrl.trim() !== LEGACY_SITE_FAVICON
              ? publicSnapshot.siteSettings.faviconUrl.trim()
              : persistedFavicons.siteFaviconUrl?.trim() ||
                publicSnapshot?.siteSettings?.faviconUrl?.trim() ||
                INITIAL_SITE_SETTINGS.faviconUrl;
          const resolvedPublicNewsFavicon =
            publicSnapshot?.newsPortalSettings?.faviconUrl?.trim() &&
            publicSnapshot.newsPortalSettings.faviconUrl.trim() !== LEGACY_NEWS_FAVICON
              ? publicSnapshot.newsPortalSettings.faviconUrl.trim()
              : persistedFavicons.newsFaviconUrl?.trim() ||
                publicSnapshot?.newsPortalSettings?.faviconUrl?.trim() ||
                INITIAL_NEWS_PORTAL_SETTINGS.faviconUrl;

          skipNextSnapshotSave.current = true;
          setState((prev) => ({
            ...prev,
            ...(publicSnapshot ?? {}),
            pautas:
              publicNewsRes.ok && Array.isArray(publicNewsRes.data?.items)
                ? hydratePautasWithInternalCodes(publicNewsRes.data.items)
                : [],
            outdoorPoints:
              publicSnapshot?.outdoorPoints && publicSnapshot.outdoorPoints.length > 0
                ? publicSnapshot.outdoorPoints
                : prev.outdoorPoints,
            siteSettings: {
              ...prev.siteSettings,
              ...(publicSnapshot?.siteSettings ?? {}),
              faviconUrl: resolvedPublicSiteFavicon,
            },
            newsPortalSettings: {
              ...prev.newsPortalSettings,
              ...(publicSnapshot?.newsPortalSettings ?? {}),
              faviconUrl: resolvedPublicNewsFavicon,
            },
            // Remove mocks privados da memória enquanto não autenticado no MySQL
            contracts: [],
            leads: [],
            financialEntries: [],
            citizenReports: [],
            clientTasks: [],
          }));
          if (!publicNewsRes.ok) {
            setApiSyncError(
              `Erro ao consultar matérias no MySQL (HTTP ${publicNewsRes.status || 'rede'}): ${publicNewsRes.error || 'falha na API'}`
            );
          }
          hasHydratedFromApi.current = true;
          return publicNewsRes.ok;
        }
        authenticatedUser = resolvedAuthUser;

        const [
          contractsRes,
          leadsRes,
          tasksRes,
          pautasRes,
          financeRes,
          campaignsRes,
          outdoorsRes,
          demandasRes,
          usersRes,
          snapshotRes,
        ] = await Promise.all([
          crmApi.listContracts(),
          crmApi.listLeads(),
          crmApi.listTasks(),
          newsApi.list(),
          financeApi.list(),
          campaignsApi.listCampaigns(),
          campaignsApi.listOutdoors(),
          citizenApi.list(),
          usersApi.list(),
          stateApi.fetchSnapshot<FortMidiaState>(),
        ]);

        const errors: string[] = [];
        const checkCore = (label: string, res: ApiResult<unknown>, allow403 = false) => {
          if (!res.ok) {
            if (allow403 && res.status === 403) return;
            errors.push(`${label} (HTTP ${res.status || 'rede'}): ${res.error || 'erro'}`);
          }
        };

        checkCore('Contratos', contractsRes);
        checkCore('Leads', leadsRes);
        checkCore('Matérias/Pautas', pautasRes);
        checkCore('Demandas Cidadãs', demandasRes);
        checkCore('Usuários', usersRes, true);
        // Tabelas opcionais em versões anteriores do PHP não travam, mas registram erro se 500/401
        if (!financeRes.ok && financeRes.status !== 404) checkCore('Financeiro', financeRes);
        if (!campaignsRes.ok && campaignsRes.status !== 404) checkCore('Campanhas', campaignsRes);
        if (!outdoorsRes.ok && outdoorsRes.status !== 404) checkCore('Outdoors', outdoorsRes);
        if (!tasksRes.ok && tasksRes.status !== 404) checkCore('Pipeline/Tarefas', tasksRes);

        const nextContracts =
          contractsRes.ok && Array.isArray(contractsRes.data?.items)
            ? contractsRes.data.items
            : null;
        const nextLeads =
          leadsRes.ok && Array.isArray(leadsRes.data?.items) ? leadsRes.data.items : null;
        const nextTasks =
          tasksRes.ok && Array.isArray(tasksRes.data?.items) ? tasksRes.data.items : null;
        const nextPautas =
          pautasRes.ok && Array.isArray(pautasRes.data?.items)
            ? hydratePautasWithInternalCodes(pautasRes.data.items)
            : null;
        const nextFinance =
          financeRes.ok && Array.isArray(financeRes.data?.items) ? financeRes.data.items : null;
        const nextCampaigns =
          campaignsRes.ok && Array.isArray(campaignsRes.data?.items)
            ? campaignsRes.data.items
            : null;
        const nextOutdoors =
          outdoorsRes.ok && Array.isArray(outdoorsRes.data?.items) ? outdoorsRes.data.items : null;
        const nextReports =
          demandasRes.ok && Array.isArray(demandasRes.data?.items)
            ? demandasRes.data.items
            : null;
        const nextUsers =
          usersRes.ok && Array.isArray(usersRes.data?.items)
            ? hydrateTeamMembers(usersRes.data.items, false)
            : null;

        const currentAuthUser = resolvedAuthUser;

        skipNextSnapshotSave.current = true;
        setState((prev) => {
          const snapshot =
            snapshotRes.ok && snapshotRes.data?.state ? snapshotRes.data.state : null;

          let resolvedMembers =
            nextUsers !== null
              ? nextUsers
              : snapshot?.teamMembers
                ? hydrateTeamMembers(snapshot.teamMembers, false)
                : [];
          if (currentAuthUser?.id) {
            const exists = resolvedMembers.some(
              (m) =>
                m.id === currentAuthUser.id ||
                (currentAuthUser.email &&
                  m.email.toLowerCase() === currentAuthUser.email.toLowerCase())
            );
            if (!exists) {
              const preset =
                ROLE_PRESETS[(currentAuthUser.role as TeamRole) || 'Super Admin / Diretoria'] ??
                ROLE_PRESETS['Super Admin / Diretoria'];
              const injected: TeamMember = {
                id: currentAuthUser.id,
                name: currentAuthUser.name || 'Super Admin',
                loginName: currentAuthUser.loginName,
                role: (currentAuthUser.role as TeamRole) || 'Super Admin / Diretoria',
                hierarchyLevel: currentAuthUser.hierarchyLevel ?? preset.hierarchyLevel,
                department: currentAuthUser.department || 'Diretoria Executiva',
                email: currentAuthUser.email || '',
                phone: currentAuthUser.phone || '(11) 95779-2424',
                password: '',
                avatarUrl:
                  currentAuthUser.avatarUrl || '/assets/aistudio/Logo_FortM_dia_ded2b7d7.png',
                bio: currentAuthUser.bio || '',
                active: currentAuthUser.active ?? true,
                createdAt:
                  currentAuthUser.createdAt || new Date().toLocaleDateString('pt-BR'),
                allowedModules:
                  currentAuthUser.allowedModules && currentAuthUser.allowedModules.length > 0
                    ? currentAuthUser.allowedModules
                    : [...preset.allowedModules],
                permissions: currentAuthUser.permissions ?? { ...preset.permissions },
                linkedClientName: currentAuthUser.linkedClientName,
              };
              resolvedMembers = [injected, ...resolvedMembers];
            }
          }

          const matchedActiveId = currentAuthUser?.id
            ? (resolvedMembers.find(
                (m) =>
                  m.id === currentAuthUser.id ||
                  (currentAuthUser.email &&
                    m.email.toLowerCase() === currentAuthUser.email.toLowerCase())
              )?.id ?? prev.activeAdminUserId)
            : resolvedMembers.some((m) => m.id === prev.activeAdminUserId)
              ? prev.activeAdminUserId
              : (resolvedMembers[0]?.id ?? prev.activeAdminUserId);

          const persistedFavicons = readPersistedFavicons();
          const serverSiteFav = snapshot?.siteSettings?.faviconUrl?.trim();
          const serverNewsFav = snapshot?.newsPortalSettings?.faviconUrl?.trim();
          const finalSiteFav =
            serverSiteFav && serverSiteFav !== LEGACY_SITE_FAVICON
              ? serverSiteFav
              : persistedFavicons.siteFaviconUrl?.trim() ||
                prev.siteSettings.faviconUrl ||
                INITIAL_SITE_SETTINGS.faviconUrl;
          const finalNewsFav =
            serverNewsFav && serverNewsFav !== LEGACY_NEWS_FAVICON
              ? serverNewsFav
              : persistedFavicons.newsFaviconUrl?.trim() ||
                prev.newsPortalSettings.faviconUrl ||
                INITIAL_NEWS_PORTAL_SETTINGS.faviconUrl;

          if (finalSiteFav || finalNewsFav) {
            writePersistedFavicons({
              siteFaviconUrl: finalSiteFav,
              newsFaviconUrl: finalNewsFav,
            });
          }

          // Quando a API MySQL está online, usa diretamente as tabelas reais (mesmo vazias),
          // sem manter mocks locais como fallback silencioso.
          return {
            ...prev,
            ...(snapshot ?? {}),
            contracts: nextContracts !== null ? nextContracts : [],
            leads: nextLeads !== null ? nextLeads : [],
            pautas: nextPautas !== null ? nextPautas : [],
            citizenReports: nextReports !== null ? nextReports : [],
            financialEntries:
              nextFinance !== null
                ? nextFinance
                : (snapshot?.financialEntries ?? []),
            advertisingCampaigns:
              nextCampaigns !== null
                ? nextCampaigns
                : (snapshot?.advertisingCampaigns ?? []),
            outdoorPoints:
              nextOutdoors !== null
                ? nextOutdoors
                : (snapshot?.outdoorPoints ?? prev.outdoorPoints),
            clientTasks:
              nextTasks !== null ? nextTasks : (snapshot?.clientTasks ?? []),
            teamMembers: resolvedMembers,
            activeAdminUserId: matchedActiveId,
            siteSettings: {
              ...prev.siteSettings,
              ...(snapshot?.siteSettings ?? {}),
              faviconUrl: finalSiteFav,
            },
            newsPortalSettings: {
              ...prev.newsPortalSettings,
              ...(snapshot?.newsPortalSettings ?? {}),
              faviconUrl: finalNewsFav,
            },
            marketingPresets: migrateMarketingPresets(snapshot?.marketingPresets ?? prev.marketingPresets),
            budgetCatalog: snapshot?.budgetCatalog
              ? hydrateBudgetCatalog(snapshot.budgetCatalog)
              : prev.budgetCatalog,
          };
        });

        const contractsCount = nextContracts?.length ?? 0;
        const leadsCount = nextLeads?.length ?? 0;
        setIsDatabaseEmpty(contractsCount === 0 && leadsCount === 0);

        if (errors.length > 0) {
          setApiSyncError(`Erro ao carregar tabelas do MySQL: ${errors.join(' · ')}`);
        }

        hasHydratedFromApi.current = true;
        return errors.length === 0;
      } finally {
        setApiSyncLoading(false);
        setAdminSessionChecking(false);
      }
    },
    []
  );

  const logoutAdminSession = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearApiAuthToken();
      try {
        sessionStorage.removeItem('fortmidia_preview_admin_uid');
      } catch {
        // Ignore storage restrictions
      }
      clearApiFeedback();
      setIsAdminAuthenticated(false);
    }
  }, [clearApiFeedback]);

  const syncInitialDataToMysql = useCallback(async (): Promise<{
    ok: boolean;
    summary: string;
  }> => {
    const health = await stateApi.health();
    const online = Boolean(health.ok && health.data?.ok === true && health.data?.database !== false);
    setApiMode(online ? 'online' : 'offline');
    apiModeRef.current = online ? 'online' : 'offline';

    if (!online) {
      const msg = 'API PHP em /api/health não respondeu ok: true. Verifique a hospedagem antes de sincronizar.';
      setApiSyncError(msg);
      return { ok: false, summary: msg };
    }

    if (!hasApiSession()) {
      const msg = 'Faça login com um usuário administrador autenticado na API para sincronizar o MySQL.';
      setApiSyncError(msg);
      return { ok: false, summary: msg };
    }

    setApiSyncLoading(true);
    setApiSyncError(null);
    setApiSyncMessage(null);

    try {
      const seedPayload = {
        contracts: INITIAL_CONTRACTS,
        leads: INITIAL_LEADS,
        users: INITIAL_TEAM_MEMBERS,
        pautas: hydratePautasWithInternalCodes(INITIAL_PAUTAS),
        financialEntries: INITIAL_FINANCIAL_ENTRIES,
        campaigns: INITIAL_ADVERTISING_CAMPAIGNS,
        outdoors: INITIAL_OUTDOOR_POINTS,
        citizenReports: INITIAL_CITIZEN_REPORTS,
        clientTasks: INITIAL_CLIENT_TASKS,
        stateSnapshot: DEFAULT_STATE,
      };

      // 1. Tenta endpoint otimizado /api/sync/seed
      const bulkRes = await stateApi.seedInitialData(seedPayload);
      if (bulkRes.ok) {
        const inserted = bulkRes.data?.inserted;
        const summary = inserted
          ? `Sincronização inicial concluída no MySQL: ${inserted.contracts ?? 0} contratos, ${inserted.leads ?? 0} leads, ${inserted.users ?? 0} usuários, ${inserted.pautas ?? 0} matérias, ${inserted.financialEntries ?? 0} lançamentos financeiros.`
          : bulkRes.data?.message || 'Dados iniciais sincronizados com sucesso no MySQL.';
        await refreshFromMysql();
        setApiSyncMessage(summary);
        return { ok: true, summary };
      }

      // 2. Se /api/sync/seed ainda não existir na API PHP implantada (HTTP 404),
      // faz sincronização item a item via POST nos endpoints individuais.
      if (bulkRes.status !== 404) {
        const err = `Falha ao sincronizar dados iniciais no MySQL (HTTP ${bulkRes.status}): ${bulkRes.error || 'erro interno'}`;
        setApiSyncError(err);
        return { ok: false, summary: err };
      }

      const counts = {
        contracts: 0,
        leads: 0,
        users: 0,
        pautas: 0,
        finance: 0,
        campaigns: 0,
        outdoors: 0,
        reports: 0,
      };
      const failures: string[] = [];

      for (const c of seedPayload.contracts) {
        const r = await crmApi.createContract(c);
        if (r.ok) counts.contracts += 1;
        else if (r.status !== 409) failures.push(`Contrato ${c.clientName}: HTTP ${r.status}`);
      }
      for (const l of seedPayload.leads) {
        const r = await crmApi.createLead(l, true);
        if (r.ok) counts.leads += 1;
        else if (r.status !== 409) failures.push(`Lead ${l.companyOrName}: HTTP ${r.status}`);
      }
      for (const u of seedPayload.users) {
        const r = await usersApi.create(u);
        if (r.ok) counts.users += 1;
        else if (r.status !== 409 && r.status !== 400) failures.push(`Usuário ${u.name}: HTTP ${r.status}`);
      }
      for (const p of seedPayload.pautas) {
        const r = await newsApi.create(p);
        if (r.ok) counts.pautas += 1;
        else if (r.status !== 409) failures.push(`Matéria ${p.id}: HTTP ${r.status}`);
      }
      for (const f of seedPayload.financialEntries) {
        const r = await financeApi.create(f);
        if (r.ok) counts.finance += 1;
      }
      for (const camp of seedPayload.campaigns) {
        const r = await campaignsApi.createCampaign(camp);
        if (r.ok) counts.campaigns += 1;
      }
      for (const out of seedPayload.outdoors) {
        const r = await campaignsApi.createOutdoor(out);
        if (r.ok) counts.outdoors += 1;
      }
      for (const rep of seedPayload.citizenReports) {
        const r = await citizenApi.submit(rep);
        if (r.ok) counts.reports += 1;
      }

      await stateApi.saveSnapshot(DEFAULT_STATE);
      await refreshFromMysql();

      const totalInserted = Object.values(counts).reduce((a, b) => a + b, 0);
      if (totalInserted === 0 && failures.length > 0) {
        const err = `Não foi possível popular as tabelas no MySQL. Atualize o arquivo api/index.php no servidor. Detalhes: ${failures.slice(0, 3).join('; ')}`;
        setApiSyncError(err);
        return { ok: false, summary: err };
      }

      const summary = `Sincronização concluída no MySQL: ${counts.contracts} contratos, ${counts.leads} leads, ${counts.users} usuários, ${counts.pautas} matérias, ${counts.finance} financeiro.`;
      if (failures.length > 0) {
        setApiSyncError(`Sincronizado parcialmente (${summary}). Pendências: ${failures.slice(0, 3).join('; ')}`);
      } else {
        setApiSyncMessage(summary);
      }
      return { ok: failures.length === 0, summary };
    } finally {
      setApiSyncLoading(false);
    }
  }, [refreshFromMysql]);

  // Verifica /api/health na inicialização e prioriza o MySQL sempre que a API estiver online
  useEffect(() => {
    void refreshFromMysql();
  }, [refreshFromMysql]);

  useEffect(() => {
    // Persiste favicons sempre em chave leve dedicada para garantir permanência absoluta
    writePersistedFavicons({
      siteFaviconUrl: state.siteSettings.faviconUrl,
      newsFaviconUrl: state.newsPortalSettings.faviconUrl,
    });

    // Só persiste o estado completo no localStorage quando /api/health confirmou modo offline (preview sem backend PHP).
    // Nunca grava no localStorage durante 'checking' nem em modo 'online' (MySQL é a única fonte).
    if (apiMode === 'offline') {
      persistStateSafely(state);
    }

    if (skipNextSnapshotSave.current) {
      skipNextSnapshotSave.current = false;
      return;
    }

    if (!hasHydratedFromApi.current || apiMode !== 'online' || !hasApiSession()) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      void (async () => {
        const sanitizedSnapshot: FortMidiaState = {
          ...state,
          teamMembers: state.teamMembers.map((m) => ({ ...m, password: '' })),
        };
        const res = await stateApi.saveSnapshot(sanitizedSnapshot);
        if (!res.ok && !res.networkUnavailable && res.status !== 404) {
          reportApiError('sincronizar configurações CMS', res);
        }
      })();
    }, 900);

    return () => window.clearTimeout(syncTimer);
  }, [state, apiMode, reportApiError]);

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
    const prevReports = stateRef.current.citizenReports;
    setState((prev) => ({
      ...prev,
      citizenReports: [newReport, ...prev.citizenReports],
    }));
    runApiMutation('registrar demanda cidadã', () => citizenApi.submit(newReport), {
      skipAuth: true,
      onRollback: () => setState((prev) => ({ ...prev, citizenReports: prevReports })),
    });
    return newReport;
  };

  const runAutoTriage = () => {
    let triagedCount = 0;
    const triagedUpdates: CitizenReport[] = [];
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

        const nextItem: CitizenReport = {
          ...report,
          status: 'Triado · Alta Prioridade' as CitizenStatus,
          triageScore: finalScore,
          assignedEditor,
        };
        triagedUpdates.push(nextItem);
        return nextItem;
      });
      return { ...prev, citizenReports: updated };
    });
    for (const item of triagedUpdates) {
      runApiMutation('atualizar triagem da demanda', () =>
        citizenApi.update(item.id, {
          status: item.status,
          triageScore: item.triageScore,
          assignedEditor: item.assignedEditor,
        })
      );
    }
    return triagedCount;
  };

  const updateCitizenStatus = (id: string, status: CitizenStatus) => {
    const prevReports = stateRef.current.citizenReports;
    setState((prev) => ({
      ...prev,
      citizenReports: prev.citizenReports.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    runApiMutation('atualizar status da demanda', () => citizenApi.updateStatus(id, status), {
      onRollback: () => setState((prev) => ({ ...prev, citizenReports: prevReports })),
    });
  };

  const updateCitizenReport = (id: string, patch: Partial<CitizenReport>) => {
    const prevReports = stateRef.current.citizenReports;
    setState((prev) => ({
      ...prev,
      citizenReports: prev.citizenReports.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    runApiMutation('atualizar demanda cidadã', () => citizenApi.update(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, citizenReports: prevReports })),
    });
  };

  const deleteCitizenReport = (id: string) => {
    const prevReports = stateRef.current.citizenReports;
    setState((prev) => ({
      ...prev,
      citizenReports: prev.citizenReports.filter((r) => r.id !== id),
    }));
    runApiMutation('excluir demanda cidadã', () => citizenApi.remove(id), {
      onRollback: () => setState((prev) => ({ ...prev, citizenReports: prevReports })),
    });
  };

  const promoteReportToPauta = (
    reportId: string,
    format: EditorialPauta['format'],
    reporterId?: string
  ) => {
    const snapshot = stateRef.current;
    const target = snapshot.citizenReports.find((r) => r.id === reportId);
    if (!target) return;

    const selectedReporter = reporterId
      ? snapshot.reporters.find((rep) => rep.id === reporterId)
      : undefined;

    const alreadyExists = snapshot.pautas.some((p) => p.sourceProtocol === target.protocol);
    const createdPauta: EditorialPauta | null = alreadyExists
      ? null
      : {
          id: `pau-${Date.now()}`,
          internalCode: getNextPautaInternalCode(snapshot.pautas),
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
        };

    const prevReports = snapshot.citizenReports;
    const prevPautas = snapshot.pautas;
    const assignedEditor = selectedReporter?.name || target.assignedEditor;

    setState((prev) => ({
      ...prev,
      citizenReports: prev.citizenReports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'Convertido em Pauta',
              assignedEditor,
            }
          : r
      ),
      pautas: createdPauta ? [createdPauta, ...prev.pautas] : prev.pautas,
    }));

    runApiMutation(
      'converter demanda em pauta',
      () =>
        citizenApi.update(reportId, {
          status: 'Convertido em Pauta',
          assignedEditor,
        }),
      {
        onRollback: () => setState((prev) => ({ ...prev, citizenReports: prevReports })),
      }
    );

    if (createdPauta) {
      runApiMutation('criar pauta a partir de demanda', () => newsApi.create(createdPauta), {
        onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
      });
    }
  };

  const submitCommercialLead: FortMidiaContextValue['submitCommercialLead'] = (payload) => {
    const newLead: CommercialLead = {
      id: `lead-${Date.now()}`,
      ...payload,
      createdAt: formatNow(),
      status: 'Novo Lead',
    };
    const prevLeads = stateRef.current.leads;
    setState((prev) => ({
      ...prev,
      leads: [newLead, ...prev.leads],
    }));
    runApiMutation('salvar lead comercial', () => crmApi.createLead(newLead, hasApiSession()), {
      skipAuth: true,
      onRollback: () => setState((prev) => ({ ...prev, leads: prevLeads })),
      onSuccess: () => setIsDatabaseEmpty(false),
    });
    return newLead;
  };

  const updateLead = (id: string, patch: Partial<CommercialLead>) => {
    const prevLeads = stateRef.current.leads;
    setState((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
    runApiMutation('atualizar lead comercial', () => crmApi.updateLead(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, leads: prevLeads })),
    });
  };

  const updateLeadStatus = (id: string, status: CommercialLead['status']) => {
    const prevLeads = stateRef.current.leads;
    setState((prev) => ({
      ...prev,
      leads: prev.leads.map((l) => (l.id === id ? { ...l, status } : l)),
    }));
    runApiMutation('atualizar status do lead', () => crmApi.updateLead(id, { status }), {
      onRollback: () => setState((prev) => ({ ...prev, leads: prevLeads })),
    });
  };

  const deleteLead = (id: string) => {
    const prevLeads = stateRef.current.leads;
    setState((prev) => ({
      ...prev,
      leads: prev.leads.filter((l) => l.id !== id),
    }));
    runApiMutation('excluir lead comercial', () => crmApi.deleteLead(id), {
      onRollback: () => setState((prev) => ({ ...prev, leads: prevLeads })),
    });
  };

  const addContract = (contract: Omit<CommercialContract, 'id'>) => {
    const newContract: CommercialContract = {
      ...contract,
      id: `ctr-${Date.now().toString().slice(-6)}`,
    };
    const prevContracts = stateRef.current.contracts;
    setState((prev) => ({
      ...prev,
      contracts: [newContract, ...prev.contracts],
    }));
    runApiMutation('criar contrato comercial', () => crmApi.createContract(newContract), {
      onRollback: () => setState((prev) => ({ ...prev, contracts: prevContracts })),
      onSuccess: () => setIsDatabaseEmpty(false),
    });
  };

  const updateContract = (id: string, patch: Partial<CommercialContract>) => {
    const prevContracts = stateRef.current.contracts;
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    runApiMutation('atualizar contrato comercial', () => crmApi.updateContract(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, contracts: prevContracts })),
    });
  };

  const updateContractStatus = (id: string, status: ContractStatus) => {
    const prevContracts = stateRef.current.contracts;
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
    runApiMutation('atualizar status do contrato', () => crmApi.updateContract(id, { status }), {
      onRollback: () => setState((prev) => ({ ...prev, contracts: prevContracts })),
    });
  };

  const deleteContract = (id: string) => {
    const prevContracts = stateRef.current.contracts;
    setState((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((c) => c.id !== id),
    }));
    runApiMutation('excluir contrato comercial', () => crmApi.deleteContract(id), {
      onRollback: () => setState((prev) => ({ ...prev, contracts: prevContracts })),
    });
  };

  const addPauta = (pauta: Omit<EditorialPauta, 'id'>) => {
    const prevPautas = stateRef.current.pautas;
    const created: EditorialPauta = {
      ...pauta,
      id: `pau-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      internalCode: pauta.internalCode || getNextPautaInternalCode(prevPautas),
    };
    setState((prev) => ({
      ...prev,
      pautas: [created, ...prev.pautas],
    }));
    runApiMutation('criar matéria/pauta', () => newsApi.create(created), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
      onSuccess: () => setIsDatabaseEmpty(false),
    });
  };

  const updatePautaStatus = (id: string, status: PautaStatus) => {
    const prevPautas = stateRef.current.pautas;
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
    runApiMutation('atualizar status da pauta', () => newsApi.update(id, { status }), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
    });
  };

  const updatePautaSeal = (id: string, seal: NewsSeal) => {
    const prevPautas = stateRef.current.pautas;
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, seal } : p)),
    }));
    runApiMutation('atualizar selo da matéria', () => newsApi.update(id, { seal }), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
    });
  };

  const updatePautaContent = (id: string, patch: Partial<EditorialPauta>) => {
    const prevPautas = stateRef.current.pautas;
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    runApiMutation('editar matéria/pauta', () => newsApi.update(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
    });
  };

  const deletePauta = (id: string) => {
    const prevPautas = stateRef.current.pautas;
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.filter((p) => p.id !== id),
    }));
    runApiMutation('excluir matéria/pauta', () => newsApi.remove(id), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
    });
  };

  const chiefEditorApprovePauta = (id: string, chiefName: string, publishNow = false) => {
    const nowLabel = formatNow();
    const prevPautas = stateRef.current.pautas;
    const current = prevPautas.find((p) => p.id === id);
    const patch: Partial<EditorialPauta> = {
      approvalStatus: publishNow ? 'Publicada no Site' : 'Aprovada pelo Redator-Chefe',
      status: publishNow ? 'Publicado' : current?.status,
      approvedBy: `${chiefName} (Editor-Chefe)`,
      publishedAt: publishNow ? nowLabel : current?.publishedAt,
    };
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    runApiMutation('aprovar matéria/pauta', () => newsApi.update(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
    });
  };

  const publishPautaToSite = (id: string) => {
    const nowLabel = formatNow();
    const prevPautas = stateRef.current.pautas;
    const patch: Partial<EditorialPauta> = {
      approvalStatus: 'Publicada no Site',
      status: 'Publicado',
      publishedAt: nowLabel,
    };
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    runApiMutation('publicar matéria no portal', () => newsApi.update(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
    });
  };

  const unpublishPauta = (id: string) => {
    const prevPautas = stateRef.current.pautas;
    const patch: Partial<EditorialPauta> = {
      approvalStatus: 'Aguardando Redator-Chefe',
      status: 'Edição & Cortes',
    };
    setState((prev) => ({
      ...prev,
      pautas: prev.pautas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    runApiMutation('despublicar matéria', () => newsApi.update(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
    });
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
    const created: AdvertisingCampaign = { ...campaign, id: `adv-${Date.now()}` };
    const prevCampaigns = stateRef.current.advertisingCampaigns;
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: [created, ...prev.advertisingCampaigns],
    }));
    runApiMutation('criar campanha publicitária', () => campaignsApi.createCampaign(created), {
      onRollback: () => setState((prev) => ({ ...prev, advertisingCampaigns: prevCampaigns })),
    });
  };

  const updateAdvertisingStatus = (id: string, status: AdvertisingStatus) => {
    const prevCampaigns = stateRef.current.advertisingCampaigns;
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: prev.advertisingCampaigns.map((c) =>
        c.id === id ? { ...c, status } : c
      ),
    }));
    runApiMutation(
      'atualizar status da campanha',
      () => campaignsApi.updateCampaign(id, { status }),
      {
        onRollback: () => setState((prev) => ({ ...prev, advertisingCampaigns: prevCampaigns })),
      }
    );
  };

  const updateArtworkStatus = (id: string, artworkStatus: ArtworkStatus) => {
    const prevCampaigns = stateRef.current.advertisingCampaigns;
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: prev.advertisingCampaigns.map((c) =>
        c.id === id ? { ...c, artworkStatus } : c
      ),
    }));
    runApiMutation(
      'atualizar status de arte da campanha',
      () => campaignsApi.updateCampaign(id, { artworkStatus }),
      {
        onRollback: () => setState((prev) => ({ ...prev, advertisingCampaigns: prevCampaigns })),
      }
    );
  };

  const deleteAdvertisingCampaign = (id: string) => {
    const prevCampaigns = stateRef.current.advertisingCampaigns;
    setState((prev) => ({
      ...prev,
      advertisingCampaigns: prev.advertisingCampaigns.filter((c) => c.id !== id),
    }));
    runApiMutation('excluir campanha publicitária', () => campaignsApi.deleteCampaign(id), {
      onRollback: () => setState((prev) => ({ ...prev, advertisingCampaigns: prevCampaigns })),
    });
  };

  /* Financeiro de Agência */
  const addFinancialEntry = (entry: Omit<FinancialEntry, 'id'>) => {
    const created: FinancialEntry = { ...entry, id: `fin-${Date.now()}` };
    const prevEntries = stateRef.current.financialEntries;
    setState((prev) => ({
      ...prev,
      financialEntries: [created, ...prev.financialEntries],
    }));
    runApiMutation('criar lançamento financeiro', () => financeApi.create(created), {
      onRollback: () => setState((prev) => ({ ...prev, financialEntries: prevEntries })),
    });
  };

  const updateFinancialStatus = (id: string, status: FinancialPaymentStatus) => {
    const prevEntries = stateRef.current.financialEntries;
    setState((prev) => ({
      ...prev,
      financialEntries: prev.financialEntries.map((f) => (f.id === id ? { ...f, status } : f)),
    }));
    runApiMutation('atualizar status financeiro', () => financeApi.update(id, { status }), {
      onRollback: () => setState((prev) => ({ ...prev, financialEntries: prevEntries })),
    });
  };

  const deleteFinancialEntry = (id: string) => {
    const prevEntries = stateRef.current.financialEntries;
    setState((prev) => ({
      ...prev,
      financialEntries: prev.financialEntries.filter((f) => f.id !== id),
    }));
    runApiMutation('excluir lançamento financeiro', () => financeApi.remove(id), {
      onRollback: () => setState((prev) => ({ ...prev, financialEntries: prevEntries })),
    });
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

    for (const c of newCampaigns) {
      runApiMutation('criar campanha gerada do orçamento', () => campaignsApi.createCampaign(c));
    }
    for (const f of newEntries) {
      runApiMutation('criar parcela financeira do orçamento', () => financeApi.create(f));
    }
    for (const t of newClientTasks) {
      runApiMutation('criar tarefa do cliente gerada do orçamento', () => crmApi.createTask(t));
    }

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
    const created: OutdoorPoint = { ...point, id: `out-${Date.now()}` };
    const prevPoints = stateRef.current.outdoorPoints;
    setState((prev) => ({
      ...prev,
      outdoorPoints: [created, ...prev.outdoorPoints],
    }));
    runApiMutation('criar ponto de outdoor', () => campaignsApi.createOutdoor(created), {
      onRollback: () => setState((prev) => ({ ...prev, outdoorPoints: prevPoints })),
    });
  };

  const updateOutdoorPoint = (id: string, patch: Partial<OutdoorPoint>) => {
    const prevPoints = stateRef.current.outdoorPoints;
    setState((prev) => ({
      ...prev,
      outdoorPoints: prev.outdoorPoints.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
    runApiMutation('atualizar ponto de outdoor', () => campaignsApi.updateOutdoor(id, patch), {
      onRollback: () => setState((prev) => ({ ...prev, outdoorPoints: prevPoints })),
    });
  };

  const deleteOutdoorPoint = (id: string) => {
    const prevPoints = stateRef.current.outdoorPoints;
    setState((prev) => ({
      ...prev,
      outdoorPoints: prev.outdoorPoints.filter((o) => o.id !== id),
    }));
    runApiMutation('excluir ponto de outdoor', () => campaignsApi.deleteOutdoor(id), {
      onRollback: () => setState((prev) => ({ ...prev, outdoorPoints: prevPoints })),
    });
  };

  /* Equipe & Pessoas (persistência forçada na tabela `users` do MySQL) */
  const addTeamMember = async (
    member: Omit<TeamMember, 'id' | 'createdAt'>
  ): Promise<{ ok: boolean; error?: string; savedInMysql?: boolean }> => {
    const newMember: TeamMember = {
      ...member,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
    };

    if (apiModeRef.current === 'offline') {
      setState((prev) => ({
        ...prev,
        teamMembers: [newMember, ...prev.teamMembers],
      }));
      return { ok: true, savedInMysql: false };
    }

    if (!hasApiSession()) {
      const error = 'Sessão sem autenticação ativa na API. Faça login novamente para gravar em usuários.';
      setApiSyncError(error);
      return { ok: false, error };
    }

    const res = await usersApi.create(newMember);
    if (!res.ok) {
      reportApiError('criar usuário na tabela users', res);
      return { ok: false, error: res.error || 'Falha ao gravar usuário na tabela users do MySQL.' };
    }

    const savedMember: TeamMember = res.data?.item
      ? { ...newMember, ...res.data.item, password: '' }
      : { ...newMember, password: '' };

    setState((prev) => ({
      ...prev,
      teamMembers: [savedMember, ...prev.teamMembers.filter((m) => m.id !== savedMember.id)],
    }));
    setApiSyncError(null);
    return { ok: true, savedInMysql: true };
  };

  const updateTeamMember = async (
    id: string,
    patch: Partial<TeamMember>
  ): Promise<{ ok: boolean; error?: string; savedInMysql?: boolean }> => {
    const prevMembers = stateRef.current.teamMembers;
    const existing = prevMembers.find((m) => m.id === id);

    // Monta payload completo para garantir persistência/upsert na tabela `users` do MySQL,
    // enviando `password` apenas quando explicitamente preenchida pelo Super Admin.
    const cleanPatch: Partial<TeamMember> = { ...patch };
    if (typeof cleanPatch.password === 'string' && !cleanPatch.password.trim()) {
      delete cleanPatch.password;
    }

    const apiPayload: Partial<TeamMember> = existing
      ? {
          name: existing.name,
          loginName: existing.loginName,
          role: existing.role,
          hierarchyLevel: existing.hierarchyLevel,
          department: existing.department,
          email: existing.email,
          phone: existing.phone,
          avatarUrl: existing.avatarUrl,
          bio: existing.bio,
          active: existing.active,
          allowedModules: existing.allowedModules,
          permissions: existing.permissions,
          linkedClientName: existing.linkedClientName,
          ...cleanPatch,
        }
      : cleanPatch;

    if (apiModeRef.current === 'offline') {
      setState((prev) => ({
        ...prev,
        teamMembers: prev.teamMembers.map((m) => (m.id === id ? { ...m, ...cleanPatch } : m)),
      }));
      return { ok: true, savedInMysql: false };
    }

    if (!hasApiSession()) {
      const error = 'Sessão sem autenticação ativa na API. Faça login novamente para salvar em usuários.';
      setApiSyncError(error);
      return { ok: false, error };
    }

    const res = await usersApi.update(id, apiPayload);
    if (!res.ok) {
      reportApiError('atualizar credenciais do usuário', res);
      return { ok: false, error: res.error || 'Falha ao salvar alterações na tabela users do MySQL.' };
    }

    setState((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((m) => {
        if (m.id !== id) return m;
        const merged = res.data?.item ? { ...m, ...cleanPatch, ...res.data.item } : { ...m, ...cleanPatch };
        return { ...merged, password: '' };
      }),
    }));
    setApiSyncError(null);
    return { ok: true, savedInMysql: true };
  };

  const deleteTeamMember = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const prevMembers = stateRef.current.teamMembers;
    const prevActive = stateRef.current.activeAdminUserId;

    if (apiModeRef.current === 'offline') {
      setState((prev) => ({
        ...prev,
        teamMembers: prev.teamMembers.filter((m) => m.id !== id),
        activeAdminUserId:
          prev.activeAdminUserId === id
            ? (prev.teamMembers.find((m) => m.id !== id)?.id ?? '')
            : prev.activeAdminUserId,
      }));
      return { ok: true };
    }

    if (!hasApiSession()) {
      const error = 'Sessão sem autenticação ativa na API. Faça login novamente.';
      setApiSyncError(error);
      return { ok: false, error };
    }

    const res = await usersApi.remove(id);
    if (!res.ok) {
      reportApiError('excluir usuário', res);
      return { ok: false, error: res.error || 'Falha ao excluir usuário no MySQL.' };
    }

    setState((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
      activeAdminUserId:
        prev.activeAdminUserId === id
          ? (prev.teamMembers.find((m) => m.id !== id)?.id ?? '')
          : prev.activeAdminUserId,
    }));
    setApiSyncError(null);
    void prevMembers;
    void prevActive;
    return { ok: true };
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
    const prevTasks = stateRef.current.clientTasks;
    setState((prev) => ({
      ...prev,
      clientTasks: [newTask, ...prev.clientTasks],
    }));
    runApiMutation('criar tarefa do pipeline', () => crmApi.createTask(newTask), {
      onRollback: () => setState((prev) => ({ ...prev, clientTasks: prevTasks })),
    });
  };

  const updateClientTask = (id: string, patch: Partial<ClientServiceTask>) => {
    const now = formatNow();
    const prevTasks = stateRef.current.clientTasks;
    setState((prev) => ({
      ...prev,
      clientTasks: prev.clientTasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: now } : t
      ),
    }));
    runApiMutation(
      'atualizar tarefa do pipeline',
      () => crmApi.updateTask(id, { ...patch, updatedAt: now }),
      {
        onRollback: () => setState((prev) => ({ ...prev, clientTasks: prevTasks })),
      }
    );
  };

  const moveClientTaskStage = (id: string, stage: ClientKanbanStage) => {
    const now = formatNow();
    const prevTasks = stateRef.current.clientTasks;
    setState((prev) => ({
      ...prev,
      clientTasks: prev.clientTasks.map((t) =>
        t.id === id ? { ...t, stage, updatedAt: now } : t
      ),
    }));
    runApiMutation(
      'mover etapa da tarefa',
      () => crmApi.updateTask(id, { stage, updatedAt: now }),
      {
        onRollback: () => setState((prev) => ({ ...prev, clientTasks: prevTasks })),
      }
    );
  };

  const toggleClientChecklistItem = (taskId: string, checklistId: string) => {
    const now = formatNow();
    const prevTasks = stateRef.current.clientTasks;
    const target = prevTasks.find((t) => t.id === taskId);
    const updatedChecklist = target
      ? target.checklist.map((c) => (c.id === checklistId ? { ...c, done: !c.done } : c))
      : undefined;
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
    if (updatedChecklist) {
      runApiMutation(
        'atualizar checklist da tarefa',
        () => crmApi.updateTask(taskId, { checklist: updatedChecklist, updatedAt: now }),
        {
          onRollback: () => setState((prev) => ({ ...prev, clientTasks: prevTasks })),
        }
      );
    }
  };

  const deleteClientTask = (id: string) => {
    const prevTasks = stateRef.current.clientTasks;
    setState((prev) => ({
      ...prev,
      clientTasks: prev.clientTasks.filter((t) => t.id !== id),
    }));
    runApiMutation('excluir tarefa do pipeline', () => crmApi.deleteTask(id), {
      onRollback: () => setState((prev) => ({ ...prev, clientTasks: prevTasks })),
    });
  };

  /* CMS Completo */
  const updateSiteSettings = (patch: Partial<SiteSettings>) => {
    if (typeof patch.faviconUrl === 'string') {
      writePersistedFavicons({ siteFaviconUrl: patch.faviconUrl.trim() });
    }
    setState((prev) => {
      const next: FortMidiaState = {
        ...prev,
        siteSettings: { ...prev.siteSettings, ...patch },
      };
      if (apiModeRef.current !== 'online') {
        persistStateSafely(next);
      }
      return next;
    });
  };

  const updateNewsPortalSettings = (patch: Partial<NewsPortalSettings>) => {
    if (typeof patch.faviconUrl === 'string') {
      writePersistedFavicons({ newsFaviconUrl: patch.faviconUrl.trim() });
    }
    setState((prev) => {
      const next: FortMidiaState = {
        ...prev,
        newsPortalSettings: { ...prev.newsPortalSettings, ...patch },
      };
      if (apiModeRef.current !== 'online') {
        persistStateSafely(next);
      }
      return next;
    });
  };

  const saveCmsChangesNow = async (): Promise<{ ok: boolean; message: string }> => {
    const current = stateRef.current;
    writePersistedFavicons({
      siteFaviconUrl: current.siteSettings.faviconUrl?.trim(),
      newsFaviconUrl: current.newsPortalSettings.faviconUrl?.trim(),
    });

    if (apiModeRef.current === 'online') {
      if (!hasApiSession()) {
        const msg = 'Faça login como administrador para gravar as personalizações no servidor MySQL.';
        setApiSyncError(msg);
        return { ok: false, message: msg };
      }
      const sanitizedSnapshot: FortMidiaState = {
        ...current,
        teamMembers: current.teamMembers.map((m) => ({ ...m, password: '' })),
      };
      const res = await stateApi.saveSnapshot(sanitizedSnapshot);
      if (!res.ok) {
        reportApiError('salvar personalizações do CMS', res);
        return {
          ok: false,
          message: res.error || 'Erro ao gravar personalizações do CMS no servidor.',
        };
      }
      setApiSyncError(null);
      return {
        ok: true,
        message: 'Personalizações CMS e favicons salvos permanentemente no servidor!',
      };
    }

    const saved = persistStateSafely(current);
    if (!saved) {
      return {
        ok: false,
        message:
          'Os favicons foram salvos, mas algum arquivo grande excedeu o armazenamento local. Use links URL para vídeos grandes.',
      };
    }
    return {
      ok: true,
      message: 'Personalizações CMS salvas com sucesso e aplicadas permanentemente!',
    };
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
          ? {
              ...prev.siteSettings,
              ...cloned.siteSettings,
              faviconUrl:
                prev.siteSettings.faviconUrl && prev.siteSettings.faviconUrl !== LEGACY_SITE_FAVICON
                  ? prev.siteSettings.faviconUrl
                  : cloned.siteSettings.faviconUrl || prev.siteSettings.faviconUrl,
            }
          : prev.siteSettings,
      newsPortalSettings:
        scope === 'all' || scope === 'fortnews'
          ? {
              ...prev.newsPortalSettings,
              ...cloned.newsPortalSettings,
              faviconUrl:
                prev.newsPortalSettings.faviconUrl &&
                prev.newsPortalSettings.faviconUrl !== LEGACY_NEWS_FAVICON
                  ? prev.newsPortalSettings.faviconUrl
                  : cloned.newsPortalSettings.faviconUrl || prev.newsPortalSettings.faviconUrl,
            }
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
    let createdMember: TeamMember | null = null;
    const cleanEmail = payload.email.trim().toLowerCase();

    if (!linkedUserId && cleanEmail) {
      const existingMember = stateRef.current.teamMembers.find(
        (m) => m.email.toLowerCase() === cleanEmail
      );
      if (existingMember) {
        linkedUserId = existingMember.id;
      } else if (isCurrentUserSuperAdmin() && loginPassword && loginPassword.trim().length >= 6) {
        const newUserId = `usr-${Date.now()}`;
        linkedUserId = newUserId;
        const preset = ROLE_PRESETS['Repórter / Jornalista'];
        const firstWord = payload.name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(/\s+/)[0]
          ?.replace(/[^a-z0-9._-]+/g, '');
        createdMember = {
          id: newUserId,
          name: payload.name.trim(),
          loginName: firstWord || undefined,
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
      }
    }

    const created: ReporterProfile = {
      ...payload,
      id: newId,
      linkedUserId,
      createdAt: today,
    };

    const prevMembers = stateRef.current.teamMembers;
    setState((prev) => ({
      ...prev,
      teamMembers: createdMember ? [...prev.teamMembers, createdMember] : prev.teamMembers,
      reporters: [created, ...prev.reporters],
    }));

    if (createdMember) {
      const memberToSave = createdMember;
      runApiMutation('cadastrar usuário do repórter', () => usersApi.create(memberToSave), {
        onRollback: () => setState((prev) => ({ ...prev, teamMembers: prevMembers })),
      });
    }

    return created;
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
    const prevPautas = stateRef.current.pautas;
    const rep = reporterId
      ? stateRef.current.reporters.find((r) => r.id === reporterId)
      : null;
    const assignedReporterId = rep ? rep.id : undefined;
    const reporterName = rep ? rep.name : 'Redação Central FortNews';

    setState((prev) => {
      const targetPauta = prev.pautas.find((p) => p.id === pautaId);
      const nextPautas = prev.pautas.map((p) =>
        p.id === pautaId
          ? {
              ...p,
              assignedReporterId,
              reporter: reporterName,
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

    runApiMutation(
      'distribuir pauta para repórter',
      () => newsApi.update(pautaId, { assignedReporterId, reporter: reporterName }),
      {
        onRollback: () => setState((prev) => ({ ...prev, pautas: prevPautas })),
      }
    );
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
        saveCmsChangesNow,
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
