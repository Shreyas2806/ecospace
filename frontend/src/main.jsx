/**
 * @fileoverview Application entry point for EcoSphere AI.
 * Mounts the React tree inside an ErrorBoundary so unhandled render
 * errors display a graceful fallback UI instead of a blank screen.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
