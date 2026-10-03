# Extensión de Chrome de MovieBox

La extensión detecta el título de la película o serie visible en la pestaña actual. Permite corregirlo o escribir varios títulos, uno por línea, antes de abrir MovieBox con el cuadro **Agregar títulos** y la búsqueda ya iniciada.

## Instalarla en Chrome

1. Abrí `chrome://extensions`.
2. Activá **Modo de desarrollador**.
3. Elegí **Cargar extensión sin empaquetar**.
4. Seleccioná la carpeta `chrome-extension` de este repositorio.
5. Fijá **MovieBox - Agregar título** desde el menú de extensiones de Chrome.

## Usarla

1. Abrí una página de una película o serie.
2. Pulsá el icono de la extensión.
3. Revisá o corregí el título detectado. También podés escribir varios títulos, uno debajo del otro.
4. Pulsá **Abrir en MovieBox**.

MovieBox se abre en una pestaña nueva. Si la sesión no está iniciada, primero muestra el acceso y conserva los parámetros para abrir el buscador después de autenticarte.

La extensión solicita acceso únicamente a la pestaña activa cuando se pulsa su icono. No lee ni guarda el token de MovieBox.
