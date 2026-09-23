// Yo ejecuto una partida: simulación, reglas del nivel, muertes, gemas, portales y salida.
import { GAME, PHYS } from '../config.js';
import { bus } from '../core/EventBus.js';
import { TileMap } from '../engine/TileMap.js';
import { Camera } from '../engine/Camera.js';
import { Particles } from '../engine/Particles.js';
import { makeTheme } from '../engine/Renderer.js';
import { Player } from '../entities/Player.js';
import { resolveColor } from '../entities/Skins.js';
import { T } from '../levels/tiles.js';

export class Game {
  // Yo recibo los servicios que necesito (inyección de dependencias).
  constructor({ input, audio, haptics, renderer }) {
    this.input = input;
    this.audio = audio;
    this.haptics = haptics;
    this.renderer = renderer;
    this.camera = new Camera();
    this.particles = new Particles();
    this.clock = 0;
    this.flash = 0;
    this.state = 'idle';
    this.map = null;
    this.player = null;
    this.skin = null;
    this.insets = { top: 0, bottom: 0 };
  }

  // Yo cargo un nivel y dejo todo listo para jugar.
  load(level, { skin, highContrast = false, lives = null } = {}) {
    this.level = level;
    this.skin = skin;
    // Yo guardo las opciones para poder reiniciar igual.
    this.opts = { skin, highContrast };
    this.map = new TileMap(level);
    this.theme = makeTheme(level.hue ?? 205, highContrast);
    this.player = new Player(this.map.start.x, this.map.start.y);
    this.player.blinkSeed = Math.random() * 4;
    this.respawnPoint = { ...this.map.start };
    this.time = 0;
    this.deaths = 0;
    this.lives = lives;
    this.started = false;
    this.respawnT = 0;
    this.portalCd = 0;
    this.trailT = 0;
    this.flash = 0;
    this.particles.clear();
    this.input.clear();
    this.state = 'playing';
    // Yo recalculo cámara y capa estática para el nuevo nivel.
    this.layout();
  }

  // Yo recalculo el encuadre (al cargar o al girar/redimensionar la pantalla).
  layout() {
    const r = this.renderer;
    this.camera.resize(r.w, r.h, this.map ? this.map.cols : 40, this.map ? this.map.rows : 22, this.insets);
    if (this.map) {
      this.renderer.buildStatic(this.map, this.theme, this.camera.tile);
      this.camera.follow(this.player.cx, this.player.cy, 0);
    }
  }

  // Yo pauso o reanudo.
  setPaused(on) {
    if (this.state === 'playing' && on) this.state = 'paused';
    else if (this.state === 'paused' && !on) { this.state = 'playing'; this.input.clear(); }
  }

  // Yo reinicio el nivel actual desde cero.
  restart() {
    if (!this.level) return;
    // Yo conservo las vidas actuales en supervivencia.
    this.load(this.level, { ...this.opts, lives: this.lives });
  }

  // Yo avanzo un paso fijo de simulación.
  update(dt) {
    // Yo congelo todo mientras está en pausa.
    if (this.state === 'paused') return;
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.particles.update(dt);
    if (!this.map) return;
    this.map.update(dt, this.player);
    if (this.state === 'dead') {
      // Yo espero y reaparezco.
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return;
    }
    if (this.state !== 'playing') return;

    const p = this.player;
    // Yo arranco el cronómetro con el primer movimiento del jugador (justo para todos).
    if (!this.started && (this.input.left || this.input.right || this.input.jump || this.input.jumpQueued || Math.abs(p.vx) + Math.abs(p.vy) > 0.5)) this.started = true;
    if (this.started) this.time += dt;
    this.portalCd = Math.max(0, this.portalCd - dt);

    // Yo actualizo al jugador y reacciono a sus eventos.
    p.update(dt, this.input, this.map, (type, data) => this.onPlayerEvent(type, data));

    // Yo reviso si cayó fuera del mapa o tocó un peligro.
    if (p.y > this.map.rows + 1 || this.map.hitsHazard(p.hurtBox())) { this.die(); return; }

    // Yo reviso interacciones con el centro del jugador.
    const cx = p.cx, cy = p.cy;
    // Yo teletransporto si entra en un portal.
    if (this.portalCd <= 0 && this.map.portalOut && this.map.isAt(cx, cy, T.PORTAL_IN)) {
      this.burst(cx, cy, '#2DE1C2', 18);
      p.x = this.map.portalOut.x + (1 - p.w) / 2;
      p.y = this.map.portalOut.y + (1 - p.h);
      this.portalCd = GAME.PORTAL_COOLDOWN;
      this.burst(p.cx, p.cy, '#2DE1C2', 18);
      this.audio.sfx('portal');
      bus.emit('stat', { key: 'portals' });
    }
    // Yo recojo gemas cercanas.
    for (const g of this.map.gems) {
      if (!g.taken && (g.x + 0.5 - cx) ** 2 + (g.y + 0.5 - cy) ** 2 < 0.5) {
        g.taken = true;
        this.burst(g.x + 0.5, g.y + 0.5, '#FFC23D', 16);
        this.audio.sfx('gem');
        this.haptics.pulse(15);
        bus.emit('game:gem', { index: g.index });
      }
    }
    // Yo activo banderas de control.
    for (const k of this.map.checkpoints) {
      if (!k.active && Math.abs(k.x + 0.5 - cx) < 0.7 && Math.abs(k.y + 0.5 - cy) < 0.9) {
        this.map.checkpoints.forEach((o) => { o.active = false; });
        k.active = true;
        this.respawnPoint = { x: k.x, y: k.y };
        this.burst(k.x + 0.5, k.y + 0.3, '#FFC23D', 12);
        this.audio.sfx('checkpoint');
        bus.emit('toast', { key: 'toast_checkpoint' });
      }
    }
    // Yo termino el nivel al tocar la salida.
    if (this.map.isAt(cx, cy, T.EXIT)) { this.complete(); return; }

    // Yo suelto la estela del jugador (como el "trailBall" del prototipo).
    this.trailT -= dt;
    if (this.trailT <= 0 && (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1)) {
      this.trailT = 0.035;
      const col = resolveColor(this.skin.trail, this.clock);
      this.particles.emit(cx + (Math.random() - 0.5) * 0.4, p.y + 0.1, { count: 1, color: col, speed: 0.6, life: 0.6, gravity: -3, size: 0.12, angle: -Math.PI / 2, spread: 0.8 });
    }
    // Yo suelto polvo al deslizar por la pared.
    if (p.sliding && Math.random() < 0.3) {
      this.particles.emit(p.wallDir > 0 ? p.x + p.w : p.x, p.y + p.h * 0.8, { count: 1, color: 'rgba(255,255,255,.6)', speed: 1.5, life: 0.3, gravity: 2, size: 0.1 });
    }
  }

  // Yo reacciono a los eventos del jugador (sonido, partículas, estadísticas).
  onPlayerEvent(type, data) {
    const p = this.player;
    switch (type) {
      case 'jump':
        this.audio.sfx('jump');
        this.dust(p.cx, p.y + p.h, 6);
        bus.emit('stat', { key: 'jumps' });
        break;
      case 'double':
        this.audio.sfx('double');
        this.particles.emit(p.cx, p.y + p.h, { count: 10, color: resolveColor(this.skin.trail, this.clock), speed: 4, life: 0.35, gravity: 4, spread: Math.PI, angle: Math.PI / 2 });
        bus.emit('stat', { key: 'doubleJumps' });
        break;
      case 'walljump':
        this.audio.sfx('walljump');
        this.dust(data.dir > 0 ? p.x + p.w : p.x, p.cy, 6);
        bus.emit('stat', { key: 'wallJumps' });
        break;
      case 'land':
        if (data.impact > 6) { this.audio.sfx('land'); this.dust(p.cx, p.y + p.h, Math.round(data.impact / 2)); }
        if (data.impact > 13) this.camera.shake(0.12);
        break;
      case 'ground':
        for (const t of data) {
          const ch = this.map.get(t.x, t.y);
          // Yo lanzo al jugador si pisa un resorte.
          if (ch === T.BOUNCE) {
            p.launch(PHYS.BOUNCE_VEL);
            this.map.bounceAt.get(t.y * this.map.cols + t.x).t = 1;
            this.audio.sfx('bounce');
            this.haptics.pulse(20);
            bus.emit('stat', { key: 'bounces' });
            break;
          }
          // Yo activo el bloque frágil.
          if (ch === T.CRUMBLE && this.map.triggerCrumble(t.x, t.y)) this.audio.sfx('crumble');
        }
        break;
      default: break;
    }
  }

  // Yo mato al jugador.
  die() {
    const p = this.player;
    p.alive = false;
    this.state = 'dead';
    this.respawnT = GAME.RESPAWN_DELAY;
    this.deaths += 1;
    // Yo hago una explosión con el color de la skin.
    this.burst(p.cx, p.cy, resolveColor(this.skin.body, this.clock), 28, 7);
    this.burst(p.cx, p.cy, '#FFFFFF', 8, 5);
    this.camera.shake(0.35);
    this.flash = 0.6;
    this.audio.sfx('death');
    this.haptics.pulse([30, 30, 40]);
    bus.emit('stat', { key: 'deaths' });
    // Yo descuento vidas en supervivencia.
    if (this.lives !== null) {
      this.lives -= 1;
      bus.emit('game:lives', this.lives);
      if (this.lives <= 0) { this.state = 'over'; setTimeout(() => bus.emit('game:over', this.summary()), 700); }
    }
  }

  // Yo reaparezco en el último punto de control.
  respawn() {
    this.player.spawn(this.respawnPoint.x, this.respawnPoint.y);
    this.map.resetDynamic();
    this.state = 'playing';
    this.input.clear();
    this.burst(this.player.cx, this.player.cy, resolveColor(this.skin.trail, this.clock), 10, 3);
  }

  // Yo termino el nivel con éxito.
  complete() {
    this.state = 'complete';
    const p = this.player;
    this.burst(p.cx, p.cy, '#FFC23D', 30, 6);
    this.flash = 0.8;
    this.audio.sfx('win');
    this.haptics.pulse([20, 40, 20]);
    setTimeout(() => bus.emit('game:complete', this.summary()), 450);
  }

  // Yo resumo el resultado de la partida.
  summary() {
    return {
      level: this.level,
      time: this.time,
      deaths: this.deaths,
      gems: this.map.gems.map((g) => g.taken),
      lives: this.lives,
    };
  }

  // Yo emito una explosión de partículas.
  burst(x, y, color, count = 12, speed = 5) {
    this.particles.emit(x, y, { count, color, speed, life: 0.7, gravity: 12, size: 0.16 });
  }

  // Yo levanto polvo del suelo.
  dust(x, y, count) {
    this.particles.emit(x, y, { count, color: 'rgba(244,238,223,.7)', speed: 2.5, life: 0.35, gravity: -1, size: 0.12, angle: -Math.PI / 2, spread: Math.PI });
  }

  // Yo dibujo el frame actual.
  render(dt) {
    if (this.player) this.camera.follow(this.player.cx, this.player.cy, dt);
    this.renderer.draw(this, dt);
  }
}
