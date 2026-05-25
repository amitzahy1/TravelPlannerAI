/**
 * Admin "Data Health" panel — surfaces trip-level data quality so the
 * developer (admin) can spot stale / out-of-scope / unverified items
 * without opening every tab.
 *
 * All actions use ONLY free APIs:
 *   - Photon (komoot.io) for re-geocoding / re-verification
 *   - Existing Cloudflare Worker AI Gemini call for status ping
 * No paid API (Google Places, Mapbox, etc.) anywhere.
 */

import React, { useMemo, useState } from 'react';
import { Trip, Restaurant, Attraction } from '../../types';
import { ActivitySquare, MapPin, AlertTriangle, CheckCircle2, Trash2, Download, Loader2 } from 'lucide-react';
import { getTripCities, displayCityName } from '../../utils/geoData';
import { isPlaceInTripScope, inferTripCountry, placeDedupeKey, coordInTripCountries } from '../../utils/tripScope';
import { isPreciseGoogleUrl } from '../../utils/mapsUrl';
import { verifyPlacesBatch, applyVerificationResult } from '../../utils/placeVerification';
import { photonGeocodeRich, getCountryBbox, toEnglishCountryName, extractCoordsFromMapsUrl } from '../../utils/geocodePlaces';
import { generateWithFallback } from '../../services/aiService';
import { toast } from '../../stores/useToastStore';

interface DataHealthPanelProps {
    trip: Trip | null;
    onUpdateTrip: (t: Trip) => void;
}

interface HealthStat {
    /** Stable key so callers can wire click handlers per-card. */
    key: 'total' | 'verified' | 'ambiguous' | 'noCoords' | 'failed' | 'outOfScope' | 'duplicates';
    label: string;
    value: string | number;
    tone: 'good' | 'warn' | 'bad' | 'neutral';
    detail?: string;
    /** Action label shown on hover/inside the card when clickable. */
    action?: string;
}

const toneClass = (tone: HealthStat['tone']) => {
    switch (tone) {
        case 'good': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'warn': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'bad': return 'bg-rose-50 text-rose-700 border-rose-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
};

export const DataHealthPanel: React.FC<DataHealthPanelProps> = ({ trip, onUpdateTrip }) => {
    const [reverifying, setReverifying] = useState(false);
    const [reverifyProgress, setReverifyProgress] = useState({ done: 0, total: 0, verified: 0, notFound: 0 });
    // AI hotel-verify: dedicated flow for "find the real hotel" via the AI
    // chain (SMART intent). Falls back through Gemini → Groq → OpenRouter
    // automatically when Gemini is capped — same as the rest of the app.
    const [aiHotelVerifying, setAiHotelVerifying] = useState(false);
    const [aiHotelProgress, setAiHotelProgress] = useState({ done: 0, total: 0, resolved: 0 });
    const [pingStatus, setPingStatus] = useState<{ ai: 'unknown' | 'ok' | 'fail'; photon: 'unknown' | 'ok' | 'fail' }>({ ai: 'unknown', photon: 'unknown' });
    const [pingingService, setPingingService] = useState<null | 'ai' | 'photon'>(null);

    const allRestaurants = useMemo(() => {
        if (!trip) return [] as Restaurant[];
        return [
            ...(trip.aiRestaurants || []).flatMap(c => c.restaurants || []),
            ...(trip.restaurants || []).flatMap(c => c.restaurants || []),
        ];
    }, [trip]);

    const allAttractions = useMemo(() => {
        if (!trip) return [] as Attraction[];
        return [
            ...(trip.aiAttractions || []).flatMap(c => c.attractions || []),
            ...(trip.attractions || []).flatMap(c => c.attractions || []),
        ];
    }, [trip]);

    const stats: HealthStat[] = useMemo(() => {
        if (!trip) return [];
        const total = allRestaurants.length + allAttractions.length;
        const noCoords = [...allRestaurants, ...allAttractions].filter(p => typeof p.lat !== 'number' || typeof p.lng !== 'number').length;
        const failed = [...allRestaurants, ...allAttractions].filter(p => p.geocodeFailed).length;
        const ambiguous = [...allRestaurants, ...allAttractions].filter(p => p.verificationStatus === 'ambiguous').length;
        const verified = [...allRestaurants, ...allAttractions].filter(p => p.verificationStatus === 'verified').length;
        const outOfScope = [...allRestaurants, ...allAttractions].filter(p => !isPlaceInTripScope(trip, { location: p.location, region: p.region, description: (p as Attraction).description })).length;

        // Duplicate check
        const seen = new Map<string, number>();
        [...allRestaurants, ...allAttractions].forEach(p => {
            const k = placeDedupeKey({ name: p.name, region: p.region, location: p.location }, trip);
            seen.set(k, (seen.get(k) || 0) + 1);
        });
        const duplicates = Array.from(seen.values()).filter(v => v > 1).length;

        return [
            { key: 'total',      label: 'מקומות בטיול', value: total, tone: 'neutral' },
            { key: 'verified',   label: 'מאומתים', value: verified, tone: verified > 0 ? 'good' : 'neutral' },
            { key: 'ambiguous',  label: 'לא מאומתים', value: ambiguous, tone: ambiguous > 0 ? 'warn' : 'good', detail: 'מיקום שאינו תואם לעיר/מדינה בוודאות', action: ambiguous > 0 ? 'אמת מחדש' : undefined },
            { key: 'noCoords',   label: 'ללא קואורדינטות', value: noCoords, tone: noCoords > 0 ? 'warn' : 'good', action: noCoords > 0 ? 'מצא קואורדינטות' : undefined },
            { key: 'failed',     label: 'גיאוקודינג נכשל', value: failed, tone: failed > 0 ? 'bad' : 'good', action: failed > 0 ? 'נסה שוב' : undefined },
            { key: 'outOfScope', label: 'מחוץ לטיול', value: outOfScope, tone: outOfScope > 0 ? 'bad' : 'good', action: outOfScope > 0 ? 'הסר' : undefined },
            { key: 'duplicates', label: 'כפילויות', value: duplicates, tone: duplicates > 0 ? 'warn' : 'good', action: duplicates > 0 ? 'הצג כפילויות' : undefined },
        ];
    }, [trip, allRestaurants, allAttractions]);

    if (!trip) {
        return (
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-500 text-sm">
                בחר טיול כדי לראות את בריאות הנתונים.
            </div>
        );
    }

    const tripCities = getTripCities(trip);
    const country = inferTripCountry(trip);

    const pingAi = async () => {
        setPingingService('ai');
        try {
            const res = await generateWithFallback(null, [{ role: 'user', parts: [{ text: 'reply OK' }] }], { temperature: 0 }, 'FAST');
            setPingStatus(s => ({ ...s, ai: res?.text ? 'ok' : 'fail' }));
        } catch {
            setPingStatus(s => ({ ...s, ai: 'fail' }));
        } finally {
            setPingingService(null);
        }
    };

    const pingPhoton = async () => {
        setPingingService('photon');
        try {
            const res = await photonGeocodeRich('Tel Aviv');
            setPingStatus(s => ({ ...s, photon: res ? 'ok' : 'fail' }));
        } catch {
            setPingStatus(s => ({ ...s, photon: 'fail' }));
        } finally {
            setPingingService(null);
        }
    };

    // Predicate: include this place in the next reverify batch? Default
    // includes everything (full sweep). The scoped buttons pass a
    // predicate that matches only their own subset (no coords / ambiguous
    // / failed) so re-running "ללא קואורדינטות" doesn't waste 267 Photon
    // calls on already-verified items. User explicitly asked for this.
    type ReverifyPredicate = (p: any) => boolean;

    const reverifyAll = async (predicate?: ReverifyPredicate, scopeLabel?: string) => {
        if (!trip) return;
        setReverifying(true);
        setReverifyProgress({ done: 0, total: 0, verified: 0, notFound: 0 });
        console.log(`🔎 [reverify] starting place verification${scopeLabel ? ` (scope: ${scopeLabel})` : ''}…`);
        try {
            // Snapshot working copies — verifyPlacesBatch mutates each item.
            const aiRestaurants = (trip.aiRestaurants || []).map(c => ({ ...c, restaurants: (c.restaurants || []).map(r => ({ ...r })) }));
            const aiAttractions = (trip.aiAttractions || []).map(c => ({ ...c, attractions: (c.attractions || []).map(a => ({ ...a })) }));
            // Manual lists (user-curated, separate from AI research slices).
            const restaurants = (trip.restaurants || []).map(c => ({ ...c, restaurants: (c.restaurants || []).map(r => ({ ...r })) }));
            const attractions = (trip.attractions || []).map(c => ({ ...c, attractions: (c.attractions || []).map(a => ({ ...a })) }));
            // Hotels are at the trip root, not nested in categories.
            const hotels = (trip.hotels || []).map(h => ({ ...h }));

            const flatAiR = aiRestaurants.flatMap(c => c.restaurants);
            const flatAiA = aiAttractions.flatMap(c => c.attractions);
            const flatManR = restaurants.flatMap(c => c.restaurants);
            const flatManA = attractions.flatMap(c => c.attractions);

            // Country hint from the trip — Photon biases its geocoding to this
            // country, so "Vlorë" no longer gets matched to an Israeli town
            // when the trip is in Albania. Falls back to the raw country string
            // from trip.destination when inferTripCountry can't resolve.
            const tripCountry = inferTripCountry(trip) || trip.destination || '';

            // Build the raw verifiable list, then narrow by predicate. The
            // predicate operates on the ORIGINAL place objects (not the
            // mapped descriptors) so its checks see verificationStatus +
            // lat/lng exactly as stored on the trip.
            const matchesScope = (originalPlace: any): boolean => !predicate || predicate(originalPlace);

            const verifiable = [
                ...flatAiR.filter(matchesScope).map(r => ({ id: r.id, name: r.name, location: r.location, googleMapsUrl: r.googleMapsUrl, countryHint: r.region || tripCountry, lat: r.lat, lng: r.lng, verifiedAt: r.verifiedAt, verificationStatus: r.verificationStatus })),
                ...flatAiA.filter(matchesScope).map(a => ({ id: a.id, name: a.name, location: a.location, googleMapsUrl: a.googleMapsUrl, countryHint: a.region || tripCountry, lat: a.lat, lng: a.lng, verifiedAt: a.verifiedAt, verificationStatus: a.verificationStatus })),
                ...flatManR.filter(matchesScope).map(r => ({ id: r.id, name: r.name, location: r.location, googleMapsUrl: r.googleMapsUrl, countryHint: r.region || tripCountry, lat: r.lat, lng: r.lng, verifiedAt: r.verifiedAt, verificationStatus: r.verificationStatus })),
                ...flatManA.filter(matchesScope).map(a => ({ id: a.id, name: a.name, location: a.location, googleMapsUrl: a.googleMapsUrl, countryHint: a.region || tripCountry, lat: a.lat, lng: a.lng, verifiedAt: a.verifiedAt, verificationStatus: a.verificationStatus })),
                // Hotels: Photon query is built from name + address. The hotel's
                // own `city` is the strongest country/scope hint we have.
                ...hotels.filter(matchesScope).map(h => ({
                    id: h.id,
                    name: h.name,
                    location: h.address || '',
                    googleMapsUrl: (h as any).googleMapsUrl as string | undefined,
                    countryHint: h.city || tripCountry,
                    lat: h.lat,
                    lng: h.lng,
                    verifiedAt: (h as any).verifiedAt as number | undefined,
                    verificationStatus: (h as any).verificationStatus as any,
                })),
            ];

            if (verifiable.length === 0) {
                console.log(`🔎 [reverify] nothing matched the scope — bailing.`);
                setReverifying(false);
                toast.info('אין פריטים שמתאימים לפעולה זו');
                return;
            }

            console.log(`🔎 [reverify] ${verifiable.length} items queued (scope: ${scopeLabel || 'all'}). Country hint: "${tripCountry}".`);
            setReverifyProgress({ done: 0, total: verifiable.length, verified: 0, notFound: 0 });

            // Per-result counter — lets the UI show "X/Y done" and the console
            // stream show what got matched / not_found / ambiguous in real time.
            let done = 0;
            let verifiedCount = 0;
            let notFoundCount = 0;
            await verifyPlacesBatch(verifiable, trip, (id, result) => {
                const target = flatAiR.find(x => x.id === id)
                    || flatAiA.find(x => x.id === id)
                    || flatManR.find(x => x.id === id)
                    || flatManA.find(x => x.id === id)
                    || hotels.find(x => x.id === id);
                if (target) applyVerificationResult(target as any, result);
                done++;
                // Field is `verificationStatus`, NOT `status` — the previous
                // logging code read the wrong key and showed every item as "?"
                // with totals "0 verified / 0 not_found / 267 other" even when
                // Photon resolved every single one.
                const status: string = (result as any)?.verificationStatus || 'unknown';
                if (status === 'verified') verifiedCount++;
                else if (status === 'not_found') notFoundCount++;
                const name = (target as any)?.name || id;
                const verifiedCity = (result as any)?.verifiedCity || '';
                console.log(
                    `🔎 [reverify ${done}/${verifiable.length}] ${status.padEnd(10)} ${name}` +
                    (verifiedCity ? ` → ${verifiedCity}` : '')
                );
                setReverifyProgress({ done, total: verifiable.length, verified: verifiedCount, notFound: notFoundCount });
            }, { forceRefresh: true });

            onUpdateTrip({
                ...trip,
                aiRestaurants,
                aiAttractions,
                restaurants,
                attractions,
                hotels,
            });
            console.log(`✅ [reverify] complete — ${verifiedCount} verified, ${notFoundCount} not_found, ` +
                `${verifiable.length - verifiedCount - notFoundCount} other (ambiguous / errored) ` +
                `out of ${verifiable.length} total.`);
            toast.success(`האימות הושלם — ${verifiedCount}/${verifiable.length} אומתו` +
                (notFoundCount > 0 ? ` (${notFoundCount} לא נמצאו)` : ''));
        } catch (e) {
            console.error('❌ [reverify] failed:', e);
            toast.error('האימות נכשל — בדוק את הקונסולה');
        } finally {
            setReverifying(false);
        }
    };

    // AI-driven hotel verifier — asks the LLM for the canonical lat/lng +
    // precise Maps URL for each hotel. User explicitly asked for this in
    // addition to Photon because:
    //   1. Photon only matches addresses (street names), not business names.
    //      A hotel "Bastille" at "Rruga Vaso" geocodes to the street, not
    //      the building. Photon says "verified" but the pin is wrong.
    //   2. The LLM, given a hotel name + city + country, can produce a
    //      precise Google Maps URL with place_id when it has grounded
    //      data — which makes safeMapsUrl trust the URL as-is instead of
    //      falling back to a generic search.
    // Uses SMART intent so it's cheap and the chain falls through Gemini →
    // Groq → OpenRouter automatically when the cap is hit.
    const verifyHotelsWithAi = async () => {
        if (!trip || !trip.hotels?.length) {
            toast.info('אין מלונות בטיול לאימות');
            return;
        }
        setAiHotelVerifying(true);
        const tripCountry = inferTripCountry(trip) || trip.destination || '';
        const hotels = trip.hotels.map(h => ({ ...h }));
        setAiHotelProgress({ done: 0, total: hotels.length, resolved: 0 });
        console.log(`🏨 [ai-verify-hotels] starting on ${hotels.length} hotels (country hint: "${tripCountry}")`);

        // Strip rating stars / "Hotel" qualifier from the searchable name —
        // queries like "Regina City Hotel 4*" confuse both LLMs and Photon
        // since "4*" rarely appears in OSM data.
        const cleanHotelName = (raw: string): string =>
            (raw || '').replace(/\s*\d\s*\*+\s*/g, ' ').replace(/\s+/g, ' ').trim();

        const tripBbox = (() => {
            const en = toEnglishCountryName(tripCountry);
            return en ? getCountryBbox(en) : null;
        })();

        let resolved = 0;
        let done = 0;
        for (const h of hotels) {
            const cleanName = cleanHotelName(h.name || '');

            // STEP 0 — User's stored Google Maps URL is the ground truth.
            // The hotels page lets the user paste the actual booking URL,
            // which often encodes precise coords (!3d!4d / @lat,lng / ?q=).
            // If we can extract coords from it AND they're inside the trip
            // country, we're DONE — no AI call, no Photon round-trip.
            // The user explicitly flagged this: "you have a Google Maps URL
            // for each hotel — it's the real location."
            const urlCoords = extractCoordsFromMapsUrl(h.googleMapsUrl);
            if (urlCoords && coordInTripCountries(urlCoords.lat, urlCoords.lng, trip)) {
                h.lat = urlCoords.lat;
                h.lng = urlCoords.lng;
                (h as any).verifiedAt = Date.now();
                (h as any).verificationStatus = 'verified';
                resolved++;
                done++;
                console.log(`🏨 [ai-verify-hotels ${done}/${hotels.length}] ✓ ${h.name} → (${urlCoords.lat.toFixed(4)}, ${urlCoords.lng.toFixed(4)}) [via stored Maps URL]`);
                setAiHotelProgress({ done, total: hotels.length, resolved });
                continue;
            }
            if (h.googleMapsUrl && !urlCoords) {
                console.info(`🏨 [ai-verify-hotels] ${h.name}: googleMapsUrl exists but no coords extractable (probably a short link). Falling back to AI/Photon.`);
            }

            const prompt = `Find this hotel and return its canonical Google Maps data as JSON.
Hotel: ${cleanName || '(no name)'}
Address: ${h.address || '(no address)'}
City: ${h.city || '(no city)'}
Country: ${tripCountry || '(unknown)'}

Return strict JSON only, no markdown:
{
  "found": true | false,
  "canonicalName": "<the hotel's real name on Google Maps>",
  "canonicalAddress": "<full street address>",
  "city": "<city name only>",
  "lat": <decimal latitude>,
  "lng": <decimal longitude>,
  "googleMapsUrl": "<a real https://www.google.com/maps URL — include place_id or cid when known; OMIT this field if you don't have a precise URL>",
  "confidence": "high" | "medium" | "low"
}

Rules:
- If you can't find a real hotel matching this description, return {"found": false}.
- NEVER fabricate coordinates or URLs. Better to return found:false than guess.
- lat/lng must be in the country "${tripCountry || 'the address country'}".`;

            let resolvedFromAi = false;
            try {
                const response = await generateWithFallback(
                    null,
                    [{ role: 'user', parts: [{ text: prompt }] }],
                    { responseMimeType: 'application/json', temperature: 0.0 },
                    'SMART',
                );
                const text = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
                const parsed = JSON.parse(text || '{}');
                if (parsed.found && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
                    if (!coordInTripCountries(parsed.lat, parsed.lng, trip)) {
                        console.warn(`🏨 [ai-verify-hotels] ${h.name}: AI returned coords outside trip country, rejecting → trying Photon fallback.`);
                    } else {
                        h.lat = parsed.lat;
                        h.lng = parsed.lng;
                        if (parsed.canonicalName) h.name = parsed.canonicalName;
                        if (parsed.canonicalAddress) h.address = parsed.canonicalAddress;
                        if (parsed.city) h.city = parsed.city;
                        // Only overwrite the user's stored URL when the AI's
                        // URL is MORE PRECISE (has place_id/cid/ftid). Never
                        // replace a precise user URL with a generic search URL.
                        if (parsed.googleMapsUrl && typeof parsed.googleMapsUrl === 'string') {
                            const currentUrl = (h as any).googleMapsUrl as string | undefined;
                            const newIsPrecise = isPreciseGoogleUrl(parsed.googleMapsUrl);
                            const currentIsPrecise = isPreciseGoogleUrl(currentUrl);
                            if (newIsPrecise || !currentIsPrecise) {
                                (h as any).googleMapsUrl = parsed.googleMapsUrl;
                            }
                        }
                        (h as any).verifiedAt = Date.now();
                        (h as any).verificationStatus = 'verified';
                        resolved++;
                        resolvedFromAi = true;
                        console.log(`🏨 [ai-verify-hotels ${done + 1}/${hotels.length}] ✓ ${h.name} → (${h.lat?.toFixed(4)}, ${h.lng?.toFixed(4)})${parsed.confidence ? ` [${parsed.confidence}]` : ''} [via AI]`);
                    }
                }
            } catch (e: any) {
                console.error(`🏨 [ai-verify-hotels] ${h.name} AI call failed:`, e?.message || e);
            }

            // Photon fallback — when the AI returns found:false OR errors
            // out. Photon queries OSM (real database) so lesser-known hotels
            // that the free LLM tier (Groq Llama) doesn't recognize from
            // training data still resolve. Critical when Gemini is capped
            // and we're stuck on training-data-only models.
            if (!resolvedFromAi) {
                const queries = [
                    [cleanName, h.city, tripCountry].filter(Boolean).join(', '),
                    [cleanName, h.address].filter(Boolean).join(', '),
                    [cleanName, tripCountry].filter(Boolean).join(', '),
                    cleanName,
                ].filter(Boolean);
                let photonResolved = false;
                for (const q of queries) {
                    try {
                        const feat = await photonGeocodeRich(q, tripBbox || undefined);
                        if (feat && coordInTripCountries(feat.lat, feat.lng, trip)) {
                            h.lat = feat.lat;
                            h.lng = feat.lng;
                            if (feat.city && !h.city) h.city = feat.city;
                            (h as any).verifiedAt = Date.now();
                            (h as any).verificationStatus = 'verified';
                            resolved++;
                            photonResolved = true;
                            console.log(`🏨 [ai-verify-hotels ${done + 1}/${hotels.length}] ✓ ${h.name} → (${h.lat?.toFixed(4)}, ${h.lng?.toFixed(4)}) [via Photon: "${q}"]`);
                            break;
                        }
                    } catch { /* try next query */ }
                }
                if (!photonResolved) {
                    (h as any).verificationStatus = 'not_found';
                    console.log(`🏨 [ai-verify-hotels ${done + 1}/${hotels.length}] ✗ ${h.name} → not found by AI or Photon (tried ${queries.length} queries)`);
                }
            }
            done++;
            setAiHotelProgress({ done, total: hotels.length, resolved });
        }

        onUpdateTrip({ ...trip, hotels });
        setAiHotelVerifying(false);
        console.log(`✅ [ai-verify-hotels] complete — ${resolved}/${hotels.length} resolved`);
        toast.success(`אומתו ${resolved}/${hotels.length} מלונות`);
    };

    // One-click healing — runs the full sequence:
    //   1. Photon re-verify (every item, force refresh)
    //   2. Drop items resolved outside trip country
    //   3. AI-verify hotels (canonical names + place_id URLs)
    // Toasts at the end with a summary. Each step skips itself if it
    // has nothing to act on.
    const [fixingAll, setFixingAll] = useState(false);
    const fixEverything = async () => {
        if (!trip) return;
        setFixingAll(true);
        try {
            console.group('🧰 [fix-all] starting full healing flow');
            await reverifyAll(undefined, 'הכל');
            // Wait a tick so the trip state propagates to the next step.
            await new Promise(r => setTimeout(r, 250));
            if (trip.hotels && trip.hotels.length > 0) {
                await verifyHotelsWithAi();
            }
            console.groupEnd();
            toast.success('פעולת תיקון מלא הסתיימה — ראה קונסולה לפרטים');
        } catch (e) {
            console.error('🧰 [fix-all] aborted:', e);
            toast.error('פעולת התיקון נכשלה — בדוק קונסולה');
        } finally {
            setFixingAll(false);
        }
    };

    // Focused fix per stat card. Each card the user clicks runs the
    // SCOPED action that addresses that specific data-quality issue.
    // Wired below as the onClick of each card. Composes existing
    // helpers — no new verification logic, just better routing.
    const handleStatClick = async (key: HealthStat['key']) => {
        if (!trip) return;
        if (key === 'duplicates') {
            // Auto-merge duplicates. For each group of ≥2 items sharing
            // the same dedupe key, score each by data completeness and
            // keep the best one. User asked 2026-05-25: "instead of just
            // showing the dupes in console, write logic that deletes one
            // and keeps the most accurate."
            //
            // Score components (higher = better):
            //   +3 verified  /  +1 ambiguous  /  -1 not_found
            //   +2 has lat AND lng
            //   +2 has googleMapsUrl
            //   +1 has description
            //   +1 has rating
            //   +1 has imageUrl
            const scorePlace = (p: any): number => {
                let s = 0;
                if (p.verificationStatus === 'verified') s += 3;
                else if (p.verificationStatus === 'ambiguous') s += 1;
                else if (p.verificationStatus === 'not_found') s -= 1;
                if (typeof p.lat === 'number' && typeof p.lng === 'number') s += 2;
                if (typeof p.googleMapsUrl === 'string' && p.googleMapsUrl.trim()) s += 2;
                if (typeof p.description === 'string' && p.description.trim().length > 10) s += 1;
                if (typeof p.googleRating === 'number' && p.googleRating > 0) s += 1;
                if (typeof (p as any).rating === 'number' && (p as any).rating > 0) s += 1;
                if (typeof p.imageUrl === 'string' && p.imageUrl.trim()) s += 1;
                return s;
            };

            const buildGroups = (items: any[]) => {
                const groups = new Map<string, any[]>();
                items.forEach(p => {
                    const k = placeDedupeKey({ name: p.name, region: p.region, location: p.location }, trip);
                    const arr = groups.get(k) || [];
                    arr.push(p);
                    groups.set(k, arr);
                });
                return groups;
            };

            const restaurantGroups = buildGroups(allRestaurants);
            const attractionGroups = buildGroups(allAttractions);

            // Build a set of IDs to DROP (everything except the highest-scoring one per group).
            const dropIds = new Set<string>();
            let dropped = 0;
            console.group('🪞 [dedupe] auto-merging duplicate groups:');
            const reportGroup = (k: string, arr: any[]) => {
                if (arr.length < 2) return;
                const sorted = [...arr].sort((a, b) => scorePlace(b) - scorePlace(a));
                const winner = sorted[0];
                const losers = sorted.slice(1);
                console.log(`  "${k}" — keeping "${winner.name}" (score ${scorePlace(winner)}), dropping: ${losers.map(l => `"${l.name}" (score ${scorePlace(l)})`).join(', ')}`);
                losers.forEach(l => { dropIds.add(l.id); dropped++; });
            };
            restaurantGroups.forEach((arr, k) => reportGroup(k, arr));
            attractionGroups.forEach((arr, k) => reportGroup(k, arr));
            console.groupEnd();

            if (dropIds.size === 0) {
                toast.info('לא נמצאו כפילויות');
                return;
            }

            // Apply: filter the dropped IDs out of every list, drop empty categories.
            const filterCat = <T extends { restaurants?: Restaurant[]; attractions?: Attraction[] }>(c: T): T => ({
                ...c,
                restaurants: c.restaurants?.filter(r => !dropIds.has(r.id)) as any,
                attractions: c.attractions?.filter(a => !dropIds.has(a.id)) as any,
            });
            const updated = {
                ...trip,
                aiRestaurants: (trip.aiRestaurants || []).map(filterCat).filter(c => (c.restaurants?.length || 0) > 0),
                aiAttractions: (trip.aiAttractions || []).map(filterCat).filter(c => (c.attractions?.length || 0) > 0),
                restaurants: (trip.restaurants || []).map(filterCat).filter(c => (c.restaurants?.length || 0) > 0),
                attractions: (trip.attractions || []).map(filterCat).filter(c => (c.attractions?.length || 0) > 0),
            };
            onUpdateTrip(updated);
            console.log(`✅ [dedupe] removed ${dropped} duplicate(s). Kept the highest-scoring entry per group.`);
            toast.success(`נמחקו ${dropped} כפילויות — נשמרה הרשומה המלאה ביותר מכל קבוצה`);
            return;
        }
        if (key === 'outOfScope') {
            dropOutOfScope();
            return;
        }
        // Scoped reverify — each card only re-verifies its OWN subset
        // (not all 267 items). User explicitly asked for this:
        //   "ensure when you click a button it only fixes the number
        //   on the button, not everything again."
        if (key === 'noCoords') {
            await reverifyAll(
                p => typeof p.lat !== 'number' || typeof p.lng !== 'number',
                'ללא קואורדינטות',
            );
            return;
        }
        if (key === 'ambiguous') {
            await reverifyAll(
                p => p.verificationStatus === 'ambiguous',
                'לא מאומתים',
            );
            return;
        }
        if (key === 'failed') {
            await reverifyAll(
                p => p.geocodeFailed === true,
                'גיאוקודינג נכשל',
            );
            return;
        }
    };

    const dropOutOfScope = () => {
        if (!trip) return;
        const filterCat = <T extends { restaurants?: Restaurant[]; attractions?: Attraction[] }>(c: T): T => ({
            ...c,
            restaurants: c.restaurants?.filter(r => isPlaceInTripScope(trip, { location: r.location, region: r.region })) as any,
            attractions: c.attractions?.filter(a => isPlaceInTripScope(trip, { location: a.location, region: a.region, description: a.description })) as any,
        });
        const updated = {
            ...trip,
            aiRestaurants: (trip.aiRestaurants || []).map(filterCat).filter(c => (c.restaurants?.length || 0) > 0),
            aiAttractions: (trip.aiAttractions || []).map(filterCat).filter(c => (c.attractions?.length || 0) > 0),
            restaurants: (trip.restaurants || []).map(filterCat).filter(c => (c.restaurants?.length || 0) > 0),
            attractions: (trip.attractions || []).map(filterCat).filter(c => (c.attractions?.length || 0) > 0),
        };
        onUpdateTrip(updated);
        toast.success('פריטים מחוץ לטיול הוסרו');
    };

    // Combined "junk" detection. An item is junk when ANY of these holds:
    //   1. Photon flagged it not_found  → place doesn't exist
    //   2. Google Places flagged it     → enrichment couldn't match
    //   3. Coords are outside the trip country (defensive against
    //      Photon "verifying" a wrong-country same-named place — e.g.
    //      a generic restaurant name matched in Indonesia for an
    //      Albania trip; verificationStatus='verified' but coords are
    //      wrong-country)
    //   4. No googleMapsUrl AND no lat/lng → no way to ever open it
    //      on Maps; the AI made up a name with no real place behind it
    // The user reported per-category refresh dumps adding "lots of junk
    // with no real location" — none of the older signals caught these
    // because Photon happily verified each generic name to whatever
    // first hit it returned, even when far from the destination.
    // Reason taxonomy. An item is junk when one of these REAL failure
    // signals holds. Earlier version also flagged "no precise URL" but
    // that was over-aggressive — AI-generated items rarely come with
    // place_id/cid URLs because the model doesn't have Google Places
    // API access, so the flag caught 250+ legit Photon-verified items
    // and presented them all as "junk to delete." User correctly
    // pointed out "this sounds like a serious mistake" — agreed.
    //
    // Current criteria (strict — only flag what's actually broken):
    //   1. Photon explicitly said not_found
    //   2. Google Places explicitly flagged it
    //   3. Has coords but they're outside the trip country (wrong place)
    //   4. NO coords AND no URL — completely unaddressable
    const junkReason = (p: any): string | null => {
        if (p.verificationStatus === 'not_found') return 'לא נמצא';
        if (p.googleNotFound === true) return 'Google לא מצא';
        if (typeof p.lat === 'number' && typeof p.lng === 'number' && trip && !coordInTripCountries(p.lat, p.lng, trip)) return 'מחוץ למדינה';
        const hasCoords = typeof p.lat === 'number' && typeof p.lng === 'number';
        const url = typeof p.googleMapsUrl === 'string' && p.googleMapsUrl.trim().length > 0;
        if (!hasCoords && !url) return 'ללא קישור וללא קואורדינטות';
        return null;
    };
    const junkItems = useMemo(() => {
        const isJunk = (p: any) => junkReason(p) !== null;
        return {
            restaurants: allRestaurants.filter(isJunk),
            attractions: allAttractions.filter(isJunk),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allRestaurants, allAttractions, trip]);
    const junkTotal = junkItems.restaurants.length + junkItems.attractions.length;

    const dropNotFound = () => {
        if (!trip) return;
        const isJunk = (p: any) => junkReason(p) !== null;

        // Pre-delete diagnostic: list everything that's about to go so the
        // user can see in the console exactly what happened. User reported
        // "I clicked delete but nothing showed in the console" — fixed.
        const beforeCount = {
            aiR: (trip.aiRestaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0),
            aiA: (trip.aiAttractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0),
            mR: (trip.restaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0),
            mA: (trip.attractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0),
        };
        console.log(`🗑️ [dropJunk] starting — ${junkTotal} junk items to remove.`);
        console.log(`🗑️ [dropJunk] BEFORE: ${beforeCount.aiR} AI restaurants, ${beforeCount.aiA} AI attractions, ` +
            `${beforeCount.mR} saved restaurants, ${beforeCount.mA} saved attractions`);
        junkItems.restaurants.forEach((r: any) => {
            console.log(`🗑️ [dropJunk] - ${r.name} (${junkReason(r)})`);
        });
        junkItems.attractions.forEach((a: any) => {
            console.log(`🗑️ [dropJunk] - ${a.name} (${junkReason(a)})`);
        });

        const filterCat = <T extends { restaurants?: Restaurant[]; attractions?: Attraction[] }>(c: T): T => ({
            ...c,
            restaurants: c.restaurants?.filter(r => !isJunk(r)) as any,
            attractions: c.attractions?.filter(a => !isJunk(a)) as any,
        });
        const updated = {
            ...trip,
            aiRestaurants: (trip.aiRestaurants || []).map(filterCat).filter(c => (c.restaurants?.length || 0) > 0),
            aiAttractions: (trip.aiAttractions || []).map(filterCat).filter(c => (c.attractions?.length || 0) > 0),
            restaurants: (trip.restaurants || []).map(filterCat).filter(c => (c.restaurants?.length || 0) > 0),
            attractions: (trip.attractions || []).map(filterCat).filter(c => (c.attractions?.length || 0) > 0),
        };
        onUpdateTrip(updated);

        const afterCount = {
            aiR: (updated.aiRestaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0),
            aiA: (updated.aiAttractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0),
            mR: (updated.restaurants || []).reduce((s, c) => s + (c.restaurants?.length || 0), 0),
            mA: (updated.attractions || []).reduce((s, c) => s + (c.attractions?.length || 0), 0),
        };
        const totalRemoved = (beforeCount.aiR - afterCount.aiR) + (beforeCount.aiA - afterCount.aiA)
            + (beforeCount.mR - afterCount.mR) + (beforeCount.mA - afterCount.mA);
        console.log(`🗑️ [dropJunk] AFTER: ${afterCount.aiR} AI restaurants, ${afterCount.aiA} AI attractions, ` +
            `${afterCount.mR} saved restaurants, ${afterCount.mA} saved attractions`);
        console.log(`✅ [dropJunk] removed ${totalRemoved} items total. ` +
            `Reload the food/attractions tabs to see the trimmed list.`);
        toast.success(`נמחקו ${totalRemoved} מקומות זבל (פרטים בקונסולה)`);
    };

    // Per-item delete — strips one specific place from wherever it lives
    // (ai / manual, restaurants / attractions). The user reviews the preview
    // list and clicks ✕ on any single row to surgically remove it without
    // running the bulk delete.
    const dropOne = (id: string, kind: 'restaurant' | 'attraction') => {
        if (!trip) return;
        const filterById = <T extends { restaurants?: Restaurant[]; attractions?: Attraction[] }>(c: T): T => ({
            ...c,
            restaurants: kind === 'restaurant'
                ? c.restaurants?.filter(r => r.id !== id) as any
                : c.restaurants,
            attractions: kind === 'attraction'
                ? c.attractions?.filter(a => a.id !== id) as any
                : c.attractions,
        });
        const updated = {
            ...trip,
            aiRestaurants: (trip.aiRestaurants || []).map(filterById).filter(c => (c.restaurants?.length || 0) > 0),
            aiAttractions: (trip.aiAttractions || []).map(filterById).filter(c => (c.attractions?.length || 0) > 0),
            restaurants: (trip.restaurants || []).map(filterById).filter(c => (c.restaurants?.length || 0) > 0),
            attractions: (trip.attractions || []).map(filterById).filter(c => (c.attractions?.length || 0) > 0),
        };
        onUpdateTrip(updated);
    };

    const exportReport = () => {
        if (!trip) return;
        const report = {
            tripId: trip.id,
            tripName: trip.name,
            destination: trip.destination,
            inferredCountry: country,
            cities: tripCities,
            stats: stats.map(s => ({ label: s.label, value: s.value, tone: s.tone })),
            ambiguous: [...allRestaurants, ...allAttractions]
                .filter(p => p.verificationStatus === 'ambiguous')
                .map(p => ({ name: p.name, location: p.location, region: p.region, verifiedCity: p.verifiedCity, verifiedCountry: p.verifiedCountry })),
            geocodeFailed: [...allRestaurants, ...allAttractions]
                .filter(p => p.geocodeFailed)
                .map(p => ({ name: p.name, location: p.location, region: p.region })),
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-health-${trip.id}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><ActivitySquare className="w-4 h-4" /></span>
                        <h3 className="text-lg font-black text-slate-800">בריאות נתונים</h3>
                    </div>
                    <div className="text-xs text-slate-500">
                        מדינה זוהתה: <span className="font-bold text-slate-700">{country || 'לא ידוע'}</span>
                    </div>
                </div>

                {/* One-click healing — runs Photon reverify + AI hotel
                    verify back-to-back. The most impatient user can hit
                    this and walk away. */}
                <button
                    type="button"
                    onClick={fixEverything}
                    disabled={fixingAll || reverifying || aiHotelVerifying}
                    className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-wait transition-all"
                >
                    {fixingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base">✨</span>}
                    {fixingAll ? 'מתקן הכל…' : 'פתור את הכל (אימות + מלונות)'}
                </button>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats.map(s => {
                        // A card is clickable when it has an `action` (only
                        // shows when value > 0 and there's something to fix).
                        const clickable = !!s.action && (typeof s.value === 'number' ? s.value > 0 : true);
                        const baseClasses = `p-3 rounded-xl border text-right transition-all ${toneClass(s.tone)}`;
                        const clickableClasses = clickable
                            ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                            : '';
                        const content = (
                            <>
                                <div className="text-xs font-bold opacity-80">{s.label}</div>
                                <div className="text-2xl font-black mt-1">{s.value}</div>
                                {s.detail && <div className="text-[10px] opacity-70 mt-1">{s.detail}</div>}
                                {clickable && (
                                    <div className="text-[10px] font-bold mt-2 opacity-90 underline">
                                        ← {s.action}
                                    </div>
                                )}
                            </>
                        );
                        if (clickable) {
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => handleStatClick(s.key)}
                                    disabled={reverifying}
                                    className={`${baseClasses} ${clickableClasses} disabled:opacity-60 disabled:cursor-wait`}
                                    title={s.action}
                                >
                                    {content}
                                </button>
                            );
                        }
                        return (
                            <div key={s.key} className={baseClasses}>
                                {content}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-black text-slate-800 mb-3">בדיקת שירותים</h3>

                <details className="mb-4 bg-slate-50 rounded-lg border border-slate-200">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-700">
                        ⓘ מה כל בדיקה עושה?
                    </summary>
                    <div className="px-3 pb-3 text-2xs text-slate-600 leading-relaxed space-y-2">
                        <div>
                            <strong>AI Worker (Gemini)</strong> — שולח בקשת FAST קצרה (~1 טוקן) דרך
                            כל שרשרת ה-fallback (Gemini → Groq → OpenRouter). מאשר שהפרוקסי שלנו
                            ב-Cloudflare זמין, שאחד מהמפתחות מצליח, ושהמודל הראשון בשרשרת מחזיר
                            תוצאה. <strong>עלות:</strong> ~$0.000001 (כמה אגורות-שבר) או חינם
                            אם נופל ל-Groq. <strong>למה זה שונה מ-"בדוק עכשיו" של Model Health?</strong>
                            הבדיקה הזאת מאשרת שהשרשרת השלמה פועלת end-to-end (Worker + key + chain +
                            parsing); הבדיקה השנייה מודדת כל מודל בנפרד.
                        </div>
                        <div>
                            <strong>Photon (OSM)</strong> — שולח שאילתת גיאוקודינג קטנה (לדוגמה
                            "Tel Aviv") ל-photon.komoot.io ומאשר שהוא מחזיר קואורדינטות.
                            זה השירות שבו אנחנו משתמשים ב-"אמת מחדש את כל המקומות" למעלה — אם
                            הוא נכשל, הסעיף הזה לא יעבוד. <strong>עלות:</strong> 0 ש"ח, חינמי
                            ובלי מגבלת כמות סבירה.
                        </div>
                    </div>
                </details>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                        <div>
                            <div className="font-bold text-slate-700">AI Worker (Gemini)</div>
                            <div className="text-xs text-slate-500">FAST intent ping (~0 ש"ח)</div>
                        </div>
                        <button
                            onClick={pingAi}
                            disabled={pingingService === 'ai'}
                            title="שולח בקשת ping דרך כל שרשרת ה-AI (Gemini → Groq → OpenRouter). מאשר שהפרוקסי + מפתח + מודל הראשון בשרשרת פועלים end-to-end."
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${pingStatus.ai === 'ok' ? 'bg-emerald-50 text-emerald-700' : pingStatus.ai === 'fail' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}
                        >
                            {pingingService === 'ai' ? <Loader2 className="w-3 h-3 animate-spin" /> : pingStatus.ai === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : pingStatus.ai === 'fail' ? <AlertTriangle className="w-3 h-3" /> : null}
                            {pingStatus.ai === 'ok' ? 'תקין' : pingStatus.ai === 'fail' ? 'נכשל' : 'בדוק'}
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                        <div>
                            <div className="font-bold text-slate-700">Photon (OSM)</div>
                            <div className="text-xs text-slate-500">גיאוקודר חינמי</div>
                        </div>
                        <button
                            onClick={pingPhoton}
                            disabled={pingingService === 'photon'}
                            title="גיאוקודר חינמי (photon.komoot.io) שמשמש את 'אמת מחדש את כל המקומות'. בדיקה כאן שולחת שאילתת test קטנה ומוודאת שהשירות חי."
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${pingStatus.photon === 'ok' ? 'bg-emerald-50 text-emerald-700' : pingStatus.photon === 'fail' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}
                        >
                            {pingingService === 'photon' ? <Loader2 className="w-3 h-3 animate-spin" /> : pingStatus.photon === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : pingStatus.photon === 'fail' ? <AlertTriangle className="w-3 h-3" /> : null}
                            {pingStatus.photon === 'ok' ? 'תקין' : pingStatus.photon === 'fail' ? 'נכשל' : 'בדוק'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-black text-slate-800 mb-3">ערים זוהו לטיול</h3>
                <div className="flex flex-wrap gap-2">
                    {tripCities.length === 0 && <span className="text-xs text-slate-500">לא זוהו ערים — בדוק יעד / מלונות</span>}
                    {tripCities.map(c => (
                        <span key={c} className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {displayCityName(c, 'he')}
                        </span>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-black text-slate-800 mb-3">ניקוי וגיבוי</h3>

                {/* Slim action row — only the buttons that aren't already
                    exposed via the stat cards above:
                      • "פתור הכל"          → top of stats card
                      • אמת מחדש (Photon)   → top of stats card (פתור הכל)
                      • אמת מלונות (AI)     → top of stats card (פתור הכל)
                      • לא מאומתים          → stat card click
                      • ללא קואורדינטות     → stat card click
                      • גיאוקודינג נכשל     → stat card click
                      • מחוץ לטיול          → stat card click
                      • כפילויות            → stat card click
                    What remains here: the bulk delete-junk action (unique)
                    and the JSON export (debug). */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={dropNotFound}
                        disabled={junkTotal === 0}
                        title="מוחק את כל המסעדות והאטרקציות שלא ניתן לפתוח במפות. מקור הזיהוי: Photon לא מצא, או Google לא מצא, או הקואורדינטות מחוץ למדינת הטיול, או שאין קישור Google Maps וגם אין קואורדינטות."
                        className="flex items-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-sm border border-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                        {junkTotal > 0
                            ? `מחק ${junkTotal} מקומות זבל`
                            : 'אין מקומות זבל'}
                    </button>
                    <button
                        onClick={exportReport}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm border border-slate-200"
                    >
                        <Download className="w-4 h-4" />
                        ייצא דוח JSON
                    </button>
                </div>

                {/* Preview list — shows WHY each item is flagged + a per-item
                    ✕ button so the user can audit and surgically delete one
                    place at a time instead of running the bulk button. */}
                {junkTotal > 0 && (() => {
                    const Row = ({ p, kind }: { p: any; kind: 'restaurant' | 'attraction' }) => (
                        <div className="text-[11px] text-slate-700 py-0.5 flex items-center gap-2 group">
                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold whitespace-nowrap">{junkReason(p) || '—'}</span>
                            <span className="flex-1 min-w-0 truncate">
                                {p.name}
                                {p.location && <span className="text-slate-400"> — {p.location}</span>}
                            </span>
                            <button
                                onClick={() => dropOne(p.id, kind)}
                                title="מחק רק את הפריט הזה"
                                className="opacity-40 hover:opacity-100 text-rose-600 hover:bg-rose-100 rounded px-1.5 py-0.5 text-[10px] font-bold transition-all"
                            >
                                ✕
                            </button>
                        </div>
                    );
                    return (
                        <details className="mt-3 bg-rose-50/50 border border-rose-100 rounded-lg">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-rose-700">
                                ראה ובדוק את {junkTotal} המקומות (מחיקה פרטנית או באצווה)
                            </summary>
                            <div className="px-3 pb-3 max-h-72 overflow-y-auto">
                                {junkItems.restaurants.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-2 mb-1">
                                            מסעדות ({junkItems.restaurants.length})
                                        </div>
                                        {junkItems.restaurants.map((r: any) => <Row key={r.id} p={r} kind="restaurant" />)}
                                    </div>
                                )}
                                {junkItems.attractions.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-2 mb-1">
                                            אטרקציות ({junkItems.attractions.length})
                                        </div>
                                        {junkItems.attractions.map((a: any) => <Row key={a.id} p={a} kind="attraction" />)}
                                    </div>
                                )}
                            </div>
                        </details>
                    );
                })()}

                <p className="text-[10px] text-slate-400 mt-3">
                    כל הפעולות משתמשות אך ורק ב-Photon (OSM) ו-Gemini Worker — אין שימוש ב-API בתשלום.
                </p>
            </div>
        </div>
    );
};
