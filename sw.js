// Yo soy el service worker de BLIPO: guardo el juego en caché para jugar sin conexión.

// Yo versiono el caché; subo este número cada vez que publico cambios.
const VERSION = 'blipo-v1.3.0';

// Yo listo todo lo que el juego necesita para funcionar offline.
const ASSETS = [
  './',
  './assets/fonts/lilita-one-latin-400-normal.woff2',
  './assets/fonts/nunito-latin-600-normal.woff2',
  './assets/fonts/nunito-latin-800-normal.woff2',
  './assets/fonts/nunito-latin-900-normal.woff2',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './css/base.css',
  './css/components.css',
  './css/game.css',
  './css/responsive.css',
  './css/screens.css',
  './css/tokens.css',
  './index.html',
  './js/app/App.js',
  './js/app/Pwa.js',
  './js/app/Session.js',
  './js/app/Share.js',
  './js/config.js',
  './js/core/EventBus.js',
  './js/core/Format.js',
  './js/core/I18n.js',
  './js/core/Loop.js',
  './js/core/Random.js',
  './js/core/Storage.js',
  './js/engine/Backdrop.js',
  './js/engine/Camera.js',
  './js/engine/Particles.js',
  './js/engine/Physics.js',
  './js/engine/Renderer.js',
  './js/engine/TileMap.js',
  './js/entities/Mover.js',
  './js/entities/Player.js',
  './js/entities/Skins.js',
  './js/game/Achievements.js',
  './js/game/Daily.js',
  './js/game/Game.js',
  './js/game/Progress.js',
  './js/i18n/en.js',
  './js/i18n/es.js',
  './js/levels/campaign.js',
  './js/levels/caves.js',
  './js/levels/foundry.js',
  './js/levels/glacier.js',
  './js/levels/generator.js',
  './js/levels/tiles.js',
  './js/levels/worlds.js',
  './js/main.js',
  './js/systems/Audio.js',
  './js/systems/Haptics.js',
  './js/systems/Input.js',
  './js/ui/Dialog.js',
  './js/ui/Hud.js',
  './js/ui/Mascot.js',
  './js/ui/ScreenManager.js',
  './js/ui/Toast.js',
  './js/ui/TouchControls.js',
  './js/ui/views/AchievementsView.js',
  './js/ui/views/MenuView.js',
  './js/ui/views/ResultView.js',
  './js/ui/views/SettingsView.js',
  './js/ui/views/ShopView.js',
  './js/ui/views/StatsView.js',
  './js/ui/views/TutorialView.js',
  './js/ui/views/WorldsView.js',
  './manifest.webmanifest',
];

// Yo precargo los archivos al instalar.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Yo borro cachés viejos al activar una versión nueva.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Yo respondo desde caché y actualizo en segundo plano (stale-while-revalidate).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Yo solo manejo peticiones GET de mi propio origen.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
