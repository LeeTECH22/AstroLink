// NASA API Response Types

export interface APODData {
  date: string
  explanation: string
  hdurl?: string
  media_type: 'image' | 'video'
  service_version: string
  title: string
  url: string
  copyright?: string
}

export interface MarsRoverPhoto {
  id: number
  sol: number
  camera: {
    id: number
    name: string
    rover_id: number
    full_name: string
  }
  img_src: string
  earth_date: string
  rover: {
    id: number
    name: string
    landing_date: string
    launch_date: string
    status: string
  }
}

export interface MarsRoverResponse {
  photos: MarsRoverPhoto[]
}

export interface NearEarthObject {
  id: string
  neo_reference_id: string
  name: string
  nasa_jpl_url: string
  absolute_magnitude_h: number
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number
      estimated_diameter_max: number
    }
    meters: {
      estimated_diameter_min: number
      estimated_diameter_max: number
    }
  }
  is_potentially_hazardous_asteroid: boolean
  close_approach_data: Array<{
    close_approach_date: string
    close_approach_date_full: string
    epoch_date_close_approach: number
    relative_velocity: {
      kilometers_per_second: string
      kilometers_per_hour: string
      miles_per_hour: string
    }
    miss_distance: {
      astronomical: string
      lunar: string
      kilometers: string
      miles: string
    }
    orbiting_body: string
  }>
  is_sentry_object: boolean
}

export interface NEOResponse {
  links: {
    next?: string
    prev?: string
    self: string
  }
  element_count: number
  near_earth_objects: {
    [date: string]: NearEarthObject[]
  }
}

export interface SolarFlare {
  flrID: string
  instruments: Array<{
    displayName: string
  }>
  beginTime: string
  peakTime?: string
  endTime?: string
  classType?: string
  sourceLocation?: string
  activeRegionNum?: number
  note?: string
}

export interface CoronalMassEjection {
  activityID: string
  catalog: string
  startTime: string
  sourceLocation?: string
  activeRegionNum?: number
  note?: string
  cmeAnalyses?: Array<{
    time21_5: string
    latitude: number
    longitude: number
    halfAngle: number
    speed: number
    type: string
    isMostAccurate: boolean
    note?: string
  }>
}

export interface SpaceWeatherResponse {
  solarFlares: SolarFlare[]
  cmes: CoronalMassEjection[]
}

export interface EPICImage {
  identifier: string
  caption: string
  image: string
  version: string
  centroid_coordinates: {
    lat: number
    lon: number
  }
  dscovr_j2000_position: {
    x: number
    y: number
    z: number
  }
  lunar_j2000_position: {
    x: number
    y: number
    z: number
  }
  sun_j2000_position: {
    x: number
    y: number
    z: number
  }
  attitude_quaternions: {
    q0: number
    q1: number
    q2: number
    q3: number
  }
  date: string
  coords: {
    centroid_coordinates: {
      lat: number
      lon: number
    }
  }
}

export interface NaturalEvent {
  id: string
  title: string
  description?: string
  link?: string
  categories: Array<{
    id: string
    title: string
  }>
  sources: Array<{
    id: string
    url: string
  }>
  geometry: Array<{
    magnitudeValue?: number
    magnitudeUnit?: string
    date: string
    type: string
    coordinates: [number, number] // [longitude, latitude]
  }>
}

export interface EONETResponse {
  title: string
  description: string
  link: string
  events: NaturalEvent[]
}

export interface NASAImageItem {
  data: Array<{
    center?: string
    title: string
    nasa_id: string
    date_created: string
    keywords?: string[]
    media_type: 'image' | 'video' | 'audio'
    description?: string
    photographer?: string
    location?: string
  }>
  links?: Array<{
    href: string
    rel: string
    render?: string
  }>
}

export interface NASAImageResponse {
  collection: {
    version: string
    href: string
    items: NASAImageItem[]
    metadata: {
      total_hits: number
    }
    links?: Array<{
      rel: string
      prompt: string
      href: string
    }>
  }
}

export interface PowerDataResponse {
  type: string
  geometry: {
    type: string
    coordinates: [number, number]
  }
  properties: {
    parameter: {
      [key: string]: {
        [date: string]: number
      }
    }
  }
}

export interface TechPortProject {
  projectId: number
  id: number
  lastUpdated: string
  title: string
  status: string
  description?: string
  benefits?: string
  startDate?: string
  endDate?: string
  website?: string
  programDirectors?: Array<{
    contactId: number
    canUserEdit: boolean
    firstName: string
    lastName: string
    fullName: string
    fullNameInverted: string
    middleInitial?: string
    primaryEmail: string
    publicEmail: boolean
    nacontact: boolean
  }>
  technologyAreas?: Array<{
    id: number
    code: string
    name: string
    level: number
  }>
  budget?: number
}

export interface TechPortResponse {
  projects?: TechPortProject[]
  project?: TechPortProject
}

export interface SmallBodyData {
  object: {
    fullname: string
    des: string
    spkid: string
    kind: string
    orbit?: {
      source: string
      cov_epoch: string
      moid_jup: string
      t_jup: string
      condition_code: string
      not_valid_before: string
      rms: string
      model_pars: string[]
      orbit_id: string
      producer: string
      first_obs: string
      soln_date: string
      two_body: string
      epoch: string
      elements: string[]
      last_obs: string
      n_obs_used: string
      n_del_obs_used: string
      sb_used: string
      n_dop_obs_used: string
      comment: string
      pe_used: string
      data_arc: string
      not_valid_after: string
      computer: string
      a: string
      e: string
      i: string
      om: string
      w: string
      ma: string
      ad: string
      n: string
      tp: string
      per: string
      q: string
      ref: string
    }
    phys_par?: {
      [key: string]: any
    }
    ca?: Array<{
      cd: string
      dist: string
      dist_min: string
      dist_max: string
      v_rel: string
      v_inf: string
      t_sigma_f: string
      body: string
      h: string
    }>
  }
}

export interface ExoplanetData {
  pl_name: string
  hostname: string
  pl_orbper?: string | number
  pl_rade?: string | number
  disc_year?: string | number
  discoverymethod?: string
  [key: string]: any
}

export interface ProcessedExoplanetStats {
  total: number
  avgRadius: number
  avgPeriod: number
  uniqueStars: number
}

export interface ProcessedExoplanetData {
  filtered: ExoplanetData[]
  chartData: {
    datasets: Array<{
      label: string
      data: Array<{
        x: number
        y: number
        label: string
        hostStar: string
      }>
      backgroundColor: string
      borderColor: string
      pointRadius: number
      pointHoverRadius: number
    }>
  } | null
  stats: ProcessedExoplanetStats
}

export interface EarthdataCollection {
  id: string
  title: string
  summary?: string
  updated: string
  data_center?: string
  processing_level_id?: string
  time_start?: string
  time_end?: string
  boxes?: string[]
  links?: Array<{
    rel: string
    href: string
    title?: string
  }>
}

export interface EarthdataResponse {
  feed: {
    entry: EarthdataCollection[]
  }
}

// Component Props Types
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

// Navigation Types
export interface NavItem {
  path: string
  label: string
  icon: any // Lucide React icon component
}

// Chart Data Types
export interface ChartDataset {
  label: string
  data: number[] | Array<{ x: number; y: number; label?: string }>
  backgroundColor: string | string[]
  borderColor: string | string[]
  borderWidth?: number
  pointRadius?: number
  pointHoverRadius?: number
}

export interface ChartData {
  labels?: string[]
  datasets: ChartDataset[]
}

// API Error Types
export interface APIError {
  message: string
  status?: number
  code?: string
}