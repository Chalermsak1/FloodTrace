import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Waves, 
  MapPin, 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight, 
  Maximize2, 
  ExternalLink, 
  Droplets, 
  CloudRain, 
  Radio, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  Newspaper, 
  MessageSquarePlus,
  Compass,
  FileWarning,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { MapLibreMapView, DISTRICT_CENTROIDS } from '../map/MapLibreMapView';
import { ExternalInformationDetail } from '../news/InformationDetailModal';
import { 
  getEvidencePhotoUrl, 
  formatObservedTimeAgo, 
  formatBangkokTime 
} from '../sections/SituationHeroSection';

interface MobileHomepageViewProps {
  overviewData: any;
  externalEvidence: any[];
  waterStations: any[];
  rainfallStations: any[];
  officialUpdates: any[];
  evidenceLoading: boolean;
  evidenceError: boolean;
  lastRefreshedAt: Date | null;
  onSelectEvidence: (item: ExternalInformationDetail) => void;
}

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

/**
 * Format timestamp into Thai Buddhist Era Date (e.g. 8 ต.ค. 2569)
 */
const formatThaiDate = (dateStr?: string) => {
  if (!dateStr) return 'ล่าสุด';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Helper to determine badge color for news publisher
 */
const getPublisherBadgeStyle = (sourceName?: string) => {
  const name = String(sourceName || '').toLowerCase();
  if (name.includes('thaipbs') || name.includes('ไทยพีบีเอส')) {
    return 'bg-[#E05A1B] text-white';
  }
  if (name.includes('ไทยรัฐ') || name.includes('thairath')) {
    return 'bg-[#15803D] text-white';
  }
  if (name.includes('อมรินทร์') || name.includes('amarin')) {
    return 'bg-[#1E40AF] text-white';
  }
  if (name.includes('คมชัดลึก') || name.includes('komchadluek')) {
    return 'bg-[#BE123C] text-white';
  }
  if (name.includes('gistda')) {
    return 'bg-[#0891B2] text-white';
  }
  if (name.includes('คพ.') || name.includes('pcd') || name.includes('สคพ.')) {
    return 'bg-[#047857] text-white';
  }
  if (name.includes('facebook') || name.includes('เฟซบุ๊ก')) {
    return 'bg-[#1877F2] text-white';
  }
  return 'bg-[#0284C7] text-white';
};

/**
 * Extract clean publisher short name
 */
const getPublisherShortName = (sourceName?: string) => {
  if (!sourceName) return 'ข่าวสาร';
  if (sourceName.includes('ไทยพีบีเอส') || sourceName.includes('Thai PBS')) return 'Thai PBS';
  if (sourceName.includes('ไทยรัฐ')) return 'ไทยรัฐออนไลน์';
  if (sourceName.includes('อมรินทร์')) return 'Amarin TV';
  if (sourceName.includes('คมชัดลึก')) return 'คมชัดลึก';
  if (sourceName.includes('GISTDA')) return 'GISTDA';
  if (sourceName.includes('กรมชลประทาน')) return 'กรมชลประทาน';
  if (sourceName.includes('สยามรัฐ')) return 'สยามรัฐออนไลน์';
  if (sourceName.includes('Facebook')) return 'Facebook';
  return sourceName.split(' ')[0] || sourceName;
};

/**
 * Truthful verification badge matching system semantics
 */
const getEvidenceBadge = (status?: string) => {
  const s = (status || 'UNVERIFIED').toUpperCase();
  switch (s) {
    case 'CORROBORATED':
      return {
        label: 'มีข้อมูลสอดคล้องกัน',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90'
      };
    case 'OFFICIAL_VERIFIED':
      return {
        label: 'ยืนยันโดยหน่วยงาน',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
      };
    case 'LAB_CONFIRMED':
      return {
        label: 'มีผลตรวจแล็บยืนยัน',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/90'
      };
    case 'UNVERIFIED':
    default:
      return {
        label: 'ยังไม่ได้รับการยืนยัน',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/90'
      };
  }
};

/**
 * Freshness status badge helper
 */
const getFreshnessBadge = (status?: string) => {
  const s = (status || 'UNKNOWN').toUpperCase();
  switch (s) {
    case 'LIVE':
      return { label: 'LIVE', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'RECENT':
      return { label: 'RECENT', className: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'DELAYED':
      return { label: 'DELAYED', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'STALE':
      return { label: 'STALE', className: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'OFFLINE':
      return { label: 'OFFLINE', className: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { label: 'UNKNOWN', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
};

export const MobileHomepageView: React.FC<MobileHomepageViewProps> = ({
  overviewData,
  externalEvidence,
  waterStations,
  rainfallStations,
  officialUpdates,
  evidenceLoading,
  evidenceError,
  lastRefreshedAt,
  onSelectEvidence
}) => {
  const navigate = useNavigate();

  // District Selection State
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [showDistrictSheet, setShowDistrictSheet] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'evidence' | 'map'>('overview');

  // Map Data State
  const [monitoringSurface, setMonitoringSurface] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState<boolean>(true);

  // Fallback tracking for images
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setBrokenImages(prev => ({ ...prev, [id]: true }));
  };

  // Load Map GeoJSON once for mobile preview
  useEffect(() => {
    setMapLoading(true);
    Promise.all([
      fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/map/boundary').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/waterways').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/observations').then(r => r.ok ? r.json() : null).catch(() => null)
    ])
      .then(([surfaceRes, boundRes, waterRes, obsRes]) => {
        if (surfaceRes) setMonitoringSurface(surfaceRes);
        if (boundRes) setBoundaryData(boundRes);
        if (waterRes) setWaterways(waterRes);
        if (Array.isArray(obsRes)) setObservations(obsRes);
        setMapLoading(false);
      })
      .catch(() => {
        setMapLoading(false);
      });
  }, []);

  // Filtered Water Station: prefer selected district or high priority station
  const activeWaterStation = useMemo(() => {
    if (!Array.isArray(waterStations) || waterStations.length === 0) return null;
    if (selectedDistrict !== 'ALL') {
      const match = waterStations.find(s => s.district?.includes(selectedDistrict));
      if (match) return match;
    }
    // Default to Kabin Buri or non-zero measurement station
    return waterStations.find(s => s.water_level_msl !== null && s.water_level_msl !== undefined) || waterStations[0];
  }, [waterStations, selectedDistrict]);

  // Filtered Rainfall Station: prefer selected district or active station
  const activeRainStation = useMemo(() => {
    if (!Array.isArray(rainfallStations) || rainfallStations.length === 0) return null;
    if (selectedDistrict !== 'ALL') {
      const match = rainfallStations.find(s => s.district?.includes(selectedDistrict));
      if (match) return match;
    }
    return rainfallStations.find(s => (s.rain_24h_mm ?? 0) > 0) || rainfallStations[0];
  }, [rainfallStations, selectedDistrict]);

  // Curated News Items (filter out duplicates / prioritize items with real photos)
  const curatedNews = useMemo(() => {
    if (!Array.isArray(officialUpdates) || officialUpdates.length === 0) return [];
    const newsOnly = officialUpdates.filter(item => 
      item.source_type === 'NEWS_MEDIA' ||
      item.authority_level === 'CURATED_PUBLIC_SOURCE' ||
      item.authority_level === 'SECONDARY' ||
      item.verification_status === 'CURATED' ||
      Boolean(item.source_image_url)
    );
    return newsOnly.slice(0, 6);
  }, [officialUpdates]);

  // Eligible External Evidence Items (3-5 items)
  const eligibleEvidence = useMemo(() => {
    if (!Array.isArray(externalEvidence) || externalEvidence.length === 0) return [];
    if (selectedDistrict !== 'ALL') {
      const matched = externalEvidence.filter(e => e.district?.includes(selectedDistrict));
      if (matched.length > 0) return matched.slice(0, 5);
    }
    return externalEvidence.slice(0, 5);
  }, [externalEvidence, selectedDistrict]);

  // Dynamic Map Target Coordinates
  const targetMapCoords: [number, number] = useMemo(() => {
    if (selectedDistrict !== 'ALL' && DISTRICT_CENTROIDS[selectedDistrict]) {
      return DISTRICT_CENTROIDS[selectedDistrict];
    }
    return [14.05, 101.55]; // Prachin Buri central overview
  }, [selectedDistrict]);

  // Smooth Section Scrolling
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-[#073967] pb-28 select-none">

      {/* ============================================================ */}
      {/* A. MOBILE HEADER (Reference Design: Deep Navy + Scope + Logo) */}
      {/* ============================================================ */}
      <header className="w-full bg-gradient-to-b from-[#07172B] via-[#0A1D38] to-[#0D2447] text-white pt-3 pb-5 px-4 shadow-md relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-12 w-40 h-40 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Control Bar: Scope selector + Notification bell */}
        <div className="flex items-center justify-between relative z-10">
          
          {/* Location Scope Trigger */}
          <button
            type="button"
            onClick={() => setShowDistrictSheet(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 border border-white/15 text-xs font-semibold text-white tracking-wide transition-all shadow-xs"
            aria-label="เลือกขอบเขตพื้นที่"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{selectedDistrict === 'ALL' ? 'ปราจีนบุรี' : `อ.${selectedDistrict}`}</span>
            <ChevronDown className="w-3.5 h-3.5 text-sky-300 shrink-0" />
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            aria-label="การแจ้งเตือน"
            className="relative p-2 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-white transition-all border border-white/15 shadow-xs"
          >
            <Bell className="w-4 h-4 text-white" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse ring-2 ring-[#0A1D38]"></span>
          </button>
        </div>

        {/* FloodTrace Identity */}
        <div className="mt-3.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284C7] to-[#0C65E8] flex items-center justify-center shadow-inner border border-white/20 shrink-0">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-white leading-none">
                  FloodTrace
                </span>
                <span className="text-[10px] font-semibold bg-white/15 text-sky-100 px-2 py-0.5 rounded-full border border-white/20">
                  Ruwaigon
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-sky-200/90 font-normal mt-2 leading-relaxed max-w-sm">
            ติดตามสถานการณ์น้ำท่วม และผลกระทบจากมลพิษจากแหล่งข้อมูลสาธารณะ
          </p>
        </div>

        {/* Filter Navigation Pills (Reference: ภาพรวม, ข่าวสาร, สถานการณ์ล่าสุด, แผนที่) */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar py-0.5 relative z-10">
          <button 
            type="button"
            onClick={() => {
              setActiveTab('overview');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
              activeTab === 'overview' 
                ? 'bg-[#1D68BD] text-white ring-1 ring-white/30 font-bold' 
                : 'bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            ภาพรวม
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setActiveTab('news');
              scrollToSection('mobile-news-section');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
              activeTab === 'news' 
                ? 'bg-[#1D68BD] text-white ring-1 ring-white/30 font-bold' 
                : 'bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            ข่าวสาร
          </button>

          <button 
            type="button"
            onClick={() => {
              setActiveTab('evidence');
              scrollToSection('mobile-evidence-section');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
              activeTab === 'evidence' 
                ? 'bg-[#1D68BD] text-white ring-1 ring-white/30 font-bold' 
                : 'bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            สถานการณ์ล่าสุด
          </button>

          <Link 
            to="/map"
            className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-white text-slate-800 hover:bg-slate-100 shadow-xs transition-all"
          >
            แผนที่
          </Link>
        </div>

      </header>

      {/* Main Mobile Body Container */}
      <div className="px-4 pt-4 space-y-5 max-w-md mx-auto">

        {/* ============================================================ */}
        {/* B. SITUATION OVERVIEW (Reference: Compact Satellite Map)     */}
        {/* ============================================================ */}
        <section aria-label="แผนที่เฝ้าระวังเชิงพื้นที่">
          <div className="relative w-full h-[250px] sm:h-[270px] rounded-2xl overflow-hidden shadow-card border border-slate-200/90 bg-slate-950">
            
            {/* Loading Indicator */}
            {mapLoading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-30">
                <div className="bg-white/95 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-slate-100">
                  <span className="w-3.5 h-3.5 border-2 border-[#0C65E8] border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-xs font-semibold text-slate-800">กำลังเชื่อมต่อแผนที่...</span>
                </div>
              </div>
            )}

            {/* Interactive MapLibre Instance */}
            <MapLibreMapView
              monitoringSurface={monitoringSurface}
              boundaryData={boundaryData}
              waterways={waterways}
              stations={waterStations}
              rainfallStations={rainfallStations}
              observations={observations}
              externalEvidence={externalEvidence}
              visibleLayers={{
                flooding: true,
                environmental: true,
                monitoringStations: true,
                citizenReports: true,
                monitoringSurface: true,
                waterways: true,
                stations: true,
                rainfallStations: false,
                observations: true,
                externalEvidence: true,
                outsideMask: true,
                adminLabels: true,
                roadOverlay: false
              }}
              selectedDistrict={selectedDistrict === 'ALL' ? 'กบินทร์บุรี' : selectedDistrict}
              onSelectDistrict={(d) => setSelectedDistrict(d)}
              surfaceOpacity={0.35}
              basemap="satellite"
              targetCoords={targetMapCoords}
              suppressMapPopup={true}
            />

            {/* Top Right: Fullscreen Expand Button (Opens /map) */}
            <Link
              to="/map"
              aria-label="เปิดแผนที่เต็มรูปแบบ"
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-md transition-all active:scale-95"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </Link>

            {/* Bottom Floating Situation Card (Reference: Overlaid Dark Glass Card) */}
            <div className="absolute bottom-3 left-3 right-12 z-20 bg-slate-950/85 backdrop-blur-md rounded-xl p-3 border border-white/15 text-white shadow-xl max-w-[270px]">
              <div className="text-[11px] font-semibold text-sky-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>สถานการณ์ล่าสุด</span>
              </div>
              <div className="text-xs font-bold text-white mt-1 leading-snug line-clamp-2">
                {overviewData?.priority_counts?.high 
                  ? `พบ ${overviewData.priority_counts.high} โซนเฝ้าระวัง ในพื้นที่จังหวัดปราจีนบุรี`
                  : 'พบเหตุการณ์น้ำท่วมในหลายพื้นที่ของจังหวัดปราจีนบุรี'}
              </div>
              <Link 
                to="/map"
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-1.5 transition-colors group"
              >
                <span>ดูรายละเอียด</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

          </div>
        </section>

        {/* ============================================================ */}
        {/* C. LATEST WATER & RAINFALL TELEMETRY (Compact Measurement Cards) */}
        {/* ============================================================ */}
        <section aria-label="ข้อมูลโทรมาตรล่าสุด" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-0.5">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>ข้อมูลตรวจวัดจริงจากสถานี (Measured Fact)</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {lastRefreshedAt ? `อัปเดต ${formatBangkokTime(lastRefreshedAt.toISOString())}` : 'ข้อมูลล่าสุด'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            
            {/* 1. Water Level Measurement Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[115px]">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-[#063B70] truncate">ระดับน้ำ</span>
                  </div>
                  {activeWaterStation?.freshness_status ? (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${getFreshnessBadge(activeWaterStation.freshness_status).className}`}>
                      {getFreshnessBadge(activeWaterStation.freshness_status).label}
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      TELEMETRY
                    </span>
                  )}
                </div>

                {activeWaterStation && activeWaterStation.water_level_msl !== null && activeWaterStation.water_level_msl !== undefined ? (
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {Number(activeWaterStation.water_level_msl).toFixed(2)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">ม.รทก.</span>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-slate-400 mt-2">
                    ไม่มีข้อมูลล่าสุด
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
                <div className="truncate font-medium text-slate-700">
                  {activeWaterStation?.name_th || 'สถานีตรวจวัดระดับน้ำ'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                  {activeWaterStation?.observed_at ? `ตรวจวัด ${formatBangkokTime(activeWaterStation.observed_at)}` : 'ข้อมูลโทรมาตร HII'}
                </div>
              </div>
            </div>

            {/* 2. Rainfall Measurement Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[115px]">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CloudRain className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="text-xs font-bold text-[#063B70] truncate">ฝนสะสม 24 ชม.</span>
                  </div>
                  {activeRainStation?.freshness_status ? (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${getFreshnessBadge(activeRainStation.freshness_status).className}`}>
                      {getFreshnessBadge(activeRainStation.freshness_status).label}
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      TELEMETRY
                    </span>
                  )}
                </div>

                {activeRainStation && activeRainStation.rain_24h_mm !== null && activeRainStation.rain_24h_mm !== undefined ? (
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {Number(activeRainStation.rain_24h_mm).toFixed(1)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">มม.</span>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-slate-400 mt-2">
                    ไม่มีข้อมูลล่าสุด
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
                <div className="truncate font-medium text-slate-700">
                  {activeRainStation?.name_th || 'สถานีตรวจวัดน้ำฝน'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                  {activeRainStation?.observed_at ? `ตรวจวัด ${formatBangkokTime(activeRainStation.observed_at)}` : 'ข้อมูลโทรมาตร สสน.'}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ============================================================ */}
        {/* D. LATEST NEWS (Reference: ข่าวสารล่าสุด + ดูทั้งหมด)          */}
        {/* ============================================================ */}
        <section id="mobile-news-section" className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              ข่าวสารล่าสุด
            </h2>
            <Link
              to="/official-updates?tab=news"
              className="text-xs font-semibold text-[#0C65E8] hover:text-[#063B70] flex items-center gap-0.5 transition-colors"
            >
              <span>ดูทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Horizontally scrollable snap cards (Matches Reference 2-column peek) */}
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar -mx-4 px-4">
            {curatedNews.map((item) => {
              const imageFailed = brokenImages[item.id];
              const imageUrl = !imageFailed ? (item.source_image_url || '/assets/news/news_001.jpg') : null;
              const publisherName = getPublisherShortName(item.agency || item.source_name);

              return (
                <article
                  key={item.id}
                  onClick={() => onSelectEvidence(item as any)}
                  className="w-[260px] sm:w-[280px] shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-card transition-all overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Cover Image Container */}
                    <div className="relative w-full h-36 bg-slate-100 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.title}
                          loading="lazy"
                          onError={() => handleImageError(item.id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
                          <Newspaper className="w-7 h-7 mb-1 text-slate-300" />
                          <span className="text-[11px]">ภาพประกอบจากแหล่งต้นทาง</span>
                        </div>
                      )}

                      {/* Publisher Badge Pill (Bottom-left of image) */}
                      <div className="absolute bottom-2.5 left-2.5 z-10">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm ${getPublisherBadgeStyle(item.agency || item.source_name)}`}>
                          {publisherName}
                        </span>
                      </div>
                    </div>

                    {/* Article Content */}
                    <div className="p-3.5 space-y-1.5">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      
                      <div className="text-[11px] text-slate-400 font-medium">
                        {formatThaiDate(item.published_at)}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mt-1">
                        {item.summary || item.factual_summary || 'รายงานข้อมูลสถานการณ์และผลการตรวจวัดในพื้นที่'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Link */}
                  <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0C65E8]">
                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 hover:underline text-xs"
                      >
                        <span>อ่านจากแหล่งต้นทาง</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        <span>ดูรายละเอียด</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

            {curatedNews.length === 0 && (
              <div className="w-full p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                ยังไม่มีข้อมูลข่าวสารในขณะนี้
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* E. SITUATION & EXTERNAL EVIDENCE (สถานการณ์และหลักฐานล่าสุด)  */}
        {/* ============================================================ */}
        <section id="mobile-evidence-section" className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                สถานการณ์และหลักฐานล่าสุด
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">
                ข้อมูลอ้างอิงจากแหล่งสาธารณะภายนอก (External Evidence)
              </p>
            </div>
            <Link
              to="/cases"
              className="text-xs font-semibold text-[#0C65E8] hover:text-[#063B70] flex items-center gap-0.5 transition-colors shrink-0"
            >
              <span>ดูทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Horizontally scrollable snap cards for Evidence (Matches Reference 3-card peek) */}
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar -mx-4 px-4">
            {eligibleEvidence.map((item) => {
              const isBroken = brokenImages[item.id];
              const rawPhotoUrl = getEvidencePhotoUrl(item);
              const fallbackUrl = item.district?.includes('กบินทร์')
                ? '/assets/evidence/evd_001_kabin_market.jpg'
                : item.district?.includes('ศรีมหาโพธิ')
                ? '/assets/citizen/cit_012.jpg'
                : item.district?.includes('บ้านสร้าง')
                ? '/assets/evidence/evd_013_bangtaen_road.jpg'
                : '/assets/citizen/cit_015.jpg';
              const photoUrl = (!isBroken && rawPhotoUrl && !rawPhotoUrl.includes('lookaside.fbsbx.com'))
                ? rawPhotoUrl
                : fallbackUrl;
              const verification = getEvidenceBadge(item.verification_status);
              const timeAgo = formatObservedTimeAgo(item.observed_at, item.published_at);
              const locationText = item.location_text || (item.district ? `อ.${item.district}, จ.ปราจีนบุรี` : 'จ.ปราจีนบุรี');

              return (
                <article
                  key={item.id}
                  onClick={() => onSelectEvidence(item)}
                  className="w-[240px] sm:w-[260px] shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-card transition-all overflow-hidden flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Evidence Photo */}
                    <div className="relative w-full h-32 bg-slate-100 overflow-hidden">
                      <img
                        src={photoUrl}
                        alt={item.title_or_summary || item.description || 'หลักฐานภายนอก'}
                        loading="lazy"
                        onError={() => handleImageError(item.id)}
                        className="w-full h-full object-cover"
                      />

                      {/* Source Platform Badge */}
                      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/65 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        <span>{item.source_platform || 'แหล่งสาธารณะ'}</span>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-3 space-y-1.5">
                      <h3 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                        {item.title_or_summary || item.description || 'ข้อสังเกตสภาพน้ำและสิ่งแวดล้อม'}
                      </h3>

                      <div className="text-[10px] text-slate-500 leading-tight">
                        <div className="truncate font-medium text-slate-700">
                          {locationText}
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          พบเมื่อ {timeAgo.text}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status Pill */}
                  <div className="p-3 pt-0">
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-lg border text-center ${verification.badgeClass}`}>
                      {verification.label}
                    </div>
                  </div>
                </article>
              );
            })}

            {eligibleEvidence.length === 0 && !evidenceLoading && (
              <div className="w-full p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                ยังไม่มีข้อมูลหลักฐานภายนอกในพื้นที่นี้
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* CITIZEN PARTICIPATION CALL-TO-ACTION BANNER                  */}
        {/* ============================================================ */}
        <section aria-label="แจ้งเหตุสำหรับประชาชน" className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-100 flex items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#063B70] flex items-center gap-1.5">
              <MessageSquarePlus className="w-4 h-4 text-[#0C65E8]" />
              <span>แจ้งข้อสังเกตจากชุมชน</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              พบน้ำท่วม น้ำเปลี่ยนสี หรือมีกลิ่น ส่งข้อมูลเพื่อช่วยติดตามสถานการณ์
            </p>
          </div>
          <Link
            to="/report"
            className="px-3.5 py-2 rounded-xl bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            แจ้งเหตุ
          </Link>
        </section>

        {/* Provenance Footer Note */}
        <div className="text-center pt-2 pb-4 text-[11px] text-slate-400">
          <p>ข้อมูลเปิดเพื่อประโยชน์สาธารณะ • ตรวจสอบแหล่งที่มาได้</p>
        </div>

      </div>

      {/* ============================================================ */}
      {/* DISTRICT PICKER BOTTOM SHEET MODAL                            */}
      {/* ============================================================ */}
      {showDistrictSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fadeIn">
          <div 
            className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0C65E8]" />
                <span className="font-bold text-base text-slate-900">เลือกอำเภอ (จ.ปราจีนบุรี)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDistrictSheet(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict('ALL');
                  setShowDistrictSheet(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                  selectedDistrict === 'ALL'
                    ? 'bg-blue-50 text-[#0C65E8] border border-blue-200'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span>ทั้งหมด (จังหวัดปราจีนบุรี)</span>
                {selectedDistrict === 'ALL' && <CheckCircle2 className="w-4 h-4 text-[#0C65E8]" />}
              </button>

              {PRACHIN_DISTRICTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setSelectedDistrict(d);
                    setShowDistrictSheet(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                    selectedDistrict === d
                      ? 'bg-blue-50 text-[#0C65E8] border border-blue-200'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span>อ.{d}</span>
                  {selectedDistrict === d && <CheckCircle2 className="w-4 h-4 text-[#0C65E8]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* NOTIFICATIONS MODAL                                          */}
      {/* ============================================================ */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div 
            className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#0C65E8]" />
                <span className="font-bold text-base text-slate-900">การแจ้งเตือนล่าสุด</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                <div className="font-bold text-[#063B70]">รายงานสถานการณ์น้ำท่วมลุ่มน้ำปราจีนบุรี</div>
                <div className="text-slate-600">ตรวจพบการเฝ้าระวังระดับน้ำบริเวณ อ.กบินทร์บุรี และ อ.ศรีมหาโพธิ</div>
                <div className="text-[10px] text-slate-400 mt-1">อัปเดตอัตโนมัติจากโทรมาตร</div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 space-y-1">
                <div className="font-bold text-amber-900">ข้อควรระวังการใช้น้ำผิวดิน</div>
                <div className="text-amber-800">หลีกเลี่ยงการใช้น้ำที่มีกลิ่นหรือสีผิดปกติในพื้นที่ลุ่มน้ำตอนล่าง</div>
                <div className="text-[10px] text-amber-600 mt-1">คำแนะนำสาธารณะ</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/official-updates"
                onClick={() => setShowNotifications(false)}
                className="text-xs font-semibold text-[#0C65E8] hover:underline"
              >
                ดูประกาศทั้งหมด →
              </Link>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
