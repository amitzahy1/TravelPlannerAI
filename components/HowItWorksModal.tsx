import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Inbox, Bot, ClipboardPaste, ExternalLink, Sparkles, AtSign } from 'lucide-react';

interface HowItWorksModalProps {
        isOpen: boolean;
        onClose: () => void;
}

/**
 * Explains the NotebookLM + Gemini workflow for users who don't know about it.
 * Shown from the "Free Text" card on Step 2 and from the Gemini-Gmail banner
 * inside Step 3 free-text. Designed to make a non-obvious shortcut discoverable.
 */
export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => (
        <AnimatePresence>
                {isOpen && (
                        <>
                                <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={onClose}
                                        className="fixed inset-0 z-[200] bg-brand-navy/60 backdrop-blur-md"
                                />
                                <motion.div
                                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                                        className="fixed inset-x-3 top-[5vh] md:top-[10vh] md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-[560px] z-[210] bg-white rounded-3xl shadow-2xl overflow-hidden"
                                        dir="rtl"
                                >
                                        {/* Header — close-as-back distinct from the wizard's X.
                                            Labeled pill ("← חזרה לאשף") with a back-arrow icon, soft
                                            slate background; impossible to confuse with the wizard's
                                            top-right close button. */}
                                        <div className="flex items-start justify-between p-5 pb-3 border-b border-slate-100">
                                                <button
                                                        onClick={onClose}
                                                        aria-label="חזרה לאשף הטיול"
                                                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-black transition-colors order-2"
                                                >
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                        חזרה לאשף
                                                </button>
                                                <div className="flex items-center gap-3 min-w-0 order-1 flex-1">
                                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
                                                                <Sparkles className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div className="min-w-0">
                                                                <h2 className="font-black text-brand-navy text-base md:text-lg leading-tight">איך לבנות טיול עם NotebookLM ו-Gemini</h2>
                                                                <p className="text-2xs text-slate-400 mt-0.5">3 שלבים פשוטים — אין צורך לאסוף נתונים ידנית</p>
                                                        </div>
                                                </div>
                                        </div>

                                        {/* Steps */}
                                        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                                                <Step
                                                        n={1}
                                                        icon={<Inbox className="w-5 h-5" />}
                                                        color="bg-blue-100 text-blue-700"
                                                        title="אסוף את כל ההזמנות במקום אחד"
                                                        body={
                                                                <>
                                                                        פתח את <a href="https://notebooklm.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold underline">NotebookLM</a> וצור Notebook חדש לטיול. גרור פנימה את כל אישורי ההזמנה — PDFs מ-Booking, Airbnb, חברות תעופה, אישורי מסעדה, וכו'. NotebookLM יכול לקרוא PDFs, מסמכי Google Docs, וטקסט גולמי שתדביק.
                                                                        <span className="block mt-1.5 text-2xs text-slate-500">💡 או דלג על השלב הזה אם אתה משתמש ב-Gemini Advanced שיודע לקרוא ישירות מה-Gmail שלך.</span>
                                                                </>
                                                        }
                                                />

                                                <Step
                                                        n={2}
                                                        icon={<Bot className="w-5 h-5" />}
                                                        color="bg-purple-100 text-purple-700"
                                                        title="בקש סיכום מ-AI"
                                                        body={
                                                                <>
                                                                        יש שתי דרכים. שתיהן מחזירות לך טקסט אחד מסודר עם כל ההזמנות:
                                                                        <div className="mt-2 space-y-2">
                                                                                <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-2.5">
                                                                                        <div className="font-black text-purple-800 text-xs mb-1">אפשרות א · בתוך NotebookLM</div>
                                                                                        <div className="text-2xs text-slate-600 leading-relaxed">פתח את ה-Notebook שיצרת בשלב 1 → בצ'אט בתחתית כתוב: <span className="font-bold">"סכם בעברית את כל ההזמנות מכל המקורות בטקסט אחד מובנה (מלונות, טיסות, תאריכים, חדרים)"</span>. NotebookLM יעבור על כל המסמכים שהעלית.</div>
                                                                                </div>
                                                                                <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2.5">
                                                                                        <div className="font-black text-indigo-800 text-xs mb-1 flex items-center gap-1.5"><AtSign className="w-3 h-3" /> אפשרות ב · חיבור Gemini ל-Notebook</div>
                                                                                        <div className="text-2xs text-slate-600 leading-relaxed">פתח את <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-bold underline">Gemini</a> → לחץ על אייקון <span className="inline-block px-1 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px]">@</span> בתחתית הצ'אט → בחר "NotebookLM" ואז את ה-Notebook שלך. עכשיו Gemini יודע לקרוא ממנו ויחזיר לך סיכום אחד.</div>
                                                                                </div>
                                                                        </div>
                                                                        <span className="block mt-2 text-2xs text-slate-500">💡 ל-Gemini Advanced (חינם דרך חשבון Google) יש גם גישה ישירה ל-Gmail שלך — בלי לעבור דרך NotebookLM כלל.</span>
                                                                </>
                                                        }
                                                />

                                                <Step
                                                        n={3}
                                                        icon={<ClipboardPaste className="w-5 h-5" />}
                                                        color="bg-emerald-100 text-emerald-700"
                                                        title="הדבק את הטקסט כאן"
                                                        body={
                                                                <>
                                                                        העתק את הסיכום שה-AI יצר, חזור לאשף הטיולים שלנו, והדבק במסך "תיאור במילים". ה-AI שלנו יחלץ את כל הפרטים — מלונות, חדרים, טיסות, תאריכים — ויבנה את המסלול אוטומטית.
                                                                </>
                                                        }
                                                />

                                                {/* External resources */}
                                                <div className="bg-slate-50 rounded-2xl p-4 mt-4">
                                                        <div className="text-2xs font-black text-slate-400 uppercase tracking-widest mb-2">קישורים שימושיים</div>
                                                        <div className="space-y-1.5">
                                                                <a
                                                                        href="https://notebooklm.google.com/"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm font-bold text-slate-700"
                                                                >
                                                                        <span>פתח NotebookLM</span>
                                                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                                                </a>
                                                                <a
                                                                        href="https://gemini.google.com/app"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm font-bold text-slate-700"
                                                                >
                                                                        <span>פתח Gemini</span>
                                                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                                                </a>
                                                                <a
                                                                        href="https://support.google.com/notebooklm/answer/14276468"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-sm font-bold text-slate-700"
                                                                >
                                                                        <span>מדריך NotebookLM הרשמי של Google</span>
                                                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                                                </a>
                                                        </div>
                                                </div>
                                        </div>
                                </motion.div>
                        </>
                )}
        </AnimatePresence>
);

const Step: React.FC<{ n: number; icon: React.ReactNode; color: string; title: string; body: React.ReactNode }> = ({ n, icon, color, title, body }) => (
        <div className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>{icon}</div>
                        <div className="text-2xs font-black text-slate-400 mt-1">שלב {n}</div>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-black text-brand-navy text-sm md:text-base leading-tight mb-1">{title}</h3>
                        <p className="text-xs md:text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
        </div>
);
