import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  MapPin, 
  Sliders, 
  Info, 
  X, 
  ChevronRight, 
  AlertCircle, 
  ChevronDown,
  Compass,
  Clock,
  Layers2,
  SlidersHorizontal,
  Plus,
  Minus,
  RotateCcw,
  Globe,
  Maximize2,
  Minimize2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { 
  MapLibreMapView, 
  DISTRICT_CENTROIDS, 
  AUTHENTIC_TAMBONS 
} from '../components/map/MapLibreMapView';

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const districtParam = searchParams.get('district') || 'กบินทร์บุรี';

  const [selectedDistrict, setSelectedDistrict] = useState<string>(districtParam);
  const [selectedCellData, setSelectedCellData] = useState<any>(null);
  const [selectedMarkerData, setSelectedMarkerData] = useState<any>(null);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(false);
  const [surfaceOpacity, setSurfaceOpacity] = useState<number>(0.35);
  const [basemap, setBasemap] = useState<'satellite' | 'streets'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Search & Typeahead States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);

  // Real GIS Telemetry Data States
  const [monitoringSurface, setMonitoringSurface] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [rainfallStations, setRainfallStations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Layer Controls (Section 13: Clean & Focused Defaults)
  const [visibleLayers, setVisibleLayers] = useState({
    monitoringSurface: true, // ANALYSIS: Monitoring Priority Surface
    waterways: true,         // HYDROLOGY: Rivers & Canals
    stations: true,          // HYDROLOGY: Water-level stations
    rainfallStations: true,  // HYDROLOGY: Rainfall stations
    observations: true,      // COMMUNITY: Citizen Reports
    outsideMask: true,       // GEOGRAPHY: Gray outside-analysis mask
    adminLabels: true,       // GEOGRAPHY: Geographic labels
    roadOverlay: true        // GEOGRAPHY: Transportation roads
  });

  const toggleLayer = (key: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (districtParam && PRACHIN_DISTRICTS.includes(districtParam)) {
      setSelectedDistrict(districtParam);
    }
  }, [districtParam]);

  // Fetch Real Telemetry & Geospatial Layers from Backend API
  const loadMapData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/map/boundary').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/waterways').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/stations').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/public/rainfall-stations').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/public/observations').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([surfaceRes, boundRes, waterRes, stationsRes, rainRes, obsRes]) => {
      setMonitoringSurface(surfaceRes);
      setBoundaryData(boundRes);
      setWaterways(waterRes);
      setStations(Array.isArray(stationsRes) ? stationsRes : []);
      setRainfallStations(Array.isArray(rainRes) ? rainRes : []);
      setObservations(Array.isArray(obsRes) ? obsRes : []);

      if (surfaceRes?.features && selectedDistrict) {
        const found = surfaceRes.features.find((f: any) => f.properties.district === selectedDistrict);
        if (found) {
          setSelectedCellData(found.properties);
        }
      }
      setLastRefreshedAt(new Date());
      setLoading(false);
    });
  };

  useEffect(() => {
    loadMapData();

    // Automated refresh every 60 seconds (Section 21)
    const interval = setInterval(() => {
      loadMapData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectDistrict = (d: string) => {
    setSelectedDistrict(d);
    setTargetCoords(null);
    if (monitoringSurface?.features) {
      const found = monitoringSurface.features.find((f: any) => f.properties.district === d);
      if (found) {
        setSelectedCellData(found.properties);
      }
    }
  };

  const handleSelectCell = (props: any) => {
    setSelectedCellData(props);
    setSelectedMarkerData(null);
    if (props.district) {
      setSelectedDistrict(props.district);
    }
    setTargetCoords(null);
  };

  const handleSelectMarker = (markerProps: any) => {
    setSelectedMarkerData(markerProps);
  };

  // Search Results Filtering (Districts, Authentic Subdistricts, Waterways)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    // Match Province
    const matchedProvince = 'ปราจีนบุรี'.includes(q) ? [{
      type: 'province',
      title: 'จังหวัดปราจีนบุรี',
      subtitle: 'พื้นที่วิเคราะห์หลัก FloodTrace',
      district: 'กบินทร์บุรี',
      coords: [14.05, 101.55] as [number, number]
    }] : [];

    // Match Districts
    const matchedDistricts = PRACHIN_DISTRICTS.filter(d => 
      d.toLowerCase().includes(q) || `อำเภอ${d}`.toLowerCase().includes(q)
    ).map(d => ({
      type: 'district',
      title: `อ.${d}`,
      subtitle: `อำเภอใน จ.ปราจีนบุรี`,
      district: d,
      coords: DISTRICT_CENTROIDS[d]
    }));

    // Match Subdistricts
    const matchedTambons = AUTHENTIC_TAMBONS.filter(t =>
      t.name.toLowerCase().includes(q) || t.district.toLowerCase().includes(q)
    ).slice(0, 5).map(t => ({
      type: 'tambon',
      title: t.name,
      subtitle: `อ.${t.district} จ.ปราจีนบุรี`,
      district: t.district,
      coords: [t.lat, t.lng] as [number, number]
    }));

    // Match Waterways
    const matchedWaterways = waterways?.features ? waterways.features.filter((f: any) =>
      f.properties.name.toLowerCase().includes(q)
    ).slice(0, 3).map((f: any) => ({
      type: 'waterway',
      title: f.properties.name,
      subtitle: f.properties.type || 'ทางน้ำสายหลัก',
      district: 'กบินทร์บุรี',
      coords: [f.geometry.coordinates[0][1], f.geometry.coordinates[0][0]] as [number, number]
    })) : [];

    return [...matchedProvince, ...matchedDistricts, ...matchedTambons, ...matchedWaterways].slice(0, 7);
  }, [searchQuery, waterways]);

  const handleSearchResultClick = (result: any) => {
    setSelectedDistrict(result.district);
    setTargetCoords(result.coords);
    setSearchQuery(result.title);
    setIsSearchFocused(false);

    if (monitoringSurface?.features) {
      const found = monitoringSurface.features.find((f: any) => f.properties.district === result.district);
      if (found) {
        setSelectedCellData(found.properties);
      }
    }
  };

  const handleResetCamera = () => {
    setTargetCoords([14.05, 101.55]);
    setSelectedDistrict('กบินทร์บุรี');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-2">
      
      {/* 1. Header Bar: Compact Navigation Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2 bg-slate-900/90 text-white rounded-2xl backdrop-blur-md border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>แผนที่เฝ้าระวังสิ่งแวดล้อม (Environmental Watch Map)</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-600/40 text-blue-200 border border-blue-400/30">
              ดาวเทียมสิ่งแวดล้อม
            </span>
          </h1>
        </div>

        {/* Refresh & Scope Indicators */}
        <div className="flex items-center gap-3.5 text-xs sm:text-sm text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>ขอบเขตการวิเคราะห์: <strong className="text-white font-semibold">จ.ปราจีนบุรี</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>อัปเดตอัตโนมัติ: {lastRefreshedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
          </div>
        </div>
      </div>

      {/* 2. Full-bleed Map Canvas Container (Matching Reference Layout) */}
      <div 
        ref={mapContainerRef}
        className="relative w-full h-[78vh] min-h-[580px] max-h-[880px] rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950"
      >
        
        {/* Full WebGL MapLibre Map Engine */}
        <MapLibreMapView
          monitoringSurface={monitoringSurface}
          boundaryData={boundaryData}
          waterways={waterways}
          stations={stations}
          rainfallStations={rainfallStations}
          observations={observations}
          visibleLayers={visibleLayers}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={handleSelectDistrict}
          onSelectCell={handleSelectCell}
          onSelectMarker={handleSelectMarker}
          surfaceOpacity={surfaceOpacity}
          basemap={basemap}
          targetCoords={targetCoords}
        />

        {/* 3. Floating Search Bar at Top (Section 11 - Visual Reference Layout) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-30">
          <div className="relative">
            <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 px-4 py-2.5 transition-all focus-within:ring-2 focus-within:ring-[#0C65E8] focus-within:border-transparent min-h-[46px]">
              <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="ค้นหาพื้นที่ ตำบล อำเภอ หรือจังหวัด..."
                className="w-full text-base text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowLayerPanel(!showLayerPanel)}
                title="ตัวเลือกชั้นข้อมูล"
                className={`p-1.5 rounded-xl transition-colors ${showLayerPanel ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Typeahead Search Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => handleSearchResultClick(res)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50/80 flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0C65E8] flex items-center justify-center shrink-0 group-hover:bg-[#0C65E8] group-hover:text-white transition-colors">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-[#0C65E8]">
                          {res.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {res.subtitle}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {res.type === 'district' ? 'อำเภอ' : res.type === 'tambon' ? 'ตำบล' : res.type === 'waterway' ? 'ทางน้ำ' : 'จังหวัด'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Minimal Floating Map Controls (Top-Right, Section 12) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          {/* Zoom & Re-center Group */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col divide-y divide-slate-100">
            <button
              onClick={() => handleResetCamera()}
              title="รีเซ็ตมุมมองจังหวัดปราจีนบุรี"
              className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              title="ชั้นข้อมูลแผนที่"
              className={`p-2.5 transition-colors ${showLayerPanel ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Layers2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBasemap(basemap === 'satellite' ? 'streets' : 'satellite')}
              title={`เปลี่ยนแผนที่ฐาน (ปัจจุบัน: ${basemap === 'satellite' ? 'ภาพถ่ายดาวเทียม' : 'แผนที่ถนน'})`}
              className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title="เต็มจอ"
              className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. Floating Layer Control Panel (Section 13) */}
        {showLayerPanel && (
          <div className="absolute top-20 right-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-4 z-30 animate-in fade-in slide-in-from-right-2 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0C65E8]" />
                <span className="text-sm font-bold text-slate-800">ชั้นข้อมูลแผนที่</span>
              </div>
              <button
                onClick={() => setShowLayerPanel(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ANALYSIS */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">การวิเคราะห์ความเสี่ยง</span>
              <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="font-medium">พื้นผิวระดับการเฝ้าระวัง</span>
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.monitoringSurface}
                  onChange={() => toggleLayer('monitoringSurface')}
                  className="rounded text-[#0C65E8] focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              {/* Opacity Slider */}
              {visibleLayers.monitoringSurface && (
                <div className="pt-1 px-2 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>ความโปร่งแสงพื้นผิว</span>
                    <span className="font-semibold text-slate-700">{Math.round(surfaceOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.65"
                    step="0.05"
                    value={surfaceOpacity}
                    onChange={(e) => setSurfaceOpacity(parseFloat(e.target.value))}
                    className="w-full accent-[#0C65E8] cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* HYDROLOGY */}
            <div className="space-y-2 border-t border-slate-100 pt-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">โครงข่ายอุทกวิทยา</span>
              <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                  <span className="font-medium">แม่น้ำและลำคลองสายหลัก</span>
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.waterways}
                  onChange={() => toggleLayer('waterways')}
                  className="rounded text-[#0C65E8] focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                  <span className="font-medium">สถานีวัดระดับน้ำ (โทรมาตร)</span>
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.stations}
                  onChange={() => toggleLayer('stations')}
                  className="rounded text-[#0C65E8] focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                  <span className="font-medium">สถานีวัดน้ำฝนอัตโนมัติ</span>
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.rainfallStations}
                  onChange={() => toggleLayer('rainfallStations')}
                  className="rounded text-[#0C65E8] focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>

            {/* COMMUNITY */}
            <div className="space-y-2 border-t border-slate-100 pt-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ภาคประชาชน</span>
              <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  <span className="font-medium">รายงานข้อสังเกตชุมชน</span>
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.observations}
                  onChange={() => toggleLayer('observations')}
                  className="rounded text-[#0C65E8] focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>

            {/* GEOGRAPHY */}
            <div className="space-y-2 border-t border-slate-100 pt-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ภูมิศาสตร์และป้ายชื่อ</span>
              <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-700"></span>
                  <span className="font-medium">หน้ากากนอกเขตปราจีนบุรี</span>
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.outsideMask}
                  onChange={() => toggleLayer('outsideMask')}
                  className="rounded text-[#0C65E8] focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  <span className="font-medium">ป้ายชื่อตำบลและอำเภอ</span>
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.adminLabels}
                  onChange={() => toggleLayer('adminLabels')}
                  className="rounded text-[#0C65E8] focus:ring-0 cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          </div>
        )}

        {/* 6. Split Map Legends (Section 23: Mandatory Split into Legend A and Legend B) */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-3.5 max-w-[360px] space-y-2.5">
          {/* Legend Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">คำอธิบายสัญลักษณ์ (Map Legends)</span>
            <span className="text-2xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">จ.ปราจีนบุรี</span>
          </div>

          {/* LEGEND A: ระดับความสำคัญในการเฝ้าระวัง */}
          <div className="space-y-1">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
              ระดับความสำคัญในการเฝ้าระวัง (Priority Surface)
            </span>
            <div className="grid grid-cols-5 gap-1 text-center">
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#DC2626] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">สูงมาก</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#EA580C] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">สูง</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#EAB308] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">ปานกลาง</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">ต่ำ</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#64748B] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">ไม่มีข้อมูล</span>
              </div>
            </div>
          </div>

          {/* LEGEND B: ข้อมูลบนแผนที่ */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
              ข้อมูลบนแผนที่ (Map Markers)
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0284C7] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs">สถานีระดับน้ำ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#EA580C] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs">สถานีวัดน้ำฝน</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0D9488] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs">รายงานจากประชาชน</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#9333EA] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs">ข้อมูลสิ่งแวดล้อม</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="w-3 h-3 rounded-full bg-[#DC2626] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs font-medium text-rose-700">เหตุการณ์ที่อยู่ระหว่างการติดตาม (Alert)</span>
              </div>
            </div>
          </div>

          {/* Clarification Disclaimer (Section 14 & 23) */}
          <p className="text-2xs text-slate-500 leading-normal border-t border-slate-100 pt-1.5">
            พื้นที่สีแสดงระดับ Monitoring / Verification Priority ไม่ใช่การยืนยันการปนเปื้อนหรือระดับความเป็นพิษ
          </p>
        </div>

        {/* 7. Slide-out Detail Drawer (Non-blocking, on Selected Cell or Marker) */}
        {selectedCellData && (
          <div className="absolute top-4 left-4 z-20 w-84 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3.5 animate-in fade-in slide-in-from-left-2 duration-150 max-h-[85%] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">พื้นที่วิเคราะห์</span>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedCellData.cell_name || `ต.${selectedCellData.subdistrict} (อ.${selectedCellData.district})`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCellData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Priority Status Pill */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-sm text-slate-600">ลำดับการเฝ้าระวัง:</span>
              <span 
                className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-xs"
                style={{ backgroundColor: selectedCellData.color || '#0284c7' }}
              >
                {selectedCellData.priority_badge || selectedCellData.priority_level}
              </span>
            </div>

            {/* Priority Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>คะแนนความสำคัญ:</span>
                <span className="font-bold text-slate-900">{selectedCellData.priority_score ?? '-'} / 1.00</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, Math.max(5, (selectedCellData.priority_score || 0) * 100))}%`,
                    backgroundColor: selectedCellData.color || '#0284c7'
                  }}
                />
              </div>
            </div>

            {/* Contributing Factors */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">ปัจจัยที่นำมาประมวลผล:</span>
              <ul className="space-y-1 text-xs text-slate-600 pl-1 leading-relaxed">
                {selectedCellData.contributing_factors && selectedCellData.contributing_factors.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#0C65E8] shrink-0 font-bold">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs border-t border-slate-100 pt-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-2xs text-slate-400 block mb-0.5">ฝนสะสม 24 ชม.</span>
                <span className="font-bold text-sm text-slate-800">{selectedCellData.rain_24h_mm ? `${selectedCellData.rain_24h_mm.toFixed(1)} มม.` : '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-2xs text-slate-400 block mb-0.5">รายงานชุมชน</span>
                <span className="font-bold text-sm text-slate-800">{selectedCellData.citizen_report_count ?? 0} รายการ</span>
              </div>
            </div>

            {/* Provenance & Action Link */}
            <div className="text-xs text-slate-500 pt-2 flex items-center justify-between border-t border-slate-100">
              <span>ความสดใหม่: {selectedCellData.freshness || 'สดใหม่'}</span>
              <Link 
                to={`/my-area?district=${selectedCellData.district}`}
                className="text-[#0C65E8] font-semibold hover:underline flex items-center gap-1"
              >
                <span>ดูข้อมูลอำเภอ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
