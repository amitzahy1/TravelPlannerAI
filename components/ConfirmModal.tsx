import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        onClose: () => void;
        isDangerous?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
        isOpen,
        title,
        message,
        confirmText = "אישור",
        cancelText = "ביטול",
        onConfirm,
        onClose,
        isDangerous = false
}) => {
        if (!isOpen) return null;

        return (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>

                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                                <div className="flex flex-col items-center text-center gap-4">
                                        <div className={`p-3 rounded-full ${isDangerous ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                                <AlertTriangle className="w-8 h-8" />
                                        </div>
                                        <div>
                                                <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                                                <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
                                        </div>
                                        <div className="flex gap-3 w-full mt-2">
                                                <button
                                                        onClick={onClose}
                                                        className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                                >
                                                        {cancelText}
                                                </button>
                                                <button
                                                        onClick={() => { onConfirm(); onClose(); }}
                                                        className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${isDangerous
                                                                ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                                                }`}
                                                >
                                                        {confirmText}
                                                </button>
                                        </div>
                                </div>
                        </div>
                </div>
        );
};
