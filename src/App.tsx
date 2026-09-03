import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Ajustes from './pages/Ajustes'
import Buscar from './pages/Buscar'
import ClienteDetalle from './pages/ClienteDetalle'
import Clientes from './pages/Clientes'
import Cotizacion from './pages/Cotizacion'
import Cotizaciones from './pages/Cotizaciones'
import Inventario from './pages/Inventario'
import Pdf from './pages/Pdf'

export default function App() {
  return (
    <Routes>
      <Route path="/pdf/:id" element={<Pdf />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Buscar />} />
        <Route path="/cotizacion" element={<Cotizacion />} />
        <Route path="/cotizacion/:id" element={<Cotizacion />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
