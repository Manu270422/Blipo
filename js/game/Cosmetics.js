// Yo manejo los cosméticos de Blipo: sombreros, estelas y explosiones al morir.
// Yo no vendo ventajas: todo es estético, se gana jugando bien (medallas, jefes, misiones) o con chispas.
import { WORLDS } from '../levels/worlds.js';

// Yo describo cada catálogo. "price" se compra con chispas; "unlock" se gana con una meta de juego.
export const COSMETICS = {
  hats: [
    { id: 'none' },
    { id: 'cap', price: 150 },
    { id: 'beanie', price: 220 },
    { id: 'tophat', price: 450 },
    { id: 'party', unlock: { type: 'missions', n: 5 } },
    { id: 'miner', unlock: { type: 'boss', world: 1 } },
    { id: 'viking', unlock: { type: 'bosses', n: 3 } },
    { id: 'wizard', unlock: { type: 'streak', n: 7 } },
    { id: 'halo', unlock: { type: 'flawless', n: 10 } },
    { id: 'crown', unlock: { type: 'gold', n: 15 } },
  ],
  trails: [
    { id: 'classic' },
    { id: 'bubbles', price: 250 },
    { id: 'sparkle', unlock: { type: 'gold', n: 3 } },
    { id: 'fire', unlock: { type: 'boss', world: 2 } },
    { id: 'snow', unlock: { type: 'boss', world: 3 } },
    { id: 'void', unlock: { type: 'boss', world: 4 } },
    { id: 'rainbow', unlock: { type: 'gold', n: 30 } },
  ],
  bursts: [
    { id: 'classic' },
    { id: 'confetti', price: 200 },
    { id: 'pixels', price: 300 },
    { id: 'rubble', unlock: { type: 'boss', world: 0 } },
    { id: 'stars', unlock: { type: 'stars', n: 60 } },
    { id: 'hearts', unlock: { type: 'missions', n: 15 } },
  ],
};

// Yo relaciono cada catálogo con la llave que se equipa en el guardado.
export const SLOT = { hats: 'hat', trails: 'trail', bursts: 'burst' };

// Yo cuento los jefes derrotados (arena superada en cada mundo).
const bossesBeaten = (p) => WORLDS.filter((w) => p.record(w.id, w.count - 1)?.cleared).length;

// Yo devuelvo el progreso hacia una meta: { have, need }.
export function unlockProgress(unlock, d, p) {
  switch (unlock.type) {
    case 'gold': return { have: p.countMedals(3), need: unlock.n };
    case 'missions': return { have: d.stats.missions || 0, need: unlock.n };
    case 'boss': return { have: p.record(unlock.world, WORLDS[unlock.world].count - 1)?.cleared ? 1 : 0, need: 1 };
    case 'bosses': return { have: bossesBeaten(p), need: unlock.n };
    case 'streak': return { have: d.daily.bestStreak, need: unlock.n };
    case 'flawless': return { have: d.stats.flawless, need: unlock.n };
    case 'stars': return { have: p.totalStars(), need: unlock.n };
    default: return { have: 0, need: 1 };
  }
}

export class Wardrobe {
  // Yo trabajo sobre el guardado y el progreso.
  constructor(storage, progress) { this.store = storage; this.progress = progress; }

  get data() { return this.store.data.cosmetics; }

  // Yo digo si un cosmético ya es del jugador (los gratuitos siempre lo son).
  owns(kind, id) {
    const item = COSMETICS[kind].find((c) => c.id === id);
    return !!item && ((!item.price && !item.unlock) || this.data.owned.includes(`${kind}:${id}`));
  }

  // Yo devuelvo lo que lleva puesto el jugador.
  look() { return { hat: this.data.hat, trail: this.data.trail, burst: this.data.burst }; }

  // Yo equipo un cosmético que ya es del jugador.
  equip(kind, id) {
    if (!this.owns(kind, id)) return false;
    this.data[SLOT[kind]] = id;
    this.store.save();
    return true;
  }

  // Yo compro un cosmético con chispas y lo equipo.
  buy(kind, id) {
    const item = COSMETICS[kind].find((c) => c.id === id);
    const w = this.store.data.wallet;
    if (!item?.price || this.owns(kind, id)) return { ok: false, reason: 'owned' };
    if (w.sparks < item.price) return { ok: false, reason: 'funds' };
    w.sparks -= item.price;
    this.data.owned.push(`${kind}:${id}`);
    this.data[SLOT[kind]] = id;
    this.store.save();
    return { ok: true };
  }

  // Yo entrego los cosméticos cuyas metas ya se cumplieron y devuelvo los nuevos para anunciarlos.
  checkUnlocks() {
    const d = this.store.data;
    const fresh = [];
    for (const kind of Object.keys(COSMETICS)) {
      for (const item of COSMETICS[kind]) {
        if (!item.unlock || this.data.owned.includes(`${kind}:${item.id}`)) continue;
        const { have, need } = unlockProgress(item.unlock, d, this.progress);
        if (have >= need) { this.data.owned.push(`${kind}:${item.id}`); fresh.push({ kind, id: item.id }); }
      }
    }
    if (fresh.length) { d._newCosmetic = true; this.store.save(); }
    return fresh;
  }
}

// ============== EFECTOS ==============

// Yo calculo un color del arcoíris que avanza con el tiempo.
const rainbow = (time, k = 0) => `hsl(${(time * 140 + k * 47) % 360}deg 90% 62%)`;

// Yo suelto una partícula de estela con el estilo elegido (x, y en tiles; "color" es el de la skin).
export function emitTrail(particles, style, x, y, color, time) {
  switch (style) {
    case 'bubbles':
      particles.emit(x, y, { count: 1, color: 'rgba(170,230,255,.85)', speed: 0.5, life: 0.9, gravity: -2.5, size: 0.2, angle: -Math.PI / 2, spread: 1.2, shape: 'ring' });
      break;
    case 'sparkle':
      particles.emit(x, y, { count: 1, color: Math.random() < 0.5 ? '#FFC23D' : '#FFF4CC', speed: 0.8, life: 0.7, gravity: 0, size: 0.22, spread: Math.PI * 2, shape: 'star', spin: 6 });
      break;
    case 'fire':
      particles.emit(x, y, { count: 1, color: Math.random() < 0.5 ? '#FF9A3D' : '#FF5D4A', speed: 1, life: 0.5, gravity: -7, size: 0.18, angle: -Math.PI / 2, spread: 0.9, shape: 'circle' });
      break;
    case 'snow':
      particles.emit(x, y, { count: 1, color: '#F4FCFF', speed: 0.6, life: 0.9, gravity: 1.5, size: 0.2, spread: Math.PI * 2, shape: 'flake', spin: 3 });
      break;
    case 'void':
      particles.emit(x, y, { count: 1, color: Math.random() < 0.6 ? '#C3A6FF' : '#FF4FD8', speed: 0.7, life: 0.8, gravity: 0, size: 0.18, spread: Math.PI * 2, shape: 'star', spin: 2 });
      break;
    case 'rainbow':
      particles.emit(x, y, { count: 1, color: rainbow(time), speed: 0.6, life: 0.7, gravity: -2, size: 0.18, angle: -Math.PI / 2, spread: 0.8, shape: 'circle' });
      break;
    default:
      particles.emit(x, y, { count: 1, color, speed: 0.6, life: 0.6, gravity: -3, size: 0.12, angle: -Math.PI / 2, spread: 0.8 });
  }
}

// Yo hago explotar a Blipo al morir con el estilo elegido.
export function emitBurst(particles, style, x, y, color) {
  switch (style) {
    case 'confetti': {
      const cols = ['#FF5D4A', '#FFC23D', '#2DE1C2', '#9B6BFF', '#F4EEDF'];
      particles.emit(x, y, { count: 34, color: (i) => cols[i % cols.length], speed: 8, life: 1.1, gravity: 10, size: 0.16, drag: 0.92 });
      break;
    }
    case 'pixels':
      particles.emit(x, y, { count: 16, color, speed: 5, life: 0.9, gravity: 14, size: 0.3 });
      particles.emit(x, y, { count: 6, color: '#FFFFFF', speed: 4, life: 0.6, gravity: 10, size: 0.24 });
      break;
    case 'rubble':
      particles.emit(x, y, { count: 20, color: (i) => (i % 2 ? '#8C93AD' : '#5C6178'), speed: 7, life: 0.9, gravity: 24, size: 0.24, spin: 8 });
      break;
    case 'stars':
      particles.emit(x, y, { count: 18, color: (i) => (i % 3 ? '#FFC23D' : '#FFF4CC'), speed: 6, life: 0.9, gravity: 6, size: 0.3, shape: 'star', spin: 8 });
      break;
    case 'hearts':
      particles.emit(x, y, { count: 14, color: (i) => (i % 2 ? '#FF4FD8' : '#FF5D4A'), speed: 5, life: 1, gravity: -2, size: 0.32, shape: 'heart', drag: 0.9 });
      break;
    default:
      particles.emit(x, y, { count: 28, color, speed: 7, life: 0.7, gravity: 12, size: 0.16 });
      particles.emit(x, y, { count: 8, color: '#FFFFFF', speed: 5, life: 0.7, gravity: 12, size: 0.16 });
  }
}
