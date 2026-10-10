import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  padding = 'md',
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }[padding];

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs ${
        hoverable ? 'hover:border-slate-300 hover:shadow-md transition-all' : ''
      } ${paddingClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className = '' }) => {
  return (
    <div className={`flex items-start justify-between gap-4 pb-3 sm:pb-4 border-b border-slate-100 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
