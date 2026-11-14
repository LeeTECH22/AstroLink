import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Database from 'lucide-react/dist/esm/icons/database'
import Layers from 'lucide-react/dist/esm/icons/layers'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert'
import { nasaApi } from '../services/api'
import type { ProviderDataEnvelope, ProviderInfo, ProviderKind } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const kindStyles: Record<ProviderKind, { label: string; className: string }> = {
  reanalysis: { label: 'Reanalysis · gridded (not ground)', className: 'bg-amber-600/20 text-amber-200' },
  observation: { label: 'Observation · satellite-derived', className: 'bg-emerald-600/20 text-emerald-200' },
  event: { label: 'Event catalog', className: 'bg-rose-600/20 text-rose-200' },
  catalog: { label: 'Dataset catalog', className: 'bg-sky-600/20 text-sky-200' },
  imagery: { label: 'Imagery service', className: 'bg-violet-600/20 text-violet-200' },
}

// Sensible defaults per provider so the demo works out of the box (Faisalabad).
const defaultParamsFor = (id: string): Record<string, string> => {
  switch (id) {
    case 'power':
      return { latitude: '31.418', longitude: '73.079', temporal: 'monthly', start: '2023', end: '2024', parameters: 'T2M,PRECTOTCORR' }
    case 'eonet':
      return { status: 'open', limit: '15' }
    case 'firms':
      return { west: '72.5', south: '30.5', east: '74.5', north: '32.0', days: '1' }
    case 'earthdata':
      return { keyword: 'precipitation', page_size: '10' }
    default:
      return {}
  }
}

const formatJson = (value: unknown, max = 4000): string => {
  try {
    const text = JSON.stringify(value, null, 2)
    return text.length > max ? `${text.slice(0, max)}\n… (truncated)` : text
  } catch {
    return String(value)
  }
}

const DataExplorer = () => {
const catalogQuery = useQuery({
  queryKey: ['provider-catalog'],
  queryFn: () => nasaApi.getProviders(),
  select: (response) => response.data,
  staleTime: 60 * 1000,
 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [params, setParams] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ProviderDataEnvelope | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providers: ProviderInfo[] = useMemo(() => catalogQuery.data?.providers || [], [catalogQuery.data])
  const health = useMemo(() => catalogQuery.data?.health || [], [catalogQuery.data])
  const cache = catalogQuery.data?.cache

  const selected = useMemo(
    () => providers.find((provider) => provider.id === selectedId) || null,
    [providers, selectedId]
  )

  const selectProvider = (provider: ProviderInfo) => {
    setSelectedId(provider.id)
    setParams(defaultParamsFor(provider.id))
    setResult(null)
    setError(null)
  }

  const handleFetch = async () => {
    if (!selectedId) return
    setFetching(true)
    setError(null)
    setResult(null)
    try {
      const response = await nasaApi.getProviderData(selectedId, params)
      setResult(response.data)
    } catch (err: any) {
      const status = err?.response?.status
      const message = err?.response?.data?.error || err?.message || 'Request failed'
      setError(`${message}${status ? ` (HTTP ${status})` : ''}`)
    } finally {
      setFetching(false)
    }
  }

  if (catalogQuery.isError) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center card">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Provider catalog unavailable</h2>
        <p className="text-gray-300 text-sm mb-6">
          The unified data-provider catalog could not be loaded from the backend. This usually means the
          backend is unreachable or still starting up.
        </p>
        <button
          onClick={() => catalogQuery.refetch()}
          className="btn-primary inline-flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
     </div>
    )
  }

  if (catalogQuery.isLoading) return <LoadingSpinner text="Loading the unified data-provider catalog..." />

  const renderParamFields = () => {
    if (!selected) return null
    switch (selected.id) {
      case 'power':
        return (
          <>
            <Field label="Latitude" value={params.latitude || ''} onChange={(v) => setParams((p) => ({ ...p, latitude: v }))} />
            <Field label="Longitude" value={params.longitude || ''} onChange={(v) => setParams((p) => ({ ...p, longitude: v }))} />
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Temporal</label>
              <select
                value={params.temporal || 'monthly'}
                onChange={(e) => setParams((p) => ({ ...p, temporal: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="monthly">Monthly (start/end = YYYY)</option>
                <option value="daily">Daily (start/end = YYYYMMDD)</option>
              </select>
            </div>
            <Field label={params.temporal === 'daily' ? 'Start (YYYYMMDD)' : 'Start year'} value={params.start || ''} onChange={(v) => setParams((p) => ({ ...p, start: v }))} />
            <Field label={params.temporal === 'daily' ? 'End (YYYYMMDD)' : 'End year'} value={params.end || ''} onChange={(v) => setParams((p) => ({ ...p, end: v }))} />
            <Field label="Parameters (comma separated)" value={params.parameters || ''} onChange={(v) => setParams((p) => ({ ...p, parameters: v }))} />
          </>
        )
      case 'eonet':
        return (
          <>
            <Field label="Status" value={params.status || ''} onChange={(v) => setParams((p) => ({ ...p, status: v }))} />
            <Field label="Limit (1–100)" value={params.limit || ''} onChange={(v) => setParams((p) => ({ ...p, limit: v }))} />
            <Field label="Category (optional)" value={params.category || ''} onChange={(v) => setParams((p) => ({ ...p, category: v }))} />
          </>
        )
      case 'firms':
        return (
          <>
            <Field label="West" value={params.west || ''} onChange={(v) => setParams((p) => ({ ...p, west: v }))} />
            <Field label="South" value={params.south || ''} onChange={(v) => setParams((p) => ({ ...p, south: v }))} />
            <Field label="East" value={params.east || ''} onChange={(v) => setParams((p) => ({ ...p, east: v }))} />
            <Field label="North" value={params.north || ''} onChange={(v) => setParams((p) => ({ ...p, north: v }))} />
            <Field label="Days (1–5)" value={params.days || ''} onChange={(v) => setParams((p) => ({ ...p, days: v }))} />
          </>
        )
      case 'earthdata':
        return (
          <>
            <Field label="Keyword" value={params.keyword || ''} onChange={(v) => setParams((p) => ({ ...p, keyword: v }))} />
            <Field label="Page size (1–100)" value={params.page_size || ''} onChange={(v) => setParams((p) => ({ ...p, page_size: v }))} />
          </>
        )
      default:
        return <p className="text-gray-400 text-sm">This provider takes no parameters.</p>
    }
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Layers className="h-8 w-8 text-sky-400" />
          <h1 className="text-4xl font-bold text-white">Multi-source Data Explorer</h1>
        </div>
        <p className="text-gray-200 max-w-3xl mx-auto">
          One unified provider layer for every AstroLink Earth-science source. Each response preserves its original
          dataset identity and is labelled as observation, model output or catalog - never silently substituted.
        </p>
      </motion.div>

      {cache && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Providers" value={String(providers.length)} />
          <MetricCard label="Cache entries" value={String(cache.entries)} />
          <MetricCard label="Cache hits" value={String(cache.hits)} />
          <MetricCard label="Cache hit rate" value={`${Math.round(cache.hitRate * 100)}%`} />
        </div>
      )}

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {providers.map((provider) => {
          const providerHealth = health.find((h) => h.id === provider.id)
          const kind = kindStyles[provider.kind]
          return (
            <motion.button
              key={provider.id}
              type="button"
              onClick={() => selectProvider(provider)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card text-left transition-all ${
                selectedId === provider.id ? 'ring-2 ring-sky-500' : 'hover:ring-1 hover:ring-sky-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{provider.label}</h3>
                  <p className="text-xs text-gray-400 mt-1">{provider.dataset}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${kind.className}`}>{kind.label}</span>
              </div>
              <div className="mt-4 space-y-1 text-xs text-gray-300">
                <div>Temporal: {provider.temporalResolution}</div>
                <div>Spatial: {provider.spatialResolution}</div>
                <div className="flex items-center space-x-1">
                  {provider.requiresKey ? (
                    provider.configured ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Key configured on backend</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                        <span>Requires a backend key (not set)</span>
                      </>
                    )
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span>No key required</span>
                    </>
                  )}
                </div>
                {providerHealth && (
                  <div>
                    Circuit: <span className="text-gray-200">{providerHealth.circuit.state}</span> · requests{' '}
                    {providerHealth.metrics.requests} · failures {providerHealth.metrics.failures}
                  </div>
                )}
              </div>
              {provider.variables.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {provider.variables.map((variable) => (
                    <span key={variable.id} className="text-[10px] px-2 py-0.5 rounded bg-gray-700/50 text-gray-200">
                      {variable.id} ({variable.units})
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[11px] text-gray-400">{provider.notes}</p>
            </motion.button>
          )
        })}
      </div>

      {/* Fetch panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-5 w-5 text-sky-400" />
            <h3 className="text-xl font-semibold text-white">Query {selected.label}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{renderParamFields()}</div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleFetch}
              disabled={fetching || (selected.requiresKey && !selected.configured)}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
              <span>{fetching ? 'Fetching...' : 'Fetch through provider layer'}</span>
            </button>
            {selected.requiresKey && !selected.configured && (
              <span className="text-xs text-amber-300">This provider is disabled until its backend key is configured.</span>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-100 text-sm flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row label="Provider" value={result.label} />
                <Row label="Dataset" value={result.dataset} />
                <Row label="Kind" value={kindStyles[result.kind]?.label || result.kind} />
                <Row label="Temporal resolution" value={result.temporalResolution} />
                <Row label="Spatial resolution" value={result.spatialResolution} />
                <Row label="Latency" value={`${result.latencyMs} ms`} />
                <Row label="Cached" value={result.cached ? 'Yes (TTL cache)' : 'No (fresh)'} />
                <Row label="Fetched at" value={new Date(result.fetchedAt).toLocaleString()} />
                <Row label="Source URL" value={result.sourceUrl} />
              </div>
              <p className="text-xs text-gray-400">{result.notes}</p>
              <div>
                <div className="text-xs text-gray-400 mb-2">Normalized response preview (source identity preserved)</div>
                <pre className="max-h-80 overflow-auto rounded-xl bg-black/40 border border-gray-700/60 p-4 text-[11px] text-gray-200">
                  {formatJson(result.data)}
                </pre>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="block text-sm font-medium text-gray-200 mb-2">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-sky-500"
    />
  </div>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 py-1 border-b border-gray-700/40">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-100 text-right break-all">{value}</span>
  </div>
)

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="card text-center">
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-gray-300 text-sm mt-1">{label}</div>
  </div>
)

export default DataExplorer
