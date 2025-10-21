import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Globe, Calendar, Download, MapPin } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const EarthImages = () => {
  const [selectedDate, setSelectedDate] = useState('')

  const { data, isLoading, error, refetch } = useQuery(
    ['earth-images', selectedDate],
    () => nasaApi.getEarthImages(selectedDate),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
    }
  )

  const getImageUrl = (image: any) => {
    const date = image.date.split(' ')[0].replace(/-/g, '/')
    return `https://api.nasa.gov/EPIC/archive/natural/${date}/png/${image.image}.png?api_key=gWIJqBXp1aTBXFaTDnd7GI9xOYlHfQBMe15cq4qd`
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading Earth images..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load Earth images. Please try again."
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
          <h1 className="text-4xl font-bold text-white">Earth Images (EPIC)</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          View our planet from space with NASA's EPIC (Earth Polychromatic Imaging Camera) 
          aboard the DSCOVR satellite, positioned at the L1 Lagrange point.
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
          onChange={(e) => setSelectedDate(e.target.value)}
          max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-400 mt-2">
          Leave empty for the most recent images, or select a specific date
        </p>
      </motion.div>

      {/* Images Grid */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Info */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  {data.length} images available
                </span>
              </div>
              {data.length > 0 && (
                <div className="text-sm text-gray-400">
                  Date: {data[0]?.date?.split(' ')[0]}
                </div>
              )}
            </div>
          </div>

          {data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map((image: any, index: number) => (
                <motion.div
                  key={image.identifier || index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="card card-hover group"
                >
                  <div className="aspect-square overflow-hidden rounded-lg mb-4">
                    <img
                      src={getImageUrl(image)}
                      alt={`Earth from space - ${image.date}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-white mb-2">
                        Earth - {format(new Date(image.date), 'HH:mm:ss')}
                      </h3>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Date: {image.date?.split(' ')[0]}</p>
                        <p>Time: {image.date?.split(' ')[1]} UTC</p>
                        {image.centroid_coordinates && (
                          <>
                            <p>Lat: {image.centroid_coordinates.lat?.toFixed(2)}°</p>
                            <p>Lon: {image.centroid_coordinates.lon?.toFixed(2)}°</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(getImageUrl(image), '_blank')}
                        className="flex-1 btn-primary text-sm"
                      >
                        View Full Size
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = getImageUrl(image)
                          link.download = `earth-${image.image}.png`
                          link.click()
                        }}
                        className="btn-secondary p-2"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Images Available</h3>
              <p className="text-gray-400 mb-4">
                No Earth images were found for the selected date.
              </p>
              <p className="text-sm text-gray-500">
                Try selecting a different date or leave the date field empty for recent images.
              </p>
            </div>
          )}

          {/* About EPIC */}
          <div className="card bg-blue-500/10 border-blue-500/30">
            <h3 className="text-xl font-semibold text-white mb-4">About EPIC</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
              <div>
                <h4 className="text-white font-medium mb-2">Mission Overview</h4>
                <p>
                  EPIC (Earth Polychromatic Imaging Camera) is aboard the DSCOVR satellite, 
                  positioned at the L1 Lagrange point between Earth and the Sun, about 1.5 million 
                  kilometers from Earth. This unique position provides a constant view of the 
                  sunlit side of Earth.
                </p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Image Details</h4>
                <p>
                  EPIC takes images of the entire sunlit face of Earth every 1-2 hours, 
                  providing a unique perspective of our planet's weather patterns, seasonal 
                  changes, and natural phenomena. The images are taken in 10 different 
                  spectral channels.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default EarthImages