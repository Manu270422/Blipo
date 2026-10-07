// Yo defino el "vocabulario" de los niveles: cada carácter del mapa es un tipo de tile.

// Yo nombro cada carácter para no usar letras mágicas en el código.
export const T = Object.freeze({
  EMPTY: '.',        // Yo marco el espacio vacío.
  GROUND: '#',       // Yo marco la roca sólida con bisel (el "ground" del prototipo).
  FILL: '=',         // Yo marco el relleno interior de los muros.
  SPIKE_UP: '^',     // Yo marco los pinchos del suelo.
  SPIKE_DOWN: 'v',   // Yo marco los pinchos del techo.
  SPIKE_LEFT: '<',   // Yo marco los pinchos que apuntan a la izquierda.
  SPIKE_RIGHT: '>',  // Yo marco los pinchos que apuntan a la derecha.
  PORTAL_IN: 'O',    // Yo marco la entrada del portal.
  PORTAL_OUT: 'o',   // Yo marco la salida del portal.
  EXIT: 'E',         // Yo marco la salida del nivel.
  GEM: '*',          // Yo marco una gema coleccionable.
  BOUNCE: 'B',       // Yo marco un resorte.
  CRUMBLE: 'C',      // Yo marco un bloque frágil.
  CHECKPOINT: 'K',   // Yo marco una bandera de control.
  SAW: 'X',          // Yo marco una sierra giratoria.
  START: 'S',        // Yo marco el punto de inicio (opcional).
  BELT_LEFT: '(',    // Yo marco una cinta transportadora que arrastra a la izquierda.
  BELT_RIGHT: ')',   // Yo marco una cinta transportadora que arrastra a la derecha.
  JET_A: 'F',        // Yo marco una boquilla de llamarada (fase A).
  JET_B: 'f',        // Yo marco una boquilla de llamarada (fase B, alterna con la A).
  ICE: 'I',          // Yo marco un bloque de hielo resbaloso.
  ICICLE: 'Y',       // Yo marco un carámbano que cuelga y cae cuando Blipo pasa debajo.
  WEB: 'W',          // Yo marco una telaraña: frena la caída y se escala tocando saltar.
  MUSHROOM: 'M',     // Yo marco un hongo saltarín (rebota más bajo que el resorte).
  CRYSTAL: 'L',      // Yo marco un cristal que ilumina la cueva cuando Blipo lo toca.
});

// Yo defino qué tiles bloquean el paso siempre.
export const SOLID = new Set([T.GROUND, T.FILL, T.BOUNCE, T.BELT_LEFT, T.BELT_RIGHT, T.JET_A, T.JET_B, T.ICE, T.MUSHROOM]);

// Yo defino hacia dónde arrastra cada cinta (-1 izquierda, 1 derecha).
export const BELT_DIR = { [T.BELT_LEFT]: -1, [T.BELT_RIGHT]: 1 };

// Yo defino las cajas de daño de cada peligro en coordenadas locales del tile (0 a 1).
export const HAZARD_BOX = {
  [T.SPIKE_UP]: { x0: 0.14, y0: 0.42, x1: 0.86, y1: 1 },
  [T.SPIKE_DOWN]: { x0: 0.14, y0: 0, x1: 0.86, y1: 0.58 },
  [T.SPIKE_LEFT]: { x0: 0.42, y0: 0.14, x1: 1, y1: 0.86 },
  [T.SPIKE_RIGHT]: { x0: 0, y0: 0.14, x1: 0.58, y1: 0.86 },
};

// Yo defino el radio de daño de la sierra (en tiles).
export const SAW_RADIUS = 0.42;

// Yo defino el ciclo de las llamaradas: avisan, queman y descansan.
export const JET = Object.freeze({
  PERIOD: 2.4,       // Yo repito el ciclo completo cada 2.4 segundos.
  WARN: 0.45,        // Yo echo chispas antes de encender para que la muerte sea justa.
  ON: 1.0,           // Yo mantengo la llama encendida durante 1 segundo.
  HEIGHT: 2.6,       // Yo alcanzo 2.6 tiles por encima de la boquilla.
});

// Yo defino el comportamiento de los carámbanos.
export const ICICLE = Object.freeze({
  RANGE: 1.1,        // Yo me suelto si Blipo pasa a menos de 1.1 tiles de mi centro (en horizontal).
  SHAKE: 0.35,       // Yo tiemblo un instante antes de caer para avisar.
  GRAVITY: 38,       // Yo caigo con esta gravedad.
  MAX_FALL: 18,      // Yo limito mi velocidad de caída.
  RESPAWN: 2.5,      // Yo vuelvo a crecer en el techo tras romperme.
});

// Yo defino el viento: ráfagas horizontales y corrientes que suben.
export const WIND = Object.freeze({
  FORCE: 5,          // Yo empujo a 5 tiles por segundo por defecto.
  LIFT: 75,          // Yo acelero hacia arriba en las corrientes (más que la gravedad).
  LIFT_MAX: 9,       // Yo limito la velocidad de subida en las corrientes.
  WARN: 0.5,         // Yo levanto copos de aviso antes de cada ráfaga.
});

// Yo devuelvo la fase de una boquilla: 'off', 'warn' u 'on'.
export function jetPhase(ch, time) {
  const offset = ch === T.JET_B ? JET.PERIOD / 2 : 0;
  const t = (((time + offset) % JET.PERIOD) + JET.PERIOD) % JET.PERIOD;
  if (t < JET.WARN) return 'warn';
  if (t < JET.WARN + JET.ON) return 'on';
  return 'off';
}
