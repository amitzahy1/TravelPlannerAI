import React, { useState } from 'react';
import { InviteeWelcome } from '../components/onboarding/InviteeWelcome';
import { Trip } from '../types';

const DEMO_TRIP: Trip = {
    id: 'demo-trip',
    name: 'Tokyo & Kyoto 2026',
    destination: 'טוקיו ויוטו',
    destinationEnglish: 'Tokyo & Kyoto',
    dates: '2026-09-10',
    hotels: [],
    flights: { segments: [] } as any,
    restaurants: [],
    attractions: [],
    budget: 0,
    travelers: { adults: 2, children: 0, babies: 0 },
} as unknown as Trip;

const SEEN_KEY = 'demoWelcome.seen.v1';

export const DemoWelcomePage: React.FC = () => {
    const [open, setOpen] = useState(true);

    const handleReplay = () => {
        try { localStorage.removeItem(SEEN_KEY); } catch { /* noop */ }
        setOpen(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4 gap-6">
            <div className="text-white/50 text-sm font-mono">/demo-welcome — InviteeWelcome preview</div>

            {!open && (
                <button
                    onClick={handleReplay}
                    className="px-6 py-3 bg-white text-slate-800 rounded-xl font-bold shadow-lg hover:bg-slate-100 transition-colors"
                >
                    Replay modal
                </button>
            )}

            {open && (
                <InviteeWelcome
                    trip={DEMO_TRIP}
                    onDismiss={() => setOpen(false)}
                />
            )}
        </div>
    );
};
