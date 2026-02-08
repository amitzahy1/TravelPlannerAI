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

      setStatus({ type: 'success', message: 'Data processed successfully!' });
      setTimeout(() => setStatus(null), 4000);

    } catch (error) {
      console.error("Magic Drop Error:", error);
      setStatus({ type: 'error', message: 'Oops, something went wrong. Please check your files and try again.' });
    } finally {
      setIsProcessing(false);
      setIsDragging(false);
      // Reset input to allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        } ${compact ? 'mb-2' : 'mb-8 border-4 border-blue-50/50 rounded-[2rem]'}`}
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
            <p className="text-blue-700 font-bold text-sm">Processing files...</p>
          </div>
        ) : status ? (
          <div className={`flex items-center gap-2 font-bold ${compact ? 'text-sm' : 'text-xl'} ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {status.message}
          </div>
        ) : (
          <>
            <div className={`${compact ? 'bg-blue-50 p-2 rounded-lg' : 'bg-blue-100 p-5 rounded-[1.5rem] mb-6'} text-blue-600 group-hover:scale-110 transition-transform`}>
              {compact ? <Sparkles className="w-5 h-5" /> : <UploadCloud className="w-12 h-12" />}
            </div>

            {compact ? (
              <div className="text-left flex-1">
                <h3 className="text-slate-700 font-bold text-sm">Magic Upload</h3>
                <p className="text-slate-500 text-xs">Drop PDFs, Images, or Screenshots</p>
              </div>
            ) : (
              <div>
                <h3 className="text-gray-800 font-black text-2xl mb-2">Start with your files</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                  Upload flight tickets, hotel conformations, or restaurant reservations. <br />
                  <span className="text-blue-500 font-medium">We'll organize everything for you.</span>
                </p>
                <div className="flex gap-2 justify-center mb-6">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] text-slate-500 font-medium uppercase tracking-wide">PDF</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] text-slate-500 font-medium uppercase tracking-wide">JPG</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] text-slate-500 font-medium uppercase tracking-wide">PNG</span>
                </div>
              </div>
            )}

            <div className={`flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all ${compact ? 'text-[10px] px-3 py-1.5 rounded-lg' : 'text-sm px-8 py-3 rounded-xl'}`}>
              <UploadCloud className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}`} />
              {compact ? 'Upload' : 'Select Files'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};