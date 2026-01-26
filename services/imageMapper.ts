
/**
 * Deep-Semantics Visual Engine v11 - CINEMA EDITION
 * Extended Attractions | Deep Context Scanning | 120+ High-Fidelity IDs
 */

// --- 1. FOOD & DINING DATABASE ---

const FOOD_DB = {
        ramen: {
                label: '🍜 Ramen',
                types: {
                        tonkotsu: { ids: ['1591814403971-da884bc52fb1', '1623341214825-9f4f9738c7c7', '1557872248-48bc0619a139', '1552611052-33e04de081de'] },
                        shoyu: { ids: ['1569718212165-3a8278d5f624', '1618413920153-6ec52973801f', '1569437061241-a848be43cc82'] },
                        dry: { ids: ['1612929633738-8fe44f7ec841', '1582878826629-29b7ad1cdc43'] }
                },
                generic: ['1509722747041-616f39b57569', '1585032226651-759b368d7246', '1604537466158-719b197266a7']
        },
        pizza: {
                label: '🍕 Pizza',
                generic: ['1513104890138-7c749659a591', '1574071318508-1cdbab80d002', '1565299624946-b28f40a0ae38', '1593560708920-61dd98c46a4e', '1604382354936-07c5d9983bd3', '1571407970349-bc81e7e96d47']
        },
        burger: {
                label: '🍔 Burger',
                generic: ['1568901346375-23c9450c58cd', '1550547660-d9450f859349', '1594212699903-ec8a3eca50f5', '1571091718767-18b5b1457add', '1551782450-a2132b4ba21d']
        },
        sushi: {
                label: '🍣 Sushi',
                generic: ['1579871494447-9811cf80d66c', '1553621042-f6e147245754', '1611143669182-6e21629fa270', '1615887023516-9b663b6f2461']
        },
        asian: {
                label: '🥡 Asian Fusion',
                generic: ['1512058564366-18510be2db19', '1541696490-8744a570242d', '1626804475297-411db704dc14', '1563865436814-448dac895cb1']
        },
        steakhouses: {
                label: '🥩 Steakhouse',
                generic: ['1600891964092-4316c288032e', '1546241072-480f0f69608f', '1432139509613-5c4255815697']
        },
        italian: {
                label: '🍝 Italian',
                generic: ['1498579150354-977475b7ea0b', '1591597028445-5df18cc4306c', '1566826627063-47a224c87c2b', '1481931098730-318b6f776db0']
        },
        street: {
                label: '🥢 Street Food',
                generic: ['1559314809-0d155014e29e', '1594007654729-407eedc4be65', '1533900298318-6b8da08a523e', '1563245372-f21724e3856d']
        },
        fine: {
                label: '💎 Fine Dining',
                generic: ['1504674900247-0877df9cc836', '1559339352-11d035aa65de', '1592861956120-e524fc739696', '1606787366850-de6330128bfc']
        },
        cafe: {
                label: '☕ Cafe',
                generic: ['1509042239860-f550ce710b93', '1445116572660-236b28497be0', '1554118811-1e0d58224f24', '1521017432531-fbd92d768814', '1495474472287-4d71bcdd2085']
        },
        bar: {
                label: '🍸 Bar & Nightlife',
                generic: ['1514362545857-3bc16c4c7d1b', '1519671482538-30646ae149bc', '1551024709-3f23ad6edffb', '1574096079513-d8259312b785']
        },
        dessert: {
                label: '🍦 Dessert',
                generic: ['1563729784474-d77dbb933a9e', '1488477181946-607a753415eb', '1505253805406-382410a56658']
        },
        fallback: ['1555939594-58d7cb561ad1', '1540189549347-c2411dc674', '1504754524776-0f4f3b26c06b']
};

// --- 2. ATTRACTION DATABASE (MEGA-POOL EXPANSION v11) ---

const ATTRACTION_DB = {
        religion: {
                label: '⛪ Religious Site',
                generic: [
                        '1548625361-8889a0f55f91', '1548544149-4835e62ee5b3', '1566907489-0113c2c77648',
                        '1518134707831-29e20a061803', '1568285642-1e967c13ac47', '1590053919934-0d70be5f64ee',
                        '1572044733365-d016911f84cb', '1529524987368-2dd5301e741e', '1515250462708-3fa9c8f8b89d',
                        '1578330836542-a0b23668c92e', '1581446726245-c48dc9ffc8f3', '1596726915220-435423871ee5'
                ]
        },
        museum: {
                label: '🏛️ Museum',
                generic: [
                        '1518998053901-5348d3969105', '1544967082-d9d3fbc7b3cc', '1449156001533-cb39c8994c00',
                        '1547841103-9d06859e9a41', '1554907984-18295550c666', '1605333396652-325b39860fcd',
                        '1572953142014-11829f7ad901', '1564392361-f5fabf52701f', '1589828699175-9e6db5822b31',
                        '1566127444941-897f52533e08', '1551049694-811c75955c48', '1504194784112-2c67623916dd'
                ]
        },
        nature: {
                label: '🌳 Nature',
                generic: [
                        '1496347315686-5f274d046ccc', '1625234190130-f80c65590924', '1441974231531-c6227db76b6e',
                        '1500375592092-40eb2168fd21', '1546768223-997601aa4718', '1518173946687-a4c8892bbd9f',
                        '1506744038136-155896265735', '1532274404305-62bb02f69326', '1502082553049-l1259600e1e6',
                        '1465147260589-9b489bc6b343', '1472214103451-9374bd1c798e', '1426604966848-d3adac350e9e'
                ]
        },
        beach: {
                label: '🏖️ Beach',
                generic: [
                        '1507525428034-b723cf961d3e', '1519046904884-53103b34b206', '1506929562872-bb421503ef21',
                        '1501785888041-af3ef285b470', '1544257750-572358f5da22', '1520440229-6469a149ac19',
                        '1468413253725-0d5181091126', '1510414842564-a7515b3d6f8a', '1515238152791-8216bfdf89a7',
                        '1509233725347-880630e252a9', '1502208327471-d5dde4d78995', '1473116763249-29dd7e5a5e79'
                ]
        },
        view: {
                label: '🗼 Viewpoint',
                generic: [
                        '1533105079780-92b9be482077', '1446776811953-b23d57bd21aa', '1473625247510-8ceb1760943f',
                        '1526666923127-b2970f64b422', '1506973035872-a4ec16b848c2', '1532306793375-3574197ee4e5',
                        '1496568811577-44df00c6d96e', '1533319047192-3a364be141a0', '1512453979798-5ea9d4a8d904',
                        '1505765050816-631629734004', '1534234828563-02517614e5a9'
                ]
        },
        market: {
                label: '🛍️ Market',
                generic: [
                        '1533900298318-6b8da08a523e', '1553535919-4b62db9405d4', '1555392859-0098492040b2',
                        '1572403613768-45607a7dedf4', '1610488050982-f6735db9f182', '1532151624458-95bd32cd586a',
                        '1543083477046-cd101f026710', '1550953930-b3b333405391', '1472851294608-4155f2118261',
                        '1567401893414-76b7b1e5a7a5', '1610996883203-512b1d60061e'
                ]
        },
        modern: {
                label: '🌆 Cityscape',
                generic: [
                        '1534008897813-107b68da0cae', '1491904762174-88290edd5728', '1534430480872-3498386e7a20',
                        '1518391846015-55a97ee46d73', '1533105079780-92b9be482077', '1506159904221-3432241793a2',
                        '1480714378408-67cf0d13bc1b', '1477959858617-67f85cf4f1df', '1444723121867-fa630c680a47'
                ]
        },
        winery: {
                label: '🍇 Winery',
                generic: [
                        '1506377247377-2a5b3b417ebb', '1515598696887-o989098d009d', '1566810842055-6bf467812f2c',
                        '1504279577054-123b5e096695', '1498429089284-41f8cf3ffd39', '1516594915697-87eb5293fae8',
                        '1524314488824-34da71fe95df', '1528641151670-e3743c44c5c7'
                ]
        },
        history: {
                label: '🏰 Historic',
                generic: [
                        '1533052445738-f86462d77d70', '1552431792-54ac77f24021', '1527663363346-64fa41891b97',
                        '1542353163-95b060611417', '1534211181282-3dbb531ed7f0', '1576487292158-b61556a3bd2e',
                        '1523451703649-74d125ba7036', '1467269204594-9661b134dc2b', '1533929736458-ca588d080e81'
                ]
        },
        fallback: ['1476514525535-07fb3b4ae5f1', '1501785888041-af3ef285b470', '1506466010722-395ee2bef839', '1503220317375-aaad6143d41b', '1469854523086-cc02fe5d8800', '1488646953014-85cb44e25828']
};

// --- 3. SCORING ENGINE ---

function selectFromPool(name: string, ids: string[]): string {
        if (!ids || ids.length === 0) return `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % ids.length;
        return `https://images.unsplash.com/photo-${ids[index]}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85`;
}

// --- 4. EXPORTED FUNCTIONS ---

/**
 * STRICT Isolated Food Mapper
 */
/**
 * STRICT Isolated Food Mapper - CURATOR ALGORITHM v2.0
 * Supports the 10 "Perfect Definition Matrix" Categories
 */
export function getFoodImage(name: string, description: string = "", tags: string[] = []): { url: string, label: string } {
        const query = `${name} ${description} ${tags.join(' ')}`.toLowerCase();

        // 1. RAMEN (Soul)
        if (query.includes('ramen') || query.includes('noodle') || query.includes('ראמן'))
                return { url: selectFromPool(name, FOOD_DB.ramen.generic), label: '🍜 Ramen' };

        // 2. PIZZA (Dough & Fire)
        if (query.includes('pizza') || query.includes('pizzeri') || query.includes('פיצה'))
                return { url: selectFromPool(name, FOOD_DB.pizza.generic), label: '🍕 Pizza' };

        // 3. BURGER (Meat & Bun)
        if (query.includes('burger') || query.includes('hamburger') || query.includes('המבורגר'))
                return { url: selectFromPool(name, FOOD_DB.burger.generic), label: '🍔 Burger' };

        // 4. SUSHI/JAPANESE (Precision - NO RAMEN)
        if (query.includes('sushi') || query.includes('omakase') || query.includes('japan') || query.includes('izakaya') || query.includes('יפני') || query.includes('סושי'))
                return { url: selectFromPool(name, FOOD_DB.sushi.generic), label: '🍣 Japanese' };

        // 5. THAI (Spice & Wok)
        if (query.includes('thai') || query.includes('pad thai') || query.includes('curry') || query.includes('תאילנדי'))
                return { url: selectFromPool(name, FOOD_DB.asian.generic), label: '🌶️ Thai' };

        // 6. FINE DINING (The Experience)
        if (query.includes('fine dining') || query.includes('michelin') || query.includes('chef') || query.includes('tasting menu') || query.includes('יוקרה') || query.includes('מישלן'))
                return { url: selectFromPool(name, FOOD_DB.fine.generic), label: '💎 Fine Dining' };

        // 7. COCKTAIL BARS (The Vibe)
        if (query.includes('cocktail') || query.includes('bar') || query.includes('speakeasy') || query.includes('lounge') || query.includes('בר') || query.includes('קוקטייל'))
                return { url: selectFromPool(name, FOOD_DB.bar.generic), label: '🍸 Cocktail Bar' };

        // 8. CAFE & DESSERT (Third Wave)
        if (query.includes('cafe') || query.includes('coffee') || query.includes('bakery') || query.includes('pastry') || query.includes('dessert') || query.includes('gelato') || query.includes('ice cream') || query.includes('בתי קפה') || query.includes('קינוח'))
                return { url: selectFromPool(name, FOOD_DB.cafe.generic), label: '☕ Cafe & Dessert' };

        // 9. LOCAL AUTHENTIC (City's Pride)
        if (query.includes('local') || query.includes('authentic') || query.includes('traditional') || query.includes('market') || query.includes('street') || query.includes('אוכל מקומי') || query.includes('אותנטי'))
                return { url: selectFromPool(name, FOOD_DB.street.generic), label: '🍲 Local Legend' };

        // 10. FAMILY (The Balance)
        if (query.includes('family') || query.includes('kids') || query.includes('casual') || query.includes('משפחתית') || query.includes('משפחתי'))
                return { url: selectFromPool(name, FOOD_DB.italian.generic), label: '👨‍👩‍👧‍👦 Family' };

        // Fallback
        if (query.includes('steak') || query.includes('grill') || query.includes('meat'))
                return { url: selectFromPool(name, FOOD_DB.steakhouses.generic), label: '🥩 Steakhouse' };

        return { url: selectFromPool(name, FOOD_DB.fallback), label: '🍽️ Restaurant' };
}

/**
 * STRICT Isolated Attraction Mapper (v11 Cinema Expansion)
 */
export function getAttractionImage(name: string, description: string = "", tags: string[] = []): { url: string, label: string } {
        const query = `${name} ${description} ${tags.join(' ')}`.toLowerCase();

        // 1. Winery & Vineyards (High Priority for Georgia)
        if (query.includes('buera')) return { url: 'https://images.unsplash.com/photo-1566810842055-6bf467812f2c?auto=format&fit=crop&q=80', label: '🍇 Winery' };
        if (query.includes('wine') || query.includes('vineyard') || query.includes('cellar') || query.includes('winery') || query.includes('יקב') || query.includes('כרם'))
                return { url: selectFromPool(name, ATTRACTION_DB.winery.generic), label: '🍇 Winery' };

        // 2. Religion (Extended)
        if (query.includes('temple') || query.includes('monastery') || query.includes('church') || query.includes('cathedral') || query.includes('shrine') || query.includes('chapel') || query.includes('synagogue') || query.includes('mosque') || query.includes('מנזר') || query.includes('כנסייה'))
                return { url: selectFromPool(name, ATTRACTION_DB.religion.generic), label: '⛪ Religious Site' };

        // 3. History (Castles, Forts)
        if (query.includes('castle') || query.includes('fort') || query.includes('citadel') || query.includes('palace') || query.includes('ruins') || query.includes('ancient') || query.includes('history') || query.includes('מבצר') || query.includes('ארמון'))
                return { url: selectFromPool(name, ATTRACTION_DB.history.generic), label: '🏰 Historic' };

        if (query.includes('museum') || query.includes('art') || query.includes('gallery') || query.includes('exhibition') || query.includes('מוזיאון'))
                return { url: selectFromPool(name, ATTRACTION_DB.museum.generic), label: '🏛️ Museum' };

        if (query.includes('nature') || query.includes('park') || query.includes('garden') || query.includes('forest') || query.includes('lake') || query.includes('river') || query.includes('cave') || query.includes('waterfall') || query.includes('טבע') || query.includes('אגם'))
                return { url: selectFromPool(name, ATTRACTION_DB.nature.generic), label: '🌳 Nature' };

        if (query.includes('beach') || query.includes('sea') || query.includes('ocean') || query.includes('sand') || query.includes('island') || query.includes('coast') || query.includes('חוף'))
                return { url: selectFromPool(name, ATTRACTION_DB.beach.generic), label: '🏖️ Beach' };

        if (query.includes('view') || query.includes('skyline') || query.includes('observation') || query.includes('deck') || query.includes('panorama') || query.includes('תצפית'))
                return { url: selectFromPool(name, ATTRACTION_DB.view.generic), label: '🗼 Viewpoint' };

        if (query.includes('market') || query.includes('bazaar') || query.includes('shopping') || query.includes('mall') || query.includes('store') || query.includes('shop') || query.includes('שוק') || query.includes('קניון'))
                return { url: selectFromPool(name, ATTRACTION_DB.market.generic), label: '🛍️ Market' };

        if (query.includes('modern') || query.includes('skyscraper') || query.includes('building') || query.includes('city') || query.includes('tower') || query.includes('bridge') || query.includes('עיר'))
                return { url: selectFromPool(name, ATTRACTION_DB.modern.generic), label: '🌆 Cityscape' };

        return { url: selectFromPool(name, ATTRACTION_DB.fallback), label: '📍 Destination' };
}

/**
 * Generic Fallback (Legacy Support)
 */
export function getPlaceImage(name: string, type: 'food' | 'restaurant' | 'attraction' | 'activity', tags: string[] = []): { url: string, label: string } {
        if (type === 'food' || type === 'restaurant') return getFoodImage(name, "", tags);
        return getAttractionImage(name, "", tags);
}


