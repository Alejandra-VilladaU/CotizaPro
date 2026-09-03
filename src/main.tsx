import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ProveedorAuth } from './lib/auth'
import { ProveedorDatos } from './lib/store'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ProveedorAuth>
      <ProveedorDatos>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProveedorDatos>
    </ProveedorAuth>
  </StrictMode>,
)
