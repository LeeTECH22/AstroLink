import { useEffect, useState } from 'react'

type ApiErrorEvent = {
  message: string
  url?: string
  status?: number
}

export default function ErrorBanner() {
  const [error, setError] = useState<ApiErrorEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ApiErrorEvent>).detail
      setError(detail)
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => setError(null), 8000)
      return () => clearTimeout(timer)
    }
    window.addEventListener('api-error', handler as EventListener)
    return () => window.removeEventListener('api-error', handler as EventListener)
  }, [])

  if (!error) return null

  return (
    <div className="bg-red-50 border-b border-red-200 text-red-800">
      <div className="container mx-auto px-4 py-3 flex items-start gap-3">
        <span className="font-semibold">API Error</span>
        <div className="text-sm">
          <div>{error.message}</div>
          {error.status && (
            <div className="mt-1 opacity-70">Status: {error.status}{error.url ? ` · ${error.url}` : ''}</div>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
          <button
            className="px-3 py-1 rounded bg-slate-800 text-white hover:bg-slate-900"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}