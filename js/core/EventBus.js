// Yo creo un bus de eventos para desacoplar el juego de la interfaz.
export class EventBus {
  // Yo inicializo el mapa de suscriptores.
  constructor() { this.map = new Map(); }

  // Yo registro un oyente y devuelvo una función para desuscribirlo.
  on(type, fn) {
    // Yo creo el set del evento si todavía no existe.
    if (!this.map.has(type)) this.map.set(type, new Set());
    // Yo agrego el oyente.
    this.map.get(type).add(fn);
    // Yo devuelvo el "unsubscribe".
    return () => this.off(type, fn);
  }

  // Yo elimino un oyente.
  off(type, fn) { this.map.get(type)?.delete(fn); }

  // Yo emito un evento y aíslo errores para que un oyente no rompa a los demás.
  emit(type, payload) {
    // Yo recorro cada oyente del evento.
    this.map.get(type)?.forEach((fn) => {
      // Yo protejo la ejecución.
      try { fn(payload); } catch (err) { console.error(`[bus:${type}]`, err); }
    });
  }
}

// Yo exporto una única instancia compartida.
export const bus = new EventBus();
