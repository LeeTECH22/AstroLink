import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Calendar, Camera, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const APOD = () => {
  const [selectedDate, setSelectedDate] = useState('')
  
  const { data, isLoading, error, refetch } = useQuery(
    ['apod', selectedDate],
    () => nasaApi.getAPOD(selectedDate),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const maxDate = today

  if (isLoading) {
    return <LoadingSpinner text="Loading Astronomy Picture of the Day..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load the Astronomy Picture of the Day. Please try again."
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
          <Camera className="h-8 w-8 text-blue-400" />
          <h1 className="text-4xl font-bold text-white">
            Astronomy Picture of the Day
          </h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Discover the cosmos! Each day NASA features a different image or photograph 
          of our fascinating universe, along with a brief explanation written by a professional astronomer.
        </p>
      </motion.div>

      {/* Date Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card max-w-md mx-auto"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="h-5 w-5 text-blue-400" />
          <label className="text-white font-medium">Select Date</label>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          max={maxDate}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-400 mt-2">
          Leave empty for today's image, or select any date since June 16, 1995
        </p>
      </motion.div>

      {/* APOD Content */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Title and Date */}
          <div className="card text-center">
            <h2 className="text-3xl font-bold text-white mb-2">{data.title}</h2>
            <p className="text-blue-400 font-medium">{data.date}</p>
            {data.copyright && (
              <p className="text-gray-400 text-sm mt-2">© {data.copyright}</p>
            )}
          </div>

          {/* Media */}
          <div className="card">
            {data.media_type === 'image' ? (
              <div className="space-y-4">
                <img
                  src={data.url}
                  alt={data.title}
                  className="w-full rounded-lg shadow-2xl"
                />
                {data.hdurl && (
                  <div className="text-center">
                    <a
                      href={data.hdurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View HD Version</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video">
                <iframe
                  src={data.url}
                  title={data.title}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Explanation */}
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-4">Explanation</h3>
            <p className="text-gray-300 leading-relaxed text-lg">
              {data.explanation}
            </p>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h4 className="text-lg font-semibold text-white mb-3">Image Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white">{data.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Media Type:</span>
                  <span className="text-white capitalize">{data.media_type}</span>
                </div>
                {data.copyright && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Copyright:</span>
                    <span className="text-white">{data.copyright}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h4 className="text-lg font-semibold text-white mb-3">About APOD</h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                The Astronomy Picture of the Day (APOD) is a website provided by NASA and 
                Michigan Technological University. It has been running since June 16, 1995, 
                and features a different astronomical image each day with explanations written 
                by professional astronomers.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default APOD