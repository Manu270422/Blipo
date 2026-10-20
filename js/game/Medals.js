// Yo calculo las medallas de tiempo de un nivel: bronce (par), plata (a mitad de camino) y oro (ruta verificada).
import { GOLD } from '../levels/medals.js';

// Yo nombro las medallas en orden de valor.
export const MEDALS = ['none', 'bronze', 'silver', 'gold'];

// Yo redondeo a medio segundo para que los objetivos se lean limpios.
const half = (v) => Math.round(v * 2) / 2;

// Yo devuelvo los tres tiempos objetivo de un nivel de campaña.
export function medalTimes(level) {
  const bronze = level.par;
  const gold = Math.min(GOLD[level.id] ?? half(level.par * 0.6), bronze);
  const silver = half((bronze + gold) / 2);
  return { bronze, silver, gold };
}

// Yo devuelvo la medalla lograda con un tiempo (0 ninguna, 1 bronce, 2 plata, 3 oro).
export function medalFor(times, time) {
  if (time <= times.gold) return 3;
  if (time <= times.silver) return 2;
  if (time <= times.bronze) return 1;
  return 0;
}

// Yo calculo la siguiente medalla y cuánto falta para ella (null si ya tiene oro).
export function nextMedal(times, time) {
  const m = medalFor(times, time);
  if (m >= 3) return null;
  const target = [times.bronze, times.silver, times.gold][m];
  return { medal: m + 1, missing: Math.max(0.1, time - target) };
}
