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
│   ├── engine/             TileMap, Physics, Camera, Particles, Renderer, Backdrop (fondo con paralaje)
│   ├── entities/           Player (coyote time, buffer, doble salto, wall jump), Mover (plataforma móvil), Boss (jefe con línea de tiempo fija), Hats (dibujo de sombreros), Skins
│   ├── levels/             tiles, bosses (jefes y arenas), campaign (Cantera), caves (Cavernas), foundry (Fundición), glacier (Glaciar), void (Vacío), generator (reto diario y supervivencia), worlds
│   ├── game/               Game (partida), Progress, Achievements, Daily, Medals (medallas de tiempo), Ghost (fantasma del mejor intento), Missions (misiones del día), Cosmetics (sombreros, estelas y explosiones)
│   ├── ui/                 ScreenManager, Hud, TouchControls, Toast, Dialog, Mascot
│   │   └── views/          Una vista por pantalla
│   └── i18n/               es.js, en.js
├── assets/fonts|icons|store
├── tools/                  brand.html (íconos), build-web.mjs (copia a /www) y check-levels.mjs (verificador de niveles)
└── docs/
```

## Flujo
1. `main.js` crea `App`.
2. `App` construye sistemas → UI → vistas → `Session`, aplica ajustes y arranca el `Loop`.
3. `Loop` corre la física a paso fijo (120 Hz) y dibuja a la tasa de la pantalla.
4. `Game` emite eventos por el `bus` (`game:complete`, `game:over`, `stat`, `toast`…); `App`/`Session` los convierten en progreso, logros y pantallas de resultado.
5. `Storage` guarda en `localStorage` con escritura diferida y `flush()` al salir o pasar a segundo plano.

## Cómo agregar…
- **Un nivel a mano:** añade un objeto en `js/levels/campaign.js`, `caves.js`, `foundry.js`, `glacier.js` o `void.js` con los caracteres de `tiles.js` y su nombre en `i18n`. El mapa puede medir más de 40×22: la cámara mantiene la escala estándar y lo recorre. Opcional: `movers` (plataformas móviles `{ x, y, w, dx, dy, period, phase }`) `winds` (viento `{ x, y, w, h, dir: 'left' | 'right' | 'up', force, period, on, phase }`; sin `period` sopla siempre) `dark: true` (cueva oscura con luz alrededor de Blipo y de los cristales `L`) y `hint` (llave de un aviso que explica la mecánica).
- **Un jefe:** agrega su definición en `BOSSES` (`js/levels/bosses.js`: tamaño, vida, línea de tiempo con tramos `{ t, to, ease, vulnerable }` y disparos `{ at, x, y, vx, vy, g, life }`), su arena en `BOSS_LEVELS` con la puerta `D`, su dibujo en `Renderer.drawBoss` y sus textos `boss_<id>` / `l_boss_<id>`.
- **Tiempos de medalla:** el oro de cada nivel vive en `js/levels/medals.js`; si cambias un nivel, regenéralo con `node tools/check-levels.mjs --medals` (revisa toda la campaña y reescribe el archivo solo si todo pasa).
- **Una misión diaria:** agrega una entrada en `MISSION_POOL` (`js/game/Missions.js`) con la estadística que cuenta, metas, premio y condición de disponibilidad, y su texto `mission_<id>`.
- **Verificar niveles:** `npm run check:levels` (o `node tools/check-levels.mjs <mundo> <nivel>`) juega cada nivel hecho a mano con la física real y confirma que tiene salida y que las 3 gemas se pueden recoger. En las arenas derrota al jefe golpe por golpe antes de buscar la salida.
- **Un mundo:** agrega una entrada en `WORLDS` (`js/levels/worlds.js`) y su llave de texto.
- **Un cosmético:** agrégalo en `COSMETICS` (`js/game/Cosmetics.js`) con `price` (chispas) o `unlock` (meta: `gold`, `missions`, `boss`, `bosses`, `streak`, `flawless`, `stars`), su dibujo (sombrero en `Hats.js`, estela en `emitTrail`, explosión en `emitBurst`) y su texto `cos_<tipo>_<id>`.
- **Una skin:** agrega en `SKINS` (`js/entities/Skins.js`) y `skin_<id>` en `i18n`.
- **Un logro:** agrega en `ACHIEVEMENTS` con `goal` y `value()`, y sus textos `ach_<id>` / `ach_<id>_d`.
- **Un idioma:** crea `js/i18n/xx.js`, regístralo en `core/I18n.js` y añade la opción en Ajustes.
