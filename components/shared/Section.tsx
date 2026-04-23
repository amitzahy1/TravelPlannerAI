import React from 'react';

interface SectionProps {
        title: string;
        subtitle?: string;
        icon?: React.ReactNode;
        action?: React.ReactNode;
        dense?: boolean;
        children: React.ReactNode;
        className?: string;
}

export const Section: React.FC<SectionProps> = ({
        title, subtitle, icon, action, dense = false, children, className = '',
}) => {
        return (
                <section className={`${dense ? 'mb-4' : 'mb-6'} ${className}`}>
                        <header className={`flex items-center justify-between gap-3 ${dense ? 'mb-2' : 'mb-3'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                        {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
                                        <div className="min-w-0">
                                                <h2 className="text-lg font-bold text-slate-900 truncate">{title}</h2>
                                                {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
                                        </div>
                                </div>
                                {action && <div className="shrink-0">{action}</div>}
                        </header>
                        {children}
                </section>
        );
};
