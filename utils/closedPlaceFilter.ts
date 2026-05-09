/**
 * Drop AI-returned places whose `business_status` indicates they are
 * closed, or whose description leaks a "סגור זמנית"/"permanently closed"
 * phrase. The Gemini model sometimes ignores the prompt's explicit
 * "OMIT closed" instruction, so this is a belt-and-suspenders filter
 * that runs AFTER the prompt.
 */

const CLOSED_STATUSES = new Set([
  'CLOSED_TEMPORARILY',
  'CLOSED_PERMANENTLY',
  'CLOSED',
]);

const CLOSED_TEXT_PATTERNS = [
  /סגור\s+זמנית/i,
  /סגור\s+לצמיתות/i,
  /נסגר\b/i,
  /permanently\s+closed/i,
  /temporarily\s+closed/i,
  /no\s+longer\s+(in\s+)?(business|operating|open)/i,
  /closed\s+down/i,
];

const looksClosedText = (s: string | undefined | null): boolean => {
  if (!s) return false;
  return CLOSED_TEXT_PATTERNS.some(p => p.test(s));
};

interface ClosablePlace {
  business_status?: string;
  description?: string;
  notes?: string;
  status?: string;
}

/**
 * Returns the input list minus any item whose `business_status` is closed
 * or whose description / notes mention a closure phrase.
 */
export function stripClosedPlaces<T extends ClosablePlace>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(item => {
    const statusUp = String(item.business_status || item.status || '').toUpperCase().trim();
    if (statusUp && CLOSED_STATUSES.has(statusUp)) return false;
    if (looksClosedText(item.description)) return false;
    if (looksClosedText(item.notes)) return false;
    return true;
  });
}
