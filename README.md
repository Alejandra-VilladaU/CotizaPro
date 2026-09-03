# CotizaPro — Busca. Cotiza. Construye.

Aplicación web lista para usar para consultar materiales del inventario, agregar cantidades,
generar cotizaciones confiables (con IVA, descuentos y vigencia) y conservar el historial por
cliente.

- **Stack:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + React Router.
- **Datos:** persistidos en el navegador (`localStorage`, clave `cotizapro.v1`) con catálogo demo
  de 30 materiales, 5 clientes y 8 cotizaciones.
- **Sin backend:** no necesita base de datos, servidor de aplicación ni credenciales; se despliega
  como sitio estático.

## Pantallas

| Ruta | Función |
| --- | --- |
| `/` | Buscar materiales por nombre, código o categoría; ver precio, unidad y stock; stepper de cantidad y "Agregar". |
| `/cotizacion` | Cotización en curso (borrador): cliente, cantidades, precio editable, descuento por línea, descuento global, IVA, vigencia, notas, generar y compartir. |
| `/cotizacion/:id` | Ver o editar una cotización específica. |
| `/cotizaciones` | Historial general con KPIs (enviadas, aceptadas, por vencer, borradores), filtros por estado y acciones (PDF, duplicar, aceptar, rechazar). |
| `/clientes` | Lista de clientes con total cotizado y aceptadas; crear cliente. |
| `/clientes/:id` | Historial de cotizaciones de ese cliente. |
| `/inventario` | Administrar materiales: crear, editar, eliminar, importar CSV, alertas de stock. |
| `/ajustes` | Datos de la empresa para el PDF, IVA y vigencia por defecto, restablecer datos demo. |
| `/pdf/:id` | Vista imprimible tamaño carta (Imprimir → "Guardar como PDF"). |

## Reglas del cotizador

```
total_línea = cantidad × precio_unitario × (1 − descuento_línea / 100)
subtotal    = Σ total_línea
descuento   = subtotal × descuento_global / 100
base        = subtotal − descuento
iva         = base × iva_pct / 100
total       = base + iva
```

- El nombre y el precio quedan **congelados** en la cotización (snapshot): cambiar el inventario no
  altera cotizaciones ya emitidas; la app avisa y ofrece "Actualizar precios" en los borradores.
- El **número consecutivo** se asigna al generar, no al crear el borrador.
- Vigencia por defecto 15 días; al pasar la fecha, una cotización *Enviada* pasa a *Vencida*.
- Se puede cotizar por encima del stock, pero se muestra advertencia.
- Moneda COP sin decimales (`$ 1.452.327`), IVA por defecto 19 %.

## Importar inventario por CSV

Encabezado opcional; separador `,` o `;`:

```csv
codigo,nombre,categoria,unidad,precio,stock,stock_minimo
COD-1023,Cemento Gris Uso General 50 kg,Cemento,bulto,32400,240,40
COD-2210,Varilla corrugada 1/2" x 6 m,Acero,unidad,28900,8,20
```

Unidades válidas: `unidad`, `bulto`, `m2`, `m3`, `kg`, `ml`. Si el código ya existe, se actualiza el
material; si no, se crea.

## Ejecutar en local

Requiere **Node.js 20.19+ o 22.12+** (recomendado 22 LTS) y npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Otros comandos:

```bash
npm run build        # typecheck (tsc -b) + build de producción en dist/
npm run preview      # sirve dist/ en http://localhost:4173
npm run lint         # oxlint
```

No hay variables de entorno obligatorias: el bundle es 100 % estático.

## Despliegue

Ver **[DESPLIEGUE.md](./DESPLIEGUE.md)** — Docker + Nginx, VPS con dominio y HTTPS,
Vercel/Netlify, subcarpeta, actualización y respaldo de datos.

## Limitaciones actuales

- Los datos viven en el navegador de cada usuario: **no se comparten** entre dispositivos ni
  personas, y se pierden si se borra el almacenamiento del sitio. Para varios vendedores hace falta
  un backend (API + base de datos) y autenticación.
- El PDF es la vista imprimible del navegador (Imprimir → Guardar como PDF), no generación en
  servidor.
- WhatsApp y correo se abren con enlaces `wa.me` y `mailto:`; no hay integración con la API oficial.
- El enlace que se comparte (`/pdf/:id`) solo funciona en el navegador donde se creó la cotización,
  precisamente porque no hay backend.
