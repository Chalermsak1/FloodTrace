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
import { DataFreshnessBadge, Badge } from '../components/ui';
import { 
  WebGISLayerManager, 
  VisibleLayersState, 
  LayerCountsState, 
  ViewPreset 
} from '../components/map/WebGISLayerManager';
import { WebGISControlDeck } from '../components/map/WebGISControlDeck';
import { Crosshair, Newspaper } from 'lucide-react';

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
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(true);
  const [isInspectorActive, setIsInspectorActive] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

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
  const [newsLocations, setNewsLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Near-Real-Time SSE Connection & Truthful Data Freshness States
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [latestObservedTimeStr, setLatestObservedTimeStr] = useState<string | null>(null);
  const [freshnessStatus, setFreshnessStatus] = useState<string>('RECENT');
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // MapStore Thematic Views Presets
  const [activePreset, setActivePreset] = useState<ViewPreset>('all');

  // Layer Controls: 4 Thematic Layers + News + Sub-layers + Overlays
  const [visibleLayers, setVisibleLayers] = useState<VisibleLayersState>({
    // Thematic Layers
    flooding: true,          // Blue: flood extents and reported flooded locations
    environmental: true,     // Purple: reported foam, unusual water color, sediment, anomalies
    monitoringStations: true,// Yellow/Amber: water-level, rainfall stations
    citizenReports: true,    // Orange: reports submitted by the public
    news: true,              // Navy: curated news media locations

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

  const toggleLayer = (key: keyof VisibleLayersState) => {
    setActivePreset('custom');
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPreset = (preset: ViewPreset) => {
    setActivePreset(preset);
    if (preset === 'all') {
      setVisibleLayers(prev => ({
        ...prev,
        flooding: true,
        environmental: true,
        monitoringStations: true,
        citizenReports: true,
        news: true,
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
        news: false,
        monitoringSurface: true,
        waterways: true,
        stations: true,
        rainfallStations: true,
        observations: true,
        externalEvidence: true
      }));
    } else if (preset === 'hydro') {
      setVisibleLayers(prev => ({
        ...prev,
        flooding: false,
        environmental: false,
        monitoringStations: true,
        citizenReports: false,
        news: false,
        monitoringSurface: true,
        waterways: true,
        stations: true,
        rainfallStations: true,
        observations: false,
        externalEvidence: false
      }));
    } else if (preset === 'environmental') {
      setVisibleLayers(prev => ({
        ...prev,
        flooding: false,
        environmental: true,
        monitoringStations: true,
        citizenReports: true,
        news: false,
        monitoringSurface: false,
        waterways: true,
        stations: true,
        rainfallStations: true,
        observations: true,
        externalEvidence: true
      }));
    } else if (preset === 'news') {
      setVisibleLayers(prev => ({
        ...prev,
        flooding: false,
        environmental: false,
        monitoringStations: false,
        citizenReports: false,
        news: true,
        monitoringSurface: false,
        waterways: true,
        stations: false,
        rainfallStations: false,
        observations: false,
        externalEvidence: false
      }));
    }
  };

  // Real Backend Data Counts for Thematic Layers
  const layerCounts: LayerCountsState = useMemo(() => {
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

    const newsItemsCount = newsLocations.filter(it => {
      const hasCoords = (it.latitude != null && it.longitude != null) || (it.public_latitude != null && it.public_longitude != null);
      const hasSpecificDistrict = it.district && it.district !== 'ปราจีนบุรี' && DISTRICT_CENTROIDS[it.district];
      return hasCoords || hasSpecificDistrict;
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
      newsItems: newsItemsCount,
      verifiedCount: verifiedTotal
    };
  }, [externalEvidence, stations, rainfallStations, observations, waterways, newsLocations]);

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
      fetch('/api/public/external-evidence').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/information?category=news').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([surfaceRes, boundRes, waterRes, stationsRes, rainRes, obsRes, evidenceRes, newsRes]) => {
      if (surfaceRes) setMonitoringSurface(surfaceRes);
      if (boundRes) setBoundaryData(boundRes);
      if (waterRes) setWaterways(waterRes);
      if (Array.isArray(stationsRes)) setStations(stationsRes);
      if (Array.isArray(rainRes)) setRainfallStations(rainRes);
      if (Array.isArray(obsRes)) setObservations(obsRes);
      if (Array.isArray(evidenceRes)) setExternalEvidence(evidenceRes);
      if (Array.isArray(newsRes)) setNewsLocations(newsRes);

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
          } else if (src === 'external_information' || payload.dataset === 'external_information' || src === 'news_media') {
            fetch('/api/public/information?category=news').then(r => r.ok ? r.json() : null).then(data => {
              if (isMounted && Array.isArray(data) && data.length > 0) setNewsLocations(data);
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

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleResetCamera = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [101.55, 14.05], zoom: 9.3, essential: true });
    } else {
      setTargetCoords([14.05, 101.55]);
    }
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
      
      {/* 1. Unified Environmental Intelligence Toolbar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-800">
        
        {/* Left: Title, Scope & Data Freshness */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <DataFreshnessBadge 
            status={connectionStatus} 
            latestObservedTime={latestObservedTimeStr || undefined} 
          />
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>แผนที่เฝ้าระวังสิ่งแวดล้อม</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              จ.ปราจีนบุรี
            </span>
          </h1>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {latestObservedTimeStr ? (
                <>ตรวจวัดล่าสุด: <strong className="text-slate-700 font-semibold">{latestObservedTimeStr}</strong></>
              ) : (
                <>({lastRefreshedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)</>
              )}
            </span>
          </div>
        </div>

        {/* Right: Presets & Live Counters Summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activePreset === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด (All)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('flood')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                activePreset === 'flood'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300"></span>
              <span>น้ำท่วม</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('environmental')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                activePreset === 'environmental'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300"></span>
              <span>สิ่งแวดล้อม</span>
            </button>
          </div>

          {/* Quick Counter Badges */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-100">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              <span>{layerCounts.floodPoints} จุดน้ำ</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>{layerCounts.environmental} จุดสังเกต</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>{layerCounts.monitoringStations} สถานี</span>
            </span>
          </div>
        </div>

      </div>

      {/* 2. Full-bleed Map Canvas Container (Matching Reference Layout) */}
      <div 
        ref={mapContainerRef}
        className="relative w-full h-[calc(100vh-11rem)] min-h-[480px] sm:min-h-[600px] sm:h-[80vh] max-h-[920px] rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950"
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
          newsLocations={newsLocations}
          visibleLayers={visibleLayers}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={handleSelectDistrict}
          onSelectCell={handleSelectCell}
          onSelectMarker={handleSelectMarker}
          surfaceOpacity={surfaceOpacity}
          basemap={basemap}
          targetCoords={targetCoords}
          suppressMapPopup={true}
          hideInternalLegend={false}
          onMouseMoveCoords={(coords) => setCursorCoords(coords)}
          mapInstanceRef={mapInstanceRef}
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

        {/* 5. WebGIS Floating Control Deck (Top-Right) */}
        <div className="absolute top-16 right-2.5 sm:top-4 sm:right-4 z-20">
          <WebGISControlDeck
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetExtent={handleResetCamera}
            showLayerPanel={showLayerPanel}
            onToggleLayerPanel={() => setShowLayerPanel(!showLayerPanel)}
            showLegend={showLegend}
            onToggleLegend={() => setShowLegend(!showLegend)}
            basemap={basemap}
            onToggleBasemap={() => setBasemap(basemap === 'satellite' ? 'streets' : 'satellite')}
            isInspectorActive={isInspectorActive}
            onToggleInspector={() => setIsInspectorActive(!isInspectorActive)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>

        {/* 6. WebGIS Professional Layer Manager (MapStore TOC Style) */}
        {showLayerPanel && (
          <div className="absolute top-16 right-2.5 sm:top-4 sm:right-16 w-[calc(100%-1.25rem)] sm:w-96 max-w-[400px] h-[calc(100%-5rem)] max-h-[680px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-35 animate-in fade-in slide-in-from-right-2 duration-150">
            <WebGISLayerManager
              visibleLayers={visibleLayers}
              onToggleLayer={toggleLayer}
              surfaceOpacity={surfaceOpacity}
              onChangeSurfaceOpacity={setSurfaceOpacity}
              basemap={basemap}
              onChangeBasemap={setBasemap}
              layerCounts={layerCounts}
              activePreset={activePreset}
              onApplyPreset={applyPreset}
              onClose={() => setShowLayerPanel(false)}
            />
          </div>
        )}

        {/* Coordinate Inspector Active Toast Banner */}
        {isInspectorActive && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-25 bg-slate-900/95 text-emerald-300 border border-emerald-500/50 rounded-full px-4 py-1.5 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <Crosshair className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>โหมดตรวจวัดพิกัด: เลื่อนเมาส์บนแผนที่เพื่อตรวจวัดพิกัด WGS84</span>
            <button
              onClick={() => setIsInspectorActive(false)}
              className="ml-1 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800"
              title="ปิดโหมดตรวจวัด"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 7. WebGIS Map Legend (Compact, Collapsible & Closable) */}
        {showLegend ? (
          <div className={`absolute bottom-8 sm:bottom-10 left-2.5 sm:left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/90 p-2 sm:p-2.5 w-[calc(100%-1.25rem)] sm:w-[260px] max-w-[270px] space-y-1.5 text-3xs ${selectedCellData || selectedMarkerData ? 'hidden lg:block' : 'block'}`}>
            {/* Legend Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <div 
                className="flex items-center gap-1.5 cursor-pointer select-none"
                onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              >
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-3xs font-bold text-slate-900 uppercase tracking-wider">คำอธิบายสัญลักษณ์</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsLegendExpanded(!isLegendExpanded)}
                  className="text-slate-500 hover:text-slate-800 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title={isLegendExpanded ? 'ย่อคำอธิบาย' : 'ขยายคำอธิบาย'}
                >
                  {isLegendExpanded ? 'ย่อ' : 'ขยาย'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLegend(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="ปิดคำอธิบายสัญลักษณ์"
                  title="ปิดคำอธิบายสัญลักษณ์"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isLegendExpanded && (
              <div className="space-y-1.5 animate-in fade-in duration-100">
                {/* LEGEND A: ระดับความสำคัญในการเฝ้าระวัง */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    ระดับความสำคัญ (Priority Surface)
                  </span>
                  <div className="grid grid-cols-5 gap-0.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shadow-xs"></span>
                      <span className="text-[10px] text-slate-700 font-medium mt-0.5">สูงมาก</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] shadow-xs"></span>
                      <span className="text-[10px] text-slate-700 font-medium mt-0.5">สูง</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] shadow-xs"></span>
                      <span className="text-[10px] text-slate-700 font-medium mt-0.5">ปานกลาง</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-xs"></span>
                      <span className="text-[10px] text-slate-700 font-medium mt-0.5">ต่ำ</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] shadow-xs"></span>
                      <span className="text-[10px] text-slate-700 font-medium mt-0.5">ไม่มีข้อมูล</span>
                    </div>
                  </div>
                </div>

                {/* LEGEND B: Thematic Layers + Verification Indicator */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    สัญลักษณ์ 5 ชั้นข้อมูลหลัก
                  </span>
                  <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-slate-700 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#0284C7] shrink-0 shadow-xs"></span>
                      <span className="truncate">น้ำท่วม/ขัง</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0 shadow-xs"></span>
                      <span className="truncate">ข้อสังเกตแวดล้อม</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0 shadow-xs"></span>
                      <span className="truncate">สถานีโทรมาตร</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#EA580C] shrink-0 shadow-xs"></span>
                      <span className="truncate">รายงานประชาชน</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#1E3A8A] shrink-0 shadow-xs"></span>
                      <span className="truncate">ข่าวสื่อมวลชน</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#0284C7] shrink-0 shadow-xs"></span>
                      <span className="truncate">แม่น้ำ/ลำคลอง</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-2 pt-0.5 border-t border-slate-100">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0 shadow-xs">
                        ✓
                      </span>
                      <span className="font-semibold text-emerald-900 text-[10px]">
                        วงแหวนเขียว: ตรวจสอบยืนยันแล้ว
                      </span>
                    </div>
                  </div>
                </div>

                {/* Disclaimers */}
                <p className="text-[9px] text-slate-400 leading-tight border-t border-slate-100 pt-1">
                  หมุดม่วงคือข้อสังเกตกายภาพ ไม่ใช่ผลตรวจแล็บ • พื้นที่ไม่มีข้อมูลไม่ได้หมายความว่าปลอดภัย
                </p>
              </div>
            )}
          </div>
        ) : (
          !selectedCellData && !selectedMarkerData && (
            <button
              type="button"
              onClick={() => setShowLegend(true)}
              className="absolute bottom-8 sm:bottom-10 left-2.5 sm:left-4 z-20 bg-white/95 backdrop-blur-md rounded-full px-2.5 py-1 shadow-md border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-700 transition-all select-none cursor-pointer"
              title="เปิดคำอธิบายสัญลักษณ์ (Map Legend)"
            >
              <Info className="w-3 h-3 text-blue-600" />
              <span>คำอธิบายสัญลักษณ์</span>
            </button>
          )
        )}

        {/* WebGIS Status & Coordinate Bar (Bottom edge) */}
        <div className="absolute bottom-2 right-2.5 sm:right-4 z-20 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/80 px-3 py-1.5 text-3xs text-slate-300 shadow-lg flex items-center gap-3 select-none pointer-events-auto">
          {isInspectorActive && (
            <div className="flex items-center gap-1 text-emerald-400 font-semibold border-r border-slate-700 pr-2.5">
              <Crosshair className="w-3 h-3 animate-pulse" />
              <span>ตรวจวัดพิกัด</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 font-mono">
            {cursorCoords ? (
              <span className="text-slate-200">
                {cursorCoords.lat.toFixed(5)}° N, {cursorCoords.lng.toFixed(5)}° E
              </span>
            ) : (
              <span className="text-slate-400 italic">เลื่อนเมาส์เพื่อดูพิกัด</span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 border-l border-slate-700 pl-2.5 text-slate-400">
            <span>{selectedDistrict ? `อ.${selectedDistrict}` : 'จ.ปราจีนบุรี'}</span>
            <span>•</span>
            <span className="text-slate-500">WGS84 (EPSG:4326)</span>
          </div>
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
                ) : selectedMarkerData._layerType === 'news' ? (
                  <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                    <Newspaper className="w-3 h-3 text-blue-800" />
                    ข่าวสารและสื่อมวลชน
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
                ) : selectedMarkerData._layerType === 'news' ? (
                  <span className="inline-flex items-center gap-1 text-3xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    <span>สื่อมวลชนเผยแพร่</span>
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

            {/* News Media Cover Image */}
            {selectedMarkerData._layerType === 'news' && selectedMarkerData.source_image_url && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 shadow-xs">
                <img 
                  src={selectedMarkerData.source_image_url} 
                  alt={selectedMarkerData.title_or_summary || 'ภาพประกอบข่าว'} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

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
                  {selectedMarkerData._layerType === 'environmental' ? 'ลักษณะทางกายภาพที่สังเกตพบ' : selectedMarkerData._layerType === 'news' ? 'เนื้อหาข่าวโดยสรุป' : 'รายละเอียดรายงาน'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedMarkerData.text_excerpt || selectedMarkerData.description}
                </p>
              </div>
            )}

            {/* Explore District for News Location */}
            {selectedMarkerData._layerType === 'news' && selectedMarkerData.district && (
              <button
                type="button"
                onClick={() => {
                  handleSelectDistrict(selectedMarkerData.district);
                  if (monitoringSurface?.features) {
                    const found = monitoringSurface.features.find((f: any) => f.properties?.district === selectedMarkerData.district);
                    if (found) setSelectedCellData(found.properties);
                  }
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-[#0C65E8] border border-blue-200 text-xs font-semibold rounded-xl text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>เปิดแผงวิเคราะห์ อ.{selectedMarkerData.district}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Metadata / Provenance Details */}
            <div className="text-3xs text-slate-500 space-y-1 border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between">
                <span>เวลาตรวจวัด / เผยแพร่</span>
                <span className="font-semibold text-slate-700">
                  {formatThaiTime(selectedMarkerData.observed_at || selectedMarkerData.observation_time || selectedMarkerData.source_timestamp || selectedMarkerData.published_at || selectedMarkerData.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>แหล่งข้อมูล / สำนักข่าว</span>
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
                <span className="text-3xs text-emerald-700 font-medium">
                  {selectedMarkerData._layerType === 'news' ? 'ลิงก์ข่าวต้นทาง' : 'บันทึกหลักฐานในระบบ'}
                </span>
                {selectedMarkerData.source_url.includes('example.com') ? (
                  <span className="text-3xs text-amber-700 italic">Demo Reference</span>
                ) : (
                  <a
                    href={selectedMarkerData.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    <span>{selectedMarkerData._layerType === 'news' ? 'อ่านข่าวฉบับเต็ม' : 'เปิดหน้าเพจต้นทาง'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Cautionary Footer */}
            <div className="text-3xs text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-tight">
              {selectedMarkerData._layerType === 'news'
                ? '📰 ข่าวสารรายงานจากสำนักข่าวสาธารณะ ระบุพิกัดหรืออำเภอเพื่อการติดตามสถานการณ์'
                : selectedMarkerData._layerType === 'environmental'
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
