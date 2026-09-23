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
});

// Yo defino qué tiles bloquean el paso siempre.
export const SOLID = new Set([T.GROUND, T.FILL, T.BOUNCE]);

// Yo defino las cajas de daño de cada peligro en coordenadas locales del tile (0 a 1).
export const HAZARD_BOX = {
  [T.SPIKE_UP]: { x0: 0.14, y0: 0.42, x1: 0.86, y1: 1 },
  [T.SPIKE_DOWN]: { x0: 0.14, y0: 0, x1: 0.86, y1: 0.58 },
  [T.SPIKE_LEFT]: { x0: 0.42, y0: 0.14, x1: 1, y1: 0.86 },
  [T.SPIKE_RIGHT]: { x0: 0, y0: 0.14, x1: 0.58, y1: 0.86 },
};

// Yo defino el radio de daño de la sierra (en tiles).
export const SAW_RADIUS = 0.42;
