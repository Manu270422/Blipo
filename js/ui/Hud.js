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
    this.deathsWrap = this.deaths.closest('.hud__stat');
    this.bannerEl = root.querySelector('[data-bind="level-banner"]');
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
    // Yo quito el cartel del nivel anterior.
    clearTimeout(this.bannerTimer);
    this.bannerEl.hidden = true;
    this.bannerEl.classList.remove('is-shown', 'is-leaving');
    this.timerWrap.classList.remove('pace-gold', 'pace-silver', 'pace-bronze', 'pace-none');
  }

  // Yo presento el nivel con un cartel que entra, se queda un momento y se va (no bloquea el juego).
  banner({ top, title, goal }) {
    const el = this.bannerEl;
    el.querySelector('[data-bind="banner-top"]').textContent = top;
    el.querySelector('[data-bind="banner-title"]').textContent = title;
    el.querySelector('[data-bind="banner-goal"]').textContent = goal || '';
    el.hidden = false;
    el.classList.remove('is-shown', 'is-leaving');
    void el.offsetWidth;
    el.classList.add('is-shown');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { el.hidden = true; el.classList.remove('is-shown'); }, 2200);
  }

  // Yo repito una animación corta de la interfaz quitando y poniendo su clase.
  pulse(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // Yo muestro u oculto el cronómetro.
  showTimer(on) { this.timerWrap.hidden = !on; }

  // Yo sincronizo con el estado del juego.
  update(game) {
    if (!game.map) return;
    // Yo retiro el cartel en cuanto el jugador empieza a moverse, para no tapar el camino.
    if (game.moved && !this.bannerEl.hidden && !this.bannerEl.classList.contains('is-leaving')) this.bannerEl.classList.add('is-leaving');
    const time = formatTime(game.time);
    if (time !== this.cache.time) { this.time.textContent = time; this.cache.time = time; }
    // Yo coloreo el cronómetro según la medalla que va logrando (oro, plata, bronce o ninguna).
    if (game.medals) {
      const m = game.medals, tm = game.time;
      const pace = tm <= m.gold ? 'gold' : tm <= m.silver ? 'silver' : tm <= m.bronze ? 'bronze' : 'none';
      if (pace !== this.cache.pace) {
        // Yo destello el cronómetro cuando se pierde una medalla (no al empezar).
        if (this.cache.pace) this.pulse(this.timerWrap, 'is-flash');
        this.timerWrap.classList.remove(`pace-${this.cache.pace}`); this.timerWrap.classList.add(`pace-${pace}`); this.cache.pace = pace;
      }
    } else if (this.cache.pace) { this.timerWrap.classList.remove(`pace-${this.cache.pace}`); this.cache.pace = null; }
    if (game.deaths !== this.cache.deaths) {
      // Yo hago rebotar la calavera con cada muerte.
      if (this.cache.deaths != null && game.deaths > this.cache.deaths) this.pulse(this.deathsWrap, 'is-bump');
      this.deaths.textContent = game.deaths; this.cache.deaths = game.deaths;
    }
    // Yo calculo la firma de gemas o vidas.
    const sig = this.mode === 'lives' ? `l${game.lives}` : game.map.gems.map((g) => (g.taken ? 1 : 0)).join('');
    if (sig !== this.cache.sig) {
      this.cache.sigReady = this.cache.sig !== undefined;
      this.cache.sig = sig;
      this.icons.forEach((ic, i) => {
        const on = this.mode === 'lives' ? i < game.lives : !!game.map.gems[i]?.taken;
        // Yo hago saltar el ícono de la gema recién recogida.
        if (on && !ic.classList.contains('on') && this.cache.sigReady) this.pulse(ic, 'is-pop');
        ic.classList.toggle('on', on);
      });
    }
  }

  // Yo devuelvo la altura ocupada por el HUD para que la cámara no dibuje debajo.
  height() { return this.el.getBoundingClientRect().bottom + 6; }
}
