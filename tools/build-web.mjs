// Yo copio solo los archivos del juego a /www para que Capacitor los empaquete en la app Android.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

// Yo defino qué entra en la app (sin docs, herramientas ni node_modules).
const INCLUDE = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets'];

// Yo limpio la carpeta de salida y la vuelvo a crear.
rmSync('www', { recursive: true, force: true });
mkdirSync('www');

// Yo copio cada elemento, excepto los gráficos de tienda que no van dentro del APK.
for (const item of INCLUDE) {
  cpSync(item, `www/${item}`, { recursive: true, filter: (src) => !src.includes('assets/store') });
}
console.log('✔ Juego copiado a /www');
