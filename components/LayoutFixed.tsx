import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip } from '../types';
import { Map, Plane, Utensils, Hotel, Globe, Ticket, Compass, ChevronDown, MapPin, Wallet, X, Sparkles, Check, List, Calendar, Plus, Settings, ArrowRight, Home, Search, Mail } from 'lucide-react';
import { QuickAccessWallet } from './QuickAccessWallet';
import LoginButton from './LoginButton';
import { Mailbox } from './Mailbox';
import { MailboxButton } from './MailboxButton';
import { isMailboxTrip, claimMailboxTrip, mergeTripIntoTarget } from '../utils/mailbox';

// Helper to extract city from hotel address
const extractCityFromAddress = (address?: string): string | null => {
        if (!address) return null;
        const parts = address.split(',').map(p => p.trim());
        if (parts.length >= 2) {
                const city = parts[parts.length - 2];
                if (city && !city.match(/Philippines|Thailand|Japan|Indonesia|Malaysia/i)) {
                        return city;
                }
        }
        return parts.length > 0 ? parts[parts.length - 1] : null;
};

interface LayoutProps {
        children: React.ReactNode;
        activeTrip: Trip | null;
        trips: Trip[];
        onSwitchTrip: (tripId: string) => void;
        currentTab: string;
        onSwitchTab: (tab: string) => void;
        onOpenAdmin: () => void;
        onUpdateTrip?: (trip: Trip) => void;
        onDeleteTrip?: (tripId: string) => void;
}

const contentNavItems = [
        { id: 'itinerary', label: 'ראשי', icon: Home },
        { id: 'hotels', label: 'מלונות', icon: Hotel },
        { id: 'flights', label: 'העברות', icon: Plane },
        { id: 'food', label: 'אוכל', icon: Utensils },
        { id: 'attractions', label: 'אטרקציות', icon: Ticket },
        { id: 'map_full', label: 'מפה', icon: MapPin },
];

export const LayoutFixed: React.FC<LayoutProps> = ({
        children, activeTrip, trips, onSwitchTrip, currentTab, onSwitchTab, onOpenAdmin, onUpdateTrip, onDeleteTrip
}) => {

        const [isWalletOpen, setIsWalletOpen] = useState(false);
        const [isTripMenuOpen, setIsTripMenuOpen] = useState(false);
        const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false);
        const [isMailboxOpen, setIsMailboxOpen] = useState(false);

        const mailboxCount = useMemo(() => trips.filter(isMailboxTrip).length, [trips]);

        const handleMailboxClaim = async (tripId: string) => {
                if (!onUpdateTrip) return;
                const trip = trips.find(t => t.id === tripId);
                if (trip) onUpdateTrip(claimMailboxTrip(trip));
        };

        const handleMailboxMerge = async (sourceId: string, targetId: string) => {
                if (!onUpdateTrip || !onDeleteTrip) return;
                const source = trips.find(t => t.id === sourceId);
                const target = trips.find(t => t.id === targetId);
                if (!source || !target) return;
                onUpdateTrip(mergeTripIntoTarget(target, source));
                onDeleteTrip(sourceId);
        };

        const handleMailboxDelete = async (tripId: string) => {
                if (!onDeleteTrip) return;
                onDeleteTrip(tripId);
        };

        const handleMailboxOpen = (tripId: string) => {
                onSwitchTrip(tripId);
                setIsMailboxOpen(false);
        };

        // Dynamic route calculation
        const dynamicRoute = useMemo(() => {
                if (!activeTrip) return '';
                const cities = new Set<string>();

                activeTrip.flights?.segments?.forEach(seg => {
                        if (seg.fromCity) cities.add(seg.fromCity);
                        if (seg.toCity) cities.add(seg.toCity);
                });

                activeTrip.hotels?.forEach(hotel => {
                        const city = extractCityFromAddress(hotel.address);
                        if (city) cities.add(city);
                });

                if (cities.size === 0 && activeTrip.destination) {
                        return activeTrip.destination;
                }

                return Array.from(cities).join(' - ');
        }, [activeTrip]);

        return (
                <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-rubik pb-24 md:pb-0 selection:bg-blue-100 selection:text-blue-900" dir="rtl">
                        {/* Premium Glass Header */}
                        <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300 flex flex-col">

                                {/* ROW 1: Branding, Desktop Nav Tabs, Login */}
                                <div className="w-full border-b border-slate-100/50">
                                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[65px] flex justify-between items-center">

                                                {/* Right: Branding */}
                                                <div className="flex items-center gap-3 select-none cursor-pointer group hover:opacity-80 transition-opacity">
                                                        <div className="bg-gradient-to-tr from-blue-600 to-sky-500 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
                                                                <Plane className="w-5 h-5 transform group-hover:-rotate-12 transition-transform" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                                <span className="font-black text-xl leading-none text-slate-800 tracking-tight">WeTravel</span>
                                                                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest leading-none mt-0.5">AI Trip Organizer</span>
                                                        </div>
                                                </div>

                                                {/* Active trip pill + progress (mobile only — on desktop Row 2 has the full selector) */}
                                                {activeTrip && (
                                                        <div className="lg:hidden flex items-center gap-1.5 min-w-0 flex-1 mx-2 overflow-hidden">
                                                                <div className="relative min-w-0 flex-shrink">
                                                                        <button
                                                                                onClick={() => setIsTripDropdownOpen(v => !v)}
                                                                                title="החלף טיול"
                                                                                aria-haspopup="menu"
                                                                                aria-expanded={isTripDropdownOpen}
                                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-pill text-2xs font-bold border border-blue-100 transition-colors min-w-0 max-w-[140px]"
                                                                        >
                                                                                <MapPin className="w-3 h-3 shrink-0" />
                                                                                <span className="truncate">{activeTrip.destination || activeTrip.name}</span>
                                                                                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isTripDropdownOpen ? 'rotate-180' : ''}`} />
                                                                        </button>
                                                                        {isTripDropdownOpen && (
                                                                                <>
                                                                                        <div className="fixed inset-0 z-40" onClick={() => setIsTripDropdownOpen(false)} />
                                                                                        <div role="menu" className="absolute top-full mt-1 w-64 max-h-[60vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-100 z-50 right-0">
                                                                                                <div className="px-3 py-2 text-2xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                                                                        הטיולים שלי
                                                                                                </div>
                                                                                                {trips.map(t => (
                                                                                                        <button
                                                                                                                key={t.id}
                                                                                                                onClick={() => { onSwitchTrip(t.id); setIsTripDropdownOpen(false); }}
                                                                                                                className={`w-full text-right px-3 py-2.5 text-xs font-bold transition-colors flex items-center gap-2 ${
                                                                                                                        t.id === activeTrip.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                                                                                                }`}
                                                                                                        >
                                                                                                                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                                                                                                                <span className="truncate flex-1">{t.destination || t.name}</span>
                                                                                                                {t.id === activeTrip.id && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                                                                                        </button>
                                                                                                ))}
                                                                                                <div className="border-t border-slate-100">
                                                                                                        <button
                                                                                                                onClick={() => { onOpenAdmin(); setIsTripDropdownOpen(false); }}
                                                                                                                className="w-full text-right px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                                                        >
                                                                                                                <Plus className="w-3.5 h-3.5 text-blue-500" />
                                                                                                                <span>טיול חדש / ניהול</span>
                                                                                                        </button>
                                                                                                </div>
                                                                                        </div>
                                                                                </>
                                                                        )}
                                                                </div>
                                                        </div>
                                                )}

                                                {/* Center: Desktop Content Nav Tabs (without trip management) */}
                                                <div className="hidden lg:flex items-center gap-1 mx-4">
                                                        {contentNavItems.map(item => {
                                                                const active = currentTab === item.id;
                                                                return (
                                                                        <button
                                                                                key={item.id}
                                                                                onClick={() => onSwitchTab(item.id)}
                                                                                className={`relative flex items-center px-4 py-2.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md ${active
                                                                                        ? 'text-blue-600'
                                                                                        : 'text-slate-500 hover:text-slate-800'
                                                                                        }`}
                                                                        >
                                                                                <item.icon className={`w-4 h-4 ml-2 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                                                                                {item.label}
                                                                                {/* Active indicator — 2px underline, calmer than the
                                                                                    pill background. Animates in via opacity. */}
                                                                                <span
                                                                                        className={`absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-blue-600 transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-0'}`}
                                                                                />
                                                                        </button>
                                                                );
                                                        })}
                                                </div>

                                                {/* Left: Login, Mobile New Trip, Mobile Mailbox, & Mobile Menu */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                        <LoginButton />

                                                        {/* Mobile: quick-create new trip — always visible so users
                                                            never have to dig through the menu to start one. */}
                                                        <button
                                                                onClick={() => onOpenAdmin()}
                                                                className="lg:hidden p-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 flex-shrink-0 shadow-md shadow-blue-500/30"
                                                                aria-label="צור טיול חדש"
                                                                title="טיול חדש"
                                                        >
                                                                <Plus className="w-5 h-5" aria-hidden="true" />
                                                        </button>

                                                        {/* Mobile: persistent mailbox surface — only when there
                                                            are actual pending items. Empty-state discovery happens
                                                            via the menu overlay tile below; keeping this conditional
                                                            avoids overflowing the header on iPhone SE / mini sizes. */}
                                                        {mailboxCount > 0 && (
                                                                <MailboxButton
                                                                        count={mailboxCount}
                                                                        onClick={() => setIsMailboxOpen(true)}
                                                                        variant="mobile-icon"
                                                                />
                                                        )}

                                                        {/* Mobile Menu Trigger */}
                                                        <button
                                                                onClick={() => setIsTripMenuOpen(true)}
                                                                className="lg:hidden p-2.5 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
                                                                aria-label="פתח תפריט"
                                                        >
                                                                <List className="w-5 h-5" aria-hidden="true" />
                                                        </button>
                                                </div>
                                        </div>
                                </div>

                                {/* ROW 2: Trip Context & Tools (Desktop Only) */}
                                <div className="hidden lg:flex w-full bg-slate-50/80 backdrop-blur-sm border-b border-white/50">
                                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[55px] flex items-center justify-between w-full">

                                                {/* Right: Trip Selector + Trip Management */}
                                                <div className="flex items-center gap-2">

                                                        {/* Trip Selector (Primary) */}
                                                        <div className="relative z-50">
                                                                <button
                                                                        onClick={() => setIsTripDropdownOpen(!isTripDropdownOpen)}
                                                                        onBlur={() => setTimeout(() => setIsTripDropdownOpen(false), 200)}
                                                                        className="flex items-center gap-3 bg-white hover:bg-blue-50/50 text-slate-800 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all min-w-[220px]"
                                                                >
                                                                        <span className="font-black text-sm text-blue-600 truncate flex-1 text-right">{activeTrip?.name || 'בחר טיול'}</span>
                                                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTripDropdownOpen ? 'rotate-180' : ''}`} />
                                                                </button>

                                                                {isTripDropdownOpen && (
                                                                        <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[60] animate-fade-in">
                                                                                <div className="max-h-60 overflow-y-auto p-1">
                                                                                        {trips.map(trip => (
                                                                                                <button
                                                                                                        key={trip.id}
                                                                                                        onClick={() => { onSwitchTrip(trip.id); setIsTripDropdownOpen(false); }}
                                                                                                        className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors ${activeTrip?.id === trip.id ? 'text-blue-700 bg-blue-50' : 'text-slate-600'}`}
                                                                                                >
                                                                                                        <span className="truncate">{trip.name}</span>
                                                                                                        {activeTrip?.id === trip.id && <Check className="w-4 h-4 text-blue-600" />}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                )}
                                                        </div>

                                                        {/* Separator */}
                                                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                                        {/* New Trip Button */}
                                                        <button
                                                                onClick={() => onOpenAdmin()}
                                                                title="צור טיול חדש"
                                                                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-blue-100 hover:shadow-sm"
                                                        >
                                                                <Plus className="w-4 h-4" />
                                                                <span className="hidden xl:inline">טיול חדש</span>
                                                        </button>

                                                        {/* Separator */}
                                                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                                        {/* Trip Management Button */}
                                                        <button
                                                                onClick={() => onSwitchTab('trips')}
                                                                className={`group flex items-center gap-3 px-4 py-2 rounded-2xl text-sm font-black transition-all border shadow-sm ${currentTab === 'trips'
                                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                                                                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:shadow-lg hover:shadow-slate-900/10'
                                                                        }`}
                                                        >
                                                                <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${currentTab === 'trips'
                                                                        ? 'bg-white/12 text-white'
                                                                        : 'bg-slate-100 text-slate-600 group-hover:bg-white/12 group-hover:text-white'
                                                                        }`}>
                                                                        <Settings className="w-4 h-4" />
                                                                </span>
                                                                <span className="leading-none">ניהול טיול</span>
                                                        </button>

                                                        <button
                                                                onClick={() => setIsWalletOpen(true)}
                                                                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-white px-3 py-2 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                                                        >
                                                                <Wallet className="w-4 h-4 text-slate-500" />
                                                                <span>ארנק</span>
                                                        </button>

                                                        <MailboxButton
                                                                count={mailboxCount}
                                                                onClick={() => setIsMailboxOpen(true)}
                                                                variant="desktop-pill"
                                                        />
                                                </div>

                                        </div>
                                </div>
                        </header>

                        {/* Mobile Full-Screen Menu Overlay */}
                        {isTripMenuOpen && (
                                <div className="lg:hidden fixed inset-0 z-[100] bg-white animate-fade-in flex flex-col">
                                        <div className="p-4 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-10">
                                                <span className="font-black text-xl text-slate-800">תפריט</span>
                                                <button
                                                        onClick={() => setIsTripMenuOpen(false)}
                                                        className="p-2 bg-slate-100 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                        aria-label="סגור תפריט"
                                                >
                                                        <X className="w-6 h-6 text-slate-600" aria-hidden="true" />
                                                </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-10">
                                                {/* 1. User Profile */}
                                                <div className="bg-slate-50 p-4 rounded-2xl">
                                                        <LoginButton />
                                                </div>

                                                {/* 2. Trip Management — primary action */}
                                                <div>
                                                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">ניהול</h3>
                                                        <div className="grid grid-cols-2 gap-3">
                                                                <button
                                                                        onClick={() => { onSwitchTab('trips'); setIsTripMenuOpen(false); }}
                                                                        className="flex flex-col items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl shadow-lg shadow-slate-900/20 transition-all active:scale-95"
                                                                >
                                                                        <Settings className="w-6 h-6" />
                                                                        <span className="font-bold text-xs">ניהול טיול</span>
                                                                </button>

                                                                <button
                                                                        onClick={() => { onOpenAdmin(); setIsTripMenuOpen(false); }}
                                                                        className="flex flex-col items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                                                                >
                                                                        <Plus className="w-6 h-6" />
                                                                        <span className="font-bold text-xs">טיול חדש</span>
                                                                </button>

                                                                <button
                                                                        onClick={() => { setIsMailboxOpen(true); setIsTripMenuOpen(false); }}
                                                                        className="relative flex flex-col items-center justify-center gap-2 bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                                                                >
                                                                        {mailboxCount > 0 && (
                                                                                <span className="absolute top-2 right-2 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-white text-emerald-700 text-2xs font-black ring-2 ring-emerald-600">
                                                                                        {mailboxCount > 99 ? '99+' : mailboxCount}
                                                                                </span>
                                                                        )}
                                                                        <Mail className="w-6 h-6" />
                                                                        <span className="font-bold text-xs">תיבת דואר</span>
                                                                </button>

                                                                <button
                                                                        onClick={() => { setIsWalletOpen(true); setIsTripMenuOpen(false); }}
                                                                        className="flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200 p-4 rounded-2xl transition-all active:scale-95 border border-slate-200"
                                                                >
                                                                        <Wallet className="w-6 h-6" />
                                                                        <span className="font-bold text-xs">ארנק</span>
                                                                </button>
                                                        </div>
                                                </div>

                                                {/* 3. All Content Tabs */}
                                                <div>
                                                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">עמודים</h3>
                                                        <div className="grid grid-cols-3 gap-2">
                                                                {contentNavItems.map(item => (
                                                                        <button
                                                                                key={item.id}
                                                                                onClick={() => { onSwitchTab(item.id); setIsTripMenuOpen(false); }}
                                                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all active:scale-95 border ${currentTab === item.id
                                                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                                                                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                                                                                        }`}
                                                                        >
                                                                                <item.icon className="w-5 h-5" />
                                                                                <span className="font-bold text-xs">{item.label}</span>
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>

                                                {/* 4. Trip Switcher */}
                                                <div>
                                                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">הטיולים שלי</h3>
                                                        <div className="space-y-2">
                                                                {trips.map(trip => (
                                                                        <button
                                                                                key={trip.id}
                                                                                onClick={() => { onSwitchTrip(trip.id); setIsTripMenuOpen(false); }}
                                                                                className={`w-full text-right px-4 py-4 rounded-xl font-bold flex items-center justify-between border ${activeTrip?.id === trip.id ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 bg-white text-slate-600'}`}
                                                                        >
                                                                                <span className="truncate">{trip.name}</span>
                                                                                {activeTrip?.id === trip.id && <div className="bg-blue-600 text-white p-1 rounded-full"><Check className="w-3 h-3" /></div>}
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* Main Content Spacer for Fixed Header */}
                        <div className="h-[70px] lg:h-[120px]"></div>

                        {/* Main Content */}
                        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-6 relative z-10">
                                {children}
                        </main>

                        {/* Mobile Floating Dock — content tabs only, no trip management */}
                        <motion.nav
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 25, delay: 0.2 }}
                                className="md:hidden floating-dock"
                        >
                                {/* Content navigation items */}
                                {contentNavItems.map((item, index) => (
                                        <motion.button
                                                key={item.id}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.1 + index * 0.04, type: 'spring', stiffness: 400, damping: 20 }}
                                                whileHover={{ scale: 1.15, y: -6 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onSwitchTab(item.id)}
                                                className={`dock-item ${currentTab === item.id ? 'active' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                                                title={item.label}
                                                aria-label={item.label}
                                                aria-current={currentTab === item.id ? 'page' : undefined}
                                        >
                                                <item.icon className="w-[18px] h-[18px]" aria-hidden="true" />
                                                <span className="text-[10px] font-bold leading-none mt-1 whitespace-nowrap">{item.label}</span>

                                                {/* Active Glow */}
                                                <AnimatePresence>
                                                        {currentTab === item.id && (
                                                                <motion.div
                                                                        layoutId="dock-glow-mobile"
                                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                                        className="absolute inset-0 bg-indigo-500/20 rounded-xl -z-10"
                                                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                                />
                                                        )}
                                                </AnimatePresence>
                                        </motion.button>
                                ))}

                                {/* Divider */}
                                <div className="w-px h-8 bg-white/10 mx-1" />

                                {/* Menu button to open full-screen overlay (where trip management lives) */}
                                <motion.button
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setIsTripMenuOpen(true)}
                                        className={`dock-item ${isTripMenuOpen || currentTab === 'trips' ? 'active bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                                        title="תפריט"
                                        aria-label="פתח תפריט טיולים"
                                >
                                        <List className="w-[18px] h-[18px]" />
                                        <span className="text-[10px] font-bold leading-none mt-1 whitespace-nowrap">תפריט</span>
                                </motion.button>
                        </motion.nav>

                        {/* Quick Wallet Overlay */}
                        {isWalletOpen && onUpdateTrip && activeTrip && (
                                <QuickAccessWallet
                                        trip={activeTrip}
                                        onClose={() => setIsWalletOpen(false)}
                                        onUpdateTrip={onUpdateTrip}
                                />
                        )}

                        {/* Mailbox Panel — right-side drawer on desktop, bottom-sheet on mobile.
                            Uses the same Mailbox core as the wizard's Step3_Mailbox so the UX
                            is identical wherever the user encounters it. */}
                        <AnimatePresence>
                                {isMailboxOpen && (
                                        <>
                                                <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        onClick={() => setIsMailboxOpen(false)}
                                                        className="fixed inset-0 z-[110] bg-brand-navy/40 backdrop-blur-sm"
                                                />
                                                {/* Desktop: side drawer */}
                                                <motion.div
                                                        initial={{ x: '-100%' }}
                                                        animate={{ x: 0 }}
                                                        exit={{ x: '-100%' }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                        className="hidden md:flex fixed top-0 bottom-0 left-0 z-[120] w-full max-w-md bg-white shadow-2xl flex-col"
                                                >
                                                        <Mailbox
                                                                trips={trips}
                                                                onMergeIntoTrip={handleMailboxMerge}
                                                                onClaimAsTrip={handleMailboxClaim}
                                                                onDeleteTrip={handleMailboxDelete}
                                                                onOpenTrip={handleMailboxOpen}
                                                                onClose={() => setIsMailboxOpen(false)}
                                                        />
                                                </motion.div>
                                                {/* Mobile: bottom sheet */}
                                                <motion.div
                                                        initial={{ y: '100%' }}
                                                        animate={{ y: 0 }}
                                                        exit={{ y: '100%' }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                        className="md:hidden fixed inset-x-0 bottom-0 z-[120] h-[85vh] bg-white shadow-2xl rounded-t-3xl flex flex-col overflow-hidden"
                                                >
                                                        <div className="flex justify-center pt-2 shrink-0">
                                                                <div className="w-12 h-1.5 rounded-full bg-slate-200" />
                                                        </div>
                                                        <Mailbox
                                                                trips={trips}
                                                                onMergeIntoTrip={handleMailboxMerge}
                                                                onClaimAsTrip={handleMailboxClaim}
                                                                onDeleteTrip={handleMailboxDelete}
                                                                onOpenTrip={handleMailboxOpen}
                                                                onClose={() => setIsMailboxOpen(false)}
                                                        />
                                                </motion.div>
                                        </>
                                )}
                        </AnimatePresence>
                </div>
        );
};
