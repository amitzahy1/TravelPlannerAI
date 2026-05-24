// Pure model categorizer. Given a model id from any provider, return a tier
// (STRONG / MEDIUM / FAST / TINY) and a capability set (MULTIMODAL / REASONING).
// Used by /api/sync-models to bucket each model in each provider's live catalog
// into the right fallback chain.
//
// Rules (tested against Gemini, Groq, OpenRouter, OpenAI, Anthropic, DeepSeek
// naming conventions as of 2026-05-21):
//   1. Size-token heuristic — `\d+(?:\.\d+)?b\b` → strong if ≥70B, medium if
//      ≥20B, fast if ≥5B, tiny otherwise.
//   2. Provider-specific suffix overrides (pro / flash / flash-lite / haiku /
//      sonnet / opus / mini / instant) — these win over the size heuristic.
//   3. Capability detection — vision/multimodal substring → MULTIMODAL.
//      r1 / reasoning / thinking / o1 / o3 / distill → REASONING.
//
// Pure function: no I/O, no side effects.

export type Tier = 'STRONG' | 'MEDIUM' | 'FAST' | 'TINY';
export type Capability = 'MULTIMODAL' | 'REASONING';
export type Provider = 'gemini' | 'groq' | 'openrouter' | 'openai' | 'anthropic' | 'unknown';

export interface ModelMeta {
  modelId: string;
  provider: Provider;
  tier: Tier;
  capabilities: Capability[];
}

export const detectProvider = (modelId: string): Provider => {
  const id = modelId.toLowerCase();
  if (id.startsWith('groq:')) return 'groq';
  if (id.startsWith('openrouter:')) return 'openrouter';
  if (id.startsWith('gemini-')) return 'gemini';
  if (id.startsWith('gpt-') || id.startsWith('o1-') || id.startsWith('o3-')) return 'openai';
  if (id.startsWith('claude-')) return 'anthropic';
  return 'unknown';
};

export const categorize = (modelId: string): ModelMeta => {
  const id = modelId.toLowerCase();
  const provider = detectProvider(modelId);
  let tier: Tier = 'MEDIUM';
  const caps: Capability[] = [];

  // 1) Size-token heuristic — find the FIRST occurrence of "Nb" where N is
  // 1+ digits. Catches "70b", "405b", "8b", "120b", and decimals like "8.5b".
  // We skip occurrences inside larger tokens to avoid matching version
  // numbers like "v3" (no `b` suffix, won't match anyway).
  const sizeMatch = id.match(/(\d+(?:\.\d+)?)b\b/);
  if (sizeMatch) {
    const b = parseFloat(sizeMatch[1]);
    if (b >= 70) tier = 'STRONG';
    else if (b >= 20) tier = 'MEDIUM';
    else if (b >= 5) tier = 'FAST';
    else tier = 'TINY';
  }

  // 2) Suffix / family overrides — these are stronger signals than raw size,
  // because they encode the vendor's intended positioning (e.g. Gemini Flash
  // is a 'MEDIUM' workhorse even though Google never publishes its size).
  if (/-flash-lite\b/.test(id)) tier = 'FAST';
  else if (/-flash\b/.test(id) && !/-lite/.test(id)) tier = 'MEDIUM';
  if (/gemini-.*-pro\b|gemini-.*pro[-:]?/.test(id)) tier = 'STRONG';
  if (/-instant\b|-mini\b|:mini\b|-nano\b|-tiny\b/.test(id)) tier = 'FAST';
  if (/-versatile\b|-large\b/.test(id)) tier = 'STRONG';

  // Anthropic Claude tier names
  if (/haiku/.test(id)) tier = 'FAST';
  if (/sonnet/.test(id)) tier = 'MEDIUM';
  if (/opus/.test(id)) tier = 'STRONG';

  // OpenAI: gpt-N (no suffix) = strong; gpt-N-mini/nano = fast (already caught above)
  // Stay in MEDIUM as default for unknown gpt-* sizes

  // 3) Capability detection
  // Multimodal: vision-tuned OR known multimodal families
  if (/vision/.test(id)) caps.push('MULTIMODAL');
  // All Gemini Pro variants support multimodal input
  if (/gemini-.*-pro\b/.test(id)) {
    if (!caps.includes('MULTIMODAL')) caps.push('MULTIMODAL');
  }
  // GPT-4o family is multimodal
  if (/^gpt-4o/.test(id)) {
    if (!caps.includes('MULTIMODAL')) caps.push('MULTIMODAL');
  }
  // Claude 3+ supports vision
  if (/^claude-3|^claude-4/.test(id)) {
    if (!caps.includes('MULTIMODAL')) caps.push('MULTIMODAL');
  }

  // Reasoning specialists
  if (/-r1\b|reasoning|thinking|distill|^o1-|^o3-|\/o1-|\/o3-/.test(id)) {
    caps.push('REASONING');
  }

  return { modelId, provider, tier, capabilities: caps };
};

// =====================================================================
// Chain assembly — given a list of ModelMeta, build SMART / SEARCH /
// FAST / DOC chains in the order that maximizes (quality, then cost,
// then probability-of-working).
// =====================================================================

const TIER_ORDER: Record<Tier, number> = {
  STRONG: 0,
  MEDIUM: 1,
  FAST: 2,
  TINY: 3,
};

// Provider preference within the same tier. Gemini first when budget allows
// (best quality + grounding), then Groq (free + fast), then OpenRouter
// (variety, sometimes flaky), then OpenAI/Anthropic (need payment).
const PROVIDER_ORDER: Record<Provider, number> = {
  gemini: 0,
  groq: 1,
  openrouter: 2,
  anthropic: 3,
  openai: 4,
  unknown: 9,
};

const sortByTierThenProvider = (a: ModelMeta, b: ModelMeta): number => {
  const tDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  if (tDiff !== 0) return tDiff;
  return PROVIDER_ORDER[a.provider] - PROVIDER_ORDER[b.provider];
};

export interface BuiltChains {
  SMART_CANDIDATES: string[];
  RESEARCH_CANDIDATES: string[];
  FAST_CANDIDATES: string[];
  DOC_CANDIDATES: string[];
}

export const buildChains = (models: ModelMeta[]): BuiltChains => {
  // SMART: heavy first per the trip-creation-quality rule. STRONG → MEDIUM → FAST.
  const smart = [...models].sort(sortByTierThenProvider).map(m => m.modelId);

  // SEARCH: Gemini first (only family that supports grounding), then strong
  // ungrounded fallbacks. We DON'T filter to only Gemini — non-Gemini models
  // still produce useful (ungrounded) lists when Gemini fails.
  const research = [
    ...models.filter(m => m.provider === 'gemini' && m.tier !== 'STRONG'),
    ...models.filter(m => m.provider === 'gemini' && m.tier === 'STRONG'),
    ...models.filter(m => m.provider !== 'gemini').sort(sortByTierThenProvider),
  ].map(m => m.modelId);

  // FAST: small fast models first (TINY then FAST), then MEDIUM as fallback.
  // Drop STRONG entries entirely — chat doesn't need them.
  const fast = [
    ...models.filter(m => m.tier === 'FAST'),
    ...models.filter(m => m.tier === 'TINY'),
    ...models.filter(m => m.tier === 'MEDIUM'),
  ].sort(sortByTierThenProvider).map(m => m.modelId);

  // DOC: multimodal-capable first (Gemini Pro, GPT-4o, Claude 3+), then strong
  // text-only fallbacks for when content is already extracted upstream.
  const doc = [
    ...models.filter(m => m.capabilities.includes('MULTIMODAL')).sort(sortByTierThenProvider),
    ...models.filter(m => !m.capabilities.includes('MULTIMODAL') && m.tier === 'STRONG').sort(sortByTierThenProvider),
  ].map(m => m.modelId);

  return {
    SMART_CANDIDATES: smart,
    RESEARCH_CANDIDATES: research,
    FAST_CANDIDATES: fast,
    DOC_CANDIDATES: doc,
  };
};
