<div align="center">

<img src="assets/icons/icon-512.png" width="120" alt="Logo de BLIPO" />

# BLIPO

### Un ojo. Dos saltos. Cero excusas.

[![Jugar ahora](https://img.shields.io/badge/▶_JUGAR_AHORA-blipo.elmundodemanu.com-2DE1C2?style=for-the-badge&labelColor=1A1433)](https://blipo.elmundodemanu.com)

<a href="https://blipo.elmundodemanu.com">
  <img src="https://readme-typing-svg.demolab.com?font=Lilita+One&size=22&duration=2600&pause=900&color=2DE1C2&center=true&vCenter=true&width=560&lines=Plataformas+de+precisión.+Saltos+instantáneos.;52+niveles+en+5+mundos.;Reto+diario%2C+racha+de+fuego+%F0%9F%94%A5+y+supervivencia.;Sin+frameworks.+HTML+%2B+CSS+%2B+JavaScript+puro." alt="Typing SVG" />
</a>

[![Licencia](https://img.shields.io/badge/licencia-privada-FF5D4A?style=flat-square)](#-licencia)
![PWA](https://img.shields.io/badge/PWA-instalable-2DE1C2?style=flat-square&logo=pwa&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/JavaScript-ES_Modules-FFC23D?style=flat-square&logo=javascript&logoColor=1A1433)
![Canvas 2D](https://img.shields.io/badge/Render-Canvas_2D-4A3E8C?style=flat-square)
![Capacitor](https://img.shields.io/badge/Android-Capacitor-4A3E8C?style=flat-square&logo=android&logoColor=white)
![Offline](https://img.shields.io/badge/Offline-Service_Worker-2DE1C2?style=flat-square)

<br/>

<img src="assets/store/feature-graphic.png" width="100%" alt="BLIPO — arte destacado" />

</div>

<br/>

## ¿Qué es BLIPO?

**BLIPO** es un cíclope-gota turquesa con un único ojo enorme, protagonista de un juego de **plataformas de precisión** pensado para partidas cortas: muertes instantáneas sin castigo y esa sensación de *"una más"* que no te deja soltar el mando.

Corre en el navegador, se instala como **PWA**, funciona **offline** y se empaqueta como app nativa de Android con **Capacitor**. Todo construido desde cero, sin frameworks: HTML + CSS + JavaScript (ES Modules) puro sobre Canvas 2D.

> 🎮 **Pruébalo en producción:** **[blipo.elmundodemanu.com](https://blipo.elmundodemanu.com)**

<div align="center">

| 🕹️ Precisión | 🌍 5 mundos | 📅 Reto diario | ♾️ Supervivencia | 🎨 9 skins |
|:---:|:---:|:---:|:---:|:---:|
| Doble salto | 52 niveles | Racha 🔥 | 5 vidas | Chispas |

</div>

---

## 📑 Índice

- [Características](#-características)
- [Cómo correrlo en local](#-cómo-correrlo-en-local)
- [Controles](#-controles)
- [Mundos](#-mundos)
- [Identidad visual](#-identidad-visual)
- [Arquitectura del proyecto](#-arquitectura-del-proyecto)
- [Publicación](#-publicación)
- [Créditos](#-créditos)
- [Licencia](#-licencia)

---

## ✨ Características

<table>
<tr>
<td width="50%" valign="top">

**🧩 Contenido**
- 52 niveles en 5 mundos: 42 diseñados a mano (Cantera, Cavernas, Fundición y Glaciar) + 10 generados con semilla fija
- Cavernas con mecánicas propias: hongos saltarines, telarañas que frenan la caída y cuevas oscuras con cristales que iluminan
- Fundición con mecánicas propias: cintas transportadoras, llamaradas con ritmo y plataformas móviles
- Glaciar con mecánicas propias: hielo resbaloso, carámbanos que caen, viento lateral, ráfagas y corrientes que elevan
- Mapas de tamaño libre (anchos y altos) con cámara que sigue a Blipo y fondos con paralaje por mundo
- Reto diario: mismo nivel para todos, racha 🔥, premio creciente y botón para compartir
- Supervivencia: salas infinitas cada vez más difíciles, 5 vidas
- 17 logros y estadísticas de progreso

</td>
<td width="50%" valign="top">

**⚙️ Producto**
- Economía de chispas y 9 skins jugables
- ES / EN, alto contraste, reducir efectos
- Controles táctiles configurables + soporte de mando
- Instalación PWA y juego 100% offline

</td>
</tr>
</table>

---

## 🚀 Cómo correrlo en local

Los ES Modules **no funcionan** abriendo `index.html` con doble clic (`file://`). Hay que servirlo por HTTP:

```bash
# Opción A — Live Server (VS Code)
# clic derecho sobre index.html → "Open with Live Server"

# Opción B — servidor local
npm run dev
# abre http://localhost:5173
```

> ℹ️ El service worker (modo offline) se desactiva en `localhost` para no interferir mientras desarrollas. Para probarlo en local agrega `?sw=1` a la URL.

<details>
<summary><strong>📦 Compilar y empaquetar para Android (Capacitor)</strong></summary>

```bash
npm run build:web   # genera el build web optimizado
npm run cap:init    # agrega la plataforma Android (una sola vez)
npm run cap:sync    # sincroniza el build con el proyecto nativo
npm run cap:open    # abre el proyecto en Android Studio
```

</details>

---

## 🎮 Controles

| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Mover | ← → / A D | Stick / cruceta | Flechas abajo-izquierda |
| Saltar / doble salto | ↑ W Espacio Z K | A / X / Y | Botón grande |
| Pausa | Esc / P | Start | Botón ⏸ |
| Reiniciar | R | Select | Desde la pausa |

---

## 🌍 Mundos

| Mundo | Tono | Estrellas para abrir |
|---|---|:---:|
| 🪨 Cantera | Azul piedra | 0 |
| 🌿 Cavernas | Verde musgo · hongos, telarañas y oscuridad | 10 |
| 🔥 Fundición | Naranja óxido · cintas, llamaradas y plataformas móviles | 35 |
| ❄️ Glaciar | Celeste hielo · hielo resbaloso, carámbanos y viento | 65 |
| 🌌 Vacío | Violeta | 95 |

---

## 🎨 Identidad visual

<div align="center">

| Tinta | Piedra Violeta | Turquesa | Coral Lava | Oro Chispa | Hueso |
|:---:|:---:|:---:|:---:|:---:|:---:|
| ![#1A1433](https://placehold.co/60x30/1A1433/1A1433.png) | ![#4A3E8C](https://placehold.co/60x30/4A3E8C/4A3E8C.png) | ![#2DE1C2](https://placehold.co/60x30/2DE1C2/2DE1C2.png) | ![#FF5D4A](https://placehold.co/60x30/FF5D4A/FF5D4A.png) | ![#FFC23D](https://placehold.co/60x30/FFC23D/FFC23D.png) | ![#F4EEDF](https://placehold.co/60x30/F4EEDF/F4EEDF.png) |
| `#1A1433` | `#4A3E8C` | `#2DE1C2` | `#FF5D4A` | `#FFC23D` | `#F4EEDF` |

</div>

- **Tipografía:** [Lilita One](assets/fonts) para títulos y logo, **Nunito** para interfaz y textos (incluidas localmente, licencia SIL OFL).
- **Elemento memorable:** todos los botones tienen *bisel de piedra* — se ven como los bloques del nivel y se "hunden" al presionarlos.

📖 Detalle completo en [`docs/IDENTIDAD.md`](docs/IDENTIDAD.md).

---

## 🏗️ Arquitectura del proyecto

```
blipo/
├─ index.html            # Punto de entrada
├─ manifest.webmanifest  # Configuración PWA
├─ sw.js                 # Service worker (offline)
├─ capacitor.config.json # Empaquetado Android
├─ css/                  # Tokens, componentes, pantallas, responsive
├─ js/
│  ├─ core/   engine/   entities/   systems/
│  ├─ game/   levels/   ui/   i18n/   app/
│  └─ main.js
├─ assets/               # Iconos, fuentes, arte de tienda
├─ tools/                # brand.html, build-web.mjs
└─ docs/                 # Arquitectura, identidad, publicación
```

📖 Mapa completo del código en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

**Para regenerar íconos:** abre `tools/brand.html` con Live Server y descarga cada imagen — usa el mismo código que dibuja al personaje dentro del juego.

---

## 📱 Publicación

BLIPO está publicado y disponible para jugar en:

<div align="center">

### 🔗 [blipo.elmundodemanu.com](https://blipo.elmundodemanu.com)

</div>

Instalable como PWA en cualquier dispositivo (Android, iOS, escritorio) y preparado para publicarse en **Play Store** vía Capacitor. Guía completa en [`docs/PLAY_STORE.md`](docs/PLAY_STORE.md).

---

## 👤 Créditos

<div align="center">

Creado con 💜 por **Carlos Manuel Turizo Hernández**
**El Mundo de Manu**

[![Sitio web](https://img.shields.io/badge/🌐_Sitio_web-elmundodemanu.com-2DE1C2?style=flat-square)](https://blipo.elmundodemanu.com)

</div>

## 📄 Licencia

Proyecto privado — todos los derechos reservados © Carlos Manuel Turizo Hernández.

<div align="center">
<sub>Un ojo. Dos saltos. Cero excusas. 👁️</sub>
</div>
</content>
