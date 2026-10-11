# Usar CotizaPro de forma local

Tres formas de tenerla corriendo en tu propio computador, de la más simple a la más completa.
Para publicarla en internet usa [PUBLICAR.md](./PUBLICAR.md); para un servidor propio,
[DESPLIEGUE.md](./DESPLIEGUE.md).

| Forma | Para qué sirve | Internet | Datos |
| --- | --- | --- | --- |
| **A. Modo demo** | Probar o presentar la app sin configurar nada | No | En el navegador (`localStorage`), solo en ese equipo |
| **B. Local con tu Firebase** | Trabajar de verdad desde tu PC con los datos reales del negocio | Sí | En la nube, compartidos con todo el equipo |
| **C. Local en la red del negocio** | Que varios equipos del local entren desde el PC "servidor" | Según la opción B o A | Igual que la opción elegida |

---

## 0. Requisito único: Node.js

1. Instala **Node.js 22 LTS** desde <https://nodejs.org> (en Windows, el instalador `.msi`;
   siguiente → siguiente).
2. Abre una terminal (en Windows, *Símbolo del sistema* o *PowerShell*) y comprueba:

   ```bash
   node -v    # debe decir v22.x (sirve 20.19 o superior)
   npm -v
   ```

También necesitas **Git** (<https://git-scm.com>) para descargar el código; si prefieres, puedes
bajar el ZIP desde GitHub con *Code → Download ZIP* y saltarte el `git clone`.

---

## A. Modo demo (sin Firebase, sin internet)

Es la forma más rápida de mostrar la app: trae un catálogo de ejemplo (30 materiales, 5 clientes
y 8 cotizaciones) y usuarios de prueba.

```bash
git clone https://github.com/Alejandra-VilladaU/CotizaPro.git
cd CotizaPro
npm install
npm run dev
```

Abre <http://localhost:5173> e ingresa con:

| Correo | Contraseña | Rol |
| --- | --- | --- |
| `admin@cotizapro.co` | `Admin1234` | Administrador |
| `vendedor@cotizapro.co` | `Vendedor1234` | Vendedor |

Qué debes saber de este modo:

- Los datos se guardan **en el navegador de ese equipo** (clave `cotizapro.v1`): no se comparten
  con nadie y se pierden si borras los datos del navegador.
- La recuperación de contraseña no envía correos: muestra la clave temporal en pantalla.
- El **Asesor IA sí requiere internet** y una clave de Gemini (Ajustes → Asesor con IA). Sin
  clave, el resto de la app funciona igual.
- Para detener el servidor: `Ctrl + C` en la terminal. Para volver a usarla otro día, basta
  `npm run dev` dentro de la carpeta.

---

## B. Local conectado a tu Firebase (datos reales)

Igual que la opción A, pero antes de arrancar creas el archivo de configuración:

```bash
cp .env.example .env        # en Windows: copy .env.example .env
```

Y pegas dentro los valores de tu app web de Firebase (Consola de Firebase → ⚙ Configuración del
proyecto → Tus apps → Configuración del SDK):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=cotizaprobd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cotizaprobd
VITE_FIREBASE_STORAGE_BUCKET=cotizaprobd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Luego:

```bash
npm install
npm run dev
```

Entras con tu usuario real (el mismo correo y contraseña de la app publicada) y ves el inventario,
los clientes y las cotizaciones del negocio, sincronizados en tiempo real. Es el modo recomendado
para trabajar desde el computador del local.

Notas:

- `.env` **no se sube al repositorio** (está en `.gitignore`); es tuyo, de ese equipo.
- Estos valores `VITE_*` son la configuración pública de la app web, no son una contraseña; aun
  así, nunca pongas ahí claves de servicio.
- Si cambias el `.env`, detén el servidor y vuelve a ejecutar `npm run dev`.
- Las reglas de seguridad siguen rigiendo: un vendedor desde local tiene exactamente los mismos
  permisos que en la versión publicada.

---

## C. Que otros equipos del local entren a tu PC

Sirve para usar la app desde el celular o desde otro computador de la ferretería, sin publicarla
en internet.

1. En el PC que hará de servidor:

   ```bash
   npm run build          # compila la versión optimizada en dist/
   npm run preview -- --host
   ```

2. La terminal muestra una dirección de red, por ejemplo `http://192.168.1.15:4173`. Esa es la
   que escriben los demás equipos conectados al **mismo wifi o cable** del local.
3. Si Windows pregunta por el cortafuegos, permite el acceso en *redes privadas*.

Si quieres que quede encendido siempre, en lugar de `npm run preview` puedes levantar la app con
Docker + Nginx: está explicado en [DESPLIEGUE.md](./DESPLIEGUE.md) (`docker compose up -d`).

> Esta forma sigue siendo "local": solo funciona dentro de la red del negocio. Para que un cliente
> o un vendedor la abra desde la calle, hay que publicarla ([PUBLICAR.md](./PUBLICAR.md)).

---

## Comandos útiles

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala las dependencias (solo la primera vez o cuando cambie el código) |
| `npm run dev` | Levanta la app en modo desarrollo en <http://localhost:5173> |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en <http://localhost:4173> para probar la versión compilada |
| `npm run typecheck` | Verifica los tipos de TypeScript |
| `git pull` | Trae la última versión del código antes de volver a compilar |

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| `node: command not found` | Node no quedó instalado o la terminal está abierta desde antes: ciérrala y ábrela de nuevo. |
| El puerto 5173 está ocupado | Vite usa el siguiente puerto libre y lo indica en la terminal; usa esa dirección. |
| Entra pero el inventario está vacío | Estás en modo demo sin datos o faltan las variables de Firebase: revisa el `.env`. |
| "No se pudo cargar la información" | Las reglas de Firestore no permiten esa lectura, o no hay internet. |
| El asesor dice que no está disponible | Falta la clave de Gemini en Ajustes → Asesor con IA, o no hay internet. |
| Cambié el `.env` y no pasa nada | Hay que reiniciar `npm run dev`; las variables se leen al arrancar. |
