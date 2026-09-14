import { useState } from 'react'
import { Badge, Boton, Campo, Card, Etiqueta } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useDatos } from '../lib/store'

export default function Ajustes() {
  const { datos, guardarEmpresa, restablecerDemo } = useDatos()
  const { usuario, puede, modoDemo } = useAuth()
  const editable = puede('empresa.editar')
  const [empresa, setEmpresa] = useState(datos.empresa)
  const [guardado, setGuardado] = useState(false)

  const campo = (clave: keyof typeof empresa, etiqueta: string, placeholder?: string) => (
    <Campo
      etiqueta={etiqueta}
      placeholder={placeholder}
      disabled={!editable}
      value={String(empresa[clave])}
      onChange={(e) => setEmpresa({ ...empresa, [clave]: e.target.value })}
    />
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 lg:px-8 lg:py-7">
      <h1 className="text-[22px] font-extrabold text-navy">Ajustes</h1>
      <p className="mt-0.5 mb-5 text-sm text-muted">
        Estos datos aparecen en el encabezado del PDF y en los valores por defecto de cada cotización.
        {!editable && ' Solo el perfil Administrador puede modificarlos.'}
      </p>

      <Card className="mb-4 p-5">
        <Etiqueta className="mb-2">Tu sesión</Etiqueta>
        <div className="flex flex-wrap items-center gap-2 text-sm text-navy">
          <b>{usuario?.nombre ?? ''}</b>
          <span className="text-muted">{usuario?.email ?? ''}</span>
          <Badge tono={usuario?.rol === 'Administrador' ? 'blue' : 'gris'}>
            {usuario?.rol ?? ''}
          </Badge>
          {modoDemo && <Badge tono="warn">Modo demo sin Firebase</Badge>}
        </div>
      </Card>

      <Card className="p-5">
        <Etiqueta className="mb-3">Datos de la empresa</Etiqueta>
        <div className="grid gap-3 sm:grid-cols-2">
          {campo('nombre', 'Razón social')}
          {campo('logoUrl', 'Logo (ruta o URL)', '/wordmark_tag.png')}
          {campo('nit', 'NIT')}
          {campo('direccion', 'Dirección')}
          {campo('telefono', 'Teléfono')}
          {campo('email', 'Correo de ventas')}
          {campo('vendedor', 'Vendedor / asesor')}
          <Campo
            etiqueta="IVA por defecto (%)"
            disabled={!editable}
            value={empresa.ivaPct}
            onChange={(e) =>
              setEmpresa({ ...empresa, ivaPct: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
            }
          />
          <Campo
            etiqueta="Vigencia por defecto (días)"
            disabled={!editable}
            value={empresa.vigenciaDias}
            onChange={(e) =>
              setEmpresa({
                ...empresa,
                vigenciaDias: Number(e.target.value.replace(/[^\d]/g, '')) || 0,
              })
            }
          />
        </div>

        <div className="mt-3 grid gap-3">
          <label className="block">
            <Etiqueta className="mb-1">Condiciones comerciales (PDF)</Etiqueta>
            <textarea
              value={empresa.condiciones}
              disabled={!editable}
              onChange={(e) => setEmpresa({ ...empresa, condiciones: e.target.value })}
              rows={2}
              className="w-full rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <Etiqueta className="mb-1">Notas fijas del PDF</Etiqueta>
            <textarea
              value={empresa.notas}
              disabled={!editable}
              onChange={(e) => setEmpresa({ ...empresa, notas: e.target.value })}
              rows={3}
              className="w-full rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Boton
            variante="primario"
            disabled={!editable}
            onClick={() => {
              guardarEmpresa(empresa)
              setGuardado(true)
              window.setTimeout(() => setGuardado(false), 2500)
            }}
          >
            Guardar cambios
          </Boton>
          {guardado && <span className="text-sm font-bold text-ok">✓ Datos guardados</span>}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <Etiqueta className="mb-2">Datos de demostración</Etiqueta>
        <p className="text-sm text-muted">
          CotizaPro guarda inventario, clientes y cotizaciones en el almacenamiento local de este
          navegador. Restablecer borra tus cambios y vuelve a cargar el catálogo de ejemplo.
        </p>
        <Boton
          variante="peligro"
          className="mt-3"
          disabled={!editable}
          onClick={() => {
            if (window.confirm('¿Restablecer todos los datos de demostración?')) restablecerDemo()
          }}
        >
          Restablecer datos
        </Boton>
      </Card>
    </div>
  )
}
