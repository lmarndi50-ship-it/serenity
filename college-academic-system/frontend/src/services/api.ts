import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiEnvelope } from '@/types';

const ACCESS_TOKEN_KEY = 'cams.accessToken';
const REFRESH_TOKEN_KEY = 'cams.refreshToken';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Called when refreshing fails, so the app can drop back to the login screen. */
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

// A single in-flight refresh shared by every queued request.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.refresh;
  const response = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
    `${api.defaults.baseURL}/auth/refresh`,
    refreshToken ? { refreshToken } : {},
    { withCredentials: true },
  );
  const { accessToken, refreshToken: rotated } = response.data.data;
  tokenStore.set(accessToken, rotated);
  return accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;

    const isAuthCall = original?.url?.includes('/auth/');
    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        refreshPromise = null;
        tokenStore.clear();
        onAuthFailure?.();
      }
    }

    return Promise.reject(error);
  },
);

/** Unwraps the `{ success, data }` envelope every endpoint returns. */
export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<ApiEnvelope<T>>(url, { params });
  return response.data.data;
}

export async function getWithMeta<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }> {
  const response = await api.get<ApiEnvelope<T>>(url, { params });
  return { data: response.data.data, meta: response.data.meta };
}

export async function postData<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.post<ApiEnvelope<T>>(url, body);
  return response.data.data;
}

export async function putData<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.put<ApiEnvelope<T>>(url, body);
  return response.data.data;
}

export async function patchData<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.patch<ApiEnvelope<T>>(url, body);
  return response.data.data;
}

export async function deleteData<T>(url: string): Promise<T> {
  const response = await api.delete<ApiEnvelope<T>>(url);
  return response.data.data;
}

/** Reads the server's friendly message out of an Axios error. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string> } | undefined;
    if (data?.errors) {
      const first = Object.values(data.errors)[0];
      if (first) return first;
    }
    if (data?.message) return data.message;
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (!error.response) return 'Cannot reach the server. Is the API running?';
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Downloads a report and hands it to the browser as a file. */
export async function downloadFile(
  url: string,
  params: Record<string, unknown>,
  filename: string,
): Promise<void> {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
