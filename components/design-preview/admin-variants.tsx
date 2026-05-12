/** Round 9 — admin variants consolidated into 4 mega-groups (each with inner tabs).
 *  User feedback: "too many buttons — consolidate to 3-5 with tabs inside if needed".
 *  All 4 variants share the same group taxonomy; they differ only in LAYOUT. */
import React, { useState } from 'react';
import {
  Plane, Bookmark, Share2, Settings, ChevronDown, ChevronLeft,
  Calendar, MapPin, Users, Hotel, Sparkles, Wand2, FileText,
  Zap, Activity, ShieldAlert, ScrollText,
} from 'lucide-react';
import { TRIP_NAME, TRIP_DATES, TRIP_CITIES, ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE, PAGE_BG } from './fixtures';

type Tab = { id: string; label: string; summary: string; icon: React.ComponentType<{ className?: string }> };
type Group = { id: string; label: string; icon: React.ComponentType<{ className?: string }>; description: string; tabs: Tab[] };

// 4 mega-groups — every existing admin section maps into exactly one.
const GROUPS: Group[] = [
  {
    id: 'trip',
    label: 'הטיול',
    icon: Plane,
    description: 'שם, תאריכים, יעדים ונוסעים',
    tabs: [
      { id: 'name',      label: 'שם הטיול',  summary: TRIP_NAME,                                icon: Settings },
      { id: 'dates',     label: 'תאריכים',   summary: TRIP_DATES,                               icon: Calendar },
      { id: 'cities',    label: 'יעדים',     summary: `${TRIP_CITIES.length} ערים · 18 לילות`,    icon: MapPin },
      { id: 'travelers', label: 'נוסעים',    summary: '6 מבוגרים · 3 ילדים',                     icon: Users },
    ],
  },
  {
    id: 'bookings',
    label: 'הזמנות',
    icon: Bookmark,
    description: 'טיסות, מלונות, מחקר וייבוא',
    tabs: [
      { id: 'flights',  label: 'טיסות',         summary: '5 קטעים · 2 הלוך/חזור',         icon: Plane },
      { id: 'hotels',   label: 'מלונות',         summary: '4 מלונות · ללא חוסרים',        icon: Hotel },
      { id: 'research', label: 'מחקר מעמיק',     summary: 'ChatGPT / Gemini / Claude',    icon: Sparkles },
      { id: 'magic',    label: 'ייבוא חכם',      summary: 'הדבק טקסט / PDF',              icon: Wand2 },
    ],
  },
  {
    id: 'share',
    label: 'שיתוף וייצוא',
    icon: Share2,
    description: 'שתף עם נוסעים אחרים או ייצא PDF',
    tabs: [
      { id: 'share', label: 'שתף טיול', summary: '2 משתפים פעילים',  icon: Share2 },
      { id: 'pdf',   label: 'ייצא PDF', summary: 'הורד גרסה להדפסה', icon: FileText },
    ],
  },
  {
    id: 'admin',
    label: 'ניהול ובקרה',
    icon: Settings,
    description: 'מכסות AI, ניטור ואזור מסוכן',
    tabs: [
      { id: 'quotaFood', label: 'מכסת AI — מסעדות',   summary: 'נוצלה ב-9 לחודש',      icon: Zap },
      { id: 'quotaAttr', label: 'מכסת AI — אטרקציות', summary: 'נוצלה ב-4 לחודש',      icon: Zap },
      { id: 'activity',  label: 'יומן פעילות',         summary: '24 שינויים השבוע',     icon: Activity },
      { id: 'health',    label: 'בריאות הנתונים',      summary: '3 גיאוקודים חסרים',    icon: ShieldAlert },
      { id: 'logs',      label: 'יומני מערכת',          summary: 'גישה לאדמין בלבד',     icon: ScrollText },
      { id: 'danger',    label: 'מחק טיול',             summary: 'פעולה בלתי הפיכה',     icon: ShieldAlert },
    ],
  },
];

const TripHeader: React.FC = () => (
  <header className="mb-5" dir="rtl">
    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>ניהול טיול</p>
    <h2 className="text-[22px] font-semibold tracking-tight mt-1" style={{ color: TEXT_PRIMARY }}>{TRIP_NAME}</h2>
    <p className="text-[13px] mt-0.5" style={{ color: TEXT_SECONDARY }}>{TRIP_DATES} · {TRIP_CITIES.map(c => c.name).join(' · ')}</p>
  </header>
);

// Renders the inner tab content for the active group. Each variant uses this.
const TabPanel: React.FC<{ group: Group; activeTabId: string; onTabChange: (id: string) => void }> = ({ group, activeTabId, onTabChange }) => {
  const active = group.tabs.find(t => t.id === activeTabId) || group.tabs[0];
  const isDanger = active.id === 'danger';
  const ActiveIcon = active.icon;
  return (
    <div dir="rtl">
      {/* Inner sub-tabs row */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {group.tabs.map(t => {
          const isActive = t.id === active.id;
          const TIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
              style={{
                background: isActive ? (t.id === 'danger' ? '#FEF2F2' : ACCENT_SOFT) : '#F1F5F9',
                color: isActive ? (t.id === 'danger' ? '#B91C1C' : ACCENT) : TEXT_SECONDARY,
              }}
            >
              <TIcon className="w-3 h-3" /> {t.label}
            </button>
          );
        })}
      </div>
      {/* Content for the active tab (stub since this is preview) */}
      <div className="rounded-xl border" style={{ borderColor: HAIRLINE, background: '#FAFAFA' }}>
        <div className="px-4 py-3 flex items-center gap-2.5 border-b" style={{ borderColor: HAIRLINE }}>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isDanger ? '#FEF2F2' : ACCENT_SOFT, color: isDanger ? '#B91C1C' : ACCENT }}>
            <ActiveIcon className="w-3.5 h-3.5" />
          </span>
          <div>
            <h4 className="text-[14px] font-semibold" style={{ color: TEXT_PRIMARY }}>{active.label}</h4>
            <p className="text-[12px]" style={{ color: TEXT_SECONDARY }}>{active.summary}</p>
          </div>
        </div>
        <div className="px-4 py-4 text-[12px]" style={{ color: TEXT_MUTED }}>
          תוכן הסקציה {active.label}. (כאן יוצג טופס/רשימה/פעולות בפועל.)
        </div>
      </div>
    </div>
  );
};

/** A — Mega-tile grid: 4 big action tiles (2×2); click reveals a content panel below */
export const AdminA: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<string>('trip');
  const [activeTab, setActiveTab] = useState<string>(GROUPS[0].tabs[0].id);
  const group = GROUPS.find(g => g.id === activeGroup)!;
  return (
    <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="grid grid-cols-2 gap-3 mb-5">
        {GROUPS.map(g => {
          const Icon = g.icon;
          const isActive = g.id === activeGroup;
          return (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g.id); setActiveTab(g.tabs[0].id); }}
              className="text-right bg-white rounded-2xl p-4 transition-all"
              style={{
                boxShadow: isActive ? `inset 0 0 0 2px ${ACCENT}` : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isActive ? ACCENT : ACCENT_SOFT, color: isActive ? 'white' : ACCENT }}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>{g.label}</h4>
                  <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: TEXT_SECONDARY }}>{g.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <TabPanel group={group} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

/** B — Top tab bar: 4 horizontal mega-tabs at the top; content below with sub-tabs */
export const AdminB: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<string>('trip');
  const [activeTab, setActiveTab] = useState<string>(GROUPS[0].tabs[0].id);
  const group = GROUPS.find(g => g.id === activeGroup)!;
  return (
    <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <nav className="flex border-b" style={{ borderColor: HAIRLINE }}>
          {GROUPS.map(g => {
            const Icon = g.icon;
            const isActive = g.id === activeGroup;
            return (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g.id); setActiveTab(g.tabs[0].id); }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3.5 text-[13px] font-semibold transition-colors relative"
                style={{ color: isActive ? ACCENT : TEXT_SECONDARY }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{g.label}</span>
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: ACCENT }} />}
              </button>
            );
          })}
        </nav>
        <div className="p-5">
          <TabPanel group={group} activeTabId={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
};

/** C — RTL side rail: 4 buttons in a vertical rail on the right; content swaps on the left */
export const AdminC: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<string>('trip');
  const [activeTab, setActiveTab] = useState<string>(GROUPS[0].tabs[0].id);
  const group = GROUPS.find(g => g.id === activeGroup)!;
  return (
    <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="bg-white rounded-2xl overflow-hidden flex" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)', minHeight: 360 }}>
        <aside className="w-48 flex-shrink-0 border-l" style={{ borderColor: HAIRLINE, background: PAGE_BG }}>
          <nav className="p-2 space-y-1">
            {GROUPS.map(g => {
              const Icon = g.icon;
              const isActive = g.id === activeGroup;
              return (
                <button
                  key={g.id}
                  onClick={() => { setActiveGroup(g.id); setActiveTab(g.tabs[0].id); }}
                  className="w-full text-right flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
                  style={{
                    background: isActive ? 'white' : 'transparent',
                    color: isActive ? TEXT_PRIMARY : TEXT_SECONDARY,
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isActive ? ACCENT : ACCENT_SOFT, color: isActive ? 'white' : ACCENT }}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold truncate">{g.label}</span>
                    <span className="block text-[11px] truncate" style={{ color: TEXT_MUTED }}>{g.tabs.length} סקציות</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="flex-1 min-w-0 p-5">
          <TabPanel group={group} activeTabId={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
};

/** D — Accordion: 4 collapsible sections; expanded one shows the inner tabs + content */
export const AdminD: React.FC = () => {
  const [openGroup, setOpenGroup] = useState<string>('trip');
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>(
    Object.fromEntries(GROUPS.map(g => [g.id, g.tabs[0].id]))
  );
  return (
    <div className="bg-slate-50 p-5 rounded-2xl" dir="rtl">
      <TripHeader />
      <div className="space-y-2">
        {GROUPS.map(g => {
          const Icon = g.icon;
          const isOpen = g.id === openGroup;
          return (
            <div key={g.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <button
                onClick={() => setOpenGroup(isOpen ? '' : g.id)}
                className="w-full text-right flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50"
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isOpen ? ACCENT : ACCENT_SOFT, color: isOpen ? 'white' : ACCENT }}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold" style={{ color: TEXT_PRIMARY }}>{g.label}</span>
                  <span className="block text-[12px] truncate" style={{ color: TEXT_SECONDARY }}>{g.description}</span>
                </span>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: TEXT_MUTED }} />
                  : <ChevronLeft className="w-4 h-4 flex-shrink-0" style={{ color: TEXT_MUTED }} />
                }
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: HAIRLINE }}>
                  <TabPanel
                    group={g}
                    activeTabId={activeTabs[g.id]}
                    onTabChange={id => setActiveTabs(prev => ({ ...prev, [g.id]: id }))}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ADMIN_VARIANTS = [
  { id: 'A', title: 'A — 4 כפתורים גדולים + תוכן', subtitle: '4 כפתורי-על בגריד 2×2, לחיצה פותחת פאנל תוכן עם טאבים פנימיים', Component: AdminA },
  { id: 'B', title: 'B — סרגל טאבים עליון', subtitle: '4 טאבים אופקיים בראש, לחיצה משנה את התוכן עם תת-טאבים בפנים', Component: AdminB },
  { id: 'C', title: 'C — סרגל צד (RTL)', subtitle: 'תפריט אנכי בצד ימין עם 4 קבוצות, התוכן מתחלף בצד שמאל', Component: AdminC },
  { id: 'D', title: 'D — אקורדיון', subtitle: '4 סקציות מתקפלות, פתיחה מציגה תת-טאבים ותוכן בפנים', Component: AdminD },
];
