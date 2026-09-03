import { Navigate, Outlet } from 'react-router-dom'
import { Boton, Card } from './ui'
import { useAuth } from '../lib/auth'
import type { Permiso } from '../lib/roles'
import { Logo } from './Layout'

function Cargando() {
  return (
    <div className="grid min-h-full place-items-center bg-surface">
      <div className="text-center">
        <Logo alto={30} />
        <p className="mt-3 text-sm text-muted">Cargando…</p>
      </div>
    </div>
  )
}

/** Sin sesión no hay app; con clave inicial pendiente, solo se puede cambiar la contraseña. */
export function RequiereSesion() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (usuario === null) return <Navigate to="/login" replace />
  if (usuario.debeCambiarPassword) return <Navigate to="/cambiar-password" replace />
  return <Outlet />
}

export function SoloInvitados() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (usuario !== null) {
    return <Navigate to={usuario.debeCambiarPassword ? '/cambiar-password' : '/'} replace />
  }
  return <Outlet />
}

export function RequierePassword() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (usuario === null) return <Navigate to="/login" replace />
  if (!usuario.debeCambiarPassword) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequierePermiso({ permiso }: { permiso: Permiso }) {
  const { puede, usuario } = useAuth()
  if (!puede(permiso)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="p-6 text-center">
          <h1 className="text-lg font-bold text-navy">Sin permiso</h1>
          <p className="mt-2 text-sm text-muted">
            Tu perfil {usuario?.rol ?? ''} no tiene acceso a esta sección. Pídele al administrador
            que te habilite el permiso correspondiente.
          </p>
          <div className="mt-4 flex justify-center">
            <Boton onClick={() => history.back()}>Volver</Boton>
          </div>
        </Card>
      </div>
    )
  }
  return <Outlet />
}
