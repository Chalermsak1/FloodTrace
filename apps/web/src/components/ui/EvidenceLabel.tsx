import React from 'react';
import { Layers3, ShieldCheck, Users } from 'lucide-react';

export type EvidenceFamily = 'OFFICIAL' | 'COMMUNITY' | 'MODEL';

const evidenceStyle: Record<EvidenceFamily, { icon: typeof ShieldCheck; className: string }> = {
  OFFICIAL: { icon: ShieldCheck, className: 'rw-evidence-official' },
  COMMUNITY: { icon: Users, className: 'rw-evidence-community' },
  MODEL: { icon: Layers3, className: 'rw-evidence-model' },
};

export const EvidenceLabel: React.FC<{ family: EvidenceFamily; detail?: string }> = ({ family, detail }) => {
  const config = evidenceStyle[family];
  const Icon = config.icon;
  return (
    <span className={`rw-evidence-label ${config.className}`}>
      <Icon aria-hidden="true" />
      <span>{family}</span>
      {detail && <span className="font-medium normal-case tracking-normal">· {detail}</span>}
    </span>
  );
};
