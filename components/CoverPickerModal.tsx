import React, { useMemo, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { TextField } from './ui/Form';
import { Check, Link as LinkIcon } from 'lucide-react';
import { getDestinationCoverCandidates } from '../utils/destinationCover';

interface CoverPickerModalProps {
        isOpen: boolean;
        onClose: () => void;
        destination: string;
        currentCover?: string;
        onPick: (url: string) => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
        isOpen,
        onClose,
        destination,
        currentCover,
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

        // Reset internal state every time the modal opens for a fresh trip.
        React.useEffect(() => {
                if (isOpen) {
                        setSelected(initialSelection || '');
                        setCustomMode(false);
                        setCustomUrl('');
                }
        }, [isOpen, initialSelection]);

        const finalUrl = customMode ? customUrl.trim() : selected;
        const canSave = !!finalUrl && (!customMode || /^https?:\/\//i.test(finalUrl));

        const handleSave = () => {
                if (!canSave) return;
                onPick(finalUrl);
                onClose();
        };

        return (
                <Modal
                        isOpen={isOpen}
                        onClose={onClose}
                        title="בחר תמונת נושא לטיול"
                        description="3 אפשרויות מותאמות ליעד שלך"
                        size="lg"
                        footer={
                                <>
                                        <Button variant="ghost" onClick={onClose}>ביטול</Button>
                                        <Button variant="primary" onClick={handleSave} disabled={!canSave} iconLeading={<Check />}>
                                                שמור
                                        </Button>
                                </>
                        }
                >
                        <div className="space-y-5">
                                {!customMode && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {candidates.map((url, i) => {
                                                        const active = url === selected;
                                                        return (
                                                                <button
                                                                        key={url + i}
                                                                        type="button"
                                                                        onClick={() => setSelected(url)}
                                                                        className={`group relative aspect-[4/3] rounded-2xl overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${active ? 'ring-2 ring-blue-500 shadow-lg' : 'ring-1 ring-slate-200 hover:ring-slate-300'}`}
                                                                        aria-pressed={active}
                                                                >
                                                                        <img
                                                                                src={url}
                                                                                alt={`Cover option ${i + 1}`}
                                                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                                loading="lazy"
                                                                        />
                                                                        {active && (
                                                                                <span className="absolute top-2 end-2 w-7 h-7 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center">
                                                                                        <Check className="w-4 h-4" strokeWidth={3} />
                                                                                </span>
                                                                        )}
                                                                </button>
                                                        );
                                                })}
                                        </div>
                                )}

                                <div className="border-t border-slate-100 pt-4">
                                        {!customMode ? (
                                                <button
                                                        type="button"
                                                        onClick={() => setCustomMode(true)}
                                                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors"
                                                >
                                                        <LinkIcon className="w-4 h-4" />
                                                        השתמש בקישור משלי
                                                </button>
                                        ) : (
                                                <div className="space-y-3">
                                                        <TextField
                                                                label="קישור לתמונה"
                                                                placeholder="https://..."
                                                                value={customUrl}
                                                                onChange={(e) => setCustomUrl(e.target.value)}
                                                                error={customUrl && !/^https?:\/\//i.test(customUrl) ? 'הקישור חייב להתחיל ב-http או https' : undefined}
                                                                iconLeading={<LinkIcon />}
                                                                autoFocus
                                                        />
                                                        <button
                                                                type="button"
                                                                onClick={() => { setCustomMode(false); setCustomUrl(''); }}
                                                                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                                        >
                                                                ← חזרה לאפשרויות מומלצות
                                                        </button>
                                                </div>
                                        )}
                                </div>

                                {customMode && customUrl && /^https?:\/\//i.test(customUrl) && (
                                        <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[4/3] max-w-sm">
                                                <img src={customUrl} alt="Custom cover preview" className="w-full h-full object-cover" />
                                        </div>
                                )}
                        </div>
                </Modal>
        );
};
