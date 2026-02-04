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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="ltr">
                        {/* Backdrop */}
                        <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                                onClick={onClose}
                        ></div>

                        {/* Modal Content */}
                        <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl relative z-10 flex flex-col animate-scale-in border border-white/20 overflow-hidden font-sans">

                                {/* Header */}
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                                                        <Shield className="w-6 h-6" />
                                                </div>
                                                <div>
                                                        <h2 className="text-xl font-black text-slate-800">Terms of Service</h2>
                                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Effective Date: {new Date().toLocaleDateString()}</p>
                                                </div>
                                        </div>
                                        <button
                                                onClick={onClose}
                                                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
                                        >
                                                <X className="w-6 h-6" />
                                        </button>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-600 leading-relaxed text-sm">
                                        <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400" /> 1. Acceptance of Terms
                                                </h3>
                                                <p>
                                                        By accessing and using Travel Planner AI ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                                                </p>
                                        </div>

                                        <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400" /> 2. Use License
                                                </h3>
                                                <p>
                                                        Permission is granted to temporarily download one copy of the materials (information or software) on Travel Planner AI's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                                                </p>
                                                <ul className="list-disc pl-5 space-y-1 marker:text-slate-300">
                                                        <li>modify or copy the materials;</li>
                                                        <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                                                        <li>attempt to decompile or reverse engineer any software contained on Travel Planner AI's website;</li>
                                                        <li>remove any copyright or other proprietary notations from the materials; or</li>
                                                        <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
                                                </ul>
                                        </div>

                                        <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400" /> 3. Disclaimer
                                                </h3>
                                                <p>
                                                        The materials on Travel Planner AI's website are provided "as is". Travel Planner AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties, including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                                                </p>
                                        </div>

                                        <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400" /> 4. Limitations
                                                </h3>
                                                <p>
                                                        In no event shall Travel Planner AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Travel Planner AI's Internet site, even if Travel Planner AI or a Travel Planner AI authorized representative has been notified orally or in writing of the possibility of such damage.
                                                </p>
                                        </div>
                                        <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400" /> 5. AI Generated Content
                                                </h3>
                                                <p>
                                                        Travel Planner AI uses artificial intelligence to generate recommendations and itineraries. While we strive for accuracy, AI-generated content may occasionally be incorrect or misleading. Users should verify critical information such as flight times, hotel bookings, and attraction opening hours independently.
                                                </p>
                                        </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                        <button
                                                onClick={onClose}
                                                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                                        >
                                                I Understand
                                        </button>
                                </div>
                        </div>
                </div>,
                document.body
        );
};
