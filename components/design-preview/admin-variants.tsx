/** Round 8 — 4 refined "Dashboard cards" admin layouts.
 *  Every section from the existing AdminView is represented in each variant. */
import React from 'react';
import {
  Calendar, MapPin, Users, Plane, Hotel, Sparkles, Share2, FileText,
  Zap, Wand2, Activity, ShieldAlert, ChevronLeft, Settings, ScrollText,
} from 'lucide-react';
import { TRIP_NAME, TRIP_DATES, TRIP_CITIES, ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './fixtures';

// All admin sections from AdminView, grouped logically.
const sections = [
  // Overview
  { id: 'name',      icon: Settings,    label: 'שם הטיול',           summary: TRIP_NAME,                                     group: 'overview' },
  { id: 'cities',    icon: MapPin,      label: 'יעדים',              summary: `${TRIP_CITIES.length} ערים · 18 לילות`,         group: 'overview' },
  { id: 'dates',     icon: Calendar,    label: 'תאריכים',            summary: TRIP_DATES,                                    group: 'overview' },
  { id: 'travelers', icon: Users,       label: 'נוסעים',             summary: '6 מבוגרים · 3 ילדים',                          group: 'overview' },
  // Logistics
  { id: 'flights',   icon: Plane,       label: 'טיסות',              summary: '5 קטעים · 2 הלוך/חזור',                        group: 'logistics' },
  { id: 'hotels',    icon: Hotel,       label: 'מלונות',             summary: '4 מלונות · ללא חוסרים',                         group: 'logistics' },
  { id: 'research',  icon: Sparkles,    label: 'מחקר מעמיק',         summary: 'ChatGPT / Gemini / Claude',                  group: 'logistics' },
  // Tools
  { id: 'share',     icon: Share2,      label: 'שתף טיול',           summary: '2 משתפים פעילים',                              group: 'tools' },
  { id: 'pdf',       icon: FileText,    label: 'ייצא PDF',           summary: 'הורד גרסה להדפסה',                              group: 'tools' },
  { id: 'quotaFood', icon: Zap,         label: 'מכסת AI — מסעדות',    summary: 'נוצלה ב-9 לחודש · אפס',                       group: 'tools' },
  { id: 'quotaAttr', icon: Zap,         label: 'מכסת AI — אטרקציות',  summary: 'נוצלה ב-4 לחודש · אפס',                       group: 'tools' },
  { id: 'magic',     icon: Wand2,       label: 'ייבוא חכם',           summary: 'הדבק טקסט / PDF',                              group: 'tools' },
  // Audit
  { id: 'activity',  icon: Activity,    label: 'יומן פעילות',         summary: '24 שינויים השבוע',                             group: 'audit' },
  { id: 'health',    icon: ShieldAlert, label: 'בריאות הנתונים',      summary: '3 גיאוקודים חסרים',                            group: 'audit' },
  { id: 'logs',      icon: ScrollText,  label: 'יומני מערכת',         summary: 'גישה לאדמין בלבד',                             group: 'audit' },
  // Danger
  { id: 'danger',    icon: ShieldAlert, label: 'מחק טיול',            summary: 'פעולה בלתי הפיכה',                             group: 'danger' },
];

const groupLabels: Record<string, string> = {
  overview:  'פרטי הטיול',
  logistics: 'תוכן הטיול',
  tools:     'כלים ושיתוף',
  audit:     'ניטור',
  danger:    'אזור מסוכן',
};
const groupOrder = ['overview', 'logistics', 'tools', 'audit', 'danger'];

const SectionCard: React.FC<{
  section: typeof sections[number];
  size?: 'sm' | 'md' | 'lg';
  layout?: 'grid' | 'row';
}> = ({ section, size = 'md', layout = 'grid' }) => {
  const Icon = section.icon;
  const isDanger = section.group === 'danger';
  if (layout === 'row') {
    return (
      <button className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 text-right hover:bg-slate-50 transition-colors" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDanger ? '#FEF2F2' : ACCENT_SOFT, color: isDanger ? '#B91C1C' : ACCENT }}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{section.label}</span>
          <span className="block text-[12px] truncate" style={{ color: TEXT_SECONDARY }}>{section.summary}</span>
        </span>
        <ChevronLeft className="w-4 h-4 flex-shrink-0" style={{ color: TEXT_MUTED }} />
      </button>
    );
  }
  const pad = size === 'lg' ? 'p-5' : size === 'sm' ? 'p-3.5' : 'p-4';
  return (
    <button className={`text-right bg-white rounded-2xl ${pad} hover:bg-slate-50 transition-colors group`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDanger ? '#FEF2F2' : ACCENT_SOFT, color: isDanger ? '#B91C1C' : ACCENT }}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>{section.label}</h4>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: TEXT_SECONDARY }}>{section.summary}</p>
        </div>
        <ChevronLeft className="w-4 h-4 mt-2 flex-shrink-0 group-hover:translate-x-[-2px] transition-transform" style={{ color: TEXT_MUTED }} />
      </div>
    </button>
  );
};

const TripHeader: React.FC<{ subtitle?: string }> = ({ subtitle }) => (
  <header className="mb-5" dir="rtl">
    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>ניהול טיול</p>
    <h2 className="text-[22px] font-semibold tracking-tight mt-1" style={{ color: TEXT_PRIMARY }}>{TRIP_NAME}</h2>
    <p className="text-[13px] mt-0.5" style={{ color: TEXT_SECONDARY }}>{subtitle || `${TRIP_DATES} · ${TRIP_CITIES.map(c => c.name).join(' · ')}`}</p>
  </header>
);

/** A — Symmetric grid */
export const AdminA: React.FC = () => (
  <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
    <TripHeader />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sections.map(s => <SectionCard key={s.id} section={s} />)}
    </div>
  </div>
);

/** B — Hero card + utility grid */
export const AdminB: React.FC = () => (
  <div className="bg-slate-50 p-5 rounded-2xl space-y-3" dir="rtl">
    {/* Hero spanning the trip name + cities + dates */}
    <div className="bg-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>טיול פעיל</p>
        <h2 className="text-[28px] font-semibold tracking-tight mt-1" style={{ color: TEXT_PRIMARY }}>{TRIP_NAME}</h2>
        <p className="text-[13px] mt-1" style={{ color: TEXT_SECONDARY }}>{TRIP_DATES} · {TRIP_CITIES.map(c => `${c.name} (${c.nights})`).join(' · ')}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button className="px-4 py-2 rounded-full text-[13px] font-semibold text-white" style={{ background: ACCENT }}>שתף</button>
        <button className="px-4 py-2 rounded-full text-[13px] font-semibold border" style={{ borderColor: HAIRLINE, color: TEXT_PRIMARY }}>ייצא PDF</button>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {sections.filter(s => !['name', 'share', 'pdf'].includes(s.id)).map(s => (
        <SectionCard key={s.id} section={s} size="sm" />
      ))}
    </div>
  </div>
);

/** C — Section-grouped */
export const AdminC: React.FC = () => (
  <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
    <TripHeader />
    <div className="space-y-5">
      {groupOrder.map(g => (
        <section key={g}>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2.5 ps-1" style={{ color: TEXT_MUTED }}>{groupLabels[g]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sections.filter(s => s.group === g).map(s => <SectionCard key={s.id} section={s} size="sm" />)}
          </div>
        </section>
      ))}
    </div>
  </div>
);

/** D — Compact list-rows */
export const AdminD: React.FC = () => (
  <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
    <TripHeader />
    <div className="space-y-2">
      {sections.map(s => <SectionCard key={s.id} section={s} layout="row" />)}
    </div>
  </div>
);

export const ADMIN_VARIANTS = [
  { id: 'A', title: 'A — גריד סימטרי', subtitle: '2 עמודות, כל סקציה ככרטיס שווה. נקי וברור', Component: AdminA },
  { id: 'B', title: 'B — כרטיס-הירו + גריד', subtitle: 'כותרת הטיול ככרטיס גדול עם פעולות + שאר ה־cards', Component: AdminB },
  { id: 'C', title: 'C — קבוצות לפי תפקיד', subtitle: 'הסקציות מקובצות תחת כותרות (פרטים / תוכן / כלים / ניטור)', Component: AdminC },
  { id: 'D', title: 'D — רשימה דחוסה', subtitle: 'כל סקציה בשורה אופקית; הרבה על המסך בבת אחת', Component: AdminD },
];
