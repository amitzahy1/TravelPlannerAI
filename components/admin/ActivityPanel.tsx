import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, History, Trash2, RotateCcw, User as UserIcon, Plus, Minus, ArrowUpRight,
    Hotel, Utensils, Camera, Clock, ShieldCheck,
} from 'lucide-react';
import { Trip } from '../../types';
import { restoreFromTrash, undoActivityEntry, TRASH_RETENTION_DAYS, ActivityEntry, TrashEntry } from '../../services/activityLog';
import { toast } from '../../stores/useToastStore';

interface Props {
    trip: Trip;
    onUpdateTrip: (t: Trip) => void;
    actorUid: string;
    actorName: string;
}

const ICON_BY_TYPE: Record<string, React.ComponentType<{ className?: string }>> = {
    restaurant: Utensils,
    attraction: Camera,
    hotel: Hotel,
    itinerary: Activity,
    note: Activity,
};

const COLOR_BY_TYPE: Record<string, string> = {
    restaurant: 'text-orange-600 bg-orange-50 border-orange-100',
    attraction: 'text-violet-600 bg-violet-50 border-violet-100',
    hotel: 'text-sky-600 bg-sky-50 border-sky-100',
    itinerary: 'text-slate-600 bg-slate-50 border-slate-100',
    note: 'text-slate-600 bg-slate-50 border-slate-100',
};

const TYPE_LABEL_HE: Record<string, string> = {
    restaurant: 'מסעדה',
    attraction: 'אטרקציה',
    hotel: 'מלון',
    itinerary: 'יומן',
    note: 'הערה',
};

const formatRelative = (ts: number): string => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'כעת';
    if (m < 60) return `לפני ${m} דקות`;
    const h = Math.floor(m / 60);
    if (h < 24) return `לפני ${h} שעות`;
    const d = Math.floor(h / 24);
    if (d < 7) return `לפני ${d} ימים`;
    return new Date(ts).toLocaleDateString('he-IL');
};

const daysUntilExpiry = (deletedAt: number): number => {
    const expiresAt = deletedAt + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
};

export const ActivityPanel: React.FC<Props> = ({ trip, onUpdateTrip, actorUid, actorName }) => {
    const [tab, setTab] = useState<'activity' | 'trash'>('activity');
    const log: ActivityEntry[] = (trip.activityLog || []) as ActivityEntry[];
    const trash: TrashEntry[] = (trip.trash || []) as TrashEntry[];
    const sortedLog = [...log].sort((a, b) => b.ts - a.ts);
    const sortedTrash = [...trash].sort((a, b) => b.deletedAt - a.deletedAt);

    const handleUndo = (entry: ActivityEntry) => {
        const next = undoActivityEntry(trip, entry.id, { uid: actorUid, name: actorName });
        onUpdateTrip(next);
        toast.success(entry.action === 'add' ? 'הוספה בוטלה' : 'הפעולה בוטלה');
    };

    const handleRestore = (entry: TrashEntry) => {
        const next = restoreFromTrash(trip, entry.trashId, { uid: actorUid, name: actorName });
        onUpdateTrip(next);
        toast.success(`${(entry.item as any).name || 'פריט'} שוחזר`);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> ניהול שינויים
                </h3>
                <div className="flex items-center bg-slate-100 rounded-full p-1 text-xs font-bold">
                    <button
                        onClick={() => setTab('activity')}
                        className={`px-3 py-1 rounded-full transition-colors ${tab === 'activity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        <span className="inline-flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> פעילות</span>
                    </button>
                    <button
                        onClick={() => setTab('trash')}
                        className={`px-3 py-1 rounded-full transition-colors ${tab === 'trash' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        <span className="inline-flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> פריטים שנמחקו {sortedTrash.length > 0 && <span className="px-1.5 rounded-full bg-rose-100 text-rose-700 text-[10px]">{sortedTrash.length}</span>}</span>
                    </button>
                </div>
            </div>

            <p className="px-5 pb-3 text-xs text-slate-500">
                {tab === 'activity'
                    ? 'כל שינוי שמשתפי הטיול עושים נרשם כאן. אפשר לבטל פעולה אחרונה בקליק.'
                    : `פריטים שנמחקו נשמרים ${TRASH_RETENTION_DAYS} ימים לפני מחיקה סופית.`}
            </p>

            <div className="border-t border-slate-100 max-h-[420px] overflow-y-auto">
                <AnimatePresence mode="wait">
                    {tab === 'activity' ? (
                        <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {sortedLog.length === 0 ? (
                                <EmptyState icon={<Activity className="w-6 h-6" />} text="אין שינויים מתועדים עדיין" />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {sortedLog.map(entry => {
                                        const Icon = ICON_BY_TYPE[entry.entityType] || Activity;
                                        const color = COLOR_BY_TYPE[entry.entityType] || 'text-slate-600 bg-slate-50 border-slate-100';
                                        const canUndo = entry.action === 'add' || entry.action === 'delete';
                                        const ActionIcon = entry.action === 'add' ? Plus : entry.action === 'delete' ? Minus : entry.action === 'restore' ? RotateCcw : ArrowUpRight;
                                        const actionLabel =
                                            entry.action === 'add' ? 'הוסיף/ה'
                                                : entry.action === 'delete' ? 'מחק/ה'
                                                    : entry.action === 'restore' ? 'שחזר/ה'
                                                        : 'עדכן/ה';
                                        return (
                                            <li key={entry.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                                        <ActionIcon className="w-3 h-3 text-slate-400" />
                                                        <span>{actionLabel}</span>
                                                        <span className="font-black">{TYPE_LABEL_HE[entry.entityType] || entry.entityType}</span>
                                                        <span className="text-slate-500 truncate min-w-0">— {entry.entityName}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                                        <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" /> {entry.actorName}</span>
                                                        <span>·</span>
                                                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelative(entry.ts)}</span>
                                                        {entry.categoryTitle && <><span>·</span><span className="truncate">{entry.categoryTitle}</span></>}
                                                    </div>
                                                </div>
                                                {canUndo && (
                                                    <button
                                                        onClick={() => handleUndo(entry)}
                                                        title="בטל פעולה"
                                                        className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95"
                                                    >
                                                        <RotateCcw className="w-3 h-3" /> בטל
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {sortedTrash.length === 0 ? (
                                <EmptyState icon={<Trash2 className="w-6 h-6" />} text="הפח ריק" />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {sortedTrash.map(entry => {
                                        const Icon = ICON_BY_TYPE[entry.entityType] || Activity;
                                        const color = COLOR_BY_TYPE[entry.entityType] || 'text-slate-600 bg-slate-50 border-slate-100';
                                        const days = daysUntilExpiry(entry.deletedAt);
                                        const name = (entry.item as any).name || '—';
                                        return (
                                            <li key={entry.trashId} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-slate-800 truncate">{name}</div>
                                                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span>{TYPE_LABEL_HE[entry.entityType] || entry.entityType}</span>
                                                        <span>·</span>
                                                        <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" /> {entry.deletedByName}</span>
                                                        <span>·</span>
                                                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelative(entry.deletedAt)}</span>
                                                        <span>·</span>
                                                        <span className={`font-bold ${days < 3 ? 'text-rose-600' : 'text-slate-500'}`}>{days} ימים נותרו</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRestore(entry)}
                                                    className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all active:scale-95"
                                                >
                                                    <RotateCcw className="w-3 h-3" /> שחזר
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <div className="px-5 py-10 flex flex-col items-center gap-2 text-slate-300">
        {icon}
        <span className="text-sm font-bold text-slate-400">{text}</span>
    </div>
);
