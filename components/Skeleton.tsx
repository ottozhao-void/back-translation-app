import React from 'react';

// Base skeleton with shimmer animation
const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`animate-pulse rounded ${className}`}
        style={{ backgroundColor: 'var(--surface-hover)' }}
    />
);

// Article card skeleton - matches ArticleList card layout
export const ArticleCardSkeleton: React.FC = () => (
    <div className="glass-panel rounded-xl overflow-hidden shadow-lg">
        {/* Cover image placeholder */}
        <SkeletonBase className="h-48 w-full rounded-none" />

        {/* Content area */}
        <div className="p-6">
            {/* Category badge */}
            <SkeletonBase className="h-3 w-16 mb-3" />

            {/* Title */}
            <SkeletonBase className="h-6 w-full mb-2" />
            <SkeletonBase className="h-6 w-3/4 mb-4" />

            {/* Footer */}
            <div className="flex justify-between items-end mt-4">
                <SkeletonBase className="h-3 w-20" />
                <SkeletonBase className="h-3 w-12" />
            </div>
        </div>
    </div>
);

// Grid of article card skeletons
export const ArticleListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10 pb-20 max-w-7xl mx-auto">
        {/* Upload card placeholder */}
        <div
            className="glass-panel rounded-xl overflow-hidden border-dashed border-2 flex flex-col items-center justify-center min-h-[300px] gap-4"
            style={{ borderColor: 'var(--border-high-contrast)' }}
        >
            <SkeletonBase className="w-16 h-16 rounded-full" />
            <SkeletonBase className="h-3 w-24" />
        </div>

        {/* Article card skeletons */}
        {Array.from({ length: count }).map((_, idx) => (
            <ArticleCardSkeleton key={idx} />
        ))}
    </div>
);

// Text line skeleton
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className = ''
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, idx) => (
            <SkeletonBase
                key={idx}
                className={`h-4 ${idx === lines - 1 ? 'w-2/3' : 'w-full'}`}
            />
        ))}
    </div>
);

// Circular skeleton (for avatars, icons)
export const CircleSkeleton: React.FC<{ size?: string }> = ({ size = 'w-10 h-10' }) => (
    <SkeletonBase className={`${size} rounded-full`} />
);

// Sentence practice area skeleton
export const SentencePracticeSkeleton: React.FC = () => (
    <div className="flex flex-col h-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <SkeletonBase className="h-6 w-32" />
            <SkeletonBase className="h-8 w-8 rounded-full" />
        </div>

        {/* Source text area */}
        <div className="glass-panel rounded-xl p-6 mb-4">
            <SkeletonBase className="h-4 w-20 mb-3" />
            <TextSkeleton lines={2} />
        </div>

        {/* Input area */}
        <div className="glass-panel rounded-xl p-6 flex-1">
            <SkeletonBase className="h-4 w-24 mb-3" />
            <SkeletonBase className="h-24 w-full rounded-lg" />
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 mt-6">
            <SkeletonBase className="h-10 w-24 rounded-lg" />
            <SkeletonBase className="h-10 w-24 rounded-lg" />
        </div>
    </div>
);

// Generic loading spinner with text
export const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
    <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative w-12 h-12">
            <div
                className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }}
            />
            <div
                className="absolute inset-2 rounded-full border-2 border-b-transparent animate-spin"
                style={{
                    borderColor: 'var(--text-secondary)',
                    borderBottomColor: 'transparent',
                    animationDirection: 'reverse',
                    animationDuration: '0.8s'
                }}
            />
        </div>
        <span className="text-sm font-light" style={{ color: 'var(--text-secondary)' }}>
            {text}
        </span>
    </div>
);
