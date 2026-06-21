/**
 * @fileoverview React Error Boundary for EcoSphere AI.
 *
 * Catches unhandled JavaScript errors in any child component tree and
 * displays a graceful fallback UI instead of a blank screen.  This is a
 * class component because React error boundaries must use the lifecycle
 * methods `getDerivedStateFromError` and `componentDidCatch`.
 *
 * @module components/ErrorBoundary
 */

import React from 'react';

/**
 * @typedef {Object} ErrorBoundaryProps
 * @property {React.ReactNode} children - Child component tree to protect.
 * @property {React.ReactNode} [fallback] - Optional custom fallback UI.
 */

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError - Whether an error has been caught.
 * @property {Error|null} error - The caught error, if any.
 */

/**
 * Top-level error boundary that prevents a single component crash from
 * taking down the entire application.
 *
 * @extends {React.Component<ErrorBoundaryProps, ErrorBoundaryState>}
 */
class ErrorBoundary extends React.Component {
  /** @param {ErrorBoundaryProps} props */
  constructor(props) {
    super(props);
    /** @type {ErrorBoundaryState} */
    this.state = { hasError: false, error: null };
  }

  /**
   * Update state so the next render shows the fallback UI.
   *
   * @param {Error} error - The error that was thrown.
   * @returns {ErrorBoundaryState} Partial state update.
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Log error details to the console (or an external monitoring service).
   *
   * @param {Error} error - The thrown error.
   * @param {React.ErrorInfo} info - Component stack trace information.
   */
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  /** Reset the error state, allowing the user to retry. */
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: '#f1f5f9',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌿</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
            EcoSphere AI — Something went wrong
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: '480px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            An unexpected error occurred. Your data is safe — please try refreshing the page or
            click the button below to recover.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                padding: '1rem',
                fontSize: '0.75rem',
                color: '#f87171',
                maxWidth: '600px',
                overflow: 'auto',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: '0.5rem',
              background: '#10b981',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
