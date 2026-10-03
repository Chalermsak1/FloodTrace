import React from 'react';
import { IndustrialFacility, RiskHotspot } from '../types';
import { X, Factory, ShieldAlert, MapPin, Zap, Users, DollarSign, ExternalLink } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Props {
  facility: IndustrialFacility | null;
  hotspot?: RiskHotspot;
  onClose: () => void;
  onAnalyzeRisk: (hotspot: RiskHotspot) => void;
  onOpenProvenanceAudit: () => void;
}

export const IndustrialInspector: React.FC<Props> = ({
  facility,
  hotspot,
  onClose,
  onAnalyzeRisk,
  onOpenProvenanceAudit
}) => {
  if (!facility) return null;

  const is101 = facility.facility_type === '101';
  const is106 = facility.facility_type === '106';
  const typeLabel = is101 
    ? 'Type 101: Centralized Wastewater Treatment (ปรับคุณภาพน้ำเสียรวม)' 
    : is106 
    ? 'Type 106: Industrial Waste Recycling & Recovery (รีไซเคิลของเสียอุตสาหกรรม)' 
    : 'Type 105: Industrial Waste Sorting & Separation (คัดแยกขยะอุตสาหกรรม)';

  return (
    <div className="absolute top-20 left-4 z-30 w-80 md:w-96 glass-panel rounded-2xl shadow-2xl border border-slate-700/60 p-5 text-slate-100 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div>
          <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
            DIW REG: {facility.id}
          </span>
          <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
            {facility.name}
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Facility Description */}
      <div className="my-3 space-y-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-slate-400 font-medium text-2xs mb-1">
            Registered Activity (ประกอบกิจการ)
          </div>
          <p className="text-slate-200 leading-relaxed font-sans">
            {facility.business_type}
          </p>
        </div>

        <div className="text-xs text-slate-300">
          <span className="text-purple-400 font-semibold">{typeLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>{facility.address}</span>
        </div>

        {/* Operating Metrics */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-center">
            <Zap className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
            <div className="text-2xs text-slate-400">Power</div>
            <div className="font-bold text-white text-xs">{facility.horsepower.toLocaleString()} HP</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-center">
            <Users className="w-3.5 h-3.5 text-sky-400 mx-auto mb-0.5" />
            <div className="text-2xs text-slate-400">Workers</div>
            <div className="font-bold text-white text-xs">{facility.workers} Staff</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-center">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
            <div className="text-2xs text-slate-400">Capital</div>
            <div className="font-bold text-white text-xs">{(facility.capital / 1000000).toFixed(1)}M ฿</div>
          </div>
        </div>

        {/* Geocoding Precision & Integrity */}
        <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
          <div className="flex justify-between items-center">
            <span>Coordinate Precision:</span>
            <span className="text-amber-400 font-medium">
              {facility.geocoding_precision || 'SUBDISTRICT_CENTROID'}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span>Geocoding Confidence:</span>
            <span className="text-slate-300 font-mono">
              {facility.geocoding_confidence ? `${(facility.geocoding_confidence * 100).toFixed(0)}%` : '60% (Approx)'}
            </span>
          </div>
        </div>

        {/* Chemical Hazard Assessment Audit Notice */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <div className="text-2xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Hazard Evidence Assessment</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-2xs font-semibold">
              {facility.hazard_assessment_status || 'INSUFFICIENT DATA'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            DIW 101/105/106 classification represents industrial activity only. No verified laboratory waste assay or PCD inspection violation is currently linked to this registration.
          </p>
        </div>
        {/* Provenance Lineage Card */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-2xs space-y-1 font-mono text-slate-400">
          <div className="flex justify-between items-center text-slate-300">
            <span>Data Classification:</span>
            <span className="text-purple-400 font-bold">{facility.provenance.category}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Source Organization:</span>
            <span className="text-slate-200">DIW (Min. of Industry)</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Snapshot Date:</span>
            <span className="text-slate-200">{facility.provenance.original_timestamp || '2020-05-31'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Freshness Status:</span>
            <span className="text-amber-400 font-bold">{facility.provenance.freshness_status || 'HISTORICAL'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Value Nature:</span>
            <span className="text-sky-400 font-bold">{facility.provenance.value_nature || 'RECORDED'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Geocoding Confidence:</span>
            <span className="text-emerald-400 font-bold">{facility.provenance.confidence ? `${(facility.provenance.confidence * 100).toFixed(0)}%` : '60%'}</span>
          </div>
          <div className="pt-1 text-2xs text-amber-300/80 leading-tight">
            * 112 facilities in the DIW May 2020 dataset snapshot (NOT current active status).
          </div>
        </div>
      </div>

      {/* Action to Analyze Spatial Screening */}
      {hotspot ? (
        <button
          onClick={() => onAnalyzeRisk(hotspot)}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm min-h-[40px] flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/20 transition"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>View Spatial Proximity & Hydrological Screening (Rank #{hotspot.priority_rank})</span>
        </button>
      ) : null}

      {/* Provenance Badge */}
      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-2xs">
        <span className="text-slate-500">DIW May 2020 Dataset Snapshot</span>
        <ProvenanceBadge compact provenance={facility.provenance} onClick={onOpenProvenanceAudit} />
      </div>

    </div>
  );
};
