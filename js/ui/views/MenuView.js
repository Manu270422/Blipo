// Yo actualizo los datos vivos del menú principal: saldo, continuar, reto diario, racha y récords.
import { t } from '../../core/I18n.js';
import { formatNumber } from '../../core/Format.js';
import { WORLDS } from '../../levels/worlds.js';
import { dailyNumber, msToNextDaily } from '../../game/Daily.js';
import { missionText } from '../../game/Missions.js';

export class MenuView {
  // Yo guardo las dependencias y los nodos.
  constructor({ root, storage, progress, missions }) {
    this.root = root;
    this.storage = storage;
    this.progress = progress;
    this.missions = missions;
    this.q = (sel) => root.querySelector(`[data-screen="menu"] ${sel}`);
  }

  // Yo pinto todos los datos.
  render() {
    const d = this.storage.data;
    // Yo actualizo todos los monederos de la app.
    this.root.querySelectorAll('[data-bind="sparks"]').forEach((el) => { el.textContent = formatNumber(d.wallet.sparks); });
    // Yo muestro dónde continúa la campaña.
    const { world, level } = d.last;
    this.q('[data-bind="continue-label"]').textContent = `${t(WORLDS[world].key)} · ${level + 1}`;
    // Yo muestro el estado del reto diario.
    const done = this.progress.dailyDone();
    const hrs = Math.ceil(msToNextDaily() / 3600000);
    this.q('[data-bind="daily-sub"]').textContent = done ? t('daily_done', { h: hrs }) : t('daily_sub', { n: dailyNumber() });
    this.q('.mode-card--daily').classList.toggle('is-done', done);
    // Yo muestro la racha (apagada si está en cero).
    const streak = this.progress.currentStreak();
    this.q('[data-bind="streak"]').textContent = streak;
    this.q('[data-bind="streak-badge"]').classList.toggle('is-cold', streak === 0 || !done);
    // Yo muestro el récord de supervivencia.
    this.q('[data-bind="survival-sub"]').textContent = t('survival_sub', { n: d.survival.best });
    // Yo marco logros nuevos sin ver.
    this.q('[data-bind="ach-dot"]').hidden = !this.storage.data._newAch;
    this.renderMissions();
  }

  // Yo pinto las tres misiones del día con su barra de progreso y premio.
  renderMissions() {
    const today = this.missions.today();
    const done = today.list.filter((m) => m.done).length;
    const hrs = Math.ceil(msToNextDaily() / 3600000);
    this.q('[data-bind="missions-sub"]').textContent = done === today.list.length ? t('missions_all_done', { h: hrs }) : t('missions_progress', { n: done, max: today.list.length });
    this.q('[data-list="missions"]').innerHTML = today.list.map((m) => `
      <li class="mission ${m.done ? 'is-done' : ''}">
        <span class="mission__check"><svg class="icon"><use href="#i-check"/></svg></span>
        <span class="mission__body">
          <span class="mission__text">${missionText(t, m)} <small>${m.progress}/${m.goal}</small></span>
          <span class="mission__bar"><i style="width:${Math.round((m.progress / m.goal) * 100)}%"></i></span>
        </span>
        <span class="mission__reward"><svg class="icon"><use href="#i-spark"/></svg>${m.reward}</span>
      </li>`).join('');
  }
}
