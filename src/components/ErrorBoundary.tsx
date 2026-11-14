import { Component, type ErrorInfo, type ReactNode } from 'react'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render-time exceptions in the page tree so a single failing page
 * cannot blank the whole application. Recovery is a client-side reload, which
 * re-mounts the tree without losing the user's URL.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the real cause in the console for debugging; never render it.
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card py-12 text-center">
          <AlertTriangle className="mx-auto mb-4 h-14 w-14 text-state-error" />
          <h2 className="section-title">This page ran into a problem</h2>
          <p className="page-subtitle mx-auto max-w-lg">
            An unexpected error interrupted this view. Reloading usually restores it. If the problem
            persists, please open another section and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-6 inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
