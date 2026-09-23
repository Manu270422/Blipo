// Yo muestro notificaciones cortas que no interrumpen el juego.
export class Toast {
  // Yo guardo el contenedor.
  constructor(el) { this.el = el; }

  // Yo creo una notificación con ícono opcional.
  show(text, { icon = 'i-spark', variant = '' } = {}) {
    const node = document.createElement('div');
    node.className = `toast ${variant ? `toast--${variant}` : ''}`;
    node.innerHTML = `<svg class="icon"><use href="#${icon}"/></svg><span></span>`;
    // Yo uso textContent para no inyectar HTML.
    node.querySelector('span').textContent = text;
    this.el.appendChild(node);
    // Yo limito a 3 visibles.
    while (this.el.children.length > 3) this.el.firstChild.remove();
    // Yo lo elimino cuando termina su animación de salida.
    setTimeout(() => node.remove(), 2800);
  }
}
