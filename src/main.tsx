import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ProveedorDatos } from './lib/store'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ProveedorDatos>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ProveedorDatos>
  </StrictMode>,
)
