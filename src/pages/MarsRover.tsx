import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Satellite, Camera, Calendar, Filter } from 'lucide-react'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const MarsRover = () => {
  const [rover, setRover] = useState('curiosity')
  const [sol, setSol] = useState('1000')
  const [camera, setCamera] = useState('')

  const { data, isLoading, error, refetch } = useQuery(
    ['mars-photos', rover, sol, camera],
    () => nasaApi.getMarsPhotos(rover, sol, camera),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
    }
  )

  const rovers = [
    { value: 'curiosity', label: 'Curiosity', active: true },
    { value: 'opportunity', label: 'Opportunity', active: false },
    { value: 'spirit', label: 'Spirit', active: false },
    { value: 'perseverance', label: 'Perseverance', active: true },
  ]

  const cameras = {
    curiosity: [
      { value: '', label: 'All Cameras' },
      { value: 'FHAZ', label: 'Front Hazard Avoidance Camera' },
      { value: 'RHAZ', label: 'Rear Hazard Avoidance Camera' },
      { value: 'MAST', label: 'Mast Camera' },
      { value: 'CHEMCAM', label: 'Chemistry and Camera Complex' },
      { value: 'MAHLI', label: 'Mars Hand Lens Imager' },
      { value: 'MARDI', label: 'Mars Descent Imager' },
      { value: 'NAVCAM', label: 'Navigation Camera' },
    ],
    perseverance: [
      { value: '', label: 'All Cameras' },
      { value: 'EDL_RUCAM', label: 'Rover Up-Look Camera' },
      { value: 'EDL_RDCAM', label: 'Rover Down-Look Camera' },
      { value: 'EDL_DDCAM', label: 'Descent Stage Down-Look Camera' },
      { value: 'EDL_PUCAM1', label: 'Parachute Up-Look Camera A' },
      { value: 'EDL_PUCAM2', label: 'Parachute Up-Look Camera B' },
      { value: 'NAVCAM_LEFT', label: 'Navigation Camera - Left' },
      { value: 'NAVCAM_RIGHT', label: 'Navigation Camera - Right' },
      { value: 'MCZ_RIGHT', label: 'Mast Camera Zoom - Right' },
      { value: 'MCZ_LEFT', label: 'Mast Camera Zoom - Left' },
      { value: 'FRONT_HAZCAM_LEFT_A', label: 'Front Hazard Camera - Left' },
      { value: 'FRONT_HAZCAM_RIGHT_A', label: 'Front Hazard Camera - Right' },
      { value: 'REAR_HAZCAM_LEFT', label: 'Rear Hazard Camera - Left' },
      { value: 'REAR_HAZCAM_RIGHT', label: 'Rear Hazard Camera - Right' },
    ],
    opportunity: [
      { value: '', label: 'All Cameras' },
      { value: 'FHAZ', label: 'Front Hazard Avoidance Camera' },
      { value: 'RHAZ', label: 'Rear Hazard Avoidance Camera' },
      { value: 'NAVCAM', label: 'Navigation Camera' },
      { value: 'PANCAM', label: 'Panoramic Camera' },
      { value: 'MINITES', label: 'Miniature Thermal Emission Spectrometer' },
    ],
    spirit: [
      { value: '', label: 'All Cameras' },
      { value: 'FHAZ', label: 'Front Hazard Avoidance Camera' },
      { value: 'RHAZ', label: 'Rear Hazard Avoidance Camera' },
      { value: 'NAVCAM', label: 'Navigation Camera' },
      { value: 'PANCAM', label: 'Panoramic Camera' },
      { value: 'MINITES', label: 'Miniature Thermal Emission Spectrometer' },
    ],
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading Mars rover photos..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load Mars rover photos. Please try again."
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
          <Satellite className="h-8 w-8 text-red-400" />
          <h1 className="text-4xl font-bold text-white">Mars Rover Photos</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Explore the Red Planet through the eyes of NASA's Mars rovers. 
          View stunning photos captured by various cameras on different missions.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card space-y-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Filter Photos</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rover Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Rover
            </label>
            <select
              value={rover}
              onChange={(e) => {
                setRover(e.target.value)
                setCamera('') // Reset camera when rover changes
              }}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {rovers.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} {r.active ? '(Active)' : '(Inactive)'}
                </option>
              ))}
            </select>
          </div>

          {/* Sol (Martian Day) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sol (Martian Day)
            </label>
            <input
              type="number"
              value={sol}
              onChange={(e) => setSol(e.target.value)}
              min="0"
              max="4000"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1000"
            />
          </div>

          {/* Camera Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Camera
            </label>
            <select
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {cameras[rover as keyof typeof cameras]?.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-400">
          <p><strong>Sol:</strong> A Martian day (about 24 hours and 37 minutes)</p>
          <p><strong>Tip:</strong> Try Sol 1000-2000 for Curiosity, or Sol 1-100 for newer rovers</p>
        </div>
      </motion.div>

      {/* Photos Grid */}
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
                <Camera className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  {data.photos?.length || 0} photos found
                </span>
              </div>
              {data.photos?.length > 0 && (
                <div className="text-sm text-gray-400">
                  Rover: {rover.charAt(0).toUpperCase() + rover.slice(1)} | Sol: {sol}
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          {data.photos?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.photos.slice(0, 12).map((photo: any, index: number) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="card card-hover group"
                >
                  <div className="aspect-square overflow-hidden rounded-lg mb-4">
                    <img
                      src={photo.img_src}
                      alt={`Mars photo from ${photo.rover.name}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white">
                      {photo.camera.full_name}
                    </h4>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Rover: {photo.rover.name}</p>
                      <p>Sol: {photo.sol}</p>
                      <p>Earth Date: {photo.earth_date}</p>
                      <p>Camera: {photo.camera.name}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => window.open(photo.img_src, '_blank')}
                    className="mt-4 w-full btn-primary text-sm"
                  >
                    View Full Size
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Photos Found</h3>
              <p className="text-gray-400 mb-4">
                No photos were found for the selected rover, sol, and camera combination.
              </p>
              <p className="text-sm text-gray-500">
                Try adjusting the Sol number or selecting a different camera.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default MarsRover