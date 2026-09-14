import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Boton, Card, Chip, Etiqueta, Kpi } from '../components/ui'
import { cop, copCorto } from '../lib/format'
import { exportarCotizaciones } from '../lib/export'
import { calcularTotales } from '../lib/quote'
import { useDatos } from '../lib/store'
import type { Cotizacion, EstadoCotizacion } from '../lib/types'

const RANGOS = [
  { dias: 30, label: 'Últimos 30 días' },
  { dias: 90, label: 'Últimos 90 días' },
  { dias: 365, label: 'Último año' },
  { dias: 0, label: 'Todo' },
]

const ESTADOS: EstadoCotizacion[] = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida']

const total = (c: Cotizacion): number => calcularTotales(c).total

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Reporte global de ventas y cotizaciones: solo visible para el perfil Administrador. */
export default function Reportes() {
  const { datos, cliente } = useDatos()
  const [dias, setDias] = useState(90)

  const cotizaciones = useMemo(() => {
    if (dias === 0) return datos.cotizaciones
    const desde = Date.now() - dias * 86_400_000
    return datos.cotizaciones.filter((c) => new Date(c.creada).getTime() >= desde)
  }, [datos.cotizaciones, dias])

  const aceptadas = cotizaciones.filter((c) => c.estado === 'Aceptada')
  const emitidas = cotizaciones.filter((c) => c.estado !== 'Borrador')
  const ventas = aceptadas.reduce((acc, c) => acc + total(c), 0)
  const cotizado = emitidas.reduce((acc, c) => acc + total(c), 0)
  const conversion = emitidas.length === 0 ? 0 : Math.round((aceptadas.length / emitidas.length) * 100)

  const porVendedor = useMemo(() => {
    const mapa = new Map<string, { nombre: string; cotizaciones: number; cotizado: number; ventas: number }>()
    cotizaciones.forEach((c) => {
      const clave = c.vendedorUid ?? c.vendedor
      const fila = mapa.get(clave) ?? {
        nombre: c.vendedor,
        cotizaciones: 0,
        cotizado: 0,
        ventas: 0,
      }
      fila.cotizaciones += 1
      if (c.estado !== 'Borrador') fila.cotizado += total(c)
      if (c.estado === 'Aceptada') fila.ventas += total(c)
      mapa.set(clave, fila)
    })
    return [...mapa.values()].sort((a, b) => b.ventas - a.ventas)
  }, [cotizaciones])

  const porMes = useMemo(() => {
    const mapa = new Map<string, number>()
    aceptadas.forEach((c) => {
      const d = new Date(c.emitida ?? c.creada)
      const clave = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      mapa.set(clave, (mapa.get(clave) ?? 0) + total(c))
    })
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([clave, valor]) => {
        const [anio, mes] = clave.split('-')
        return { label: `${MES[Number(mes)]} ${anio.slice(2)}`, valor }
      })
  }, [aceptadas])

  const maximoMes = porMes.reduce((acc, m) => Math.max(acc, m.valor), 0)

  const porCliente = useMemo(() => {
    const mapa = new Map<string, number>()
    emitidas.forEach((c) => {
      const nombre = cliente(c.clienteId)?.nombre ?? 'Sin cliente'
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + total(c))
    })
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [emitidas, cliente])

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-7">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy">Reportes globales</h1>
          <p className="mt-0.5 text-sm text-muted">
            Ventas y cotizaciones de todo el equipo, por vendedor, mes y cliente.
          </p>
        </div>
        <Boton
          onClick={() =>
            exportarCotizaciones('cotizapro-reporte-global', cotizaciones, datos.clientes)
          }
        >
          <Download size={16} /> Exportar Excel
        </Boton>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {RANGOS.map((r) => (
          <Chip key={r.dias} activo={dias === r.dias} onClick={() => setDias(r.dias)}>
            {r.label}
          </Chip>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Ventas (aceptadas)" valor={copCorto(ventas)} tono="ok" detalle={`${aceptadas.length} cotizaciones`} />
        <Kpi etiqueta="Cotizado" valor={copCorto(cotizado)} tono="blue" detalle={`${emitidas.length} emitidas`} />
        <Kpi etiqueta="Conversión" valor={`${conversion} %`} detalle="Aceptadas / emitidas" />
        <Kpi
          etiqueta="Ticket promedio"
          valor={copCorto(aceptadas.length === 0 ? 0 : ventas / aceptadas.length)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <Etiqueta>Ventas por vendedor</Etiqueta>
          <div className="mt-3 divide-y divide-line">
            {porVendedor.length === 0 ? (
              <p className="py-4 text-sm text-muted">Sin datos en el rango elegido.</p>
            ) : (
              porVendedor.map((v) => (
                <div key={v.nombre} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-navy">{v.nombre}</div>
                    <div className="text-xs text-muted">
                      {v.cotizaciones} cotizaciones · cotizado {copCorto(v.cotizado)}
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-ok">{cop(v.ventas)}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <Etiqueta>Ventas aceptadas por mes</Etiqueta>
          <div className="mt-4 grid gap-2">
            {porMes.length === 0 ? (
              <p className="text-sm text-muted">Sin ventas aceptadas en el rango.</p>
            ) : (
              porMes.map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-bold text-muted">{m.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-blue"
                      style={{ width: `${maximoMes === 0 ? 0 : (m.valor / maximoMes) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs font-extrabold text-navy">
                    {copCorto(m.valor)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <Etiqueta>Top clientes por monto cotizado</Etiqueta>
          <div className="mt-3 divide-y divide-line">
            {porCliente.length === 0 ? (
              <p className="py-4 text-sm text-muted">Sin datos.</p>
            ) : (
              porCliente.map(([nombre, valor]) => (
                <div key={nombre} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm font-semibold text-navy">{nombre}</span>
                  <span className="text-sm font-extrabold text-navy">{cop(valor)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <Etiqueta>Cotizaciones por estado</Etiqueta>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {ESTADOS.map((estado) => {
              const lista = cotizaciones.filter((c) => c.estado === estado)
              return (
                <div key={estado} className="rounded-[10px] border border-line px-3 py-2.5">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted">{estado}</div>
                  <div className="mt-0.5 text-lg font-extrabold text-navy">{lista.length}</div>
                  <div className="text-xs text-muted">
                    {copCorto(lista.reduce((acc, c) => acc + total(c), 0))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
