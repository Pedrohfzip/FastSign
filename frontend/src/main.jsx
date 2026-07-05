import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import AppRoutes from './routes'
import Header from './components/Header'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <AppRoutes />
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)