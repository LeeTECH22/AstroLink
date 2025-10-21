import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Rocket, 
  Menu, 
  X, 
  Home, 
  Camera, 
  Satellite, 
  Zap, 
  Globe, 
  MapPin, 
  Image, 
  Info,
  Sun,
  Microscope,
  Database
} from 'lucide-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/apod', label: 'APOD', icon: Camera },
    { path: '/mars-rover', label: 'Mars Rover', icon: Satellite },
    { path: '/neo', label: 'Near Earth Objects', icon: Zap },
    { path: '/space-weather', label: 'Space Weather', icon: Sun },
    { path: '/earth-images', label: 'Earth Images', icon: Globe },
    { path: '/natural-events', label: 'Natural Events', icon: MapPin },
    { path: '/image-library', label: 'Image Library', icon: Image },
    { path: '/power-data', label: 'Climate Data', icon: Sun },
    { path: '/techport', label: 'TechPort', icon: Rocket },
    { path: '/exoplanets', label: 'Exoplanets', icon: Microscope },
    { path: '/small-bodies', label: 'Small Bodies', icon: Zap },
    { path: '/earthdata-search', label: 'Earth Data', icon: Database },
    { path: '/astrophysics-data', label: 'Research Papers', icon: Database },
    { path: '/about', label: 'About', icon: Info },
  ]

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Rocket className="h-8 w-8 text-blue-400" />
            </motion.div>
            <span className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
              AstroLink
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-gray-600 hover:text-blue-600 transition-colors"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden pb-4"
          >
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  )
}

export default Navbar