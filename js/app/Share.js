// Yo comparto resultados con la hoja nativa del sistema o, si no existe, copio al portapapeles.
import { t } from '../core/I18n.js';

const PUBLIC_GAME_URL = 'https://blipo.elmundodemanu.com/';

// Yo intento compartir un texto y aviso al jugador del resultado.
export async function shareText(text, toast) {
  const full = `${text}\n${PUBLIC_GAME_URL}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'BLIPO', text: full });
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }

  try {
    await navigator.clipboard.writeText(full);
    toast.show(t('copied'), { icon: 'i-check' });
  } catch {
    const area = document.createElement('textarea');
    area.value = full;
    area.readOnly = true;
    area.style.cssText = 'position: fixed; left: 0; top: 0; opacity: 0;';
    const focused = document.activeElement;
    document.body.appendChild(area);
    let copied = false;
    try {
      area.select();
      copied = document.execCommand('copy');
    } catch {
      // Algunos WebViews también bloquean este método.
    } finally {
      area.remove();
      focused?.focus({ preventScroll: true });
    }
    if (copied) toast.show(t('copied'), { icon: 'i-check' });
    else window.prompt(t('share'), full);
  }
}
