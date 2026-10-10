import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-xl min-h-[44px]',
    lg: 'h-12 px-6 text-base gap-2.5 rounded-xl min-h-[48px]'
  }[size];

  const variantClasses = {
    primary: 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
    outline: 'border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-medium shadow-2xs focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2',
    ghost: 'hover:bg-slate-100 text-slate-700 font-medium focus-visible:ring-2 focus-visible:ring-slate-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-xs font-semibold focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2'
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center select-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        iconLeft && <span className="shrink-0">{iconLeft}</span>
      )}
      <span>{children}</span>
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};
