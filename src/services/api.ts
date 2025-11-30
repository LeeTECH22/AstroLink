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
  ExoplanetData
} from '../types'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (typeof window !== 'undefined' ? '/api' : 'http://localhost:5001/api')
const NASA_BASE_URL = 'https://api.nasa.gov'
// Use NASA DEMO_KEY if no key provided to ensure client-side fallbacks work.
const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY ?? 'DEMO_KEY'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.url}`)
    return config
  },
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
      return await api.get('/apod', { params: { date } })
    } catch (err) {
      if (NASA_API_KEY) {
        return await axios.get(`${NASA_BASE_URL}/planetary/apod`, {
          params: { api_key: NASA_API_KEY, date },
          timeout: 30000,
        })
      }
      throw err
    }
  },

  // 2. Mars Rover Photos
  getMarsPhotos: async (
    rover: string = 'curiosity',
    sol: string = '1000',
    camera?: string
  ): Promise<AxiosResponse<MarsRoverResponse>> => {
    try {
      return await api.get('/mars-photos', { params: { rover, sol, camera } })
    } catch (err) {
      if (NASA_API_KEY) {
        const params: Record<string, string> = { api_key: NASA_API_KEY, sol }
        if (camera) params.camera = camera
        return await axios.get(
          `${NASA_BASE_URL}/mars-photos/api/v1/rovers/${rover}/photos`,
          { params, timeout: 30000 }
        )
      }
      throw err
    }
  },

  // 3. Near Earth Objects
  getNEO: async (
    startDate?: string,
    endDate?: string
  ): Promise<AxiosResponse<NEOResponse>> => {
    try {
      return await api.get('/neo', { params: { start_date: startDate, end_date: endDate } })
    } catch (err) {
      if (NASA_API_KEY) {
        return await axios.get(`${NASA_BASE_URL}/neo/rest/v1/feed`, {
          params: { start_date: startDate, end_date: endDate, api_key: NASA_API_KEY },
          timeout: 30000,
        })
      }
      throw err
    }
  },

  // 4. DONKI - Space Weather
  getSpaceWeather: async (type?: 'flr' | 'cme' | 'all'): Promise<AxiosResponse<SpaceWeatherResponse>> => {
    try {
      return await api.get('/donki', { params: { type } })
    } catch (err) {
      const base = `${NASA_BASE_URL}/DONKI`
      if (type === 'all' || !type) {
        const [flr, cme] = await Promise.all([
          axios.get(`${base}/FLR`, { params: { api_key: NASA_API_KEY }, timeout: 30000 }),
          axios.get(`${base}/CME`, { params: { api_key: NASA_API_KEY }, timeout: 30000 }),
        ])
        const data: SpaceWeatherResponse = {
          solarFlares: (flr.data || []),
          cmes: (cme.data || []),
        }
        return { data, status: 200, statusText: 'OK', headers: {}, config: flr.config } as AxiosResponse<SpaceWeatherResponse>
      }
      const endpoint = type.toUpperCase()
      const res = await axios.get(`${base}/${endpoint}`, { params: { api_key: NASA_API_KEY }, timeout: 30000 })
      const data: SpaceWeatherResponse = type === 'flr'
        ? { solarFlares: (res.data || []), cmes: [] }
        : { solarFlares: [], cmes: (res.data || []) }
      return { data, status: 200, statusText: 'OK', headers: res.headers || {}, config: res.config } as AxiosResponse<SpaceWeatherResponse>
    }
  },

  // DONKI Notifications
  getDONKINotifications: (): Promise<AxiosResponse<any[]>> =>
    api.get('/donki/notifications'),

  // 5. EPIC - Earth Images
  getEarthImages: async (date?: string): Promise<AxiosResponse<EPICImage[]>> => {
    try {
      return await api.get('/epic', { params: { date } })
    } catch (err) {
      // Fallback directly to NASA EPIC API when proxy/backend is unavailable
      const url = date
        ? `${NASA_BASE_URL}/EPIC/api/natural/date/${date}`
        : `${NASA_BASE_URL}/EPIC/api/natural`
      return await axios.get(url, {
        params: { api_key: NASA_API_KEY },
        timeout: 30000,
      })
    }
  },

  // 6. EONET - Natural Events
  getNaturalEvents: async (category?: string, status: string = 'open', limit: number = 20): Promise<AxiosResponse<EONETResponse>> => {
    try {
      return await api.get('/eonet', { params: { category, status, limit } })
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
      return await api.get('/images', { params: { q: query, media_type: mediaType } })
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

  // 9. TechPort - NASA Technology Projects
  getTechPortProjects: async (projectId?: string): Promise<AxiosResponse<TechPortResponse>> => {
    try {
      return await api.get('/techport', { params: { projectId } })
    } catch (err) {
      if (projectId) {
        return await axios.get(`${NASA_BASE_URL}/techport/api/projects/${projectId}`, {
          params: { api_key: NASA_API_KEY },
          timeout: 30000,
        })
      }
      return { data: { projects: [] }, status: 200, statusText: 'OK', headers: {}, config: {} } as unknown as AxiosResponse<TechPortResponse>
    }
  },

  // 10. GIBS - Global Imagery Browse Services
  getGIBSCapabilities: async (): Promise<AxiosResponse<string>> => {
    try {
      return await api.get('/gibs')
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
      return await api.get('/sbdb', { params: { sstr } })
    } catch (err) {
      return await axios.get('https://ssd-api.jpl.nasa.gov/sbdb.api', { params: { sstr }, timeout: 30000 })
    }
  },

  // 12. OSDR - Open Science Data Repository
  getOSDRData: (studyId: string = 'OSD-379', page: number = 1, size: number = 10): Promise<AxiosResponse<any>> =>
    api.get('/osdr', { params: { studyId, page, size } }),

  // 13. Earthdata Search
  getEarthdataCollections: async (keyword: string = 'MODIS', pageSize: number = 10): Promise<AxiosResponse<EarthdataResponse>> => {
    try {
      return await api.get('/earthdata', { params: { keyword, page_size: pageSize } })
    } catch (err) {
      return await axios.get('https://cmr.earthdata.nasa.gov/search/collections.json', {
        params: { keyword, page_size: pageSize },
        timeout: 30000,
      })
    }
  },

  // 14. ADS - Astrophysics Data System
  getADSData: (query: string = 'black hole', rows: number = 10): Promise<AxiosResponse<any>> =>
    api.get('/ads', { params: { q: query, rows } }),

  // 15. Exoplanet Archive
  getExoplanets: async (limit: number = 100): Promise<AxiosResponse<ExoplanetData[]>> => {
    try {
      return await api.get('/exoplanets', { params: { limit } })
    } catch (err) {
      const query = encodeURIComponent(`select pl_name,disc_year from ps`)
      const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=json&limit=${limit}`
      const res = await axios.get(url, { timeout: 30000 })
      return res as AxiosResponse<ExoplanetData[]>
    }
  },
}

export default api