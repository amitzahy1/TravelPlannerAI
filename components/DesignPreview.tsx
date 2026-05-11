/**
 * DesignPreview — admin-only theme picker.
 *
 * IMPORTANT: this is NOT a mock app. It applies a CSS theme override to
 * the REAL app (`<html data-theme="...">`). The user picks a theme here,
 * then navigates anywhere in the app and sees their actual pages
 * re-skinned — same layout, same features, different visual treatment.
 *
 * Themes live in src/themes.css. Adding/changing a theme = editing CSS.
 * No component duplication.
 */

import React, { useEffect, useState } from 'react';
import { isAdmin } from '../utils/isAdmin';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Check, RotateCcw, ArrowLeft } from 'lucide-react';

type Theme = 'current' | 'airbnb' | 'wolt' | 'notion';

const THEMES: { id: Theme; label: string; tagline: string; accent: string; bg: string; subtitle: string }[] = [
  {
    id: 'current',
    label: 'הנוכחי',
    tagline: 'הברירת מחדל של האתר היום',
    accent: '#3b82f6',
    bg: '#f8fafc',
    subtitle: 'אינדיגו/כתום/סגול — שיטה רגילה של Tailwind',
  },
  {
    id: 'airbnb',
    label: 'Airbnb',
    tagline: 'חמים, פוטוגרפי, רחב',
    accent: '#FF385C',
    bg: '#FFFFFF',
    subtitle: 'ורוד-קורל, רדיוסים גדולים, צללים רכים, גופן Inter',
  },
  {
    id: 'wolt',
    label: 'Wolt',
    tagline: 'מהיר, צפוף, דליברי-אפ',
    accent: '#009DE0',
    bg: '#F4F4F5',
    subtitle: 'ציאן, ללא צללים — רק קווי גבול, רדיוסים הדוקים',
  },
  {
    id: 'notion',
    label: 'Notion / Linear',
    tagline: 'מינימליסטי, טקסטואלי',
    accent: '#5E6AD2',
    bg: '#FAFAF9',
    subtitle: 'אינדיגו עדין, גוונים של אפור, אחיד, רדיוסים חדים',
  },
];

const STORAGE_KEY = 'app_theme';

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'airbnb' || v === 'wolt' || v === 'notion') return v;
  } catch { /* noop */ }
  return 'current';
}

function applyTheme(theme: Theme) {
  if (theme === 'current') {
    delete document.documentElement.dataset.theme;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  } else {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
  }
}

export const DesignPreview: React.FC = () => {
  const { user } = useAuth();
  const [active, setActive] = useState<Theme>(readTheme());

  // Apply on mount + on every change.
  useEffect(() => {
    applyTheme(active);
  }, [active]);

  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center space-y-4 bg-white rounded-2xl p-8 shadow-sm">
          <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
            <Lock className="w-5 h-5 text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">בחירת עיצוב — אדמין בלבד</h1>
          <p className="text-sm text-slate-500">הדף הזה משמש לבחירת כיוון עיצוב חדש לאתר. רק משתמשי אדמין יכולים לגשת אליו.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        <header className="space-y-2">
          <a
            href="#/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            חזרה לאתר
          </a>
          <h1 className="text-3xl font-black text-slate-900">בחירת עיצוב לאתר</h1>
          <p className="text-base text-slate-600 leading-relaxed">
            אותו אתר, אותם דפים, אותם פיצ'רים — רק עיצוב אחר. בוחרים אופציה, הולכים לאתר הרגיל ורואים אותו צבוע בסגנון החדש. אפשר להחליף בכל רגע.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {THEMES.map(t => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`text-right p-5 rounded-2xl border-2 transition-all relative ${
                  isActive
                    ? 'border-slate-900 shadow-lg ring-4 ring-slate-900/10'
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
                style={isActive ? { background: t.bg } : undefined}
              >
                {isActive && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs font-bold">
                    <Check className="w-3 h-3" />
                    פעיל
                  </span>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="inline-block w-10 h-10 rounded-xl flex-shrink-0"
                    style={{ background: t.accent }}
                  />
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{t.label}</h2>
                    <p className="text-xs text-slate-500 font-medium">{t.tagline}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{t.subtitle}</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold">
                  <span className="px-2 py-1 rounded-md" style={{ background: t.bg, border: '1px solid rgba(0,0,0,0.08)' }}>
                    רקע
                  </span>
                  <span className="px-2 py-1 rounded-md text-white" style={{ background: t.accent }}>
                    פעולה
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* What changes / what stays */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-sm leading-relaxed text-slate-700 space-y-3">
          <h3 className="text-base font-bold text-slate-900">מה משתנה בכל סגנון?</h3>
          <ul className="list-disc pr-5 space-y-1.5">
            <li><strong>צבעי המותג</strong> — כפתורים, טאבים, אייקונים פעילים</li>
            <li><strong>רדיוסים</strong> — כמה עגולים הכרטיסים והכפתורים</li>
            <li><strong>צללים</strong> — האם יש (Airbnb) או רק קווים (Wolt / Notion)</li>
            <li><strong>צבעי רקע</strong> — לבן חמים / אפור קריר / לבן נייר</li>
            <li><strong>גופן</strong> — Inter במקום Rubik בחלק מהסגנונות</li>
          </ul>
          <h3 className="text-base font-bold text-slate-900 pt-2">מה לא משתנה?</h3>
          <ul className="list-disc pr-5 space-y-1.5">
            <li>הפיצ'רים, המבנה של הדפים, הניווט</li>
            <li>התוכן (המסעדות, האטרקציות, המפה)</li>
            <li>הלוגיקה — חיפוש, סינון, הוספה לטיול, רענון מ-Google</li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-bold">פעיל עכשיו:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-900">
              {THEMES.find(t => t.id === active)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {active !== 'current' && (
              <button
                onClick={() => setActive('current')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw className="w-4 h-4" />
                איפוס לעיצוב המקורי
              </button>
            )}
            <a
              href="#/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              עבור לאתר לראות
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
