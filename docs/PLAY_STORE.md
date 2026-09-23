# Publicar BLIPO en Google Play

## Opción recomendada: Capacitor (APK/AAB nativo)
Requisitos: Node 18+, Android Studio, JDK 17.

```bash
npm install
npm run build:web        # copia el juego a /www
npx cap add android      # solo la primera vez
npx cap sync android
npx cap open android     # abre Android Studio
```

En Android Studio:
1. **Íconos:** clic derecho en `app` → *New → Image Asset* → usa `assets/icons/maskable-512.png` (fondo `#1A1433`).
2. **Orientación y pantalla completa:** en `AndroidManifest.xml`, dentro de `<activity>`: `android:screenOrientation="fullUser"` y el tema *NoActionBar*.
3. **Versión:** en `app/build.gradle` sube `versionCode` y `versionName` en cada publicación.
4. **Firmar:** *Build → Generate Signed Bundle / APK → Android App Bundle*. Guarda el `.jks` y sus contraseñas en un lugar seguro: sin él no puedes actualizar la app.
5. Sube el `.aab` a Play Console.

Cada vez que cambies el juego: `npm run cap:sync` y vuelve a generar el bundle.

## Opción alternativa: TWA (Bubblewrap)
Si publicas el juego en un dominio con HTTPS (por ejemplo `blipo.elmundodemanu.com`):
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://TU-DOMINIO/manifest.webmanifest
bubblewrap build
```
Sube `assetlinks.json` a `/.well-known/` del dominio para quitar la barra del navegador.

## Ficha de Play Store (textos listos)
- **Nombre:** BLIPO: Un ojo, dos saltos
- **Descripción corta (80):** Plataformas de precisión: reto diario, supervivencia y 46 niveles. ¿Aguantas?
- **Descripción larga:**
  Blipo tiene un solo ojo y dos saltos. Tú pones las excusas… o no.
  • 46 niveles en 5 mundos: Cantera, Cavernas, Fundición, Glaciar y Vacío.
  • Reto diario: el mismo nivel para todo el mundo. Mantén tu racha y compártela.
  • Supervivencia: salas infinitas, 5 vidas, ¿hasta dónde llegas?
  • Doble salto, salto de pared, portales, resortes, bloques frágiles y sierras.
  • 3 estrellas por nivel, gemas ocultas, 17 logros y 9 skins.
  • Controles táctiles ajustables, teclado y mando. Funciona sin internet.
- **Categoría:** Juegos → Plataformas / Arcade · **Clasificación:** Para todos.
- **Gráficos:** ícono 512×512 (`assets/icons/icon-512.png`), gráfico destacado 1024×500 (`assets/store/feature-graphic.png`), mínimo 2 capturas (tómalas del juego en horizontal 16:9).

## Política de privacidad
Play la exige. BLIPO no recolecta datos: todo se guarda en el dispositivo. Publica una página simple que diga eso (puede ir en elmundodemanu.com) y pega el enlace en Play Console.
