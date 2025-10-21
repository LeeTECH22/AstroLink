
import { Routes, Route } from 'react-router-dom'
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
import TechPort from './pages/TechPort'
import Exoplanets from './pages/Exoplanets'
import SmallBodies from './pages/SmallBodies'
import EarthdataSearch from './pages/EarthdataSearch'
import AstrophysicsData from './pages/AstrophysicsData'
import About from './pages/About'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
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
          <Route path="/techport" element={<TechPort />} />
          <Route path="/exoplanets" element={<Exoplanets />} />
          <Route path="/small-bodies" element={<SmallBodies />} />
          <Route path="/earthdata-search" element={<EarthdataSearch />} />
          <Route path="/astrophysics-data" element={<AstrophysicsData />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </motion.main>
    </div>
  )
}

export default App