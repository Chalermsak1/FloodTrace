import React from 'react';
import { ProvenanceMetadata } from '../types';
import { ShieldCheck, Cpu, Users, AlertTriangle, ExternalLink } from 'lucide-react';

interface Props {
  provenance?: ProvenanceMetadata;
  onClick?: () => void;
  compact?: boolean;
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance, onClick, compact = false }) => {
  if (!provenance) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span>No Provenance</span>
      </span>
    );
  }

  const cat = provenance.category;
  let bgClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  let label = "Unverified";
  let Icon = AlertTriangle;

  if (cat === 'MEASURED_FACT') {
    bgClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    label = "Measured Fact";
    Icon = ShieldCheck;
  } else if (cat === 'OFFICIAL_RECORD') {
    bgClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    label = "Official Record";
    Icon = ShieldCheck;
  } else if (cat === 'DERIVED') {
    bgClass = "bg-sky-500/10 text-sky-400 border-sky-500/20";
    label = "GIS Derived";
    Icon = Cpu;
  } else if (cat === 'MODELED') {
    bgClass = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    label = "Modeled";
    Icon = Cpu;
  } else if (cat === 'FORECAST') {
    bgClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    label = "NWP Forecast";
    Icon = Cpu;
  } else if (cat === 'CITIZEN_REPORTED') {
    bgClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    label = "Citizen Observation";
    Icon = Users;
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 ${bgClass} cursor-pointer`}
      title={`Source: ${provenance.source_agency} | Click to view audit lineage`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
      {!compact && (
        <span className="opacity-80 text-xs ml-1 font-mono uppercase">
          [{provenance.freshness_status || 'CURRENT'}]
        </span>
      )}
      <ExternalLink className="w-3 h-3 opacity-50 ml-0.5" />
    </button>
  );
};
