# מסמך פעולה: תיקון באגים ושיפורים לדף הניהול, אוכל, אטרקציות ומפות

תאריך סקירה: 2026-04-29  
היקף: `AdminView`, `RestaurantsView`, `AttractionsView`, `UnifiedMapView`, `FullTripMapView`, חיבורי AI/Google/Firebase/geocoding.

## תקציר מנהלים

המערכת בנויה טוב יחסית סביב React/Vite, Firebase, Cloudflare Worker ו-AI research. יש כבר כמה הגנות חשובות בקוד: שימוש ב-`tripRef` כדי למנוע דריסה של טיול בזמן משימות async, סינון חלקי של תוצאות מחוץ למדינת הטיול, dedupe למסעדות/אטרקציות, geocoding ברקע בדפי אוכל/אטרקציות, ו-build production תקין.

הפער המרכזי: חיבור “Google” כרגע אינו Google Places API מלא. בפועל החיפוש עובד דרך Gemini עם Google Search grounding, קישורי Google Maps שמגיעים מהמודל, וחילוץ קואורדינטות/Photon geocoding. זה מספיק ל-recommendations, אבל לא מספיק להבטחה חזקה של “המסעדה X מוצמדת ל-Place המדויק שלה במפה”.

## בדיקות שבוצעו

- `npm run build` עבר בהצלחה.
- קיימת אזהרת bundle גדול: `dist/assets/index-*.js` בערך `1.48MB`.
- Smoke test ל-AI Worker עם `FAST` החזיר `200` ו-JSON תקין.
- Smoke test ל-`SEARCH` עם `gemini-2.5-flash-lite` החזיר `200`, `grounded: true`, עם JSON בתוך markdown fence. בצד frontend זה אמור להתנקות דרך `cleanJSON`.
- בדיקה ישירה ל-`gemini-3.1-pro-preview` החזירה quota `429/500`, אבל זה לא בהכרח שובר את האפליקציה כי `generateWithFallback` אמור לעבור למודלים הבאים.
- בתיקיית הפרויקט הראשית לא נמצא `.env.local`; נמצא קובץ `travel-planner-pro/.env.local` בתת-תיקייה. אם מריצים Vite מה-root, משתני Firebase/Google לא ייטענו מקובץ זה.

## ממצאים לפי עדיפות

### P0 - קריטי

1. אין אימות Google Places אמיתי למסעדות/אטרקציות.
   - המערכת מבקשת מה-AI להחזיר `googleMapsUrl`, אבל אין קריאה ל-Google Places Text Search/Find Place ואין שמירת `placeId`.
   - סיכון: מסעדה עם שם דומה בעיר אחרת, URL מנוחש, או קואורדינטות לא מדויקות.
   - תיקון מומלץ: להוסיף endpoint ב-Worker שמקבל `name + city + country`, קורא ל-Google Places API, מחזיר `placeId`, `formattedAddress`, `lat/lng`, `rating`, `businessStatus`, ו-`googleMapsUri`.

2. Full map מציג/סופר AI data בלי סינון scope מלא.
   - ב-`UnifiedMapView` שכבות `aiRestaurants` ו-`aiAttractions` משטחות את כל `trip.aiRestaurants/aiAttractions`.
   - יש ניקוי קואורדינטות מחוץ ל-bbox, אבל אין דילוג מלא על פריטים שלא שייכים לערי/מדינת הטיול.
   - סיכון: data ישן או hallucinated עדיין נספר בסטטיסטיקות, עלול להיכנס ל-geocoding, ולבלבל את המשתמש.
   - תיקון מומלץ: ליצור utility מרכזי `isPlaceInTripScope(trip, place)` ולהשתמש בו גם ב-Full map, גם בדפי אוכל/אטרקציות וגם ב-MissingData.

3. זיהוי מדינה עבור bbox חלש כאשר ה-destination הוא רשימת ערים בלבד.
   - `getCountryBbox(trip.destinationEnglish || trip.destination)` עובד טוב כאשר היעד כולל מדינה, למשל `Thailand`.
   - אם היעד הוא `Bangkok - Pattaya - Koh Chang`, אין bbox מדינתי אמין.
   - סיכון: geocoding בלי גבולות מדינה יכול להחזיר מיקום שגוי בעולם.
   - תיקון מומלץ: להוסיף `inferTripCountry(trip)` על בסיס `getCountryForCity`, ערי מלונות, טיסות ו-destination, ולהשתמש בו בכל geocoding.

4. מחקר הרקע לא מבצע geocoding ולא מסמן כשלונות.
   - `backgroundResearch` שומר AI restaurants/attractions, אבל לא ממלא `lat/lng` ולא `geocodeFailed`.
   - דפי אוכל/אטרקציות כן עושים geocoding כאשר מריצים מחקר ידנית.
   - סיכון: דף המפה המלא צריך לעשות geocoding עצלן בכל פתיחה; MissingData לא יודע על כשלונות.
   - תיקון מומלץ: אחרי כל city batch ב-background research להריץ `geocodePlacesBatch` ולשמור lat/lng או `geocodeFailed`.

### P1 - גבוה

5. חיפוש טקסט ידני לא מסנן מספיק לפי ערים/מדינות הטיול.
   - `handleTextSearch` באוכל ואטרקציות שולח `Destination Context`, אבל לא משתמש לאחר מכן ב-`inTripScope`.
   - סיכון: חיפוש “sushi” בטיול לתאילנד יכול להחזיר תוצאות מחוץ למסלול אם המודל טועה.
   - תיקון מומלץ: לאחר parse, לסנן לפי `isPlaceInTripScope`, להציג warning על תוצאות שנמחקו, ולאפשר override ידני.

6. שמירה לרשימה עלולה לאבד city context מדויק.
   - במסעדות יש לוגיקה טובה יותר, אבל עדיין מסתמכת על `location.split(',')`.
   - באטרקציות `region` נקבע לפי החלק הראשון של location, שעלול להיות neighborhood/שם מקום ולא עיר.
   - תיקון מומלץ: להשתמש ב-`resolvePlaceCity(place, trip)` מרכזי שמעדיף `place.region`, אחר כך Google Places city/address components, אחר כך `locationMatchesCity`.

7. שכבת map items של דפי אוכל/אטרקציות לא תמיד משקפת את הרשימה אחרי סינון scope.
   - מסעדות recommended משתמש ב-`filteredRestaurants`, טוב.
   - אטרקציות map משתמש ב-`aiCategories.flatMap` במקום `filteredRecommendations`, ולכן במפה של recommended עלולים להופיע פריטים שלא מופיעים ברשימה לאחר סינון category/rater/dedupe.
   - תיקון מומלץ: ב-`AttractionsView.getMapItems` להשתמש ב-`filteredRecommendations` כאשר `activeTab === 'recommended'`.

8. ENV מקומי לא נטען מה-root.
   - `.env.local` נמצא תחת `travel-planner-pro/.env.local`, לא בתיקיית root שממנה Vite רץ.
   - סיכון: כניסה עם Google/Firebase תיכשל בסביבת פיתוח אם אין env בפריסה או shell.
   - תיקון מומלץ: להעביר/לשכפל `.env.local` ל-root, או לעדכן README/סקריפטים כדי להריץ מהתיקייה הנכונה.

### P2 - בינוני

9. אין test suite אוטומטי.
   - יש build בלבד, בלי unit/e2e.
   - תיקון מומלץ: להוסיף Vitest ל-utils קריטיים ו-Playwright לזרימות UI.

10. אין dashboard ניהול לאיכות נתונים.
   - דף הניהול מציג טיולים ולוגים, אבל אין “Data Health” לטיול: כמה מקומות בלי lat/lng, כמה מחוץ למדינה, כמה duplicate, כמה בלי city.
   - תיקון מומלץ: להוסיף לשונית/כרטיס “בדיקת מערכת” בדף הניהול.

11. Bundle גדול.
   - יש lazy loading למסכים, אבל chunk ראשי עדיין גדול.
   - תיקון מומלץ: לפצל map/leaflet, AI chat, onboarding, Firebase-heavy code ל-manual chunks.

## תוכנית תיקון מוצעת

### שלב 1 - תשתית אמינות מיקום

1. להוסיף `utils/tripScope.ts`:
   - `inferTripCountry(trip)`
   - `getTripCountryBbox(trip)`
   - `isPlaceInTripScope(trip, place)`
   - `resolvePlaceCity(place, trip)`
   - `normalizePlaceName(name)`

2. להחליף שימושים מפוזרים:
   - `RestaurantsView.inTripScope`
   - `AttractionsView.inTripScope`
   - `UnifiedMapView` לפני push ל-raw map items
   - `tripGaps`
   - `DiscoverMapView` אם עדיין בשימוש

3. להוסיף בדיקות unit:
   - טיול תאילנד עם Bangkok/Pattaya/Koh Chang לא מחזיר Abu Dhabi כיעד מחקר.
   - Paris לא עובר scope בטיול Thailand.
   - Koh Chang/Ko Chang/קו צ׳אנג מתמפים לאותה עיר.
   - destination שהוא רשימת ערים בלבד עדיין מסיק מדינה.

### שלב 2 - Google Places Verification

1. להוסיף endpoint ב-Worker:
   - `POST /api/places/resolve`
   - input: `{ name, city, country, type }`
   - output: `{ placeId, name, formattedAddress, lat, lng, rating, userRatingCount, businessStatus, googleMapsUri, confidence }`

2. לשמור בשדות:
   - `placeId?: string`
   - `verifiedAddress?: string`
   - `verificationStatus: 'verified' | 'ambiguous' | 'not_found' | 'manual'`
   - `verificationSource: 'google_places' | 'google_maps_url' | 'photon' | 'manual'`

3. להשתמש ב-Places לפני Photon:
   - אם יש `placeId/lat/lng`, לא עושים Photon.
   - אם יש כמה תוצאות, בוחרים לפי city/country/name similarity.
   - אם confidence נמוך, מסמנים “דורש אישור” ולא מצמידים אוטומטית למפה.

### שלב 3 - זרימות אוכל ואטרקציות

1. אחרי חיפוש AI ידני:
   - לסנן לפי trip scope.
   - להריץ Places resolve על כל תוצאה.
   - להציג מספר תוצאות שנפסלו מחוץ למדינת הטיול.

2. אחרי מחקר לכל הערים:
   - לשמור תוצאות לכל עיר בנפרד.
   - לבצע dedupe לפי `placeId`, אחר כך `normalizedName + cityKey`.
   - geocode/verify מיד אחרי כל עיר ולא רק כשפותחים מפה.

3. לתקן `AttractionsView.getMapItems` כך שהמפה תציג בדיוק את הרשימה המסוננת.

### שלב 4 - דף המפה המלא

1. לפני יצירת `raw` map items:
   - לדלג על AI/saved places שלא ב-trip scope.
   - להפריד counters: “כל הנתונים”, “מוצג במפה”, “נפסל מחוץ לטיול”, “לא ממוקם”.

2. לשפר MissingData:
   - להציג מקומות בלי lat/lng גם אם עדיין לא `geocodeFailed`.
   - CTA: “אמת מיקום ב-Google”.
   - deep link אמיתי לדף אוכל/אטרקציות עם place id או search query.

3. לשפר city chips:
   - city list יגיע רק מ-`getTripCities(...excludeFlightOnly)`.
   - לוודא שאין מדינות/layovers ב-city chips.

### שלב 5 - דף ניהול

1. להוסיף לשונית “בריאות נתונים”:
   - AI עובד/לא עובד.
   - Firebase env קיים.
   - מספר מסעדות/אטרקציות בלי lat/lng.
   - מספר תוצאות מחוץ למדינת הטיול.
   - מספר duplicates.
   - ערים שזוהו בטיול.

2. להוסיף פעולות:
   - “נקה נתונים מחוץ לטיול”.
   - “אמת מיקומים מחדש”.
   - “הרץ מחקר חסר לערים”.
   - “ייצא דוח בעיות”.

## בדיקות קבלה מומלצות

1. AI basic:
   - יצירת בקשה קצרה ל-Worker מחזירה JSON תקין.
   - SEARCH intent מחזיר JSON אחרי `cleanJSON`.
   - כאשר מודל ראשון ב-quota, fallback עובר למודל הבא.

2. Google/Places:
   - “Sorn Bangkok” מחזיר placeId וקואורדינטות בבנגקוק.
   - “Pizza Company Pattaya” נפסל כ-chain.
   - מסעדה סגורה לא נכנסת לרשימה.

3. Trip scope:
   - טיול Thailand לא מציג Paris/Banff/Dubai.
   - טיול מרובה מדינות מאפשר מקומות בכל מדינות הטיול.
   - layover flight-only לא הופך לעיר מחקר.

4. מפות:
   - מפת אוכל recommended מציגה בדיוק את הרשימה אחרי city/category/source filters.
   - מפת אטרקציות recommended מציגה בדיוק את הרשימה אחרי filters.
   - Full map מציג hotels + saved + AI רק בערי הטיול.
   - כשל geocoding מופיע ב-MissingData.

5. ניהול:
   - החלפת טיול לא מוחקת/דורסת מחקר קיים.
   - מחיקת טיול מנקה refs ולא משאירה zombie trips.
   - שמירת ערים ותאריכים משתקפת בכל המפות.

## פיצ׳רים חדשים מומלצים

1. Data Health Center בדף הניהול.
2. Google Places verification badge על כל מסעדה/אטרקציה.
3. “Clean out-of-trip data” בלחיצה אחת.
4. “Map confidence score” לכל pin.
5. מצב “תכנון לפי מלון”: הצג רק מסעדות/אטרקציות עד 15/30 דקות הליכה/נסיעה מהמלון.
6. itinerary builder מהמפה: גרירה של pins ליום בטיול.
7. cache מרכזי ל-Place IDs ב-Firestore כדי לא לשלם שוב על אותן תוצאות.
8. תצוגת “ערים שלא נחקרו עדיין” עם כפתור מחקר ממוקד.

## סדר ביצוע מומלץ

1. קודם לתקן trip scope + country inference.
2. אחר כך לתקן Attractions map mismatch.
3. אחר כך להוסיף geocoding/verification גם ל-backgroundResearch.
4. אחר כך להוסיף Google Places resolver.
5. בסוף להוסיף Data Health Center בדף הניהול ובדיקות e2e.

