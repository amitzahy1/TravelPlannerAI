/**
 * Layers panel — desktop: rendered as sidebar content (parent owns the <aside>).
 * Mobile: rendered inside the parent's bottom-sheet wrapper.
 *
 * Pure presentational — owns no state. FullTripMapView holds all preferences.
 */

import React from 'react';
import {
        Map as MapIcon, Building2, ListChecks, Utensils, Star,
        AlertTriangle, Footprints, X,
} from 'lucide-react';
import { MapPreferences } from '../../hooks/useMapPreferences';

// ── Toggle switch (iOS-style) ────────────────────────────────────────────────
interface ToggleProps {
        checked: boolean;
        onChange: (next: boolean) => void;
        label: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
        <button
                onClick={() => onChange(!checked)}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400 ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}
                role="switch"
                aria-checked={checked}
                aria-label={label}
        >
                <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
                />
        </button>
);

// ── Layer row ────────────────────────────────────────────────────────────────
interface LayerRowProps {
        label: string;
        checked: boolean;
        onChange: (next: boolean) => void;
        icon: React.ReactNode;
        accentColor: string;
        count?: number;
        helpText?: string; // optional explainer rendered below the label
}

const LayerRow: React.FC<LayerRowProps> = ({ label, checked, onChange, icon, accentColor, count, helpText }) => (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${accentColor}1a`, color: accentColor }}
                >
                        {icon}
                </span>
                <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-700 leading-snug">{label}</div>
                        {helpText && (
                                <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{helpText}</div>
                        )}
                </div>
                {typeof count === 'number' && count > 0 && (
                        <span className="text-[11px] font-black text-slate-400 tabular-nums mt-1">{count}</span>
                )}
                <div className="mt-0.5">
                        <Toggle checked={checked} onChange={onChange} label={label} />
                </div>
        </div>
);

// ── Section header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="px-3 pt-4 pb-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{children}</span>
        </div>
);

// ── Main panel ───────────────────────────────────────────────────────────────
interface LayersPanelProps {
        prefs: MapPreferences;
        onPrefChange: (patch: Partial<MapPreferences>) => void;
        counts: {
                hotels: number;
                myLists: number;
                aiRestaurants: number;
                aiAttractions: number;
        };
        missingCount: number;
        onMissingClick: () => void;
        onClose?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
        prefs,
        onPrefChange,
        counts,
        missingCount,
        onMissingClick,
        onClose,
}) => (
        <div className="flex flex-col h-full" dir="rtl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight">שכבות מפה</h3>
                        <div className="flex items-center gap-2">
                                {missingCount > 0 && (
                                        <button
                                                onClick={onMissingClick}
                                                className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                                                title={`${missingCount} פריטים חסרים בטיול`}
                                        >
                                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                <span className="text-[10px] font-black text-amber-700">{missingCount}</span>
                                        </button>
                                )}
                                {onClose && (
                                        <button
                                                onClick={onClose}
                                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                                                aria-label="סגור פנל שכבות"
                                        >
                                                <X className="w-4 h-4" />
                                        </button>
                                )}
                        </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto py-1">
                        <SectionHeader>הצגה</SectionHeader>
                        <LayerRow
                                label="מסלול הטיול"
                                checked={prefs.route}
                                onChange={v => onPrefChange({ route: v })}
                                icon={<MapIcon className="w-3.5 h-3.5" />}
                                accentColor="#2563eb"
                        />
                        <LayerRow
                                label="מלונות"
                                checked={prefs.hotels}
                                onChange={v => onPrefChange({ hotels: v })}
                                icon={<Building2 className="w-3.5 h-3.5" />}
                                accentColor="#0ea5e9"
                                count={counts.hotels}
                        />
                        <LayerRow
                                label="הרשימות שלי"
                                checked={prefs.myLists}
                                onChange={v => onPrefChange({ myLists: v })}
                                icon={<ListChecks className="w-3.5 h-3.5" />}
                                accentColor="#a855f7"
                                count={counts.myLists}
                        />
                        <LayerRow
                                label="אוכל מומלץ (AI)"
                                checked={prefs.aiRestaurants}
                                onChange={v => onPrefChange({ aiRestaurants: v })}
                                icon={<Utensils className="w-3.5 h-3.5" />}
                                accentColor="#f97316"
                                count={counts.aiRestaurants}
                        />
                        <LayerRow
                                label="אטרקציות (AI)"
                                checked={prefs.aiAttractions}
                                onChange={v => onPrefChange({ aiAttractions: v })}
                                icon={<Star className="w-3.5 h-3.5" />}
                                accentColor="#8b5cf6"
                                count={counts.aiAttractions}
                        />

                        <SectionHeader>תצוגה</SectionHeader>
                        <LayerRow
                                label="טווח הליכה מהמלון"
                                helpText="עיגולים סביב כל מלון: 1.2 ק״מ (15 דק׳ הליכה) ו-2.4 ק״מ (30 דק׳). שימושי לאתר מסעדות ואטרקציות בקרבת מקום."
                                checked={prefs.walkingCircles}
                                onChange={v => onPrefChange({ walkingCircles: v })}
                                icon={<Footprints className="w-3.5 h-3.5" />}
                                accentColor="#10b981"
                        />
                </div>
        </div>
);
