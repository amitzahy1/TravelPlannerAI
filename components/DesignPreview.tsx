/**
 * DesignPreview — admin-only surface browser (Round 10).
 *
 * Per surface: 4 variants within the user's chosen direction.
 * Each variant renders BOTH in a mobile frame (~375px) and a desktop frame
 * (~720px) side-by-side so the user can see how each layout adapts.
 *
 * Locked picks from earlier rounds (places=B, logo=D) are shown as
 * read-only single previews — no more A/B/C/D choice.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { isAdmin } from '../utils/isAdmin';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Check, ArrowLeft, Smartphone, Monitor } from 'lucide-react';

import { ITINERARY_VARIANTS } from './design-preview/itinerary-variants';
import { HOTEL_VARIANTS } from './design-preview/hotel-variants';
import { FLIGHT_VARIANTS } from './design-preview/flight-variants';
import { PLACE_VARIANTS } from './design-preview/place-variants';
import { ADMIN_VARIANTS } from './design-preview/admin-variants';
import { LOGO_VARIANTS } from './design-preview/logo-variants';
import { ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './design-preview/fixtures';

type SurfaceId = 'banner' | 'itinerary' | 'hotels' | 'flights' | 'places' | 'admin' | 'logo';
type Mode = 'pick' | 'locked' | 'fixed';

interface Surface {
  id: SurfaceId;
  label: string;
  description: string;
  mode: Mode;
  variants: any[];
  lockedId?: string;
}

const SURFACES: Surface[] = [
  { id: 'banner',    label: 'ראש דף הבית',      description: 'נשמר כפי שהוא — אתה אוהב את העיצוב הקיים',                                       mode: 'fixed',  variants: [] },
  { id: 'itinerary', label: 'יומן יומי',        description: 'ארבע אופציות חדשות בכיוון "גריד דו-עמודות" שבחרת',                                mode: 'pick',   variants: ITINERARY_VARIANTS },
  { id: 'hotels',    label: 'כרטיסי מלונות',   description: 'ארבע אופציות בכיוון "עיר בשורה" עם דגש חזק על לילות וחדרים, ולחיצה פותחת חדרים',   mode: 'pick',   variants: HOTEL_VARIANTS },
  { id: 'flights',   label: 'כרטיסי טיסות',     description: 'ארבע אופציות בכיוון "PNR + משך טיסה" שבחרת',                                       mode: 'pick',   variants: FLIGHT_VARIANTS },
  { id: 'places',    label: 'מסעדות ואטרקציות', description: 'נעול על אופציה B (תמונה אנכית + כפתורי הוספה לטיול וניווט)',                       mode: 'locked', variants: PLACE_VARIANTS, lockedId: 'B' },
  { id: 'admin',     label: 'דף ניהול הטיול',   description: 'ארבע אופציות בכיוון "4 כפתורים גדולים + פאנל תוכן" שבחרת',                          mode: 'pick',   variants: ADMIN_VARIANTS },
  { id: 'logo',      label: 'לוגו',              description: 'נעול על אופציה D (אנימציית-תנודה עדינה)',                                          mode: 'locked', variants: LOGO_VARIANTS, lockedId: 'D' },
];

const STORAGE_KEY = 'design_picks_v4';

function readPicks(): Partial<Record<SurfaceId, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function writePicks(picks: Partial<Record<SurfaceId, string>>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(picks)); } catch { /* noop */ }
}

// ----- Responsive frames -----

const DesktopFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
    <div className="px-3 py-1.5 flex items-center gap-1.5 border-b text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: '#E2E8F0', color: TEXT_MUTED, background: '#F8FAFC' }}>
      <Monitor className="w-3 h-3" /> Desktop · ~720px
    </div>
    <div className="p-5 bg-slate-50">
      <div className="mx-auto" style={{ maxWidth: 680 }}>{children}</div>
    </div>
  </div>
);

const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
    <div className="px-3 py-1.5 flex items-center gap-1.5 border-b text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: '#E2E8F0', color: TEXT_MUTED, background: '#F8FAFC' }}>
      <Smartphone className="w-3 h-3" /> Mobile · 375px
    </div>
    <div className="p-4 bg-slate-100 flex justify-center">
      <div className="rounded-3xl border-2 overflow-hidden bg-slate-50" style={{ borderColor: '#94A3B8', width: 375 }}>
        <div className="p-3">{children}</div>
      </div>
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
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('banner');
  const [picks, setPicks] = useState<Partial<Record<SurfaceId, string>>>(() => readPicks());

  useEffect(() => { writePicks(picks); }, [picks]);

  const setPick = (surface: SurfaceId, variantId: string) => {
    setPicks(p => ({ ...p, [surface]: variantId }));
  };

  const surface = useMemo(() => SURFACES.find(s => s.id === activeSurface)!, [activeSurface]);
  const surfacesNeedingPick = SURFACES.filter(s => s.mode === 'pick');
  const completeCount = surfacesNeedingPick.filter(s => picks[s.id]).length;
  const totalCount = surfacesNeedingPick.length;

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center space-y-4 bg-white rounded-2xl p-8 shadow-sm">
          <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Lock className="w-5 h-5 text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">בחירת עיצוב — אדמין בלבד</h1>
          <p className="text-sm text-slate-500">הדף הזה משמש לבחירת כיוון עיצוב חדש לאתר. רק משתמשי אדמין יכולים לגשת אליו.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <a href="#/" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> חזרה לאתר
            </a>
            <div className="w-px h-5 bg-slate-200" />
            <h1 className="text-base font-black text-slate-900 tracking-tight">בחירת עיצוב — סבב 10</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">{completeCount} / {totalCount} בחירות</span>
            <div className="h-1.5 w-32 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${(completeCount / totalCount) * 100}%`, background: ACCENT }} />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-5 pb-2 flex gap-1 overflow-x-auto">
          {SURFACES.map(s => {
            const picked = picks[s.id];
            const isLockedOrFixed = s.mode !== 'pick';
            return (
              <button
                key={s.id}
                onClick={() => setActiveSurface(s.id)}
                className={`whitespace-nowrap px-3 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeSurface === s.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s.label}
                {isLockedOrFixed && (
                  <Lock className={`w-3 h-3 ${activeSurface === s.id ? 'opacity-80' : 'text-slate-400'}`} />
                )}
                {!isLockedOrFixed && picked && (
                  <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-black ${activeSurface === s.id ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>{picked}</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        <section>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{surface.label}</h2>
          <p className="text-sm text-slate-500 mt-1">{surface.description}</p>
        </section>

        {surface.mode === 'fixed' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: TEXT_MUTED }}>החלטה</p>
            <h3 className="text-[22px] font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>נשאר עם הקיים</h3>
            <p className="text-[14px] mt-2 max-w-md mx-auto leading-relaxed" style={{ color: TEXT_SECONDARY }}>
              ציינת שאתה אוהב את העיצוב של ראש דף הבית כפי שהוא היום, אז אין כאן מה לבחור — נשאיר את הכותרת והסטטיסטיקות בדיוק כפי שהן.
            </p>
            <a href="#/" className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-full text-[13px] font-semibold" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              צפה בכותרת באתר
            </a>
          </div>
        )}

        {surface.mode === 'locked' && (() => {
          const locked = surface.variants.find((v: any) => v.id === surface.lockedId);
          if (!locked) return null;
          return (
            <div className="space-y-3">
              <div className="rounded-2xl border-2 bg-white p-4 flex items-center gap-3" style={{ borderColor: ACCENT_SOFT }}>
                <span className="inline-flex w-9 h-9 rounded-full items-center justify-center" style={{ background: ACCENT_SOFT, color: ACCENT }}><Lock className="w-4 h-4" /></span>
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold" style={{ color: TEXT_PRIMARY }}>נעול — {locked.title}</h3>
                  <p className="text-[12px] mt-0.5" style={{ color: TEXT_SECONDARY }}>{locked.subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <DesktopFrame>{renderVariant(surface, locked)}</DesktopFrame>
                <MobileFrame>{renderVariant(surface, locked)}</MobileFrame>
              </div>
            </div>
          );
        })()}

        {surface.mode === 'pick' && (
          <div className="space-y-5">
            {surface.variants.map((v: any) => {
              const isPicked = picks[surface.id] === v.id;
              return (
                <div
                  key={v.id}
                  className={`rounded-3xl border-2 transition-all bg-white ${isPicked ? 'border-emerald-500 shadow-lg' : 'border-slate-200'}`}
                >
                  <header className="px-5 py-3 flex items-baseline justify-between gap-3 border-b border-slate-200">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">{v.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{v.subtitle}</p>
                    </div>
                    <button
                      onClick={() => setPick(surface.id, v.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all flex-shrink-0 ${isPicked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {isPicked && <Check className="w-3 h-3" />}
                      {isPicked ? 'נבחר' : 'בחר את זה'}
                    </button>
                  </header>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 p-3">
                    <DesktopFrame>{renderVariant(surface, v)}</DesktopFrame>
                    <MobileFrame>{renderVariant(surface, v)}</MobileFrame>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <header>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">סיכום הבחירות שלך</h2>
            <p className="text-xs text-slate-500 mt-0.5">לאחר שתבחר את 4 הנותרים, אעשה מחקר UX להשוואה מול אתרים מובילים — ואז נצא לדרך עם המימוש בפועל.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SURFACES.map(s => {
              const picked = picks[s.id];
              const variantTitle = picked ? s.variants.find((v: any) => v.id === picked)?.title : null;
              const lockedTitle = s.lockedId ? s.variants.find((v: any) => v.id === s.lockedId)?.title : null;
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-50">
                  <span className="text-sm font-bold text-slate-700">{s.label}</span>
                  {s.mode === 'fixed' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black" style={{ color: TEXT_SECONDARY }}>
                      <Check className="w-3.5 h-3.5" /> נשאר כפי שהוא
                    </span>
                  )}
                  {s.mode === 'locked' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black" style={{ color: TEXT_SECONDARY }}>
                      <Lock className="w-3.5 h-3.5" /> {lockedTitle}
                    </span>
                  )}
                  {s.mode === 'pick' && (picked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black" style={{ color: ACCENT }}>
                      <Check className="w-3.5 h-3.5" /> {variantTitle}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">— טרם נבחר</span>
                  ))}
                </div>
              );
            })}
          </div>
          {completeCount === totalCount && (
            <div className="rounded-2xl p-4 text-sm font-bold text-center" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              ✓ סיימת לבחור! שלח לי את האותיות בסדר: יומן / מלונות / טיסות / ניהול. אז אעשה מחקר UX ונתחיל את המימוש בפועל.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
