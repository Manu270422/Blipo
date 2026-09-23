// Yo implemento el bucle principal con paso fijo para la física y render libre.
import { GAME } from '../config.js';

export class Loop {
  // Yo recibo las funciones de actualización y dibujo.
  constructor({ update, render }) {
    // Yo guardo los callbacks.
    this.update = update;
    this.render = render;
    // Yo preparo el acumulador de tiempo.
    this.acc = 0;
    // Yo guardo el último timestamp.
    this.last = 0;
    // Yo marco si está corriendo.
    this.running = false;
    // Yo enlazo el frame para no crear funciones nuevas cada vez.
    this.frame = this.frame.bind(this);
  }

  // Yo arranco el bucle.
  start() {
    // Yo evito arrancarlo dos veces.
    if (this.running) return;
    this.running = true;
    // Yo reinicio el reloj.
    this.last = performance.now();
    this.acc = 0;
    // Yo pido el primer frame.
    this.raf = requestAnimationFrame(this.frame);
  }

  // Yo detengo el bucle.
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  // Yo proceso cada frame del navegador.
  frame(now) {
    // Yo salgo si me detuvieron.
    if (!this.running) return;
    // Yo calculo el delta en segundos con tope de seguridad.
    const dt = Math.min((now - this.last) / 1000, GAME.MAX_FRAME);
    this.last = now;
    // Yo acumulo tiempo real.
    this.acc += dt;
    // Yo consumo el tiempo en pasos fijos.
    while (this.acc >= GAME.STEP) {
      this.update(GAME.STEP);
      this.acc -= GAME.STEP;
    }
    // Yo dibujo con el delta real.
    this.render(dt);
    // Yo pido el siguiente frame.
    this.raf = requestAnimationFrame(this.frame);
  }
}
