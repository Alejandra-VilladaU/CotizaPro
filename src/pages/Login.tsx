import { Eye, EyeOff, KeyRound, LogIn, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Layout'
import { Banner, Boton, Campo, Card, Etiqueta } from '../components/ui'
import { useAuth } from '../lib/auth'

type Vista = 'login' | 'recuperar'

export default function Login() {
  const { iniciarSesion, recuperarPassword, modoDemo } = useAuth()
  const [vista, setVista] = useState<Vista>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setEnviando(true)
    try {
      await iniciarSesion(email, password)
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible iniciar sesión.')
    } finally {
      setEnviando(false)
    }
  }

  const recuperar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setEnviando(true)
    try {
      const temporal = await recuperarPassword(email)
      setAviso(
        temporal === null
          ? `Enviamos un correo a ${email} con el enlace para restablecer tu contraseña. Revisa también la carpeta de spam.`
          : `Modo demo sin Firebase: tu clave temporal es ${temporal}. Inicia sesión con ella y el sistema te pedirá cambiarla.`,
      )
      setVista('login')
      setPassword('')
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible enviar el correo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <Logo alto={34} />
          <p className="mt-2 text-sm text-muted">Busca. Cotiza. Construye.</p>
        </div>

        <Card className="p-6">
          <h1 className="text-lg font-bold text-navy">
            {vista === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {vista === 'login'
              ? 'Ingresa con el correo y la clave que te entregó el administrador.'
              : 'Te enviamos un enlace para crear una contraseña nueva.'}
          </p>

          {error !== null && (
            <div className="mt-4">
              <Banner tono="danger">{error}</Banner>
            </div>
          )}
          {aviso !== null && (
            <div className="mt-4">
              <Banner tono="ok">{aviso}</Banner>
            </div>
          )}

          {vista === 'login' ? (
            <form onSubmit={entrar} className="mt-5 grid gap-4">
              <Campo
                etiqueta="Correo"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendedor@empresa.co"
              />
              <div>
                <Etiqueta className="mb-1">Contraseña</Etiqueta>
                <div className="flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 focus-within:border-blue focus-within:ring-3 focus-within:ring-blue/15">
                  <input
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Contraseña"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-navy outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="rounded-md p-1.5 text-muted hover:bg-surface"
                  >
                    {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Boton variante="primario" type="submit" disabled={enviando}>
                <LogIn size={16} /> {enviando ? 'Entrando…' : 'Entrar'}
              </Boton>
              <button
                type="button"
                onClick={() => {
                  setVista('recuperar')
                  setError(null)
                  setAviso(null)
                }}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold text-blue hover:underline"
              >
                <KeyRound size={15} /> Olvidé mi contraseña
              </button>
            </form>
          ) : (
            <form onSubmit={recuperar} className="mt-5 grid gap-4">
              <Campo
                etiqueta="Correo"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendedor@empresa.co"
              />
              <Boton variante="primario" type="submit" disabled={enviando}>
                <Mail size={16} /> {enviando ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </Boton>
              <button
                type="button"
                onClick={() => {
                  setVista('login')
                  setError(null)
                }}
                className="text-sm font-bold text-blue hover:underline"
              >
                Volver a iniciar sesión
              </button>
            </form>
          )}
        </Card>

        {modoDemo && (
          <Card className="mt-4 p-4">
            <Etiqueta>Modo demo (sin Firebase)</Etiqueta>
            <ul className="mt-2 grid gap-1 text-[13px] text-navy">
              <li>
                Administrador: <b>admin@cotizapro.co</b> / <b>Admin1234</b>
              </li>
              <li>
                Vendedor: <b>vendedor@cotizapro.co</b> / <b>Vendedor1234</b>
              </li>
              <li>
                Primer ingreso: <b>nuevo@cotizapro.co</b> / <b>Inicial1234</b>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted">
              Configura las variables <code>VITE_FIREBASE_*</code> para usar Firebase Auth real.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
