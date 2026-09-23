// Yo enseño las mecánicas en pasos cortos antes del primer nivel.
import { t } from '../../core/I18n.js';

// Yo defino los pasos del tutorial.
const STEPS = ['move', 'jump', 'wall', 'goal', 'stars'];

export class TutorialView {
  // Yo recibo dependencias.
  constructor({ root, screens, audio }) {
    this.el = root.querySelector('[data-overlay="tutorial"]');
    this.screens = screens;
    this.audio = audio;
    this.i = 0;
    this.onDone = null;
    this.el.querySelector('[data-action="tut-next"]').addEventListener('click', () => this.next());
    this.el.querySelector('[data-action="tut-skip"]').addEventListener('click', () => this.finish());
  }

  // Yo abro el tutorial y aviso al terminar.
  open(touch, onDone) {
    this.touch = touch;
    this.onDone = onDone;
    this.i = 0;
    this.paint();
    this.screens.open('tutorial');
  }

  // Yo pinto el paso actual (texto distinto para táctil o teclado).
  paint() {
    const step = STEPS[this.i];
    this.el.querySelector('[data-bind="tut-title"]').textContent = t(`tut_${step}`);
    const variant = this.touch ? `tut_${step}_touch` : `tut_${step}_keys`;
    const txt = t(variant);
    this.el.querySelector('[data-bind="tut-text"]').textContent = txt === variant ? t(`tut_${step}_text`) : txt;
    this.el.querySelector('[data-bind="tut-dots"]').innerHTML = STEPS.map((_, k) => `<i class="${k === this.i ? 'on' : ''}"></i>`).join('');
    this.el.querySelector('[data-action="tut-next"] span').textContent = this.i === STEPS.length - 1 ? t('lets_go') : t('next');
  }

  // Yo avanzo o termino.
  next() {
    this.audio.sfx('click');
    if (this.i < STEPS.length - 1) { this.i++; this.paint(); } else this.finish();
  }

  // Yo cierro y ejecuto el callback.
  finish() {
    this.screens.close('tutorial');
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }

  // Yo indico si está abierto.
  get isOpen() { return this.screens.topOverlay() === 'tutorial'; }
}
