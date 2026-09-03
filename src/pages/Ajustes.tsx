import { useState } from 'react'
import { Boton, Campo, Card, Etiqueta } from '../components/ui'
import { useDatos } from '../lib/store'

export default function Ajustes() {
  const { datos, guardarEmpresa, restablecerDemo } = useDatos()
  const [empresa, setEmpresa] = useState(datos.empresa)
  const [guardado, setGuardado] = useState(false)

  const campo = (clave: keyof typeof empresa, etiqueta: string, placeholder?: string) => (
    <Campo
      etiqueta={etiqueta}
      placeholder={placeholder}
      value={String(empresa[clave])}
      onChange={(e) => setEmpresa({ ...empresa, [clave]: e.target.value })}
    />
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 lg:px-8 lg:py-7">
      <h1 className="text-[22px] font-extrabold text-navy">Ajustes</h1>
      <p className="mt-0.5 mb-5 text-sm text-muted">
        Estos datos aparecen en el encabezado del PDF y en los valores por defecto de cada cotización.
      </p>

      <Card className="p-5">
        <Etiqueta className="mb-3">Datos de la empresa</Etiqueta>
        <div className="grid gap-3 sm:grid-cols-2">
          {campo('nombre', 'Razón social')}
          {campo('nit', 'NIT')}
          {campo('direccion', 'Dirección')}
          {campo('telefono', 'Teléfono')}
          {campo('email', 'Correo de ventas')}
          {campo('vendedor', 'Vendedor / asesor')}
          <Campo
            etiqueta="IVA por defecto (%)"
            value={empresa.ivaPct}
            onChange={(e) =>
              setEmpresa({ ...empresa, ivaPct: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
            }
          />
          <Campo
            etiqueta="Vigencia por defecto (días)"
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
              onChange={(e) => setEmpresa({ ...empresa, condiciones: e.target.value })}
              rows={2}
              className="w-full rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <Etiqueta className="mb-1">Notas fijas del PDF</Etiqueta>
            <textarea
              value={empresa.notas}
              onChange={(e) => setEmpresa({ ...empresa, notas: e.target.value })}
              rows={3}
              className="w-full rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Boton
            variante="primario"
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
