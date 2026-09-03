import { Navigate, Route, Routes } from 'react-router-dom'
import { RequierePassword, RequierePermiso, RequiereSesion, SoloInvitados } from './components/Guards'
import Layout from './components/Layout'
import Ajustes from './pages/Ajustes'
import Buscar from './pages/Buscar'
import CambiarPassword from './pages/CambiarPassword'
import ClienteDetalle from './pages/ClienteDetalle'
import Clientes from './pages/Clientes'
import Cotizacion from './pages/Cotizacion'
import Cotizaciones from './pages/Cotizaciones'
import Inventario from './pages/Inventario'
import Login from './pages/Login'
import Pdf from './pages/Pdf'
import Reportes from './pages/Reportes'
import Usuarios from './pages/Usuarios'

export default function App() {
  return (
    <Routes>
      <Route element={<SoloInvitados />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route element={<RequierePassword />}>
        <Route path="/cambiar-password" element={<CambiarPassword />} />
      </Route>
      <Route element={<RequiereSesion />}>
        <Route path="/pdf/:id" element={<Pdf />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Buscar />} />
          <Route element={<RequierePermiso permiso="cotizaciones.crear" />}>
            <Route path="/cotizacion" element={<Cotizacion />} />
          </Route>
          <Route path="/cotizacion/:id" element={<Cotizacion />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalle />} />
          <Route element={<RequierePermiso permiso="inventario.gestionar" />}>
            <Route path="/inventario" element={<Inventario />} />
          </Route>
          <Route element={<RequierePermiso permiso="reportes.globales" />}>
            <Route path="/reportes" element={<Reportes />} />
          </Route>
          <Route element={<RequierePermiso permiso="usuarios.gestionar" />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
