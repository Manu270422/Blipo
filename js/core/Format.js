// Yo agrupo funciones de formato reutilizables.

// Yo convierto segundos a "mm:ss.d".
export function formatTime(sec) {
  // Yo protejo valores inválidos.
  if (!Number.isFinite(sec)) return '--:--.-';
  // Yo calculo minutos, segundos y décimas.
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const d = Math.floor((sec * 10) % 10);
  // Yo armo el texto con ceros a la izquierda.
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
}

// Yo convierto segundos largos a "1h 20m".
export function formatDuration(sec) {
  // Yo calculo horas y minutos.
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  // Yo muestro horas solo si existen.
  return h > 0 ? `${h}h ${m}m` : `${m}m ${Math.floor(sec % 60)}s`;
}

// Yo formateo números grandes con separadores locales.
export function formatNumber(n) { return Number(n || 0).toLocaleString(); }

// Yo limito un valor entre dos extremos.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Yo interpolo linealmente.
export const lerp = (a, b, t) => a + (b - a) * t;
