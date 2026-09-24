import { useState } from 'react'
import { cop } from '../lib/format'
import type { MetodoPago, Pago } from '../lib/types'
import { Boton, Campo, Etiqueta, Modal } from './ui'

const METODOS: MetodoPago[] = ['Efectivo', 'Transferencia', 'Tarjeta', 'Crédito', 'Otro']

/** Aceptar una cotización equivale a cobrarla: aquí se captura el soporte del pago. */
export default function RegistrarPago({
  numero,
  total,
  pago,
  onGuardar,
  onCerrar,
}: {
  numero: number | null
  total: number
  pago?: Pago | null
  onGuardar: (pago: Omit<Pago, 'registradoPor'>) => void
  onCerrar: () => void
}) {
  const [datos, setDatos] = useState<Omit<Pago, 'registradoPor'>>({
    fecha: pago?.fecha.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    metodo: pago?.metodo ?? 'Transferencia',
    monto: pago?.monto ?? total,
    referencia: pago?.referencia ?? '',
    notas: pago?.notas ?? '',
  })

  return (
    <Modal
      titulo={`Aceptar y registrar el pago ${numero === null ? '' : `de la #${numero}`}`}
      subtitulo={`Total de la cotización: ${cop(total)}`}
      onCerrar={onCerrar}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          etiqueta="Fecha del pago"
          type="date"
          value={datos.fecha}
          onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
        />
        <label className="block">
          <Etiqueta className="mb-1">Método</Etiqueta>
          <select
            value={datos.metodo}
            onChange={(e) => setDatos({ ...datos, metodo: e.target.value as MetodoPago })}
            className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-blue"
          >
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <Campo
          etiqueta="Monto recibido (COP)"
          value={datos.monto}
          onChange={(e) =>
            setDatos({ ...datos, monto: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
          }
        />
        <Campo
          etiqueta="Referencia / comprobante"
          value={datos.referencia}
          onChange={(e) => setDatos({ ...datos, referencia: e.target.value })}
          placeholder="Ej. transferencia 8842"
        />
        <label className="block sm:col-span-2">
          <Etiqueta className="mb-1">Observaciones</Etiqueta>
          <textarea
            value={datos.notas}
            onChange={(e) => setDatos({ ...datos, notas: e.target.value })}
            rows={2}
            className="w-full resize-y rounded-[10px] border border-line px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </label>
      </div>
      {datos.monto < total && (
        <p className="mt-3 text-xs font-semibold text-warn">
          El monto recibido es menor al total: quedan {cop(total - datos.monto)} por cobrar.
        </p>
      )}
      <Boton
        variante="primario"
        className="mt-4 w-full"
        disabled={datos.monto <= 0 || datos.fecha === ''}
        onClick={() => onGuardar(datos)}
      >
        Guardar pago y aceptar
      </Boton>
    </Modal>
  )
}
