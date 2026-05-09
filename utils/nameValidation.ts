/**
 * Detects when an AI-generated `name` field is actually a street address.
 * Used to reject hallucinations like `name: "464 Moo 9"` (the address)
 * before they reach the UI / map popup as a place name.
 */

const ADDRESS_PATTERNS: RegExp[] = [
  // Thai: "464 Moo 9", "12/3 Moo 5", "55 M.7"
  /^\d+(?:\s*\/\s*\d+)?\s*(?:moo|soi|m\.|m\b)\b/i,
  // English road tokens at the very start: "464 Sukhumvit Road", "12 Beach Road"
  /^\d+\s+(?:road|rd\.?|street|st\.?|avenue|ave\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|highway|hwy\.?|way)\b/i,
  // Pure numeric prefix with no real word body — at most a road-ish token
  /^[A-Z]?\d{1,5}(?:\s*[\/-]\s*\d+)?\s*[A-Za-z]{0,12}$/,
  // Hebrew variants: "רחוב 14", "רחוב הרצל 7" rarely appears as a name but a leading number is suspicious
  /^\d+\s*[,\-\.]\s*[א-ת]{0,15}$/,
  // Coordinate-shape: "13.7563, 100.5018"
  /^-?\d+\.\d+\s*,\s*-?\d+\.\d+/,
  // Lat/Lng marker
  /^lat\s*:\s*-?\d/i,
  // Soi without leading digits but very short
  /^(?:soi|moo)\s+\d+\s*$/i,
];

const KNOWN_GOOD_PREFIXES: RegExp[] = [
  // Avoid false-positives on legitimate venue names that start with numbers
  // (e.g. "7-Eleven", "21 Restaurant", "1881 Heritage").
  /^\d{1,4}\s*[-–]\s*[A-Za-z][\w]/,        // "7-Eleven", "100-Word"
  /^\d{2,4}\s+[A-Z][a-z]{3,}\b(?!\s+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Lane))/,  // "1881 Heritage"
  /^\d+\s+(?:restaurant|cafe|bar|club|hotel|spa)\b/i, // "21 Restaurant"
];

/**
 * True when the input string looks like a street address rather than
 * an establishment name. Tolerates legitimate names that begin with
 * numbers (7-Eleven, 1881 Heritage) via the whitelist above.
 */
export const looksLikeAddress = (name: string | undefined | null): boolean => {
  const s = (name || '').trim();
  if (!s || s.length < 3) return false;
  for (const ok of KNOWN_GOOD_PREFIXES) if (ok.test(s)) return false;
  return ADDRESS_PATTERNS.some(p => p.test(s));
};
