import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  ArrowRight, 
  CloudRain, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin,
  Newspaper,
  Droplets,
  ExternalLink,
  ShieldCheck,
  Activity,
  Calendar,
  Layers,
  Info,
  Radio,
  FileText,
  Camera
} from 'lucide-react';

export interface AreaAnalysisData {
  cell_id?: string;
  cell_name?: string;
  subdistrict?: string;
  district?: string;
  priority_level?: string;
  priority_label_th?: string;
  priority_score?: number;
  priority_badge?: string;
  color?: string;
  freshness?: string;
  contributing_factors?: string[];
  water_summary?: string;
  rain_24h_mm?: number | null;
  citizen_report_count?: number;
  verified_report_count?: number;
  external_evidence_count?: number;
  independent_evidence_count?: number;
  contradicting_evidence_count?: number;
  waterway_name?: string;
  distance_to_waterway_km?: number;
  is_waterway?: boolean;
  segment_id?: string;
  waterway_id?: string;
  station_id?: string;
  [key: string]: any;
}

interface AreaAnalysisPanelProps {
  data: AreaAnalysisData | null;
  onClose: () => void;
}

type PanelTab = 'overview' | 'water' | 'news' | 'evidence' | 'citizen' | 'timeline';

const parseFactor = (raw: string) => {
  const text = raw.trim();
  let type: 'verified' | 'warning' | 'limitation' | 'general' = 'general';
  let cleanText = text;

  if (text.startsWith('✓')) {
    type = 'verified';
    cleanText = text.replace(/^✓\s*/, '');
  } else if (text.startsWith('⚠️') || text.startsWith('!')) {
    type = 'warning';
    cleanText = text.replace(/^(⚠️|!)\s*/, '');
  } else if (text.startsWith('○')) {
    type = 'limitation';
    cleanText = text.replace(/^○\s*/, '');
  }

  let title = cleanText;
  let detail: string | null = null;

  if (cleanText.includes(':')) {
    const parts = cleanText.split(':');
    title = parts[0].trim();
    detail = parts.slice(1).join(':').trim();
  } else if (cleanText.includes('—')) {
    const parts = cleanText.split('—');
    title = parts[0].trim();
    detail = parts.slice(1).join('—').trim();
  } else if (cleanText.includes('(') && cleanText.endsWith(')')) {
    const match = cleanText.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      title = match[1].trim();
      detail = match[2].trim();
    }
  }

  return { type, title, detail, original: cleanText };
};

export const AreaAnalysisPanel: React.FC<AreaAnalysisPanelProps> = ({ data, onClose }) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const touchStartY = useRef<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch unified area intelligence whenever selected area / reach / station changes
  useEffect(() => {
    if (!data) {
      setIntelligence(null);
      return;
    }

    const district = data.district || '';
    const subdistrict = data.subdistrict || '';
    const reachId = data.segment_id || data.waterway_id || '';
    const stationId = data.station_id || '';

    setLoading(true);
    const params = new URLSearchParams();
    if (district) params.append('district', district);
    if (subdistrict) params.append('subdistrict', subdistrict);
    if (reachId) params.append('reach_id', reachId);
    if (stationId) params.append('station_id', stationId);

    fetch(`/api/public/area-intelligence?${params.toString()}`)
      .then(res => res.ok ? res.json() : null)
      .then(result => {
        setIntelligence(result);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [data?.district, data?.subdistrict, data?.segment_id, data?.waterway_id, data?.station_id]);

  if (!data) return null;

  const areaTitle = intelligence?.overview?.title || data.cell_name || (data.subdistrict ? `ต.${data.subdistrict} (อ.${data.district})` : `อ.${data.district || 'เมืองปราจีนบุรี'}`);
  const areaSubtitle = intelligence?.overview?.subtitle || (data.district ? `อำเภอ${data.district} จังหวัดปราจีนบุรี` : 'จังหวัดปราจีนบุรี');
  const priorityColor = data.color || '#0284c7';
  const priorityBadge = data.priority_badge || data.priority_level || (data.is_waterway ? 'ลำน้ำ' : 'ปานกลาง');

  // Parsed Factors
  const factors = (data.contributing_factors || []).map(parseFactor);
  const warningFactors = factors.filter(f => f.type === 'warning');
  const verifiedFactors = factors.filter(f => f.type === 'verified');
  const limitationFactors = factors.filter(f => f.type === 'limitation');
  const generalFactors = factors.filter(f => f.type === 'general');
  const displayFactors = [...warningFactors, ...verifiedFactors, ...generalFactors];

  // Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 40 && isMobileExpanded) setIsMobileExpanded(false);
    else if (diff < -30 && !isMobileExpanded) setIsMobileExpanded(true);
    touchStartY.current = null;
  };

  const totalNews = intelligence?.news?.length ?? 0;
  const totalEvidence = intelligence?.external_evidence?.length ?? 0;
  const totalReports = intelligence?.citizen_reports?.length ?? 0;
  const totalWaterStations = intelligence?.water_and_rainfall?.water_stations?.length ?? 0;
  const totalRainStations = intelligence?.water_and_rainfall?.rainfall_stations?.length ?? 0;
  const reaches = intelligence?.water_and_rainfall?.reaches ?? [];

  // Tab navigation items with counts
  const tabs: { key: PanelTab; label: string; count?: number }[] = [
    { key: 'overview', label: 'ภาพรวม' },
    { key: 'water', label: 'ระดับน้ำ & ฝน', count: totalWaterStations + totalRainStations },
    { key: 'news', label: 'ข่าวสาร', count: totalNews },
    { key: 'evidence', label: 'หลักฐาน', count: totalEvidence },
    { key: 'citizen', label: 'รายงาน', count: totalReports },
    { key: 'timeline', label: 'ลำดับเวลา', count: intelligence?.timeline?.length ?? 0 }
  ];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-2xs font-medium">กำลังรวบรวมข้อมูลโทรมาตร ข่าวสาร และรายงาน...</span>
        </div>
      );
    }

    // 1. OVERVIEW TAB
    if (activeTab === 'overview') {
      return (
        <div className="space-y-3">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-3xs text-blue-800 font-medium block">สถานีระดับน้ำ</span>
                <span className="text-sm font-bold text-blue-950">{totalWaterStations} สถานี</span>
              </div>
              <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-3xs text-sky-800 font-medium block">สถานีวัดน้ำฝน</span>
                <span className="text-sm font-bold text-sky-950">{totalRainStations} สถานี</span>
              </div>
              <CloudRain className="w-4 h-4 text-sky-600 shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
              <div>
                <span className="text-3xs text-amber-800 font-medium block">ข่าวสารทางการ</span>
                <span className="text-sm font-bold text-amber-950">{totalNews} ข่าว</span>
              </div>
              <Newspaper className="w-4 h-4 text-amber-600 shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-100 flex items-center justify-between">
              <div>
                <span className="text-3xs text-teal-800 font-medium block">รายงานประชาชน</span>
                <span className="text-sm font-bold text-teal-950">{totalReports} เรื่อง</span>
              </div>
              <Users className="w-4 h-4 text-teal-600 shrink-0" />
            </div>
          </div>

          {/* Primary Water Reaches in this Area */}
          {reaches.length > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-2xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>โครงข่ายลำน้ำหลักในพื้นที่:</span>
                </span>
                <span className="text-3xs text-slate-400">{reaches.length} ช่วงลำน้ำ</span>
              </div>
              <div className="space-y-1.5">
                {reaches.slice(0, 3).map((r: any) => (
                  <div key={r.segment_id} className="p-2 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 truncate">{r.name}</div>
                      <div className="text-3xs text-slate-500 truncate">{r.desc}</div>
                    </div>
                    <span 
                      className="px-2 py-0.5 rounded-full text-3xs font-bold text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: r.color }}
                    >
                      {r.monitoring_status === 'CRITICAL' ? 'วิกฤต' :
                       r.monitoring_status === 'WATCH' ? 'เฝ้าระวัง' :
                       r.monitoring_status === 'NORMAL' ? 'ปกติ' :
                       r.monitoring_status === 'NO_DATA' ? 'ไม่มีข้อมูล' : 'ไม่มีจุดวัด'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contributing Spatial Factors */}
          {displayFactors.length > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="text-3xs font-semibold text-slate-500 uppercase tracking-wider">
                การประเมินสภาวะเชิงพื้นที่:
              </div>
              <div className="space-y-1">
                {displayFactors.slice(0, 3).map((f, idx) => (
                  <div 
                    key={idx}
                    className={`p-1.5 rounded-lg text-xs flex items-start gap-1.5 leading-snug ${
                      f.type === 'warning' 
                        ? 'bg-amber-50/70 border border-amber-200 text-amber-900' 
                        : 'bg-white border border-slate-200/70 text-slate-700'
                    }`}
                  >
                    {f.type === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0C65E8] shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold block">{f.title}</span>
                      {f.detail && <span className="text-slate-500 block text-2xs">{f.detail}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Limitations Notice (Safety Principle) */}
          <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/70 text-2xs text-amber-900 leading-snug flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-950">หลักการความน่าเชื่อถือทางอุทกวิทยา:</span>
              <span>การแสดงสภาพลำน้ำจำกัดเฉพาะจุดที่มีสถานีโทรมาตรเชื่อมโยงด้วยความเชื่อมั่นสูง (High Confidence) ไม่มีการอนุมานสีลำน้ำจากระยะห่างเพียงอย่างเดียว</span>
            </div>
          </div>
        </div>
      );
    }

    // 2. WATER & RAINFALL TAB
    if (activeTab === 'water') {
      const waterStations = intelligence?.water_and_rainfall?.water_stations ?? [];
      const rainStations = intelligence?.water_and_rainfall?.rainfall_stations ?? [];

      return (
        <div className="space-y-3">
          {/* Reaches Status Section */}
          {reaches.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="text-2xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-600" />
                <span>สภาพลำน้ำตามสถานีเชื่อมโยงจริง ({reaches.length} ช่วง)</span>
              </h5>
              <div className="space-y-1.5">
                {reaches.map((r: any) => (
                  <div key={r.segment_id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 leading-tight">{r.name}</div>
                      <span 
                        className="px-2 py-0.5 rounded-full text-3xs font-bold text-white shrink-0"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.status_label_th || r.monitoring_status}
                      </span>
                    </div>
                    <div className="text-2xs text-slate-600">{r.status_explanation}</div>
                    {r.matched_station_name && (
                      <div className="text-3xs text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
                        <span>สถานีอ้างอิง: <strong className="text-slate-800">{r.matched_station_name}</strong></span>
                        <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-semibold border border-emerald-200">
                          เชื่อมโยงโดยตรง
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Water Gauge Stations List */}
          <div className="space-y-1.5">
            <h5 className="text-2xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-600" />
              <span>สถานีตรวจวัดระดับน้ำโทรมาตร ({waterStations.length} สถานี)</span>
            </h5>
            {waterStations.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                ไม่มีสถานีวัดระดับน้ำโทรมาตรในขอบเขตที่เลือก
              </div>
            ) : (
              <div className="space-y-2">
                {waterStations.map((st: any) => (
                  <div key={st.station_id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="font-bold text-slate-900">{st.name_th || st.station_id}</div>
                        <div className="text-3xs text-slate-400">รหัส: {st.station_id} • อ.{st.district}</div>
                      </div>
                      <span className={`text-3xs font-semibold px-1.5 py-0.5 rounded border ${
                        st.freshness_status === 'LIVE' || st.freshness_status === 'RECENT'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {st.freshness_status === 'LIVE' || st.freshness_status === 'RECENT' ? '● สดใหม่' : '○ ไม่เป็นปัจจุบัน'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-50 rounded-lg text-2xs">
                      <div>
                        <span className="text-slate-500 block">ระดับน้ำตรวจวัด:</span>
                        <strong className="text-sm font-bold text-slate-900">
                          {st.water_level_msl != null ? `${Number(st.water_level_msl).toFixed(2)} ม.รทก.` : '-'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">ระดับวิกฤตตลิ่ง:</span>
                        <strong className="text-xs font-semibold text-red-600">
                          {st.critical_level_msl != null ? `${Number(st.critical_level_msl).toFixed(2)} ม.รทก.` : '-'}
                        </strong>
                      </div>
                    </div>

                    {/* Matching Confidence Badge */}
                    <div className="p-1.5 rounded-lg bg-slate-50/80 border border-slate-100 space-y-0.5 text-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">ลำน้ำที่เชื่อมโยง:</span>
                        <span className="font-semibold text-slate-800">{st.matched_waterway_name || 'นอกโครงข่ายหลัก'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">สถานะความเชื่อมั่น:</span>
                        {st.match_confidence === 'HIGH_CONFIDENCE' ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            ✓ HIGH CONFIDENCE
                          </span>
                        ) : st.match_confidence === 'REQUIRES_REVIEW' ? (
                          <span className="font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            ⚠️ REQUIRES REVIEW
                          </span>
                        ) : (
                          <span className="font-medium text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                            UNMATCHED
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 leading-tight pt-0.5">{st.match_basis}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rainfall Stations List */}
          {rainStations.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h5 className="text-2xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <CloudRain className="w-3 h-3 text-sky-600" />
                <span>สถานีวัดน้ำฝนอัตโนมัติ ({rainStations.length} สถานี)</span>
              </h5>
              <div className="space-y-1.5">
                {rainStations.map((rs: any) => (
                  <div key={rs.station_id} className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{rs.name_th}</div>
                      <div className="text-3xs text-slate-400">อ.{rs.district} • {rs.agency || 'สสน.'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sky-700">{rs.rain_24h_mm != null ? `${rs.rain_24h_mm.toFixed(1)} มม.` : '-'}</div>
                      <div className="text-3xs text-slate-400">ฝนสะสม 24 ชม.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 3. NEWS TAB
    if (activeTab === 'news') {
      const newsItems = intelligence?.news ?? [];
      return (
        <div className="space-y-2.5">
          {newsItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Newspaper className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-600">ไม่มีข่าวสารที่เชื่อมโยงกับพื้นที่นี้โดยตรง</div>
              <div className="text-2xs text-slate-400">FloodTrace แสดงเฉพาะข่าวที่มีการระบุพิกัดหรือผลกระทบระดับอำเภอชัดเจน</div>
            </div>
          ) : (
            newsItems.map((n: any) => (
              <div key={n.id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs hover:border-blue-300 transition-colors">
                {n.source_image_url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-100">
                    <img 
                      src={n.source_image_url} 
                      alt={n.title} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between text-3xs text-slate-500 mb-1">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                      {n.source_name || 'สื่อมวลชน'}
                    </span>
                    <span>{n.published_at_th}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 leading-snug">{n.title}</h5>
                  <p className="text-2xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                    {n.factual_summary}
                  </p>
                </div>
                {n.source_url && (
                  <a 
                    href={n.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-3xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <span>อ่านข่าวต้นฉบับ</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      );
    }

    // 4. EXTERNAL EVIDENCE TAB
    if (activeTab === 'evidence') {
      const evidenceItems = intelligence?.external_evidence ?? [];
      return (
        <div className="space-y-2.5">
          {evidenceItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-600">ไม่มีหลักฐานสาธารณะในพื้นที่นี้</div>
              <div className="text-2xs text-slate-400">ยังไม่มีภาพถ่ายหรือวิดีโอจากสื่อสาธารณะที่ระบุพิกัดในเขตนี้</div>
            </div>
          ) : (
            evidenceItems.map((ev: any) => (
              <div key={ev.id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                {ev.photo_url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-100">
                    <img 
                      src={ev.photo_url} 
                      alt="หลักฐานสภาพแวดล้อม" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between text-3xs text-slate-500 mb-1">
                    <span className="font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                      {ev.source_platform || 'สื่อสาธารณะ'}
                    </span>
                    <span className="font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {ev.is_verified ? '✓ ยืนยันพิกัด' : '○ รอตรวจสอบ'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 leading-snug">{ev.title_or_summary}</div>
                  <div className="text-3xs text-slate-400 mt-1 flex items-center justify-between">
                    <span>เวลาสังเกต: {ev.observed_at_th}</span>
                    <span>พิกัด: {ev.location_precision}</span>
                  </div>
                </div>
                {ev.source_url && (
                  <a 
                    href={ev.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-3xs font-semibold text-purple-600 hover:text-purple-800"
                  >
                    <span>ดูแหล่งที่มา</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      );
    }

    // 5. CITIZEN REPORTS TAB
    if (activeTab === 'citizen') {
      const citizenReports = intelligence?.citizen_reports ?? [];
      return (
        <div className="space-y-2">
          {citizenReports.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-600">ยังไม่มีรายงานจากประชาชนในพื้นที่นี้</div>
              <div className="text-2xs text-slate-400">ประชาชนสามารถส่งรายงานสถานการณ์ผ่านเมนู "แจ้งรายงานสถานการณ์"</div>
            </div>
          ) : (
            citizenReports.map((cr: any) => (
              <div key={cr.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{cr.category}</span>
                  <span className="text-3xs px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                    {cr.verification_status}
                  </span>
                </div>
                <div className="text-3xs text-slate-500">
                  ต.{cr.subdistrict} อ.{cr.district} • {cr.observed_at_th}
                </div>
                {cr.notes && (
                  <div className="text-2xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 mt-1">
                    "{cr.notes}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      );
    }

    // 6. TIMELINE TAB
    if (activeTab === 'timeline') {
      const timelineEvents = intelligence?.timeline ?? [];
      return (
        <div className="space-y-2">
          {timelineEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-600">ไม่มีข้อมูลลำดับเวลาในพื้นที่นี้</div>
            </div>
          ) : (
            <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((t: any, idx: number) => {
                const isNews = t.type === 'NEWS';
                const isEvidence = t.type === 'EVIDENCE';
                const dotColor = isNews ? 'bg-blue-600' : isEvidence ? 'bg-purple-600' : 'bg-teal-600';

                return (
                  <div key={idx} className="relative space-y-1 text-xs">
                    <span className={`absolute -left-4 top-1.5 w-2 h-2 rounded-full ${dotColor} ring-4 ring-white`} />
                    <div className="flex items-center justify-between text-3xs text-slate-400">
                      <span>{t.timestamp_th}</span>
                      <span className={`px-1 rounded text-2xs font-semibold ${
                        isNews ? 'bg-blue-50 text-blue-700' : isEvidence ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'
                      }`}>
                        {isNews ? 'ข่าว' : isEvidence ? 'หลักฐาน' : 'รายงาน'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 leading-snug">{t.title}</div>
                    <div className="text-3xs text-slate-500">ที่มา: {t.source}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* ============================================================== */}
      {/* MOBILE BOTTOM SHEET (< md, 320px - 767px)                      */}
      {/* ============================================================== */}
      <div className="md:hidden">
        {isMobileExpanded && (
          <div 
            onClick={() => setIsMobileExpanded(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-35 animate-in fade-in duration-150"
            aria-hidden="true"
          />
        )}

        {!isMobileExpanded ? (
          <div 
            onClick={() => setIsMobileExpanded(true)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl px-3 py-2 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-150 hover:bg-white"
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1.5" />
            <div className="flex items-center justify-between gap-2 min-h-[44px]">
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="px-2.5 py-1 rounded-full text-2xs font-bold text-white shrink-0 shadow-2xs"
                  style={{ backgroundColor: priorityColor }}
                >
                  {priorityBadge}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                    {areaTitle}
                  </h4>
                  <span className="text-2xs text-slate-500 font-medium block truncate">
                    แตะเพื่อดูโทรมาตร ข่าว และรายงาน
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileExpanded(true);
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 rounded-xl"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200/90 max-h-[82vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Header Handle */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="p-3 pb-2 border-b border-slate-100 shrink-0 select-none cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-2" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="px-2 py-0.5 rounded-full text-3xs font-bold text-white shrink-0"
                      style={{ backgroundColor: priorityColor }}
                    >
                      {priorityBadge}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{areaTitle}</h3>
                  </div>
                  <span className="text-2xs text-slate-500 truncate block mt-0.5">{areaSubtitle}</span>
                </div>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs Scrollable */}
              <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-2.5 py-1 text-2xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-colors flex items-center gap-1 ${
                      activeTab === tab.key 
                        ? 'bg-[#0C65E8] text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count != null && tab.count > 0 && (
                      <span className={`px-1 py-0.2 rounded-full text-3xs ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Scrollable */}
            <div className="p-3 overflow-y-auto flex-1">
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP FLOATING CARD (>= md, >= 768px)                         */}
      {/* Positioned on map workspace with full multi-tab intelligence   */}
      {/* ============================================================== */}
      <div 
        className="hidden md:block fixed top-20 right-4 z-30 w-[380px] lg:w-[420px] max-h-[calc(100vh-6.5rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200"
      >
        {/* Header */}
        <div className="p-3.5 pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span 
                  className="px-2.5 py-0.5 rounded-full text-2xs font-bold text-white shrink-0 shadow-2xs"
                  style={{ backgroundColor: priorityColor }}
                >
                  {priorityBadge}
                </span>
                <h3 className="text-base font-bold text-[#063B70] truncate leading-tight">
                  {areaTitle}
                </h3>
              </div>
              <span className="text-2xs text-slate-500 truncate block mt-0.5">{areaSubtitle}</span>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="ปิดหน้าต่างนี้"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 6 Intelligence Tabs */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar pb-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-2.5 py-1 text-2xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeTab === tab.key 
                    ? 'bg-[#0C65E8] text-white shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span className={`px-1 py-0.2 rounded-full text-3xs ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3.5 overflow-y-auto flex-1">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-2xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1 truncate">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>ข้อมูลตรวจสอบย้อนหลังได้</span>
          </div>
          <Link 
            to={`/my-area?district=${encodeURIComponent(data.district || 'กบินทร์บุรี')}`}
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            <span>หน้าเจาะลึกพื้นที่</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </>
  );
};
