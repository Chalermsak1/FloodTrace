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
import { getEvidencePhotoUrl, formatBangkokTime } from '../sections/SituationHeroSection';

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
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* ============================================================ */}
      {/* 1. TOP HEADER BAR                                             */}
      {/* ============================================================ */}
      <header className="w-full h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left spacing for aligned sidebar branding */}
        <div className="w-60 shrink-0 hidden xl:flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none block">FloodTrace</span>
            <span className="text-[10px] text-slate-400 font-medium">Real-time Flood Intelligence</span>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="relative flex-1 max-w-xl mx-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="ค้นหาพื้นที่, สถานที่, ข่าวสาร หรือพิกัด..."
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-full pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-inner"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
              <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ผลการค้นหาใน จ.ปราจีนบุรี
              </div>
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearch(item)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="text-xs text-blue-600 font-medium">เลือกพื้นที่</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Icons (Notifications & User Profile) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors relative"
              aria-label="การแจ้งเตือน"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 space-y-2 animate-fadeIn text-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800">การแจ้งเตือนล่าสุด</span>
                  <Link to="/official-updates" className="text-xs text-blue-600 hover:underline font-semibold">ดูทั้งหมด</Link>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <div className="text-xs font-semibold text-blue-900">ประกาศเฝ้าระวังระดับน้ำลุ่มน้ำปราจีนบุรี</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">กรมชลประทานและ สสน. ติดตามสถานการณ์น้ำต่อเนื่อง</div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                👤
              </div>
              <span className="text-xs font-semibold">ผู้ใช้ทั่วไป</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-sm animate-fadeIn">
                <Link
                  to="/report"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-blue-50 text-slate-700 font-medium"
                >
                  <span>ส่งรายงานเหตุการณ์</span>
                </Link>
                <Link
                  to="/data-methodology"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-blue-50 text-slate-700 font-medium"
                >
                  <span>วิธีวิทยาและข้อจำกัด</span>
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <Link
                  to="/admin/reports"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-500 text-xs"
                >
                  <span>เข้าสู่ระบบเจ้าหน้าที่ (Staff)</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE (Sidebar + Central Canvas + Right Panel)    */}
      {/* ============================================================ */}
      <div className="flex-1 w-full flex overflow-hidden">
        
        {/* ========================================================== */}
        {/* LEFT SIDEBAR (Width: 260px)                                */}
        {/* ========================================================== */}
        <aside className="w-[260px] shrink-0 bg-white border-r border-slate-200/80 p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            
            {/* Primary Navigation Menu */}
            <nav className="space-y-1">
              <Link
                to="/overview"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 text-blue-600 shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>หน้าหลัก</span>
              </Link>
              <Link
                to="/map"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                <Map className="w-4 h-4 text-slate-400" />
                <span>แผนที่</span>
              </Link>
              <Link
                to="/official-updates"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                <Newspaper className="w-4 h-4 text-slate-400" />
                <span>ข่าวสาร</span>
              </Link>
              <Link
                to="/cases"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>รายงานเหตุการณ์</span>
              </Link>
              <Link
                to="/forecast"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span>ข้อมูลเชิงลึก</span>
              </Link>

              {/* More Menu Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    <span>เมนูเพิ่มเติม</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showMoreMenu && (
                  <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1 text-xs">
                    <Link to="/about" className="block py-1.5 text-slate-600 hover:text-blue-600">เกี่ยวกับระบบ</Link>
                    <Link to="/knowledge" className="block py-1.5 text-slate-600 hover:text-blue-600">คู่มือและคำแนะนำ</Link>
                    <Link to="/data-methodology" className="block py-1.5 text-slate-600 hover:text-blue-600">วิธีวิทยาและข้อจำกัด</Link>
                  </div>
                )}
              </div>
            </nav>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Data Filters Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 tracking-tight">ตัวกรองข้อมูล</span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  รีเซ็ต
                </button>
              </div>

              {/* Data Categories Checkboxes */}
              <div className="space-y-2.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">ประเภทข้อมูล</span>

                <label className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900 font-medium">
                    <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Droplets className="w-3 h-3" />
                    </div>
                    <span>น้ำท่วม / ระดับน้ำ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layerWater}
                    onChange={(e) => setLayerWater(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900 font-medium">
                    <div className="w-5 h-5 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <CloudRain className="w-3 h-3" />
                    </div>
                    <span>ปริมาณฝน</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layerRain}
                    onChange={(e) => setLayerRain(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900 font-medium">
                    <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Radio className="w-3 h-3" />
                    </div>
                    <span>สถานีตรวจวัด</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layerStations}
                    onChange={(e) => setLayerStations(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900 font-medium">
                    <div className="w-5 h-5 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Users className="w-3 h-3" />
                    </div>
                    <span>รายงานประชาชน</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layerCitizen}
                    onChange={(e) => setLayerCitizen(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer group select-none">
                  <div className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900 font-medium">
                    <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="w-3 h-3" />
                    </div>
                    <span>หลักฐานภายนอก</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layerEvidence}
                    onChange={(e) => setLayerEvidence(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </label>
              </div>

              {/* Time Range Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">ช่วงเวลา</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="24h">24 ชั่วโมงที่ผ่านมา</option>
                  <option value="7d">7 วันที่ผ่านมา</option>
                  <option value="30d">30 วันที่ผ่านมา</option>
                </select>
              </div>

              {/* District Area Filter */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">พื้นที่</span>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRACHIN_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d === 'ทั้งหมด' ? 'ทั้งหมด (7 อำเภอ)' : `อ.${d}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Bottom Community Quote Card */}
          <div className="mt-6 rounded-2xl p-4 bg-gradient-to-b from-sky-50 to-blue-100/70 border border-blue-100 text-center relative overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
              <Waves className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              &ldquo;ร่วมเป็นส่วนหนึ่งในการติดตามและเฝ้าระวัง เพื่อความปลอดภัยของชุมชน&rdquo;
            </p>
          </div>
        </aside>

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
            <div className="relative z-10 max-w-xl text-white space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-white leading-snug">
                ติดตามสถานการณ์น้ำท่วม และข้อมูลสิ่งแวดล้อมในพื้นที่ลุ่มน้ำปราจีนบุรี
              </h1>
              <p className="text-xs text-slate-200 font-normal">
                ข้อมูลจากหลายแหล่ง ทั้งภาครัฐ เอกชน และประชาชน เพื่อให้คุณรับรู้ได้เร็วกว่า
              </p>
            </div>

            {/* Right Location & Freshness Badge */}
            <div className="relative z-10 shrink-0 hidden md:flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl px-3.5 py-2 text-white text-xs">
              <div className="flex items-center gap-1.5 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>ลุ่มน้ำปราจีนบุรี</span>
              </div>
              <span className="text-white/40">•</span>
              <div className="text-[11px] text-slate-300">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 shadow-sm border border-slate-200/80 pointer-events-auto transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ขยายแผนที่เต็มจอ</span>
              </Link>
            </div>

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
                suppressMapPopup={true}
              />
            </div>
          </div>

          {/* C. 3 METRIC SUMMARY CARDS */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* Card 1: Water Level */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Waves className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">ระดับน้ำ (ล่าสุด)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{keyWaterLevel}</span>
                    <span className="text-xs text-slate-500">ม.</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    สถานี {waterStations?.length || 25} แห่ง
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Card 2: Rainfall */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-sky-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <CloudRain className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">ปริมาณฝน (ล่าสุด)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{keyRainfall}</span>
                    <span className="text-xs text-slate-500">มม.</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    สถานี {rainfallStations?.length || 76} แห่ง
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Card 3: Water Quality */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-emerald-300 transition-colors">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Leaf className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">คุณภาพน้ำ</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">ปกติ</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
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
            <section className="col-span-7 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-slate-900">ข่าวสารล่าสุด</h2>
                  </div>
                  <Link to="/official-updates?tab=news" className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-0.5">
                    <span>ดูทั้งหมด</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
                              // Fallback image
                              (e.target as HTMLImageElement).src = '/assets/hero_landscape.jpg';
                            }}
                          />
                          <span className={`absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                            {news.title}
                          </h3>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            {news.published_at ? new Date(news.published_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'ล่าสุด'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Right Section (5 Cols): สถานการณ์และหลักฐานล่าสุด */}
            <section className="col-span-5 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">สถานการณ์และหลักฐานล่าสุด</h2>
                    <span className="text-[11px] text-slate-400 block">ข้อมูลอ้างอิงจากแหล่งสาธารณะภายนอก (External Evidence)</span>
                  </div>
                  <Link to="/cases" className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-0.5">
                    <span>ดูทั้งหมด</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
                        onClick={() => onSelectEvidence(ev)}
                        className="group cursor-pointer flex flex-col rounded-xl overflow-hidden border border-slate-100 hover:border-blue-200 hover:shadow-xs transition-all bg-white"
                      >
                        {/* Evidence Thumbnail with Platform tag */}
                        <div className="w-full h-24 relative overflow-hidden bg-slate-100">
                          <img
                            src={photo}
                            alt={ev.title_or_summary}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/hero_landscape.jpg';
                            }}
                          />
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                            {ev.source_platform || 'Facebook'}
                          </span>
                        </div>

                        {/* Text & Verification status */}
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {ev.title_or_summary || 'รายงานสังเกตการณ์'}
                            </h3>
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                              {ev.district ? `อ.${ev.district}` : 'จ.ปราจีนบุรี'}
                            </div>
                          </div>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isVerified ? 'ยืนยันแล้ว' : 'อยู่ระหว่างตรวจสอบ'}
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600" />
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
                src={selectedItem?.photo_url || '/assets/hero_landscape.jpg'}
                alt="Selected Item"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-2.5 left-2.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                  {selectedItem?.type === 'station' ? 'สถานีตรวจวัด' : 'จุดสังเกตการณ์'}
                </span>
              </div>
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between text-white">
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    {selectedItem?.name_th || 'สถานีตรวจวัด บ้านหนองปรือ'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {selectedItem?.district ? `อ.${selectedItem.district} จ.ปราจีนบุรี` : 'จ.ปราจีนบุรี'}
                  </p>
                </div>
                <Link
                  to={`/map?district=${encodeURIComponent(selectedItem?.district || 'กบินทร์บุรี')}`}
                  className="text-xs text-sky-300 hover:text-white flex items-center gap-0.5 shrink-0 font-medium"
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
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    inspectorTab === tab.id
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
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
                  <span className="text-xs text-slate-400 font-medium block">ระดับน้ำล่าสุด</span>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {selectedItem?.water_level_msl != null ? selectedItem.water_level_msl.toFixed(2) : '2.38'}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">ม.</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ปกติ
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
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
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="level" stroke="#0284C7" strokeWidth={2.5} fillOpacity={1} fill="url(#waterAreaGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Additional Metadata Table */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-800 block">ข้อมูลเพิ่มเติม</span>
                  
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">รหัสสถานี</span>
                      <span className="font-semibold text-slate-800">{selectedItem?.station_id || selectedItem?.id || 'STN-001'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">แม่น้ำ</span>
                      <span className="font-semibold text-slate-800">{selectedItem?.basin || 'แม่น้ำปราจีนบุรี'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">ความจุน้ำ</span>
                      <span className="font-semibold text-slate-800">{selectedItem?.critical_level_msl ? `${selectedItem.critical_level_msl.toFixed(2)} ม.` : '6.00 ม.'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400">สถานะ</span>
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
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">ปริมาณฝนสะสม (24 ชม.)</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                    {keyRainfall} <span className="text-sm font-semibold text-slate-500">มม.</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">สถานะฝน</span>
                    <span className="font-semibold text-slate-800">ฝนตกเล็กน้อยถึงปานกลาง</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">หน่วยงานตรวจวัด</span>
                    <span className="font-semibold text-slate-800">สสน. (ThaiWater)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Station Specs Tab */}
            {inspectorTab === 'STATION' && (
              <div className="space-y-2 text-xs text-slate-600">
                <span className="text-xs font-bold text-slate-800 block">ข้อมูลจำเพาะสถานี</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">ระดับตลิ่ง</span>
                    <span className="font-semibold text-slate-800">{selectedItem?.critical_level_msl ? `${selectedItem.critical_level_msl} ม. รทก.` : '6.00 ม. รทก.'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">ระดับเตือนภัย</span>
                    <span className="font-semibold text-slate-800">{selectedItem?.warning_level_msl ? `${selectedItem.warning_level_msl} ม. รทก.` : '5.50 ม. รทก.'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">พิกัดสถานี</span>
                    <span className="font-semibold text-slate-800">
                      {selectedItem?.latitude ? `${selectedItem.latitude.toFixed(3)}, ${selectedItem.longitude.toFixed(3)}` : '13.985, 101.718'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">การเข้าถึงข้อมูล</span>
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
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
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
