// Yo muestro confirmaciones con promesa para usarlas con await.
import { t } from '../core/I18n.js';

export class Dialog {
  // Yo recibo el administrador de pantallas.
  constructor(screens) {
    this.screens = screens;
    this.el = screens.overlays.get('confirm');
    this.resolve = null;
    // Yo respondo según el botón pulsado.
    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-confirm]');
      if (btn) this.finish(btn.dataset.confirm === 'yes');
    });
  }

  // Yo abro el diálogo y espero la respuesta.
  confirm(titleKey, textKey) {
    this.el.querySelector('[data-bind="confirm-title"]').textContent = t(titleKey);
    this.el.querySelector('[data-bind="confirm-text"]').textContent = t(textKey);
    this.screens.open('confirm');
    return new Promise((res) => { this.resolve = res; });
  }

  // Yo cierro y resuelvo.
  finish(value) {
    this.screens.close('confirm');
    this.resolve?.(value);
    this.resolve = null;
  }

  // Yo indico si está abierto (para el botón atrás).
  get isOpen() { return this.screens.topOverlay() === 'confirm'; }
}
