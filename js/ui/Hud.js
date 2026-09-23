// Yo actualizo el HUD solo cuando cambian los valores (evito tocar el DOM cada frame).
import { formatTime } from '../core/Format.js';

export class Hud {
  // Yo busco los nodos del HUD.
  constructor(root) {
    this.el = root.querySelector('[data-hud]');
    this.level = root.querySelector('[data-bind="hud-level"]');
    this.center = root.querySelector('[data-bind="hud-center"]');
    this.deaths = root.querySelector('[data-bind="hud-deaths"]');
    this.time = root.querySelector('[data-bind="hud-time"]');
    this.timerWrap = root.querySelector('[data-bind="hud-timer-wrap"]');
    this.cache = {};
  }

  // Yo preparo el HUD para una partida (gemas o vidas).
  setup({ label, mode, slots }) {
    this.level.textContent = label;
    this.mode = mode;
    const icon = mode === 'lives' ? 'i-heart' : 'i-gem';
    this.center.innerHTML = Array.from({ length: slots }, () => `<svg class="icon ${mode === 'lives' ? 'heart' : ''}"><use href="#${icon}"/></svg>`).join('');
    this.icons = [...this.center.children];
    this.cache = {};
  }

  // Yo muestro u oculto el cronómetro.
  showTimer(on) { this.timerWrap.hidden = !on; }

  // Yo sincronizo con el estado del juego.
  update(game) {
    if (!game.map) return;
    const time = formatTime(game.time);
    if (time !== this.cache.time) { this.time.textContent = time; this.cache.time = time; }
    if (game.deaths !== this.cache.deaths) { this.deaths.textContent = game.deaths; this.cache.deaths = game.deaths; }
    // Yo calculo la firma de gemas o vidas.
    const sig = this.mode === 'lives' ? `l${game.lives}` : game.map.gems.map((g) => (g.taken ? 1 : 0)).join('');
    if (sig !== this.cache.sig) {
      this.cache.sig = sig;
      this.icons.forEach((ic, i) => {
        const on = this.mode === 'lives' ? i < game.lives : !!game.map.gems[i]?.taken;
        ic.classList.toggle('on', on);
      });
    }
  }

  // Yo devuelvo la altura ocupada por el HUD para que la cámara no dibuje debajo.
  height() { return this.el.getBoundingClientRect().bottom + 6; }
}
