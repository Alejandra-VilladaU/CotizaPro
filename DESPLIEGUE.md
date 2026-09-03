# Guía de despliegue — CotizaPro

CotizaPro compila a un sitio **estático** (`dist/`): HTML + JS + CSS + imágenes. No necesita Node en
el servidor, ni base de datos, ni variables de entorno. Lo único imprescindible es que el servidor
haga **fallback a `index.html`** para las rutas internas (`/cotizacion`, `/clientes/C01`, `/pdf/...`),
porque es una SPA.

Elige una opción:

| Opción | Cuándo usarla | Tiempo |
| --- | --- | --- |
| [1. Docker + Nginx](#1-docker--nginx-recomendado) | Servidor propio o VPS con Docker | ~5 min |
| [2. VPS con Nginx sin Docker](#2-vps-con-nginx-sin-docker) | VPS Ubuntu/Debian tradicional | ~15 min |
| [3. Vercel / Netlify](#3-vercel--netlify) | Sin servidor, HTTPS y dominio automáticos | ~3 min |
| [4. Hosting compartido / cPanel](#4-hosting-compartido-cpanel-o-subcarpeta) | Solo FTP disponible | ~10 min |

---

## 0. Requisitos y build de producción

En la máquina donde compiles (tu PC o el servidor):

```bash
node -v          # 20.19+ (recomendado Node 22 LTS)
npm ci           # instala exactamente el package-lock.json
npm run build    # genera dist/
npm run preview  # opcional: prueba dist/ en http://localhost:4173
```

Salida esperada: `dist/index.html`, `dist/assets/*.js|css`, `dist/iso.png`, `dist/wordmark.png`,
`dist/wordmark_tag.png`.

Si en tu servidor solo tienes Node 18/20.18, instala Node 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Variables de entorno

Para el login real necesitas la configuración web de Firebase (ver **[FIREBASE.md](./FIREBASE.md)**
para crear el proyecto, publicar `firestore.rules` y crear el primer administrador):

```bash
cp .env.example .env.production   # y completa los valores VITE_FIREBASE_*
```

Vite **inyecta estas variables durante el build**, no en tiempo de ejecución: si las cambias hay
que volver a compilar (y a reconstruir la imagen Docker). Solo expone las que empiezan por
`VITE_`, y su valor queda embebido en el bundle público: eso es normal para la config de Firebase,
pero **nunca pongas ahí secretos** (claves privadas, tokens de servicio, contraseñas).

Sin `.env` la app se despliega igual y arranca en modo demo local (usuarios en `localStorage`),
útil para mostrarla pero **no para producción**.

En Docker, `.env.production` debe existir en la carpeta del proyecto antes de `docker compose
build`; el `Dockerfile` lo copia al contexto de build. En Vercel/Netlify se configuran como
*Environment Variables* del proyecto y luego se redespliega.

---

## 1. Docker + Nginx (recomendado)

El repo ya trae `Dockerfile` (build multi-etapa), `nginx.conf` (con fallback SPA y caché) y
`docker-compose.yml`.

```bash
# construir y levantar
docker compose up -d --build

# la app queda en http://IP_DEL_SERVIDOR:8080
docker compose logs -f      # ver logs
docker compose down         # detener
```

Sin compose:

```bash
docker build -t cotizapro .
docker run -d --name cotizapro --restart unless-stopped -p 8080:80 cotizapro
```

Para publicar en el puerto 80 cambia `- '8080:80'` por `- '80:80'` en `docker-compose.yml`, o pon un
proxy inverso delante (ver §2.4 para HTTPS con Certbot apuntando a `http://127.0.0.1:8080`).

---

## 2. VPS con Nginx sin Docker

Servidor Ubuntu 22.04/24.04 limpio.

### 2.1 Instalar Nginx y subir el build

```bash
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/cotizapro
```

Desde tu equipo local (después de `npm run build`):

```bash
rsync -avz --delete dist/ usuario@IP_DEL_SERVIDOR:/tmp/cotizapro-dist/
ssh usuario@IP_DEL_SERVIDOR 'sudo rsync -a --delete /tmp/cotizapro-dist/ /var/www/cotizapro/ && sudo chown -R www-data:www-data /var/www/cotizapro'
```

### 2.2 Configurar el sitio

`/etc/nginx/sites-available/cotizapro`:

```nginx
server {
    listen 80;
    server_name cotizapro.midominio.co;
    root /var/www/cotizapro;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;   # <- imprescindible para la SPA
        add_header Cache-Control "no-cache";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cotizapro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 2.3 DNS

Crea un registro **A** de `cotizapro.midominio.co` apuntando a la IP pública del servidor y espera
la propagación (`dig +short cotizapro.midominio.co`).

### 2.4 HTTPS gratis con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cotizapro.midominio.co
sudo systemctl status certbot.timer   # renovación automática
```

### 2.5 Firewall

```bash
sudo ufw allow 'Nginx Full' && sudo ufw allow OpenSSH && sudo ufw enable
```

### 2.6 Apache en lugar de Nginx

Sube `dist/` a `/var/www/cotizapro`, habilita `sudo a2enmod rewrite` y añade un `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 3. Vercel / Netlify

Ya están incluidos `vercel.json` y `netlify.toml` con el rewrite de SPA.

**Vercel**

```bash
npm i -g vercel
vercel            # primer despliegue (preview)
vercel --prod     # producción
```

O desde la web: *New Project* → importa el repositorio → framework **Vite** → Build `npm run build`
→ Output `dist` → Deploy. En *Settings → Domains* agregas tu dominio.

**Netlify**

```bash
npm i -g netlify-cli
netlify deploy --build            # preview
netlify deploy --build --prod     # producción
```

**GitHub Pages / subcarpeta:** si la app no se sirve en la raíz del dominio, define la base antes de
compilar en `vite.config.ts`:

```ts
export default defineConfig({ base: '/cotizapro/', plugins: [react(), tailwindcss()] })
```

---

## 4. Hosting compartido (cPanel) o subcarpeta

1. `npm run build` en tu equipo (ajustando `base` si va en subcarpeta, ver arriba).
2. Sube **el contenido** de `dist/` a `public_html/` (o `public_html/cotizapro/`) por FTP o el
   administrador de archivos.
3. Añade en esa carpeta el `.htaccess` de §2.6 para que las rutas internas no den 404.

---

## Actualizar la aplicación

```bash
git pull                 # o copia los archivos nuevos
npm ci && npm run build
# Docker:
docker compose up -d --build
# Nginx directo:
rsync -avz --delete dist/ usuario@IP:/tmp/cotizapro-dist/ && ssh usuario@IP 'sudo rsync -a --delete /tmp/cotizapro-dist/ /var/www/cotizapro/'
```

Los nombres de archivo llevan hash, así que el navegador toma la versión nueva sin limpiar caché.
Los datos del usuario no se tocan: viven en su navegador.

## Datos, respaldo y restablecer la demo

- Todo se guarda en `localStorage`, clave `cotizapro.v1`, por navegador y por dominio.
- **Respaldo manual:** consola del navegador (F12) →
  `copy(localStorage.getItem('cotizapro.v1'))` y guarda el JSON.
- **Restaurar:** `localStorage.setItem('cotizapro.v1', '<JSON pegado>')` y recarga.
- **Volver a la demo:** *Ajustes → Restablecer datos*, o
  `localStorage.removeItem('cotizapro.v1')` y recarga.

## Lista de verificación posdespliegue

- [ ] `https://tu-dominio` carga la pantalla *Buscar materiales* con el logo.
- [ ] Recargar directamente `https://tu-dominio/cotizaciones` **no** da 404 (fallback SPA correcto).
- [ ] Agregar un material, elegir cliente y *Generar cotización* asigna número consecutivo.
- [ ] `/pdf/<id>` imprime en tamaño carta sin la barra superior (`.no-print`).
- [ ] En móvil se ve la barra inferior de navegación y el total flotante.
- [ ] HTTPS activo y renovación automática (`certbot.timer` o el proveedor).

## Escalar a multiusuario (siguiente paso)

Para que varios vendedores compartan inventario y cotizaciones hace falta reemplazar la capa de
persistencia (`src/lib/store.tsx`, hoy `localStorage`) por llamadas a una API. Ruta más corta:
Supabase o PostgreSQL + una API REST con las tablas `materiales`, `clientes`, `cotizaciones`,
`cotizacion_items`, autenticación por usuario y el consecutivo de numeración en el servidor. Toda la
lógica de cálculo ya está aislada en `src/lib/quote.ts` y se puede reutilizar tal cual.
