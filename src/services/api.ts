import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

const DEFAULT_LIVE_API_URL = 'https://dse-monitor-backend.onrender.com/api';
const DEFAULT_LOCAL_API_URL = 'http://localhost:5000/api';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const configuredLocalApiUrl = import.meta.env.VITE_LOCAL_API_URL?.trim() || DEFAULT_LOCAL_API_URL;
const apiTarget = import.meta.env.VITE_API_TARGET?.trim().toLowerCase();

const RAW_BASE_URL =
  configuredApiUrl ||
  (apiTarget === 'local' ? configuredLocalApiUrl : DEFAULT_LIVE_API_URL);
const AUTH_TOKEN_KEY = 'dse_auth_token';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const BACKEND_BASE_URL = trimTrailingSlash(RAW_BASE_URL).replace(/\/api$/i, '');
const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

const getStoredToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY);

export const saveAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getAuthToken = () => getStoredToken();

export const getBackendBaseUrl = () => BACKEND_BASE_URL;

export interface NotificationSettings {
  websocketEnabled: boolean;
  telegramEnabled: boolean;
  portfolioVolumeAlertsEnabled: boolean;
  watchlistVolumeAlertsEnabled: boolean;
  fixedVolumeThreshold: number | null;
  relativeVolumeMultiplier: number;
  relativeVolumeLookbackDays: number;
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  telegramLinked: boolean;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
  notificationSettings: NotificationSettings;
}

export interface AuthOtpResponse {
  message: string;
  phoneNumber: string;
  expiresInSeconds: number;
  devOtp?: string;
}

export interface AuthVerifyResponse {
  token: string;
  user: AuthUser;
  websocket: {
    path: string;
    requiresTokenQuery: boolean;
  };
}

export interface AuthMeResponse {
  user: AuthUser;
  websocket: {
    path: string;
    requiresTokenQuery: boolean;
  };
}

export interface Stock {
  symbol: string;
  company: string;
  ltp: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  volume: number;
}

export type AlertType =
  | 'price_above'
  | 'price_below'
  | 'change_percent'
  | 'volume_above'
  | 'relative_volume_above';

export interface Alert {
  id: string;
  symbol: string;
  alertType: AlertType;
  threshold: number;
  lookbackDays?: number;
  cooldownSeconds?: number;
  isActive?: boolean;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  addedAt: string;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  notes?: string;
  currentPrice?: number;
  currentValue?: number;
  costBasis?: number;
  unrealizedPnL?: number;
  pnlPercentage?: number;
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StockLiveDataResponse {
  data: Stock[];
  alerts: Alert[];
  pagination: Pagination;
  cacheInfo?: {
    recordCount: number;
    lastFetched: string;
    ageSeconds: number;
  };
}

export interface MarketSentiment {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  validTotal?: number;
  skipped?: number;
  advanceDeclineRatio: string;
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  cacheInfo: { recordCount: number; lastFetched: string; ageSeconds: number };
}

export interface TopMovers {
  gainers: Stock[];
  losers: Stock[];
  cacheInfo: { recordCount: number; lastFetched: string; ageSeconds: number };
}

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface NotificationItem {
  id: string;
  userPhoneNumber: string;
  type: 'alert_triggered' | 'high_volume_trade' | 'relative_volume_trade' | 'entry_signal' | 'system';
  source: string;
  symbol?: string;
  title: string;
  message: string;
  status: NotificationStatus;
  payload: Record<string, unknown>;
  delivery: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface EntrySignal {
  symbol: string;
  sources: string[];
  score: number;
  confidence: 'low' | 'medium' | 'high';
  recommendation: 'avoid' | 'watch' | 'good_entry' | 'strong_entry';
  currentPrice: number;
  entryZone: {
    min: number;
    max: number;
  };
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  reasons: string[];
  cautions: string[];
  metrics: Record<string, unknown>;
}

export interface EntrySignalsResponse {
  generatedAt: string;
  data: EntrySignal[];
}

export interface VolumeContext {
  symbol: string;
  currentVolume: number;
  averageRecentVolume: number;
  recentDays: number;
}

export interface TelegramStatus {
  linked: boolean;
  telegramUsername: string | null;
  linkedAt: string | null;
  botUsername: string;
}

export interface TelegramLinkTokenResponse {
  linkToken: string;
  expiresAt: string;
  botUsername: string;
  deepLinkUrl: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => Promise.reject(error),
);

const normalizeResourceId = (value: Record<string, unknown>) => {
  const id = value.id ?? value._id;
  return typeof id === 'string' ? id : '';
};

const normalizeAlert = (raw: Record<string, unknown>): Alert => ({
  id: normalizeResourceId(raw),
  symbol: String(raw.symbol || ''),
  alertType: (raw.alertType as AlertType) || 'price_above',
  threshold: Number(raw.threshold || 0),
  lookbackDays: typeof raw.lookbackDays === 'number' ? raw.lookbackDays : undefined,
  cooldownSeconds: typeof raw.cooldownSeconds === 'number' ? raw.cooldownSeconds : undefined,
  isActive: typeof raw.isActive === 'boolean' ? raw.isActive : undefined,
});

const normalizeWatchlistItem = (raw: Record<string, unknown>): WatchlistItem => ({
  id: normalizeResourceId(raw),
  symbol: String(raw.symbol || ''),
  addedAt: String(raw.addedAt || new Date().toISOString()),
});

const normalizeHolding = (raw: Record<string, unknown>): PortfolioHolding => ({
  id: normalizeResourceId(raw),
  symbol: String(raw.symbol || ''),
  quantity: Number(raw.quantity || 0),
  buyPrice: Number(raw.buyPrice || 0),
  notes: typeof raw.notes === 'string' ? raw.notes : undefined,
  currentPrice: typeof raw.currentPrice === 'number' ? raw.currentPrice : undefined,
  currentValue: typeof raw.currentValue === 'number' ? raw.currentValue : undefined,
  costBasis: typeof raw.costBasis === 'number' ? raw.costBasis : undefined,
  unrealizedPnL: typeof raw.unrealizedPnL === 'number' ? raw.unrealizedPnL : undefined,
  pnlPercentage: typeof raw.pnlPercentage === 'number' ? raw.pnlPercentage : undefined,
});

const normalizeNotification = (raw: Record<string, unknown>): NotificationItem => ({
  id: normalizeResourceId(raw),
  userPhoneNumber: String(raw.userPhoneNumber || ''),
  type: (raw.type as NotificationItem['type']) || 'system',
  source: String(raw.source || 'system'),
  symbol: typeof raw.symbol === 'string' ? raw.symbol : undefined,
  title: String(raw.title || 'Notification'),
  message: String(raw.message || ''),
  status: (raw.status as NotificationStatus) || 'unread',
  payload: (raw.payload as Record<string, unknown>) || {},
  delivery: (raw.delivery as Record<string, unknown>) || {},
  createdAt: String(raw.createdAt || new Date().toISOString()),
  updatedAt: String(raw.updatedAt || new Date().toISOString()),
  readAt: typeof raw.readAt === 'string' ? raw.readAt : null,
});

export const getWebSocketUrl = (token: string, path = '/ws') => {
  const wsBase = BACKEND_BASE_URL.replace(/^http/i, 'ws');
  return `${wsBase}${path}?token=${encodeURIComponent(token)}`;
};

export const requestOtp = (phoneNumber: string) =>
  api.post<AuthOtpResponse>('/auth/request-otp', { phoneNumber });

export const verifyOtp = (phoneNumber: string, otp: string) =>
  api.post<AuthVerifyResponse>('/auth/verify-otp', { phoneNumber, otp });

export const getMe = () => api.get<AuthMeResponse>('/auth/me');

export const logout = () => api.post<{ message: string; disconnectedSockets: number }>('/auth/logout');

export const getStockLiveData = (page = 1, limit = 20) => {
  return api.get<StockLiveDataResponse>('/live', { params: { page, limit } });
};

export const getLiveStockBySymbol = (symbol: string) => {
  return api.get<Stock>(`/live/${encodeURIComponent(symbol)}`);
};

export const createAlert = (alertData: Omit<Alert, 'id'>) => {
  return api.post<Alert>('/alerts', alertData);
};

export const getAllAlerts = async (): Promise<Alert[]> => {
  const response = await api.get<Array<Record<string, unknown>>>('/alerts');
  return response.data.map(normalizeAlert);
};

export const getAlertsBySymbol = async (symbol: string): Promise<Alert[]> => {
  const response = await api.get<Array<Record<string, unknown>>>(`/alerts/symbol/${symbol}`);
  return response.data.map(normalizeAlert);
};

export const updateAlert = (id: string, updates: Partial<Alert>) => {
  return api.put<Alert>(`/alerts/${id}`, updates);
};

export const deleteAlert = (id: string) => {
  return api.delete(`/alerts/${id}`);
};

export const addToWatchlist = (symbol: string) => {
  return api.post<WatchlistItem>('/watchlist', { symbol });
};

export const getWatchlist = async (): Promise<WatchlistItem[]> => {
  const response = await api.get<Array<Record<string, unknown>>>('/watchlist');
  return response.data.map(normalizeWatchlistItem);
};

export const removeFromWatchlist = (symbol: string) => {
  return api.delete(`/watchlist/${symbol}`);
};

export const addToPortfolio = (symbol: string, quantity: number, buyPrice: number, notes = '') => {
  return api.post<PortfolioHolding>('/portfolio', { symbol, quantity, buyPrice, notes });
};

export const getPortfolio = async (): Promise<PortfolioHolding[]> => {
  const response = await api.get<Array<Record<string, unknown>>>('/portfolio');
  return response.data.map(normalizeHolding);
};

export const getPortfolioWithPnL = async (): Promise<PortfolioHolding[]> => {
  const response = await api.get<Array<Record<string, unknown>>>('/portfolio/with-pnl');
  return response.data.map(normalizeHolding);
};

export const updatePortfolioHolding = (id: string, quantity: number, buyPrice: number, notes = '') => {
  return api.put<PortfolioHolding>(`/portfolio/${id}`, { quantity, buyPrice, notes });
};

export const deletePortfolioHolding = (id: string) => {
  return api.delete(`/portfolio/${id}`);
};

export const getTopMovers = (limit = 10) => {
  return api.get<TopMovers>('/market/top-movers', { params: { limit } });
};

export const getAdvanceDecline = () => {
  return api.get<MarketSentiment>('/market/advance-decline');
};

export const searchStocks = (query: string) => {
  return api.get<Stock[]>('/search', { params: { q: query } });
};

export const getNotifications = async (params?: {
  status?: NotificationStatus;
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> => {
  const response = await api.get<NotificationsResponse>('/notifications', { params });
  return {
    data: response.data.data.map((item) => normalizeNotification(item as unknown as Record<string, unknown>)),
    pagination: response.data.pagination,
  };
};

export const getUnreadNotificationCount = () => api.get<{ unreadCount: number }>('/notifications/unread-count');

export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

export const deleteNotification = (id: string) => api.delete<{ message: string }>(`/notifications/${id}`);

export const deleteAllNotifications = () => api.delete<{ message: string; deletedCount: number }>('/notifications');

export const updateUserSettings = (payload: Partial<NotificationSettings>) =>
  api.patch<{ user: AuthUser }>('/me/settings', payload);

export const getTelegramStatus = () => api.get<TelegramStatus>('/telegram/status');

export const createTelegramLinkToken = () => api.post<TelegramLinkTokenResponse>('/telegram/link-token');

export const unlinkTelegram = () => api.delete<{ message: string }>('/telegram/link');

export const getEntrySignals = () => api.get<EntrySignalsResponse>('/insights/entry-signals');

export const getVolumeContext = (symbol: string) => api.get<VolumeContext>(`/insights/volume-context/${symbol}`);

export default api;
