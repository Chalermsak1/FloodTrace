import React from 'react';
import { HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200/80 flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
        {icon || <HelpCircle className="w-6 h-6" />}
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-sm sm:text-base font-bold text-slate-800">
          {title}
        </h4>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
