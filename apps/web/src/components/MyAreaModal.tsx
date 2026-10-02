import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Waves, 
  AlertTriangle, 
  ShieldCheck, 
  Building2, 
  Users, 
  CloudRain, 
  Compass, 
  ArrowUpRight, 
  Info,
  Activity,
  FileCheck
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenEvidenceCase?: (district: string) => void;
}

interface AreaCardData {
  area_id: string;
  district: string;
  status: string;
  flood: string;
  water: string;
  hydrological_connectivity: string;
  nearby_facilities: string;
  citizen_observations: string;
  current_laboratory_evidence: string;
  forecast: string;
  interpretation: string;
  disclaimer: string;
}

interface ConnectedWaterwayData {
  analysis_type: string;
  connected_waterway: {
    name: string;
    description: string;
    distance_to_channel_km: number;
    data_category: string;
  };
  upstream_network: {
    reach_name: string;
    flow_direction: string;
    data_category: string;
  };
  monitoring_locations: Array<{
    station_id: string;
    name_th: string;
    water_level_msl: number | null;
    status: string;
    data_category: string;
  }>;
  registered_facilities: Array<{
    facility_id: string;
    name: string;
    official_activity_category: string;
    subdistrict: string;
    district: string;
    distance_to_waterway_km: number;
    distance_to_point_km: number;
    data_category: string;
  }>;
  safety_notice: string;
  disclaimer: string;
}

const PRACHIN_DISTRICTS = [
  { id: 'PB-001', nameTh: 'เมืองปราจีนบุรี', nameEn: 'Mueang Prachin Buri', lat: 14.0509, lon: 101.3716 },
  { id: 'PB-021', nameTh: 'กบินทร์บุรี', nameEn: 'Kabin Buri (PB-021 Canonical)', lat: 13.9876, lon: 101.7214 },
  { id: 'PB-003', nameTh: 'ประจันตคาม', nameEn: 'Prachantakham', lat: 14.1167, lon: 101.5167 },
  { id: 'PB-004', nameTh: 'ศรีมหาโพธิ', nameEn: 'Si Maha Phot', lat: 13.8833, lon: 101.5167 },
  { id: 'PB-005', nameTh: 'บ้านสร้าง', nameEn: 'Ban Sang', lat: 13.9833, lon: 101.2167 },
  { id: 'PB-006', nameTh: 'นาดี', nameEn: 'Na Di', lat: 14.1833, lon: 101.9167 },
  { id: 'PB-007', nameTh: 'ศรีมโหสถ', nameEn: 'Si Mahosot', lat: 13.8833, lon: 101.4167 },
];

export const MyAreaModal: React.FC<Props> = ({ isOpen, onClose, onOpenEvidenceCase }) => {
  const [selectedArea, setSelectedArea] = useState(PRACHIN_DISTRICTS[1]); // Default to PB-021 Kabin Buri
  const [areaCard, setAreaCard] = useState<AreaCardData | null>(null);
  const [waterway, setWaterway] = useState<ConnectedWaterwayData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        fetch(`/api/v1/risk/area-card/${selectedArea.id}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
        fetch(`/api/v1/risk/connected-waterway?latitude=${selectedArea.lat}&longitude=${selectedArea.lon}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      ]).then(([cardData, waterData]) => {
        setAreaCard(cardData && !cardData.detail ? cardData : null);
        setWaterway(waterData && !waterData.detail && waterData.connected_waterway ? waterData : null);
      }).catch(() => {
        setAreaCard(null);
        setWaterway(null);
      }).finally(() => setLoading(false));
    }
  }, [isOpen, selectedArea]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFICATION RECOMMENDED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'WATCH':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'MONITOR':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'NO ACTIVE WATCH':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  My Area & Public Area Card
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  MASTER PROMPT SEC. 24 & 31
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Fail-closed area intelligence • Privacy-by-design spatial envelope
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* District Selector Tabs */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            Select Area:
          </span>
          {PRACHIN_DISTRICTS.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedArea(d)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 flex items-center gap-1.5 ${
                selectedArea.id === d.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{d.id}</span>
              <span className="text-slate-300">{d.nameTh}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <span className="text-xs font-medium">Evaluating spatial screening and upstream connectivity...</span>
            </div>
          ) : areaCard ? (
            <>
              {/* SECTION 24: PUBLIC AREA CARD */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-4">
                
                {/* Area Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="text-[11px] font-mono text-sky-400 font-semibold uppercase tracking-wider">
                      Area Code: {areaCard.area_id}
                    </div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                      {areaCard.district}
                      <span className="text-xs text-slate-400 font-normal">อำเภอ{areaCard.district} จังหวัดปราจีนบุรี</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${getStatusBadge(areaCard.status)}`}>
                      STATUS: {areaCard.status}
                    </span>
                    {onOpenEvidenceCase && (
                      <button
                        onClick={() => onOpenEvidenceCase(areaCard.district)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Evidence Packet</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Structured Evidence Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  
                  {/* Flood */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-sky-400" />
                      Flood (Official Observed Data)
                    </div>
                    <div className="font-semibold text-slate-200">{areaCard.flood}</div>
                  </div>

                  {/* Water Stage */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      Water Stage (Measured Fact)
                    </div>
                    <div className="font-semibold text-slate-200">{areaCard.water}</div>
                  </div>

                  {/* Hydrological Connectivity */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-400" />
                      Hydrological Connectivity (Modeled)
                    </div>
                    <div className="font-semibold text-slate-200">{areaCard.hydrological_connectivity}</div>
                  </div>

                  {/* Nearby Facilities */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      Nearby Facilities (Official Record)
                    </div>
                    <div className="font-semibold text-slate-200">{areaCard.nearby_facilities}</div>
                  </div>

                  {/* Citizen Observations */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      Citizen Observations (Unverified)
                    </div>
                    <div className="font-semibold text-slate-200">{areaCard.citizen_observations}</div>
                  </div>

                  {/* Current Lab Evidence */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Current Laboratory Evidence
                    </div>
                    <div className="font-semibold text-slate-400">{areaCard.current_laboratory_evidence}</div>
                  </div>

                  {/* Forecast */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 md:col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                      Forecast (Weather Simulation)
                    </div>
                    <div className="font-semibold text-slate-200">{areaCard.forecast}</div>
                  </div>

                </div>

                {/* Interpretation */}
                <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/40 text-xs text-sky-200 space-y-1">
                  <div className="font-bold text-sky-300 uppercase text-[10px] tracking-wider">
                    Screening Interpretation:
                  </div>
                  <p>{areaCard.interpretation}</p>
                </div>

                {/* Legal Disclaimer */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="font-mono">{areaCard.disclaimer}</p>
                </div>

              </div>

              {/* SECTION 25: "WHERE IS THIS WATER CONNECTED TO?" */}
              {waterway && (
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">
                        Master Prompt Section 25
                      </div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                        <Waves className="w-4 h-4 text-teal-400" />
                        Where is this water connected to?
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      {waterway.analysis_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    
                    {/* Waterway Identification */}
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Connected Waterway (Official Record)</span>
                        <div className="font-bold text-white text-sm mt-0.5">{waterway.connected_waterway.name}</div>
                        <p className="text-slate-400 text-[11px] mt-1">{waterway.connected_waterway.description}</p>
                        <div className="text-[11px] text-teal-400 mt-2 font-mono">
                          Distance to channel centerline: {waterway.connected_waterway.distance_to_channel_km} km
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Flow Direction (Modeled)</span>
                        <div className="font-semibold text-slate-300 mt-0.5">{waterway.upstream_network.flow_direction}</div>
                      </div>
                    </div>

                    {/* Upstream Facilities & Gauges */}
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Upstream Telemetry Gauges ({(waterway.monitoring_locations || []).length})
                        </span>
                        <div className="space-y-1.5 mt-2">
                          {(waterway.monitoring_locations || []).length === 0 ? (
                            <div className="text-slate-500">No monitoring gauges within 5 km of corridor</div>
                          ) : (
                            (waterway.monitoring_locations || []).map(st => (
                              <div key={st.station_id} className="flex items-center justify-between text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800">
                                <span className="font-semibold text-slate-300">{st.name_th}</span>
                                <span className="font-mono text-teal-400">
                                  {st.water_level_msl !== null ? `${st.water_level_msl} m MSL` : 'TELEMETRY RECORDED'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Upstream Registered Facilities ({(waterway.registered_facilities || []).length})
                        </span>
                        <p className="text-[10px] text-slate-500 mb-2">
                          Official DIW 101/105/106 registrations within upstream corridor. Category denotes activity type, not toxicity.
                        </p>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                          {(waterway.registered_facilities || []).slice(0, 5).map(f => (
                            <div key={f.facility_id} className="text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-slate-300 truncate max-w-[200px]">{f.name}</div>
                                <div className="text-[10px] text-slate-500">Type {f.official_activity_category} • {f.subdistrict}</div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">{f.distance_to_point_km} km</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono">
                    {waterway.safety_notice}
                  </div>
                </div>
              )}

              {/* Section 31 Privacy Guarantee */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Privacy Safeguard: Spatial envelope evaluation. Exact user GPS coordinates are never stored or logged.</span>
                <span className="font-mono text-[10px] text-sky-400">PDPA Section 37 Compliant</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-500">
          <span>FloodTrace Public Area Card Engine (v2.0-Audit)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
