import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// @ts-ignore
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

if (typeof window !== 'undefined' && (maplibregl as any).setWorkerUrl) {
  try {
    const fullUrl = new URL(workerUrl, window.location.origin).href;
    (maplibregl as any).setWorkerUrl(fullUrl);
  } catch (_) {
    (maplibregl as any).setWorkerUrl(workerUrl);
  }
}

// Helper to safely set GeoJSON data on MapLibre source
const safeSetData = (map: maplibregl.Map | null, sourceId: string, data: any) => {
  if (!map || !data) return;
  try {
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (source && typeof source.setData === 'function') {
      if (data.type === 'FeatureCollection' || data.type === 'Feature') {
        source.setData(data);
      }
    }
  } catch (err) {
    console.warn(`[safeSetData] Error on ${sourceId}:`, err);
  }
};

export interface MapLibreMapViewProps {
  monitoringSurface: any; // GeoJSON FeatureCollection of Continuous Priority Cells
  boundaryData: any;      // Boundary and Outside Mask from /api/public/map/boundary
  waterways: any;         // GeoJSON FeatureCollection of Waterways
  stations: any[];        // Water level telemetry stations
  rainfallStations?: any[]; // Rain gauge stations
  observations: any[];    // Citizen community reports
  externalEvidence?: any[]; // Public external evidence (Section 26)
  visibleLayers: {
    // 4 Distinct Thematic Layers (Section 1)
    flooding?: boolean;
    environmental?: boolean;
    monitoringStations?: boolean;
    citizenReports?: boolean;

    // Overlays & Backwards Compatibility
    monitoringSurface?: boolean;
    waterways?: boolean;
    stations?: boolean;
    rainfallStations?: boolean;
    observations?: boolean;
    externalEvidence?: boolean;
    outsideMask?: boolean;
    adminLabels?: boolean;
    roadOverlay?: boolean;
  };
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  onSelectCell?: (cellProps: any) => void;
  onSelectMarker?: (markerProps: any) => void;
  surfaceOpacity?: number;
  basemap?: 'satellite' | 'streets';
  targetCoords?: [number, number] | null; // [lat, lng]
  suppressMapPopup?: boolean;
}

// Authentic District Centroids in Prachin Buri [lat, lng]
export const DISTRICT_CENTROIDS: Record<string, [number, number]> = {
  'กบินทร์บุรี': [13.995, 101.725],
  'ศรีมหาโพธิ': [13.882, 101.518],
  'เมืองปราจีนบุรี': [14.053, 101.372],
  'บ้านสร้าง': [13.985, 101.215],
  'ประจันตคาม': [14.112, 101.552],
  'นาดี': [14.135, 101.882],
  'ศรีมโหสถ': [13.865, 101.415]
};

// Authentic Subdistricts across 7 districts
export const AUTHENTIC_TAMBONS = [
  // กบินทร์บุรี
  { name: 'ต.กบินทร์', district: 'กบินทร์บุรี', lat: 13.9876, lng: 101.7214 },
  { name: 'ต.เมืองเก่า', district: 'กบินทร์บุรี', lat: 13.9921, lng: 101.7543 },
  { name: 'ต.นนทรี', district: 'กบินทร์บุรี', lat: 13.9245, lng: 101.7612 },
  { name: 'ต.นาแขม', district: 'กบินทร์บุรี', lat: 13.8712, lng: 101.8021 },
  { name: 'ต.บ่อทอง', district: 'กบินทร์บุรี', lat: 13.8123, lng: 101.7345 },
  { name: 'ต.ย่านรี', district: 'กบินทร์บุรี', lat: 13.9312, lng: 101.7123 },
  { name: 'ต.ลาดตะเคียน', district: 'กบินทร์บุรี', lat: 13.8521, lng: 101.6945 },
  { name: 'ต.วังดาล', district: 'กบินทร์บุรี', lat: 13.9612, lng: 101.6621 },
  { name: 'ต.วังตะเคียน', district: 'กบินทร์บุรี', lat: 13.7912, lng: 101.8214 },
  { name: 'ต.หนองกี่', district: 'กบินทร์บุรี', lat: 14.0214, lng: 101.8123 },
  { name: 'ต.หาดนางแก้ว', district: 'กบินทร์บุรี', lat: 13.9512, lng: 101.7245 },
  { name: 'ต.เขาไม้แก้ว', district: 'กบินทร์บุรี', lat: 13.7612, lng: 101.7821 },

  // ศรีมหาโพธิ
  { name: 'ต.ศรีมหาโพธิ', district: 'ศรีมหาโพธิ', lat: 13.8762, lng: 101.5403 },
  { name: 'ต.ท่าตูม', district: 'ศรีมหาโพธิ', lat: 13.8967, lng: 101.5642 },
  { name: 'ต.กรอกสมบูรณ์', district: 'ศรีมหาโพธิ', lat: 13.8210, lng: 101.6214 },
  { name: 'ต.ดงกระทงยาม', district: 'ศรีมหาโพธิ', lat: 13.9412, lng: 101.4921 },
  { name: 'ต.บางกุ้ง', district: 'ศรีมหาโพธิ', lat: 13.9212, lng: 101.5123 },
  { name: 'ต.หนองโพรง', district: 'ศรีมหาโพธิ', lat: 13.8321, lng: 101.5412 },
  { name: 'ต.หัวหว้า', district: 'ศรีมหาโพธิ', lat: 13.7845, lng: 101.5123 },
  { name: 'ต.สัมพันธ์', district: 'ศรีมหาโพธิ', lat: 13.9100, lng: 101.5300 },

  // เมืองปราจีนบุรี
  { name: 'ต.หน้าเมือง', district: 'เมืองปราจีนบุรี', lat: 14.0530, lng: 101.3720 },
  { name: 'ต.รอบเมือง', district: 'เมืองปราจีนบุรี', lat: 14.0610, lng: 101.3850 },
  { name: 'ต.ดงขี้เหล็ก', district: 'เมืองปราจีนบุรี', lat: 14.1345, lng: 101.4512 },
  { name: 'ต.บ้านพระ', district: 'เมืองปราจีนบุรี', lat: 14.1212, lng: 101.4123 },
  { name: 'ต.โนนห้อม', district: 'เมืองปราจีนบุรี', lat: 14.0812, lng: 101.4312 },
  { name: 'ต.ไม้เค็ด', district: 'เมืองปราจีนบุรี', lat: 14.0921, lng: 101.3612 },
  { name: 'ต.บางเดชะ', district: 'เมืองปราจีนบุรี', lat: 14.0210, lng: 101.3200 },
  { name: 'ต.ท่างาม', district: 'เมืองปราจีนบุรี', lat: 14.0450, lng: 101.4010 },

  // บ้านสร้าง
  { name: 'ต.บ้านสร้าง', district: 'บ้านสร้าง', lat: 13.9850, lng: 101.2150 },
  { name: 'ต.บางพลวง', district: 'บ้านสร้าง', lat: 13.9621, lng: 101.2412 },
  { name: 'ต.บางปลาร้า', district: 'บ้านสร้าง', lat: 13.9310, lng: 101.1920 },
  { name: 'ต.บางแตน', district: 'บ้านสร้าง', lat: 13.9010, lng: 101.1650 },
  { name: 'ต.บางยาง', district: 'บ้านสร้าง', lat: 13.9980, lng: 101.1710 },

  // ประจันตคาม
  { name: 'ต.ประจันตคาม', district: 'ประจันตคาม', lat: 14.1120, lng: 101.5520 },
  { name: 'ต.เกาะลอย', district: 'ประจันตคาม', lat: 14.0720, lng: 101.5210 },
  { name: 'ต.คำโตนด', district: 'ประจันตคาม', lat: 14.1520, lng: 101.5830 },
  { name: 'ต.ดงบัง', district: 'ประจันตคาม', lat: 14.1350, lng: 101.6210 },
  { name: 'ต.บุฝ้าย', district: 'ประจันตคาม', lat: 14.1820, lng: 101.5410 },

  // นาดี
  { name: 'ต.นาดี', district: 'นาดี', lat: 14.2123, lng: 101.8745 },
  { name: 'ต.ทุ่งโพธิ์', district: 'นาดี', lat: 14.1812, lng: 101.8921 },
  { name: 'ต.สะพานหิน', district: 'นาดี', lat: 14.1610, lng: 101.8210 },
  { name: 'ต.บุพราหมณ์', district: 'นาดี', lat: 14.2820, lng: 101.9120 },

  // ศรีมโหสถ
  { name: 'ต.โคกปีบ', district: 'ศรีมโหสถ', lat: 13.8650, lng: 101.4150 },
  { name: 'ต.โคกไทย', district: 'ศรีมโหสถ', lat: 13.8612, lng: 101.4312 },
  { name: 'ต.คู้ลำพัน', district: 'ศรีมโหสถ', lat: 13.8210, lng: 101.3920 }
];

// Standardized Unified SVG Icon System (Sections 19 & 20)
const MARKER_ICONS = {
  // Water level: water droplet
  waterDroplet: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="white">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>`,
  // Rainfall: rain / cloud
  rainCloud: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
      <path d="M16 14v6"/>
      <path d="M8 14v6"/>
      <path d="M12 16v6"/>
    </svg>`,
  // Citizen report: community / users
  communityReport: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
  // Environmental / water quality: lab flask / beaker
  labFlask: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
      <path d="M8.5 2h7"/>
      <path d="M7 16h10"/>
    </svg>`,
  // Alert / escalated event ONLY: warning triangle
  alertTriangle: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="white">
      <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
    </svg>`,
  // External evidence / public media: newspaper/link
  externalEvidence: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M18 14h-8"/>
      <path d="M15 18h-5"/>
      <path d="M10 6h8v4h-8V6Z"/>
    </svg>`,
  // Flooding / waterlogging: water waves
  floodWaves: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
    </svg>`
};

// Helper to format ISO timestamps to friendly Thai display
export const formatThaiTime = (ts?: string | null) => {
  if (!ts) return 'ไม่ระบุเวลา';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  } catch (_) {
    return ts;
  }
};

// Helper to clean and shorten redundant agency names
export const cleanAgencyName = (raw?: string | null) => {
  if (!raw) return 'ThaiWater (สสน.)';
  if (raw.includes('Hydroinformatics') || raw.includes('HII') || raw.includes('สสน.')) {
    return 'ThaiWater (สสน.)';
  }
  if (raw.includes('Irrigation') || raw.includes('RID') || raw.includes('ชลประทาน')) {
    return 'กรมชลประทาน';
  }
  if (raw.includes('Meteorological') || raw.includes('TMD') || raw.includes('อุตุนิยมวิทยา')) {
    return 'กรมอุตุนิยมวิทยา';
  }
  return raw.replace(/^ThaiWater\s*\/\s*/i, '').trim() || 'ThaiWater';
};

// Helper to format source-aware freshness badge and age into compact, scannable pills
const getFreshnessBadgeHtml = (status?: string, ageSeconds?: number) => {
  const s = (status || 'RECENT').toUpperCase();
  let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let dotColor = 'bg-emerald-500';
  let label = 'สดใหม่';

  if (s === 'LIVE') {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
    label = 'สดใหม่';
  } else if (s === 'RECENT') {
    colorClass = 'bg-sky-50 text-sky-700 border-sky-200';
    dotColor = 'bg-sky-500';
    label = 'ล่าสุด';
  } else if (s === 'DELAYED') {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
    label = 'ล่าช้า';
  } else if (s === 'STALE') {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
    label = 'เกินรอบ';
  } else if (s === 'OFFLINE') {
    colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
    label = 'ออฟไลน์';
  } else {
    colorClass = 'bg-slate-50 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
    label = 'ทั่วไป';
  }

  let ageStr = '';
  if (ageSeconds != null && !isNaN(ageSeconds)) {
    if (ageSeconds < 60) ageStr = `${Math.round(ageSeconds)}วิ`;
    else if (ageSeconds < 3600) ageStr = `${Math.round(ageSeconds / 60)}น.`;
    else ageStr = `${Math.round(ageSeconds / 3600)}ชม.`;
  }

  return `
    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-3xs font-medium border ${colorClass} shrink-0 whitespace-nowrap">
      <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
      <span>${label}${ageStr ? ` (${ageStr})` : ''}</span>
    </span>
  `;
};

// Helper to classify an item as an environmental observation (foam, unusual water color, sediment, odor, oily sheen)
export const isEnvironmentalItem = (item: any): boolean => {
  if (!item) return false;
  const et = (item.event_type || '').toUpperCase();
  const text = `${item.title_or_summary || ''} ${item.description || ''} ${item.text_excerpt || ''} ${item.category || ''} ${item.category_th || ''}`;
  if (et === 'FOAM' || et === 'ABNORMAL_WATER_COLOR' || et === 'WATER_APPEARANCE') return true;
  if (item.contamination_signs && Array.isArray(item.contamination_signs)) {
    if (item.contamination_signs.some((s: string) => 
      ['unusual_water_color', 'odor', 'chemical_odor', 'unusual_odor', 'น้ำเปลี่ยนสี', 'ฟอง', 'คราบ', 'คราบน้ำมัน', 'ตะกอน'].includes(s)
    )) return true;
  }
  return /(คราบ|สีรุ้ง|ฟอง|กลิ่น|เปลี่ยนสี|สารเคมี|กากอุตสาหกรรม|น้ำมัน|ตะกอน)/.test(text);
};

// Helper to verify if an item has genuine official / lab verification records
export const isGenuineVerified = (item: any): boolean => {
  if (!item) return false;
  const status = (item.verification_status || '').toUpperCase();
  return status === 'VERIFIED_OBSERVATION' || 
         status === 'OFFICIAL_CONFIRMED' || 
         status === 'OFFICIAL_VERIFIED' || 
         status === 'CORROBORATED' || 
         status === 'LAB_CONFIRMED' || 
         status === 'VERIFIED';
};

const EMPTY_GEOJSON: any = { type: 'FeatureCollection', features: [] };

export const MapLibreMapView: React.FC<MapLibreMapViewProps> = ({
  monitoringSurface,
  boundaryData,
  waterways,
  stations,
  rainfallStations = [],
  observations,
  externalEvidence = [],
  visibleLayers,
  selectedDistrict,
  onSelectDistrict,
  onSelectCell,
  onSelectMarker,
  surfaceOpacity = 0.50,
  basemap = 'satellite',
  targetCoords,
  suppressMapPopup = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Administrative Labels GeoJSON
  const adminLabelsGeoJSON = useRef({
    type: 'FeatureCollection' as const,
    features: [
      ...Object.entries(DISTRICT_CENTROIDS).map(([district, [lat, lng]]) => ({
        type: 'Feature' as const,
        properties: { name: `อ.${district}`, type: 'district', district },
        geometry: { type: 'Point' as const, coordinates: [lng, lat] }
      })),
      ...AUTHENTIC_TAMBONS.map((t) => ({
        type: 'Feature' as const,
        properties: { name: t.name, type: 'tambon', district: t.district },
        geometry: { type: 'Point' as const, coordinates: [t.lng, t.lat] }
      }))
    ]
  }).current;

  // Initialize MapLibre GL Map with Full Stacking Style Definition
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Check WebGL availability safely
    try {
      const canvas = document.createElement('canvas');
      const hasWebGL = !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
      if (!hasWebGL) {
        setWebglSupported(false);
        return;
      }
    } catch (_) {
      setWebglSupported(false);
      return;
    }

    try {
      const initialStyle: maplibregl.StyleSpecification = {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '© Esri, Maxar, Earthstar Geographics'
        },
        'carto-streets': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap, © CARTO'
        },
        'roads-overlay-source': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '© Esri'
        },
        'outside-mask-source': {
          type: 'geojson',
          data: boundaryData?.outside_mask || EMPTY_GEOJSON
        },
        'boundary-source': {
          type: 'geojson',
          data: boundaryData?.boundary || EMPTY_GEOJSON
        },
        'monitoring-surface-source': {
          type: 'geojson',
          data: monitoringSurface || EMPTY_GEOJSON
        },
        'waterways-source': {
          type: 'geojson',
          data: waterways || EMPTY_GEOJSON
        },
        'admin-labels-source': {
          type: 'geojson',
          data: adminLabelsGeoJSON
        }
      },
      layers: [
        // 1. Basemap Satellite (Default)
        {
          id: 'basemap-satellite',
          type: 'raster',
          source: 'esri-satellite',
          paint: { 'raster-opacity': basemap === 'satellite' ? 1.0 : 0.0 }
        },
        // 2. Basemap Streets
        {
          id: 'basemap-streets',
          type: 'raster',
          source: 'carto-streets',
          paint: { 'raster-opacity': basemap === 'streets' ? 1.0 : 0.0 }
        },
        // 3. Outside Analysis Scope Mask (Gray Semi-transparent Overlay)
        {
          id: 'outside-mask-fill',
          type: 'fill',
          source: 'outside-mask-source',
          layout: { visibility: visibleLayers.outsideMask ? 'visible' : 'none' },
          paint: {
            'fill-color': '#0f172a',
            'fill-opacity': 0.58
          }
        },
        // 4. Prachin Buri Boundary Line
        {
          id: 'outside-mask-outline',
          type: 'line',
          source: 'boundary-source',
          paint: {
            'line-color': '#38bdf8',
            'line-width': 2.0,
            'line-opacity': 0.95
          }
        },
        // 5. Monitoring Priority Surface (Color Fills: Red, Orange, Yellow, Green, Gray)
        {
          id: 'monitoring-surface-fill',
          type: 'fill',
          source: 'monitoring-surface-source',
          layout: { visibility: visibleLayers.monitoringSurface ? 'visible' : 'none' },
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#64748B'],
            'fill-opacity': surfaceOpacity
          }
        },
        // 6. Cell Boundary Outlines (Subtle White Separation)
        {
          id: 'monitoring-surface-lines',
          type: 'line',
          source: 'monitoring-surface-source',
          layout: { visibility: visibleLayers.monitoringSurface ? 'visible' : 'none' },
          paint: {
            'line-color': 'rgba(255, 255, 255, 0.70)',
            'line-width': 1.8
          }
        },
        // 7. Selected Cell Highlight Outline
        {
          id: 'monitoring-surface-highlight',
          type: 'line',
          source: 'monitoring-surface-source',
          filter: ['==', 'district', ''],
          paint: {
            'line-color': '#ffffff',
            'line-width': 3.5,
            'line-opacity': 1.0
          }
        },
        // 8. Roads Overlay from Satellite
        {
          id: 'roads-overlay',
          type: 'raster',
          source: 'roads-overlay-source',
          layout: { visibility: visibleLayers.roadOverlay ? 'visible' : 'none' },
          paint: { 'raster-opacity': 0.38 }
        },
        // 9. Waterways Glow Line
        {
          id: 'waterways-glow',
          type: 'line',
          source: 'waterways-source',
          layout: { 
            visibility: visibleLayers.waterways ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#38bdf8',
            'line-width': 7.5,
            'line-opacity': 0.45,
            'line-blur': 2.5
          }
        },
        // 10. Waterways Centerline
        {
          id: 'waterways-core',
          type: 'line',
          source: 'waterways-source',
          layout: { 
            visibility: visibleLayers.waterways ? 'visible' : 'none',
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#0284c7'],
            'line-width': ['coalesce', ['get', 'line_width'], 3.2],
            'line-opacity': 1.0
          }
        },
        // 11. Waterway Labels along Line
        {
          id: 'waterways-label',
          type: 'symbol',
          source: 'waterways-source',
          layout: {
            visibility: visibleLayers.waterways ? 'visible' : 'none',
            'symbol-placement': 'line',
            'text-field': ['get', 'name'],
            'text-size': 12.5,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-max-angle': 30,
            'text-offset': [0, -1]
          },
          paint: {
            'text-color': '#e0f2fe',
            'text-halo-color': '#0c4a6e',
            'text-halo-width': 2.4
          }
        },
        // 12. District Labels (Collision Detection)
        {
          id: 'admin-district-labels',
          type: 'symbol',
          source: 'admin-labels-source',
          filter: ['==', 'type', 'district'],
          minzoom: 8.0,
          maxzoom: 12.5,
          layout: {
            visibility: visibleLayers.adminLabels ? 'visible' : 'none',
            'text-field': ['get', 'name'],
            'text-size': 15.0,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': false,
            'text-ignore-placement': false
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#0f172a',
            'text-halo-width': 3.0
          }
        },
        // 13. Subdistrict Labels (Collision Detection)
        {
          id: 'admin-tambon-labels',
          type: 'symbol',
          source: 'admin-labels-source',
          filter: ['==', 'type', 'tambon'],
          minzoom: 12.0,
          maxzoom: 18,
          layout: {
            visibility: visibleLayers.adminLabels ? 'visible' : 'none',
            'text-field': ['get', 'name'],
            'text-size': 13.0,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-allow-overlap': false,
            'text-ignore-placement': false
          },
          paint: {
            'text-color': '#f8fafc',
            'text-halo-color': '#1e293b',
            'text-halo-width': 2.5
          }
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [101.55, 14.05],
      zoom: 9.3,
      minZoom: 7.5,
      maxZoom: 18,
      localIdeographFontFamily: 'Prompt, Sarabun, sans-serif',
      attributionControl: false
    });

    mapRef.current = map;

    map.on('error', (e) => {
      console.warn('[MapLibre error/warning]:', e);
    });

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();
      map.fitBounds([[101.08, 13.73], [102.08, 14.45]], {
        padding: { top: 60, bottom: 40, left: 40, right: 40 },
        duration: 0
      });

      // Synchronize latest telemetry & GIS datasets immediately upon load
      safeSetData(map, 'outside-mask-source', boundaryData?.outside_mask);
      safeSetData(map, 'boundary-source', boundaryData?.boundary);
      safeSetData(map, 'monitoring-surface-source', monitoringSurface);
      safeSetData(map, 'waterways-source', waterways);

      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize();
      }, 100);
      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize();
      }, 500);
    });

    // Interaction: Click Monitoring Surface
    map.on('click', 'monitoring-surface-fill', (e) => {
      if (!e.features || !e.features[0]) return;
      const feat = e.features[0];
      const props = feat.properties as any;
      if (onSelectCell) onSelectCell(props);
      if (props.district) onSelectDistrict(props.district);

      map.setFilter('monitoring-surface-highlight', ['==', 'district', props.district]);

      if (popupRef.current) popupRef.current.remove();
      if (suppressMapPopup) return;

      let factorsHtml = '';
      try {
        const factors = typeof props.contributing_factors === 'string' 
          ? JSON.parse(props.contributing_factors) 
          : props.contributing_factors;
        if (Array.isArray(factors)) {
          factorsHtml = factors.slice(0, 3).map((f: string) => `
            <li class="text-xs text-slate-700 leading-snug flex items-start gap-1.5">
              <span class="text-slate-400 mt-0.5 shrink-0">•</span>
              <span>${f}</span>
            </li>
          `).join('');
        }
      } catch (_) {}

      const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '320px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-4 font-sans space-y-2.5 text-slate-800">
            <!-- Header -->
            <div class="border-b border-slate-100 pb-2">
              <div class="flex items-start justify-between gap-2">
                <h4 class="text-sm font-bold text-[#063B70] leading-snug">
                  ${props.cell_name || props.subdistrict}
                </h4>
                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs shrink-0" style="background-color: ${props.color || '#0284c7'}">
                  ${props.priority_level}
                </span>
              </div>
              <span class="text-xs text-slate-500 block mt-0.5">อ.${props.district} จ.ปราจีนบุรี</span>
            </div>

            <!-- Priority Status Box -->
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span class="text-slate-600 font-medium">ลำดับการเฝ้าระวัง:</span>
              <span class="font-bold text-slate-900">${props.priority_label_th || props.priority_level}</span>
            </div>

            <!-- Priority Score -->
            <div class="flex items-center justify-between text-xs text-slate-600">
              <span>คะแนนความสำคัญ:</span>
              <span class="font-bold text-slate-900">${props.priority_score ?? '-'} <span class="font-normal text-slate-500">/ 1.00</span></span>
            </div>

            <!-- Contributing Factors -->
            ${factorsHtml ? `
              <div class="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100/80 space-y-1.5 text-xs">
                <span class="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">ปัจจัยและการประเมินเชิงพื้นที่:</span>
                <ul class="space-y-1 pl-0.5">${factorsHtml}</ul>
              </div>
            ` : ''}

            <!-- Citizen Reports Count -->
            <div class="flex items-center justify-between text-xs text-slate-600">
              <span>รายงานประชาชนในพื้นที่:</span>
              <strong class="text-slate-900 font-semibold">${props.citizen_report_count ?? 0} รายการ</strong>
            </div>

            <!-- Freshness & District Footer -->
            <div class="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <span>ความสดใหม่: <strong class="text-slate-700">${props.freshness || 'ข้อมูลรายวัน (24 ชม.)'}</strong></span>
              <span class="text-[#0C65E8] font-bold">อ.${props.district}</span>
            </div>

            <!-- Primary Action Link -->
            <a href="/map?district=${encodeURIComponent(props.district)}" class="mt-2.5 block w-full py-2 bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-semibold rounded-xl text-center shadow-xs transition-colors flex items-center justify-center gap-1">
              <span>ดูรายละเอียดในแผนที่ใหญ่</span>
              <span>→</span>
            </a>
          </div>
        `)
        .addTo(map);

      popupRef.current = popup;
    });

    map.on('mouseenter', 'monitoring-surface-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'monitoring-surface-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    // Interaction: Click Outside Analysis Scope Mask (Section 13 & 85)
    map.on('click', 'outside-mask-fill', (e) => {
      if (popupRef.current) popupRef.current.remove();

      const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '280px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-3 font-sans space-y-1.5">
            <div class="flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
              <span class="text-sm font-bold text-slate-900">นอกพื้นที่วิเคราะห์</span>
            </div>
            <p class="text-xs text-slate-700 leading-relaxed font-medium">
              FloodTrace ให้บริการวิเคราะห์เชิงพื้นที่สำหรับจังหวัดปราจีนบุรี
            </p>
            <p class="text-2xs text-slate-400 pt-1 border-t border-slate-100 leading-normal">
              พื้นที่สีเทาหมายถึงอยู่นอกขอบเขตการคำนวณของระบบ ไม่ได้หมายความว่าปลอดภัยหรือไม่มีน้ำท่วม
            </p>
          </div>
        `)
        .addTo(map);

      popupRef.current = popup;
    });

    map.on('mouseenter', 'outside-mask-fill', () => {
      map.getCanvas().style.cursor = 'help';
    });
    map.on('mouseleave', 'outside-mask-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (_) {}
      }
      mapRef.current = null;
    };
    } catch (err: any) {
      console.warn('[MapLibre initialization warning]:', err);
      setInitError(err?.message || 'WebGL2 is required to display this map');
      setWebglSupported(false);
    }
  }, []);

  // Real-time updates: Update GeoJSON data in existing sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    safeSetData(map, 'outside-mask-source', boundaryData?.outside_mask);
    safeSetData(map, 'boundary-source', boundaryData?.boundary);
    safeSetData(map, 'monitoring-surface-source', monitoringSurface);
    safeSetData(map, 'waterways-source', waterways);
  }, [boundaryData, monitoringSurface, waterways, mapLoaded]);

  // Update Surface Opacity and Layer Visibilities
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Basemap toggle
    if (map.getLayer('basemap-satellite')) {
      map.setPaintProperty('basemap-satellite', 'raster-opacity', basemap === 'satellite' ? 1.0 : 0.0);
    }
    if (map.getLayer('basemap-streets')) {
      map.setPaintProperty('basemap-streets', 'raster-opacity', basemap === 'streets' ? 1.0 : 0.0);
    }

    // Surface Opacity & Visibilities
    const showFlooding = visibleLayers.flooding !== false;
    const showMonitoringSurface = showFlooding && (visibleLayers.monitoringSurface !== false);
    const showWaterways = showFlooding && (visibleLayers.waterways !== false);

    if (map.getLayer('monitoring-surface-fill')) {
      map.setLayoutProperty('monitoring-surface-fill', 'visibility', showMonitoringSurface ? 'visible' : 'none');
      map.setPaintProperty('monitoring-surface-fill', 'fill-opacity', surfaceOpacity);
    }
    if (map.getLayer('monitoring-surface-lines')) {
      map.setLayoutProperty('monitoring-surface-lines', 'visibility', showMonitoringSurface ? 'visible' : 'none');
    }
    if (map.getLayer('outside-mask-fill')) {
      map.setLayoutProperty('outside-mask-fill', 'visibility', visibleLayers.outsideMask !== false ? 'visible' : 'none');
    }
    if (map.getLayer('waterways-glow')) {
      map.setLayoutProperty('waterways-glow', 'visibility', showWaterways ? 'visible' : 'none');
      map.setLayoutProperty('waterways-core', 'visibility', showWaterways ? 'visible' : 'none');
      map.setLayoutProperty('waterways-label', 'visibility', showWaterways ? 'visible' : 'none');
    }
    if (map.getLayer('admin-district-labels')) {
      map.setLayoutProperty('admin-district-labels', 'visibility', visibleLayers.adminLabels !== false ? 'visible' : 'none');
      map.setLayoutProperty('admin-tambon-labels', 'visibility', visibleLayers.adminLabels !== false ? 'visible' : 'none');
    }
    if (map.getLayer('roads-overlay')) {
      map.setLayoutProperty('roads-overlay', 'visibility', visibleLayers.roadOverlay ? 'visible' : 'none');
    }
  }, [basemap, surfaceOpacity, visibleLayers, mapLoaded]);

  // Unified Semantic Markers (Sections 19, 20, 21, 22, 28)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const createCircularMarkerEl = (
      bgColor: string,
      svgIcon: string,
      countBadge?: number,
      title?: string,
      isVerified?: boolean
    ) => {
      // Outer wrapper element that MapLibre positions using absolute translate
      const wrapper = document.createElement('div');
      wrapper.className = 'cursor-pointer select-none';
      wrapper.style.pointerEvents = 'auto';

      // Inner circular indicator with icon and hover scaling
      const inner = document.createElement('div');
      inner.className = 'relative flex items-center justify-center transition-transform duration-200 hover:scale-125';
      inner.style.width = '32px';
      inner.style.height = '32px';
      inner.style.borderRadius = '50%';
      inner.style.backgroundColor = bgColor;

      // Official / Lab-confirmed: Green halo status indicator
      if (isVerified) {
        inner.style.border = '2.5px solid #16A34A';
        inner.style.boxShadow = '0 0 0 2px rgba(22, 163, 74, 0.45), 0 3px 10px rgba(0, 0, 0, 0.4)';
      } else {
        inner.style.border = '2px solid #ffffff';
        inner.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2)';
      }

      inner.innerHTML = svgIcon;
      if (title) wrapper.title = title;

      if (countBadge && countBadge > 1) {
        const badge = document.createElement('span');
        badge.innerText = `${countBadge}`;
        badge.style.position = 'absolute';
        badge.style.top = '-4px';
        badge.style.right = '-4px';
        badge.style.backgroundColor = '#0f172a';
        badge.style.color = '#ffffff';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = '700';
        badge.style.padding = '0.5px 4.5px';
        badge.style.borderRadius = '999px';
        badge.style.border = '1.5px solid #ffffff';
        badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        inner.appendChild(badge);
      }

      // If genuine official / lab confirmed, add green checkmark badge
      if (isVerified) {
        const verifBadge = document.createElement('span');
        verifBadge.innerText = '✓';
        verifBadge.style.position = 'absolute';
        verifBadge.style.bottom = '-4px';
        verifBadge.style.right = '-4px';
        verifBadge.style.backgroundColor = '#16A34A';
        verifBadge.style.color = '#ffffff';
        verifBadge.style.fontSize = '9px';
        verifBadge.style.fontWeight = '800';
        verifBadge.style.width = '14px';
        verifBadge.style.height = '14px';
        verifBadge.style.borderRadius = '50%';
        verifBadge.style.display = 'flex';
        verifBadge.style.alignItems = 'center';
        verifBadge.style.justifyContent = 'center';
        verifBadge.style.border = '1.5px solid #ffffff';
        verifBadge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        verifBadge.title = 'มีบันทึกการตรวจสอบยืนยัน';
        inner.appendChild(verifBadge);
      }

      wrapper.appendChild(inner);
      return wrapper;
    };

    const showFloodingLayer = visibleLayers.flooding !== false;
    const showEnvironmentalLayer = visibleLayers.environmental !== false;
    const showStationsLayer = visibleLayers.monitoringStations !== false;
    const showCitizenReportsLayer = visibleLayers.citizenReports !== false;

    // 1. MONITORING STATIONS LAYER (Yellow/Amber: #D97706 water level, #F59E0B rainfall)
    if (showStationsLayer) {
      // 1.1 Water Level Gauge Stations (AMBER: #D97706, Icon: water droplet)
      if (visibleLayers.stations !== false && stations && stations.length > 0) {
        stations.forEach(st => {
          if (!st.latitude || !st.longitude) return;

          const bgColor = '#D97706';
          const icon = MARKER_ICONS.waterDroplet;

          const el = createCircularMarkerEl(bgColor, icon, undefined, `สถานีระดับน้ำ: ${st.name_th || st.station_id}`);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([st.longitude, st.latitude])
            .addTo(map);

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onSelectMarker) onSelectMarker({ ...st, _layerType: 'monitoringStations', _subType: 'waterLevel' });

            new maplibregl.Popup({ offset: 16, maxWidth: '320px', closeButton: true })
              .setLngLat([st.longitude, st.latitude])
              .setHTML(`
                <div class="space-y-2 p-1 min-w-[240px] max-w-[280px] font-sans text-slate-800">
                  <div class="flex items-center justify-between gap-1.5 border-b border-amber-100 pb-1.5 pr-4">
                    <span class="text-3xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 whitespace-nowrap flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      สถานีวัดระดับน้ำ
                    </span>
                    ${getFreshnessBadgeHtml(st.freshness_status, st.observation_age_seconds)}
                  </div>
                  <div>
                    <div class="text-sm font-bold text-slate-900 leading-tight">${st.name_th || st.station_id}</div>
                    <div class="text-3xs text-slate-400 mt-0.5">${st.district ? `อ.${st.district}` : 'จ.ปราจีนบุรี'}</div>
                  </div>
                  <div class="flex items-baseline justify-between px-2.5 py-1.5 rounded-xl bg-amber-50/70 border border-amber-100">
                    <span class="text-2xs text-amber-900 font-medium">ระดับน้ำปัจจุบัน</span>
                    <span class="text-base font-bold text-amber-950">${st.water_level_msl != null ? st.water_level_msl.toFixed(2) : '-'} <span class="text-2xs font-semibold text-amber-700">ม.รทก.</span></span>
                  </div>
                  <div class="text-3xs text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                    ${st.warning_level_msl ? `
                    <div class="flex items-center justify-between">
                      <span>ระดับเฝ้าระวัง</span>
                      <span class="font-medium text-amber-700">${st.warning_level_msl.toFixed(2)} ม.รทก.</span>
                    </div>` : ''}
                    <div class="flex items-center justify-between">
                      <span>ตรวจวัดจริง</span>
                      <span class="font-medium text-slate-800">${formatThaiTime(st.observed_at || st.source_timestamp || st.last_updated)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>ดึงข้อมูล</span>
                      <span class="font-medium text-slate-600">${formatThaiTime(st.ingested_at || st.retrieved_at)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>แหล่งข้อมูล</span>
                      <span class="font-medium text-slate-700 truncate max-w-[140px]">${cleanAgencyName(st.provenance?.source_agency || 'กรมชลประทาน')}</span>
                    </div>
                  </div>
                </div>
              `)
              .addTo(map);
          });

          markersRef.current.push(marker);
        });
      }

      // 1.2 Rainfall Monitoring Stations (AMBER-YELLOW: #F59E0B, Icon: rain / cloud)
      if (visibleLayers.rainfallStations !== false && rainfallStations && rainfallStations.length > 0) {
        const sampledRain = rainfallStations.filter((_, i) => i % 5 === 0);
        sampledRain.forEach(rs => {
          if (!rs.latitude || !rs.longitude) return;

          const bgColor = '#F59E0B';
          const icon = MARKER_ICONS.rainCloud;
          const rain24 = rs.rain_24h_mm || 0;

          const el = createCircularMarkerEl(bgColor, icon, undefined, `สถานีวัดน้ำฝน: ${rs.name_th || rs.station_id}`);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([rs.longitude, rs.latitude])
            .addTo(map);

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onSelectMarker) onSelectMarker({ ...rs, _layerType: 'monitoringStations', _subType: 'rainfall' });

            new maplibregl.Popup({ offset: 16, maxWidth: '320px', closeButton: true })
              .setLngLat([rs.longitude, rs.latitude])
              .setHTML(`
                <div class="space-y-2 p-1 min-w-[240px] max-w-[280px] font-sans text-slate-800">
                  <div class="flex items-center justify-between gap-1.5 border-b border-amber-100 pb-1.5 pr-4">
                    <span class="text-3xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 whitespace-nowrap flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      สถานีวัดน้ำฝน
                    </span>
                    ${getFreshnessBadgeHtml(rs.freshness_status, rs.observation_age_seconds)}
                  </div>
                  <div>
                    <div class="text-sm font-bold text-slate-900 leading-tight">${rs.name_th || rs.station_id}</div>
                    <div class="text-3xs text-slate-400 mt-0.5">${rs.district ? `อ.${rs.district}` : 'จ.ปราจีนบุรี'}${rs.subdistrict ? ` ต.${rs.subdistrict}` : ''}</div>
                  </div>
                  <div class="flex items-baseline justify-between px-2.5 py-1.5 rounded-xl bg-amber-50/70 border border-amber-100">
                    <span class="text-2xs text-amber-900 font-medium">ฝนสะสม 24 ชม.</span>
                    <span class="text-base font-bold text-amber-950">${rain24.toFixed(1)} <span class="text-2xs font-semibold text-amber-700">มม.</span></span>
                  </div>
                  <div class="text-3xs text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                    ${rs.rain_1h_mm != null ? `
                    <div class="flex items-center justify-between">
                      <span>ฝน 1 ชม. ล่าสุด</span>
                      <span class="font-medium text-slate-700">${rs.rain_1h_mm.toFixed(1)} มม.</span>
                    </div>` : ''}
                    <div class="flex items-center justify-between">
                      <span>ตรวจวัดจริง</span>
                      <span class="font-medium text-slate-800">${formatThaiTime(rs.observed_at || rs.observation_time || rs.last_updated)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>ดึงข้อมูล</span>
                      <span class="font-medium text-slate-600">${formatThaiTime(rs.ingested_at || rs.retrieved_at)}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>แหล่งข้อมูล</span>
                      <span class="font-medium text-slate-700 truncate max-w-[140px]">${cleanAgencyName(rs.provenance?.source_agency || rs.agency)}</span>
                    </div>
                  </div>
                </div>
              `)
              .addTo(map);
          });

          markersRef.current.push(marker);
        });
      }
    }

    // 2. CITIZEN REPORTS LAYER (Orange: #EA580C, Icon: community/report)
    if (showCitizenReportsLayer && visibleLayers.observations !== false && observations && observations.length > 0) {
      const clusterMap: Record<string, { lat: number; lng: number; count: number; verified: boolean; lastObs: any }> = {};

      observations.forEach(obs => {
        const lat = obs.generalized_latitude ?? obs.public_latitude ?? obs.latitude;
        const lng = obs.generalized_longitude ?? obs.public_longitude ?? obs.longitude;
        if (!lat || !lng) return;

        const key = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
        const isVerif = isGenuineVerified(obs);

        if (!clusterMap[key]) {
          clusterMap[key] = { lat, lng, count: 1, verified: isVerif, lastObs: obs };
        } else {
          clusterMap[key].count += 1;
          if (isVerif) clusterMap[key].verified = true;
        }
      });

      Object.values(clusterMap).forEach(cluster => {
        const bgColor = '#EA580C';
        const icon = MARKER_ICONS.communityReport;

        const el = createCircularMarkerEl(
          bgColor, 
          icon, 
          cluster.count > 1 ? cluster.count : undefined,
          `รายงานประชาชน: ${cluster.lastObs.category || 'ข้อสังเกต'}`,
          cluster.verified
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([cluster.lng, cluster.lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker({ ...cluster.lastObs, _layerType: 'citizenReports', _clusterCount: cluster.count, _verified: cluster.verified });

          new maplibregl.Popup({ offset: 16, maxWidth: '320px', closeButton: true })
            .setLngLat([cluster.lng, cluster.lat])
            .setHTML(`
              <div class="space-y-2 p-1 min-w-[240px] max-w-[280px] font-sans text-slate-800">
                <div class="flex items-center justify-between gap-1.5 border-b border-orange-100 pb-1.5 pr-4">
                  <span class="text-3xs font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/60 whitespace-nowrap flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    รายงานจากประชาชน
                  </span>
                  <span class="text-3xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${cluster.verified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                    ${cluster.verified ? '✓ ยืนยันแล้ว' : 'ข้อสังเกตชุมชน'}
                  </span>
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-900 leading-tight">${cluster.lastObs.category_th || cluster.lastObs.category || 'รายงานข้อสังเกต'}</div>
                  <div class="text-3xs text-slate-400 mt-0.5">${cluster.lastObs.district ? `อ.${cluster.lastObs.district}` : 'จ.ปราจีนบุรี'}</div>
                </div>
                <div class="text-3xs text-slate-600 space-y-1">
                  <div class="flex items-center justify-between">
                    <span>เวลาที่แจ้ง</span>
                    <span class="font-medium text-slate-800">${formatThaiTime(cluster.lastObs.observed_at || cluster.lastObs.created_at)}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>สถานะการตรวจสอบ</span>
                    <span class="font-medium text-slate-800">${cluster.verified ? 'ตรวจสอบยืนยันแล้ว' : 'รับรายงานแล้ว (รอตรวจสอบ)'}</span>
                  </div>
                  ${cluster.count > 1 ? `<div class="text-orange-700 font-semibold pt-0.5">พบรายงานในบริเวณนี้: ${cluster.count} รายการ</div>` : ''}
                </div>
                <p class="text-2xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                  ${cluster.lastObs.description || 'มีข้อสังเกตสภาพแวดล้อมในพื้นที่'}
                </p>
                <div class="text-3xs text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>ความแม่นยำระดับตำบล (~1.1 กม.)</span>
                  <span class="italic">คุ้มครองความเป็นส่วนตัว</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }

    // 3. ENVIRONMENTAL OBSERVATIONS LAYER (Purple: #7C3AED, Icon: labFlask)
    // Physical observations: foam, unusual water color, sediment, odor, oily sheen
    // NEVER labeled as toxic pollution without official laboratory evidence
    if (showEnvironmentalLayer && externalEvidence && externalEvidence.length > 0) {
      const envItems = externalEvidence.filter(item => {
        const lat = item.latitude ?? item.public_latitude;
        const lng = item.longitude ?? item.public_longitude;
        return lat && lng && item.location_precision !== 'UNKNOWN' && isEnvironmentalItem(item);
      });

      envItems.forEach(item => {
        const lat = item.latitude ?? item.public_latitude;
        const lng = item.longitude ?? item.public_longitude;
        const isVerified = isGenuineVerified(item);
        const bgColor = '#7C3AED';
        const icon = MARKER_ICONS.labFlask;

        const el = createCircularMarkerEl(
          bgColor,
          icon,
          undefined,
          `ข้อสังเกตสิ่งแวดล้อม: ${item.title_or_summary || item.source_name || 'รายงานสภาพน้ำ'}`,
          isVerified
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker({ ...item, _layerType: 'environmental', _verified: isVerified });

          new maplibregl.Popup({ offset: 16, maxWidth: '320px', closeButton: true })
            .setLngLat([lng, lat])
            .setHTML(`
              <div class="space-y-2 p-1 min-w-[240px] max-w-[280px] font-sans text-slate-800">
                <div class="flex items-center justify-between gap-1.5 border-b border-purple-100 pb-1.5 pr-4">
                  <span class="text-3xs font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 whitespace-nowrap flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    ข้อสังเกตสิ่งแวดล้อม
                  </span>
                  <span class="text-3xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${isVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                    ${isVerified ? '✓ ตรวจสอบยืนยันแล้ว' : 'ข้อสังเกตทางกายภาพ'}
                  </span>
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-900 leading-tight">${item.title_or_summary || 'รายงานข้อสังเกตสภาพน้ำ'}</div>
                  <div class="text-3xs text-purple-800 mt-0.5 font-medium">${item.source_name || 'แหล่งสาธารณะ'} (${item.source_platform || 'ONLINE'})</div>
                </div>
                <div class="text-3xs text-slate-600 space-y-1">
                  <div class="flex items-center justify-between">
                    <span>เวลาที่สังเกตพบ</span>
                    <span class="font-medium text-slate-800">${formatThaiTime(item.observed_at || item.published_at || item.created_at)}</span>
                  </div>
                  ${item.location_text ? `
                    <div class="flex items-start gap-1 pt-0.5 text-slate-600">
                      <span>📍</span>
                      <span class="truncate">${item.location_text}</span>
                    </div>
                  ` : ''}
                </div>
                ${item.text_excerpt ? `
                  <div class="text-3xs text-slate-800 bg-purple-50/70 p-2 rounded-lg border border-purple-100/80 leading-relaxed">
                    <span class="font-bold text-purple-900 block mb-0.5">ลักษณะที่สังเกตพบ:</span>
                    "${item.text_excerpt}"
                  </div>
                ` : item.description ? `
                  <p class="text-2xs text-slate-600 line-clamp-2 leading-relaxed bg-purple-50/40 p-2 rounded-lg border border-purple-100/70">
                    ${item.description}
                  </p>
                ` : ''}
                ${item.source_url ? `
                  <div class="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                    <span class="text-3xs text-purple-700 font-medium">บันทึกหลักฐานในระบบ</span>
                    ${item.source_url.includes('example.com') ? `
                      <span class="text-3xs text-amber-700 italic">Demo Reference</span>
                    ` : `
                      <a href="${item.source_url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-3xs text-purple-700 hover:text-purple-900 font-bold underline">
                        <span>เปิดหน้าเพจต้นทาง</span>
                        <span>↗</span>
                      </a>
                    `}
                  </div>
                ` : ''}
                <div class="text-3xs text-slate-500 pt-1 border-t border-slate-100 italic leading-tight">
                  ข้อสังเกตทางกายภาพจากแหล่งสาธารณะ ไม่ใช่ผลตรวจแล็บสารพิษ
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }

    // 4. FLOODING / WATERLOGGING LAYER (Blue: #0284C7, Icon: floodWaves)
    // Reported flooded locations and water inundation points
    if (showFloodingLayer && visibleLayers.externalEvidence !== false && externalEvidence && externalEvidence.length > 0) {
      const floodItems = externalEvidence.filter(item => {
        const lat = item.latitude ?? item.public_latitude;
        const lng = item.longitude ?? item.public_longitude;
        return lat && lng && item.location_precision !== 'UNKNOWN' && !isEnvironmentalItem(item);
      });

      floodItems.forEach(item => {
        const lat = item.latitude ?? item.public_latitude;
        const lng = item.longitude ?? item.public_longitude;
        const isVerified = isGenuineVerified(item);
        const bgColor = '#0284C7';
        const icon = MARKER_ICONS.floodWaves;

        const el = createCircularMarkerEl(
          bgColor,
          icon,
          undefined,
          `จุดน้ำท่วม/ขัง: ${item.title_or_summary || item.source_name || 'รายงานน้ำท่วม'}`,
          isVerified
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker({ ...item, _layerType: 'flooding', _verified: isVerified });

          new maplibregl.Popup({ offset: 16, maxWidth: '320px', closeButton: true })
            .setLngLat([lng, lat])
            .setHTML(`
              <div class="space-y-2 p-1 min-w-[240px] max-w-[280px] font-sans text-slate-800">
                <div class="flex items-center justify-between gap-1.5 border-b border-sky-100 pb-1.5 pr-4">
                  <span class="text-3xs font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60 whitespace-nowrap flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    จุดน้ำท่วม / น้ำขัง
                  </span>
                  <span class="text-3xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${isVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                    ${isVerified ? '✓ สอดคล้องกับพื้นที่' : 'รอตรวจสอบ'}
                  </span>
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-900 leading-tight">${item.title_or_summary || 'รายงานสถานการณ์น้ำท่วม'}</div>
                  <div class="text-3xs text-sky-800 mt-0.5 font-medium">${item.source_name || 'สื่อสาธารณะ'} (${item.source_platform || 'ONLINE'})</div>
                </div>
                <div class="text-3xs text-slate-600 space-y-1">
                  <div class="flex items-center justify-between">
                    <span>เวลาที่สังเกตพบ</span>
                    <span class="font-medium text-slate-800">${formatThaiTime(item.observed_at || item.published_at || item.created_at)}</span>
                  </div>
                  ${item.location_text ? `
                    <div class="flex items-start gap-1 pt-0.5 text-slate-600">
                      <span>📍</span>
                      <span class="truncate">${item.location_text}</span>
                    </div>
                  ` : ''}
                </div>
                ${item.text_excerpt ? `
                  <div class="text-3xs text-slate-800 bg-sky-50/70 p-2 rounded-lg border border-sky-100/80 leading-relaxed">
                    <span class="font-bold text-sky-900 block mb-0.5">ข้อความจากแหล่งต้นทาง:</span>
                    "${item.text_excerpt}"
                  </div>
                ` : item.description ? `
                  <p class="text-2xs text-slate-600 line-clamp-2 leading-relaxed bg-sky-50/40 p-2 rounded-lg border border-sky-100/70">
                    ${item.description}
                  </p>
                ` : ''}
                ${item.source_url ? `
                  <div class="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                    <span class="text-3xs text-emerald-700 font-medium">บันทึกข้อมูลในระบบ</span>
                    ${item.source_url.includes('example.com') ? `
                      <span class="text-3xs text-amber-700 italic">Demo Reference</span>
                    ` : `
                      <a href="${item.source_url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-3xs text-sky-700 hover:text-sky-900 font-bold underline">
                        <span>เปิดหน้าเพจต้นทาง</span>
                        <span>↗</span>
                      </a>
                    `}
                  </div>
                ` : ''}
                <div class="text-3xs text-slate-400 pt-1 border-t border-slate-100 italic leading-tight">
                  จุดรายงานสถานการณ์น้ำท่วมจากแหล่งสาธารณะ
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }
  }, [
    stations, 
    rainfallStations, 
    observations, 
    externalEvidence, 
    visibleLayers.flooding, 
    visibleLayers.environmental, 
    visibleLayers.monitoringStations, 
    visibleLayers.citizenReports, 
    visibleLayers.stations, 
    visibleLayers.rainfallStations, 
    visibleLayers.observations, 
    visibleLayers.externalEvidence, 
    mapLoaded
  ]);

  // Reactive District Selection & Highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selectedDistrict) return;

    if (map.getLayer('monitoring-surface-highlight')) {
      map.setFilter('monitoring-surface-highlight', ['==', 'district', selectedDistrict]);
    }

    if (!targetCoords) {
      const centroid = DISTRICT_CENTROIDS[selectedDistrict];
      if (centroid) {
        map.flyTo({
          center: [centroid[1], centroid[0]],
          zoom: 11.2,
          speed: 1.2,
          curve: 1.3
        });
      }
    }
  }, [selectedDistrict, targetCoords, mapLoaded]);

  // Fly to Target Coords or Fit Province Bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (targetCoords) {
      // If targetCoords is province center [14.05, 101.55], smoothly fit entire province bounds
      if (Math.abs(targetCoords[0] - 14.05) < 0.06 && Math.abs(targetCoords[1] - 101.55) < 0.06) {
        map.fitBounds([[101.08, 13.73], [102.08, 14.45]], {
          padding: { top: 60, bottom: 40, left: 40, right: 40 },
          duration: 800
        });
        if (map.getLayer('monitoring-surface-highlight')) {
          map.setFilter('monitoring-surface-highlight', ['==', 'district', '']);
        }
      } else {
        map.flyTo({
          center: [targetCoords[1], targetCoords[0]],
          zoom: 12.8,
          speed: 1.2,
          curve: 1.4
        });
      }
    }
  }, [targetCoords, mapLoaded]);

  if (!webglSupported || initError) {
    return (
      <div className="relative w-full h-full min-h-[360px] flex flex-col items-center justify-center bg-slate-900/95 text-white p-6 text-center rounded-2xl border border-white/10">
        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h4 className="text-base font-semibold text-slate-100 mb-1">
          ระบบแผนที่ความละเอียดสูง (WebGL2)
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
          การแสดงผลแผนที่เชิงพื้นที่แบบอินเทอร์แอคทีฟต้องการ WebGL2 กรุณาเปิดใช้งาน Hardware Acceleration หรือใช้งานบนเบราว์เซอร์ที่รองรับ
        </p>
        <div className="text-2xs text-slate-400 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60">
          FloodTrace Spatial Intelligence • Prachin Buri Monitoring
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
