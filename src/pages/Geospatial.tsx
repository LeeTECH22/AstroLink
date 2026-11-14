import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import MapIcon from 'lucide-react/dist/esm/icons/map'
import Layers from 'lucide-react/dist/esm/icons/layers'
import Flame from 'lucide-react/dist/esm/icons/flame'
import Activity from 'lucide-react/dist/esm/icons/activity'
import MapPin from 'lucide-react/dist/esm/icons/map-pin'
import Info from 'lucide-react/dist/esm/icons/info'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Database from 'lucide-react/dist/esm/icons/database'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { nasaApi } from '../services/api'
import { analyzeTrend, buildMonthlySeries } from '../utils/trendStats'
import type { EONETResponse, NaturalEvent, ProviderDataEnvelope } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

// Fix the default marker asset path used by react-leaflet (mirrors other map pages).
delete (L.Icon.Default.prototype as any)._getIconUrl

const DEFAULT_LATITUDE = '31.418'
const DEFAULT_LONGITUDE = '73.079'

// Colour palette keyed by EONET category id so the legend is meaningful.
const CATEGORY_COLORS: Record<string, string> = {
  wildfires: '#f97316',
  severeStorms: '#38bdf8',
  volcanoes: '#ef4444',
  floods: '#3b82f6',
  drought: '#eab308',
  dustHaze: '#a3a3a3',
  earthquakes: '#a855f7',
  landslides: '#84cc16',
  seaLakeIce: '#67e8f9',
  snow: '#e0f2fe',
  temperatureExtremes: '#fb7185',
  waterColor: '#14b8a6',
}
const categoryColor = (id: string): string => CATEGORY_COLORS[id] || '#94a3b8'

const formatNumber = (value: number, digits = 3): string =>
  Number.isFinite(value) ? value.toFixed(digits) : 'N/A'

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

type FirmsRow = Record<string, string>
type EonetEnvelope = ProviderDataEnvelope<EONETResponse>
type FirmsEnvelope = ProviderDataEnvelope<FirmsRow[]>

const latestGeometry = (event: NaturalEvent) =>
  event.geometry && event.geometry.length ? event.geometry[event.geometry.length - 1] : null

// Click handler: report the picked coordinates back to the parent page.
const MapClickHandler = ({ onPick }: { onPick: (lat: string, lon: string) => void }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat.toFixed(4), e.latlng.lng.toFixed(4))
    },
  })
  return null
}

// Keeps the viewport in sync when the selection changes programmatically.
const MapRecenter = ({ latitude, longitude }: { latitude: string; longitude: string }) => {
  const map = useMap()
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    map.setView([lat, lon], Math.max(map.getZoom(), 5))
  }
  return null
}

const Geospatial = () => {
  const [latitude, setLatitude] = useState(DEFAULT_LATITUDE)
  const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE)
  const [showEvents, setShowEvents] = useState(true)
  const [showFires, setShowFires] = useState(false)
  const [firmsDays, setFirmsDays] = useState(2)
  const [trendRun, setTrendRun] = useState(0)

  const catalogQuery = useQuery({
    queryKey: ['provider-catalog'],
    queryFn: () => nasaApi.getProviders()
  })
  const providers = useMemo(() => catalogQuery.data?.data.providers || [], [catalogQuery.data])
  const firmsProvider = providers.find((provider) => provider.id === 'firms')
  const firmsConfigured = Boolean(firmsProvider?.configured)

  // Bounding box around the selected location, used for FIRMS active-fire queries.
  const bbox = useMemo(() => {
    const lat = Number(latitude)
    const lon = Number(longitude)
    return {
      west: clamp(lon - 2, -180, 180).toFixed(3),
      east: clamp(lon + 2, -180, 180).toFixed(3),
      south: clamp(lat - 2, -90, 90).toFixed(3),
      north: clamp(lat + 2, -90, 90).toFixed(3),
    }
  }, [latitude, longitude])

  const eventsQuery = useQuery({
    queryKey: ['geospatial-eonet'],
    queryFn: () => nasaApi.getProviderData<EONETResponse>('eonet', { status: 'open', limit: 50 }).then((r) => r.data),
    enabled: showEvents,
    staleTime: 3 * 60 * 1000
  })

  const firesQuery = useQuery({
    queryKey: ['geospatial-firms', bbox.west, bbox.south, bbox.east, bbox.north, firmsDays],

    queryFn: () =>
      nasaApi.getProviderData<FirmsRow[]>('firms', { ...bbox, days: firmsDays }).then((r) => r.data),

    enabled: showFires && firmsConfigured,
    staleTime: 3 * 60 * 1000
  })

  const trendQuery = useQuery({
    queryKey: ['geospatial-trend', latitude, longitude, trendRun],
    queryFn: () => nasaApi.getPowerTrend(latitude, longitude, '2015', '2024', 'T2M'),
    enabled: trendRun > 0
  })

  const trend = useMemo(() => {
    const response = trendQuery.data?.data
    if (!response?.properties?.parameter?.T2M) return null
    const series = buildMonthlySeries(response.properties.parameter.T2M, 2015, 2024)
    if (!series.observations.length) return null
    return analyzeTrend('T2M', series)
  }, [trendQuery.data])

  const events = eventsQuery.data?.data?.events || []
  const fires = Array.isArray(firesQuery.data?.data) ? (firesQuery.data!.data as FirmsRow[]) : []

  const centerLat = Number(latitude)
  const centerLon = Number(longitude)

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <MapIcon className="h-10 w-10 text-blue-400" />
          <h1 className="text-4xl font-bold text-white">Interactive Geospatial Explorer</h1>
        </div>
        <p className="text-lg text-gray-300 max-w-4xl mx-auto">
          Explore real NASA Earth-observation layers on an interactive map. Select any location to
          run a gridded climate trend, overlay curated natural events, and query satellite active-fire
          detections. Every layer is backed by a live NASA source.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Layers className="h-5 w-5 text-cyan-400" />
              <span>Map layers</span>
            </h2>
            <span className="text-xs text-gray-400">Click anywhere to select a location</span>
          </div>
          <div className="h-[520px] rounded-xl overflow-hidden border border-gray-700/60">
            <MapContainer
              center={[centerLat, centerLon]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapClickHandler onPick={(lat, lon) => { setLatitude(lat); setLongitude(lon) }} />
              <MapRecenter latitude={latitude} longitude={longitude} />

              {/* Selected location marker */}
              <Marker position={[centerLat, centerLon]}>
                <Popup>
                  <div className="text-sm">
                    <strong>Selected location</strong>
                    <br />
                    {centerLat.toFixed(3)}, {centerLon.toFixed(3)}
                  </div>
                </Popup>
              </Marker>

              {/* EONET natural events */}
              {showEvents &&
                events.map((event) => {
                  const geometry = latestGeometry(event)
                  if (!geometry || geometry.type !== 'Point') return null
                  const [lon, lat] = geometry.coordinates
                  const categoryId = event.categories?.[0]?.id || 'unknown'
                  const color = categoryColor(categoryId)
                  return (
                    <CircleMarker
                      key={event.id}
                      center={[lat, lon]}
                      radius={6}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 1 }}
                    >
                      <Popup>
                        <div className="text-sm max-w-[240px]">
                          <strong>{event.title}</strong>
                          <br />
                          <span className="text-xs">
                            {event.categories?.map((c) => c.title).join(', ') || 'Uncategorised'}
                          </span>
                          <br />
                          <span className="text-xs">Observed: {new Date(geometry.date).toLocaleDateString()}</span>
                          {event.sources?.[0]?.url && (
                            <>
                              <br />
                              <a href={event.sources[0].url} target="_blank" rel="noreferrer" className="text-xs text-blue-600">
                                Source: {event.sources[0].id}
                              </a>
                            </>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                })}

              {/* FIRMS active-fire detections */}
              {showFires &&
                fires.map((fire, index) => {
                  const lat = Number(fire.latitude)
                  const lon = Number(fire.longitude)
                  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
                  return (
                    <CircleMarker
                      key={`${fire.latitude}-${fire.longitude}-${index}`}
                      center={[lat, lon]}
                      radius={4}
                      pathOptions={{ color: '#f97316', fillColor: '#fb923c', fillOpacity: 0.8, weight: 1 }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <strong>Active-fire detection</strong>
                          <br />
                          <span className="text-xs">
                            {fire.acq_date} {fire.acq_time} · confidence {fire.confidence}
                          </span>
                          <br />
                          <span className="text-xs">Brightness: {fire.bright_ti4 || fire.brightness} K</span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                })}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-300">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#94a3b8' }} /> Selection
            </span>
            {showEvents &&
              Object.entries(CATEGORY_COLORS).map(([id, color]) => (
                <span key={id} className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} /> {id}
                </span>
              ))}
            {showFires && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#f97316' }} /> FIRMS fire
              </span>
            )}
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-emerald-400" />
              <span>Location</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-300">
                Latitude
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-gray-700 px-3 py-2 text-white text-sm"
                />
              </label>
              <label className="text-sm text-gray-300">
                Longitude
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-black/40 border border-gray-700 px-3 py-2 text-white text-sm"
                />
              </label>
            </div>
            <button
              onClick={() => setTrendRun((value) => value + 1)}
              className="mt-4 w-full flex items-center justify-center space-x-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Analyse this location</span>
            </button>

            {trendQuery.isLoading ? (
              <div className="mt-4">
                <LoadingSpinner />
              </div>
            ) : null}

            {trendQuery.isError ? (
              <p className="mt-4 text-xs text-amber-300">
                Climate trend unavailable for this point right now (upstream NASA POWER request failed). Other layers
                remain usable.
              </p>
            ) : null}

            {trend ? (
              <div className="mt-4 space-y-1 text-sm text-gray-300">
                <div className="text-xs text-gray-400">T2M · 2015–2024 · NASA POWER (gridded / model-derived)</div>
                <div className="flex justify-between">
                  <span>Trend</span>
                  <span className="text-white">
                    {trend.direction} ({formatNumber((trend.regression?.slope ?? 0) * 120, 3)} °C/decade)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mann-Kendall p</span>
                  <span className="text-white">
                    {trend.mannKendall
                      ? trend.mannKendall.pValue < 0.0001
                        ? '< 0.0001'
                        : formatNumber(trend.mannKendall.pValue, 4)
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Valid observations</span>
                  <span className="text-white">{trend.validCount}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Layers className="h-5 w-5 text-cyan-400" />
              <span>Layers</span>
            </h3>
            <label className="flex items-center justify-between text-sm text-gray-300 py-2">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-400" /> Natural events (EONET)
              </span>
              <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} className="h-4 w-4" />
            </label>
            <label className="flex items-center justify-between text-sm text-gray-300 py-2">
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" /> Active fires (FIRMS)
              </span>
              <input
                type="checkbox"
                checked={showFires}
                disabled={!firmsConfigured}
                onChange={(e) => setShowFires(e.target.checked)}
                className="h-4 w-4 disabled:opacity-40"
              />
            </label>
            {!firmsConfigured && (
              <p className="text-xs text-gray-500 mt-1">
                FIRMS requires a server-side <code>FIRMS_MAP_KEY</code>. The layer is hidden until configured.
              </p>
            )}
            <label className="block text-sm text-gray-300 mt-3">
              Fire detection window: last {firmsDays} day{firmsDays > 1 ? 's' : ''}
              <input
                type="range"
                min={1}
                max={5}
                value={firmsDays}
                onChange={(e) => setFirmsDays(Number(e.target.value))}
                className="w-full mt-2"
                disabled={!firmsConfigured}
              />
            </label>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <Info className="h-5 w-5 text-amber-400" />
              <span>Sources &amp; data quality</span>
            </h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>
                <Database className="inline h-3 w-3 mr-1" />
                <strong className="text-gray-300">EONET</strong> — curated natural-event catalog. Records a report or
                detection, not a ground measurement.
              </p>
              <p>
                <Database className="inline h-3 w-3 mr-1" />
                <strong className="text-gray-300">FIRMS</strong> — satellite thermal-anomaly detections. A detection is
                not a confirmed ground fire; consult the confidence field.
              </p>
              <p>
                <Database className="inline h-3 w-3 mr-1" />
                <strong className="text-gray-300">POWER</strong> — gridded reanalysis (MERRA-2 based), not direct ground
                station measurements.
              </p>
              {showEvents && eventsQuery.data ? (
                <p className="pt-2 border-t border-gray-700/60">
                  EONET: {events.length} events · fetched {new Date(eventsQuery.data.fetchedAt).toLocaleTimeString()}
                  {eventsQuery.data.cached ? ' (cached)' : ' (fresh)'}
                </p>
              ) : null}
              {showFires && firmsConfigured && firesQuery.data ? (
                <p>
                  FIRMS: {fires.length} detections · fetched {new Date(firesQuery.data.fetchedAt).toLocaleTimeString()}
                  {firesQuery.data.cached ? ' (cached)' : ' (fresh)'}
                </p>
              ) : null}
            </div>
            {eventsQuery.isError || (showFires && firesQuery.isError) ? (
              <p className="mt-3 flex items-start gap-1 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                One or more layers could not be refreshed. Retry by toggling the layer.
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Geospatial
