import { ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Layout'
import { Banner, Boton, Campo, Card } from '../components/ui'
import { useAuth } from '../lib/auth'
import { validarPassword } from '../lib/authApi'

/** Pantalla obligatoria en el primer ingreso con la clave inicial del administrador. */
export default function CambiarPassword() {
  const { usuario, cambiarPassword, cerrarSesion } = useAuth()
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const problema = validarPassword(nueva)
    if (problema !== null) {
      setError(problema)
      return
    }
    if (nueva !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await cambiarPassword(nueva)
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible cambiar la contraseña.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <Logo alto={30} />
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-blue">
            <ShieldCheck size={20} />
            <h1 className="text-lg font-bold text-navy">Crea tu contraseña</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Hola {usuario?.nombre ?? ''}: estás usando la clave inicial que asignó el
            administrador. Por seguridad debes cambiarla antes de entrar a CotizaPro.
          </p>

          {error !== null && (
            <div className="mt-4">
              <Banner tono="danger">{error}</Banner>
            </div>
          )}

          <form onSubmit={guardar} className="mt-5 grid gap-4">
            <Campo
              etiqueta="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              required
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mínimo 8 caracteres, con letras y números"
            />
            <Campo
              etiqueta="Repite la contraseña"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
            <Boton variante="primario" type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar y entrar'}
            </Boton>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              className="text-sm font-bold text-muted hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}
