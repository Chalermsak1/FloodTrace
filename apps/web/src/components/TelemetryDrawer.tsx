import React from 'react';
import { WaterStation, Reservoir, AlertItem } from '../types';
import { Droplets, Shield, AlertTriangle, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Props {
  stations: WaterStation[];
  reservoirs: Reservoir[];
  alerts: AlertItem[];
  onSync: () => void;
  syncing: boolean;
  onOpenProvenanceAudit: () => void;
}

export const TelemetryDrawer: React.FC<Props> = ({
  stations,
  reservoirs,
  alerts,
  onSync,
  syncing,
  onOpenProvenanceAudit
}) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
      expanded ? 'h-72' : 'h-12'
    } glass-panel border-t border-slate-700/60 shadow-2xl flex flex-col text-slate-100`}>
      
      {/* Toggler Bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="h-12 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 select-none shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE TELEMETRY STREAM</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Prachin Buri Basin: {stations.length} Water Stations • {reservoirs.length} Dams & Reservoirs
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSync();
            }}
            disabled={syncing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Live Telemetry'}</span>
          </button>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Content Panels */}
      {expanded && (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Water Stations Table */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Droplets className="w-4 h-4" />
                <span>Water Level Gauges (ThaiWater / HII)</span>
              </div>
              <ProvenanceBadge compact provenance={stations[0]?.provenance} onClick={onOpenProvenanceAudit} />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {stations.map(st => {
                const isCritical = st.status === 'CRITICAL';
                const isWarning = st.status === 'WARNING';
                const badgeColor = isCritical ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : isWarning ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                return (
                  <div key={st.id} className="p-2 rounded-lg bg-slate-800/40 border border-slate-850 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{st.name_th}</div>
                      <div className="text-[10px] text-slate-400">{st.basin} • อ.{st.district}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">
                        {st.water_level_msl !== null ? `${st.water_level_msl} m MSL` : 'NO DATA'}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {st.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reservoirs & Dams */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
                <Shield className="w-4 h-4" />
                <span>Dams & Reservoirs Telemetry (RID)</span>
              </div>
              <ProvenanceBadge compact provenance={reservoirs[0]?.provenance} onClick={onOpenProvenanceAudit} />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {reservoirs.map(r => {
                const hasLiveTelemetry = r.storage_percent !== null && r.storage_mcm !== null;
                const pct = r.storage_percent;
                return (
                  <div key={r.id} className="p-2 rounded-lg bg-slate-800/40 border border-slate-850">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-white truncate max-w-[200px]">{r.name_th}</div>
                      <div className="font-mono text-xs text-sky-400 font-bold">
                        {hasLiveTelemetry ? `${r.storage_mcm!.toFixed(1)} / ${r.capacity_mcm} MCM` : `Cap: ${r.capacity_mcm} MCM`}
                      </div>
                    </div>
                    {hasLiveTelemetry && pct !== null ? (
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${pct >= 85 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-sky-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-300/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 leading-tight">
                        The RID public API supports storage/volume/inflow/outflow fields, but usable current telemetry for the selected Prachin Buri reservoirs was unavailable/empty at audit time.
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>อ.{r.district} • Cap: {r.capacity_mcm} MCM</span>
                      <span className="font-semibold text-slate-300">
                        {hasLiveTelemetry && pct !== null ? `${pct.toFixed(1)}% Capacity` : 'Design Capacity Recorded (RID)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
