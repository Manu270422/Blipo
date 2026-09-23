// Yo implemento un generador pseudoaleatorio con semilla para que los niveles sean reproducibles.
export function mulberry32(seed) {
  // Yo normalizo la semilla a entero de 32 bits.
  let a = seed >>> 0;
  // Yo devuelvo una función que produce números entre 0 y 1.
  return function next() {
    // Yo aplico el algoritmo mulberry32.
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Yo convierto un texto en una semilla numérica (hash FNV-1a).
export function hashString(str) {
  // Yo arranco con la base FNV.
  let h = 2166136261;
  // Yo mezclo cada carácter.
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Yo devuelvo el hash sin signo.
  return h >>> 0;
}

// Yo envuelvo el generador con utilidades cómodas.
export class Rng {
  // Yo creo el generador a partir de la semilla.
  constructor(seed) { this.next = mulberry32(seed); }
  // Yo devuelvo un float en [a, b).
  float(a = 0, b = 1) { return a + (b - a) * this.next(); }
  // Yo devuelvo un entero en [a, b] inclusivo.
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  // Yo devuelvo true con la probabilidad dada.
  chance(p) { return this.next() < p; }
  // Yo elijo un elemento al azar.
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}
