// Yo resuelvo el movimiento contra la grilla por ejes separados (primero X, luego Y).
const EPS = 1e-6;

// Yo muevo un cuerpo y devuelvo qué tocó.
export function moveAndCollide(body, map, dt) {
  // Yo preparo el resultado.
  const res = { onGround: false, ceiling: false, wallL: false, wallR: false, groundTiles: [] };

  // ---- Eje X ----
  // Yo aplico el desplazamiento horizontal.
  body.x += body.vx * dt;
  // Yo calculo las filas que ocupa el cuerpo.
  const ry0 = Math.floor(body.y + EPS), ry1 = Math.floor(body.y + body.h - EPS);
  if (body.vx > 0) {
    // Yo reviso la columna del borde derecho.
    const cx = Math.floor(body.x + body.w - EPS);
    for (let y = ry0; y <= ry1; y++) if (map.isSolid(cx, y)) { body.x = cx - body.w; body.vx = 0; res.wallR = true; break; }
  } else if (body.vx < 0) {
    // Yo reviso la columna del borde izquierdo.
    const cx = Math.floor(body.x + EPS);
    for (let y = ry0; y <= ry1; y++) if (map.isSolid(cx, y)) { body.x = cx + 1; body.vx = 0; res.wallL = true; break; }
  }

  // ---- Eje Y ----
  // Yo aplico el desplazamiento vertical.
  body.y += body.vy * dt;
  // Yo calculo las columnas que ocupa el cuerpo.
  const cx0 = Math.floor(body.x + EPS), cx1 = Math.floor(body.x + body.w - EPS);
  if (body.vy > 0) {
    // Yo reviso la fila de los pies.
    const fy = Math.floor(body.y + body.h - EPS);
    for (let x = cx0; x <= cx1; x++) {
      if (map.isSolid(x, fy)) { res.onGround = true; res.groundTiles.push({ x, y: fy }); }
    }
    // Yo apoyo el cuerpo encima del suelo.
    if (res.onGround) { body.y = fy - body.h; body.vy = 0; }
  } else if (body.vy < 0) {
    // Yo reviso la fila de la cabeza.
    const hy = Math.floor(body.y + EPS);
    for (let x = cx0; x <= cx1; x++) if (map.isSolid(x, hy)) { body.y = hy + 1; body.vy = 0; res.ceiling = true; break; }
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
  // Yo confirmo suelo cuando estoy quieto justo encima de él.
  if (!res.onGround && body.vy >= 0) {
    const fy = Math.floor(body.y + body.h + 0.02);
    for (let x = cx0; x <= cx1; x++) if (map.isSolid(x, fy) && Math.abs(body.y + body.h - fy) < 0.03) { res.onGround = true; res.groundTiles.push({ x, y: fy }); }
  }
  return res;
}
