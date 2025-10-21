import { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Zap, Calendar, AlertTriangle, BarChart3, Table } from 'lucide-react'
import { format, addDays } from 'date-fns'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  PointElement,
} from 'chart.js'
import { Bar, Scatter } from 'react-chartjs-2'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  ScatterController,
  Title,
  Tooltip,
  Legend
)

const NearEarthObjects = () => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')

  const { data, isLoading, error, refetch } = useQuery(
    ['neo', startDate, endDate],
    () => nasaApi.getNEO(startDate, endDate),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
    }
  )

  const processedData = useMemo(() => {
    if (!data?.near_earth_objects) return { allNeos: [], chartData: null, scatterData: null }

    const allNeos: any[] = []
    Object.values(data.near_earth_objects).forEach((dayNeos: any) => {
      allNeos.push(...dayNeos)
    })

    // Sort by closest approach distance
    allNeos.sort((a, b) => {
      const distanceA = parseFloat(a.close_approach_data[0]?.miss_distance?.kilometers || '0')
      const distanceB = parseFloat(b.close_approach_data[0]?.miss_distance?.kilometers || '0')
      return distanceA - distanceB
    })

    // Prepare chart data for size distribution
    const sizeRanges = ['0-50m', '50-100m', '100-500m', '500m-1km', '1km+']
    const sizeCounts = [0, 0, 0, 0, 0]

    allNeos.forEach(neo => {
      const maxDiameter = neo.estimated_diameter?.meters?.estimated_diameter_max || 0
      if (maxDiameter < 50) sizeCounts[0]++
      else if (maxDiameter < 100) sizeCounts[1]++
      else if (maxDiameter < 500) sizeCounts[2]++
      else if (maxDiameter < 1000) sizeCounts[3]++
      else sizeCounts[4]++
    })

    const chartData = {
      labels: sizeRanges,
      datasets: [
        {
          label: 'Number of Asteroids',
          data: sizeCounts,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(147, 51, 234, 0.8)',
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
            'rgb(147, 51, 234)',
          ],
          borderWidth: 2,
        },
      ],
    }

    // Prepare scatter plot data (size vs distance)
    const scatterData = {
      datasets: [
        {
          label: 'Asteroids (Size vs Distance)',
          data: allNeos.slice(0, 50).map(neo => ({
            x: parseFloat(neo.close_approach_data[0]?.miss_distance?.kilometers || '0') / 1000000, // Convert to million km
            y: neo.estimated_diameter?.meters?.estimated_diameter_max || 0,
            label: neo.name,
          })),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    }

    return { allNeos, chartData, scatterData }
  }, [data])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: 'Asteroid Size Distribution',
        color: 'white',
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  }

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: 'Asteroid Size vs Distance from Earth',
        color: 'white',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const point = context.raw as { x: number; y: number; label: string }
            return `${point.label}: ${point.y.toFixed(1)}m diameter, ${point.x.toFixed(2)} million km away`
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Diameter (meters)',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Distance (million km)',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading Near Earth Objects..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load Near Earth Objects data. Please try again."
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
          <Zap className="h-8 w-8 text-yellow-400" />
          <h1 className="text-4xl font-bold text-white">Near Earth Objects</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Track asteroids and comets that come close to Earth's orbit. 
          Monitor potentially hazardous objects and their approach details.
        </p>
      </motion.div>

      {/* Date Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Date Range</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mt-2">
          NASA's NEO API allows date ranges up to 7 days
        </p>
      </motion.div>

      {/* View Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <div className="bg-gray-800 rounded-lg p-1 flex">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'table' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Table className="h-4 w-4" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'chart' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Chart View</span>
          </button>
        </div>
      </motion.div>

      {/* Content */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {processedData.allNeos.length}
              </div>
              <div className="text-gray-300">Total Objects</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {processedData.allNeos.filter(neo => neo.is_potentially_hazardous_asteroid).length}
              </div>
              <div className="text-gray-300">Potentially Hazardous</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {processedData.allNeos.length > 0 
                  ? Math.round(parseFloat(processedData.allNeos[0]?.close_approach_data[0]?.miss_distance?.kilometers || '0') / 1000).toLocaleString()
                  : 0
                }
              </div>
              <div className="text-gray-300">Closest (1000 km)</div>
            </div>
          </div>

          {/* Table or Chart View */}
          {viewMode === 'table' ? (
            <div className="card overflow-hidden">
              <h3 className="text-xl font-semibold text-white mb-4">
                Near Earth Objects ({startDate} to {endDate})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-300">Name</th>
                      <th className="text-left py-3 px-4 text-gray-300">Diameter (m)</th>
                      <th className="text-left py-3 px-4 text-gray-300">Distance (km)</th>
                      <th className="text-left py-3 px-4 text-gray-300">Velocity (km/h)</th>
                      <th className="text-left py-3 px-4 text-gray-300">Date</th>
                      <th className="text-left py-3 px-4 text-gray-300">Hazardous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.allNeos.slice(0, 20).map((neo, index) => {
                      const approach = neo.close_approach_data[0]
                      const diameter = neo.estimated_diameter?.meters
                      
                      return (
                        <tr key={neo.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 px-4 text-white font-medium">
                            {neo.name}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {diameter 
                              ? `${Math.round(diameter.estimated_diameter_min)}-${Math.round(diameter.estimated_diameter_max)}`
                              : 'Unknown'
                            }
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {approach 
                              ? Math.round(parseFloat(approach.miss_distance.kilometers)).toLocaleString()
                              : 'Unknown'
                            }
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {approach 
                              ? Math.round(parseFloat(approach.relative_velocity.kilometers_per_hour)).toLocaleString()
                              : 'Unknown'
                            }
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {approach?.close_approach_date || 'Unknown'}
                          </td>
                          <td className="py-3 px-4">
                            {neo.is_potentially_hazardous_asteroid ? (
                              <span className="flex items-center space-x-1 text-red-400">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Yes</span>
                              </span>
                            ) : (
                              <span className="text-green-400">No</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Size Distribution Chart */}
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Asteroid Size Distribution
                </h3>
                <div className="h-80">
                  {processedData.chartData && (
                    <Bar data={processedData.chartData} options={chartOptions} />
                  )}
                </div>
              </div>

              {/* Size vs Distance Scatter Plot */}
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Size vs Distance from Earth
                </h3>
                <div className="h-80">
                  {processedData.scatterData && (
                    <Scatter data={processedData.scatterData} options={scatterOptions} />
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default NearEarthObjects