import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Image, Search, ExternalLink } from 'lucide-react'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const ImageLibrary = () => {
  const [searchQuery, setSearchQuery] = useState('earth')
  const [mediaType, setMediaType] = useState('image')

  const { data, isLoading, error, refetch } = useQuery(
    ['nasa-images', searchQuery, mediaType],
    () => nasaApi.searchImages(searchQuery, mediaType),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
      enabled: searchQuery.length > 0,
    }
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  if (isLoading) {
    return <LoadingSpinner text="Searching NASA image library..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to search NASA image library. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const items = data?.collection?.items || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Image className="h-8 w-8 text-purple-400" />
          <h1 className="text-4xl font-bold text-white">NASA Image Library</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Search through NASA's vast collection of images, videos, and audio files 
          from space missions, astronomical observations, and Earth science.
        </p>
      </motion.div>

      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Search NASA Library</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Query
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., mars, apollo, hubble, earth..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Media Type
              </label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn-primary">
            Search Library
          </button>
        </form>
      </motion.div>

      {/* Results */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Results Info */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  {items.length} results found
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Query: "{searchQuery}" | Type: {mediaType}
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.slice(0, 18).map((item: any, index: number) => {
                const data = item.data?.[0]
                const links = item.links
                const thumbnail = links?.find((link: any) => link.rel === 'preview')?.href
                
                return (
                  <motion.div
                    key={data?.nasa_id || index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * (index % 6) }}
                    className="card card-hover group"
                  >
                    {thumbnail && (
                      <div className="aspect-video overflow-hidden rounded-lg mb-4">
                        <img
                          src={thumbnail}
                          alt={data?.title || 'NASA image'}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-white mb-2 line-clamp-2">
                          {data?.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-3">
                          {data?.description || 'No description available'}
                        </p>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        {data?.date_created && (
                          <p>Date: {new Date(data.date_created).toLocaleDateString()}</p>
                        )}
                        {data?.center && <p>Center: {data.center}</p>}
                        {data?.media_type && (
                          <p>Type: {data.media_type.charAt(0).toUpperCase() + data.media_type.slice(1)}</p>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        {thumbnail && (
                          <button
                            onClick={() => window.open(thumbnail, '_blank')}
                            className="flex-1 btn-primary text-sm"
                          >
                            View Image
                          </button>
                        )}
                        {data?.nasa_id && (
                          <button
                            onClick={() => window.open(`https://images.nasa.gov/details-${data.nasa_id}`, '_blank')}
                            className="btn-secondary p-2"
                            title="View Details"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
              <p className="text-gray-400 mb-4">
                No {mediaType}s were found for "{searchQuery}".
              </p>
              <p className="text-sm text-gray-500">
                Try different keywords or change the media type.
              </p>
            </div>
          )}

          {/* Popular Searches */}
          <div className="card bg-purple-500/10 border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-4">Popular Searches</h3>
            <div className="flex flex-wrap gap-2">
              {[
                'apollo', 'mars', 'hubble', 'earth', 'moon', 'saturn', 'jupiter', 
                'nebula', 'galaxy', 'astronaut', 'space station', 'solar system'
              ].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term)
                    // Trigger search after state update
                    setTimeout(() => refetch(), 100)
                  }}
                  className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-full text-sm transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ImageLibrary