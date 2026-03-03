import { apiClient } from './client'
import type { AuthRequest, AuthResponse } from '../types'

export const authApi = {
  login: async (credentials: AuthRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  register: async (credentials: AuthRequest & { username: string }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', credentials)
    return data
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}
