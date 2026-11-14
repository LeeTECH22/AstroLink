import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders nothing until an api-error event occurs', () => {
    const { container } = render(<ErrorBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('displays the message and status when the api-error event fires', () => {
    render(<ErrorBanner />)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('api-error', {
          detail: { message: 'Request failed with status 500', status: 500, url: '/apod' },
        })
      )
    })
    expect(screen.getByText('API Error')).toBeInTheDocument()
    expect(screen.getByText('Request failed with status 500')).toBeInTheDocument()
    expect(screen.getByText(/Status: 500/)).toBeInTheDocument()
  })
})
