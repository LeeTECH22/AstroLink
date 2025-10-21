import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Zap, Search, Info, Calendar } from 'lucide-react'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const SmallBodies = () => {
  const [searchTerm, setSearchTerm] = useState('433') // Default to asteroid Eros

  const { data, isLoading, error, refetch } = useQuery(
    ['small-bodies', searchTerm],
    () => nasaApi.getSmallBodyData(searchTerm),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
      enabled: searchTerm.length > 0,
    }
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading small body data..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load small body data. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const object = data?.object

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Zap className="h-8 w-8 text-orange-400" />
          <h1 className="text-4xl font-bold text-white">Small Body Database</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Explore NASA's JPL Small-Body Database for detailed information about 
          asteroids, comets, and other small solar system bodies.
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Search Small Bodies</h3>
          </div>
          
          <div className="flex space-x-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter asteroid/comet name or number (e.g., 433, Eros, Halley)"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
          </div>
          
          <div className="text-sm text-gray-400">
            <p><strong>Examples:</strong> 433 (Eros), 1 (Ceres), 2060 (Chiron), 1P (Halley)</p>
          </div>
        </form>
      </motion.div>

      {/* Results */}
      {object && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-4">
              {object.fullname || object.des || 'Unknown Object'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Identification</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">SPK-ID:</span>
                    <span className="text-white">{object.spkid || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Designation:</span>
                    <span className="text-white">{object.des || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Object Kind:</span>
                    <span className="text-white">{object.kind || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {object.orbit && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Orbital Elements</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Semi-major axis:</span>
                      <span className="text-white">{object.orbit.a ? `${parseFloat(object.orbit.a).toFixed(3)} AU` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Eccentricity:</span>
                      <span className="text-white">{object.orbit.e ? parseFloat(object.orbit.e).toFixed(4) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Inclination:</span>
                      <span className="text-white">{object.orbit.i ? `${parseFloat(object.orbit.i).toFixed(2)}°` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Period:</span>
                      <span className="text-white">{object.orbit.per ? `${parseFloat(object.orbit.per).toFixed(2)} years` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {object.phys_par && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Physical Parameters</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Diameter:</span>
                      <span className="text-white">{object.phys_par.diameter ? `${object.phys_par.diameter} km` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rotation Period:</span>
                      <span className="text-white">{object.phys_par.rot_per ? `${object.phys_par.rot_per} hours` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Absolute Magnitude:</span>
                      <span className="text-white">{object.phys_par.H || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Orbital Data */}
          {object.orbit && (
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Detailed Orbital Elements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Perihelion Distance:</span>
                    <span className="text-white">{object.orbit.q ? `${parseFloat(object.orbit.q).toFixed(3)} AU` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aphelion Distance:</span>
                    <span className="text-white">{object.orbit.ad ? `${parseFloat(object.orbit.ad).toFixed(3)} AU` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Longitude of Ascending Node:</span>
                    <span className="text-white">{object.orbit.om ? `${parseFloat(object.orbit.om).toFixed(2)}°` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Argument of Perihelion:</span>
                    <span className="text-white">{object.orbit.w ? `${parseFloat(object.orbit.w).toFixed(2)}°` : 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mean Anomaly:</span>
                    <span className="text-white">{object.orbit.ma ? `${parseFloat(object.orbit.ma).toFixed(2)}°` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Epoch:</span>
                    <span className="text-white">{object.orbit.epoch || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reference:</span>
                    <span className="text-white">{object.orbit.ref || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Producer:</span>
                    <span className="text-white">{object.orbit.producer || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close Approach Data */}
          {object.ca && object.ca.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Close Approaches</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-300">Date</th>
                      <th className="text-left py-3 px-4 text-gray-300">Distance (AU)</th>
                      <th className="text-left py-3 px-4 text-gray-300">Velocity (km/s)</th>
                      <th className="text-left py-3 px-4 text-gray-300">Body</th>
                    </tr>
                  </thead>
                  <tbody>
                    {object.ca.slice(0, 10).map((approach: any, index: number) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-white">
                          {approach.cd || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {approach.dist ? parseFloat(approach.dist).toFixed(4) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {approach.v_rel ? parseFloat(approach.v_rel).toFixed(2) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {approach.body || 'Earth'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card bg-orange-500/10 border-orange-500/30"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Info className="h-6 w-6 text-orange-400" />
          <h3 className="text-xl font-semibold text-white">About Small Bodies</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-2">Asteroids</h4>
            <p>
              Rocky objects that orbit the Sun, mostly found in the asteroid belt between 
              Mars and Jupiter. They range from small rocks to objects hundreds of kilometers across.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Comets</h4>
            <p>
              Icy objects from the outer solar system that develop tails when approaching the Sun. 
              They provide insights into the early formation of our solar system.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SmallBodies