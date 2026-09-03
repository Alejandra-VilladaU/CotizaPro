import { Copy, Plus, RefreshCw, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, Badge, Banner, Boton, Campo, Card, Etiqueta, Kpi, Modal, Vacio } from '../components/ui'
import { useAuth } from '../lib/auth'
import { claveTemporal, validarPassword } from '../lib/authApi'
import { fechaCorta, iniciales } from '../lib/format'
import {
  PERMISOS_CONFIGURABLES,
  PERMISO_LABEL,
  permisosPorDefecto,
  type Permiso,
  type Rol,
  type Usuario,
} from '../lib/roles'

type Alta = { nombre: string; email: string; rol: Rol; password: string }

const altaVacia = (): Alta => ({
  nombre: '',
  email: '',
  rol: 'Vendedor',
  password: claveTemporal(),
})

export default function Usuarios() {
  const { listarUsuarios, crearVendedor, actualizarUsuario, eliminarUsuario, usuario, modoDemo } =
    useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [alta, setAlta] = useState<Alta | null>(null)
  const [permisosDe, setPermisosDe] = useState<Usuario | null>(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      setUsuarios(await listarUsuarios())
      setError(null)
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible leer los usuarios.')
    } finally {
      setCargando(false)
    }
  }, [listarUsuarios])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const crear = async () => {
    if (alta === null) return
    const problema = validarPassword(alta.password)
    if (problema !== null) {
      setError(problema)
      return
    }
    try {
      const nuevo = await crearVendedor({
        nombre: alta.nombre.trim(),
        email: alta.email.trim(),
        password: alta.password,
        rol: alta.rol,
        permisos: permisosPorDefecto(alta.rol),
      })
      setAlta(null)
      setError(null)
      setAviso(
        `Usuario ${nuevo.email} creado. Entrégale la clave inicial ${alta.password}: la app le exigirá cambiarla en el primer ingreso.`,
      )
      await recargar()
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible crear el usuario.')
    }
  }

  const cambiar = async (uid: string, cambios: Parameters<typeof actualizarUsuario>[1]) => {
    try {
      await actualizarUsuario(uid, cambios)
      setError(null)
      await recargar()
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible actualizar el usuario.')
    }
  }

  const borrar = async (u: Usuario) => {
    const mensaje = modoDemo
      ? `¿Eliminar a ${u.nombre}?`
      : `¿Eliminar el perfil de ${u.nombre}? Perderá el acceso a CotizaPro. La cuenta de Firebase Authentication debes borrarla desde la consola.`
    if (!confirm(mensaje)) return
    try {
      await eliminarUsuario(u.uid)
      await recargar()
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible eliminar el usuario.')
    }
  }

  const vendedores = usuarios.filter((u) => u.rol === 'Vendedor')

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-7">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy">Usuarios</h1>
          <p className="mt-0.5 text-sm text-muted">
            Crea vendedores, asígnales su clave inicial y configura sus permisos.
          </p>
        </div>
        <div className="flex gap-2">
          <Boton onClick={() => void recargar()}>
            <RefreshCw size={16} /> Actualizar
          </Boton>
          <Boton variante="primario" onClick={() => setAlta(altaVacia())}>
            <UserPlus size={16} /> Crear usuario
          </Boton>
        </div>
      </header>

      {error !== null && (
        <div className="mb-4">
          <Banner tono="danger">{error}</Banner>
        </div>
      )}
      {aviso !== null && (
        <div className="mb-4">
          <Banner tono="ok">
            <span className="flex-1">{aviso}</span>
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="font-bold underline"
            >
              Entendido
            </button>
          </Banner>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Usuarios" valor={String(usuarios.length)} />
        <Kpi etiqueta="Vendedores" valor={String(vendedores.length)} tono="blue" />
        <Kpi
          etiqueta="Clave sin cambiar"
          valor={String(usuarios.filter((u) => u.debeCambiarPassword).length)}
          tono="warn"
          detalle="Pendientes del primer ingreso"
        />
        <Kpi
          etiqueta="Inactivos"
          valor={String(usuarios.filter((u) => !u.activo).length)}
          tono="danger"
        />
      </div>

      {cargando ? (
        <Card className="p-6 text-sm text-muted">Cargando usuarios…</Card>
      ) : usuarios.length === 0 ? (
        <Vacio
          titulo="Sin usuarios"
          texto="Crea el primer vendedor para que pueda cotizar."
          accion={
            <Boton variante="primario" onClick={() => setAlta(altaVacia())}>
              <Plus size={16} /> Crear usuario
            </Boton>
          }
        />
      ) : (
        <Card className="divide-y divide-line">
          {usuarios.map((u) => (
            <div key={u.uid} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar texto={iniciales(u.nombre)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-navy">{u.nombre}</span>
                  <Badge tono={u.rol === 'Administrador' ? 'blue' : 'gris'}>{u.rol}</Badge>
                  {u.debeCambiarPassword && <Badge tono="warn">Debe cambiar clave</Badge>}
                  {!u.activo && <Badge tono="danger">Inactivo</Badge>}
                </div>
                <div className="mt-0.5 truncate text-[13px] text-muted">
                  {u.email} · último ingreso{' '}
                  {u.ultimoIngreso === null ? 'nunca' : fechaCorta(u.ultimoIngreso)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {u.rol === 'Vendedor' && (
                  <Boton tamano="sm" onClick={() => setPermisosDe(u)}>
                    <ShieldCheck size={15} /> Permisos
                  </Boton>
                )}
                <Boton
                  tamano="sm"
                  onClick={() => void cambiar(u.uid, { activo: !u.activo })}
                  disabled={u.uid === usuario?.uid}
                >
                  {u.activo ? 'Desactivar' : 'Activar'}
                </Boton>
                <Boton
                  tamano="sm"
                  variante="peligro"
                  onClick={() => void borrar(u)}
                  disabled={u.uid === usuario?.uid}
                >
                  <Trash2 size={15} />
                </Boton>
              </div>
            </div>
          ))}
        </Card>
      )}

      {alta !== null && (
        <Modal
          titulo="Crear usuario"
          subtitulo="La clave es temporal: el usuario debe cambiarla en su primer ingreso."
          onCerrar={() => setAlta(null)}
        >
          <div className="grid gap-4">
            <Campo
              etiqueta="Nombre completo"
              value={alta.nombre}
              onChange={(e) => setAlta({ ...alta, nombre: e.target.value })}
              placeholder="Camilo Muñoz"
            />
            <Campo
              etiqueta="Correo"
              type="email"
              value={alta.email}
              onChange={(e) => setAlta({ ...alta, email: e.target.value })}
              placeholder="camilo@empresa.co"
            />
            <label className="block">
              <Etiqueta className="mb-1">Perfil</Etiqueta>
              <select
                value={alta.rol}
                onChange={(e) => setAlta({ ...alta, rol: e.target.value as Rol })}
                className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-blue"
              >
                <option value="Vendedor">Vendedor</option>
                <option value="Administrador">Administrador</option>
              </select>
            </label>
            <div>
              <Etiqueta className="mb-1">Clave inicial</Etiqueta>
              <div className="flex gap-2">
                <Campo
                  value={alta.password}
                  onChange={(e) => setAlta({ ...alta, password: e.target.value })}
                  className="font-mono"
                />
                <Boton
                  onClick={() => setAlta({ ...alta, password: claveTemporal() })}
                  aria-label="Generar otra clave"
                >
                  <RefreshCw size={16} />
                </Boton>
                <Boton
                  onClick={() => void navigator.clipboard.writeText(alta.password)}
                  aria-label="Copiar clave"
                >
                  <Copy size={16} />
                </Boton>
              </div>
            </div>
            <Boton
              variante="primario"
              onClick={() => void crear()}
              disabled={alta.nombre.trim() === '' || alta.email.trim() === ''}
            >
              Crear usuario
            </Boton>
          </div>
        </Modal>
      )}

      {permisosDe !== null && (
        <Modal
          titulo={`Permisos de ${permisosDe.nombre}`}
          subtitulo="Los vendedores nunca acceden a inventario, usuarios ni reportes globales."
          onCerrar={() => setPermisosDe(null)}
        >
          <div className="grid gap-3">
            {PERMISOS_CONFIGURABLES.map((permiso: Permiso) => {
              const activo = permisosDe.permisos.includes(permiso)
              return (
                <label
                  key={permiso}
                  className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 text-sm text-navy"
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => {
                      const permisos = activo
                        ? permisosDe.permisos.filter((p) => p !== permiso)
                        : [...permisosDe.permisos, permiso]
                      setPermisosDe({ ...permisosDe, permisos })
                    }}
                    className="size-4 accent-[#025cd6]"
                  />
                  {PERMISO_LABEL[permiso]}
                </label>
              )
            })}
            <Boton
              variante="primario"
              onClick={() => {
                void cambiar(permisosDe.uid, { permisos: permisosDe.permisos })
                setPermisosDe(null)
              }}
            >
              Guardar permisos
            </Boton>
          </div>
        </Modal>
      )}
    </div>
  )
}
