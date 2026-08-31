# Publicacion de MovieBox

## CloudPanel, solo la primera vez

Crear un sitio para `moviebox.beweb.com.ar` con el usuario `tastebox`, emitir el
certificado Let's Encrypt y pegar el contenido de `cloudpanel-vhost.conf` en el
vhost. El backend escucha exclusivamente para este sitio en el puerto `3003`.

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
