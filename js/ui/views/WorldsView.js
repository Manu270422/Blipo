// Yo pinto las pestañas de mundos y el mapa de cada mundo: un camino que une los niveles hasta el jefe.
import { t } from '../../core/I18n.js';
import { WORLDS } from '../../levels/worlds.js';

// Yo genero el HTML de 3 estrellas.
export const starsHtml = (n) => `<span class="stars">${[0, 1, 2].map((i) => `<svg class="icon ${i < n ? 'on' : ''}"><use href="#i-star"/></svg>`).join('')}</span>`;

// Yo nombro las medallas para las clases CSS.
const MEDAL_CLASS = ['', 'bronze', 'silver', 'gold'];

// Yo dibujo a Blipo en miniatura para marcar el siguiente nivel en el mapa.
const BLIPO_SVG = `<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M20 2C28 12 36 20 36 29a16 16 0 0 1-32 0C4 20 12 12 20 2z" fill="#23CFC0"/><path d="M20 2C28 12 36 20 36 29a16 16 0 0 1-2 7.8C30 26 24 16 20 2z" fill="#169C95"/><circle cx="20" cy="28" r="8.5" fill="#fff"/><circle cx="21.5" cy="28.5" r="4.5" fill="#10131F"/><circle cx="23" cy="26.5" r="1.4" fill="#fff"/></svg>`;

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
    // Yo vuelvo a trazar el camino si cambia el ancho (más o menos columnas).
    window.addEventListener('resize', () => { if (this.root.classList.contains('is-active')) this.render(); });
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
    let golds = 0;
    for (let l = 0; l < world.count; l++) if ((p.record(this.world, l)?.medal || 0) >= 3) golds++;
    this.head.innerHTML = `<h3>${t(world.key)}</h3><p>${t('world_stars', { n: p.worldStars(this.world), max: world.count * 3 })} · <span class="gold-count"><svg class="icon"><use href="#i-medal"/></svg>${golds}/${world.count}</span></p>`;
    // Yo muestro el candado si el mundo sigue cerrado.
    if (!p.isWorldUnlocked(this.world)) {
      this.grid.className = 'level-grid';
      this.grid.innerHTML = `<div class="world-lock"><svg class="icon"><use href="#i-lock"/></svg><strong>${t('world_locked', { n: world.unlock })}</strong><span>${t('world_locked_have', { n: p.totalStars() })}</span></div>`;
      return;
    }
    this.renderMap(world, color);
  }

  // Yo dibujo el mapa: los niveles en zigzag unidos por un camino que se ilumina al avanzar.
  renderMap(world, color) {
    const p = this.progress;
    const n = world.count;
    const cols = this.grid.clientWidth && this.grid.clientWidth < 520 ? 4 : 5;
    const rows = Math.ceil(n / cols);
    // Yo calculo el centro de cada nodo en unidades del mapa (100 por celda).
    const pos = Array.from({ length: n }, (_, i) => {
      const r = Math.floor(i / cols), c = r % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      return { x: c * 100 + 50, y: r * 100 + 50, r };
    });
    // Yo trazo cada tramo: recto dentro de la fila y en curva al bajar a la siguiente.
    const segs = [];
    for (let i = 0; i < n - 1; i++) {
      const a = pos[i], b = pos[i + 1];
      const d = a.r === b.r
        ? `M${a.x} ${a.y}L${b.x} ${b.y}`
        : `M${a.x} ${a.y}C${a.x + (a.x > 50 ? 70 : -70)} ${a.y} ${b.x + (b.x > 50 ? 70 : -70)} ${b.y} ${b.x} ${b.y}`;
      segs.push(`<path d="${d}" class="${p.record(this.world, i)?.cleared ? 'is-done' : ''}"/>`);
    }
    // Yo busco el siguiente nivel pendiente para pararme ahí.
    let next = -1;
    for (let l = 0; l < n; l++) if (p.isLevelUnlocked(this.world, l) && !p.record(this.world, l)?.cleared) { next = l; break; }
    const nodes = pos.map((c, l) => {
      const rec = p.record(this.world, l);
      const unlocked = p.isLevelUnlocked(this.world, l);
      const boss = !!world.levels?.[l]?.boss;
      const style = `left:${(c.x / (cols * 100)) * 100}%;top:${(c.y / (rows * 100)) * 100}%;--c:${color}`;
      const name = boss ? t('boss_level') : t('level_n', { n: l + 1 });
      if (!unlocked) {
        return `<button class="map-node level-cell is-locked ${boss ? 'is-boss' : ''}" type="button" data-level="${l}" style="${style}" aria-label="${name} ${t('locked')}"><svg class="icon"><use href="#${boss ? 'i-skull' : 'i-lock'}"/></svg></button>`;
      }
      const label = boss ? '<b><svg class="icon"><use href="#i-skull"/></svg></b>' : `<b>${l + 1}</b>`;
      const medal = rec?.medal ? `<i class="node-medal medal--${MEDAL_CLASS[rec.medal]}" title="${t(`medal_${rec.medal}`)}"><svg class="icon"><use href="#i-medal"/></svg></i>` : '';
      return `<button class="map-node level-cell ${l === next ? 'is-next' : ''} ${boss ? 'is-boss' : ''}" type="button" data-level="${l}" style="${style}" aria-label="${name}">${label}${starsHtml(rec?.stars || 0)}${medal}</button>`;
    }).join('');
    // Yo paro a Blipo sobre el siguiente nivel (o sobre el jefe si ya completó todo).
    const at = pos[next >= 0 ? next : n - 1];
    const blipo = `<span class="map-blipo" style="left:${(at.x / (cols * 100)) * 100}%;top:${(at.y / (rows * 100)) * 100}%">${BLIPO_SVG}</span>`;
    this.grid.className = 'world-map';
    this.grid.style.aspectRatio = `${cols} / ${rows * 0.95}`;
    this.grid.innerHTML = `<svg class="world-map__path" viewBox="0 0 ${cols * 100} ${rows * 100}" preserveAspectRatio="none" aria-hidden="true">${segs.join('')}</svg>${nodes}${blipo}`;
  }
}
