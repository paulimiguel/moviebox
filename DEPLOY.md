# Publicacion de MovieBox

## CloudPanel, solo la primera vez

Crear un sitio Node.js para `moviebox.beweb.com.ar`, elegir Node 22, configurar
el puerto de aplicacion `3001` y emitir el certificado Let's Encrypt. El backend
sirve la API, las cargas y el frontend, por lo que el proxy Node.js generado por
CloudPanel es suficiente. `cloudpanel-vhost.conf` queda como referencia opcional.

La carpeta del sitio es:

```text
/home/beweb-moviebox/htdocs/moviebox.beweb.com.ar
```

## Variables privadas del backend

El archivo `backend/.env` del servidor no se versiona:

```env
DATABASE_URL="file:/home/beweb-moviebox/htdocs/moviebox.beweb.com.ar/backend/prisma/prod.db"
PORT=3001
JWT_SECRET="una-cadena-larga-y-aleatoria"
FRONTEND_URL="https://moviebox.beweb.com.ar"
TMDB_API_TOKEN=""
GOOGLE_CLIENT_ID="id-del-cliente-oauth"
GOOGLE_CLIENT_SECRET="secreto-del-cliente-oauth"
GOOGLE_REDIRECT_URI="https://moviebox.beweb.com.ar/api/auth/google/callback"
```

En Google Cloud Console, registrar exactamente estas URI de redireccionamiento:

```text
https://moviebox.beweb.com.ar/api/auth/google/callback
http://localhost:3003/api/auth/google/callback
```

## Actualizaciones

Con el sitio ya aprovisionado:

```powershell
npm run deploy:prod
```

El script exige `main` limpia, publica GitHub, ejecuta migraciones, compila y
reinicia el proceso `moviebox` en PM2. La publicación solo se considera completa
después de comprobar el sitio y `/api/health` por HTTPS.
