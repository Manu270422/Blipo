// Yo soy el punto de entrada de BLIPO: solo arranco la aplicación.
import { App } from './app/App.js';

// Yo espero a que el DOM exista y levanto la app sobre el contenedor principal.
function start() {
  const root = document.getElementById('app');
  // Yo guardo la instancia en window solo para depurar desde la consola del navegador.
  window.blipo = new App(root).boot();
}

// Yo arranco de inmediato si el documento ya cargó.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
