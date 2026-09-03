import { Check, Copy, Download, Mail, MessageCircle, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Banner,
  Boton,
  Buscador,
  Campo,
  Card,
  Etiqueta,
  Modal,
  Stepper,
  Vacio,
} from '../components/ui'
import { UNIDAD_LABEL, cop, fechaCorta, hora, iniciales } from '../lib/format'
import { calcularTotales, mensajeWhatsApp, preciosDesactualizados, totalLinea, vence } from '../lib/quote'
import { useDatos } from '../lib/store'
import type { Cliente, ItemCotizacion, TipoCliente } from '../lib/types'

const TONO_ESTADO = {
  Borrador: 'gris',
  Enviada: 'blue',
  Aceptada: 'ok',
  Rechazada: 'danger',
  Vencida: 'warn',
} as const

function SelectorCliente({
  onCerrar,
  onElegir,
}: {
  onCerrar: () => void
  onElegir: (cliente: Cliente) => void
}) {
  const { datos, crearCliente } = useDatos()
  const [texto, setTexto] = useState('')
  const [nuevo, setNuevo] = useState({
    nombre: '',
    telefono: '',
    tipo: 'Particular' as TipoCliente,
    documento: '',
    obra: '',
  })

  const lista = datos.clientes.filter((c) =>
    `${c.nombre} ${c.telefono} ${c.tipo}`.toLowerCase().includes(texto.trim().toLowerCase()),
  )

  return (
    <Modal titulo="Elegir cliente" subtitulo="Busca uno existente o crea uno nuevo" onCerrar={onCerrar}>
      <Buscador valor={texto} onCambio={setTexto} placeholder="Buscar cliente por nombre o teléfono…" />
      <div className="mt-3 max-h-64 divide-y divide-line overflow-y-auto rounded-[10px] border border-line">
        {lista.length === 0 && <p className="p-4 text-sm text-muted">Sin coincidencias.</p>}
        {lista.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onElegir(c)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
          >
            <Avatar texto={iniciales(c.nombre)} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy">{c.nombre}</span>
              <span className="block text-xs text-muted">
                {c.tipo} · {c.telefono}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <Etiqueta className="mb-2">Crear cliente nuevo</Etiqueta>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            placeholder="Ej. Don Jorge Ramírez"
          />
          <Campo
            etiqueta="Teléfono"
            value={nuevo.telefono}
            onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
            placeholder="300 555 0199"
          />
          <label className="block">
            <Etiqueta className="mb-1">Tipo</Etiqueta>
            <select
              value={nuevo.tipo}
              onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoCliente })}
              className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm outline-none"
            >
              <option value="Particular">Particular</option>
              <option value="Contratista">Contratista</option>
              <option value="Empresa">Empresa</option>
            </select>
          </label>
          <Campo
            etiqueta="Documento / NIT"
            value={nuevo.documento}
            onChange={(e) => setNuevo({ ...nuevo, documento: e.target.value })}
            placeholder="C.C. 71.234.567"
          />
          <Campo
            etiqueta="Obra (opcional)"
            className="sm:col-span-2"
            value={nuevo.obra}
            onChange={(e) => setNuevo({ ...nuevo, obra: e.target.value })}
            placeholder="Casa Robledo — Cra 80 #64-12"
          />
        </div>
        <Boton
          variante="primario"
          className="mt-3 w-full"
          disabled={nuevo.nombre.trim() === '' || nuevo.telefono.trim() === ''}
          onClick={() => onElegir(crearCliente(nuevo))}
        >
          Crear y usar este cliente
        </Boton>
      </div>
    </Modal>
  )
}

function Compartir({
  cotizacionId,
  numero,
  mensaje,
  telefono,
  onCerrar,
}: {
  cotizacionId: string
  numero: number
  mensaje: string
  telefono: string
  onCerrar: () => void
}) {
  const [copiado, setCopiado] = useState<'enlace' | 'mensaje' | null>(null)
  const enlace = `${window.location.origin}/pdf/${cotizacionId}`
  const wa = `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`${mensaje} ${enlace}`)}`
  const correo = `mailto:?subject=${encodeURIComponent(`Cotización #${numero}`)}&body=${encodeURIComponent(`${mensaje}\n\n${enlace}`)}`

  const copiar = async (valor: string, cual: 'enlace' | 'mensaje') => {
    await navigator.clipboard.writeText(valor)
    setCopiado(cual)
    window.setTimeout(() => setCopiado(null), 2000)
  }

  return (
    <Modal
      titulo={`Compartir cotización #${numero}`}
      subtitulo="PDF de 1 página · guardada en el historial del cliente"
      onCerrar={onCerrar}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="grid place-items-center gap-2 rounded-[10px] border border-line p-3 text-center text-xs font-bold text-navy hover:bg-surface"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ok-soft text-ok">
            <MessageCircle size={18} />
          </span>
          WhatsApp
        </a>
        <a
          href={correo}
          className="grid place-items-center gap-2 rounded-[10px] border border-line p-3 text-center text-xs font-bold text-navy hover:bg-surface"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-soft text-blue">
            <Mail size={18} />
          </span>
          Correo
        </a>
        <Link
          to={`/pdf/${cotizacionId}`}
          className="grid place-items-center gap-2 rounded-[10px] border border-line p-3 text-center text-xs font-bold text-navy hover:bg-surface"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-danger-soft text-danger">
            <Download size={18} />
          </span>
          Descargar PDF
        </Link>
        <button
          type="button"
          onClick={() => void copiar(enlace, 'enlace')}
          className="grid place-items-center gap-2 rounded-[10px] border border-line p-3 text-center text-xs font-bold text-navy hover:bg-surface"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-muted">
            {copiado === 'enlace' ? <Check size={18} /> : <Copy size={18} />}
          </span>
          {copiado === 'enlace' ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>

      <div className="mt-4 rounded-[10px] border border-line bg-surface p-3">
        <Etiqueta className="mb-1">Mensaje que se enviará</Etiqueta>
        <p className="text-sm leading-relaxed text-navy">{mensaje}</p>
        <button
          type="button"
          onClick={() => void copiar(mensaje, 'mensaje')}
          className="mt-2 text-[13px] font-bold text-blue"
        >
          {copiado === 'mensaje' ? 'Mensaje copiado' : 'Copiar mensaje'}
        </button>
      </div>

      <a href={wa} target="_blank" rel="noreferrer" className="mt-4 block">
        <Boton variante="primario" className="w-full">
          Enviar por WhatsApp
        </Boton>
      </a>
    </Modal>
  )
}

function FilaItem({
  item,
  editable,
  onCantidad,
  onPrecio,
  onDescuento,
  onQuitar,
  stockDisponible,
}: {
  item: ItemCotizacion
  editable: boolean
  onCantidad: (v: number) => void
  onPrecio: (v: number) => void
  onDescuento: (v: number) => void
  onQuitar: () => void
  stockDisponible: number | null
}) {
  const editado = item.precioUnitario !== item.precioLista
  return (
    <tr className="border-b border-line last:border-b-0 align-top">
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-navy">{item.nombre}</div>
        <div className="mt-0.5 text-xs text-muted">{item.codigo}</div>
        {stockDisponible !== null && item.cantidad > stockDisponible && (
          <div className="mt-1 text-xs font-semibold text-warn">
            ▲ solo {stockDisponible} disponibles
          </div>
        )}
        {editado && (
          <div className="mt-1 text-xs font-semibold text-warn">
            precio editado (lista {cop(item.precioLista)})
          </div>
        )}
      </td>
      <td className="px-3 py-3">
        {editable ? (
          <Stepper valor={item.cantidad} onCambio={onCantidad} />
        ) : (
          <span className="text-sm font-semibold">{item.cantidad}</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-muted">{UNIDAD_LABEL[item.unidad]}</td>
      <td className="px-3 py-3 text-right">
        {editable ? (
          <input
            value={item.precioUnitario}
            onChange={(e) => onPrecio(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
            aria-label={`Precio unitario de ${item.nombre}`}
            className="w-28 rounded-md border border-line px-2 py-1.5 text-right text-sm font-bold tabular-nums outline-none focus:border-blue"
          />
        ) : (
          <span className="text-sm font-bold tabular-nums">{cop(item.precioUnitario)}</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {editable ? (
          <div className="inline-flex items-center gap-1">
            <input
              value={item.descuento}
              onChange={(e) => onDescuento(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
              aria-label={`Descuento de ${item.nombre}`}
              className="w-14 rounded-md border border-line px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-blue"
            />
            <span className="text-xs text-muted">%</span>
          </div>
        ) : (
          <span className="text-sm tabular-nums">{item.descuento} %</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-[15px] font-extrabold tabular-nums text-navy">
        {cop(totalLinea(item))}
      </td>
      <td className="px-2 py-3 text-right">
        {editable && (
          <button
            type="button"
            onClick={onQuitar}
            aria-label={`Quitar ${item.nombre}`}
            className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 size={16} />
          </button>
        )}
      </td>
    </tr>
  )
}

export default function CotizacionPage() {
  const {
    borrador,
    cotizacion,
    cliente,
    datos,
    material,
    asegurarBorrador,
    actualizarCotizacion,
    cambiarCantidad,
    cambiarPrecio,
    cambiarDescuentoLinea,
    quitarItem,
    sincronizarPrecios,
    generarCotizacion,
    agregarMaterial,
    materialesActivos,
  } = useDatos()
  const { id } = useParams()
  const navigate = useNavigate()
  const [abrirCliente, setAbrirCliente] = useState(false)
  const [compartir, setCompartir] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const actual = id === undefined ? borrador : (cotizacion(id) ?? null)
  const editable = actual !== null && actual.estado === 'Borrador'
  const clienteActual = cliente(actual?.clienteId ?? null)
  const totales = useMemo(
    () => (actual === null ? null : calcularTotales(actual)),
    [actual],
  )
  const desactualizados = actual === null ? [] : preciosDesactualizados(actual, datos.materiales)

  // Al emitir, el borrador deja de serlo: la ruta pasa a apuntar a la cotización.
  const generar = (cotizacionId: string) => {
    setCompartir(generarCotizacion(cotizacionId))
    if (id === undefined) navigate(`/cotizacion/${cotizacionId}`, { replace: true })
  }

  const sugerencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (q === '') return []
    return materialesActivos
      .filter((m) => m.nombre.toLowerCase().includes(q) || m.codigo.toLowerCase().includes(q))
      .slice(0, 6)
  }, [busqueda, materialesActivos])

  if (actual === null || totales === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
        <Vacio
          titulo="No hay una cotización en curso"
          texto="Busca materiales en el inventario y agrégalos para empezar una cotización nueva."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/">
                <Boton variante="primario">Buscar materiales</Boton>
              </Link>
              <Boton
                onClick={() => {
                  asegurarBorrador()
                }}
              >
                Crear borrador vacío
              </Boton>
            </div>
          }
        />
      </div>
    )
  }

  const anteriores = datos.cotizaciones
    .filter(
      (c) => c.clienteId === actual.clienteId && c.id !== actual.id && c.numero !== null,
    )
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-8 lg:py-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-extrabold text-navy">
            Cotización {actual.numero === null ? '(borrador)' : `#${actual.numero}`}
          </h1>
          <Badge tono={TONO_ESTADO[actual.estado]}>{actual.estado}</Badge>
          <span className="text-xs text-muted">
            Autoguardado {hora(actual.actualizada)} · Vendedor: {actual.vendedor}
          </span>
        </div>
        <div className="flex gap-2">
          <Link to={`/pdf/${actual.id}`}>
            <Boton tamano="sm">Vista previa PDF</Boton>
          </Link>
          {editable && (
            <Boton
              tamano="sm"
              variante="primario"
              disabled={actual.items.length === 0 || actual.clienteId === null}
              onClick={() => generar(actual.id)}
            >
              Generar cotización
            </Boton>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <div className="min-w-0">
          {editable && (
            <div className="relative mb-4">
              <Buscador
                valor={busqueda}
                onCambio={setBusqueda}
                placeholder="Agregar material por nombre o código…"
                atajo="Ctrl K"
              />
              {sugerencias.length > 0 && (
                <Card className="absolute inset-x-0 top-full z-20 mt-1 divide-y divide-line overflow-hidden">
                  {sugerencias.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        agregarMaterial(m.id, 1)
                        setBusqueda('')
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy">
                          {m.nombre}
                        </span>
                        <span className="text-xs text-muted">
                          {m.codigo} · {UNIDAD_LABEL[m.unidad]}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums">{cop(m.precio)}</span>
                    </button>
                  ))}
                </Card>
              )}
            </div>
          )}

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="p-4 sm:col-span-1">
              <Etiqueta className="mb-2">Cliente</Etiqueta>
              {clienteActual === undefined ? (
                <Boton variante="primario" tamano="sm" onClick={() => setAbrirCliente(true)}>
                  Elegir cliente
                </Boton>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar texto={iniciales(clienteActual.nombre)} size={38} />
                  <div className="min-w-0">
                    <Link
                      to={`/clientes/${clienteActual.id}`}
                      className="block truncate text-sm font-bold text-navy hover:text-blue"
                    >
                      {clienteActual.nombre}
                    </Link>
                    <div className="text-xs text-muted">
                      {clienteActual.tipo} · {clienteActual.telefono}
                    </div>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setAbrirCliente(true)}
                      className="ml-auto shrink-0 text-[13px] font-bold text-blue"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              )}
            </Card>
            <Card className="p-4">
              <Etiqueta className="mb-2">Vigencia</Etiqueta>
              <div className="flex items-center gap-2">
                {editable ? (
                  <input
                    value={actual.vigenciaDias}
                    onChange={(e) =>
                      actualizarCotizacion(actual.id, {
                        vigenciaDias: Number(e.target.value.replace(/[^\d]/g, '')) || 0,
                      })
                    }
                    aria-label="Días de vigencia"
                    className="w-16 rounded-md border border-line px-2 py-1.5 text-right text-sm font-bold tabular-nums outline-none focus:border-blue"
                  />
                ) : (
                  <span className="text-sm font-bold">{actual.vigenciaDias}</span>
                )}
                <span className="text-sm text-muted">días · vence {fechaCorta(vence(actual))}</span>
              </div>
            </Card>
            <Card className="p-4">
              <Etiqueta className="mb-2">IVA</Etiqueta>
              <div className="flex items-center gap-2">
                {editable ? (
                  <input
                    value={actual.ivaPct}
                    onChange={(e) =>
                      actualizarCotizacion(actual.id, {
                        ivaPct: Number(e.target.value.replace(/[^\d]/g, '')) || 0,
                      })
                    }
                    aria-label="Porcentaje de IVA"
                    className="w-16 rounded-md border border-line px-2 py-1.5 text-right text-sm font-bold tabular-nums outline-none focus:border-blue"
                  />
                ) : (
                  <span className="text-sm font-bold">{actual.ivaPct}</span>
                )}
                <span className="text-sm text-muted">% sobre la base gravable</span>
              </div>
            </Card>
          </div>

          {editable && desactualizados.length > 0 && (
            <div className="mb-4">
              <Banner tono="warn">
                <span className="flex-1">
                  ▲ {desactualizados.length}{' '}
                  {desactualizados.length === 1 ? 'material cambió' : 'materiales cambiaron'} de
                  precio desde que creaste este borrador.
                </span>
                <Boton tamano="sm" onClick={() => sincronizarPrecios(actual.id)}>
                  Actualizar precios
                </Boton>
              </Banner>
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-navy text-left text-[11px] font-bold uppercase tracking-[0.06em] text-white">
                    <th className="px-4 py-3">Material</th>
                    <th className="px-3 py-3">Cant.</th>
                    <th className="px-3 py-3">Unidad</th>
                    <th className="px-3 py-3 text-right">Precio unit.</th>
                    <th className="px-3 py-3 text-right">Desc.</th>
                    <th className="px-4 py-3 text-right">Total línea</th>
                    <th className="px-2 py-3" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {actual.items.map((item) => (
                    <FilaItem
                      key={item.materialId}
                      item={item}
                      editable={editable}
                      stockDisponible={material(item.materialId)?.stock ?? null}
                      onCantidad={(v) => cambiarCantidad(actual.id, item.materialId, v)}
                      onPrecio={(v) => cambiarPrecio(actual.id, item.materialId, v)}
                      onDescuento={(v) => cambiarDescuentoLinea(actual.id, item.materialId, v)}
                      onQuitar={() => quitarItem(actual.id, item.materialId)}
                    />
                  ))}
                  {actual.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                        Aún no hay materiales.{' '}
                        <Link to="/" className="font-bold text-blue">
                          Buscar en el inventario →
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
            <Card className="p-4">
              <Etiqueta className="mb-2">Descuento global</Etiqueta>
              <div className="flex items-center gap-2">
                {editable ? (
                  <input
                    value={actual.descuentoGlobal}
                    onChange={(e) =>
                      actualizarCotizacion(actual.id, {
                        descuentoGlobal: Math.min(
                          100,
                          Number(e.target.value.replace(/[^\d]/g, '')) || 0,
                        ),
                      })
                    }
                    aria-label="Descuento global"
                    className="w-20 rounded-md border border-line px-2 py-1.5 text-right text-sm font-bold tabular-nums outline-none focus:border-blue"
                  />
                ) : (
                  <span className="text-sm font-bold">{actual.descuentoGlobal}</span>
                )}
                <span className="text-sm text-muted">%</span>
              </div>
            </Card>
            <Card className="p-4">
              <Etiqueta className="mb-2">Notas para el cliente</Etiqueta>
              <textarea
                value={actual.notas}
                readOnly={!editable}
                onChange={(e) => actualizarCotizacion(actual.id, { notas: e.target.value })}
                rows={2}
                placeholder="Condiciones de entrega, obra, contacto en sitio…"
                className="w-full resize-y rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-blue"
              />
            </Card>
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card className="p-5">
            <Etiqueta>Resumen</Etiqueta>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal ({totales.items} ítems)</dt>
                <dd className="font-bold tabular-nums">{cop(totales.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Descuento global {actual.descuentoGlobal} %</dt>
                <dd className="font-bold tabular-nums text-ok">
                  − {cop(totales.descuentoGlobal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Base gravable</dt>
                <dd className="font-bold tabular-nums">{cop(totales.base)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">IVA {actual.ivaPct} %</dt>
                <dd className="font-bold tabular-nums">{cop(totales.iva)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-end justify-between border-t-2 border-navy pt-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                Total
              </span>
              <span className="text-[26px] font-extrabold tabular-nums text-navy">
                {cop(totales.total)}
              </span>
            </div>

            {editable ? (
              <div className="mt-4 space-y-2">
                <Boton
                  variante="primario"
                  className="w-full"
                  disabled={actual.items.length === 0 || actual.clienteId === null}
                  onClick={() => generar(actual.id)}
                >
                  Generar cotización
                </Boton>
                {actual.clienteId === null && (
                  <p className="text-center text-xs font-semibold text-warn">
                    Elige un cliente para poder generarla.
                  </p>
                )}
                <Link to={`/pdf/${actual.id}`} className="block">
                  <Boton className="w-full">Ver PDF del borrador</Boton>
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <Link to={`/pdf/${actual.id}`} className="block">
                  <Boton variante="primario" className="w-full">
                    Ver PDF
                  </Boton>
                </Link>
                <Boton className="w-full" onClick={() => navigate('/cotizaciones')}>
                  Ir al historial
                </Boton>
              </div>
            )}
          </Card>

          {anteriores.length > 0 && (
            <Card className="mt-4 p-5">
              <Etiqueta>Cotizaciones previas del cliente</Etiqueta>
              <ul className="mt-3 divide-y divide-line">
                {anteriores.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link to={`/cotizacion/${c.id}`} className="text-sm font-bold text-navy hover:text-blue">
                      #{c.numero}
                    </Link>
                    <span className="text-xs text-muted">{fechaCorta(c.creada)}</span>
                    <span className="text-sm font-bold tabular-nums">
                      {cop(calcularTotales(c).total)}
                    </span>
                  </li>
                ))}
              </ul>
              {actual.clienteId !== null && (
                <Link
                  to={`/clientes/${actual.clienteId}`}
                  className="mt-2 inline-block text-[13px] font-bold text-blue"
                >
                  Ver historial completo →
                </Link>
              )}
            </Card>
          )}
        </div>
      </div>

      {abrirCliente && (
        <SelectorCliente
          onCerrar={() => setAbrirCliente(false)}
          onElegir={(c) => {
            actualizarCotizacion(actual.id, { clienteId: c.id })
            setAbrirCliente(false)
          }}
        />
      )}

      {compartir !== null && clienteActual !== undefined && (
        <Compartir
          cotizacionId={actual.id}
          numero={compartir}
          telefono={clienteActual.telefono}
          mensaje={mensajeWhatsApp(
            actual,
            clienteActual.nombre,
            totales.total,
            actual.vendedor,
            datos.empresa.nombre.replace(/ S\.A\.S\.$/, ''),
          )}
          onCerrar={() => {
            setCompartir(null)
            navigate('/cotizaciones')
          }}
        />
      )}
    </div>
  )
}
