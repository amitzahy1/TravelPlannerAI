// Shared JSON sanitizer for LLM / paste output that's almost-valid JSON.
//
// LLM-generated JSON regularly contains two corruptions that make JSON.parse
// reject the entire blob:
//   1. Unescaped control characters inside string values (literal \n, \r, \t,
//      or anything < 0x20). Common when the model emits multi-line strings
//      verbatim instead of escaping. Error: "Bad control character in string
//      literal at position N".
//   2. Unescaped " characters inside string values — e.g. Hebrew acronym
//      להט"ב, English contractions like "the 'best' place", or anything the
//      model decided to quote without escaping. Error: "Expected ',' or '}'
//      after property value".
//
// Both are recoverable with a state-machine pass that walks the string and
// fixes the corruption only when we're inside a string literal. Used by:
//   - components/AdminView.tsx       — JSON-only paste path
//   - services/aiService.ts          — Deep Research fast-path, cleanJSON,
//                                       generateWithFallback strict-parse check

/**
 * Escape unescaped control chars and literal quotes that appear inside string
 * literals. Outside strings (in keys, structure, whitespace) the text is left
 * untouched. The unescaped-quote handling is a heuristic: when we see a "
 * while inside a string, peek past whitespace; if the next non-WS char is
 * structural (`,` `}` `]` `:` or end-of-input) it's a real terminator,
 * otherwise it's a literal quote that needs escaping.
 *
 * Pure function, no side effects. Safe to call on any string.
 */
export const sanitizeJsonControlChars = (s: string): string => {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { out += c; escape = false; continue; }
    if (c === '\\') { out += c; escape = true; continue; }
    if (c === '"') {
      if (!inString) {
        inString = true;
        out += c;
      } else {
        let j = i + 1;
        while (j < s.length && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r')) j++;
        const next = s[j];
        if (next === undefined || next === ',' || next === '}' || next === ']' || next === ':') {
          inString = false;
          out += c;
        } else {
          out += '\\"';
        }
      }
      continue;
    }
    if (inString) {
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
      const code = c.charCodeAt(0);
      if (code < 0x20) { out += '\\u' + code.toString(16).padStart(4, '0'); continue; }
    }
    out += c;
  }
  return out;
};

/**
 * Carve a `{...}` (or `[...]`) candidate out of `text` by finding the first
 * brace/bracket and the last matching one. Used to strip prose / ```json
 * fences / chat preamble that LLMs often emit around the actual JSON.
 *
 * Returns null when no balanced pair is found.
 */
export const extractJsonCandidate = (text: string): string | null => {
  const stripped = text.replace(/```json|```/g, '').trim();
  const firstBrace = stripped.indexOf('{');
  const firstBracket = stripped.indexOf('[');

  let start: number;
  let endChar: string;
  if (firstBrace === -1 && firstBracket === -1) return null;
  if (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket)) {
    start = firstBrace;
    endChar = '}';
  } else {
    start = firstBracket;
    endChar = ']';
  }
  const end = stripped.lastIndexOf(endChar);
  if (start < 0 || end <= start) return null;
  return stripped.slice(start, end + 1);
};

export interface LenientParseResult<T = any> {
  value: T;
  sanitized: boolean;       // true if the strict parse failed and the sanitizer recovered it
  strictError?: Error;      // the strict-parse error, if we had to sanitize
}

/**
 * Brace-balance recovery — when sanitizing wasn't enough to fix the JSON
 * (e.g. Llama truncated the response mid-array, leaving an unclosed `[`),
 * walk the string and find the last position where braces + brackets are
 * balanced, then truncate to that point and try to close it. Recovers
 * partial results from cut-off LLM responses instead of dropping the
 * whole payload.
 *
 * Returns null when no balanced prefix can be coaxed into valid JSON.
 */
const truncateToLastBalanced = (s: string): string | null => {
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let escape = false;
  // Track positions where the outermost structure is balanced (depth=0
  // and we're at the closing brace of the root object/array).
  let lastBalancedEnd = -1;
  let rootOpenIdx = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') { braceDepth++; if (rootOpenIdx < 0) rootOpenIdx = i; }
    else if (c === '}') { braceDepth--; if (braceDepth === 0 && bracketDepth === 0) lastBalancedEnd = i + 1; }
    else if (c === '[') { bracketDepth++; if (rootOpenIdx < 0) rootOpenIdx = i; }
    else if (c === ']') { bracketDepth--; if (braceDepth === 0 && bracketDepth === 0) lastBalancedEnd = i + 1; }
  }
  if (lastBalancedEnd > 0) return s.slice(0, lastBalancedEnd);

  // No fully-balanced root found. Try harder: if we're deep in an array,
  // close it at the last comma/element boundary before the cutoff.
  if (rootOpenIdx >= 0 && (braceDepth > 0 || bracketDepth > 0)) {
    // Find the last comma OR closing brace/bracket at any depth level
    // before the truncation, then synthesize closing braces/brackets.
    let lastEntryEnd = -1;
    braceDepth = 0; bracketDepth = 0; inString = false; escape = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') braceDepth++;
      else if (c === '}') { braceDepth--; lastEntryEnd = i; }
      else if (c === '[') bracketDepth++;
      else if (c === ']') { bracketDepth--; lastEntryEnd = i; }
      else if (c === ',' && (braceDepth + bracketDepth) >= 1) {
        // Comma at any depth — last complete sibling element ends here.
        lastEntryEnd = i;
      }
    }
    if (lastEntryEnd > rootOpenIdx) {
      // Truncate to just before the trailing comma if any, then close.
      const prefix = s.slice(0, lastEntryEnd).replace(/,\s*$/, '');
      // Recount depth at that point to know what to close
      let bD = 0, brD = 0, inS = false, esc = false;
      for (let i = 0; i < prefix.length; i++) {
        const c = prefix[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inS = !inS; continue; }
        if (inS) continue;
        if (c === '{') bD++; else if (c === '}') bD--;
        else if (c === '[') brD++; else if (c === ']') brD--;
      }
      let closer = '';
      while (brD-- > 0) closer += ']';
      while (bD-- > 0) closer += '}';
      return prefix + closer;
    }
  }
  return null;
};

/**
 * Strict-parse first; on failure, sanitize and retry. If sanitizing also
 * fails, attempt brace-balance recovery (truncate to last balanced point
 * + auto-close any open braces/brackets). Throws only when all three
 * passes fail.
 *
 * Callers that want to differentiate "valid JSON" from "almost-valid JSON"
 * can read `result.sanitized` to decide whether to show a user warning.
 */
export const parseJsonLenient = <T = any>(candidate: string): LenientParseResult<T> => {
  try {
    return { value: JSON.parse(candidate) as T, sanitized: false };
  } catch (strictErr: any) {
    const sanitizedText = sanitizeJsonControlChars(candidate);
    try {
      return {
        value: JSON.parse(sanitizedText) as T,
        sanitized: true,
        strictError: strictErr,
      };
    } catch (secondErr: any) {
      // Last resort — brace-balance recovery. Helps with Llama / GPT-OSS
      // truncating mid-array on long responses.
      const trimmed = truncateToLastBalanced(sanitizedText);
      if (trimmed) {
        try {
          const value = JSON.parse(trimmed) as T;
          console.warn(`⚠️ [jsonSanitizer] Recovered via brace-balance truncation (lost ${sanitizedText.length - trimmed.length} chars from the tail).`);
          return { value, sanitized: true, strictError: strictErr };
        } catch { /* fall through */ }
      }
      const wrapped = new Error(
        `JSON parse failed even after sanitization. strict="${strictErr?.message?.slice(0, 120) || strictErr}" sanitized="${secondErr?.message?.slice(0, 120) || secondErr}"`,
      );
      (wrapped as any).cause = strictErr;
      throw wrapped;
    }
  }
};
