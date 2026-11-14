import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import Search from 'lucide-react/dist/esm/icons/search'
import Star from 'lucide-react/dist/esm/icons/star'
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import User from 'lucide-react/dist/esm/icons/user'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link'
import Copy from 'lucide-react/dist/esm/icons/copy'
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import { nasaApi } from '../services/api'
import type { AdsPaper } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

const abstractUrl = (bibcode: string) =>
  `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(bibcode)}/abstract`

const citationsUrl = (bibcode: string) =>
  `https://ui.adsabs.harvard.edu/search/q=${encodeURIComponent(`citations(bibcode:${bibcode})`)}`

const bibtexFor = (paper: AdsPaper) =>
  `@article{${paper.bibcode},
  title   = {${paper.title}},
  author  = {${paper.authors.join(' and ')}},
  journal = {${paper.journal || ''}},
  year    = {${paper.year || ''}},
${paper.doi ? `  doi     = {${paper.doi}},\n` : ''}}`

const AstrophysicsData = () => {
  const [query, setQuery] = useState('black hole')
  const [rows, setRows] = useState(10)
  const [submitted, setSubmitted] = useState({ query: 'black hole', rows: 10, page: 1 })
  const [copied, setCopied] = useState<string | null>(null)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['ads-data', submitted.query, submitted.rows, submitted.page],
    queryFn: () => nasaApi.getADSData(submitted.query, submitted.rows, submitted.page),
    select: (response) => response.data,
    staleTime: 10 * 60 * 1000,
    retry: false,
    placeholderData: (previousData) => previousData,
  })

  const errData = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
  const requiresKey = errData?.requiresKey === true
  const errDetails = typeof errData?.details === 'string' ? errData.details : undefined
  const errMessage = typeof errData?.error === 'string' ? errData.error : undefined

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted({ query: query.trim() || 'black hole', rows, page: 1 })
  }

  const goToPage = (next: number) => {
    if (next < 1) return
    setSubmitted((prev) => ({ ...prev, page: next }))
  }

  const copyCitation = async (paper: AdsPaper) => {
    try {
      await navigator.clipboard.writeText(bibtexFor(paper))
      setCopied(paper.bibcode)
      window.setTimeout(() => setCopied((c) => (c === paper.bibcode ? null : c)), 2000)
    } catch {
      setCopied(null)
    }
  }

  const papers: AdsPaper[] = data?.papers || []
  const numFound = data?.numFound ?? 0
  const totalPages = numFound > 0 ? Math.ceil(numFound / submitted.rows) : 1

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <BookOpen className="h-8 w-8 text-brand-cyan" />
          <h1 className="page-title">Astrophysics Data System</h1>
        </div>
        <p className="page-subtitle mx-auto max-w-2xl">
          Search the NASA Astrophysics Data System (ADS) for peer-reviewed papers, preprints and
          conference proceedings in astronomy and astrophysics.
        </p>
      </motion.div>

      {/* Search Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="mb-2 flex items-center gap-3">
            <Search className="h-5 w-5 text-brand" />
            <h3 className="section-title">Search Literature</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="ads-query" className="label">
                Search Query
              </label>
              <input
                id="ads-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., black hole, exoplanet, dark matter, supernova"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="ads-rows" className="label">
                Results per page
              </label>
              <select
                id="ads-rows"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="select"
              >
                <option value={5}>5 papers</option>
                <option value={10}>10 papers</option>
                <option value={20}>20 papers</option>
                <option value={50}>50 papers</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isFetching}>
            {isFetching ? 'Searching…' : 'Search Papers'}
          </button>

          <p className="helper-text">
            <strong className="text-ink-soft">Popular topics:</strong> black hole, exoplanet, dark
            matter, gravitational waves, supernova
          </p>
        </form>
      </motion.div>

      {/* Results region */}
      {isLoading ? (
        <LoadingSpinner text="Searching NASA ADS literature…" />
      ) : error ? (
        requiresKey ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-state-warning/40 bg-state-warning/5"
          >
            <div className="flex items-start gap-3">
              <Star className="mt-1 h-6 w-6 shrink-0 text-state-warning" />
              <div className="space-y-2">
                <h3 className="section-title">ADS API token not configured</h3>
                <p className="text-sm leading-relaxed text-ink-soft">
                  The NASA Astrophysics Data System requires its own API token, which is separate
                  from the NASA api.nasa.gov key. No papers are shown because none were retrieved —
                  this page never displays sample or fabricated results.
                </p>
                <p className="text-sm leading-relaxed text-ink-soft">
                  To enable real searches, register for a free token at{' '}
                  <a
                    href="https://ui.adsabs.harvard.edu/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-cyan underline hover:text-brand-soft"
                  >
                    ui.adsabs.harvard.edu
                  </a>{' '}
                  and set <code className="rounded bg-black/30 px-1">ADS_API_KEY</code> in the
                  backend environment.
                </p>
                <button onClick={() => refetch()} className="btn-secondary mt-2">
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <ErrorMessage
            message={errDetails || errMessage || 'Failed to search astrophysics data.'}
            onRetry={() => refetch()}
          />
        )
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Summary */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-brand" />
                <span className="font-medium text-ink">
                  {numFound.toLocaleString()} result{numFound === 1 ? '' : 's'} for “{submitted.query}”
                </span>
              </div>
              <span className="badge badge-info">Source: {data?.source || 'NASA ADS'}</span>
            </div>
          </div>

          {papers.length === 0 ? (
            <div className="card text-center">
              <p className="text-ink-soft">
                No papers matched this query. Try a broader term or different keywords.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {papers.map((paper, index) => (
                <motion.article
                  key={paper.bibcode || index}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * index }}
                  className="card"
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{paper.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                        <span className="font-mono">{paper.bibcode}</span>
                        {paper.citations !== null && <span>· {paper.citations} citations</span>}
                        {paper.refereed && <span className="badge badge-success">Refereed</span>}
                        {paper.doctype && <span className="badge">{paper.doctype}</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <User className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <div>
                          <div className="text-xs text-ink-muted">Authors</div>
                          <div className="text-sm text-ink-soft">
                            {paper.authors.length ? paper.authors.join(', ') : 'Not listed'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-state-success" />
                        <div>
                          <div className="text-xs text-ink-muted">Publication</div>
                          <div className="text-sm text-ink-soft">
                            {paper.journal || 'Unknown journal'}
                            {paper.year ? ` (${paper.year})` : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {paper.abstract && (
                      <div>
                        <div className="mb-1 text-xs text-ink-muted">Abstract</div>
                        <p className="text-sm leading-relaxed text-ink-soft">{paper.abstract}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 border-t border-surface-border pt-4">
                      <a
                        href={abstractUrl(paper.bibcode)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on ADS
                      </a>
                      <button
                        type="button"
                        onClick={() => copyCitation(paper)}
                        className="btn-secondary text-sm"
                      >
                        <Copy className="h-4 w-4" />
                        {copied === paper.bibcode ? 'Citation copied' : 'Export Citation'}
                      </button>
                      <a
                        href={citationsUrl(paper.bibcode)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        Similar Papers
                      </a>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => goToPage(submitted.page - 1)}
                disabled={submitted.page <= 1 || isFetching}
                className="btn-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-ink-soft">
                Page {submitted.page} of {totalPages.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => goToPage(submitted.page + 1)}
                disabled={submitted.page >= totalPages || isFetching}
                className="btn-secondary"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* About ADS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="section-title mb-4">About NASA ADS</h3>
        <div className="grid grid-cols-1 gap-6 text-sm text-ink-soft md:grid-cols-2">
          <div>
            <h4 className="mb-2 font-medium text-ink">Database coverage</h4>
            <p>
              The NASA Astrophysics Data System (ADS) is a digital library portal containing over 15
              million records of publications in astronomy, astrophysics, physics and geophysics.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-medium text-ink">Search features</h4>
            <p>
              ADS provides advanced search including author searches, citation analysis, full-text
              search and bibliometric tools for research analysis and discovery.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AstrophysicsData
