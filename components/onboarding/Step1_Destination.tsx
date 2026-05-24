import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Plus, Globe2, Sparkles } from 'lucide-react';
import { RippleButton } from '../ui/RippleButton';
import { searchDestinations, DestinationMatch, COUNTRY_FLAGS, WORLD_DESTINATIONS } from '../../utils/geoData';

interface Step1Props {
        onNext: (data: { destination: string }) => void;
        initialData?: { destination: string };
}

const POPULAR_DESTINATIONS = [
        { name: 'תאילנד', country: 'Thailand' },
        { name: 'יפן', country: 'Japan' },
        { name: 'איטליה', country: 'Italy' },
        { name: 'יוון', country: 'Greece' },
        { name: 'הונגריה', country: 'Hungary' },
        { name: 'דובאי', country: 'United Arab Emirates' },
];

const PLACEHOLDER_CYCLE = ['בודפשט', 'Tokyo', 'Patagonia', 'איי בלאריים', 'Bali'];

const fmtChip = (m: DestinationMatch): string => m.kind === 'city'
        ? `${m.hebrew} · ${m.countryHebrew}`
        : m.hebrew;

export const Step1_Destination: React.FC<Step1Props> = ({ onNext, initialData }) => {
        const [inputValue, setInputValue] = useState('');
        const [destinations, setDestinations] = useState<string[]>(
                initialData?.destination ? initialData.destination.split(' - ').filter(Boolean) : []
        );
        const [highlightIdx, setHighlightIdx] = useState(0);
        const [placeholderIdx, setPlaceholderIdx] = useState(0);
        const [showDropdown, setShowDropdown] = useState(false);
        const [openAbove, setOpenAbove] = useState(false);
        const inputWrapRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);

        // Cycle the placeholder so the user knows Hebrew + English + niche
        // destinations all work. This is a Google-PM-style hint that defuses the
        // "I'm not sure if it'll find my city" hesitation.
        useEffect(() => {
                if (inputValue || destinations.length > 0) return;
                const t = setInterval(() => {
                        setPlaceholderIdx(i => (i + 1) % PLACEHOLDER_CYCLE.length);
                }, 2200);
                return () => clearInterval(t);
        }, [inputValue, destinations.length]);

        const matches = useMemo(() => searchDestinations(inputValue, 8), [inputValue]);
        useEffect(() => { setHighlightIdx(0); }, [inputValue]);

        // iOS keyboard-aware: open dropdown ABOVE the input when there's not
        // enough space below. On iOS Safari, `window.innerHeight` does NOT shrink
        // when the keyboard is up — only `visualViewport.height` does. We use the
        // visual viewport when available so the flip-up logic actually fires.
        useEffect(() => {
                if (!showDropdown || !inputWrapRef.current) return;
                const measure = () => {
                        const rect = inputWrapRef.current!.getBoundingClientRect();
                        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
                        const below = viewportHeight - rect.bottom;
                        setOpenAbove(below < 280 && rect.top > below);
                };
                measure();
                window.addEventListener('resize', measure);
                window.visualViewport?.addEventListener('resize', measure);
                return () => {
                        window.removeEventListener('resize', measure);
                        window.visualViewport?.removeEventListener('resize', measure);
                };
        }, [showDropdown, matches.length]);

        const isDuplicate = (label: string) => destinations.some(
                d => d.trim().toLowerCase() === label.trim().toLowerCase()
        );

        const addDestination = (label: string) => {
                const clean = label.trim();
                if (!clean) return;
                if (isDuplicate(clean)) {
                        setInputValue('');
                        return;
                }
                setDestinations(prev => [...prev, clean]);
                setInputValue('');
                inputRef.current?.focus();
        };

        const handleRemove = (idx: number) => {
                setDestinations(prev => prev.filter((_, i) => i !== idx));
        };

        const handlePickMatch = (m: DestinationMatch) => addDestination(fmtChip(m));

        const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const total = totalDropdownRows;
                        if (total === 0) return;
                        setHighlightIdx(i => (i + 1) % total);
                        return;
                }
                if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const total = totalDropdownRows;
                        if (total === 0) return;
                        setHighlightIdx(i => (i - 1 + total) % total);
                        return;
                }
                if (e.key === 'Enter') {
                        e.preventDefault();
                        if (matches[highlightIdx]) {
                                handlePickMatch(matches[highlightIdx]);
                        } else if (inputValue.trim()) {
                                addDestination(inputValue.trim());
                        }
                        return;
                }
                if (e.key === 'Escape') {
                        setShowDropdown(false);
                        return;
                }
                if (e.key === 'Backspace' && !inputValue && destinations.length > 0) {
                        // Remove last chip on backspace from empty input — common pattern.
                        setDestinations(prev => prev.slice(0, -1));
                }
        };

        const handleContinue = () => {
                const finalDestinations = inputValue.trim() && !isDuplicate(inputValue.trim())
                        ? [...destinations, inputValue.trim()]
                        : destinations;
                if (finalDestinations.length > 0) {
                        onNext({ destination: finalDestinations.join(' - ') });
                }
        };

        const showFallbackRow = inputValue.trim().length > 0 &&
                !matches.some(m => m.canonical.toLowerCase() === inputValue.trim().toLowerCase()
                        || m.hebrew.toLowerCase() === inputValue.trim().toLowerCase());

        const totalDropdownRows = matches.length + (showFallbackRow ? 1 : 0);
        const dropdownVisible = showDropdown && (matches.length > 0 || showFallbackRow);

        return (
                <div className="w-full max-w-2xl mx-auto text-center pb-32 md:pb-0" dir="rtl">
                        {/* Header */}
                        <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="mb-6 md:mb-10"
                        >
                                <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm"
                                >
                                        <MapPin className="w-7 h-7 md:w-8 md:h-8 text-brand-action" />
                                </motion.div>

                                <h2 className="text-3xl md:text-5xl font-black text-brand-navy mb-3 md:mb-4 tracking-tight">
                                        לאן ההרפתקה הבאה<br />תיקח אתכם?
                                </h2>
                                <p className="text-base md:text-lg text-slate-500 font-medium px-4">
                                        התחילו להקליד — עברית או אנגלית, גם אם לא בטוחים בכתיב
                                </p>
                        </motion.div>

                        {/* Searchable input + dropdown */}
                        <div className="relative max-w-xl mx-auto mb-6 md:mb-10 px-3 md:px-0">
                                <div ref={inputWrapRef} className="relative group">
                                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400 group-focus-within:text-brand-action transition-colors pointer-events-none" />
                                        <input
                                                ref={inputRef}
                                                type="text"
                                                value={inputValue}
                                                onChange={(e) => { setInputValue(e.target.value); setShowDropdown(true); }}
                                                onFocus={() => setShowDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                                                onKeyDown={handleInputKeyDown}
                                                placeholder={destinations.length === 0
                                                        ? `נסו '${PLACEHOLDER_CYCLE[placeholderIdx]}'…`
                                                        : 'הוסיפו יעד נוסף…'}
                                                className="w-full bg-white border border-slate-200 text-slate-800 text-lg md:text-xl font-medium placeholder:text-slate-300 rounded-2xl py-4 md:py-5 pr-14 pl-4 shadow-xl shadow-brand-navy/5 focus:outline-none focus:ring-4 focus:ring-brand-action/10 focus:border-brand-action/50 transition-all hover:shadow-2xl hover:shadow-brand-navy/10 text-right"
                                                aria-autocomplete="list"
                                                aria-expanded={dropdownVisible}
                                                aria-controls="destination-listbox"
                                                aria-activedescendant={dropdownVisible ? `dest-row-${highlightIdx}` : undefined}
                                                autoFocus
                                                // Suppress browser/OS autofill prompts (Android Inline Autofill,
                                                // 1Password, LastPass, etc.) — this is a search input, not a
                                                // credentials field.
                                                autoComplete="off"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                                spellCheck={false}
                                                inputMode="search"
                                                name="trip-destination-search"
                                                data-1p-ignore
                                                data-lpignore="true"
                                                data-form-type="other"
                                        />
                                        {inputValue && (
                                                <button
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => addDestination(inputValue.trim())}
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                        aria-label="הוסף יעד מותאם"
                                                >
                                                        <Plus className="w-5 h-5" />
                                                </button>
                                        )}
                                </div>

                                {/* Dropdown */}
                                <AnimatePresence>
                                        {dropdownVisible && (
                                                <motion.div
                                                        id="destination-listbox"
                                                        role="listbox"
                                                        initial={{ opacity: 0, y: openAbove ? 8 : -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: openAbove ? 8 : -8 }}
                                                        transition={{ duration: 0.12 }}
                                                        className={`absolute z-30 left-3 right-3 md:left-0 md:right-0 ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[60vh] overflow-y-auto`}
                                                        style={{ direction: 'rtl' }}
                                                >
                                                        {matches.map((m, i) => {
                                                                const isCity = m.kind === 'city';
                                                                const isHi = i === highlightIdx;
                                                                return (
                                                                        <button
                                                                                key={`${m.kind}-${m.canonical}-${m.country}`}
                                                                                id={`dest-row-${i}`}
                                                                                type="button"
                                                                                role="option"
                                                                                aria-selected={isHi}
                                                                                onMouseDown={(e) => e.preventDefault()}
                                                                                onMouseEnter={() => setHighlightIdx(i)}
                                                                                onClick={() => handlePickMatch(m)}
                                                                                className={`w-full text-right flex items-center gap-3 px-4 py-3 min-h-[56px] transition-colors ${isHi ? 'bg-brand-action/8' : 'hover:bg-slate-50'}`}
                                                                        >
                                                                                <span className="text-2xl shrink-0" aria-hidden>{m.flag}</span>
                                                                                <div className="flex-1 min-w-0 text-right">
                                                                                        <div className="flex items-center gap-2 justify-end">
                                                                                                <span className="font-bold text-slate-800 text-base truncate">{m.hebrew}</span>
                                                                                                {isCity ? (
                                                                                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                                                ) : (
                                                                                                        <Globe2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                                                )}
                                                                                        </div>
                                                                                        {isCity && (
                                                                                                <div className="text-xs text-slate-400 mt-0.5 text-right truncate">
                                                                                                        {m.countryHebrew}
                                                                                                </div>
                                                                                        )}
                                                                                </div>
                                                                        </button>
                                                                );
                                                        })}
                                                        {showFallbackRow && (
                                                                <button
                                                                        key="fallback"
                                                                        id={`dest-row-${matches.length}`}
                                                                        type="button"
                                                                        role="option"
                                                                        aria-selected={highlightIdx === matches.length}
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onMouseEnter={() => setHighlightIdx(matches.length)}
                                                                        onClick={() => addDestination(inputValue.trim())}
                                                                        className={`w-full text-right flex items-center gap-3 px-4 py-3 min-h-[56px] border-t border-slate-100 transition-colors ${highlightIdx === matches.length ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                                                                >
                                                                        <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                                                <Plus className="w-4 h-4" />
                                                                        </span>
                                                                        <div className="flex-1 text-right text-sm text-slate-700">
                                                                                <span className="font-bold">הוסף "{inputValue.trim()}"</span>
                                                                                <span className="text-slate-400"> כיעד מותאם</span>
                                                                        </div>
                                                                </button>
                                                        )}
                                                </motion.div>
                                        )}
                                </AnimatePresence>

                                {/* Selected chips */}
                                <div className="flex flex-wrap gap-2 justify-center mt-4" aria-live="polite">
                                        <AnimatePresence>
                                                {destinations.map((dest, idx) => (
                                                        <motion.div
                                                                key={`${dest}-${idx}`}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                className="flex items-center gap-1.5 bg-brand-navy/5 text-brand-navy px-4 py-2 rounded-full text-base font-bold border border-brand-navy/10 max-w-full"
                                                        >
                                                                <span className="truncate">{dest}</span>
                                                                <button
                                                                        onClick={() => handleRemove(idx)}
                                                                        className="hover:bg-black/5 rounded-full p-0.5 transition-colors shrink-0"
                                                                        aria-label={`הסר ${dest}`}
                                                                >
                                                                        <X className="w-4 h-4" />
                                                                </button>
                                                        </motion.div>
                                                ))}
                                        </AnimatePresence>
                                </div>
                        </div>

                        {/* Popular shortcuts */}
                        <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex flex-wrap justify-center gap-2 md:gap-3 px-3"
                        >
                                {POPULAR_DESTINATIONS.map((dest, i) => {
                                        const flag = COUNTRY_FLAGS[dest.country] || '🌐';
                                        return (
                                                <motion.button
                                                        key={dest.name}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: 0.6 + (i * 0.06) }}
                                                        whileHover={{ scale: 1.05, backgroundColor: '#f1f5f9' }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => addDestination(dest.name)}
                                                        className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white border border-slate-100 rounded-full shadow-sm text-slate-600 font-medium hover:border-brand-action/30 hover:text-brand-action transition-all min-h-[44px]"
                                                >
                                                        <span className="text-lg" aria-hidden>{flag}</span>
                                                        <span>{dest.name}</span>
                                                </motion.button>
                                        );
                                })}
                        </motion.div>

                        {/* Inline catalog hint — calms the "is my city in the list?" anxiety */}
                        <p className="text-xs text-slate-400 mt-5 px-3 flex items-center justify-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                <span>{Object.keys(WORLD_DESTINATIONS).length}+ מדינות ו-{Object.values(WORLD_DESTINATIONS).reduce((n, a) => n + a.length, 0)}+ ערים — וגם כל יעד אחר שתקלידו</span>
                        </p>

                        {/* Continue button — sticky to the bottom of the modal scroll
                            area on desktop so it stays in view even when the user has
                            many country chips visible. Mobile has its own fixed bar
                            below this block. User reported 2026-05-21 that the button
                            was scrolling off-screen at smaller viewports. */}
                        <div className="hidden md:flex sticky bottom-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mt-8 items-center justify-center bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
                                <AnimatePresence>
                                        {(destinations.length > 0 || inputValue.length > 1) ? (
                                                <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                >
                                                        <RippleButton
                                                                onClick={handleContinue}
                                                                className="px-12 py-4 text-xl shadow-brand-action/40"
                                                        >
                                                                המשך לתאריכים{destinations.length > 0 ? ` (${destinations.length})` : ''}
                                                        </RippleButton>
                                                </motion.div>
                                        ) : (
                                                // Disabled placeholder — keeps the sticky bar's height stable
                                                // so the layout doesn't jump the moment the user starts typing.
                                                <button
                                                        disabled
                                                        className="px-12 py-4 text-xl font-black bg-slate-100 text-slate-400 rounded-2xl cursor-not-allowed"
                                                >
                                                        בחרו יעד כדי להמשיך
                                                </button>
                                        )}
                                </AnimatePresence>
                        </div>

                        <AnimatePresence>
                                {(destinations.length > 0 || inputValue.length > 1) && (
                                        <motion.div
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 30 }}
                                                className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 py-3 pb-[max(env(safe-area-inset-bottom,0px),12px)] shadow-[0_-8px_24px_rgba(15,23,42,0.06)]"
                                                dir="rtl"
                                        >
                                                <RippleButton
                                                        onClick={handleContinue}
                                                        className="w-full px-6 py-3.5 text-base shadow-brand-action/40"
                                                >
                                                        המשך לתאריכים{destinations.length > 0 ? ` (${destinations.length})` : ''}
                                                </RippleButton>
                                        </motion.div>
                                )}
                        </AnimatePresence>
                </div>
        );
};
