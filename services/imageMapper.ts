
/**
 * Deep-Semantics Visual Engine v7 - ULTIMATE STABILITY
 * Resolved ReferenceError and optimized for maximum diversity.
 */

// --- 1. CORE DATA (TOP-MOST FOR SAFETY) ---

const FALLBACK_BANK = [
        'photo-1476514525535-07fb3b4ae5f1', 'photo-1500835556837-99ac94a94552',
        'photo-1469854523086-cc02fe5d8800', 'photo-1488646953014-85cb44e25828',
        'photo-1527631746610-bca00a040d60', 'photo-1473625247510-8ceb1760943f',
        'photo-1518709268805-4e9042af9f23', 'photo-1501785888041-af3ef285b470',
        'photo-1441974231531-c6227db76b6e', 'photo-1507525428034-b723cf961d3e'
];

interface ImageCategory {
        label: string;
        subCategories: Record<string, { ids: string[], label: string }>;
        genericIds: string[];
}

const IMAGE_DB: Record<string, ImageCategory> = {
        ramen: {
                label: '🍜 Ramen',
                subCategories: {
                        tonkotsu: { label: '🍜 Tonkotsu', ids: ['photo-1591814403971-da884bc52fb1', 'photo-1623341214825-9f4f9738c7c7', 'photo-1557872248-48bc0619a139', 'photo-1552611052-33e04de081de', 'photo-1591814441334-0f2c45791242', 'photo-1569437061241-a848be43cc82'] },
                        shoyu: { label: '🍜 Shoyu Ramen', ids: ['photo-1569718212165-3a8278d5f624', 'photo-1618413920153-6ec52973801f', 'photo-1569437061241-a848be43cc82', 'photo-1547592166-23ac45744acd', 'photo-1585032226651-759b368d7246'] },
                        dry: { label: '🍜 Mazesoba', ids: ['photo-1612929633738-8fe44f7ec841', 'photo-1582878826629-29b7ad1cdc43', 'photo-1526233940723-cd3505859124', 'photo-1552604660-a8dc4fed18b5'] }
                },
                genericIds: [
                        'photo-1569718212165-3a8278d5f624', 'photo-1557872248-48bc0619a139', 'photo-1591814403971-da884bc52fb1',
                        'photo-1547592166-23ac45744acd', 'photo-1618413920153-6ec52973801f', 'photo-1569437061241-a848be43cc82',
                        'photo-1509722747041-616f39b57569', 'photo-1552611052-33e04de081de', 'photo-1585032226651-759b368d7246',
                        'photo-1604537466158-719b197266a7', 'photo-1526318896980-cf78c088247c', 'photo-1582215500645-12e21293d0f4',
                        'photo-1598514982205-f36b96d1e8d4', 'photo-1552604660-a8dc4fed18b5', 'photo-1569443693539-175ea9f00768',
                        'photo-1476224203421-9ac39bcd33cb', 'photo-1504544750208-dc0358e63f7f', 'photo-1511910849309-0dffb8785146',
                        'photo-1543339308-43e59d6b73a6', 'photo-1512485600744-882390f7f3c0', 'photo-1590301157890-4810ed352733'
                ]
        },
        pizza: {
                label: '🍕 Pizza',
                subCategories: {
                        neapolitan: { label: '🍕 Neapolitan', ids: ['photo-1574071318508-1cdbab80d002', 'photo-1565299624946-b28f40a0ae38', 'photo-1593560708920-61dd98c46a4e', 'photo-1604382354936-07c5d9983bd3'] },
                        american: { label: '🍕 American', ids: ['photo-1513104890138-7c749659a591', 'photo-1534308983496-4fabb1a015ee', 'photo-1541745537411-b8046dc6d66c', 'photo-1544982503-9f984c14501a'] }
                },
                genericIds: [
                        'photo-1513104890138-7c749659a591', 'photo-1574071318508-1cdbab80d002', 'photo-1565299624946-b28f40a0ae38',
                        'photo-1593560708920-61dd98c46a4e', 'photo-1604382354936-07c5d9983bd3', 'photo-1511018556340-d16986a1c194',
                        'photo-1520201163981-8cc95007dd2a', 'photo-1534308983496-4fabb1a015ee', 'photo-1541745537411-b8046dc6d66c',
                        'photo-1590947132387-155cc02f3212', 'photo-1561350111-54737704724a', 'photo-1544982503-9f984c14501a',
                        'photo-1571407970349-bc81e7e96d47', 'photo-1594007654729-407eceeae721', 'photo-1566843972142-a7fcb70de55a'
                ]
        },
        burger: {
                label: '🍔 Burger',
                subCategories: {
                        smash: { label: '🍔 Smash Burger', ids: ['photo-1568901346375-23c9450c58cd', 'photo-1550547660-d9450f859349', 'photo-1586190812112-239567c69998'] },
                        gourmet: { label: '🍔 Gourmet Burger', ids: ['photo-1594212699903-ec8a3eca50f5', 'photo-1571091718767-18b5b1457add', 'photo-1553979459-d2229ba7143b'] }
                },
                genericIds: [
                        'photo-1568901346375-23c9450c58cd', 'photo-1594212699903-ec8a3eca50f5', 'photo-1571091718767-18b5b1457add',
                        'photo-1553979459-d2229ba7143b', 'photo-1572802419224-296b0aeee0d9', 'photo-1550547660-d9450f859349',
                        'photo-1586190812112-239567c69998', 'photo-1547584370-2cc98b8b8dc8', 'photo-1512152272829-d3139583845f',
                        'photo-1534422298391-e4f8c170db0f', 'photo-1499186024912-c374ac2e9922', 'photo-1551782450-a2132b4ba21d'
                ]
        }
        // ... Additional categories handled by default fallback if missing to prevent Crash
};

const ATTRACTION_DB: Record<string, ImageCategory> = {
        temple: { label: '⛩️ Temple', subCategories: {}, genericIds: ['photo-1563492065599-3520f775eeed', 'photo-1582234031737-25e640236a28'] },
        museum: { label: '🏛️ Museum', subCategories: {}, genericIds: ['photo-1518998053901-5348d3969105', 'photo-1544967082-d9d3fbc7b3cc'] }
};


// --- 2. LOGIC HELPERS ---

function selectFromPool(name: string, ids: string[]): string {
        if (!ids || ids.length === 0) return `https://images.unsplash.com/${FALLBACK_BANK[0]}?auto=format&fit=crop&w=800&q=80`;
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % ids.length;
        return `https://images.unsplash.com/${ids[index]}?auto=format&fit=crop&w=800&q=80`;
}


// --- 3. EXPORTED ENGINE ---

console.log("Deep-Semantics Visual Engine v7 Loaded");

export function getPlaceImage(name: string, type: string, tags: string[] = []): { url: string, label: string } {
        const lowerName = (name || "").toLowerCase();
        const allTags = (tags || []).map(t => t.toLowerCase());
        const query = `${lowerName} ${allTags.join(' ')}`;

        try {
                // Tier 1: Food Scanners
                if (type === 'food' || type === 'restaurant') {
                        if (query.includes('ramen') || query.includes('noodle') || query.includes('soup') || query.includes('japanese')) {
                                return { url: selectFromPool(name, IMAGE_DB.ramen.genericIds), label: IMAGE_DB.ramen.label };
                        }
                        if (query.includes('pizza') || query.includes('pizzeria') || query.includes('italian')) {
                                return { url: selectFromPool(name, IMAGE_DB.pizza.genericIds), label: IMAGE_DB.pizza.label };
                        }
                        if (query.includes('burger') || query.includes('hamburger')) {
                                return { url: selectFromPool(name, IMAGE_DB.burger.genericIds), label: IMAGE_DB.burger.label };
                        }
                }

                // Tier 2: Attraction Scanners
                if (type === 'attraction' || type === 'activity') {
                        if (query.includes('temple') || query.includes('wat') || query.includes('shrine')) {
                                return { url: selectFromPool(name, ATTRACTION_DB.temple.genericIds), label: ATTRACTION_DB.temple.label };
                        }
                        if (query.includes('museum') || query.includes('gallery')) {
                                return { url: selectFromPool(name, ATTRACTION_DB.museum.genericIds), label: ATTRACTION_DB.museum.label };
                        }
                }

                // Tier 3: Universal Fallback
                return { url: selectFromPool(name, FALLBACK_BANK), label: '📍 Destination' };
        } catch (e) {
                console.error("Visual Engine Fallback Triggered:", e);
                return { url: `https://images.unsplash.com/${FALLBACK_BANK[0]}?auto=format&fit=crop&w=800&q=80`, label: '📍 Destination' };
        }
}
