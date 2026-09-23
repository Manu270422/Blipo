// Yo controlo qué pantalla y qué overlay están visibles, el botón "atrás" y la navegación con mando.
import { bus } from '../core/EventBus.js';

// Yo defino qué elementos se pueden enfocar al navegar con mando.
const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), select, input, [tabindex="0"]';

export class ScreenManager {
  // Yo busco las pantallas y overlays del documento.
  constructor(root) {
    this.root = root;
    this.screens = new Map([...root.querySelectorAll('[data-screen]')].map((el) => [el.dataset.screen, el]));
    this.overlays = new Map([...root.querySelectorAll('[data-overlay]')].map((el) => [el.dataset.overlay, el]));
    this.current = 'splash';
    this.stack = [];
    this.openStack = [];
    this.bindNav();
    this.bindHistory();
  }

  // Yo muestro una pantalla y guardo la anterior para volver.
  show(name, { remember = true } = {}) {
    if (!this.screens.has(name) || name === this.current) return;
    if (remember && this.current !== 'splash' && this.current !== 'game') this.stack.push(this.current);
    this.screens.get(this.current)?.classList.remove('is-active');
    this.screens.get(name).classList.add('is-active');
    this.current = name;
    // Yo marco la app cuando está en juego para mostrar el canvas.
    this.root.classList.toggle('in-game', name === 'game');
    bus.emit('screen', name);
    this.focusFirst(this.screens.get(name));
  }

  // Yo vuelvo a la pantalla anterior o al menú.
  back() {
    const prev = this.stack.pop() || 'menu';
    this.show(prev, { remember: false });
  }

  // Yo limpio el historial (por ejemplo al salir de una partida).
  resetStack() { this.stack = []; }

  // Yo abro un overlay encima de la pantalla actual.
  open(name) {
    const el = this.overlays.get(name);
    if (!el || this.openStack.includes(name)) return;
    el.classList.add('is-open');
    this.openStack.push(name);
    this.focusFirst(el);
  }

  // Yo cierro un overlay.
  close(name) {
    const el = this.overlays.get(name);
    if (!el) return;
    el.classList.remove('is-open');
    this.openStack = this.openStack.filter((n) => n !== name);
    const top = this.topOverlay();
    this.focusFirst(top ? this.overlays.get(top) : this.screens.get(this.current));
  }

  // Yo digo cuál overlay está arriba.
  topOverlay() { return this.openStack[this.openStack.length - 1] || null; }

  // Yo enfoco el primer control útil (solo si el jugador usa teclado o mando, para no mostrar aros al tocar).
  focusFirst(container) {
    if (!container || !this.keyboardMode) return;
    requestAnimationFrame(() => container.querySelector(FOCUSABLE)?.focus({ preventScroll: false }));
  }

  // Yo conecto la navegación espacial con mando y teclado.
  bindNav() {
    // Yo detecto si el jugador usa teclado/mando o toque.
    window.addEventListener('keydown', () => { this.keyboardMode = true; });
    window.addEventListener('pointerdown', () => { this.keyboardMode = false; });
    bus.on('nav:move', (dir) => { this.keyboardMode = true; this.moveFocus(dir); });
    bus.on('nav:ok', () => { const el = document.activeElement; if (el && el !== document.body) el.click(); else this.focusFirst(this.activeContainer()); });
  }

  // Yo devuelvo el contenedor interactivo visible.
  activeContainer() {
    const top = this.topOverlay();
    return top ? this.overlays.get(top) : this.screens.get(this.current);
  }

  // Yo muevo el foco al elemento más cercano en la dirección pedida.
  moveFocus(dir) {
    const container = this.activeContainer();
    const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const cur = document.activeElement;
    if (!items.includes(cur)) { items[0].focus(); return; }
    const a = cur.getBoundingClientRect();
    const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
    let best = null; let bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const dx = b.left + b.width / 2 - ac.x;
      const dy = b.top + b.height / 2 - ac.y;
      // Yo descarto candidatos en la dirección contraria.
      const ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4;
      if (!ok) continue;
      // Yo penalizo la desviación lateral para que el movimiento se sienta natural.
      const main = dir === 'up' || dir === 'down' ? Math.abs(dy) : Math.abs(dx);
      const side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
      const score = main + side * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    best?.focus();
    best?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // Yo capturo el botón "atrás" de Android (en PWA/TWA llega como popstate).
  bindHistory() {
    history.replaceState({ blipo: 'root' }, '');
    history.pushState({ blipo: 'app' }, '');
    window.addEventListener('popstate', () => {
      // Yo dejo salir de la app solo desde el menú principal sin overlays.
      if (this.current === 'menu' && !this.topOverlay()) { history.back(); return; }
      history.pushState({ blipo: 'app' }, '');
      bus.emit('nav:back');
    });
  }
}
