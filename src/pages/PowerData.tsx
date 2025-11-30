import { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Sun, MapPin, Calendar, TrendingUp } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const PowerData = () => {
  const [latitude, setLatitude] = useState('33.69')
  const [longitude, setLongitude] = useState('73.05')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyyMMdd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyyMMdd'))

  const { data, isLoading, error, refetch } = useQuery(
    ['power-data', latitude, longitude, startDate, endDate],
    () => nasaApi.getPOWERData(latitude, longitude, startDate, endDate),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
    }
  )

  const chartData = useMemo(() => {
    if (!data?.properties?.parameter) return null

    const dates = Object.keys(data.properties.parameter.T2M || {})
    const temperatures = Object.values(data.properties.parameter.T2M || {}) as number[]
    const solarRadiation = Object.values(data.properties.parameter.ALLSKY_SFC_SW_DWN || {}) as number[]

    return {
      labels: dates.map(date => {
        const year = date.substring(0, 4)
        const month = date.substring(4, 6)
        const day = date.substring(6, 8)
        return `${month}/${day}`
      }),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temperatures,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          yAxisID: 'y',
        },
        {
          label: 'Solar Radiation (kWh/m²/day)',
          data: solarRadiation,
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          yAxisID: 'y1',
        },
      ],
    }
  }, [data])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: 'Climate Data Over Time',
        color: 'white',
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Solar Radiation (kWh/m²/day)',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading climate and solar energy data..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load POWER data. Please try again."
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
          <Sun className="h-8 w-8 text-yellow-400" />
          <h1 className="text-4xl font-bold text-white">POWER Climate Data</h1>
        </div>
        <p className="text-gray-200 max-w-2xl mx-auto">
          Access NASA's Prediction Of Worldwide Energy Resources (POWER) data for 
          climate and solar energy analysis at any location worldwide.
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <MapPin className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Location & Date Range</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Latitude
            </label>
            <input
              type="number"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              step="0.01"
              min="-90"
              max="90"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="33.69"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Longitude
            </label>
            <input
              type="number"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              step="0.01"
              min="-180"
              max="180"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="73.05"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={format(new Date(startDate.substring(0, 4) + '-' + startDate.substring(4, 6) + '-' + startDate.substring(6, 8)), 'yyyy-MM-dd')}
              onChange={(e) => setStartDate(e.target.value.replace(/-/g, ''))}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={format(new Date(endDate.substring(0, 4) + '-' + endDate.substring(4, 6) + '-' + endDate.substring(6, 8)), 'yyyy-MM-dd')}
              onChange={(e) => setEndDate(e.target.value.replace(/-/g, ''))}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-300">
          <p><strong>Example locations:</strong> New York (40.7, -74.0), London (51.5, -0.1), Tokyo (35.7, 139.7)</p>
        </div>
      </motion.div>

      {/* Data Display */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card text-center">
              <TrendingUp className="h-8 w-8 text-red-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                {data.properties?.parameter?.T2M ? 
                  Math.round((Object.values(data.properties.parameter.T2M) as number[]).reduce((a, b) => a + b, 0) / Object.values(data.properties.parameter.T2M).length * 10) / 10 
                  : 'N/A'}°C
              </div>
              <div className="text-gray-200">Avg Temperature</div>
            </div>

            <div className="card text-center">
              <Sun className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                {data.properties?.parameter?.ALLSKY_SFC_SW_DWN ? 
                  Math.round((Object.values(data.properties.parameter.ALLSKY_SFC_SW_DWN) as number[]).reduce((a, b) => a + b, 0) / Object.values(data.properties.parameter.ALLSKY_SFC_SW_DWN).length * 100) / 100
                  : 'N/A'}
              </div>
              <div className="text-gray-200">Avg Solar (kWh/m²/day)</div>
            </div>

            <div className="card text-center">
              <MapPin className="h-8 w-8 text-blue-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                {latitude}, {longitude}
              </div>
              <div className="text-gray-200">Coordinates</div>
            </div>

            <div className="card text-center">
              <Calendar className="h-8 w-8 text-green-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white mb-1">
                {data.properties?.parameter?.T2M ? Object.keys(data.properties.parameter.T2M).length : 0}
              </div>
              <div className="text-gray-200">Data Points</div>
            </div>
          </div>

          {/* Chart */}
          {chartData && (
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Climate Data Visualization</h3>
              <div className="h-96">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Location Info */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-4">Location Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium text-white mb-3">Coordinates</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Latitude:</span>
                    <span className="text-white">{data.geometry?.coordinates?.[1] || latitude}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Longitude:</span>
                    <span className="text-white">{data.geometry?.coordinates?.[0] || longitude}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Elevation:</span>
                    <span className="text-white">
                      {typeof data.properties?.parameter?.elevation === 'number' 
                        ? `${data.properties.parameter.elevation} m` 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-white mb-3">Data Parameters</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">T2M:</span>
                    <span className="text-white">Temperature at 2 Meters</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">ALLSKY_SFC_SW_DWN:</span>
                    <span className="text-white">Solar Irradiance</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Community:</span>
                    <span className="text-white">Renewable Energy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default PowerData