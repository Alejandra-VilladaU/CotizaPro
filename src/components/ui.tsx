import { Minus, Plus, Search, X } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export type TonoBadge = 'ok' | 'warn' | 'danger' | 'blue' | 'gris'

const TONOS: Record<TonoBadge, string> = {
  ok: 'bg-ok-soft text-ok border-ok/25',
  warn: 'bg-warn-soft text-warn border-warn/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  blue: 'bg-blue-soft text-blue border-blue/25',
  gris: 'bg-surface text-muted border-line',
}

export function Badge({ tono = 'gris', children }: { tono?: TonoBadge; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-[3px] text-[11px] font-extrabold uppercase tracking-wide ${TONOS[tono]}`}
    >
      {children}
    </span>
  )
}

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'peligro'
  tamano?: 'sm' | 'md'
}

export function Boton({
  variante = 'secundario',
  tamano = 'md',
  className = '',
  ...props
}: BotonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45'
  const medidas = tamano === 'sm' ? 'px-3 py-2 text-[13px]' : 'px-4 py-3 text-sm'
  const variantes = {
    primario: 'bg-blue text-white hover:bg-blue-hover',
    secundario: 'border border-line bg-white text-navy hover:bg-surface',
    fantasma: 'text-blue hover:bg-blue-soft',
    peligro: 'border border-danger/30 bg-danger-soft text-danger hover:bg-danger/10',
  }
  return <button className={`${base} ${medidas} ${variantes[variante]} ${className}`} {...props} />
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-[10px] border border-line bg-white shadow-[0_1px_2px_rgba(4,36,76,0.08)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Etiqueta({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`text-[11px] font-bold uppercase tracking-[0.06em] text-muted ${className}`}
    >
      {children}
    </div>
  )
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { etiqueta?: string }

export function Campo({ etiqueta, className = '', ...props }: CampoProps) {
  return (
    <label className="block">
      {etiqueta !== undefined && <Etiqueta className="mb-1">{etiqueta}</Etiqueta>}
      <input
        className={`w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm text-navy outline-none placeholder:text-muted focus:border-blue focus:ring-3 focus:ring-blue/15 ${className}`}
        {...props}
      />
    </label>
  )
}

export function Buscador({
  valor,
  onCambio,
  placeholder,
  atajo,
  autoFocus,
}: {
  valor: string
  onCambio: (v: string) => void
  placeholder: string
  atajo?: string
  autoFocus?: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2.5 focus-within:border-blue focus-within:ring-3 focus-within:ring-blue/15">
      <Search size={18} className="shrink-0 text-muted" aria-hidden />
      <input
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-muted"
      />
      {valor !== '' ? (
        <button
          type="button"
          onClick={() => onCambio('')}
          aria-label="Limpiar búsqueda"
          className="rounded-md p-1 text-muted hover:bg-surface"
        >
          <X size={16} />
        </button>
      ) : (
        atajo !== undefined && (
          <kbd className="hidden rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-bold text-muted sm:block">
            {atajo}
          </kbd>
        )
      )}
    </div>
  )
}

export function Chip({
  activo = false,
  onClick,
  children,
}: {
  activo?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
        activo
          ? 'border-blue bg-blue-soft text-blue'
          : 'border-line bg-white text-navy hover:bg-surface'
      }`}
    >
      {children}
    </button>
  )
}

export function Stepper({
  valor,
  onCambio,
  deshabilitado = false,
  paso = 1,
}: {
  valor: number
  onCambio: (v: number) => void
  deshabilitado?: boolean
  paso?: number
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-white">
      <button
        type="button"
        aria-label="Disminuir cantidad"
        disabled={deshabilitado || valor <= 0}
        onClick={() => onCambio(Math.max(0, valor - paso))}
        className="grid h-9 w-9 place-items-center text-navy hover:bg-surface disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
      <input
        value={valor}
        aria-label="Cantidad"
        disabled={deshabilitado}
        onChange={(e) => onCambio(Math.max(0, Number(e.target.value.replace(/[^\d]/g, '')) || 0))}
        className="h-9 w-12 border-x border-line text-center text-[15px] font-extrabold text-navy outline-none disabled:bg-surface disabled:text-muted"
      />
      <button
        type="button"
        aria-label="Aumentar cantidad"
        disabled={deshabilitado}
        onClick={() => onCambio(valor + paso)}
        className="grid h-9 w-9 place-items-center text-navy hover:bg-surface disabled:opacity-40"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

export function Kpi({
  etiqueta,
  valor,
  detalle,
  tono = 'navy',
}: {
  etiqueta: string
  valor: string
  detalle?: string
  tono?: 'navy' | 'blue' | 'ok' | 'warn' | 'danger'
}) {
  const colores = {
    navy: 'text-navy',
    blue: 'text-blue',
    ok: 'text-ok',
    warn: 'text-warn',
    danger: 'text-danger',
  }
  return (
    <Card className="p-4">
      <Etiqueta>{etiqueta}</Etiqueta>
      <div className={`mt-1 text-[22px] font-extrabold ${colores[tono]}`}>{valor}</div>
      {detalle !== undefined && <div className="mt-0.5 text-xs text-muted">{detalle}</div>}
    </Card>
  )
}

export function Modal({
  titulo,
  subtitulo,
  onCerrar,
  children,
  ancho = 'max-w-lg',
}: {
  titulo: string
  subtitulo?: string
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className={`w-full ${ancho} max-h-[92vh] overflow-y-auto rounded-t-[18px] bg-white shadow-[0_20px_50px_rgba(4,36,76,0.28)] sm:rounded-[14px]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-navy">{titulo}</h2>
            {subtitulo !== undefined && <p className="mt-0.5 text-xs text-muted">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-muted hover:bg-surface"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Banner({
  tono = 'warn',
  children,
}: {
  tono?: 'warn' | 'ok' | 'blue' | 'danger'
  children: ReactNode
}) {
  const tonos = {
    warn: 'border-warn/35 bg-warn-soft text-warn',
    ok: 'border-ok/35 bg-ok-soft text-ok',
    blue: 'border-blue/30 bg-blue-soft text-blue',
    danger: 'border-danger/35 bg-danger-soft text-danger',
  }
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-[10px] border px-4 py-3 text-sm font-semibold ${tonos[tono]}`}
    >
      {children}
    </div>
  )
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: ReactNode }) {
  return (
    <Card className="grid place-items-center px-6 py-14 text-center">
      <div className="text-base font-bold text-navy">{titulo}</div>
      <p className="mt-1 max-w-sm text-sm text-muted">{texto}</p>
      {accion !== undefined && <div className="mt-4">{accion}</div>}
    </Card>
  )
}

export function Avatar({ texto, size = 40 }: { texto: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-blue-soft font-extrabold text-blue"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {texto}
    </div>
  )
}
