import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- JWT Interceptors ---
//
// The AuthProvider registers callbacks via `setupInterceptors` so the Axios
// client can attach the access token and trigger a silent refresh on 401.

type GetAccessTokenFn = () => string | null
type RefreshTokensFn = () => Promise<string | null>
type OnUnauthorizedFn = () => void

let getAccessToken: GetAccessTokenFn = () => null
let refreshTokens: RefreshTokensFn = async () => null
let onUnauthorized: OnUnauthorizedFn = () => {}

/**
 * Called once by the AuthProvider to wire up the token accessors.
 */
export function setupInterceptors(
  getToken: GetAccessTokenFn,
  refresh: RefreshTokensFn,
  onUnauth: OnUnauthorizedFn,
) {
  getAccessToken = getToken
  refreshTokens = refresh
  onUnauthorized = onUnauth
}

// Request interceptor: attach Authorization header.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: on 401, try a silent refresh once.
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string | null) => void
  reject: (err: unknown) => void
}> = []

function processQueue(token: string | null, error?: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only attempt refresh for 401 responses on requests that aren't the auth endpoints themselves.
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.startsWith('/auth/')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Another refresh is in progress — queue this request.
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const newToken = await refreshTokens()
      processQueue(newToken)

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      // Refresh failed — redirect to login.
      onUnauthorized()
      return Promise.reject(error)
    } catch (refreshError) {
      processQueue(null, refreshError)
      onUnauthorized()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
