import { describe, it, expect } from 'vitest'
import api from './api'

describe('api client configuration', () => {
  it('points at the local /api proxy by default in the browser', () => {
    // No VITE_API_URL is set during tests, and an empty value must also fall
    // back to the proxy rather than producing a broken relative URL.
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('applies a request timeout so hung upstream calls cannot block the UI', () => {
    expect(api.defaults.timeout).toBe(30000)
  })

  it('never embeds a private NASA key in the client configuration', () => {
    const serialized = JSON.stringify(api.defaults)
    expect(serialized).not.toMatch(/NASA_API_KEY/)
    expect(serialized).not.toMatch(/api_key=/) // no key in the base URL
  })
})
