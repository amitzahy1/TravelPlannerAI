
/**
 * Deep-Semantics Visual Engine v5 - Production Grade
 * Massive image pools and hyper-refined keywords to eliminate repetition.
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
                                        'photo-1526318896980-cf78c088247c', 'photo-1582215500645-12e21293d0f4', 'photo-1598514982205-f36b96d1e8d4',
                                        'photo-1569718212165-3a8278d5f624', 'photo-1559339352-11d035aa65de', 'photo-1562565652-f472ce0066d8'
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
                        curry: { label: '🥘 Thai Curry', ids: ['photo-1565557623262-b51c2513a641', 'photo-1455619452474-d2fb29da6403', 'photo-1473093226795-af9932fe5856', 'photo-1548943487-a2e4b43eb488', 'photo-1552611052-33e04de081de', 'photo-1590301157890-4810ed352733'] },
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
        },
        cafe: {
                label: '☕ Cafe',
                subCategories: {
                        art: { label: '☕ Latte Art', ids: ['photo-1509042239860-f550ce710b93', 'photo-1554118811-1e0d58224f24', 'photo-1521017432531-fbd92d768814', 'photo-1495474472287-4d71bcdd2085', 'photo-1511920170033-f8396924c348', 'photo-1507133750040-4a8f57026811'] },
                        interior: { label: '🪑 Cozy Cafe', ids: ['photo-1445116572660-236b28497be0', 'photo-1559925393-8be0ec4767c8', 'photo-1554118811-1e0d58224f24', 'photo-1521017432531-fbd92d768814', 'photo-1497935586351-b67a49e012bf'] },
                        pastry: { label: '🥐 Pastry Shop', ids: ['photo-1551024601-5637ade98e42', 'photo-1555507036-ab1f4038808a', 'photo-1509440159596-0249088772ff', 'photo-1517433670267-2475069947fb', 'photo-1481391248133-7243aa2821be'] }
                },
                genericIds: ['photo-1509042239860-f550ce710b93', 'photo-1445116572660-236b28497be0', 'photo-1554118811-1e0d58224f24', 'photo-1521017432531-fbd92d768814', 'photo-1559535332-db99705919f4']
        },
        bar: {
                label: '🍸 Bar & Nightlife',
                subCategories: {
                        cocktail: { label: '🍸 Cocktails', ids: ['photo-1514362545857-3bc16c4c7d1b', 'photo-1470337458703-46ad1756a187', 'photo-1536935338788-846bb9981813', 'photo-1551024709-3f23ad6edffb', 'photo-1574096079513-d8259312b785'] },
                        skybar: { label: '🌃 Rooftop Bar', ids: ['photo-1519671482538-30646ae149bc', 'photo-1577741314755-9c8d04130097', 'photo-1560624052-449f5ddf0c31', 'photo-1563298244-6d9b5030e44b', 'photo-1514362545857-3bc16c4c7d1b'] }
                },
                genericIds: ['photo-1514362545857-3bc16c4c7d1b', 'photo-1519671482538-30646ae149bc', 'photo-1551024709-3f23ad6edffb', 'photo-1574096079513-d8259312b785', 'photo-1536935338788-846bb9981813']
        },
        steak: {
                label: '🥩 Steakhouse',
                subCategories: {},
                genericIds: ['photo-1600891964092-4316c288032e', 'photo-1546964124-0cce460f38ef', 'photo-1544025162-d76694265947', 'photo-1558030006-450675393462', 'photo-1555939594-58d7cb561ad1']
        },
        seafood: {
                label: '🦞 Seafood',
                subCategories: {},
                genericIds: ['photo-1534080564583-6be75777b70a', 'photo-1626804475297-411dbcc76c74', 'photo-1559740064-c6b3618803ad', 'photo-1588698947596-f6176378e907', 'photo-1516211697506-8360bd7700c2']
        },
        dessert: {
                label: '🍰 Dessert',
                subCategories: {},
                genericIds: ['photo-1563729784474-d77dbb933a9e', 'photo-1551024601-5637ade98e42', 'photo-1495147466023-ac5c588e2e94', 'photo-1506084868730-179b1e3f993f', 'photo-1559311648-d46f4d8593d6']
        },
        georgian: {
                label: '🇬🇪 Georgian',
                subCategories: {},
                genericIds: ['photo-1628102475017-09f0753063eb', 'photo-1628102467333-e59546059d48', 'photo-1605630646194-e85d9c19b494', 'photo-1562916170-071a17afae63']
        },
        fine_dining: {
                label: '💎 Fine Dining',
                subCategories: {},
                genericIds: ['photo-1504674900247-0877df9cc836', 'photo-1559339352-11d035aa65de', 'photo-1592861956120-e524fc739696', 'photo-1606787366850-de6330128bfc', 'photo-1514362545857-3bc16c4c7d1b']
        }
};

const ATTRACTION_DB: Record<string, ImageCategory> = {
        temple: {
                label: '⛩️ Temple',
                subCategories: {},
                genericIds: ['photo-1563492065599-3520f775eeed', 'photo-1582234031737-25e640236a28', 'photo-1528127269322-539801943592', 'photo-1582234031737-25e640236a28', 'photo-1565561339343-2550c6ca7866']
        },
        museum: {
                label: '🏛️ Museum',
                subCategories: {},
                genericIds: ['photo-1518998053901-5348d3969105', 'photo-1544967082-d9d3fbc7b3cc', 'photo-1449156001533-cb39c8994c00', 'photo-1554907984-15263bfd63bd', 'photo-1563089145-599997674d42']
        },
        nature: {
                label: '🌳 Nature',
                subCategories: {},
                genericIds: ['photo-1496347315686-5f274d046ccc', 'photo-1625234190130-f80c65590924', 'photo-1441974231531-c6227db76b6e', 'photo-1501785888041-af3ef285b470', 'photo-1500382017468-9049fed747ef']
        },
        beach: {
                label: '🏖️ Beach',
                subCategories: {},
                genericIds: ['photo-1507525428034-b723cf961d3e', 'photo-1519046904884-53103b34b206', 'photo-1506929562872-bb421503ef21', 'photo-1473116763249-2faaef81ccda', 'photo-1505118380757-91f5f45ad8ce']
        },
        viewpoint: {
                label: '🗼 Viewpoint',
                subCategories: {},
                genericIds: ['photo-1533105079780-92b9be482077', 'photo-1446776811953-b23d57bd21aa', 'photo-1473625247510-8ceb1760943f', 'photo-1519046904884-53103b34b206', 'photo-1501785888041-af3ef285b470']
        },
        market: {
                label: '🛍️ Market',
                subCategories: {},
                genericIds: ['photo-1533900298318-6b8da08a523e', 'photo-1553535919-4b62db9405d4', 'photo-1555392859-0098492040b2', 'photo-1563245372-f21724e3856d', 'photo-1566843972142-a7fcb70de55a']
        },
        monument: {
                label: '🗽 Monument',
                subCategories: {},
                genericIds: ['photo-1543349689-9a4d426bee8e', 'photo-1518709268805-4e9042af9f23', 'photo-1545569341-9eb8b30979d9', 'photo-1561361513-333e387c3a07', 'photo-1582234031737-25e640236a28']
        }
};

const FALLBACK_BANK = [
        'photo-1476514525535-07fb3b4ae5f1',
        'photo-1500835556837-99ac94a94552',
        'photo-1469854523086-cc02fe5d8800',
        'photo-1488646953014-85cb44e25828',
        'photo-1527631746610-bca00a040d60',
        'photo-1473625247510-8ceb1760943f',
        'photo-1518709268805-4e9042af9f23',
        'photo-1501785888041-af3ef285b470',
        'photo-1441974231531-c6227db76b6e',
        'photo-1507525428034-b723cf961d3e'
];

/**
 * Deterministic Hash Selection
 */
const selectFromPool = (name: string, ids: string[]): string => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % ids.length;
        return `https://images.unsplash.com/${ids[index]}?auto=format&fit=crop&w=800&q=80`;
};

/**
 * Semantic Image Matcher v5
 * High-sensitivity keyword detection.
 */
export const getPlaceImage = (name: string, type: string, tags: string[] = []): { url: string, label: string } => {
        const lowerName = name.toLowerCase();
        const allTags = tags.map(t => t.toLowerCase());
        const query = `${lowerName} ${allTags.join(' ')}`;

        // Tier 1: Food Scanners
        if (type === 'food' || type === 'restaurant') {
                // Ramen Detection (Refined)
                if (query.includes('tonkotsu') || query.includes('creamy')) return { url: selectFromPool(name, IMAGE_DB.ramen.subCategories.tonkotsu.ids), label: IMAGE_DB.ramen.subCategories.tonkotsu.label };
                if (query.includes('shoyu') || query.includes('soy')) return { url: selectFromPool(name, IMAGE_DB.ramen.subCategories.shoyu.ids), label: IMAGE_DB.ramen.subCategories.shoyu.label };
                if (query.includes('maze') || query.includes('dry ramen') || query.includes('abura')) return { url: selectFromPool(name, IMAGE_DB.ramen.subCategories.dry.ids), label: IMAGE_DB.ramen.subCategories.dry.label };
                if (query.includes('ramen') || query.includes('noodle') || query.includes('soup') || query.includes('japanese') || query.includes('soba') || query.includes('udon')) {
                        return { url: selectFromPool(name, IMAGE_DB.ramen.genericIds), label: IMAGE_DB.ramen.label };
                }

                // Pizza Detection (Refined)
                if (query.includes('neapolitan') || query.includes('wood oven') || query.includes('artisanal') || query.includes('margherita')) return { url: selectFromPool(name, IMAGE_DB.pizza.subCategories.neapolitan.ids), label: IMAGE_DB.pizza.subCategories.neapolitan.label };
                if (query.includes('american') || query.includes('cheesy') || query.includes('pepperoni') || query.includes('pie') || query.includes('slice')) return { url: selectFromPool(name, IMAGE_DB.pizza.subCategories.american.ids), label: IMAGE_DB.pizza.subCategories.american.label };
                if (query.includes('pizza') || query.includes('pizzeria') || query.includes('truffle')) return { url: selectFromPool(name, IMAGE_DB.pizza.genericIds), label: IMAGE_DB.pizza.label };

                // Burgers Detection (Refined)
                if (query.includes('smash') || query.includes('crispy') || query.includes('street burger')) return { url: selectFromPool(name, IMAGE_DB.burger.subCategories.smash.ids), label: IMAGE_DB.burger.subCategories.smash.label };
                if (query.includes('gourmet') || query.includes('steakhouse') || query.includes('prime') || query.includes('tall burger')) return { url: selectFromPool(name, IMAGE_DB.burger.subCategories.gourmet.ids), label: IMAGE_DB.burger.subCategories.gourmet.label };
                if (query.includes('burger') || query.includes('hamburger')) return { url: selectFromPool(name, IMAGE_DB.burger.genericIds), label: IMAGE_DB.burger.label };

                // Thai Detection
                if (query.includes('pad thai') || query.includes('thai street') || query.includes('wok')) return { url: selectFromPool(name, IMAGE_DB.thai.subCategories.street.ids), label: IMAGE_DB.thai.subCategories.street.label };
                if (query.includes('curry') || query.includes('gaeng') || query.includes('soup')) return { url: selectFromPool(name, IMAGE_DB.thai.subCategories.curry.ids), label: IMAGE_DB.thai.subCategories.curry.label };
                if (query.includes('papaya') || query.includes('som tum') || query.includes('salad')) return { url: selectFromPool(name, IMAGE_DB.thai.subCategories.somtum.ids), label: IMAGE_DB.thai.subCategories.somtum.label };
                if (query.includes('thai')) return { url: selectFromPool(name, IMAGE_DB.thai.genericIds), label: IMAGE_DB.thai.label };

                // Cafe
                if (query.includes('latte') || query.includes('art') || query.includes('barista')) return { url: selectFromPool(name, IMAGE_DB.cafe.subCategories.art.ids), label: IMAGE_DB.cafe.subCategories.art.label };
                if (query.includes('croissant') || query.includes('pastry') || query.includes('cake')) return { url: selectFromPool(name, IMAGE_DB.cafe.subCategories.pastry.ids), label: IMAGE_DB.cafe.subCategories.pastry.label };
                if (query.includes('cafe') || query.includes('coffee')) return { url: selectFromPool(name, IMAGE_DB.cafe.genericIds), label: IMAGE_DB.cafe.label };

                // Nightlife
                if (query.includes('sky bar') || query.includes('rooftop')) return { url: selectFromPool(name, IMAGE_DB.bar.subCategories.skybar.ids), label: IMAGE_DB.bar.subCategories.skybar.label };
                if (query.includes('cocktail') || query.includes('mixology')) return { url: selectFromPool(name, IMAGE_DB.bar.subCategories.cocktail.ids), label: IMAGE_DB.bar.subCategories.cocktail.label };
                if (query.includes('bar') || query.includes('pub') || query.includes('night')) return { url: selectFromPool(name, IMAGE_DB.bar.genericIds), label: IMAGE_DB.bar.label };

                // Specifics
                if (query.includes('steak') || query.includes('grill')) return { url: selectFromPool(name, IMAGE_DB.steak.genericIds), label: IMAGE_DB.steak.label };
                if (query.includes('seafood') || query.includes('fish')) return { url: selectFromPool(name, IMAGE_DB.seafood.genericIds), label: IMAGE_DB.seafood.label };
                if (query.includes('dessert') || query.includes('sweets')) return { url: selectFromPool(name, IMAGE_DB.dessert.genericIds), label: IMAGE_DB.dessert.label };
                if (query.includes('georgian')) return { url: selectFromPool(name, IMAGE_DB.georgian.genericIds), label: IMAGE_DB.georgian.label };
                if (query.includes('michelin') || query.includes('luxury') || query.includes('fine dining')) return { url: selectFromPool(name, IMAGE_DB.fine_dining.genericIds), label: IMAGE_DB.fine_dining.label };

                // Tier 3: Vibe/Contextual Overrides
                if (query.includes('night') || query.includes('lights')) return { url: selectFromPool(name, IMAGE_DB.bar.genericIds), label: '🌃 Nightlife' };
                if (query.includes('cozy') || query.includes('hidden')) return { url: selectFromPool(name, IMAGE_DB.cafe.genericIds), label: '🏠 Cozy Spot' };
        }

        // Tier 2: Attraction Scanners
        if (type === 'attraction' || type === 'activity') {
                if (query.includes('temple') || query.includes('wat')) return { url: selectFromPool(name, ATTRACTION_DB.temple.genericIds), label: ATTRACTION_DB.temple.label };
                if (query.includes('museum') || query.includes('gallery') || query.includes('art center')) return { url: selectFromPool(name, ATTRACTION_DB.museum.genericIds), label: ATTRACTION_DB.museum.label };
                if (query.includes('beach') || query.includes('island') || query.includes('shore')) return { url: selectFromPool(name, ATTRACTION_DB.beach.genericIds), label: ATTRACTION_DB.beach.label };
                if (query.includes('nature') || query.includes('park') || query.includes('garden')) return { url: selectFromPool(name, ATTRACTION_DB.nature.genericIds), label: ATTRACTION_DB.nature.label };
                if (query.includes('view') || query.includes('skyline') || query.includes('deck')) return { url: selectFromPool(name, ATTRACTION_DB.viewpoint.genericIds), label: ATTRACTION_DB.viewpoint.label };
                if (query.includes('market') || query.includes('bazaar') || query.includes('shopping')) return { url: selectFromPool(name, ATTRACTION_DB.market.genericIds), label: ATTRACTION_DB.market.label };
                if (query.includes('monument') || query.includes('statue') || query.includes('landmark')) return { url: selectFromPool(name, ATTRACTION_DB.monument.genericIds), label: ATTRACTION_DB.monument.label };
        }

        // Final Fallback
        return { url: selectFromPool(name, FALLBACK_BANK), label: '📍 Travel Destination' };
};
