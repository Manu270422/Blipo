// Yo pinto la pantalla de resultados de cada modo con sus acciones.
import { t } from '../../core/I18n.js';
import { formatTime } from '../../core/Format.js';

export class ResultView {
  // Yo recibo el administrador de pantallas y el audio.
  constructor({ root, screens, audio }) {
    this.el = root.querySelector('[data-overlay="result"]');
    this.screens = screens;
    this.audio = audio;
    this.title = this.el.querySelector('[data-bind="result-title"]');
    this.stars = this.el.querySelector('[data-bind="result-stars"]');
    this.stats = this.el.querySelector('[data-bind="result-stats"]');
    this.reward = this.el.querySelector('[data-bind="result-reward"]');
    this.actions = this.el.querySelector('[data-bind="result-actions"]');
    this.handlers = {};
    // Yo delego los clics de las acciones.
    this.actions.addEventListener('click', (e) => {
      const b = e.target.closest('[data-result]');
      if (b) this.handlers[b.dataset.result]?.();
    });
  }

  // Yo abro el overlay con la configuración dada.
  show({ title, stars = null, stats, rewards = [], actions }) {
    this.title.textContent = title;
    // Yo muestro estrellas solo si aplican al modo.
    this.stars.hidden = stars === null;
    if (stars !== null) this.stars.innerHTML = [0, 1, 2].map((i) => `<svg class="icon ${i < stars ? 'on' : ''}"><use href="#i-star"/></svg>`).join('');
    this.stats.innerHTML = stats.map((s) => `<div class="${s.good ? 'is-good' : ''}"><dt>${s.label}</dt><dd>${s.value}</dd></div>`).join('');
    this.reward.innerHTML = rewards.map((r) => `<span class="${r.record ? 'record' : ''}"><svg class="icon"><use href="#${r.icon || 'i-spark'}"/></svg>${r.text}</span>`).join('');
    this.handlers = {};
    this.actions.innerHTML = actions.map((a) => {
      this.handlers[a.id] = a.run;
      return `<button class="btn ${a.primary ? 'btn--gold' : a.ghost ? 'btn--ghost' : ''}" type="button" data-result="${a.id}" aria-label="${a.label}"><svg class="icon"><use href="#${a.icon}"/></svg>${a.text ? `<span>${a.label}</span>` : ''}</button>`;
    }).join('');
    this.screens.open('result');
    // Yo suena una estrella por cada estrella ganada, sincronizada con la animación.
    if (stars) for (let i = 0; i < stars; i++) setTimeout(() => this.audio.sfx('star'), 260 + i * 180);
  }

  // Yo cierro el overlay.
  hide() { this.screens.close('result'); }
}

// Yo armo las estadísticas típicas de un resultado.
export function resultStats({ time, deaths, par, gems }) {
  const out = [
    { label: t('time'), value: formatTime(time), good: par != null && time <= par },
    { label: t('deaths'), value: String(deaths), good: deaths <= 3 },
  ];
  if (gems) out.push({ label: t('gems'), value: `${gems.filter(Boolean).length}/3`, good: gems.every(Boolean) });
  else if (par != null) out.push({ label: t('par'), value: formatTime(par) });
  return out;
}
