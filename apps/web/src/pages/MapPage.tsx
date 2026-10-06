import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Info, 
  X, 
  ChevronRight, 
  AlertCircle, 
  ChevronDown,
  Compass,
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

const FLOOD_DEPTH_COLORS = ['#BAE6FD', '#7DD3FC', '#0284C7', '#075985'];

const parseEstimatedWaterDepth = (value: unknown) => {
  if (typeof value !== 'string' || !/(เมตร|\bmeters?\b|\bmetres?\b)/i.test(value)) return null;
  const numbers = [...value.matchAll(/\d+(?:[.,]\d+)?/g)].map(([match]) => Number(match.replace(',', '.')));
  if (!numbers.length || numbers.some(number => !Number.isFinite(number) || number < 0)) return null;
  const upperMeters = numbers.length > 1 ? numbers[1] : numbers[0];
  if (upperMeters < numbers[0]) return null;
  return { label: value.trim(), upperMeters };
};

export const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const districtParam = searchParams.get('district') || 'กบินทร์บุรี';

  const [selectedDistrict, setSelectedDistrict] = useState<string>(districtParam);
  const [selectedCellData, setSelectedCellData] = useState<any>(null);
  const [selectedMarkerData, setSelectedMarkerData] = useState<any>(null);
  const [mapMode, setMapMode] = useState<'flood' | 'monitoring'>('monitoring');
  const [selectedFloodFeature, setSelectedFloodFeature] = useState<any>(null);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [basemap, setBasemap] = useState<'satellite' | 'streets'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Search & Typeahead States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);

  // Real GIS Telemetry Data States
  const [monitoringSurface, setMonitoringSurface] = useState<any>(null);
  const [floodExtent, setFloodExtent] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [rainfallStations, setRainfallStations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [monitoringSurfaceStatus, setMonitoringSurfaceStatus] = useState<'loading' | 'available' | 'unavailable'>('loading');

  const visibleLayers = useMemo(() => ({
    monitoringSurface: mapMode === 'monitoring',
    floodExtent: mapMode === 'flood',
    waterways: true,
    stations: false,
    rainfallStations: false,
    observations: mapMode === 'monitoring',
    outsideMask: true,
    adminLabels: true,
    roadOverlay: true
  }), [mapMode]);
  const floodPresentation = useMemo(() => {
    const features = Array.isArray(floodExtent?.features) ? floodExtent.features : [];
    const ranges = features
      .map((feature: any) => parseEstimatedWaterDepth(feature.properties?.water_depth_est))
      .filter((range: ReturnType<typeof parseEstimatedWaterDepth>): range is NonNullable<typeof range> => range !== null)
      .sort((a: NonNullable<ReturnType<typeof parseEstimatedWaterDepth>>, b: NonNullable<ReturnType<typeof parseEstimatedWaterDepth>>) => a.upperMeters - b.upperMeters || a.label.localeCompare(b.label));
    const uniqueRanges = ranges.filter((range, index) => ranges.findIndex(candidate => candidate.label === range.label) === index);
    const depthBounds = [...new Set<number>(uniqueRanges.map(range => range.upperMeters))].sort((a, b) => a - b);
    const colorByRange = new Map<string, string>();
    uniqueRanges.forEach(range => {
      const depthIndex = depthBounds.indexOf(range.upperMeters);
      const paletteIndex = depthBounds.length <= 1
        ? 1
        : Math.round(depthIndex * (FLOOD_DEPTH_COLORS.length - 1) / (depthBounds.length - 1));
      colorByRange.set(range.label, FLOOD_DEPTH_COLORS[paletteIndex]);
    });
    const classes = uniqueRanges.map(range => ({ ...range, color: colorByRange.get(range.label)! }));
    const displayFeatures = features.map((feature: any) => {
      const depth = parseEstimatedWaterDepth(feature.properties?.water_depth_est);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          flood_depth_color: depth ? colorByRange.get(depth.label) : null
        }
      };
    });
    return {
      mapData: floodExtent && Array.isArray(floodExtent.features) ? { ...floodExtent, features: displayFeatures } : null,
      classes,
      missingDepthCount: features.filter((feature: any) => !parseEstimatedWaterDepth(feature.properties?.water_depth_est)).length
    };
  }, [floodExtent]);
  const selectedFloodProperties = selectedFloodFeature;

  useEffect(() => {
    if (districtParam && PRACHIN_DISTRICTS.includes(districtParam)) {
      setSelectedDistrict(districtParam);
    }
  }, [districtParam]);

  // Fetch Real Telemetry & Geospatial Layers from Backend API
  const loadMapData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/map/monitoring-priority').then(async r => {
        if (!r.ok) {
          setMonitoringSurfaceStatus('unavailable');
          return null;
        }
        const data = await r.json();
        const validFeatureCollection = data?.type === 'FeatureCollection' && Array.isArray(data.features);
        setMonitoringSurfaceStatus(validFeatureCollection ? 'available' : 'unavailable');
        return validFeatureCollection ? data : null;
      }).catch(() => {
        setMonitoringSurfaceStatus('unavailable');
        return null;
      }),
      fetch('/api/public/flood-extent').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/map/boundary').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/waterways').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/stations').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/public/rainfall-stations').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/public/observations').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([surfaceRes, floodRes, boundRes, waterRes, stationsRes, rainRes, obsRes]) => {
      setMonitoringSurface(surfaceRes);
      setFloodExtent(floodRes?.type === 'FeatureCollection' && Array.isArray(floodRes.features) ? floodRes : null);
      setBoundaryData(boundRes);
      setWaterways(waterRes);
      setStations(Array.isArray(stationsRes) ? stationsRes : []);
      setRainfallStations(Array.isArray(rainRes) ? rainRes : []);
      setObservations(Array.isArray(obsRes) ? obsRes : []);

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
    setSelectedFloodFeature(null);
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
    setSelectedFloodFeature(null);
    if (props.district) {
      setSelectedDistrict(props.district);
    }
    setTargetCoords(null);
  };

  const handleSelectMarker = (markerProps: any) => {
    setSelectedMarkerData(markerProps);
  };

  const handleSelectFloodFeature = (featureProps: any) => {
    setSelectedFloodFeature(featureProps);
    setSelectedCellData(null);
    setSelectedMarkerData(null);
  };

  const handleModeChange = (mode: 'flood' | 'monitoring') => {
    setMapMode(mode);
    setIsLegendExpanded(false);
    setSelectedFloodFeature(null);
    setSelectedMarkerData(null);
    setSelectedCellData(null);
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
    setSelectedFloodFeature(null);

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
    <div className="rw-map-page w-full flex flex-col space-y-2">
      
      {/* Compact province context and mutually exclusive map modes. */}
      <div className="rw-map-toolbar flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 text-white rounded-xl backdrop-blur-md border border-slate-800 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <h1 aria-label="แผนที่เฝ้าระวังสิ่งแวดล้อม" className="text-sm sm:text-base font-bold text-white tracking-tight">
            <span className="rw-map-title-full">แผนที่เฝ้าระวังสิ่งแวดล้อม</span>
            <span className="rw-map-title-compact">แผนที่</span>
          </h1>
          <span className="shrink-0 text-2xs font-semibold px-2 py-1 rounded-full bg-slate-700 text-slate-100">จ.ปราจีนบุรี</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div role="group" aria-label="เลือกโหมดแผนที่" className="rw-map-mode-selector inline-flex items-center gap-0.5 rounded-lg border border-slate-600 bg-slate-800 p-1">
          <button
            type="button"
            data-map-mode="flood"
            aria-pressed={mapMode === 'flood'}
            aria-label="บริเวณที่น้ำท่วม"
            title="บริเวณที่น้ำท่วม"
            onClick={() => handleModeChange('flood')}
            className={`min-h-9 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${mapMode === 'flood' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-200 hover:bg-slate-700'}`}
          >
            <span aria-hidden="true" className="mr-1">🌊</span><span className="rw-map-mode-label-full">บริเวณที่น้ำท่วม</span><span className="rw-map-mode-label-compact">บริเวณที่น้ำท่วม</span>
          </button>
          <button
            type="button"
            data-map-mode="monitoring"
            aria-pressed={mapMode === 'monitoring'}
            aria-label="เฝ้าระวังสารเคมี"
            title="เฝ้าระวังสารเคมี"
            onClick={() => handleModeChange('monitoring')}
            className={`min-h-9 rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${mapMode === 'monitoring' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-200 hover:bg-slate-700'}`}
          >
            <span aria-hidden="true" className="mr-1">⚠️</span><span className="rw-map-mode-label-full">เฝ้าระวังสารเคมี</span><span className="rw-map-mode-label-compact">เฝ้าระวังสารเคมี</span>
          </button>
        </div>
        </div>
      </div>
        <p className="px-1 text-xs sm:text-sm text-slate-600" aria-live="polite">
          {mapMode === 'flood'
            ? 'พื้นที่อ้างอิงจากระบบเดิม ยังไม่ใช่การยืนยันสถานการณ์น้ำท่วมปัจจุบัน และยังไม่มีข้อมูลยืนยันจากแหล่งภายนอกในชั้นข้อมูลนี้'
            : monitoringSurfaceStatus === 'loading'
              ? 'กำลังโหลดพื้นที่เฝ้าระวัง…'
              : monitoringSurfaceStatus === 'unavailable'
                ? 'ชั้นข้อมูลเฝ้าระวังยังไม่พร้อมใช้งาน จึงยังแสดงพื้นที่จากข้อมูลจริงไม่ได้'
                : monitoringSurface?.features?.length
                  ? 'ดูพื้นที่ที่ควรได้รับการเฝ้าระวังหรือตรวจสอบเพิ่มเติม'
                  : 'ไม่มีพื้นที่เฝ้าระวังในข้อมูลที่ได้รับ'}
        </p>

      {/* 2. Full-bleed Map Canvas Container (Matching Reference Layout) */}
      <div 
        ref={mapContainerRef}
        className="rw-map-canvas relative w-full h-[78vh] min-h-[580px] max-h-[880px] rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950"
      >
        
        {/* Full WebGL MapLibre Map Engine */}
        <MapLibreMapView
          monitoringSurface={monitoringSurface}
          floodExtent={floodPresentation.mapData}
          boundaryData={boundaryData}
          waterways={waterways}
          stations={stations}
          rainfallStations={rainfallStations}
          observations={observations}
          visibleLayers={visibleLayers}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={handleSelectDistrict}
          onSelectCell={handleSelectCell}
          onSelectFloodFeature={handleSelectFloodFeature}
          onSelectMarker={handleSelectMarker}
          surfaceOpacity={0.35}
          basemap={basemap}
          targetCoords={targetCoords}
        />

        {/* 3. Floating Search Bar at Top (Section 11 - Visual Reference Layout) */}
        <div className="rw-map-search absolute top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-30">
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
        <div className="rw-map-controls absolute top-4 right-4 z-20 flex flex-col gap-2">
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

        <div className={`rw-map-legend absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/90 p-2 max-w-[360px] ${isLegendExpanded ? 'is-expanded' : ''}`} aria-live="polite">
          <button
            type="button"
            aria-expanded={isLegendExpanded}
            aria-controls="map-legend-content"
            aria-label={`คำอธิบายแผนที่${mapMode === 'flood' ? 'น้ำท่วม' : 'เฝ้าระวังคุณภาพน้ำ'}`}
            onClick={() => setIsLegendExpanded(value => !value)}
            className="flex min-h-8 items-center justify-between gap-3 rounded-lg px-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            <span>คำอธิบาย · {mapMode === 'flood' ? 'น้ำท่วม' : 'เฝ้าระวังคุณภาพน้ำ'}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isLegendExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isLegendExpanded && (
            <div id="map-legend-content" className="mt-1 max-h-[35vh] overflow-y-auto border-t border-slate-100 px-2 pt-2 text-2xs leading-snug text-slate-700">
              {mapMode === 'flood' ? (
                <div className="space-y-1.5">
                  <p className="font-semibold text-slate-900">พื้นที่อ้างอิงน้ำท่วม</p>
                  <p>สถานะ: ข้อมูลอ้างอิง / ยังไม่ได้ยืนยันสถานการณ์ปัจจุบัน</p>
                  <p className="font-semibold text-slate-900">ช่วงระดับน้ำที่ระบุในข้อมูลอ้างอิง</p>
                  {floodPresentation.classes.map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-sm border border-sky-800/30" style={{ backgroundColor: color }} />
                      <span>{label}</span>
                    </div>
                  ))}
                  {floodPresentation.missingDepthCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-sm border border-slate-400 bg-slate-400" />
                      <span>พื้นที่อ้างอิงน้ำท่วม · ไม่ระบุช่วงระดับน้ำ</span>
                    </div>
                  )}
                  {!floodExtent?.features?.length && (
                    <p>{loading ? 'กำลังโหลดข้อมูลขอบเขตน้ำท่วม…' : 'ไม่มีข้อมูลขอบเขตน้ำท่วมให้แสดง'}</p>
                  )}
                  <div className="border-t border-slate-100 pt-1.5 text-slate-500">
                    <p>ข้อมูลขอบเขตอ้างอิงจากระบบเดิม ยังไม่ใช่การยืนยันสถานการณ์น้ำท่วมปัจจุบัน</p>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-1.5">
                    <span className="w-4 shrink-0 border-t-2 border-sky-700" />ลำน้ำ
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 shrink-0 border-t-2 border-sky-500" />ขอบเขตจังหวัด
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {monitoringSurfaceStatus === 'loading' ? (
                    <p role="status">กำลังโหลดชั้นข้อมูลเฝ้าระวัง…</p>
                  ) : monitoringSurfaceStatus === 'unavailable' ? (
                    <p role="status">ชั้นข้อมูลเฝ้าระวังไม่พร้อมใช้งาน จึงไม่มีพื้นที่สีจากข้อมูลจริงให้แสดง</p>
                  ) : !monitoringSurface?.features?.length ? (
                    <p role="status">ไม่มีพื้นที่เฝ้าระวังในข้อมูลที่ได้รับ</p>
                  ) : (
                    <>
                      <div>
                        <p className="mb-1 font-semibold text-slate-900">ระดับการเฝ้าระวัง</p>
                        <div className="grid grid-cols-5 gap-1 text-center">
                          {[
                            ['#DC2626', 'สูงมาก'],
                            ['#EA5808', 'สูง'],
                            ['#EAB308', 'ปานกลาง'],
                            ['#10B981', 'ต่ำ'],
                            ['#64748B', 'ไม่มีข้อมูล']
                          ].map(([color, label]) => (
                            <div key={label} className="flex flex-col items-center">
                              <span className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: color }} />
                              <span className="mt-0.5 text-2xs">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1.5">
                        <span className="h-3 w-3 shrink-0 rounded-full bg-[#0D9488]" />รายงานจากประชาชน
                      </div>
                      <p className="border-t border-slate-100 pt-1.5 text-slate-600">
                        ระดับการเฝ้าระวังใช้เพื่อช่วยจัดลำดับพื้นที่ที่ควรตรวจสอบเพิ่มเติม ไม่ใช่ผลยืนยันการปนเปื้อน
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 7. Slide-out Detail Drawer (Non-blocking, on Selected Cell or Marker) */}
        {mapMode === 'monitoring' && selectedCellData && (
          <div className="rw-map-detail-panel rw-map-monitoring-detail absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 p-3 space-y-2 animate-in fade-in slide-in-from-left-2 duration-150 overflow-y-auto" aria-live="polite" aria-label="รายละเอียดพื้นที่เฝ้าระวัง">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <span className="text-2xs font-semibold text-slate-500">พื้นที่เฝ้าระวัง</span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {selectedCellData.cell_name || `ต.${selectedCellData.subdistrict} (อ.${selectedCellData.district})`}
                </h3>
              </div>
              <button
                type="button"
                aria-label="ปิดรายละเอียดพื้นที่เฝ้าระวัง"
                onClick={() => setSelectedCellData(null)}
                className="min-h-8 min-w-8 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 border border-slate-100">
              <span className="text-xs text-slate-600">ลำดับการเฝ้าระวัง</span>
              <span 
                className="text-2xs font-bold px-2.5 py-1 rounded-full text-white shadow-xs"
                style={{ backgroundColor: selectedCellData.color || '#0284c7' }}
              >
                {selectedCellData.priority_badge || selectedCellData.priority_level || 'ไม่ระบุ'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-2xs text-slate-500">
              <span>ความสดใหม่: {selectedCellData.freshness || 'ไม่ระบุ'}</span>
              {selectedCellData.district && <Link
                to={`/my-area?district=${selectedCellData.district}`}
                className="text-[#0C65E8] font-semibold hover:underline flex items-center gap-1"
              >
                <span>ดูข้อมูลอำเภอ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>}
            </div>
            <details className="border-t border-slate-100 pt-2 text-xs">
              <summary className="cursor-pointer font-semibold text-slate-700">รายละเอียดข้อมูล</summary>
              <div className="space-y-2 pt-2">
                <p>คะแนนความสำคัญ: {typeof selectedCellData.priority_score === 'number' ? `${selectedCellData.priority_score} / 1.00` : 'ไม่ระบุ'}</p>
                <div>
                  <span className="font-semibold">ปัจจัยที่นำมาประมวลผล:</span>
                  {Array.isArray(selectedCellData.contributing_factors) && selectedCellData.contributing_factors.length > 0
                    ? <ul className="list-disc pl-4 text-slate-600">{selectedCellData.contributing_factors.map((factor: string, index: number) => <li key={index}>{factor}</li>)}</ul>
                    : <p className="text-slate-500">ไม่ระบุ</p>}
                </div>
                <p>ฝนสะสม 24 ชม.: {typeof selectedCellData.rain_24h_mm === 'number' ? `${selectedCellData.rain_24h_mm.toFixed(1)} มม.` : 'ไม่ระบุ'}</p>
                <p>รายงานชุมชน: {typeof selectedCellData.citizen_report_count === 'number' ? `${selectedCellData.citizen_report_count} รายการ` : 'ไม่ระบุ'}</p>
              </div>
            </details>
          </div>
        )}

        {mapMode === 'flood' && selectedFloodProperties && (
          <div className="rw-map-detail-panel rw-map-flood-detail absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 p-3 space-y-2 animate-in fade-in slide-in-from-left-2 duration-150 overflow-y-auto" aria-live="polite" aria-label="รายละเอียดขอบเขตน้ำท่วม">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <span className="text-2xs font-semibold text-slate-500">พื้นที่อ้างอิงน้ำท่วม</span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug break-words">
                  {selectedFloodProperties.name || selectedFloodProperties.district || 'พื้นที่ที่เลือก'}
                </h3>
              </div>
              <button
                type="button"
                aria-label="ปิดรายละเอียดพื้นที่น้ำท่วม"
                onClick={() => setSelectedFloodFeature(null)}
                className="min-h-8 min-w-8 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="space-y-1.5 text-xs text-slate-700">
              <div>
                <dt className="font-semibold text-slate-600">ช่วงระดับน้ำที่ระบุในข้อมูลอ้างอิง</dt>
                <dd>{typeof selectedFloodProperties.water_depth_est === 'string' && selectedFloodProperties.water_depth_est.trim()
                  ? selectedFloodProperties.water_depth_est
                  : 'ไม่ระบุในข้อมูลที่ได้รับ'}</dd>
              </div>
              <div><dt className="font-semibold text-slate-600">สถานะ</dt><dd>ข้อมูลอ้างอิง / ยังไม่ได้ยืนยันสถานการณ์ปัจจุบัน</dd></div>
            </dl>
            <div className="space-y-1 border-t border-slate-100 pt-2 text-2xs text-slate-500 break-words">
              <p>ยังไม่มีข้อมูลยืนยันสถานการณ์น้ำท่วมปัจจุบันจากแหล่งภายนอกในชั้นข้อมูลนี้</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
