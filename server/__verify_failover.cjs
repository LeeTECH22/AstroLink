// Deterministic multi-key failover verification harness.
//
// Stubs axios so the first FAILOVER_FAIL_COUNT distinct NASA keys return HTTP 429
// ("rate limit exceeded") and every subsequent key returns a clearly-labelled STUB
// payload. This proves the backend automatically retries with the next key when one
// is exhausted. FAILOVER_FAIL_COUNT defaults to 1 (single rotation); set it to 2 to
// prove the pool walks through all three configured keys.
//
// The stub payload is NEVER presented as NASA data and is only used to observe
// the failover control flow. Emits one machine-readable result line and exits.
process.env.PORT = process.env.FAILOVER_PORT || '5097'

const FAIL_COUNT = Number(process.env.FAILOVER_FAIL_COUNT) || 1

const axios = require('axios')
const realGet = axios.get.bind(axios)

const keysSeen = []

axios.get = (url, opts) => {
  const match = String(url).match(/api_key=([^&]*)/)
  const key = match ? match[1] : null
  if (key && !keysSeen.includes(key)) keysSeen.push(key)

  // The first FAIL_COUNT distinct keys are treated as exhausted.
  if (key && keysSeen.indexOf(key) < FAIL_COUNT) {
    const err = new Error('Too Many Requests')
    err.response = { status: 429, data: { error: { message: 'You have exceeded your rate limit' } } }
    return Promise.reject(err)
  }
  if (key) {
    // Test stub only — explicitly labelled so it can never be read as NASA data.
    return Promise.resolve({
      status: 200,
      data: { title: 'FAILOVER-STUB', _meta: { stub: true, note: 'test stub, not NASA data' } },
    })
  }
  return realGet(url, opts)
}

require('./index.js')

setTimeout(async () => {
  const out = { status: null, rotated: false, distinctKeys: 0, failCount: FAIL_COUNT, title: null, ok: false }
  try {
    const res = await fetch(`http://localhost:${process.env.PORT}/api/neo`)
    out.status = res.status
    const body = await res.json()
    out.title = body && body.title
    out.distinctKeys = keysSeen.length
    out.rotated = keysSeen.length >= FAIL_COUNT + 1
    out.ok = res.status === 200 && out.rotated && out.title === 'FAILOVER-STUB'
  } catch (error) {
    out.error = error.message
  }
  console.log('FAILOVER_RESULT ' + JSON.stringify(out))
  process.exit(out.ok ? 0 : 1)
}, 1200)

