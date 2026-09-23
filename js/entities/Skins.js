// Yo defino las skins de Blipo y cómo se dibuja cada una en el canvas.

// Yo describo cada skin: forma, colores, precio y estela.
export const SKINS = [
  { id: 'blipo', shape: 'drop', body: '#23CFC0', accent: '#169C95', eye: '#10131F', shine: '#C8FFF7', trail: '#5EF2E0', price: 0 },
  { id: 'flama', shape: 'flame', body: '#FF5D4A', accent: '#FF5D4A', grad: ['#FFF6E0', '#FFC23D', '#FF5D4A'], eye: '#10131F', shine: '#FFFFFF', trail: '#FF9A3D', price: 0 },
  { id: 'menta', shape: 'drop', body: '#7BE39B', accent: '#43B36A', eye: '#10131F', shine: '#E9FFF0', trail: '#A8F5BF', price: 120 },
  { id: 'uva', shape: 'drop', body: '#9B6BFF', accent: '#6C3FD6', eye: '#10131F', shine: '#E7DCFF', trail: '#C3A6FF', price: 180 },
  { id: 'fantasma', shape: 'ghost', body: '#E9ECF5', accent: '#AEB6CC', eye: '#2A2F45', shine: '#FFFFFF', trail: '#E9ECF5', alpha: 0.82, price: 260 },
  { id: 'brasa', shape: 'flame', body: '#8B2FC9', accent: '#8B2FC9', grad: ['#FFE3FF', '#FF4FD8', '#8B2FC9'], eye: '#10131F', shine: '#FFFFFF', trail: '#FF4FD8', price: 340 },
  { id: 'carbon', shape: 'drop', body: '#3A3F52', accent: '#23263A', eye: '#FF5D4A', shine: '#8C93AD', trail: '#FF5D4A', price: 420 },
  { id: 'oro', shape: 'drop', body: '#FFC23D', accent: '#D9901A', eye: '#10131F', shine: '#FFF4CC', trail: '#FFE08A', price: 700 },
  { id: 'prisma', shape: 'drop', body: 'rainbow', accent: 'rainbow', eye: '#10131F', shine: '#FFFFFF', trail: 'rainbow', price: 1200 },
];

// Yo busco una skin por id con respaldo a la original.
export const getSkin = (id) => SKINS.find((s) => s.id === id) || SKINS[0];

// Yo resuelvo colores dinámicos (arcoíris).
export function resolveColor(c, time, offset = 0) {
  if (c !== 'rainbow') return c;
  return `hsl(${(time * 90 + offset) % 360}deg 85% 62%)`;
}

// Yo dibujo un rectángulo redondeado con radios distintos arriba y abajo.
function roundShape(ctx, x, y, w, h, rt, rb) {
  ctx.beginPath();
  ctx.moveTo(x + rt, y);
  ctx.lineTo(x + w - rt, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rt);
  ctx.lineTo(x + w, y + h - rb);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rb, y + h);
  ctx.lineTo(x + rb, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rb);
  ctx.lineTo(x, y + rt);
  ctx.quadraticCurveTo(x, y, x + rt, y);
  ctx.closePath();
}

// Yo dibujo al jugador. (cx, by) es el centro inferior en píxeles y s el tamaño del tile.
export function drawPlayer(ctx, skin, state, cx, by, s, time) {
  const body = resolveColor(skin.body, time);
  const accent = resolveColor(skin.accent, time, 40);
  // Yo calculo el parpadeo cada ~4 segundos (igual que la animación "blink" del prototipo).
  const cyc = (time + (state.blinkSeed || 0)) % 4;
  const lid = cyc < 0.2 ? 0.6 : cyc < 0.4 ? 1 : cyc < 0.6 ? 0.4 : 0;
  // Yo miro hacia donde me muevo.
  const look = Math.max(-1, Math.min(1, (state.vx || 0) / 8.5)) * 0.08 * s + state.facing * 0.02 * s;
  const lookY = Math.max(-1, Math.min(1, (state.vy || 0) / 15)) * 0.05 * s;

  ctx.save();
  ctx.translate(cx, by);
  // Yo inclino el cuerpo al correr (el "skewX" del prototipo).
  const skew = Math.max(-1, Math.min(1, -(state.vx || 0) / 8.5)) * 0.18;
  ctx.transform(1, 0, skew, 1, 0, 0);
  // Yo aplico el estiramiento.
  ctx.scale(state.sqX || 1, state.sqY || 1);
  if (skin.alpha) ctx.globalAlpha = skin.alpha;

  const w = s * 0.82, h = s * 0.96;
  const x = -w / 2, y = -h;

  if (skin.shape === 'flame') {
    // Yo dibujo la forma del "player2" original: redondeado arriba, recto abajo, con degradado.
    roundShape(ctx, x, y, w, h, w * 0.5, s * 0.14);
    const g = ctx.createLinearGradient(0, 0, 0, y);
    g.addColorStop(0, skin.grad[0]); g.addColorStop(0.35, skin.grad[1]); g.addColorStop(0.7, skin.grad[2]);
    ctx.fillStyle = g;
    ctx.fill();
  } else if (skin.shape === 'ghost') {
    // Yo dibujo un fantasma con borde ondulado que se mueve.
    ctx.beginPath();
    ctx.moveTo(x, y + w / 2);
    ctx.arc(0, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, 0);
    const waves = 4;
    for (let i = waves; i >= 0; i--) {
      const px = x + (w / waves) * i;
      const py = -((i + Math.floor(time * 6)) % 2) * s * 0.1;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
  } else {
    // Yo dibujo la gota original: más ancha abajo, orejitas arriba y patitas.
    ctx.fillStyle = accent;
    // Yo dibujo las orejas/antenas del prototipo.
    ctx.beginPath(); ctx.arc(x + w * 0.12, y + h * 0.12, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.88, y + h * 0.12, s * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, y + h * 0.55, w / 2, h * 0.47, 0, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    // Yo agrego volumen con luz arriba-izquierda y sombra abajo-derecha.
    const g = ctx.createRadialGradient(-w * 0.2, y + h * 0.3, s * 0.05, 0, y + h * 0.55, w * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Yo dibujo las patitas.
  ctx.fillStyle = skin.shape === 'flame' ? '#FFFFFF' : accent;
  const step = state.onGround && Math.abs(state.vx) > 1 ? Math.sin(time * 22) * s * 0.04 : 0;
  ctx.beginPath(); ctx.arc(-w * 0.2, -s * 0.02 - step, s * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.2, -s * 0.02 + step, s * 0.08, 0, Math.PI * 2); ctx.fill();

  // Yo dibujo el ojo único: la firma de Blipo.
  const ex = look, ey = y + h * (skin.shape === 'flame' ? 0.42 : 0.5) + lookY;
  const er = s * 0.21;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(ex, ey, er * 1.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin.eye;
  ctx.beginPath(); ctx.arc(ex + look * 0.4, ey, er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin.shine;
  ctx.beginPath(); ctx.arc(ex + er * 0.35 + look * 0.4, ey - er * 0.35, er * 0.3, 0, Math.PI * 2); ctx.fill();
  // Yo cierro el párpado de arriba hacia abajo.
  if (lid > 0) {
    ctx.fillStyle = skin.shape === 'flame' ? resolveColor(skin.grad[2], time) : accent;
    ctx.fillRect(ex - er * 1.35, ey - er * 1.35, er * 2.7, er * 2.7 * lid);
  }
  // Yo dibujo un gesto de esfuerzo al deslizar por la pared.
  if (state.sliding) {
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(ex - er, ey - er * 1.5); ctx.lineTo(ex + er, ey - er * 1.2); ctx.stroke();
  }
  ctx.restore();
}
