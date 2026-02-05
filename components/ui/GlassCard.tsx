import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
        children: React.ReactNode;
        className?: string;
        hoverEffect?: boolean;
        onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
        children,
        className = '',
        hoverEffect = false,
        onClick
}) => {
        return (
                <motion.div
                        whileHover={hoverEffect ? { scale: 1.02, y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' } : {}}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        onClick={onClick}
                        className={`
        relative overflow-hidden rounded-2xl
        bg-white/60 backdrop-blur-xl border border-white/40
        shadow-xl shadow-brand-navy/5
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
                >
                        {/* Subtle Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

                        {/* Content */}
                        <div className="relative z-10">
                                {children}
                        </div>
                </motion.div>
        );
};
