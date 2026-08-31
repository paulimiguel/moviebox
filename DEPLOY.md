# Publicacion de MovieBox

## CloudPanel, solo la primera vez

Crear un sitio Node.js para `moviebox.beweb.com.ar`, elegir Node 22, configurar
el puerto de aplicacion `3003` y emitir el certificado Let's Encrypt. El backend
sirve la API, las cargas y el frontend, por lo que el proxy Node.js generado por
CloudPanel es suficiente. `cloudpanel-vhost.conf` queda como referencia opcional.

La carpeta del sitio es:

```text
/home/tastebox/htdocs/moviebox.beweb.com.ar
```

## Variables privadas del backend

El archivo `backend/.env` del servidor no se versiona:

```env
DATABASE_URL="file:/home/tastebox/htdocs/moviebox.beweb.com.ar/backend/prisma/prod.db"
PORT=3003
JWT_SECRET="una-cadena-larga-y-aleatoria"
FRONTEND_URL="https://moviebox.beweb.com.ar"
TMDB_API_TOKEN=""
```

## Actualizaciones

Con el sitio ya aprovisionado:

```powershell
npm run deploy:prod
```

El script exige `main` limpia, publica GitHub, ejecuta migraciones, compila y
reinicia el proceso `moviebox` en PM2. La publicación solo se considera completa
después de comprobar el sitio y `/api/health` por HTTPS.
