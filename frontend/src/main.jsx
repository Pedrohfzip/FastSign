import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import AppShell from './components/AppShell'
import './index.css'
import '@fontsource/dancing-script/700.css' // fonte cursiva usada pra gerar a imagem de assinatura

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
