// Yo organizo la campaña en mundos y resuelvo cualquier nivel (campaña, diario o supervivencia).
import { CAMPAIGN } from './campaign.js';
import { generateLevel } from './generator.js';
import { hashString } from '../core/Random.js';

// Yo defino cada mundo: color, música, dificultad y estrellas necesarias para abrirlo.
export const WORLDS = [
  { id: 0, key: 'w_quarry', hue: 205, music: 'w0', unlock: 0, count: CAMPAIGN.length, source: 'campaign' },
  { id: 1, key: 'w_caves', hue: 150, music: 'w1', unlock: 10, count: 10, source: 'gen', diff: [0.08, 0.35] },
  { id: 2, key: 'w_foundry', hue: 18, music: 'w2', unlock: 35, count: 10, source: 'gen', diff: [0.3, 0.58] },
  { id: 3, key: 'w_glacier', hue: 190, music: 'w3', unlock: 65, count: 10, source: 'gen', diff: [0.5, 0.8] },
  { id: 4, key: 'w_void', hue: 280, music: 'w4', unlock: 95, count: 10, source: 'gen', diff: [0.72, 1] },
];

// Yo genero la llave única de un nivel de campaña.
export const levelKey = (w, l) => `w${w}-l${l}`;

// Yo devuelvo la definición completa de un nivel de campaña.
export function getCampaignLevel(w, l) {
  const world = WORLDS[w];
  if (world.source === 'campaign') {
    const def = CAMPAIGN[l];
    return { ...def, id: levelKey(w, l), world: w, index: l, hue: world.hue, music: world.music };
  }
  // Yo interpolo la dificultad dentro del mundo.
  const t = world.count > 1 ? l / (world.count - 1) : 0;
  const diff = world.diff[0] + (world.diff[1] - world.diff[0]) * t;
  const def = generateLevel(7919 * (w + 1) + 104729 * (l + 1), diff);
  return { ...def, id: levelKey(w, l), world: w, index: l, hue: world.hue + l * 4, music: world.music };
}

// Yo devuelvo el nivel del reto diario (igual para todos los jugadores ese día).
export function getDailyLevel(dateKey) {
  const seed = hashString(`blipo-daily-${dateKey}`);
  const def = generateLevel(seed, 0.55 + (seed % 30) / 100);
  return { ...def, id: `daily-${dateKey}`, hue: seed % 360, music: 'w2' };
}

// Yo devuelvo una sala del modo supervivencia; la dificultad sube con cada sala.
export function getSurvivalLevel(runSeed, room) {
  const def = generateLevel(runSeed + room * 7727, Math.min(1, 0.15 + room * 0.06));
  return { ...def, id: `survival-${room}`, hue: (runSeed + room * 47) % 360, music: 'w4' };
}

// Yo cuento el total de niveles de campaña.
export const TOTAL_LEVELS = WORLDS.reduce((a, w) => a + w.count, 0);
