import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface RippleButtonProps extends HTMLMotionProps<"button"> {
        variant?: 'primary' | 'secondary' | 'glass';
        children: React.ReactNode;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
        children,
        variant = 'primary',
        className = '',
        ...props
}) => {
        const baseStyles = "relative overflow-hidden px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95";

        const variants = {
                primary: "bg-brand-action text-white hover:bg-blue-600 shadow-brand-action/30",
                secondary: "bg-brand-surface text-brand-navy border border-slate-200 hover:bg-slate-50",
                glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
        };

        return (
                <motion.button
                        whileTap={{ scale: 0.98 }}
                        className={`${baseStyles} ${variants[variant]} ${className}`}
                        {...props}
                >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                                {children}
                        </span>
                </motion.button>
        );
};
