import { createContext, useContext } from 'react'
import type { AuthUser, LoginRequest, RegisterRequest } from '../types'

export interface AuthContextValue {
  /** Current authenticated user or null. */
  user: AuthUser | null
  /** Access token (or null). Consumed by the API client interceptor. */
  accessToken: string | null
  /** Whether auth state is being initialised (e.g. refresh on mount). */
  isLoading: boolean
  /** Login with email + password. */
  login: (req: LoginRequest) => Promise<void>
  /** Register a new user. */
  register: (req: RegisterRequest) => Promise<void>
  /** Logout the current user. */
  logout: () => Promise<void>
  /** Attempt to silently refresh the tokens. Used by the API client interceptor on 401. */
  refreshTokens: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
