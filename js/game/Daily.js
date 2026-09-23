// Yo calculo fechas del reto diario en la zona horaria local del jugador.
import { DAILY_EPOCH } from '../config.js';

// Yo convierto una fecha a llave "AAAA-MM-DD".
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Yo devuelvo la llave de ayer.
export function yesterdayKey(d = new Date()) {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return dateKey(y);
}

// Yo numero el reto diario desde la fecha cero.
export function dailyNumber(d = new Date()) {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((utc - DAILY_EPOCH) / 86400000) + 1;
}

// Yo calculo cuánto falta para el siguiente reto (medianoche local).
export function msToNextDaily(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}
