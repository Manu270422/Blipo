// Yo unifico teclado, gamepad y controles táctiles en un solo estado de acciones.
import { bus } from '../core/EventBus.js';

// Yo mapeo teclas físicas a acciones (uso "code" para que funcione en cualquier distribución).
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
};

export class Input {
  // Yo preparo los estados de cada fuente de entrada.
  constructor() {
    // Yo guardo las acciones activas por teclado.
    this.keys = { left: false, right: false, jump: false };
    // Yo guardo las acciones activas por controles táctiles.
    this.touch = { left: false, right: false, jump: false };
    // Yo guardo las acciones activas por gamepad.
    this.pad = { left: false, right: false, jump: false };
    // Yo marco un salto pendiente de consumir (entrada por flanco).
    this.jumpQueued = false;
    // Yo recuerdo el estado previo de botones del gamepad para detectar flancos.
    this.padPrev = {};
    // Yo recuerdo el eje previo para navegar menús con el stick.
    this.navPrev = 0;
    // Yo indico en qué contexto estoy: 'game' o 'menu'.
    this.context = 'menu';
    // Yo escucho el teclado.
    this.bindKeyboard();
  }

  // Yo registro los eventos de teclado.
  bindKeyboard() {
    // Yo proceso las teclas presionadas.
    window.addEventListener('keydown', (e) => {
      // Yo busco la acción de la tecla.
      const action = KEYMAP[e.code];
      // Yo gestiono las teclas de sistema solo dentro del juego.
      if (this.context === 'game') {
        // Yo pauso con Escape o P.
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { bus.emit('input:pause'); e.preventDefault(); return; }
        // Yo reinicio el nivel con R.
        if (e.code === 'KeyR' && !e.repeat) { bus.emit('input:restart'); return; }
      } else if (e.code === 'Escape' && !e.repeat) {
        // Yo uso Escape como "atrás" en los menús.
        bus.emit('nav:back');
      }
      // Yo ignoro teclas sin acción.
      if (!action) return;
      // Yo evito que las flechas o el espacio hagan scroll durante el juego.
      if (this.context === 'game') e.preventDefault();
      // Yo encolo el salto solo en el primer toque, no en la repetición automática.
      if (action === 'jump' && !this.keys.jump && !e.repeat) this.jumpQueued = true;
      // Yo marco la acción como activa.
      this.keys[action] = true;
    });
    // Yo libero las teclas.
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.keys[action] = false;
    });
    // Yo limpio todo si la ventana pierde el foco para evitar teclas "pegadas".
    window.addEventListener('blur', () => this.clear());
  }

  // Yo recibo el estado de un botón táctil.
  setTouch(action, pressed) {
    // Yo encolo el salto al presionar.
    if (action === 'jump' && pressed && !this.touch.jump) this.jumpQueued = true;
    // Yo guardo el estado.
    this.touch[action] = pressed;
  }

  // Yo limpio todos los estados.
  clear() {
    for (const src of [this.keys, this.touch, this.pad]) { src.left = src.right = src.jump = false; }
    this.jumpQueued = false;
  }

  // Yo leo el gamepad una vez por frame.
  poll() {
    // Yo obtengo los gamepads conectados de forma segura.
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    // Yo tomo el primer gamepad válido.
    const gp = Array.from(pads || []).find(Boolean);
    // Yo limpio el estado si no hay gamepad.
    if (!gp) { this.pad.left = this.pad.right = this.pad.jump = false; return; }
    // Yo leo un botón de forma segura.
    const btn = (i) => !!gp.buttons[i]?.pressed;
    // Yo leo el eje horizontal con zona muerta.
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    // Yo detecto flancos de subida.
    const edge = (i) => { const now = btn(i); const was = this.padPrev[i]; this.padPrev[i] = now; return now && !was; };
    // Yo calculo las direcciones.
    const left = ax < -0.4 || btn(14);
    const right = ax > 0.4 || btn(15);
    const up = ay < -0.5 || btn(12);
    const down = ay > 0.5 || btn(13);
    // Yo leo los botones de salto (A, X, Y).
    const jump = btn(0) || btn(2) || btn(3);

    if (this.context === 'game') {
      // Yo encolo el salto en el flanco.
      if (jump && !this.pad.jump) this.jumpQueued = true;
      // Yo actualizo el estado del gamepad.
      this.pad.left = left; this.pad.right = right; this.pad.jump = jump;
      // Yo pauso con Start y reinicio con Select.
      if (edge(9)) bus.emit('input:pause');
      if (edge(8)) bus.emit('input:restart');
      // Yo consumo los flancos de los botones de menú para no arrastrarlos.
      edge(0); edge(1);
    } else {
      // Yo navego los menús con el stick o la cruceta.
      const dir = up ? 'up' : down ? 'down' : left ? 'left' : right ? 'right' : null;
      // Yo emito la dirección solo cuando cambia.
      if (dir && dir !== this.navPrev) bus.emit('nav:move', dir);
      this.navPrev = dir;
      // Yo confirmo con A y vuelvo con B.
      if (edge(0)) bus.emit('nav:ok');
      if (edge(1)) bus.emit('nav:back');
      if (edge(9)) bus.emit('nav:ok');
      // Yo limpio el estado de juego del gamepad.
      this.pad.left = this.pad.right = this.pad.jump = false;
    }
  }

  // Yo expongo las acciones combinadas.
  get left() { return this.keys.left || this.touch.left || this.pad.left; }
  get right() { return this.keys.right || this.touch.right || this.pad.right; }
  get jump() { return this.keys.jump || this.touch.jump || this.pad.jump; }

  // Yo entrego y limpio el salto encolado.
  consumeJump() {
    const q = this.jumpQueued;
    this.jumpQueued = false;
    return q;
  }
}
