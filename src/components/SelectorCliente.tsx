import { useState } from 'react'
import { Avatar, Boton, Buscador, Campo, Etiqueta, Modal } from './ui'
import { iniciales } from '../lib/format'
import { useDatos } from '../lib/store'
import type { Cliente, TipoCliente } from '../lib/types'

/** Elige un cliente existente o crea uno nuevo para la cotización. */
export default function SelectorCliente({
  onCerrar,
  onElegir,
}: {
  onCerrar: () => void
  onElegir: (cliente: Cliente) => void
}) {
  const { clientesVisibles, crearCliente } = useDatos()
  const [texto, setTexto] = useState('')
  const [nuevo, setNuevo] = useState({
    nombre: '',
    telefono: '',
    tipo: 'Particular' as TipoCliente,
    documento: '',
    obra: '',
  })

  const lista = clientesVisibles.filter((c) =>
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
