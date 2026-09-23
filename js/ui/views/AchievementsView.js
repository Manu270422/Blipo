// Yo pinto la lista de logros con progreso.
import { t } from '../../core/I18n.js';
import { ACHIEVEMENTS, ACHIEVEMENT_REWARD } from '../../game/Achievements.js';

export class AchievementsView {
  // Yo recibo dependencias.
  constructor({ root, storage, progress }) {
    this.root = root.querySelector('[data-screen="achievements"]');
    this.storage = storage;
    this.progress = progress;
    this.list = this.root.querySelector('[data-list="achievements"]');
  }

  // Yo pinto los logros, primero los desbloqueados más recientes.
  render() {
    const d = this.storage.data;
    // Yo marco los logros como vistos.
    d._newAch = false;
    const done = ACHIEVEMENTS.filter((a) => d.achievements[a.id]).length;
    this.root.querySelector('[data-bind="ach-count"]').textContent = `${done}/${ACHIEVEMENTS.length}`;
    const items = ACHIEVEMENTS.map((a) => ({ a, v: Math.min(a.goal, a.value(d, this.progress)), at: d.achievements[a.id] || 0 }))
      .sort((x, y) => (y.at ? 1 : 0) - (x.at ? 1 : 0) || y.v / y.a.goal - x.v / x.a.goal);
    this.list.innerHTML = items.map(({ a, v, at }) => `
      <li class="ach ${at ? 'is-done' : ''}">
        <span class="ach__icon"><svg class="icon"><use href="#${at ? 'i-trophy' : 'i-lock'}"/></svg></span>
        <div>
          <h4>${t(`ach_${a.id}`)}</h4>
          <p>${t(`ach_${a.id}_d`, { n: a.goal })}</p>
          ${at ? '' : `<div class="ach__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${a.goal}" aria-valuenow="${v}"><i style="width:${(v / a.goal) * 100}%"></i></div>`}
        </div>
        <span class="ach__reward">${at ? '✓' : `+${ACHIEVEMENT_REWARD}`}</span>
      </li>`).join('');
  }
}
