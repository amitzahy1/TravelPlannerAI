/**
 * Admin "Model Health" panel — on-demand probe of every Gemini + OpenRouter
 * model in our fallback chains. Surfaces which models are actually reachable
 * for the current Cloudflare Worker keys, and shows a concrete remediation
 * action per failure (which Google Cloud project to fix, which page to open).
 *
 * The probe is admin-triggered only (no auto-run on mount). Results are
 * cached in sessionStorage for 10 minutes — `generateWithFallback` consults
 * the same cache to drop dead models from the chain.
 *
 * Use this panel when AI requests are failing and you need to identify the
 * misconfigured key/project without reading raw 429 errors in the console.
 */

import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Loader2, Download } from 'lucide-react';
import { GOOGLE_MODELS } from '../../services/aiService';
import { probeModels, readProbeCache, clearProbeCache, syncModelsOnWorker, getCachedRemoteChains, type ProbeBundle, type ProbeResult } from '../../services/aiHealth';
import { toast } from '../../stores/useToastStore';

const STATUS_TONE: Record<string, string> = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    QUOTA: 'bg-amber-50 text-amber-800 border-amber-200',
    PERMISSION: 'bg-rose-50 text-rose-700 border-rose-200',
    INVALID_MODEL: 'bg-slate-100 text-slate-700 border-slate-300',
    AUTH: 'bg-rose-50 text-rose-700 border-rose-200',
    TIMEOUT: 'bg-amber-50 text-amber-800 border-amber-200',
    UNKNOWN: 'bg-rose-50 text-rose-700 border-rose-200',
};

const StatusIcon: React.FC<{ result: ProbeResult }> = ({ result }) => {
    if (result.ok) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (result.errorKind === 'INVALID_MODEL' || result.errorKind === 'PERMISSION' || result.errorKind === 'AUTH') {
        return <XCircle className="w-4 h-4 text-rose-600" />;
    }
    return <AlertTriangle className="w-4 h-4 text-amber-600" />;
};

// Render remediation text with any URLs as clickable links.
const renderRemediation = (text: string): React.ReactNode => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5">
                    {part}<ExternalLink className="w-3 h-3" />
                </a>
            );
        }
        return <span key={i}>{part}</span>;
    });
};

const formatProbedAt = (ms: number): string => {
    const ageSec = Math.round((Date.now() - ms) / 1000);
    if (ageSec < 60) return `${ageSec}s ago`;
    if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`;
    return new Date(ms).toLocaleTimeString();
};

export const ModelHealthPanel: React.FC = () => {
    const [bundle, setBundle] = useState<ProbeBundle | null>(() => readProbeCache());
    const [running, setRunning] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [remoteChainsInfo, setRemoteChainsInfo] = useState(() => getCachedRemoteChains());

    // Background-research auto-trigger toggle. Off by default since 2026-05-21
    // because each run fires ~4 grounded SEARCH calls (= ~$0.20-0.50 of Gemini
    // quota) on every new trip creation, often before the user even navigates
    // to the relevant tabs.
    const [autoBgResearch, setAutoBgResearch] = useState<boolean>(() => {
        try { return localStorage.getItem('autoBgResearch') === 'true'; } catch { return false; }
    });
    const toggleAutoBg = () => {
        const next = !autoBgResearch;
        setAutoBgResearch(next);
        try { localStorage.setItem('autoBgResearch', next ? 'true' : 'false'); } catch { /* ignore */ }
        toast.success(next
            ? 'מחקר רקע אוטומטי הופעל — טיולים חדשים יקבלו המלצות AI אוטומטית.'
            : 'מחקר רקע אוטומטי כובה — חיסכון של ~$0.30 לכל טיול חדש.',
        );
    };

    // Refresh the cache view periodically so "X seconds ago" stays accurate.
    useEffect(() => {
        const id = setInterval(() => {
            const fresh = readProbeCache();
            if (fresh) setBundle(fresh);
            // Also refresh the dynamic-chain freshness banner.
            setRemoteChainsInfo(getCachedRemoteChains());
        }, 30_000);
        return () => clearInterval(id);
    }, []);

    // Always probe what the LIVE chain knows about — when the dynamic-sync has
    // populated remoteChainsInfo, use that; otherwise fall back to the hardcoded
    // constants. Ensures we don't probe a stale model list when the cron has
    // already published a newer one.
    const uniqueModels = React.useMemo(() => {
        const chains = remoteChainsInfo?.chains ?? GOOGLE_MODELS;
        const all = new Set<string>([
            ...chains.SMART_CANDIDATES,
            ...chains.RESEARCH_CANDIDATES,
            ...chains.FAST_CANDIDATES,
            ...chains.DOC_CANDIDATES,
        ]);
        return Array.from(all);
    }, [remoteChainsInfo]);

    const handleProbe = async () => {
        setRunning(true);
        try {
            const result = await probeModels(uniqueModels);
            setBundle(result);
            const failed = result.results.filter(r => !r.ok).length;
            if (failed === 0) {
                toast.success(`כל ${result.results.length} המודלים תקינים.`);
            } else {
                toast.warning(`${failed} מתוך ${result.results.length} מודלים נכשלו — ראה טבלה.`);
            }
        } catch (err: any) {
            toast.error(`בדיקת מודלים נכשלה: ${err?.message?.slice(0, 120) || 'unknown'}`);
        } finally {
            setRunning(false);
        }
    };

    const handleClear = () => {
        clearProbeCache();
        setBundle(null);
        toast.success('מטמון בדיקת מודלים נוקה.');
    };

    // Trigger a fresh sync of all provider catalogs on the Worker. Pulls
    // Groq + OpenRouter + Gemini model lists, runs the categorizer, and
    // rewrites the KV cache. The cron runs this daily at 04:00 UTC — this
    // button is for when a provider just shipped a new model and we don't
    // want to wait.
    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await syncModelsOnWorker();
            setRemoteChainsInfo({ chains: result.chains, syncedAt: result.syncedAt, providerStats: result.providerStats });
            const stats = result.providerStats || {};
            const ok = Object.values(stats).filter((s: any) => s.ok).length;
            const failed = Object.values(stats).filter((s: any) => !s.ok).length;
            const total = (result.models || []).length;
            if (failed === 0) {
                toast.success(`סנכרון הצליח — ${total} מודלים מ-${ok} ספקים.`);
            } else {
                toast.warning(`סנכרון הסתיים עם ${failed} שגיאות מתוך ${ok + failed} ספקים — ראה קונסולה.`);
            }
            console.log('[ModelHealthPanel] sync result', result);
        } catch (err: any) {
            toast.error(`סנכרון נכשל: ${err?.message?.slice(0, 140) || 'unknown'}`);
        } finally {
            setSyncing(false);
        }
    };

    const sortedResults: ProbeResult[] = bundle
        ? [...bundle.results].sort((a, b) => Number(b.ok) - Number(a.ok) || a.model.localeCompare(b.model))
        : [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-900">בדיקת מודלים (Model Health)</h3>
                </div>
                <div className="flex items-center gap-2">
                    {bundle && (
                        <button
                            onClick={handleClear}
                            className="text-xs text-slate-500 hover:text-slate-700 underline"
                        >
                            נקה מטמון
                        </button>
                    )}
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        title="מושך את רשימת המודלים הנוכחית מ-Groq + OpenRouter + Gemini ובונה מחדש את שרשרת ה-fallback. רץ אוטומטית פעם ביום."
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {syncing ? 'מסנכרן…' : 'סנכרן מודלים'}
                    </button>
                    <button
                        onClick={handleProbe}
                        disabled={running}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {running ? 'בודק…' : 'בדוק עכשיו'}
                    </button>
                </div>
            </div>

            {/* Dynamic-chain freshness banner — shows when the chain config was
                last synced from provider catalogs. The cron updates this daily;
                the green "סנכרן מודלים" button forces an immediate refresh. */}
            {remoteChainsInfo && (
                <div className="text-2xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>שרשרת מודלים דינמית · עודכנה {formatProbedAt(remoteChainsInfo.syncedAt)} · {uniqueModels.length} מודלים מקטלוג חי</span>
                </div>
            )}

            {/* Background research auto-trigger toggle. Off by default (saves
                $0.20-0.50 of Gemini quota per new trip). Admin can opt back in
                if they want pre-baked AI recommendations to be ready when the
                user navigates to the food / attractions tabs. */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm">מחקר רקע אוטומטי</div>
                    <div className="text-2xs text-slate-500 mt-0.5">
                        כשכבוי: טיולים חדשים נשמרים בלי המלצות AI אוטומטיות. ה-AI רץ רק כשהמשתמש לוחץ ידנית
                        ב-Food / Attractions. <strong>חיסכון: ~$0.30 לטיול חדש.</strong>
                        כשמופעל: 4 קריאות SEARCH grounded חוצות-מודל פועלות ברקע על כל טיול חדש.
                    </div>
                </div>
                <button
                    onClick={toggleAutoBg}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                        autoBgResearch ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    title={autoBgResearch ? 'מופעל — לחץ לכבות' : 'כבוי — לחץ להפעיל'}
                >
                    <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform translate-y-0.5 ${
                            autoBgResearch ? 'translate-x-0.5' : 'translate-x-[22px]'
                        }`}
                    />
                </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
                בודק חיבור לכל מודלי Gemini ו-OpenRouter המוגדרים בשרשרת fallback.
                תוצאות נשמרות ל-10 דקות וגם משמשות את <code>generateWithFallback</code> כדי לדלג על מודלים שאינם פעילים.
            </p>

            {bundle && (
                <div className="text-xs text-slate-500 mb-2">
                    בדיקה אחרונה: {formatProbedAt(bundle.probedAt)} · {bundle.results.length} מודלים
                </div>
            )}

            {!bundle && (
                <div className="text-sm text-slate-500 italic py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    טרם בוצעה בדיקה. לחץ "בדוק עכשיו" כדי לראות אילו מודלים זמינים למפתחות הנוכחיים.
                </div>
            )}

            {bundle && (
                <div className="space-y-1.5">
                    {sortedResults.map((r) => {
                        const toneKey = r.ok ? 'ok' : (r.errorKind || 'UNKNOWN');
                        const tone = STATUS_TONE[toneKey] || STATUS_TONE.UNKNOWN;
                        return (
                            <div key={r.model} className={`border rounded-lg p-3 ${tone}`}>
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <StatusIcon result={r} />
                                        <span className="font-mono text-sm font-semibold truncate" title={r.model}>{r.model}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs whitespace-nowrap">
                                        <span title="last 4 chars of the API key used">key={r.key} {r.keyTail}</span>
                                        <span>{r.latencyMs}ms</span>
                                    </div>
                                </div>
                                {!r.ok && r.errorKind && (
                                    <div className="text-xs mt-1">
                                        <span className="font-bold">{r.errorKind}:</span>{' '}
                                        {r.remediation ? renderRemediation(r.remediation) : (r.errorDetail || 'no detail')}
                                    </div>
                                )}
                                {!r.ok && r.errorDetail && r.errorDetail !== r.remediation && (
                                    <details className="mt-1">
                                        <summary className="text-xs cursor-pointer opacity-70">פרטים טכניים</summary>
                                        <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all opacity-80">{r.errorDetail}</pre>
                                    </details>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
