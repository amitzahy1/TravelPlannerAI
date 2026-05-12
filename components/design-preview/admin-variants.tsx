/** 4 admin/trip-management page layout proposals. These are SCHEMATIC mockups —
 *  the goal is to communicate the layout structure, not pixel-perfect copy. */
import React from 'react';
import { Plane, Hotel, Calendar, Users, Share2, AlertTriangle, ChevronDown, ChevronLeft, Sparkles, MapPin, Edit3, FileText } from 'lucide-react';
import { TRIP_NAME, TRIP_DATES, TRIP_CITIES, ACCENT, ACCENT_SOFT } from './fixtures';

const sections = [
  { id: 'basics', icon: <Calendar />, label: 'פרטים בסיסיים', summary: `${TRIP_NAME} · ${TRIP_DATES}` },
  { id: 'cities', icon: <MapPin />, label: 'יעדים', summary: `${TRIP_CITIES.length} ערים, 18 לילות` },
  { id: 'travelers', icon: <Users />, label: 'נוסעים', summary: '6 מבוגרים, 3 ילדים' },
  { id: 'hotels', icon: <Hotel />, label: 'מלונות', summary: '4 שמורים, 0 חסרים' },
  { id: 'flights', icon: <Plane />, label: 'טיסות', summary: '5 קטעים, 2 הלוך/חזור' },
  { id: 'share', icon: <Share2 />, label: 'שיתוף ויצוא', summary: '2 משתפים · PDF זמין' },
  { id: 'danger', icon: <AlertTriangle />, label: 'אזור מסוכן', summary: 'אפס מחקר · מחיקת טיול' },
];

/** A — Dashboard cards (each section a clickable big card, no tabs) */
export const AdminA: React.FC = () => (
  <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
    <header className="mb-5">
      <p className="text-xs font-bold text-slate-500">ניהול טיול</p>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{TRIP_NAME}</h2>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sections.map(s => (
        <button key={s.id} className="text-right bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              {React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900 group-hover:text-slate-700">{s.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{s.summary}</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          </div>
        </button>
      ))}
    </div>
  </div>
);

/** B — Linear single page (sticky nav, all sections expanded on one scroll) */
export const AdminB: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" dir="rtl">
    <div className="sticky top-0 px-5 py-3 bg-white border-b border-slate-200 z-10">
      <h2 className="text-base font-black text-slate-900 mb-2 tracking-tight">{TRIP_NAME}</h2>
      <nav className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
        {sections.map((s, i) => (
          <a key={s.id} href={`#section-${s.id}`} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${i === 0 ? '' : 'text-slate-500 hover:bg-slate-100'}`}
             style={i === 0 ? { background: ACCENT_SOFT, color: ACCENT } : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
    </div>
    <div className="divide-y divide-slate-100">
      {sections.slice(0, 4).map(s => (
        <section key={s.id} id={`section-${s.id}`} className="px-5 py-4">
          <header className="flex items-baseline justify-between mb-2">
            <div className="flex items-center gap-2">
              <span style={{ color: ACCENT }}>{React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-4 h-4' })}</span>
              <h3 className="text-sm font-black text-slate-900">{s.label}</h3>
            </div>
            <button className="text-xs font-bold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> ערוך
            </button>
          </header>
          <p className="text-xs text-slate-600">{s.summary}</p>
        </section>
      ))}
    </div>
  </div>
);

/** C — Wizard / accordion (collapsed sections, open one at a time) */
export const AdminC: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" dir="rtl">
    <header className="px-5 py-4 border-b border-slate-200">
      <h2 className="text-lg font-black text-slate-900 tracking-tight">{TRIP_NAME}</h2>
      <p className="text-xs text-slate-500">לחץ על שלב כדי לפתוח אותו</p>
    </header>
    <div className="divide-y divide-slate-100">
      {sections.map((s, i) => {
        const isOpen = i === 0;
        return (
          <div key={s.id}>
            <button className="w-full px-5 py-4 flex items-center gap-3 text-right hover:bg-slate-50 transition-colors">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${isOpen ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
                    style={isOpen ? { background: ACCENT } : undefined}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900">{s.label}</h3>
                <p className="text-xs text-slate-500 truncate">{s.summary}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 bg-slate-50 text-xs text-slate-600 leading-relaxed space-y-2">
                <p>תיאור מפורט של השלב הזה — שדות לעריכה, סטטיסטיקות, וכפתורי פעולה רלוונטיים.</p>
                <button className="px-3 py-1.5 rounded-lg text-white text-xs font-bold" style={{ background: ACCENT }}>
                  שמור והמשך
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/** D — Two-column workspace (sticky left meta, right scrolling content) */
export const AdminD: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex min-h-[400px]" dir="rtl">
    <aside className="w-56 flex-shrink-0 bg-slate-50 border-l border-slate-200 p-4 flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">טיול פעיל</p>
        <h3 className="text-base font-black text-slate-900 mt-0.5 tracking-tight">{TRIP_NAME}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{TRIP_DATES}</p>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-bold hover:bg-white text-slate-700">
          <Share2 className="w-3.5 h-3.5" /> שתף
        </button>
        <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-bold hover:bg-white text-slate-700">
          <FileText className="w-3.5 h-3.5" /> ייצא PDF
        </button>
        <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-bold hover:bg-white text-slate-700">
          <Sparkles className="w-3.5 h-3.5" /> מחקר AI
        </button>
      </div>
      <div className="mt-auto pt-3 border-t border-slate-200">
        <button className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50">
          ⚠ מחק טיול
        </button>
      </div>
    </aside>
    <div className="flex-1 p-5 space-y-3 overflow-y-auto">
      <nav className="flex gap-1 mb-2 text-xs font-bold">
        <span className="px-2.5 py-1 rounded-lg" style={{ background: ACCENT_SOFT, color: ACCENT }}>פרטים</span>
        <span className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100">לוגיסטיקה</span>
        <span className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100">תוכן</span>
        <span className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100">משתתפים</span>
      </nav>
      <div className="space-y-2.5">
        {sections.slice(0, 5).map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
            <span style={{ color: ACCENT }}>{React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-4 h-4' })}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-slate-900">{s.label}</h4>
              <p className="text-xs text-slate-500 truncate">{s.summary}</p>
            </div>
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ADMIN_VARIANTS = [
  { id: 'A', title: 'A — Dashboard cards', subtitle: 'כל סקציה ככרטיס לחיץ; ללא טאבים, ללא מבוך', Component: AdminA },
  { id: 'B', title: 'B — Single page', subtitle: 'דף אחד גלילי עם ניווט "anchor links" קבוע בראש', Component: AdminB },
  { id: 'C', title: 'C — Wizard / accordion', subtitle: 'שלב-אחר-שלב עם פתיחה אחת בכל פעם', Component: AdminC },
  { id: 'D', title: 'D — Two-column workspace', subtitle: 'סייד-בר קבוע למטה-דאטה מימין + אזור עבודה משמאל', Component: AdminD },
];
