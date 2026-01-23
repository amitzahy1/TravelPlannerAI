import React, { useState } from 'react';
import { Trip } from '../types';
import { Map, Plane, Utensils, Hotel, Globe, Ticket, ChevronDown, MapPin, Wallet, MessageCircle, X, Sparkles, ShieldCheck, ShoppingBag, Plus, Check } from 'lucide-react';
import { TripAssistant } from './TripAssistant';
import { QuickAccessWallet } from './QuickAccessWallet';
import LoginButton from './LoginButton';

interface LayoutProps {
  children: React.ReactNode;
  activeTrip: Trip;
  trips: Trip[];
  onSwitchTrip: (tripId: string) => void;
  currentTab: string;
  onSwitchTab: (tab: string) => void;
  onOpenAdmin: () => void;
  onUpdateTrip?: (trip: Trip) => void;
  onDeleteTrip?: (tripId: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children, activeTrip, trips, onSwitchTrip, currentTab, onSwitchTab, onOpenAdmin, onUpdateTrip, onDeleteTrip
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isTripMenuOpen, setIsTripMenuOpen] = useState(false);

  // Updated Order: Itinerary -> Flights -> Hotels...
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-rubik pb-24 md:pb-0 selection:bg-blue-100 selection:text-blue-900">
      {/* Premium Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-effect border-b border-white/20 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center py-3">
            {/* Branding */}
            <div className="flex items-center gap-3 select-none cursor-pointer group">
              <div className="bg-gradient-to-tr from-sky-500 to-blue-600 text-white p-2.5 rounded-2xl shadow-lg shadow-sky-500/30 transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                <Plane className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl leading-none text-slate-800 tracking-tight">Travel Planner AI</span>
                <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest leading-none mt-0.5 opacity-80">Smart Edition</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSwitchTab(item.id)}
                  className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${currentTab === item.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                  <item.icon className={`w-4 h-4 ml-2 ${currentTab === item.id ? 'text-blue-500' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Trip Selector & Tools */}
            <div className="flex items-center gap-2">

              {/* Wallet Trigger */}
              <button
                onClick={() => setIsWalletOpen(true)}
                className="bg-slate-900 text-white px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-slate-300 hover:scale-105 transition-transform"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden md:inline">ארנק</span>
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              {/* Dropdown Trip Menu - ALWAYS VISIBLE */}
              <div className="relative group">
                <button
                  onClick={() => setIsTripMenuOpen(!isTripMenuOpen)}
                  onBlur={() => setTimeout(() => setIsTripMenuOpen(false), 200)}
                  className="flex items-center gap-2 text-slate-700 font-bold hover:text-blue-700 transition-all bg-white hover:bg-blue-50 px-3 md:px-4 py-2 rounded-xl border border-slate-200 hover:border-blue-200 text-sm shadow-sm"
                >
                  <span className="truncate max-w-[80px] md:max-w-[100px]">{activeTrip.name}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isTripMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTripMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[60] animate-fade-in origin-top-left">
                    <div className="max-h-60 overflow-y-auto">
                      {trips.map(trip => (
                        <button
                          key={trip.id}
                          onClick={() => { onSwitchTrip(trip.id); setIsTripMenuOpen(false); }}
                          className={`w-full text-right px-4 py-3 text-sm font-bold flex items-center justify-between hover:bg-slate-50 ${activeTrip.id === trip.id ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                        >
                          <span className="truncate">{trip.name}</span>
                          {activeTrip.id === trip.id && <Check className="w-4 h-4 text-blue-500" />}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 p-2">
                      <button
                        onClick={() => { onOpenAdmin(); setIsTripMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" /> ניהול טיולים
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onOpenAdmin}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="ניהול טיול"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

              {/* Login Button */}
              <div className="hidden md:block">
                <LoginButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Spacer for Fixed Header */}
      <div className="h-[70px] md:h-[80px]"></div>

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

      {/* Floating Chat Assistant Button */}
      <div className="fixed bottom-24 md:bottom-10 left-6 z-[60]">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`p-4 rounded-full shadow-2xl shadow-blue-500/30 transition-all hover:scale-110 flex items-center justify-center ${isChatOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
            }`}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>

      {/* Chat Assistant Window */}
      {isChatOpen && (
        <div className="fixed bottom-40 md:bottom-28 left-6 right-6 md:right-auto md:w-96 h-[500px] max-h-[60vh] z-[60] animate-scale-in origin-bottom-left">
          <TripAssistant trip={activeTrip} onClose={() => setIsChatOpen(false)} />
        </div>
      )}

      {/* Quick Wallet Overlay */}
      {isWalletOpen && onUpdateTrip && (
        <QuickAccessWallet
          trip={activeTrip}
          onClose={() => setIsWalletOpen(false)}
          onUpdateTrip={onUpdateTrip}
        />
      )}
    </div>
  );
};