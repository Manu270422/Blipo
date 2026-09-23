// Yo pinto las estadísticas globales del jugador.
import { t } from '../../core/I18n.js';
import { formatNumber, formatDuration } from '../../core/Format.js';
import { TOTAL_LEVELS } from '../../levels/worlds.js';

export class StatsView {
  // Yo recibo dependencias.
  constructor({ root, storage, progress }) {
    this.list = root.querySelector('[data-screen="stats"] [data-list="stats"]');
    this.storage = storage;
    this.progress = progress;
  }

  // Yo pinto cada tarjeta de estadística.
  render() {
    const d = this.storage.data;
    const s = d.stats;
    const cleared = Object.values(d.progress.levels).filter((r) => r.cleared).length;
    const rows = [
      ['st_play_time', formatDuration(s.playTime)],
      ['st_levels', `${cleared}/${TOTAL_LEVELS}`],
      ['st_stars', `${this.progress.totalStars()}/${TOTAL_LEVELS * 3}`],
      ['st_gems', `${this.progress.totalGems()}/${TOTAL_LEVELS * 3}`],
      ['st_deaths', formatNumber(s.deaths)],
      ['st_jumps', formatNumber(s.jumps)],
      ['st_double', formatNumber(s.doubleJumps)],
      ['st_wall', formatNumber(s.wallJumps)],
      ['st_flawless', formatNumber(s.flawless)],
      ['st_streak', formatNumber(d.daily.bestStreak)],
      ['st_survival', formatNumber(d.survival.best)],
      ['st_portals', formatNumber(s.portals)],
    ];
    this.list.innerHTML = rows.map(([k, v]) => `<div class="stat"><dt>${t(k)}</dt><dd>${v}</dd></div>`).join('');
  }
}
