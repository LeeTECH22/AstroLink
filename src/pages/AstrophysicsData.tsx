import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { BookOpen, Search, Star, Calendar, User } from 'lucide-react'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const AstrophysicsData = () => {
  const [query, setQuery] = useState('black hole')
  const [rows, setRows] = useState(10)

  const { data, isLoading, error, refetch } = useQuery(
    ['ads-data', query, rows],
    () => nasaApi.getADSData(query, rows),
    {
      select: (response) => response.data,
      staleTime: 10 * 60 * 1000,
    }
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  if (isLoading) {
    return <LoadingSpinner text="Searching astrophysics literature..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to search astrophysics data. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  // Since ADS requires separate authentication, we'll show mock data with explanation
  const mockResults = data?.mockResults || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <BookOpen className="h-8 w-8 text-indigo-400" />
          <h1 className="text-4xl font-bold text-white">Astrophysics Data System</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Search NASA's Astrophysics Data System (ADS) for research papers, 
          preprints, and conference proceedings in astronomy and astrophysics.
        </p>
      </motion.div>

      {/* Search Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Search Literature</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Query
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., black hole, exoplanet, dark matter, supernova"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Results
              </label>
              <select
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 papers</option>
                <option value={10}>10 papers</option>
                <option value={20}>20 papers</option>
                <option value={50}>50 papers</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn-primary">
            Search Papers
          </button>
          
          <div className="text-sm text-gray-400">
            <p><strong>Popular topics:</strong> black hole, exoplanet, dark matter, gravitational waves, supernova</p>
          </div>
        </form>
      </motion.div>

      {/* API Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-yellow-500/10 border-yellow-500/30"
      >
        <div className="flex items-start space-x-3">
          <Star className="h-6 w-6 text-yellow-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">ADS API Authentication Required</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              The NASA Astrophysics Data System (ADS) requires separate API authentication. 
              To access real ADS data, you would need to register at{' '}
              <a 
                href="https://ui.adsabs.harvard.edu/user/account/login" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                ui.adsabs.harvard.edu
              </a>{' '}
              and obtain an API token. Below is a demonstration of how the results would appear.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Mock Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-6"
      >
        {/* Summary */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">
                Sample results for "{query}"
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Demo Mode
            </div>
          </div>
        </div>

        {/* Sample Papers */}
        <div className="space-y-6">
          {[
            {
              title: "Observational Evidence for Black Hole Event Horizons",
              authors: ["Smith, J.", "Johnson, A.", "Williams, R."],
              year: "2024",
              journal: "Astrophysical Journal",
              abstract: "We present new observational evidence for the existence of event horizons around stellar-mass black holes using high-resolution X-ray spectroscopy. Our analysis of accretion disk signatures provides compelling support for general relativistic predictions.",
              citations: 127,
              bibcode: "2024ApJ...901..123S"
            },
            {
              title: "Machine Learning Approaches to Black Hole Mass Estimation",
              authors: ["Chen, L.", "Rodriguez, M.", "Thompson, K."],
              year: "2024",
              journal: "Monthly Notices of the Royal Astronomical Society",
              abstract: "We develop novel machine learning algorithms to estimate black hole masses from photometric and spectroscopic observations. Our method shows significant improvement over traditional scaling relations.",
              citations: 89,
              bibcode: "2024MNRAS.512.1456C"
            },
            {
              title: "Gravitational Wave Signatures from Black Hole Mergers",
              authors: ["Patel, S.", "Anderson, D.", "Lee, H."],
              year: "2023",
              journal: "Physical Review D",
              abstract: "Analysis of LIGO-Virgo data reveals new insights into the population of merging black holes and their formation mechanisms in dense stellar environments.",
              citations: 203,
              bibcode: "2023PhRvD.108f4032P"
            }
          ].map((paper, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="card card-hover"
            >
              <div className="space-y-4">
                {/* Paper Title */}
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {paper.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Bibcode: {paper.bibcode}</span>
                    <span>Citations: {paper.citations}</span>
                  </div>
                </div>

                {/* Authors and Publication */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-blue-400" />
                    <div>
                      <div className="text-xs text-gray-400">Authors</div>
                      <div className="text-white text-sm">
                        {paper.authors.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-400" />
                    <div>
                      <div className="text-xs text-gray-400">Publication</div>
                      <div className="text-white text-sm">
                        {paper.journal} ({paper.year})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Abstract */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Abstract:</div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {paper.abstract}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t border-gray-700">
                  <button className="btn-primary text-sm">
                    View Full Text
                  </button>
                  <button className="btn-secondary text-sm">
                    Export Citation
                  </button>
                  <button className="btn-secondary text-sm">
                    Similar Papers
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* About ADS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card bg-indigo-500/10 border-indigo-500/30"
      >
        <h3 className="text-xl font-semibold text-white mb-4">About NASA ADS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-2">Database Coverage</h4>
            <p>
              The NASA Astrophysics Data System (ADS) is a digital library portal 
              containing over 15 million records of publications in astronomy, 
              astrophysics, physics, and geophysics.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Search Features</h4>
            <p>
              ADS provides advanced search capabilities including author searches, 
              citation analysis, full-text search, and bibliometric tools for 
              research analysis and discovery.
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-indigo-500/30">
          <p className="text-sm text-gray-400">
            <strong>Note:</strong> To implement real ADS functionality, register at{' '}
            <a 
              href="https://ui.adsabs.harvard.edu/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              ui.adsabs.harvard.edu
            </a>{' '}
            and obtain an API token.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default AstrophysicsData