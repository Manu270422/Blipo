// Yo dibujo los sombreros de Blipo. Me llaman dentro de drawPlayer, así que me estiro y aplasto con el cuerpo.
// Yo trabajo en coordenadas locales: el origen está en los pies, "top" es la coronilla y "s" el tamaño del tile.

const GOLD = '#FFC23D', CORAL = '#FF5D4A', BONE = '#F4EEDF', INK = '#1A1433', TEAL = '#2DE1C2';

// Yo dibujo un sombrero por id; "w" es el ancho del cuerpo.
export function drawHat(ctx, id, top, w, s, time) {
  if (!id || id === 'none') return;
  const base = top + s * 0.08;
  ctx.save();
  switch (id) {
    case 'cap': {
      // Yo dibujo una gorra coral con visera y botón.
      ctx.fillStyle = CORAL;
      ctx.beginPath(); ctx.arc(0, base, w * 0.34, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#C8402F';
      ctx.beginPath(); ctx.ellipse(w * 0.3, base, w * 0.3, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(0, base - w * 0.34, s * 0.04, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'beanie': {
      // Yo dibujo un gorro de lana a rayas con pompón.
      ctx.fillStyle = TEAL;
      ctx.beginPath(); ctx.arc(0, base, w * 0.36, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      for (let i = 1; i < 3; i++) ctx.fillRect(-w * 0.36, base - w * 0.12 * i, w * 0.72, s * 0.03);
      ctx.fillStyle = '#169C95'; ctx.fillRect(-w * 0.38, base - s * 0.06, w * 0.76, s * 0.09);
      ctx.fillStyle = BONE;
      ctx.beginPath(); ctx.arc(0, base - w * 0.38, s * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'party': {
      // Yo dibujo un gorro de fiesta inclinado con rayas y pompón.
      ctx.translate(w * 0.06, base); ctx.rotate(0.18);
      const hh = s * 0.55, bw = w * 0.26;
      ctx.fillStyle = '#9B6BFF';
      ctx.beginPath(); ctx.moveTo(-bw, 0); ctx.lineTo(0, -hh); ctx.lineTo(bw, 0); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = GOLD;
      for (let i = 0; i < 4; i++) ctx.fillRect(-bw, -hh * (0.15 + i * 0.25), bw * 2, hh * 0.09);
      ctx.restore();
      ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(0, -hh, s * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'tophat': {
      // Yo dibujo un sombrero de copa elegante con cinta coral.
      ctx.fillStyle = INK;
      ctx.fillRect(-w * 0.42, base - s * 0.05, w * 0.84, s * 0.07);
      ctx.fillRect(-w * 0.26, base - s * 0.5, w * 0.52, s * 0.46);
      ctx.fillStyle = CORAL; ctx.fillRect(-w * 0.26, base - s * 0.16, w * 0.52, s * 0.08);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-w * 0.2, base - s * 0.48, w * 0.08, s * 0.3);
      break;
    }
    case 'miner': {
      // Yo dibujo un casco minero amarillo con lámpara encendida.
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(0, base, w * 0.38, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#D9901A'; ctx.fillRect(-w * 0.44, base - s * 0.04, w * 0.88, s * 0.06);
      const glow = 0.55 + Math.sin(time * 4) * 0.15;
      ctx.fillStyle = `rgba(255,244,204,${glow * 0.45})`;
      ctx.beginPath(); ctx.arc(0, base - w * 0.22, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF4CC'; ctx.beginPath(); ctx.arc(0, base - w * 0.22, s * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'viking': {
      // Yo dibujo un casco vikingo con dos cuernos.
      ctx.fillStyle = BONE;
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(d * w * 0.28, base - s * 0.1);
        ctx.quadraticCurveTo(d * w * 0.62, base - s * 0.15, d * w * 0.58, base - s * 0.48);
        ctx.quadraticCurveTo(d * w * 0.46, base - s * 0.25, d * w * 0.2, base - s * 0.22);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8C93AD';
      ctx.beginPath(); ctx.arc(0, base, w * 0.36, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5C6178'; ctx.fillRect(-w * 0.4, base - s * 0.05, w * 0.8, s * 0.07);
      break;
    }
    case 'wizard': {
      // Yo dibujo un sombrero de mago curvado con estrellitas.
      ctx.fillStyle = '#4B2C9E';
      ctx.beginPath(); ctx.ellipse(0, base - s * 0.01, w * 0.48, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, base - s * 0.03);
      ctx.quadraticCurveTo(-w * 0.1, base - s * 0.5, w * 0.34, base - s * 0.72);
      ctx.quadraticCurveTo(w * 0.05, base - s * 0.35, w * 0.3, base - s * 0.03);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = GOLD;
      for (const [sx, sy, r] of [[-0.05, 0.22, 0.045], [0.12, 0.42, 0.035], [0.02, 0.1, 0.03]]) {
        star(ctx, w * sx, base - s * sy, s * r * (1 + Math.sin(time * 5 + sx * 10) * 0.25));
      }
      break;
    }
    case 'halo': {
      // Yo dibujo una aureola dorada que flota y brilla sobre la cabeza.
      const y = base - s * 0.22 + Math.sin(time * 3) * s * 0.03;
      ctx.strokeStyle = 'rgba(255,194,61,.35)'; ctx.lineWidth = Math.max(2, s * 0.1);
      ctx.beginPath(); ctx.ellipse(0, y, w * 0.32, s * 0.08, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = GOLD; ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.beginPath(); ctx.ellipse(0, y, w * 0.32, s * 0.08, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'crown': {
      // Yo dibujo una corona de oro con tres puntas y gemas: el premio a los mejores.
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(-w * 0.34, base);
      ctx.lineTo(-w * 0.38, base - s * 0.3); ctx.lineTo(-w * 0.17, base - s * 0.16);
      ctx.lineTo(0, base - s * 0.38); ctx.lineTo(w * 0.17, base - s * 0.16);
      ctx.lineTo(w * 0.38, base - s * 0.3); ctx.lineTo(w * 0.34, base);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#D9901A'; ctx.fillRect(-w * 0.34, base - s * 0.07, w * 0.68, s * 0.07);
      ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(0, base - s * 0.17, s * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = TEAL;
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * w * 0.2, base - s * 0.04, s * 0.03, 0, Math.PI * 2); ctx.fill(); }
      // Yo agrego un destello que recorre la corona.
      const k = (time * 0.6) % 1;
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(-w * 0.34 + k * w * 0.62, base - s * 0.3, s * 0.04, s * 0.3);
      break;
    }
    default: break;
  }
  ctx.restore();
}

// Yo dibujo una estrella de cinco puntas.
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
