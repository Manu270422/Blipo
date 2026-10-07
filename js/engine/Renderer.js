// Yo dibujo el mundo en canvas: capa estática precalculada + objetos animados + jugador + partículas.
import { T, SOLID } from '../levels/tiles.js';
import { drawPlayer, resolveColor } from '../entities/Skins.js';
import { Backdrop } from './Backdrop.js';

// Yo limito el tamaño de la capa estática para no pasar el máximo de canvas de los móviles.
const MAX_STATIC_PIXELS = 12e6;

// Yo defino los colores fijos de la marca que se usan dentro del juego.
const BRAND = {
  bone: '#F4EEDF',
  coral: '#FF5D4A',
  gold: '#FFC23D',
  teal: '#2DE1C2',
  ink: '#1A1433',
};

// Yo creo la paleta de un nivel a partir de su tono.
export function makeTheme(hue, highContrast = false) {
  return {
    hue,
    stone: `hsl(${hue}deg 48% ${highContrast ? 58 : 46}%)`,
    fill: `hsl(${hue}deg 42% ${highContrast ? 30 : 26}%)`,
    bgTop: `hsl(${hue}deg 45% 17%)`,
    bgBottom: `hsl(${hue}deg 50% 5%)`,
    spike: highContrast ? '#FFFFFF' : BRAND.bone,
    spikeShade: highContrast ? '#FF2A1A' : BRAND.coral,
  };
}

export class Renderer {
  // Yo preparo el contexto del canvas principal.
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.static = document.createElement('canvas');
    this.sctx = this.static.getContext('2d');
    this.dpr = 1;
    this.w = 0; this.h = 0;
  }

  // Yo ajusto el canvas a la pantalla respetando la densidad de píxeles.
  resize(w, h) {
    // Yo limito la densidad a 2 para cuidar la batería en móviles de gama alta.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  // Yo pinto una vez la geometría fija del nivel en un canvas aparte.
  buildStatic(map, theme, tile, level = {}) {
    let s = tile * this.dpr;
    // Yo bajo la resolución de la capa si el mapa es enorme (el navegador la escala al dibujarla).
    if (map.cols * map.rows * s * s > MAX_STATIC_PIXELS) s = Math.sqrt(MAX_STATIC_PIXELS / (map.cols * map.rows));
    this.static.width = Math.ceil(map.cols * s);
    this.static.height = Math.ceil(map.rows * s);
    const c = this.sctx;
    // Yo dejo la capa transparente: el degradado y el fondo vivo se pintan debajo en cada cuadro.
    c.clearRect(0, 0, this.static.width, this.static.height);
    // Yo preparo el fondo con paralaje del mundo.
    if (!this.backdrop || this.backdrop.map !== map) { this.backdrop = new Backdrop(level, map.cols, map.rows); this.backdrop.map = map; }
    // Yo agrego una trama de puntos muy sutil para dar profundidad.
    c.fillStyle = 'rgba(255,255,255,.035)';
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if ((x + y) % 2 === 0) c.fillRect(x * s + s / 2 - 1, y * s + s / 2 - 1, 2, 2);

    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const ch = map.grid[y][x];
        const px = x * s, py = y * s;
        if (ch === T.GROUND) this.drawStone(c, px, py, s, theme);
        else if (ch === T.FILL) { c.fillStyle = theme.fill; c.fillRect(px, py, Math.ceil(s), Math.ceil(s)); }
        else if (ch === T.SPIKE_UP) this.drawSpike(c, px, py, s, 0, theme);
        else if (ch === T.SPIKE_RIGHT) this.drawSpike(c, px, py, s, 1, theme);
        else if (ch === T.SPIKE_DOWN) this.drawSpike(c, px, py, s, 2, theme);
        else if (ch === T.SPIKE_LEFT) this.drawSpike(c, px, py, s, 3, theme);
        else if (ch === T.JET_A || ch === T.JET_B) this.drawNozzle(c, px, py, s, theme);
        else if (ch === T.ICE) this.drawIce(c, px, py, s, map.get(x, y - 1));
      }
    }
  }

  // Yo dibujo un bloque de roca con el bisel del prototipo (luz arriba, sombra abajo-derecha).
  drawStone(c, x, y, s, theme) {
    const b = Math.max(2, s * 0.18);
    c.fillStyle = theme.stone;
    c.fillRect(x, y, Math.ceil(s), Math.ceil(s));
    // Yo dibujo cada lado del bisel como trapecio.
    const side = (pts, color) => { c.fillStyle = color; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); };
    side([x, y, x + s, y, x + s - b, y + b, x + b, y + b], 'rgba(255,255,255,.16)');
    side([x, y, x + b, y + b, x + b, y + s - b, x, y + s], 'rgba(0,0,0,.12)');
    side([x + s, y, x + s, y + s, x + s - b, y + s - b, x + s - b, y + b], 'rgba(0,0,0,.36)');
    side([x, y + s, x + b, y + s - b, x + s - b, y + s - b, x + s, y + s], 'rgba(0,0,0,.5)');
  }

  // Yo dibujo la boquilla metálica de una llamarada.
  drawNozzle(c, x, y, s, theme) {
    this.drawStone(c, x, y, s, theme);
    c.fillStyle = '#3A3F52';
    c.fillRect(x + s * 0.18, y, s * 0.64, s * 0.42);
    c.fillStyle = '#1A1433';
    c.fillRect(x + s * 0.3, y, s * 0.4, s * 0.16);
    c.fillStyle = BRAND.coral;
    c.fillRect(x + s * 0.18, y + s * 0.32, s * 0.64, s * 0.1);
  }

  // Yo dibujo un bloque de hielo: celeste translúcido con brillo diagonal y escarcha arriba.
  drawIce(c, x, y, s, above) {
    c.fillStyle = '#9FE3F5';
    c.fillRect(x, y, Math.ceil(s), Math.ceil(s));
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath(); c.moveTo(x + s * 0.15, y + s); c.lineTo(x + s * 0.45, y + s); c.lineTo(x + s * 0.85, y + s * 0.2); c.lineTo(x + s * 0.55, y + s * 0.2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(30,90,130,.35)';
    c.fillRect(x, y + s * 0.82, Math.ceil(s), s * 0.18);
    // Yo agrego escarcha solo en la cara expuesta de arriba.
    if (!SOLID.has(above)) { c.fillStyle = '#F4FCFF'; c.fillRect(x, y, Math.ceil(s), Math.max(2, s * 0.14)); }
  }

  // Yo dibujo un pincho con rotación (0 arriba, 1 derecha, 2 abajo, 3 izquierda).
  drawSpike(c, x, y, s, rot, theme) {
    c.save();
    c.translate(x + s / 2, y + s / 2);
    c.rotate((rot * Math.PI) / 2);
    const hw = s * 0.36, top = -s * 0.42, base = s / 2;
    // Yo pinto el pincho claro.
    c.fillStyle = theme.spike;
    c.beginPath(); c.moveTo(0, top); c.lineTo(hw, base); c.lineTo(-hw, base); c.closePath(); c.fill();
    // Yo pinto la cara en sombra coral (el color del peligro en la marca).
    c.fillStyle = theme.spikeShade;
    c.beginPath(); c.moveTo(0, top); c.lineTo(hw, base); c.lineTo(0, base); c.closePath(); c.fill();
    c.restore();
  }

  // Yo dibujo un frame completo.
  draw(game, dt) {
    const { ctx, dpr } = this;
    const cam = game.camera;
    const map = game.map;
    const tile = cam.tile;
    const time = game.clock;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Yo pinto el fondo exterior con el color tinta de la marca.
    ctx.fillStyle = BRAND.ink;
    ctx.fillRect(0, 0, this.w, this.h);
    if (!map) return;

    // Yo dibujo la sombra del tablero (como el box-shadow del prototipo).
    const X0 = cam.sx(0), Y0 = cam.sy(0);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(X0 + 4, Y0 + 14, cam.worldW, cam.worldH);
    // Yo pinto el fondo del tablero (degradado del prototipo) y encima el fondo vivo recortado al nivel.
    const theme = game.theme;
    const bg = ctx.createLinearGradient(0, Y0, 0, Y0 + cam.worldH);
    bg.addColorStop(0, theme.bgTop);
    bg.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(X0, Y0, cam.worldW, cam.worldH);
    if (this.backdrop) {
      ctx.save();
      ctx.beginPath(); ctx.rect(X0, Y0, cam.worldW, cam.worldH); ctx.clip();
      this.backdrop.draw(ctx, cam, theme, time, game.particles.scale ?? 1);
      ctx.restore();
    }
    // Yo copio la capa estática.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.static, X0, Y0, cam.worldW, cam.worldH);

    // Yo dibujo las salidas con brillo pulsante y flechas.
    const pulse = 0.55 + Math.sin(time * 4) * 0.2;
    for (const e of map.exits) {
      const x = cam.sx(e.x), y = cam.sy(e.y);
      ctx.fillStyle = `rgba(255,194,61,${pulse * 0.55})`;
      ctx.fillRect(x, y, tile, tile);
      // Yo indico la dirección de salida con chevrones animados.
      const dirX = e.x === map.cols - 1 ? 1 : e.x === 0 ? -1 : 0;
      const dirY = dirX === 0 ? 1 : 0;
      const o = ((time * 1.6) % 1) * tile * 0.4;
      ctx.strokeStyle = BRAND.gold;
      ctx.lineWidth = Math.max(1.5, tile * 0.1);
      ctx.beginPath();
      const cx = x + tile / 2 + dirX * (o - tile * 0.2), cy = y + tile / 2 + dirY * (o - tile * 0.2);
      if (dirX) { ctx.moveTo(cx - dirX * tile * 0.15, cy - tile * 0.2); ctx.lineTo(cx + dirX * tile * 0.1, cy); ctx.lineTo(cx - dirX * tile * 0.15, cy + tile * 0.2); }
      else { ctx.moveTo(cx - tile * 0.2, cy - tile * 0.15); ctx.lineTo(cx, cy + tile * 0.1); ctx.lineTo(cx + tile * 0.2, cy - tile * 0.15); }
      ctx.stroke();
    }

    // Yo dibujo los portales con anillos concéntricos que laten (animación "portal" del prototipo).
    const portal = (p, big) => {
      const cx = cam.sx(p.x + 0.5), cy = cam.sy(p.y + 0.5);
      const r = tile * (big ? 0.95 : 0.7) * (1 + Math.sin(time * Math.PI) * 0.06);
      for (let i = 4; i >= 1; i--) {
        ctx.fillStyle = i % 2 ? `rgba(45,225,194,${0.18 + (4 - i) * 0.12})` : 'rgba(10,8,24,.8)';
        ctx.beginPath(); ctx.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2); ctx.fill();
      }
      // Yo agrego un brillo giratorio.
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = Math.max(1, tile * 0.07);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, time * 3, time * 3 + 1.2); ctx.stroke();
    };
    map.portalsIn.forEach((p) => portal(p, true));
    if (map.portalOut) portal(map.portalOut, false);

    // Yo dibujo los bloques frágiles con grietas y temblor.
    for (const c of map.crumbles) {
      const shake = c.state === 'shaking' ? (Math.random() - 0.5) * tile * 0.12 : 0;
      const x = cam.sx(c.x) + shake, y = cam.sy(c.y);
      if (c.state === 'gone') {
        ctx.strokeStyle = 'rgba(255,255,255,.15)';
        ctx.setLineDash([3, 3]); ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2); ctx.setLineDash([]);
        continue;
      }
      ctx.fillStyle = `hsl(${game.theme.hue}deg 30% 62%)`;
      ctx.fillRect(x, y, tile, tile * 0.8);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(x, y + tile * 0.65, tile, tile * 0.15);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = Math.max(1, tile * 0.06);
      ctx.beginPath(); ctx.moveTo(x + tile * 0.3, y); ctx.lineTo(x + tile * 0.45, y + tile * 0.35); ctx.lineTo(x + tile * 0.7, y + tile * 0.6); ctx.stroke();
    }

    // Yo dibujo los resortes.
    for (const b of map.bounces) {
      const x = cam.sx(b.x), y = cam.sy(b.y);
      this.drawStone(ctx, x, y, tile, game.theme);
      const lift = b.t * tile * 0.35;
      ctx.strokeStyle = BRAND.bone;
      ctx.lineWidth = Math.max(1.5, tile * 0.08);
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) ctx.lineTo(x + tile * (i % 2 ? 0.3 : 0.7), y - (tile * 0.3 + lift) * (i / 4));
      ctx.stroke();
      ctx.fillStyle = BRAND.teal;
      ctx.fillRect(x + tile * 0.12, y - tile * 0.38 - lift, tile * 0.76, tile * 0.16);
    }

    // Yo dibujo las cintas transportadoras con su banda en movimiento.
    for (const b of map.belts) {
      const x = cam.sx(b.x), y = cam.sy(b.y);
      ctx.fillStyle = '#2A2D3E';
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = '#4A4F66';
      ctx.fillRect(x, y, tile, tile * 0.3);
      // Yo animo los chevrones en la dirección del arrastre.
      const o = (((time * 1.8 * b.dir) % 1) + 1) % 1;
      ctx.strokeStyle = BRAND.gold;
      ctx.lineWidth = Math.max(1, tile * 0.07);
      ctx.beginPath();
      for (let k = -1; k < 2; k++) {
        const cx = x + (k + o) * tile * 0.5 + tile * 0.25;
        if (cx < x + tile * 0.08 || cx > x + tile * 0.92) continue;
        ctx.moveTo(cx - b.dir * tile * 0.08, y + tile * 0.04);
        ctx.lineTo(cx + b.dir * tile * 0.06, y + tile * 0.15);
        ctx.lineTo(cx - b.dir * tile * 0.08, y + tile * 0.26);
      }
      ctx.stroke();
      // Yo dibujo los rodillos.
      ctx.fillStyle = '#7B819C';
      ctx.beginPath(); ctx.arc(x + tile * 0.5, y + tile * 0.62, tile * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2A2D3E';
      ctx.beginPath(); const a = time * 6 * b.dir; ctx.moveTo(x + tile * 0.5, y + tile * 0.62); ctx.lineTo(x + tile * 0.5 + Math.cos(a) * tile * 0.2, y + tile * 0.62 + Math.sin(a) * tile * 0.2); ctx.stroke();
    }

    // Yo dibujo las llamaradas: chispas de aviso y luego la columna de fuego.
    for (const j of map.jets) {
      if (j.phase === 'off' || j.reach <= 0) continue;
      const cx = cam.sx(j.x + 0.5), base = cam.sy(j.y);
      if (j.phase === 'warn') {
        ctx.fillStyle = BRAND.gold;
        for (let i = 0; i < 4; i++) {
          const k = (time * 5 + i * 0.27 + j.x * 0.13) % 1;
          ctx.fillRect(cx + Math.sin(i * 7 + time * 20) * tile * 0.18, base - k * tile * 0.7, tile * 0.07, tile * 0.07);
        }
        continue;
      }
      const h = j.reach * tile;
      const flick = 1 + Math.sin(time * 40 + j.x) * 0.06;
      const grad = ctx.createLinearGradient(0, base, 0, base - h);
      grad.addColorStop(0, '#FFF6E0');
      grad.addColorStop(0.35, BRAND.gold);
      grad.addColorStop(0.8, BRAND.coral);
      grad.addColorStop(1, 'rgba(255,93,74,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - tile * 0.3, base);
      ctx.quadraticCurveTo(cx - tile * 0.38 * flick, base - h * 0.5, cx, base - h * flick);
      ctx.quadraticCurveTo(cx + tile * 0.38 * flick, base - h * 0.5, cx + tile * 0.3, base);
      ctx.closePath(); ctx.fill();
    }

    // Yo dibujo las plataformas móviles con su riel.
    for (const m of map.movers) {
      ctx.strokeStyle = 'rgba(244,238,223,.18)';
      ctx.lineWidth = Math.max(1, tile * 0.06);
      ctx.setLineDash([tile * 0.2, tile * 0.2]);
      ctx.beginPath();
      ctx.moveTo(cam.sx(m.x0 + m.w / 2), cam.sy(m.y0 + 0.25));
      ctx.lineTo(cam.sx(m.x0 + m.dx + m.w / 2), cam.sy(m.y0 + m.dy + 0.25));
      ctx.stroke();
      ctx.setLineDash([]);
      const x = cam.sx(m.x), y = cam.sy(m.y), w = m.w * tile, h = m.h * tile;
      ctx.fillStyle = '#4A4F66';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = BRAND.gold;
      ctx.fillRect(x, y, w, Math.max(2, h * 0.28));
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(x, y + h * 0.75, w, h * 0.25);
      // Yo marco franjas de precaución en los extremos.
      ctx.fillStyle = BRAND.ink;
      for (let i = 0; i < 2; i++) ctx.fillRect(x + (i ? w - tile * 0.3 : tile * 0.1), y + h * 0.35, tile * 0.2, h * 0.35);
    }

    // Yo dibujo las zonas de viento con vetas que corren (o suben) y copos de aviso.
    for (const w of map.winds) {
      if (w.state === 'off') continue;
      const up = w.dir === 'up', dirX = w.dir === 'left' ? -1 : 1;
      const n = Math.max(3, Math.round(w.w * w.h * 0.35));
      ctx.strokeStyle = w.state === 'on' ? 'rgba(235,250,255,.45)' : 'rgba(235,250,255,.15)';
      ctx.lineWidth = Math.max(1, tile * 0.05);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const r1 = ((i * 97) % 89) / 89, r2 = ((i * 61) % 83) / 83;
        const speed = w.state === 'on' ? 1.6 : 0.4;
        if (up) {
          const x = w.x + r1 * w.w, y = w.y + w.h - ((r2 * w.h + time * speed * 4) % w.h);
          ctx.moveTo(cam.sx(x), cam.sy(y)); ctx.lineTo(cam.sx(x), cam.sy(y + 0.6));
        } else {
          const y = w.y + r1 * w.h, off = (r2 * w.w + time * speed * 5) % w.w;
          const x = dirX > 0 ? w.x + off : w.x + w.w - off;
          ctx.moveTo(cam.sx(x), cam.sy(y)); ctx.lineTo(cam.sx(x - dirX * 0.7), cam.sy(y));
        }
      }
      ctx.stroke();
    }

    // Yo dibujo los carámbanos: tiemblan antes de caer.
    for (const c of map.icicles) {
      if (c.state === 'gone') continue;
      const shake = c.state === 'shake' ? (Math.random() - 0.5) * tile * 0.1 : 0;
      const x = cam.sx(c.x) + shake, y = cam.sy(c.fy);
      ctx.fillStyle = '#C9F1FF';
      ctx.beginPath(); ctx.moveTo(x + tile * 0.2, y); ctx.lineTo(x + tile * 0.8, y); ctx.lineTo(x + tile * 0.5, y + tile * 0.92); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.moveTo(x + tile * 0.32, y); ctx.lineTo(x + tile * 0.48, y); ctx.lineTo(x + tile * 0.5, y + tile * 0.7); ctx.closePath(); ctx.fill();
    }

    // Yo dibujo las sierras girando.
    for (const s of map.saws) {
      const cx = cam.sx(s.x + 0.5), cy = cam.sy(s.y + 0.5);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 8);
      ctx.fillStyle = BRAND.bone;
      ctx.beginPath();
      const teeth = 8;
      for (let i = 0; i < teeth * 2; i++) {
        const r = (i % 2 ? 0.34 : 0.5) * tile;
        const a = (i / (teeth * 2)) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = BRAND.coral;
      ctx.beginPath(); ctx.arc(0, 0, tile * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Yo dibujo las banderas de control.
    for (const k of map.checkpoints) {
      const x = cam.sx(k.x), y = cam.sy(k.y);
      ctx.fillStyle = BRAND.bone;
      ctx.fillRect(x + tile * 0.2, y + tile * 0.05, Math.max(2, tile * 0.08), tile * 0.95);
      const wave = Math.sin(time * 6) * tile * 0.05;
      ctx.fillStyle = k.active ? BRAND.gold : 'rgba(244,238,223,.35)';
      ctx.beginPath();
      ctx.moveTo(x + tile * 0.28, y + tile * 0.08);
      ctx.lineTo(x + tile * 0.85, y + tile * 0.22 + wave);
      ctx.lineTo(x + tile * 0.28, y + tile * 0.45);
      ctx.closePath(); ctx.fill();
    }

    // Yo dibujo las gemas flotando.
    for (const g of map.gems) {
      if (g.taken) continue;
      const cx = cam.sx(g.x + 0.5), cy = cam.sy(g.y + 0.5) + Math.sin(time * 3 + g.x) * tile * 0.1;
      const r = tile * 0.34;
      ctx.fillStyle = 'rgba(255,194,61,.22)';
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = BRAND.gold;
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.75, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.75, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFF4CC';
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx - r * 0.75, cy); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
    }

    // Yo dibujo al jugador si está vivo.
    const p = game.player;
    if (p && p.alive) {
      drawPlayer(ctx, game.skin, p, cam.sx(p.x + p.w / 2), cam.sy(p.y + p.h), tile, time);
    }

    // Yo dibujo las partículas encima de todo.
    game.particles.draw(ctx, cam);

    // Yo aplico un destello de pantalla al morir o completar.
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${game.flash * 0.35})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}

export { BRAND, resolveColor };
