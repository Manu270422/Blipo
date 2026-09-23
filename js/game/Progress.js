// Yo aplico las reglas de progreso: estrellas, chispas, desbloqueos, racha y tienda.
import { GAME, ECONOMY } from '../config.js';
import { WORLDS, levelKey } from '../levels/worlds.js';
import { SKINS } from '../entities/Skins.js';
import { dateKey, yesterdayKey } from './Daily.js';

export class Progress {
  // Yo trabajo sobre el guardado compartido.
  constructor(storage) { this.store = storage; }

  // Yo accedo a los datos rápidamente.
  get data() { return this.store.data; }

  // Yo calculo las estrellas de un resultado.
  static stars(par, time, deaths) {
    let s = 1;
    if (deaths <= GAME.PAR_DEATHS) s += 1;
    if (deaths <= GAME.PAR_DEATHS && time <= par) s += 1;
    return s;
  }

  // Yo leo el registro de un nivel.
  record(w, l) { return this.data.progress.levels[levelKey(w, l)] || null; }

  // Yo sumo todas las estrellas ganadas.
  totalStars() { return Object.values(this.data.progress.levels).reduce((a, r) => a + (r.stars || 0), 0); }

  // Yo sumo todas las gemas encontradas.
  totalGems() { return Object.values(this.data.progress.levels).reduce((a, r) => a + (r.gems || []).filter(Boolean).length, 0); }

  // Yo sumo estrellas de un mundo.
  worldStars(w) {
    let s = 0;
    for (let l = 0; l < WORLDS[w].count; l++) s += this.record(w, l)?.stars || 0;
    return s;
  }

  // Yo decido si un mundo está abierto.
  isWorldUnlocked(w) { return this.totalStars() >= WORLDS[w].unlock; }

  // Yo decido si un nivel está abierto (el anterior debe estar superado).
  isLevelUnlocked(w, l) {
    if (!this.isWorldUnlocked(w)) return false;
    return l === 0 || !!this.record(w, l - 1)?.cleared;
  }

  // Yo devuelvo el siguiente nivel disponible o null si terminó la campaña.
  next(w, l) {
    if (l + 1 < WORLDS[w].count) return { w, l: l + 1 };
    if (w + 1 < WORLDS.length) return { w: w + 1, l: 0 };
    return null;
  }

  // Yo guardo el resultado de un nivel de campaña y devuelvo lo ganado.
  saveCampaign(w, l, level, result) {
    const key = levelKey(w, l);
    const prev = this.data.progress.levels[key] || { stars: 0, bestTime: null, bestDeaths: null, gems: [false, false, false], cleared: false };
    const stars = Progress.stars(level.par, result.time, result.deaths);
    // Yo calculo lo nuevo para pagar solo mejoras (evito "farmear" el mismo nivel).
    const newStars = Math.max(0, stars - prev.stars);
    const gems = prev.gems.map((g, i) => g || !!result.gems[i]);
    const newGems = gems.filter(Boolean).length - prev.gems.filter(Boolean).length;
    const bestTime = prev.bestTime == null ? result.time : Math.min(prev.bestTime, result.time);
    const isRecord = prev.bestTime != null && result.time < prev.bestTime;
    this.data.progress.levels[key] = {
      stars: Math.max(stars, prev.stars),
      bestTime,
      bestDeaths: prev.bestDeaths == null ? result.deaths : Math.min(prev.bestDeaths, result.deaths),
      gems,
      cleared: true,
    };
    const sparks = newStars * ECONOMY.PER_STAR + newGems * ECONOMY.PER_GEM;
    this.data.wallet.sparks += sparks;
    this.data.stats.levelsCleared += 1;
    this.data.stats.gems += Math.max(0, newGems);
    if (result.deaths === 0) this.data.stats.flawless += 1;
    this.data.last = this.next(w, l) ? { world: this.next(w, l).w, level: this.next(w, l).l } : { world: w, level: l };
    this.store.save();
    return { stars, newStars, newGems, sparks, bestTime, isRecord, firstClear: !prev.cleared };
  }

  // Yo guardo el resultado del reto diario y actualizo la racha.
  saveDaily(result, par) {
    const today = dateKey();
    const d = this.data.daily;
    const stars = Progress.stars(par, result.time, result.deaths);
    const prev = d.results[today];
    let sparks = 0;
    let streakUp = false;
    // Yo pago y subo la racha solo la primera vez del día.
    if (d.lastCompleted !== today) {
      d.streak = d.lastCompleted === yesterdayKey() ? d.streak + 1 : 1;
      d.bestStreak = Math.max(d.bestStreak, d.streak);
      d.lastCompleted = today;
      sparks = ECONOMY.DAILY_BASE + Math.min(d.streak, ECONOMY.DAILY_STREAK_CAP) * ECONOMY.DAILY_STREAK_BONUS;
      this.data.wallet.sparks += sparks;
      streakUp = true;
    }
    // Yo conservo el mejor resultado del día.
    if (!prev || result.time < prev.time) d.results[today] = { time: result.time, deaths: result.deaths, stars: Math.max(stars, prev?.stars || 0) };
    // Yo limpio resultados de más de 60 días para no inflar el guardado.
    const keys = Object.keys(d.results).sort();
    while (keys.length > 60) delete d.results[keys.shift()];
    this.store.save();
    return { stars, sparks, streak: d.streak, streakUp, best: d.results[today] };
  }

  // Yo devuelvo la racha vigente (se rompe si pasó más de un día).
  currentStreak() {
    const d = this.data.daily;
    if (d.lastCompleted === dateKey() || d.lastCompleted === yesterdayKey()) return d.streak;
    return 0;
  }

  // Yo digo si el reto de hoy ya está hecho.
  dailyDone() { return this.data.daily.lastCompleted === dateKey(); }

  // Yo guardo una carrera de supervivencia.
  saveSurvival(rooms) {
    const s = this.data.survival;
    const isRecord = rooms > s.best;
    s.best = Math.max(s.best, rooms);
    s.runs += 1;
    const sparks = rooms * ECONOMY.SURVIVAL_PER_ROOM;
    this.data.wallet.sparks += sparks;
    this.store.save();
    return { rooms, best: s.best, isRecord, sparks };
  }

  // Yo compro una skin si alcanza el saldo.
  buySkin(id) {
    const skin = SKINS.find((s) => s.id === id);
    const owned = this.data.skins.owned;
    if (!skin || owned.includes(id)) return { ok: false, reason: 'owned' };
    if (this.data.wallet.sparks < skin.price) return { ok: false, reason: 'funds' };
    this.data.wallet.sparks -= skin.price;
    owned.push(id);
    this.data.skins.equipped = id;
    this.store.save();
    return { ok: true };
  }

  // Yo equipo una skin comprada.
  equipSkin(id) {
    if (!this.data.skins.owned.includes(id)) return false;
    this.data.skins.equipped = id;
    this.store.save();
    return true;
  }

  // Yo sumo una estadística.
  bump(key, n = 1) { this.data.stats[key] = (this.data.stats[key] || 0) + n; }
}
