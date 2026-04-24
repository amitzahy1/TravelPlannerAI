import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputButtonProps {
        onTranscript: (text: string, isFinal: boolean) => void;
        /** Tailwind classes for the wrapper button. Override if you need a
         *  different size / position from the default. */
        className?: string;
        /** Defaults to 'he-IL' (Hebrew). */
        lang?: string;
}

// Type shim for the browser Speech Recognition API (TS doesn't ship it by
// default because it's still an unfinished spec).
interface SpeechRecognitionEventLike {
        resultIndex: number;
        results: { isFinal: boolean; [idx: number]: { transcript: string } }[];
}

interface SpeechRecognitionLike {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((e: SpeechRecognitionEventLike) => void) | null;
        onerror: ((e: any) => void) | null;
        onend: (() => void) | null;
}

const getRecognitionCtor = (): (new () => SpeechRecognitionLike) | null => {
        if (typeof window === 'undefined') return null;
        // @ts-ignore — browser-specific
        return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * A microphone button that dictates into a parent textarea via the Web
 * Speech API. Works out-of-the-box in Chrome / Edge / Safari (iOS 14.5+).
 * Falls back to `null` silently on unsupported browsers so we don't
 * clutter the UI.
 */
export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
        onTranscript, className = '', lang = 'he-IL',
}) => {
        const [isListening, setIsListening] = useState(false);
        const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
        const Ctor = getRecognitionCtor();
        const isSupported = !!Ctor;

        useEffect(() => {
                return () => {
                        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
                        recognitionRef.current = null;
                };
        }, []);

        if (!isSupported) return null;

        const startListening = () => {
                if (isListening) return;
                const rec = new (Ctor as new () => SpeechRecognitionLike)();
                rec.lang = lang;
                rec.continuous = true;
                rec.interimResults = true;
                rec.onresult = (e: SpeechRecognitionEventLike) => {
                        for (let i = e.resultIndex; i < e.results.length; i++) {
                                const result = e.results[i];
                                const transcript = result[0]?.transcript || '';
                                if (transcript) onTranscript(transcript, result.isFinal);
                        }
                };
                rec.onerror = (err: any) => {
                        console.warn('[voice] error', err?.error || err);
                        setIsListening(false);
                };
                rec.onend = () => setIsListening(false);
                recognitionRef.current = rec;
                try {
                        rec.start();
                        setIsListening(true);
                } catch (err) {
                        console.warn('[voice] start failed', err);
                        setIsListening(false);
                }
        };

        const stopListening = () => {
                try { recognitionRef.current?.stop(); } catch { /* ignore */ }
                setIsListening(false);
        };

        const toggle = () => (isListening ? stopListening() : startListening());

        return (
                <button
                        type="button"
                        onClick={toggle}
                        aria-label={isListening ? 'הפסק הקלטה' : 'הקלט טקסט בקול'}
                        title={isListening ? 'הקלטה פעילה — לחץ לעצירה' : 'הקלט בקול'}
                        className={`inline-flex items-center justify-center rounded-pill transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                isListening
                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-card-hover animate-pulse'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-card'
                        } ${className}`}
                >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
        );
};
