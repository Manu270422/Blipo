// Yo controlo qué pantalla y qué overlay están visibles, el botón "atrás" y la navegación con mando.
import { bus } from '../core/EventBus.js';

// Yo defino los controles que pueden participar en la navegación.
const FOCUSABLE = 'button, select, input, textarea, a[href], [tabindex]';

export class ScreenManager {
  // Yo busco las pantallas y overlays del documento.
  constructor(root) {
    this.root = root;
    this.screens = new Map([...root.querySelectorAll('[data-screen]')].map((el) => [el.dataset.screen, el]));
    this.overlays = new Map([...root.querySelectorAll('[data-overlay]')].map((el) => [el.dataset.overlay, el]));
    this.current = 'splash';
    this.stack = [];
    this.openStack = [];
    this.overlayOpeners = new Map();
    this.keyboardMode = false;
    for (const overlay of this.overlays.values()) overlay.tabIndex = -1;
    this.syncInteraction();
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
    this.syncInteraction();
    bus.emit('screen', name);
    if (this.keyboardMode && !this.topOverlay()) this.queueFocus(this.activeContainer());
  }

  // Yo vuelvo a la pantalla anterior o al menú.
  back() {
    const prev = this.stack.pop() || 'menu';
    this.show(prev, { remember: false });
  }

  // Yo limpio el historial (por ejemplo al salir de una partida).
  resetStack() { this.stack = []; }

  // Yo abro un overlay encima de la pantalla actual.
  open(name, { initialFocus = null } = {}) {
    const el = this.overlays.get(name);
    if (!el || this.openStack.includes(name)) return;
    this.overlayOpeners.set(name, document.activeElement);
    el.classList.add('is-open');
    this.openStack.push(name);
    this.syncInteraction();
    this.queueFocus(el, initialFocus);
  }

  // Yo cierro un overlay.
  close(name) {
    const el = this.overlays.get(name);
    if (!el || !this.openStack.includes(name)) return;
    const wasTop = name === this.topOverlay();
    const opener = this.overlayOpeners.get(name);
    this.overlayOpeners.delete(name);
    el.classList.remove('is-open');
    this.openStack = this.openStack.filter((n) => n !== name);
    this.syncInteraction();
    if (!wasTop) return;
    const container = this.activeContainer();
    if (container?.contains(opener) || this.topOverlay() || this.keyboardMode) {
      this.queueFocus(container, opener);
    }
  }

  // Yo digo cuál overlay está arriba.
  topOverlay() { return this.openStack[this.openStack.length - 1] || null; }

  // Yo desactivo la interacción fuera de la pantalla o el diálogo activo.
  syncInteraction() {
    const active = this.activeContainer();
    for (const screen of this.screens.values()) screen.inert = screen !== active;
    for (const overlay of this.overlays.values()) overlay.inert = overlay !== active;
  }

  focusableControls(container) {
    if (!container) return [];
    return [...container.querySelectorAll(FOCUSABLE)].filter((el) =>
      el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length &&
      getComputedStyle(el).visibility === 'visible' && !el.closest('[inert]'));
  }

  // Yo espero a que se muestre el destino y devuelvo el foco al control de origen si aún está disponible.
  queueFocus(container, preferred = null) {
    if (!container) return;
    cancelAnimationFrame(this.focusFrame);
    this.focusFrame = requestAnimationFrame(() => {
      if (container !== this.activeContainer()) return;
      const controls = this.focusableControls(container);
      const target = controls.includes(preferred) ? preferred : controls[0];
      (target || (this.topOverlay() ? container : null))?.focus();
    });
  }

  // Yo mantengo Tab y Shift+Tab dentro del diálogo.
  trapTab(event) {
    if (event.key !== 'Tab' || !this.topOverlay() || event.defaultPrevented) return;
    const container = this.activeContainer();
    const controls = this.focusableControls(container);
    const first = controls[0];
    const last = controls[controls.length - 1];
    const focused = document.activeElement;
    if (!controls.includes(focused) || focused === (event.shiftKey ? first : last)) {
      event.preventDefault();
      ((event.shiftKey ? last : first) || container).focus();
    }
  }

  // Yo conecto la navegación espacial con mando y teclado.
  bindNav() {
    // Yo detecto si el jugador usa teclado/mando o toque.
    window.addEventListener('keydown', (event) => {
      this.keyboardMode = true;
      this.trapTab(event);
    });
    window.addEventListener('pointerdown', () => { this.keyboardMode = false; });
    bus.on('nav:move', (dir) => { this.keyboardMode = true; this.moveFocus(dir); });
    bus.on('nav:ok', () => {
      this.keyboardMode = true;
      const container = this.activeContainer();
      const focused = document.activeElement;
      if (this.focusableControls(container).includes(focused)) focused.click();
      else this.queueFocus(container);
    });
  }

  // Yo devuelvo el contenedor interactivo visible.
  activeContainer() {
    const top = this.topOverlay();
    return top ? this.overlays.get(top) : this.screens.get(this.current);
  }

  // Yo muevo el foco al elemento más cercano en la dirección pedida.
  moveFocus(dir) {
    const items = this.focusableControls(this.activeContainer());
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
