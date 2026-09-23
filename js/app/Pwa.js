// Yo manejo lo que convierte a BLIPO en app instalable: service worker e instalación.

// Yo registro el service worker para jugar sin conexión.
export function registerServiceWorker() {
  // Yo reviso que el navegador lo soporte y que esté servido por http(s).
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  // Yo lo evito en localhost para que el caché no estorbe mientras desarrollo en VS Code.
  const dev = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
  if (dev) return;
  // Yo registro después de cargar para no competir con el arranque.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('[sw] registro fallido', err));
  });
}

// Yo controlo el botón "Instalar app" usando el aviso nativo del navegador.
export class InstallPrompt {
  // Yo recibo el botón que muestro u oculto.
  constructor(button) {
    this.button = button;
    this.deferred = null;
    // Yo no muestro el botón si ya está instalada (modo standalone o dentro de Capacitor).
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone || window.Capacitor;
    if (standalone || !button) return;
    // Yo guardo el evento para lanzarlo cuando el jugador quiera.
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e;
      this.button.hidden = false;
    });
    // Yo escondo el botón al terminar la instalación.
    window.addEventListener('appinstalled', () => { this.button.hidden = true; this.deferred = null; });
  }

  // Yo muestro el aviso de instalación.
  async prompt() {
    if (!this.deferred) return;
    this.deferred.prompt();
    await this.deferred.userChoice.catch(() => null);
    this.deferred = null;
    this.button.hidden = true;
  }
}
