import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'node:fs'

// Vitest stubs `.css` imports (css: false), so the design-system CSS is read
// from disk instead (see src/test/node-globals.d.ts for the Node typing shim).
const designSystemCss = readFileSync(`${process.cwd()}/src/index.css`, 'utf-8')

// Pages reach NASA data exclusively through nasaApi. Mock the module so these
// tests exercise rendering, states and client wiring without network access.
vi.mock('../services/api', () => ({
  nasaApi: {
    getADSData: vi.fn(),
  },
  researchStream: vi.fn(),
}))

import { nasaApi } from '../services/api'
import Dashboard from './Dashboard'
import AstrophysicsData from './AstrophysicsData'
import App from '../App'

const mocked = nasaApi as unknown as Record<string, ReturnType<typeof vi.fn>>

const renderWithQuery = (ui: React.ReactElement, route = '/') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Homepage attribution', () => {
  it('displays exactly "Developed with ❤️ by Viper NEX"', () => {
    renderWithQuery(<Dashboard />)

    const attribution = screen.getByText(/Developed with/)
    const text = (attribution.textContent || '').replace(/\s+/g, ' ').trim()

    expect(text).toMatch(/^Developed with .+ by Viper NEX$/)
    expect(text).toContain('❤')

    // The heart glyph is wrapped in the `.emoji` fallback so it renders as a
    // colour emoji (not a missing-glyph box) on Windows/mobile/desktop.
    const heart = attribution.querySelector('.emoji')
    expect(heart).not.toBeNull()
    expect(heart?.textContent).toContain('❤')
  })

  it('never references the previous attribution author', () => {
    renderWithQuery(<Dashboard />)
    expect(screen.queryByText(/Bruce Lee/i)).toBeNull()
  })
})

describe('Text selection styling', () => {
  it('defines a design-system selection colour and never disables selection globally', () => {
    expect(designSystemCss).toMatch(/::selection\s*\{/)
    expect(designSystemCss).toMatch(/::-moz-selection\s*\{/)
    // Selection must never be disabled at a global level.
    expect(designSystemCss).not.toMatch(/user-select\s*:\s*none/)
  })
})

describe('Astrophysics ADS page', () => {
  const paper = {
    bibcode: '2024ApJ...900....1A',
    title: 'A genuinely returned paper',
    authors: ['A. Author', 'B. Author'],
    year: '2024',
    journal: 'The Astrophysical Journal',
    abstract: 'Abstract text supplied by the ADS service.',
    citations: 12,
    doi: '10.1234/example',
    doctype: 'article',
    refereed: true,
  }

  it('renders the real papers returned by the API (never fabricated)', async () => {
    mocked.getADSData.mockResolvedValue({
      data: { source: 'NASA ADS (Harvard)', query: 'black hole', page: 1, rows: 10, numFound: 1, papers: [paper] },
    })

    renderWithQuery(<AstrophysicsData />)

    expect(await screen.findByText('A genuinely returned paper')).toBeInTheDocument()
    expect(screen.getByText('2024ApJ...900....1A')).toBeInTheDocument()
    expect(screen.getByText(/1 result/)).toBeInTheDocument()
    expect(screen.getByText(/Source: NASA ADS \(Harvard\)/)).toBeInTheDocument()
  })

  it('shows an honest configuration notice and no papers when ADS is unconfigured', async () => {
    mocked.getADSData.mockRejectedValue({
      response: {
        status: 503,
        data: {
          error: 'ADS API is not configured',
          details: 'The NASA Astrophysics Data System requires its own API token.',
          requiresKey: true,
        },
      },
    })

    renderWithQuery(<AstrophysicsData />)

    expect(await screen.findByText('ADS API token not configured')).toBeInTheDocument()
    expect(screen.getByText(/never displays sample or fabricated results/)).toBeInTheDocument()
    // No fabricated sample papers may be shown.
    expect(screen.queryByText(/Kepler-452/)).toBeNull()
    expect(screen.queryByText(/Proxima Centauri/)).toBeNull()
  })

  it('renders a retryable error state for genuine upstream failures', async () => {
    mocked.getADSData.mockRejectedValue({
      response: {
        status: 502,
        data: { error: 'Failed to fetch ADS data', details: 'The NASA ADS service is currently unavailable.' },
      },
    })

    renderWithQuery(<AstrophysicsData />)

    expect(await screen.findByText(/NASA ADS service is currently unavailable/)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('re-queries with the submitted query and page size', async () => {
    mocked.getADSData.mockResolvedValue({
      data: { source: 'NASA ADS (Harvard)', query: 'supernova', page: 1, rows: 5, numFound: 0, papers: [] },
    })

    renderWithQuery(<AstrophysicsData />)
    // Initial query fires once on mount.
    await waitFor(() => expect(mocked.getADSData).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Search Query'), { target: { value: 'supernova' } })
    fireEvent.change(screen.getByLabelText('Results per page'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /search papers/i }))

    await waitFor(() =>
      expect(mocked.getADSData).toHaveBeenLastCalledWith('supernova', 5, 1)
    )
    expect(await screen.findByText(/No papers matched this query/)).toBeInTheDocument()
  })
})

describe('Application routing', () => {
  it('renders the homepage without blanking', () => {
    renderWithQuery(<App />, '/')
    expect(screen.getByText(/Explore NASA's Universe/)).toBeInTheDocument()
  })

  it('renders the 404 page (not a blank screen) for unknown routes', () => {
    renderWithQuery(<App />, '/this-route-does-not-exist')
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByText(/Back to Dashboard/)).toBeInTheDocument()
  })

  it('exposes the primary navigation and no CyberShield entry', () => {
    renderWithQuery(<App />, '/')
    // Navigation groups are present for every audience.
    expect(screen.getByText('Missions & Sky')).toBeInTheDocument()
    expect(screen.getByText('Earth & Climate')).toBeInTheDocument()
    expect(screen.getByText('Data & Engineering')).toBeInTheDocument()
    // "NASA AI Research" appears in both the navbar and the footer.
    expect(screen.getAllByText('NASA AI Research').length).toBeGreaterThan(0)
    // CyberShield was removed from the public interface.
    expect(screen.queryByText(/CyberShield/i)).toBeNull()
  })
})
