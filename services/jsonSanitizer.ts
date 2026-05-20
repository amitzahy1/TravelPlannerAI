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
 * Strict-parse first; on failure, sanitize and retry. Throws the SANITIZED-pass
 * error (with the strict error attached as `.cause`) if both fail.
 *
 * Callers that want to differentiate "valid JSON" from "almost-valid JSON" can
 * read `result.sanitized` to decide whether to show a user warning.
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
      const wrapped = new Error(
        `JSON parse failed even after sanitization. strict="${strictErr?.message?.slice(0, 120) || strictErr}" sanitized="${secondErr?.message?.slice(0, 120) || secondErr}"`,
      );
      (wrapped as any).cause = strictErr;
      throw wrapped;
    }
  }
};
