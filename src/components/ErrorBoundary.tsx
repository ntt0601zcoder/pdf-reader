import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Catches render-time errors so a crash shows a message instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in the console for debugging.
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: '32px',
            maxWidth: 720,
            margin: '40px auto',
            fontFamily: 'system-ui, sans-serif',
            color: 'var(--fg, #1a1a1a)',
          }}
        >
          <h2 style={{ color: '#e5484d' }}>Đã xảy ra lỗi / Something went wrong</h2>
          <p>Tải lại trang để thử lại. Chi tiết lỗi (xem thêm ở Console):</p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: 'rgba(127,127,127,0.12)',
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflow: 'auto',
            }}
          >
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null })
              location.reload()
            }}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2f6fed',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Tải lại / Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
