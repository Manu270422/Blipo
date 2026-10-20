// Yo grabo y reproduzco el fantasma del mejor intento de cada nivel: correr contra uno mismo engancha.
// Yo guardo 30 muestras por segundo (posición, mirada, gravedad y si está vivo) con codificación delta compacta.

const RATE = 30;               // Yo muestreo 30 veces por segundo.
const MAX_SECONDS = 240;       // Yo dejo de grabar a los 4 minutos para no inflar el guardado.
const PREFIX = 'blipo.ghost.'; // Yo guardo cada fantasma en su propia llave, fuera del guardado principal.

export class GhostRecorder {
  // Yo empiezo vacío.
  constructor() { this.frames = []; this.next = 0; }

  // Yo tomo las muestras que tocan hasta el tiempo de juego actual.
  sample(time, p) {
    while (time >= this.next && this.next < MAX_SECONDS) {
      this.frames.push(Math.round(p.x * 20), Math.round(p.y * 20), (p.facing > 0 ? 1 : 0) | (p.g < 0 ? 2 : 0) | (p.alive ? 4 : 0));
      this.next += 1 / RATE;
    }
  }

  // Yo convierto la grabación en texto corto: posiciones como diferencias en base 36.
  encode() {
    const f = this.frames;
    const out = [];
    let px = 0, py = 0;
    for (let i = 0; i < f.length; i += 3) {
      out.push((f[i] - px).toString(36), (f[i + 1] - py).toString(36), f[i + 2].toString(36));
      px = f[i]; py = f[i + 1];
    }
    return `g1|${out.join(',')}`;
  }
}

// Yo leo un fantasma guardado (o devuelvo null si no hay o está dañado).
export function decodeGhost(str) {
  if (!str || !str.startsWith('g1|')) return null;
  const parts = str.slice(3).split(',');
  if (parts.length < 3 || parts.length % 3) return null;
  const frames = new Float32Array(parts.length);
  let x = 0, y = 0;
  for (let i = 0; i < parts.length; i += 3) {
    x += parseInt(parts[i], 36); y += parseInt(parts[i + 1], 36);
    frames[i] = x / 20; frames[i + 1] = y / 20; frames[i + 2] = parseInt(parts[i + 2], 36);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
  }
  return { frames, count: parts.length / 3 };
}

// Yo devuelvo dónde estaba el fantasma en un instante (interpolado), o null si ya terminó.
export function ghostAt(ghost, time) {
  const k = time * RATE;
  const i = Math.floor(k);
  if (!ghost || i < 0 || i >= ghost.count - 1) return null;
  const f = ghost.frames, a = i * 3, b = a + 3, t = k - i;
  const flags = f[a + 2];
  // Yo no interpolo saltos grandes (reaparición tras morir).
  const jump = Math.abs(f[b] - f[a]) > 2 || Math.abs(f[b + 1] - f[a + 1]) > 2;
  return {
    x: jump ? f[a] : f[a] + (f[b] - f[a]) * t,
    y: jump ? f[a + 1] : f[a + 1] + (f[b + 1] - f[a + 1]) * t,
    vx: jump ? 0 : (f[b] - f[a]) * RATE,
    vy: jump ? 0 : (f[b + 1] - f[a + 1]) * RATE,
    facing: flags & 1 ? 1 : -1,
    g: flags & 2 ? -1 : 1,
    alive: !!(flags & 4),
  };
}

// Yo guardo y leo fantasmas en el almacenamiento del navegador (sin romper nada si no hay espacio).
export const ghostStore = {
  load(id) {
    try { return localStorage.getItem(PREFIX + id); } catch { return null; }
  },
  save(id, data) {
    try { localStorage.setItem(PREFIX + id, data); return true; } catch { return false; }
  },
  // Yo borro los fantasmas de retos diarios viejos (solo sirve el de hoy).
  pruneDaily(keepId) {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${PREFIX}daily-`) && k !== PREFIX + keepId) localStorage.removeItem(k);
      }
    } catch { /* Yo ignoro navegadores sin almacenamiento. */ }
  },
  // Yo borro todos los fantasmas (al borrar el progreso).
  clear() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
      }
    } catch { /* Yo ignoro navegadores sin almacenamiento. */ }
  },
};
