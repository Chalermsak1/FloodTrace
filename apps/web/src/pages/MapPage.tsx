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
import { EvidenceLabel } from '../components/ui/EvidenceLabel';
import { FeedbackState } from '../components/ui/FeedbackState';
import { PageHeader } from '../components/ui/PageHeader';

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
    setSelectedCellData(null);
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
      subtitle: 'ขอบเขตข้อมูล: จังหวัดปราจีนบุรี',
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
    <div className="rw-page-shell space-y-3">
      
      {/* 1. Header Bar: Compact Navigation Context */}
      <PageHeader eyebrow="จังหวัดปราจีนบุรี" title="แผนที่เฝ้าระวัง"
        description="เลือกพื้นที่เพื่อดูข้อมูลที่ระบบแสดง สถานะและความพร้อมของแต่ละชั้นข้อมูลอาจต่างกัน" />

      {/* 2. Full-bleed Map Canvas Container (Matching Reference Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3 items-start">
      <div 
        ref={mapContainerRef}
        className="relative w-full h-[58vh] min-h-[400px] max-h-[760px] lg:h-[calc(100vh-190px)] lg:min-h-[520px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg bg-slate-950"
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
                className={`min-h-11 min-w-11 flex items-center justify-center p-1.5 rounded-xl transition-colors ${showLayerPanel ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-500'}`}
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
              className="min-h-11 min-w-11 flex items-center justify-center p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              title="ชั้นข้อมูลแผนที่"
              className={`min-h-11 min-w-11 flex items-center justify-center p-2.5 transition-colors ${showLayerPanel ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Layers2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBasemap(basemap === 'satellite' ? 'streets' : 'satellite')}
              title={`เปลี่ยนแผนที่ฐาน (ปัจจุบัน: ${basemap === 'satellite' ? 'ภาพถ่ายดาวเทียม' : 'แผนที่ถนน'})`}
              className="min-h-11 min-w-11 flex items-center justify-center p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title="เต็มจอ"
              className="min-h-11 min-w-11 flex items-center justify-center p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors"
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
              จุดแบบจำลองจากข้อมูลสถานี (ไม่ประมาณพื้นที่)
            </span>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#DC2626] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">เกินวิกฤต</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#EA580C] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">ถึงเกณฑ์เตือน</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">ต่ำกว่าเตือน</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-600 border border-white shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium mt-0.5">ข้อมูลฝน</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">สีระดับน้ำเทียบเกณฑ์จากต้นทาง จุดฝนไม่มีเกณฑ์จัดระดับ พื้นที่ระหว่างจุดไม่ได้คำนวณ</p>

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
            จุดสถานีแสดงระดับ Monitoring / Verification Priority จากข้อมูลต้นทางที่รองรับ ไม่ใช่การยืนยันการปนเปื้อนหรือระดับความเป็นพิษ
          </p>
        </div>

      </div>
      <aside className="rw-map-detail-panel rw-card space-y-3 lg:sticky lg:top-20 max-h-none lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto" aria-live="polite" aria-label="รายละเอียดแผนที่">
        {loading ? <FeedbackState kind="loading" title="กำลังโหลดชั้นข้อมูล" />
          : monitoringSurface?.status === 'UNAVAILABLE' ? <FeedbackState kind="unavailable" title="ชั้นข้อมูลเฝ้าระวังไม่พร้อมใช้งาน" detail={monitoringSurface?.reason_code || 'ไม่มีข้อมูลสถานีปัจจุบันที่ผ่านการตรวจแหล่งที่มา'} />
          : !monitoringSurface ? <FeedbackState kind="unavailable" title="ชั้นข้อมูลเฝ้าระวังไม่พร้อมใช้งาน" detail="แผนที่ไม่แสดงข้อมูลที่ API ไม่ได้ส่งกลับ" />
          : (!boundaryData || !waterways) ? <FeedbackState kind="partial" title="แสดงข้อมูลได้บางส่วน" detail="ขอบเขตหรือชั้นข้อมูลทางน้ำบางรายการไม่พร้อมใช้งาน" /> : null}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <p className="rw-page-eyebrow">รายละเอียดพื้นที่</p>
            <h2 className="text-base font-bold text-[#063B70]">
              {selectedCellData ? (selectedCellData.cell_name || `ต.${selectedCellData.subdistrict} (อ.${selectedCellData.district})`) : selectedMarkerData ? (selectedMarkerData.name_th || selectedMarkerData.station_id || selectedMarkerData.category || 'รายการที่เลือก') : 'เลือกพื้นที่บนแผนที่'}
            </h2>
          </div>
          {(selectedCellData || selectedMarkerData) && <button type="button" aria-label="ล้างรายการที่เลือก" onClick={() => { setSelectedCellData(null); setSelectedMarkerData(null); }} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
        </div>
        {selectedCellData ? <>
          <EvidenceLabel family="MODEL" detail="ระดับการเฝ้าระวัง" />
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5 text-sm">
            <span className="text-slate-600">ระดับที่ระบบรายงาน</span>
            <span className="rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ color: selectedCellData.color || '#475569', borderColor: selectedCellData.color || '#cbd5e1' }}>
              {selectedCellData.priority_badge || selectedCellData.priority_level || 'ไม่สามารถยืนยันได้'}
            </span>
          </div>
          <p className="text-sm text-slate-600">คะแนน: {typeof selectedCellData.priority_score === 'number' ? `${selectedCellData.priority_score.toFixed(2)} / 1.00` : 'ไม่ได้คำนวณ'}</p>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-800">ปัจจัยที่ระบบรายงาน</h3>
            {Array.isArray(selectedCellData.contributing_factors) && selectedCellData.contributing_factors.length > 0
              ? <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{selectedCellData.contributing_factors.map((factor: string, index: number) => <li key={index}>{factor}</li>)}</ul>
              : <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>}
          </div>
          <dl className="grid grid-cols-1 gap-2 border-y border-slate-100 py-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {selectedCellData.data_kind === 'WATER_LEVEL_OBSERVATION' && <div><dt className="text-slate-500">ระดับน้ำ</dt><dd className="font-semibold text-slate-800">{typeof selectedCellData.water_level_msl === 'number' ? `${selectedCellData.water_level_msl.toFixed(2)} ม. MSL` : 'ไม่มีข้อมูล'}</dd></div>}
            {selectedCellData.data_kind === 'RAINFALL_OBSERVATION' && <div><dt className="text-slate-500">ฝนสะสม 24 ชม.</dt><dd className="font-semibold text-slate-800">{typeof selectedCellData.rain_24h_mm === 'number' ? `${selectedCellData.rain_24h_mm.toFixed(1)} มม.` : 'ไม่มีข้อมูล'}</dd></div>}
            <div><dt className="text-slate-500">รายงานชุมชน</dt><dd className="font-semibold text-slate-800">{typeof selectedCellData.citizen_report_count === 'number' ? `${selectedCellData.citizen_report_count} รายการ` : 'ไม่มีข้อมูล'}</dd></div>
            <div><dt className="text-slate-500">ความสดใหม่</dt><dd className="font-semibold text-slate-800">{selectedCellData.freshness || 'ไม่มีข้อมูล'}</dd></div>
          </dl>
          {selectedCellData.district && <Link to={`/area-detail?district=${encodeURIComponent(selectedCellData.district)}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[#0C65E8] hover:underline">ดูรายละเอียดอำเภอ <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>}
          <p className="text-xs leading-relaxed text-slate-500">ระดับการเฝ้าระวังไม่ใช่การยืนยันการปนเปื้อนหรือความเป็นพิษ</p>
        </> : selectedMarkerData ? <>
          {selectedMarkerData.category ? <EvidenceLabel family="COMMUNITY" detail="ข้อสังเกต" />
            : selectedMarkerData.evidence_classification === 'OFFICIAL' ? <EvidenceLabel family="OFFICIAL" />
            : selectedMarkerData.evidence_classification === 'MODEL' ? <EvidenceLabel family="MODEL" />
            : <span className="text-xs text-slate-500">แหล่งหลักฐานไม่ระบุ</span>}
          <p className="text-sm text-slate-600">{selectedMarkerData.category || selectedMarkerData.status || selectedMarkerData.water_level_m != null && `ระดับน้ำ ${selectedMarkerData.water_level_m} ม.` || selectedMarkerData.rain_24h_mm != null && `ฝนสะสม ${selectedMarkerData.rain_24h_mm} มม.` || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
          <p className="text-xs text-slate-500">แสดงเฉพาะข้อมูลที่ API ส่งกลับ ไม่มีการแสดงพิกัดส่วนบุคคล</p>
        </> : <>
          <p className="text-sm text-slate-600">เลือกพื้นที่หรือเครื่องหมายบนแผนที่เพื่อเปิดรายละเอียด</p>
          <div className="flex flex-wrap gap-2"><EvidenceLabel family="OFFICIAL" /><EvidenceLabel family="COMMUNITY" /><EvidenceLabel family="MODEL" /></div>
          <p className="text-xs text-slate-500">แต่ละประเภทเป็นคนละหลักฐาน ผลวิเคราะห์ไม่ใช่ผลตรวจยืนยัน</p>
        </>}
      </aside>
      </div>
    </div>
  );
};
