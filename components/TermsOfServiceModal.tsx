import React from 'react';
import { X, Shield, FileText } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TermsOfServiceModalProps {
        isOpen: boolean;
        onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
        if (!isOpen) return null;

        return createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
                        {/* Backdrop */}
                        <div
                                className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md animate-fade-in"
                                onClick={onClose}
                        ></div>

                        {/* Modal Content */}
                        <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col animate-scale-in border border-white/20 overflow-hidden font-rubik">

                                {/* Header */}
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div className="flex items-center gap-4">
                                                <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-sm">
                                                        <Shield className="w-8 h-8" />
                                                </div>
                                                <div>
                                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">תנאי השימוש</h2>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>
                                                </div>
                                        </div>
                                        <button
                                                onClick={onClose}
                                                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-all"
                                        >
                                                <X className="w-7 h-7" />
                                        </button>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 text-slate-600 leading-relaxed text-base">

                                        <div className="space-y-3">
                                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-brand-action" /> 1. הסכמה לתנאים
                                                </h3>
                                                <p>
                                                        בעצם השימוש ב-Travel Planner AI ("השירות"), אתם מסכימים לתנאים המפורטים במסמך זה. השירות מספק כלי תכנון טיולים מבוססי בינה מלאכותית, ואנו מחויבים להעניק לכם את החוויה הטובה ביותר תוך שמירה על שקיפות.
                                                </p>
                                        </div>

                                        <div className="space-y-3">
                                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-brand-action" /> 2. בינה מלאכותית ותוכן
                                                </h3>
                                                <p>
                                                        השירות משתמש במודלים מתקדמים של בינה מלאכותית (AI) כדי להפיק המלצות, מסלולים וניתוח נתונים.
                                                </p>
                                                <ul className="list-disc pr-6 space-y-2 marker:text-brand-action">
                                                        <li><strong>דיוק הנתונים:</strong> על אף מאמצינו, ייתכנו טעויות במידע המופק (זמני טיסות, זמינות מלונות וכו'). באחריות המשתמש לוודא את פרטי ההזמנה מול הספקים המקוריים.</li>
                                                        <li><strong>שימוש בתוכן:</strong> התוכן מיועד לשימוש אישי בלבד ואינו מהווה ייעוץ מקצועי.</li>
                                                </ul>
                                        </div>

                                        <div className="space-y-3">
                                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-brand-action" /> 3. עיבוד מסמכים ואימיילים
                                                </h3>
                                                <p>
                                                        הפיצ׳ר "ייבוא חכם" מאפשר לכם להעלות קבצי PDF או להעביר אימיילים לסוכן ה-AI שלנו.
                                                </p>
                                                <ul className="list-disc pr-6 space-y-2 marker:text-brand-action">
                                                        <li><strong>פרטיות:</strong> המידע מחולץ באופן אוטומטי לצרכי תכנון הטיול בלבד. איננו שומרים את האימיילים האישיים שלכם מעבר לזמן הדרוש לעיבודם.</li>
                                                        <li><strong>אבטחה:</strong> אנו משתמשים בטכנולוגיות הצפנה מתקדמות כדי להגן על הקבצים והנתונים שלכם.</li>
                                                </ul>
                                        </div>

                                        <div className="space-y-3 border-r-4 border-amber-100 pr-4 bg-amber-50/30 py-4 rounded-l-xl">
                                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                                        <Shield className="w-5 h-5 text-amber-500" /> 4. אחריות מוגבלת
                                                </h3>
                                                <p>
                                                        Travel Planner AI אינה אחראית לביטולים, שינויים בלוחות זמנים או אובדן כספי שנגרם כתוצאה מהסתמכות על המידע בשירות. השירות ניתן "כמות שהוא" (As-Is).
                                                </p>
                                        </div>

                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-center md:justify-end">
                                        <button
                                                onClick={onClose}
                                                className="w-full md:w-auto px-10 py-4 bg-brand-navy text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300"
                                        >
                                                אני מסכים/ה וממשיך
                                        </button>
                                </div>
                        </div>
                </div>,
                document.body
        );
};
