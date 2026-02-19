import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip } from '../types';
import { Map, Plane, Utensils, Hotel, Globe, Ticket, ChevronDown, MapPin, Wallet, X, Sparkles, ShoppingBag, Check, List, Calendar, Plus, Settings, ArrowRight, Home } from 'lucide-react';
import { QuickAccessWallet } from './QuickAccessWallet';
import LoginButton from './LoginButton';

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

// Content nav tabs (excluding trip management)
const contentNavItems = [
        { id: 'itinerary', label: 'ראשי', icon: Home },
        { id: 'flights', label: 'טיסות', icon: Plane },
        { id: 'hotels', label: 'מלונות', icon: Hotel },
        { id: 'restaurants', label: 'אוכל', icon: Utensils },
        { id: 'attractions', label: 'אטרקציות', icon: Ticket },
        { id: 'budget', label: 'תקציב', icon: Wallet },
        { id: 'map_full', label: 'מפה', icon: MapPin },
        { id: 'shopping', label: 'קניות', icon: ShoppingBag },
];

export const LayoutFixed: React.FC<LayoutProps> = ({
        children, activeTrip, trips, onSwitchTrip, currentTab, onSwitchTab, onOpenAdmin, onUpdateTrip, onDeleteTrip
}) => {

        const [isWalletOpen, setIsWalletOpen] = useState(false);
        const [isTripMenuOpen, setIsTripMenuOpen] = useState(false);
        const [isTripDropdownOpen, setIsTripDropdownOpen] = useState(false);

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
                                                                <span className="font-black text-xl leading-none text-slate-800 tracking-tight">Travel Planner AI</span>
                                                                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest leading-none mt-0.5">Smart Edition</span>
                                                        </div>
                                                </div>

                                                {/* Center: Desktop Content Nav Tabs (without trip management) */}
                                                <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl mx-4">
                                                        {contentNavItems.map(item => (
                                                                <button
                                                                        key={item.id}
                                                                        onClick={() => onSwitchTab(item.id)}
                                                                        className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${currentTab === item.id
                                                                                ? 'bg-white text-blue-600 shadow-sm scale-105'
                                                                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                                                                                }`}
                                                                >
                                                                        <item.icon className={`w-4 h-4 ml-2 ${currentTab === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                                                                        {item.label}
                                                                </button>
                                                        ))}
                                                </div>

                                                {/* Left: Login & Mobile Menu */}
                                                <div className="flex items-center gap-3">
                                                        <div className="hidden md:block">
                                                                <LoginButton />
                                                        </div>
                                                        <div className="md:hidden">
                                                                <LoginButton />
                                                        </div>

                                                        {/* Mobile Menu Trigger */}
                                                        <button
                                                                onClick={() => setIsTripMenuOpen(true)}
                                                                className="lg:hidden p-2.5 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200"
                                                        >
                                                                <List className="w-5 h-5" />
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

                                                        {/* ✅ Trip Management Button — next to trip selector, like in the screenshot */}
                                                        <button
                                                                onClick={() => onSwitchTab('trips')}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${currentTab === 'trips'
                                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                                        : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm'
                                                                        }`}
                                                        >
                                                                <Sparkles className="w-4 h-4" />
                                                                <span>ניהול טיול</span>
                                                        </button>

                                                        <button
                                                                onClick={() => setIsWalletOpen(true)}
                                                                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-white px-3 py-2 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                                                        >
                                                                <Wallet className="w-4 h-4 text-slate-500" />
                                                                <span>ארנק</span>
                                                        </button>
                                                </div>

                                        </div>
                                </div>
                        </header>

                        {/* Mobile Full-Screen Menu Overlay */}
                        {isTripMenuOpen && (
                                <div className="lg:hidden fixed inset-0 z-[100] bg-white animate-fade-in flex flex-col">
                                        <div className="p-4 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-10">
                                                <span className="font-black text-xl text-slate-800">תפריט</span>
                                                <button onClick={() => setIsTripMenuOpen(false)} className="p-2 bg-slate-100 rounded-full">
                                                        <X className="w-6 h-6 text-slate-600" />
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
                                                                        className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                                                >
                                                                        <Sparkles className="w-6 h-6" />
                                                                        <span className="font-bold text-sm">ניהול טיול</span>
                                                                </button>

                                                                <button
                                                                        onClick={() => { setIsWalletOpen(true); setIsTripMenuOpen(false); }}
                                                                        className="flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200 p-4 rounded-2xl transition-all active:scale-95 border border-slate-200"
                                                                >
                                                                        <Wallet className="w-6 h-6" />
                                                                        <span className="font-bold text-sm">ארנק</span>
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
                                                className={`dock-item ${currentTab === item.id ? 'active' : ''}`}
                                                title={item.label}
                                        >
                                                <item.icon className="w-5 h-5" />

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
                                        className={`dock-item ${isTripMenuOpen || currentTab === 'trips' ? 'active bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : ''}`}
                                        title="תפריט"
                                >
                                        <List className="w-5 h-5" />
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
                </div>
        );
};
