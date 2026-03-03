import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser, LoginRequest, RegisterRequest } from '../types'
import { authApi } from '../api/auth'
import { setupInterceptors } from '../api/client'
import { AuthContext } from '../hooks/useAuth'

// --- Token Storage ---

const ACCESS_TOKEN_KEY = 'progressivity_access_token'
const REFRESH_TOKEN_KEY = 'progressivity_refresh_token'
const AUTH_USER_KEY = 'progressivity_auth_user'

function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

function storeUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

function clearStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

// --- JWT Parsing ---

/** Decode JWT payload without verification (we trust the server). */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function extractUserIdFromToken(token: string): string | null {
  const payload = parseJwtPayload(token)
  if (!payload) return null
  return (payload.user_id as string) ?? null
}

/** Returns seconds until token expires, or 0 if already expired / unparseable. */
function getTokenExpiresIn(token: string): number {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return 0
  return Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
}

// --- Provider ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken)
  const [isLoading, setIsLoading] = useState(true)

  // Guard against concurrent refresh requests.
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null)

  // Timer for proactive refresh.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Helpers ---

  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const expiresIn = getTokenExpiresIn(token)
    // Refresh 60 seconds before expiry (minimum 10 s from now).
    const delay = Math.max((expiresIn - 60) * 1000, 10_000)
    refreshTimerRef.current = setTimeout(() => {
      // Trigger silent refresh.
      void doRefresh()
    }, delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyTokens = useCallback(
    (at: string, rt: string, userInfo: AuthUser) => {
      storeTokens(at, rt)
      storeUser(userInfo)
      setAccessToken(at)
      setUser(userInfo)
      scheduleRefresh(at)
    },
    [scheduleRefresh],
  )

  const clearAuth = useCallback(() => {
    clearStorage()
    setAccessToken(null)
    setUser(null)
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
  }, [])

  // --- Core Auth Operations ---

  const doRefresh = useCallback(async (): Promise<string | null> => {
    // Deduplicate concurrent refresh calls.
    if (refreshPromiseRef.current) return refreshPromiseRef.current

    const rt = getStoredRefreshToken()
    if (!rt) {
      clearAuth()
      return null
    }

    const promise = (async () => {
      try {
        const res = await authApi.refresh(rt)
        const userId = extractUserIdFromToken(res.access_token)
        const currentUser = getStoredUser()
        const userInfo: AuthUser = {
          id: userId ?? currentUser?.id ?? '',
          email: currentUser?.email ?? '',
          username: currentUser?.username ?? '',
        }
        applyTokens(res.access_token, res.refresh_token, userInfo)
        return res.access_token
      } catch {
        clearAuth()
        return null
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    refreshPromiseRef.current = promise
    return promise
  }, [applyTokens, clearAuth])

  const login = useCallback(
    async (req: LoginRequest) => {
      const res = await authApi.login(req)
      const userId = extractUserIdFromToken(res.access_token)
      const userInfo: AuthUser = {
        id: userId ?? '',
        email: req.email,
        username: '', // Backend login doesn't return username; stored user data preserved on refresh
      }
      applyTokens(res.access_token, res.refresh_token, userInfo)
    },
    [applyTokens],
  )

  const register = useCallback(
    async (req: RegisterRequest) => {
      const res = await authApi.register(req)
      const userId = extractUserIdFromToken(res.access_token)
      const userInfo: AuthUser = {
        id: userId ?? '',
        email: req.email,
        username: req.username,
      }
      applyTokens(res.access_token, res.refresh_token, userInfo)
    },
    [applyTokens],
  )

  const logout = useCallback(async () => {
    const rt = getStoredRefreshToken()
    clearAuth()
    if (rt) {
      try {
        await authApi.logout(rt)
      } catch {
        // Ignore errors - tokens are already cleared locally.
      }
    }
  }, [clearAuth])

  // --- Initialisation: try to refresh on mount ---

  useEffect(() => {
    const init = async () => {
      const storedAt = getStoredAccessToken()
      const storedRt = getStoredRefreshToken()

      if (!storedAt || !storedRt) {
        clearAuth()
        setIsLoading(false)
        return
      }

      // Check if access token is still valid (>60 s remaining).
      const expiresIn = getTokenExpiresIn(storedAt)
      if (expiresIn > 60) {
        scheduleRefresh(storedAt)
        setIsLoading(false)
        return
      }

      // Token expired or nearly expired - try refresh.
      await doRefresh()
      setIsLoading(false)
    }

    void init()

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Wire up API client interceptors ---

  useEffect(() => {
    setupInterceptors(
      () => getStoredAccessToken(),
      doRefresh,
      () => {
        clearAuth()
        navigate('/login')
      },
    )
  }, [doRefresh, clearAuth, navigate])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        register,
        logout,
        refreshTokens: doRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
