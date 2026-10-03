import React from 'react';
import { Waves, CloudRain, Users, ShieldCheck, AlertTriangle, Scale, Compass, FileCheck } from 'lucide-react';
import { AlertItem } from '../types';

interface Props {
  alerts: AlertItem[];
  systemMode: 'DEVELOPMENT' | 'PRODUCTION';
  switchingMode: boolean;
  onToggleMode: () => void;
  onOpenMyArea: () => void;
  onOpenEvidenceCases: () => void;
  onOpenForecast: () => void;
  onOpenReport: () => void;
  onOpenProvenanceAudit: () => void;
  onOpenGovernance: () => void;
}

export const Navbar: React.FC<Props> = ({
  alerts,
  systemMode,
  switchingMode,
  onToggleMode,
  onOpenMyArea,
  onOpenEvidenceCases,
  onOpenForecast,
  onOpenReport,
  onOpenProvenanceAudit,
  onOpenGovernance
}) => {
  const hasCriticalAlerts = alerts.some(a => a.severity === 'CRITICAL' || a.severity === 'WARNING');

  return (
    <header className="absolute top-0 left-0 right-0 z-40 h-16 px-4 md:px-6 glass-panel border-b border-slate-700/60 shadow-lg flex items-center justify-between text-slate-100">
      
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-600/30">
          <Waves className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              FloodTrace <span className="text-sky-400 font-semibold text-xs md:text-sm">Prachin Buri</span>
            </h1>
            <button
              onClick={onToggleMode}
              disabled={switchingMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                systemMode === 'DEVELOPMENT'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
              }`}
              title="คลิกเพื่อสลับระหว่างโหมดทดสอบ (ข้อมูลจริง 112 โรงงาน) และโหมด Production Audit"
            >
              <span className={`w-2 h-2 rounded-full ${systemMode === 'DEVELOPMENT' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{switchingMode ? 'Switching...' : systemMode === 'DEVELOPMENT' ? '🟢 REAL DATA ACTIVE (112 Plants)' : '🔒 PROD AUDIT (Fail-Closed)'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Industrial Waste Sources ➔ River Flow ➔ Exposure Screening ➔ Forecast
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 md:gap-2.5">
        
        {/* My Area Button (Master Prompt Sec. 24 & 31) */}
        <button
          onClick={onOpenMyArea}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-400 transition"
          title="Select District & View Public Area Card"
        >
          <Compass className="w-4 h-4 text-sky-400" />
          <span className="hidden md:inline">My Area</span>
        </button>

        {/* Evidence Cases Button (Master Prompt Sec. 28) */}
        <button
          onClick={onOpenEvidenceCases}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-xs font-semibold text-teal-400 transition"
          title="View Environmental Verification Case Dossiers"
        >
          <FileCheck className="w-4 h-4 text-teal-400" />
          <span className="hidden md:inline">Cases</span>
        </button>

        {/* Forecast Button */}
        <button
          onClick={onOpenForecast}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
        >
          <CloudRain className="w-4 h-4 text-sky-400" />
          <span className="hidden md:inline">Forecast</span>
        </button>

        {/* Citizen Report Button */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">Citizen Report</span>
        </button>

        {/* Provenance Audit Ledger */}
        <button
          onClick={onOpenProvenanceAudit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-400 transition"
          title="Verify Data Integrity & Provenance"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden lg:inline">Data Integrity Audit</span>
        </button>

        {/* Governance & Disclaimer */}
        <button
          onClick={onOpenGovernance}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-400 transition"
          title="Project Governance, Disclaimer & Takedown"
        >
          <Scale className="w-4 h-4" />
          <span className="hidden lg:inline">Governance & Safety</span>
        </button>

        {/* Alerts Pill */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
          hasCriticalAlerts
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
            : 'bg-slate-900/60 text-slate-300 border-slate-700'
        }`}>
          <AlertTriangle className={`w-3.5 h-3.5 ${hasCriticalAlerts ? 'text-rose-400' : 'text-slate-400'}`} />
          <span>{hasCriticalAlerts ? 'Active Warning' : 'Normal Basin Status'}</span>
        </div>

      </div>

    </header>
  );
};
