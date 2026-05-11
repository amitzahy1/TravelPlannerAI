/**
 * DesignPreview — admin-only sandbox for comparing 3 alternative visual
 * languages (Airbnb / Wolt / Notion-Linear) against the current design.
 *
 * Lives at /design-preview (admin-gated in App.tsx). Renders the same set of
 * fixtures in each style so the user can pick a direction.
 *
 * Does NOT affect the live app. Once the user picks, the chosen style can be
 * promoted to production in a follow-up.
 */

import React, { useState } from 'react';
import { isAdmin } from '../utils/isAdmin';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';

import { previewPlaces, previewHotels, previewItinerary, previewBudget } from './design-preview/fixtures';

import {
  AirbnbPlaceCard, AirbnbPlaceModal, AirbnbPageHeader, AirbnbCategoryChips,
  AirbnbHotelCard, AirbnbItineraryDayCard, AirbnbBudgetCard, AirbnbMapViewSkin,
} from './design-preview/airbnb/components';
import {
  WoltPlaceCard, WoltPlaceModal, WoltPageHeader, WoltCategoryChips,
  WoltHotelCard, WoltItineraryDayCard, WoltBudgetCard, WoltMapViewSkin,
} from './design-preview/wolt/components';
import {
  NotionPlaceCard, NotionPlaceModal, NotionPageHeader, NotionCategoryChips,
  NotionHotelCard, NotionItineraryDayCard, NotionBudgetCard, NotionMapViewSkin,
} from './design-preview/notion/components';

type Style = 'airbnb' | 'wolt' | 'notion';

const STYLES: { id: Style; label: string; tagline: string; accent: string }[] = [
  { id: 'airbnb', label: 'A — Airbnb', tagline: 'חמים, פוטוגרפי, רחב', accent: '#FF385C' },
  { id: 'wolt',   label: 'B — Wolt',   tagline: 'צבעוני, צפוף, מהיר',  accent: '#00C2E8' },
  { id: 'notion', label: 'C — Notion / Linear', tagline: 'מינימליסטי, טקסטואלי, רציני', accent: '#5E6AD2' },
];

const COMPONENTS: Record<Style, any> = {
  airbnb: {
    PlaceCard: AirbnbPlaceCard,
    PlaceModal: AirbnbPlaceModal,
    PageHeader: AirbnbPageHeader,
    CategoryChips: AirbnbCategoryChips,
    HotelCard: AirbnbHotelCard,
    ItineraryDayCard: AirbnbItineraryDayCard,
    BudgetCard: AirbnbBudgetCard,
    MapViewSkin: AirbnbMapViewSkin,
  },
  wolt: {
    PlaceCard: WoltPlaceCard,
    PlaceModal: WoltPlaceModal,
    PageHeader: WoltPageHeader,
    CategoryChips: WoltCategoryChips,
    HotelCard: WoltHotelCard,
    ItineraryDayCard: WoltItineraryDayCard,
    BudgetCard: WoltBudgetCard,
    MapViewSkin: WoltMapViewSkin,
  },
  notion: {
    PlaceCard: NotionPlaceCard,
    PlaceModal: NotionPlaceModal,
    PageHeader: NotionPageHeader,
    CategoryChips: NotionCategoryChips,
    HotelCard: NotionHotelCard,
    ItineraryDayCard: NotionItineraryDayCard,
    BudgetCard: NotionBudgetCard,
    MapViewSkin: NotionMapViewSkin,
  },
};

const dayOne = previewItinerary.filter(i => i.day === 1);

export const DesignPreview: React.FC = () => {
  const { user } = useAuth();
  const [active, setActive] = useState<Style>('airbnb');
  const [showModalFor, setShowModalFor] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Style | null>(null);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center space-y-4 bg-white rounded-2xl p-8 shadow-sm">
          <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Lock className="w-5 h-5 text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">דף תצוגת עיצוב — אדמין בלבד</h1>
          <p className="text-sm text-slate-500">
            הדף הזה משמש לבחירת כיוון עיצוב חדש לאתר. רק משתמשי אדמין יכולים לגשת אליו.
          </p>
        </div>
      </div>
    );
  }

  const C = COMPONENTS[active];
  const modalPlace = previewPlaces.find(p => p.id === showModalFor);

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* Toolbar — sticky at top */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-black text-slate-900">בחירת כיוון עיצוב</h1>
            <p className="text-xs text-slate-500">השווה 3 שפות עיצוב על אותם נתונים אמיתיים מהטיול שלך</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  active === s.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
                style={active === s.id ? { background: s.accent, borderColor: s.accent } : undefined}
              >
                {s.label}
              </button>
            ))}
            <div className="w-px h-6 bg-slate-200" />
            <button
              onClick={() => setChosen(active)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                chosen === active
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {chosen === active ? '✓ נבחר' : 'אני רוצה את זה'}
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-3">
          <p className="text-xs text-slate-600">
            <span className="font-bold">{STYLES.find(s => s.id === active)?.label}</span>
            {' — '}
            {STYLES.find(s => s.id === active)?.tagline}
          </p>
        </div>
      </header>

      {/* Mocked app shell, in the chosen style */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header + chips */}
        <Section title="ראש העמוד + טאבים">
          <C.PageHeader />
          <C.CategoryChips />
        </Section>

        {/* Place cards */}
        <Section title="כרטיסי מסעדות / אטרקציות (התצוגה הראשית)">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {previewPlaces.map(place => (
              <button key={place.id} onClick={() => setShowModalFor(place.id)} className="text-right">
                <C.PlaceCard place={place} />
              </button>
            ))}
          </div>
        </Section>

        {/* Map */}
        <Section title="תצוגת מפה">
          <C.MapViewSkin />
        </Section>

        {/* Hotels */}
        <Section title="מלונות">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previewHotels.map(hotel => (
              <C.HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        </Section>

        {/* Itinerary */}
        <Section title="מסלול יומי">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <C.ItineraryDayCard items={dayOne} day={1} date="2026-06-15" />
            <C.ItineraryDayCard items={previewItinerary.filter(i => i.day === 2)} day={2} date="2026-06-16" />
          </div>
        </Section>

        {/* Budget */}
        <Section title="תקציב">
          <div className="max-w-md">
            <C.BudgetCard categories={previewBudget} />
          </div>
        </Section>
      </main>

      {/* Modal preview */}
      {modalPlace && (
        <div
          onClick={() => setShowModalFor(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <C.PlaceModal place={modalPlace} />
          </div>
        </div>
      )}

      {chosen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          ✓ בחרת ב-{STYLES.find(s => s.id === chosen)?.label}. הודיע לי בצ'אט כדי לקדם לפרודקשן.
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h2>
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-4">{children}</div>
  </section>
);
