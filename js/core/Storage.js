// Yo manejo el guardado persistente con valores por defecto, migraciones y escritura diferida.
import { SAVE } from '../config.js';

// Yo defino la forma completa del guardado para que nunca falte una llave.
export function defaultSave() {
  return {
    version: SAVE.VERSION,
    // Yo guardo las preferencias del jugador.
    settings: {
      lang: null,            // Yo detecto el idioma del sistema si es null.
      music: 0.55,           // Yo arranco la música a volumen moderado.
      sfx: 0.8,              // Yo arranco los efectos un poco más altos.
      vibration: true,       // Yo activo la vibración por defecto en móviles.
      shake: true,           // Yo activo la sacudida de cámara.
      touch: 'auto',         // Yo muestro controles táctiles solo si hay pantalla táctil.
      touchSwap: false,      // Yo permito a zurdos invertir los controles.
      touchSize: 1,          // Yo escalo los botones táctiles.
      touchOpacity: 0.8,     // Yo ajusto la opacidad de los botones táctiles.
      showTimer: true,       // Yo muestro el cronómetro en el HUD.
      reducedMotion: false,  // Yo reduzco partículas y efectos si el jugador lo pide.
      highContrast: false,   // Yo ofrezco un modo de alto contraste.
      showGhost: true,       // Yo muestro el fantasma del mejor intento.
    },
    // Yo guardo el progreso por nivel con la llave "w{mundo}-l{nivel}".
    progress: { levels: {} },
    // Yo guardo la moneda del juego.
    wallet: { sparks: 0 },
    // Yo guardo las skins compradas y la equipada.
    skins: { owned: ['blipo', 'flama'], equipped: 'blipo' },
    // Yo guardo el estado del reto diario.
    daily: { lastCompleted: null, streak: 0, bestStreak: 0, results: {} },
    // Yo guardo el récord de supervivencia.
    survival: { best: 0, runs: 0 },
    // Yo guardo estadísticas globales.
    stats: {
      deaths: 0, jumps: 0, doubleJumps: 0, wallJumps: 0, portals: 0,
      playTime: 0, levelsCleared: 0, gems: 0, flawless: 0, bounces: 0,
    },
    // Yo guardo los logros desbloqueados con su fecha.
    achievements: {},
    _newAch: false,
    _newCosmetic: false,
    // Yo recuerdo si ya vio el tutorial.
    onboarded: false,
    // Yo guardo los cosméticos: los que tiene ("tipo:id") y los que lleva puestos.
    cosmetics: { owned: [], hat: 'none', trail: 'classic', burst: 'classic' },
    // Yo guardo las misiones del día (se regeneran al cambiar la fecha).
    missions: null,
    // Yo recuerdo el último nivel jugado para el botón "Continuar".
    last: { world: 0, level: 0 },
  };
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNumber = (value) => Number.isFinite(value) && value >= 0;
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const isDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const entries = (value) => isObject(value) ? Object.entries(value) : [];

function restoreDefaults(base, saved) {
  if (!isObject(saved)) return base;
  for (const [key, original] of Object.entries(base)) {
    const value = saved[key];
    if (isObject(original)) base[key] = restoreDefaults(original, value);
    else if (Array.isArray(original) && Array.isArray(value)) {
      base[key] = [...new Set([...original, ...value.filter((id) => typeof id === 'string')])];
    } else if (typeof original === 'number' && isNumber(value)) base[key] = value;
    else if (typeof original === 'boolean' && typeof value === 'boolean') base[key] = value;
    else if (typeof original === 'string' && typeof value === 'string') base[key] = value;
  }
  return base;
}

function restoreSave(saved) {
  const defaults = defaultSave();
  const data = restoreDefaults(defaultSave(), saved);
  const s = data.settings;
  const lang = saved?.settings?.lang;
  if (lang === 'es' || lang === 'en') s.lang = lang;
  if (!['auto', 'on', 'off'].includes(s.touch)) s.touch = defaults.settings.touch;
  for (const [key, min, max] of [
    ['music', 0, 1], ['sfx', 0, 1], ['touchSize', 0.75, 1.4], ['touchOpacity', 0.25, 1],
  ]) {
    if (s[key] < min || s[key] > max) s[key] = defaults.settings[key];
  }
  if (!data.skins.owned.includes(data.skins.equipped)) data.skins.equipped = defaults.skins.equipped;

  for (const [key, record] of entries(saved?.progress?.levels)) {
    if (!/^w\d+-l\d+$/.test(key) || !isObject(record)) continue;
    data.progress.levels[key] = {
      stars: isCount(record.stars) && record.stars <= 3 ? record.stars : 0,
      bestTime: isNumber(record.bestTime) ? record.bestTime : null,
      bestDeaths: isCount(record.bestDeaths) ? record.bestDeaths : null,
      gems: [0, 1, 2].map((i) => Array.isArray(record.gems) && record.gems[i] === true),
      cleared: record.cleared === true,
      medal: isCount(record.medal) && record.medal <= 3 ? record.medal : 0,
    };
  }

  const daily = saved?.daily;
  if (isDay(daily?.lastCompleted)) data.daily.lastCompleted = daily.lastCompleted;
  for (const [day, record] of entries(daily?.results)) {
    if (!isDay(day) || !isObject(record) || !isNumber(record.time)) continue;
    data.daily.results[day] = {
      time: record.time,
      deaths: isCount(record.deaths) ? record.deaths : 0,
      stars: isCount(record.stars) && record.stars <= 3 ? record.stars : 0,
    };
  }

  data.stats = defaults.stats;
  for (const [key, count] of entries(saved?.stats)) {
    if (/^[a-z][a-zA-Z0-9]*$/.test(key) && key !== 'constructor' && (key === 'playTime' ? isNumber(count) : isCount(count))) {
      data.stats[key] = count;
    }
  }
  for (const [id, date] of entries(saved?.achievements)) {
    if (/^[a-z][a-z0-9_]*$/.test(id) && id !== 'constructor' && isCount(date)) data.achievements[id] = date;
  }

  const m = saved?.missions;
  if (isDay(m?.day) && Array.isArray(m.list) && m.list.length > 0 && m.list.every((item) =>
    typeof item?.id === 'string' && /^[a-z][a-z0-9_]*$/.test(item.id) && typeof item.stat === 'string' &&
    isCount(item.goal) && item.goal > 0 && isCount(item.reward) &&
    isCount(item.progress) && item.progress <= item.goal && typeof item.done === 'boolean'
  )) {
    data.missions = { day: m.day, list: m.list, bonus: m.bonus === true };
  }

  for (const section of ['wallet', 'survival', 'daily', 'last']) {
    for (const [key, fallback] of Object.entries(defaults[section])) {
      if (typeof fallback === 'number' && !isCount(data[section][key])) data[section][key] = fallback;
    }
  }
  return data;
}

export class Storage {
  // Yo cargo el guardado al crear la instancia.
  constructor() {
    // Yo leo el disco.
    this.data = this.load();
    // Yo preparo el temporizador de escritura diferida.
    this.timer = null;
  }

  // Yo leo y valido el guardado.
  load() {
    try {
      // Yo leo el texto guardado.
      const raw = localStorage.getItem(SAVE.KEY);
      // Yo devuelvo el guardado por defecto si no hay nada.
      if (!raw) return defaultSave();
      // Yo parseo y fusiono.
      const parsed = JSON.parse(raw);
      return this.migrate(restoreSave(parsed));
    } catch (err) {
      // Yo nunca bloqueo el juego por un guardado corrupto.
      console.warn('[storage] guardado inválido, reinicio', err);
      return defaultSave();
    }
  }

  // Yo aplico migraciones entre versiones.
  migrate(data) {
    // Yo dejo el hook listo para futuras versiones.
    data.version = SAVE.VERSION;
    return data;
  }

  // Yo programo un guardado agrupando cambios seguidos.
  save() {
    // Yo reinicio el temporizador.
    clearTimeout(this.timer);
    // Yo escribo 250ms después del último cambio.
    this.timer = setTimeout(() => this.flush(), 250);
  }

  // Yo escribo inmediatamente al disco.
  flush() {
    clearTimeout(this.timer);
    try { localStorage.setItem(SAVE.KEY, JSON.stringify(this.data)); }
    catch (err) { console.warn('[storage] no pude guardar', err); }
  }

  // Yo borro todo el progreso.
  reset() {
    // Yo conservo los ajustes para no molestar al jugador.
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = settings;
    this.flush();
  }
}
