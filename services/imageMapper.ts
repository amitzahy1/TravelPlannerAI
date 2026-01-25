
/**
 * Deep-Semantics Visual Engine v4 - Final Polish
 * Absolute maximum variety with massive image pools and hyper-refined keywords.
 */

interface ImageCategory {
        label: string;
        subCategories: Record<string, { ids: string[], label: string }>;
        genericIds: string[];
}

const IMAGE_DB: Record<string, ImageCategory> = {
        ramen: {
                label: '🍜 Ramen',
                subCategories: {
                        tonkotsu: {
                                label: '🍜 Tonkotsu',
                                ids: [
                                        'photo-1591814403971-da884bc52fb1', 'photo-1623341214825-9f4f9738c7c7', 'photo-1557872248-48bc0619a139',
                                        'photo-1552611052-33e04de081de', 'photo-1591814441334-0f2c45791242', 'photo-1569437061241-a848be43cc82',
                                        'photo-1547592166-23ac45744acd', 'photo-1618413920153-6ec52973801f', 'photo-1582878826629-29b7ad1cdc43',
                                        'photo-1526318896980-cf78c088247c', 'photo-1582215500645-12e21293d0f4', 'photo-1598514982205-f36b96d1e8d4'
                                ]
                        },
                        shoyu: {
                                label: '🍜 Shoyu Ramen',
                                ids: [
                                        'photo-1569718212165-3a8278d5f624', 'photo-1618413920153-6ec52973801f', 'photo-1569437061241-a848be43cc82',
                                        'photo-1547592166-23ac45744acd', 'photo-1585032226651-759b368d7246', 'photo-1509722747041-616f39b57569',
                                        'photo-1552611052-33e04de081de', 'photo-1604537466158-719b197266a7', 'photo-1569443693539-175ea9f00768'
                                ]
                        },
                        dry: {
                                label: '🍜 Mazesoba',
                                ids: [
                                        'photo-1612929633738-8fe44f7ec841', 'photo-1582878826629-29b7ad1cdc43', 'photo-1526233940723-cd3505859124',
                                        'photo-1591814441334-0f2c45791242', 'photo-1552604660-a8dc4fed18b5'
                                ]
                        }
                },
                genericIds: [
                        'photo-1569718212165-3a8278d5f624', 'photo-1557872248-48bc0619a139', 'photo-1591814403971-da884bc52fb1',
                        'photo-1547592166-23ac45744acd', 'photo-1618413920153-6ec52973801f', 'photo-1569437061241-a848be43cc82',
                        'photo-1509722747041-616f39b57569', 'photo-1552611052-33e04de081de', 'photo-1585032226651-759b368d7246',
                        'photo-1604537466158-719b197266a7', 'photo-1526318896980-cf78c088247c', 'photo-1582215500645-12e21293d0f4',
                        'photo-1598514982205-f36b96d1e8d4', 'photo-1552604660-a8dc4fed18b5', 'photo-1569443693539-175ea9f00768',
                        'photo-1476224203421-9ac39bcd33cb', 'photo-1504544750208-dc0358e63f7f', 'photo-1511910849309-0dffb8785146',
                        'photo-1543339308-43e59d6b73a6', 'photo-1512485600744-882390f7f3c0', 'photo-1590301157890-4810ed352733',
                        'photo-1565557623262-b51c2513a641', 'photo-1548943487-a2e4b43eb488', 'photo-1526233940723-cd3505859124',
                        'photo-1562916170-071a17afae63'
                ]
        },
        pizza: {
                label: '🍕 Pizza',
                subCategories: {
                        neapolitan: { label: '🍕 Neapolitan', ids: ['photo-1574071318508-1cdbab80d002', 'photo-1565299624946-b28f40a0ae38', 'photo-1593560708920-61dd98c46a4e', 'photo-1604382354936-07c5d9983bd3', 'photo-1594007654729-407eceeae721', 'photo-1511018556340-d16986a1c194', 'photo-1520201163981-8cc95007dd2a'] },
                        american: { label: '🍕 American', ids: ['photo-1513104890138-7c749659a591', 'photo-1534308983496-4fabb1a015ee', 'photo-1541745537411-b8046dc6d66c', 'photo-1544982503-9f984c14501a', 'photo-1571407970349-bc81e7e96d47', 'photo-1561350111-54737704724a', 'photo-1590947132387-155cc02f3212'] }
                },
                genericIds: [
                        'photo-1513104890138-7c749659a591', 'photo-1574071318508-1cdbab80d002', 'photo-1565299624946-b28f40a0ae38',
                        'photo-1593560708920-61dd98c46a4e', 'photo-1604382354936-07c5d9983bd3', 'photo-1511018556340-d16986a1c194',
                        'photo-1520201163981-8cc95007dd2a', 'photo-1534308983496-4fabb1a015ee', 'photo-1541745537411-b8046dc6d66c',
                        'photo-1590947132387-155cc02f3212', 'photo-1561350111-54737704724a', 'photo-1544982503-9f984c14501a',
                        'photo-1571407970349-bc81e7e96d47', 'photo-1594007654729-407eceeae721', 'photo-1566843972142-a7fcb70de55a',
                        'photo-1530990403975-5f6530678cc2', 'photo-1595708684082-c173bb3a06c5', 'photo-1585238342024-78d387f4a707',
                        'photo-1576458088443-04a19bb13da6', 'photo-1565299624-b28e6789f2ae'
                ]
        },
        burger: {
                label: '🍔 Burger',
                subCategories: {
                        smash: { label: '🍔 Smash Burger', ids: ['photo-1568901346375-23c9450c58cd', 'photo-1550547660-d9450f859349', 'photo-1586190812112-239567c69998', 'photo-1547584370-2cc98b8b8dc8', 'photo-1512152272829-d3139583845f', 'photo-1534422298391-e4f8c170db0f'] },
                        gourmet: { label: '🍔 Gourmet Burger', ids: ['photo-1594212699903-ec8a3eca50f5', 'photo-1571091718767-18b5b1457add', 'photo-1553979459-d2229ba7143b', 'photo-1572802419224-296b0aeee0d9', 'photo-1499186024912-c374ac2e9922', 'photo-1551782450-a2132b4ba21d'] }
                },
                genericIds: [
                        'photo-1568901346375-23c9450c58cd', 'photo-1594212699903-ec8a3eca50f5', 'photo-1571091718767-18b5b1457add',
                        'photo-1553979459-d2229ba7143b', 'photo-1572802419224-296b0aeee0d9', 'photo-1550547660-d9450f859349',
                        'photo-1586190812112-239567c69998', 'photo-1547584370-2cc98b8b8dc8', 'photo-1512152272829-d3139583845f',
                        'photo-1534422298391-e4f8c170db0f', 'photo-1499186024912-c374ac2e9922', 'photo-1551782450-a2132b4ba21d',
                        'photo-1561758033-d89a9ad46330', 'photo-1586816001966-79b73674439c', 'photo-1521305916504-4a1121188589',
                        'photo-1460306423018-03823f668f1a', 'photo-1561758033-64477db19460', 'photo-1542574271-7f3b92e6c821',
                        'photo-1530113571670-3bca4f5ea581'
                ]
        },
        thai: {
                label: '🌶️ Thai Food',
                subCategories: {
                        street: { label: '🥡 Thai Street Food', ids: ['photo-1594007654729-407eedc4be65', 'photo-1533900298318-6b8da08a523e', 'photo-1563245372-f21724e3856d', 'photo-1539405174458-94736f887568', 'photo-1559339352-11d035aa65de', 'photo-1562565652-f472ce0066d8'] },
                        curry: { label: '🥘 Thai Curry', ids: ['photo-1565557623262-b51c2513a641', 'photo-1455619452474-d2fb29da6403', 'photo-1473093226795-af9932fe5856', 'photo-1548943487-a2e4b43eb488', 'photo-1552611052-03419385e054', 'photo-1590301157890-4810ed352733'] },
                        somtum: { label: '🥗 Papaya Salad', ids: ['photo-1626804475297-411d8631c276', 'photo-1590301157890-4810ed352733', 'photo-1625398416128-25198bd0a101', 'photo-1562565651-78c64188b839'] }
                },
                genericIds: [
                        'photo-1559314809-0d155014e29e', 'photo-1594007654729-407eedc4be65', 'photo-1533900298318-6b8da08a523e',
                        'photo-1563245372-f21724e3856d', 'photo-1539405174458-94736f887568', 'photo-1559339352-11d035aa65de',
                        'photo-1562565652-f472ce0066d8', 'photo-1565557623262-b51c2513a641', 'photo-1455619452474-d2fb29da6403',
                        'photo-1473093226795-af9932fe5856', 'photo-1548943487-a2e4b43eb488', 'photo-1552611052-03419385e054',
                        'photo-1590301157890-4810ed352733', 'photo-1626804475297-411dbcc76c74', 'photo-1625398416128-25198bd0a101',
                        'photo-1512485600744-882390f7f3c0', 'photo-1455619452474-d2fb29da6403', 'photo-1473093226795-af9932fe5856',
                        'photo-1548943487-a2e4b43eb488'
                ]
        }
        // ... other categories also expanded in previous steps
};

// Selection Pool & Hashing Maintained
const selectFromPool = (name: string, ids: string[]): string => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % ids.length;
        return `https://images.unsplash.com/${ids[index]}?auto=format&fit=crop&w=800&q=80`;
};

/**
 * Semantic Image Matcher v4
 * Refined for variety and specific keyword detection.
 */
export const getPlaceImage = (name: string, type: string, tags: string[] = []): { url: string, label: string } => {
        const lowerName = name.toLowerCase();
        const allTags = tags.map(t => t.toLowerCase());
        const query = `${lowerName} ${allTags.join(' ')}`;

        // Tier 1: Food Scanners
        if (type === 'food' || type === 'restaurant') {
                // Ramen Detection
                if (query.includes('tonkotsu') || query.includes('creamy')) return { url: selectFromPool(name, IMAGE_DB.ramen.subCategories.tonkotsu.ids), label: IMAGE_DB.ramen.subCategories.tonkotsu.label };
                if (query.includes('shoyu') || query.includes('soy')) return { url: selectFromPool(name, IMAGE_DB.ramen.subCategories.shoyu.ids), label: IMAGE_DB.ramen.subCategories.shoyu.label };
                if (query.includes('maze') || query.includes('dry ramen') || query.includes('abura')) return { url: selectFromPool(name, IMAGE_DB.ramen.subCategories.dry.ids), label: IMAGE_DB.ramen.subCategories.dry.label };
                if (query.includes('ramen') || query.includes('noodle') || query.includes('soup') || query.includes('japanese') || query.includes('soba') || query.includes('udon')) {
                        return { url: selectFromPool(name, IMAGE_DB.ramen.genericIds), label: IMAGE_DB.ramen.label };
                }

                // Pizza Detection
                if (query.includes('neapolitan') || query.includes('wood oven') || query.includes('artisanal') || query.includes('margherita')) return { url: selectFromPool(name, IMAGE_DB.pizza.subCategories.neapolitan.ids), label: IMAGE_DB.pizza.subCategories.neapolitan.label };
                if (query.includes('american') || query.includes('cheesy') || query.includes('pepperoni') || query.includes('pie') || query.includes('slice')) return { url: selectFromPool(name, IMAGE_DB.pizza.subCategories.american.ids), label: IMAGE_DB.pizza.subCategories.american.label };
                if (query.includes('pizza') || query.includes('pizzeria') || query.includes('truffle')) return { url: selectFromPool(name, IMAGE_DB.pizza.genericIds), label: IMAGE_DB.pizza.label };

                // Burger Detection
                if (query.includes('smash') || query.includes('crispy') || query.includes('street burger')) return { url: selectFromPool(name, IMAGE_DB.burger.subCategories.smash.ids), label: IMAGE_DB.burger.subCategories.smash.label };
                if (query.includes('gourmet') || query.includes('steakhouse') || query.includes('prime') || query.includes('tall burger')) return { url: selectFromPool(name, IMAGE_DB.burger.subCategories.gourmet.ids), label: IMAGE_DB.burger.subCategories.gourmet.label };
                if (query.includes('burger') || query.includes('hamburger')) return { url: selectFromPool(name, IMAGE_DB.burger.genericIds), label: IMAGE_DB.burger.label };
        }

        // Default Fallback logic maintained from v3
        return { url: selectFromPool(name, FALLBACK_BANK), label: '📍 Travel Destination' };
};
