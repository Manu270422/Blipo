// Yo compruebo que cada nivel hecho a mano se puede terminar y que sus 3 gemas son alcanzables.
// Yo uso la misma física del juego (Player + TileMap) y busco una ruta con A* sobre las entradas del jugador.
// Uso: node tools/check-levels.mjs            → revisa todos los mundos hechos a mano
//      node tools/check-levels.mjs 2 4        → revisa solo el nivel 5 del mundo 3
import { pathToFileURL } from 'node:url';
import { GAME, PHYS } from '../js/config.js';
import { TileMap } from '../js/engine/TileMap.js';
import { Player } from '../js/entities/Player.js';
import { T, SOLID } from '../js/levels/tiles.js';
import { WORLDS, getCampaignLevel } from '../js/levels/worlds.js';

const DT = GAME.STEP;
// Yo excluyo del mapa de distancias las celdas que matan.
const DEADLY = new Set([T.SPIKE_UP, T.SPIKE_DOWN, T.SPIKE_LEFT, T.SPIKE_RIGHT, T.SAW]);
// Yo decido cada 6 pasos de física (20 decisiones por segundo).
const CHUNK = 6;
// Yo pruebo izquierda/quieto/derecha, con o sin el botón de salto presionado.
const ACTIONS = [];
for (const dir of [-1, 0, 1]) for (const jump of [0, 1]) ACTIONS.push({ dir, jump });
const MAX_NODES = Number(process.env.NODES) || 1_000_000;
// Yo pondero la heurística para encontrar rutas rápido (no necesito la ruta perfecta).
const WEIGHT = 4;

// Yo copio solo el estado dinámico del mapa (la grilla, gemas y resortes se comparten).
function cloneMap(m) {
  const c = Object.assign(Object.create(TileMap.prototype), m);
  if (m.crumbles.length) {
    c.crumbles = m.crumbles.map((o) => ({ ...o }));
    c.crumbleAt = new Map(c.crumbles.map((o) => [o.y * c.cols + o.x, o]));
  }
  if (m.movers.length) c.movers = m.movers.map((o) => Object.assign(Object.create(Object.getPrototypeOf(o)), o));
  if (m.jets.length) c.jets = m.jets.map((o) => ({ ...o }));
  if (m.icicles.length) c.icicles = m.icicles.map((o) => ({ ...o }));
  if (m.winds.length) c.winds = m.winds.map((o) => ({ ...o }));
  if (m.orbs.length) c.orbs = m.orbs.map((o) => ({ ...o }));
  if (m.switches.length) c.switches = m.switches.map((o) => ({ ...o }));
  return c;
}

// Yo copio al jugador campo por campo (mucho más rápido que Object.assign) y reconecto su plataforma.
const PLAYER_FIELDS = ['w', 'h', 'x', 'y', 'vx', 'vy', 'onGround', 'airJumps', 'coyote', 'buffer', 'lockX', 'cut', 'facing', 'wallDir', 'sliding', 'sqX', 'sqY', 'alive', 'lastCol', 'carryX', 'windX', 'onIce', 'inWeb', 'crushed', 'g'];
function clonePlayer(p, oldMap, newMap) {
  const c = Object.create(Player.prototype);
  for (const f of PLAYER_FIELDS) c[f] = p[f];
  c.riding = p.riding ? newMap.movers[oldMap.movers.indexOf(p.riding)] : null;
  return c;
}

// Yo simulo un bloque de pasos con las mismas reglas que Game.update.
function step(node, action) {
  const map = cloneMap(node.map);
  const p = clonePlayer(node.p, node.map, map);
  let { portalCd } = node;
  const held = node.held;
  const input = {
    left: action.dir < 0, right: action.dir > 0, jump: !!action.jump,
    jumpQueued: !!action.jump && !held,
    consumeJump() { const q = this.jumpQueued; this.jumpQueued = false; return q; },
  };
  let gems = node.gems;
  for (let i = 0; i < CHUNK; i++) {
    map.update(DT, p);
    portalCd = Math.max(0, portalCd - DT);
    p.update(DT, input, map, (type, data) => {
      if (type !== 'ground') return;
      for (const t of data) {
        const ch = map.get(t.x, t.y);
        if (ch === T.BOUNCE || ch === T.MUSHROOM) { p.launch(ch === T.MUSHROOM ? PHYS.MUSHROOM_VEL : PHYS.BOUNCE_VEL); break; }
        if (ch === T.CRUMBLE) map.triggerCrumble(t.x, t.y);
      }
    });
    if (p.crushed || p.y > map.rows + 1 || map.hitsHazard(p.hurtBox())) return null;
    const cx = p.cx, cy = p.cy;
    if (portalCd <= 0 && map.portalOut && map.isAt(cx, cy, T.PORTAL_IN)) {
      p.x = map.portalOut.x + (1 - p.w) / 2;
      p.y = map.portalOut.y + (1 - p.h);
      portalCd = GAME.PORTAL_COOLDOWN;
    }
    map.gems.forEach((g, gi) => { if ((g.x + 0.5 - cx) ** 2 + (g.y + 0.5 - cy) ** 2 < 0.5) gems |= 1 << gi; });
    if (map.isAt(cx, cy, T.EXIT)) return { map, p, portalCd, held: !!action.jump, gems, exit: true, t: node.t + (i + 1) * DT };
  }
  return { map, p, portalCd, held: !!action.jump, gems, exit: false, t: node.t + CHUNK * DT };
}

// Yo genero la llave que identifica estados equivalentes.
// Yo solo incluyo el ritmo de las plataformas y llamaradas cercanas: lo lejano no cambia la decisión.
function key(n) {
  const p = n.p, map = n.map;
  let k = `${Math.round(p.x * 4)},${Math.round(p.y * 4)},${Math.round(p.vx / 1.5)},${Math.round(p.vy / 2)},${p.airJumps},${n.held ? 1 : 0},${p.onGround ? 1 : 0},${p.lockX > 0 ? 1 : 0}`;
  for (let i = 0; i < map.movers.length; i++) {
    const m = map.movers[i];
    // Yo recuerdo el ritmo si estoy en el suelo (esperar sirve) o cerca de la plataforma (el salto depende de él).
    const near = Math.max(m.x - p.cx, p.cx - (m.x + m.w), 0) < 3.5 && Math.abs(m.y - p.cy) < 3.5;
    const reach = Math.max(Math.min(m.x0, m.x0 + m.dx) - p.cx, p.cx - Math.max(m.x0, m.x0 + m.dx) - m.w, 0) < 7 && Math.max(Math.min(m.y0, m.y0 + m.dy) - p.cy, p.cy - Math.max(m.y0, m.y0 + m.dy), 0) < 7;
    if (near || (p.onGround && reach)) k += `,m${i}:${Math.round((((map.time / m.period) + m.phase) % 1) * 12)}`;
  }
  if (map.jets.some((j) => Math.abs(j.x + 0.5 - p.cx) < 5 && Math.abs(j.y - p.cy) < 5)) k += `,j${Math.round((map.time % 2.4) / 0.1)}`;
  if (map.crumbles.length) k += `,${map.crumbles.map((c) => c.state[0]).join('')}`;
  // Yo recuerdo la gravedad, el interruptor, el ritmo de los bloques cercanos y qué orbes cercanos están listos.
  k += `,g${p.g},s${map.switchOn ? 1 : 0}`;
  if (map.phases.some((b) => Math.abs(b.x + 0.5 - p.cx) < 6 && Math.abs(b.y + 0.5 - p.cy) < 6)) k += `,p${Math.round((((map.time % 3) + 3) % 3) / 0.1)}`;
  for (const o of map.orbs) if (Math.abs(o.x + 0.5 - p.cx) < 3 && Math.abs(o.y + 0.5 - p.cy) < 3) k += o.armed ? ',o1' : ',o0';
  for (const sw of map.switches) if (Math.abs(sw.x + 0.5 - p.cx) < 2 && Math.abs(sw.y + 0.5 - p.cy) < 2) k += sw.armed ? ',q1' : ',q0';
  // Yo detallo los carámbanos cercanos (estado y altura) y de los lejanos solo si siguen colgando.
  for (const c of map.icicles) {
    const near = Math.abs(c.x + 0.5 - p.cx) < 6 && Math.abs(c.y - p.cy) < 12;
    k += near && c.state !== 'hang' ? `,${c.state[0]}${Math.round(c.fy * 2)}:${Math.round(c.t * 10)}` : `,${c.state === 'hang' ? 'h' : 'x'}`;
  }
  // Yo recuerdo el ritmo de las ráfagas cercanas.
  for (const w of map.winds) {
    if (!w.period || p.cx < w.x - 6 || p.cx > w.x + w.w + 6 || p.cy < w.y - 6 || p.cy > w.y + w.h + 6) continue;
    k += `,w${Math.round((((map.time + w.phase) % w.period) / 0.1))}`;
  }
  return k;
}

// Yo implemento un montículo binario mínimo para la cola de prioridad.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(v) { const a = this.a; a.push(v); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j].f <= a[i].f) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
    return top;
  }
}

// Yo calculo un mapa de distancias por la grilla (ignorando la física) para guiar la búsqueda.
// Yo trato el portal como un atajo: entrar en él cuesta lo mismo que estar en su salida.
function distanceField(map, targets) {
  const { cols, rows } = map;
  const d = new Float64Array(cols * rows).fill(Infinity);
  const open = new Heap();
  const blocked = (x, y) => SOLID.has(map.get(x, y));
  // Yo marco dónde se puede pisar (bloques y recorridos de plataformas móviles).
  const support = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (blocked(x, y) || map.get(x, y) === T.CRUMBLE) support[y * cols + x] = 1;
  // Yo trato los bloques que cambian como apoyo (a veces están).
  for (const b of [...map.toggles, ...map.phases]) support[b.y * cols + b.x] = 1;
  // Yo trato las telarañas como apoyo: se escalan a toques.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (map.get(x, y) === T.WEB) support[y * cols + x] = 1;
  // Yo trato las corrientes de aire como apoyo: suben a Blipo.
  for (const w of map.winds) {
    if (w.dir !== 'up') continue;
    for (let y = w.y; y < w.y + w.h; y++) for (let x = w.x; x < w.x + w.w; x++) if (x >= 0 && y >= 0 && x < cols && y < rows) support[y * cols + x] = 1;
  }
  for (const m of map.movers) {
    for (let y = Math.floor(Math.min(m.y0, m.y0 + m.dy)); y <= Math.ceil(Math.max(m.y0, m.y0 + m.dy)); y++) {
      for (let x = Math.floor(Math.min(m.x0, m.x0 + m.dx)); x < Math.ceil(Math.max(m.x0, m.x0 + m.dx) + m.w); x++) if (x >= 0 && y >= 0 && x < cols && y < rows) support[y * cols + x] = 1;
    }
  }
  // Yo mido cuánto aire hay debajo de cada celda: subir lejos de un apoyo es caro (no se puede volar).
  // Yo considero que junto a una pared no hay aire: ahí se sube con saltos de pared.
  const air = (x, y) => {
    if (blocked(x - 1, y) || blocked(x + 1, y)) return 0;
    let k = 0;
    while (k < 12 && y + k + 1 < rows && !support[(y + k + 1) * cols + x]) k++;
    // Yo con orbes de gravedad también cuento el aire hacia arriba: se puede caer hacia el techo.
    if (map.orbs.length) { let u = 0; while (u < k && y - u - 1 >= 0 && !support[(y - u - 1) * cols + x]) u++; k = Math.min(k, u); }
    return k;
  };
  // Yo cobro poco hasta la altura de un salto, más con el doble salto y casi prohibido por encima.
  const climbCost = (a) => (a <= 3 ? 1 : a <= 5 ? a - 2 : 25);
  for (const t of targets) { d[t.y * cols + t.x] = 0; open.push({ i: t.y * cols + t.x, f: 0 }); }
  while (open.size) {
    const { i, f } = open.pop();
    if (f > d[i]) continue;
    const x = i % cols, y = (i / cols) | 0;
    const relax = (j, nf) => { if (nf < d[j]) { d[j] = nf; open.push({ i: j, f: nf }); } };
    if (map.portalOut && x === map.portalOut.x && y === map.portalOut.y) for (const pi of map.portalsIn) relax(pi.y * cols + pi.x, f);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || blocked(nx, ny) || DEADLY.has(map.get(nx, ny))) continue;
      // Yo recorro al revés: el jugador va de (nx,ny) a (x,y); si eso es subir, cobro según el aire debajo.
      const base = dx && dy ? 1.414 : 1;
      relax(ny * cols + nx, f + (y < ny ? base * climbCost(air(x, y)) : base));
    }
  }
  return (px, py) => {
    const x = Math.floor(px), y = Math.floor(py);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return 999;
    const v = d[y * cols + x];
    return v === Infinity ? 999 : v;
  };
}

// Yo busco una ruta hasta la salida; si me piden una gema, exijo recogerla antes de salir.
function search(start, gemIndex = -1) {
  const map = start.map;
  const toExit = distanceField(map, map.exits);
  const gem = gemIndex >= 0 ? map.gems[gemIndex] : null;
  const toGem = gem ? distanceField(map, [gem]) : null;
  const gemToExit = gem ? toExit(gem.x + 0.5, gem.y + 0.5) : 0;
  const bit = gem ? 1 << gemIndex : 0;
  const h = (n) => (gem && !(n.gems & bit) ? toGem(n.p.cx, n.p.cy) + gemToExit : toExit(n.p.cx, n.p.cy)) / PHYS.MOVE_SPEED;
  const k0 = (n) => `${key(n)},${n.gems & bit ? 1 : 0}`;
  const seen = new Set([k0(start)]);
  const open = new Heap();
  open.push({ n: start, f: h(start) * WEIGHT });
  let expanded = 0;
  let closest = start, closestH = h(start);
  while (open.size && expanded < MAX_NODES) {
    const { n } = open.pop();
    expanded++;
    const hn = h(n);
    if (hn < closestH) { closest = n; closestH = hn; }
    for (const a of ACTIONS) {
      const c = step(n, a);
      if (!c) continue;
      if (c.exit) { if (!gem || c.gems & bit) return { node: c, expanded }; continue; }
      const k = k0(c);
      if (seen.has(k)) continue;
      seen.add(k);
      open.push({ n: c, f: c.t + h(c) * WEIGHT });
    }
  }
  return { node: null, expanded, closest: closest.p };
}

// Yo reviso un nivel completo: ruta a la salida y a cada gema (y de ahí a la salida).
export function checkLevel(level) {
  const map = new TileMap(level);
  const p = new Player(map.start.x, map.start.y);
  const root = { map, p, portalCd: 0, held: false, gems: 0, exit: false, t: 0 };
  const out = { id: level.id, name: level.name, size: `${map.cols}x${map.rows}`, ok: true, notes: [] };
  if (map.gems.length !== 3) { out.ok = false; out.notes.push(`tiene ${map.gems.length} gemas (deben ser 3)`); }
  const exit = search(root);
  if (!exit.node) { out.ok = false; out.notes.push(`sin ruta a la salida (${exit.expanded} estados; llegué hasta x=${exit.closest.cx.toFixed(1)} y=${exit.closest.cy.toFixed(1)})`); return out; }
  out.best = exit.node.t;
  map.gems.forEach((g, i) => {
    const r = search(root, i);
    if (!r.node) { out.ok = false; out.notes.push(`gema ${i + 1} (${g.x},${g.y}) sin ruta que la recoja y salga (${r.expanded} estados)`); }
  });
  return out;
}

// Yo recorro los mundos hechos a mano (o solo el nivel pedido por argumentos).
function main() {
  const [wArg, lArg] = process.argv.slice(2).map(Number);
  let failed = 0;
  for (const world of WORLDS) {
    if (world.source !== 'hand' || (!Number.isNaN(wArg) && wArg !== undefined && world.id !== wArg)) continue;
    for (let l = 0; l < world.count; l++) {
      if (lArg !== undefined && !Number.isNaN(lArg) && l !== lArg) continue;
      const level = getCampaignLevel(world.id, l);
      const t0 = Date.now();
      const r = checkLevel(level);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      if (!r.ok) failed++;
      const best = r.best != null ? `ruta ${r.best.toFixed(1)}s · par ${level.par}s` : '';
      console.log(`${r.ok ? '✔' : '✘'} ${r.id} ${r.name || ''} [${r.size}] ${best} (${secs}s)${r.notes.length ? `\n    → ${r.notes.join('\n    → ')}` : ''}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

// Yo solo corro la revisión cuando me ejecutan directamente (así otros scripts pueden importarme).
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
