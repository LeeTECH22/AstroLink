import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// The unified pages talk to the backend exclusively through nasaApi; mock the
// module so the tests exercise rendering, forms, states and client wiring
// without hitting the network.
vi.mock('../services/api', () => ({
  nasaApi: {
    getProviders: vi.fn(),
    getProviderData: vi.fn(),
    getAiStatus: vi.fn(),
    aiExplain: vi.fn(),
    getPowerTrend: vi.fn(),
  },
  getResearchQuestions: vi.fn().mockResolvedValue({
    questions: [],
    total: 0,
    page: 1,
    limit: 340,
  }),
  searchResearchQuestions: vi.fn().mockResolvedValue({
    questions: [],
    total: 0,
    page: 1,
    limit: 1,
  }),
  researchStream: vi.fn(),
}))

import { nasaApi, researchStream } from '../services/api'
import DataExplorer from './DataExplorer'
import Intelligence from './Intelligence'
import Geospatial from './Geospatial'
import NasaAiResearch from './NasaAiResearch'

const mocked = nasaApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const mockedResearch = researchStream as unknown as ReturnType<typeof vi.fn>

const renderWithQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

// Build a synthetic NASA POWER monthly payload (a strictly increasing series).
const syntheticPowerResponse = () => {
  const T2M: Record<string, number> = {}
  let value = 20
  for (let year = 2015; year <= 2024; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      T2M[`${year}${String(month).padStart(2, '0')}`] = Number(value.toFixed(3))
      value += 0.01
    }
  }
  return {
    data: {
      type: 'Feature',
      header: { title: 'NASA POWER (Prediction Of Worldwide Energy Resources)', fill_value: -999 },
      geometry: { type: 'Point', coordinates: [73.079, 31.418] },
      properties: { parameter: { T2M } },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DataExplorer page', () => {
  it('renders the provider catalog with provenance metadata', async () => {
    mocked.getProviders.mockResolvedValue({
      data: {
        providers: [
          {
            id: 'power',
            label: 'NASA POWER',
            kind: 'reanalysis',
            dataset: 'NASA POWER (Prediction Of Worldwide Energy Resources)',
            temporalResolution: 'daily, monthly',
            spatialResolution: '~0.5° grid',
            notes: 'Gridded/model-derived. Not ground measurements.',
            variables: [{ id: 'T2M', label: 'Temperature at 2 m', units: '°C', category: 'temperature' }],
            requiresKey: false,
            configured: true,
          },
        ],
        health: [
          {
            id: 'power',
            label: 'NASA POWER',
            kind: 'reanalysis',
            configured: true,
            circuit: { state: 'closed', consecutiveFailures: 0, totalSuccesses: 1, totalFailures: 0, lastStatus: 200, retryInMs: 0 },
            metrics: { requests: 1, successes: 1, failures: 0, cacheHits: 0, lastLatencyMs: 120, lastStatus: 200, lastFetchAt: null, lastError: null },
          },
        ],
        cache: { entries: 1, hits: 0, misses: 1, hitRate: 0 },
      },
    })

    renderWithQuery(<DataExplorer />)

    expect(await screen.findByText('Multi-source Data Explorer')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('NASA POWER')).toBeInTheDocument())
    expect(screen.getByText(/Reanalysis/)).toBeInTheDocument()
  })

  it('shows a safe error message when provider fetch is rejected', async () => {
    mocked.getProviders.mockResolvedValue({
      data: {
        providers: [
          {
            id: 'firms',
            label: 'NASA FIRMS',
            kind: 'observation',
            dataset: 'Firms',
            temporalResolution: 'daily',
            spatialResolution: '375 m',
            notes: 'Satellite fire detections.',
            variables: [],
            requiresKey: true,
            configured: true,
          },
        ],
        health: [],
        cache: { entries: 0, hits: 0, misses: 0, hitRate: 0 },
      },
    })
    mocked.getProviderData.mockRejectedValue({ response: { status: 503, data: { error: 'FIRMS request failed.' } } })

    renderWithQuery(<DataExplorer />)
    await waitFor(() => expect(screen.getByText('NASA FIRMS')).toBeInTheDocument())

    fireEvent.click(screen.getByText('NASA FIRMS'))
    fireEvent.click(screen.getByText(/Fetch through provider layer/))

    await waitFor(() => expect(screen.getByText(/FIRMS request failed/)).toBeInTheDocument())
    expect(screen.getByText(/HTTP 503/)).toBeInTheDocument()
  })
})

describe('Intelligence page', () => {
  it('computes deterministic results and stays in deterministic-only mode when AI is unavailable', async () => {
    mocked.getAiStatus.mockResolvedValue({
      data: { available: false, provider: 'none', model: null, mode: 'deterministic-only', note: 'no provider' },
    })
    mocked.getPowerTrend.mockResolvedValue(syntheticPowerResponse())
    mocked.aiExplain.mockResolvedValue({
      data: { available: false, mode: 'deterministic-only', answer: null, note: 'No AI provider is configured.' },
    })

    renderWithQuery(<Intelligence />)

    expect(screen.getByText('AstroLink Intelligence')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Deterministic results (source of every number)')).toBeInTheDocument())

    // Deterministic grounding must be visible before any AI call.
    expect(screen.getByText(/Trend direction/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Run grounded analysis'))

    await waitFor(() => expect(mocked.aiExplain).toHaveBeenCalledTimes(1))
    const [question, facts] = mocked.aiExplain.mock.calls[0]
    expect(question).toContain('Faisalabad')
    expect(facts).toHaveProperty('trend')
    expect(facts).toHaveProperty('dataset')
    expect(screen.getByText('Deterministic-only')).toBeInTheDocument()
  })
})

describe('Geospatial page', () => {
  it('renders real EONET events and hides the FIRMS layer when its key is not configured', async () => {
    mocked.getProviders.mockResolvedValue({
      data: {
        providers: [
          {
            id: 'firms',
            label: 'NASA FIRMS',
            kind: 'observation',
            dataset: 'FIRMS',
            temporalResolution: 'daily',
            spatialResolution: '375 m',
            notes: 'Satellite fire detections.',
            variables: [],
            requiresKey: true,
            configured: false,
          },
        ],
        health: [],
        cache: { entries: 0, hits: 0, misses: 0, hitRate: 0 },
      },
    })
    mocked.getProviderData.mockResolvedValue({
      data: {
        provider: 'eonet',
        label: 'NASA EONET',
        dataset: 'EONET v3',
        kind: 'event',
        temporalResolution: 'event-based',
        spatialResolution: 'point / polygon',
        sourceUrl: 'eonet.gsfc.nasa.gov',
        fetchedAt: new Date().toISOString(),
        latencyMs: 90,
        cached: false,
        notes: 'curated natural events',
        data: {
          events: [
            {
              id: 'EONET_1',
              title: 'Wildfire event',
              categories: [{ id: 'wildfires', title: 'Wildfires' }],
              sources: [{ id: 'InciWeb', url: 'https://example.com' }],
              geometry: [{ date: '2026-01-01T00:00:00Z', type: 'Point', coordinates: [73.0, 31.4] }],
            },
          ],
        },
      },
    })

    renderWithQuery(<Geospatial />)

    expect(await screen.findByText('Interactive Geospatial Explorer')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/EONET: 1 events/)).toBeInTheDocument())
    // FIRMS is unconfigured in this environment and must not pretend to work.
    expect(screen.getByText(/FIRMS requires a server-side/)).toBeInTheDocument()
  })
})

describe('NASA AI Research page', () => {
  it('renders the 21 research categories and the restricted-scope welcome state', async () => {
    mocked.getAiStatus.mockResolvedValue({
      data: { available: true, provider: 'openai', model: 'gpt-4o-mini', mode: 'ai-assisted', note: '' },
    })

    renderWithQuery(<NasaAiResearch />)

    expect(await screen.findByText('NASA AI Research')).toBeInTheDocument()
    // 21 discovery cards, each numbered by category.
    expect(screen.getAllByText(/^Category \d+$/)).toHaveLength(21)
    expect(screen.getByText('Explore NASA research')).toBeInTheDocument()
    // The workspace must state the scope restriction up-front.
    expect(screen.getByText(/never unrelated subjects/)).toBeInTheDocument()
  })

  it('opens the in-app research conversation when a category is selected and stays in the workspace', async () => {
    mocked.getAiStatus.mockResolvedValue({
      data: { available: true, provider: 'openai', model: 'gpt-4o-mini', mode: 'ai-assisted', note: '' },
    })
    mockedResearch.mockResolvedValue(undefined)

    renderWithQuery(<NasaAiResearch />)
    await screen.findByText('Explore NASA research')

    fireEvent.click(screen.getByText('Category 1'))

    await waitFor(() => expect(mockedResearch).toHaveBeenCalledTimes(1))
    const [question, history] = mockedResearch.mock.calls[0]
    expect(question).toMatch(/Origins and Hidden History/)
    expect(history).toEqual([])
    // The follow-up composer documents the restriction; the user never leaves AstroLink.
    expect(screen.getByText(/Follow-ups must stay relevant/)).toBeInTheDocument()
    expect(screen.getByLabelText('Follow-up question')).toBeInTheDocument()
  })
})
