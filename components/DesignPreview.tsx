/**
 * DesignPreview — Round 11: final picks locked.
 *
 * Each surface is now LOCKED with the user's chosen variant. The page
 * shows each pick rendered at multiple viewport widths so the user can
 * confirm how the design adapts before we migrate to production.
 *
 * Final picks:
 *   banner    → fixed (no change)
 *   itinerary → A (gradient banner header, auto-fit responsive grid)
 *   hotels    → B (nights as giant numeral hero)
 *   flights   → A (PNR + duration stacked — swapped from B after UX research)
 *   places    → B (vertical photo + add-to-trip + navigate buttons)
 *   admin     → C (4 mega-tiles with amber alert badges — red reserved for danger)
 *   logo      → D (subtle idle bob animation)
 */

import React, { useMemo, useState } from 'react';
import { isAdmin } from '../utils/isAdmin';
import { useAuth } from '../contexts/AuthContext';
import { Lock, ArrowLeft, Smartphone, Monitor, Tv, Check } from 'lucide-react';

import { ITINERARY_VARIANTS } from './design-preview/itinerary-variants';
import { HOTEL_VARIANTS } from './design-preview/hotel-variants';
import { FLIGHT_VARIANTS } from './design-preview/flight-variants';
import { PLACE_VARIANTS } from './design-preview/place-variants';
import { ADMIN_VARIANTS } from './design-preview/admin-variants';
import { LOGO_VARIANTS } from './design-preview/logo-variants';
import { ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './design-preview/fixtures';

type SurfaceId = 'banner' | 'itinerary' | 'hotels' | 'flights' | 'places' | 'admin' | 'logo';

interface Surface {
  id: SurfaceId;
  label: string;
  description: string;
  finalPickId: string | null; // null = fixed/no-change (banner)
  variants: any[];
  showWide?: boolean; // show an extra wide-desktop frame (for itinerary's responsive behavior)
  note?: string;       // extra explanation text under the surface header
}

const SURFACES: Surface[] = [
  {
    id: 'banner',
    label: 'ראש דף הבית',
    description: 'נשמר כפי שהוא — אתה אוהב את העיצוב הקיים',
    finalPickId: null,
    variants: [],
  },
  {
    id: 'itinerary',
    label: 'יומן יומי',
    description: 'A — באנר גרדיאנט עם צבעי-עיר חדשים',
    finalPickId: 'A',
    variants: ITINERARY_VARIANTS,
    showWide: true,
    note:
      'ה-grid הוא responsive — כל כרטיס דורש לפחות 220px רוחב. במובייל (375px) זה עמודה אחת, ' +
      'בדסקטופ סטנדרטי (~680-900px) שתי-שלוש עמודות, ובמסך רחב (~1200px+) ארבע עמודות. ' +
      'הצבעים החדשים: בנגקוק=סגול עמוק, פטאיה=ורוד-טוקיו, קו-צ׳אנג=ירוק-אמרלד — מובחנים זה מזה ולא מתחרים בצבע ה-teal של האתר.',
  },
  {
    id: 'hotels',
    label: 'כרטיסי מלונות',
    description: 'B — לילות כמספר ענק; לחיצה פותחת חדרים',
    finalPickId: 'B',
    variants: HOTEL_VARIANTS,
  },
  {
    id: 'flights',
    label: 'כרטיסי טיסות',
    description: 'A — Booking + Duration במחסנית (החלפנו מ-B אחרי מחקר UX)',
    finalPickId: 'A',
    variants: FLIGHT_VARIANTS,
    note:
      'הוחלף מ-B (PNR ענק) ל-A אחרי שמחקר ה-UX הראה שכל חברות התעופה הגדולות (Apple Wallet, Lufthansa, Singapore, Delta) ' +
      'שומרות את הPNR קטן ומבליטות במקום זה את קודי השדה והשעה — וזה Pattern שכל נוסע למד לזהות.',
  },
  {
    id: 'places',
    label: 'מסעדות ואטרקציות',
    description: 'B — תמונה אנכית + כפתורי הוספה לטיול וניווט',
    finalPickId: 'B',
    variants: PLACE_VARIANTS,
  },
  {
    id: 'admin',
    label: 'דף ניהול הטיול',
    description: 'C — תגי התראה (כעת עם פיצול אדום/אמבר)',
    finalPickId: 'C',
    variants: ADMIN_VARIANTS,
    note:
      'מחקר UX: אדום אמיתי שמור ל"דחוף וחוסם" (כשל בתשלום, טיול ללא תאריכים). ' +
      'התראות "השלמת נתונים" כמו 3 גיאוקודים חסרים מוצגות באמבר/כתום — אותו תג, אותה מיקום, צבע פחות מבהיל.',
  },
  {
    id: 'logo',
    label: 'לוגו',
    description: 'D — אנימציית תנודה עדינה',
    finalPickId: 'D',
    variants: LOGO_VARIANTS,
  },
];

// ----- Responsive frames -----

const Frame: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; width: number | 'full'; children: React.ReactNode }> = ({ icon: Icon, label, width, children }) => (
  <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: HAIRLINE }}>
    <div className="px-3 py-1.5 flex items-center gap-1.5 border-b text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: HAIRLINE, color: TEXT_MUTED, background: '#F8FAFC' }}>
      <Icon className="w-3 h-3" /> {label}
    </div>
    <div className="p-4 bg-slate-100 flex justify-center">
      {width === 'full' ? (
        <div className="w-full bg-slate-50 rounded-xl p-3" style={{ minHeight: 100 }}>{children}</div>
      ) : (
        <div className="rounded-3xl border-2 overflow-hidden bg-slate-50" style={{ borderColor: '#94A3B8', width }}>
          <div className="p-3">{children}</div>
        </div>
      )}
    </div>
  </div>
);

const LogoSizes: React.FC<{ Component: React.FC<{ size?: 'sm' | 'md' | 'lg' }> }> = ({ Component }) => (
  <div className="flex flex-col items-center gap-5 py-3">
    <Component size="lg" />
    <Component size="md" />
    <Component size="sm" />
  </div>
);

const renderVariant = (surface: Surface, v: any) => {
  if (surface.id === 'logo') return <LogoSizes Component={v.Component} />;
  return <v.Component />;
};

// ----- Main component -----

export const DesignPreview: React.FC = () => {
  const { user } = useAuth();
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('itinerary');

  const surface = useMemo(() => SURFACES.find(s => s.id === activeSurface)!, [activeSurface]);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center space-y-4 bg-white rounded-2xl p-8 shadow-sm">
          <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Lock className="w-5 h-5 text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">תצוגת עיצוב — אדמין בלבד</h1>
        </div>
      </div>
    );
  }

  const finalPick = surface.finalPickId ? surface.variants.find((v: any) => v.id === surface.finalPickId) : null;

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <a href="#/" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> חזרה לאתר
            </a>
            <div className="w-px h-5 bg-slate-200" />
            <h1 className="text-base font-black text-slate-900 tracking-tight">תצוגה סופית של העיצוב</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black" style={{ background: ACCENT_SOFT, color: ACCENT }}>
            <Check className="w-3 h-3" /> 6/6 בחירות נעולות
          </span>
        </div>
        <div className="max-w-7xl mx-auto px-5 pb-2 flex gap-1 overflow-x-auto">
          {SURFACES.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSurface(s.id)}
              className={`whitespace-nowrap px-3 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeSurface === s.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.label}
              {s.finalPickId && (
                <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-black ${activeSurface === s.id ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                  {s.finalPickId}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        <section>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{surface.label}</h2>
          <p className="text-sm text-slate-500 mt-1">{surface.description}</p>
          {surface.note && (
            <p className="text-[13px] mt-3 rounded-xl px-4 py-3 leading-relaxed" style={{ background: ACCENT_SOFT, color: TEXT_PRIMARY }}>
              {surface.note}
            </p>
          )}
        </section>

        {surface.finalPickId === null ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: TEXT_MUTED }}>החלטה</p>
            <h3 className="text-[22px] font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>נשאר עם הקיים</h3>
            <p className="text-[14px] mt-2 max-w-md mx-auto leading-relaxed" style={{ color: TEXT_SECONDARY }}>
              ציינת שאתה אוהב את העיצוב של ראש דף הבית — הוא נשמר ללא שינוי.
            </p>
            <a href="#/" className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-full text-[13px] font-semibold" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              צפה בכותרת באתר
            </a>
          </div>
        ) : finalPick ? (
          <>
            <div className="rounded-2xl border-2 bg-white p-4 flex items-center gap-3" style={{ borderColor: ACCENT_SOFT }}>
              <span className="inline-flex w-9 h-9 rounded-full items-center justify-center" style={{ background: ACCENT_SOFT, color: ACCENT }}>
                <Lock className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold" style={{ color: TEXT_PRIMARY }}>נעול — {finalPick.title}</h3>
                <p className="text-[12px] mt-0.5" style={{ color: TEXT_SECONDARY }}>{finalPick.subtitle}</p>
              </div>
            </div>
            <div className="space-y-3">
              {surface.showWide && (
                <Frame icon={Tv} label="Wide desktop · ~1200px (4 columns)" width="full">
                  {renderVariant(surface, finalPick)}
                </Frame>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Frame icon={Monitor} label="Desktop · ~680px" width={680}>
                  {renderVariant(surface, finalPick)}
                </Frame>
                <Frame icon={Smartphone} label="Mobile · 375px" width={375}>
                  {renderVariant(surface, finalPick)}
                </Frame>
              </div>
            </div>
          </>
        ) : null}

        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <header>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">סיכום הבחירות הסופי</h2>
            <p className="text-xs text-slate-500 mt-0.5">כל ה-6 נעולים. אישור סופי לפני שאני מתחיל למגרר את העיצוב לקומפוננטים האמיתיים באתר.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SURFACES.map(s => {
              const pick = s.finalPickId;
              const variant = pick ? s.variants.find((v: any) => v.id === pick) : null;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSurface(s.id)}
                  className="text-right flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-bold text-slate-700">{s.label}</span>
                  {pick ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black" style={{ color: ACCENT }}>
                      <Check className="w-3.5 h-3.5" /> {variant?.title || pick}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black" style={{ color: TEXT_SECONDARY }}>
                      <Check className="w-3.5 h-3.5" /> נשאר כפי שהוא
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl p-4 text-sm font-bold text-center" style={{ background: ACCENT_SOFT, color: ACCENT }}>
            ✓ כל הבחירות נעולות. אם אתה מאשר את כולן, אני מתחיל את שלב המימוש בפועל באתר.
          </div>
        </section>
      </main>
    </div>
  );
};
