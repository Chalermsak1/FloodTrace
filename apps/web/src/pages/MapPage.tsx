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
  ExternalLink,
  Droplets,
  CloudRain,
  Filter,
  Check,
  Eye,
  EyeOff,
  Flame,
  Activity
} from 'lucide-react';
import { 
  MapLibreMapView, 
  DISTRICT_CENTROIDS, 
  AUTHENTIC_TAMBONS,
  isEnvironmentalItem,
  isGenuineVerified,
  formatThaiTime,
  cleanAgencyName
} from '../components/map/MapLibreMapView';
import { AreaAnalysisPanel } from '../components/map/AreaAnalysisPanel';

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
  const [surfaceOpacity, setSurfaceOpacity] = useState<number>(0.45);
  const [basemap, setBasemap] = useState<'satellite' | 'streets'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMobileLegend, setShowMobileLegend] = useState<boolean>(false);
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
  const [externalEvidence, setExternalEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Near-Real-Time SSE Connection & Truthful Data Freshness States
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [latestObservedTimeStr, setLatestObservedTimeStr] = useState<string | null>(null);
  const [freshnessStatus, setFreshnessStatus] = useState<string>('RECENT');
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // Focused Views Presets (Objective 1 & 3)
  type ViewPreset = 'all' | 'flood' | 'environmental' | 'custom';
  const [activePreset, setActivePreset] = useState<ViewPreset>('all');

  // Layer Controls: 4 Thematic Layers + Sub-layers + Overlays
  const [visibleLayers, setVisibleLayers] = useState({
    // 4 Thematic Layers (Objective 1)
    flooding: true,          // Blue: flood extents and reported flooded locations
    environmental: true,     // Purple: reported foam, unusual water color, sediment, anomalies
    monitoringStations: true,// Yellow/Amber: water-level, rainfall stations
    citizenReports: true,    // Orange: reports submitted by the public

    // Sub-layers & Geospatial Overlays
    monitoringSurface: true, // ANALYSIS: Monitoring Priority Surface
    waterways: true,         // HYDROLOGY: Rivers & Canals
    stations: true,          // HYDROLOGY: Water-level stations
    rainfallStations: true,  // HYDROLOGY: Rainfall stations
    observations: true,      // COMMUNITY: Citizen Reports
    externalEvidence: true,  // EXTERNAL: External Public Evidence (News / Social / Reports)
    outsideMask: true,       // GEOGRAPHY: Gray outside-analysis mask
    adminLabels: true,       // GEOGRAPHY: Geographic labels
    roadOverlay: true        // GEOGRAPHY: Transportation roads
  });

  const toggleLayer = (key: keyof typeof visibleLayers) => {
    setActivePreset('custom');
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPreset = (preset: 'all' | 'flood' | 'environmental') => {
    setActivePreset(preset);
    if (preset === 'all') {
      setVisibleLayers(prev => ({
        ...prev,
        flooding: true,
        environmental: true,
        monitoringStations: true,
        citizenReports: true,
        monitoringSurface: true,
        waterways: true,
        stations: true,
        rainfallStations: true,
        observations: true,
        externalEvidence: true
      }));
    } else if (preset === 'flood') {
      setVisibleLayers(prev => ({
        ...prev,
        flooding: true,
        environmental: false,
        monitoringStations: true,
        citizenReports: true,
        monitoringSurface: true,
        waterways: true,
        stations: true,
        rainfallStations: true,
        observations: true,
        externalEvidence: true
      }));
    } else if (preset === 'environmental') {
      setVisibleLayers(prev => ({
        ...prev,
        flooding: false,
        environmental: true,
        monitoringStations: true,
        citizenReports: true,
        monitoringSurface: false,
        waterways: true,
        stations: true,
        rainfallStations: true,
        observations: true,
        externalEvidence: true
      }));
    }
  };

  // Real Backend Data Counts for 4 Thematic Layers
  const layerCounts = useMemo(() => {
    const floodPointsCount = externalEvidence.filter(e => {
      const lat = e.latitude ?? e.public_latitude;
      const lng = e.longitude ?? e.public_longitude;
      return lat && lng && e.location_precision !== 'UNKNOWN' && !isEnvironmentalItem(e);
    }).length;

    const envPointsCount = externalEvidence.filter(e => {
      const lat = e.latitude ?? e.public_latitude;
      const lng = e.longitude ?? e.public_longitude;
      return lat && lng && e.location_precision !== 'UNKNOWN' && isEnvironmentalItem(e);
    }).length;

    const stationsCount = stations.length;
    const rainCount = rainfallStations.length;
    const citizenCount = observations.length;

    const verifiedCitizenCount = observations.filter(isGenuineVerified).length;
    const verifiedEvidenceCount = externalEvidence.filter(isGenuineVerified).length;
    const verifiedTotal = verifiedCitizenCount + verifiedEvidenceCount;

    return {
      floodPoints: floodPointsCount,
      waterways: waterways?.features?.length || 0,
      environmental: envPointsCount,
      monitoringStations: stationsCount + rainCount,
      waterStations: stationsCount,
      rainfallStations: rainCount,
      citizenReports: citizenCount,
      verifiedCount: verifiedTotal
    };
  }, [externalEvidence, stations, rainfallStations, observations, waterways]);

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
      fetch('/api/public/stations').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/rainfall-stations').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/observations').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/external-evidence').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([surfaceRes, boundRes, waterRes, stationsRes, rainRes, obsRes, evidenceRes]) => {
      if (surfaceRes) setMonitoringSurface(surfaceRes);
      if (boundRes) setBoundaryData(boundRes);
      if (waterRes) setWaterways(waterRes);
      if (Array.isArray(stationsRes)) setStations(stationsRes);
      if (Array.isArray(rainRes)) setRainfallStations(rainRes);
      if (Array.isArray(obsRes)) setObservations(obsRes);
      if (Array.isArray(evidenceRes)) setExternalEvidence(evidenceRes);

      // Only auto-open inspection panel if explicitly requested via query parameter
      if (surfaceRes?.features && selectedDistrict && searchParams.get('inspect') === 'true') {
        const found = surfaceRes.features.find((f: any) => f.properties.district === selectedDistrict);
        if (found) {
          setSelectedCellData(found.properties);
        }
      }

      // Compute Truthful Data Freshness across actual telemetry observations
      let newestObs: Date | null = null;
      let statusSummary = 'RECENT';
      const availableStations = [
        ...(Array.isArray(stationsRes) ? stationsRes : []),
        ...(Array.isArray(rainRes) ? rainRes : [])
      ];
      for (const s of availableStations) {
        const obsTime = s.observed_at ? new Date(s.observed_at) : (s.source_timestamp ? new Date(s.source_timestamp) : null);
        if (obsTime && (!newestObs || obsTime > newestObs)) {
          newestObs = obsTime;
        }
        if (s.freshness_status === 'LIVE') {
          statusSummary = 'LIVE';
        }
      }
      if (newestObs && !isNaN(newestObs.getTime())) {
        setLatestObservedTimeStr(newestObs.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.');
      }
      setFreshnessStatus(statusSummary);

      setLastRefreshedAt(new Date());
      setLoading(false);
    });
  };

  // Near-Real-Time SSE Subscription with Exponential Backoff and Incremental Map Updates
  useEffect(() => {
    let isMounted = true;
    loadMapData();

    const connectSSE = () => {
      if (sseRef.current) {
        sseRef.current.close();
      }

      setConnectionStatus('reconnecting');
      const sseUrl = window.location.hostname.includes('onrender.com')
        ? 'https://floodtrace-api.onrender.com/api/v1/realtime/events'
        : '/api/v1/realtime/events';
      const eventSource = new EventSource(sseUrl);
      sseRef.current = eventSource;

      eventSource.addEventListener('open', () => {
        if (!isMounted) return;
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      });

      eventSource.addEventListener('CONNECTED', () => {
        if (!isMounted) return;
        setConnectionStatus('connected');
      });

      eventSource.addEventListener('DATA_UPDATED', (e: MessageEvent) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(e.data || '{}');
          const src = payload.source;
          setLastRefreshedAt(new Date());

          // Incremental Layer Refresh Without Reloading Full Map Canvas
          if (src === 'thaiwater_rid_runoff') {
            fetch('/api/public/stations').then(r => r.ok ? r.json() : null).then(data => {
              if (isMounted && Array.isArray(data) && data.length > 0) setStations(data);
            });
            fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).then(data => {
              if (isMounted && data) setMonitoringSurface(data);
            });
          } else if (src === 'thaiwater_rainfall') {
            fetch('/api/public/rainfall-stations').then(r => r.ok ? r.json() : null).then(data => {
              if (isMounted && Array.isArray(data) && data.length > 0) setRainfallStations(data);
            });
            fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).then(data => {
              if (isMounted && data) setMonitoringSurface(data);
            });
          } else if (src === 'citizen_reports' || payload.dataset === 'citizen_reports') {
            fetch('/api/public/observations').then(r => r.ok ? r.json() : null).then(data => {
              if (isMounted && Array.isArray(data)) setObservations(data);
            });
          } else if (src === 'external_evidence' || payload.dataset === 'external_evidence') {
            fetch('/api/public/external-evidence').then(r => r.ok ? r.json() : null).then(data => {
              if (isMounted && Array.isArray(data) && data.length > 0) setExternalEvidence(data);
            });
          } else {
            loadMapData();
          }
        } catch (err) {
          console.warn('[SSE] Error handling DATA_UPDATED:', err);
        }
      });

      eventSource.addEventListener('MONITORING_PRIORITY_UPDATED', () => {
        if (!isMounted) return;
        fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).then(data => {
          if (isMounted && data) {
            setMonitoringSurface(data);
            setLastRefreshedAt(new Date());
          }
        });
      });

      eventSource.onerror = () => {
        if (!isMounted) return;
        eventSource.close();
        sseRef.current = null;
        setConnectionStatus('reconnecting');

        const attempts = reconnectAttemptsRef.current;
        reconnectAttemptsRef.current += 1;
        // Bounded exponential backoff with jitter (1s - 30s)
        const delay = Math.min(30000, 1000 * Math.pow(1.8, Math.min(attempts, 6))) + Math.random() * 500;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted) {
            connectSSE();
            // Reconciliation fetch on reconnect
            loadMapData();
          }
        }, delay);
      };
    };

    connectSSE();

    // Gentle Fallback Reconciliation (every 3 minutes)
    const fallbackInterval = setInterval(() => {
      loadMapData();
    }, 180000);

    return () => {
      isMounted = false;
      if (sseRef.current) sseRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(fallbackInterval);
    };
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
      
      {/* 1. Header Bar: Compact Navigation Context & Near-Real-Time Observability */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2 bg-slate-900/90 text-white rounded-2xl backdrop-blur-md border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Connection status badge (Section 19: Connection != Data Freshness) */}
          {connectionStatus === 'connected' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-xs" title="เชื่อมต่อสตรีมข้อมูลสดเรียบร้อย">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>เชื่อมต่อสด (Live SSE)</span>
            </span>
          ) : connectionStatus === 'reconnecting' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-xs" title="กำลังเชื่อมต่อใหม่ด้วย Exponential Backoff">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>กำลังเชื่อมต่อใหม่...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 shadow-xs" title="ขาดการเชื่อมต่อสตรีมสด กำลังใช้ข้อมูลแคช">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>ออฟไลน์ (แคชล่าสุด)</span>
            </span>
          )}

          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>แผนที่เฝ้าระวังสิ่งแวดล้อม (Environmental Watch Map)</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-600/40 text-blue-200 border border-blue-400/30">
              จ.ปราจีนบุรี
            </span>
          </h1>
        </div>

        {/* Truthful Freshness & Scope Indicators (Section 20: Do NOT claim real-time if upstream is not real-time) */}
        <div className="flex items-center gap-3.5 text-xs sm:text-sm text-slate-300 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>ขอบเขต: <strong className="text-white font-semibold">จ.ปราจีนบุรี</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              อัปเดตอัตโนมัติ {latestObservedTimeStr ? (
                <>• ตรวจวัดล่าสุด: <strong className="text-sky-300 font-semibold">{latestObservedTimeStr}</strong></>
              ) : (
                <>({lastRefreshedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Focused Views & Quick Layer Presets Bar (Objective 1 & 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-800 text-xs shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1 text-2xs uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>มุมมองวิเคราะห์:</span>
          </span>
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 min-h-[34px] ${
              activePreset === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>มุมมองทั้งหมด (All)</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('flood')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 min-h-[34px] ${
              activePreset === 'flood'
                ? 'bg-[#0284C7] text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-300"></span>
            <span>มุมมองน้ำท่วม (Flood View)</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('environmental')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 min-h-[34px] ${
              activePreset === 'environmental'
                ? 'bg-[#7C3AED] text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-300"></span>
            <span>เฝ้าระวังสิ่งแวดล้อม (Environmental View)</span>
          </button>
        </div>

        {/* Live Layer Counters Summary */}
        <div className="flex items-center gap-2 text-2xs text-slate-300 overflow-x-auto py-0.5">
          <span className="inline-flex items-center gap-1 shrink-0 bg-sky-950/60 text-sky-300 px-2 py-0.5 rounded-full border border-sky-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]"></span>
            <span>น้ำท่วม {layerCounts.floodPoints} จุด</span>
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></span>
            <span>สิ่งแวดล้อม {layerCounts.environmental} จุด</span>
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
            <span>สถานี {layerCounts.monitoringStations} แห่ง</span>
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 bg-orange-950/60 text-orange-300 px-2 py-0.5 rounded-full border border-orange-800/60 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]"></span>
            <span>ประชาชน {layerCounts.citizenReports} รายงาน</span>
          </span>
          {layerCounts.verifiedCount > 0 && (
            <span className="inline-flex items-center gap-1 shrink-0 bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800/60 font-bold" title="ข้อมูลที่มีบันทึกตรวจสอบยืนยัน">
              <span>✓ ยืนยันแล้ว {layerCounts.verifiedCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* 3. Full-bleed Map Canvas Container (Matching Reference Layout) */}
      <div 
        ref={mapContainerRef}
        className="relative w-full h-[calc(100vh-14rem)] min-h-[460px] sm:min-h-[580px] sm:h-[76vh] max-h-[880px] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950"
      >
        
        {/* Full WebGL MapLibre Map Engine */}
        <MapLibreMapView
          monitoringSurface={monitoringSurface}
          boundaryData={boundaryData}
          waterways={waterways}
          stations={stations}
          rainfallStations={rainfallStations}
          observations={observations}
          externalEvidence={externalEvidence}
          visibleLayers={visibleLayers}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={handleSelectDistrict}
          onSelectCell={handleSelectCell}
          onSelectMarker={handleSelectMarker}
          surfaceOpacity={surfaceOpacity}
          basemap={basemap}
          targetCoords={targetCoords}
          suppressMapPopup={true}
        />

        {/* 4. Floating Search Bar at Top */}
        <div className="absolute top-2.5 sm:top-4 left-2.5 right-2.5 sm:left-1/2 sm:-translate-x-1/2 sm:w-[92%] max-w-xl z-30">
          <div className="relative">
            <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 px-3.5 sm:px-4 py-2 sm:py-2.5 transition-all focus-within:ring-2 focus-within:ring-[#0C65E8] focus-within:border-transparent min-h-[44px]">
              <Search className="w-5 h-5 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="ค้นหาพื้นที่ ตำบล อำเภอ หรือจังหวัด..."
                className="w-full text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 mr-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowLayerPanel(!showLayerPanel)}
                title="ตัวเลือกชั้นข้อมูล"
                className={`p-1.5 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ${showLayerPanel ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-500'}`}
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

        {/* 5. Minimal Floating Map Controls (Top-Right) */}
        <div className="absolute top-16 right-2.5 sm:top-4 sm:right-4 z-20 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col divide-y divide-slate-100">
            <button
              onClick={() => handleResetCamera()}
              title="รีเซ็ตมุมมองจังหวัดปราจีนบุรี"
              className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              title="ชั้นข้อมูลแผนที่"
              className={`p-2.5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${showLayerPanel ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Layers2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBasemap(basemap === 'satellite' ? 'streets' : 'satellite')}
              title={`เปลี่ยนแผนที่ฐาน (ปัจจุบัน: ${basemap === 'satellite' ? 'ภาพถ่ายดาวเทียม' : 'แผนที่ถนน'})`}
              className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title="เต็มจอ"
              className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-[#0C65E8] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6. Floating Layer Control Panel (Objective 1, 2, 3: Distinct Thematic Layers) */}
        {showLayerPanel && (
          <div className="absolute top-16 right-2.5 sm:top-20 sm:right-4 w-[calc(100%-1.25rem)] sm:w-88 max-w-[360px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-3.5 sm:p-4 z-35 animate-in fade-in slide-in-from-right-2 duration-150 space-y-3.5 max-h-[75vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900">จัดการชั้นข้อมูลแผนที่</span>
              </div>
              <button
                onClick={() => setShowLayerPanel(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick View Presets Inside Panel */}
            <div className="space-y-1.5">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">โหมดมุมมองเฉพาะ</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className={`py-1 px-1.5 rounded-lg text-2xs font-semibold text-center transition-all ${
                    activePreset === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('flood')}
                  className={`py-1 px-1.5 rounded-lg text-2xs font-semibold text-center transition-all ${
                    activePreset === 'flood'
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  น้ำท่วม
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('environmental')}
                  className={`py-1 px-1.5 rounded-lg text-2xs font-semibold text-center transition-all ${
                    activePreset === 'environmental'
                      ? 'bg-[#7C3AED] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  สิ่งแวดล้อม
                </button>
              </div>
            </div>

            {/* 4 THEMATIC INDEPENDENT LAYERS */}
            <div className="space-y-2.5 border-t border-slate-100 pt-2.5">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                4 ชั้นข้อมูลหลัก (Thematic Map Layers)
              </span>

              {/* 1. FLOODING / WATERLOGGING (Blue: #0284C7) */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.flooding ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-50 border-slate-200/80 opacity-75'}`}>
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#0284C7] flex items-center justify-center text-white text-3xs font-bold shadow-xs">
                      🌊
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>น้ำท่วมและระดับน้ำขัง</span>
                        <span className="text-3xs font-bold px-1.5 py-0.2 rounded-full bg-sky-200/70 text-sky-900">
                          {layerCounts.floodPoints} จุด
                        </span>
                      </div>
                      <div className="text-3xs text-sky-800">
                        ขอบเขตวิเคราะห์, ทางน้ำ ({layerCounts.waterways} สาย) & จุดน้ำท่วม
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.flooding}
                    onChange={() => toggleLayer('flooding')}
                    className="rounded text-[#0284C7] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                </label>

                {/* Sub-options for Flooding */}
                {visibleLayers.flooding && (
                  <div className="mt-2 pt-2 border-t border-sky-200/60 space-y-1.5 pl-5 text-3xs text-slate-600">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>พื้นผิวการเฝ้าระวัง (Priority Surface)</span>
                      <input
                        type="checkbox"
                        checked={visibleLayers.monitoringSurface}
                        onChange={() => toggleLayer('monitoringSurface')}
                        className="rounded text-[#0284C7] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>

                    {visibleLayers.monitoringSurface && (
                      <div className="py-1 space-y-1 pr-1">
                        <div className="flex justify-between text-3xs text-slate-500">
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
                          className="w-full accent-[#0284C7] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                      </div>
                    )}

                    <label className="flex items-center justify-between cursor-pointer">
                      <span>แม่น้ำและลำคลองสายหลัก</span>
                      <input
                        type="checkbox"
                        checked={visibleLayers.waterways}
                        onChange={() => toggleLayer('waterways')}
                        className="rounded text-[#0284C7] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 2. ENVIRONMENTAL OBSERVATIONS (Purple: #7C3AED) */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.environmental ? 'bg-purple-50/70 border-purple-200' : 'bg-slate-50 border-slate-200/80 opacity-75'}`}>
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-3xs font-bold shadow-xs">
                      🧪
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>ข้อสังเกตสิ่งแวดล้อม</span>
                        <span className="text-3xs font-bold px-1.5 py-0.2 rounded-full bg-purple-200/70 text-purple-900">
                          {layerCounts.environmental} รายการ
                        </span>
                      </div>
                      <div className="text-3xs text-purple-800">
                        ฟอง คราบ กลิ่น สีน้ำผิดปกติ (สังเกตทางกายภาพ)
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.environmental}
                    onChange={() => toggleLayer('environmental')}
                    className="rounded text-[#7C3AED] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                </label>
                <div className="text-3xs text-slate-400 mt-1 pl-5 italic">
                  * ข้อสังเกตจากแหล่งสาธารณะ ไม่ใช่ผลตรวจแล็บสารพิษ
                </div>
              </div>

              {/* 3. MONITORING STATIONS (Yellow/Amber: #D97706) */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.monitoringStations ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200/80 opacity-75'}`}>
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#D97706] flex items-center justify-center text-white text-3xs font-bold shadow-xs">
                      📡
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>สถานีตรวจวัดและโทรมาตร</span>
                        <span className="text-3xs font-bold px-1.5 py-0.2 rounded-full bg-amber-200/70 text-amber-900">
                          {layerCounts.monitoringStations} แห่ง
                        </span>
                      </div>
                      <div className="text-3xs text-amber-800">
                        ระดับน้ำ (สสน./ชลประทาน) & ปริมาณน้ำฝน (กรมอุตุฯ)
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.monitoringStations}
                    onChange={() => toggleLayer('monitoringStations')}
                    className="rounded text-[#D97706] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                </label>

                {/* Sub-options for Monitoring Stations */}
                {visibleLayers.monitoringStations && (
                  <div className="mt-2 pt-2 border-t border-amber-200/60 space-y-1 pl-5 text-3xs text-slate-600">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                        <span>สถานีวัดระดับน้ำ ({layerCounts.waterStations})</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={visibleLayers.stations}
                        onChange={() => toggleLayer('stations')}
                        className="rounded text-[#D97706] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                        <span>สถานีวัดน้ำฝนอัตโนมัติ ({layerCounts.rainfallStations})</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={visibleLayers.rainfallStations}
                        onChange={() => toggleLayer('rainfallStations')}
                        className="rounded text-[#F59E0B] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 4. CITIZEN REPORTS (Orange: #EA580C) */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.citizenReports ? 'bg-orange-50/70 border-orange-200' : 'bg-slate-50 border-slate-200/80 opacity-75'}`}>
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EA580C] flex items-center justify-center text-white text-3xs font-bold shadow-xs">
                      👥
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>รายงานจากประชาชน</span>
                        <span className="text-3xs font-bold px-1.5 py-0.2 rounded-full bg-orange-200/70 text-orange-900">
                          {layerCounts.citizenReports} รายงาน
                        </span>
                      </div>
                      <div className="text-3xs text-orange-800">
                        รายงานชุมชน (ความแม่นยำระดับตำบล ~1.1 กม.)
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.citizenReports}
                    onChange={() => toggleLayer('citizenReports')}
                    className="rounded text-[#EA580C] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                </label>
              </div>
            </div>

            {/* OFFICIAL VERIFICATION INDICATOR EXPLANATION */}
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-3xs font-bold">
                  ✓
                </span>
                <span className="text-xs font-bold text-emerald-950">สถานะการตรวจสอบยืนยัน</span>
              </div>
              <p className="text-3xs text-emerald-800 leading-relaxed">
                วงแหวนสีเขียว <strong className="font-semibold text-emerald-900">#16A34A</strong> จะปรากฏบนหมุดเฉพาะเมื่อมีบันทึกการตรวจสอบยืนยันจากทางการหรือผลแล็บจริงเท่านั้น (พบ {layerCounts.verifiedCount} รายการ)
              </p>
            </div>

            {/* BASE GEOGRAPHY & OVERLAYS */}
            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                ภูมิศาสตร์และป้ายชื่อ
              </span>
              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <span>หน้ากากนอกเขตปราจีนบุรี</span>
                <input
                  type="checkbox"
                  checked={visibleLayers.outsideMask}
                  onChange={() => toggleLayer('outsideMask')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <span>ป้ายชื่อตำบลและอำเภอ</span>
                <input
                  type="checkbox"
                  checked={visibleLayers.adminLabels}
                  onChange={() => toggleLayer('adminLabels')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                <span>เส้นทางคมนาคม</span>
                <input
                  type="checkbox"
                  checked={visibleLayers.roadOverlay}
                  onChange={() => toggleLayer('roadOverlay')}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
              </label>
            </div>
          </div>
        )}

        {/* Mobile Floating Legend Trigger Button */}
        {!selectedCellData && !selectedMarkerData && !showMobileLegend && (
          <button
            type="button"
            onClick={() => setShowMobileLegend(true)}
            className="md:hidden absolute bottom-3 left-2.5 z-20 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/90 px-3 py-2 text-xs font-semibold text-slate-800 flex items-center gap-1.5 min-h-[42px] active:scale-[0.98] transition-all"
            aria-label="เปิดคำอธิบายสัญลักษณ์แผนที่"
          >
            <Info className="w-4 h-4 text-[#0C65E8]" />
            <span>คำอธิบายสัญลักษณ์</span>
          </button>
        )}

        {/* 7. Split Map Legends (Section 1 & 23: 4 Thematic Layers + Green Verification Ring) */}
        <div className={`absolute bottom-3 sm:bottom-4 left-2.5 sm:left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-3 sm:p-3.5 w-[calc(100%-1.25rem)] sm:w-auto sm:max-w-[380px] space-y-2.5 ${selectedCellData || selectedMarkerData ? 'hidden lg:block' : (showMobileLegend ? 'block' : 'hidden md:block')}`}>
          {/* Legend Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">คำอธิบายสัญลักษณ์ (Map Legend)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-2xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">จ.ปราจีนบุรี</span>
              <button
                type="button"
                onClick={() => setShowMobileLegend(false)}
                className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="ปิดคำอธิบายสัญลักษณ์"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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

          {/* LEGEND B: 4 Thematic Layers + Verification Indicator */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
              สัญลักษณ์ 4 ชั้นข้อมูล (Thematic Layers)
            </span>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0284C7] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs font-medium">น้ำท่วมและน้ำขัง</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#7C3AED] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs font-medium">ข้อสังเกตสิ่งแวดล้อม</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#D97706] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs font-medium">สถานีโทรมาตร</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#EA580C] shrink-0 border border-white shadow-xs"></span>
                <span className="text-2xs font-medium">รายงานประชาชน</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-slate-100/80">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xs font-bold shrink-0 border border-emerald-300 shadow-xs">
                  ✓
                </span>
                <span className="text-2xs font-semibold text-emerald-900">
                  วงแหวนเขียว: ตรวจสอบยืนยันแล้ว (Official/Lab Confirmed)
                </span>
              </div>
            </div>
          </div>

          {/* Clarification Disclaimers */}
          <p className="text-2xs text-slate-500 leading-normal border-t border-slate-100 pt-1.5">
            หมุดสีม่วงคือข้อสังเกตทางกายภาพจากแหล่งสาธารณะ ไม่ใช่ผลตรวจแล็บสารพิษ • พื้นที่ที่ไม่มีข้อมูลไม่ได้หมายความว่าปลอดภัย
          </p>
        </div>

        {/* 8. Interactive Marker Detail Panel (Opened on marker click) */}
        {selectedMarkerData && (
          <div className="absolute bottom-3 sm:bottom-4 right-2.5 sm:right-4 z-30 w-[calc(100%-1.25rem)] sm:w-96 max-w-[400px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 sm:p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-[82vh] overflow-y-auto">
            {/* Header: Layer Tag & Verification Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedMarkerData._layerType === 'flooding' ? (
                  <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]"></span>
                    จุดน้ำท่วม / น้ำขัง
                  </span>
                ) : selectedMarkerData._layerType === 'environmental' ? (
                  <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></span>
                    ข้อสังเกตสิ่งแวดล้อม
                  </span>
                ) : selectedMarkerData._layerType === 'monitoringStations' ? (
                  <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                    {selectedMarkerData._subType === 'waterLevel' ? 'สถานีวัดระดับน้ำ' : 'สถานีวัดน้ำฝน'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]"></span>
                    รายงานจากประชาชน
                  </span>
                )}

                {/* Verification Status Badge */}
                {isGenuineVerified(selectedMarkerData) || selectedMarkerData._verified ? (
                  <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>ยืนยันแล้ว (Official/Lab)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-3xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    <span>{selectedMarkerData._layerType === 'environmental' ? 'ข้อสังเกตทางกายภาพ' : 'รอตรวจสอบ'}</span>
                  </span>
                )}
              </div>

              <button
                onClick={() => setSelectedMarkerData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="ปิดหน้ารายละเอียด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Location */}
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {selectedMarkerData.name_th || selectedMarkerData.title_or_summary || selectedMarkerData.category_th || selectedMarkerData.category || selectedMarkerData.station_id || 'รายละเอียดจุดสำรวจ'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {selectedMarkerData.location_text || (selectedMarkerData.district ? `อ.${selectedMarkerData.district}` : 'จ.ปราจีนบุรี')}
                  {selectedMarkerData.subdistrict ? ` ต.${selectedMarkerData.subdistrict}` : ''}
                </span>
              </div>
            </div>

            {/* Primary Measurement / Content Block */}
            {selectedMarkerData.water_level_msl != null && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-2xs text-amber-800 font-semibold block">ระดับน้ำตรวจวัดจริง</span>
                  <span className="text-lg font-black text-amber-950">{Number(selectedMarkerData.water_level_msl).toFixed(2)}</span>
                  <span className="text-xs text-amber-800 font-bold ml-1">ม.รทก.</span>
                </div>
                {selectedMarkerData.warning_level_msl != null && (
                  <div className="text-right">
                    <span className="text-3xs text-amber-700 block">ระดับเฝ้าระวัง</span>
                    <span className="text-xs font-bold text-amber-900">{Number(selectedMarkerData.warning_level_msl).toFixed(2)} ม.รทก.</span>
                  </div>
                )}
              </div>
            )}

            {selectedMarkerData.rain_24h_mm != null && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-2xs text-amber-800 font-semibold block">ฝนสะสม 24 ชม.</span>
                  <span className="text-lg font-black text-amber-950">{Number(selectedMarkerData.rain_24h_mm).toFixed(1)}</span>
                  <span className="text-xs text-amber-800 font-bold ml-1">มม.</span>
                </div>
                {selectedMarkerData.rain_1h_mm != null && (
                  <div className="text-right">
                    <span className="text-3xs text-amber-700 block">ฝน 1 ชม. ล่าสุด</span>
                    <span className="text-xs font-bold text-amber-900">{Number(selectedMarkerData.rain_1h_mm).toFixed(1)} มม.</span>
                  </div>
                )}
              </div>
            )}

            {/* Reported Descriptions / Physical Observations */}
            {(selectedMarkerData.text_excerpt || selectedMarkerData.description) && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1">
                <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">
                  {selectedMarkerData._layerType === 'environmental' ? 'ลักษณะทางกายภาพที่สังเกตพบ' : 'รายละเอียดรายงาน'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedMarkerData.text_excerpt || selectedMarkerData.description}
                </p>
              </div>
            )}

            {/* Metadata / Provenance Details */}
            <div className="text-3xs text-slate-500 space-y-1 border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between">
                <span>เวลาตรวจวัด / สังเกตพบ</span>
                <span className="font-semibold text-slate-700">
                  {formatThaiTime(selectedMarkerData.observed_at || selectedMarkerData.observation_time || selectedMarkerData.source_timestamp || selectedMarkerData.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>แหล่งข้อมูล / ผู้รายงาน</span>
                <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                  {selectedMarkerData.source_name || cleanAgencyName(selectedMarkerData.provenance?.source_agency || selectedMarkerData.agency || 'รายงานประชาชน')}
                </span>
              </div>
              {selectedMarkerData.location_precision && (
                <div className="flex items-center justify-between">
                  <span>ความแม่นยำของพิกัด</span>
                  <span className="font-semibold text-slate-700">
                    {selectedMarkerData.location_precision === 'COMMUNITY_APPROXIMATE' || selectedMarkerData._layerType === 'citizenReports'
                      ? 'ระดับตำบล (~1.1 กม.) เพื่อความเป็นส่วนตัว'
                      : selectedMarkerData.location_precision}
                  </span>
                </div>
              )}
            </div>

            {/* External Link */}
            {selectedMarkerData.source_url && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-3xs text-emerald-700 font-medium">บันทึกหลักฐานในระบบ</span>
                {selectedMarkerData.source_url.includes('example.com') ? (
                  <span className="text-3xs text-amber-700 italic">Demo Reference</span>
                ) : (
                  <a
                    href={selectedMarkerData.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    <span>เปิดหน้าเพจต้นทาง</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Cautionary Footer */}
            <div className="text-3xs text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-tight">
              {selectedMarkerData._layerType === 'environmental'
                ? '⚠️ ข้อสังเกตสภาพน้ำทางกายภาพไม่ใช่การยืนยันมลพิษหรือสารเคมีทางห้องปฏิบัติการ'
                : selectedMarkerData._layerType === 'citizenReports'
                ? 'ℹ️ รายงานจากประชาชนผ่านการประมาณพิกัดเพื่อคุ้มครองความเป็นส่วนตัว'
                : 'ℹ️ ข้อมูลโทรมาตรตรวจวัดจริงจากหน่วยงานต้นทาง'}
            </div>
          </div>
        )}

        {/* 9. Slide-out Detail Drawer (Responsive Desktop Floating Card & Mobile Bottom Sheet) */}
        <AreaAnalysisPanel 
          data={selectedCellData} 
          onClose={() => setSelectedCellData(null)} 
        />

      </div>
    </div>
  );
};
