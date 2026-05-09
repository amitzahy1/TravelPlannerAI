import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { RELEASE_NOTES, ReleaseNote } from '../constants/releaseNotes';

interface WhatsNewModalProps {
  /** Called when the user dismisses; the host marks `lastSeenReleaseVersion`. */
  onDismiss: () => void;
}

/**
 * "What's new" popup for admin users. Shows the latest entry expanded by
 * default with older entries collapsed under a "ראה גם" toggle.
 */
export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onDismiss }) => {
  const [showOlder, setShowOlder] = useState(false);
  if (RELEASE_NOTES.length === 0) return null;
  const latest = RELEASE_NOTES[0];
  const older = RELEASE_NOTES.slice(1);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={onDismiss}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()} dir="rtl">
        <button onClick={onDismiss} aria-label="סגירה" className="absolute top-3 left-3 z-20 p-2 bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 rounded-full transition-all active:scale-95">
          <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-gradient-to-br from-indigo-500 to-purple-500 p-1.5 rounded-lg text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-black text-slate-900">מה חדש</h2>
          </div>
          <p className="text-xs text-slate-500 font-bold">{latest.date} · גרסה {latest.version}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <ReleaseNoteBlock note={latest} highlighted />

          {older.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowOlder(o => !o)}
                className="flex items-center gap-1.5 text-2xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showOlder ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showOlder ? 'הסתר עדכונים קודמים' : `ראה ${older.length} עדכונים קודמים`}
              </button>
              {showOlder && (
                <div className="mt-3 space-y-3">
                  {older.map(note => <ReleaseNoteBlock key={note.version} note={note} highlighted={false} />)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 bg-slate-50">
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-md"
          >
            הבנתי, סגור
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const ReleaseNoteBlock: React.FC<{ note: ReleaseNote; highlighted: boolean }> = ({ note, highlighted }) => (
  <div className={`rounded-2xl p-4 ${highlighted ? 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
    <div className="text-2xs font-bold text-slate-400 mb-1">{note.date} · {note.version}</div>
    <h3 className="text-sm font-black text-slate-900 mb-2 leading-tight">{note.title}</h3>
    <ul className="space-y-1.5">
      {note.items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
          <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${highlighted ? 'bg-indigo-500' : 'bg-slate-400'}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);
