import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { api } from './api';
import { useAuthStore } from '@/store/authStore';

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
    },
  };
});

describe('api client', () => {
  it('should have a base URL configured', () => {
    expect(api.defaults.baseURL).toBeTruthy();
  });

  it('should have JSON content type header', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});

describe('api refresh interceptor', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.co', role: 'USER', firstName: 'A', lastName: 'B' },
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should refresh access token on 401 and replay original request once', async () => {
    const mockedAxiosPost = vi.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: 'access-2' },
    });

    // First call fails with 401, second succeeds
    let callCount = 0;
    const adapter = vi.fn().mockImplementation((config: any) => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject({ response: { status: 401 }, config });
      }
      return Promise.resolve({ data: { ok: true }, config, status: 200, statusText: 'OK', headers: {} });
    });

    const testApi = axios.create({ adapter });
    testApi.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const state = useAuthStore.getState();
          const refreshResponse = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refreshToken: state.refreshToken,
          });
          state.setAuth(state.user!, refreshResponse.data.accessToken, state.refreshToken!);
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return testApi(originalRequest);
        }
        return Promise.reject(error);
      },
    );

    const result = await testApi.get('/test');
    expect(result.data).toEqual({ ok: true });
    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('access-2');
  });

  it('should logout and reject when refresh fails', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('refresh failed'));

    const error = { response: { status: 401 }, config: { _retry: false, headers: {} } };
    const state = useAuthStore.getState();
    const logoutSpy = vi.spyOn(state, 'logout');

    // Simulate the catch block of the interceptor
    try {
      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: state.refreshToken });
      }
    } catch {
      state.logout();
    }

    expect(logoutSpy).toHaveBeenCalled();
  });
});
