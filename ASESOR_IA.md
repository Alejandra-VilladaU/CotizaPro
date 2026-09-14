# Asesor de proyectos con IA

El módulo **Asesor de proyectos** (`/asesor`) es un chat dentro de CotizaPro donde el vendedor o
el administrador describe un proyecto ("¿cómo construyo un mueble de cocina de 2,40 m?"), adjunta
fotos, planos o dibujos a mano, y recibe medidas, pasos y la lista de materiales **del inventario
real**, con un botón para pasarlos a la cotización en curso.

## Por qué Google Gemini

- Tiene **capa gratuita** (sin tarjeta) suficiente para uso comercial liviano.
- Acepta **imágenes** en la misma conversación, que es el requisito de recibir dibujos.
- Se consume por API REST desde el navegador: no hace falta servidor propio ni backend nuevo.

Límites de la capa gratuita (los fija Google y cambian con el tiempo): del orden de unas decenas
de consultas por minuto y algunos cientos por día para `gemini-2.5-flash`. Si se agota, la app
muestra "Se agotó la cuota gratuita de Gemini por ahora".

## Configurar la clave (5 minutos, una sola vez)

1. Entra a https://aistudio.google.com/app/apikey con la misma cuenta de Google.
2. **Create API key** → elige el proyecto (puede ser `cotizaprobd`) → copia la clave (`AIza…`).
3. En CotizaPro, como administrador: **Ajustes → Asesor con IA** → pega la clave →
   **Guardar clave del asesor**.
4. Abre **Asesor de proyectos** y haz una consulta de prueba.

La clave queda en el documento `config/ia` de Firestore (solo el administrador la escribe; el
equipo la lee). En modo demo sin Firebase se usa la variable `VITE_GEMINI_API_KEY` del `.env`.

### Seguridad de la clave

Al ser una app sin backend, la clave llega al navegador de cada usuario. Restríngela en
https://console.cloud.google.com/apis/credentials:

- **API restrictions** → solo *Generative Language API*.
- **Application restrictions** → *Websites* → el dominio donde publiques la app.

Si algún día necesitas que la clave no salga del servidor, el reemplazo natural es una Cloud
Function que haga de intermediaria; el resto del módulo no cambia.

## Cómo funciona por dentro

- `src/lib/ia.ts`: lee la configuración, arma la instrucción de sistema y llama a
  `generativelanguage.googleapis.com`. Las imágenes viajan como `inline_data` en base64.
- El **catálogo** (hasta 120 materiales: código, nombre, unidad, precio) se envía como contexto
  para que el asesor recomiende lo que la ferretería vende y con el precio vigente.
- Se le pide cerrar la respuesta con un bloque fijo:

  ```
  MATERIALES SUGERIDOS
  CODIGO x CANTIDAD
  ```

  `sugerencias()` cruza esas líneas con el inventario y la página muestra cada material con su
  precio y un botón **Agregar**, más el total estimado.
- La conversación vive solo en memoria: al salir de la página no se guarda nada en Firestore.

## Permisos

Se agregó el permiso `asesor.ia`:

- Administrador y vendedor lo traen activo por defecto.
- El administrador puede quitárselo a un vendedor en **Usuarios → Permisos**.
- Sin el permiso, la entrada del menú no aparece y `/asesor` responde "Sin permiso".

Los vendedores creados **antes** de esta versión no tienen el permiso en su perfil: actívaselo una
vez desde Usuarios.
