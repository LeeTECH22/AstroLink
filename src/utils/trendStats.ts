// Statistical analysis utilities for the Earth Trend Detective module.
//
// Everything here is computed from the real observations supplied by the caller
// (NASA POWER monthly data). No values are invented: if there is not enough
// data to compute a statistic, the corresponding result is `null`.

import type {
  TrendAnalysis,
  TrendObservation,
  TrendVariableId,
  TrendVariableMeta,
  LinearRegressionResult,
  MannKendallResult,
  SensSlopeResult,
  ConfidenceInterval,
  AnnualPoint,
  AnnualSeries,
  SeasonalAnalysis,
  SeasonalMonthStat,
  CompletenessStats,
  OutlierResult,
  OutlierSummary,
  DecompositionResult,
  ForecastPoint,
  ForecastResult,
  ForecastMetrics,
  AnomalyRecord,
  AnomalyResult,
} from '../types'

// NASA POWER uses -999 as its fill value for missing data.
export const FILL_VALUE = -999
export const DEFAULT_SIGNIFICANCE_LEVEL = 0.05

// Catalogue of POWER variables offered by the monthly point endpoint
// (community = RE). Units and names follow the NASA POWER parameter dictionary.
export const TREND_VARIABLES: TrendVariableMeta[] = [
  {
    id: 'T2M',
    label: 'Temperature at 2 Meters',
    units: '°C',
    description: 'Air temperature 2 metres above the surface (NASA POWER / MERRA-2).',
  },
  {
    id: 'PRECTOTCORR',
    label: 'Precipitation',
    units: 'mm/day',
    description: 'Bias-corrected total precipitation rate (NASA POWER / MERRA-2).',
  },
  {
    id: 'ALLSKY_SFC_SW_DWN',
    label: 'Solar Radiation',
    units: 'kWh/m²/day',
    description: 'All-sky surface shortwave downward irradiance (NASA POWER).',
  },
]

export const getVariableMeta = (id: TrendVariableId): TrendVariableMeta =>
  TREND_VARIABLES.find((variable) => variable.id === id) || TREND_VARIABLES[0]

export const isMissingValue = (value: number | null | undefined): boolean =>
  value === null || value === undefined || !Number.isFinite(value) || Math.abs(value - FILL_VALUE) < 1e-6

// ---------------------------------------------------------------------------
// Distribution helpers (no external statistics dependency)
// ---------------------------------------------------------------------------

// Error function approximation (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7).
const erf = (x: number): number => {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax)
  return sign * y
}

// Standard normal cumulative distribution function.
export const normalCdf = (z: number): number => {
  if (z === 0) return 0.5
  const value = 0.5 * (1 + erf(z / Math.SQRT2))
  return Math.min(1, Math.max(0, value))
}

// Lanczos approximation of log(gamma(x)).
const logGamma = (x: number): number => {
  const g = 7
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  }
  const z = x - 1
  let a = coefficients[0]
  const t = z + g + 0.5
  for (let i = 1; i < g + 2; i += 1) {
    a += coefficients[i] / (z + i)
  }
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
}

// Continued fraction for the regularized incomplete beta function.
const betaContinuedFraction = (a: number, b: number, x: number): number => {
  const MAX_ITERATIONS = 200
  const EPSILON = 3e-12
  const TINY = 1e-300

  const qab = a + b
  const qap = a + 1
  const qam = a - 1

  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < TINY) d = TINY
  d = 1 / d
  let h = d

  for (let m = 1; m <= MAX_ITERATIONS; m += 1) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < TINY) d = TINY
    c = 1 + aa / c
    if (Math.abs(c) < TINY) c = TINY
    d = 1 / d
    h *= d * c

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < TINY) d = TINY
    c = 1 + aa / c
    if (Math.abs(c) < TINY) c = TINY
    d = 1 / d
    const delta = d * c
    h *= delta

    if (Math.abs(delta - 1) < EPSILON) break
  }
  return h
}

// Regularized incomplete beta function I_x(a, b).
export const regularizedIncompleteBeta = (a: number, b: number, x: number): number => {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front =
    Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(a, b, x)) / a
  }
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b
}

// Two-sided p-value for Student's t statistic with `df` degrees of freedom.
export const twoSidedTPValue = (t: number, df: number): number => {
  if (df <= 0) return NaN
  const x = df / (df + t * t)
  return regularizedIncompleteBeta(df / 2, 0.5, x)
}

// Critical t value whose two-sided p-value equals `twoSidedP` (bisection).
export const studentTQuantile = (twoSidedP: number, df: number): number => {
  if (df <= 0) return NaN
  let low = 0
  let high = 1e3
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2
    if (twoSidedTPValue(mid, df) > twoSidedP) low = mid
    else high = mid
  }
  return (low + high) / 2
}

// ---------------------------------------------------------------------------
// Statistical tests
// ---------------------------------------------------------------------------

const mean = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length

const median = (sortedValues: number[]): number => {
  const n = sortedValues.length
  if (n === 0) return NaN
  const middle = Math.floor(n / 2)
  return n % 2 === 0 ? (sortedValues[middle - 1] + sortedValues[middle]) / 2 : sortedValues[middle]
}

export interface TrendPoint {
  x: number
  y: number
}

// Ordinary least-squares linear regression with slope confidence interval.
export const linearRegression = (points: TrendPoint[]): LinearRegressionResult | null => {
  const n = points.length
  if (n < 3) return null

  const meanX = mean(points.map((point) => point.x))
  const meanY = mean(points.map((point) => point.y))

  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const point of points) {
    const dx = point.x - meanX
    const dy = point.y - meanY
    sxx += dx * dx
    sxy += dx * dy
    syy += dy * dy
  }
  if (sxx === 0) return null

  const slope = sxy / sxx
  const intercept = meanY - slope * meanX
  const rSquared = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy)
  const degreesOfFreedom = n - 2

  // Sum of squared residuals = Syy - slope * Sxy.
  const sumSquaredResiduals = Math.max(syy - slope * sxy, 0)
  const residualStandardError = Math.sqrt(sumSquaredResiduals / degreesOfFreedom)
  const standardError = residualStandardError / Math.sqrt(sxx)

  let tStatistic: number
  let pValue: number
  if (standardError === 0) {
    tStatistic = slope === 0 ? 0 : Infinity
    pValue = slope === 0 ? 1 : 0
  } else {
    tStatistic = slope / standardError
    pValue = twoSidedTPValue(tStatistic, degreesOfFreedom)
  }

  const criticalT = studentTQuantile(1 - 0.95, degreesOfFreedom)
  const confidenceInterval: ConfidenceInterval = {
    lower: slope - criticalT * standardError,
    upper: slope + criticalT * standardError,
    level: 0.95,
  }

  return {
    slope,
    intercept,
    rSquared,
    residualStandardError,
    standardError,
    tStatistic,
    degreesOfFreedom,
    pValue,
    confidenceInterval,
  }
}

// Mann-Kendall trend test (normal approximation with tie correction).
export const mannKendall = (values: number[]): MannKendallResult | null => {
  const n = values.length
  if (n < 3) return null

  let s = 0
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      s += Math.sign(values[j] - values[i])
    }
  }

  // Tie correction for the variance of S.
  const counts = new Map<number, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  let tieTerm = 0
  counts.forEach((count) => {
    if (count > 1) tieTerm += count * (count - 1) * (2 * count + 5)
  })

  const variance = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18

  let z = 0
  if (variance > 0) {
    if (s > 0) z = (s - 1) / Math.sqrt(variance)
    else if (s < 0) z = (s + 1) / Math.sqrt(variance)
  }

  const pValue = Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(z)))))
  const tau = s / (0.5 * n * (n - 1))
  const trend: MannKendallResult['trend'] =
    pValue < DEFAULT_SIGNIFICANCE_LEVEL ? (s > 0 ? 'increasing' : 'decreasing') : 'no trend'

  return { s, variance, z, pValue, tau, trend }
}

// Sen's slope estimator with the rank-based (non-parametric) confidence interval.
export const sensSlope = (points: TrendPoint[]): SensSlopeResult | null => {
  const n = points.length
  if (n < 3) return null

  const slopes: number[] = []
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const dx = points[j].x - points[i].x
      if (dx !== 0) slopes.push((points[j].y - points[i].y) / dx)
    }
  }
  if (slopes.length === 0) return null
  slopes.sort((a, b) => a - b)

  const slope = median(slopes)

  // Confidence interval using the variance of the Mann-Kendall statistic.
  const mk = mannKendall(points.map((point) => point.y))
  let confidenceInterval: ConfidenceInterval | null = null
  if (mk && mk.variance > 0) {
    const zCritical = 1.959963984540054 // 95% two-sided
    const cAlpha = zCritical * Math.sqrt(mk.variance)
    const totalSlopes = slopes.length
    const lowerRank = Math.ceil((totalSlopes - cAlpha) / 2)
    const upperRank = Math.ceil((totalSlopes + cAlpha) / 2)
    const clampIndex = (rank: number) => Math.min(Math.max(rank - 1, 0), totalSlopes - 1)
    confidenceInterval = {
      lower: slopes[clampIndex(lowerRank)],
      upper: slopes[clampIndex(upperRank)],
      level: 0.95,
    }
  }

  return { slope, confidenceInterval }
}

// ---------------------------------------------------------------------------
// Series assembly
// ---------------------------------------------------------------------------

export interface MonthlySeries {
  labels: string[] // "YYYY-MM"
  xValues: number[] // absolute month index (year * 12 + month - 1)
  values: (number | null)[] // raw monthly values (null when missing)
  observations: TrendObservation[]
  totalMonths: number
  missingCount: number
}

// Build a contiguous monthly series for the requested years. POWER's monthly
// endpoint also returns an annual value keyed with month "13"; that is excluded
// so the trend is computed from real months only.
export const buildMonthlySeries = (
  rawParameter: { [date: string]: number } | undefined,
  startYear: number,
  endYear: number
): MonthlySeries => {
  const labels: string[] = []
  const xValues: number[] = []
  const values: (number | null)[] = []
  const observations: TrendObservation[] = []
  let missingCount = 0

  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const key = `${year}${String(month).padStart(2, '0')}`
      const raw = rawParameter ? rawParameter[key] : undefined
      const value = typeof raw === 'number' && !isMissingValue(raw) ? raw : null
      const index = year * 12 + (month - 1)

      labels.push(`${year}-${String(month).padStart(2, '0')}`)
      xValues.push(index)
      values.push(value)

      if (value === null) {
        missingCount += 1
      } else {
        observations.push({
          index,
          label: `${year}-${String(month).padStart(2, '0')}`,
          year,
          month,
          value,
        })
      }
    }
  }

  return {
    labels,
    xValues,
    values,
    observations,
    totalMonths: labels.length,
    missingCount,
  }
}

// Run the full trend analysis for a variable's monthly series.
export const analyzeTrend = (
  variable: TrendVariableId,
  series: MonthlySeries
): TrendAnalysis => {
  const points: TrendPoint[] = series.observations.map((observation) => ({
    x: observation.index,
    y: observation.value,
  }))

  const regression = linearRegression(points)
  const kendall = mannKendall(series.observations.map((observation) => observation.value))
  const sen = sensSlope(points)

  const pValue = regression ? regression.pValue : kendall ? kendall.pValue : 1
  const significant = pValue < DEFAULT_SIGNIFICANCE_LEVEL
  const slopeSign = regression ? regression.slope : sen ? sen.slope : 0

  let direction: TrendAnalysis['direction'] = 'no trend'
  if (significant && slopeSign > 0) direction = 'increasing'
  else if (significant && slopeSign < 0) direction = 'decreasing'

  return {
    variable,
    observations: series.observations,
    regression,
    mannKendall: kendall,
    sensSlope: sen,
    direction,
    significant,
    significanceLevel: DEFAULT_SIGNIFICANCE_LEVEL,
    totalMonths: series.totalMonths,
    missingCount: series.missingCount,
    validCount: series.observations.length,
  }
}

// ---------------------------------------------------------------------------
// Aggregation, data quality, seasonality, anomalies and forecasting
//
// Nothing here invents observations. Every function derives its outputs only
// from the valid monthly observations supplied by the caller, and returns
// `null`/empty results when there is not enough data to be meaningful.
// ---------------------------------------------------------------------------

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Absolute month index (year * 12 + month - 1) → "YYYY-MM".
export const monthIndexToLabel = (x: number): string => {
  const year = Math.floor(x / 12)
  const month = (x % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

// Sample standard deviation (n-1). Returns 0 when fewer than 2 values.
const standardDeviation = (values: number[]): number => {
  const n = values.length
  if (n < 2) return 0
  const m = mean(values)
  const sumSquared = values.reduce((total, value) => total + (value - m) * (value - m), 0)
  return Math.sqrt(sumSquared / (n - 1))
}

const sortNumeric = (values: number[]): number[] => [...values].sort((a, b) => a - b)

// Annual aggregation built directly from the valid observations.
export const annualFromObservations = (observations: TrendObservation[]): AnnualSeries => {
  const byYear = new Map<number, number[]>()
  for (const observation of observations) {
    const bucket = byYear.get(observation.year)
    if (bucket) bucket.push(observation.value)
    else byYear.set(observation.year, [observation.value])
  }
  const points: AnnualPoint[] = [...byYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => {
      const values = byYear.get(year) as number[]
      const validMonths = values.length
      const missingMonths = 12 - validMonths
      return {
        year,
        value: mean(values),
        validMonths,
        missingMonths,
        complete: missingMonths === 0,
      }
    })
  return {
    points,
    totalYears: points.length,
    completeYears: points.filter((point) => point.complete).length,
  }
}

export const buildAnnualSeries = (series: MonthlySeries): AnnualSeries =>
  annualFromObservations(series.observations)

// Per-calendar-month climatology (mean/median/spread) across all years.
export const seasonalFromObservations = (observations: TrendObservation[]): SeasonalAnalysis => {
  const buckets: number[][] = Array.from({ length: 12 }, () => [])
  for (const observation of observations) {
    const index = observation.month - 1
    if (index >= 0 && index < 12) buckets[index].push(observation.value)
  }
  const months: SeasonalMonthStat[] = buckets.map((values, index) => {
    const sorted = sortNumeric(values)
    return {
      month: index + 1,
      label: MONTH_LABELS[index],
      mean: values.length > 0 ? mean(values) : null,
      median: values.length > 0 ? median(sorted) : null,
      min: values.length > 0 ? sorted[0] : null,
      max: values.length > 0 ? sorted[sorted.length - 1] : null,
      stdDev: values.length > 1 ? standardDeviation(values) : null,
      count: values.length,
    }
  })
  const means = months.map((month) => month.mean).filter((value): value is number => value !== null)
  let amplitude: number | null = null
  let peakMonth: number | null = null
  let troughMonth: number | null = null
  if (means.length > 0) {
    const maxMean = Math.max(...means)
    const minMean = Math.min(...means)
    amplitude = maxMean - minMean
    peakMonth = months.find((month) => month.mean === maxMean)?.month ?? null
    troughMonth = months.find((month) => month.mean === minMean)?.month ?? null
  }
  return { months, amplitude, peakMonth, troughMonth, validCount: observations.length }
}

export const seasonalAnalysis = (series: MonthlySeries): SeasonalAnalysis =>
  seasonalFromObservations(series.observations)

// Data completeness / missing-value statistics.
export const completenessStats = (series: MonthlySeries): CompletenessStats => {
  const validByYear = new Map<number, number>()
  const missingByYear = new Map<number, number>()
  for (let i = 0; i < series.labels.length; i += 1) {
    const year = Number(series.labels[i].slice(0, 4))
    if (series.values[i] === null) {
      missingByYear.set(year, (missingByYear.get(year) || 0) + 1)
    } else {
      validByYear.set(year, (validByYear.get(year) || 0) + 1)
    }
  }
  const years = [...new Set([...validByYear.keys(), ...missingByYear.keys()])].sort((a, b) => a - b)
  const yearsWithGaps = years.filter((year) => (missingByYear.get(year) || 0) > 0)
  return {
    totalMonths: series.totalMonths,
    validMonths: series.totalMonths - series.missingCount,
    missingMonths: series.missingCount,
    missingPercent: series.totalMonths > 0 ? (series.missingCount / series.totalMonths) * 100 : 0,
    expectedYears: years.length,
    completeYears: years.length - yearsWithGaps.length,
    yearsWithGaps,
  }
}

// Outlier detection. Uses the robust modified z-score (median + MAD) whenever
// the MAD is non-zero, otherwise falls back to the classical z-score.
export const detectOutliers = (
  series: MonthlySeries,
  options: { threshold?: number } = {}
): OutlierSummary => {
  const values = series.observations.map((observation) => observation.value)
  if (values.length === 0) {
    return {
      outliers: [],
      method: 'modified-z-score',
      threshold: options.threshold ?? 3.5,
      center: NaN,
      spread: NaN,
      checkedCount: 0,
    }
  }

  const sorted = sortNumeric(values)
  const center = median(sorted)
  const absoluteDeviations = sortNumeric(values.map((value) => Math.abs(value - center)))
  const mad = median(absoluteDeviations)

  const buildOutliers = (
    score: (value: number) => number,
    threshold: number
  ): OutlierResult[] =>
    series.observations
      .map((observation) => ({
        label: observation.label,
        year: observation.year,
        month: observation.month,
        value: observation.value,
        score: score(observation.value),
        direction: (observation.value >= center ? 'high' : 'low') as OutlierResult['direction'],
      }))
      .filter((outlier) => Math.abs(outlier.score) >= threshold)
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))

  if (mad > 0) {
    const threshold = options.threshold ?? 3.5
    return {
      outliers: buildOutliers((value) => (0.6745 * (value - center)) / mad, threshold),
      method: 'modified-z-score',
      threshold,
      center,
      spread: 1.4826 * mad,
      checkedCount: values.length,
    }
  }

  const meanValue = mean(values)
  const spread = standardDeviation(values)
  const threshold = options.threshold ?? 3
  if (spread === 0) {
    return {
      outliers: [],
      method: 'z-score',
      threshold,
      center: meanValue,
      spread: 0,
      checkedCount: values.length,
    }
  }
  return {
    outliers: buildOutliers((value) => (value - meanValue) / spread, threshold).map((outlier) => ({
      ...outlier,
      direction: outlier.value >= meanValue ? 'high' : 'low',
    })),
    method: 'z-score',
    threshold,
    center: meanValue,
    spread,
    checkedCount: values.length,
  }
}

// Classical additive seasonal decomposition: centred moving-average trend,
// per-slot (calendar month) seasonal indices centred on zero, and remainder.
export const seasonalDecompose = (
  values: (number | null)[],
  period = 12
): DecompositionResult => {
  const n = values.length
  const trend: (number | null)[] = new Array(n).fill(null)
  const half = Math.floor(period / 2)

  for (let i = 0; i < n; i += 1) {
    const start = i - half
    const end = i + half
    if (start < 0 || end >= n) continue
    let sum = 0
    let complete = true
    for (let j = start; j <= end; j += 1) {
      const value = values[j]
      if (value === null) {
        complete = false
        break
      }
      sum += value
    }
    if (!complete) continue
    if (period % 2 === 0) {
      const first = values[start] as number
      const last = values[end] as number
      trend[i] = (sum - 0.5 * first - 0.5 * last) / (period + 1 - 1)
    } else {
      trend[i] = sum / (period + 1)
    }
  }

  const seasonal = new Array(period).fill(0)
  const slotCounts = new Array(period).fill(0)
  for (let i = 0; i < n; i += 1) {
    const trendValue = trend[i]
    const value = values[i]
    if (value === null || trendValue === null) continue
    const slot = i % period
    seasonal[slot] += value - trendValue
    slotCounts[slot] += 1
  }
  for (let slot = 0; slot < period; slot += 1) {
    seasonal[slot] = slotCounts[slot] > 0 ? seasonal[slot] / slotCounts[slot] : 0
  }
  const seasonalMean = mean(seasonal)
  for (let slot = 0; slot < period; slot += 1) seasonal[slot] -= seasonalMean

  const residual: (number | null)[] = values.map((value, i) => {
    const trendValue = trend[i]
    if (value === null || trendValue === null) return null
    return value - trendValue - seasonal[i % period]
  })

  return {
    period,
    method: 'classical-additive-centred-moving-average',
    trend,
    seasonal,
    residual,
  }
}

// Regression-based forecast with a prediction interval (not a confidence
// interval for the mean line): y ± t * s * sqrt(1 + 1/n + (x0 - x̄)² / Sxx).
export const linearForecast = (
  points: TrendPoint[],
  horizon: number,
  options: { intervalLevel?: number; lastIndex?: number } = {}
): ForecastResult | null => {
  const regression = linearRegression(points)
  if (!regression) return null

  const n = points.length
  const meanX = mean(points.map((point) => point.x))
  const sxx = points.reduce((total, point) => total + (point.x - meanX) * (point.x - meanX), 0)
  const level = options.intervalLevel ?? 0.95
  const criticalT = studentTQuantile(1 - level, regression.degreesOfFreedom)
  const lastIndex = options.lastIndex ?? Math.max(...points.map((point) => point.x))

  const predictions: ForecastPoint[] = []
  for (let step = 1; step <= horizon; step += 1) {
    const x = lastIndex + step
    const value = regression.intercept + regression.slope * x
    const standardError =
      regression.residualStandardError * Math.sqrt(1 + 1 / n + ((x - meanX) * (x - meanX)) / sxx)
    const margin = Number.isFinite(criticalT) ? criticalT * standardError : 0
    predictions.push({
      x,
      label: monthIndexToLabel(x),
      value,
      lower: value - margin,
      upper: value + margin,
    })
  }

  return {
    method: 'ordinary-least-squares-with-prediction-interval',
    horizon,
    predictions,
    slope: regression.slope,
    intercept: regression.intercept,
    residualStandardError: regression.residualStandardError,
    intervalLevel: level,
  }
}

// Seasonal forecast: monthly climatology plus a linear drift fitted to the
// annual means. More appropriate than a pure trend line for variables with a
// strong seasonal cycle (temperature, precipitation, solar radiation).
export const seasonalDriftForecast = (
  series: MonthlySeries,
  horizon: number,
  options: { intervalLevel?: number } = {}
): ForecastResult | null => {
  if (series.observations.length < 24) return null

  const annual = annualFromObservations(series.observations)
  if (annual.points.length < 3) return null
  const annualRegression = linearRegression(annual.points.map((point) => ({ x: point.year, y: point.value })))
  if (!annualRegression) return null

  const seasonal = seasonalFromObservations(series.observations)
  const monthMeans = seasonal.months.map((month) => month.mean)
  const definedMeans = monthMeans.filter((value): value is number => value !== null)
  const grandMean = mean(definedMeans)

  const lastIndex = Math.max(...series.observations.map((observation) => observation.index))
  const level = options.intervalLevel ?? 0.95
  const criticalT = studentTQuantile(1 - level, annualRegression.degreesOfFreedom)

  const predictions: ForecastPoint[] = []
  for (let step = 1; step <= horizon; step += 1) {
    const x = lastIndex + step
    const year = Math.floor(x / 12)
    const monthIndex = x % 12
    const annualLevel = annualRegression.intercept + annualRegression.slope * year
    const monthMean = monthMeans[monthIndex]
    const value = annualLevel + (monthMean === null ? 0 : monthMean - grandMean)
    const margin = Number.isFinite(criticalT) ? criticalT * annualRegression.residualStandardError : 0
    predictions.push({
      x,
      label: monthIndexToLabel(x),
      value,
      lower: value - margin,
      upper: value + margin,
    })
  }

  return {
    method: 'seasonal-climatology-with-annual-drift',
    horizon,
    predictions,
    slope: annualRegression.slope,
    intercept: annualRegression.intercept,
    residualStandardError: annualRegression.residualStandardError,
    intervalLevel: level,
  }
}

// Forecast error metrics.
export const evaluateForecast = (actual: number[], predicted: number[]): ForecastMetrics => {
  const n = Math.min(actual.length, predicted.length)
  let sumAbs = 0
  let sumSquared = 0
  let sumPercent = 0
  let percentCount = 0
  for (let i = 0; i < n; i += 1) {
    const error = actual[i] - predicted[i]
    sumAbs += Math.abs(error)
    sumSquared += error * error
    if (actual[i] !== 0) {
      sumPercent += Math.abs(error / actual[i])
      percentCount += 1
    }
  }
  return {
    mae: n > 0 ? sumAbs / n : NaN,
    rmse: n > 0 ? Math.sqrt(sumSquared / n) : NaN,
    mape: percentCount > 0 ? (sumPercent / percentCount) * 100 : null,
    n,
  }
}

// Chronological train/test split (never random: avoids look-ahead leakage).
export const chronologicalSplit = (
  observations: TrendObservation[],
  trainRatio = 0.8
): { train: TrendObservation[]; test: TrendObservation[] } => {
  const cut = Math.max(
    1,
    Math.min(observations.length - 1, Math.floor(observations.length * trainRatio))
  )
  return { train: observations.slice(0, cut), test: observations.slice(cut) }
}

export interface BacktestResult {
  finite: boolean
  horizon: number
  trainCount: number
  testCount: number
  linear: ForecastMetrics | null
  seasonal: ForecastMetrics | null
  baseline: ForecastMetrics | null
  recommended: 'linear-trend' | 'seasonal-drift' | 'climatology' | 'insufficient-data'
  recommendationReason: string
}

// Backtest the forecast methods on a held-out chronological test window and
// compare them with a climatology baseline.
export const backtestForecast = (
  series: MonthlySeries,
  options: { horizon?: number; trainRatio?: number } = {}
): BacktestResult => {
  const horizon = options.horizon ?? 24
  const trainRatio = options.trainRatio ?? 0.8
  const observations = series.observations

  const insufficient = (reason: string): BacktestResult => ({
    finite: false,
    horizon,
    trainCount: observations.length,
    testCount: 0,
    linear: null,
    seasonal: null,
    baseline: null,
    recommended: 'insufficient-data',
    recommendationReason: reason,
  })

  if (observations.length < 24) {
    return insufficient('Fewer than 24 valid monthly observations; forecasting is not attempted.')
  }

  const { train, test } = chronologicalSplit(observations, trainRatio)
  const testWindow = test.slice(0, horizon)
  if (train.length < 12 || testWindow.length === 0) {
    return insufficient('Not enough observations on either side of the train/test split.')
  }

  const actual = testWindow.map((observation) => observation.value)
  const trainPoints: TrendPoint[] = train.map((observation) => ({
    x: observation.index,
    y: observation.value,
  }))

  // Method 1 — ordinary least squares on the monthly series.
  const linearModel = linearRegression(trainPoints)
  const linear = linearModel
    ? evaluateForecast(actual, testWindow.map((o) => linearModel.intercept + linearModel.slope * o.index))
    : null

  // Method 2 — seasonal climatology plus annual drift.
  const trainSeasonal = seasonalFromObservations(train)
  const monthMeans = trainSeasonal.months.map((month) => month.mean)
  const definedMeans = monthMeans.filter((value): value is number => value !== null)
  const grandMean = definedMeans.length > 0 ? mean(definedMeans) : NaN
  const trainAnnual = annualFromObservations(train)
  const annualModel = trainAnnual.points.length >= 3
    ? linearRegression(trainAnnual.points.map((point) => ({ x: point.year, y: point.value })))
    : null
  const seasonal = annualModel
    ? evaluateForecast(
        actual,
        testWindow.map((observation) => {
          const annualLevel = annualModel.intercept + annualModel.slope * observation.year
          const monthMean = monthMeans[observation.month - 1]
          return annualLevel + (monthMean === null ? 0 : monthMean - grandMean)
        })
      )
    : null

  // Baseline — climatology (per-month mean of the training window).
  const baseline = evaluateForecast(
    actual,
    testWindow.map((observation) => {
      const monthMean = monthMeans[observation.month - 1]
      return monthMean === null ? grandMean : monthMean
    })
  )

  const candidates: Array<{ name: BacktestResult['recommended']; rmse: number }> = []
  if (linear && Number.isFinite(linear.rmse)) candidates.push({ name: 'linear-trend', rmse: linear.rmse })
  if (seasonal && Number.isFinite(seasonal.rmse)) candidates.push({ name: 'seasonal-drift', rmse: seasonal.rmse })
  if (Number.isFinite(baseline.rmse)) candidates.push({ name: 'climatology', rmse: baseline.rmse })

  candidates.sort((a, b) => a.rmse - b.rmse)
  const best = candidates[0]

  return {
    finite: true,
    horizon,
    trainCount: train.length,
    testCount: testWindow.length,
    linear,
    seasonal,
    baseline,
    recommended: best ? best.name : 'insufficient-data',
    recommendationReason: best
      ? `Lowest held-out RMSE on ${testWindow.length} test months: ${best.name} (RMSE ${best.rmse.toFixed(3)}).`
      : 'No method produced a finite error metric.',
  }
}

// Anomaly detection relative to a per-calendar-month climatology baseline.
export const detectAnomalies = (
  series: MonthlySeries,
  options: { threshold?: number } = {}
): AnomalyResult => {
  const threshold = options.threshold ?? 2
  const buckets: number[][] = Array.from({ length: 12 }, () => [])
  for (const observation of series.observations) {
    const index = observation.month - 1
    if (index >= 0 && index < 12) buckets[index].push(observation.value)
  }
  const baselineByMonth: (number | null)[] = buckets.map((values) =>
    values.length > 0 ? mean(values) : null
  )
  const spreadByMonth: (number | null)[] = buckets.map((values) =>
    values.length > 1 ? standardDeviation(values) : null
  )

  const anomalies: AnomalyRecord[] = []
  for (const observation of series.observations) {
    const baseline = baselineByMonth[observation.month - 1]
    const spread = spreadByMonth[observation.month - 1]
    if (baseline === null || spread === null || spread === 0) continue
    const zScore = (observation.value - baseline) / spread
    if (Math.abs(zScore) >= threshold) {
      anomalies.push({
        label: observation.label,
        year: observation.year,
        month: observation.month,
        value: observation.value,
        baseline,
        departure: observation.value - baseline,
        zScore,
        severity: zScore >= 0 ? 'high' : 'low',
      })
    }
  }
  anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))

  return {
    anomalies,
    baselineMethod: 'calendar-month climatology (mean ± 1 sample standard deviation)',
    threshold,
    baselineByMonth,
  }
}
