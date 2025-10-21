import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import { Rocket, Search, ExternalLink, Calendar, Users, DollarSign } from 'lucide-react'
import { nasaApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const TechPort = () => {
  const [projectId, setProjectId] = useState('')
  const [searchMode, setSearchMode] = useState<'all' | 'specific'>('all')

  const { data, isLoading, error, refetch } = useQuery(
    ['techport', projectId],
    () => nasaApi.getTechPortProjects(projectId || undefined),
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
    return <LoadingSpinner text="Loading NASA technology projects..." />
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load TechPort data. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const projects = searchMode === 'all' ? data?.projects || [] : [data?.project].filter(Boolean)

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <Rocket className="h-8 w-8 text-purple-400" />
          <h1 className="text-4xl font-bold text-white">NASA TechPort</h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Explore NASA's technology portfolio and research projects that are 
          advancing space exploration and benefiting life on Earth.
        </p>
      </motion.div>

      {/* Search Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Search className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Search Projects</h3>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setSearchMode('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                searchMode === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setSearchMode('specific')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                searchMode === 'specific' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Specific Project
            </button>
          </div>

          {searchMode === 'specific' && (
            <form onSubmit={handleSearch} className="flex space-x-4">
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Enter project ID (e.g., 17792)"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="btn-primary">
                Search
              </button>
            </form>
          )}
        </div>
      </motion.div>

      {/* Projects Display */}
      {data && (
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
                <Rocket className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <div className="text-sm text-gray-400">
                NASA Technology Portfolio
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length > 0 ? (
            <div className="space-y-6">
              {projects.slice(0, 20).map((project: any, index: number) => (
                <motion.div
                  key={project.projectId || project.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="card card-hover"
                >
                  <div className="space-y-4">
                    {/* Project Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {project.title || 'Untitled Project'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>ID: {project.projectId || project.id}</span>
                          {project.lastUpdated && (
                            <span>Updated: {new Date(project.lastUpdated).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          project.status === 'Active' ? 'bg-green-500 text-white' :
                          project.status === 'Completed' ? 'bg-blue-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {project.status || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Project Description */}
                    {project.description && (
                      <p className="text-gray-300 leading-relaxed">
                        {project.description.length > 300 
                          ? `${project.description.substring(0, 300)}...`
                          : project.description
                        }
                      </p>
                    )}

                    {/* Project Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {project.startDate && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <div>
                            <div className="text-xs text-gray-400">Start Date</div>
                            <div className="text-white text-sm">
                              {new Date(project.startDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )}

                      {project.programDirectors && project.programDirectors.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-400" />
                          <div>
                            <div className="text-xs text-gray-400">Program Director</div>
                            <div className="text-white text-sm">
                              {project.programDirectors[0].fullName}
                            </div>
                          </div>
                        </div>
                      )}

                      {project.budget && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-yellow-400" />
                          <div>
                            <div className="text-xs text-gray-400">Budget</div>
                            <div className="text-white text-sm">
                              ${project.budget.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Technology Areas */}
                    {project.technologyAreas && project.technologyAreas.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Technology Areas:</div>
                        <div className="flex flex-wrap gap-2">
                          {project.technologyAreas.slice(0, 5).map((area: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs"
                            >
                              {area.name || area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Benefits */}
                    {project.benefits && (
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Benefits:</div>
                        <p className="text-gray-300 text-sm">
                          {project.benefits.length > 200 
                            ? `${project.benefits.substring(0, 200)}...`
                            : project.benefits
                          }
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4 border-t border-gray-700">
                      {project.website && (
                        <a
                          href={project.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-sm inline-flex items-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Visit Website</span>
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setProjectId(project.projectId || project.id)
                          setSearchMode('specific')
                        }}
                        className="btn-secondary text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Rocket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Projects Found</h3>
              <p className="text-gray-400">
                {searchMode === 'specific' 
                  ? 'No project found with the specified ID.'
                  : 'No projects available at this time.'
                }
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default TechPort