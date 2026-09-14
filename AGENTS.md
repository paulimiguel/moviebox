# MovieBox: contexto de trabajo para agentes

Este archivo aplica a todo el repositorio. MovieBox es una aplicación independiente; usa patrones visuales y de interacción de TasteBox como referencia, pero nunca se debe modificar TasteBox al trabajar aquí.

## Producto y criterio de implementación

- La interfaz está en español. Conservá las etiquetas, el orden y el alcance exactos indicados por la persona usuaria.
- Antes de inventar una solución visual, buscá el patrón equivalente que ya existe en MovieBox y reutilizalo.
- Hacé cambios localizados. No reescribas componentes completos por ajustes pequeños de UI.
- Respetá desktop, tablet y mobile. Si el pedido menciona una vista o breakpoint concreto, no alteres otros sin necesidad.
- Cuando se solicite restaurar algo "como estaba", recuperá el asset, markup o comportamiento original; no hagas una aproximación.
- No agregues llamadas externas, importación de fotos ni datos de ejemplo si no fueron solicitados. Los diálogos de importación deben permanecer vacíos cuando no haya datos reales.
- Los selectores de catálogos deben mantener opciones visibles con checkbox, creación con Enter y prevención de duplicados.
- En ediciones masivas, las clasificaciones nuevas se agregan a las existentes salvo que se pida expresamente reemplazarlas.
- Antes de borrar o renombrar registros asociados, mostrale al usuario la cantidad afectada, la consecuencia, confirmación y una salida para cancelar. Nunca borres títulos por eliminar una clasificación o colección.

## Arquitectura

- Frontend: React 18, TypeScript, Vite, React Router, TanStack Query y Tailwind.
- Backend: Express, TypeScript, Prisma y SQLite.
- Autenticación: JWT para la API; email/contraseña y Google OAuth.
- Imágenes: archivos locales en uploads o URLs remotas. No asumir que toda imagen viene de TMDB.
- `src/App.tsx` contiene el enrutado autenticado.
- `src/services/api.ts` es el cliente HTTP y la frontera de tipos entre frontend y API.
- `src/types/movie.ts` contiene los tipos principales del dominio.
- `backend/src/index.ts` registra middleware, rutas, archivos estáticos y healthcheck.
- `backend/prisma/schema.prisma` es la fuente de verdad del modelo persistente.
- Las rutas de backend están en `backend/src/routes/` (`auth`, `movies`, `collections`, `metadata`, `genres`, `platforms`, `imdb`, `tmdb` y `uploads`).

## Rutas del frontend

- `/`: biblioteca.
- `/titulo/:id`: ficha individual.
- `/agregar`: búsqueda e incorporación directa de títulos.
- `/colecciones` y `/colecciones/:id`: catálogo y detalle de colección.
- `/plataformas`: catálogo de plataformas.
- `/generos`: catálogo de géneros.
- Las rutas desconocidas autenticadas vuelven a `/`.

Los puntos de entrada más usados son:

- `src/pages/MovieLibraryPage.tsx`
- `src/pages/MovieDetailPage.tsx`
- `src/pages/AddMoviesPage.tsx`
- `src/components/MovieCard.tsx`
- `src/components/MovieDetailModal.tsx`
- `src/components/MovieEditModal.tsx`
- `src/components/MovieFormModal.tsx`
- `src/components/MovieLibraryToolbar.tsx`
- `src/components/Header.tsx`

## Modelo y persistencia

- Toda entidad de usuario debe permanecer aislada por `userId`.
- Un título conserva tipo, títulos original/español, año, sinopsis, duración, temporadas/episodios, IMDb/TMDB, trailer, países, créditos, géneros, palabras clave, plataformas, imágenes y colecciones.
- `favorite`, `watched`, `watchlist`, `personalRating` e `instagramRecommendation` son datos personales persistentes; no deben perderse durante importaciones, sincronizaciones o edición.
- `watchlist` atraviesa Prisma, API, formulario, tarjetas, detalle, filtros y edición masiva. El endpoint personal es `PATCH /api/movies/:id/personal`.
- Países, personas, géneros, palabras clave y plataformas se normalizan para evitar duplicados. Conservá IDs externos y metadatos actuales cuando una edición solo cambia asociaciones visibles.
- Al modificar el esquema, agregá una migración Prisma; no edites bases SQLite a mano.
- Antes de cualquier reset, limpieza o reconstrucción local, hacé una copia de seguridad y confirmá exactamente qué base se va a tocar. Nunca confundas una reconstrucción local con un deploy.

## Importación y proveedores externos

- `/agregar` usa `src/pages/AddMoviesPage.tsx` y admite hasta 50 títulos.
- El backend de IMDb/Cinemeta está en `backend/src/routes/imdb.ts`.
- Las consultas Cinemeta deben usar reintentos y `Promise.allSettled` para conservar resultados parciales si falla películas o series.
- En importaciones múltiples, reportá errores por título y no descartes los resultados válidos.
- Un título recién guardado debe poder abrirse inmediatamente usando el ID devuelto por la API; no dependas solamente del siguiente refetch de la biblioteca.
- TMDB y otros proveedores son best effort. No inventes metadatos cuando el proveedor no responde.

## UI y tema

- La paleta central vive en `tailwind.config.ts` y las variables/modos en `src/index.css`.
- Colores de marca: coral `#ef5544`, aqua `#65b9bb`; usá las variables `canvas`, `ink`, `mist` y `slate` para superficies y texto.
- El tema se guarda como `moviebox:color-theme`; `ThemeContext` establece `data-theme` en `<html>`.
- En oscuro, no supongas que una clase `bg-white` se oscurece sola: `src/index.css` conserva deliberadamente contextos claros. Agregá un selector oscuro acotado al componente cuando corresponda.
- Los modales de detalle y edición de títulos usan `.movie-detail-modal`. Los editores de género, plataforma y colección reutilizan esa clase para tener exactamente la misma combinación oscura.
- La pantalla de acceso usa `.auth-page`; `.control` y `.auth-google-button` deben ser oscuros en tema oscuro, incluido el campo Nombre de registro.
- `PlatformLogos.tsx` centraliza logos y el fallback. "No disponible en plataformas" se muestra pequeño (10 px) en todas las vistas; no reduzcas por eso el nombre de una plataforma cuyo logo falló.
- Los menús de tarjetas usan `.movie-card-dropdown`; en oscuro su hover establecido es `rgb(38 42 47)`.
- En `MovieCard`, la etiqueta `SERIE` usa aqua y `PELÍCULA` coral. El menú debe quedar por encima de otras tarjetas y abrir hacia arriba cuando así esté implementado.
- La selección de metadatos mantiene el orden visual `Géneros | Plataformas` y luego `Colecciones | Etiquetas` en los formularios donde estén esos cuatro grupos.
- Géneros, palabras clave, plataformas y colecciones usan paneles de altura consistente. Países y dirección usan multiselección buscable y retienen valores aún no presentes en el catálogo.
- Las acciones rápidas Películas/Series del toolbar y sus equivalentes dentro de Filtrar comparten el mismo estado; no crees estados paralelos.

## Desarrollo local

Instalación inicial:

```powershell
npm install
npm --prefix backend install
npm --prefix backend run db:migrate
```

Se necesitan dos procesos simultáneos:

```powershell
# Terminal 1
npm --prefix backend run dev

# Terminal 2
npm run dev
```

- Frontend: `http://localhost:8081`.
- API: `http://localhost:3003/api`.
- Healthcheck: `http://localhost:3003/api/health`.
- Si Google muestra `ERR_CONNECTION_REFUSED`, comprobá primero que el backend escuche en `3003`; tener solo Vite en `8081` no alcanza.
- En desarrollo, `src/services/api.ts` usa `http://localhost:3003/api` salvo que exista `VITE_API_URL`.
- `backend/.env` no se versiona. Debe contener la configuración local de base, JWT y proveedores.
- Callback OAuth local esperado: `http://localhost:3003/api/auth/google/callback`.
- Retorno del frontend esperado: `http://localhost:8081`.
- No muestres ni copies `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, tokens de TMDB u otras credenciales en logs, commits o respuestas.

## Validación

Para cambios de frontend o UI ejecutá como mínimo:

```powershell
npm run typecheck
npm run build
git diff --check
```

Para cambios de backend, Prisma o una publicación ejecutá además:

```powershell
npm --prefix backend run build
npm run db:validate
```

- Verificá visualmente las variantes afectadas cuando sea viable: tema claro/oscuro, tamaños de tarjeta, detalle, modal, desktop/mobile.
- Un build correcto no demuestra que OAuth, proveedores externos o producción funcionen; probá el endpoint o flujo correspondiente.
- Si `prisma generate` falla en Windows con `EPERM` al renombrar el engine, verificá que no haya un backend usando el archivo. `db:validate`, build y generación remota exitosa ayudan a distinguir bloqueo de archivo de un esquema inválido.

## Git y archivos locales

- Empezá siempre con `git status --short --branch` y revisá el diff antes de editar.
- El checkout puede tener cambios de la persona usuaria o de una tarea anterior. No los descartes, sobrescribas ni incluyas por accidente.
- Usá parches pequeños y leé archivos TS/TSX como UTF-8 si falla el contexto.
- Para commits, agregá explícitamente solo los archivos del pedido; evitá `git add --all`.
- No uses `git reset --hard`, `git checkout --` ni limpiezas destructivas salvo pedido explícito y alcance verificado.
- `dist`, dependencias, logs, bases locales, uploads y archivos `.env` están ignorados y no deben versionarse.
- No hagas commit, push ni deploy hasta que se solicite expresamente.

## Publicación en producción

- Producción: `https://moviebox.beweb.com.ar`.
- Rama de publicación: `main`.
- Script: `scripts/deploy-local.ps1`; requiere una rama `main` limpia.
- Si todavía no se hizo push, usá `npm run deploy:prod` o el script sin `-SkipPush`.
- Si el commit ya fue subido, se puede usar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-local.ps1 -SkipPush
```

- El backend de producción sirve API, uploads y frontend compilado; PM2 ejecuta el proceso `moviebox` en el puerto interno 3001.
- El deploy instala dependencias, genera Prisma, aplica migraciones pendientes, compila frontend/backend y reinicia PM2.
- Un `curl` fallido a `127.0.0.1:3001` inmediatamente después del reinicio puede ser transitorio. No declares fallo ni éxito basándote solo en esa línea.
- Una publicación se considera completa únicamente después de comprobar de forma independiente:
  - sitio público HTTP 200;
  - bundle JavaScript referenciado por el HTML HTTP 200;
  - `https://moviebox.beweb.com.ar/api/health` con `status: ok`;
  - proceso PM2 `moviebox` en estado `online`;
  - HEAD remoto igual al commit publicado;
  - `git rev-list --left-right --count HEAD...origin/main` igual a `0 0`;
  - checkout local limpio.
- Informá por separado validación local, commit, push, deploy y comprobación pública. Nunca llames "publicado" a trabajo local o no verificado.

## Antes de entregar

- Confirmá que resolviste todas las vistas incluidas en el pedido y ninguna fuera de alcance.
- Enumerá brevemente archivos o áreas cambiadas y validaciones realizadas.
- Indicá claramente si quedó local, commiteado, subido o publicado.
- Si algo externo no se pudo verificar, describí el bloqueo exacto sin presentar el trabajo como completo.
