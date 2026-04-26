/**
 * Frontend safety-net filter for AI restaurant research. The Gemini prompt
 * already lists chains as a hard exclusion, but the model occasionally
 * slips one through (verified live: "Pizza Company" Thailand, "Burger King"
 * inside the burger category). Anything that matches this list gets
 * dropped from the AI results before they ever reach the user.
 *
 * The match is case-insensitive substring on the restaurant name. Indie
 * places that just happen to share a word (e.g. a local "Pizza Place" —
 * NOT a chain) would get false-positive blocked, so we keep the patterns
 * tight to the well-known brand strings only.
 */

const CHAIN_NAME_PATTERNS: RegExp[] = [
        // Global fast-food
        /\bmc\s*donald'?s\b/i,
        /\bburger\s*king\b/i,
        /\bkfc\b/i,
        /\bsubway\b/i,
        /\bwendy'?s\b/i,
        /\btaco\s*bell\b/i,
        /\bhardee'?s\b/i,
        /\bcarl'?s\s*jr\b/i,
        /\bfive\s*guys\b/i,
        /\bwingstop\b/i,
        /\bchick[- ]?fil[- ]?a\b/i,
        /\bpopeyes\b/i,
        /\bjollibee\b/i,
        /\bdairy\s*queen\b/i,
        /\barby'?s\b/i,

        // Pizza chains
        /\bpizza\s*hut\b/i,
        /\bdomino'?s\b/i,
        /\bpapa\s*john'?s\b/i,
        /\blittle\s*caesars\b/i,
        /\bpizza\s*inn\b/i,
        /\bround\s*table\s*pizza\b/i,
        /\bpizza\s*company\b/i,         // Thailand chain
        /\bthe\s*pizza\s*company\b/i,
        /\bpizza\s*marzano\b/i,

        // Coffee chains
        /\bstarbucks\b/i,
        /\bcosta\s*coffee\b/i,
        /\bcaff?[eè]\s*nero\b/i,
        /\btim\s*hortons\b/i,

        // Bakery/dessert chains
        /\bkrispy\s*kreme\b/i,
        /\bdunkin'?\b/i,
        /\bcold\s*stone\b/i,
];

const HEBREW_CHAIN_PATTERNS: RegExp[] = [
        /מקדונל'ד|מקדונלד'ס|מקדונלד/i,
        /בורגר\s*קינג/i,
        /קי?י?\s?פ?\s?סי?\s?\.?/i,  // KFC variants
        /סטארבקס/i,
        /פיצה\s*האט/i,
        /דומינו'?ס/i,
        /פיצה\s*קומפני/i,
];

export const isChainRestaurant = (name: string | undefined | null): boolean => {
        if (!name) return false;
        const trimmed = name.trim();
        if (!trimmed) return false;
        return (
                CHAIN_NAME_PATTERNS.some(re => re.test(trimmed)) ||
                HEBREW_CHAIN_PATTERNS.some(re => re.test(trimmed))
        );
};

/**
 * Filter an array of AI restaurant categories, dropping chain entries.
 * Returns categories with non-chain restaurants only — categories that
 * end up empty are kept so the UI can still show "no AI picks for this
 * category" instead of silently dropping the column.
 */
export const stripChainRestaurants = <T extends { name: string }>(
        restaurants: T[],
): T[] => restaurants.filter(r => !isChainRestaurant(r.name));
