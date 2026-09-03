import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { UNIDAD_LABEL, cop } from '../lib/format'
import { estadoStock } from '../lib/quote'
import { useDatos } from '../lib/store'
import type { Material } from '../lib/types'
import { Badge, Boton, Buscador, Card, Chip, Etiqueta, Stepper, Vacio } from '../components/ui'

const TONO_STOCK = { Disponible: 'ok', 'Stock bajo': 'warn', 'Sin stock': 'danger' } as const

type Orden = 'precio-asc' | 'precio-desc' | 'nombre'

function FilaMaterial({
  material,
  cantidad,
  onCantidad,
  onAgregar,
  cotizable,
}: {
  material: Material
  cantidad: number
  onCantidad: (v: number) => void
  onAgregar: () => void
  /** El perfil Administrador consulta precios pero no realiza ventas directas. */
  cotizable: boolean
}) {
  const estado = estadoStock(material)
  const sinStock = estado === 'Sin stock'
  return (
    <div className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-snug text-navy">{material.nombre}</div>
          <div className="mt-0.5 text-xs text-muted">
            {material.codigo} · {UNIDAD_LABEL[material.unidad]} · {material.categoria}
          </div>
          <div className="mt-1.5">
            <Badge tono={TONO_STOCK[estado]}>
              {estado}
              {!sinStock && ` ${material.stock}`}
            </Badge>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[17px] font-extrabold text-navy">{cop(material.precio)}</div>
          <div className="text-[11px] text-muted">por {UNIDAD_LABEL[material.unidad]}</div>
        </div>
      </div>
      {cotizable && (
        <div className="mt-3 flex items-center gap-2">
          <Stepper valor={cantidad} onCambio={onCantidad} deshabilitado={sinStock} />
          <Boton
            variante={sinStock ? 'secundario' : 'primario'}
            className="flex-1"
            disabled={sinStock || cantidad <= 0}
            onClick={onAgregar}
          >
            {sinStock ? 'Sin stock' : 'Agregar'}
          </Boton>
        </div>
      )}
      {cotizable && !sinStock && cantidad > material.stock && (
        <p className="mt-2 text-xs font-semibold text-warn">
          ▲ Estás cotizando {cantidad} y solo hay {material.stock} en inventario.
        </p>
      )}
    </div>
  )
}

export default function Buscar() {
  const { materialesActivos, agregarMaterial, borrador } = useDatos()
  const { puede } = useAuth()
  const cotizable = puede('cotizaciones.crear')
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [orden, setOrden] = useState<Orden>('nombre')
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  const categorias = useMemo(
    () => ['Todas', ...Array.from(new Set(materialesActivos.map((m) => m.categoria))).sort()],
    [materialesActivos],
  )

  const resultados = useMemo(() => {
    const q = texto.trim().toLowerCase()
    const lista = materialesActivos.filter((m) => {
      const coincide =
        q === '' ||
        m.nombre.toLowerCase().includes(q) ||
        m.codigo.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q)
      return coincide && (categoria === 'Todas' || m.categoria === categoria)
    })
    return lista.sort((a, b) => {
      if (orden === 'precio-asc') return a.precio - b.precio
      if (orden === 'precio-desc') return b.precio - a.precio
      return a.nombre.localeCompare(b.nombre, 'es')
    })
  }, [materialesActivos, texto, categoria, orden])

  const cantidadDe = (id: string) => cantidades[id] ?? 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Buscar materiales</h1>
          <p className="mt-0.5 text-sm text-muted">
            {cotizable
              ? 'Consulta el inventario, agrega cantidades y armá la cotización.'
              : 'Consulta precios y existencias. Tu perfil no realiza ventas directas.'}
          </p>
        </div>
        {borrador !== null && borrador.items.length > 0 && (
          <Etiqueta>{borrador.items.length} materiales en la cotización en curso</Etiqueta>
        )}
      </div>

      <Buscador
        valor={texto}
        onCambio={setTexto}
        placeholder="Buscar por nombre o código… (ej. cemento, COD-1023)"
        atajo="Ctrl K"
        autoFocus
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {categorias.map((c) => (
          <Chip key={c} activo={c === categoria} onClick={() => setCategoria(c)}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="mt-4 mb-2 flex items-center justify-between">
        <Etiqueta>
          {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
        </Etiqueta>
        <label className="flex items-center gap-2 text-[13px] font-semibold text-blue">
          <span className="sr-only">Ordenar por</span>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="rounded-md border border-line bg-white px-2 py-1.5 text-[13px] font-semibold text-blue outline-none"
          >
            <option value="nombre">Nombre A–Z</option>
            <option value="precio-asc">Precio ↑</option>
            <option value="precio-desc">Precio ↓</option>
          </select>
        </label>
      </div>

      {resultados.length === 0 ? (
        <Vacio
          titulo="Sin resultados"
          texto="No encontramos materiales con ese nombre o código. Revisa la ortografía o cambia el filtro de categoría."
        />
      ) : (
        <Card className="grid overflow-hidden lg:grid-cols-2 lg:divide-x lg:divide-line">
          {resultados.map((m) => (
            <FilaMaterial
              key={m.id}
              material={m}
              cantidad={cantidadDe(m.id)}
              onCantidad={(v) => setCantidades((prev) => ({ ...prev, [m.id]: v }))}
              cotizable={cotizable}
              onAgregar={() => {
                agregarMaterial(m.id, cantidadDe(m.id))
                setCantidades((prev) => ({ ...prev, [m.id]: 0 }))
              }}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
