# Arquitectura

```
blipo/
├── index.html              Pantallas, overlays y sprite SVG de íconos
├── manifest.webmanifest    PWA (instalable)
├── sw.js                   Service worker (offline)
├── css/
│   ├── tokens.css          Variables de diseño (colores, tipografía, espacios)
│   ├── base.css            Reset, fuentes, accesibilidad
│   ├── components.css      Botones, paneles, toasts, switches
│   ├── screens.css         Menú, mundos, tienda, logros, ajustes
│   ├── game.css            HUD, controles táctiles, aviso de rotación
│   └── responsive.css      Móvil vertical/horizontal, tablet, pantallas grandes
├── js/
│   ├── main.js             Punto de entrada
│   ├── config.js           Constantes de física, juego y economía
│   ├── app/                App (orquestador), Session (modos), Pwa, Share
│   ├── core/               EventBus, Loop (120 Hz fijo), Storage, I18n, Random, Format
│   ├── systems/            Input (teclado/táctil/mando), Audio (sintetizado), Haptics
│   ├── engine/             TileMap, Physics, Camera, Particles, Renderer
│   ├── entities/           Player (coyote time, buffer, doble salto, wall jump), Skins
│   ├── levels/             tiles, campaign (niveles originales), generator (procedural), worlds
│   ├── game/               Game (partida), Progress, Achievements, Daily
│   ├── ui/                 ScreenManager, Hud, TouchControls, Toast, Dialog, Mascot
│   │   └── views/          Una vista por pantalla
│   └── i18n/               es.js, en.js
├── assets/fonts|icons|store
├── tools/                  brand.html (íconos) y build-web.mjs (copia a /www)
└── docs/
```

## Flujo
1. `main.js` crea `App`.
2. `App` construye sistemas → UI → vistas → `Session`, aplica ajustes y arranca el `Loop`.
3. `Loop` corre la física a paso fijo (120 Hz) y dibuja a la tasa de la pantalla.
4. `Game` emite eventos por el `bus` (`game:complete`, `game:over`, `stat`, `toast`…); `App`/`Session` los convierten en progreso, logros y pantallas de resultado.
5. `Storage` guarda en `localStorage` con escritura diferida y `flush()` al salir o pasar a segundo plano.

## Cómo agregar…
- **Un nivel a mano:** añade un objeto en `js/levels/campaign.js` (mapa 40×22 con los caracteres de `tiles.js`) y su nombre en `i18n`.
- **Un mundo:** agrega una entrada en `WORLDS` (`js/levels/worlds.js`) y su llave de texto.
- **Una skin:** agrega en `SKINS` (`js/entities/Skins.js`) y `skin_<id>` en `i18n`.
- **Un logro:** agrega en `ACHIEVEMENTS` con `goal` y `value()`, y sus textos `ach_<id>` / `ach_<id>_d`.
- **Un idioma:** crea `js/i18n/xx.js`, regístralo en `core/I18n.js` y añade la opción en Ajustes.
