/** Cuenta palabras del HTML (omite etiquetas). */
export function countWordsHTML(html: string): number {
  if (!html) return 0;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent || '';
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Calcula duración estimada en minutos (puede dar fracciones). */
export function estimateMinutes(html: string, wpm: number): number {
  const words = countWordsHTML(html);
  if (!wpm || wpm <= 0) return 0;
  return words / wpm;
}

export function formatMinutes(minutes: number): string {
  if (!minutes || minutes < 0.05) return '0 min';
  const totalSec = Math.round(minutes * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s}s`;
}
