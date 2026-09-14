import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Badge, Boton, Buscador, Card, Chip, Etiqueta, Kpi, Vacio } from '../components/ui'
import { useAuth } from '../lib/auth'
import { exportarCotizaciones } from '../lib/export'
import { cop, copCorto, diasRestantes, fecha, fechaCorta } from '../lib/format'
import { calcularTotales, vence } from '../lib/quote'
import { useDatos } from '../lib/store'
import type { Cotizacion, EstadoCotizacion } from '../lib/types'

const TONO = {
  Borrador: 'gris',
  Enviada: 'blue',
  Aceptada: 'ok',
  Rechazada: 'danger',
  Vencida: 'warn',
} as const

const ESTADOS: (EstadoCotizacion | 'Todos')[] = [
  'Todos',
  'Borrador',
  'Enviada',
  'Aceptada',
  'Rechazada',
  'Vencida',
]

export default function Cotizaciones() {
  const {
    datos,
    cliente,
    duplicar,
    cambiarEstado,
    eliminarCotizacion,
    crearBorrador,
    cotizacionesVisibles,
    puedeEditar,
  } = useDatos()
  const { puede, verTodo } = useAuth()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<EstadoCotizacion | 'Todos'>('Todos')

  const conTotales = useMemo(
    () =>
      cotizacionesVisibles
        .map((c) => ({ cotizacion: c, total: calcularTotales(c).total }))
        .sort((a, b) => b.cotizacion.creada.localeCompare(a.cotizacion.creada)),
    [cotizacionesVisibles],
  )

  const filtradas = conTotales.filter(({ cotizacion: c }) => {
    const nombre = cliente(c.clienteId)?.nombre ?? ''
    const q = texto.trim().toLowerCase()
    const coincide =
      q === '' || nombre.toLowerCase().includes(q) || String(c.numero ?? '').includes(q)
    return coincide && (estado === 'Todos' || c.estado === estado)
  })

  const suma = (filtro: (c: Cotizacion) => boolean) =>
    conTotales.filter(({ cotizacion }) => filtro(cotizacion)).reduce((acc, x) => acc + x.total, 0)
  const cuenta = (filtro: (c: Cotizacion) => boolean) =>
    conTotales.filter(({ cotizacion }) => filtro(cotizacion)).length

  const enviadas = cuenta((c) => c.estado === 'Enviada')
  const aceptadas = cuenta((c) => c.estado === 'Aceptada')
  const cerradas = enviadas + aceptadas + cuenta((c) => c.estado === 'Rechazada')
  const porVencer = conTotales.filter(
    ({ cotizacion: c }) =>
      c.estado === 'Enviada' && diasRestantes(vence(c)) >= 0 && diasRestantes(vence(c)) <= 3,
  )

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-8 lg:py-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Cotizaciones</h1>
          <p className="mt-0.5 text-sm text-muted">
            {conTotales.length} cotizaciones · {copCorto(suma(() => true))} cotizados
            {verTodo ? ' · todo el equipo' : ' · tus cotizaciones'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puede('cotizaciones.exportar') && (
            <Boton
              onClick={() =>
                exportarCotizaciones(
                  'cotizapro-cotizaciones',
                  filtradas.map(({ cotizacion }) => cotizacion),
                  datos.clientes,
                )
              }
            >
              <Download size={16} /> Exportar Excel
            </Boton>
          )}
          {puede('cotizaciones.crear') && (
            <Boton
              variante="primario"
              onClick={() => {
                crearBorrador()
                navigate('/')
              }}
            >
              + Nueva cotización
            </Boton>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          etiqueta="Enviadas"
          valor={String(enviadas)}
          detalle={copCorto(suma((c) => c.estado === 'Enviada'))}
          tono="blue"
        />
        <Kpi
          etiqueta="Aceptadas"
          valor={String(aceptadas)}
          detalle={`${copCorto(suma((c) => c.estado === 'Aceptada'))} · ${
            cerradas === 0 ? 0 : Math.round((aceptadas / cerradas) * 100)
          } % de conversión`}
          tono="ok"
        />
        <Kpi
          etiqueta="Por vencer (3 días)"
          valor={String(porVencer.length)}
          detalle={copCorto(porVencer.reduce((acc, x) => acc + x.total, 0))}
          tono="warn"
        />
        <Kpi
          etiqueta="Borradores abiertos"
          valor={String(cuenta((c) => c.estado === 'Borrador'))}
          detalle="Sin número asignado"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <Buscador
            valor={texto}
            onCambio={setTexto}
            placeholder="Buscar por número o cliente…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <Chip key={e} activo={e === estado} onClick={() => setEstado(e)}>
              {e}
            </Chip>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <Vacio
          titulo="Aún no hay cotizaciones aquí"
          texto="Cambia el filtro o crea una cotización nueva desde el inventario."
          accion={
            <Link to="/">
              <Boton variante="primario">Buscar materiales</Boton>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-navy text-left text-[11px] font-bold uppercase tracking-[0.06em] text-white">
                  <th className="px-4 py-3">#</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3 text-right">Ítems</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Emitida</th>
                  <th className="px-3 py-3">Vence</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(({ cotizacion: c, total }) => {
                  const cli = cliente(c.clienteId)
                  const dias = diasRestantes(vence(c))
                  return (
                    <tr key={c.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-3">
                        <Link
                          to={`/cotizacion/${c.id}`}
                          className="text-sm font-extrabold text-navy hover:text-blue"
                        >
                          {c.numero === null ? 'Borrador' : `#${c.numero}`}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        {cli === undefined ? (
                          <span className="text-sm text-muted">Sin cliente</span>
                        ) : (
                          <Link to={`/clientes/${cli.id}`} className="group block">
                            <span className="block text-sm font-semibold text-navy group-hover:text-blue">
                              {cli.nombre}
                            </span>
                            <span className="text-xs text-muted">{cli.tipo}</span>
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums">{c.items.length}</td>
                      <td className="px-3 py-3 text-right text-sm font-extrabold tabular-nums">
                        {cop(total)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tono={TONO[c.estado]}>{c.estado}</Badge>
                        {c.estado === 'Enviada' && dias >= 0 && dias <= 3 && (
                          <span className="mt-1 block text-[11px] font-bold text-warn">
                            vence en {dias} {dias === 1 ? 'día' : 'días'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {c.emitida === null ? '—' : fecha(c.emitida)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {c.emitida === null ? '—' : fechaCorta(vence(c))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to={`/pdf/${c.id}`}>
                            <Boton tamano="sm">PDF</Boton>
                          </Link>
                          {puede('cotizaciones.crear') && (
                            <Boton
                              tamano="sm"
                              onClick={() => {
                                duplicar(c.id)
                                navigate('/cotizacion')
                              }}
                            >
                              Duplicar
                            </Boton>
                          )}
                          {c.estado === 'Enviada' && (
                            <>
                              <Boton tamano="sm" onClick={() => cambiarEstado(c.id, 'Aceptada')}>
                                Aceptar
                              </Boton>
                              <Boton
                                tamano="sm"
                                variante="peligro"
                                onClick={() => cambiarEstado(c.id, 'Rechazada')}
                              >
                                Rechazar
                              </Boton>
                            </>
                          )}
                          {c.estado === 'Borrador' && puedeEditar(c) && (
                            <Boton
                              tamano="sm"
                              variante="peligro"
                              onClick={() => eliminarCotizacion(c.id)}
                            >
                              Eliminar
                            </Boton>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <Etiqueta>
              Mostrando {filtradas.length} de {conTotales.length} cotizaciones
            </Etiqueta>
          </div>
        </Card>
      )}
    </div>
  )
}
