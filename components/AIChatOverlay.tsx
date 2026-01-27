import React, { useState, useRef, useEffect } from 'react';
import { Trip } from '../types';
import { Sparkles, X, Send, User, ChevronDown, MessageSquareText, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithTripContext } from '../services/aiService';

interface AIChatOverlayProps {
        trip: Trip;
}

interface Message {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
}

export const AIChatOverlay: React.FC<AIChatOverlayProps> = ({ trip }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [messages, setMessages] = useState<Message[]>([
                {
                        id: 'welcome',
                        role: 'assistant',
                        content: `שלום! אני סוכן הנסיעות האישי שלך ל${trip.tripMetadata?.destination || 'טיול'}.  
אני מכיר את כל המלונות, הטיסות והתכנון שלך.  
איך אוכל לעזור? (למשל: "מתי הטיסה שלי?", "איפה המלון בפריז?", "תן לי רעיונות למסעדות")`,
                        timestamp: new Date()
                }
        ]);
        const [input, setInput] = useState('');
        const [isTyping, setIsTyping] = useState(false);
        const messagesEndRef = useRef<HTMLDivElement>(null);

        const scrollToBottom = () => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        };

        useEffect(() => {
                scrollToBottom();
        }, [messages, isOpen]);

        const handleSend = async () => {
                if (!input.trim() || isTyping) return;

                const userMsg: Message = {
                        id: Date.now().toString(),
                        role: 'user',
                        content: input.trim(),
                        timestamp: new Date()
                };

                setMessages(prev => [...prev, userMsg]);
                setInput('');
                setIsTyping(true);

                try {
                        // Filter redundant data to save tokens (optional optimization)
                        // For now sending full trip, assuming reasonable size.

                        const aiResponseText = await chatWithTripContext(trip, userMsg.content, messages);

                        const aiMsg: Message = {
                                id: (Date.now() + 1).toString(),
                                role: 'assistant',
                                content: aiResponseText,
                                timestamp: new Date()
                        };
                        setMessages(prev => [...prev, aiMsg]);
                } catch (error) {
                        console.error(error);
                        const errorMsg: Message = {
                                id: (Date.now() + 1).toString(),
                                role: 'assistant',
                                content: "סליחה, נתקלתי בבעיה. נסה שוב מאוחר יותר.",
                                timestamp: new Date()
                        };
                        setMessages(prev => [...prev, errorMsg]);
                } finally {
                        setIsTyping(false);
                }
        };

        const handleKeyPress = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                }
        };

        if (!isOpen) {
                return (
                        <button
                                onClick={() => setIsOpen(true)}
                                className="fixed bottom-6 right-6 z-[200] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl shadow-blue-300 transition-all hover:scale-110 active:scale-95 animate-bounce-subtle"
                        >
                                <Sparkles className="w-8 h-8" />
                        </button>
                );
        }

        return (
                <div className="fixed bottom-6 right-6 z-[200] w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-slide-up">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
                                <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-full">
                                                <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                                <h3 className="font-bold text-lg leading-tight">הסוכן החכם</h3>
                                                <p className="text-blue-100 text-xs mt-0.5">מחובר • מבוסס Gemini Pro</p>
                                        </div>
                                </div>
                                <div className="flex gap-2">
                                        <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                                <ChevronDown className="w-5 h-5" />
                                        </button>
                                </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin">
                                {messages.map((msg) => (
                                        <div
                                                key={msg.id}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                                <div
                                                        className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                                        ? 'bg-blue-600 text-white rounded-br-none'
                                                                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                                                }`}
                                                >
                                                        {msg.role === 'assistant' ? (
                                                                <ReactMarkdown className="prose prose-sm prose-slate rtl:prose-p:text-right max-w-none">
                                                                        {msg.content}
                                                                </ReactMarkdown>
                                                        ) : (
                                                                msg.content
                                                        )}
                                                        <div className={`text-[10px] mt-1 opacity-70 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                </div>
                                        </div>
                                ))}
                                {isTyping && (
                                        <div className="flex justify-start">
                                                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                                        <span className="text-xs text-slate-400 font-medium">חושב...</span>
                                                </div>
                                        </div>
                                )}
                                <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                                <div className="relative flex items-end gap-2 bg-slate-100 p-2 rounded-xl border border-transparent focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                        <textarea
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                placeholder="שאל משהו על הטיול..."
                                                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] text-sm py-2.5 px-2"
                                                rows={1}
                                        />
                                        <button
                                                onClick={handleSend}
                                                disabled={!input.trim() || isTyping}
                                                className={`p-2.5 rounded-lg mb-0.5 transition-all ${input.trim() && !isTyping
                                                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md transform hover:-translate-y-0.5'
                                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                        }`}
                                        >
                                                <Send className="w-4 h-4" />
                                        </button>
                                </div>
                                <div className="text-center mt-2">
                                        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                                <Sparkles className="w-3 h-3 text-purple-400" />
                                                AI can make mistakes. Check important info.
                                        </p>
                                </div>
                        </div>
                </div>
        );
};
