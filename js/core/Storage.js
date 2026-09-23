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
    // Yo recuerdo si ya vio el tutorial.
    onboarded: false,
    // Yo recuerdo el último nivel jugado para el botón "Continuar".
    last: { world: 0, level: 0 },
  };
}

// Yo fusiono recursivamente lo guardado sobre los valores por defecto.
function deepMerge(base, saved) {
  // Yo devuelvo la base si lo guardado no es un objeto válido.
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
  // Yo recorro cada llave guardada.
  for (const key of Object.keys(saved)) {
    const b = base[key];
    const s = saved[key];
    // Yo fusiono objetos planos y reemplazo el resto.
    if (b && typeof b === 'object' && !Array.isArray(b) && s && typeof s === 'object' && !Array.isArray(s)) {
      base[key] = deepMerge(b, s);
    } else if (s !== undefined) {
      base[key] = s;
    }
  }
  // Yo devuelvo la base ya fusionada.
  return base;
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
      return this.migrate(deepMerge(defaultSave(), parsed));
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
