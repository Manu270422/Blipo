// Yo resuelvo el movimiento contra la grilla por ejes separados (primero X, luego Y).
const EPS = 1e-6;

// Yo muevo un cuerpo y devuelvo qué tocó.
export function moveAndCollide(body, map, dt) {
  // Yo preparo el resultado.
  const res = { onGround: false, ceiling: false, wallL: false, wallR: false, groundTiles: [] };

  // ---- Eje X ----
  // Yo aplico el desplazamiento horizontal (sumo el arrastre de cintas, plataformas y viento, si hay).
  const vx = body.vx + (body.carryX || 0) + (body.windX || 0);
  body.x += vx * dt;
  // Yo calculo las filas que ocupa el cuerpo.
  const ry0 = Math.floor(body.y + EPS), ry1 = Math.floor(body.y + body.h - EPS);
  if (vx > 0) {
    // Yo reviso la columna del borde derecho.
    const cx = Math.floor(body.x + body.w - EPS);
    for (let y = ry0; y <= ry1; y++) if (map.isSolid(cx, y)) { body.x = cx - body.w; body.vx = 0; res.wallR = true; break; }
  } else if (vx < 0) {
    // Yo reviso la columna del borde izquierdo.
    const cx = Math.floor(body.x + EPS);
    for (let y = ry0; y <= ry1; y++) if (map.isSolid(cx, y)) { body.x = cx + 1; body.vx = 0; res.wallL = true; break; }
  }

  // ---- Eje Y ----
  // Yo aplico el desplazamiento vertical.
  body.y += body.vy * dt;
  // Yo calculo las columnas que ocupa el cuerpo.
  const cx0 = Math.floor(body.x + EPS), cx1 = Math.floor(body.x + body.w - EPS);
  // Yo sé hacia dónde cae el cuerpo: 1 hacia abajo (normal) o -1 hacia arriba (gravedad invertida).
  const g = body.g || 1;
  // Yo guardo como "suelo" lo que toco del lado de los pies y como "techo" lo del lado de la cabeza.
  const hit = (tiles) => {
    if (!tiles.length) return;
    body.vy = 0;
    if ((body.y + body.h / 2 < tiles[0].y + 0.5) === (g > 0)) { res.onGround = true; res.groundTiles.push(...tiles); } else res.ceiling = true;
  };
  if (body.vy > 0) {
    // Yo reviso la fila de abajo.
    const fy = Math.floor(body.y + body.h - EPS);
    const tiles = [];
    for (let x = cx0; x <= cx1; x++) if (map.isSolid(x, fy)) tiles.push({ x, y: fy });
    // Yo apoyo el cuerpo encima del bloque.
    if (tiles.length) body.y = fy - body.h;
    hit(tiles);
  } else if (body.vy < 0) {
    // Yo reviso la fila de arriba.
    const hy = Math.floor(body.y + EPS);
    const tiles = [];
    for (let x = cx0; x <= cx1; x++) if (map.isSolid(x, hy)) tiles.push({ x, y: hy });
    if (tiles.length) body.y = hy + 1;
    hit(tiles);
  }

  // ---- Sensores ----
  // Yo detecto paredes cercanas para el deslizamiento aunque no me esté moviendo.
  const my0 = Math.floor(body.y + 0.15), my1 = Math.floor(body.y + body.h - 0.15);
  const probeR = Math.floor(body.x + body.w + 0.04);
  const probeL = Math.floor(body.x - 0.04);
  for (let y = my0; y <= my1; y++) {
    if (map.isSolid(probeR, y)) res.touchR = true;
    if (map.isSolid(probeL, y)) res.touchL = true;
  }
  // Yo confirmo suelo cuando estoy quieto justo apoyado (debajo, o arriba con gravedad invertida).
  if (!res.onGround && body.vy * g >= 0) {
    if (g > 0) {
      const fy = Math.floor(body.y + body.h + 0.02);
      for (let x = cx0; x <= cx1; x++) if (map.isSolid(x, fy) && Math.abs(body.y + body.h - fy) < 0.03) { res.onGround = true; res.groundTiles.push({ x, y: fy }); }
    } else {
      const hy = Math.floor(body.y - 0.02);
      for (let x = cx0; x <= cx1; x++) if (map.isSolid(x, hy) && Math.abs(body.y - (hy + 1)) < 0.03) { res.onGround = true; res.groundTiles.push({ x, y: hy }); }
    }
  }
  return res;
}

// Yo apoyo un cuerpo sobre las plataformas móviles; devuelvo la plataforma que lo sostiene (o null).
export function landOnMovers(body, movers, prevBottom) {
  if (!movers.length || body.vy < 0) return null;
  const bottom = body.y + body.h;
  for (const m of movers) {
    if (!m.overlapsX(body)) continue;
    // Yo acepto el aterrizaje si los pies venían por encima del borde superior (con margen por su movimiento).
    if (prevBottom <= m.y - Math.min(0, m.my) + 0.05 && bottom >= m.y - 0.001) {
      body.y = m.y - body.h;
      body.vy = 0;
      return m;
    }
  }
  return null;
}
