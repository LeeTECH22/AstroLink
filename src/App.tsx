
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import APOD from './pages/APOD'
import MarsRover from './pages/MarsRover'
import NearEarthObjects from './pages/NearEarthObjects'
import SpaceWeather from './pages/SpaceWeather'
import EarthImages from './pages/EarthImages'
import NaturalEvents from './pages/NaturalEvents'
import ImageLibrary from './pages/ImageLibrary'
import PowerData from './pages/PowerData'
import EarthTrends from './pages/EarthTrends'
import Intelligence from './pages/Intelligence'
import NasaAiResearch from './pages/NasaAiResearch'
import DataExplorer from './pages/DataExplorer'
import Geospatial from './pages/Geospatial'
import TechPort from './pages/TechPort'
import Exoplanets from './pages/Exoplanets'
import SmallBodies from './pages/SmallBodies'
import EarthdataSearch from './pages/EarthdataSearch'
import AstrophysicsData from './pages/AstrophysicsData'
import About from './pages/About'
import ErrorBanner from './components/ErrorBanner'
import ErrorBoundary from './components/ErrorBoundary'
import Footer from './components/Footer'

const NotFound = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
    <p className="text-sm font-medium tracking-widest text-brand-cyan">ERROR 404</p>
    <h1 className="page-title mt-2">Page not found</h1>
    <p className="page-subtitle max-w-md">
      The page you requested does not exist. Use the navigation above or return to the dashboard.
    </p>
    <Link to="/" className="btn btn-primary mt-6">
      Back to Dashboard
    </Link>
  </div>
)

function App() {
  const location = useLocation()
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />
      <ErrorBanner />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto w-full flex-1 px-4 py-8"
      >
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/apod" element={<APOD />} />
            <Route path="/mars-rover" element={<MarsRover />} />
            <Route path="/neo" element={<NearEarthObjects />} />
            <Route path="/space-weather" element={<SpaceWeather />} />
            <Route path="/earth-images" element={<EarthImages />} />
            <Route path="/natural-events" element={<NaturalEvents />} />
            <Route path="/image-library" element={<ImageLibrary />} />
            <Route path="/power-data" element={<PowerData />} />
            <Route path="/earth-trends" element={<EarthTrends />} />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/nasa-ai-research" element={<NasaAiResearch />} />
            <Route path="/data-explorer" element={<DataExplorer />} />
            <Route path="/geospatial" element={<Geospatial />} />
            <Route path="/techport" element={<TechPort />} />
            <Route path="/exoplanets" element={<Exoplanets />} />
            <Route path="/small-bodies" element={<SmallBodies />} />
            <Route path="/earthdata-search" element={<EarthdataSearch />} />
            <Route path="/astrophysics-data" element={<AstrophysicsData />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </motion.main>
      <Footer />
    </div>
  )
}

export default App
