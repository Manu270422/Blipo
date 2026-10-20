// Yo pinto la tienda: skins, sombreros, estelas y explosiones, con vista previa animada, precio o meta para ganarlo.
import { t } from '../../core/I18n.js';
import { formatNumber } from '../../core/Format.js';
import { SKINS, getSkin, drawPlayer } from '../../entities/Skins.js';
import { COSMETICS, unlockProgress, emitTrail, emitBurst } from '../../game/Cosmetics.js';
import { Particles } from '../../engine/Particles.js';
import { drawSkinPreview } from '../Mascot.js';

// Yo ordeno las pestañas de la tienda.
const TABS = ['skins', 'hats', 'trails', 'bursts'];

export class ShopView {
  // Yo recibo dependencias.
  constructor({ root, storage, progress, wardrobe, audio, toast, onChange }) {
    this.root = root.querySelector('[data-screen="shop"]');
    this.storage = storage;
    this.progress = progress;
    this.wardrobe = wardrobe;
    this.audio = audio;
    this.toast = toast;
    this.onChange = onChange;
    this.tab = 'skins';
    this.previews = [];
    this.list = this.root.querySelector('[data-list="skins"]');
    this.tabs = this.root.querySelector('[data-list="shop-tabs"]');
    this.hint = this.root.querySelector('[data-bind="shop-hint"]');
    // Yo manejo pestañas, compra y equipado con un oyente por contenedor.
    this.tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      this.audio.sfx('click');
      this.tab = b.dataset.tab;
      this.render();
    });
    this.list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-item]');
      if (btn) this.act(btn.dataset.item);
    });
  }

  // Yo compro o equipo el artículo pulsado según la pestaña.
  act(id) {
    if (this.tab === 'skins') return this.actSkin(id);
    const kind = this.tab;
    if (this.wardrobe.owns(kind, id)) {
      this.wardrobe.equip(kind, id);
      this.audio.sfx('click');
    } else {
      const res = this.wardrobe.buy(kind, id);
      if (!res.ok) { this.audio.sfx('error'); if (res.reason === 'funds') this.toast.show(t('not_enough'), { icon: 'i-spark' }); return; }
      this.audio.sfx('buy');
      this.toast.show(t('bought', { name: t(`cos_${kind}_${id}`) }), { icon: 'i-bag' });
    }
    this.onChange();
    this.render();
  }

  // Yo compro o equipo una skin.
  actSkin(id) {
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

  // Yo armo el botón de una tarjeta: puesto, equipar, comprar o la meta que falta.
  button(id, { owned, equipped, price, unlock }) {
    const d = this.storage.data;
    if (equipped) return `<button class="btn btn--small btn--ghost" type="button" disabled><svg class="icon"><use href="#i-check"/></svg>${t('equipped')}</button>`;
    if (owned) return `<button class="btn btn--small" type="button" data-item="${id}">${t('equip')}</button>`;
    if (price) return `<button class="btn btn--small ${d.wallet.sparks >= price ? 'btn--gold' : ''}" type="button" data-item="${id}"><svg class="icon"><use href="#i-spark"/></svg>${formatNumber(price)}</button>`;
    // Yo muestro la meta con su barra de progreso: así el jugador sabe qué hacer para ganarlo.
    const { have, need } = unlockProgress(unlock, d, this.progress);
    return `<div class="unlock-goal"><span><svg class="icon"><use href="#i-lock"/></svg>${t(`unlock_${unlock.type}`, { n: need, boss: unlock.world != null ? t(`boss_${['golem', 'spider', 'furnace', 'yeti', 'eye'][unlock.world]}`) : '' })}</span><span class="mission__bar"><i style="width:${Math.min(100, Math.round((have / need) * 100))}%"></i></span><small>${Math.min(have, need)}/${need}</small></div>`;
  }

  // Yo pinto las pestañas y las tarjetas de la pestaña actual.
  render() {
    const d = this.storage.data;
    d._newCosmetic = false;
    this.root.querySelector('[data-bind="sparks"]').textContent = formatNumber(d.wallet.sparks);
    this.tabs.innerHTML = TABS.map((k) => `<button class="world-tab" role="tab" type="button" data-tab="${k}" aria-selected="${k === this.tab}" style="--c:var(--teal)">${t(`shop_tab_${k}`)}</button>`).join('');
    this.hint.textContent = t(this.tab === 'skins' ? 'shop_hint' : 'shop_hint_cosmetics');
    const skin = getSkin(d.skins.equipped);
    let cards;
    if (this.tab === 'skins') {
      cards = SKINS.map((s) => ({ id: s.id, name: t(`skin_${s.id}`), owned: d.skins.owned.includes(s.id), equipped: d.skins.equipped === s.id, price: s.price }));
    } else {
      const look = this.wardrobe.look();
      const slot = { hats: 'hat', trails: 'trail', bursts: 'burst' }[this.tab];
      cards = COSMETICS[this.tab].map((c) => ({ id: c.id, name: t(`cos_${this.tab}_${c.id}`), owned: this.wardrobe.owns(this.tab, c.id), equipped: look[slot] === c.id, price: c.price, unlock: c.unlock }));
    }
    this.list.innerHTML = cards.map((c) => `<article class="skin-card ${c.equipped ? 'is-equipped' : ''} ${!c.owned && c.unlock ? 'is-locked' : ''}"><canvas data-preview="${c.id}" aria-hidden="true"></canvas><h4>${c.name}</h4>${this.button(c.id, c)}</article>`).join('');
    // Yo preparo las vistas previas después de insertar el HTML.
    this.previews = [...this.list.querySelectorAll('[data-preview]')].map((canvas) => ({ canvas, id: canvas.dataset.preview, parts: new Particles(160), t: 0, next: 0 }));
    requestAnimationFrame(() => {
      if (this.tab === 'skins') this.previews.forEach((p) => drawSkinPreview(p.canvas, SKINS.find((s) => s.id === p.id), 0.5, false, this.wardrobe.look().hat));
      else this.animate(0, 0, skin);
    });
  }

  // Yo animo las vistas previas de sombreros, estelas y explosiones (la llama el bucle de la app).
  animate(time, dt, skin = getSkin(this.storage.data.skins.equipped)) {
    if (this.tab === 'skins') return;
    const hat = this.wardrobe.look().hat;
    for (const p of this.previews) {
      const c = p.canvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) continue;
      if (this.tab === 'hats') { drawSkinPreview(c, skin, time, true, p.id); continue; }
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // Yo uso una "cámara" mínima dentro de la tarjeta (1 tile = 30 % del lado).
      const tile = Math.min(w, h) * 0.3;
      const cam = { tile, sx: (x) => w / 2 + x * tile, sy: (y) => h * 0.62 + y * tile };
      p.t += dt;
      if (this.tab === 'trails') {
        // Yo hago correr a Blipo en el lugar y suelto su estela hacia atrás.
        p.next -= dt;
        while (p.next <= 0) { p.next += 0.045; emitTrail(p.parts, p.id, -0.3 + (Math.random() - 0.5) * 0.3, -0.75, skin.trail === 'rainbow' ? '#5EF2E0' : skin.trail, time); }
        for (const q of p.parts.pool) if (q.alive) q.x -= 3 * dt;
        p.parts.update(dt);
        p.parts.draw(ctx, cam);
        drawPlayer(ctx, skin, { vx: 6, vy: 0, facing: 1, sqX: 1, sqY: 1, onGround: true, blinkSeed: 1.7 }, cam.sx(0.1), cam.sy(0.2), tile, time, hat);
      } else {
        // Yo hago explotar a Blipo cada poco y lo dejo reaparecer.
        const cyc = p.t % 1.8;
        if (cyc < dt || p.next === 0) { emitBurst(p.parts, p.id, 0, -0.4, skin.body === 'rainbow' ? '#5EF2E0' : skin.body); p.next = 1; }
        p.parts.update(dt);
        p.parts.draw(ctx, cam);
        if (cyc > 1.1) drawPlayer(ctx, skin, { vx: 0, vy: 0, facing: 1, sqX: 1, sqY: 1, onGround: true, blinkSeed: 1.7 }, cam.sx(0), cam.sy(0.2), tile, time, hat);
      }
    }
  }
}
