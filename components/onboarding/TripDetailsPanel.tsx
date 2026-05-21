/**
 * Shared collapsible "Trip details" panel rendered inline in each Step 3
 * import method (PDF / Text / Mailbox). Lets the user OPTIONALLY add:
 *   • Specific cities they'll visit — via typeahead dropdown against
 *     `WORLD_DESTINATIONS` (NOT free text — free text breaks the rest of
 *     the site, per user direction).
 *   • Traveler counts — adults / children / babies.
 *
 * Why inline in Step 3 and not Step 1: the user wanted the hint UI right
 * next to the input the AI is about to read. Hints are passed through to
 * `parseFreeTextTrip` / `analyzeTripFiles` so the model has city + group
 * context BEFORE it extracts hotels/flights/etc.
 *
 * Stateless — owns nothing. State lives in MagicalWizard.tsx so it survives
 * navigation between steps.
 */

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Plus, X, Users, ChevronDown, Search, User, Heart, Baby, UsersRound, Briefcase } from 'lucide-react';
import { searchDestinations, type DestinationMatch } from '../../utils/geoData';
import type { TravelersComposition, Trip } from '../../types';

export type GroupType = NonNullable<Trip['groupType']>;

interface Props {
    /** Country / destination string from Step 1, used to bias city search results. */
    country?: string;
    cities: string[];
    travelers: TravelersComposition;
    groupType?: GroupType;
    onCitiesChange: (next: string[]) => void;
    onTravelersChange: (next: TravelersComposition) => void;
    onGroupTypeChange: (next: GroupType | undefined) => void;
}

const GROUP_TYPE_OPTIONS: { id: GroupType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'solo', label: 'יחיד', icon: User },
    { id: 'couple', label: 'זוג', icon: Heart },
    { id: 'family', label: 'משפחה', icon: Baby },
    { id: 'friends', label: 'חברים', icon: Users },
    { id: 'group', label: 'קבוצה', icon: UsersRound },
    { id: 'business', label: 'עסקים', icon: Briefcase },
];

const formatChip = (m: DestinationMatch): string =>
    m.kind === 'city' ? `${m.hebrew} · ${m.countryHebrew}` : m.hebrew;

const Stepper: React.FC<{
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    sub?: string;
}> = ({ label, value, onChange, min = 0, max = 20, sub }) => {
    const safe = (v: number) => Math.max(min, Math.min(max, v));
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex-1 min-w-0">
                <div className="font-bold text-brand-navy text-sm">{label}</div>
                {sub && <div className="text-xs text-slate-400">{sub}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={() => onChange(safe(value - 1))}
                    disabled={value <= min}
                    className="w-9 h-9 rounded-full border border-slate-200 text-brand-navy font-bold hover:bg-slate-50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label={`Decrease ${label}`}
                >
                    −
                </button>
                <div className="w-8 text-center font-black text-brand-navy text-base tabular-nums">{value}</div>
                <button
                    type="button"
                    onClick={() => onChange(safe(value + 1))}
                    disabled={value >= max}
                    className="w-9 h-9 rounded-full border border-slate-200 text-brand-navy font-bold hover:bg-slate-50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label={`Increase ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
};

export const TripDetailsPanel: React.FC<Props> = ({
    country,
    cities,
    travelers,
    groupType,
    onCitiesChange,
    onTravelersChange,
    onGroupTypeChange,
}) => {
    const [open, setOpen] = useState(false);
    const [cityQuery, setCityQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const totalTravelers = travelers.adults + travelers.children + travelers.babies;
    const hasAnyData = cities.length > 0 || totalTravelers > 0 || !!groupType;

    // Bias search results: if a country was picked in Step 1 (e.g. "אלבניה"),
    // include it in the search query so country-scoped cities float up first.
    // searchDestinations is fuzzy/score-based, so adding country context
    // doesn't hurt — it just biases results without filtering anyone out.
    const matches = useMemo(() => {
        if (!cityQuery.trim()) return [];
        return searchDestinations(cityQuery, 8).filter(m => m.kind === 'city');
    }, [cityQuery]);

    const addCity = (label: string) => {
        const clean = label.trim();
        if (!clean) return;
        if (cities.some(c => c.toLowerCase() === clean.toLowerCase())) {
            setCityQuery('');
            return;
        }
        onCitiesChange([...cities, clean]);
        setCityQuery('');
        inputRef.current?.focus();
    };

    const removeCity = (idx: number) => {
        onCitiesChange(cities.filter((_, i) => i !== idx));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx(i => (i + 1) % Math.max(matches.length, 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx(i => (i - 1 + Math.max(matches.length, 1)) % Math.max(matches.length, 1));
        } else if (e.key === 'Enter' && matches[highlightIdx]) {
            e.preventDefault();
            addCity(formatChip(matches[highlightIdx]));
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" dir="rtl">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-right"
                aria-expanded={open}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-right min-w-0">
                        <div className="font-bold text-brand-navy text-sm">פרטים נוספים לדיוק הזיהוי</div>
                        <div className="text-xs text-slate-500">
                            {hasAnyData
                                ? [
                                        cities.length > 0 ? `${cities.length} ערים` : null,
                                        groupType ? GROUP_TYPE_OPTIONS.find(o => o.id === groupType)?.label : null,
                                        totalTravelers > 0 ? `${totalTravelers} מטיילים` : null,
                                ].filter(Boolean).join(' · ')
                                : 'אופציונלי — עוזר ל-AI לזהות יותר טוב ערים, חדרים והסעות'}
                        </div>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1 space-y-5 border-t border-slate-100">

                            {/* Cities section */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-2 mt-3">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ערים בטיול</span>
                                </div>
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={cityQuery}
                                        onChange={(e) => { setCityQuery(e.target.value); setShowDropdown(true); setHighlightIdx(0); }}
                                        onFocus={() => setShowDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={country ? `הקלידו עיר ב${country}…` : 'הקלידו שם עיר…'}
                                        className="w-full bg-white border border-slate-200 text-brand-navy text-sm font-medium rounded-xl py-2.5 pr-10 pl-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                    />
                                    {/* Dropdown */}
                                    <AnimatePresence>
                                        {showDropdown && matches.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{ duration: 0.12 }}
                                                className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto"
                                                style={{ direction: 'rtl' }}
                                            >
                                                {matches.map((m, i) => (
                                                    <button
                                                        key={`${m.kind}-${m.canonical}-${m.country}`}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onMouseEnter={() => setHighlightIdx(i)}
                                                        onClick={() => addCity(formatChip(m))}
                                                        className={`w-full text-right flex items-center gap-2 px-3 py-2 min-h-[44px] transition-colors ${i === highlightIdx ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                                    >
                                                        <span className="text-lg shrink-0" aria-hidden>{m.flag}</span>
                                                        <div className="flex-1 min-w-0 text-right">
                                                            <div className="font-bold text-slate-800 text-sm truncate">{m.hebrew}</div>
                                                            <div className="text-xs text-slate-400 truncate">{m.countryHebrew}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Chips */}
                                {cities.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        <AnimatePresence>
                                            {cities.map((c, idx) => (
                                                <motion.div
                                                    key={`${c}-${idx}`}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100"
                                                >
                                                    <span>{c}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCity(idx)}
                                                        className="hover:bg-indigo-100 rounded-full p-0.5 -mr-1"
                                                        aria-label={`Remove ${c}`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}

                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                    אם הוספתם ערים — ה-AI יחפש מלונות, טיסות ואטרקציות בערים האלה ולא בכל המדינה.
                                </p>
                            </div>

                            {/* Travelers section */}
                            <div className="border-t border-slate-100 pt-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">מי מטיילים?</span>
                                </div>

                                {/* Group type chips — quick presets. Picking one is enough; the
                                    steppers below stay visible as optional refinement. Picking
                                    a different chip swaps; clicking the same chip clears it. */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {GROUP_TYPE_OPTIONS.map(opt => {
                                        const Icon = opt.icon;
                                        const isSelected = groupType === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => onGroupTypeChange(isSelected ? undefined : opt.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                                }`}
                                                aria-pressed={isSelected}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                                    בחרו סוג קבוצה במקום לספור אנשים — או הוסיפו כמויות מדויקות למטה אם הן ידועות.
                                </p>

                                <Stepper
                                    label="מבוגרים"
                                    sub="גילאי 12+"
                                    value={travelers.adults}
                                    onChange={(v) => onTravelersChange({ ...travelers, adults: v })}
                                    min={0}
                                    max={20}
                                />
                                <Stepper
                                    label="ילדים"
                                    sub="גילאי 2–11"
                                    value={travelers.children}
                                    onChange={(v) => onTravelersChange({ ...travelers, children: v })}
                                    min={0}
                                    max={15}
                                />
                                <Stepper
                                    label="תינוקות"
                                    sub="גיל 0–2"
                                    value={travelers.babies}
                                    onChange={(v) => onTravelersChange({ ...travelers, babies: v })}
                                    min={0}
                                    max={10}
                                />
                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                    מסייע ל-AI לוודא שכמות החדרים במלון מתאימה לקבוצה ולחשב כמה הסעות צריך.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
