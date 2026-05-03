/**
 * Skeleton primitives. Replace spinner-only loading states with skeletons
 * that match the eventual layout — feels faster + more "Google-grade".
 *
 *   <Skeleton.Line width="60%" />
 *   <Skeleton.Block height={120} />
 *   <Skeleton.Card />
 */

import React from 'react';

const shimmer = 'relative overflow-hidden bg-slate-200 [&::before]:absolute [&::before]:inset-0 [&::before]:-translate-x-full [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-white/60 [&::before]:to-transparent [&::before]:animate-[shimmer_1.4s_infinite]';

interface LineProps {
        width?: string | number;
        height?: number;
        className?: string;
}
const Line: React.FC<LineProps> = ({ width = '100%', height = 12, className = '' }) => (
        <div
                className={`${shimmer} rounded-md ${className}`}
                style={{ width, height }}
                aria-hidden="true"
        />
);

interface BlockProps {
        width?: string | number;
        height?: number;
        rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
        className?: string;
}
const Block: React.FC<BlockProps> = ({ width = '100%', height = 120, rounded = 'xl', className = '' }) => (
        <div
                className={`${shimmer} rounded-${rounded} ${className}`}
                style={{ width, height }}
                aria-hidden="true"
        />
);

interface CardProps {
        className?: string;
        showImage?: boolean;
        lines?: number;
}
const Card: React.FC<CardProps> = ({ className = '', showImage = true, lines = 2 }) => (
        <div className={`bg-white rounded-2xl border border-slate-100 p-3 ${className}`}>
                {showImage && <Block height={140} rounded="xl" className="mb-3" />}
                <Line width="70%" height={14} className="mb-2" />
                {Array.from({ length: lines }).map((_, i) => (
                        <Line key={i} width={i === lines - 1 ? '50%' : '90%'} height={11} className="mb-1.5" />
                ))}
        </div>
);

interface RowProps {
        className?: string;
        height?: number;
}
const Row: React.FC<RowProps> = ({ className = '', height = 56 }) => (
        <div className={`bg-white rounded-xl border border-slate-100 px-4 flex items-center gap-3 ${className}`} style={{ height }}>
                <Block width={36} height={36} rounded="lg" className="!bg-slate-100" />
                <div className="flex-1 space-y-2">
                        <Line width="60%" height={11} />
                        <Line width="80%" height={9} />
                </div>
        </div>
);

export const Skeleton = { Line, Block, Card, Row };

// Convenience: a grid of N card skeletons.
export const SkeletonCardGrid: React.FC<{ count?: number; className?: string }> = ({
        count = 6,
        className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3',
}) => (
        <div className={className}>
                {Array.from({ length: count }).map((_, i) => (
                        <Skeleton.Card key={i} />
                ))}
        </div>
);
