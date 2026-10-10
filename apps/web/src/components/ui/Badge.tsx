import React from 'react';

export type BadgeVariant = 
  | 'critical' 
  | 'watch' 
  | 'normal' 
  | 'unmonitored' 
  | 'stale' 
  | 'nodata'
  | 'official' 
  | 'curated' 
  | 'evidence' 
  | 'unverified' 
  | 'live' 
  | 'recent'
  | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  pulse?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  pulse = false,
  size = 'sm',
  className = '',
  title
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-2xs gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-semibold'
  }[size];

  const variantClasses: Record<BadgeVariant, { base: string; dot?: string }> = {
    critical: {
      base: 'bg-red-50 text-red-700 border border-red-200/80',
      dot: 'bg-red-500'
    },
    watch: {
      base: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      dot: 'bg-amber-500'
    },
    normal: {
      base: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      dot: 'bg-emerald-500'
    },
    unmonitored: {
      base: 'bg-sky-50 text-sky-700 border border-sky-200/80',
      dot: 'bg-sky-500'
    },
    stale: {
      base: 'bg-slate-100 text-slate-600 border border-slate-200',
      dot: 'bg-slate-400'
    },
    nodata: {
      base: 'bg-slate-100 text-slate-600 border border-slate-200',
      dot: 'bg-slate-400'
    },
    official: {
      base: 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold',
      dot: 'bg-blue-600'
    },
    curated: {
      base: 'bg-slate-50 text-slate-700 border border-slate-200',
      dot: 'bg-slate-500'
    },
    evidence: {
      base: 'bg-purple-50 text-purple-700 border border-purple-200/80',
      dot: 'bg-purple-600'
    },
    unverified: {
      base: 'bg-amber-50 text-amber-800 border border-amber-200',
      dot: 'bg-amber-500'
    },
    live: {
      base: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dot: 'bg-emerald-500'
    },
    recent: {
      base: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dot: 'bg-emerald-500'
    },
    neutral: {
      base: 'bg-slate-100 text-slate-700 border border-slate-200',
      dot: 'bg-slate-400'
    }
  };

  const current = variantClasses[variant] || variantClasses.neutral;

  return (
    <span
      title={title}
      className={`inline-flex items-center font-medium rounded-full shrink-0 select-none transition-colors ${sizeClasses} ${current.base} ${className}`}
    >
      {pulse && current.dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${current.dot}`} />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
};
