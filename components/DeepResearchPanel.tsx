import React, { useState, useMemo } from 'react';
import { Trip } from '../types';
import { Sparkles, Copy, Check, Loader2, Upload, Search, ArrowDownToLine, FileText, UtensilsCrossed, Landmark, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import { buildDeepRestaurantPrompt, buildDeepAttractionPrompt, getDeepResearchCities } from '../services/deepResearchPrompts';
import { parseDeepResearchText } from '../services/aiService';
import { mergeDeepResearchData, MergeStats } from '../services/deepResearchMerge';
import { toast } from '../stores/useToastStore';

interface DeepResearchPanelProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
}

type Tab = 'generate' | 'import';
type PromptKind = 'restaurants' | 'attractions';
const ALL_CITIES = '__all__';

export const DeepResearchPanel: React.FC<DeepResearchPanelProps> = ({ trip, onUpdateTrip }) => {
  const [tab, setTab] = useState<Tab>('generate');
  const [activePrompt, setActivePrompt] = useState<PromptKind>('restaurants');
  const [cityFilter, setCityFilter] = useState<string>(ALL_CITIES);
  const [copiedKind, setCopiedKind] = useState<PromptKind | null>(null);
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [preview, setPreview] = useState<{ trip: Trip; stats: MergeStats } | null>(null);

  const cities = useMemo(() => getDeepResearchCities(trip), [trip]);
  const promptOpts = cityFilter !== ALL_CITIES ? { city: cityFilter } : undefined;
  const [showWipeConfirm, setShowWipeConfirm] = useState<null | 'ai-only' | 'all'>(null);

  const counts = useMemo(() => {
    const restManual = (trip.restaurants || []).reduce((s, c) => s + c.restaurants.length, 0);
    const restAi = (trip.aiRestaurants || []).reduce((s, c) => s + c.restaurants.length, 0);
    const attrManual = (trip.attractions || []).reduce((s, c) => s + c.attractions.length, 0);
    const attrAi = (trip.aiAttractions || []).reduce((s, c) => s + c.attractions.length, 0);
    return { restManual, restAi, attrManual, attrAi };
  }, [trip]);

  const handleWipe = (scope: 'ai-only' | 'all') => {
    const updated: Trip = {
      ...trip,
      aiRestaurants: [],
      aiAttractions: [],
      ...(scope === 'all' ? { restaurants: [], attractions: [] } : {}),
    };
    onUpdateTrip(updated);
    setShowWipeConfirm(null);
    toast.success(scope === 'all' ? 'נמחקו כל המסעדות והאטרקציות.' : 'נמחקו תוצאות מחקר ה-AI בלבד. הרשימות הידניות נשמרו.');
  };

  const restaurantPrompt = useMemo(() => buildDeepRestaurantPrompt(trip, promptOpts), [trip, cityFilter]);
  const attractionPrompt = useMemo(() => buildDeepAttractionPrompt(trip, promptOpts), [trip, cityFilter]);
  const visiblePrompt = activePrompt === 'restaurants' ? restaurantPrompt : attractionPrompt;

  const handleCopy = async (kind: PromptKind) => {
    const text = kind === 'restaurants' ? restaurantPrompt : attractionPrompt;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKind(kind);
      toast.success(`פרומפט ל${kind === 'restaurants' ? 'מסעדות' : 'אטרקציות'} הועתק. הדבק אותו במחקר מעמיק והמתן לתוצאות.`);
      setTimeout(() => setCopiedKind(null), 2500);
    } catch {
      toast.error('העתקה נכשלה — בחר ידנית מהשדה והעתק.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    toast.success(`נטען קובץ: ${file.name}`);
  };

  const handlePreview = async () => {
    if (!rawText.trim() || rawText.trim().length < 50) {
      toast.error('הדבק טקסט מלא של תוצאות המחקר (לפחות 50 תווים).');
      return;
    }
    setIsParsing(true);
    setPreview(null);
    try {
      const parsed = await parseDeepResearchText(rawText);
      const merged = mergeDeepResearchData(trip, parsed);
      setPreview(merged);
      const { stats } = merged;
      const totalChanges = stats.newRestaurants + stats.enrichedRestaurants + stats.newAttractions + stats.enrichedAttractions;
      if (totalChanges === 0) {
        toast.info('לא נמצאו שינויים חדשים — כל הנתונים כבר קיימים אצלך.');
      } else {
        toast.success(`התוצאה מוכנה לתצוגה מקדימה — ${totalChanges} שינויים.`);
      }
    } catch (err: any) {
      console.error('[DeepResearch] parse failed', err);
      toast.error(`נכשל בניתוח: ${err?.message?.slice(0, 120) || 'שגיאה לא ידועה'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;
    onUpdateTrip(preview.trip);
    const { stats } = preview;
    toast.success(`יובאו: ${stats.newRestaurants} מסעדות חדשות, ${stats.enrichedRestaurants} הועשרו, ${stats.newAttractions} אטרקציות חדשות, ${stats.enrichedAttractions} הועשרו.`);
    setRawText('');
    setPreview(null);
    setTab('generate');
  };

  const enrichedFieldsList = preview ? Object.entries(preview.stats.enrichedFields) : [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-7">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-lg">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">מחקר מעמיק חיצוני</h3>
            <p className="text-emerald-50 text-sm mt-1">צור פרומפט מותאם, הרץ במחקר מעמיק (ChatGPT / Gemini / Claude) וייבא את התוצאות לטיול</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 flex">
        <button
          onClick={() => setTab('generate')}
          className={`flex-1 py-3 px-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${tab === 'generate' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Sparkles className="w-4 h-4" />
          1. ייצור פרומפט
        </button>
        <button
          onClick={() => setTab('import')}
          className={`flex-1 py-3 px-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${tab === 'import' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          2. ייבוא תוצאות
        </button>
      </div>

      {tab === 'generate' && (
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
            <p className="font-bold text-emerald-800 mb-1">איך זה עובד</p>
            <ol className="list-decimal pr-5 space-y-1 text-xs">
              <li>בחר באיזה תחום אתה רוצה להתעמק — מסעדות או אטרקציות. אפשר להריץ את שניהם במקביל בשני טאבים.</li>
              <li>לחץ "העתק פרומפט" — הפרומפט נבנה מהמלונות, הערים, הקטגוריות והרכב הנוסעים בטיול שלך.</li>
              <li>הדבק אותו ב-ChatGPT Deep Research / Gemini Advanced / Claude עם גישה לאינטרנט.</li>
              <li>המתן 5–20 דקות עד שהמחקר מסיים.</li>
              <li>חזור לכאן ללשונית "ייבוא תוצאות" והדבק את הטקסט שקיבלת (אפשר ייבוא של אחד או שניהם).</li>
            </ol>
          </div>

          {/* Pick which prompt to view/copy */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActivePrompt('restaurants')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${activePrompt === 'restaurants' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}
            >
              <UtensilsCrossed className="w-4 h-4" /> מסעדות
            </button>
            <button
              onClick={() => setActivePrompt('attractions')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${activePrompt === 'attractions' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}
            >
              <Landmark className="w-4 h-4" /> אטרקציות
            </button>
          </div>

          {/* City scope — Deep Research returns ~10 entries per category when
              focused on one city; producing 30+ entries per category × 3 cities
              in a single run usually fails the model's output budget. */}
          {cities.length > 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <MapPin className="w-4 h-4" /> מיקוד לפי עיר
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                לקבלת לפחות 10 מסעדות / 8 אטרקציות לכל קטגוריה, רוץ את המחקר <strong>פעם נפרדת לכל עיר</strong>. הפרומפט מגדיר את העיר הספציפית ואת המלון בה, וכך המודל מתמקד ולא מפזר.
              </p>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-md px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-amber-500"
                dir="ltr"
              >
                <option value={ALL_CITIES}>All cities (single run, lower volume)</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}  (focused — recommended)</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3" dir="ltr">
            <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words max-h-72 overflow-y-auto font-mono leading-relaxed">{visiblePrompt}</pre>
          </div>

          <button
            onClick={() => handleCopy(activePrompt)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {copiedKind === activePrompt ? (
              <><Check className="w-4 h-4" /> הועתק!</>
            ) : (
              <><Copy className="w-4 h-4" /> העתק פרומפט {activePrompt === 'restaurants' ? 'למסעדות' : 'לאטרקציות'}</>
            )}
          </button>

          {/* Danger zone — wipe restaurants / attractions to start fresh */}
          {(counts.restManual + counts.restAi + counts.attrManual + counts.attrAi) > 0 && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <Trash2 className="w-4 h-4" /> איפוס נתונים
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                מחק את הנתונים הקיימים לפני הרצה מחדש. הפעולה לא ניתנת לביטול — מומלץ לוודא שיש לך גיבוי או שהנתונים אכן לא רצויים.
              </p>
              <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 bg-white rounded p-2 border border-red-100">
                <div>מסעדות (רשימה ידנית): <strong>{counts.restManual}</strong></div>
                <div>מסעדות (מחקר AI): <strong>{counts.restAi}</strong></div>
                <div>אטרקציות (רשימה ידנית): <strong>{counts.attrManual}</strong></div>
                <div>אטרקציות (מחקר AI): <strong>{counts.attrAi}</strong></div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWipeConfirm('ai-only')}
                  disabled={counts.restAi + counts.attrAi === 0}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-md text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> מחק רק תוצאות AI
                </button>
                <button
                  onClick={() => setShowWipeConfirm('all')}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> מחק הכל (גם ידני)
                </button>
              </div>
            </div>
          )}

          {showWipeConfirm && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-black text-lg">לאשר מחיקה?</h3>
                </div>
                {showWipeConfirm === 'all' ? (
                  <p className="text-sm text-slate-700 leading-relaxed">
                    פעולה זו תמחק <strong>את כל {counts.restManual + counts.restAi} המסעדות</strong> ו-<strong>{counts.attrManual + counts.attrAi} האטרקציות</strong> מהטיול — גם הידניות וגם של מחקר ה-AI. הפעולה לא ניתנת לביטול.
                  </p>
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed">
                    פעולה זו תמחק <strong>{counts.restAi} מסעדות</strong> ו-<strong>{counts.attrAi} אטרקציות</strong> מתוצאות מחקר ה-AI. הרשימות הידניות (אם יש) יישמרו.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowWipeConfirm(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-bold text-slate-700"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => handleWipe(showWipeConfirm)}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold"
                  >
                    כן, מחק
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'import' && (
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-slate-700">
            <p className="font-bold text-blue-800 mb-1">חשוב</p>
            <p>הייבוא <strong>מעשיר</strong> את הנתונים הקיימים — הוא לעולם לא ימחק או ידרוס מסעדות / אטרקציות שכבר יש לך, ולא ישנה הערות, מועדפים, תאריכי הזמנה או נתוני אימות.</p>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                <Upload className="w-4 h-4" />
                העלה קובץ .txt / .md / .json
              </div>
              <input
                type="file"
                accept=".txt,.md,.json,text/plain,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="הדבק כאן את כל הטקסט / JSON שקיבלת מהמחקר המעמיק..."
            className="w-full h-64 p-4 bg-slate-50 rounded-lg border border-slate-200 focus:border-emerald-400 outline-none resize-none text-sm font-mono"
            dir="ltr"
          />

          <button
            onClick={handlePreview}
            disabled={!rawText.trim() || isParsing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {isParsing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> מנתח טקסט (מודל זול ~₪0.01)...</>
            ) : (
              <><FileText className="w-4 h-4" /> נתח והצג תצוגה מקדימה</>
            )}
          </button>

          {preview && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> תצוגה מקדימה
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-3 border border-emerald-100">
                  <div className="font-bold text-slate-700 mb-2">מסעדות</div>
                  <div className="space-y-1">
                    <div>חדשות: <strong className="text-emerald-700">{preview.stats.newRestaurants}</strong></div>
                    <div>הועשרו: <strong className="text-blue-700">{preview.stats.enrichedRestaurants}</strong></div>
                    <div className="text-slate-400">דולגו: {preview.stats.skippedRestaurants}</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-emerald-100">
                  <div className="font-bold text-slate-700 mb-2">אטרקציות</div>
                  <div className="space-y-1">
                    <div>חדשות: <strong className="text-emerald-700">{preview.stats.newAttractions}</strong></div>
                    <div>הועשרו: <strong className="text-blue-700">{preview.stats.enrichedAttractions}</strong></div>
                    <div className="text-slate-400">דולגו: {preview.stats.skippedAttractions}</div>
                  </div>
                </div>
              </div>

              {enrichedFieldsList.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-emerald-100 text-xs">
                  <div className="font-bold text-slate-700 mb-1">שדות שיתמלאו במסעדות / אטרקציות קיימות</div>
                  <div className="text-slate-500 leading-relaxed">
                    {enrichedFieldsList.map(([f, n]) => `${f} (${n})`).join(' · ')}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> אשר וייבא
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="px-4 py-2.5 bg-white text-slate-500 rounded-lg font-bold text-sm border border-slate-200"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
