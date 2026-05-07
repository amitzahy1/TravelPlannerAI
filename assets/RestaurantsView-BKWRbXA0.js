import{a as g,j as e}from"./framer-COmKckl1.js";import{ab as pt,ac as xt,aq as bt,$ as yt,Y as Je,f as ce,U as Ke,ar as wt,X as We,h as q,v as vt,u as qe,T as tt,as as Rt,a1 as S,ao as je,g as de,t as ee,at as Qe,x as Tt,au as Nt,av as St,aw as jt,ax as Ct,ay as At,ak as Et}from"./index-CGEHSTDr.js";import{g as It,T as Ot,h as kt,c as Lt,B as Ne,a as Mt,S as Ft,G as Pt,f as Dt,b as Se,P as Ut,H as $t,s as Ht}from"./textUtils-CqfYcOpZ.js";import{C as Ve}from"./ConfirmModal-B1z1fSpm.js";import{a as Gt,c as zt,i as Yt}from"./tripPermissions-DZUOnw0D.js";import{R as Xe,S as Bt}from"./sticky-note-TmdEVG4b.js";import"./firebase-BC6egmGd.js";import"./map-C2wn3rKq.js";const at=(s="")=>{const l=s.toLowerCase();return l.includes("fine")||l.includes("michelin")||l.includes("luxury")?{icon:"💎",gradient:"bg-gradient-to-br from-slate-800 to-black text-white",label:"Luxury"}:l.includes("street")||l.includes("market")||l.includes("stall")?{icon:"🥢",gradient:"bg-gradient-to-br from-orange-400 to-red-500 text-white",label:"Street Food"}:l.includes("burger")||l.includes("american")?{icon:"🍔",gradient:"bg-gradient-to-br from-red-500 to-orange-600 text-white",label:"Burger"}:l.includes("pizza")||l.includes("italian")?{icon:"🍕",gradient:"bg-gradient-to-br from-green-500 to-emerald-700 text-white",label:"Italian"}:l.includes("sushi")||l.includes("japanese")||l.includes("ramen")?{icon:"🍜",gradient:"bg-gradient-to-br from-rose-400 to-pink-600 text-white",label:"Japanese"}:l.includes("coffee")||l.includes("cafe")||l.includes("brunch")?{icon:"☕",gradient:"bg-gradient-to-br from-amber-600 to-brown-800 text-white",label:"Cafe"}:l.includes("bar")||l.includes("cocktail")||l.includes("pub")?{icon:"🍸",gradient:"bg-gradient-to-br from-purple-600 to-indigo-800 text-white",label:"Nightlife"}:l.includes("seafood")?{icon:"🦞",gradient:"bg-gradient-to-br from-blue-400 to-cyan-600 text-white",label:"Seafood"}:l.includes("thai")||l.includes("asian")?{icon:"🌶️",gradient:"bg-gradient-to-br from-orange-500 to-yellow-500 text-white",label:"Asian"}:l.includes("dessert")||l.includes("ice cream")?{icon:"🍦",gradient:"bg-gradient-to-br from-pink-300 to-rose-400 text-white",label:"Sweets"}:l.includes("local")||l.includes("authentic")||l.includes("georgian")?{icon:"🍲",gradient:"bg-gradient-to-br from-amber-500 to-orange-700 text-white",label:"Local Authentic"}:l.includes("family")?{icon:"👨‍👩‍👧‍👦",gradient:"bg-gradient-to-br from-green-400 to-teal-600 text-white",label:"Family Friendly"}:{icon:"🍽️",gradient:"bg-gradient-to-br from-blue-500 to-indigo-600 text-white",label:"Restaurant"}},Ze=s=>s.sort((l,C)=>l.isFavorite&&!C.isFavorite?-1:!l.isFavorite&&C.isFavorite?1:(C.googleRating||0)-(l.googleRating||0)),Q=(s,l)=>je(s.location||"",l)||je(s.region||"",l),et=({rec:s,tripDestination:l,tripDestinationEnglish:C,isAdded:_,onAdd:$,onClick:H})=>{const G=Se(s.nameEnglish||s.name),j=Se(s.location)||Se(C||l),V=Tt(s.googleMapsUrl,G,j),O=at(s.cuisine);return e.jsx(Ut,{type:"restaurant",name:s.name,nameEnglish:s.nameEnglish,description:s.description,location:s.location,rating:s.googleRating,cuisine:s.cuisine||O.label,attractionType:O.label,price:s.price||(s.googleRating&&s.googleRating>4.5?"$$$":"$$"),mapsUrl:V,isAdded:_,onAdd:()=>$(s,s.categoryTitle||"AI"),onClick:H,recommendationSource:s.recommendationSource,isHotelRestaurant:s.isHotelRestaurant,verification_needed:s.verification_needed})},ta=({trip:s,onUpdateTrip:l})=>{const[C,_]=g.useState("recommended");console.log("RestaurantView Loaded - v2 Clean Design - Smart Intent Active");const[$,H]=g.useState("list"),G=g.useRef(s);g.useEffect(()=>{G.current=s},[s]);const j=Gt(s),V=zt(s),O=Yt(s),{user:X}=pt(),R=X==null?void 0:X.uid,[z,J]=g.useState(null);g.useEffect(()=>{if(!R||!O){J(0);return}xt(R).then(t=>J(t.lastPremiumRunAt_food??t.lastPremiumRunAt??0)).catch(()=>J(0))},[R,O]);const ue=720*60*60*1e3,te=()=>!O||!R||z===null?"free":Date.now()-z>ue?"paid":"free",T=async(t,n)=>{t==="paid"&&n&&R&&(await At(R,"food"),J(Date.now()))},K=t=>{const n=G.current;V?l({...n,aiRestaurants:t}):Ht(n.id,{aiRestaurants:t})},[A,M]=g.useState(()=>{const t=s.aiRestaurants||[];if(!j)return t;const n=It(s.id).aiRestaurants;return n&&n.length>0?n:t}),[ae,Ce]=g.useState(!1),[Jt,E]=g.useState(""),[Z,se]=g.useState("all"),[Y,ge]=g.useState("all"),[he,st]=g.useState(!0),[N,Ae]=g.useState(!1),[W,me]=g.useState({current:0,total:0}),[Ee,Ie]=g.useState(new Set),[f,Oe]=g.useState("all"),[F,fe]=g.useState(""),[pe,ke]=g.useState(!1),[Le,xe]=g.useState(null),[k,ne]=g.useState(null),[nt,be]=g.useState(!1),[Me,ye]=g.useState(0),[rt,Fe]=g.useState({}),[Pe,De]=g.useState(null),[ot,we]=g.useState(!1);g.useEffect(()=>{R&&bt(R).then(Fe).catch(()=>{})},[R]);const it=()=>{M([]),K([]),se("all"),ge("all"),be(!1),setTimeout(()=>re([]),0)};g.useEffect(()=>{s.aiRestaurants&&s.aiRestaurants.length>0&&M(s.aiRestaurants)},[s.aiRestaurants]);const v=g.useMemo(()=>yt(s,{excludeFlightOnly:!0,lang:"en"}),[s]),ve=async()=>{if(F.trim()){ke(!0),xe(null),E("");try{const t=`Search Query: "${F}"
            Destination Context: ${s.destination}
            
            Mission: Find excellent restaurant/food results for this query.
            - If specific name (e.g. "Pizza East"): Find it.
            - If category (e.g. "Sushi"): Find top examples.
            
            CRITICAL: 'name' field must be in recognized script (English/Local). Description in Hebrew.
            OUTPUT JSON ONLY:
            { "results": [{ "name", "description", "location", "rating", "cuisine", "priceRange", "googleMapsUrl", "business_status" }] }`,r=(await de(null,[{role:"user",parts:[{text:t}]}],{responseMimeType:"application/json"},"SEARCH")).text;try{const o=JSON.parse(r||"{}");if(o.results){const a=o.results.filter(m=>m.business_status==="OPERATIONAL").map((m,x)=>({...m,id:`search-res-${x}`,categoryTitle:"תוצאות חיפוש"})),i=a.filter(m=>Je(s,{location:m.location,region:m.region})),c=a.length-i.length,p=i.length>0?i:a;if(c>0&&i.length>0?ee.warning(`סוננו ${c} תוצאות מחוץ לטיול`):c>0&&i.length===0&&ee.info("כל התוצאות מחוץ לטיול — מציג בכל זאת"),xe(p),F.trim()&&p.length>0){const m=s.customFoodCategories||[];m.includes(F.trim())||l({...s,customFoodCategories:[...m,F.trim()]})}}}catch{console.error("❌ AI Error: JSON Parse failed. Raw response:",r==null?void 0:r.substring(0,500)),E("שגיאה בפרסור התוצאות. אנא נסה שנית.")}}catch(t){console.error(t),E("שגיאה בחיפוש. אנא נסה שנית.")}finally{ke(!1)}}},Ue=()=>{fe(""),xe(null)},$e=t=>{const n=t?S(t,"en"):s.destinationEnglish||S(v[0],"en");dt(!0,n)},re=async(t=A)=>{Ae(!0),E("");const n=v;me({current:0,total:n.length});const r=te();try{let o=[...t];for(let a=0;a<n.length;a++){me({current:a+1,total:n.length});const i=n[a],c=S(i,"en");try{const p=ct(c),m=await de(null,[{role:"user",parts:[{text:p}]}],{responseMimeType:"application/json",temperature:.1},"SEARCH",r),x=JSON.parse(m.text||"{}");let u=[];x.categories?u=Array.isArray(x.categories)?x.categories:Object.values(x.categories):Array.isArray(x)&&(u=x),Array.isArray(u)||(u=[]),u.length>0&&u.map((d,b)=>({...d,id:d.id||`ai-food-cat-${i}-${b}-${Date.now()}`,region:i,restaurants:Qe(d.restaurants||[]).filter(y=>y.business_status==="OPERATIONAL").map((y,w)=>({...y,region:y.region||i,id:`ai-rec-${i}-${b}-${Math.random().toString(36).substr(2,5)}-${w}`,categoryTitle:d.title}))})).forEach(d=>{const b=o.findIndex(y=>y.title===d.title);if(b!==-1){const y=o[b].restaurants;d.restaurants.forEach(w=>{y.some(L=>L.name===w.name)||y.push(w)})}else o.push(d)})}catch(p){const m=(p==null?void 0:p.message)||"";if(console.error(`Error researching ${i}:`,p),/PerDay/i.test(m)||/per_day/i.test(m)){E("מכסת ה-AI היומית מוצתה. נסה שוב מחר.");break}const x=m.match(/retry in (\d+(?:\.\d+)?)s/i);if(x&&a<n.length-1){const u=Math.ceil(parseFloat(x[1]))*1e3+5e3;await new Promise(h=>setTimeout(h,u))}}}M(o),K(o),Oe("all"),await T(r,o.length>0),(async()=>{var m,x;const a=((x=(m=s.destinationEnglish||s.destination)==null?void 0:m.split(/[-,]/)[0])==null?void 0:x.trim())||"",i=o.flatMap(u=>(u.restaurants||[]).map(h=>({id:h.id,name:h.name,city:(h.region||u.region||"").toString(),country:a})));if(i.length===0)return;const c=await Dt(i);if(c.size===0)return;const p=o.map(u=>({...u,restaurants:(u.restaurants||[]).filter(h=>!c.has(h.id))}));M(p),K(p),console.info(`[Restaurants] Closed-place check dropped ${c.size} listings`)})(),He(o)}catch(o){console.error("Critical Error in Research All:",o),E("שגיאה במהלך מחקר מקיף.")}finally{Ae(!1),me({current:0,total:0})}},lt=async t=>{if(!R||j)return;const n=new Date().toISOString().slice(0,7),r=`${s.id}:${t.id}`,o=rt[r],a=1,i=3,c=o&&o.month===n,p=c?o.paid:0,m=c?o.free:0,x=O&&p<a,u=m<i;if(!x&&!u){we(!0);return}const h=x?"paid":"free";De(t.id);try{const d=t.region?S(t.region,"en"):s.destinationEnglish||S(v[0],"en"),b=t.title,w=`You are a food expert. As of ${new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"})}, find the BEST restaurants in "${d}" for the category: "${b}".
Return 6-8 currently operating restaurants. Apply the same strict operational check as always — omit any closed place.
Respond in the same JSON format:
{ "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl", "business_status", "verification_needed" } ] }
Every restaurant MUST have business_status = "OPERATIONAL". "location" MUST be in English.`,L=await de(null,[{role:"user",parts:[{text:w}]}],{responseMimeType:"application/json",temperature:.1},"SEARCH",h),B=(JSON.parse(L.text||"{}").restaurants||[]).filter(I=>I.business_status==="OPERATIONAL").map((I,U)=>({...I,region:I.region||t.region,id:`ai-rec-${t.id}-refresh-${Date.now()}-${U}`,categoryTitle:b}));if(B.length>0){const I=A.map(U=>U.id===t.id?{...U,restaurants:B}:U);M(I),K(I),await Ct(R,r,h),Fe(U=>{const le=U[r],_e=le&&le.month===n;return{...U,[r]:{paid:(_e?le.paid:0)+(h==="paid"?1:0),free:(_e?le.free:0)+(h==="free"?1:0),month:n}}}),ee.success(`${b} עודכן בהצלחה`),He(I)}else ee.warning(`לא נמצאו תוצאות חדשות עבור ${b}`)}catch(d){console.error("refreshSingleCategory error:",d),ee.error("שגיאה בעדכון הקטגוריה")}finally{De(null)}},He=t=>{var m,x;const n=[],r=((x=(m=s.destinationEnglish||s.destination)==null?void 0:m.split(/[-,]/)[0])==null?void 0:x.trim())||"";t.forEach(u=>{const h=u.region||"";u.restaurants.forEach(d=>{const b=S(d.region||h,"en")||d.region||h;n.push({id:d.id,name:d.name,location:d.location,googleMapsUrl:d.googleMapsUrl,lat:d.lat,lng:d.lng,cityHint:b||void 0,countryHint:[b,r].filter(Boolean).join(", ")})})});const o=n.filter(u=>typeof u.lat!="number"||typeof u.lng!="number");if(o.length===0)return;ye(u=>u+o.length);const a={},i=new Set;let c=0;const p=()=>{if(c===0)return;const u=t.map(h=>({...h,restaurants:h.restaurants.map(d=>a[d.id]?{...d,lat:a[d.id].lat,lng:a[d.id].lng,geocodeFailed:!1}:i.has(d.id)?{...d,geocodeFailed:!0}:d)}));M(u),K(u),c=0};Et(o,(u,h)=>{a[u]=h,c+=1,ye(d=>Math.max(0,d-1)),c>=8&&p()},{concurrency:4,onFail:u=>{i.add(u),c+=1,ye(h=>Math.max(0,h-1)),c>=8&&p()}}).finally(p)},ct=t=>{const n=new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"});return`
    You are a food expert helping someone find the BEST restaurants in
    "${t}" as of ${n}. Focus on top-rated places,
    award winners, and spots with recent widespread press. Include iconic
    street food and hole-in-the-wall legends locals actually eat at.

    **TODAY'S DATE: ${n}** — use this to assess "currently open",
    "recent reviews", and "last 12 months". Search Google Maps for each
    restaurant's current operational status before including it.

    **PART 0: OPERATIONAL VERIFICATION — HARD RULE (READ FIRST)**
    Every place you return MUST currently be operating. The "business_status"
    field is REQUIRED on every restaurant — set it to exactly "OPERATIONAL".
    If any of the following are true, OMIT the restaurant entirely (do not
    return it with a non-operational status — just leave it out):
    - The place is marked "permanently closed" or "temporarily closed" on
      Google Maps. (Real example we caught: "Rimpa Lapin" in Pratumnak
      Hill, Pattaya — DO NOT include this. Many places like it exist —
      check before recommending.)
    - You are not >90% confident the place is still open as of the
      current month. The bar is high: when in doubt, leave it out.
    - The chef who made it famous has left, the venue has changed
      ownership, or the location moved without keeping quality.
    - Reviews show closure reports in the last 6 months even without
      Google Maps confirming.

    Critical: omitting > including. An empty category is fine; a
    closed listing is a failure of the system. Cross-check at minimum:
    Google Maps status, recent reviews (last 90 days), official social
    media. If any of these signal closure, omit.

    **PART 1: QUOTA & SCOPE**
    - For EACH of the 10 categories below, return 6-8 real restaurants
      (aim for 8 in a major food city). Return an empty array ONLY if
      the category truly has no real results in this city. Better empty
      than fake. Full response for a major city = 60-80 restaurants.
    - Every "location" MUST clearly be in or near "${t}".

    **PART 2: CATEGORIES**
    Use EXACTLY these Hebrew titles as "title" (UI keys). Let the actual
    cuisine + vibe decide the best-fitting category — don't force matches.
    A restaurant may appear in two categories if equally relevant.

    1. "אוכל מקומי אותנטי"
    2. "יוקרה ומישלן"
    3. "ברי קוקטיילים"
    4. "מסעדות משפחתיות"
    5. "ראמן"
    6. "פיצה"
    7. "המבורגר"
    8. "בתי קפה וקינוחים"
    9. "תאילנדי"
    10. "יפני"

    **NOTE FOR SMALL CITIES, ISLANDS & RESORT TOWNS:**
    If "${t}" is a beach resort, island, small town, or rural area:
    - Collapse categories with no real local options (e.g. no ramen on a Thai island)
      into "אוכל מקומי אותנטי" or the best-fitting existing category.
    - Hotel restaurants, beach bars, resort dining, food stalls, and waterfront
      seafood spots all count as real local options — include them.
    - Aim for at least 8-12 total restaurants across all filled categories.
    - Better to fill 4-5 categories well than to leave 8 categories empty.

    **PART 3: RECENCY CHECK — CRITICAL**
    Do NOT recommend places whose quality has dropped:
    - Skip restaurants that USED to be great but have slid in recent
      reviews (last 12 months). If a Michelin star was LOST, don't
      recommend on the old star.
    - Skip places permanently closed, changed hands with bad reviews
      since, or that had a chef departure that hurt quality.
    - When in doubt about current quality, leave it out.

    **PART 4: LOCAL AUTHORITY SOURCES (prefer over Google / TripAdvisor)**
    Locals rate on platforms in their own language, not only Google.
    Cross-reference these where relevant before recommending:
    - **Wongnai (วงใน)** — Thailand's #1 local food-review app.
      For Thai cities, a high Wongnai rating means locals love it.
    - **Tabelog (食べログ)** — Japan's authority (3.5+ is strong,
      3.8+ is elite).
    - **Dianping (大众点评)** — China / Hong Kong locals.
    - **OpenRice** — Hong Kong, Singapore, Malaysia, Thailand.
    - **Naver Map** — Korea (locals use this more than Google).
    - **Zomato** — India, parts of SEA.
    For Western cities: Michelin Guide, Eater, TimeOut, Asia's 50 Best,
    World's 50 Best, NYT food section, local food critics.
    AVOID TripAdvisor as primary — too tourist-trap oriented.
    Use "Local Favorite" / "Top-Rated" as a fallback when no specific
    citation applies.

    **PART 5: HARD EXCLUSIONS — CHAIN RESTAURANTS (CRITICAL)**
    You MUST NOT include any of the following, even if locals sometimes
    eat there. The user has explicitly rejected chain food:
    - Global fast-food chains: McDonald's, Burger King, KFC, Subway,
      Wendy's, Taco Bell, Hardee's, Carl's Jr, Five Guys, Wingstop,
      Chick-fil-A, Popeyes, Jollibee, Dairy Queen, Arby's
    - Global pizza chains: Pizza Hut, Domino's, Papa John's, Little
      Caesars, Pizza Inn, Round Table Pizza
    - Regional fast-food pizza chains positioned LIKE Domino's: **Pizza
      Company** (Thailand), Pizza Marzano (mass-market casual), any chain
      with 50+ outlets aimed at quick delivery
    - Global coffee chains: Starbucks, Costa Coffee, Café Nero, Tim Hortons
    - Global bakery/dessert chains: Krispy Kreme, Dunkin', Cold Stone
    - Places currently closed or with quality decline in last year
    If only a chain came to mind for a category, return FEWER results
    (or empty array). Quality over quantity — never pad with chains.

    **PART 6: QUALITY FLOOR (CRITICAL)**
    For every category you return, include AT LEAST 3 places — each one
    must be a strong recommendation. If you genuinely can't find 3
    quality independent options for a category in this city, return an
    empty array for that category. Empty is better than padded.

    For "googleMapsUrl": include the actual URL from your Google Search
    results, NOT a guessed one. Omit the field entirely if you cannot
    find a real URL — fabricated URLs break the map view.

    CRITICAL — "location" field MUST be in English (used by a geocoding API). Format: "Street or Neighbourhood, City". Example: "Silom Road, Bangkok".

    CRITICAL — "nameEnglish" is REQUIRED for every restaurant. Rules:
    - It MUST be the restaurant's actual official Latin-script name as it appears on its sign, website, or Google Maps (e.g. "Paste", "Gaggan Anand", "Jay Fai", "Sorn").
    - DO NOT write a Hebrew transliteration in Latin letters. Find the real English name.
    - DO NOT translate it. Use the proper name.
    - "name" stays in Hebrew for the UI; "nameEnglish" is what the map and English surfaces render.

    CRITICAL — "recommendationSource" MUST be a SHORT platform/publication name only (max 40 chars).
    Use one of: "Wongnai", "Michelin Guide", "TripAdvisor", "TimeOut", "Eater",
    "YouTube (channel name)", "Tabelog", "OpenRice", "Asia's 50 Best", "Google",
    "Local Favorite", "Top-Rated".
    NEVER write descriptions ("Known for...", "Offers...", "Praised for...") in this field.
    NEVER include the restaurant's own name in this field.
    If no authoritative source applies, use "Local Favorite".

    OUTPUT JSON ONLY:
    { "categories": [ { "id", "title", "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl", "business_status", "verification_needed" } ] } ] }
    "business_status" is REQUIRED — must be "OPERATIONAL" for any place you return.
    Set "verification_needed" to true ONLY if you're sharing the place
    but want the user to double-check hours/status before going.
    `},dt=async(t=!1,n)=>{Ce(!0),E("");try{const o=new Date().getFullYear()-1,a=n||s.destinationEnglish||S(v[0],"en")||s.destination,i=new Date().toLocaleDateString("en-GB",{month:"long",year:"numeric"}),p=`
            You are a food expert helping someone find the BEST restaurants in
            "${a}" as of ${i}. Find top-rated places, award winners,
            spots with strong recent press, and iconic hole-in-the-wall local legends.

            **TODAY'S DATE: ${i}** — use this to judge "currently open",
            "recent reviews", and "last 12 months". Search Google Maps for each
            restaurant's current operational status before including it. Do NOT rely
            on training data alone — verify each place is still open right now.

            **PART 0: OPERATIONAL VERIFICATION — HARD RULE (READ FIRST)**
            Every place you return MUST currently be operating as of ${i}.
            If any of the following are true, OMIT the restaurant entirely:
            - Google Maps shows "Permanently closed" or "Temporarily closed"
            - You are not >90% confident the place is still open right now
            - The chef who made it famous left and quality dropped
            - Reviews in the last 6 months report closure
            Critical: an empty category is fine; a closed listing is a failure.

            **PART 1: QUOTA & SCOPE**
            - For EACH of the 10 categories below, return 6-8 real restaurants
              (aim for 8 in a major food city). Empty array ONLY if the category
              truly has nothing. Total response for a major city = 60-80.
            - Every "location" MUST be in or near "${a}".
            - If the city is small/village, expand radius to 30km.

            **PART 2: CATEGORIES (use EXACTLY these Hebrew titles as "title"):**
            1. "אוכל מקומי אותנטי"
            2. "יוקרה ומישלן"
            3. "ברי קוקטיילים"
            4. "מסעדות משפחתיות"
            5. "ראמן"
            6. "פיצה"
            7. "המבורגר"
            8. "בתי קפה וקינוחים"
            9. "תאילנדי"
            10. "יפני"

            Let the actual cuisine + vibe decide the best-fitting category.
            A restaurant may appear in two categories if equally relevant.
            Descriptions MUST be in HEBREW. "location" field MUST be in English (used for geocoding) — format: "Street, City".

            **PART 3: RECENCY CHECK (CRITICAL)**
            Do NOT recommend places whose quality dropped in the last 12 months:
            - Skip former-glory places that have slid on recent reviews.
            - If a Michelin star was LOST, don't recommend on the old star.
            - Skip permanently closed, bad chef departure, new bad management.
            - When in doubt about current quality, leave it out.

            **PART 4: LOCAL AUTHORITY SOURCES**
            Locals rate on platforms in their own language. Use these as
            signals in addition to / instead of Google:
            - **Wongnai (วงใน)** — Thailand's #1 local app. Essential for Thai cities.
            - **Tabelog (食べログ)** — Japan's authority. 3.5+ is strong, 3.8+ elite.
            - **Dianping (大众点评)** — China / Hong Kong locals.
            - **OpenRice** — Hong Kong, Singapore, Malaysia, Thailand.
            - **Naver Map** — Korea (locals use this more than Google).
            - **Zomato** — India, parts of SEA.
            Plus global: Michelin Guide, Asia's 50 Best, World's 50 Best,
            Eater, TimeOut, Condé Nast Traveler, NYT food, local press.
            AVOID TripAdvisor as primary source.
            Fallback: "Local Favorite" / "Top-Rated" when no specific source.

            **PART 5: HARD EXCLUSIONS — CHAIN RESTAURANTS (CRITICAL)**
            You MUST NOT include any of the following, even if locals
            sometimes eat there. The user has explicitly rejected chain food:
            - Global fast-food chains: McDonald's, Burger King, KFC, Subway,
              Wendy's, Taco Bell, Hardee's, Carl's Jr, Five Guys, Wingstop,
              Chick-fil-A, Popeyes, Jollibee, Dairy Queen, Arby's
            - Global pizza chains: Pizza Hut, Domino's, Papa John's, Little
              Caesars, Pizza Inn, Round Table Pizza
            - Regional fast-food pizza chains positioned LIKE Domino's:
              **Pizza Company** (Thailand), Pizza Marzano, any chain with
              50+ outlets aimed at quick delivery
            - Global coffee chains: Starbucks, Costa Coffee, Café Nero, Tim Hortons
            - Global bakery/dessert chains: Krispy Kreme, Dunkin', Cold Stone
            - Hotels without a specific named restaurant. Don't recommend
              "The Hilton" — but DO recommend "Gaggan Anand at SO/ Bangkok".
              If a restaurant is inside a hotel set isHotelRestaurant = true
              and use "Name (at Hotel Name)" format.
            If only a chain came to mind for a category, return FEWER
            results. Quality over quantity — never pad with chains.

            **PART 6: QUALITY FLOOR (CRITICAL)**
            Each category you return must contain AT LEAST 3 strong picks.
            If you can't find 3 quality independent options, return an
            empty array for that category. Empty is better than bad.

            **PART 7: FORMATTING**
            - Return pure JSON. Title MUST be the Hebrew string exactly.
            - Map 'cuisine' to one of: Local, Fine, Bar, Family, Ramen, Pizza,
              Burger, Cafe, Thai, Japanese.
            `+`
            
            OUTPUT JSON ONLY (Strict Format):
            {
              "categories": [
                {
                  "id": "string",
                  "title": "string",
                  "restaurants": [
                    { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl" }
                  ]
                }
              ]
            }`,m=te(),u=(await de(null,[{role:"user",parts:[{text:p}]}],{responseMimeType:"application/json",temperature:.1},"SEARCH",m)).text;console.log("🔍 [AI Raw Response Preview]:",(u==null?void 0:u.substring(0,500))+"...");try{const h=JSON.parse(u||"{}");let d=[];if(h.categories?Array.isArray(h.categories)?d=h.categories:typeof h.categories=="object"&&(d=Object.values(h.categories)):Array.isArray(h)&&(d=h),Array.isArray(d)||(d=[]),d.length>0){console.log(`✅ [AI Success] Parsed ${d.length} categories (Format: ${Array.isArray(h)?"Direct Array":"Wrapped Object"})`);const b=d.map((w,L)=>({...w,id:w.id||`ai-food-cat-${L}-${Date.now()}`,region:a,restaurants:Qe(w.restaurants||[]).map((D,B)=>({...D,region:D.region||a,id:`ai-rec-${w.id||L}-${Math.random().toString(36).substr(2,5)}-${B}`,categoryTitle:w.title}))})),y=[...A];b.forEach(w=>{const L=y.findIndex(D=>D.title===w.title);if(L!==-1){const D=y[L].restaurants;w.restaurants.forEach(B=>{D.some(I=>I.name===B.name)||D.push(B)})}else y.push(w)}),M(y),se("all"),K(y),await T(m,b.length>0)}else console.warn("⚠️ [AI Warning] Response was valid JSON but contained no results.",h),E("לא נמצאו המלצות מסעדות עבור יעד זה. המודל לא הצליח לאתר תוצאות איכותיות.")}catch(h){console.error("❌ [AI Error] JSON Parse failed in fetchRecommendations.",h),console.error("Raw content that failed:",u),E("שגיאה בעיבוד התשובה. המודל החזיר תשובה שאינה תקינה.")}}catch(r){console.error("❌ [AI Critical Error]:",r),E(`שגיאה בטעינה: ${r.message||"נסה שוב"}`)}finally{Ce(!1)}},P=g.useMemo(()=>{let t=[];return A.forEach(n=>n.restaurants.forEach(r=>t.push({...r,region:r.region||n.region,categoryTitle:n.title}))),t.sort((n,r)=>(r.googleRating||0)-(n.googleRating||0))},[A]),ut={"Authentic Local Food":"אוכל מקומי אותנטי","Luxury & Michelin":"יוקרה ומישלן","Cocktail Bars":"ברי קוקטיילים","Family Friendly":"מסעדות משפחתיות",Ramen:"ראמן",Pizza:"פיצה",Burger:"המבורגר","Cafe & Dessert":"בתי קפה וקינוחים",Thai:"תאילנדי","Japanese - NO RAMEN":"יפני",Japanese:"יפני","Icons & Landmarks":"אתרי חובה","Nature & Views":"טבע ונופים","Heritage & Art":"מוזיאונים ותרבות","Retail Therapy":"קניות ושווקים",Adrenaline:"אקסטרים ופעילויות","Sun & Sea":"חופים ומים","Kids' Joy":"למשפחות וילדים",Spiritual:"היסטוריה ודת","Night Vibes":"חיי לילה ואווירה","Hidden Gems":"פינות נסתרות"},Re=t=>ut[t]||t,Ge=t=>{if(!t)return"";const n=t.toLowerCase();return/^(known for|praised for|offers|serves|recommended for|highly|experience|locals|family-friendly|ranked|ideal for|considered|regarded)/i.test(t.trim())||t.length>80?"Other":n.includes("youtube")?"YouTube":n.includes("wongnai")?"Wongnai":n.includes("michelin")||n.includes("bib gourmand")?"Michelin Guide":n.includes("50 best")?"Asia's 50 Best":n.includes("timeout")||n.includes("time out")?"TimeOut":n.includes("eater")?"Eater":n.includes("tripadvisor")||n.includes("trip advisor")?"TripAdvisor":n.includes("gault")?"Gault & Millau":n.includes("tabelog")?"Tabelog":n.includes("openrice")?"OpenRice":n.includes("google")?"Google":n.includes("trip.com")||n.includes("hotels.com")||n.includes("agoda")||n.includes("tripfactory")||n.includes("bestprice")?"Travel Sites":n.includes("official site")||n.includes("official website")?"Official Site":n.includes("wanderlog")||n.includes("tatinta")||n.includes("traveling tum")||n.includes("ideal magazine")||n.includes("luxury society")||n.includes("feastography")||n.includes("pattaya")||n.includes("thailand magazine")||n.includes("asean now")?"Local Media":(/\b(restaurant|hotel|bar|tavern|lounge|cafe|kitchen|grill|bistro)\b/i.test(t),"Other")},ze=g.useMemo(()=>{const t=new Set;return P.forEach(r=>{const o=Ge((r.recommendationSource||"").trim());o&&t.add(o)}),["Michelin Guide","Asia's 50 Best","Wongnai","YouTube","TimeOut","Eater","TripAdvisor","Tabelog","OpenRice","Google","Official Site","Local Media","Travel Sites","Gault & Millau","Other"].filter(r=>t.has(r))},[P]),oe=(t,n)=>{let r=[...s.restaurants],o=-1,a=-1;for(let i=0;i<r.length;i++){const c=r[i].restaurants.findIndex(p=>p.name===t.name);if(c!==-1){o=i,a=c;break}}if(o!==-1)r[o].restaurants.splice(a,1),r[o].restaurants.length===0&&r.splice(o,1);else{const i=Nt({name:t.name,location:t.location,region:t.region},s,f);let c=r.findIndex(p=>p.title===n);c===-1&&(r.push({id:`cat-${Date.now()}`,title:n,region:i,restaurants:[]}),c=r.length-1),r[c].restaurants.push({...t,id:`added-${Date.now()}`,region:i})}l({...s,restaurants:r}),Ie(i=>{const c=new Set(i);return o!==-1?c.delete(t.id):c.add(t.id),c})},ie=g.useMemo(()=>t=>Je(s,{location:t.location,region:t.region}),[s]),gt=t=>{const n=new Map,r=o=>{var i;for(const c of v)if(Q(o,c))return S(c,"en").toLowerCase();const a=o.region||((i=(o.location||"").split(",").pop())==null?void 0:i.trim())||"";return S(a,"en").toLowerCase()};for(const o of t){const a=(o.nameEnglish||o.name||"").trim().toLowerCase();if(!a)continue;const i=`${a}|${r(o)}`,c=n.get(i);if(!c){n.set(i,o);continue}const p=(c.googleRating||0)+(c.recommendationSource?.1:0);(o.googleRating||0)+(o.recommendationSource?.1:0)>p&&n.set(i,o)}return Array.from(n.values())},Ye=g.useMemo(()=>{let t=[];if(Z==="all")t=P;else{const a=A.find(i=>i.id===Z);t=a?a.restaurants.map(i=>({...i,region:i.region||a.region})).sort((i,c)=>(c.googleRating||0)-(i.googleRating||0)):[]}const n=t.length;v.length>0&&(t=t.filter(ie));const r=t.length;f!=="all"&&(t=t.filter(a=>Q(a,f)));const o=t.length;return console.debug(`🍽️ [Restaurants] base=${n} → scope=${r} → city=${o} (tripCities=${JSON.stringify(v)}, selectedCity=${f})`),Y!=="all"&&(t=t.filter(a=>Ge(a.recommendationSource||"")===Y)),gt(t)},[A,Z,Y,f,P,v,ie]),Te=g.useMemo(()=>P.length===0||v.length===0?!1:!P.some(ie),[P,v,ie]);g.useMemo(()=>{const t=[];s.restaurants.forEach(o=>o.restaurants.forEach(a=>t.push(a)));let n=t;f!=="all"&&(n=t.filter(o=>Q(o,f)));const r={};return n.forEach(o=>{const a=o.categoryTitle||o.iconType||"General";r[a]||(r[a]=[]),r[a].push(o)}),Object.keys(r).forEach(o=>{r[o]=Ze(r[o])}),r},[s.restaurants,f]);const ht=()=>{const t=[],n=a=>f!=="all"?S(f,"en")||f:a?S(a,"en"):void 0,r=new Set;return s.restaurants.flatMap(a=>a.restaurants.map(i=>({...i,categoryTitle:i.categoryTitle||a.title}))).forEach(a=>{f!=="all"&&!Q(a,f)||(r.add(a.name.toLowerCase()),t.push({id:a.id,type:"restaurant",name:a.name,address:a.location,lat:a.lat,lng:a.lng,city:n(a.region),description:a.description,rating:typeof a.googleRating=="number"?a.googleRating:void 0,cuisine:a.cuisine,recommendationSource:a.recommendationSource,priceRange:a.priceRange||a.price||a.priceLevel,imageUrl:a.imageUrl,notes:a.notes,googleMapsUrl:a.googleMapsUrl,source:"saved",raw:a,categoryTitle:a.categoryTitle}))}),Ye.forEach(a=>{f!=="all"&&!Q(a,f)||r.has(a.name.toLowerCase())||t.push({id:`ai-${a.id}`,type:"restaurant",name:a.name,address:a.location,lat:a.lat,lng:a.lng,city:n(a.region),description:a.description,rating:typeof a.googleRating=="number"?a.googleRating:void 0,cuisine:a.cuisine,recommendationSource:a.recommendationSource,priceRange:a.priceRange||a.price||a.priceLevel,imageUrl:a.imageUrl,notes:a.notes,googleMapsUrl:a.googleMapsUrl,source:"ai",raw:a,categoryTitle:a.categoryTitle||"AI"})}),(s.hotels||[]).forEach(a=>{const i=a.city||a.address||"";f!=="all"&&!je(i,f)||!a.address&&(typeof a.lat!="number"||typeof a.lng!="number")||t.push({id:`hotel-${a.id}`,type:"hotel",name:a.name,address:a.address,lat:a.lat,lng:a.lng,description:a.city||a.address,source:"saved"})}),t},mt=g.useMemo(()=>new Set(s.restaurants.flatMap(t=>t.restaurants).map(t=>t.name.toLowerCase())),[s.restaurants]),Be=(t,n)=>{const r=s.restaurants.map(o=>({...o,restaurants:o.restaurants.map(a=>a.id===t?{...a,...n}:a)}));l({...s,restaurants:r})},ft=t=>{if(!window.confirm("להסיר את המסעדה מהרשימה?"))return;const n=s.restaurants.map(r=>({...r,restaurants:r.restaurants.filter(o=>o.id!==t)})).filter(r=>r.restaurants.length>0);l({...s,restaurants:n}),Ie(r=>{const o=new Set(r);return o.delete(t),o})};return e.jsxs("div",{className:"space-y-3 animate-fade-in pb-12",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"flex-shrink-0",children:e.jsx(Ot,{value:C,onChange:_,size:"md",className:"[&_button]:px-5 [&_button]:font-black [&_button[aria-selected=true]]:text-orange-600 [&_svg]:w-4 [&_svg]:h-4",ariaLabel:"Restaurants view mode",items:[{value:"recommended",label:"המלצות AI",iconLeading:e.jsx(ce,{})},{value:"my_list",label:"הרשימה שלי",iconLeading:e.jsx(Ke,{})}]})}),e.jsx("div",{className:"flex-grow relative z-20 min-w-0 max-w-sm",children:e.jsxs("div",{className:"bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-1.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all",children:[e.jsx(wt,{className:"w-4 h-4 text-slate-400 mr-1 flex-shrink-0"}),e.jsx("input",{className:"flex-grow outline-none text-slate-700 font-medium text-sm min-w-0",placeholder:"נסה: מישלן בבנגקוק, ראמן, בר קוקטיילים, בית קפה...",value:F,onChange:t=>fe(t.target.value),onKeyDown:t=>t.key==="Enter"&&ve()}),F&&e.jsx("button",{onClick:Ue,className:"p-1 hover:bg-slate-100 rounded-full text-slate-400 flex-shrink-0",children:e.jsx(We,{className:"w-3.5 h-3.5"})}),e.jsxs("button",{onClick:ve,disabled:pe||!F.trim(),className:"bg-orange-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-orange-700 transition-colors flex items-center gap-1 disabled:opacity-50 flex-shrink-0",children:[pe?e.jsx(q,{className:"w-3 h-3 animate-spin"}):e.jsx(ce,{className:"w-3 h-3"}),e.jsx("span",{className:"hidden sm:inline",children:pe?"...":"חיפוש"})]})]})})]}),s.customFoodCategories&&s.customFoodCategories.length>0&&e.jsx("div",{className:"flex flex-wrap gap-1.5",children:s.customFoodCategories.map((t,n)=>e.jsxs("button",{onClick:()=>{fe(t),ve()},className:"group flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-700 rounded-full text-2xs font-bold border border-slate-200 transition-all hover:border-orange-200",children:[e.jsx(ce,{className:"w-2.5 h-2.5 text-orange-400"}),t,e.jsx("button",{onClick:r=>{var a;r.stopPropagation();const o=(a=s.customFoodCategories)==null?void 0:a.filter((i,c)=>c!==n);l({...s,customFoodCategories:o})},className:"opacity-0 group-hover:opacity-100 p-0.5 hover:bg-orange-100 rounded-full transition-all text-orange-400",children:e.jsx(We,{className:"w-2.5 h-2.5"})})]},n))}),e.jsxs("div",{className:"flex items-center gap-2",children:[v.length>1?e.jsx("div",{className:"flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-grow min-w-0",children:v.map(t=>e.jsx("button",{onClick:()=>Oe(t),className:`px-3 py-1 rounded-full text-2xs font-black transition-all border whitespace-nowrap flex-shrink-0 ${f===t?"bg-slate-900 border-slate-900 text-white shadow":"bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`,children:t},t))}):e.jsx("div",{className:"flex-grow"}),e.jsxs("div",{className:"inline-flex bg-slate-100 rounded-xl p-0.5 flex-shrink-0",children:[e.jsxs("button",{onClick:()=>H("list"),className:`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${$==="list"?"bg-white text-slate-800 shadow-sm":"text-slate-500 hover:text-slate-700"}`,children:[e.jsx(vt,{className:"w-3 h-3"})," רשימה"]}),e.jsxs("button",{onClick:()=>H("map"),className:`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${$==="map"?"bg-white text-blue-700 shadow-sm":"text-slate-500 hover:text-slate-700"}`,children:[e.jsx(qe,{className:"w-3 h-3"})," מפה"]})]}),A.length>0&&!j&&e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:()=>f!=="all"?$e(f):re(),disabled:ae||N,title:N?`סורק (${W.current}/${W.total})`:f!=="all"?"רענן עיר":"רענן הכל",className:"flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 flex-shrink-0",children:e.jsx(Xe,{className:`w-3.5 h-3.5 ${ae||N?"animate-spin":""}`})}),e.jsx("button",{onClick:()=>be(!0),disabled:ae||N,title:"איפוס מחקר",className:"flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50 flex-shrink-0",children:e.jsx(tt,{className:"w-3.5 h-3.5"})})]})]}),Le&&e.jsxs("div",{className:"space-y-3 animate-fade-in",children:[e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsx("h3",{className:"text-base font-black text-slate-800",children:"תוצאות חיפוש"}),e.jsx("button",{onClick:Ue,className:"text-2xs text-slate-500 hover:text-red-500 underline",children:"נקה"})]}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3",children:Le.map(t=>e.jsx(et,{rec:t,tripDestination:s.destination,tripDestinationEnglish:s.destinationEnglish,isAdded:Ee.has(t.id)||s.restaurants.some(n=>n.restaurants.some(r=>r.name===t.name)),onAdd:oe,onClick:()=>ne(t)},t.id))}),e.jsx("div",{className:"border-b border-slate-200"})]}),j&&e.jsxs("div",{className:"flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600",children:[e.jsxs("span",{className:"flex items-center gap-1.5",children:[e.jsx("span",{children:"🔒"}),e.jsx("span",{children:"תוצאות פרטיות — נשמרות רק במכשיר שלך"})]}),kt(s.id)&&e.jsx("button",{onClick:()=>{Lt(s.id),M(s.aiRestaurants||[])},className:"text-slate-500 hover:text-slate-800 underline underline-offset-2",children:"נקה תוצאות פרטיות"})]}),$==="map"?e.jsxs("div",{className:"space-y-3",children:[e.jsx(e.Fragment,{children:Me>0&&e.jsxs("div",{className:"flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm",children:[e.jsx(q,{className:"w-4 h-4 animate-spin"}),e.jsxs("span",{children:["מאתר ",Me," מקומות נוספים על המפה..."]})]})}),e.jsx(Rt,{items:ht(),trip:s,activeCity:f!=="all"?S(f,"en")||f:null,title:"מפת מסעדות",savedNames:mt,onAddToList:t=>{const n=t.raw;n&&oe(n,t.categoryTitle||"AI")}})]}):e.jsx(e.Fragment,{children:C==="my_list"?e.jsx(e.Fragment,{children:s.restaurants.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 text-center space-y-6 animate-fade-in px-4",children:[e.jsxs("div",{className:"w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center shadow-lg shadow-orange-100/50 relative",children:[e.jsx(ce,{className:"w-10 h-10 text-orange-500 absolute top-4 right-4 animate-pulse"}),e.jsx(Ke,{className:"w-10 h-10 text-orange-600"})]}),e.jsxs("div",{className:"space-y-3 max-w-sm",children:[e.jsx("h3",{className:"text-2xl font-black text-slate-800",children:"הרשימה שלך ריקה... בוא נמלא אותה!"}),e.jsxs("p",{className:"text-sm text-slate-500 leading-relaxed",children:["ה-AI שלנו יכול לסרוק את הרשת ולמצוא עבורך את המסעדות הכי שוות ב",s.destination,".",e.jsx("br",{}),"אל תבזבז זמן על חיפושים ידניים."]})]}),!j&&e.jsxs("button",{onClick:()=>{_("recommended"),!N&&A.length===0&&re()},disabled:N,className:"group relative overflow-hidden bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center gap-3 disabled:opacity-60 disabled:cursor-wait",children:[e.jsx("div",{className:"absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"}),e.jsxs("span",{className:"relative flex items-center gap-2",children:[N?e.jsx(q,{className:"w-5 h-5 animate-spin"}):e.jsx(Ne,{className:"w-5 h-5"}),N?"מחפש מסעדות…":"התחל המלצות AI"]})]})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"flex justify-between items-center mb-1",children:e.jsxs("button",{onClick:()=>H("map"),className:"px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-xs bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm",children:[e.jsx(qe,{className:"w-3 h-3"})," מפה"]})}),e.jsx("div",{className:"space-y-4 mt-4",children:e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3",children:(()=>{const t=[];s.restaurants.forEach(r=>r.restaurants.forEach(o=>t.push({...o,region:o.region||r.region,cuisine:o.cuisine||o.iconType||r.title||"General"})));let n=t;return f!=="all"&&(n=t.filter(r=>Q(r,f))),n=Ze(n),n.length===0?e.jsx("div",{className:"col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 mt-4",children:e.jsx("p",{className:"text-slate-500 text-sm font-bold",children:"לא נמצאו מסעדות בסינון זה."})}):n.map(r=>e.jsx(_t,{data:r,onSaveNote:o=>Be(r.id,{notes:o}),onUpdate:o=>Be(r.id,o),onDelete:()=>ft(r.id),onSelect:()=>ne(r)},r.id))})()})})]})}):e.jsxs("div",{className:"animate-fade-in",children:[N&&e.jsxs("div",{className:"flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-2xs font-bold",children:[e.jsx(q,{className:"w-3.5 h-3.5 animate-spin"}),e.jsxs("span",{children:["סורק עיר ",W.current," מתוך ",W.total,"…"]})]}),ae?e.jsxs("div",{className:"space-y-4",children:[e.jsx(Mt,{texts:["בודק את הסצנה הקולינרית...","מחפש מנות מומלצות...","סורק ביקורות מקומיים...","מצליב נתוני מישלן..."]}),e.jsx(Ft,{count:6,className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"})]}):e.jsx(e.Fragment,{children:P.length===0||Te?e.jsxs("div",{className:"flex flex-col items-center justify-center py-10 space-y-4 text-center px-4",children:[e.jsx("div",{className:"bg-orange-100 p-4 rounded-full",children:e.jsx(Ne,{className:"w-8 h-8 text-orange-600"})}),e.jsx("h3",{className:"text-xl font-black text-slate-800",children:Te?"הנתונים השמורים לא מתאימים לטיול הזה":v.length>1?"באיזו עיר נתמקד?":"בחר עיר לחיפוש"}),Te&&e.jsxs("p",{className:"text-sm text-slate-500 max-w-sm",children:["מצאנו מסעדות שמורות ממחקר ישן שאינן ב-",s.destination,". בצע מחקר חדש לקבלת המלצות מותאמות לטיול."]}),e.jsx("button",{onClick:()=>re(),disabled:N,className:"bg-gradient-to-r from-orange-600 to-amber-600 text-white px-8 py-3 rounded-2xl text-base font-black shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-60",children:N?e.jsxs(e.Fragment,{children:[e.jsx(q,{className:"w-5 h-5 animate-spin"})," סורק (",W.current,"/",W.total,")"]}):e.jsxs(e.Fragment,{children:[e.jsx(Ne,{className:"w-5 h-5"})," המלצות AI לכל הטיול"]})}),v.length>1&&!N&&e.jsxs("div",{className:"pt-3 border-t border-slate-100 w-full max-w-md",children:[e.jsx("div",{className:"text-2xs font-bold text-slate-400 mb-2",children:"או מחקר ממוקד לעיר בודדת:"}),e.jsx("div",{className:"flex flex-wrap justify-center gap-2",children:v.map(t=>e.jsx("button",{onClick:()=>$e(t),className:"bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-full text-xs font-bold hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-all",children:t},t))})]})]}):e.jsxs(e.Fragment,{children:[(()=>{const t=new Set,n=A.filter(r=>{const o=Re(r.title);return t.has(o)?!1:(t.add(o),!0)});return e.jsx("div",{className:"mb-3 overflow-x-auto pb-2 scrollbar-hide",children:e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>se("all"),className:`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${Z==="all"?"bg-orange-600 text-white border-orange-600":"bg-white text-slate-600 border-slate-200"}`,children:"הכל"}),n.map(r=>e.jsxs("div",{className:"inline-flex items-center gap-0.5",children:[e.jsx("button",{onClick:()=>se(r.id),className:`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${Z===r.id?"bg-orange-600 text-white border-orange-600":"bg-white text-slate-600 border-slate-200"}`,children:Re(r.title)}),!j&&e.jsx("button",{onClick:()=>lt(r),disabled:Pe!==null,title:`רענן ${Re(r.title)}`,className:"w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-40",children:Pe===r.id?e.jsx(q,{className:"w-3 h-3 animate-spin"}):e.jsx(Xe,{className:"w-3 h-3"})})]},r.id))]})})})(),ze.length>1&&e.jsxs("div",{className:"mb-3",children:[e.jsxs("button",{onClick:()=>st(t=>!t),className:`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold transition-all ${he||Y!=="all"?"bg-orange-50 text-orange-700 border border-orange-200":"text-slate-500 hover:text-slate-700"}`,children:["סנן לפי מקור המלצה",Y!=="all"&&e.jsx("span",{className:"bg-orange-600 text-white px-1.5 py-0.5 rounded-full text-[9px]",children:"1"}),e.jsx("span",{className:`transition-transform ${he?"rotate-180":""}`,children:"▾"})]}),he&&e.jsxs("div",{className:"mt-2 overflow-x-auto pb-2 flex gap-2 items-center animate-fade-in",children:[e.jsx("button",{onClick:()=>ge("all"),className:`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${Y==="all"?"bg-orange-600 text-white border-orange-600":"bg-white text-slate-600 border-slate-200"}`,children:"הכל"}),ze.map(t=>e.jsx("button",{onClick:()=>ge(t),className:`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${Y===t?"bg-orange-600 text-white border-orange-600":"bg-white text-slate-600 border-slate-200"}`,children:t},t))]})]}),e.jsx("div",{className:"grid grid-cols-2 lg:grid-cols-5 gap-3",children:Ye.map(t=>e.jsx(et,{rec:t,tripDestination:s.destination,tripDestinationEnglish:s.destinationEnglish,isAdded:Ee.has(t.id)||s.restaurants.some(n=>n.restaurants.some(r=>r.name===t.name)),onAdd:oe,onClick:()=>ne(t)},t.id))})]})})]})}),k&&e.jsx(Pt,{item:k,type:"restaurant",onClose:()=>ne(null),isAdded:s.restaurants.some(t=>t.restaurants.some(n=>n.name===(k==null?void 0:k.name))),onAddToPlan:()=>oe(k,(k==null?void 0:k.categoryTitle)||"תכנון טיול")}),e.jsx(Ve,{isOpen:nt,title:"לאפס את המחקר?",message:"כל ההמלצות השמורות יימחקו. מיד אחרי האישור יתחיל מחקר חדש לכל הערים של הטיול. לא ניתן לבטל.",confirmText:"אפס והרץ מחדש",cancelText:"ביטול",isDangerous:!0,onConfirm:it,onClose:()=>be(!1)}),e.jsx(Ve,{isOpen:ot,title:"הגעת למכסה החודשית",message:"הגעת למכסת הרענון החודשית לקטגוריה זו (1 רענון בתשלום + 3 רענונים חינמיים). המכסה מתאפסת בתחילת כל חודש.",confirmText:"הבנתי",cancelText:"",onConfirm:()=>we(!1),onClose:()=>we(!1)})]})},_t=({data:s,onSaveNote:l,onUpdate:C,onDelete:_,onSelect:$})=>{const[H,G]=g.useState(!1),[j,V]=g.useState(s.notes||""),O=[s.cuisine||"",s.categoryTitle||"",s.location],{url:X,label:R}=St(s.name||"",s.description||"",O),z=at(s.cuisine||R),J=s.imageUrl||X,ue=T=>{T.stopPropagation(),C({isFavorite:!s.isFavorite})},te=()=>{l(j),G(!1)};return e.jsxs("div",{onClick:$,className:"bg-white rounded-2xl border border-slate-100 shadow-sm p-3 hover:shadow-md transition-shadow relative group cursor-pointer",children:[e.jsxs("div",{className:"flex justify-between items-start gap-3",children:[e.jsxs("div",{className:"flex gap-3 items-start flex-grow min-w-0",children:[e.jsxs("div",{className:"w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative border border-slate-200",children:[e.jsx("img",{src:J,onError:T=>{T.target.src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&q=80"},className:"w-full h-full object-cover",alt:s.name}),e.jsx("div",{className:"absolute bottom-0 right-0 left-0 bg-black/40 backdrop-blur-[1px] p-0.5 text-center",children:e.jsx("span",{className:"text-[8px] font-bold text-white block truncate",children:z.label})})]}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("div",{className:"flex items-center gap-2",children:e.jsx("h4",{className:"font-black text-slate-800 text-sm truncate",children:s.name})}),e.jsxs("div",{className:"flex items-center gap-2 mt-1",children:[e.jsxs("div",{className:`text-2xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${z.gradient}`,children:[e.jsx("span",{children:z.icon}),e.jsx("span",{children:z.label})]}),s.googleRating&&e.jsxs("div",{className:"flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded",children:[e.jsx(jt,{className:"w-3 h-3 text-amber-400 fill-amber-400"}),s.googleRating]})]}),e.jsx("p",{className:"text-xs text-slate-400 truncate mt-1",children:s.description||s.location})]})]}),e.jsxs("div",{className:"flex flex-col gap-1 flex-shrink-0",children:[e.jsx("button",{onClick:ue,className:`p-1.5 rounded-lg transition-colors ${s.isFavorite?"bg-red-50 text-red-500":"hover:bg-slate-50 text-slate-300 hover:text-slate-400"}`,children:e.jsx($t,{className:`w-4 h-4 ${s.isFavorite?"fill-red-500 text-red-500":""}`})}),e.jsx("button",{onClick:T=>{T.stopPropagation(),_()},className:"p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors",children:e.jsx(tt,{className:"w-4 h-4"})})]})]}),e.jsx("div",{className:"mt-2",onClick:T=>T.stopPropagation(),children:H?e.jsxs("div",{className:"bg-yellow-50 p-2 rounded-lg border border-yellow-100 flex gap-1",children:[e.jsx("textarea",{className:"w-full bg-transparent border-none outline-none text-2xs text-yellow-900 resize-none",rows:1,value:j,onChange:T=>V(T.target.value)}),e.jsx("button",{onClick:te,className:"text-2xs font-black text-yellow-700 whitespace-nowrap",children:"שמור"})]}):e.jsx("div",{onClick:()=>G(!0),className:"text-2xs text-slate-400 border border-dashed border-slate-200 rounded-lg p-1.5 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors",children:s.notes?e.jsxs(e.Fragment,{children:[e.jsx(Bt,{className:"w-3 h-3 text-yellow-500"})," ",e.jsx("span",{className:"text-yellow-900 truncate",children:s.notes})]}):e.jsx("span",{className:"opacity-50",children:"+ הערה"})})})]})};export{ta as RestaurantsView};
