import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  maxWidth = '2xl',
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Accessible Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl'
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidthClass} bg-white rounded-2xl sm:rounded-3xl shadow-modal border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-100 bg-white/95 backdrop-blur-xs sticky top-0 z-10 shrink-0">
          <div className="space-y-1 pr-6 min-w-0">
            {badge && <div className="mb-1.5">{badge}</div>}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer min-h-[32px] min-w-[32px] focus-visible:ring-2 focus-visible:ring-[#0284C7]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
