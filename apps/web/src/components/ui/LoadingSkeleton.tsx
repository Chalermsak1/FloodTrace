import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = 'h-4 w-full',
  count = 1
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-200/70 rounded-lg ${className}`}
        />
      ))}
    </>
  );
};

export const CardSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-subtle space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-5 bg-slate-200 rounded-full w-16" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
};
