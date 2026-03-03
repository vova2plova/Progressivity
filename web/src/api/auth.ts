import { apiClient } from './client'
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types'

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  register: async (credentials: RegisterRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', credentials)
    return data
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', {
      refresh_token: refreshToken,
    })
  },
}
