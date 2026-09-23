// Yo manejo la traducción de textos de la interfaz.
import es from '../i18n/es.js';
import en from '../i18n/en.js';

// Yo registro los diccionarios disponibles.
const DICTS = { es, en };

class I18n {
  // Yo arranco en español por defecto.
  constructor() { this.lang = 'es'; }

  // Yo detecto el idioma preferido del sistema.
  detect() {
    // Yo leo el idioma del navegador.
    const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    // Yo uso el idioma si lo tengo, si no, inglés.
    return DICTS[nav] ? nav : 'en';
  }

  // Yo cambio el idioma activo.
  set(lang) {
    // Yo valido el idioma.
    this.lang = DICTS[lang] ? lang : this.detect();
    // Yo actualizo el atributo lang del documento para accesibilidad.
    document.documentElement.lang = this.lang;
  }

  // Yo traduzco una llave con parámetros {nombre}.
  t(key, params = {}) {
    // Yo busco en el idioma activo y caigo al español.
    const str = DICTS[this.lang][key] ?? DICTS.es[key] ?? key;
    // Yo reemplazo los parámetros.
    return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
  }

  // Yo traduzco todos los nodos marcados dentro de un contenedor.
  apply(root = document) {
    // Yo traduzco el texto visible.
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = this.t(el.dataset.i18n); });
    // Yo traduzco las etiquetas accesibles.
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', this.t(el.dataset.i18nAria)); });
    // Yo traduzco los títulos emergentes.
    root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = this.t(el.dataset.i18nTitle); });
  }
}

// Yo exporto una instancia única y un atajo.
export const i18n = new I18n();
export const t = (k, p) => i18n.t(k, p);
