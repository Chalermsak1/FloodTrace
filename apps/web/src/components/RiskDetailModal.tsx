import React from 'react';
import { RiskHotspot } from '../types';
import { X, ShieldAlert, Waves, CloudRain, Factory, AlertCircle, Database } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Props {
  hotspot: RiskHotspot | null;
  onClose: () => void;
  onOpenProvenanceAudit: () => void;
}

export const RiskDetailModal: React.FC<Props> = ({ hotspot, onClose, onOpenProvenanceAudit }) => {
  if (!hotspot) return null;

  const isHighProximity = hotspot.screening_priority === 'HIGH_PROXIMITY_INSPECTION_NEEDED';
  const isModerate = hotspot.screening_priority === 'MODERATE_PROXIMITY';

  const priorityBadgeColor = isHighProximity 
    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
    : isModerate 
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

  const factors = hotspot.factors;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel rounded-2xl shadow-2xl border border-slate-700/60 p-6 text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityBadgeColor}`}>
                PRIORITY #{hotspot.priority_rank} • {hotspot.priority_label}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                REG ID: {hotspot.target_id}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {hotspot.name}
            </h2>
            <p className="text-sm text-slate-400">
              ต.{hotspot.subdistrict} อ.{hotspot.district} จ.ปราจีนบุรี • DIW Category {hotspot.facility_type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explainability Core Banner */}
        <div className="my-5 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-start gap-3">
            <ShieldAlert className={`w-6 h-6 shrink-0 mt-0.5 ${isHighProximity ? 'text-rose-400' : 'text-amber-400'}`} />
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Spatial Proximity & Hydrological Screening Diagnostic
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                This facility is located <strong className="text-sky-400 font-mono">{hotspot.proximity_to_river_km} km</strong> from the <strong className="text-white">{hotspot.nearest_river_name}</strong>. Nearest automated river stage recorder (<span className="text-emerald-400">{hotspot.nearest_station_name}</span>) reports <span className="font-mono text-white">{hotspot.nearest_station_stage_msl !== null ? `${hotspot.nearest_station_stage_msl} m MSL` : 'NO DATA'}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Strict Data Integrity Notices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {/* Chemical Hazard Status */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Chemical Hazard Status</span>
            </div>
            <div className="text-xs font-semibold text-white">
              INSUFFICIENT DATA
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              DIW 101/105/106 is an industrial activity code, not a toxicity score. Official lab waste assay or inspection records are required before assigning a hazard rating.
            </p>
          </div>

          {/* Contamination Status */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Database className="w-4 h-4 shrink-0 text-sky-400" />
              <span>Contamination Status</span>
            </div>
            <div className="text-xs font-semibold text-sky-400 font-mono">
              UNCONFIRMED — NO CONTAMINATION MEASUREMENT
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              System strictly forbids declaring an area contaminated based solely on distance, flood status, or photos. Confirmed contamination requires certified chemical assays.
            </p>
          </div>
        </div>

        {/* Verified Factor Lineage Table */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Factor Lineage & Traceability (Audit Rule 5 Compliant)
          </h4>

          {factors && (
            <div className="space-y-2 text-xs">
              {/* Distance Factor */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-sky-400" />
                    Spatial River Proximity (DERIVED)
                  </span>
                  <span className="font-mono text-sky-400 font-bold">
                    {factors.spatial_proximity.value} {factors.spatial_proximity.unit}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 space-y-0.5">
                  <div><strong>Source:</strong> {factors.spatial_proximity.source}</div>
                  <div><strong>Methodology:</strong> {factors.spatial_proximity.methodology}</div>
                  <div><strong>Nearest Channel:</strong> {factors.spatial_proximity.nearest_waterway}</div>
                </div>
              </div>

              {/* River Stage Factor */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5 text-emerald-400" />
                    River Level Gauge Stage (MEASURED_FACT)
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {factors.hydrological_stage.value !== null ? `${factors.hydrological_stage.value} ${factors.hydrological_stage.unit}` : 'NO DATA'}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 space-y-0.5">
                  <div><strong>Source:</strong> {factors.hydrological_stage.source} (Station: {factors.hydrological_stage.station_name})</div>
                  <div><strong>Methodology:</strong> {factors.hydrological_stage.methodology}</div>
                  <div><strong>Distance to Gauge:</strong> {factors.hydrological_stage.distance_to_gauge_km} km</div>
                </div>
              </div>

              {/* Rain Factor */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-indigo-400" />
                    48h Rainfall Projection (FORECAST)
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {factors.forecast_rainfall_48h.value !== null ? `${factors.forecast_rainfall_48h.value} ${factors.forecast_rainfall_48h.unit}` : 'N/A'}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 space-y-0.5">
                  <div><strong>Source:</strong> {factors.forecast_rainfall_48h.source}</div>
                  <div><strong>Methodology:</strong> {factors.forecast_rainfall_48h.methodology} ({factors.forecast_rainfall_48h.status})</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Provenance Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">
              Diagnostic Provenance & Classification
            </div>
            <ProvenanceBadge provenance={hotspot.provenance} onClick={onOpenProvenanceAudit} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
            <div>
              <span className="text-slate-500 block">Classification:</span>
              <span className="text-purple-400 font-bold">{hotspot.provenance.category}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Value Nature:</span>
              <span className="text-sky-400 font-bold">{hotspot.provenance.value_nature || 'DERIVED'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Freshness:</span>
              <span className="text-emerald-400 font-bold">{hotspot.provenance.freshness_status || 'CURRENT'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Confidence:</span>
              <span className="text-slate-200 font-bold">{Math.round((hotspot.provenance.confidence ?? 0.95) * 100)}%</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-[10px] text-slate-400 font-mono">
              Calculated: {hotspot.last_calculated} | Source: {hotspot.provenance.source_agency}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
