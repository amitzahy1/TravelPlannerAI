import React, { useState, useRef } from 'react';
import { Trip } from '../types';
import { Sparkles, Loader2, FileText, CheckCircle, AlertCircle, UploadCloud } from 'lucide-react';
import { getAI, AI_MODEL, generateWithFallback } from '../services/aiService';

interface MagicDropZoneProps {
  activeTrip: Trip;
  onUpdate: (updatedTrip: Trip) => void;
}

export const MagicDropZone: React.FC<MagicDropZoneProps> = ({ activeTrip, onUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    setStatus(null);

    try {
      const ai = getAI();
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'];
      const textExtensions = ['.txt', '.md', '.json', '.csv'];

      const filePromises = Array.from(files).map(file => {
        const isTextFile = allowedMimeTypes.includes(file.type) && file.type === 'text/plain' || textExtensions.some(ext => file.name.endsWith(ext));

        return new Promise<{ data: string, mimeType: string, name: string, isText: boolean }>((resolve) => {
          const reader = new FileReader();
          if (isTextFile) {
            reader.onloadend = () => {
              resolve({ data: reader.result as string, mimeType: 'text/plain', name: file.name, isText: true });
            };
            reader.readAsText(file);
          } else {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ data: base64, mimeType: file.type, name: file.name, isText: false });
            };
            reader.readAsDataURL(file);
          }
        });
      });

      const uploadedFiles = await Promise.all(filePromises);

      const contentParts: any[] = [
        {
          text: `You are an AI assistant for a travel app. Analyze the provided documents and update this trip object: ${JSON.stringify(activeTrip)}. 
        Extract flights, hotels, or just add the filename to the 'documents' list. 
        If you see text from a document, interpret it as travel details (itinerary, hotel name, flight).
        Return ONLY a JSON object with the full updated trip.` }
      ];

      uploadedFiles.forEach(f => {
        if (f.isText) {
          contentParts.push({ text: `Text Document (${f.name}):\n${f.data}` });
        } else if (allowedMimeTypes.includes(f.mimeType)) {
          contentParts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
        }
      });

      const response = await generateWithFallback(
        ai,
        { role: 'user', parts: contentParts },
        { responseMimeType: 'application/json' }
      );

      // FIX: response.text can be a function or a string depending on the provider
      const textContent = typeof response.text === 'function' ? response.text() : response.text;
      const updatedTrip = JSON.parse(textContent);
      const newDocNames = uploadedFiles.map(f => f.name);
      updatedTrip.documents = Array.from(new Set([...(updatedTrip.documents || []), ...newDocNames]));

      onUpdate(updatedTrip);
      setStatus({ type: 'success', message: 'המידע עובד והטיול עודכן בהצלחה!' });
      setTimeout(() => setStatus(null), 4000);
    } catch (error) {
      console.error("Magic Drop Error:", error);
      setStatus({ type: 'error', message: 'אופס, קרתה שגיאה בעיבוד הקבצים. וודא ששלחת תמונות, PDF או טקסט (.txt).' });
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative mb-8 rounded-[2rem] border-4 border-dashed transition-all duration-300 overflow-hidden ${isDragging
          ? 'border-blue-500 bg-blue-50 scale-[1.01]'
          : 'border-gray-200 bg-white hover:border-blue-300'
        }`}
    >
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => e.target.files && processFiles(e.target.files)}
        accept="image/*,application/pdf,text/plain"
      />

      <div className="p-10 flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        {isProcessing ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-blue-700 font-black text-xl">ה-AI סורק את הקבצים שלך...</p>
          </div>
        ) : status ? (
          <div className={`flex items-center gap-4 font-black text-xl ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {status.type === 'success' ? <CheckCircle className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
            {status.message}
          </div>
        ) : (
          <>
            <div className="bg-blue-100 p-5 rounded-[1.5rem] text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-10 h-10" />
            </div>
            <h3 className="text-gray-800 font-black text-2xl">העלאה חכמה (Magic Upload)</h3>
            <p className="text-gray-500 text-lg mt-2 font-bold italic">תמונות, PDF או קבצי טקסט (.txt)</p>
            <div className="mt-6 flex items-center gap-3 text-blue-600 text-sm font-black uppercase tracking-widest bg-blue-50 px-6 py-2 rounded-full border border-blue-100 shadow-sm">
              <UploadCloud className="w-5 h-5" /> לחץ כאן או גרור קובץ
            </div>
          </>
        )}
      </div>
    </div>
  );
};