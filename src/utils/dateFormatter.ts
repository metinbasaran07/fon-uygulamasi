/**
 * Formats a TEFAS date string (YYYY-MM-DD or DD.MM.YYYY or ISO) into standard Turkish format: DD.MM.YYYY
 */
export function formatPriceDate(rawDate?: string | Date | null): string {
  if (!rawDate) return '';
  try {
    const s = String(rawDate).trim();
    if (!s) return '';

    // If it's already in DD.MM.YYYY format
    if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${d}.${m}.${y}`;
      }
    }

    // If it's in YYYY-MM-DD or ISO format
    if (s.includes('-')) {
      const clean = s.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD -> DD.MM.YYYY
          return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY -> DD.MM.YYYY
          return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
        }
      }
    }

    // Fallback to JS Date
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    }

    return String(rawDate);
  } catch {
    return String(rawDate || '');
  }
}
