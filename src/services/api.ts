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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

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
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const nasaApi = {
  // 1. APOD - Astronomy Picture of the Day
  getAPOD: (date?: string): Promise<AxiosResponse<APODData>> => 
    api.get('/apod', { params: { date } }),

  // 2. Mars Rover Photos
  getMarsPhotos: (rover: string = 'curiosity', sol: string = '1000', camera?: string): Promise<AxiosResponse<MarsRoverResponse>> =>
    api.get('/mars-photos', { params: { rover, sol, camera } }),

  // 3. Near Earth Objects
  getNEO: (startDate?: string, endDate?: string): Promise<AxiosResponse<NEOResponse>> =>
    api.get('/neo', { params: { start_date: startDate, end_date: endDate } }),

  // 4. DONKI - Space Weather
  getSpaceWeather: (type?: 'flr' | 'cme' | 'all'): Promise<AxiosResponse<SpaceWeatherResponse>> =>
    api.get('/donki', { params: { type } }),

  // DONKI Notifications
  getDONKINotifications: (): Promise<AxiosResponse<any[]>> =>
    api.get('/donki/notifications'),

  // 5. EPIC - Earth Images
  getEarthImages: (date?: string): Promise<AxiosResponse<EPICImage[]>> =>
    api.get('/epic', { params: { date } }),

  // 6. EONET - Natural Events
  getNaturalEvents: (category?: string, status: string = 'open', limit: number = 20): Promise<AxiosResponse<EONETResponse>> =>
    api.get('/eonet', { params: { category, status, limit } }),

  // 7. NASA Image Library
  searchImages: (query: string = 'earth', mediaType: string = 'image'): Promise<AxiosResponse<NASAImageResponse>> =>
    api.get('/images', { params: { q: query, media_type: mediaType } }),

  // 8. POWER - Climate and Solar Energy Data
  getPOWERData: (latitude: string = '33.69', longitude: string = '73.05', start: string = '20240101', end: string = '20240110', parameters: string = 'T2M,ALLSKY_SFC_SW_DWN'): Promise<AxiosResponse<PowerDataResponse>> =>
    api.get('/power', { params: { latitude, longitude, start, end, parameters } }),

  // 9. TechPort - NASA Technology Projects
  getTechPortProjects: (projectId?: string): Promise<AxiosResponse<TechPortResponse>> =>
    api.get('/techport', { params: { projectId } }),

  // 10. GIBS - Global Imagery Browse Services
  getGIBSCapabilities: (): Promise<AxiosResponse<string>> =>
    api.get('/gibs'),

  // 11. JPL Small-Body Database
  getSmallBodyData: (sstr: string = '433'): Promise<AxiosResponse<SmallBodyData>> =>
    api.get('/sbdb', { params: { sstr } }),

  // 12. OSDR - Open Science Data Repository
  getOSDRData: (studyId: string = 'OSD-379', page: number = 1, size: number = 10): Promise<AxiosResponse<any>> =>
    api.get('/osdr', { params: { studyId, page, size } }),

  // 13. Earthdata Search
  getEarthdataCollections: (keyword: string = 'MODIS', pageSize: number = 10): Promise<AxiosResponse<EarthdataResponse>> =>
    api.get('/earthdata', { params: { keyword, page_size: pageSize } }),

  // 14. ADS - Astrophysics Data System
  getADSData: (query: string = 'black hole', rows: number = 10): Promise<AxiosResponse<any>> =>
    api.get('/ads', { params: { q: query, rows } }),

  // 15. Exoplanet Archive
  getExoplanets: (limit: number = 100): Promise<AxiosResponse<ExoplanetData[]>> =>
    api.get('/exoplanets', { params: { limit } }),
}

export default api