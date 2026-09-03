import { useMemo, useRef, useState } from 'react'
import { Badge, Boton, Buscador, Campo, Card, Chip, Etiqueta, Modal } from '../components/ui'
import { UNIDAD_LABEL, cop, copCorto, fecha } from '../lib/format'
import { estadoStock } from '../lib/quote'
import { useDatos } from '../lib/store'
import type { Material, Unidad } from '../lib/types'
import { Kpi } from '../components/ui'

const TONO = { Disponible: 'ok', 'Stock bajo': 'warn', 'Sin stock': 'danger' } as const
const UNIDADES: Unidad[] = ['unidad', 'bulto', 'm2', 'm3', 'kg', 'ml']

type Borrador = Omit<Material, 'id' | 'actualizado'> & { id?: string }

const vacio: Borrador = {
  codigo: '',
  nombre: '',
  categoria: '',
  unidad: 'unidad',
  precio: 0,
  stock: 0,
  stockMinimo: 0,
  activo: true,
}

export default function Inventario() {
  const { datos, guardarMaterial, eliminarMaterial, importarMateriales } = useDatos()
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [estadoFiltro, setEstadoFiltro] = useState<'Todos' | 'Disponible' | 'Stock bajo' | 'Sin stock'>(
    'Todos',
  )
  const [editar, setEditar] = useState<Borrador | null>(null)
  const [resultadoImport, setResultadoImport] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  const categorias = useMemo(
    () => ['Todas', ...Array.from(new Set(datos.materiales.map((m) => m.categoria))).sort()],
    [datos.materiales],
  )

  const lista = datos.materiales.filter((m) => {
    const q = texto.trim().toLowerCase()
    const coincide =
      q === '' || m.nombre.toLowerCase().includes(q) || m.codigo.toLowerCase().includes(q)
    const porCategoria = categoria === 'Todas' || m.categoria === categoria
    const porEstado = estadoFiltro === 'Todos' || estadoStock(m) === estadoFiltro
    return coincide && porCategoria && porEstado
  })

  const valorInventario = datos.materiales.reduce((acc, m) => acc + m.precio * m.stock, 0)
  const bajos = datos.materiales.filter((m) => estadoStock(m) === 'Stock bajo').length
  const sinStock = datos.materiales.filter((m) => estadoStock(m) === 'Sin stock').length

  const importar = (texto: string) => {
    const r = importarMateriales(texto)
    setResultadoImport(
      `${r.creados} materiales creados, ${r.actualizados} actualizados.` +
        (r.errores.length > 0 ? ` ${r.errores.length} filas con error: ${r.errores[0]}` : ''),
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-8 lg:py-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Inventario de materiales</h1>
          <p className="mt-0.5 text-sm text-muted">
            {datos.materiales.filter((m) => m.activo).length} materiales activos · valor{' '}
            {copCorto(valorInventario)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={archivo}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f === undefined) return
              void f.text().then(importar)
              e.target.value = ''
            }}
          />
          <Boton onClick={() => archivo.current?.click()}>Importar CSV</Boton>
          <Boton variante="primario" onClick={() => setEditar(vacio)}>
            + Nuevo material
          </Boton>
        </div>
      </div>

      {resultadoImport !== null && (
        <div className="mb-4">
          <Card className="flex items-center justify-between gap-3 border-ok/35 bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">
            <span>{resultadoImport}</span>
            <button type="button" onClick={() => setResultadoImport(null)} className="font-bold">
              Cerrar
            </button>
          </Card>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Materiales activos" valor={String(datos.materiales.filter((m) => m.activo).length)} />
        <Kpi etiqueta="Stock bajo" valor={String(bajos)} tono="warn" />
        <Kpi etiqueta="Sin stock" valor={String(sinStock)} tono="danger" />
        <Kpi etiqueta="Valor del inventario" valor={copCorto(valorInventario)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <Buscador valor={texto} onCambio={setTexto} placeholder="Buscar por nombre o código…" />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Filtrar por categoría"
          className="rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold outline-none"
        >
          {categorias.map((c) => (
            <option key={c} value={c}>
              Categoría: {c}
            </option>
          ))}
        </select>
        {(['Todos', 'Disponible', 'Stock bajo', 'Sin stock'] as const).map((e) => (
          <Chip key={e} activo={e === estadoFiltro} onClick={() => setEstadoFiltro(e)}>
            {e}
          </Chip>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-navy text-left text-[11px] font-bold uppercase tracking-[0.06em] text-white">
                <th className="px-4 py-3">Material</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Categoría</th>
                <th className="px-3 py-3">Unidad</th>
                <th className="px-3 py-3 text-right">Precio unit.</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Actualizado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 text-sm font-semibold text-navy">{m.nombre}</td>
                  <td className="px-3 py-3 text-xs text-muted">{m.codigo}</td>
                  <td className="px-3 py-3 text-sm">{m.categoria}</td>
                  <td className="px-3 py-3 text-sm text-muted">{UNIDAD_LABEL[m.unidad]}</td>
                  <td className="px-3 py-3 text-right text-sm font-bold tabular-nums">
                    {cop(m.precio)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular-nums">{m.stock}</td>
                  <td className="px-3 py-3">
                    <Badge tono={TONO[estadoStock(m)]}>{estadoStock(m)}</Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{fecha(m.actualizado)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Boton tamano="sm" onClick={() => setEditar({ ...m })}>
                        Editar
                      </Boton>
                      <Boton tamano="sm" variante="peligro" onClick={() => eliminarMaterial(m.id)}>
                        Eliminar
                      </Boton>
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">
                    Ningún material coincide con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3">
          <Etiqueta>
            Mostrando {lista.length} de {datos.materiales.length} materiales
          </Etiqueta>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted">
        Formato del CSV: <code>codigo,nombre,categoria,unidad,precio,stock,stock_minimo</code> — las
        filas con un código existente actualizan el material.
      </p>

      {editar !== null && (
        <Modal
          titulo={editar.id === undefined ? 'Nuevo material' : 'Editar material'}
          subtitulo="Los cambios de precio no alteran cotizaciones ya emitidas."
          onCerrar={() => setEditar(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="Nombre"
              className="sm:col-span-2"
              value={editar.nombre}
              onChange={(e) => setEditar({ ...editar, nombre: e.target.value })}
            />
            <Campo
              etiqueta="Código"
              value={editar.codigo}
              onChange={(e) => setEditar({ ...editar, codigo: e.target.value })}
              placeholder="COD-1023"
            />
            <Campo
              etiqueta="Categoría"
              value={editar.categoria}
              onChange={(e) => setEditar({ ...editar, categoria: e.target.value })}
            />
            <label className="block">
              <Etiqueta className="mb-1">Unidad</Etiqueta>
              <select
                value={editar.unidad}
                onChange={(e) => setEditar({ ...editar, unidad: e.target.value as Unidad })}
                className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm outline-none"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {UNIDAD_LABEL[u]}
                  </option>
                ))}
              </select>
            </label>
            <Campo
              etiqueta="Precio unitario (COP)"
              value={editar.precio}
              onChange={(e) =>
                setEditar({ ...editar, precio: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
              }
            />
            <Campo
              etiqueta="Stock"
              value={editar.stock}
              onChange={(e) =>
                setEditar({ ...editar, stock: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
              }
            />
            <Campo
              etiqueta="Stock mínimo"
              value={editar.stockMinimo}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  stockMinimo: Number(e.target.value.replace(/[^\d]/g, '')) || 0,
                })
              }
            />
          </div>
          <Boton
            variante="primario"
            className="mt-4 w-full"
            disabled={editar.nombre.trim() === '' || editar.codigo.trim() === '' || editar.precio <= 0}
            onClick={() => {
              guardarMaterial(editar)
              setEditar(null)
            }}
          >
            Guardar material
          </Boton>
        </Modal>
      )}
    </div>
  )
}
