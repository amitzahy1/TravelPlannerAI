import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { TextField } from './ui/Form';
import { Check, Link as LinkIcon, ImageOff, Move, RotateCcw } from 'lucide-react';
import { getDestinationCoverCandidates } from '../utils/destinationCover';

// Bullet-proof fallback: a known-good Unsplash photo we control. Used
// whenever a primary Unsplash ID 404s. Two different fallback IDs cycle
// across thumbnails so the same photo doesn't repeat after errors.
const FALLBACK_URLS = [
        'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80',
];

interface CoverThumbnailProps {
        url: string;
        active: boolean;
        onSelect: (finalUrl: string) => void;
}

const CoverThumbnail: React.FC<CoverThumbnailProps> = ({ url, active, onSelect }) => {
        const [src, setSrc] = useState(url);
        const [errored, setErrored] = useState(false);
        useEffect(() => { setSrc(url); setErrored(false); }, [url]);
        return (
                <button
                        type="button"
                        onClick={() => onSelect(src)}
                        className={`group relative aspect-[4/3] rounded-xl overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${active ? 'ring-2 ring-blue-500 shadow-md' : 'ring-1 ring-slate-200 hover:ring-slate-300'}`}
                        aria-pressed={active}
                >
                        {errored ? (
                                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400">
                                        <ImageOff className="w-6 h-6" />
                                </div>
                        ) : (
                                <img
                                        src={src}
                                        alt="Cover option"
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                        onError={() => {
                                                // Try fallback URLs in order; if all fail, show the placeholder.
                                                const idx = FALLBACK_URLS.indexOf(src);
                                                const next = idx < FALLBACK_URLS.length - 1 ? FALLBACK_URLS[idx + 1] : null;
                                                if (idx === -1) {
                                                        setSrc(FALLBACK_URLS[0]);
                                                } else if (next) {
                                                        setSrc(next);
                                                } else {
                                                        setErrored(true);
                                                }
                                        }}
                                />
                        )}
                        {active && !errored && (
                                <span className="absolute top-2 end-2 w-6 h-6 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center">
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                </span>
                        )}
                </button>
        );
};

interface CoverPickerModalProps {
        isOpen: boolean;
        onClose: () => void;
        destination: string;
        currentCover?: string;
        currentFocal?: { x: number; y: number };
        onPick: (url: string, focal?: { x: number; y: number }) => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
        isOpen,
        onClose,
        destination,
        currentCover,
        currentFocal,
        onPick,
}) => {
        const candidates = useMemo(
                () => getDestinationCoverCandidates(destination, 3, 1200),
                [destination],
        );
        const initialSelection = currentCover && candidates.includes(currentCover) ? currentCover : candidates[0];
        const [selected, setSelected] = useState<string>(initialSelection || '');
        const [customMode, setCustomMode] = useState(false);
        const [customUrl, setCustomUrl] = useState('');
        const [focal, setFocal] = useState<{ x: number; y: number }>(currentFocal ?? { x: 50, y: 50 });
        const [dragging, setDragging] = useState(false);
        const previewRef = useRef<HTMLDivElement>(null);

        // Reset internal state every time the modal opens for a fresh trip.
        React.useEffect(() => {
                if (isOpen) {
                        setSelected(initialSelection || '');
                        setCustomMode(false);
                        setCustomUrl('');
                        setFocal(currentFocal ?? { x: 50, y: 50 });
                }
        }, [isOpen, initialSelection, currentFocal]);

        // If the user picks a different cover image, reset focal to center —
        // the previous focal was for the previous photo.
        const pickThumbnail = (url: string) => {
                if (url !== selected) setFocal({ x: 50, y: 50 });
                setSelected(url);
        };

        const handleFocalMove = (clientX: number, clientY: number) => {
                if (!previewRef.current) return;
                const r = previewRef.current.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
                const y = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
                setFocal({ x, y });
        };

        const finalUrl = customMode ? customUrl.trim() : selected;
        const canSave = !!finalUrl && (!customMode || /^https?:\/\//i.test(finalUrl));

        const handleSave = () => {
                if (!canSave) return;
                onPick(finalUrl, focal);
                onClose();
        };

        return (
                <Modal
                        isOpen={isOpen}
                        onClose={onClose}
                        title="בחר תמונת נושא לטיול"
                        description="3 אפשרויות מותאמות ליעד שלך"
                        size="md"
                        footer={
                                <>
                                        <Button variant="ghost" onClick={onClose}>ביטול</Button>
                                        <Button variant="primary" onClick={handleSave} disabled={!canSave} iconLeading={<Check />}>
                                                שמור
                                        </Button>
                                </>
                        }
                >
                        <div className="space-y-3">
                                {!customMode && (
                                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                                {candidates.map((url, i) => (
                                                        <CoverThumbnail
                                                                key={url + i}
                                                                url={url}
                                                                active={url === selected}
                                                                onSelect={pickThumbnail}
                                                        />
                                                ))}
                                        </div>
                                )}

                                {/* Focal-point editor — drag the photo to choose which part shows
                                    in the compact mobile hero. The reticle marks the focal point;
                                    the dotted frame previews how the 16:9 hero will crop. */}
                                {finalUrl && (!customMode || /^https?:\/\//i.test(finalUrl)) && (
                                        <div className="border-t border-slate-100 pt-3">
                                                <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                                <Move className="w-3.5 h-3.5 text-blue-600" />
                                                                מקם את התמונה
                                                        </div>
                                                        <button
                                                                type="button"
                                                                onClick={() => setFocal({ x: 50, y: 50 })}
                                                                className="inline-flex items-center gap-1 text-2xs font-bold text-slate-500 hover:text-slate-700"
                                                                title="אפס למרכז"
                                                        >
                                                                <RotateCcw className="w-3 h-3" />
                                                                איפוס
                                                        </button>
                                                </div>
                                                <div
                                                        ref={previewRef}
                                                        onMouseDown={(e) => { setDragging(true); handleFocalMove(e.clientX, e.clientY); }}
                                                        onMouseMove={(e) => dragging && handleFocalMove(e.clientX, e.clientY)}
                                                        onMouseUp={() => setDragging(false)}
                                                        onMouseLeave={() => setDragging(false)}
                                                        onTouchStart={(e) => { setDragging(true); handleFocalMove(e.touches[0].clientX, e.touches[0].clientY); }}
                                                        onTouchMove={(e) => dragging && handleFocalMove(e.touches[0].clientX, e.touches[0].clientY)}
                                                        onTouchEnd={() => setDragging(false)}
                                                        className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-inner cursor-grab active:cursor-grabbing select-none touch-none bg-slate-100"
                                                >
                                                        <img
                                                                src={finalUrl}
                                                                alt="Cover preview"
                                                                className="w-full h-full object-cover pointer-events-none"
                                                                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                                                draggable={false}
                                                        />
                                                        {/* Reticle marking focal point */}
                                                        <div
                                                                className="absolute w-12 h-12 rounded-full border-2 border-white shadow-lg pointer-events-none"
                                                                style={{
                                                                        left: `calc(${focal.x}% - 24px)`,
                                                                        top: `calc(${focal.y}% - 24px)`,
                                                                        background: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.18) 70%)',
                                                                }}
                                                        >
                                                                <div className="absolute inset-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
                                                        </div>
                                                        {/* Hint */}
                                                        <div className="absolute bottom-2 inset-x-2 text-center text-[10px] font-bold text-white/95 bg-black/45 backdrop-blur-md rounded-md py-1 pointer-events-none">
                                                                גרור על התמונה כדי לבחור את החלק שיוצג במובייל
                                                        </div>
                                                </div>
                                        </div>
                                )}

                                <div className="border-t border-slate-100 pt-3">
                                        {!customMode ? (
                                                <button
                                                        type="button"
                                                        onClick={() => setCustomMode(true)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
                                                >
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                        השתמש בקישור משלי
                                                </button>
                                        ) : (
                                                <div className="space-y-2">
                                                        <TextField
                                                                label="קישור לתמונה"
                                                                placeholder="https://..."
                                                                value={customUrl}
                                                                onChange={(e) => setCustomUrl(e.target.value)}
                                                                error={customUrl && !/^https?:\/\//i.test(customUrl) ? 'הקישור חייב להתחיל ב-http או https' : undefined}
                                                                iconLeading={<LinkIcon />}
                                                                autoFocus
                                                        />
                                                        {customUrl && /^https?:\/\//i.test(customUrl) && (
                                                                <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] max-w-[220px]">
                                                                        <img src={customUrl} alt="Custom cover preview" className="w-full h-full object-cover" />
                                                                </div>
                                                        )}
                                                        <button
                                                                type="button"
                                                                onClick={() => { setCustomMode(false); setCustomUrl(''); }}
                                                                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                                        >
                                                                ← חזרה לאפשרויות מומלצות
                                                        </button>
                                                </div>
                                        )}
                                </div>
                        </div>
                </Modal>
        );
};
