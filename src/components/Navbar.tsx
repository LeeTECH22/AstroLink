import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Rocket from 'lucide-react/dist/esm/icons/rocket'
import Menu from 'lucide-react/dist/esm/icons/menu'
import X from 'lucide-react/dist/esm/icons/x'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import Home from 'lucide-react/dist/esm/icons/home'
import Camera from 'lucide-react/dist/esm/icons/camera'
import Satellite from 'lucide-react/dist/esm/icons/satellite'
import Zap from 'lucide-react/dist/esm/icons/zap'
import Globe from 'lucide-react/dist/esm/icons/globe'
import MapPin from 'lucide-react/dist/esm/icons/map-pin'
import Image from 'lucide-react/dist/esm/icons/image'
import Info from 'lucide-react/dist/esm/icons/info'
import Sun from 'lucide-react/dist/esm/icons/sun'
import Activity from 'lucide-react/dist/esm/icons/activity'
import Microscope from 'lucide-react/dist/esm/icons/microscope'
import Database from 'lucide-react/dist/esm/icons/database'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles'
import Layers from 'lucide-react/dist/esm/icons/layers'
import Compass from 'lucide-react/dist/esm/icons/compass'
import BrainCircuit from 'lucide-react/dist/esm/icons/brain-circuit'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Missions & Sky',
    items: [
      { path: '/', label: 'Dashboard', icon: Home },
      { path: '/apod', label: 'APOD', icon: Camera },
      { path: '/mars-rover', label: 'Mars Rover', icon: Satellite },
      { path: '/neo', label: 'Near Earth Objects', icon: Zap },
      { path: '/space-weather', label: 'Space Weather', icon: Sun },
      { path: '/small-bodies', label: 'Small Bodies', icon: Zap },
    ],
  },
  {
    label: 'Earth & Climate',
    items: [
      { path: '/earth-images', label: 'Earth Images', icon: Globe },
      { path: '/natural-events', label: 'Natural Events', icon: MapPin },
      { path: '/power-data', label: 'Climate Data', icon: Sun },
      { path: '/earth-trends', label: 'Earth Trends', icon: Activity },
      { path: '/earthdata-search', label: 'Earth Data', icon: Database },
    ],
  },
  {
    label: 'Data & Engineering',
    items: [
      { path: '/data-explorer', label: 'Data Explorer', icon: Layers },
      { path: '/geospatial', label: 'Geospatial', icon: Compass },
      { path: '/image-library', label: 'Image Library', icon: Image },
      { path: '/techport', label: 'TechPort', icon: Rocket },
      { path: '/exoplanets', label: 'Exoplanets', icon: Microscope },
      { path: '/astrophysics-data', label: 'Research Papers', icon: Database },
    ],
  },
]

const AI_GROUP: NavGroup = {
  label: 'AI Research',
  items: [
    { path: '/nasa-ai-research', label: 'NASA AI Research', icon: BrainCircuit },
    { path: '/intelligence', label: 'Intelligence', icon: Sparkles },
  ],
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const location = useLocation()
  const navRef = useRef<HTMLDivElement | null>(null)

  // Close menus on navigation and when clicking outside.
  useEffect(() => {
    setIsOpen(false)
    setOpenGroup(null)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const isActive = (path: string) => location.pathname === path
  const groupActive = (group: NavGroup) => group.items.some((i) => isActive(i.path))

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: 'rgba(8, 13, 27, 0.85)', borderColor: 'var(--surface-border)', backdropFilter: 'blur(12px)' }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Rocket className="h-7 w-7 text-brand" />
            <span className="text-lg font-bold text-ink">AstroLink</span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="relative">
                <button
                  onClick={() => setOpenGroup((g) => (g === group.label ? null : group.label))}
                  aria-expanded={openGroup === group.label}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    groupActive(group) ? 'bg-brand/15 text-ink' : 'text-ink-soft hover:bg-surface-elevated hover:text-ink'
                  }`}
                >
                  {group.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openGroup === group.label ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openGroup === group.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="card absolute left-0 top-full mt-2 w-64 p-2"
                    >
                      {group.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isActive(item.path) ? 'bg-brand/15 text-ink' : 'text-ink-soft hover:bg-surface-elevated hover:text-ink'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* AI Research group promoted to a highlighted entry */}
            <Link
              to="/nasa-ai-research"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive('/nasa-ai-research') ? 'bg-brand text-white' : 'bg-brand/15 text-brand hover:bg-brand/25'
              }`}
            >
              <BrainCircuit className="h-4 w-4" />
              NASA AI Research
            </Link>

            <Link
              to="/intelligence"
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive('/intelligence') ? 'bg-brand/15 text-ink' : 'text-ink-soft hover:bg-surface-elevated hover:text-ink'
              }`}
            >
              Intelligence
            </Link>

            <Link
              to="/about"
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive('/about') ? 'bg-brand/15 text-ink' : 'text-ink-soft hover:bg-surface-elevated hover:text-ink'
              }`}
            >
              About
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-surface-elevated hover:text-ink lg:hidden"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden lg:hidden"
            >
              <div className="space-y-4 pb-4 pt-1">
                {[...NAV_GROUPS, AI_GROUP].map((group) => (
                  <div key={group.label}>
                    <p className="label px-1">{group.label}</p>
                    <div className="mt-1 space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                              isActive(item.path) ? 'bg-brand/15 text-ink' : 'text-ink-soft hover:bg-surface-elevated hover:text-ink'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <Link
                  to="/about"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive('/about') ? 'bg-brand/15 text-ink' : 'text-ink-soft hover:bg-surface-elevated hover:text-ink'
                  }`}
                >
                  <Info className="h-4 w-4 shrink-0" />
                  About
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navbar
