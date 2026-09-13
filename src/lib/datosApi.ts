import type { Cliente, Cotizacion, Empresa, Material } from './types'

/** Conjunto de datos de negocio que la app mantiene en memoria. */
export type Datos = {
  materiales: Material[]
  clientes: Cliente[]
  cotizaciones: Cotizacion[]
  empresa: Empresa
  /** Cotización en curso: es una preferencia local del dispositivo, no se replica. */
  borradorId: string | null
}

export type Parcial = Partial<Pick<Datos, 'materiales' | 'clientes' | 'cotizaciones' | 'empresa'>>

/**
 * Persistencia de los datos de negocio. `backendLocalDatos` guarda en el navegador
 * (modo demo) y `backendFirestore` en Firestore, compartido por todo el equipo.
 */
export type BackendDatos = {
  /** Escucha los cambios remotos. En modo local no emite nada. */
  suscribir: (cb: (parcial: Parcial) => void, onError: (mensaje: string) => void) => () => void
  guardarMaterial: (material: Material) => Promise<void>
  guardarMateriales: (materiales: Material[]) => Promise<void>
  eliminarMaterial: (id: string) => Promise<void>
  guardarCliente: (cliente: Cliente) => Promise<void>
  eliminarCliente: (id: string) => Promise<void>
  guardarCotizacion: (cotizacion: Cotizacion) => Promise<void>
  guardarCotizaciones: (cotizaciones: Cotizacion[]) => Promise<void>
  eliminarCotizacion: (id: string) => Promise<void>
  guardarEmpresa: (empresa: Empresa) => Promise<void>
  /** Borra los datos de negocio (no toca los perfiles de usuario). */
  vaciar: () => Promise<void>
}

const nada = async (): Promise<void> => undefined

export const backendLocalDatos = (): BackendDatos => ({
  suscribir: () => () => undefined,
  guardarMaterial: nada,
  guardarMateriales: nada,
  eliminarMaterial: nada,
  guardarCliente: nada,
  eliminarCliente: nada,
  guardarCotizacion: nada,
  guardarCotizaciones: nada,
  eliminarCotizacion: nada,
  guardarEmpresa: nada,
  vaciar: nada,
})
