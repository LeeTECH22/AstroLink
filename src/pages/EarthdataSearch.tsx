import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Database, Search, Satellite, Calendar, Globe } from 'lucide-react'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const EarthdataSearch = () => {
  const [keyword, setKeyword] = useState('MODIS')
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading, error, refetch } = useQuery(
    ['earthdata', keyword, pageSize],
    () => nasaApi.getEarthdataCollections(keyword, pageSize),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
    }
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  if (isLoading) {
    return <LoadingSpinner text="Searching Earth observation datasets..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to search Earthdata collections. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const collections = data?.feed?.entry || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Database className="h-8 w-8 text-green-400" />
          <h1 className="text-4xl font-bold text-white">Earthdata Search</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Search NASA's Common Metadata Repository (CMR) for Earth observation 
          datasets from satellites, aircraft, and ground-based instruments.
        </p>
      </motion.div>

      {/* Search Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Search Collections</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., MODIS, LANDSAT, AIRS, GRACE"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Results Limit
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 results</option>
                <option value={10}>10 results</option>
                <option value={20}>20 results</option>
                <option value={50}>50 results</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn-primary">
            Search Collections
          </button>
          
          <div className="text-sm text-gray-400">
            <p><strong>Popular searches:</strong> MODIS, LANDSAT, AIRS, GRACE, GLDAS, GPM, SMAP</p>
          </div>
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
          {/* Summary */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  {collections.length} collections found
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Search: "{keyword}"
              </div>
            </div>
          </div>

          {/* Collections */}
          {collections.length > 0 ? (
            <div className="space-y-6">
              {collections.map((collection: any, index: number) => (
                <motion.div
                  key={collection.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="card card-hover"
                >
                  <div className="space-y-4">
                    {/* Collection Header */}
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {collection.title || 'Untitled Collection'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>ID: {collection.id}</span>
                        {collection.updated && (
                          <span>Updated: {new Date(collection.updated).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {collection.summary && (
                      <p className="text-gray-300 leading-relaxed">
                        {collection.summary.length > 300 
                          ? `${collection.summary.substring(0, 300)}...`
                          : collection.summary
                        }
                      </p>
                    )}

                    {/* Collection Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {collection.time_start && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <div>
                            <div className="text-xs text-gray-400">Start Date</div>
                            <div className="text-white text-sm">
                              {new Date(collection.time_start).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )}

                      {collection.data_center && (
                        <div className="flex items-center space-x-2">
                          <Satellite className="h-4 w-4 text-green-400" />
                          <div>
                            <div className="text-xs text-gray-400">Data Center</div>
                            <div className="text-white text-sm">
                              {collection.data_center}
                            </div>
                          </div>
                        </div>
                      )}

                      {collection.processing_level_id && (
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-purple-400" />
                          <div>
                            <div className="text-xs text-gray-400">Processing Level</div>
                            <div className="text-white text-sm">
                              {collection.processing_level_id}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Spatial Coverage */}
                    {collection.boxes && collection.boxes.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Spatial Coverage:</div>
                        <div className="bg-gray-800/50 rounded p-3">
                          {collection.boxes.map((box: string, idx: number) => (
                            <div key={idx} className="text-sm text-gray-300">
                              Bounding Box: {box}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links */}
                    {collection.links && collection.links.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Related Links:</div>
                        <div className="flex flex-wrap gap-2">
                          {collection.links.slice(0, 3).map((link: any, idx: number) => (
                            <a
                              key={idx}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded text-xs hover:bg-blue-600/30 transition-colors"
                            >
                              {link.title || link.rel || 'Link'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Temporal Coverage */}
                    {(collection.time_start || collection.time_end) && (
                      <div className="pt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400 mb-2">Temporal Coverage:</div>
                        <div className="flex space-x-4 text-sm">
                          {collection.time_start && (
                            <div>
                              <span className="text-gray-400">Start:</span>
                              <span className="text-white ml-2">
                                {new Date(collection.time_start).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {collection.time_end && (
                            <div>
                              <span className="text-gray-400">End:</span>
                              <span className="text-white ml-2">
                                {new Date(collection.time_end).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Collections Found</h3>
              <p className="text-gray-400 mb-4">
                No Earth observation datasets found for "{keyword}".
              </p>
              <p className="text-sm text-gray-500">
                Try different keywords like MODIS, LANDSAT, or AIRS.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Popular Datasets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card bg-green-500/10 border-green-500/30"
      >
        <h3 className="text-xl font-semibold text-white mb-4">Popular Earth Observation Datasets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-2">Satellite Missions</h4>
            <ul className="space-y-1">
              <li>• <strong>MODIS:</strong> Moderate Resolution Imaging Spectroradiometer</li>
              <li>• <strong>LANDSAT:</strong> Land surface imaging and monitoring</li>
              <li>• <strong>AIRS:</strong> Atmospheric Infrared Sounder</li>
              <li>• <strong>GRACE:</strong> Gravity Recovery and Climate Experiment</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Data Types</h4>
            <ul className="space-y-1">
              <li>• <strong>Land Surface:</strong> Vegetation, land cover, surface temperature</li>
              <li>• <strong>Atmosphere:</strong> Clouds, aerosols, atmospheric profiles</li>
              <li>• <strong>Ocean:</strong> Sea surface temperature, ocean color</li>
              <li>• <strong>Cryosphere:</strong> Snow cover, sea ice, glaciers</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default EarthdataSearch