import React, { useState, useMemo } from 'react';
import { Trip } from '../types';
import { Map, Plane, Utensils, Hotel, Globe, Ticket, ChevronDown, MapPin, Wallet, MessageCircle, X, Sparkles, ShoppingBag, Check, List, User } from 'lucide-react';
// TripAssistant removed
import { QuickAccessWallet } from './QuickAccessWallet';
import LoginButton from './LoginButton';

// Helper to extract city from hotel address
const extractCityFromAddress = (address?: string): string | null => {
        if (!address) return null;
        // Common patterns: "..., City, Country" or "..., City" 
        const parts = address.split(',').map(p => p.trim());
        if (parts.length >= 2) {
                // Try second-to-last part (city before country)
                const city = parts[parts.length - 2];
                // Skip if it looks like a country
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

export const LayoutFixed: React.FC<LayoutProps> = ({
        children, activeTrip, trips, onSwitchTrip, currentTab, onSwitchTab, onOpenAdmin, onUpdateTrip, onDeleteTrip
}) => {


        const [isWalletOpen, setIsWalletOpen] = useState(false);
        const [isTripMenuOpen, setIsTripMenuOpen] = useState(false);

        // Dynamic route calculation: extract cities from flights + hotels
        const dynamicRoute = useMemo(() => {
                if (!activeTrip) return '';
                const cities = new Set<string>();

                // 1. Add flight cities (in order)
                activeTrip.flights?.segments?.forEach(seg => {
                        if (seg.fromCity) cities.add(seg.fromCity);
                        if (seg.toCity) cities.add(seg.toCity);
                });

                // 2. Add hotel cities
                activeTrip.hotels?.forEach(hotel => {
                        const city = extractCityFromAddress(hotel.address);
                        if (city) cities.add(city);
                });

                // 3. Fallback to destination if no cities extracted
                if (cities.size === 0 && activeTrip.destination) {
                        return activeTrip.destination;
                }

                return Array.from(cities).join(' - ');
        }, [activeTrip]);

        const navItems = [
                { id: 'itinerary', label: 'ראשי', icon: Map },
                { id: 'flights', label: 'טיסות', icon: Plane },
                { id: 'hotels', label: 'מלונות', icon: Hotel },
                { id: 'restaurants', label: 'אוכל', icon: Utensils },
                { id: 'attractions', label: 'אטרקציות', icon: Ticket },
                { id: 'budget', label: 'תקציב', icon: Wallet },
                { id: 'map_full', label: 'מפה', icon: MapPin },
                { id: 'shopping', label: 'קניות', icon: ShoppingBag },
        ];

        return (
                <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-rubik pb-24 md:pb-0 selection:bg-blue-100 selection:text-blue-900" dir="rtl">
                        {/* Premium Glass Header - Double Row Layout */}
                        <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300 flex flex-col">

                                {/* ROW 1: Branding, Global Nav, Login */}
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

                                                {/* Center: Desktop Nav Tabs */}
                                                <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl mx-4">
                                                        {navItems.map(item => (
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
                                                        {/* 1. Login - Now Visible on Mobile too (Icon only on mobile, full on desktop) */}
                                                        <div className="hidden md:block">
                                                                <LoginButton />
                                                        </div>
                                                        <div className="md:hidden">
                                                                {/* Simplified Login Icon for Mobile Header */}
                                                                <LoginButton /> {/* LoginButton handles its own responsive/modal logic, assuming it renders a button */}
                                                        </div>

                                                        {/* 2. Mobile Menu Trigger */}
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

                                                {/* Right: Trip Controls (Selector, Wallet, Admin) */}
                                                <div className="flex items-center gap-3">

                                                        {/* 1. Trip Selector (Primary) */}
                                                        <div className="relative group z-50">
                                                                <button
                                                                        onClick={() => setIsTripMenuOpen(!isTripMenuOpen)}
                                                                        onBlur={() => setTimeout(() => setIsTripMenuOpen(false), 200)}
                                                                        className="flex items-center gap-3 bg-white hover:bg-blue-50/50 text-slate-800 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all min-w-[220px]"
                                                                >
                                                                        <span className="font-black text-sm text-blue-600 truncate flex-1 text-right">{activeTrip?.name || 'בחר טיול'}</span>
                                                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTripMenuOpen ? 'rotate-180' : ''}`} />
                                                                </button>

                                                                {isTripMenuOpen && (
                                                                        <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[60] animate-fade-in">
                                                                                <div className="max-h-60 overflow-y-auto p-1">
                                                                                        {trips.map(trip => (
                                                                                                <button
                                                                                                        key={trip.id}
                                                                                                        onClick={() => { onSwitchTrip(trip.id); setIsTripMenuOpen(false); }}
                                                                                                        className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors ${activeTrip.id === trip.id ? 'text-blue-700 bg-blue-50' : 'text-slate-600'}`}
                                                                                                >
                                                                                                        <span className="truncate">{trip.name}</span>
                                                                                                        {activeTrip.id === trip.id && <Check className="w-4 h-4 text-blue-600" />}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                )}
                                                        </div>

                                                        <div className="w-px h-6 bg-slate-200 mx-2"></div>

                                                        {/* 2. Tools (Admin, Wallet) */}
                                                        <button
                                                                onClick={onOpenAdmin}
                                                                className="flex items-center gap-2 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 px-5 py-2.5 rounded-xl text-sm font-black transition-all border border-purple-200 shadow-sm hover:shadow-md"
                                                        >
                                                                <Sparkles className="w-4 h-4 text-purple-600" />
                                                                <span>ניהול טיולים</span>
                                                        </button>

                                                        <button
                                                                onClick={() => setIsWalletOpen(true)}
                                                                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-white px-3 py-2 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                                                        >
                                                                <Wallet className="w-4 h-4 text-slate-500" />
                                                                <span>ארנק</span>
                                                        </button>
                                                </div>

                                                {/* Left: Trip Info Badges */}
                                                <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-lg shadow-sm max-w-md">
                                                                <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                                                <span className="text-xs font-bold text-slate-600 truncate">{dynamicRoute || activeTrip?.destination || "לא צוין יעד"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                                                                <span className="text-xs font-bold text-slate-600">{activeTrip?.days ? `${activeTrip.days} ימים` : "גמיש"}</span>
                                                        </div>
                                                </div>

                                        </div>
                                </div>
                        </header>

                        {/* Mobile Menu Overlay (Fullscreen) */}
                        {
                                isTripMenuOpen && (
                                        <div className="lg:hidden fixed inset-0 z-[100] bg-white animate-fade-in flex flex-col">
                                                <div className="p-4 flex justify-between items-center border-b border-slate-100">
                                                        <span className="font-black text-xl text-slate-800">תפריט</span>
                                                        <button onClick={() => setIsTripMenuOpen(false)} className="p-2 bg-slate-100 rounded-full">
                                                                <X className="w-6 h-6 text-slate-600" />
                                                        </button>
                                                </div>

                                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                                        {/* 1. User Profile actions */}
                                                        <div className="bg-slate-50 p-4 rounded-2xl">
                                                                <LoginButton />
                                                        </div>

                                                        {/* 2. Key Actions */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                                <button
                                                                        onClick={() => { onOpenAdmin(); setIsTripMenuOpen(false); }}
                                                                        className="flex flex-col items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 p-4 rounded-2xl transition-all"
                                                                >
                                                                        <Sparkles className="w-6 h-6" />
                                                                        <span className="font-bold">ניהול טיול</span>
                                                                </button>

                                                                <button
                                                                        onClick={() => { setIsWalletOpen(true); setIsTripMenuOpen(false); }}
                                                                        className="flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200 p-4 rounded-2xl transition-all border border-slate-200"
                                                                >
                                                                        <Wallet className="w-6 h-6" />
                                                                        <span className="font-bold">ארנק</span>
                                                                </button>
                                                        </div>

                                                        {/* 3. Trip Switcher */}
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
                                )
                        }

                        {/* Main Content Spacer for Fixed Header */}
                        <div className="h-[70px] lg:h-[120px]"></div>

                        {/* Main Content */}
                        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
                                {children}
                        </main>

                        {/* Mobile Bottom Navigation - Glassmorphism */}
                        <div className="md:hidden fixed bottom-4 left-2 right-2 bg-white/95 backdrop-blur-xl border border-white/40 z-50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1.5 pb-2 overflow-x-auto scrollbar-hide">
                                <nav className="flex justify-between px-2 min-w-max gap-4">
                                        {navItems.map(item => (
                                                <button
                                                        key={item.id}
                                                        onClick={() => onSwitchTab(item.id)}
                                                        className={`flex flex-col items-center justify-center py-1.5 min-w-[3.5rem] rounded-xl transition-all ${currentTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'
                                                                }`}
                                                >
                                                        <item.icon className={`w-5 h-5 mb-0.5 ${currentTab === item.id ? 'fill-current' : ''}`} strokeWidth={currentTab === item.id ? 2.5 : 2} />
                                                        <span className={`text-[9px] font-bold leading-none ${currentTab === item.id ? 'text-blue-700' : 'text-slate-400'}`}>{item.label}</span>
                                                </button>
                                        ))}
                                </nav>
                        </div>



                        {/* Quick Wallet Overlay */}
                        {
                                isWalletOpen && onUpdateTrip && activeTrip && (
                                        <QuickAccessWallet
                                                trip={activeTrip}
                                                onClose={() => setIsWalletOpen(false)}
                                                onUpdateTrip={onUpdateTrip}
                                        />
                                )
                        }
                </div >
        );
};
