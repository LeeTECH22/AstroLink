import { describe, it, expect } from 'vitest'
import {
  FILL_VALUE,
  isMissingValue,
  normalCdf,
  linearRegression,
  mannKendall,
  sensSlope,
  studentTQuantile,
  buildMonthlySeries,
  analyzeTrend,
  buildAnnualSeries,
  seasonalAnalysis,
  completenessStats,
  detectOutliers,
  seasonalDecompose,
  linearForecast,
  backtestForecast,
  evaluateForecast,
  chronologicalSplit,
  detectAnomalies,
} from './trendStats'
import type { TrendObservation } from '../types'

describe('trendStats: missing-value handling', () => {
  it('flags NASA POWER fill value and non-finite numbers as missing', () => {
    expect(isMissingValue(FILL_VALUE)).toBe(true)
    expect(isMissingValue(null)).toBe(true)
    expect(isMissingValue(undefined)).toBe(true)
    expect(isMissingValue(NaN)).toBe(true)
    expect(isMissingValue(0)).toBe(false)
    expect(isMissingValue(12.5)).toBe(false)
  })
})

describe('trendStats: normal distribution', () => {
  it('normalCdf matches known values', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3)
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3)
  })
})

describe('trendStats: linear regression', () => {
  const points = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 },
  ]

  it('recovers an exact linear relationship (y = 2x)', () => {
    const result = linearRegression(points)
    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(2, 10)
    expect(result!.intercept).toBeCloseTo(0, 10)
    expect(result!.rSquared).toBeCloseTo(1, 10)
    expect(result!.degreesOfFreedom).toBe(2)
  })

  it('returns null when there are fewer than 3 points', () => {
    expect(linearRegression([{ x: 1, y: 1 }, { x: 2, y: 2 }])).toBeNull()
  })

  it('returns null when x has no variance', () => {
    expect(
      linearRegression([{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }])
    ).toBeNull()
  })
})

describe('trendStats: Mann-Kendall', () => {
  it('detects a strictly increasing series', () => {
    const result = mannKendall([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result).not.toBeNull()
    expect(result!.s).toBe(45)
    expect(result!.trend).toBe('increasing')
  })

  it('computes the classic closed-form S value for n=10', () => {
    const result = mannKendall([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    // S = n(n-1)/2 for a strictly monotonic series.
    expect(result!.s).toBe((10 * 9) / 2)
  })

  it('returns null for fewer than 3 values', () => {
    expect(mannKendall([1, 2])).toBeNull()
  })
})

describe('trendStats: Sen’s slope', () => {
  it('recovers the slope of a perfectly linear series', () => {
    const points = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 3 * i + 5 }))
    const result = sensSlope(points)
    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(3, 10)
  })
})

describe('trendStats: Student-t quantile', () => {
  it('approaches 1.96 for two-sided p=0.05 with large df', () => {
    expect(studentTQuantile(0.05, 10000)).toBeCloseTo(1.96, 2)
  })
})

// ---------------------------------------------------------------------------
// Synthetic-dataset validation. Each block builds a known ground-truth series
// and asserts that the analysis recovers the truth we put in.
// ---------------------------------------------------------------------------

// Build a raw POWER-shaped parameter map (keys "YYYYMM") from a generator.
const buildRaw = (
  startYear: number,
  endYear: number,
  fn: (year: number, month: number, index: number) => number
): Record<string, number> => {
  const raw: Record<string, number> = {}
  let index = 0
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      raw[`${year}${String(month).padStart(2, '0')}`] = fn(year, month, index)
      index += 1
    }
  }
  return raw
}

// Deterministic pseudo-noise (±0.75) so each calendar month varies year to year.
const noise = (year: number, month: number): number => (((year * 31 + month * 17) % 11) - 5) * 0.15

describe('trendStats synthetic validation: trends', () => {
  it('recovers a significant increasing trend', () => {
    const series = buildMonthlySeries(buildRaw(2015, 2024, (_y, _m, i) => 20 + 0.05 * i), 2015, 2024)
    const analysis = analyzeTrend('T2M', series)
    expect(analysis.validCount).toBe(120)
    expect(analysis.missingCount).toBe(0)
    expect(analysis.direction).toBe('increasing')
    expect(analysis.significant).toBe(true)
    expect(analysis.regression!.slope).toBeCloseTo(0.05, 10)
    expect(analysis.mannKendall!.trend).toBe('increasing')
    expect(analysis.sensSlope!.slope).toBeCloseTo(0.05, 10)
  })

  it('recovers a significant decreasing trend', () => {
    const series = buildMonthlySeries(buildRaw(2015, 2024, (_y, _m, i) => 100 - 0.2 * i), 2015, 2024)
    const analysis = analyzeTrend('PRECTOTCORR', series)
    expect(analysis.direction).toBe('decreasing')
    expect(analysis.significant).toBe(true)
    expect(analysis.regression!.slope).toBeCloseTo(-0.2, 10)
  })

  it('reports no trend for a constant series', () => {
    const series = buildMonthlySeries(buildRaw(2015, 2024, () => 25), 2015, 2024)
    const analysis = analyzeTrend('T2M', series)
    expect(analysis.regression!.slope).toBeCloseTo(0, 10)
    expect(analysis.significant).toBe(false)
    expect(analysis.direction).toBe('no trend')
    expect(analysis.mannKendall!.trend).toBe('no trend')
  })
})

describe('trendStats synthetic validation: seasonality', () => {
  const series = buildMonthlySeries(
    buildRaw(2015, 2024, (_y, m) => 25 - 10 * Math.cos((2 * Math.PI * (m - 1)) / 12)),
    2015,
    2024
  )

  it('recovers the seasonal amplitude and peak/trough months', () => {
    const seasonal = seasonalAnalysis(series)
    expect(seasonal.amplitude).toBeCloseTo(20, 6)
    expect(seasonal.peakMonth).toBe(7)
    expect(seasonal.troughMonth).toBe(1)
    expect(seasonal.months[0].mean).toBeCloseTo(15, 6)
    expect(seasonal.months[6].mean).toBeCloseTo(35, 6)
  })

  it('does not report a spurious time trend for a purely seasonal series', () => {
    const analysis = analyzeTrend('T2M', series)
    expect(Math.abs(analysis.regression!.slope)).toBeLessThan(0.05)
  })

  it('extracts a seasonal component with the expected sign per slot', () => {
    const decomposition = seasonalDecompose(series.values, 12)
    expect(decomposition.seasonal[0]).toBeLessThan(0) // January below the trend
    expect(decomposition.seasonal[6]).toBeGreaterThan(0) // July above the trend
    expect(decomposition.seasonal[6]).toBeGreaterThan(decomposition.seasonal[0])
  })
})

describe('trendStats synthetic validation: missing values', () => {
  it('counts missing months and excludes them from the analysis', () => {
    const raw = buildRaw(2015, 2024, (_y, _m, i) => 20 + 0.05 * i)
    raw['201601'] = FILL_VALUE
    raw['201602'] = FILL_VALUE
    raw['201901'] = FILL_VALUE
    const series = buildMonthlySeries(raw, 2015, 2024)
    expect(series.totalMonths).toBe(120)
    expect(series.missingCount).toBe(3)
    expect(series.observations.length).toBe(117)

    const completeness = completenessStats(series)
    expect(completeness.missingPercent).toBeCloseTo((3 / 120) * 100, 10)
    expect(completeness.yearsWithGaps).toEqual([2016, 2019])
    expect(completeness.completeYears).toBe(8)

    const annual = buildAnnualSeries(series)
    const year2016 = annual.points.find((point) => point.year === 2016)
    expect(year2016!.validMonths).toBe(10)
    expect(year2016!.complete).toBe(false)
  })
})

describe('trendStats synthetic validation: insufficient samples', () => {
  it('returns null statistics when there are too few observations', () => {
    const series = buildMonthlySeries({ '202401': 10, '202402': 12 }, 2024, 2024)
    const analysis = analyzeTrend('T2M', series)
    expect(analysis.regression).toBeNull()
    expect(analysis.mannKendall).toBeNull()
    expect(analysis.sensSlope).toBeNull()
    expect(analysis.direction).toBe('no trend')
    expect(analysis.validCount).toBe(2)
  })

  it('declines to backtest with fewer than 24 monthly observations', () => {
    const series = buildMonthlySeries(buildRaw(2024, 2024, (_y, _m, i) => i), 2024, 2024)
    expect(series.observations.length).toBe(12)
    const backtest = backtestForecast(series)
    expect(backtest.finite).toBe(false)
    expect(backtest.recommended).toBe('insufficient-data')
  })
})

describe('trendStats synthetic validation: outliers', () => {
  it('flags a single extreme observation with the robust method', () => {
    const raw = buildRaw(2015, 2024, (_y, m, i) => 20 + 0.02 * (i % 12) + 0.001 * m)
    raw['202007'] = 80
    const series = buildMonthlySeries(raw, 2015, 2024)
    const result = detectOutliers(series)
    expect(result.method).toBe('modified-z-score')
    expect(result.outliers.length).toBe(1)
    expect(result.outliers[0].label).toBe('2020-07')
    expect(result.outliers[0].direction).toBe('high')
    expect(Math.abs(result.outliers[0].score)).toBeGreaterThan(3.5)
  })

  it('falls back to the classical z-score when the MAD is zero', () => {
    const values = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 50]
    const raw: Record<string, number> = {}
    values.forEach((value, index) => {
      const year = 2020 + Math.floor(index / 12)
      const month = (index % 12) + 1
      raw[`${year}${String(month).padStart(2, '0')}`] = value
    })
    const series = buildMonthlySeries(raw, 2020, 2020)
    const result = detectOutliers(series)
    expect(result.method).toBe('z-score')
    expect(result.outliers.length).toBeGreaterThanOrEqual(1)
  })
})

describe('trendStats synthetic validation: anomalies', () => {
  it('detects a departure from the calendar-month climatology', () => {
    const raw = buildRaw(
      2015,
      2024,
      (year, m) => 25 - 10 * Math.cos((2 * Math.PI * (m - 1)) / 12) + noise(year, m)
    )
    raw['202107'] = (raw['202107'] ?? 0) + 25
    const series = buildMonthlySeries(raw, 2015, 2024)
    const result = detectAnomalies(series, { threshold: 2 })
    expect(result.anomalies.length).toBeGreaterThan(0)
    expect(result.anomalies[0].label).toBe('2021-07')
    expect(result.anomalies[0].severity).toBe('high')
    expect(result.anomalies[0].zScore).toBeGreaterThan(2)
  })
})

describe('trendStats synthetic validation: forecasting', () => {
  const trendSeries = () =>
    buildMonthlySeries(buildRaw(2005, 2024, (_y, _m, i) => 15 + 0.03 * i), 2005, 2024)

  it('backtests chronologically and beats climatology on a trend series', () => {
    const backtest = backtestForecast(trendSeries(), { horizon: 24 })
    expect(backtest.finite).toBe(true)
    // 240 monthly observations → 80/20 chronological split; 24-month test window.
    expect(backtest.trainCount).toBe(192)
    expect(backtest.testCount).toBe(24)
    expect(backtest.linear!.rmse).toBeLessThan(backtest.baseline!.rmse)
    expect(backtest.recommended).toBe('linear-trend')
  })

  it('produces prediction intervals that bracket the point forecast', () => {
    const series = trendSeries()
    const forecast = linearForecast(
      series.observations.map((observation) => ({ x: observation.index, y: observation.value })),
      12
    )
    expect(forecast).not.toBeNull()
    expect(forecast!.predictions.length).toBe(12)
    forecast!.predictions.forEach((point) => {
      expect(point.lower).toBeLessThanOrEqual(point.value)
      expect(point.upper).toBeGreaterThanOrEqual(point.value)
    })
  })

  it('computes forecast error metrics correctly', () => {
    const metrics = evaluateForecast([1, 2, 3], [1, 2, 5])
    expect(metrics.n).toBe(3)
    expect(metrics.mae).toBeCloseTo(2 / 3, 10)
    expect(metrics.rmse).toBeCloseTo(Math.sqrt(4 / 3), 10)
  })

  it('splits a series chronologically without look-ahead leakage', () => {
    const observations: TrendObservation[] = Array.from({ length: 10 }, (_, index) => ({
      index,
      label: `m${index}`,
      year: 2000,
      month: (index % 12) + 1,
      value: index,
    }))
    const { train, test } = chronologicalSplit(observations, 0.8)
    expect(train.length).toBe(8)
    expect(test.length).toBe(2)
    expect(Math.max(...train.map((o) => o.index))).toBeLessThan(Math.min(...test.map((o) => o.index)))
  })
})

describe('trendStats synthetic validation: annual aggregation', () => {
  it('averages each year from its valid months only', () => {
    const series = buildMonthlySeries(buildRaw(2020, 2022, (_y, m) => m), 2020, 2022)
    const annual = buildAnnualSeries(series)
    expect(annual.points.length).toBe(3)
    expect(annual.points[0].value).toBeCloseTo(6.5, 10) // mean of 1..12
    expect(annual.completeYears).toBe(3)
  })

  it('marks a year with missing months as incomplete', () => {
    const raw = buildRaw(2020, 2021, (_y, m) => m)
    raw['202003'] = FILL_VALUE
    const series = buildMonthlySeries(raw, 2020, 2021)
    const annual = buildAnnualSeries(series)
    const year2020 = annual.points.find((point) => point.year === 2020)
    expect(year2020!.validMonths).toBe(11)
    expect(year2020!.missingMonths).toBe(1)
    expect(year2020!.complete).toBe(false)
  })
})
