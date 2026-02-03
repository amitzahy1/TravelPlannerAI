import React, { useState, useRef } from 'react';
import { Trip } from '../types';
import { Sparkles, Loader2, FileText, CheckCircle, AlertCircle, UploadCloud } from 'lucide-react';
import { analyzeTripFiles } from '../services/aiService';
import { mergeTripData } from '../services/tripService';

export interface MagicDropZoneProps {
  activeTrip?: Trip;
  onUpdate?: (updatedTrip: Trip) => void;
  onFilesReady?: (files: File[]) => void;
  compact?: boolean;
}

export const MagicDropZone: React.FC<MagicDropZoneProps> = ({ activeTrip, onUpdate, onFilesReady, compact }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    // 1. If parent wants raw files (for Project Genesis flow), just return them
    if (onFilesReady) {
      onFilesReady(Array.from(files));
      return;
    }

    // 2. Legacy/Update Mode (requires activeTrip)
    if (!activeTrip || !onUpdate) {
      console.error("MagicDropZone: Missing activeTrip or onUpdate for legacy mode");
      return;
    }

    setIsProcessing(true);
    setStatus(null);

    // 1. Validation Step: Check file types immediately
    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'text/csv',
      'text/html'
    ];

    const fileArray = Array.from(files);

    // Check for unsupported files
    const invalidFile = fileArray.find(f => !supportedTypes.includes(f.type) && !f.name.endsWith('.json') && !f.name.endsWith('.md'));

    if (invalidFile) {
      setIsProcessing(false);
      setStatus({
        type: 'error',
        message: `שגיאה: הקובץ "${invalidFile.name}" אינו נתמך. ניתן להעלות רק PDF, תמונות או קבצי טקסט.`
      });
      return; // Stop execution
    }

    try {
      // USE CENTRALIZED AI SERVICE (Handles strict dates, deduplication within batch, and categorization)
      const analysisResult = await analyzeTripFiles(fileArray);

      // USE CENTRALIZED MERGE SERVICE (Handles deduplication against existing trip data)
      const mergedTrip = mergeTripData(activeTrip, analysisResult);

      onUpdate(mergedTrip);

      setStatus({ type: 'success', message: 'המידע עובד והטיול עודכן בהצלחה!' });
      setTimeout(() => setStatus(null), 4000);

    } catch (error) {
      console.error("Magic Drop Error:", error);
      setStatus({ type: 'error', message: 'אופס, קרתה שגיאה בעיבוד הקבצים. נסה שוב או בדוק את הקבצים.' });
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
      className={`relative rounded-[1.5rem] border-2 border-dashed transition-all duration-300 overflow-hidden ${isDragging
        ? 'border-blue-500 bg-blue-50 scale-[1.01]'
        : 'border-slate-200 bg-white hover:border-blue-400'
        } ${compact ? 'mb-2' : 'mb-8 border-4 rounded-[2rem]'}`}
    >
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => e.target.files && processFiles(e.target.files)}
        accept="image/*,application/pdf,text/plain"
      />

      <div
        className={`${compact ? 'p-4 flex-row gap-4' : 'p-10 flex-col'} flex items-center justify-center text-center cursor-pointer`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isProcessing ? (
          <div className={`flex items-center ${compact ? 'gap-3' : 'flex-col'}`}>
            <Loader2 className={`${compact ? 'w-5 h-5' : 'w-12 h-12 mb-4'} text-blue-500 animate-spin`} />
            <p className="text-blue-700 font-black text-sm">מעבד...</p>
          </div>
        ) : status ? (
          <div className={`flex items-center gap-2 font-black ${compact ? 'text-sm' : 'text-xl'} ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {status.message}
          </div>
        ) : (
          <>
            <div className={`${compact ? 'bg-blue-50 p-2 rounded-lg' : 'bg-blue-100 p-5 rounded-[1.5rem] mb-4'} text-blue-600 group-hover:scale-110 transition-transform`}>
              <Sparkles className={`${compact ? 'w-5 h-5' : 'w-10 h-10'}`} />
            </div>
            {compact ? (
              <div className="text-right flex-1">
                <h3 className="text-slate-700 font-bold text-sm">גרירת קבצים חכמה (Magic Upload)</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Drop your PDFs, Images, or Screenshots here.
                  <br />
                  <span className="text-xs text-slate-400 mt-2 block">
                    Supports: Flight Tickets, Hotel Vouchers, Passports, Restaurant Reservations
                  </span>
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-gray-800 font-black text-2xl">העלאה חכמה (Magic Upload)</h3>
                <p className="text-gray-500 text-lg mt-2 font-bold italic">תמונות, PDF או קבצי טקסט (.txt)</p>
              </div>
            )}

            <div className={`flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest bg-blue-50/50 border border-blue-100 shadow-sm ${compact ? 'text-[10px] px-3 py-1.5 rounded-lg' : 'mt-6 text-sm px-6 py-2 rounded-full'}`}>
              <UploadCloud className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} />
              {compact ? 'העלה' : 'לחץ כאן או גרור קובץ'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};