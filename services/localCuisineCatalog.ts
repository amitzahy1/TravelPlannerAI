/**
 * Country → local-cuisine catalog used by the "אוכל מקומי אותנטי" research
 * prompt. The catalog lists what the model should look for and what to
 * exclude so a restaurant qualifies only if it serves food locals actually
 * eat (or the country's signature cuisine), not foreign or fusion menus.
 *
 * Per the spec: a restaurant qualifies if its menu is dominated by either
 * (a) signature dishes of the country/region, or (b) everyday-local cuisine.
 * Examples: pizza/pasta in Italy, tom yum / pad thai / som tam in Thailand,
 * sushi / ramen in Japan, pho / banh mi in Vietnam, paella in Spain.
 */

export interface CuisineProfile {
  /** ISO 3166-1 alpha-2 — used by detectCountryCode + the Maps gl= hint. */
  countryCode: string;
  /** Country names this profile matches against (Hebrew + English). */
  matches: RegExp;
  /** Signature, nationally-recognised dishes. */
  signature: string[];
  /** Everyday-local categories (street food, market stalls, etc.). */
  everyday: string[];
  /** Restaurant categories that should be excluded from this category. */
  exclude: string[];
}

const PROFILES: CuisineProfile[] = [
  {
    countryCode: 'TH',
    matches: /\b(thailand|thai|תאילנד|בנגקוק|פוקט|פטאיה|chiang|phuket|pattaya|krabi|samui|ko\s?chang|קו\s?צ'אנג)\b/i,
    signature: ['tom yum', 'pad thai', 'som tam', 'massaman curry', 'green curry', 'red curry', 'khao soi', 'larb', 'gaeng keow wan', 'pad krapow', 'mango sticky rice', 'boat noodles', 'tom kha gai', 'gai yang', 'yam nua'],
    everyday: ['street food stalls', 'rice-and-curry shops (ข้าวแกง / khao gaeng)', 'noodle shops (ก๋วยเตี๋ยว)', 'papaya salad stalls', 'family-run khao soi shops', 'roadside grilled chicken (gai yang)', 'morning markets serving congee'],
    exclude: ['Western fusion', 'pan-Asian fusion rooftops', 'hotel restaurants serving Westernized Thai menus', 'international buffets', 'foreign-themed restaurants (Italian, French, etc.)', 'chains (Pizza Company, MK, Sizzler, Starbucks)'],
  },
  {
    countryCode: 'JP',
    matches: /\b(japan|japanese|יפן|טוקיו|אוסקה|kyoto|tokyo|osaka)\b/i,
    signature: ['sushi', 'sashimi', 'ramen', 'tempura', 'tonkatsu', 'soba', 'udon', 'okonomiyaki', 'takoyaki', 'yakitori', 'unagi', 'kaiseki', 'donburi', 'shabu shabu', 'sukiyaki'],
    everyday: ['neighbourhood izakaya', 'standing sushi bars', 'family-run ramen shops', 'kissaten cafes', 'depachika basement food halls', 'lunch teishoku spots', 'shokudo cafeterias'],
    exclude: ['Italian / French / American restaurants', 'pan-Asian fusion concepts', 'hotel buffets', 'foreign-themed chains'],
  },
  {
    countryCode: 'VN',
    matches: /\b(vietnam|וייטנאם|hanoi|saigon|ho\s?chi\s?minh|hoi\s?an|han[ao]i)\b/i,
    signature: ['pho', 'bun cha', 'banh mi', 'bun bo hue', 'ca kho to', 'cao lau', 'banh xeo', 'goi cuon', 'com tam', 'bun rieu'],
    everyday: ['streetside pho stalls', 'banh mi carts', 'family bun cha shops', 'morning markets', 'com binh dan (rice plate) shops'],
    exclude: ['Western restaurants', 'expat-targeted fusion concepts', 'hotel restaurants', 'international chains'],
  },
  {
    countryCode: 'IT',
    matches: /\b(italy|italian|איטליה|rome|רומא|milan|milano|venice|florence|sicil|napoli|naples)\b/i,
    signature: ['pizza napoletana', 'pasta', 'risotto', 'cacio e pepe', 'carbonara', 'amatriciana', 'lasagne', 'osso buco', 'tiramisu', 'gelato', 'arancini', 'porchetta'],
    everyday: ['neighbourhood trattorias', 'family-run pizzerias', 'osterias', 'gelaterias artigianali', 'pasticcerias', 'morning bars serving cornetto + espresso'],
    exclude: ['Italian-American style', 'fusion concepts', 'hotel fine-dining unless explicitly classic Italian', 'international chains'],
  },
  {
    countryCode: 'FR',
    matches: /\b(france|french|צרפת|paris|פריז|nice|lyon|marseille)\b/i,
    signature: ['steak frites', 'coq au vin', 'cassoulet', 'bouillabaisse', 'duck confit', 'soufflé', 'crêpes', 'foie gras', 'tarte tatin', 'ratatouille'],
    everyday: ['neighbourhood bistros', 'brasseries', 'boulangeries', 'fromageries with cafe seating', 'creperies'],
    exclude: ['fusion concepts', 'foreign cuisine restaurants', 'international chains'],
  },
  {
    countryCode: 'ES',
    matches: /\b(spain|spanish|ספרד|madrid|barcelona|ברצלונה|seville|granada|valencia|basque|bilbao|san\s?sebastian)\b/i,
    signature: ['paella', 'tapas', 'jamón ibérico', 'tortilla española', 'gazpacho', 'pintxos', 'fideuà', 'churros con chocolate', 'cocido madrileño', 'pulpo a la gallega'],
    everyday: ['neighbourhood tapas bars', 'pintxo bars in Basque country', 'mercado food stalls', 'family-run paella restaurants on the coast', 'churrerias'],
    exclude: ['fusion concepts', 'international cuisine restaurants', 'hotel buffets'],
  },
  {
    countryCode: 'GR',
    matches: /\b(greece|greek|יוון|athens|אתונה|santorini|crete|כרתים|mykonos|thessaloniki)\b/i,
    signature: ['moussaka', 'souvlaki', 'gyro', 'tzatziki', 'spanakopita', 'pastitsio', 'horiatiki salad', 'dolmades', 'baklava', 'loukoumades', 'fasolada'],
    everyday: ['family-run tavernas', 'souvlaki kiosks', 'fish tavernas on the coast', 'bakery-cafes serving spanakopita'],
    exclude: ['fusion concepts', 'international cuisine restaurants'],
  },
  {
    countryCode: 'TR',
    matches: /\b(turkey|turkish|טורקיה|istanbul|איסטנבול|antalya|izmir|cappadocia)\b/i,
    signature: ['kebab', 'döner', 'lahmacun', 'pide', 'meze', 'köfte', 'manti', 'pilav', 'baklava', 'simit', 'kumpir', 'iskender'],
    everyday: ['neighbourhood lokantas', 'street kebab stands', 'döner counters', 'meyhanes (meze + raki)', 'morning simit + cay carts'],
    exclude: ['Western/American restaurants', 'international cuisine concepts'],
  },
  {
    countryCode: 'IN',
    matches: /\b(india|indian|הודו|delhi|mumbai|goa|bangalore|kerala|rajasthan|jaipur|agra)\b/i,
    signature: ['biryani', 'butter chicken', 'tandoori', 'masala dosa', 'thali', 'samosa', 'chaat', 'paneer tikka', 'rogan josh', 'palak paneer', 'naan', 'idli sambar'],
    everyday: ['neighbourhood thali shops', 'street chaat stalls', 'south Indian tiffin places', 'Punjabi dhabas'],
    exclude: ['Western/Continental concepts', 'fusion restaurants', 'hotel buffets unless authentically Indian'],
  },
  {
    countryCode: 'KR',
    matches: /\b(korea|korean|קוריאה|seoul|busan)\b/i,
    signature: ['kimchi', 'bibimbap', 'bulgogi', 'samgyeopsal', 'tteokbokki', 'jjajangmyeon', 'kimchi jjigae', 'sundubu jjigae', 'galbi', 'naengmyeon', 'gimbap'],
    everyday: ['neighbourhood gogijip BBQ shops', 'pojangmacha tents', 'street tteokbokki carts', 'family-run kimchi jjigae shops'],
    exclude: ['fusion concepts', 'Western restaurants', 'international cuisine'],
  },
  {
    countryCode: 'CN',
    matches: /\b(china|chinese|סין|shanghai|beijing|chengdu|xian|hong\s?kong|הונג קונג|guangzhou)\b/i,
    signature: ['dim sum', 'xiaolongbao', 'peking duck', 'mapo tofu', 'kung pao chicken', 'hot pot', 'jianbing', 'zha jiang mian', 'cantonese roast meats', 'sichuan dan dan noodles', 'wonton'],
    everyday: ['neighbourhood dim sum teahouses', 'noodle shops', 'jianbing street carts', 'morning congee shops'],
    exclude: ['Westernized "Chinese" concepts', 'fusion', 'international hotel buffets'],
  },
  {
    countryCode: 'MX',
    matches: /\b(mexico|mexican|מקסיקו|tulum|cancun|oaxaca|mexico\s?city|cdmx)\b/i,
    signature: ['tacos al pastor', 'mole', 'cochinita pibil', 'pozole', 'chiles en nogada', 'tamales', 'enchiladas', 'tlayudas', 'birria', 'aguachile', 'ceviche'],
    everyday: ['taquerias on the corner', 'mercado food stalls', 'street tlayuda stands', 'family fondas'],
    exclude: ['Tex-Mex concepts unless explicitly Mexican-American hybrid', 'fusion', 'international chains'],
  },
];

export function findCuisineProfile(...inputs: Array<string | undefined | null>): CuisineProfile | null {
  const haystack = inputs.filter(Boolean).join(' ');
  if (!haystack) return null;
  for (const profile of PROFILES) {
    if (profile.matches.test(haystack)) return profile;
  }
  return null;
}

/**
 * Render the cuisine profile into a Hebrew + English prompt fragment that
 * can be embedded inside the AI research prompt for the
 * "אוכל מקומי אותנטי" category.
 */
export function buildAuthenticFoodSpec(profile: CuisineProfile | null): string {
  if (!profile) {
    return [
      `"אוכל מקומי אותנטי" definition: restaurants where the menu is dominated by the local country's signature dishes OR everyday cuisine eaten by locals.`,
      `MUST exclude: foreign-themed restaurants, fusion concepts, Westernized hotel restaurants, international chains, expat-targeted bistros.`,
      `If you cannot find at least 3 places that match this definition, return fewer — do NOT pad with generic restaurants.`,
    ].join('\n');
  }
  return [
    `"אוכל מקומי אותנטי" QUALIFIES when the menu is dominated by EITHER:`,
    `  (a) signature dishes of this country (examples: ${profile.signature.slice(0, 8).join(', ')}), OR`,
    `  (b) everyday local cuisine: ${profile.everyday.slice(0, 5).join('; ')}.`,
    `EXCLUDE: ${profile.exclude.join('; ')}.`,
    `The food MUST be what locals actually eat — not a foreign cuisine, not fusion, not a Westernized hotel menu.`,
    `If you cannot find at least 3 restaurants meeting this definition, return fewer — do NOT pad with generic, fusion, or foreign-themed restaurants.`,
  ].join('\n');
}
