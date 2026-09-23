// Yo comparto resultados con la hoja nativa del sistema o, si no existe, copio al portapapeles.
import { t } from '../core/I18n.js';

// Yo intento compartir un texto y aviso al jugador del resultado.
export async function shareText(text, toast) {
  // Yo agrego el enlace del juego si está publicado en la web.
  const url = location.protocol.startsWith('http') ? location.origin + location.pathname : '';
  const full = url ? `${text}\n${url}` : text;
  try {
    // Yo uso la API nativa (Android, iOS, Chrome de escritorio).
    if (navigator.share) { await navigator.share({ title: 'BLIPO', text: full }); return; }
  } catch (err) {
    // Yo no hago nada si el jugador canceló la hoja de compartir.
    if (err && err.name === 'AbortError') return;
  }
  try {
    // Yo copio al portapapeles como alternativa.
    await navigator.clipboard.writeText(full);
    toast.show(t('copied'), { icon: 'i-check' });
  } catch {
    // Yo uso el método antiguo si el portapapeles moderno no está permitido.
    const area = document.createElement('textarea');
    area.value = full;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    toast.show(t('copied'), { icon: 'i-check' });
  }
}
