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
  OutdoorPoint,
  TeamMember,
} from '../types/fortmidia';

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
export const API_BASE_URL = RAW_API_BASE.replace(/\/+$/, '') || '/api';

// In-memory Bearer token (never persisted in localStorage/sessionStorage for security)
let memoryAuthToken: string | null = null;

export function setApiAuthToken(token: string | null): void {
  memoryAuthToken = token && token.trim() ? token.trim() : null;
}

export function getApiAuthToken(): string | null {
  return memoryAuthToken;
}

export function clearApiAuthToken(): void {
  memoryAuthToken = null;
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
      return {
        ok: false,
        status: response.status,
        error:
          (typeof payload?.error === 'string' && payload.error) ||
          `Erro HTTP ${response.status} ao comunicar com a API.`,
        code: typeof payload?.code === 'string' ? payload.code : undefined,
        billingUrl: typeof payload?.billingUrl === 'string' ? payload.billingUrl : undefined,
        // 404 on /api/* in static preview means PHP backend is not mounted yet -> safe local fallback
        networkUnavailable: response.status === 404 || response.status === 502 || response.status === 503,
      };
    }

    if (!isJson && payload === null) {
      // Static server returned index.html instead of JSON -> backend not connected yet
      return {
        ok: false,
        status: response.status,
        networkUnavailable: true,
        error: 'API REST externa não detectada neste ambiente (usando fallback local).',
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
      networkUnavailable: true,
      error: 'Servidor de API indisponível no momento (modo fallback local ativo).',
    };
  } finally {
    window.clearTimeout(timer);
  }
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
 * 2. Sincronização de Estado & Bootstrap (Fallback transparente para localStorage)
 * ============================================================================ */
export const stateApi = {
  health: () => apiRequest<{ ok: boolean; service: string }>('/health', { timeoutMs: 4000 }),
  fetchSnapshot: <TState>() =>
    apiRequest<{ state?: Partial<TState>; updatedAt?: string }>('/state', { timeoutMs: 5000 }),
  saveSnapshot: (state: unknown) =>
    apiRequest<{ ok: boolean; updatedAt?: string }>('/state', {
      method: 'PUT',
      body: { state },
      timeoutMs: 8000,
    }),
};

/* ============================================================================
 * 3. Notícias & Pautas (Portal FortNews + Redação)
 * ============================================================================ */
export const newsApi = {
  list: () => apiRequest<{ items: EditorialPauta[] }>('/pautas'),
  create: (pauta: EditorialPauta) =>
    apiRequest<{ item: EditorialPauta }>('/pautas', { method: 'POST', body: pauta }),
  update: (id: string, patch: Partial<EditorialPauta>) =>
    apiRequest<{ item: EditorialPauta }>(`/pautas/${encodeURIComponent(id)}`, {
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
  listLeads: () => apiRequest<{ items: CommercialLead[] }>('/clientes/leads'),
  createLead: (lead: CommercialLead) =>
    apiRequest<{ item: CommercialLead }>('/clientes/leads', {
      method: 'POST',
      body: lead,
      skipAuth: true,
    }),
  updateLead: (id: string, patch: Partial<CommercialLead>) =>
    apiRequest<{ item: CommercialLead }>(`/clientes/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  deleteLead: (id: string) =>
    apiRequest<{ ok: boolean }>(`/clientes/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listContracts: () => apiRequest<{ items: CommercialContract[] }>('/clientes/contracts'),
  createContract: (contract: CommercialContract) =>
    apiRequest<{ item: CommercialContract }>('/clientes/contracts', {
      method: 'POST',
      body: contract,
    }),
  updateContract: (id: string, patch: Partial<CommercialContract> | { status: ContractStatus }) =>
    apiRequest<{ item: CommercialContract }>(`/clientes/contracts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  deleteContract: (id: string) =>
    apiRequest<{ ok: boolean }>(`/clientes/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listTasks: () => apiRequest<{ items: ClientServiceTask[] }>('/clientes/tasks'),
  upsertTask: (task: ClientServiceTask) =>
    apiRequest<{ item: ClientServiceTask }>('/clientes/tasks', {
      method: 'POST',
      body: task,
    }),
  deleteTask: (id: string) =>
    apiRequest<{ ok: boolean }>(`/clientes/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

/* ============================================================================
 * 5. Campanhas de Publicidade & Inventário OOH (Outdoors)
 * ============================================================================ */
export const campaignsApi = {
  listCampaigns: () => apiRequest<{ items: AdvertisingCampaign[] }>('/campanhas'),
  createCampaign: (campaign: AdvertisingCampaign) =>
    apiRequest<{ item: AdvertisingCampaign }>('/campanhas', { method: 'POST', body: campaign }),
  updateCampaign: (
    id: string,
    patch: Partial<AdvertisingCampaign> | { status?: AdvertisingStatus; artworkStatus?: ArtworkStatus }
  ) =>
    apiRequest<{ item: AdvertisingCampaign }>(`/campanhas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  deleteCampaign: (id: string) =>
    apiRequest<{ ok: boolean }>(`/campanhas/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listOutdoors: () => apiRequest<{ items: OutdoorPoint[] }>('/outdoors'),
  createOutdoor: (point: OutdoorPoint) =>
    apiRequest<{ item: OutdoorPoint }>('/outdoors', { method: 'POST', body: point }),
  updateOutdoor: (id: string, patch: Partial<OutdoorPoint>) =>
    apiRequest<{ item: OutdoorPoint }>(`/outdoors/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  deleteOutdoor: (id: string) =>
    apiRequest<{ ok: boolean }>(`/outdoors/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 6. Demandas Cidadãs (Canal Fala Cidadão)
 * ============================================================================ */
export const citizenApi = {
  list: () => apiRequest<{ items: CitizenReport[] }>('/demandas'),
  submit: (report: CitizenReport) =>
    apiRequest<{ item: CitizenReport }>('/demandas', {
      method: 'POST',
      body: report,
      skipAuth: true,
    }),
  updateStatus: (id: string, status: CitizenStatus) =>
    apiRequest<{ item: CitizenReport }>(`/demandas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { status },
    }),
  remove: (id: string) =>
    apiRequest<{ ok: boolean }>(`/demandas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 7. Usuários & Hierarquia
 * ============================================================================ */
export const usersApi = {
  list: () => apiRequest<{ items: TeamMember[] }>('/usuarios'),
  create: (member: TeamMember) =>
    apiRequest<{ item: TeamMember }>('/usuarios', { method: 'POST', body: member }),
  update: (id: string, patch: Partial<TeamMember>) =>
    apiRequest<{ item: TeamMember }>(`/usuarios/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: patch,
    }),
  remove: (id: string) =>
    apiRequest<{ ok: boolean }>(`/usuarios/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ============================================================================
 * 8. Proxy Seguro de IA (/api/ai) & Configurações Públicas
 *    Todas as chamadas de IA passam exclusivamente pelo backend (/api/ai).
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
