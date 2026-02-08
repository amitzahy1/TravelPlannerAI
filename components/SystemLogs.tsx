
import React, { useEffect, useState } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Loader2, Terminal, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';

interface LogEntry {
        id: string;
        timestamp: Date;
        message: string;
        type: string;
        details?: string;
}

export const SystemLogs: React.FC = () => {
        const [logs, setLogs] = useState<LogEntry[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
                const user = auth.currentUser;
                if (!user) return;

                const q = query(
                        collection(db, `users/${user.uid}/system_logs`),
                        orderBy('timestamp', 'desc'),
                        limit(50)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                        const newLogs = snapshot.docs.map(doc => {
                                const data = doc.data();
                                return {
                                        id: doc.id,
                                        timestamp: data.timestamp?.toDate() || new Date(),
                                        message: data.message || 'No message',
                                        type: data.type || 'INFO',
                                        details: data.details
                                } as LogEntry;
                        });
                        setLogs(newLogs);
                        setLoading(false);
                });

                return () => unsubscribe();
        }, []);

        const getIcon = (msg: string) => {
                if (msg.includes('Error') || msg.includes('Failed')) return <AlertTriangle className="w-4 h-4 text-red-500" />;
                if (msg.includes('Success') || msg.includes('Created') || msg.includes('Updated')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
                return <Info className="w-4 h-4 text-blue-400" />;
        };

        return (
                <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl shadow-xl border border-slate-700 font-mono text-sm h-[600px] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                                        <Terminal className="w-5 h-5 text-green-400" />
                                        System Logs (Live)
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="animate-pulse w-2 h-2 rounded-full bg-green-500"></span>
                                        Connected
                                </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {loading ? (
                                        <div className="flex justify-center py-10">
                                                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                                        </div>
                                ) : logs.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500 italic">No logs found. Send an email to trigger the worker.</div>
                                ) : (
                                        logs.map(log => (
                                                <div key={log.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors group">
                                                        <div className="flex justify-between items-start mb-1">
                                                                <div className="flex items-center gap-2 font-bold text-slate-100">
                                                                        {getIcon(log.message)}
                                                                        <span>{log.message}</span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                                                        {log.timestamp.toLocaleTimeString()}
                                                                </span>
                                                        </div>

                                                        {log.details && (
                                                                <div className="mt-2 text-xs text-slate-400 bg-black/20 p-2 rounded overflow-x-auto whitespace-pre-wrap font-mono border-l-2 border-slate-600">
                                                                        {log.details}
                                                                </div>
                                                        )}
                                                </div>
                                        ))
                                )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700 text-[10px] text-slate-500 flex justify-between">
                                <span>Displaying last 50 events</span>
                                <span>UID: {auth.currentUser?.uid}</span>
                        </div>
                </div>
        );
};
