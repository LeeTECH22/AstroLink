// Temporary verification harness for src/utils/trendStats.ts
// Runs the pure statistics functions against datasets with known answers.
import { readFileSync } from 'fs'
import { transformSync } from 'esbuild'

const source = readFileSync('src/utils/trendStats.ts', 'utf8')
const { code } = transformSync(source, { loader: 'ts', format: 'esm' })
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

const { linearRegression, mannKendall, sensSlope, twoSidedTPValue, studentTQuantile, normalCdf, buildMonthlySeries } = mod

let failures = 0
const check = (name, actual, expected, tolerance = 1e-6) => {
  const ok = Math.abs(actual - expected) <= tolerance
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${actual}, expected ~${expected}`)
}
const checkTrue = (name, condition) => {
  if (!condition) failures += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`)
}

// --- 1. Distribution functions vs published t-table / normal values ---------
// Two-sided 95% critical values from standard t tables.
check('t(0.975, 10) table value', studentTQuantile(0.05, 10), 2.228138852, 1e-5)
check('t(0.975, 8) table value', studentTQuantile(0.05, 8), 2.306004135, 1e-5)
check('t(0.995, 8) table value', studentTQuantile(0.01, 8), 3.355387331, 1e-5)
check('t(0.975, 30) table value', studentTQuantile(0.05, 30), 2.042272456, 1e-5)
check('twoSidedTPValue(2.306004135, 8)', twoSidedTPValue(2.306004135, 8), 0.05, 1e-7)
check('twoSidedTPValue(3.355387331, 8)', twoSidedTPValue(3.355387331, 8), 0.01, 1e-7)
check('twoSidedTPValue(0, 8)', twoSidedTPValue(0, 8), 1, 1e-9)
check('normalCdf(0)', normalCdf(0), 0.5, 1e-7)
check('normalCdf(1.959963985)', normalCdf(1.959963985), 0.975, 1e-6)
check('normalCdf(-1.959963985)', normalCdf(-1.959963985), 0.025, 1e-6)

// --- 2. Linear regression, exact (analytic) case: y = 5 + 2x ----------------
const line = Array.from({ length: 12 }, (_, i) => ({ x: i + 1, y: 5 + 2 * (i + 1) }))
const reg = linearRegression(line)
check('perfect fit slope', reg.slope, 2)
check('perfect fit intercept', reg.intercept, 5)
check('perfect fit R^2', reg.rSquared, 1)
checkTrue('perfect fit p-value ~ 0', reg.pValue < 1e-9)

// --- 3. Linear regression, hand-computed dataset ---------------------------
// x = 1..10 ; y = [2,4,5,4,5,7,8,9,10,12]
// Sxx=82.5, Sxy=83, Syy=88.4, slope=83/82.5, intercept=6.6-slope*5.5
const y = [2, 4, 5, 4, 5, 7, 8, 9, 10, 12]
const ds = y.map((value, i) => ({ x: i + 1, y: value }))
const dsReg = linearRegression(ds)
check('example slope', dsReg.slope, 83 / 82.5, 1e-9)
check('example intercept', dsReg.intercept, 6.6 - (83 / 82.5) * 5.5, 1e-9)
check('example R^2', dsReg.rSquared, 6889 / 7293, 1e-9)
check('example residual standard error', dsReg.residualStandardError, Math.sqrt(4.8969697 / 8), 1e-6)
check('example SE(slope)', dsReg.standardError, Math.sqrt(4.8969697 / 8) / Math.sqrt(82.5), 1e-9)
check('example t statistic', dsReg.tStatistic, (83 / 82.5) / (Math.sqrt(4.8969697 / 8) / Math.sqrt(82.5)), 1e-6)
checkTrue('example p-value between 1e-6 and 1e-5', dsReg.pValue > 1e-6 && dsReg.pValue < 1e-5)
checkTrue('example 95% CI excludes zero', dsReg.confidenceInterval.lower > 0)
checkTrue('example df = n - 2', dsReg.degreesOfFreedom === 8)

// --- 4. Mann-Kendall, exact for a strictly increasing series 1..10 ----------
// S = 45 ; Var = n(n-1)(2n+5)/18 = 125 ; Z = (45-1)/sqrt(125)
const mk = mannKendall(Array.from({ length: 10 }, (_, i) => i + 1))
check('MK S (1..10)', mk.s, 45, 1e-9)
check('MK variance (1..10)', mk.variance, 125, 1e-9)
check('MK Z (1..10)', mk.z, 44 / Math.sqrt(125), 1e-9)
check('MK p-value (1..10)', mk.pValue, 2 * (1 - normalCdf(44 / Math.sqrt(125))), 1e-9)
checkTrue('MK trend increasing', mk.trend === 'increasing')

// --- 5. Sen's slope, exact for a linear series ------------------------------
check("Sen's slope (y = 3x)", sensSlope(Array.from({ length: 10 }, (_, i) => ({ x: i + 1, y: 3 * (i + 1) }))).slope, 3)

// --- 6. Constant series -> no trend ----------------------------------------
const flatMk = mannKendall(new Array(12).fill(7))
checkTrue('MK constant series -> no trend', flatMk.trend === 'no trend' && flatMk.pValue === 1)

// --- 7. Monthly series assembly --------------------------------------------
const series = buildMonthlySeries(
  { '202001': 10, '202002': -999, '202003': 12, '202013': 99 },
  2020,
  2020
)
checkTrue('series has 12 months', series.totalMonths === 12)
checkTrue('series flags 10 missing months (Feb + 9 absent)', series.missingCount === 10)
checkTrue('series keeps 2 valid observations', series.observations.length === 2)
checkTrue('series excludes month 13 (annual)', !series.labels.includes('2020-13'))

// --- 8. Insufficient data returns null, never invented numbers --------------
checkTrue('regression null with < 3 points', linearRegression([{ x: 1, y: 1 }, { x: 2, y: 2 }]) === null)
checkTrue('Mann-Kendall null with < 3 points', mannKendall([1, 2]) === null)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
