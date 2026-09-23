// Yo enlazo el formulario de ajustes con el guardado y aplico cada cambio al instante.
export class SettingsView {
  // Yo recibo dependencias y el callback que aplica los ajustes.
  constructor({ root, storage, onApply }) {
    this.form = root.querySelector('[data-form="settings"]');
    this.storage = storage;
    this.onApply = onApply;
    // Yo escucho cambios en vivo (sliders incluidos).
    this.form.addEventListener('input', (e) => this.update(e.target));
    this.form.addEventListener('change', (e) => this.update(e.target));
  }

  // Yo guardo el valor de un control.
  update(el) {
    if (!el.name) return;
    const s = this.storage.data.settings;
    if (el.type === 'checkbox') s[el.name] = el.checked;
    else if (el.type === 'range') s[el.name] = Number(el.value);
    else s[el.name] = el.value;
    this.storage.save();
    this.onApply(el.name);
  }

  // Yo relleno el formulario con los valores actuales.
  render(lang) {
    const s = this.storage.data.settings;
    for (const el of this.form.elements) {
      if (!el.name || !(el.name in s)) continue;
      if (el.type === 'checkbox') el.checked = !!s[el.name];
      else el.value = el.name === 'lang' ? (s.lang || lang) : s[el.name];
    }
  }
}
