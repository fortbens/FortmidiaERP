/**
 * Tipos centrais do ecossistema Grupo FortMídia & Grupo FortNews (CIMBAJU).
 * Compartilhados entre o Portal Institucional / Vitrine Comercial, CMS e Back-Office Administrativo.
 */

export type CimbajuCity =
  | 'Franco da Rocha'
  | 'Caieiras'
  | 'Francisco Morato'
  | 'Cajamar'
  | 'Mairiporã'
  | 'Regional CIMBAJU'
  | 'São Paulo (Capital & RMSP)'
  | 'Brasil'
  | 'Mundo'
  | 'Outras Cidades';

export type PillarId = 'fortnews' | 'outdoors' | 'podcast' | 'agencia';

export interface GroupPillar {
  id: PillarId;
  index: string;
  name: string;
  subtitle: string;
  description: string;
  deliverables: string[];
  targetReach: string;
  externalUrl?: string;
}

export type QuotaCategory = 'podcast' | 'ooh' | 'editorial' | 'agencia';

export interface CommercialQuota {
  id: string;
  category: QuotaCategory;
  categoryLabel: string;
  title: string;
  audience: string;
  priceLabel: string;
  billingCycle: string;
  highlight?: string;
  summary: string;
  deliverables: string[];
  specs: { label: string; value: string }[];
  image: string;
}

export interface PodcastShow {
  id: string;
  title: string;
  host: string;
  hostAvatarUrl?: string;
  programLogoUrl?: string;
  schedule: string;
  daySlot: string;
  focus: string;
  episodeTitle: string;
  durationSec: number;
  baseFreqHz: number;
  accentNote: string;
  sponsorshipGoal?: number;
  quotaValue?: number;
  soldQuotas?: number;
  sponsors?: string[];
}

export type CitizenCategory =
  | 'Infraestrutura e Vias'
  | 'Segurança Pública'
  | 'Saúde e Educação'
  | 'Transporte e Mobilidade'
  | 'Pauta Comunitária';

export type CitizenStatus =
  | 'Aguardando Triagem'
  | 'Triado · Alta Prioridade'
  | 'Encaminhado / Em Apuração'
  | 'Nota Devolutiva Enviada'
  | 'Convertido em Pauta'
  | 'Arquivado';

export interface CitizenReport {
  id: string;
  protocol: string;
  citizenName: string;
  contact: string;
  city: CimbajuCity;
  neighborhood: string;
  category: CitizenCategory;
  urgency: 'Normal' | 'Alta' | 'Crítica';
  title: string;
  description: string;
  createdAt: string;
  status: CitizenStatus;
  triageScore?: number;
  assignedEditor?: string;
  officialResponseNote?: string;
  responseAuthor?: string;
  responseSentAt?: string;
  forwardedAt?: string;
  forwardedTo?: string;
}

export type ContractStatus = 'Ativo' | 'Em Instalação' | 'Em Renovação' | 'Encerrado';
export type CaptationOrigin =
  | 'Captação da Casa (100%)'
  | 'Captação Própria (50/50)'
  | 'Locação Avulsa (R$ 300/h)';

export interface CommercialContract {
  id: string;
  clientName: string;
  segment: string;
  pillar: string;
  city: CimbajuCity;
  planName: string;
  monthlyValue: number;
  origin: CaptationOrigin;
  oohPoint?: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  impressionsEstimate: string;
}

export interface CommercialLead {
  id: string;
  companyOrName: string;
  contact: string;
  city: CimbajuCity;
  quotaTitle: string;
  notes: string;
  createdAt: string;
  status: 'Novo Lead' | 'Em Negociação' | 'Proposta Enviada' | 'Fechado';
}

export type PautaStatus =
  | 'Apuração de Rua'
  | 'Roteiro & Entrevista'
  | 'Edição & Cortes'
  | 'Publicado';

export type NewsSeal =
  | 'Break News'
  | 'Urgente'
  | 'Cidade & Política'
  | 'Tempo'
  | 'Esporte'
  | 'Entretenimento'
  | 'Lazer'
  | 'Fofoca'
  | 'Horóscopo'
  | 'Humor'
  | 'Economia & Negócios'
  | 'Segurança'
  | 'Saúde & Educação'
  | 'Geral';

export type ChiefApprovalStatus =
  | 'Em Apuração'
  | 'Aguardando Redator-Chefe'
  | 'Aprovada pelo Redator-Chefe'
  | 'Publicada no Site';

export interface SocialCreativeDraft {
  instagramCaption: string;
  headlineOverlay: string;
  storyCta: string;
  hashtags: string;
  visualDirection: string;
}

export interface EditorialPauta {
  id: string;
  /** Código interno sequencial de controle (ex: FN-0001). Uso exclusivo do sistema, nunca exibido nos sites públicos. */
  internalCode?: string;
  title: string;
  city: CimbajuCity;
  seal: NewsSeal;
  format: 'Reportagem Investigativa' | 'Tabloide Quinzenal' | 'Revista A4 Mensal' | 'Portal 24/7';
  reporter: string;
  assignedReporterId?: string;
  deadline: string;
  status: PautaStatus;
  approvalStatus: ChiefApprovalStatus;
  approvedBy?: string;
  publishedAt?: string;
  summary: string;
  body: string;
  imageUrl?: string;
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  sourceProtocol?: string;
  aiGenerated?: boolean;
  sourceUrls?: { title: string; uri: string }[];
  socialCreative?: SocialCreativeDraft;
}

export interface StudioBooking {
  id: string;
  date: string;
  startHour: string;
  durationHours: number;
  programOrClient: string;
  bookingType: 'Grade Oficial (16h–20h)' | 'Locação Avulsa';
  hostOrResponsible: string;
  hourlyRate: number;
  status: 'Confirmado' | 'Gravado' | 'Reservado';
  podcastShowId?: string;
  programLogoUrl?: string;
}

/* ---------------- GESTÃO DE PUBLICIDADE ---------------- */

export type AdvertisingType =
  | 'Apoio'
  | 'Patrocínio'
  | 'Cota'
  | 'Revista'
  | 'Outdoor'
  | 'Podcast'
  | 'Eventos'
  | 'Outros';

export type AdvertisingStatus = 'Em Veiculação' | 'Programada' | 'Em Produção' | 'Encerrada';
export type ArtworkStatus = 'Arte Aprovada' | 'Aguardando Material' | 'Em Criação' | 'Checking Entregue';

export interface AdvertisingCampaign {
  id: string;
  advertiser: string;
  adType: AdvertisingType;
  title: string;
  placementSpec: string;
  city: CimbajuCity;
  startDate: string;
  endDate: string;
  value: number;
  status: AdvertisingStatus;
  artworkStatus: ArtworkStatus;
  accountManager: string;
}

/* ---------------- FINANCEIRO DE AGÊNCIA ---------------- */

export type FinancialEntryType = 'Receita' | 'Despesa';
export type FinancialCounterpartyRole =
  | 'Anunciante / Cliente'
  | 'Fornecedor'
  | 'Prestador de Serviço'
  | 'Apresentador / Repasse 50/50'
  | 'Estrutura & Operação';

export type FinancialPaymentStatus = 'Pago' | 'Pendente' | 'Atrasado';

export interface FinancialEntry {
  id: string;
  type: FinancialEntryType;
  description: string;
  counterpartyName: string;
  counterpartyRole: FinancialCounterpartyRole;
  costCenter: string;
  dueDate: string;
  amount: number;
  status: FinancialPaymentStatus;
  paymentMethod: 'PIX' | 'Boleto' | 'Transferência' | 'Cartão Corporativo';
  invoiceRef?: string;
}

/* ---------------- CMS COMPLETO (FORTMÍDIA & FORTNEWS) ---------------- */

export interface SiteVideoItem {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  posterUrl?: string;
  category?: string;
  active: boolean;
  featured?: boolean;
  createdAt: string;
}

export interface SiteSettings {
  brandName: string;
  brandHighlight: string;
  logoUrl: string;
  faviconUrl?: string;
  logoMode: 'wordmark' | 'image';
  logoHeightPx?: number;
  primaryColor: string;
  goldColor: string;
  backgroundColor: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroPrimaryCta: string;
  heroVideoUrl?: string;
  heroVideoPosterUrl?: string;
  heroVideoTitle?: string;
  siteVideos?: SiteVideoItem[];
  newsPortalUrl: string;
  contactEmail: string;
  siteDomain: string;
  governanceNames: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappMessage: string;
  whatsappLabel: string;
  showPublicPrices: boolean;
  consultPriceLabel: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
}

export interface NewsPortalSettings {
  portalName: string;
  portalTagline: string;
  primaryColor: string;
  secondaryColor: string;
  domain: string;
  logoUrl: string;
  faviconUrl?: string;
  logoHeightPx: number;
  logoFitMode: 'square' | 'wide' | 'auto';
  breakingTickerEnabled: boolean;
  marqueeTickerEnabled: boolean;
  marqueeSpeedSeconds: number;
  marqueeAiItems: string[];
  marqueeUpdatedAt?: string;
  weatherCity: string;
  weatherTemp: string;
  weatherMinMax: string;
  weatherSummary: string;
  showAds: boolean;
  footerText: string;
  enabledSeals: NewsSeal[];
  featuredVideoEnabled?: boolean;
  featuredVideoTitle?: string;
  featuredVideoUrl?: string;
  featuredVideoPosterUrl?: string;
  portalVideos?: SiteVideoItem[];
}

export type GalleryCategory =
  | 'Estúdio & Podcast'
  | 'Mídia OOH'
  | 'Impressos & Eventos'
  | 'Agência & Corporativo';

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  serviceTag: string;
  description: string;
  imageUrl: string;
}

export interface CmsPopupConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaAction: 'proposal' | 'whatsapp' | 'news' | 'custom_url';
  customUrl: string;
  imageUrl: string;
  delaySeconds: number;
}

/* ---------------- ORÇAMENTO & PLANO DE MÍDIA ---------------- */

export type BudgetItemCategory =
  | 'Redes Sociais & Story'
  | 'Podcast & Estúdio'
  | 'Mídia Exterior (Outdoors 9x3m)'
  | 'Portal & Impressos'
  | 'FortTech & Soluções IA'
  | 'Eventos & Outros';

export interface BudgetCatalogItem {
  id: string;
  productName: string;
  category: BudgetItemCategory;
  defaultUnitLabel: string;
  defaultUnitValue: number;
  defaultDescription: string;
  defaultPeriodLabel: string;
}

export interface BudgetLineItem {
  id: string;
  productName: string;
  category: BudgetItemCategory;
  description: string;
  quantity: number;
  unitLabel: string;
  unitValue: number;
  startDate: string;
  endDate: string;
  periodLabel: string;
}

export type BudgetStatus = 'Rascunho' | 'Enviado ao Cliente' | 'Aprovado' | 'Recusado';

export interface MediaPlanBudget {
  id: string;
  code: string;
  title: string;
  clientName: string;
  clientDocument: string;
  clientContact: string;
  city: CimbajuCity;
  createdAt: string;
  validUntil: string;
  campaignStartDate: string;
  campaignEndDate: string;
  paymentTerms: string;
  discountPercent: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  agencyFeePercent?: number;
  installmentsCount?: number;
  convertedToErpAt?: string;
  notes: string;
  accountManager: string;
  status: BudgetStatus;
  items: BudgetLineItem[];
}

/* ---------------- INVENTÁRIO DE OUTDOORS (COM MAPA & PINS) ---------------- */

export type OutdoorAvailability = 'Disponível' | 'Reservado' | 'Ocupado' | 'Em Manutenção';

export type OutdoorLighting =
  | 'Iluminado (Frontlight)'
  | 'Convencional (Lona)'
  | 'Painel LED Digital';

export interface OutdoorPoint {
  id: string;
  code: string;
  title: string;
  address: string;
  city: CimbajuCity;
  lat: number;
  lng: number;
  dimensions: string;
  lighting: OutdoorLighting;
  bimonthlyPrice: number;
  availability: OutdoorAvailability;
  currentAdvertiser?: string;
  availableFrom?: string;
  notes?: string;
}

/* ---------------- EQUIPE, HIERARQUIA & PERMISSÕES ---------------- */

export type AdminTabId =
  | 'cockpit'
  | 'financeiro'
  | 'orcamento'
  | 'cartas'
  | 'catalogo'
  | 'publicidade'
  | 'comercial'
  | 'clientes'
  | 'portal_noticias'
  | 'jornalismo'
  | 'reporteres'
  | 'fontes'
  | 'marketing'
  | 'estudio'
  | 'agenda'
  | 'notificacoes'
  | 'institucional'
  | 'relatorios'
  | 'equipe'
  | 'presets'
  | 'auditoria'
  | 'cms';

export type TeamRole =
  | 'Super Admin / Diretoria'
  | 'Administrador'
  | 'Redator-Chefe'
  | 'Executivo Comercial'
  | 'Apresentador'
  | 'Repórter / Jornalista'
  | 'Designer / Social Media'
  | 'Produtor Podcast'
  | 'Financeiro'
  | 'Cliente / Anunciante';

export interface UserPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  /** Nome simples de login (ex: emerson, maria, carlos) para acesso simplificado sem precisar digitar e-mail completo */
  loginName?: string;
  role: TeamRole;
  hierarchyLevel: 1 | 2 | 3 | 4 | 5 | 6;
  department: string;
  email: string;
  phone: string;
  password: string;
  avatarUrl: string;
  bio: string;
  active: boolean;
  createdAt: string;
  allowedModules?: AdminTabId[];
  permissions?: UserPermissions;
  linkedClientName?: string;
}

/* ---------------- AGENDA CORPORATIVA ---------------- */

export type AgendaEventCategory =
  | 'Podcast & Estúdio'
  | 'Reunião Comercial'
  | 'Pauta Jornalística'
  | 'Instalação OOH / Checking'
  | 'Eventos & Trio Elétrico';

export type AgendaEventStatus = 'Agendado' | 'Confirmado' | 'Em Andamento' | 'Concluído' | 'Cancelado';

export interface AgendaEvent {
  id: string;
  title: string;
  category: AgendaEventCategory;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  city: CimbajuCity;
  responsibleName: string;
  clientOrGuest?: string;
  description: string;
  status: AgendaEventStatus;
}

/* ---------------- CENTRAL DE NOTIFICAÇÕES ---------------- */

export type AppNotificationType =
  | 'Veiculação de Anúncio'
  | 'Aprovação Editorial'
  | 'Agenda & Podcast'
  | 'Financeiro'
  | 'Fala Cidadão'
  | 'Sistema';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  priority: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
  targetAudience: 'Todos' | TeamRole;
  targetClientName?: string;
  createdAt: string;
  read: boolean;
  actionTab?: AdminTabId;
}

/* ---------------- ÁREA DO CLIENTE (QUADRO DE OPERAÇÕES KANBAN) ---------------- */

export type ClientKanbanStage =
  | 'Briefing & Material'
  | 'Em Produção / Arte'
  | 'Aprovação do Cliente'
  | 'Em Veiculação / No Ar'
  | 'Checking & Concluído';

export interface ClientTaskChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ClientServiceTask {
  id: string;
  clientName: string;
  accessCode: string;
  title: string;
  serviceType: string;
  city: CimbajuCity;
  stage: ClientKanbanStage;
  priority: 'Normal' | 'Alta' | 'Urgente';
  dueDate: string;
  assigneeName: string;
  assigneeAvatar: string;
  description: string;
  checklist: ClientTaskChecklistItem[];
  clientFeedback?: string;
  outdoorCode?: string;
  updatedAt: string;
}

/* ---------------- PRESETS TRAVADOS PELO SUPER ADMIN ---------------- */

export interface MarketingArtPreset {
  id: string;
  name: string;
  accentColor: string;
  badgeText?: string;
  badgeBgColor: string;
  badgeTextColor: string;
  topBarColor: string;
  topBarThickness: number;
  showTopBar: boolean;
  dividerColor: string;
  dividerThickness: number;
  dividerWidthPct: number;
  showDividerLine: boolean;
  footerBarColor: string;
  footerAccentColor: string;
  footerText: string;
  showFooterBar: boolean;
  showOuterBorder: boolean;
  outerBorderColor: string;
  outerBorderThickness: number;
  watermarkEnabled: boolean;
  watermarkType: 'text' | 'logo';
  watermarkText: string;
  watermarkLogoUrl: string;
  watermarkPos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'tiled';
  watermarkOpacity: number;
  watermarkScale: number;
  maskMode: 'dark' | 'light' | 'custom';
  maskCustomColor: string;
  maskStyle: 'gradient' | 'solid';
  scrimOpacity: number;
  headlineSize: number;
  headlineColor: string;
  subtitleSize: number;
  subtitleColor: string;
  textAlign: 'left' | 'center';
  guestPhotoScale: number;
  hostPhotoScale: number;
  programLogoUrl?: string;
  bgImageUrl?: string;
  artFrameTemplate?: 'classic' | 'fortnews_editorial';
  showEditorialLogo?: boolean;
  editorialLogoUrl?: string;
  editorialLogoScale?: number;
  editorialLogoAlign?: 'center' | 'left';
  editorialFooterSlogan?: string;
  lockedBySuperAdmin: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface SiteCmsPreset {
  id: string;
  name: string;
  siteLogoUrl: string;
  siteLogoMode: 'wordmark' | 'image';
  siteLogoHeightPx: number;
  sitePrimaryColor: string;
  siteGoldColor: string;
  siteBackgroundColor: string;
  newsLogoUrl: string;
  newsLogoHeightPx: number;
  newsLogoFitMode: 'square' | 'wide' | 'auto';
  newsPrimaryColor: string;
  newsSecondaryColor: string;
  lockedBySuperAdmin: boolean;
  updatedBy: string;
  updatedAt: string;
}

export type GlobalPresetScope = 'all' | 'fortmidia' | 'fortnews' | 'popup';

export type GlobalLayoutPresetCategory =
  | 'Oficial Grupo'
  | 'Portal FortNews'
  | 'Campanha Sazonal'
  | 'Operacional Equipe';

export interface GlobalLayoutPreset {
  id: string;
  name: string;
  description: string;
  category: GlobalLayoutPresetCategory;
  siteSettings: SiteSettings;
  newsPortalSettings: NewsPortalSettings;
  popupConfig: CmsPopupConfig;
  defaultMarketingPresetId?: string;
  lockedBySuperAdmin: boolean;
  definedBySuperAdmin: boolean;
  createdBy: string;
  createdByRole: TeamRole;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  lastAppliedAt?: string;
}

/* ---------------- CARTAS OFICIAIS, CONVITES & PROPOSTAS PDF ---------------- */

export type OfficialLetterType =
  | 'convite_podcast'
  | 'apresentacao_fortmidia'
  | 'convite_patrocinio'
  | 'assessoria_mandato'
  | 'convite_empresarial';

export interface OfficialLetterDocument {
  id: string;
  code: string;
  type: OfficialLetterType;
  title: string;
  dateCityLine: string;
  recipientName: string;
  recipientRole: string;
  recipientCompany: string;
  recipientContact: string;
  subjectRef: string;
  greeting: string;
  bodyText: string;
  highlights: string[];
  closingLine: string;
  senderName: string;
  senderRole: string;
  senderEmail: string;
  senderPhone: string;
  podcastShowTitle?: string;
  podcastEpisodeDate?: string;
  podcastEpisodeTime?: string;
  podcastStudioAddress?: string;
  referencePdfUrl?: string;
  headerLogoUrl: string;
  accentColor: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- LOG DE AUDITORIA DE PRESETS ---------------- */

export type PresetAuditAction =
  | 'Criou'
  | 'Alterou'
  | 'Carregou'
  | 'Travou'
  | 'Destravou'
  | 'Excluiu'
  | 'Tentativa Bloqueada';

export type PresetAuditScope = 'Layout Global' | 'CMS Portais' | 'Estúdio Marketing';

export interface PresetAuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: TeamRole | string;
  action: PresetAuditAction;
  presetScope: PresetAuditScope;
  presetId: string;
  presetName: string;
  details: string;
}

/* ---------------- REPÓRTERES & FONTES JORNALÍSTICAS ---------------- */

export interface ReporterProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: CimbajuCity;
  beat: string;
  linkedUserId?: string;
  active: boolean;
  createdAt: string;
  notes?: string;
}

export interface JournalisticSource {
  id: string;
  name: string;
  phone: string;
  city: CimbajuCity;
  neighborhood?: string;
  category?: string;
  notes?: string;
  ownerUserId: string;
  ownerName: string;
  createdAt: string;
}

/* ---------------- PUBLICIDADE NO SITE (TOPO, ENTRE MATÉRIAS & LATERAL) ---------------- */

export type SiteAdPosition = 'topo' | 'entre_materias' | 'lateral';

export type SiteAdTarget = 'ambos' | 'fortnews' | 'fortmidia';

export interface SiteAdBanner {
  id: string;
  title: string;
  advertiser: string;
  subtitle?: string;
  position: SiteAdPosition;
  siteTarget: SiteAdTarget;
  imageUrl?: string;
  linkUrl?: string;
  ctaLabel: string;
  bgColor?: string;
  accentColor?: string;
  active: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
  updatedAt: string;
}

export interface SiteAdsConfig {
  enabled: boolean;
  topBannerEnabled: boolean;
  inFeedEnabled: boolean;
  inFeedInterval: number;
  sidebarEnabled: boolean;
  showSponsoredLabel: boolean;
}


