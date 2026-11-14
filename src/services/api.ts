import axios, { AxiosResponse } from 'axios'
import type {
  APODData,
  MarsRoverResponse,
  NEOResponse,
  SpaceWeatherResponse,
  EPICImage,
  EONETResponse,
  NASAImageResponse,
  PowerDataResponse,
  TechPortResponse,
  SmallBodyData,
  EarthdataResponse,
  ExoplanetData,
  ProviderCatalogResponse,
  ProviderDataEnvelope,
  AiStatus,
  AiExplainResponse,
  AiResearchResponse,
  ResearchChatMessage,
  AdsSearchResponse
} from '../types'
import type { ResearchCategory } from '../data/nasaResearch'
import type { NasaResearchQuestion } from '../lib/supabase'

// `||` (not `??`) so an empty VITE_API_URL (as shipped in .env.example) still
// falls back to the same-origin `/api` path. In development Vite proxies `/api`
// to the local Express server; in production the deployed backend URL must be
// supplied through VITE_API_URL (see .env.example / deployment docs).
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const NASA_BASE_URL = 'https://api.nasa.gov'
// The browser must never hold a private NASA key. Client-side fallbacks use
// NASA's public DEMO_KEY only; any real key stays server-side (NASA_API_KEY).
const NASA_DEMO_KEY = 'DEMO_KEY'

// Strip HTML + decode common entities (NASA's WordPress APOD feed returns HTML).
const stripHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url
    const suppress = error.config?.headers && (error.config?.headers as any)['x-suppress-error'] === 'true'
    let message = 'Request failed'
    if (status) {
      message = `Request failed with status ${status}`
    } else if (error.message) {
      message = error.message
    }
    // Surface an event for UI to visualize
    if (typeof window !== 'undefined' && !suppress) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { message, url, status }
      }))
    }
    return Promise.reject(error)
  }
)

export const nasaApi = {
  // 1. APOD - Astronomy Picture of the Day
  getAPOD: async (date?: string): Promise<AxiosResponse<APODData>> => {
    try {
      return await api.get('/apod', { params: { date }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      // Backend unreachable: read the current NASA WordPress APOD feed directly
      // (the legacy api.nasa.gov APOD endpoint is being retired).
      const res = await axios.get('https://science.nasa.gov/wp-json/wp/v2/apod-basic', {
        params: { per_page: date ? 100 : 1, page: 1 },
        timeout: 30000,
      })
      const items: any[] = Array.isArray(res.data) ? res.data : []
      const item = date ? items.find((i) => i.date === date) : items[0]
      if (!item) throw err
      const isImage = item.media_type === 'image'
      const data: APODData = {
        date: item.date,
        title: stripHtml(item.title),
        explanation: stripHtml(item.explanation),
        media_type: item.media_type,
        url: isImage ? item.hdurl || item.url : item.url,
        hdurl: isImage ? item.hdurl : undefined,
        copyright: item.copyright ? stripHtml(item.copyright) : undefined,
        service_version: 'v1',
      }
      return { data, status: 200, statusText: 'OK', headers: {}, config: res.config } as AxiosResponse<APODData>
    }
  },

  // 2. Mars Rover Photos
  getMarsPhotos: async (
    rover: string = 'curiosity',
    sol: string = '1000',
    camera?: string
  ): Promise<AxiosResponse<MarsRoverResponse>> => {
    try {
      return await api.get('/mars-photos', { params: { rover, sol, camera }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      // Backend unreachable: read NASA's current Mars raw-image feed directly
      // (the legacy mars-photos API was retired on 2025-10-08).
      const category = rover === 'perseverance' ? 'mars2020' : rover === 'curiosity' ? 'msl' : 'mer'
      const url = `https://mars.nasa.gov/rss/api/?feed=raw_images&category=${category}&feedtype=json&num=60&order=sol+desc&sol=${encodeURIComponent(sol)}`
      const res = await axios.get(url, { timeout: 30000 })
      const images: any[] = Array.isArray(res.data?.images) ? res.data.images : []
      const photos = images.map((i) => ({
        id: i.imageid,
        sol: i.sol,
        camera: { name: i.camera?.instrument || 'UNKNOWN', full_name: i.camera?.instrument || 'UNKNOWN' },
        img_src: i.image_files?.full_res || i.image_files?.large || i.image_files?.medium || i.image_files?.small || '',
        earth_date: i.date_taken_utc ? String(i.date_taken_utc).slice(0, 10) : undefined,
        rover: { id: 0, name: rover, landing_date: '', launch_date: '', status: '' },
      }))
      const data = { photos } as MarsRoverResponse
      return { data, status: 200, statusText: 'OK', headers: {}, config: res.config } as AxiosResponse<MarsRoverResponse>
    }
  },

  // 3. Near Earth Objects
  getNEO: async (
    startDate?: string,
    endDate?: string
  ): Promise<AxiosResponse<NEOResponse>> => {
    try {
      return await api.get('/neo', { params: { start_date: startDate, end_date: endDate }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      if (NASA_DEMO_KEY) {
        return await axios.get(`${NASA_BASE_URL}/neo/rest/v1/feed`, {
          params: { start_date: startDate, end_date: endDate, api_key: NASA_DEMO_KEY },
          timeout: 30000,
        })
      }
      throw err
    }
  },

  // 4. DONKI - Space Weather
  getSpaceWeather: async (type?: 'flr' | 'cme' | 'all'): Promise<AxiosResponse<SpaceWeatherResponse>> => {
    try {
      return await api.get('/donki', { params: { type }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      // Backend unreachable. DONKI's FLR path is broken, so flares come from the
      // live NOAA SWPC feed while CMEs / geomagnetic storms come from DONKI.
      const base = `${NASA_BASE_URL}/DONKI`
      const params = { api_key: NASA_DEMO_KEY }
      const [cme, gst, noaa] = await Promise.all([
        axios.get(`${base}/CME`, { params, timeout: 30000 }),
        axios.get(`${base}/GST`, { params, timeout: 30000 }).catch(() => ({ data: [], config: {} } as any)),
        axios
          .get('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json', { timeout: 30000 })
          .catch(() => ({ data: [], config: {} } as any)),
      ])
      const solarFlares = (noaa.data || []).map((f: any) => ({
        flrID: `NOAA-${f.begin_time}`,
        beginTime: f.begin_time,
        peakTime: f.max_time,
        endTime: f.end_time,
        classType: f.max_class,
        instruments: [],
      }))
      const data: SpaceWeatherResponse = {
        solarFlares,
        cmes: cme.data || [],
        geomagneticStorms: gst.data || [],
      }
      return { data, status: 200, statusText: 'OK', headers: {}, config: cme.config } as AxiosResponse<SpaceWeatherResponse>
    }
  },

  // DONKI Notifications
  getDONKINotifications: (): Promise<AxiosResponse<any[]>> =>
    api.get('/donki/notifications', { headers: { 'x-suppress-error': 'true' } }),

  // 5. EPIC - Earth Images
  getEarthImages: async (date?: string): Promise<AxiosResponse<EPICImage[]>> => {
    try {
      return await api.get('/epic', { params: { date }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      // Fallback directly to NASA EPIC API when proxy/backend is unavailable
      const url = date
        ? `${NASA_BASE_URL}/EPIC/api/natural/date/${date}`
        : `${NASA_BASE_URL}/EPIC/api/natural`
      return await axios.get(url, {
        params: { api_key: NASA_DEMO_KEY },
        timeout: 30000,
      })
    }
  },

  // 6. EONET - Natural Events
  getNaturalEvents: async (category?: string, status: string = 'open', limit: number = 20): Promise<AxiosResponse<EONETResponse>> => {
    try {
      return await api.get('/eonet', { params: { category, status, limit }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      const params: Record<string, string | number> = { status, limit }
      if (category) params.category = category
      return await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events', {
        params,
        timeout: 30000,
      })
    }
  },

  // 7. NASA Image Library
  searchImages: async (query: string = 'earth', mediaType: string = 'image'): Promise<AxiosResponse<NASAImageResponse>> => {
    try {
      return await api.get('/images', { params: { q: query, media_type: mediaType }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      return await axios.get('https://images-api.nasa.gov/search', {
        params: { q: query, media_type: mediaType },
        timeout: 30000,
      })
    }
  },

  // 8. POWER - Climate and Solar Energy Data
  getPOWERData: (
    latitude: string = '33.69',
    longitude: string = '73.05',
    start: string = '20240101',
    end: string = '20240110',
    parameters: string = 'T2M,ALLSKY_SFC_SW_DWN'
  ): Promise<AxiosResponse<PowerDataResponse>> =>
    (async () => {
      try {
        return await api.get('/power', { params: { latitude, longitude, start, end, parameters }, headers: { 'x-suppress-error': 'true' } })
      } catch (err) {
        return await axios.get('https://power.larc.nasa.gov/api/temporal/daily/point', {
          params: {
            parameters,
            community: 'RE',
            longitude,
            latitude,
            start,
            end,
            format: 'JSON',
          },
          timeout: 30000,
        })
      }
    })(),

  // 8b. POWER monthly trend data (Earth Trend Detective). Reuses the existing
  // POWER client with a direct NASA POWER monthly fallback.
  getPowerTrend: async (
    latitude: string = '31.418',
    longitude: string = '73.079',
    startYear: string = '2015',
    endYear: string = '2024',
    parameters: string = 'T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN'
  ): Promise<AxiosResponse<PowerDataResponse>> => {
    try {
      return await api.get('/power/trend', {
        params: { latitude, longitude, startYear, endYear, parameters },
        headers: { 'x-suppress-error': 'true' },
        timeout: 60000,
      })
    } catch (err) {
      return await axios.get('https://power.larc.nasa.gov/api/temporal/monthly/point', {
        params: {
          parameters,
          community: 'RE',
          longitude,
          latitude,
          start: startYear,
          end: endYear,
          format: 'JSON',
        },
        timeout: 60000,
      })
    }
  },

  // 9. TechPort - NASA Technology Projects
  getTechPortProjects: async (projectId?: string): Promise<AxiosResponse<TechPortResponse>> => {
    try {
      return await api.get('/techport', { params: { projectId }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      if (projectId) {
        return await axios.get(`${NASA_BASE_URL}/techport/api/projects/${projectId}`, {
          params: { api_key: NASA_DEMO_KEY },
          timeout: 30000,
        })
      }
      return { data: { projects: [] }, status: 200, statusText: 'OK', headers: {}, config: {} } as unknown as AxiosResponse<TechPortResponse>
    }
  },

  // 10. GIBS - Global Imagery Browse Services
  getGIBSCapabilities: async (): Promise<AxiosResponse<string>> => {
    try {
      return await api.get('/gibs', { headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      const res = await axios.get(
        'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi',
        { params: { SERVICE: 'WMTS', REQUEST: 'GetCapabilities' }, timeout: 30000 }
      )
      return res as AxiosResponse<string>
    }
  },

  // 11. JPL Small-Body Database
  getSmallBodyData: async (sstr: string = '433'): Promise<AxiosResponse<SmallBodyData>> => {
    try {
      return await api.get('/sbdb', { params: { sstr }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      return await axios.get('https://ssd-api.jpl.nasa.gov/sbdb.api', { params: { sstr }, timeout: 30000 })
    }
  },

  // 12. OSDR - Open Science Data Repository
  getOSDRData: (studyId: string = 'OSD-379', page: number = 1, size: number = 10): Promise<AxiosResponse<any>> =>
    api.get('/osdr', { params: { studyId, page, size }, headers: { 'x-suppress-error': 'true' } }),

  // 13. Earthdata Search
  getEarthdataCollections: async (keyword: string = 'MODIS', pageSize: number = 10): Promise<AxiosResponse<EarthdataResponse>> => {
    try {
      return await api.get('/earthdata', { params: { keyword, page_size: pageSize }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      return await axios.get('https://cmr.earthdata.nasa.gov/search/collections.json', {
        params: { keyword, page_size: pageSize },
        timeout: 30000,
      })
    }
  },

  // 14. ADS - Astrophysics Data System (requires its own backend ADS_API_KEY)
  getADSData: (
    query: string = 'black hole',
    rows: number = 10,
    page: number = 1
  ): Promise<AxiosResponse<AdsSearchResponse>> =>
    api.get('/ads', { params: { q: query, rows, page }, headers: { 'x-suppress-error': 'true' } }),

  // 15. Exoplanet Archive
  getExoplanets: async (limit: number = 100): Promise<AxiosResponse<ExoplanetData[]>> => {
    try {
      return await api.get('/exoplanets', { params: { limit }, headers: { 'x-suppress-error': 'true' } })
    } catch (err) {
      const query = encodeURIComponent(`select pl_name,disc_year from ps`)
      const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=json&limit=${limit}`
      const res = await axios.get(url, { timeout: 30000 })
      return res as AxiosResponse<ExoplanetData[]>
    }
  },

  // 16. Multi-source data fusion: provider catalog + health (§4)
  getProviders: (): Promise<AxiosResponse<ProviderCatalogResponse>> =>
    api.get('/providers', { headers: { 'x-suppress-error': 'true' } }),

  // 17. Unified data fetch through the provider layer (provenance preserved)
  getProviderData: <T = any>(
    provider: string,
    params: Record<string, string | number> = {}
  ): Promise<AxiosResponse<ProviderDataEnvelope<T>>> =>
    api.get(`/data/${provider}`, { params, headers: { 'x-suppress-error': 'true' }, timeout: 40000 }),

  // 18. AstroLink Intelligence — AI narration status (§3)
  getAiStatus: (): Promise<AxiosResponse<AiStatus>> =>
    api.get('/ai/status', { headers: { 'x-suppress-error': 'true' } }),

  // 19. AstroLink Intelligence — explain deterministic results (never invents data)
  aiExplain: (question: string, facts: Record<string, unknown>): Promise<AxiosResponse<AiExplainResponse>> =>
    api.post('/ai/explain', { question, facts }, { headers: { 'x-suppress-error': 'true' }, timeout: 45000 }),

  // 20. NASA AI Research — restricted research assistant (question-bank scope).
  getResearchCategories: (): Promise<AxiosResponse<{ categories: ResearchCategory[] }>> =>
    api.get('/research/categories', { headers: { 'x-suppress-error': 'true' } }),

  researchAsk: (question: string, history: ResearchChatMessage[]): Promise<AxiosResponse<AiResearchResponse>> =>
    api.post('/ai/research', { question, history }, { headers: { 'x-suppress-error': 'true' }, timeout: 60000 }),
}

export interface ResearchStreamHandlers {
  onToken: (token: string) => void
  onDone?: (meta: { provider?: string; model?: string | null }) => void
  onError?: (message: string) => void
}

/**
 * Stream a NASA research answer from the secure backend (SSE over POST).
 * The OpenAI key never reaches the browser — only server-generated text does.
 */
export const researchStream = async (
  question: string,
  history: ResearchChatMessage[],
  handlers: ResearchStreamHandlers,
  signal?: AbortSignal
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/ai/research/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
    signal,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const data = await response.json()
      if (data && (data.details || data.error)) message = data.details || data.error
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    handlers.onError?.(message)
    return
  }

  if (!response.body) {
    handlers.onError?.('Streaming is not supported in this browser.')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // Server-Sent Events are separated by a blank line; each event carries one
  // `data: {json}` line.
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const line = raw.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        const event = JSON.parse(payload)
        if (event.type === 'token' && typeof event.value === 'string') handlers.onToken(event.value)
        else if (event.type === 'done') handlers.onDone?.({ provider: event.provider, model: event.model })
        else if (event.type === 'error') handlers.onError?.(event.message || 'The AI assistant is unavailable.')
      } catch {
        // Ignore malformed fragments.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// NASA Research Questions from Supabase
// ---------------------------------------------------------------------------

export interface ResearchQuestionsResponse {
  questions: NasaResearchQuestion[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ResearchQuestionResponse {
  question: NasaResearchQuestion
}

export interface ResearchSearchResponse extends ResearchQuestionsResponse {
  searchQuery: string
}

/**
 * Fetch research questions from Supabase with pagination and optional category filter
 */
export const getResearchQuestions = async (
  page: number = 1,
  limit: number = 50,
  category?: number
): Promise<ResearchQuestionsResponse> => {
  const params: Record<string, string | number> = { page, limit }
  if (category !== undefined) params.category = category
  const response = await api.get('/research/questions', { params })
  return response.data
}

/**
 * Fetch a single research question by ID
 */
export const getResearchQuestion = async (id: number): Promise<ResearchQuestionResponse> => {
  const response = await api.get(`/research/questions/${id}`)
  return response.data
}

/**
 * Full-text search for research questions
 */
export const searchResearchQuestions = async (
  query: string,
  page: number = 1,
  limit: number = 50,
  category?: number
): Promise<ResearchSearchResponse> => {
  const params: Record<string, string | number> = { q: query, page, limit }
  if (category !== undefined) params.category = category
  const response = await api.get('/research/questions/search', { params })
  return response.data
}

export default api
