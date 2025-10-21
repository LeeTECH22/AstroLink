
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Sun, Zap, AlertTriangle, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const SpaceWeather = () => {
  const { data, isLoading, error, refetch } = useQuery(
    ['space-weather'],
    () => nasaApi.getSpaceWeather('all'),
    {
      select: (response) => response.data,
      staleTime: 5 * 60 * 1000,
    }
  )

  if (isLoading) {
    return <LoadingSpinner text="Loading space weather data..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load space weather data. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const solarFlares = data?.solarFlares || []
  const cmes = data?.cmes || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Sun className="h-8 w-8 text-orange-400" />
          <h1 className="text-4xl font-bold text-white">Space Weather</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Monitor solar activity and space weather events that can affect Earth's 
          magnetosphere, satellites, and communication systems.
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="card text-center">
          <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">{solarFlares.length}</div>
          <div className="text-gray-300">Solar Flares (7 days)</div>
        </div>
        <div className="card text-center">
          <Activity className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">{cmes.length}</div>
          <div className="text-gray-300">CMEs (7 days)</div>
        </div>
        <div className="card text-center">
          <AlertTriangle className="h-8 w-8 text-orange-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">
            {solarFlares.filter((flare: any) => flare.classType?.startsWith('X')).length}
          </div>
          <div className="text-gray-300">X-Class Flares</div>
        </div>
      </motion.div>

      {/* Solar Flares */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Zap className="h-6 w-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Recent Solar Flares</h2>
        </div>

        {solarFlares.length > 0 ? (
          <div className="space-y-4">
            {solarFlares.slice(0, 10).map((flare: any, index: number) => (
              <motion.div
                key={flare.flrID || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-yellow-400"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {flare.classType || 'Unknown Class'} Solar Flare
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {flare.beginTime ? format(new Date(flare.beginTime), 'PPpp') : 'Time unknown'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    flare.classType?.startsWith('X') ? 'bg-red-500 text-white' :
                    flare.classType?.startsWith('M') ? 'bg-orange-500 text-white' :
                    'bg-yellow-500 text-black'
                  }`}>
                    {flare.classType || 'Unknown'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Peak Time:</span>
                    <div className="text-white">
                      {flare.peakTime ? format(new Date(flare.peakTime), 'HH:mm:ss') : 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">End Time:</span>
                    <div className="text-white">
                      {flare.endTime ? format(new Date(flare.endTime), 'HH:mm:ss') : 'Ongoing'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Source Location:</span>
                    <div className="text-white">
                      {flare.sourceLocation || 'Unknown'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No solar flares detected in the past 7 days</p>
          </div>
        )}
      </motion.div>

      {/* Coronal Mass Ejections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="h-6 w-6 text-red-400" />
          <h2 className="text-2xl font-bold text-white">Coronal Mass Ejections (CMEs)</h2>
        </div>

        {cmes.length > 0 ? (
          <div className="space-y-4">
            {cmes.slice(0, 10).map((cme: any, index: number) => (
              <motion.div
                key={cme.activityID || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-red-400"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Coronal Mass Ejection
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {cme.startTime ? format(new Date(cme.startTime), 'PPpp') : 'Time unknown'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                    CME
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Source Location:</span>
                    <div className="text-white">
                      {cme.sourceLocation || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Note:</span>
                    <div className="text-white">
                      {cme.note || 'No additional information'}
                    </div>
                  </div>
                </div>

                {cme.cmeAnalyses && cme.cmeAnalyses.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <h4 className="text-white font-medium mb-2">Analysis:</h4>
                    {cme.cmeAnalyses.slice(0, 1).map((analysis: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Speed:</span>
                          <div className="text-white">
                            {analysis.speed ? `${analysis.speed} km/s` : 'Unknown'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Half Angle:</span>
                          <div className="text-white">
                            {analysis.halfAngle ? `${analysis.halfAngle}°` : 'Unknown'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <div className="text-white">
                            {analysis.type || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No coronal mass ejections detected in the past 7 days</p>
          </div>
        )}
      </motion.div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card bg-blue-500/10 border-blue-500/30"
      >
        <h3 className="text-xl font-semibold text-white mb-4">About Space Weather</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-2">Solar Flares</h4>
            <p>
              Solar flares are intense bursts of radiation from the Sun's surface. 
              They're classified by intensity: A, B, C, M, and X (strongest). 
              X-class flares can disrupt radio communications and GPS systems.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Coronal Mass Ejections</h4>
            <p>
              CMEs are massive bursts of solar wind and magnetic fields released from the Sun. 
              When directed toward Earth, they can cause geomagnetic storms and beautiful auroras.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SpaceWeather