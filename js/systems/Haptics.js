// Yo manejo la vibración en móviles respetando la preferencia del jugador.
export class Haptics {
  // Yo arranco activado.
  constructor() { this.enabled = true; }
  // Yo vibro con un patrón si el dispositivo lo soporta.
  pulse(pattern = 12) {
    // Yo salgo si está desactivado o no hay soporte.
    if (!this.enabled || !('vibrate' in navigator)) return;
    // Yo protejo contra navegadores que lanzan error sin gesto del usuario.
    try { navigator.vibrate(pattern); } catch { /* Yo ignoro el error silenciosamente. */ }
  }
}
