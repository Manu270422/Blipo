// Yo genero niveles procedurales con semilla: siempre el mismo nivel para la misma semilla.
// Yo construyo una ruta de plataformas de izquierda a derecha respetando el alcance del salto,
// así garantizo que todo nivel generado se pueda completar.
import { GRID } from '../config.js';
import { Rng } from '../core/Random.js';
import { T } from './tiles.js';

// Yo limito un número a un rango.
const clampi = (v, a, b) => Math.max(a, Math.min(b, v));

export function generateLevel(seed, difficulty = 0.3) {
  const rng = new Rng(seed);
  const d = clampi(difficulty, 0, 1);
  const { COLS, ROWS } = GRID;
  // Yo empiezo con todo vacío.
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(T.EMPTY));
  // Yo escribo una celda solo si está dentro del mapa.
  const put = (x, y, c) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) g[y][x] = c; };
  const at = (x, y) => (x >= 0 && x < COLS && y >= 0 && y < ROWS ? g[y][x] : T.GROUND);

  // Yo levanto techo, piso y muros laterales.
  for (let x = 0; x < COLS; x++) { put(x, 0, T.GROUND); put(x, ROWS - 1, T.GROUND); put(x, ROWS - 2, T.SPIKE_UP); }
  for (let y = 0; y < ROWS; y++) { put(0, y, T.GROUND); put(COLS - 1, y, T.GROUND); }

  // Yo dibujo una plataforma: sólida hasta el piso (pilar) o flotante.
  const platform = (x0, w, y, { pillar = true, crumble = false } = {}) => {
    for (let x = x0; x < x0 + w; x++) {
      if (crumble) { put(x, y, T.CRUMBLE); continue; }
      put(x, y, T.GROUND);
      if (pillar) for (let yy = y + 1; yy < ROWS - 1; yy++) put(x, yy, yy === y + 1 ? T.GROUND : T.FILL);
    }
  };

  // Yo defino los rangos de dificultad.
  const gapMin = d < 0.35 ? 2 : 3;
  const gapMax = d < 0.35 ? 3 : d < 0.7 ? 4 : 5;
  const maxUp = d < 0.3 ? 2 : 3;
  const wMin = d < 0.5 ? 3 : 2;
  const wMax = d < 0.5 ? 5 : 4;

  // Yo creo la plataforma de salida.
  let y = rng.int(12, 17);
  const startW = 4;
  platform(1, startW, y);
  const start = [2, y - 1];
  let x = 1 + startW;
  const plats = [{ x0: 1, w: startW, y }];
  const gaps = [];
  let prevBounce = false;

  // Yo encadeno plataformas hasta acercarme al muro derecho.
  while (x < COLS - 8) {
    const gap = rng.int(gapMin, gapMax);
    let w = rng.int(wMin, wMax);
    let ny;
    // Yo decido si esta plataforma lleva resorte para subir mucho.
    const wantsBounce = !prevBounce && y >= 12 && rng.chance(0.12 + d * 0.15);
    if (prevBounce) ny = y - rng.int(5, 6);
    else ny = y + rng.int(-maxUp, 4);
    ny = clampi(ny, 6, 18);
    const nx = x + gap;
    // Yo evito salirme del mapa con la plataforma.
    if (nx + w > COLS - 4) w = Math.max(2, COLS - 4 - nx);
    // Yo elijo el tipo de plataforma.
    const crumble = !prevBounce && w <= 3 && rng.chance(0.08 + d * 0.22);
    const pillar = !crumble && rng.chance(0.55);
    platform(nx, w, ny, { pillar, crumble });
    gaps.push({ x0: x, x1: nx - 1, yTop: Math.min(y, ny) });

    // Yo coloco un resorte en esta nueva plataforma si toca.
    prevBounce = false;
    if (wantsBounce && !crumble && ny >= 11) { put(nx + Math.floor(w / 2), ny, T.BOUNCE); prevBounce = true; }

    // Yo agrego un obstáculo sobre plataformas anchas (pincho o sierra).
    if (!crumble && !prevBounce && w >= 4 && rng.chance(0.3 + d * 0.5)) {
      const ox = nx + 1 + rng.int(0, w - 3);
      put(ox, ny - 1, rng.chance(0.25 + d * 0.3) ? T.SAW : T.SPIKE_UP);
    }

    // Yo cuelgo pinchos del techo sobre el hueco en dificultad alta.
    const cy = Math.min(y, ny) - 5;
    if (d > 0.4 && cy >= 1 && rng.chance(d * 0.5)) {
      for (let hx = x; hx < nx; hx++) if (at(hx, cy) === T.EMPTY && at(hx, cy - 1) === T.EMPTY) { put(hx, cy - 1, T.GROUND); put(hx, cy, T.SPIKE_DOWN); }
    }

    plats.push({ x0: nx, w, y: ny });
    x = nx + w;
    y = ny;
  }

  // Yo conecto la última plataforma con la salida en el muro derecho.
  const lastGap = Math.max(1, Math.min(3, COLS - 1 - x - 2));
  const fx = x + lastGap;
  let fy = prevBounce ? clampi(y - 5, 6, 18) : clampi(y + rng.int(-2, 2), 6, 18);
  platform(fx, COLS - 1 - fx, fy);
  gaps.push({ x0: x, x1: fx - 1, yTop: Math.min(y, fy) });
  for (let ey = fy - 3; ey <= fy - 1; ey++) put(COLS - 1, ey, T.EXIT);

  // Yo coloco una bandera de control a mitad de camino en niveles difíciles.
  if (d >= 0.5 && plats.length > 4) {
    const p = plats[Math.floor(plats.length / 2)];
    const kx = p.x0;
    if (at(kx, p.y) === T.GROUND && at(kx, p.y - 1) === T.EMPTY) put(kx, p.y - 1, T.CHECKPOINT);
  }

  // Yo reparto 3 gemas sobre los huecos (recompensan saltos arriesgados).
  const gemSlots = gaps
    .map((gp) => ({ x: Math.floor((gp.x0 + gp.x1) / 2), y: gp.yTop - 2 - (rng.chance(0.4) ? 1 : 0) }))
    .filter((p) => at(p.x, p.y) === T.EMPTY && p.y > 1);
  // Yo elijo gemas separadas entre sí.
  const chosen = [];
  const step = gemSlots.length / 3;
  for (let i = 0; i < 3 && i * step < gemSlots.length; i++) chosen.push(gemSlots[Math.floor(i * step + step / 2)] || gemSlots[i]);
  // Yo completo con gemas sobre plataformas si faltan.
  for (let i = 1; chosen.length < 3 && i < plats.length; i++) {
    const p = plats[i];
    const gx = p.x0 + Math.floor(p.w / 2);
    if (at(gx, p.y - 2) === T.EMPTY && !chosen.some((c) => c.x === gx)) chosen.push({ x: gx, y: p.y - 2 });
  }
  chosen.slice(0, 3).forEach((c) => put(c.x, c.y, T.GEM));

  // Yo calculo el tiempo par a partir de la cantidad de plataformas.
  const par = Math.round(7 + plats.length * 1.4 + d * 6);
  return { start, par, rows: g.map((r) => r.join('')) };
}
