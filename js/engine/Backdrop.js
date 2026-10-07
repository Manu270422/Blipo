// Yo pinto el fondo vivo de cada mundo: siluetas en capas con paralaje y partículas de ambiente.
import { Rng, hashString } from '../core/Random.js';

// Yo describo cada estilo: qué siluetas dibujo, qué partículas suelto y de qué color.
const STYLES = {
  quarry: { shape: 'mesa', motes: { count: 26, color: 'rgba(244,238,223,.35)', vx: 0.25, vy: -0.08, size: 0.06 } },
  caves: { shape: 'stalactite', motes: { count: 34, color: 'rgba(123,227,155,.55)', vx: 0.1, vy: -0.3, size: 0.07, glow: true } },
  foundry: { shape: 'chimney', motes: { count: 46, color: 'rgba(255,154,61,.85)', vx: 0.35, vy: -1.6, size: 0.07, glow: true }, heat: true },
  glacier: { shape: 'peak', motes: { count: 60, color: 'rgba(255,255,255,.75)', vx: -0.5, vy: 1.4, size: 0.08 } },
  void: { shape: 'cube', motes: { count: 70, color: 'rgba(255,255,255,.8)', vx: 0, vy: 0, size: 0.05, twinkle: true } },
};

// Yo elijo un estilo a partir del tono cuando el nivel no trae uno (diario y supervivencia).
export function styleForHue(hue) {
  const h = ((hue % 360) + 360) % 360;
  if (h < 45 || h >= 330) return 'foundry';
  if (h < 175) return 'caves';
  if (h < 200) return 'glacier';
  if (h < 250) return 'quarry';
  return 'void';
}

export class Backdrop {
  // Yo genero las capas una sola vez por nivel con una semilla fija.
  constructor(level, cols, rows) {
    this.style = STYLES[level.style] ? level.style : styleForHue(level.hue ?? 205);
    this.def = STYLES[this.style];
    this.cols = cols; this.rows = rows;
    const rng = new Rng(hashString(`${level.id || 'x'}-${this.style}`));
    // Yo creo dos capas: una lejana que se mueve poco y una cercana que se mueve más.
    const span = cols + 48;
    this.layers = [0.25, 0.5].map((f, li) => {
      const items = [];
      let x = rng.float(-4, 2);
      while (x < span) {
        const w = rng.float(2.5, 6) * (li ? 1 : 1.4);
        items.push({ x, w, h: rng.float(0.25, 0.6) * Math.min(rows, 22) * (li ? 0.8 : 1), r: rng.float(0, Math.PI * 2), s: rng.float(0.5, 1.2) });
        x += w + rng.float(0.5, li ? 5 : 3);
      }
      return { f, items, alpha: li ? 0.8 : 0.55 };
    });
    // Yo preparo las partículas de ambiente.
    this.motes = Array.from({ length: this.def.motes.count }, () => ({
      x: rng.float(0, cols), y: rng.float(0, rows), k: rng.float(0.5, 1.4), p: rng.float(0, Math.PI * 2),
    }));
  }

  // Yo dibujo el fondo dentro del tablero (el llamador ya recortó al área del nivel).
  draw(ctx, cam, theme, time, fx = 1) {
    const tile = cam.tile;
    const hue = theme.hue;
    const X0 = cam.sx(0), Y0 = cam.sy(0);
    // Yo tomo como referencia la posición del tablero con la cámara en reposo (arriba a la izquierda).
    const usableH = cam.viewH - cam.insets.top - cam.insets.bottom;
    const refOx = cam.worldW <= cam.viewW ? (cam.viewW - cam.worldW) / 2 : 0;
    const refOy = cam.worldH <= usableH ? cam.insets.top + (usableH - cam.worldH) / 2 : cam.insets.top;
    for (const layer of this.layers) {
      // Yo desplazo cada capa solo una fracción de lo que se mueve la cámara (paralaje).
      const ox = X0 - (cam.ox - refOx) * (1 - layer.f);
      const oy = Y0 - (cam.oy - refOy) * (1 - layer.f);
      ctx.fillStyle = `hsla(${hue}deg 40% ${layer.f < 0.4 ? 11 : 7}% / ${layer.alpha})`;
      for (const it of layer.items) this.shape(ctx, ox + it.x * tile, oy, it, tile, time);
    }
    // Yo agrego el resplandor de calor al fondo de la fundición.
    if (this.def.heat) {
      const g = ctx.createLinearGradient(0, Y0 + cam.worldH * 0.55, 0, Y0 + cam.worldH);
      g.addColorStop(0, 'rgba(255,93,74,0)');
      g.addColorStop(1, `rgba(255,93,74,${0.18 + Math.sin(time * 1.3) * 0.04})`);
      ctx.fillStyle = g;
      ctx.fillRect(X0, Y0 + cam.worldH * 0.55, cam.worldW, cam.worldH * 0.45);
    }
    // Yo muevo las partículas de ambiente en bucle dentro del tablero.
    const m = this.def.motes;
    const n = Math.round(this.motes.length * fx);
    ctx.fillStyle = m.color;
    for (let i = 0; i < n; i++) {
      const p = this.motes[i];
      const x = mod(p.x + time * m.vx * p.k + Math.sin(time * 0.8 + p.p) * 0.3, this.cols);
      const y = mod(p.y + time * m.vy * p.k, this.rows);
      let r = m.size * tile * p.k;
      if (m.twinkle) r *= 0.6 + 0.4 * Math.sin(time * 2.5 + p.p);
      if (r <= 0.2) continue;
      if (m.glow) { ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(X0 + x * tile, Y0 + y * tile, r * 2.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.fillRect(X0 + x * tile - r / 2, Y0 + y * tile - r / 2, r, r);
    }
  }

  // Yo dibujo una silueta según el estilo del mundo.
  shape(ctx, x, oy, it, tile, time) {
    const rows = this.rows;
    const bottom = oy + rows * tile + tile;
    const w = it.w * tile, h = it.h * tile;
    ctx.beginPath();
    switch (this.style) {
      case 'stalactite': {
        // Yo cuelgo estalactitas del techo.
        const top = oy - tile;
        ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w * 0.55, top + h * 0.9); ctx.lineTo(x + w * 0.45, top + h);
        break;
      }
      case 'chimney': {
        // Yo levanto chimeneas industriales con su boca.
        const cw = w * 0.45;
        ctx.rect(x, bottom - h, cw, h);
        ctx.rect(x - cw * 0.12, bottom - h, cw * 1.24, tile * 0.5);
        ctx.rect(x + cw, bottom - h * 0.45, w * 0.55, h * 0.45);
        // Yo dejo salir humo lento por la boca.
        const sr = tile * 0.6 * it.s;
        const sx = x + cw / 2 + Math.sin(time * 0.6 + it.r) * tile * 0.3;
        const sy = bottom - h - tile * (0.6 + ((time * 0.4 + it.r) % 2));
        ctx.moveTo(sx + sr, sy);
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        break;
      }
      case 'peak': {
        // Yo dibujo montañas nevadas.
        ctx.moveTo(x - w * 0.4, bottom); ctx.lineTo(x + w * 0.5, bottom - h * 1.3); ctx.lineTo(x + w * 1.4, bottom);
        break;
      }
      case 'cube': {
        // Yo hago flotar cubos que giran despacio.
        const cx = x + w / 2, cy = oy + (it.r / (Math.PI * 2)) * rows * tile + Math.sin(time * 0.5 + it.r) * tile * 0.6;
        const s = tile * it.s * 1.2;
        const a = time * 0.25 * (it.s - 0.8) + it.r;
        for (let i = 0; i < 4; i++) {
          const ang = a + (i * Math.PI) / 2;
          const px = cx + Math.cos(ang) * s, py = cy + Math.sin(ang) * s;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        break;
      }
      default: {
        // Yo dibujo mesetas de roca con la cima plana.
        ctx.moveTo(x - w * 0.2, bottom); ctx.lineTo(x, bottom - h); ctx.lineTo(x + w, bottom - h * 0.92); ctx.lineTo(x + w * 1.2, bottom);
        break;
      }
    }
    ctx.closePath();
    ctx.fill();
  }
}

// Yo calculo el módulo siempre positivo.
function mod(v, m) { return ((v % m) + m) % m; }
