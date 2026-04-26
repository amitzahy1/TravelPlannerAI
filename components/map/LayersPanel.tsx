/**
 * Sticky-right panel (desktop) / bottom sheet (mobile) on the unified
 * trip map. Toggles visibility of map layers, walking circles, theme,
 * heatmap mode, and exposes the missing-data summary pill.
 *
 * Pure presentational — owns no state of its own. The parent
 * (FullTripMapView) holds all preferences via `useMapPreferences`.
 */

import React from 'react';
import { Map as MapIcon, Building2, ListChecks, Utensils, Star, AlertTriangle, Footprints, Flame, Moon, Sun, X } from 'lucide-react';
import { MapPreferences } from '../../hooks/useMapPreferences';

interface LayerCheckboxProps {
        id: string;
        label: string;
        checked: boolean;
        onChange: (next: boolean) => void;
        icon: React.ReactNode;
        accentColor: string;
        count?: number;
}

const LayerCheckbox: React.FC<LayerCheckboxProps> = ({ id, label, checked, onChange, icon, accentColor, count }) => (
        <label
                htmlFor={id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${checked ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-transparent'}`}
        >
                <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={e => onChange(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        style={{ accentColor }}
                        aria-label={label}
                />
                <span className="flex-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <span style={{ color: accentColor }}>{icon}</span>
                        {label}
                </span>
                {typeof count === 'number' && count > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 min-w-[20px] text-center">
                                {count}
                        </span>
                )}
        </label>
);

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
        // Mobile bottom-sheet support: when `mobileOpen` and `onMobileClose`
        // are provided, the panel renders inline content; the parent owns
        // the sheet wrapper. Desktop callers leave both undefined and the
        // panel renders as a sticky card.
        onClose?: () => void;
        layout: 'desktop' | 'mobile';
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
        prefs,
        onPrefChange,
        counts,
        missingCount,
        onMissingClick,
        onClose,
        layout,
}) => {
        const wrapperClasses = layout === 'desktop'
                ? 'absolute top-4 right-4 z-[1000] w-64 max-h-[calc(100vh-2rem)] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 p-3 space-y-2'
                : 'w-full bg-white p-4 space-y-2';

        return (
                <div className={wrapperClasses} dir="rtl">
                        <div className="flex items-center justify-between px-1 pb-1">
                                <h3 className="text-sm font-black text-slate-800">שכבות במפה</h3>
                                {onClose && (
                                        <button
                                                onClick={onClose}
                                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                                                aria-label="סגור פנל שכבות"
                                        >
                                                <X className="w-4 h-4" />
                                        </button>
                                )}
                        </div>

                        <LayerCheckbox
                                id="layer-route"
                                label="מסלול הטיול"
                                checked={prefs.route}
                                onChange={v => onPrefChange({ route: v })}
                                icon={<MapIcon className="w-4 h-4" />}
                                accentColor="#2563eb"
                        />
                        <LayerCheckbox
                                id="layer-hotels"
                                label="מלונות"
                                checked={prefs.hotels}
                                onChange={v => onPrefChange({ hotels: v })}
                                icon={<Building2 className="w-4 h-4" />}
                                accentColor="#0ea5e9"
                                count={counts.hotels}
                        />
                        <LayerCheckbox
                                id="layer-mylists"
                                label="הרשימות שלי"
                                checked={prefs.myLists}
                                onChange={v => onPrefChange({ myLists: v })}
                                icon={<ListChecks className="w-4 h-4" />}
                                accentColor="#a855f7"
                                count={counts.myLists}
                        />
                        <LayerCheckbox
                                id="layer-airestaurants"
                                label="אוכל מומלץ (AI)"
                                checked={prefs.aiRestaurants}
                                onChange={v => onPrefChange({ aiRestaurants: v })}
                                icon={<Utensils className="w-4 h-4" />}
                                accentColor="#f97316"
                                count={counts.aiRestaurants}
                        />
                        <LayerCheckbox
                                id="layer-aiattractions"
                                label="אטרקציות מומלצות (AI)"
                                checked={prefs.aiAttractions}
                                onChange={v => onPrefChange({ aiAttractions: v })}
                                icon={<Star className="w-4 h-4" />}
                                accentColor="#8b5cf6"
                                count={counts.aiAttractions}
                        />

                        <div className="my-2 h-px bg-slate-200" />

                        {/* Extras: walking circles + heatmap + theme */}
                        <LayerCheckbox
                                id="extra-walking"
                                label="מעגל הליכה (15/30 דק׳)"
                                checked={prefs.walkingCircles}
                                onChange={v => onPrefChange({ walkingCircles: v })}
                                icon={<Footprints className="w-4 h-4" />}
                                accentColor="#10b981"
                        />
                        <LayerCheckbox
                                id="extra-heatmap"
                                label="מפת צפיפות (AI)"
                                checked={prefs.heatmap}
                                onChange={v => onPrefChange({ heatmap: v })}
                                icon={<Flame className="w-4 h-4" />}
                                accentColor="#ef4444"
                        />

                        <button
                                onClick={() => onPrefChange({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent text-sm font-bold text-slate-700"
                        >
                                <span className="flex items-center gap-2">
                                        {prefs.theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                        ערכת מפה: {prefs.theme === 'dark' ? 'כהה' : 'בהירה'}
                                </span>
                                <span className="text-[10px] font-black text-slate-400">החלף</span>
                        </button>

                        {missingCount > 0 && (
                                <>
                                        <div className="my-2 h-px bg-slate-200" />
                                        <button
                                                onClick={onMissingClick}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors text-sm font-bold text-amber-800"
                                        >
                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                <span className="flex-1 text-right">{missingCount} פריטים חסרים בטיול</span>
                                                <span className="text-[10px] font-black text-amber-600">פרט</span>
                                        </button>
                                </>
                        )}
                </div>
        );
};
