import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Globe from 'lucide-react/dist/esm/icons/globe'
import Search from 'lucide-react/dist/esm/icons/search'
import Star from 'lucide-react/dist/esm/icons/star'
import Microscope from 'lucide-react/dist/esm/icons/microscope'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import { Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
} from 'chart.js'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { safeParseFloat, createScatterChartOptions } from '../utils/chartHelpers'
import type { ExoplanetData, ProcessedExoplanetData } from '../types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  ScatterController,
  Title,
  Tooltip,
  Legend
)

const Exoplanets = () => {
  const [limit, setLimit] = useState(100)
  const [filterType, setFilterType] = useState('all')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exoplanets', limit],
    queryFn: () => nasaApi.getExoplanets(limit),
    select: (response) => response.data,
    staleTime: 10 * 60 * 1000
  })

  const processedData: ProcessedExoplanetData = useMemo(() => {
    const defaultStats = {
      total: 0,
      avgRadius: 0,
      avgPeriod: 0,
      uniqueStars: 0,
    }

    if (!data || !Array.isArray(data)) {
      return {
        filtered: [],
        chartData: null,
        stats: defaultStats
      }
    }

    let filtered = data.filter((planet: ExoplanetData) =>
      planet.pl_name && planet.pl_orbper && planet.pl_rade
    )

    // Apply filters
    if (filterType === 'habitable') {
      filtered = filtered.filter((planet: ExoplanetData) => {
        const radius = typeof planet.pl_rade === 'string' ? parseFloat(planet.pl_rade) : planet.pl_rade
        const period = typeof planet.pl_orbper === 'string' ? parseFloat(planet.pl_orbper) : planet.pl_orbper
        return radius && period && radius >= 0.5 && radius <= 2.0 && period >= 200 && period <= 500
      })
    } else if (filterType === 'giant') {
      filtered = filtered.filter((planet: ExoplanetData) => {
        const radius = typeof planet.pl_rade === 'string' ? parseFloat(planet.pl_rade) : planet.pl_rade
        return radius && radius > 4
      })
    } else if (filterType === 'terrestrial') {
      filtered = filtered.filter((planet: ExoplanetData) => {
        const radius = typeof planet.pl_rade === 'string' ? parseFloat(planet.pl_rade) : planet.pl_rade
        return radius && radius <= 2
      })
    }

    // Create chart data. A logarithmic x-axis can only plot strictly positive
    // values, so non-positive / non-finite points are dropped rather than
    // letting Chart.js throw (which would blank the whole page).
    const chartPoints = filtered
      .slice(0, 200)
      .map((planet: any) => ({
        x: safeParseFloat(planet.pl_orbper),
        y: safeParseFloat(planet.pl_rade),
        label: planet.pl_name,
        hostStar: planet.hostname,
      }))
      .filter((point) => Number.isFinite(point.x) && point.x > 0 && Number.isFinite(point.y) && point.y > 0)

    const chartData =
      chartPoints.length > 0
        ? {
            datasets: [
              {
                label: 'Exoplanets (Radius vs Orbital Period)',
                data: chartPoints,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgb(59, 130, 246)',
                pointRadius: 4,
                pointHoverRadius: 6,
              },
            ],
          }
        : null

    // Calculate stats
    const stats = {
      total: filtered.length,
      avgRadius: filtered.length > 0
        ? filtered.reduce((sum: number, p: ExoplanetData) => {
            const radius = typeof p.pl_rade === 'string' ? parseFloat(p.pl_rade) : p.pl_rade
            return sum + (radius || 0)
          }, 0) / filtered.length
        : 0,
      avgPeriod: filtered.length > 0
        ? filtered.reduce((sum: number, p: ExoplanetData) => {
            const period = typeof p.pl_orbper === 'string' ? parseFloat(p.pl_orbper) : p.pl_orbper
            return sum + (period || 0)
          }, 0) / filtered.length
        : 0,
      uniqueStars: new Set(filtered.map((p: ExoplanetData) => p.hostname)).size,
    }

    return { filtered, chartData, stats }
  }, [data, filterType])

  // The backend only returns `demo: true` records when the live NASA Exoplanet
  // Archive request failed. Those records are clearly labelled below and are
  // never presented as genuine live observations.
  const hasDemoData = Array.isArray(data) && data.some((planet: ExoplanetData) => planet.demo === true)

  const chartOptions = {
    ...createScatterChartOptions(
      'Exoplanet Radius vs Orbital Period',
      'Orbital Period (days)',
      'Planet Radius (Earth radii)'
    ),
    plugins: {
      ...createScatterChartOptions('', '', '').plugins,
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const point = context.raw as { x: number; y: number; label: string; hostStar: string }
            return [
              `Planet: ${point.label}`,
              `Host Star: ${point.hostStar}`,
              `Radius: ${point.y.toFixed(2)} Earth radii`,
              `Orbital Period: ${point.x.toFixed(1)} days`
            ]
          },
        },
      },
    },
    scales: {
      ...createScatterChartOptions('', '', '').scales,
      x: {
        ...createScatterChartOptions('', '', '').scales.x,
        type: 'logarithmic' as const,
      },
    },
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading exoplanet data..." />
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load exoplanet data. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Globe className="h-8 w-8 text-blue-400" />
          <h1 className="text-4xl font-bold text-white">Exoplanet Archive</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Explore NASA's comprehensive database of confirmed exoplanets,
          their properties, and the stars they orbit around.
        </p>
      </motion.div>

      {/* Honest notice: the live archive was unreachable, so the figures below
          are a labelled fallback and must not be read as live science data. */}
      {hasDemoData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-state-warning/40 bg-state-warning/5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-state-warning" />
            <div>
              <h3 className="section-title">Demonstration fallback — not live data</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                The NASA Exoplanet Archive could not be reached, so the records shown below are a
                small labelled demonstration fallback, not live observations. Use “Refresh Data” to
                retry the archive.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Search className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Filter Exoplanets</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Planet Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Planets</option>
              <option value="terrestrial">Terrestrial (up to 2 Earth radii)</option>
              <option value="habitable">Potentially Habitable</option>
              <option value="giant">Gas Giants (over 4 Earth radii)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50 planets</option>
              <option value={100}>100 planets</option>
              <option value={200}>200 planets</option>
              <option value={500}>500 planets</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full btn-primary"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <div className="card text-center">
          <Globe className="h-8 w-8 text-blue-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">
            {processedData.stats.total}
          </div>
          <div className="text-gray-300">Exoplanets</div>
        </div>

        <div className="card text-center">
          <Star className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">
            {processedData.stats.uniqueStars}
          </div>
          <div className="text-gray-300">Host Stars</div>
        </div>

        <div className="card text-center">
          <Microscope className="h-8 w-8 text-purple-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">
            {processedData.stats.avgRadius > 0 ? processedData.stats.avgRadius.toFixed(1) : 'N/A'}
          </div>
          <div className="text-gray-300">Avg Radius (Earth)</div>
        </div>

        <div className="card text-center">
          <Globe className="h-8 w-8 text-green-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">
            {processedData.stats.avgPeriod > 0 ? processedData.stats.avgPeriod.toFixed(0) : 'N/A'}
          </div>
          <div className="text-gray-300">Avg Period (days)</div>
        </div>
      </motion.div>

      {/* Chart */}
      {processedData.chartData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            Exoplanet Characteristics
          </h3>
          <div className="h-96">
            <Scatter data={processedData.chartData} options={chartOptions} />
          </div>
        </motion.div>
      )}

      {/* Exoplanet List */}
      {processedData.filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            Exoplanet Details ({filterType} filter)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Planet Name</th>
                  <th className="text-left py-3 px-4 text-gray-300">Host Star</th>
                  <th className="text-left py-3 px-4 text-gray-300">Radius (Earth)</th>
                  <th className="text-left py-3 px-4 text-gray-300">Period (days)</th>
                  <th className="text-left py-3 px-4 text-gray-300">Discovery Year</th>
                  <th className="text-left py-3 px-4 text-gray-300">Method</th>
                </tr>
              </thead>
              <tbody>
                {processedData.filtered.slice(0, 20).map((planet: ExoplanetData, index: number) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-white font-medium">
                      {planet.pl_name}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {planet.hostname}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {planet.pl_rade ?
                        (typeof planet.pl_rade === 'string' ? parseFloat(planet.pl_rade) : planet.pl_rade).toFixed(2)
                        : 'N/A'
                      }
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {planet.pl_orbper ?
                        (typeof planet.pl_orbper === 'string' ? parseFloat(planet.pl_orbper) : planet.pl_orbper).toFixed(1)
                        : 'N/A'
                      }
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {planet.disc_year || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {planet.discoverymethod || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {processedData.filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card text-center py-12"
        >
          <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No exoplanets match this filter</h3>
          <p className="text-gray-400">
            The loaded dataset contains no planets with the selected characteristics. Try a different
            planet type or increase the data limit above.
          </p>
        </motion.div>
      )}

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card bg-blue-500/10 border-blue-500/30"
      >
        <h3 className="text-xl font-semibold text-white mb-4">About Exoplanets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-2">Discovery Methods</h4>
            <p>
              Exoplanets are discovered using various methods including transit photometry,
              radial velocity measurements, direct imaging, and gravitational microlensing.
              The Kepler and TESS missions have been particularly successful.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Habitability</h4>
            <p>
              Potentially habitable exoplanets are those that could support liquid water.
              They're typically rocky planets (1-2 Earth radii) in their star's habitable zone,
              with orbital periods that allow moderate temperatures.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Exoplanets
