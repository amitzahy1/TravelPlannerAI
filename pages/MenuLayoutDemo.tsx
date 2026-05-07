import React, { useState } from 'react';
import { Sparkles, Utensils, Search, X, List, Map as MapIcon, MoreVertical, Filter, ChevronLeft } from 'lucide-react';

/**
 * Visual side-by-side comparison of the 3 header layout options the user
 * picked from. Reachable at #/demo/menu so the user can preview each option
 * rendered as real components (not ASCII), at mobile + desktop widths,
 * and confirm or change their pick.
 *
 * Currently shipped: Option A (Stacked rows). The other two are visual
 * mockups so the trade-offs are tangible.
 */

type Option = 'A' | 'B' | 'C';

export const MenuLayoutDemo: React.FC = () => {
    const [selected, setSelected] = useState<Option>('A');

    return (
        <div dir="rtl" className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900">השוואת פריסות תפריט</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        3 אופציות לפריסת ה-header של דף האוכל / אטרקציות. בחר טאב ועיין במראה במובייל ובדסקטופ.
                        אופציה A מיושמת כעת באתר.
                    </p>
                </header>

                {/* Option tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {(['A', 'B', 'C'] as const).map(opt => (
                        <button
                            key={opt}
                            onClick={() => setSelected(opt)}
                            className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all border ${
                                selected === opt
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                        >
                            {OPTION_META[opt].title}
                        </button>
                    ))}
                </div>

                {/* Description */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 mb-6">
                    <h2 className="text-lg font-black text-slate-900 mb-2">{OPTION_META[selected].title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{OPTION_META[selected].desc}</p>
                    {selected === 'A' && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                            ✓ מיושם באתר עכשיו
                        </div>
                    )}
                </div>

                {/* Side-by-side preview */}
                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
                    {/* Mobile preview */}
                    <div>
                        <div className="text-xs font-black text-slate-500 mb-2 px-1">📱 מובייל · 375px</div>
                        <div className="bg-slate-900 rounded-[2rem] p-2 shadow-2xl mx-auto" style={{ width: 391 }}>
                            <div className="bg-white rounded-[1.6rem] overflow-hidden" style={{ height: 720 }}>
                                <div className="h-6 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                                    <div className="w-16 h-1 bg-slate-300 rounded-full" />
                                </div>
                                <div className="overflow-y-auto p-3" style={{ height: 'calc(100% - 1.5rem)' }}>
                                    {selected === 'A' && <OptionAMobile />}
                                    {selected === 'B' && <OptionBMobile />}
                                    {selected === 'C' && <OptionCMobile />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop preview */}
                    <div>
                        <div className="text-xs font-black text-slate-500 mb-2 px-1">💻 דסקטופ · 1280px</div>
                        <div className="bg-slate-900 rounded-2xl p-2 shadow-2xl">
                            <div className="bg-white rounded-xl overflow-hidden" style={{ minHeight: 600 }}>
                                <div className="h-6 bg-slate-50 border-b border-slate-100 flex items-center px-3 gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                </div>
                                <div className="p-5 overflow-x-auto">
                                    {selected === 'A' && <OptionADesktop />}
                                    {selected === 'B' && <OptionBDesktop />}
                                    {selected === 'C' && <OptionCDesktop />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="mt-8 text-center text-xs text-slate-500">
                    כדי לסגור את הדמו, מחק <code className="bg-slate-200 px-1.5 py-0.5 rounded">#/demo/menu</code> מה-URL וטען מחדש.
                </footer>
            </div>
        </div>
    );
};

const OPTION_META: Record<Option, { title: string; desc: string }> = {
    A: {
        title: 'A — Stacked rows (מיושם)',
        desc: '5 שורות מסודרות במובייל, 3 בדסקטופ. כל פקד בשורה הברורה שלו. אין גלילה אופקית, אין כפילויות. הסדר צפוי: טאבים → חיפוש → ערים → תצוגה+פעולות → סינון (במפה).',
    },
    B: {
        title: 'B — Sticky bottom toolbar',
        desc: 'במובייל סרגל פעולות צף בתחתית המסך עם תצוגה / סינון / פעולות. ה-header למעלה מצומצם. בדסקטופ הכל בשורה אחת למעלה. יותר מקום לתוכן.',
    },
    C: {
        title: 'C — Compact + actions drawer',
        desc: 'header מצומצם מאוד: טאבים, חיפוש, צ׳יפס. כל הפעולות והסינון מוסתרים מאחורי כפתור ⋮ אחד שפותח מגירה. הכי נקי, אבל יותר קליקים לכל פעולה.',
    },
};

// ──────── Reusable mock chips ────────
const TabsChip: React.FC<{ active?: boolean; label: string; icon?: React.ReactNode }> = ({ active, label, icon }) => (
    <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black ${active ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>
        {icon}{label}
    </span>
);
const SourceTabs: React.FC<{ flex?: boolean }> = ({ flex }) => (
    <div className={`bg-slate-100 p-1 rounded-2xl inline-flex ${flex ? 'w-full justify-center' : ''}`}>
        <TabsChip active label="המלצות AI" icon={<Sparkles className="w-3.5 h-3.5" />} />
        <TabsChip label="הרשימה שלי" icon={<Utensils className="w-3.5 h-3.5" />} />
    </div>
);
const SearchBar: React.FC = () => (
    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-1.5">
        <Search className="w-4 h-4 text-slate-400 ms-1" />
        <span className="flex-grow text-slate-400 text-sm">נסה: מישלן, ראמן, קוקטיילים...</span>
        <span className="bg-orange-600 text-white px-3 min-h-9 rounded-xl font-bold text-xs flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> חיפוש
        </span>
    </div>
);
const CityChips: React.FC<{ wrap?: boolean }> = ({ wrap }) => (
    <div className={`flex items-center gap-1.5 ${wrap ? 'flex-wrap' : 'overflow-x-auto'}`}>
        <span className="px-3.5 py-1.5 rounded-full text-2xs font-black bg-slate-900 text-white whitespace-nowrap">כל המסלול</span>
        <span className="px-3.5 py-1.5 rounded-full text-2xs font-black bg-white text-slate-500 border border-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap">בנגקוק <span className="text-slate-400 text-[10px]">79</span></span>
        <span className="px-3.5 py-1.5 rounded-full text-2xs font-black bg-white text-slate-500 border border-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap">קו צ׳אנג <span className="text-slate-400 text-[10px]">40</span></span>
        <span className="px-3.5 py-1.5 rounded-full text-2xs font-black bg-white text-slate-500 border border-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap">פטאייה <span className="text-slate-400 text-[10px]">48</span></span>
    </div>
);
const ViewToggle: React.FC = () => (
    <div className="bg-slate-100 rounded-xl p-0.5 inline-flex">
        <span className="bg-white text-slate-800 shadow-sm flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold"><List className="w-3.5 h-3.5" /> רשימה</span>
        <span className="text-slate-500 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold"><MapIcon className="w-3.5 h-3.5" /> מפה</span>
    </div>
);
const ActionsDot: React.FC = () => (
    <span className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center"><MoreVertical className="w-4 h-4" /></span>
);
const FilterCard: React.FC<{ collapsed?: boolean }> = ({ collapsed }) => (
    <div className="border border-slate-200 bg-slate-50 rounded-2xl">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black text-slate-700">סינון מפה</span>
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-slate-700 text-white text-[10px] font-black">2</span>
            </span>
            <ChevronLeft className={`w-4 h-4 text-slate-400 ${collapsed ? '' : '-rotate-90'}`} />
        </div>
        {!collapsed && (
            <div className="px-3 pb-3 pt-1 border-t border-slate-200/70 space-y-2 text-2xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-500">סוג:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white border border-orange-600 font-bold">ראמן</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-bold">פיצה</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-bold">המבורגרים</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-500">מחיר:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white border border-emerald-600 font-bold">$$</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-bold">$$$</span>
                </div>
            </div>
        )}
    </div>
);
const ContentBlock: React.FC<{ label: string; height?: number }> = ({ label, height = 80 }) => (
    <div className="bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold" style={{ height }}>
        {label}
    </div>
);

// ──────── Option A — Mobile + Desktop ────────
const OptionAMobile: React.FC = () => (
    <div className="space-y-2.5">
        <SourceTabs flex />
        <SearchBar />
        <CityChips wrap />
        <div className="flex items-center justify-between gap-2">
            <ViewToggle />
            <ActionsDot />
        </div>
        <FilterCard collapsed />
        <ContentBlock label="כרטיסים / מפה" height={250} />
    </div>
);
const OptionADesktop: React.FC = () => (
    <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <SourceTabs />
                <div className="w-80"><SearchBar /></div>
            </div>
            <div className="flex items-center gap-2">
                <ViewToggle />
                <ActionsDot />
            </div>
        </div>
        <CityChips />
        <FilterCard />
        <ContentBlock label="כרטיסים / מפה" height={300} />
    </div>
);

// ──────── Option B — Sticky bottom toolbar ────────
const OptionBMobile: React.FC = () => (
    <div className="space-y-2.5 relative pb-20">
        <SourceTabs flex />
        <SearchBar />
        <div className="overflow-x-auto"><CityChips /></div>
        <ContentBlock label="כרטיסים / מפה" height={350} />
        <div className="fixed bottom-3 inset-x-3 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 flex items-center justify-around" style={{ position: 'absolute' }}>
            <ViewToggle />
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-2xs font-bold text-slate-700 inline-flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> סינון</span>
            <ActionsDot />
        </div>
    </div>
);
const OptionBDesktop: React.FC = () => (
    <div className="space-y-3">
        <div className="flex items-center gap-3">
            <SourceTabs />
            <div className="flex-1"><SearchBar /></div>
            <ViewToggle />
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5"><Filter className="w-4 h-4" /> סינון</span>
            <ActionsDot />
        </div>
        <CityChips />
        <ContentBlock label="כרטיסים / מפה — סינון בתוך התוכן" height={300} />
    </div>
);

// ──────── Option C — Compact + drawer ────────
const OptionCMobile: React.FC = () => (
    <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
            <SourceTabs flex />
            <ActionsDot />
        </div>
        <SearchBar />
        <CityChips wrap />
        <ViewToggle />
        <ContentBlock label="כרטיסים / מפה" height={300} />
        <div className="text-2xs text-slate-400 text-center">⋮ פותח מגירה עם פעולות + סינון</div>
    </div>
);
const OptionCDesktop: React.FC = () => (
    <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <SourceTabs />
                <div className="w-80"><SearchBar /></div>
                <ViewToggle />
            </div>
            <ActionsDot />
        </div>
        <CityChips />
        <div className="grid grid-cols-[200px_1fr] gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-2xs space-y-2">
                <div className="font-black text-slate-700">סינון</div>
                <div className="text-slate-500">סוג, מחיר, מרחק כפאנל קבוע</div>
            </div>
            <ContentBlock label="כרטיסים / מפה" height={250} />
        </div>
    </div>
);
