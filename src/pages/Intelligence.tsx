import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles'
import Send from 'lucide-react/dist/esm/icons/send'
import Bot from 'lucide-react/dist/esm/icons/bot'
import Download from 'lucide-react/dist/esm/icons/download'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Info from 'lucide-react/dist/esm/icons/info'
import Database from 'lucide-react/dist/esm/icons/database'
import { nasaApi } from '../services/api'
import {
  analyzeTrend,
  buildAnnualSeries,
  buildMonthlySeries,
  completenessStats,
  detectAnomalies,
  detectOutliers,
  getVariableMeta,
  linearRegression,
  MONTH_LABELS,
  seasonalAnalysis,
  TREND_VARIABLES,
} from '../utils/trendStats'
import type { AiExplainResponse, PowerDataResponse, TrendVariableId } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const DEFAULT_LATITUDE = '31.418'
const DEFAULT_LONGITUDE = '73.079'
const DEFAULT_START_YEAR = '2015'
const DEFAULT_END_YEAR = '2024'
const PARAMETERS = TREND_VARIABLES.map((variable) => variable.id).join(',')

const EXAMPLE_QUESTIONS = [
  'What environmental changes occurred in Faisalabad?',
  'Explain this statistical result in plain language.',
  'Is the temperature trend here statistically significant?',
  'Which months show the strongest seasonal pattern?',
]

const formatNumber = (value: number, digits = 3): string =>
  Number.isFinite(value) ? value.toFixed(digits) : 'N/A'

const formatSigned = (value: number, digits = 4): string =>
  Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(digits)}` : 'N/A'

interface StepState {
  key: string
  label: string
  status: 'pending' | 'done'
}

const Intelligence = () => {
  const [question, setQuestion] = useState('What environmental changes occurred in Faisalabad?')
  const [latitude, setLatitude] = useState(DEFAULT_LATITUDE)
  const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE)
  const [startYear, setStartYear] = useState(DEFAULT_START_YEAR)
  const [endYear, setEndYear] = useState(DEFAULT_END_YEAR)
  const [variable, setVariable] = useState<TrendVariableId>('T2M')
  const [running, setRunning] = useState(false)
  const [aiResult, setAiResult] = useState<AiExplainResponse | null>(null)

  const aiStatusQuery = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => nasaApi.getAiStatus(),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000,
  })

  const trendQuery = useQuery({
    queryKey: ['intelligence-trend', latitude, longitude, startYear, endYear],
    queryFn: () => nasaApi.getPowerTrend(latitude, longitude, startYear, endYear, PARAMETERS),
    select: (response) => response.data as PowerDataResponse,
    staleTime: 10 * 60 * 1000
  })

  const variableMeta = getVariableMeta(variable)

  const series = useMemo(
    () => buildMonthlySeries(trendQuery.data?.properties?.parameter?.[variable], Number(startYear), Number(endYear)),
    [trendQuery.data, variable, startYear, endYear]
  )

  const analysis = useMemo(() => analyzeTrend(variable, series), [variable, series])
  const annual = useMemo(() => buildAnnualSeries(series), [series])
  const annualTrend = useMemo(
    () => linearRegression(annual.points.map((point) => ({ x: point.year, y: point.value }))),
    [annual]
  )
  const seasonal = useMemo(() => seasonalAnalysis(series), [series])
  const completeness = useMemo(() => completenessStats(series), [series])
  const anomalies = useMemo(() => detectAnomalies(series, { threshold: 2 }), [series])
  const outliers = useMemo(() => detectOutliers(series), [series])

  const datasetName = trendQuery.data?.header?.title || 'NASA POWER (Prediction Of Worldwide Energy Resources)'

  // FACTS object: the ONLY source of numbers the AI may use. Built entirely from
  // deterministic, client-side analysis of real retrieved NASA POWER data.
  const facts = useMemo<Record<string, unknown>>(
    () => ({
      location: { latitude, longitude, label: `${latitude}, ${longitude}` },
      variable: { id: variable, label: variableMeta.label, units: variableMeta.units },
      dataset: datasetName,
      dataKind: 'gridded / model-derived (reanalysis) — NOT direct ground measurements',
      period: { startYear, endYear, temporalResolution: 'monthly' },
      quality: {
        validMonths: analysis.validCount,
        missingMonths: analysis.missingCount,
        totalMonths: series.totalMonths,
        completeYears: completeness.completeYears,
        expectedYears: completeness.expectedYears,
      },
      trend: analysis.regression
        ? {
            direction: analysis.direction,
            significantAtFivePercent: analysis.significant,
            slopePerMonth: Number(analysis.regression.slope.toFixed(5)),
            slopePerDecade: Number((analysis.regression.slope * 120).toFixed(4)),
            confidenceInterval95: [
              Number(analysis.regression.confidenceInterval.lower.toFixed(5)),
              Number(analysis.regression.confidenceInterval.upper.toFixed(5)),
            ],
            rSquared: Number(analysis.regression.rSquared.toFixed(4)),
            pValue: Number(analysis.regression.pValue.toFixed(6)),
            sensSlopePerMonth: analysis.sensSlope ? Number(analysis.sensSlope.slope.toFixed(5)) : null,
            mannKendallPValue: analysis.mannKendall ? Number(analysis.mannKendall.pValue.toFixed(6)) : null,
            mannKendallTrend: analysis.mannKendall ? analysis.mannKendall.trend : null,
          }
        : null,
      annualTrend: annualTrend
        ? {
            slopePerYear: Number(annualTrend.slope.toFixed(5)),
            pValue: Number(annualTrend.pValue.toFixed(6)),
          }
        : null,
      seasonality: {
        peakMonth: seasonal.peakMonth ? MONTH_LABELS[seasonal.peakMonth - 1] : null,
        troughMonth: seasonal.troughMonth ? MONTH_LABELS[seasonal.troughMonth - 1] : null,
        amplitude: seasonal.amplitude !== null ? Number(seasonal.amplitude.toFixed(3)) : null,
      },
      anomalies: {
        method: anomalies.baselineMethod,
        threshold: anomalies.threshold,
        count: anomalies.anomalies.length,
        top: anomalies.anomalies.slice(0, 3).map((item) => ({
          month: item.label,
          value: Number(item.value.toFixed(3)),
          baseline: Number(item.baseline.toFixed(3)),
          departure: Number(item.departure.toFixed(3)),
          zScore: Number(item.zScore.toFixed(3)),
        })),
      },
      outliers: { method: outliers.method, count: outliers.outliers.length },
      limitations: [
        'Statistical significance does not prove causation or anthropogenic climate change attribution.',
        'NASA POWER is gridded / model-derived reanalysis, not a direct ground measurement.',
        'Results describe the selected grid point and period only; missing months reduce statistical power.',
      ],
    }),
    [
      latitude,
      longitude,
      variable,
      variableMeta,
      datasetName,
      startYear,
      endYear,
      analysis,
      series,
      completeness,
      annualTrend,
      seasonal,
      anomalies,
      outliers,
    ]
  )

  const handleRun = async () => {
    if (!analysis.validCount) return
    setRunning(true)
    try {
      const response = await nasaApi.aiExplain(question, facts)
      setAiResult(response.data)
    } catch {
      // Deterministic analysis stays available even if the call fails entirely.
      setAiResult({
        available: false,
        mode: 'deterministic-only',
        answer: null,
        note: 'The explanation service could not be reached. Deterministic scientific results above remain valid.',
      })
    } finally {
      setRunning(false)
    }
  }

  const handleExport = () => {
    const lines: string[] = []
    lines.push('# AstroLink Intelligence — Scientific Report')
    lines.push('')
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push(`Question: ${question}`)
    lines.push('')
    lines.push('## Provenance')
    lines.push(`- Dataset: ${datasetName}`)
    lines.push(`- Variable: ${variableMeta.label} (${variableMeta.id}), units: ${variableMeta.units}`)
    lines.push(`- Location: ${latitude}, ${longitude}`)
    lines.push(`- Period: ${startYear}-${endYear} (monthly)`)
    lines.push('- Data kind: gridded / model-derived (reanalysis), not direct ground measurements')
    lines.push('')
    lines.push('## Deterministic results')
    lines.push(`- Valid months: ${analysis.validCount}; missing months: ${analysis.missingCount}`)
    lines.push(`- Trend direction: ${analysis.direction}; significant at 5%: ${analysis.significant ? 'yes' : 'no'}`)
    if (analysis.regression) {
      lines.push(`- Linear slope: ${formatSigned(analysis.regression.slope, 5)} ${variableMeta.units} per month (${formatSigned(analysis.regression.slope * 12, 3)} per decade)`)
      lines.push(`- R-squared: ${formatNumber(analysis.regression.rSquared, 4)}; p-value: ${formatNumber(analysis.regression.pValue, 6)}`)
    }
    if (analysis.sensSlope) {
      lines.push(`- Sen's slope: ${formatSigned(analysis.sensSlope.slope, 5)} ${variableMeta.units} per month`)
    }
    if (analysis.mannKendall) {
      lines.push(`- Mann-Kendall: ${analysis.mannKendall.trend}, p = ${formatNumber(analysis.mannKendall.pValue, 6)}`)
    }
    if (annualTrend) {
      lines.push(`- Annual slope: ${formatSigned(annualTrend.slope, 5)} ${variableMeta.units} per year (p = ${formatNumber(annualTrend.pValue, 6)})`)
    }
    lines.push(`- Anomalies (|z| >= ${anomalies.threshold}): ${anomalies.anomalies.length}`)
    lines.push(`- Outliers (${outliers.method}): ${outliers.outliers.length}`)
    lines.push('')
    lines.push('## AI narration')
    lines.push(aiResult && aiResult.answer ? aiResult.answer : '(No AI narration; deterministic-only mode.)')
    lines.push('')
    lines.push('## Limitations')
    lines.push('- Statistical significance does not prove causation or anthropogenic attribution.')
    lines.push('- NASA POWER is gridded / model-derived reanalysis, not direct ground measurements.')
    lines.push('- Results describe the selected grid point and period only.')

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `astrolink-intelligence-${variable}-${latitude}_${longitude}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const aiStatus = aiStatusQuery.data
  const hasData = analysis.validCount > 0

  const steps: StepState[] = [
    { key: 'understand', label: 'Interpret the natural-language question', status: 'done' },
    { key: 'identify', label: 'Identify location, variable and time period', status: 'done' },
    { key: 'discover', label: 'Discover a suitable NASA dataset', status: hasData ? 'done' : 'pending' },
    { key: 'retrieve', label: 'Retrieve data through the trusted backend service', status: hasData ? 'done' : 'pending' },
    { key: 'validate', label: 'Validate data and metadata quality', status: hasData ? 'done' : 'pending' },
    { key: 'analyse', label: 'Run deterministic statistical analysis', status: hasData ? 'done' : 'pending' },
    { key: 'explain', label: 'Narrate the actual results (AI or deterministic)', status: aiResult ? 'done' : 'pending' },
    { key: 'report', label: 'Prepare an exportable scientific report', status: hasData ? 'done' : 'pending' },
  ]

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Sparkles className="h-8 w-8 text-violet-400" />
          <h1 className="text-4xl font-bold text-white">AstroLink Intelligence</h1>
        </div>
        <p className="text-gray-200 max-w-3xl mx-auto">
          Ask a natural-language Earth-science question. AstroLink retrieves real NASA data, runs the
          deterministic statistics locally, and then explains the actual results. The assistant never invents
          measurements, statistics or sources.
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Your question</label>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, 1000))}
            rows={3}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-violet-500"
            placeholder="e.g. What environmental changes occurred in Faisalabad?"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLE_QUESTIONS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuestion(example)}
                className="text-xs px-3 py-1 rounded-full bg-violet-600/20 text-violet-200 hover:bg-violet-600/40 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Latitude</label>
            <input
              type="number"
              value={latitude}
              step="0.001"
              onChange={(event) => setLatitude(event.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Longitude</label>
            <input
              type="number"
              value={longitude}
              step="0.001"
              onChange={(event) => setLongitude(event.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Start year</label>
            <input
              type="number"
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">End year</label>
            <input
              type="number"
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Variable</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TREND_VARIABLES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setVariable(option.id)}
                className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                  option.id === variable
                    ? 'border-violet-500 bg-violet-600/20 text-white'
                    : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-violet-500/60'
                }`}
              >
                <div className="font-semibold">{option.label}</div>
                <div className="text-xs text-gray-400 mt-1">{option.id} · {option.units}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-gray-400 flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>
              AI narration:{' '}
              <strong className={aiStatus?.available ? 'text-emerald-300' : 'text-amber-300'}>
                {aiStatus ? (aiStatus.available ? `enabled (${aiStatus.provider})` : 'deterministic-only') : 'checking...'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={!hasData}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-700/60 text-gray-100 hover:bg-gray-600/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export report</span>
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={running || !hasData}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>{running ? 'Analysing...' : 'Run grounded analysis'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {trendQuery.isLoading ? (
        <LoadingSpinner text="Retrieving NASA POWER data through the trusted backend..." />
      ) : null}

      {trendQuery.error ? (
        <div className="card text-center py-8">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <p className="text-gray-200">
            NASA POWER data could not be retrieved for this selection. Adjust the coordinates or period and try again.
          </p>
        </div>
      ) : null}

      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow steps */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div className="flex items-center space-x-3 mb-4">
              <Bot className="h-5 w-5 text-violet-400" />
              <h3 className="text-lg font-semibold text-white">Grounded workflow</h3>
            </div>
            <ul className="space-y-3">
              {steps.map((step) => (
                <li key={step.key} className="flex items-start space-x-3 text-sm">
                  {step.status === 'done' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-600 mt-0.5 shrink-0" />
                  )}
                  <span className={step.status === 'done' ? 'text-gray-200' : 'text-gray-400'}>{step.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Deterministic results */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Deterministic results (source of every number)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Dataset</span>
                <span className="text-white text-right">{datasetName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Variable</span>
                <span className="text-white text-right">{variableMeta.label} ({variableMeta.units})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Coordinates</span>
                <span className="text-white">{latitude}, {longitude}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Period</span>
                <span className="text-white">{startYear}–{endYear} (monthly)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Trend direction</span>
                <span className="text-white capitalize">{analysis.direction}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Significant (5%)</span>
                <span className="text-white">{analysis.significant ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Slope / month</span>
                <span className="text-white">{analysis.regression ? formatSigned(analysis.regression.slope, 5) : 'N/A'} {variableMeta.units}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Slope / decade</span>
                <span className="text-white">{analysis.regression ? formatSigned(analysis.regression.slope * 12, 3) : 'N/A'} {variableMeta.units}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">R-squared</span>
                <span className="text-white">{analysis.regression ? formatNumber(analysis.regression.rSquared, 4) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Mann-Kendall p</span>
                <span className="text-white">{analysis.mannKendall ? formatNumber(analysis.mannKendall.pValue, 6) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Sen&apos;s slope / month</span>
                <span className="text-white">{analysis.sensSlope ? formatSigned(analysis.sensSlope.slope, 5) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-700/40">
                <span className="text-gray-300">Valid / missing months</span>
                <span className="text-white">{analysis.validCount} / {analysis.missingCount}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              These values are computed in the browser from the retrieved NASA POWER observations and are the only
              figures the assistant is allowed to reference.
            </p>
          </motion.div>
        </div>
      )}

      {/* AI answer */}
      {aiResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <Sparkles className={`h-5 w-5 ${aiResult.answer ? 'text-emerald-400' : 'text-amber-400'}`} />
              <h3 className="text-xl font-semibold text-white">Explanation</h3>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full ${
                aiResult.mode === 'ai-assisted'
                  ? aiResult.answer
                    ? 'bg-emerald-600/20 text-emerald-200'
                    : 'bg-amber-600/20 text-amber-200'
                  : 'bg-gray-600/30 text-gray-200'
              }`}
            >
              {aiResult.mode === 'ai-assisted'
                ? aiResult.answer
                  ? `AI-assisted (${aiResult.provider})`
                  : 'AI temporarily unavailable'
                : 'Deterministic-only'}
            </span>
          </div>

          {aiResult.answer ? (
            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{aiResult.answer}</div>
          ) : (
            <div className="space-y-3 text-sm text-gray-200">
              <p>{aiResult.note || 'AI narration is unavailable; the deterministic results above are unaffected.'}</p>
              <div className="rounded-xl border border-gray-700/60 p-4 bg-gray-800/40">
                <p className="font-semibold text-white mb-2">Deterministic summary</p>
                <p>
                  For <strong>{variableMeta.label}</strong> at {latitude}, {longitude} ({startYear}–{endYear}), the
                  monthly series shows a <strong>{analysis.direction}</strong> trend
                  {analysis.regression ? (
                    <> of about <strong>{formatSigned(analysis.regression.slope * 12, 3)} {variableMeta.units} per decade</strong></>
                  ) : null}
                  {analysis.significant
                    ? ', which is statistically significant at the 5% level.'
                    : ', which is not statistically significant at the 5% level.'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-100 text-xs">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Grounding &amp; limitations</p>
                <p>
                  The explanation is grounded only in the deterministic results shown above ({aiResult.groundedIn || 'deterministic-analysis'}).
                  Statistical significance does not prove causation or anthropogenic attribution, and NASA POWER is
                  gridded / model-derived reanalysis rather than a direct ground measurement.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default Intelligence
