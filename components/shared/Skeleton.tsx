import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
        width?: string | number;
        height?: string | number;
        rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'pill' | 'none';
        className?: string;
}

const ROUND: Record<NonNullable<SkeletonProps['rounded']>, string> = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        pill: 'rounded-pill',
        none: 'rounded-none',
};

/**
 * Layout-preserving loading placeholder. Use for first-paint states
 * where we know the shape of the real content (list row, card, avatar)
 * but data hasn't arrived yet.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
        width, height, rounded = 'md', className = '', style, ...rest
}) => {
        return (
                <div
                        aria-hidden
                        className={`bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:400%_100%] animate-skeleton ${ROUND[rounded]} ${className}`}
                        style={{ width, height, ...(style || {}) }}
                        {...rest}
                />
        );
};

/** Pre-baked full-screen skeleton for the trip-list initial load. */
export const TripListSkeleton: React.FC = () => (
        <div dir="rtl" className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center gap-3">
                        <Skeleton width={44} height={44} rounded="xl" />
                        <div className="flex-1 space-y-2">
                                <Skeleton width="40%" height={18} />
                                <Skeleton width="60%" height={12} />
                        </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-card">
                                        <Skeleton height={120} rounded="lg" />
                                        <Skeleton width="75%" height={16} />
                                        <div className="flex gap-2">
                                                <Skeleton width={60} height={20} rounded="pill" />
                                                <Skeleton width={80} height={20} rounded="pill" />
                                        </div>
                                </div>
                        ))}
                </div>
        </div>
);

/** View-level skeleton for suspended lazy chunks. */
export const ViewSkeleton: React.FC = () => (
        <div dir="rtl" className="w-full max-w-6xl mx-auto px-4 py-6 space-y-5">
                <div className="flex items-center gap-3">
                        <Skeleton width={36} height={36} rounded="xl" />
                        <div className="flex-1 space-y-2">
                                <Skeleton width="30%" height={18} />
                                <Skeleton width="50%" height={12} />
                        </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                        {[0, 1, 2, 3].map(i => (
                                <Skeleton key={i} width={82} height={32} rounded="pill" />
                        ))}
                </div>
                <div className="space-y-3">
                        {[0, 1, 2, 3].map(i => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 shadow-card">
                                        <Skeleton width={48} height={48} rounded="lg" />
                                        <div className="flex-1 space-y-2">
                                                <Skeleton width="60%" height={14} />
                                                <Skeleton width="40%" height={12} />
                                                <div className="flex gap-2 pt-1">
                                                        <Skeleton width={60} height={18} rounded="pill" />
                                                        <Skeleton width={72} height={18} rounded="pill" />
                                                </div>
                                        </div>
                                </div>
                        ))}
                </div>
        </div>
);
