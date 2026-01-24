export const IMAGE_BANK = {
        // Food Categories
        burger: [
                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
        ],
        pizza: [
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
        ],
        sushi: [
                'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80',
        ],
        thai: [
                'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1562565652-f472ce0066d8?auto=format&fit=crop&w=800&q=80', // Pad Thai vibe
                'https://images.unsplash.com/photo-1562565651-78c64188b839?auto=format&fit=crop&w=800&q=80',
        ],
        cafe: [
                'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=800&q=80',
        ],
        steak: [
                'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        ],
        seafood: [
                'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1626804475297-411dbcc76c74?auto=format&fit=crop&w=800&q=80',
        ],
        bar: [
                'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80',
        ],
        dessert: [
                'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1551024601-5637ade98e42?auto=format&fit=crop&w=800&q=80',
        ],

        // Attractions
        temple: [
                'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=800&q=80', // Thai Temple
                'https://images.unsplash.com/photo-1582234031737-25e640236a28?auto=format&fit=crop&w=800&q=80',
        ],
        beach: [
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80',
        ],
        park: [
                'https://images.unsplash.com/photo-1496347315686-5f274d046ccc?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1625234190130-f80c65590924?auto=format&fit=crop&w=800&q=80',
        ],
        mall: [
                'https://images.unsplash.com/photo-1519567241046-7f570eee3d9f?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1567449303078-57ad431de067?auto=format&fit=crop&w=800&q=80',
        ],
        market: [
                'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80', // Night Market
                'https://images.unsplash.com/photo-1553535919-4b62db9405d4?auto=format&fit=crop&w=800&q=80', // Floating market vibe
        ],
        museum: [
                'https://images.unsplash.com/photo-1518998053901-5348d3969105?auto=format&fit=crop&w=800&q=80',
        ],

        // Default / Generic
        default: [
                'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80', // Travel generic
                'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=800&q=80', // Travel generic 2
                'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80', // City vibe
        ]
};

export const getPlaceImage = (name: string, type: 'food' | 'attraction' | 'hotel' | 'shopping' | string, tags: string[] = []): string => {
        const lowerName = name.toLowerCase();
        const lowerType = type.toLowerCase();
        const allTags = tags.map(t => t.toLowerCase());

        // 1. Determine Category
        let category = 'default';

        if (lowerName.includes('burger') || allTags.includes('burger')) category = 'burger';
        else if (lowerName.includes('pizza') || allTags.includes('pizza')) category = 'pizza';
        else if (lowerName.includes('sushi') || allTags.includes('sushi') || allTags.includes('japanese')) category = 'sushi';
        else if (lowerName.includes('thai') || allTags.includes('thai')) category = 'thai';
        else if (lowerName.includes('cafe') || lowerName.includes('coffee') || allTags.includes('cafe')) category = 'cafe';
        else if (lowerName.includes('steak') || lowerName.includes('grill') || allTags.includes('steakhouse')) category = 'steak';
        else if (lowerName.includes('sea') || lowerName.includes('fish') || allTags.includes('seafood')) category = 'seafood';
        else if (lowerName.includes('bar') || lowerName.includes('pub') || allTags.includes('nightlife')) category = 'bar';
        else if (lowerName.includes('dessert') || lowerName.includes('ice cream')) category = 'dessert';

        else if (lowerName.includes('temple') || lowerName.includes('wat ') || allTags.includes('temple')) category = 'temple';
        else if (lowerName.includes('beach') || allTags.includes('beach')) category = 'beach';
        else if (lowerName.includes('park') || allTags.includes('nature')) category = 'park';
        else if (lowerName.includes('mall') || lowerName.includes('central') || allTags.includes('shopping')) category = 'mall';
        else if (lowerName.includes('market') || allTags.includes('market')) category = 'market';
        else if (lowerName.includes('museum') || allTags.includes('culture')) category = 'museum';

        // 2. Select Image Deterministically
        const targetArray = (IMAGE_BANK as any)[category] || IMAGE_BANK.default;

        // Hash function to get consistent index from string
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Ensure positive index
        const index = Math.abs(hash) % targetArray.length;

        return targetArray[index];
};
