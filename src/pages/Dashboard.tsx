
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Camera, 
  Satellite, 
  Zap, 
  Globe, 
  MapPin, 
  Image, 
  Rocket,
  Star,
  Moon,
  Sun,
  Microscope,
  Database
} from 'lucide-react'

const Dashboard = () => {
  const features = [
    {
      title: 'Astronomy Picture of the Day',
      description: 'Discover the cosmos with NASA\'s daily featured space image',
      icon: Camera,
      path: '/apod',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/20'
    },
    {
      title: 'Mars Rover Photos',
      description: 'Explore the Red Planet through the eyes of NASA\'s rovers',
      icon: Satellite,
      path: '/mars-rover',
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-500/20'
    },
    {
      title: 'Near Earth Objects',
      description: 'Track asteroids and comets approaching our planet',
      icon: Zap,
      path: '/neo',
      color: 'from-yellow-500 to-red-500',
      bgColor: 'bg-yellow-500/20'
    },
    {
      title: 'Space Weather',
      description: 'Monitor solar flares and space weather events',
      icon: Sun,
      path: '/space-weather',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/20'
    },
    {
      title: 'Earth Images',
      description: 'View our planet from space with EPIC satellite imagery',
      icon: Globe,
      path: '/earth-images',
      color: 'from-blue-500 to-green-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Natural Events',
      description: 'Track natural disasters and events around the world',
      icon: MapPin,
      path: '/natural-events',
      color: 'from-green-500 to-teal-500',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Image Library',
      description: 'Search NASA\'s vast collection of space imagery',
      icon: Image,
      path: '/image-library',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-500/20'
    },
    {
      title: 'Climate Data (POWER)',
      description: 'Access worldwide climate and solar energy data',
      icon: Sun,
      path: '/power-data',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/20'
    },
    {
      title: 'NASA TechPort',
      description: 'Explore NASA\'s technology projects and innovations',
      icon: Rocket,
      path: '/techport',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/20'
    },
    {
      title: 'Exoplanet Archive',
      description: 'Discover planets beyond our solar system',
      icon: Microscope,
      path: '/exoplanets',
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-500/20'
    },
    {
      title: 'Small Body Database',
      description: 'Explore asteroids, comets, and small solar system bodies',
      icon: Zap,
      path: '/small-bodies',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/20'
    },
    {
      title: 'Earth Data Search',
      description: 'Search NASA\'s Earth observation datasets',
      icon: Database,
      path: '/earthdata-search',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/20'
    },
    {
      title: 'Astrophysics Research',
      description: 'Access NASA\'s astrophysics research database',
      icon: Database,
      path: '/astrophysics-data',
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-500/20'
    }
  ]

  const stats = [
    { label: 'NASA APIs Integrated', value: '15+', icon: Rocket },
    { label: 'Real-time Data Sources', value: '10+', icon: Satellite },
    { label: 'Interactive Features', value: '25+', icon: Star },
    { label: 'Space Missions Covered', value: '50+', icon: Moon }
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="inline-block"
        >
          <Rocket className="h-20 w-20 text-blue-400 mx-auto" />
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AstroLink
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Explore the cosmos with real-time data from NASA's public APIs. 
          Discover space missions, track asteroids, monitor space weather, and more.
        </p>
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200/50">
          <p className="text-sm text-gray-600">
            Developed with ❤️ by <span className="text-blue-600 font-semibold">Bruce Lee</span>
          </p>
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link to="/apod" className="btn-primary">
            Start Exploring
          </Link>
          <Link to="/about" className="btn-secondary">
            Learn More
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className="card text-center"
            >
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mb-3 w-fit mx-auto">
                <Icon className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-8"
      >
        <h2 className="text-3xl font-bold text-gray-800 text-center">
          Explore NASA's Universe
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <Link to={feature.path} className="block">
                  <div className="card card-hover border-2 border-transparent group-hover:border-blue-200 group-hover:shadow-xl">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                    
                    <div className="mt-4 text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors flex items-center">
                      Explore <span className="ml-1">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="card text-center bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
      >
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Ready to Explore the Cosmos?
        </h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Start your journey through space with real NASA data. From daily astronomy pictures 
          to Mars rover photos, discover the wonders of our universe.
        </p>
        <Link to="/apod" className="btn-primary">
          Begin Your Space Journey
        </Link>
      </motion.div>
    </div>
  )
}

export default Dashboard