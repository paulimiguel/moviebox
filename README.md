# MovieBox

Biblioteca personal de peliculas y series del ecosistema The Box.

MovieBox usa la arquitectura de TasteBox como referencia, pero mantiene su codigo,
base de datos, imagenes y configuracion completamente separados.

## Base de datos local

```powershell
cd backend
npm install
npm run db:migrate
```

## Desarrollo local

```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2, desde la raiz
npm run dev
```

- Aplicacion: `http://localhost:8081`
- API: `http://localhost:3003/api`
- Salud: `http://localhost:3003/api/health`

Incluye biblioteca, alta y edicion, ficha individual, busqueda, filtros,
colecciones, favoritos, estado visto, puntuaciones e imagenes locales o remotas.

## TMDB opcional

La integracion queda preparada pero desactivada por defecto. Para habilitar la
busqueda, define `TMDB_API_TOKEN` en `backend/.env`. Las sincronizaciones futuras
deben conservar siempre favorita, vista, puntuacion personal y colecciones.
