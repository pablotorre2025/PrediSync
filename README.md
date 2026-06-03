# PrediSync

PrediSync es una app web estática para sincronizar una predicación entre dos dispositivos usando internet con código de sala corto.

## Cómo usar desde GitHub Pages

1. Subir el repositorio a GitHub.
2. Activar **GitHub Pages** en la rama `main` y carpeta `/root`.
3. Abrir la URL que GitHub Pages genera, por ejemplo:
   `https://TU-USUARIO.github.io/PrediSync/`
4. Desde esa página, elegir `Predicador` y `Traductor`.

## Páginas disponibles

- `index.html` — página de selección de rol.
- `predisync-host.html` — página del predicador.
- `predisync-guest.html` — página del traductor.

## Flujo recomendado

1. El predicador abre `predisync-host.html` en Safari en su iPad.
2. El traductor abre `predisync-guest.html` en Safari en su iPad.
3. El predicador crea una sala con un código de 4 dígitos y comparte ese código.
4. El traductor entra con el mismo código de sala.
5. No necesitan la misma Wi-Fi: cada iPad puede estar en redes distintas, pero ambos sí necesitan internet.
6. El predicador pega su predicación en español y su versión en inglés en la página host.
7. El traductor no pega texto: su página guest funciona como visor y recibe el inglés desde host.
8. Al moverse el predicador por su texto en español, el visor del traductor avanza en la versión en inglés.

## Nota

La sincronización en tiempo real usa una sala cloud (MQTT sobre WebSocket) para simplificar la conexión y evitar códigos largos de oferta/respuesta.
