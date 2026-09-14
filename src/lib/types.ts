export type Unidad = 'unidad' | 'bulto' | 'm2' | 'm3' | 'kg' | 'ml'

export type Material = {
  id: string
  codigo: string
  nombre: string
  categoria: string
  unidad: Unidad
  precio: number
  stock: number
  stockMinimo: number
  activo: boolean
  actualizado: string
}

export type TipoCliente = 'Particular' | 'Contratista' | 'Empresa'

export type Cliente = {
  id: string
  nombre: string
  tipo: TipoCliente
  telefono: string
  documento?: string
  email?: string
  obra?: string
  creado: string
  /** Vendedor que registró el cliente: delimita el historial que ve cada vendedor. */
  creadoPor?: string | null
}

export type EstadoCotizacion = 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Vencida'

/** Snapshot del material: una cotización enviada no cambia si cambia el inventario. */
export type ItemCotizacion = {
  materialId: string
  codigo: string
  nombre: string
  unidad: Unidad
  precioUnitario: number
  precioLista: number
  cantidad: number
  descuento: number
}

export type Cotizacion = {
  id: string
  numero: number | null
  clienteId: string | null
  items: ItemCotizacion[]
  descuentoGlobal: number
  ivaPct: number
  vigenciaDias: number
  notas: string
  estado: EstadoCotizacion
  vendedor: string
  /** uid del vendedor dueño de la cotización. */
  vendedorUid?: string | null
  /** Autorización explícita registrada por el administrador para editar una cotización ajena. */
  autorizacionEdicion?: { por: string; uid: string; fecha: string } | null
  creada: string
  emitida: string | null
  actualizada: string
}

export type Empresa = {
  nombre: string
  /** Ruta o URL del logo que encabeza el PDF. */
  logoUrl: string
  nit: string
  direccion: string
  telefono: string
  email: string
  vendedor: string
  ivaPct: number
  vigenciaDias: number
  condiciones: string
  notas: string
}
