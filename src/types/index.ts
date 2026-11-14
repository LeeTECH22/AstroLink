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
  _meta?: Record<string, unknown>
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

export interface GeomagneticStorm {
  gstID: string
  startTime: string
  allKpIndex?: Array<{
    observedTime: string
    kpIndex: number
    source?: string
  }>
  link?: string
}

export interface SpaceWeatherResponse {
  solarFlares: SolarFlare[]
  cmes: CoronalMassEjection[]
  geomagneticStorms?: GeomagneticStorm[]
  _meta?: Record<string, unknown>
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
  // POWER includes a descriptive header (title, fill value, returned range).
  header?: {
    title?: string
    api?: string
    fill_value?: number
    start?: string
    end?: string
  }
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

// ---- Earth Trend Detective ----
// Variables offered by the NASA POWER monthly point endpoint (community=RE).
export type TrendVariableId = 'T2M' | 'PRECTOTCORR' | 'ALLSKY_SFC_SW_DWN'

export interface TrendVariableMeta {
  id: TrendVariableId
  label: string
  units: string
  description: string
}

// A single valid observation in the series (missing months are excluded).
export interface TrendObservation {
  index: number // absolute month number (year * 12 + month - 1), keeps real spacing
  label: string // e.g. "2015-01"
  year: number
  month: number
  value: number
}

export interface ConfidenceInterval {
  lower: number
  upper: number
  level: number
}

export interface LinearRegressionResult {
  slope: number
  intercept: number
  rSquared: number
  residualStandardError: number
  standardError: number
  tStatistic: number
  degreesOfFreedom: number
  pValue: number
  confidenceInterval: ConfidenceInterval
}

export interface MannKendallResult {
  s: number
  variance: number
  z: number
  pValue: number
  tau: number
  trend: 'increasing' | 'decreasing' | 'no trend'
}

export interface SensSlopeResult {
  slope: number
  confidenceInterval: ConfidenceInterval | null
}

export interface TrendAnalysis {
  variable: TrendVariableId
  observations: TrendObservation[]
  regression: LinearRegressionResult | null
  mannKendall: MannKendallResult | null
  sensSlope: SensSlopeResult | null
  direction: 'increasing' | 'decreasing' | 'no trend'
  significant: boolean
  significanceLevel: number
  totalMonths: number
  missingCount: number
  validCount: number
}

// ---- Earth Trend Detective: aggregation, quality, anomaly & forecast ----

// One calendar year, aggregated from its valid months only.
export interface AnnualPoint {
  year: number
  value: number // mean of the year's valid months
  validMonths: number
  missingMonths: number
  complete: boolean
}

export interface AnnualSeries {
  points: AnnualPoint[]
  totalYears: number
  completeYears: number
}

// Descriptive statistics for one calendar month (across all years).
export interface SeasonalMonthStat {
  month: number // 1-12
  label: string // "Jan" ...
  mean: number | null
  median: number | null
  min: number | null
  max: number | null
  stdDev: number | null
  count: number
}

export interface SeasonalAnalysis {
  months: SeasonalMonthStat[]
  amplitude: number | null // max(monthly mean) - min(monthly mean)
  peakMonth: number | null
  troughMonth: number | null
  validCount: number
}

export interface CompletenessStats {
  totalMonths: number
  validMonths: number
  missingMonths: number
  missingPercent: number
  expectedYears: number
  completeYears: number
  yearsWithGaps: number[]
}

export interface OutlierResult {
  label: string
  year: number
  month: number
  value: number
  score: number // modified z-score (robust) or z-score (fallback)
  direction: 'high' | 'low'
}

export interface OutlierSummary {
  outliers: OutlierResult[]
  method: 'modified-z-score' | 'z-score'
  threshold: number
  center: number // median (robust) or mean (fallback)
  spread: number // MAD * 1.4826 (robust) or std-dev (fallback)
  checkedCount: number
}

export interface DecompositionResult {
  period: number
  method: string
  trend: (number | null)[]
  seasonal: number[] // length = period, index 0 = first period slot
  residual: (number | null)[]
}

export interface ForecastPoint {
  x: number
  label: string
  value: number
  lower: number
  upper: number // bounds of the prediction interval
}

export interface ForecastResult {
  method: string
  horizon: number
  predictions: ForecastPoint[]
  slope: number
  intercept: number
  residualStandardError: number
  intervalLevel: number
}

export interface ForecastMetrics {
  mae: number
  rmse: number
  mape: number | null
  n: number
}

export interface AnomalyRecord {
  label: string
  year: number
  month: number
  value: number
  baseline: number // climatological value for that calendar month
  departure: number // value - baseline
  zScore: number
  severity: 'high' | 'low'
}

export interface AnomalyResult {
  anomalies: AnomalyRecord[]
  baselineMethod: string
  threshold: number
  baselineByMonth: (number | null)[]
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

// ---- Multi-source data fusion and AI agent ----

export type ProviderKind = 'reanalysis' | 'observation' | 'event' | 'catalog' | 'imagery'

export interface ProviderVariable {
  id: string
  label: string
  units: string
  category: string
}

export interface ProviderInfo {
  id: string
  label: string
  kind: ProviderKind
  dataset: string
  temporalResolution: string
  spatialResolution: string
  notes: string
  variables: ProviderVariable[]
  requiresKey: boolean
  configured: boolean
}

export interface ProviderCircuit {
  state: 'closed' | 'open' | 'half-open'
  consecutiveFailures: number
  totalSuccesses: number
  totalFailures: number
  lastStatus: number | null
  retryInMs: number
}

export interface ProviderHealth {
  id: string
  label: string
  kind: ProviderKind
  configured: boolean
  circuit: ProviderCircuit
  metrics: {
    requests: number
    successes: number
    failures: number
    cacheHits: number
    lastLatencyMs: number | null
    lastStatus: number | null
    lastFetchAt: string | null
    lastError: string | null
  }
}

export interface ProviderCatalogResponse {
  providers: ProviderInfo[]
  health: ProviderHealth[]
  cache: { entries: number; hits: number; misses: number; hitRate: number }
}

export interface ProviderDataEnvelope<T = any> {
  provider: string
  label: string
  dataset: string
  kind: ProviderKind
  temporalResolution: string
  spatialResolution: string
  sourceUrl: string
  fetchedAt: string
  latencyMs: number
  cached: boolean
  notes: string
  data: T
}

export interface AiStatus {
  available: boolean
  provider: string
  model: string | null
  mode: 'ai-assisted' | 'deterministic-only'
  note: string
}

export interface AiExplainResponse {
  available: boolean
  mode: 'ai-assisted' | 'deterministic-only'
  provider?: string
  model?: string | null
  answer: string | null
  note?: string
  error?: boolean
  groundedIn?: string
}

// ---- NASA AI Research (restricted research assistant) ----

export interface ResearchChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiResearchResponse {
  available: boolean
  provider: string
  model: string | null
  answer: string | null
  note?: string
  error?: boolean
  detail?: string
}

// ---- NASA ADS (Astrophysics Data System) ----

export interface AdsPaper {
  bibcode: string
  title: string
  authors: string[]
  year?: string
  journal?: string
  abstract: string | null
  citations: number | null
  doi: string | null
  doctype: string | null
  refereed: boolean
}

export interface AdsSearchResponse {
  source: string
  query: string
  page: number
  rows: number
  numFound: number
  papers: AdsPaper[]
}
