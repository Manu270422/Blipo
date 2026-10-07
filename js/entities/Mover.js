// Yo soy una plataforma móvil: voy y vuelvo entre dos puntos con movimiento suave y cargo a Blipo encima.

export class Mover {
  // Yo recibo { x, y, w, dx, dy, period, phase } en tiles; dx/dy es el recorrido total.
  constructor({ x, y, w = 3, dx = 0, dy = 0, period = 4, phase = 0 }) {
    this.x0 = x; this.y0 = y;
    this.w = w; this.h = 0.5;
    this.dx = dx; this.dy = dy;
    this.period = period;
    this.phase = phase;
    this.place(0);
    this.vx = 0; this.vy = 0;
  }

  // Yo calculo mi posición para un instante (siempre la misma para el mismo tiempo).
  place(time) {
    const k = 0.5 - 0.5 * Math.cos(((time / this.period) + this.phase) * Math.PI * 2);
    this.x = this.x0 + this.dx * k;
    this.y = this.y0 + this.dy * k;
  }

  // Yo avanzo y guardo cuánto me moví en este paso (para cargar al jugador).
  update(time, dt) {
    const px = this.x, py = this.y;
    this.place(time);
    this.mx = this.x - px;
    this.my = this.y - py;
    this.vx = dt > 0 ? this.mx / dt : 0;
    this.vy = dt > 0 ? this.my / dt : 0;
  }

  // Yo indico si una caja se solapa horizontalmente conmigo.
  overlapsX(box) { return box.x + box.w > this.x + 0.02 && box.x < this.x + this.w - 0.02; }
}
