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
import { GhostRecorder } from './Ghost.js';
import { emitTrail, emitBurst } from './Cosmetics.js';
import { t } from '../core/I18n.js';

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
  load(level, { skin, highContrast = false, lives = null, ghost = null, medals = null, look = null } = {}) {
    this.level = level;
    this.skin = skin;
    // Yo guardo las opciones para poder reiniciar igual.
    this.opts = { skin, highContrast, ghost, medals, look };
    // Yo guardo los cosméticos puestos (sombrero, estela y explosión).
    this.look = look || { hat: 'none', trail: 'classic', burst: 'classic' };
    // Yo cargo el fantasma del mejor intento y empiezo a grabar este.
    this.ghost = ghost;
    this.medals = medals;
    this.recorder = new GhostRecorder();
    this.map = new TileMap(level);
    this.theme = makeTheme(level.hue ?? 205, highContrast);
    this.player = new Player(this.map.start.x, this.map.start.y);
    this.player.blinkSeed = Math.random() * 4;
    this.respawnPoint = { ...this.map.start, g: 1, switchOn: true };
    this.time = 0;
    this.deaths = 0;
    this.lives = lives;
    this.started = false;
    this.respawnT = 0;
    this.bossSeg = null;
    // Yo preparo el "jugo": congelado de impacto, textos flotantes, cadena de gemas y onda al reaparecer.
    this.hitstop = 0;
    this.floaters = [];
    this.spawnFx = 0;
    this.moved = false;
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
      this.renderer.buildStatic(this.map, this.theme, this.camera.tile, this.level);
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
    // Yo congelo el mundo un instante tras un golpe fuerte: así cada impacto pesa (hit-stop).
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.spawnFx = Math.max(0, this.spawnFx - dt);
    // Yo celebro la victoria en cámara lenta mientras aparece el resultado.
    const fx = this.state === 'complete' ? dt * 0.4 : dt;
    this.particles.update(fx);
    this.updateFloaters(fx);
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
    // Yo recuerdo si el jugador ya tocó algún control (para retirar el cartel de entrada).
    if (!this.moved && (this.input.left || this.input.right || this.input.jump)) this.moved = true;
    this.portalCd = Math.max(0, this.portalCd - dt);

    // Yo actualizo al jugador y reacciono a sus eventos.
    p.update(dt, this.input, this.map, (type, data) => this.onPlayerEvent(type, data));

    // Yo reviso si cayó fuera del mapa o tocó un peligro.
    if (p.crushed || p.y > this.map.rows + 1 || this.map.hitsHazard(p.hurtBox())) { this.die(); return; }

    // Yo sacudo la cámara cuando el jefe termina un golpe contra el suelo.
    const boss = this.map.boss;
    if (boss && !boss.defeated) {
      if (this.bossSeg && this.bossSeg !== boss.seg && this.bossSeg.slam) { this.camera.shake(0.4); this.audio.sfx('land'); }
      this.bossSeg = boss.seg;
    }

    // Yo enciendo los cristales que Blipo toca: iluminan la cueva para siempre en este intento.
    for (const c of this.map.crystals) {
      if (!c.lit && (c.x + 0.5 - p.cx) ** 2 + (c.y + 0.5 - p.cy) ** 2 < 1.2) {
        c.lit = true;
        this.burst(c.x + 0.5, c.y + 0.5, '#B9FFF4', 18, 4);
        this.audio.sfx('chime');
      }
    }

    // Yo hago crujir y romperse los carámbanos con sonido y esquirlas.
    for (const c of this.map.icicles) {
      if (c.cracked) this.audio.sfx('crack');
      if (c.shattered && c.fy < this.map.rows) {
        this.particles.emit(c.x + 0.5, c.fy + 0.8, { count: 10, color: '#D9F6FF', speed: 4, life: 0.45, gravity: 14, size: 0.12, angle: -Math.PI / 2, spread: Math.PI });
        if (Math.abs(c.x + 0.5 - p.cx) < 14) this.audio.sfx('shatter');
      }
    }

    // Yo hago sonar las llamaradas que se encienden cerca del jugador.
    for (const j of this.map.jets) {
      if (j.ignited && Math.abs(j.x + 0.5 - p.cx) < 12 && Math.abs(j.y - p.cy) < 9) { this.audio.sfx('flame'); break; }
    }

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
        // Yo subo el tono con cada gema del nivel y celebro en grande la tercera.
        const n = this.map.gems.filter((o) => o.taken).length;
        const all = n === this.map.gems.length;
        this.burst(g.x + 0.5, g.y + 0.5, '#FFC23D', all ? 30 : 16, all ? 7 : 5);
        this.audio.sfx(all ? 'allgems' : 'gem', { step: n - 1 });
        this.floater(g.x + 0.5, g.y, all ? t('fx_all_gems', { n }) : `${n}/${this.map.gems.length}`, '#FFC23D', all ? 1.3 : 1);
        if (all) { this.hitstop = 0.05; this.camera.shake(0.12); }
        this.haptics.pulse(all ? [15, 30, 15] : 15);
        bus.emit('game:gem', { index: g.index });
      }
    }
    // Yo activo banderas de control.
    for (const k of this.map.checkpoints) {
      if (!k.active && Math.abs(k.x + 0.5 - cx) < 0.7 && Math.abs(k.y + 0.5 - cy) < 0.9) {
        this.map.checkpoints.forEach((o) => { o.active = false; });
        k.active = true;
        // Yo guardo también la gravedad y el interruptor para reaparecer igual que al tocar la bandera.
        this.respawnPoint = { x: k.x, y: k.y, g: p.g, switchOn: this.map.switchOn };
        this.burst(k.x + 0.5, k.y + 0.3, '#FFC23D', 12);
        this.audio.sfx('checkpoint');
        this.floater(k.x + 0.5, k.y - 0.4, t('fx_checkpoint'), '#2DE1C2', 1);
      }
    }
    // Yo termino el nivel al tocar la salida.
    if (this.map.isAt(cx, cy, T.EXIT)) { this.complete(); return; }

    // Yo grabo este intento para el fantasma.
    if (this.started) this.recorder.sample(this.time, p);

    // Yo suelto la estela del jugador (como el "trailBall" del prototipo).
    this.trailT -= dt;
    if (this.trailT <= 0 && (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1)) {
      this.trailT = 0.035;
      const col = resolveColor(this.skin.trail, this.clock);
      emitTrail(this.particles, this.look.trail, cx + (Math.random() - 0.5) * 0.4, p.y + 0.1, col, this.clock);
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
      case 'stomp':
        this.audio.sfx(data.defeated ? 'bossdown' : 'stomp');
        this.camera.shake(data.defeated ? 0.6 : 0.3);
        this.flash = data.defeated ? 0.9 : 0.4;
        this.haptics.pulse(data.defeated ? [40, 40, 80] : [30, 20, 30]);
        this.burst(p.cx, p.y + (p.g > 0 ? p.h : 0), '#FFC23D', data.defeated ? 40 : 20, data.defeated ? 8 : 5);
        // Yo congelo el golpe y lo anuncio sobre el jefe.
        this.hitstop = data.defeated ? 0.28 : 0.11;
        this.floater(p.cx, p.y - 0.6, data.defeated ? t('fx_ko') : t('fx_hit', { n: this.map.boss.hp }), data.defeated ? '#FFC23D' : '#FF5D4A', data.defeated ? 1.6 : 1.2);
        bus.emit('stat', { key: 'stomps' });
        if (data.defeated) { bus.emit('toast', { key: 'toast_boss_down', icon: 'i-trophy' }); bus.emit('stat', { key: 'bossKills' }); }
        break;
      case 'flip':
        this.audio.sfx('flip');
        bus.emit('stat', { key: 'flips' });
        this.particles.emit(p.cx, p.cy, { count: 16, color: '#C3A6FF', speed: 5, life: 0.45, gravity: 0, size: 0.13 });
        this.haptics.pulse(15);
        break;
      case 'switch':
        this.audio.sfx('switch');
        this.camera.shake(0.08);
        this.haptics.pulse(20);
        break;
      case 'land':
        if (data.impact > 6) { this.audio.sfx('land'); this.dust(p.cx, p.y + p.h, Math.round(data.impact / 2)); }
        if (data.impact > 13) this.camera.shake(0.12);
        break;
      case 'ground':
        for (const t of data) {
          const ch = this.map.get(t.x, t.y);
          // Yo lanzo al jugador si pisa un resorte.
          if (ch === T.BOUNCE || ch === T.MUSHROOM) {
            p.launch(ch === T.MUSHROOM ? PHYS.MUSHROOM_VEL : PHYS.BOUNCE_VEL);
            this.map.bounceAt.get(t.y * this.map.cols + t.x).t = 1;
            this.audio.sfx(ch === T.MUSHROOM ? 'mushroom' : 'bounce');
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
    // Yo hago una explosión con el color de la skin y el estilo cosmético elegido.
    emitBurst(this.particles, this.look.burst, p.cx, p.cy, resolveColor(this.skin.body, this.clock));
    this.camera.shake(0.35);
    this.flash = 0.6;
    // Yo congelo el instante de la muerte y apago la música de golpe por un momento.
    this.hitstop = 0.08;
    this.audio.duck();
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
    this.player.spawn(this.respawnPoint.x, this.respawnPoint.y, this.respawnPoint.g);
    this.map.resetDynamic(this.respawnPoint.switchOn);
    // Yo reinicio al jefe si Blipo muere antes de derrotarlo.
    if (this.map.boss && !this.map.boss.defeated) this.map.boss.reset();
    this.state = 'playing';
    this.input.clear();
    // Yo reaparezco con un "pop": me estiro y suelto una onda de energía.
    this.player.stretch(0.45, 1.55);
    this.spawnFx = 0.35;
    this.burst(this.player.cx, this.player.cy, resolveColor(this.skin.trail, this.clock), 10, 3);
  }

  // Yo termino el nivel con éxito.
  complete() {
    this.state = 'complete';
    const p = this.player;
    this.burst(p.cx, p.cy, '#FFC23D', 30, 6);
    // Yo lanzo confeti y me estiro de alegría.
    const cols = ['#FF5D4A', '#FFC23D', '#2DE1C2', '#9B6BFF', '#F4EEDF'];
    this.particles.emit(p.cx, p.cy - 0.5, { count: 40, color: (i) => cols[i % cols.length], speed: 10, life: 1.6, gravity: 9, size: 0.18, angle: -Math.PI / 2, spread: Math.PI * 1.1, spin: 6 });
    p.stretch(0.7, 1.4);
    this.floater(p.cx, p.y - 0.8, t('fx_clear'), '#FFC23D', 1.5);
    this.hitstop = 0.06;
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
      recording: this.recorder ? this.recorder.encode() : null,
    };
  }

  // Yo muestro un texto que sube y se desvanece sobre el mundo (en tiles).
  floater(x, y, text, color = '#FFFFFF', scale = 1) {
    this.floaters.push({ x, y, text, color, scale, t: 0, life: 0.9 });
    if (this.floaters.length > 8) this.floaters.shift();
  }

  // Yo hago subir y desaparecer los textos flotantes.
  updateFloaters(dt) {
    for (const f of this.floaters) { f.t += dt; f.y -= dt * 1.4; }
    this.floaters = this.floaters.filter((f) => f.t < f.life);
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
    // Yo adelanto un poco la cámara hacia donde corre Blipo para ver lo que viene.
    if (this.player) this.camera.follow(this.player.cx + this.player.vx * 0.12, this.player.cy, dt);
    this.renderer.draw(this, dt);
  }
}
