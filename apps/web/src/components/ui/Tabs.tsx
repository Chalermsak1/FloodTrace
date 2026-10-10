import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
  className?: string;
  size?: 'sm' | 'md';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className = '',
  size = 'md'
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth select-none ${
        variant === 'pills' ? 'p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60' : 'border-b border-slate-200'
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`relative px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'border-[#0284C7] text-[#0284C7]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-2xs font-bold ${
                    isActive ? 'bg-blue-100 text-[#0284C7]' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              size === 'sm' ? 'py-1 text-xs' : 'min-h-[36px]'
            } ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-2xs font-bold ${
                  isActive ? 'bg-blue-50 text-[#0284C7]' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
