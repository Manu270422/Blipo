// Yo pinto la tienda de skins con vista previa, precio, compra y equipado.
import { t } from '../../core/I18n.js';
import { formatNumber } from '../../core/Format.js';
import { SKINS } from '../../entities/Skins.js';
import { drawSkinPreview } from '../Mascot.js';

export class ShopView {
  // Yo recibo dependencias.
  constructor({ root, storage, progress, audio, toast, onChange }) {
    this.root = root.querySelector('[data-screen="shop"]');
    this.storage = storage;
    this.progress = progress;
    this.audio = audio;
    this.toast = toast;
    this.onChange = onChange;
    this.list = this.root.querySelector('[data-list="skins"]');
    // Yo manejo compra y equipado con un solo oyente.
    this.list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-skin]');
      if (btn) this.act(btn.dataset.skin);
    });
  }

  // Yo compro o equipo la skin pulsada.
  act(id) {
    const d = this.storage.data;
    if (d.skins.owned.includes(id)) {
      this.progress.equipSkin(id);
      this.audio.sfx('click');
    } else {
      const res = this.progress.buySkin(id);
      if (!res.ok) { this.audio.sfx('error'); this.toast.show(t('not_enough'), { icon: 'i-spark' }); return; }
      this.audio.sfx('buy');
      this.toast.show(t('bought', { name: t(`skin_${id}`) }), { icon: 'i-bag' });
    }
    this.onChange();
    this.render();
  }

  // Yo pinto las tarjetas.
  render() {
    const d = this.storage.data;
    this.root.querySelector('[data-bind="sparks"]').textContent = formatNumber(d.wallet.sparks);
    this.list.innerHTML = SKINS.map((s) => {
      const owned = d.skins.owned.includes(s.id);
      const equipped = d.skins.equipped === s.id;
      const afford = d.wallet.sparks >= s.price;
      let btn;
      if (equipped) btn = `<button class="btn btn--small btn--ghost" type="button" disabled><svg class="icon"><use href="#i-check"/></svg>${t('equipped')}</button>`;
      else if (owned) btn = `<button class="btn btn--small" type="button" data-skin="${s.id}">${t('equip')}</button>`;
      else btn = `<button class="btn btn--small ${afford ? 'btn--gold' : ''}" type="button" data-skin="${s.id}"><svg class="icon"><use href="#i-spark"/></svg>${formatNumber(s.price)}</button>`;
      return `<article class="skin-card ${equipped ? 'is-equipped' : ''}"><canvas data-preview="${s.id}" aria-hidden="true"></canvas><h4>${t(`skin_${s.id}`)}</h4>${btn}</article>`;
    }).join('');
    // Yo dibujo las vistas previas después de insertar el HTML.
    requestAnimationFrame(() => {
      this.list.querySelectorAll('[data-preview]').forEach((c) => drawSkinPreview(c, SKINS.find((s) => s.id === c.dataset.preview), 0.5));
    });
  }
}
