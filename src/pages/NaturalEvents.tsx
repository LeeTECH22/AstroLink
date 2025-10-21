import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { MapPin, Filter, AlertTriangle, Flame, Mountain, Waves, Wind } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl

// Create custom icons for different event types
const createCustomIcon = (color: string, iconHtml: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
      ${iconHtml}
    </div>`,
    className: 'custom-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  })
}

const eventIcons = {
  wildfires: createCustomIcon('#ff4444', '🔥'),
  volcanoes: createCustomIcon('#ff6600', '🌋'),
  floods: createCustomIcon('#4488ff', '🌊'),
  earthquakes: createCustomIcon('#8844ff', '🌍'),
  severeStorms: createCustomIcon('#ffaa00', '⛈️'),
  drought: createCustomIcon('#cc8800', '🌵'),
  default: createCustomIcon('#666666', '📍'),
}

const NaturalEvents = () => {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  const { data, isLoading, error, refetch } = useQuery(
    ['natural-events', selectedCategory],
    () => nasaApi.getNaturalEvents(selectedCategory),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
    }
  )

  const categories = [
    { value: '', label: 'All Events' },
    { value: 'drought', label: 'Drought' },
    { value: 'dustHaze', label: 'Dust and Haze' },
    { value: 'earthquakes', label: 'Earthquakes' },
    { value: 'floods', label: 'Floods' },
    { value: 'landslides', label: 'Landslides' },
    { value: 'manmade', label: 'Manmade' },
    { value: 'seaLakeIce', label: 'Sea and Lake Ice' },
    { value: 'severeStorms', label: 'Severe Storms' },
    { value: 'snow', label: 'Snow' },
    { value: 'tempExtremes', label: 'Temperature Extremes' },
    { value: 'volcanoes', label: 'Volcanoes' },
    { value: 'waterColor', label: 'Water Color' },
    { value: 'wildfires', label: 'Wildfires' },
  ]

  const getEventIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      drought: '🌵',
      dustHaze: '🌫️',
      earthquakes: '🌍',
      floods: '🌊',
      landslides: '⛰️',
      manmade: '🏭',
      seaLakeIce: '🧊',
      severeStorms: '⛈️',
      snow: '❄️',
      tempExtremes: '🌡️',
      volcanoes: '🌋',
      waterColor: '💧',
      wildfires: '🔥',
    }
    return iconMap[category] || '📍'
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading natural events..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load natural events data. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const events = data?.events || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <MapPin className="h-8 w-8 text-green-400" />
          <h1 className="text-4xl font-bold text-white">Natural Events</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Track natural disasters and events around the world using NASA's 
          Earth Observatory Natural Event Tracker (EONET).
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-blue-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'map' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">{events.length}</div>
          <div className="text-gray-300">Active Events</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-red-400 mb-2">
            {events.filter((event: any) => event.categories?.some((cat: any) => 
              ['wildfires', 'volcanoes', 'severeStorms'].includes(cat.id)
            )).length}
          </div>
          <div className="text-gray-300">High Impact Events</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {new Set(events.flatMap((event: any) => 
              event.categories?.map((cat: any) => cat.id) || []
            )).size}
          </div>
          <div className="text-gray-300">Event Types</div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {viewMode === 'map' ? (
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-4">Event Locations</h3>
            <div className="h-96 rounded-lg overflow-hidden">
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {events.map((event: any) => {
                  const geometry = event.geometry?.[0]
                  if (!geometry?.coordinates) return null
                  
                  const [lng, lat] = geometry.coordinates
                  const category = event.categories?.[0]?.id || 'default'
                  const icon = eventIcons[category as keyof typeof eventIcons] || eventIcons.default
                  
                  return (
                    <Marker key={event.id} position={[lat, lng]} icon={icon}>
                      <Popup>
                        <div className="text-sm min-w-[200px]">
                          <h4 className="font-bold mb-2 text-gray-800">{event.title}</h4>
                          <div className="space-y-1">
                            <p><strong>Type:</strong> {event.categories?.[0]?.title}</p>
                            <p><strong>Date:</strong> {new Date(geometry.date).toLocaleDateString()}</p>
                            <p><strong>Location:</strong> {lat.toFixed(2)}°, {lng.toFixed(2)}°</p>
                            {geometry.magnitudeValue && (
                              <p><strong>Magnitude:</strong> {geometry.magnitudeValue} {geometry.magnitudeUnit}</p>
                            )}
                          </div>
                          {event.sources?.[0]?.url && (
                            <a 
                              href={event.sources[0].url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                            >
                              More Info
                            </a>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-4">Event List</h3>
            {events.length > 0 ? (
              <div className="space-y-4">
                {events.slice(0, 20).map((event: any) => {
                  const category = event.categories?.[0]
                  const geometry = event.geometry?.[0]
                  
                  return (
                    <div
                      key={event.id}
                      className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-green-400"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                            <span>{getEventIcon(category?.id || '')}</span>
                            <span>{event.title}</span>
                          </h4>
                          <p className="text-gray-400 text-sm">
                            {category?.title || 'Unknown Category'}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                          Active
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Location:</span>
                          <div className="text-white">
                            {geometry?.coordinates 
                              ? `${geometry.coordinates[1].toFixed(2)}°, ${geometry.coordinates[0].toFixed(2)}°`
                              : 'Unknown'
                            }
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Date:</span>
                          <div className="text-white">
                            {geometry?.date 
                              ? new Date(geometry.date).toLocaleDateString()
                              : 'Unknown'
                            }
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Source:</span>
                          <div className="text-white">
                            {event.sources?.[0]?.id || 'NASA EONET'}
                          </div>
                        </div>
                      </div>
                      
                      {event.description && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-gray-300 text-sm">{event.description}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No natural events found for the selected category</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default NaturalEvents