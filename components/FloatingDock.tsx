import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
        Map, Calendar, Hotel, Plane, Utensils, Mountain, Settings, Plus, Sparkles
} from 'lucide-react';

interface DockItem {
        id: string;
        icon: React.ElementType;
        label: string;
        gradient?: string;
}

interface FloatingDockProps {
        activeTab: string;
        onTabChange: (tab: string) => void;
        onAddClick?: () => void;
}

const dockItems: DockItem[] = [
        { id: 'itinerary', icon: Calendar, label: 'לו״ז' },
        { id: 'map', icon: Map, label: 'מפה' },
        { id: 'hotels', icon: Hotel, label: 'מלונות' },
        { id: 'flights', icon: Plane, label: 'טיסות' },
        { id: 'restaurants', icon: Utensils, label: 'מסעדות' },
        { id: 'attractions', icon: Mountain, label: 'אטרקציות' },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({
        activeTab,
        onTabChange,
        onAddClick
}) => {
        return (
                <motion.nav
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                                type: 'spring',
                                stiffness: 260,
                                damping: 25,
                                delay: 0.2
                        }}
                        className="floating-dock"
                >
                        {/* Main Navigation Items */}
                        {dockItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;

                                return (
                                        <motion.button
                                                key={item.id}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{
                                                        delay: 0.1 + index * 0.05,
                                                        type: 'spring',
                                                        stiffness: 400,
                                                        damping: 20
                                                }}
                                                whileHover={{
                                                        scale: 1.15,
                                                        y: -6,
                                                        transition: { type: 'spring', stiffness: 400, damping: 17 }
                                                }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onTabChange(item.id)}
                                                className={`dock-item ${isActive ? 'active' : ''}`}
                                        >
                                                <Icon className="w-5 h-5" />

                                                {/* Active indicator glow */}
                                                <AnimatePresence>
                                                        {isActive && (
                                                                <motion.div
                                                                        layoutId="dock-glow"
                                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                                        className="absolute inset-0 bg-indigo-500/20 rounded-xl -z-10"
                                                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                                />
                                                        )}
                                                </AnimatePresence>

                                                {/* Tooltip on hover */}
                                                <motion.span
                                                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                        whileHover={{ opacity: 1, y: -8, scale: 1 }}
                                                        className="absolute -top-8 text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none"
                                                >
                                                        {item.label}
                                                </motion.span>
                                        </motion.button>
                                );
                        })}

                        {/* Divider */}
                        <div className="w-px h-8 bg-white/10 mx-1" />

                        {/* Add Button - Special CTA */}
                        {onAddClick && (
                                <motion.button
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{
                                                delay: 0.4,
                                                type: 'spring',
                                                stiffness: 300,
                                                damping: 20
                                        }}
                                        whileHover={{
                                                scale: 1.2,
                                                rotate: 90,
                                                transition: { type: 'spring', stiffness: 400, damping: 15 }
                                        }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onAddClick}
                                        className="dock-item bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                                >
                                        <Plus className="w-5 h-5" />
                                </motion.button>
                        )}

                        {/* Settings */}
                        <motion.button
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{
                                        scale: 1.1,
                                        rotate: 45,
                                        transition: { type: 'spring', stiffness: 300, damping: 15 }
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onTabChange('admin')}
                                className={`dock-item ${activeTab === 'admin' ? 'active' : ''}`}
                        >
                                <Settings className="w-5 h-5" />
                        </motion.button>
                </motion.nav>
        );
};

export default FloatingDock;
