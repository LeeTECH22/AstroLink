
import { motion } from 'framer-motion'
import { 
  Info, 
  Rocket, 
  Globe, 
  Satellite, 
  Camera, 
  Zap, 
  ExternalLink,
  Github,
  Star,
  Sun,
  MapPin,
  Image,
  Database,
  Microscope
} from 'lucide-react'

const About = () => {
  const apis = [
    {
      name: 'APOD',
      description: 'Astronomy Picture of the Day',
      icon: Camera,
      endpoint: '/planetary/apod',
      features: ['Daily space images', 'Historical archive', 'HD versions', 'Detailed explanations']
    },
    {
      name: 'Mars Rover Photos',
      description: 'Images from Mars rovers',
      icon: Satellite,
      endpoint: '/mars-photos/api/v1/rovers',
      features: ['Multiple rovers', 'Camera filters', 'Sol-based search', 'High resolution']
    },
    {
      name: 'Near Earth Objects',
      description: 'Asteroid tracking data',
      icon: Zap,
      endpoint: '/neo/rest/v1/feed',
      features: ['Asteroid tracking', 'Size estimates', 'Approach dates', 'Hazard assessment']
    },
    {
      name: 'DONKI',
      description: 'Space weather events',
      icon: Sun,
      endpoint: '/DONKI',
      features: ['Solar flares', 'CME tracking', 'Geomagnetic storms', 'Real-time alerts']
    },
    {
      name: 'EPIC',
      description: 'Earth imagery from space',
      icon: Globe,
      endpoint: '/EPIC/api/natural',
      features: ['Full Earth images', 'Natural color', 'Daily updates', 'Coordinate data']
    },
    {
      name: 'EONET',
      description: 'Natural event tracking',
      icon: MapPin,
      endpoint: 'https://eonet.gsfc.nasa.gov/api/v3/events',
      features: ['Disaster tracking', 'Real-time events', 'Geographic data', 'Multiple categories']
    },
    {
      name: 'NASA Image Library',
      description: 'Space imagery collection',
      icon: Image,
      endpoint: 'https://images-api.nasa.gov/search',
      features: ['Image search', 'Video content', 'Audio files', 'Mission archives']
    },
    {
      name: 'POWER',
      description: 'Climate and solar energy data',
      icon: Sun,
      endpoint: 'https://power.larc.nasa.gov/api',
      features: ['Global climate data', 'Solar radiation', 'Temperature records', 'Energy analysis']
    },
    {
      name: 'TechPort',
      description: 'NASA technology projects',
      icon: Rocket,
      endpoint: '/techport/api/projects',
      features: ['Technology portfolio', 'Project details', 'Innovation tracking', 'Research programs']
    },
    {
      name: 'Small Body Database',
      description: 'Asteroid and comet data',
      icon: Zap,
      endpoint: 'https://ssd-api.jpl.nasa.gov/sbdb.api',
      features: ['Orbital elements', 'Physical parameters', 'Close approaches', 'Discovery data']
    },
    {
      name: 'Earthdata Search',
      description: 'Earth observation datasets',
      icon: Globe,
      endpoint: 'https://cmr.earthdata.nasa.gov/search',
      features: ['Satellite data', 'Collection metadata', 'Temporal coverage', 'Spatial search']
    },
    {
      name: 'Exoplanet Archive',
      description: 'Confirmed exoplanets',
      icon: Star,
      endpoint: 'https://exoplanetarchive.ipac.caltech.edu/TAP',
      features: ['Planet properties', 'Host star data', 'Discovery methods', 'Habitability metrics']
    }
  ]

  const technologies = [
    { name: 'React 18', description: 'Modern UI framework with hooks and concurrent features' },
    { name: 'TypeScript', description: 'Type-safe JavaScript for better development experience' },
    { name: 'Tailwind CSS', description: 'Utility-first CSS framework for rapid styling' },
    { name: 'Framer Motion', description: 'Production-ready motion library for React' },
    { name: 'React Query', description: 'Data fetching and caching library' },
    { name: 'Chart.js', description: 'Interactive charts and data visualization' },
    { name: 'Leaflet', description: 'Open-source interactive maps' },
    { name: 'Express.js', description: 'Backend server for API proxy and security' },
    { name: 'Vite', description: 'Fast build tool and development server' }
  ]

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <div className="flex items-center justify-center space-x-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Rocket className="h-12 w-12 text-blue-400" />
          </motion.div>
          <h1 className="text-5xl font-bold text-white">About AstroLink</h1>
        </div>
        
        <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
          A comprehensive web application that integrates multiple NASA public APIs to provide 
          an interactive platform for exploring space data, from daily astronomy pictures to 
          real-time space weather monitoring.
        </p>
        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-lg text-blue-300">
            <strong>Developer:</strong> Bruce Lee
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Passionate about space exploration and making NASA's incredible data accessible to everyone.
          </p>
        </div>
      </motion.div>

      {/* Project Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Info className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Project Overview</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Mission</h3>
            <p className="text-gray-300 leading-relaxed">
              To make NASA's incredible space data accessible and engaging for everyone. 
              This project demonstrates how modern web technologies can be used to create 
              immersive experiences with real scientific data.
            </p>
            
            <h3 className="text-xl font-semibold text-white">Features</h3>
            <ul className="text-gray-300 space-y-2">
              <li className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>Real-time data from 7+ NASA APIs</span>
              </li>
              <li className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>Interactive charts and visualizations</span>
              </li>
              <li className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>Responsive design for all devices</span>
              </li>
              <li className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>Dark space-themed UI</span>
              </li>
              <li className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>Interactive maps and data filtering</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Architecture</h3>
            <p className="text-gray-300 leading-relaxed">
              Built with a modern full-stack architecture featuring a React frontend 
              with TypeScript, an Express.js backend for API proxying, and comprehensive 
              data visualization capabilities.
            </p>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Tech Stack Highlights</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                <div>• React 18 + TypeScript</div>
                <div>• Express.js Backend</div>
                <div>• Tailwind CSS</div>
                <div>• Chart.js Visualizations</div>
                <div>• Leaflet Maps</div>
                <div>• Framer Motion</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* NASA APIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-6"
      >
        <h2 className="text-3xl font-bold text-white text-center">Integrated NASA APIs</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apis.map((api, index) => {
            const Icon = api.icon
            return (
              <motion.div
                key={api.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                className="card card-hover"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{api.name}</h3>
                    <p className="text-sm text-gray-400">{api.description}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded p-2">
                    <code className="text-xs text-green-400">{api.endpoint}</code>
                  </div>
                  
                  <ul className="space-y-1">
                    {api.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-center space-x-2">
                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Technologies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Technologies Used</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="bg-gray-800/50 rounded-lg p-4"
            >
              <h4 className="text-white font-semibold mb-2">{tech.name}</h4>
              <p className="text-gray-400 text-sm">{tech.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Getting Started */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card bg-blue-500/10 border-blue-500/30"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Getting Started</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">For Users</h3>
            <ol className="space-y-3 text-gray-300">
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span>Navigate through different sections using the top navigation</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span>Explore real NASA data with interactive filters and controls</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span>View detailed information and download high-resolution images</span>
              </li>
            </ol>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">For Developers</h3>
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <code className="text-green-400 text-sm">
                  npm install<br/>
                  npm run dev:full
                </code>
              </div>
              <p className="text-gray-300 text-sm">
                Get your free NASA API key at{' '}
                <a 
                  href="https://api.nasa.gov/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-1"
                >
                  <span>api.nasa.gov</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="text-center space-y-6"
      >
        <h2 className="text-2xl font-bold text-white">Explore More</h2>
        
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://api.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Rocket className="h-4 w-4" />
            <span>NASA Open Data</span>
            <ExternalLink className="h-4 w-4" />
          </a>
          
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center space-x-2"
          >
            <Github className="h-4 w-4" />
            <span>View Source Code</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        
        <p className="text-gray-400 text-sm">
          Built with ❤️ for space exploration enthusiasts and developers
        </p>
      </motion.div>
    </div>
  )
}

export default About