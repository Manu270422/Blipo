// Yo centralizo aquí todas las constantes del juego para ajustarlas sin tocar la lógica.

// Yo defino el tamaño de la grilla de cada nivel (heredado del prototipo original: 40 x 22).
// Yo uso esta grilla como tamaño estándar y como referencia de zoom: los mapas grandes se desplazan.
export const GRID = Object.freeze({ COLS: 40, ROWS: 22 });

// Yo defino la física en unidades de "tile por segundo" para que no dependa de la pantalla.
export const PHYS = Object.freeze({
  GRAVITY: 42,            // Yo uso la gravedad equivalente al prototipo (0.51 px/frame² a 45fps).
  MAX_FALL: 15,           // Yo limito la velocidad de caída para que se sienta controlable.
  MOVE_SPEED: 8.5,        // Yo fijo la velocidad horizontal máxima.
  ACCEL_GROUND: 80,       // Yo acelero rápido en suelo para que el control sea preciso.
  ACCEL_AIR: 55,          // Yo acelero un poco menos en el aire para dar inercia.
  FRICTION_GROUND: 70,    // Yo freno en suelo cuando no hay input.
  FRICTION_AIR: 18,       // Yo freno suave en el aire.
  JUMP_VEL: 16.2,         // Yo calculo el salto para alcanzar ~3 tiles de altura.
  DOUBLE_JUMP_VEL: 14.6,  // Yo hago el doble salto un poco más corto que el primero.
  JUMP_CUT: 0.45,         // Yo recorto la velocidad al soltar el botón (salto variable).
  WALL_SLIDE_SPEED: 3.2,  // Yo limito la caída pegado a la pared.
  WALL_JUMP_VX: 8.5,      // Yo empujo horizontalmente al saltar desde la pared.
  WALL_JUMP_VY: 14.8,     // Yo empujo verticalmente al saltar desde la pared.
  WALL_JUMP_LOCK: 0.14,   // Yo bloqueo el input horizontal un instante tras el wall jump.
  BOUNCE_VEL: 24,         // Yo lanzo al jugador con el resorte (~7 tiles).
  BELT_SPEED: 4.5,        // Yo arrastro al jugador sobre las cintas transportadoras.
  ICE_ACCEL: 16,          // Yo acelero poco sobre el hielo: cuesta arrancar.
  ICE_FRICTION: 3.5,      // Yo casi no freno sobre el hielo: Blipo patina.
  MUSHROOM_VEL: 19,       // Yo lanzo al jugador con el hongo (~4 tiles, menos que el resorte).
  WEB_SPEED: 3.2,         // Yo limito la velocidad horizontal dentro de la telaraña.
  WEB_FALL: 2.2,          // Yo limito la caída dentro de la telaraña.
  WEB_RISE: 7,            // Yo limito el impulso de cada salto dentro de la telaraña (se sube a toques).
  COYOTE_TIME: 0.1,       // Yo permito saltar unos milisegundos después de dejar el borde.
  JUMP_BUFFER: 0.12,      // Yo recuerdo el salto pulsado justo antes de aterrizar.
  PLAYER_W: 0.72,         // Yo defino el ancho de la caja de colisión del jugador.
  PLAYER_H: 0.82,         // Yo defino el alto de la caja de colisión del jugador.
  HURT_INSET: 0.1,        // Yo encojo la caja de daño para que las muertes se sientan justas.
});

// Yo defino reglas generales de partida.
export const GAME = Object.freeze({
  STEP: 1 / 120,            // Yo simulo la física a 120 Hz con paso fijo.
  MAX_FRAME: 0.25,          // Yo evito la "espiral de la muerte" si el navegador se congela.
  RESPAWN_DELAY: 0.55,      // Yo espero un momento antes de reaparecer tras morir.
  PORTAL_COOLDOWN: 0.35,    // Yo evito teletransportes en bucle.
  CRUMBLE_DELAY: 0.45,      // Yo doy tiempo antes de que un bloque frágil caiga.
  CRUMBLE_RESPAWN: 3,       // Yo regenero los bloques frágiles tras unos segundos.
  PAR_DEATHS: 3,            // Yo exijo máximo 3 muertes para la segunda estrella.
  SURVIVAL_LIVES: 5,        // Yo doy 5 vidas en el modo supervivencia.
});

// Yo defino la economía para que siempre haya algo por lo que volver.
export const ECONOMY = Object.freeze({
  PER_STAR: 10,             // Yo pago chispas por cada estrella nueva.
  PER_GEM: 5,               // Yo pago chispas por cada gema nueva.
  DAILY_BASE: 30,           // Yo premio el reto diario.
  DAILY_STREAK_BONUS: 10,   // Yo sumo bonus por cada día de racha.
  DAILY_STREAK_CAP: 7,      // Yo pongo tope a la racha para el bonus.
  SURVIVAL_PER_ROOM: 4,     // Yo pago por cada sala superada en supervivencia.
});

// Yo defino la llave de guardado y su versión para migraciones futuras.
export const SAVE = Object.freeze({ KEY: 'blipo.save', VERSION: 1 });

// Yo guardo la fecha "cero" para numerar los retos diarios.
export const DAILY_EPOCH = Date.UTC(2026, 0, 1);
