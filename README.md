# PrediSync

PrediSync es una app web estática para sincronizar una predicación entre dos dispositivos en la misma red Wi-Fi.

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
3. Ambos deben estar en la misma red Wi-Fi.
4. El predicador pega su predicación en español en la página del host.
5. El predicador pega también su versión en inglés en la misma página host.
6. El predicador genera la oferta y la envía al traductor.
7. El traductor pega la oferta, genera la respuesta y la envía al predicador.
8. El predicador pega la respuesta y conecta.
9. El traductor no pega texto: su página guest funciona como visor y recibe el inglés desde host.
10. Al moverse el predicador por su texto en español, la página del traductor avanzará en la versión en inglés.

## Nota

Una vez cargada la página, la comunicación entre los dos dispositivos se realiza por WebRTC en la red local, sin depender de un servidor externo.
