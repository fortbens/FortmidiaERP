import {
  AdvertisingCampaign,
  AdvertisingStatus,
  ArtworkStatus,
  CitizenReport,
  CitizenStatus,
  ClientServiceTask,
  CommercialContract,
  CommercialLead,
  ContractStatus,
  EditorialPauta,
  FinancialEntry,
  FinancialPaymentStatus,
  OutdoorPoint,
  TeamMember,
} from '../types/fortmidia';

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
export const API_BASE_URL = RAW_API_BASE.replace(/\/+$/, '') || '/api';

// In-memory Bearer token (never persisted in localStorage/sessionStorage for security)
let memoryAuthToken: string | null = null;
let apiKnownOnline = false;

export function setApiAuthToken(token: string | null): void {
  memoryAuthToken = token && token.trim() ? token.trim() : null;
}

export function getApiAuthToken(): string | null {
  return memoryAuthToken;
}

export function clearApiAuthToken(): void {
  memoryAuthToken = null;
}

export function setApiOnlineStatus(online: boolean): void {
  apiKnownOnline = online;
}

export function isApiOnlineStatus(): boolean {
  return apiKnownOnline;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
  billingUrl?: string;
  networkUnavailable?: boolean;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    timeoutMs?: number;
    skipAuth?: boolean;
  } = {}
): Promise<ApiResult<T>> {
  const { method = 'GET', body, timeoutMs = 15000, skipAuth = false } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth && memoryAuthToken) {
    headers.Authorization = `Bearer ${memoryAuthToken}`;
  }

  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson
      ? ((await response.json().catch(() => null)) as Record<string, unknown> | null)
      : null;

    if (!response.ok) {
      // When /api/health has already confirmed the PHP API is online, a 404/500 is a real API error,
      // NOT an offline preview environment.
      const isOfflineFallback =
        !apiKnownOnline &&
        (response.status === 404 || response.status === 502 || response.status === 503);

      return {
        ok: false,
        status: response.status,
        error:
          (typeof payload?.error === 'string' && payload.error) ||
          (response.status === 401
            ? 'Sessão expirada ou não autenticada na API. Faça login novamente.'
            : response.status === 403
              ? 'Permissão insuficiente para executar esta operação no banco MySQL.'
              : response.status === 404
                ? `Endpoint ${path} não encontrado na API PHP em ${API_BASE_URL}.`
                : `Erro HTTP ${response.status} ao comunicar com a API (${path}).`),
        code: typeof payload?.code === 'string' ? payload.code : undefined,
        billingUrl: typeof payload?.billingUrl === 'string' ? payload.billingUrl : undefined,
        networkUnavailable: isOfflineFallback,
      };
    }

    if (!isJson && payload === null) {
      return {
        ok: false,
        status: response.status,
        networkUnavailable: !apiKnownOnline,
        error: apiKnownOnline
          ? `Resposta inválida (não-JSON) recebida de ${API_BASE_URL}${path}.`
          : 'API REST externa não detectada neste ambiente.',
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload as unknown as T,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      networkUnavailable: !apiKnownOnline,
      error: apiKnownOnline
        ? `Falha de rede ao comunicar com ${API_BASE_URL}${path}. Verifique a conexão com o servidor.`
        : 'Servidor de API indisponível neste ambiente de preview.',
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/* ============================================================================
 * Normalizadores compatíveis com snake_case (MySQL direto) e camelCase (API PHP)
 * ============================================================================ */
type RawRow = Record<string, unknown>;

function str(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
  return fallback;
}

function num(val: unknown, fallback = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function parseJsonField<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string' && val.trim()) {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function normalizeContract(row: RawRow): CommercialContract {
  return {
    id: str(row.id, `ctr-${Date.now()}`),
    clientName: str(row.clientName ?? row.client_name ?? row.client, 'Cliente'),
    segment: str(row.segment ?? row.ownerName ?? row.owner_name, 'Comercial'),
    pillar: str(row.pillar, 'Agência FortMídia'),
    city: (str(row.city, 'Franco da Rocha') as CommercialContract['city']),
    planName: str(row.planName ?? row.plan_name ?? row.product, 'Plano Personalizado'),
    monthlyValue: num(row.monthlyValue ?? row.monthly_value, 0),
    origin: (str(row.origin, 'Captação da Casa (100%)') as CommercialContract['origin']),
    oohPoint: str(row.oohPoint ?? row.ooh_point) || undefined,
    status: (str(row.status, 'Ativo') as ContractStatus),
    startDate: str(row.startDate ?? row.start_date, new Date().toISOString().slice(0, 10)),
    endDate: str(row.endDate ?? row.end_date, ''),
    impressionsEstimate: str(row.impressionsEstimate ?? row.impressions_estimate, 'Sob consulta'),
  };
}

export function normalizeLead(row: RawRow): CommercialLead {
  return {
    id: str(row.id, `lead-${Date.now()}`),
    companyOrName: str(row.companyOrName ?? row.company_or_name, 'Lead'),
    contact: str(row.contact),
    city: (str(row.city, 'Franco da Rocha') as CommercialLead['city']),
    quotaTitle: str(row.quotaTitle ?? row.quota_title),
    notes: str(row.notes),
    createdAt: str(row.createdAt ?? row.created_at_label ?? row.created_at),
    status: (str(row.status, 'Novo Lead') as CommercialLead['status']),
  };
}

export function normalizePauta(row: RawRow): EditorialPauta {
  return {
    id: str(row.id, `pau-${Date.now()}`),
    internalCode: str(row.internalCode ?? row.internal_code) || undefined,
    title: str(row.title, 'Sem título'),
    city: (str(row.city, 'Regional CIMBAJU') as EditorialPauta['city']),
    seal: (str(row.seal, 'Geral') as EditorialPauta['seal']),
    format: (str(row.format, 'Portal 24/7') as EditorialPauta['format']),
    reporter: str(row.reporter, 'Redação FortNews'),
    assignedReporterId: str(row.assignedReporterId ?? row.assigned_reporter_id) || undefined,
    deadline: str(row.deadline),
    status: (str(row.status, 'Apuração de Rua') as EditorialPauta['status']),
    approvalStatus: (str(
      row.approvalStatus ?? row.approval_status,
      'Aguardando Redator-Chefe'
    ) as EditorialPauta['approvalStatus']),
    approvedBy: str(row.approvedBy ?? row.approved_by) || undefined,
    publishedAt: str(row.publishedAt ?? row.published_at) || undefined,
    summary: str(row.summary),
    body: str(row.body),
    imageUrl: str(row.imageUrl ?? row.image_url) || undefined,
    mediaType: (str(row.mediaType ?? row.media_type, 'image') as 'image' | 'video'),
    videoUrl: str(row.videoUrl ?? row.video_url) || undefined,
    sourceProtocol: str(row.sourceProtocol ?? row.source_protocol) || undefined,
    aiGenerated: Boolean(row.aiGenerated ?? row.ai_generated),
    sourceUrls: parseJsonField(row.sourceUrls ?? row.source_urls_json, undefined),
    socialCreative: parseJsonField(row.socialCreative ?? row.social_creative_json, undefined),
  };
}

export function normalizeFinancialEntry(row: RawRow): FinancialEntry {
  return {
    id: str(row.id, `fin-${Date.now()}`),
    type: (str(row.type, 'Receita') as FinancialEntry['type']),
    description: str(row.description),
    counterpartyName: str(row.counterpartyName ?? row.counterparty_name),
    counterpartyRole: (str(
      row.counterpartyRole ?? row.counterparty_role,
      'Anunciante / Cliente'
    ) as FinancialEntry['counterpartyRole']),
    costCenter: str(row.costCenter ?? row.cost_center, 'Operação FortMídia'),
    dueDate: str(row.dueDate ?? row.due_date),
    amount: num(row.amount, 0),
    status: (str(row.status, 'Pendente') as FinancialPaymentStatus),
    paymentMethod: (str(
      row.paymentMethod ?? row.payment_method,
      'PIX'
    ) as FinancialEntry['paymentMethod']),
    invoiceRef: str(row.invoiceRef ?? row.invoice_ref) || undefined,
  };
}

export function normalizeCampaign(row: RawRow): AdvertisingCampaign {
  return {
    id: str(row.id, `adv-${Date.now()}`),
    advertiser: str(row.advertiser),
    adType: (str(row.adType ?? row.ad_type, 'Patrocínio') as AdvertisingCampaign['adType']),
    title: str(row.title),
    placementSpec: str(row.placementSpec ?? row.placement_spec),
    city: (str(row.city, 'Franco da Rocha') as AdvertisingCampaign['city']),
    startDate: str(row.startDate ?? row.start_date),
    endDate: str(row.endDate ?? row.end_date),
    value: num(row.value ?? row.contract_value, 0),
    status: (str(row.status, 'Programada') as AdvertisingStatus),
    artworkStatus: (str(
      row.artworkStatus ?? row.artwork_status,
      'Aguardando Material'
    ) as ArtworkStatus),
    accountManager: str(row.accountManager ?? row.account_manager, 'Comercial FortMídia'),
  };
}

export function normalizeOutdoor(row: RawRow): OutdoorPoint {
  return {
    id: str(row.id, `out-${Date.now()}`),
    code: str(row.code),
    title: str(row.title ?? row.location_name),
    address: str(row.address ?? row.address_reference),
    city: (str(row.city, 'Franco da Rocha') as OutdoorPoint['city']),
    lat: num(row.lat, -23.3219),
    lng: num(row.lng, -46.7272),
    dimensions: str(row.dimensions, '9,00m x 3,00m'),
    lighting: (str(row.lighting, 'Iluminado (Frontlight)') as OutdoorPoint['lighting']),
    bimonthlyPrice: num(row.bimonthlyPrice ?? row.biweekly_rate ?? row.monthly_rate, 1350),
    availability: (str(row.availability, 'Disponível') as OutdoorPoint['availability']),
    currentAdvertiser: str(row.currentAdvertiser ?? row.current_advertiser) || undefined,
    availableFrom: str(row.availableFrom ?? row.occupied_until) || undefined,
    notes: str(row.notes ?? row.daily_traffic_estimate) || undefined,
  };
}

export function normalizeCitizenReport(row: RawRow): CitizenReport {
  return {
    id: str(row.id, `rep-${Date.now()}`),
    protocol: str(row.protocol),
    citizenName: str(row.citizenName ?? row.citizen_name, 'Cidadão'),
    contact: str(row.contact),
    city: (str(row.city, 'Franco da Rocha') as CitizenReport['city']),
    neighborhood: str(row.neighborhood),
    category: (str(row.category, 'Infraestrutura e Vias') as CitizenReport['category']),
    urgency: (str(row.urgency, 'Normal') as CitizenReport['urgency']),
    title: str(row.title),
    description: str(row.description),
    createdAt: str(row.createdAt ?? row.created_at_label ?? row.created_at),
    status: (str(row.status, 'Aguardando Triagem') as CitizenStatus),
    triageScore:
      row.triageScore !== undefined || row.triage_score !== undefined
        ? num(row.triageScore ?? row.triage_score)
        : undefined,
    assignedEditor: str(row.assignedEditor ?? row.assigned_editor) || undefined,
    officialResponseNote:
      str(row.officialResponseNote ?? row.official_response_note) || undefined,
    responseAuthor: str(row.responseAuthor ?? row.response_author) || undefined,
    responseSentAt: str(row.responseSentAt ?? row.response_sent_at) || undefined,
    forwardedAt: str(row.forwardedAt ?? row.forwarded_at) || undefined,
    forwardedTo: str(row.forwardedTo ?? row.forwarded_to) || undefined,
  };
}

export function normalizeClientTask(row: RawRow): ClientServiceTask {
  return {
    id: str(row.id, `tsk-${Date.now()}`),
    clientName: str(row.clientName ?? row.client_name),
    accessCode: str(row.accessCode ?? row.access_code, 'FORT-26'),
    title: str(row.title ?? row.campaign_title),
    serviceType: str(row.serviceType ?? row.service_type, 'Agência'),
    city: (str(row.city, 'Franco da Rocha') as ClientServiceTask['city']),
    stage: (str(row.stage, 'Briefing & Material') as ClientServiceTask['stage']),
    priority: (str(row.priority, 'Normal') as ClientServiceTask['priority']),
    dueDate: str(row.dueDate ?? row.due_date),
    assigneeName: str(row.assigneeName ?? row.assignee, 'Equipe FortMídia'),
    assigneeAvatar: str(
      row.assigneeAvatar ?? row.assignee_avatar,
      '/assets/aistudio/Logo_FortM_dia_ded2b7d7.png'
    ),
    description: str(row.description ?? row.client_notes),
    checklist: parseJsonField(row.checklist ?? row.checklist_json, []),
    updatedAt: str(row.updatedAt ?? row.updated_at_label ?? row.updated_at),
  };
}

export function normalizeTeamMember(row: RawRow): TeamMember {
  return {
    id: str(row.id, `usr-${Date.now()}`),
    name: str(row.name, 'Usuário'),
    role: (str(row.role, 'Executivo Comercial') as TeamMember['role']),
    hierarchyLevel: (Math.min(
      6,
      Math.max(1, num(row.hierarchyLevel ?? row.hierarchy_level, 4))
    ) as TeamMember['hierarchyLevel']),
    department: str(row.department, 'Operações FortMídia'),
    email: str(row.email),
    phone: str(row.phone),
    password: '',
    avatarUrl: str(
      row.avatarUrl ?? row.avatar_url,
      '/assets/aistudio/Logo_FortM_dia_ded2b7d7.png'
    ),
    bio: str(row.bio),
    active: row.active === undefined ? true : Boolean(row.active),
    createdAt: str(row.createdAt ?? row.created_at, new Date().toLocaleDateString('pt-BR')),
    allowedModules: parseJsonField(row.allowedModules ?? row.allowed_modules_json, undefined),
    permissions: parseJsonField(row.permissions ?? row.permissions_json, undefined),
    linkedClientName:
      str(row.linkedClientName ?? row.linked_client_name) || undefined,
  };
}

function serializeContractPayload(contract: Partial<CommercialContract>) {
  return {
    ...contract,
    // Compatibilidade com colunas do schema.sql original e estendido
    client: contract.clientName,
    product: contract.planName,
    ownerName: contract.segment,
  };
}

/* ============================================================================
 * 1. Autenticação & Sessão (Token Bearer via MySQL / PHP)
 * ============================================================================ */
export interface AuthLoginResponse {
  token: string;
  user: Omit<TeamMember, 'password'> & { password?: string };
}

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await apiRequest<AuthLoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
      skipAuth: true,
    });
    if (res.ok && res.data?.token) {
      setApiAuthToken(res.data.token);
    }
    return res;
  },
  me: () => apiRequest<{ user: Omit<TeamMember, 'password'> }>('/auth/me'),
  logout: async () => {
    const res = await apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' });
    clearApiAuthToken();
    return res;
  },
};

/* ============================================================================
 * 2. Health Check, Snapshot CMS & Sincronização Inicial com MySQL
 * ============================================================================ */
export const stateApi = {
  health: async () => {
    const res = await apiRequest<{ ok: boolean; service?: string }>('/health', {
      timeoutMs: 4500,
      skipAuth: true,
    });
    const online = Boolean(res.ok && res.data?.ok === true);
    setApiOnlineStatus(online);
    return res;
  },
  fetchSnapshot: <TState>() =>
    apiRequest<{ state?: Partial<TState>; updatedAt?: string }>('/state', { timeoutMs: 6000 }),
  saveSnapshot: (state: unknown) =>
    apiRequest<{ ok: boolean; updatedAt?: string }>('/state', {
      method: 'PUT',
      body: { state },
      timeoutMs: 10000,
    }),
  seedInitialData: (payload: {
    contracts: CommercialContract[];
    leads: CommercialLead[];
    users: TeamMember[];
    pautas: EditorialPauta[];
    financialEntries: FinancialEntry[];
    campaigns: AdvertisingCampaign[];
    outdoors: OutdoorPoint[];
    citizenReports: CitizenReport[];
    clientTasks: ClientServiceTask[];
    stateSnapshot?: unknown;
  }) =>
    apiRequest<{ ok: boolean; inserted?: Record<string, number>; message?: string }>('/sync/seed', {
      method: 'POST',
      body: {
        ...payload,
        contracts: payload.contracts.map(serializeContractPayload),
      },
      timeoutMs: 25000,
    }),
};

/* ============================================================================
 * 3. Notícias & Pautas (Portal FortNews + Redação)
 * ============================================================================ */
export const newsApi = {
  list: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/pautas');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizePauta) },
      };
    }
    return { ...res, data: undefined };
  },
  create: (pauta: EditorialPauta) =>
    apiRequest<{ item: EditorialPauta }>('/pautas', { method: 'POST', body: pauta }),
  update: (id: string, patch: Partial<EditorialPauta>) =>
    apiRequest<{ item?: EditorialPauta; ok?: boolean }>(`/pautas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  remove: (id: string) =>
    apiRequest<{ ok: boolean }>(`/pautas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 4. CRM (Leads, Contratos & Pipeline de Clientes)
 * ============================================================================ */
export const crmApi = {
  listLeads: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/clientes/leads');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeLead) },
      };
    }
    return { ...res, data: undefined };
  },
  createLead: (lead: CommercialLead, authenticated = false) =>
    apiRequest<{ item: CommercialLead }>('/clientes/leads', {
      method: 'POST',
      body: lead,
      skipAuth: !authenticated,
    }),
  updateLead: (id: string, patch: Partial<CommercialLead>) =>
    apiRequest<{ item?: CommercialLead; ok?: boolean }>(
      `/clientes/leads/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: patch,
      }
    ),
  deleteLead: (id: string) =>
    apiRequest<{ ok: boolean }>(`/clientes/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listContracts: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/clientes/contracts');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeContract) },
      };
    }
    return { ...res, data: undefined };
  },
  createContract: (contract: CommercialContract) =>
    apiRequest<{ item?: CommercialContract; ok?: boolean }>('/clientes/contracts', {
      method: 'POST',
      body: serializeContractPayload(contract),
    }),
  updateContract: (id: string, patch: Partial<CommercialContract> | { status: ContractStatus }) =>
    apiRequest<{ item?: CommercialContract; ok?: boolean }>(
      `/clientes/contracts/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: serializeContractPayload(patch),
      }
    ),
  deleteContract: (id: string) =>
    apiRequest<{ ok: boolean }>(`/clientes/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listTasks: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/clientes/tasks');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeClientTask) },
      };
    }
    return { ...res, data: undefined };
  },
  createTask: (task: ClientServiceTask) =>
    apiRequest<{ item?: ClientServiceTask; ok?: boolean }>('/clientes/tasks', {
      method: 'POST',
      body: task,
    }),
  updateTask: (id: string, patch: Partial<ClientServiceTask>) =>
    apiRequest<{ item?: ClientServiceTask; ok?: boolean }>(
      `/clientes/tasks/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: patch,
      }
    ),
  deleteTask: (id: string) =>
    apiRequest<{ ok: boolean }>(`/clientes/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

/* ============================================================================
 * 5. Financeiro de Agência (/api/financeiro)
 * ============================================================================ */
export const financeApi = {
  list: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/financeiro');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeFinancialEntry) },
      };
    }
    return { ...res, data: undefined };
  },
  create: (entry: FinancialEntry) =>
    apiRequest<{ item?: FinancialEntry; ok?: boolean }>('/financeiro', {
      method: 'POST',
      body: entry,
    }),
  update: (id: string, patch: Partial<FinancialEntry> | { status: FinancialPaymentStatus }) =>
    apiRequest<{ item?: FinancialEntry; ok?: boolean }>(`/financeiro/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  remove: (id: string) =>
    apiRequest<{ ok: boolean }>(`/financeiro/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 6. Campanhas de Publicidade & Inventário OOH (Outdoors)
 * ============================================================================ */
export const campaignsApi = {
  listCampaigns: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/campanhas');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeCampaign) },
      };
    }
    return { ...res, data: undefined };
  },
  createCampaign: (campaign: AdvertisingCampaign) =>
    apiRequest<{ item?: AdvertisingCampaign; ok?: boolean }>('/campanhas', {
      method: 'POST',
      body: campaign,
    }),
  updateCampaign: (
    id: string,
    patch: Partial<AdvertisingCampaign> | { status?: AdvertisingStatus; artworkStatus?: ArtworkStatus }
  ) =>
    apiRequest<{ item?: AdvertisingCampaign; ok?: boolean }>(
      `/campanhas/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: patch,
      }
    ),
  deleteCampaign: (id: string) =>
    apiRequest<{ ok: boolean }>(`/campanhas/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listOutdoors: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/outdoors');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeOutdoor) },
      };
    }
    return { ...res, data: undefined };
  },
  createOutdoor: (point: OutdoorPoint) =>
    apiRequest<{ item?: OutdoorPoint; ok?: boolean }>('/outdoors', {
      method: 'POST',
      body: point,
    }),
  updateOutdoor: (id: string, patch: Partial<OutdoorPoint>) =>
    apiRequest<{ item?: OutdoorPoint; ok?: boolean }>(`/outdoors/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  deleteOutdoor: (id: string) =>
    apiRequest<{ ok: boolean }>(`/outdoors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 7. Demandas Cidadãs (Canal Fala Cidadão)
 * ============================================================================ */
export const citizenApi = {
  list: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/demandas');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeCitizenReport) },
      };
    }
    return { ...res, data: undefined };
  },
  submit: (report: CitizenReport) =>
    apiRequest<{ item: CitizenReport }>('/demandas', {
      method: 'POST',
      body: report,
      skipAuth: true,
    }),
  update: (id: string, patch: Partial<CitizenReport>) =>
    apiRequest<{ item?: CitizenReport; ok?: boolean }>(`/demandas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  updateStatus: (id: string, status: CitizenStatus) =>
    apiRequest<{ item?: CitizenReport; ok?: boolean }>(`/demandas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { status },
    }),
  remove: (id: string) =>
    apiRequest<{ ok: boolean }>(`/demandas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 8. Usuários & Hierarquia
 * ============================================================================ */
export const usersApi = {
  list: async () => {
    const res = await apiRequest<{ items?: RawRow[] }>('/usuarios');
    if (res.ok && Array.isArray(res.data?.items)) {
      return {
        ...res,
        data: { items: res.data.items.map(normalizeTeamMember) },
      };
    }
    return { ...res, data: undefined };
  },
  create: (member: TeamMember) =>
    apiRequest<{ item?: TeamMember; ok?: boolean; id?: string }>('/usuarios', {
      method: 'POST',
      body: member,
    }),
  update: (id: string, patch: Partial<TeamMember>) =>
    apiRequest<{ item?: TeamMember; ok?: boolean }>(`/usuarios/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  remove: (id: string) =>
    apiRequest<{ ok: boolean }>(`/usuarios/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 9. Proxy Seguro de IA (/api/ai) & Configurações Públicas
 * ============================================================================ */
export interface AiScanPayload {
  territory?: string;
  region?: string;
  topics?: string;
  topic?: string;
  sourceHint?: string;
  count?: number;
}

export interface AiTickerPayload {
  territory?: string;
  region?: string;
  existingHeadlines?: string[];
  count?: number;
}

export interface AiThumbnailPayload {
  prompt?: string;
  programName?: string;
  guestName?: string;
  hostName?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '3:4' | '4:3';
}

export const aiApi = {
  scanNews: <T = Record<string, unknown>>(payload: AiScanPayload) =>
    apiRequest<T>('/ai', {
      method: 'POST',
      body: { action: 'scan-news', ...payload },
      timeoutMs: 35000,
    }),
  generateTicker: <T = Record<string, unknown>>(payload: AiTickerPayload) =>
    apiRequest<T>('/ai', {
      method: 'POST',
      body: { action: 'generate-ticker', ...payload },
      timeoutMs: 25000,
    }),
  generateThumbnail: <T = Record<string, unknown>>(payload: AiThumbnailPayload) =>
    apiRequest<T>('/ai', {
      method: 'POST',
      body: { action: 'generate-thumbnail', ...payload },
      timeoutMs: 45000,
    }),
};

export const configApi = {
  getPublicConfig: () =>
    apiRequest<{ mapsApiKey?: string; aiScannerReady?: boolean }>('/public-config', {
      timeoutMs: 5000,
      skipAuth: true,
    }),
};
