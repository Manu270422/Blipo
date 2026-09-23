// Yo animo a Blipo en los canvas decorativos del menú y la portada.
import { drawPlayer } from '../entities/Skins.js';

export class Mascot {
  // Yo busco todos los canvas marcados como mascota.
  constructor(root) {
    this.canvases = [...root.querySelectorAll('[data-mascot]')];
    this.skin = null;
  }

  // Yo cambio la skin mostrada.
  setSkin(skin) { this.skin = skin; }

  // Yo dibujo un frame en los canvas visibles.
  render(time) {
    if (!this.skin) return;
    for (const c of this.canvases) {
      // Yo salto los que no se ven.
      if (!c.offsetParent) continue;
      drawSkinPreview(c, this.skin, time, true);
    }
  }
}

// Yo dibujo una skin dentro de un canvas (también lo uso en la tienda).
export function drawSkinPreview(canvas, skin, time, animate = false) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // Yo hago que salte suavemente con aplastamiento al tocar el suelo.
  const phase = animate ? (time * 1.3) % 1 : 0;
  const hop = animate ? Math.sin(phase * Math.PI) : 0;
  const squash = animate && phase < 0.08 ? 1 - (0.08 - phase) * 3 : 1;
  const size = Math.min(w, h) * 0.62;
  const by = h * 0.9 - hop * h * 0.14;
  // Yo dibujo una sombra que se achica al subir.
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.92, size * (0.4 - hop * 0.12), size * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  drawPlayer(ctx, skin, { vx: 0, vy: animate ? -hop * 6 : 0, facing: 1, sqX: 2 - squash, sqY: squash, onGround: true, blinkSeed: 1.7 }, w / 2, by, size, time);
}
