import React from 'react';
import { AlertCircle, CircleHelp, LoaderCircle } from 'lucide-react';

type FeedbackKind = 'loading' | 'empty' | 'unavailable' | 'partial' | 'error';
type FeedbackStateProps = { kind: FeedbackKind; title: string; detail?: string };

const presentation = {
  loading: { icon: LoaderCircle, className: '', role: 'status' as const },
  empty: { icon: CircleHelp, className: 'rw-feedback-empty', role: 'status' as const },
  unavailable: { icon: CircleHelp, className: 'rw-feedback-unavailable', role: 'status' as const },
  partial: { icon: AlertCircle, className: 'rw-feedback-partial', role: 'status' as const },
  error: { icon: AlertCircle, className: 'rw-feedback-error', role: 'alert' as const },
};

export const FeedbackState: React.FC<FeedbackStateProps> = ({ kind, title, detail }) => {
  const config = presentation[kind];
  const Icon = config.icon;
  return (
    <div className={`rw-feedback ${config.className}`} role={config.role} aria-live={config.role === 'alert' ? 'assertive' : 'polite'}>
      <Icon className={`rw-feedback-icon h-5 w-5 ${kind === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
      <div>
        <p className="rw-feedback-title">{title}</p>
        {detail && <p className="rw-feedback-detail">{detail}</p>}
      </div>
    </div>
  );
};
