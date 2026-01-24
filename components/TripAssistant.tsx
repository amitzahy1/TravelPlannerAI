import React, { useState, useRef, useEffect } from 'react';
import { Trip } from '../types';
import { Send, Bot, User, X, Loader2, Sparkles } from 'lucide-react';
import { getAI, AI_MODEL, SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';

interface TripAssistantProps {
  trip: Trip;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const TripAssistant: React.FC<TripAssistantProps> = ({ trip, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `היי! אני העוזר האישי שלך לטיול ל${trip.destination}. מה תרצה לדעת? (למשל: "מתי הטיסה?", "איזה מלון בבנגקוק?", "מה הלו"ז ליום 3?")` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = getAI();

      const prompt = `${SYSTEM_PROMPT}

You are a helpful travel assistant for a specific trip.
TRIP DATA: ${JSON.stringify(trip)}

User Question: ${userMsg}

Instructions:
1. Answer based ONLY on the Trip Data provided.
2. If the answer is found, be specific (dates, times, names).
3. If not found, suggest adding it or say you don't know.
4. Reply in Hebrew, friendly and concise.`;

      const response = await generateWithFallback(ai, prompt);

      setMessages(prev => [...prev, { role: 'model', text: response.text || 'מצטער, לא הצלחתי למצוא את המידע.' }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: 'אופס, הייתה שגיאה בתקשורת.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
      {/* Clone Header: Assistant */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl shadow-sm bg-indigo-50 text-indigo-600">
            <Bot className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest leading-none mt-0.5">
            TRAVEL BOT
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Right Side Actions */}
          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> מחובר
          </span>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex gap-2 items-center">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-xs text-gray-400 font-bold">מקליד...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            className="flex-grow bg-transparent outline-none px-2 text-xs font-medium py-1.5"
            placeholder="שאל אותי משהו על הטיול..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};