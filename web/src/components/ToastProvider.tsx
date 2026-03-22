import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'

type ToastTone = 'success' | 'error'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  showSuccessToast: (title: string, description?: string) => void
  showErrorToast: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000)
      setToasts((current) => [...current, { id, title, description, tone }])
      window.setTimeout(() => dismissToast(id), 4000)
    },
    [dismissToast],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccessToast: (title, description) => pushToast('success', title, description),
      showErrorToast: (title, description) => pushToast('error', title, description),
    }),
    [pushToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
              toast.tone === 'success'
                ? 'border-emerald-200 bg-white text-emerald-950'
                : 'border-rose-200 bg-white text-rose-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.tone === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 h-5 w-5 text-rose-600" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{toast.title}</div>
                {toast.description && <div className="mt-1 text-sm opacity-80">{toast.description}</div>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
