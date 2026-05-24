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
import { ActivitySquare, MapPin, AlertTriangle, CheckCircle2, RefreshCw, Trash2, Download, Loader2 } from 'lucide-react';
import { getTripCities, displayCityName } from '../../utils/geoData';
import { isPlaceInTripScope, inferTripCountry, placeDedupeKey } from '../../utils/tripScope';
import { verifyPlacesBatch, applyVerificationResult } from '../../utils/placeVerification';
import { photonGeocodeRich } from '../../utils/geocodePlaces';
import { generateWithFallback } from '../../services/aiService';
import { toast } from '../../stores/useToastStore';

interface DataHealthPanelProps {
    trip: Trip | null;
    onUpdateTrip: (t: Trip) => void;
}

interface HealthStat {
    label: string;
    value: string | number;
    tone: 'good' | 'warn' | 'bad' | 'neutral';
    detail?: string;
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
            { label: 'מקומות בטיול', value: total, tone: 'neutral' },
            { label: 'מאומתים', value: verified, tone: verified > 0 ? 'good' : 'neutral' },
            { label: 'לא מאומתים', value: ambiguous, tone: ambiguous > 0 ? 'warn' : 'good', detail: 'מיקום שאינו תואם לעיר/מדינה בוודאות' },
            { label: 'ללא קואורדינטות', value: noCoords, tone: noCoords > 0 ? 'warn' : 'good' },
            { label: 'גיאוקודינג נכשל', value: failed, tone: failed > 0 ? 'bad' : 'good' },
            { label: 'מחוץ לטיול', value: outOfScope, tone: outOfScope > 0 ? 'bad' : 'good' },
            { label: 'כפילויות', value: duplicates, tone: duplicates > 0 ? 'warn' : 'good' },
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

    const reverifyAll = async () => {
        if (!trip) return;
        setReverifying(true);
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

            const verifiable = [
                ...flatAiR.map(r => ({ id: r.id, name: r.name, location: r.location, googleMapsUrl: r.googleMapsUrl, countryHint: r.region || tripCountry, lat: r.lat, lng: r.lng, verifiedAt: r.verifiedAt, verificationStatus: r.verificationStatus })),
                ...flatAiA.map(a => ({ id: a.id, name: a.name, location: a.location, googleMapsUrl: a.googleMapsUrl, countryHint: a.region || tripCountry, lat: a.lat, lng: a.lng, verifiedAt: a.verifiedAt, verificationStatus: a.verificationStatus })),
                ...flatManR.map(r => ({ id: r.id, name: r.name, location: r.location, googleMapsUrl: r.googleMapsUrl, countryHint: r.region || tripCountry, lat: r.lat, lng: r.lng, verifiedAt: r.verifiedAt, verificationStatus: r.verificationStatus })),
                ...flatManA.map(a => ({ id: a.id, name: a.name, location: a.location, googleMapsUrl: a.googleMapsUrl, countryHint: a.region || tripCountry, lat: a.lat, lng: a.lng, verifiedAt: a.verifiedAt, verificationStatus: a.verificationStatus })),
                // Hotels: Photon query is built from name + address. The hotel's
                // own `city` is the strongest country/scope hint we have.
                ...hotels.map(h => ({
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

            await verifyPlacesBatch(verifiable, trip, (id, result) => {
                const r = flatAiR.find(x => x.id === id);
                if (r) { applyVerificationResult(r, result); return; }
                const a = flatAiA.find(x => x.id === id);
                if (a) { applyVerificationResult(a, result); return; }
                const mr = flatManR.find(x => x.id === id);
                if (mr) { applyVerificationResult(mr, result); return; }
                const ma = flatManA.find(x => x.id === id);
                if (ma) { applyVerificationResult(ma, result); return; }
                const h = hotels.find(x => x.id === id);
                if (h) {
                    // applyVerificationResult writes lat/lng/verifiedCity etc.
                    // The hotel type allows these fields already.
                    applyVerificationResult(h as any, result);
                }
            }, { forceRefresh: true });

            onUpdateTrip({
                ...trip,
                aiRestaurants,
                aiAttractions,
                restaurants,
                attractions,
                hotels,
            });
            const total = verifiable.length;
            const verified = [...flatAiR, ...flatAiA, ...flatManR, ...flatManA, ...hotels]
                .filter((x: any) => x.verificationStatus === 'verified').length;
            toast.success(`האימות הושלם — ${verified}/${total} אומתו`);
        } catch (e) {
            console.error(e);
            toast.error('האימות נכשל');
        } finally {
            setReverifying(false);
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats.map(s => (
                        <div key={s.label} className={`p-3 rounded-xl border ${toneClass(s.tone)}`}>
                            <div className="text-xs font-bold opacity-80">{s.label}</div>
                            <div className="text-2xl font-black mt-1">{s.value}</div>
                            {s.detail && <div className="text-[10px] opacity-70 mt-1">{s.detail}</div>}
                        </div>
                    ))}
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
                <h3 className="text-lg font-black text-slate-800 mb-3">פעולות תיקון</h3>

                {/* Inline explanation — what each action actually does. The user
                    can't always tell from the button label whether the click
                    will cost money / call AI / mutate the trip. */}
                <details className="mb-4 bg-slate-50 rounded-lg border border-slate-200">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-700">
                        ⓘ מה כל פעולה עושה?
                    </summary>
                    <div className="px-3 pb-3 text-2xs text-slate-600 leading-relaxed space-y-2">
                        <div>
                            <strong>אמת מחדש את כל המקומות</strong> — עובר על כל מלון / מסעדה / אטרקציה
                            (גם מהרשימה הידנית וגם מהמלצות ה-AI), שולח כל אחד ל-Photon (גאוקודר חינמי של
                            OpenStreetMap) עם רמז על מדינת הטיול, ומעדכן <code>lat</code>, <code>lng</code>,
                            <code>verifiedCity</code>, <code>verifiedCountry</code>. אם פוטון לא מצא את המקום
                            הוא מסומן כ-<code>not_found</code>. <strong>עלות AI: 0 ש״ח.</strong>
                            זמן: ~0.5-1 שניה לפריט, רץ 4 במקביל.
                        </div>
                        <div>
                            <strong>הסר פריטים מחוץ לטיול</strong> — מסנן ומוחק כל פריט שה-Photon החזיר
                            עבורו מיקום מחוץ למדינות הטיול. עוצר את "אטרקציה בתאילנד" מלהופיע במפה של
                            טיול לאיטליה. <strong>בלתי-הפיך</strong> — שמור גיבוי לפני לחיצה.
                        </div>
                        <div>
                            <strong>ייצוא דוח</strong> — מורידה JSON עם סיכום מצב הטיול (כמות פריטים,
                            מצב אימות, מקומות מעורפלים) לבדיקה ידנית. רק קריאה, לא משנה כלום.
                        </div>
                    </div>
                </details>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={reverifyAll}
                        disabled={reverifying}
                        title="עובר על כל מלון/מסעדה/אטרקציה ושולח ל-Photon (גאוקודר חינמי) לאיתור lat/lng. עלות AI: 0 ש״ח. זמן: ~0.5-1ש לפריט."
                        className="flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-sm border border-blue-100"
                    >
                        {reverifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        אמת מחדש את כל המקומות
                    </button>
                    <button
                        onClick={dropOutOfScope}
                        className="flex items-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-sm border border-rose-100"
                    >
                        <Trash2 className="w-4 h-4" />
                        הסר פריטים מחוץ לטיול
                    </button>
                    <button
                        onClick={exportReport}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm border border-slate-200"
                    >
                        <Download className="w-4 h-4" />
                        ייצא דוח JSON
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">
                    כל הפעולות משתמשות אך ורק ב-Photon (OSM) ו-Gemini Worker — אין שימוש ב-API בתשלום.
                </p>
            </div>
        </div>
    );
};
