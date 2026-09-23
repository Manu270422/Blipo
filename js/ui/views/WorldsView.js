// Yo pinto las pestañas de mundos y la grilla de niveles con estrellas y bloqueos.
import { t } from '../../core/I18n.js';
import { WORLDS } from '../../levels/worlds.js';

// Yo genero el HTML de 3 estrellas.
export const starsHtml = (n) => `<span class="stars">${[0, 1, 2].map((i) => `<svg class="icon ${i < n ? 'on' : ''}"><use href="#i-star"/></svg>`).join('')}</span>`;

export class WorldsView {
  // Yo recibo dependencias y el callback para jugar un nivel.
  constructor({ root, progress, onPlay, audio }) {
    this.root = root.querySelector('[data-screen="worlds"]');
    this.progress = progress;
    this.onPlay = onPlay;
    this.audio = audio;
    this.world = 0;
    this.tabs = this.root.querySelector('[data-list="world-tabs"]');
    this.grid = this.root.querySelector('[data-list="levels"]');
    this.head = this.root.querySelector('[data-bind="world-head"]');
    // Yo delego clics para no registrar un oyente por celda.
    this.tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-world]');
      if (!tab) return;
      this.audio.sfx('click');
      this.world = Number(tab.dataset.world);
      this.render();
    });
    this.grid.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-level]');
      if (!cell) return;
      if (cell.classList.contains('is-locked')) { this.audio.sfx('error'); return; }
      this.onPlay(this.world, Number(cell.dataset.level));
    });
  }

  // Yo abro la vista en el mundo del último nivel jugado.
  focusWorld(w) { this.world = w; }

  // Yo pinto la vista completa.
  render() {
    const p = this.progress;
    this.root.querySelector('[data-bind="stars-total"]').textContent = p.totalStars();
    // Yo pinto las pestañas.
    this.tabs.innerHTML = WORLDS.map((w) => {
      const locked = !p.isWorldUnlocked(w.id);
      return `<button class="world-tab ${locked ? 'is-locked' : ''}" role="tab" type="button" data-world="${w.id}" aria-selected="${w.id === this.world}" style="--c:hsl(${w.hue}deg 60% 62%)"><i></i>${t(w.key)}</button>`;
    }).join('');
    const world = WORLDS[this.world];
    const color = `hsl(${world.hue}deg 60% 62%)`;
    this.root.style.setProperty('--c', color);
    this.head.innerHTML = `<h3>${t(world.key)}</h3><p>${t('world_stars', { n: p.worldStars(this.world), max: world.count * 3 })}</p>`;
    // Yo muestro el candado si el mundo sigue cerrado.
    if (!p.isWorldUnlocked(this.world)) {
      this.grid.style.display = 'block';
      this.grid.innerHTML = `<div class="world-lock"><svg class="icon"><use href="#i-lock"/></svg><strong>${t('world_locked', { n: world.unlock })}</strong><span>${t('world_locked_have', { n: p.totalStars() })}</span></div>`;
      return;
    }
    this.grid.style.display = '';
    // Yo marco el siguiente nivel pendiente para guiar al jugador.
    let nextMarked = false;
    this.grid.innerHTML = Array.from({ length: world.count }, (_, l) => {
      const rec = p.record(this.world, l);
      const unlocked = p.isLevelUnlocked(this.world, l);
      const isNext = unlocked && !rec?.cleared && !nextMarked;
      if (isNext) nextMarked = true;
      if (!unlocked) return `<button class="level-cell is-locked" type="button" data-level="${l}" aria-label="${t('level_n', { n: l + 1 })} ${t('locked')}"><svg class="icon"><use href="#i-lock"/></svg></button>`;
      return `<button class="level-cell ${isNext ? 'is-next' : ''}" type="button" data-level="${l}" style="--c:${color}" aria-label="${t('level_n', { n: l + 1 })}"><b>${l + 1}</b>${starsHtml(rec?.stars || 0)}</button>`;
    }).join('');
  }
}
