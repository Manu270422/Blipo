// Yo manejo los botones táctiles con Pointer Events (multitoque real: moverse y saltar a la vez).
export class TouchControls {
  // Yo recibo el contenedor y el sistema de entrada.
  constructor(root, input, haptics) {
    this.el = root.querySelector('[data-touch]');
    this.input = input;
    this.haptics = haptics;
    this.buttons = [...this.el.querySelectorAll('[data-touch-action]')];
    // Yo recuerdo qué dedo presiona cada botón.
    this.pointers = new Map();
    this.bind();
  }

  // Yo registro los eventos de cada botón.
  bind() {
    for (const btn of this.buttons) {
      const action = btn.dataset.touchAction;
      // Yo presiono al tocar y capturo el dedo para no perder el "soltar".
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        this.pointers.set(e.pointerId, action);
        this.set(action, true);
      });
      // Yo suelto en cualquier forma de fin del toque.
      const up = (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.delete(e.pointerId);
        // Yo solo suelto si ningún otro dedo mantiene la misma acción.
        if (![...this.pointers.values()].includes(action)) this.set(action, false);
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      // Yo bloqueo el menú contextual del toque largo.
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  // Yo aplico el estado visual y lógico.
  set(action, pressed) {
    this.input.setTouch(action, pressed);
    this.buttons.filter((b) => b.dataset.touchAction === action).forEach((b) => b.classList.toggle('is-down', pressed));
    if (pressed && action === 'jump') this.haptics.pulse(8);
  }

  // Yo aplico preferencias: visibilidad, lado, tamaño y opacidad.
  configure(settings) {
    const coarse = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const visible = settings.touch === 'on' || (settings.touch === 'auto' && coarse);
    this.visible = visible;
    this.el.classList.toggle('is-hidden', !visible);
    this.el.classList.toggle('is-swapped', !!settings.touchSwap);
    document.documentElement.style.setProperty('--touch-scale', settings.touchSize);
    document.documentElement.style.setProperty('--touch-opacity', settings.touchOpacity);
  }

  // Yo suelto todo (al pausar o salir).
  release() {
    this.pointers.clear();
    for (const a of ['left', 'right', 'jump']) this.set(a, false);
  }

  // Yo devuelvo la altura ocupada en pantalla (para reservar espacio en vertical).
  height() { return this.visible ? this.el.getBoundingClientRect().height : 0; }
}
