import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    // You can also log to an external service here
    // console.error(error, errorInfo)
  }

  render() {
    const { error, errorInfo } = this.state
    if (error) {
      return (
        <div style={{ padding: 24 }}>
          <h2 style={{ color: '#c53030' }}>An unexpected error occurred</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f7fafc', padding: 12, borderRadius: 6 }}>
            {error && error.toString()}
            {errorInfo && '\n' + (errorInfo.componentStack || '')}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
