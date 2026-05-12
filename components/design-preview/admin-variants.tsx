/** Round 10 — 4 refinements in the picked "4 mega-tiles + content panel" direction.
 *  All variants share: 4 mega-groups → click reveals an inner content panel with
 *  sub-tabs. They differ on tile layout (grid vs row vs hero+small vs detail-stack)
 *  and visual density. Every variant preserves the full 16-section inventory. */
import React, { useState } from 'react';
import {
  Plane, Bookmark, Share2, Settings, Calendar, MapPin, Users, Hotel,
  Sparkles, Wand2, FileText, Zap, Activity, ShieldAlert, ScrollText,
  ChevronLeft, AlertCircle,
} from 'lucide-react';
import { TRIP_NAME, TRIP_DATES, TRIP_CITIES, ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE, PAGE_BG } from './fixtures';

type Tab = { id: string; label: string; summary: string; icon: React.ComponentType<{ className?: string }> };
type Group = { id: string; label: string; icon: React.ComponentType<{ className?: string }>; description: string; tabs: Tab[]; alerts?: number };

const GROUPS: Group[] = [
  {
    id: 'trip', label: 'הטיול', icon: Plane, description: 'שם, תאריכים, יעדים ונוסעים',
    tabs: [
      { id: 'name',      label: 'שם הטיול',  summary: TRIP_NAME,                            icon: Settings },
      { id: 'dates',     label: 'תאריכים',   summary: TRIP_DATES,                           icon: Calendar },
      { id: 'cities',    label: 'יעדים',     summary: `${TRIP_CITIES.length} ערים · 18 לילות`, icon: MapPin },
      { id: 'travelers', label: 'נוסעים',    summary: '6 מבוגרים · 3 ילדים',                 icon: Users },
    ],
  },
  {
    id: 'bookings', label: 'הזמנות', icon: Bookmark, description: 'טיסות, מלונות, מחקר וייבוא',
    tabs: [
      { id: 'flights',  label: 'טיסות',      summary: '5 קטעים · 2 הלוך/חזור',      icon: Plane },
      { id: 'hotels',   label: 'מלונות',     summary: '4 מלונות · ללא חוסרים',     icon: Hotel },
      { id: 'research', label: 'מחקר מעמיק', summary: 'ChatGPT / Gemini / Claude', icon: Sparkles },
      { id: 'magic',    label: 'ייבוא חכם',  summary: 'הדבק טקסט / PDF',           icon: Wand2 },
    ],
  },
  {
    id: 'share', label: 'שיתוף וייצוא', icon: Share2, description: 'שתף עם נוסעים אחרים או ייצא PDF',
    tabs: [
      { id: 'share', label: 'שתף טיול', summary: '2 משתפים פעילים',  icon: Share2 },
      { id: 'pdf',   label: 'ייצא PDF', summary: 'הורד גרסה להדפסה', icon: FileText },
    ],
  },
  {
    id: 'admin', label: 'ניהול ובקרה', icon: Settings, description: 'מכסות AI, ניטור ואזור מסוכן', alerts: 3,
    tabs: [
      { id: 'quotaFood', label: 'מכסת AI — מסעדות',   summary: 'נוצלה ב-9 לחודש',  icon: Zap },
      { id: 'quotaAttr', label: 'מכסת AI — אטרקציות', summary: 'נוצלה ב-4 לחודש',  icon: Zap },
      { id: 'activity',  label: 'יומן פעילות',         summary: '24 שינויים השבוע', icon: Activity },
      { id: 'health',    label: 'בריאות הנתונים',      summary: '3 גיאוקודים חסרים', icon: ShieldAlert },
      { id: 'logs',      label: 'יומני מערכת',          summary: 'גישה לאדמין בלבד', icon: ScrollText },
      { id: 'danger',    label: 'מחק טיול',             summary: 'פעולה בלתי הפיכה', icon: ShieldAlert },
    ],
  },
];

const TripHeader: React.FC = () => (
  <header className="mb-4" dir="rtl">
    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>ניהול טיול</p>
    <h2 className="text-[18px] font-semibold tracking-tight mt-0.5" style={{ color: TEXT_PRIMARY }}>{TRIP_NAME}</h2>
    <p className="text-[12px] mt-0.5" style={{ color: TEXT_SECONDARY }}>{TRIP_DATES} · {TRIP_CITIES.map(c => c.name).join(' · ')}</p>
  </header>
);

const ContentPanel: React.FC<{ group: Group; activeTabId: string; onTabChange: (id: string) => void }> = ({ group, activeTabId, onTabChange }) => {
  const active = group.tabs.find(t => t.id === activeTabId) || group.tabs[0];
  const isDanger = active.id === 'danger';
  const ActiveIcon = active.icon;
  return (
    <div dir="rtl">
      <div className="flex flex-wrap gap-1 mb-3">
        {group.tabs.map(t => {
          const isActive = t.id === active.id;
          const TIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              style={{
                background: isActive ? (t.id === 'danger' ? '#FEF2F2' : ACCENT_SOFT) : '#F1F5F9',
                color: isActive ? (t.id === 'danger' ? '#B91C1C' : ACCENT) : TEXT_SECONDARY,
              }}
            >
              <TIcon className="w-2.5 h-2.5" /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="rounded-xl border" style={{ borderColor: HAIRLINE, background: '#FAFAFA' }}>
        <div className="px-3 py-2.5 flex items-center gap-2 border-b" style={{ borderColor: HAIRLINE }}>
          <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: isDanger ? '#FEF2F2' : ACCENT_SOFT, color: isDanger ? '#B91C1C' : ACCENT }}>
            <ActiveIcon className="w-3 h-3" />
          </span>
          <div className="min-w-0">
            <h4 className="text-[13px] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{active.label}</h4>
            <p className="text-[11px] truncate" style={{ color: TEXT_SECONDARY }}>{active.summary}</p>
          </div>
        </div>
        <div className="px-3 py-3 text-[11px]" style={{ color: TEXT_MUTED }}>
          תוכן הסקציה {active.label} — טופס/רשימה/פעולות בפועל יוצגו כאן.
        </div>
      </div>
    </div>
  );
};

// ---------- 4 refined variants in the "4 mega-tiles + content" direction ----------

/** A — 2×2 tile grid (refined baseline) */
export const AdminA: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState('trip');
  const [activeTab, setActiveTab] = useState(GROUPS[0].tabs[0].id);
  const group = GROUPS.find(g => g.id === activeGroup)!;
  return (
    <div className="bg-slate-50 p-4 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="grid grid-cols-2 gap-2 mb-4">
        {GROUPS.map(g => {
          const Icon = g.icon;
          const isActive = g.id === activeGroup;
          return (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g.id); setActiveTab(g.tabs[0].id); }}
              className="text-right bg-white rounded-xl p-3 transition-all"
              style={{ boxShadow: isActive ? `inset 0 0 0 2px ${ACCENT}` : '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isActive ? ACCENT : ACCENT_SOFT, color: isActive ? 'white' : ACCENT }}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{g.label}</h4>
                  <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: TEXT_SECONDARY }}>{g.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-xl p-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <ContentPanel group={group} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

/** B — Single row of 4 wide tiles (or wraps to 2×2 if narrow) */
export const AdminB: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState('trip');
  const [activeTab, setActiveTab] = useState(GROUPS[0].tabs[0].id);
  const group = GROUPS.find(g => g.id === activeGroup)!;
  return (
    <div className="bg-slate-50 p-4 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="grid grid-cols-2 gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {GROUPS.map(g => {
          const Icon = g.icon;
          const isActive = g.id === activeGroup;
          return (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g.id); setActiveTab(g.tabs[0].id); }}
              className="bg-white rounded-xl p-3 transition-all text-center"
              style={{ boxShadow: isActive ? `inset 0 0 0 2px ${ACCENT}` : '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center mb-1.5" style={{ background: isActive ? ACCENT : ACCENT_SOFT, color: isActive ? 'white' : ACCENT }}>
                <Icon className="w-4 h-4" />
              </span>
              <h4 className="text-[12px] font-semibold" style={{ color: TEXT_PRIMARY }}>{g.label}</h4>
              <p className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>{g.tabs.length} סקציות</p>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-xl p-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <ContentPanel group={group} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

/** C — Tiles with alert badges (e.g. "3 issues" on ניהול ובקרה) */
export const AdminC: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState('admin');
  const [activeTab, setActiveTab] = useState('health');
  const group = GROUPS.find(g => g.id === activeGroup)!;
  return (
    <div className="bg-slate-50 p-4 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="grid grid-cols-2 gap-2 mb-4">
        {GROUPS.map(g => {
          const Icon = g.icon;
          const isActive = g.id === activeGroup;
          return (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g.id); setActiveTab(g.tabs[0].id); }}
              className="relative text-right bg-white rounded-xl p-3 transition-all"
              style={{ boxShadow: isActive ? `inset 0 0 0 2px ${ACCENT}` : '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {g.alerts && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: '#DC2626' }}>
                  <AlertCircle className="w-2.5 h-2.5" /> {g.alerts}
                </span>
              )}
              <div className="flex items-start gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isActive ? ACCENT : ACCENT_SOFT, color: isActive ? 'white' : ACCENT }}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{g.label}</h4>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: TEXT_SECONDARY }}>{g.tabs.length} סקציות</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-xl p-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <ContentPanel group={group} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

/** D — Active group as a hero card on top + 3 smaller secondary tiles */
export const AdminD: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState('trip');
  const [activeTab, setActiveTab] = useState(GROUPS[0].tabs[0].id);
  const group = GROUPS.find(g => g.id === activeGroup)!;
  const others = GROUPS.filter(g => g.id !== activeGroup);
  const ActiveIcon = group.icon;
  return (
    <div className="bg-slate-50 p-4 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="bg-white rounded-xl p-3 mb-2" style={{ background: ACCENT, color: 'white' }}>
        <div className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/15">
            <ActiveIcon className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-semibold tracking-tight">{group.label}</h4>
            <p className="text-[11px] opacity-90">{group.description}</p>
          </div>
          <ChevronLeft className="w-4 h-4 opacity-80 flex-shrink-0" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {others.map(g => {
          const Icon = g.icon;
          return (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g.id); setActiveTab(g.tabs[0].id); }}
              className="bg-white rounded-lg p-2 text-center"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center" style={{ background: ACCENT_SOFT, color: ACCENT }}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <p className="text-[11px] font-semibold mt-1 truncate" style={{ color: TEXT_PRIMARY }}>{g.label}</p>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-xl p-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <ContentPanel group={group} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export const ADMIN_VARIANTS = [
  { id: 'A', title: 'A — גריד 2×2 (הבסיס שבחרת)', subtitle: 'ארבעה כפתורים שווי-גודל; לחיצה פותחת פאנל תוכן עם תת-טאבים',     Component: AdminA },
  { id: 'B', title: 'B — שורת אריחים מסודרת',     subtitle: 'אייקון גדול ממורכז + מספר סקציות כסאב-טייטל',                       Component: AdminB },
  { id: 'C', title: 'C — תגי התראה',               subtitle: 'תג אדום על קבוצה עם בעיות (למשל "3 ניטור"); מושך את העין',         Component: AdminC },
  { id: 'D', title: 'D — קבוצה פעילה כהירו',        subtitle: 'הקבוצה הנבחרת בולטת ככרטיס צבעוני; השאר קומפקטיים',                 Component: AdminD },
];
