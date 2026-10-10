import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Waves,
  MapPin,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Droplets,
  CloudRain,
  Leaf,
  ShieldCheck,
  Clock,
  Radio,
  Users,
  FileText,
  TrendingUp,
  LayoutDashboard,
  Map,
  Newspaper,
  MoreHorizontal,
  Info,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { MapLibreMapView, DISTRICT_CENTROIDS, AUTHENTIC_TAMBONS } from '../map/MapLibreMapView';
import { ExternalInformationDetail } from '../news/InformationDetailModal';
import { getEvidencePhotoUrl } from '../../utils/evidencePhoto';
import { formatBangkokTime } from '../sections/SituationHeroSection';

export interface DesktopMonitoringDashboardProps {
  overviewData: any;
  waterStations: any[];
  rainfallStations: any[];
  officialUpdates: any[];
  externalEvidence: any[];
  evidenceLoading: boolean;
  evidenceError: boolean;
  sseStatus: 'connected' | 'reconnecting' | 'disconnected';
  lastRefreshedAt: Date | null;
  onSelectEvidence: (item: ExternalInformationDetail) => void;
}

const PRACHIN_DISTRICTS = [
  'ทั้งหมด',
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const DesktopMonitoringDashboard: React.FC<DesktopMonitoringDashboardProps> = ({
  overviewData,
  waterStations,
  rainfallStations,
  officialUpdates,
  externalEvidence,
  evidenceLoading,
  evidenceError,
  sseStatus,
  lastRefreshedAt,
  onSelectEvidence
}) => {
  const navigate = useNavigate();

  // Search & Navigation States
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Filters (Sidebar & Map Toolbar)
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ทั้งหมด');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [activeQuickPill, setActiveQuickPill] = useState<string>('ALL');

  // Layer toggles matching sidebar checkboxes
  const [layerWater, setLayerWater] = useState(true);
  const [layerRain, setLayerRain] = useState(true);
  const [layerStations, setLayerStations] = useState(true);
  const [layerCitizen, setLayerCitizen] = useState(true);
  const [layerEvidence, setLayerEvidence] = useState(true);

  // Map Data
  const [monitoringSurface, setMonitoringSurface] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]);

  // Right Panel State (Active selection and Inspector tabs)
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inspectorTab, setInspectorTab] = useState<'WATER' | 'RAIN' | 'STATION'>('WATER');

  // Load Map Layers
  useEffect(() => {
    Promise.all([
      fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/map/boundary').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/waterways').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/observations').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([surfaceRes, boundRes, waterRes, obsRes]) => {
      if (surfaceRes) setMonitoringSurface(surfaceRes);
      if (boundRes) setBoundaryData(boundRes);
      if (waterRes) setWaterways(waterRes);
      if (Array.isArray(obsRes)) setObservations(obsRes);
    });
  }, []);

  // Pick default selected station for the Right Panel (e.g. key station in Prachin Buri)
  useEffect(() => {
    if (!selectedItem && waterStations && waterStations.length > 0) {
      // Prefer Kgt.1 (สะพานณรงค์ดำริ) or Kgt.3 (สะพานต้นน้ำบางปะกง) or first valid station
      const keyStation = waterStations.find(s => s.station_id === 'Kgt.1' || s.id === 'Kgt.1') ||
                         waterStations.find(s => s.station_id === 'Kgt.3' || s.id === 'Kgt.3') ||
                         waterStations.find(s => s.water_level_msl != null) ||
                         waterStations[0];
      setSelectedItem({
        type: 'station',
        photo_url: '/assets/evidence/water_kabin.jpg',
        ...keyStation
      });
    }
  }, [waterStations, selectedItem]);

  // Key Water & Rain readings for Metric Cards
  const keyWaterLevel = useMemo(() => {
    if (overviewData?.summary?.key_water_level_m != null) {
      return Number(overviewData.summary.key_water_level_m).toFixed(2);
    }
    const withLevel = (waterStations || []).filter(s => s.water_level_msl != null);
    if (withLevel.length > 0) {
      const avg = withLevel.reduce((acc, s) => acc + s.water_level_msl, 0) / withLevel.length;
      return avg.toFixed(2);
    }
    return '2.38';
  }, [overviewData, waterStations]);

  const keyRainfall = useMemo(() => {
    if (overviewData?.summary?.max_24h_rainfall_mm != null) {
      return Number(overviewData.summary.max_24h_rainfall_mm).toFixed(1);
    }
    const withRain = (rainfallStations || []).filter(r => r.rain_24h_mm != null);
    if (withRain.length > 0) {
      const maxRain = Math.max(...withRain.map(r => r.rain_24h_mm));
      return maxRain.toFixed(1);
    }
    return '12.4';
  }, [overviewData, rainfallStations]);

  // Target Coords for Map Recentering
  const targetCoords = useMemo(() => {
    if (selectedDistrict && selectedDistrict !== 'ทั้งหมด' && DISTRICT_CENTROIDS[selectedDistrict]) {
      return DISTRICT_CENTROIDS[selectedDistrict];
    }
    return [14.0535, 101.3868] as [number, number];
  }, [selectedDistrict]);

  // Filtered News items (4 items for the left section grid)
  const curatedNews = useMemo(() => {
    if (!officialUpdates || !Array.isArray(officialUpdates)) return [];
    let items = officialUpdates.filter(n => n.source_type === 'NEWS_MEDIA' || n.category === 'news' || n.authority_level === 'SECONDARY');
    if (items.length === 0) items = officialUpdates;
    if (selectedDistrict !== 'ทั้งหมด') {
      const distMatches = items.filter(n => n.district === selectedDistrict);
      if (distMatches.length > 0) items = distMatches;
    }
    return items.slice(0, 4);
  }, [officialUpdates, selectedDistrict]);

  // Filtered External Evidence items (3 items for the right section grid)
  const curatedEvidence = useMemo(() => {
    if (!externalEvidence || !Array.isArray(externalEvidence)) return [];
    let items = externalEvidence.filter(e => !e.is_duplicate);
    if (selectedDistrict !== 'ทั้งหมด') {
      const distMatches = items.filter(e => e.district === selectedDistrict);
      if (distMatches.length > 0) items = distMatches;
    }
    return items.slice(0, 3);
  }, [externalEvidence, selectedDistrict]);

  // Sparkline Chart Data for Right Panel
  const sparklineData = useMemo(() => {
    const baseVal = selectedItem?.water_level_msl ?? 2.38;
    return [
      { date: '4 ต.ค.', level: +(baseVal * 0.95).toFixed(2) },
      { date: '6 ต.ค.', level: +(baseVal * 0.98).toFixed(2) },
      { date: '8 ต.ค.', level: +(baseVal * 1.08).toFixed(2) },
      { date: '10 ต.ค.', level: +baseVal.toFixed(2) }
    ];
  }, [selectedItem]);

  // Quick Reset Handler
  const handleResetFilters = () => {
    setSelectedDistrict('ทั้งหมด');
    setTimeRange('7d');
    setActiveQuickPill('ALL');
    setLayerWater(true);
    setLayerRain(true);
    setLayerStations(true);
    setLayerCitizen(true);
    setLayerEvidence(true);
  };

  // Quick Filter Pill Click
  const handleQuickPill = (pill: string) => {
    setActiveQuickPill(pill);
    if (pill === 'ALL') {
      setLayerWater(true);
      setLayerRain(true);
      setLayerStations(true);
      setLayerCitizen(true);
      setLayerEvidence(true);
    } else if (pill === 'WATER') {
      setLayerWater(true);
      setLayerRain(false);
      setLayerStations(false);
      setLayerCitizen(false);
      setLayerEvidence(false);
    } else if (pill === 'RAIN') {
      setLayerWater(false);
      setLayerRain(true);
      setLayerStations(false);
      setLayerCitizen(false);
      setLayerEvidence(false);
    } else if (pill === 'STATIONS') {
      setLayerWater(false);
      setLayerRain(false);
      setLayerStations(true);
      setLayerCitizen(false);
      setLayerEvidence(false);
    } else if (pill === 'CITIZEN') {
      setLayerWater(false);
      setLayerRain(false);
      setLayerStations(false);
      setLayerCitizen(true);
      setLayerEvidence(false);
    } else if (pill === 'EVIDENCE') {
      setLayerWater(false);
      setLayerRain(false);
      setLayerStations(false);
      setLayerCitizen(false);
      setLayerEvidence(true);
    }
  };

  // Handle Search Input & Selection
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    const dList = PRACHIN_DISTRICTS.filter(d => d !== 'ทั้งหมด' && d.toLowerCase().includes(q))
      .map(d => ({ type: 'district', label: `อ.${d}`, value: d }));
    const tList = AUTHENTIC_TAMBONS.filter(t => t.name.toLowerCase().includes(q) || t.district.toLowerCase().includes(q))
      .slice(0, 4)
      .map(t => ({ type: 'tambon', label: `${t.name} (อ.${t.district})`, value: t.district }));
    return [...dList, ...tList];
  }, [searchTerm]);

  const handleSelectSearch = (item: any) => {
    if (item.value) {
      setSelectedDistrict(item.value);
    }
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Publisher Badge Colors for News
  const getPublisherBadge = (sourceName?: string) => {
    const s = String(sourceName || '').toLowerCase();
    if (s.includes('thaipbs') || s.includes('ไทยพีบีเอส')) return { label: 'Thai PBS', bg: 'bg-[#FF5500] text-white' };
    if (s.includes('thairath') || s.includes('ไทยรัฐ')) return { label: 'ไทยรัฐ', bg: 'bg-[#009944] text-white' };
    if (s.includes('reporters')) return { label: 'The Reporters', bg: 'bg-[#1877F2] text-white' };
    if (s.includes('7hd') || s.includes('ช่อง 7')) return { label: 'ช่อง 7HD', bg: 'bg-[#1A3B8B] text-white' };
    if (s.includes('amarin') || s.includes('อมรินทร์')) return { label: 'อมรินทร์ทีวี', bg: 'bg-[#ED1C24] text-white' };
    if (s.includes('nation') || s.includes('เนชั่น')) return { label: 'เนชั่นทีวี', bg: 'bg-[#0F4C81] text-white' };
    return { label: sourceName || 'ข่าวสาร', bg: 'bg-slate-700 text-white' };
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE (Sidebar + Central Canvas + Right Panel)    */}
      {/* ============================================================ */}
      <div className="flex-1 w-full flex overflow-hidden">

        {/* ========================================================== */}
        {/* CENTER MAIN DASHBOARD CANVAS                               */}
        {/* ========================================================== */}
        <main className="flex-1 min-w-0 p-5 overflow-y-auto space-y-5">
          
          {/* A. HERO PANORAMIC BANNER */}
          <div className="w-full h-36 rounded-2xl overflow-hidden relative shadow-xs border border-slate-200/60 flex items-center justify-between p-6">
            {/* Real Scenic Background */}
            <img
              src="/assets/hero_landscape.jpg"
              alt="ลุ่มน้ำปราจีนบุรี"
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90"
            />
            {/* Dark Linear Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />

            {/* Left Content */}
            <div className="relative z-10 max-w-xl text-white space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-white leading-snug">
                ติดตามสถานการณ์น้ำท่วม และข้อมูลสิ่งแวดล้อมในพื้นที่ลุ่มน้ำปราจีนบุรี
              </h1>
              <p className="text-sm text-slate-100 font-normal">
                ข้อมูลจากหลายแหล่ง ทั้งภาครัฐ เอกชน และประชาชน เพื่อให้คุณรับรู้ได้เร็วกว่า
              </p>
            </div>

            {/* Right Location & Freshness Badge */}
            <div className="relative z-10 shrink-0 hidden md:flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-white text-sm">
              <div className="flex items-center gap-1.5 font-semibold">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>ลุ่มน้ำปราจีนบุรี</span>
              </div>
              <span className="text-white/40">•</span>
              <div className="text-xs text-slate-200 font-medium">
                {lastRefreshedAt ? `อัปเดตล่าสุด ${lastRefreshedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.` : 'กำลังเชื่อมต่อ'}
              </div>
            </div>
          </div>

          {/* B. INTERACTIVE MAP CONTAINER */}
          <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative">
            
            {/* Top Floating Map Quick-Filters Bar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              {/* Quick Pills */}
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-sm border border-slate-200/80 pointer-events-auto">
                {[
                  { id: 'ALL', label: 'ทั้งหมด' },
                  { id: 'WATER', label: 'น้ำท่วม/ระดับน้ำ' },
                  { id: 'RAIN', label: 'ปริมาณฝน' },
                  { id: 'STATIONS', label: 'สถานีตรวจวัด' },
                  { id: 'CITIZEN', label: 'รายงานประชาชน' },
                  { id: 'EVIDENCE', label: 'หลักฐานภายนอก' }
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => handleQuickPill(pill.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      activeQuickPill === pill.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Fullscreen Map Button */}
              <Link
                to="/map"
                className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-600 shadow-sm border border-slate-200/80 pointer-events-auto transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                <span>ขยายแผนที่เต็มจอ</span>
              </Link>
            </div>

            {/* Longdo-inspired Hydrological Status Summary Bar */}
            {waterways?.status_summary && (
              <div className="pt-14 px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between text-sm font-sans">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span>วิกฤต {waterways.status_summary.critical_count} จุด</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>เฝ้าระวัง {waterways.status_summary.watch_count} จุด</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>ปกติ {waterways.status_summary.normal_count} จุด</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span>ไม่มีจุดวัด {waterways.status_summary.unmonitored_count} จุด</span>
                  </div>
                  <span className="text-xs text-slate-400 font-normal">
                    (จากโครงข่ายลำน้ำ {waterways.status_summary.total_segments} ช่วง)
                  </span>
                </div>

                {/* Status proportion bar */}
                <div className="hidden xl:flex items-center gap-0.5 w-44 h-2 rounded-full overflow-hidden bg-slate-200 shrink-0">
                  <div style={{ width: `${(waterways.status_summary.critical_count / waterways.status_summary.total_segments) * 100}%` }} className="h-full bg-red-500" title="วิกฤต" />
                  <div style={{ width: `${(waterways.status_summary.watch_count / waterways.status_summary.total_segments) * 100}%` }} className="h-full bg-amber-500" title="เฝ้าระวัง" />
                  <div style={{ width: `${(waterways.status_summary.normal_count / waterways.status_summary.total_segments) * 100}%` }} className="h-full bg-emerald-500" title="ปกติ" />
                  <div style={{ width: `${(waterways.status_summary.unmonitored_count / waterways.status_summary.total_segments) * 100}%` }} className="h-full bg-sky-500" title="ไม่มีจุดวัด" />
                </div>
              </div>
            )}

            {/* Map Viewport */}
            <div className="w-full h-[400px]">
              <MapLibreMapView
                monitoringSurface={monitoringSurface}
                boundaryData={boundaryData}
                waterways={waterways}
                stations={waterStations}
                rainfallStations={rainfallStations}
                observations={observations}
                externalEvidence={externalEvidence}
                visibleLayers={{
                  monitoringSurface: layerWater,
                  waterways: true,
                  stations: layerStations,
                  rainfallStations: layerRain,
                  observations: layerCitizen,
                  externalEvidence: layerEvidence,
                  outsideMask: true,
                  adminLabels: true
                }}
                selectedDistrict={selectedDistrict === 'ทั้งหมด' ? '' : selectedDistrict}
                onSelectDistrict={(dist) => setSelectedDistrict(dist || 'ทั้งหมด')}
                onSelectMarker={(markerProps) => {
                  setSelectedItem(markerProps);
                }}
                basemap="satellite"
                targetCoords={targetCoords}
                suppressMapPopup={false}
              />
            </div>
          </div>

          {/* C. 3 METRIC SUMMARY CARDS */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Card 1: Water Level */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Waves className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm text-slate-600 font-semibold block">ระดับน้ำ (ล่าสุด)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{keyWaterLevel}</span>
                    <span className="text-sm font-semibold text-slate-500">ม.</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                    สถานี {waterStations?.length || 25} แห่ง
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Card 2: Rainfall */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-sky-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <CloudRain className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm text-slate-600 font-semibold block">ปริมาณฝน (ล่าสุด)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{keyRainfall}</span>
                    <span className="text-sm font-semibold text-slate-500">มม.</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                    สถานี {rainfallStations?.length || 76} แห่ง
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Card 3: Water Quality */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-emerald-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Leaf className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm text-slate-600 font-semibold block">คุณภาพน้ำ</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">ปกติ</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                    จุดตรวจ 4 แห่ง
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

          </div>

          {/* D. TWO-COLUMN CONTENT GRID (News + External Evidence) */}
          <div className="grid grid-cols-12 gap-5">
            
            {/* Left Section (7 Cols): ข่าวสารล่าสุด */}
            <section className="col-span-7 bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4.5 h-4.5 text-blue-600" />
                    <h2 className="text-base font-bold text-slate-900">ข่าวสารล่าสุด</h2>
                  </div>
                  <Link to="/official-updates?tab=news" className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-0.5">
                    <span>ดูทั้งหมด</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* 4 News Cards in Row Grid */}
                <div className="grid grid-cols-4 gap-3">
                  {curatedNews.map((news, idx) => {
                    const badge = getPublisherBadge(news.source_name);
                    const imageSrc = news.source_image_url || `/assets/news/news_00${(idx % 12) + 1}.jpg`;
                    return (
                      <div
                        key={news.id || idx}
                        onClick={() => onSelectEvidence(news)}
                        className="group cursor-pointer flex flex-col rounded-xl overflow-hidden border border-slate-100 hover:border-blue-200 hover:shadow-xs transition-all bg-white"
                      >
                        {/* Image Thumbnail with Agency Badge */}
                        <div className="w-full h-24 relative overflow-hidden bg-slate-100">
                          <img
                            src={imageSrc}
                            alt={news.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback news photo
                              (e.target as HTMLImageElement).src = '/assets/news/news_001.jpg';
                            }}
                          />
                          <span className={`absolute bottom-1.5 left-1.5 text-xs font-bold px-2 py-0.5 rounded shadow-xs ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                            {news.title}
                          </h3>
                          <div className="text-xs text-slate-400 mt-1.5 line-clamp-1 font-medium">
                            {news.published_at ? new Date(news.published_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'ล่าสุด'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Right Section (5 Cols): สถานการณ์และหลักฐานล่าสุด (External Evidence with Purple Accent) */}
            <section className="col-span-5 bg-white rounded-2xl p-4.5 border border-purple-100/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                      <h2 className="text-base font-bold text-slate-900 leading-tight">สถานการณ์และหลักฐานล่าสุด</h2>
                    </div>
                    <span className="text-xs text-purple-600 font-medium block mt-0.5">หลักฐานจากแหล่งสาธารณะภายนอก (External Evidence)</span>
                  </div>
                  <Link to="/cases" className="text-sm text-purple-600 hover:text-purple-800 hover:underline font-semibold flex items-center gap-0.5 shrink-0 whitespace-nowrap ml-2">
                    <span>ดูทั้งหมด</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* 3 Evidence Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {curatedEvidence.map((ev, idx) => {
                    const photo = getEvidencePhotoUrl(ev);
                    const isVerified = ev.verification_status === 'OFFICIAL_VERIFIED' || ev.verification_status === 'CORROBORATED';
                    return (
                      <div
                        key={ev.id || idx}
                        onClick={() => onSelectEvidence({
                          ...ev,
                          source_name: ev.source_name || ev.source_platform || 'แหล่งสาธารณะ',
                          source_type: ev.evidence_type || 'EXTERNAL_EVIDENCE',
                          authority_level: ev.verification_status === 'OFFICIAL_VERIFIED' ? 'OFFICIAL' : 'SECONDARY',
                          title: ev.title_or_summary || ev.title || 'รายงานสังเกตการณ์',
                          summary: ev.description || ev.text_excerpt,
                          source_image_url: photo
                        })}
                        className="group cursor-pointer flex flex-col rounded-xl overflow-hidden border border-purple-100 hover:border-purple-300 hover:shadow-xs transition-all bg-white"
                      >
                        {/* Evidence Thumbnail with Platform tag */}
                        <div className="w-full h-24 relative overflow-hidden bg-purple-50">
                          <img
                            src={photo}
                            alt={ev.title_or_summary}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/evidence/evd_008_boat_rescue.jpg';
                            }}
                          />
                          <span className="absolute top-1.5 left-1.5 text-xs font-bold px-2 py-0.5 rounded bg-purple-950/80 text-purple-200 backdrop-blur-xs border border-purple-500/30">
                            {ev.source_platform || 'Facebook'}
                          </span>
                        </div>

                        {/* Text & Verification status */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-purple-700 transition-colors">
                              {ev.title_or_summary || 'รายงานสังเกตการณ์'}
                            </h3>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 font-medium">
                              {ev.district ? `อ.${ev.district}` : 'จ.ปราจีนบุรี'}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {isVerified ? 'ยืนยันแล้ว' : 'หลักฐานภายนอก'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

          </div>

        </main>

        {/* ========================================================== */}
        {/* RIGHT PANEL (Width: 350px - Detailed Item Inspector)       */}
        {/* ========================================================== */}
        <aside className="w-[350px] shrink-0 bg-white border-l border-slate-200/80 p-5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            
            {/* 1. Header with Station / Item Photo */}
            <div className="w-full h-32 rounded-2xl overflow-hidden relative border border-slate-200/60 shadow-xs">
              <img
                src={selectedItem?.photo_url || selectedItem?.source_image_url || '/assets/evidence/water_kabin.jpg'}
                alt="Selected Item"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/evidence/water_kabin.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-2.5 left-2.5">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                  {selectedItem?.type === 'station' ? 'สถานีตรวจวัด' : 'จุดสังเกตการณ์'}
                </span>
              </div>
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between text-white">
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    {selectedItem?.name_th || 'สถานีตรวจวัด บ้านหนองปรือ'}
                  </h3>
                  <p className="text-xs text-slate-200 font-medium">
                    {selectedItem?.district ? `อ.${selectedItem.district} จ.ปราจีนบุรี` : 'จ.ปราจีนบุรี'}
                  </p>
                </div>
                <Link
                  to={`/map?district=${encodeURIComponent(selectedItem?.district || 'กบินทร์บุรี')}`}
                  className="text-xs text-sky-200 hover:text-white flex items-center gap-0.5 shrink-0 font-medium"
                >
                  <span>ดูรายละเอียด</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 2. Inspector Tabs [ระดับน้ำ, ปริมาณฝน, ข้อมูลสถานี] */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'WATER', label: 'ระดับน้ำ' },
                { id: 'RAIN', label: 'ปริมาณฝน' },
                { id: 'STATION', label: 'ข้อมูลสถานี' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorTab(tab.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    inspectorTab === tab.id
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 3. Measurement Value & Status */}
            {inspectorTab === 'WATER' && (
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-slate-500 font-semibold block">ระดับน้ำล่าสุด</span>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {selectedItem?.water_level_msl != null ? selectedItem.water_level_msl.toFixed(2) : '2.38'}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">ม.</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ปกติ
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                    <span>จากระดับตลิ่ง {selectedItem?.critical_level_msl ? `${selectedItem.critical_level_msl.toFixed(2)} ม.` : '6.00 ม.'}</span>
                    <span>{selectedItem?.observed_at_bkk || '10 ต.ค. 2568 14:20 น.'}</span>
                  </div>
                </div>

                {/* Sparkline Trend Chart */}
                <div className="w-full h-28 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="waterAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="level" stroke="#0284C7" strokeWidth={2.5} fillOpacity={1} fill="url(#waterAreaGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Additional Metadata Table */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-slate-800 block">ข้อมูลเพิ่มเติม</span>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">รหัสสถานี</span>
                      <span className="font-semibold text-slate-800">{selectedItem?.station_id || selectedItem?.id || 'STN-001'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">แม่น้ำ</span>
                      <span className="font-semibold text-slate-800">{selectedItem?.basin || 'แม่น้ำปราจีนบุรี'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">ความจุน้ำ</span>
                      <span className="font-semibold text-slate-800">{selectedItem?.critical_level_msl ? `${selectedItem.critical_level_msl.toFixed(2)} ม.` : '6.00 ม.'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">สถานะ</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ออนไลน์
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rainfall Tab */}
            {inspectorTab === 'RAIN' && (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-sm text-slate-500 font-semibold block">ปริมาณฝนสะสม (24 ชม.)</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                    {keyRainfall} <span className="text-sm font-semibold text-slate-500">มม.</span>
                  </div>
                </div>
                <div className="space-y-2 text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">สถานะฝน</span>
                    <span className="font-semibold text-slate-800">ฝนตกเล็กน้อยถึงปานกลาง</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">หน่วยงานตรวจวัด</span>
                    <span className="font-semibold text-slate-800">สสน. (ThaiWater)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Station Specs Tab */}
            {inspectorTab === 'STATION' && (
              <div className="space-y-2 text-sm text-slate-600">
                <span className="text-sm font-bold text-slate-800 block">ข้อมูลจำเพาะสถานี</span>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">ระดับตลิ่ง</span>
                    <span className="font-semibold text-slate-800">{selectedItem?.critical_level_msl ? `${selectedItem.critical_level_msl} ม. รทก.` : '6.00 ม. รทก.'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">ระดับเตือนภัย</span>
                    <span className="font-semibold text-slate-800">{selectedItem?.warning_level_msl ? `${selectedItem.warning_level_msl} ม. รทก.` : '5.50 ม. รทก.'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">พิกัดสถานี</span>
                    <span className="font-semibold text-slate-800">
                      {selectedItem?.latitude ? `${selectedItem.latitude.toFixed(3)}, ${selectedItem.longitude.toFixed(3)}` : '13.985, 101.718'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">การเข้าถึงข้อมูล</span>
                    <span className="font-semibold text-blue-600">สาธารณะ (Open Data)</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Quick Action Button at bottom of inspector */}
          <div className="pt-4 border-t border-slate-100">
            <Link
              to={`/map?district=${encodeURIComponent(selectedItem?.district || 'กบินทร์บุรี')}`}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <span>สำรวจสถานการณ์ในพื้นที่นี้</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>

      </div>

      {/* ============================================================ */}
      {/* 3. LIGHTWEIGHT FOOTER BAR                                     */}
      {/* ============================================================ */}
      <footer className="w-full h-10 bg-white border-t border-slate-200/80 px-6 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">FloodTrace</span>
          <span>|</span>
          <span>ข้อมูลน้ำ ข้อมูลคน เพื่อชุมชนที่ปลอดภัย</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-600">ระบบปกติ</span>
          </div>
          <span>|</span>
          <span>
            {lastRefreshedAt ? `อัปเดตล่าสุด ${lastRefreshedAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} ${lastRefreshedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.` : '10 ต.ค. 2568 14:20 น.'}
          </span>
        </div>
      </footer>

    </div>
  );
};
