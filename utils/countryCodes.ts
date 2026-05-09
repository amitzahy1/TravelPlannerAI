/**
 * Tiny lookup: free-text country/destination string → ISO 3166-1 alpha-2.
 * Used to add `gl=` hints to Google Maps URLs and to pin AI prompts to a
 * specific country bbox. Not exhaustive — covers the destinations we
 * actually see in the app.
 */

const TABLE: Array<[RegExp, string]> = [
  [/\bthailand|thai|תאילנד|בנגקוק|פוקט|פטאיה|פטא|צ'אנג|פוקט|פוקט|chiang|phuket|pattaya|krabi|samui\b/i, 'TH'],
  [/\bjapan|japanese|יפן|טוקיו|אוסקה|tokyo|osaka|kyoto\b/i, 'JP'],
  [/\bvietnam|וייטנאם|hanoi|saigon|ho chi minh|han[ao]i\b/i, 'VN'],
  [/\bsingapore|סינגפור\b/i, 'SG'],
  [/\bmalaysia|מלזיה|kuala|penang\b/i, 'MY'],
  [/\bindonesia|indonesi|bali|jakarta|אינדונזיה\b/i, 'ID'],
  [/\bphilippines|פיליפינים|manila|cebu\b/i, 'PH'],
  [/\bsouth korea|korea|קוריאה|seoul|busan\b/i, 'KR'],
  [/\bchina|סין|shanghai|beijing\b/i, 'CN'],
  [/\btaiwan|טייוואן|taipei\b/i, 'TW'],
  [/\bhong kong|הונג קונג\b/i, 'HK'],
  [/\bindia|הודו|delhi|mumbai|goa\b/i, 'IN'],
  [/\bsri lanka|colombo\b/i, 'LK'],
  [/\bnepal|kathmandu|נפאל\b/i, 'NP'],
  [/\busa|united states|new york|los angeles|san francisco|nyc|לוס אנג'לס|ניו יורק|ארה"ב\b/i, 'US'],
  [/\bcanada|toronto|vancouver|קנדה\b/i, 'CA'],
  [/\bmexico|מקסיקו|tulum|cancun\b/i, 'MX'],
  [/\buk|england|united kingdom|אנגליה|לונדון|london|edinburgh\b/i, 'GB'],
  [/\bireland|אירלנד|dublin\b/i, 'IE'],
  [/\bfrance|צרפת|paris|פריז|nice|marseille\b/i, 'FR'],
  [/\bgermany|גרמניה|berlin|munich|ברלין\b/i, 'DE'],
  [/\bitaly|איטליה|rome|רומא|milan|מילאנו|venice|florence\b/i, 'IT'],
  [/\bspain|ספרד|madrid|barcelona|ברצלונה\b/i, 'ES'],
  [/\bportugal|פורטוגל|lisbon|porto\b/i, 'PT'],
  [/\bnetherlands|הולנד|amsterdam|אמסטרדם\b/i, 'NL'],
  [/\bbelgium|בלגיה|brussels|brugge\b/i, 'BE'],
  [/\bswitzerland|שווייץ|zurich|geneva\b/i, 'CH'],
  [/\baustria|אוסטריה|vienna|וינה\b/i, 'AT'],
  [/\bczech|צ'כיה|prague|פראג\b/i, 'CZ'],
  [/\bhungary|הונגריה|budapest|בודפשט\b/i, 'HU'],
  [/\bpoland|פולין|warsaw|krakow\b/i, 'PL'],
  [/\bgreece|יוון|athens|אתונה|santorini|crete|כרתים\b/i, 'GR'],
  [/\bturkey|טורקיה|istanbul|איסטנבול|antalya\b/i, 'TR'],
  [/\bcroatia|קרואטיה|zagreb|split|dubrovnik\b/i, 'HR'],
  [/\bgeorgia|גאורגיה|tbilisi\b/i, 'GE'],
  [/\bisrael|ישראל|tel aviv|jerusalem|תל אביב|ירושלים\b/i, 'IL'],
  [/\buae|emirates|dubai|abu dhabi|דובאי|איחוד\b/i, 'AE'],
  [/\begypt|מצרים|cairo|sharm\b/i, 'EG'],
  [/\bmorocco|מרוקו|marrakesh|casablanca\b/i, 'MA'],
  [/\bjordan|ירדן|amman|petra\b/i, 'JO'],
  [/\bsouth africa|cape town|johannesburg|דרום אפריקה\b/i, 'ZA'],
  [/\bargentina|ארגנטינה|buenos aires\b/i, 'AR'],
  [/\bbrazil|ברזיל|rio|sao paulo|סאו פאולו\b/i, 'BR'],
  [/\bperu|פרו|cusco|lima\b/i, 'PE'],
  [/\bchile|צ'ילה|santiago\b/i, 'CL'],
  [/\baustralia|אוסטרליה|sydney|melbourne\b/i, 'AU'],
  [/\bnew zealand|ניו זילנד|auckland|wellington\b/i, 'NZ'],
];

/**
 * Best-effort lookup. Returns the ISO alpha-2 code (lowercased for `gl=`
 * URL params) or undefined when nothing matches. Pass either the trip's
 * `destination`, `destinationEnglish`, or any free-text city/country
 * string — it will scan all of them.
 */
export function detectCountryCode(...inputs: Array<string | undefined | null>): string | undefined {
  const haystack = inputs.filter(Boolean).join(' ');
  if (!haystack) return undefined;
  for (const [pattern, code] of TABLE) {
    if (pattern.test(haystack)) return code;
  }
  return undefined;
}
