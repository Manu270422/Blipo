// Yo controlo a Blipo: movimiento, saltos, deslizamiento en paredes y animación.
import { PHYS } from '../config.js';
import { moveAndCollide, landOnMovers } from '../engine/Physics.js';
import { WIND } from '../levels/tiles.js';

export class Player {
  // Yo creo al jugador en una posición de tiles.
  constructor(x, y) {
    this.w = PHYS.PLAYER_W;
    this.h = PHYS.PLAYER_H;
    this.spawn(x, y);
  }

  // Yo coloco al jugador en el punto de aparición y reinicio su estado.
  spawn(x, y) {
    // Yo centro la caja dentro del tile y apoyo los pies en su base.
    this.x = x + (1 - this.w) / 2;
    this.y = y + (1 - this.h);
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.airJumps = 1;
    this.coyote = 0;
    this.buffer = 0;
    this.lockX = 0;
    this.cut = true;
    this.facing = 1;
    this.wallDir = 0;
    this.sliding = false;
    // Yo reinicio la animación.
    this.sqX = 1; this.sqY = 1;
    this.alive = true;
    this.lastCol = null;
    // Yo reinicio el arrastre de cintas y plataformas móviles.
    this.riding = null;
    this.carryX = 0;
    this.windX = 0;
    this.onIce = false;
    this.crushed = false;
  }

  // Yo devuelvo el centro en tiles.
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // Yo devuelvo la caja de daño reducida.
  hurtBox() {
    const i = PHYS.HURT_INSET;
    return { x: this.x + i, y: this.y + i, w: this.w - i * 2, h: this.h - i * 2 };
  }

  // Yo avanzo un paso de simulación. "emit" reporta eventos (salto, aterrizaje...).
  update(dt, input, map, emit) {
    // Yo leo la dirección deseada.
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    // Yo registro el salto encolado en el buffer.
    if (input.consumeJump()) this.buffer = PHYS.JUMP_BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    // Yo descuento timers.
    this.coyote = this.onGround ? PHYS.COYOTE_TIME : Math.max(0, this.coyote - dt);
    this.lockX = Math.max(0, this.lockX - dt);

    // ---- Superficie ----
    // Yo calculo el arrastre de lo que piso: una plataforma móvil me lleva consigo y una cinta me empuja.
    let carry = 0;
    this.onIce = false;
    if (this.riding) {
      carry = this.riding.vx;
      this.y += this.riding.my;
      // Yo detecto si la plataforma me aplasta contra el techo.
      const hy = Math.floor(this.y + 0.05);
      if (map.isSolid(Math.floor(this.x + 0.05), hy) || map.isSolid(Math.floor(this.x + this.w - 0.05), hy)) this.crushed = true;
    } else if (this.onGround && this.lastCol) {
      for (const t of this.lastCol.groundTiles) {
        if (map.isIce(t.x, t.y)) this.onIce = true;
        const d = map.beltDir(t.x, t.y);
        if (d) { carry = d * PHYS.BELT_SPEED; break; }
      }
    }
    this.carryX = carry;
    // Yo leo el viento donde estoy: empuja de lado o me levanta en las corrientes.
    const wind = map.windAt(this.x + this.w / 2, this.y + this.h / 2);
    this.windX = wind.x;

    // ---- Movimiento horizontal ----
    if (this.lockX <= 0) {
      const target = dir * PHYS.MOVE_SPEED;
      // Yo elijo aceleración o fricción según haya input y dónde esté.
      // Yo patino sobre el hielo: acelero y freno mucho menos.
      const ground = this.onIce ? [PHYS.ICE_ACCEL, PHYS.ICE_FRICTION] : [PHYS.ACCEL_GROUND, PHYS.FRICTION_GROUND];
      const rate = dir !== 0 ? (this.onGround ? ground[0] : PHYS.ACCEL_AIR) : (this.onGround ? ground[1] : PHYS.FRICTION_AIR);
      // Yo muevo la velocidad hacia el objetivo sin pasarme.
      if (this.vx < target) this.vx = Math.min(target, this.vx + rate * dt);
      else if (this.vx > target) this.vx = Math.max(target, this.vx - rate * dt);
      if (dir !== 0) this.facing = dir;
    }

    // ---- Paredes ----
    // Yo detecto si estoy empujando contra una pared en el aire.
    const touching = this.lastCol ? (this.lastCol.touchR ? 1 : this.lastCol.touchL ? -1 : 0) : 0;
    this.wallDir = touching;
    this.sliding = !this.onGround && touching !== 0 && dir === touching && this.vy > 0;

    // ---- Saltos ----
    if (this.buffer > 0) {
      if (this.coyote > 0) {
        // Yo salto desde el suelo.
        this.vy = -PHYS.JUMP_VEL;
        this.coyote = 0; this.buffer = 0; this.cut = false; this.onGround = false;
        this.stretch(0.72, 1.3);
        emit('jump');
      } else if (!this.onGround && touching !== 0) {
        // Yo salto desde la pared en dirección contraria.
        this.vy = -PHYS.WALL_JUMP_VY;
        this.vx = -touching * PHYS.WALL_JUMP_VX;
        this.facing = -touching;
        this.lockX = PHYS.WALL_JUMP_LOCK;
        this.buffer = 0; this.cut = false; this.airJumps = 1;
        this.stretch(0.75, 1.25);
        emit('walljump', { dir: touching });
      } else if (this.airJumps > 0) {
        // Yo hago el doble salto.
        this.vy = -PHYS.DOUBLE_JUMP_VEL;
        this.airJumps -= 1; this.buffer = 0; this.cut = false;
        this.stretch(0.7, 1.35);
        emit('double');
      }
    }
    // Yo recorto el salto si soltó el botón temprano.
    if (!input.jump && !this.cut && this.vy < 0) { this.vy *= PHYS.JUMP_CUT; this.cut = true; }

    // ---- Gravedad ----
    this.vy += PHYS.GRAVITY * dt;
    // Yo subo con las corrientes de aire hasta su velocidad máxima.
    if (wind.y) { this.vy += wind.y * dt; this.vy = Math.max(this.vy, -WIND.LIFT_MAX); if (this.vy < 0) this.cut = true; }
    // Yo limito la caída al deslizar por la pared y recargo el doble salto (como el prototipo).
    if (this.sliding) { this.vy = Math.min(this.vy, PHYS.WALL_SLIDE_SPEED); this.airJumps = 1; }
    this.vy = Math.min(this.vy, PHYS.MAX_FALL);

    // ---- Colisión ----
    const impact = this.vy;
    const wasGround = this.onGround;
    const prevBottom = this.y + this.h;
    const col = moveAndCollide(this, map, dt);
    this.lastCol = col;
    // Yo reviso si caí (o sigo parado) sobre una plataforma móvil.
    this.riding = col.onGround ? null : landOnMovers(this, map.movers, prevBottom);
    this.onGround = col.onGround || !!this.riding;
    // Yo convierto el arrastre en impulso propio al despegar, así el salto conserva la inercia.
    if (!this.onGround && this.carryX) { this.vx += this.carryX; this.carryX = 0; }
    if (this.onGround) this.airJumps = 1;
    // Yo reporto el aterrizaje con su fuerza.
    if (this.onGround && !wasGround) {
      const k = Math.min(1, impact / PHYS.MAX_FALL);
      this.stretch(1 + 0.35 * k, 1 - 0.3 * k);
      emit('land', { impact });
    }
    // Yo reporto los tiles pisados para resortes y bloques frágiles.
    if (this.onGround) emit('ground', col.groundTiles);

    // ---- Animación ----
    // Yo devuelvo la deformación a su forma natural.
    const k = 1 - Math.pow(0.0005, dt);
    this.sqX += (1 - this.sqX) * k;
    this.sqY += (1 - this.sqY) * k;
  }

  // Yo aplico estiramiento/aplastamiento.
  stretch(sx, sy) { this.sqX = sx; this.sqY = sy; }

  // Yo lanzo al jugador hacia arriba (resorte).
  launch(vel) {
    this.vy = -vel;
    this.onGround = false;
    this.cut = true;
    this.airJumps = 1;
    this.stretch(0.6, 1.45);
  }
}
