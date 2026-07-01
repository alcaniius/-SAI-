import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para agregar token y tenant
api.interceptors.request.use((config) => {
  const state = useAuthStore.getState();
  const token = state.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Use user's organizationId as tenant header (fix: was using user.id which is wrong)
  // Do NOT override if caller already set X-Tenant-ID (admin per-request override)
  if (!config.headers['X-Tenant-ID']) {
    const tenantId = state.user?.organizationId;
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
  }

  return config;
});

// Response interceptor para manejar refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no hemos reintentado ya
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const state = useAuthStore.getState();
        const refreshToken = state.refreshToken;

        if (!refreshToken) {
          state.logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        state.setAuth(state.user!, accessToken, refreshToken);

        // Reintentar request original
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ---- API Functions ----

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
  siteId?: string;
}

export function createUser(data: CreateUserPayload) {
  return api.post('/users', data);
}

export function fetchOrganizations() {
  return api.get('/users/organizations');
}

export function fetchSitesByOrg(orgId: string) {
  return api.get('/sites', { params: { organizationId: orgId } });
}

export function createSite(data: any) {
  return api.post('/sites', data);
}

export function updateSite(id: string, data: any) {
  return api.put(`/sites/${id}`, data);
}

export function deleteSite(id: string) {
  return api.delete(`/sites/${id}`);
}

export function fetchProfile() {
  return api.get('/users/me');
}

export function updateProfile(data: any) {
  return api.patch('/users/me', data);
}

export default api;
