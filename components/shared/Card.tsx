import React from 'react';

type Variant = 'plain' | 'elevated' | 'accent' | 'interactive';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
        variant?: Variant;
        accentColor?: string; // e.g. 'bg-blue-500' — applies as a 4 px right-edge strip (RTL)
        as?: 'div' | 'article' | 'section';
        children: React.ReactNode;
}

const BASE = 'rounded-lg bg-white border border-slate-200';

const VARIANT: Record<Variant, string> = {
        plain: 'shadow-card',
        elevated: 'shadow-card-hover',
        accent: 'shadow-card',
        interactive: 'shadow-card hover:shadow-card-hover active:scale-[0.99] transition-all cursor-pointer',
};

export const Card: React.FC<CardProps> = ({
        variant = 'plain',
        accentColor,
        as: Tag = 'div',
        className = '',
        children,
        ...rest
}) => {
        const accentStrip = accentColor
                ? <span aria-hidden className={`absolute top-0 bottom-0 right-0 w-1 ${accentColor}`} />
                : null;
        return (
                <Tag className={`relative overflow-hidden ${BASE} ${VARIANT[variant]} ${className}`} {...rest}>
                        {accentStrip}
                        {children}
                </Tag>
        );
};
