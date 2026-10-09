import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileCheck, 
  ShieldCheck, 
  Eye, 
  Cpu, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  PhoneCall, 
  Building2, 
  Waves, 
  Activity, 
  Info 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDistrict?: string;
}

interface EvidencePacketData {
  case_id: string;
  case_type: string;
  target_location: {
    province: string;
    district: string;
    coordinate_system: string;
  };
  timeline: Array<{
    timestamp: string;
    event: string;
    actor: string;
  }>;
  what_we_know: {
    summary: string;
    official_records: Array<{
      source: string;
      registered_facilities_count?: number;
      hydrological_network?: string;
      data_category: string;
    }>;
    measured_facts: Array<{
      source: string;
      telemetry_stations_reporting: number;
      data_category: string;
    }>;
  };
  what_was_observed: {
    summary: string;
    flood_observations: Array<{
      source: string;
      status: string;
      notes: string;
    }>;
    community_observations: Array<{
      count: number;
      status: string;
      notes: string;
    }>;
  };
  what_the_model_suggests: {
    summary: string;
    hydrological_connectivity: {
      model: string;
      version: string;
      finding: string;
      data_category: string;
    };
    atmospheric_forecast: {
      model: string;
      forecast_48h_precip_mm: number;
      data_category: string;
    };
  };
  what_is_unknown: {
    summary: string;
    items: Array<{
      gap: string;
      status: string;
      explanation: string;
    }>;
  };
  what_should_be_verified: {
    summary: string;
    actions: string[];
  };
  limitations_and_disclaimer: {
    disclaimer: string;
    review_status: string;
  };
}

export const EvidencePacketModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  initialDistrict = 'กบินทร์บุรี' 
}) => {
  const [district, setDistrict] = useState(initialDistrict);
  const [packet, setPacket] = useState<EvidencePacketData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`/api/v1/risk/evidence-packet/ENV-CASE-001?district=${encodeURIComponent(district)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !data.detail && data.what_we_know) {
            setPacket(data);
          } else {
            setPacket(null);
          }
        })
        .catch(() => setPacket(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, district]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Environmental Verification Case Packet
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  MASTER PROMPT SEC. 28
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tier evidence dossier strictly separating observed facts, models, and data gaps
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* District Switcher */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Target District:</span>
            <select
              value={district}
              onChange={e => setDistrict(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-teal-500 min-h-[38px]"
            >
              <option value="กบินทร์บุรี">กบินทร์บุรี (Kabin Buri)</option>
              <option value="ศรีมหาโพธิ">ศรีมหาโพธิ (Si Maha Phot)</option>
              <option value="เมืองปราจีนบุรี">เมืองปราจีนบุรี (Mueang Prachin Buri)</option>
              <option value="บ้านสร้าง">บ้านสร้าง (Ban Sang)</option>
              <option value="ประจันตคาม">ประจันตคาม (Prachantakham)</option>
              <option value="นาดี">นาดี (Na Di)</option>
              <option value="ศรีมโหสถ">ศรีมโหสถ (Si Mahosot)</option>
            </select>
          </div>
          {packet && (
            <span className="font-mono text-slate-400 text-xs">
              Dossier ID: <strong className="text-teal-400">{packet.case_id}</strong>
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <span className="text-xs font-medium">Assembling multi-source evidence packet...</span>
            </div>
          ) : packet ? (
            <>
              {/* SECTION 1: WHAT WE KNOW */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  1. What We Know (Official Records & Measured Facts)
                </div>
                <p className="text-xs sm:text-sm text-slate-300">{packet.what_we_know.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(packet.what_we_know?.official_records || []).map((r, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="px-2 py-0.5 rounded text-2xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {r.data_category}
                      </span>
                      <div className="text-slate-200 font-semibold text-xs mt-1">{r.source}</div>
                      {r.registered_facilities_count !== undefined && (
                        <div className="text-slate-400 text-xs">Facilities: {r.registered_facilities_count} registered in snapshot</div>
                      )}
                      {r.hydrological_network && (
                        <div className="text-slate-400 text-xs">Network: {r.hydrological_network}</div>
                      )}
                    </div>
                  ))}
                  {(packet.what_we_know?.measured_facts || []).map((m, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {m.data_category}
                      </span>
                      <div className="text-slate-200 font-semibold text-xs mt-1">{m.source}</div>
                      <div className="text-slate-400 text-xs">Active Telemetry Stations: {m.telemetry_stations_reporting} reporting</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: WHAT WAS OBSERVED */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <Eye className="w-4 h-4" />
                  2. What Was Observed (Satellite & Ground Observations)
                </div>
                <p className="text-xs sm:text-sm text-slate-300">{packet.what_was_observed?.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(packet.what_was_observed?.flood_observations || []).map((f, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="px-2 py-0.5 rounded text-2xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {f.status}
                      </span>
                      <div className="text-slate-200 font-semibold text-xs mt-1">{f.source}</div>
                      <div className="text-slate-400 text-xs">{f.notes}</div>
                    </div>
                  ))}
                  {(packet.what_was_observed?.community_observations || []).map((c, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="px-2 py-0.5 rounded text-2xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        CITIZEN_REPORTED • {c.status}
                      </span>
                      <div className="text-slate-200 font-semibold text-xs mt-1">Ground Reports: {c.count} notices</div>
                      <div className="text-slate-400 text-xs">{c.notes}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: WHAT THE MODEL SUGGESTS */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <Cpu className="w-4 h-4" />
                  3. What The Model Suggests (Deterministic & Numerical Simulations)
                </div>
                <p className="text-xs sm:text-sm text-slate-300">{packet.what_the_model_suggests.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {packet.what_the_model_suggests.hydrological_connectivity.data_category}
                    </span>
                    <div className="text-slate-200 font-semibold text-xs mt-1">
                      {packet.what_the_model_suggests.hydrological_connectivity.model} ({packet.what_the_model_suggests.hydrological_connectivity.version})
                    </div>
                    <div className="text-slate-400 text-xs">
                      {packet.what_the_model_suggests.hydrological_connectivity.finding}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="px-2 py-0.5 rounded text-2xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {packet.what_the_model_suggests.atmospheric_forecast.data_category}
                    </span>
                    <div className="text-slate-200 font-semibold text-xs mt-1">
                      {packet.what_the_model_suggests.atmospheric_forecast.model}
                    </div>
                    <div className="text-slate-400 text-xs">
                      Projected 48h Precipitation: {packet.what_the_model_suggests.atmospheric_forecast.forecast_48h_precip_mm} mm
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: WHAT IS UNKNOWN */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4" />
                  4. What Is Unknown (Fail-Closed Data Gaps)
                </div>
                <p className="text-xs sm:text-sm text-slate-300">{packet.what_is_unknown?.summary}</p>
                <div className="space-y-2 text-xs sm:text-sm">
                  {(packet.what_is_unknown?.items || []).map((gap, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-200">{gap.gap}</div>
                        <div className="text-slate-400 text-xs">{gap.explanation}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                        {gap.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: WHAT SHOULD BE VERIFIED */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  5. What Should Be Verified (Recommended Action Plan)
                </div>
                <p className="text-xs sm:text-sm text-slate-300">{packet.what_should_be_verified?.summary}</p>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300 list-disc list-inside">
                  {(packet.what_should_be_verified?.actions || []).map((act, i) => (
                    <li key={i} className="text-slate-300">{act}</li>
                  ))}
                </ul>
              </div>

              {/* SECTION 29: OFFICIAL REFERRAL */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    Official Reporting & Escalation Directory
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Master Prompt Sec. 29</span>
                </div>
                <p className="text-xs text-slate-400">
                  FloodTrace compiles evidence dossiers for referral to authorized regulatory bodies:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-semibold text-slate-200">PCD Pollution Hotline</div>
                    <div className="text-emerald-400 font-mono font-bold text-sm">1650</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-semibold text-slate-200">Regional Environmental Office 7</div>
                    <div className="text-slate-300 font-mono">037-247-190</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-semibold text-slate-200">Prachin Buri Industry Office</div>
                    <div className="text-slate-300 font-mono">037-452-031</div>
                  </div>
                </div>
              </div>

              {/* Legal Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="font-mono leading-relaxed">{packet.limitations_and_disclaimer.disclaimer}</p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs sm:text-sm text-slate-400">
          <span>{packet?.limitations_and_disclaimer.review_status || 'DRAFT — REQUIRES FORMAL INVESTIGATIVE REVIEW'}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition min-h-[40px] flex items-center justify-center"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
