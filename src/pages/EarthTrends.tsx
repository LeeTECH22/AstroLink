import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import Minus from 'lucide-react/dist/esm/icons/minus'
import Activity from 'lucide-react/dist/esm/icons/activity'
import Database from 'lucide-react/dist/esm/icons/database'
import MapPin from 'lucide-react/dist/esm/icons/map-pin'
import Map from 'lucide-react/dist/esm/icons/map'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Info from 'lucide-react/dist/esm/icons/info'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import GitCompare from 'lucide-react/dist/esm/icons/git-compare'
import Layers from 'lucide-react/dist/esm/icons/layers'
import LineChart from 'lucide-react/dist/esm/icons/line-chart'
import { Line, Bar } from 'react-chartjs-2'
import type { ChartData } from 'chart.js'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { nasaApi } from '../services/api'
import { defaultChartOptions } from '../utils/chartHelpers'
import {
  analyzeTrend,
  backtestForecast,
  buildAnnualSeries,
  buildMonthlySeries,
  completenessStats,
  detectAnomalies,
  detectOutliers,
  getVariableMeta,
  linearForecast,
  linearRegression,
  seasonalAnalysis,
  seasonalDriftForecast,
  TREND_VARIABLES,
} from '../utils/trendStats'
import type { PowerDataResponse, TrendVariableId } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend
)

// Fix for default markers in react-leaflet (mirrors the existing map pages).
delete (L.Icon.Default.prototype as any)._getIconUrl

// Default demonstration location: Faisalabad, Pakistan.
const DEFAULT_LATITUDE = '31.418'
const DEFAULT_LONGITUDE = '73.079'
const DEFAULT_START_YEAR = '2015'
const DEFAULT_END_YEAR = '2024'
const PARAMETERS = TREND_VARIABLES.map((variable) => variable.id).join(',')

const formatNumber = (value: number, digits = 3): string =>
  Number.isFinite(value) ? value.toFixed(digits) : 'N/A'

const formatPValue = (value: number): string => {
  if (!Number.isFinite(value)) return 'N/A'
  if (value < 0.0001) return '< 0.0001'
  return value.toFixed(4)
}

const formatSigned = (value: number, digits = 3): string =>
  Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(digits)}` : 'N/A'

// Shared Chart.js options for the aggregation/seasonality/comparison charts,
// kept consistent with the primary time-series chart.
const buildChartOptions = (title: string, yAxisTitle: string, xAxisTitle: string) => ({
  ...defaultChartOptions,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    ...defaultChartOptions.plugins,
    title: {
      display: true,
      text: title,
      color: 'white',
      font: { size: 16 },
    },
  },
  scales: {
    x: {
      ...defaultChartOptions.scales.x,
      ticks: { ...defaultChartOptions.scales.x.ticks, maxRotation: 0, autoSkip: true },
      title: { display: true, text: xAxisTitle, color: 'white' },
    },
    y: {
      ...defaultChartOptions.scales.y,
      title: { display: true, text: yAxisTitle, color: 'white' },
    },
  },
})

interface StatCardProps {
  icon: typeof Activity
  iconClass: string
  label: string
  value: string
  hint?: string
}

// --- Interactive geospatial picker (leaflet) ---------------------------------
// Clicking the map selects a grid point; the picker also recentres when the
// coordinates are changed through the numeric inputs.
const MapClickHandler = ({ onPick }: { onPick: (lat: number, lon: number) => void }) => {
  useMapEvents({
    click(event) {
      onPick(Number(event.latlng.lat.toFixed(3)), Number(event.latlng.lng.toFixed(3)))
    },
  })
  return null
}

const MapRecenter = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
  const map = useMap()
  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude])
    }
  }, [latitude, longitude, map])
  return null
}

const StatCard = ({ icon: Icon, iconClass, label, value, hint }: StatCardProps) => (
  <div className="card text-center">
    <Icon className={`h-7 w-7 mx-auto mb-3 ${iconClass}`} />
    <div className="text-xl font-bold text-white break-words">{value}</div>
    <div className="text-gray-200 text-sm mt-1">{label}</div>
    {hint && <div className="text-gray-400 text-xs mt-1">{hint}</div>}
  </div>
)

interface DetailRowProps {
  label: string
  value: string
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="flex justify-between gap-4 py-1 border-b border-gray-700/40 last:border-0">
    <span className="text-gray-300">{label}</span>
    <span className="text-white text-right break-words">{value}</span>
  </div>
)

const EarthTrends = () => {
  const [latitude, setLatitude] = useState(DEFAULT_LATITUDE)
  const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE)
  const [startYear, setStartYear] = useState(DEFAULT_START_YEAR)
  const [endYear, setEndYear] = useState(DEFAULT_END_YEAR)
  const [variable, setVariable] = useState<TrendVariableId>('T2M')
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareLabel, setCompareLabel] = useState('Lahore, Pakistan')
  const [compareLatitude, setCompareLatitude] = useState('31.520')
  const [compareLongitude, setCompareLongitude] = useState('74.358')

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['power-trend', latitude, longitude, startYear, endYear],
    queryFn: () => nasaApi.getPowerTrend(latitude, longitude, startYear, endYear, PARAMETERS),
    select: (response) => response.data as PowerDataResponse,
    staleTime: 10 * 60 * 1000
  })

  const compareQuery = useQuery({
    queryKey: ['power-trend-compare', compareLatitude, compareLongitude, startYear, endYear],
    queryFn: () => nasaApi.getPowerTrend(compareLatitude, compareLongitude, startYear, endYear, PARAMETERS),
    select: (response) => response.data as PowerDataResponse,
    staleTime: 10 * 60 * 1000,
    enabled: compareEnabled
  })

  const variableMeta = getVariableMeta(variable)

  const series = useMemo(
    () => buildMonthlySeries(data?.properties?.parameter?.[variable], Number(startYear), Number(endYear)),
    [data, variable, startYear, endYear]
  )

  const analysis = useMemo(() => analyzeTrend(variable, series), [variable, series])

  // Aggregation, quality, seasonality and anomaly views derived from the same
  // observations as the primary trend analysis.
  const annual = useMemo(() => buildAnnualSeries(series), [series])
  const annualTrend = useMemo(
    () => linearRegression(annual.points.map((point) => ({ x: point.year, y: point.value }))),
    [annual]
  )
  const seasonal = useMemo(() => seasonalAnalysis(series), [series])
  const completenessDetail = useMemo(() => completenessStats(series), [series])
  const outliers = useMemo(() => detectOutliers(series), [series])
  const anomalies = useMemo(() => detectAnomalies(series, { threshold: 2 }), [series])

  // Forecasting (P1 §5): validated on a chronological held-out window and
  // compared against a climatology baseline. Never presented as a measurement.
  const forecastHorizon = 24
  const backtest = useMemo(() => backtestForecast(series, { horizon: forecastHorizon }), [series])
  const forecast = useMemo(() => {
    if (!backtest.finite) return null
    // Prefer the method with the lowest held-out RMSE.
    if (backtest.recommended === 'linear-trend') return linearForecast(analysis.observations.map((o) => ({ x: o.index, y: o.value })), forecastHorizon)
    if (backtest.recommended === 'seasonal-drift') return seasonalDriftForecast(series, forecastHorizon)
    // Fall back to the seasonal drift model when climatology was best but a
    // model-based extrapolation is still requested.
    return seasonalDriftForecast(series, forecastHorizon) || linearForecast(analysis.observations.map((o) => ({ x: o.index, y: o.value })), forecastHorizon)
  }, [backtest, series, analysis.observations])

  // Optional second location for side-by-side comparison.
  const compareSeries = useMemo(
    () =>
      buildMonthlySeries(
        compareQuery.data?.properties?.parameter?.[variable],
        Number(startYear),
        Number(endYear)
      ),
    [compareQuery.data, variable, startYear, endYear]
  )
  const compareAnalysis = useMemo(() => analyzeTrend(variable, compareSeries), [variable, compareSeries])
  const compareAnnual = useMemo(() => buildAnnualSeries(compareSeries), [compareSeries])

  const chartData = useMemo(() => {
    if (series.labels.length === 0) return null

    const firstObservation = analysis.observations[0]
    const lastObservation = analysis.observations[analysis.observations.length - 1]
    const trendValues = analysis.regression
      ? series.xValues.map((x) => {
          if (!firstObservation || !lastObservation) return null
          if (x < firstObservation.index || x > lastObservation.index) return null
          return analysis.regression!.intercept + analysis.regression!.slope * x
        })
      : series.values.map(() => null)

    return {
      labels: series.labels,
      datasets: [
        {
          label: `${variableMeta.label} (${variableMeta.units})`,
          data: series.values,
          borderColor: 'rgb(96, 165, 250)',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2,
          tension: 0.15,
          spanGaps: false,
        },
        {
          label: 'Linear trend (OLS)',
          data: trendValues,
          borderColor: 'rgba(248, 113, 113, 0.95)',
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0,
          spanGaps: true,
          fill: false,
        },
      ],
    }
  }, [series, analysis, variableMeta])

  const chartOptions = useMemo(
    () => ({
      ...defaultChartOptions,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        ...defaultChartOptions.plugins,
        title: {
          display: true,
          text: `${variableMeta.label} - monthly values with linear trend`,
          color: 'white',
          font: { size: 16 },
        },
      },
      scales: {
        x: {
          ...defaultChartOptions.scales.x,
          ticks: { ...defaultChartOptions.scales.x.ticks, maxTicksLimit: 24, autoSkip: true, maxRotation: 0 },
          title: { display: true, text: 'Month', color: 'white' },
        },
        y: {
          ...defaultChartOptions.scales.y,
          title: { display: true, text: `${variableMeta.label} (${variableMeta.units})`, color: 'white' },
        },
      },
    }),
    [variableMeta]
  )

  const annualChartData = useMemo(() => {
    if (annual.points.length === 0) return null
    return {
      labels: annual.points.map((point) => String(point.year)),
      datasets: [
        {
          label: `Annual mean ${variableMeta.label} (${variableMeta.units})`,
          data: annual.points.map((point) => Math.round(point.value * 1000) / 1000),
          backgroundColor: 'rgba(96, 165, 250, 0.55)',
          borderColor: 'rgb(96, 165, 250)',
          borderWidth: 1,
        },
        ...(annualTrend
          ? [
              {
                type: 'line' as const,
                label: 'Annual linear trend',
                data: annual.points.map((point) => annualTrend.intercept + annualTrend.slope * point.year),
                borderColor: 'rgba(248, 113, 113, 0.95)',
                borderDash: [6, 6],
                borderWidth: 2,
                pointRadius: 0,
                backgroundColor: 'transparent',
                fill: false,
              },
            ]
          : []),
      ],
    }
  }, [annual, annualTrend, variableMeta])

  const seasonalChartData = useMemo(
    () => ({
      labels: seasonal.months.map((month) => month.label),
      datasets: [
        {
          label: `Mean ${variableMeta.label} by calendar month (${variableMeta.units})`,
          data: seasonal.months.map((month) => (month.mean === null ? null : Math.round(month.mean * 100) / 100)),
          backgroundColor: seasonal.months.map((month) => {
            if (month.month === seasonal.peakMonth) return 'rgba(248, 113, 113, 0.7)'
            if (month.month === seasonal.troughMonth) return 'rgba(56, 189, 248, 0.7)'
            return 'rgba(96, 165, 250, 0.5)'
          }),
          borderColor: 'rgba(96, 165, 250, 0.9)',
          borderWidth: 1,
        },
      ],
    }),
    [seasonal, variableMeta]
  )

  const comparisonChartData = useMemo(() => {
    if (!compareEnabled || !compareQuery.data || annual.points.length === 0) return null
    const years = [
      ...new Set([...annual.points.map((point) => point.year), ...compareAnnual.points.map((point) => point.year)]),
    ].sort((a, b) => a - b)
    if (years.length === 0) return null
    const valueFor = (points: typeof annual.points, year: number): number | null => {
      const point = points.find((candidate) => candidate.year === year)
      return point ? Math.round(point.value * 1000) / 1000 : null
    }
    return {
      labels: years.map(String),
      datasets: [
        {
          label: `${latitude}, ${longitude}`,
          data: years.map((year) => valueFor(annual.points, year)),
          borderColor: 'rgb(96, 165, 250)',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.2,
          spanGaps: true,
        },
        {
          label: `${compareLabel} (${compareLatitude}, ${compareLongitude})`,
          data: years.map((year) => valueFor(compareAnnual.points, year)),
          borderColor: 'rgb(251, 191, 36)',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.2,
          spanGaps: true,
        },
      ],
    }
  }, [compareEnabled, compareQuery.data, annual, compareAnnual, latitude, longitude, compareLabel, compareLatitude, compareLongitude])

  const forecastChartData = useMemo(() => {
    if (!forecast || series.labels.length === 0) return null
    const forecastLabels = forecast.predictions.map((point) => point.label)
    const historyPad: Array<number | null> = new Array(forecastLabels.length).fill(null)
    const forecastPad: Array<number | null> = new Array(series.labels.length).fill(null)
    return {
      labels: [...series.labels, ...forecastLabels],
      datasets: [
        {
          label: `${variableMeta.label} (${variableMeta.units})`,
          data: [...series.values, ...historyPad],
          borderColor: 'rgb(96, 165, 250)',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.15,
          spanGaps: false,
        },
        {
          label: 'Forecast (model output, not observed)',
          data: [...forecastPad, ...forecast.predictions.map((point) => Math.round(point.value * 1000) / 1000)],
          borderColor: 'rgb(251, 191, 36)',
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0,
          spanGaps: true,
        },
        {
          label: `Upper ${(forecast.intervalLevel * 100).toFixed(0)}% interval`,
          data: [...forecastPad, ...forecast.predictions.map((point) => Math.round(point.upper * 1000) / 1000)],
          borderColor: 'rgba(251, 191, 36, 0.35)',
          backgroundColor: 'rgba(251, 191, 36, 0.12)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1',
          spanGaps: true,
        },
        {
          label: `Lower ${(forecast.intervalLevel * 100).toFixed(0)}% interval`,
          data: [...forecastPad, ...forecast.predictions.map((point) => Math.round(point.lower * 1000) / 1000)],
          borderColor: 'rgba(251, 191, 36, 0.35)',
          borderWidth: 1,
          pointRadius: 0,
          spanGaps: true,
        },
      ],
    }
  }, [forecast, series, variableMeta])

  if (isLoading) {
    return <LoadingSpinner text="Fetching NASA POWER monthly data..." />
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load NASA POWER data. Please check the coordinates and year range, then try again."
        onRetry={() => refetch()}
      />
    )
  }

  const hasData = analysis.validCount > 0
  const datasetName = data?.header?.title || 'NASA POWER (Prediction Of Worldwide Energy Resources)'
  const retrievalTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'N/A'
  const completeness = series.totalMonths > 0
    ? Math.round((analysis.validCount / series.totalMonths) * 1000) / 10
    : 0

  const DirectionIcon =
    analysis.direction === 'increasing' ? TrendingUp : analysis.direction === 'decreasing' ? TrendingDown : Minus
  const directionColor =
    analysis.direction === 'increasing'
      ? 'text-red-400'
      : analysis.direction === 'decreasing'
        ? 'text-sky-400'
        : 'text-gray-400'

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Activity className="h-8 w-8 text-emerald-400" />
          <h1 className="text-4xl font-bold text-white">Earth Trend Detective</h1>
        </div>
        <p className="text-gray-200 max-w-3xl mx-auto">
          Analyse multi-year climate trends at any location using real NASA POWER Earth-science data.
          Choose a variable and period, then review the linear regression, Mann-Kendall test and Sen&apos;s
          slope - all computed from the retrieved observations.
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Location &amp; Analysis Period</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setLatitude(DEFAULT_LATITUDE)
              setLongitude(DEFAULT_LONGITUDE)
            }}
            className="text-sm px-3 py-1 rounded-lg bg-blue-600/20 text-blue-200 hover:bg-blue-600/40 transition-colors"
          >
            Reset to Faisalabad, Pakistan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Latitude</label>
            <input
              type="number"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              step="0.001"
              min="-90"
              max="90"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Longitude</label>
            <input
              type="number"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              step="0.001"
              min="-180"
              max="180"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Start year</label>
            <input
              type="number"
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              min="1981"
              max="2100"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">End year</label>
            <input
              type="number"
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              min="1981"
              max="2100"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-200 mb-3">
            Variable (from the NASA POWER monthly endpoint)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TREND_VARIABLES.map((option) => {
              const isActive = option.id === variable
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVariable(option.id)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'border-blue-500 bg-blue-600/20 text-white'
                      : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-blue-500/60'
                  }`}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{option.id} · {option.units}</div>
                  <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Optional comparison location */}
        <div className="mt-6 pt-6 border-t border-gray-700/60">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <GitCompare className="h-5 w-5 text-cyan-400" />
              <div>
                <h4 className="text-base font-semibold text-white">Compare with another location</h4>
                <p className="text-xs text-gray-400">
                  Compare two grid points using the identical variable, NASA product and period.
                </p>
              </div>
            </div>
            <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compareEnabled}
                onChange={(event) => setCompareEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-200">Enable comparison</span>
            </label>
          </div>

          {compareEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Location label</label>
                <input
                  type="text"
                  value={compareLabel}
                  onChange={(event) => setCompareLabel(event.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Comparison latitude</label>
                <input
                  type="number"
                  value={compareLatitude}
                  onChange={(event) => setCompareLatitude(event.target.value)}
                  step="0.001"
                  min="-90"
                  max="90"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Comparison longitude</label>
                <input
                  type="number"
                  value={compareLongitude}
                  onChange={(event) => setCompareLongitude(event.target.value)}
                  step="0.001"
                  min="-180"
                  max="180"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Interactive geospatial location picker */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <Map className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Interactive location picker</h3>
              <p className="text-xs text-gray-400">Click anywhere on the map to move the analysis grid point.</p>
            </div>
          </div>
          <span className="text-xs text-gray-300">Selected: {latitude}, {longitude}</span>
        </div>
        <div className="h-80 rounded-xl overflow-hidden border border-gray-700/60">
          <MapContainer
            center={[Number(latitude) || Number(DEFAULT_LATITUDE), Number(longitude) || Number(DEFAULT_LONGITUDE)]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              onPick={(lat, lon) => {
                setLatitude(String(lat))
                setLongitude(String(lon))
              }}
            />
            <MapRecenter latitude={Number(latitude)} longitude={Number(longitude)} />
            <Marker position={[Number(latitude) || Number(DEFAULT_LATITUDE), Number(longitude) || Number(DEFAULT_LONGITUDE)]}>
              <Popup>
                {variableMeta.label} analysis point
                <br />
                {latitude}, {longitude}
              </Popup>
            </Marker>
            {compareEnabled && Number.isFinite(Number(compareLatitude)) && Number.isFinite(Number(compareLongitude)) && (
              <Marker position={[Number(compareLatitude), Number(compareLongitude)]}>
                <Popup>
                  {compareLabel}
                  <br />
                  {compareLatitude}, {compareLongitude}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          The map is a geographic reference only. NASA POWER values are gridded / model-derived reanalysis for the
          nearest grid cell, not a direct ground measurement at the clicked point.
        </p>
      </motion.div>

      {/* Empty state */}
      {!hasData && (
        <div className="card text-center py-10">
          <AlertTriangle className="h-10 w-10 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No valid observations for this selection</h3>
          <p className="text-gray-300 max-w-xl mx-auto">
            NASA POWER returned no usable monthly values for {variableMeta.label} at {latitude}, {longitude}
            {' '}between {startYear} and {endYear}. Try a different variable, a wider year range or another location.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* Trend summary */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card flex items-center space-x-4">
                <DirectionIcon className={`h-10 w-10 ${directionColor}`} />
                <div>
                  <div className="text-sm text-gray-300">Trend direction</div>
                  <div className="text-2xl font-bold text-white capitalize">{analysis.direction}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {analysis.significant
                      ? `Statistically significant at the ${(analysis.significanceLevel * 100).toFixed(0)}% level`
                      : 'Not statistically significant at the 5% level'}
                  </div>
                </div>
              </div>
              <div className="card flex items-center space-x-4">
                {analysis.significant ? (
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-10 w-10 text-yellow-400" />
                )}
                <div>
                  <div className="text-sm text-gray-300">Statistical significance</div>
                  <div className="text-2xl font-bold text-white">
                    {analysis.significant ? 'Significant' : 'Not significant'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    p-value of the primary test: {formatPValue(
                      analysis.regression ? analysis.regression.pValue : analysis.mannKendall ? analysis.mannKendall.pValue : NaN
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={TrendingUp}
                iconClass="text-red-400"
                label="Linear slope (per month)"
                value={analysis.regression ? formatSigned(analysis.regression.slope, 4) : 'N/A'}
                hint={analysis.regression ? `95% CI ${formatSigned(analysis.regression.confidenceInterval.lower, 4)} to ${formatSigned(analysis.regression.confidenceInterval.upper, 4)}` : 'Not enough data'}
              />
              <StatCard
                icon={Activity}
                iconClass="text-purple-400"
                label="R-squared"
                value={analysis.regression ? formatNumber(analysis.regression.rSquared, 3) : 'N/A'}
                hint={analysis.regression ? `Intercept ${formatNumber(analysis.regression.intercept, 3)}` : 'Not enough data'}
              />
              <StatCard
                icon={TrendingUp}
                iconClass="text-emerald-400"
                label="Sen's slope (per month)"
                value={analysis.sensSlope ? formatSigned(analysis.sensSlope.slope, 4) : 'N/A'}
                hint={analysis.sensSlope?.confidenceInterval ? `95% CI ${formatSigned(analysis.sensSlope.confidenceInterval.lower, 4)} to ${formatSigned(analysis.sensSlope.confidenceInterval.upper, 4)}` : 'Non-parametric estimate'}
              />
              <StatCard
                icon={Activity}
                iconClass="text-sky-400"
                label="Mann-Kendall Z"
                value={analysis.mannKendall ? formatNumber(analysis.mannKendall.z, 3) : 'N/A'}
                hint={analysis.mannKendall ? `p = ${formatPValue(analysis.mannKendall.pValue)} · S = ${analysis.mannKendall.s}` : 'Not enough data'}
              />
            </div>
          </motion.div>

          {/* Chart */}
          {chartData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
              <div className="flex items-center space-x-3 mb-4">
                <Activity className="h-5 w-5 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Historical time series &amp; regression trend</h3>
              </div>
              <div className="h-96">
                <Line data={chartData} options={chartOptions} />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Solid line: monthly NASA POWER values. Dashed line: ordinary least-squares linear trend fitted to the
                valid observations. Gaps indicate months without a usable value.
              </p>
            </motion.div>
          )}

          {/* Annual aggregation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="h-5 w-5 text-indigo-400" />
              <h3 className="text-xl font-semibold text-white">Annual aggregation</h3>
            </div>
            {annualChartData ? (
              <>
                <div className="h-80">
                  <Bar
                    data={annualChartData as unknown as ChartData<'bar'>}
                    options={buildChartOptions('Annual mean with linear trend', `${variableMeta.label} (${variableMeta.units})`, 'Year')}
                  />
                </div>
                {annualTrend ? (
                  <p className="text-xs text-gray-400 mt-3">
                    Annual linear trend: <strong className="text-gray-200">{formatSigned(annualTrend.slope, 4)} {variableMeta.units} per year</strong>{' '}
                    ({formatSigned(annualTrend.slope * 10, 3)} per decade), p = {formatPValue(annualTrend.pValue)}.
                    Derived from {annual.totalYears} annual means ({annual.completeYears} complete years); each annual mean
                    uses only the months with valid data.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-3">At least three years with valid data are required for an annual trend.</p>
                )}
              </>
            ) : (
              <p className="text-gray-300 text-sm">No annual values could be aggregated for this selection.</p>
            )}
          </motion.div>

          {/* Seasonal pattern */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Layers className="h-5 w-5 text-teal-400" />
              <h3 className="text-xl font-semibold text-white">Seasonal pattern (calendar-month climatology)</h3>
            </div>
            <div className="h-80">
              <Bar
                data={seasonalChartData}
                options={buildChartOptions(`Mean ${variableMeta.label} by month`, `${variableMeta.label} (${variableMeta.units})`, 'Month')}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {seasonal.amplitude !== null && seasonal.peakMonth !== null && seasonal.troughMonth !== null && (
                <>
                  Seasonal amplitude: <strong className="text-gray-200">{formatNumber(seasonal.amplitude, 2)} {variableMeta.units}</strong> between{' '}
                  {seasonal.months[seasonal.peakMonth - 1].label} (peak) and {seasonal.months[seasonal.troughMonth - 1].label} (trough).{' '}
                </>
              )}
              Each bar averages the same calendar month across all years. This describes the average seasonal cycle and is
              separate from any long-term trend.
            </p>
          </motion.div>

          {/* Outliers + anomalies */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">Outlier detection</h3>
              </div>
              <div className="text-sm space-y-1 mb-3">
                <DetailRow label="Method" value={outliers.method} />
                <DetailRow label="Threshold" value={`|score| >= ${outliers.threshold}`} />
                <DetailRow label="Robust centre" value={formatNumber(outliers.center, 3)} />
                <DetailRow label="Robust spread" value={formatNumber(outliers.spread, 3)} />
                <DetailRow label="Observations checked" value={String(outliers.checkedCount)} />
                <DetailRow label="Outliers flagged" value={String(outliers.outliers.length)} />
              </div>
              {outliers.outliers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="py-1 pr-3">Month</th>
                        <th className="py-1 pr-3">Value</th>
                        <th className="py-1 pr-3">Score</th>
                        <th className="py-1">Direction</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-200">
                      {outliers.outliers.slice(0, 8).map((outlier) => (
                        <tr key={outlier.label} className="border-t border-gray-700/40">
                          <td className="py-1 pr-3">{outlier.label}</td>
                          <td className="py-1 pr-3">{formatNumber(outlier.value, 3)}</td>
                          <td className="py-1 pr-3">{formatSigned(outlier.score, 2)}</td>
                          <td className="py-1 capitalize">{outlier.direction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-xs">No unusual values exceed the outlier threshold for this variable and period.</p>
              )}
            </div>

            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <Activity className="h-5 w-5 text-rose-400" />
                <h3 className="text-xl font-semibold text-white">Anomalies vs climatology</h3>
              </div>
              <div className="text-sm space-y-1 mb-3">
                <DetailRow label="Baseline" value="Calendar-month climatology" />
                <DetailRow label="Threshold" value={`|z| >= ${anomalies.threshold}`} />
                <DetailRow label="Anomalies found" value={String(anomalies.anomalies.length)} />
              </div>
              {anomalies.anomalies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="py-1 pr-3">Month</th>
                        <th className="py-1 pr-3">Value</th>
                        <th className="py-1 pr-3">Baseline</th>
                        <th className="py-1 pr-3">Departure</th>
                        <th className="py-1">z</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-200">
                      {anomalies.anomalies.slice(0, 8).map((anomaly) => (
                        <tr key={anomaly.label} className="border-t border-gray-700/40">
                          <td className="py-1 pr-3">{anomaly.label}</td>
                          <td className="py-1 pr-3">{formatNumber(anomaly.value, 2)}</td>
                          <td className="py-1 pr-3">{formatNumber(anomaly.baseline, 2)}</td>
                          <td className={`py-1 pr-3 ${anomaly.departure >= 0 ? 'text-red-300' : 'text-sky-300'}`}>
                            {formatSigned(anomaly.departure, 2)}
                          </td>
                          <td className="py-1">{formatSigned(anomaly.zScore, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-xs">No months depart from the climatological baseline by more than the threshold.</p>
              )}
            </div>
          </motion.div>

          {/* Location comparison */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card">
            <div className="flex items-center space-x-3 mb-4">
              <GitCompare className="h-5 w-5 text-cyan-400" />
              <h3 className="text-xl font-semibold text-white">Location comparison</h3>
            </div>
            {!compareEnabled ? (
              <p className="text-gray-300 text-sm">
                Enable the comparison location in the controls above to compare two locations for the same variable and period.
              </p>
            ) : compareQuery.isLoading ? (
              <p className="text-gray-300 text-sm">Fetching comparison data for {compareLabel}...</p>
            ) : compareQuery.error ? (
              <p className="text-gray-300 text-sm">
                Comparison data for {compareLabel} could not be retrieved. Check the coordinates and try again.
              </p>
            ) : comparisonChartData ? (
              <>
                <div className="h-80">
                  <Line
                    data={comparisonChartData}
                    options={buildChartOptions(`Annual mean ${variableMeta.label}`, `${variableMeta.label} (${variableMeta.units})`, 'Year')}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                  <div className="rounded-xl border border-gray-700/60 p-4">
                    <div className="font-semibold text-blue-300 mb-2">{latitude}, {longitude}</div>
                    <DetailRow label="Valid months" value={String(analysis.validCount)} />
                    <DetailRow label="Missing months" value={String(analysis.missingCount)} />
                    <DetailRow label="Slope (per month)" value={analysis.regression ? formatSigned(analysis.regression.slope, 4) : 'N/A'} />
                    <DetailRow label="Direction" value={analysis.direction} />
                    <DetailRow label="Significant" value={analysis.significant ? 'Yes' : 'No'} />
                  </div>
                  <div className="rounded-xl border border-gray-700/60 p-4">
                    <div className="font-semibold text-amber-300 mb-2">{compareLabel}</div>
                    <DetailRow label="Valid months" value={String(compareAnalysis.validCount)} />
                    <DetailRow label="Missing months" value={String(compareAnalysis.missingCount)} />
                    <DetailRow label="Slope (per month)" value={compareAnalysis.regression ? formatSigned(compareAnalysis.regression.slope, 4) : 'N/A'} />
                    <DetailRow label="Direction" value={compareAnalysis.direction} />
                    <DetailRow label="Significant" value={compareAnalysis.significant ? 'Yes' : 'No'} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Both locations use the identical NASA POWER variable, product and period, so the comparison is
                  like-for-like. Differences describe these two grid points only.
                </p>
              </>
            ) : (
              <p className="text-gray-300 text-sm">No comparable annual values were retrieved for {compareLabel}.</p>
            )}
          </motion.div>

          {/* Validated forecasting (P1 §5) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="card">
            <div className="flex items-center space-x-3 mb-4">
              <LineChart className="h-5 w-5 text-amber-400" />
              <h3 className="text-xl font-semibold text-white">Forecast (validated — not observed data)</h3>
            </div>
            {backtest.finite && forecast ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
                  <div className="space-y-1">
                    <DetailRow label="Model method" value={forecast.method} />
                    <DetailRow label="Horizon" value={`${forecast.horizon} months`} />
                    <DetailRow label="Prediction interval" value={`${(forecast.intervalLevel * 100).toFixed(0)}%`} />
                    <DetailRow label="Recommended by backtest" value={backtest.recommended} />
                  </div>
                  <div className="space-y-1">
                    <DetailRow label="Backtest train months" value={String(backtest.trainCount)} />
                    <DetailRow label="Backtest test months" value={String(backtest.testCount)} />
                    <DetailRow label="Linear RMSE" value={backtest.linear ? formatNumber(backtest.linear.rmse, 3) : 'N/A'} />
                    <DetailRow label="Seasonal RMSE" value={backtest.seasonal ? formatNumber(backtest.seasonal.rmse, 3) : 'N/A'} />
                    <DetailRow label="Climatology baseline RMSE" value={backtest.baseline ? formatNumber(backtest.baseline.rmse, 3) : 'N/A'} />
                  </div>
                </div>
                {forecastChartData && (
                  <div className="h-96">
                    <Line
                      data={forecastChartData}
                      options={buildChartOptions(`Forecast beyond ${endYear}`, `${variableMeta.label} (${variableMeta.units})`, 'Month')}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">{backtest.recommendationReason}</p>
              </>
            ) : (
              <p className="text-gray-300 text-sm">{backtest.recommendationReason}</p>
            )}
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-xs">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">This is a model forecast, not a NASA measurement</p>
                  <p>
                    Forecasts are extrapolations from the historical record and carry wide, growing uncertainty. They are
                    evaluated on a chronological held-out window against a climatology baseline (lower RMSE = better).
                    They are NOT observed data and must never be reported as observations.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Data quality + transparency */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <Database className="h-5 w-5 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Data quality</h3>
              </div>
              <div className="text-sm space-y-1">
                <DetailRow label="Months in range" value={String(series.totalMonths)} />
                <DetailRow label="Valid observations" value={String(analysis.validCount)} />
                <DetailRow label="Missing months (excluded)" value={String(analysis.missingCount)} />
                <DetailRow label="Data completeness" value={`${formatNumber(completeness, 1)}%`} />
                <DetailRow label="Complete years" value={`${completenessDetail.completeYears} of ${completenessDetail.expectedYears}`} />
                <DetailRow
                  label="Years with gaps"
                  value={completenessDetail.yearsWithGaps.length > 0 ? completenessDetail.yearsWithGaps.join(', ') : 'None'}
                />
                <DetailRow label="Degrees of freedom" value={analysis.regression ? String(analysis.regression.degreesOfFreedom) : 'N/A'} />
                <DetailRow label="Std. error of slope" value={analysis.regression ? formatNumber(analysis.regression.standardError, 5) : 'N/A'} />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <Info className="h-5 w-5 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Data transparency</h3>
              </div>
              <div className="text-sm space-y-1">
                <DetailRow label="NASA dataset" value={datasetName} />
                <DetailRow label="Variable identifier" value={variable} />
                <DetailRow label="Measurement units" value={variableMeta.units} />
                <DetailRow label="Coordinates" value={`${latitude}, ${longitude}`} />
                <DetailRow label="Analysis period" value={`${startYear} - ${endYear}`} />
                <DetailRow label="Temporal resolution" value="Monthly (NASA POWER point API)" />
                <DetailRow label="Retrieval timestamp" value={retrievalTimestamp} />
                <DetailRow label="Observations analysed" value={String(analysis.validCount)} />
              </div>
            </div>
          </motion.div>

          {/* Scientific explanation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="h-5 w-5 text-yellow-400" />
              <h3 className="text-xl font-semibold text-white">What this means</h3>
            </div>

            {analysis.regression ? (
              <div className="space-y-3 text-gray-200 text-sm leading-relaxed">
                <p>
                  For <strong>{variableMeta.label}</strong> at {latitude}, {longitude}, between {startYear} and {endYear},
                  the monthly series has a linear slope of{' '}
                  <strong>{formatSigned(analysis.regression.slope, 4)} {variableMeta.units} per month</strong>, equivalent to
                  roughly <strong>{formatSigned(analysis.regression.slope * 12, 3)} {variableMeta.units} per decade</strong>.
                </p>
                <p>
                  The regression explains about <strong>{formatNumber(analysis.regression.rSquared * 100, 1)}%</strong> of the
                  month-to-month variation (R-squared = {formatNumber(analysis.regression.rSquared, 3)}).
                  {analysis.sensSlope && (
                    <> Sen&apos;s slope, a robust non-parametric estimate, is{' '}
                      <strong>{formatSigned(analysis.sensSlope.slope, 4)} {variableMeta.units} per month</strong>.</>
                  )}
                </p>
                <p>
                  {analysis.significant ? (
                    <>
                      Both the linear regression and the Mann-Kendall test indicate a{' '}
                      <strong>{analysis.direction}</strong> trend that is unlikely to have arisen by chance alone
                      (Mann-Kendall p = {analysis.mannKendall ? formatPValue(analysis.mannKendall.pValue) : 'N/A'} at the
                      5% level).
                    </>
                  ) : (
                    <>
                      The observed change is <strong>not statistically significant</strong> at the 5% level
                      (Mann-Kendall p = {analysis.mannKendall ? formatPValue(analysis.mannKendall.pValue) : 'N/A'}), so the
                      apparent slope could be consistent with natural variability.
                    </>
                  )}
                </p>
                <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-100">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="space-y-2">
                      <p className="font-semibold">Interpret with care</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>A statistically significant trend is not proof of causation.</li>
                        <li>This trend does <strong>not</strong> by itself prove human-caused (anthropogenic) climate change attribution.</li>
                        <li>The analysis uses raw monthly values, so a strong seasonal cycle (shown as repeating highs and lows) is present and is not removed.</li>
                        <li>Missing months are excluded; short or gappy records reduce statistical power.</li>
                        <li>Results describe the selected grid point and period only.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-200 text-sm">
                Not enough valid observations were retrieved to compute a reliable trend. At least three valid monthly
                data points are required for the regression and Mann-Kendall tests.
              </p>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}

export default EarthTrends
