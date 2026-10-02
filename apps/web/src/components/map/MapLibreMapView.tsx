import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// @ts-ignore
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

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
  visibleLayers: {
    monitoringSurface: boolean;
    waterways: boolean;
    stations: boolean;
    rainfallStations: boolean;
    observations: boolean;
    outsideMask: boolean;
    adminLabels: boolean;
    roadOverlay: boolean;
  };
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  onSelectCell?: (cellProps: any) => void;
  onSelectMarker?: (markerProps: any) => void;
  surfaceOpacity?: number;
  basemap?: 'satellite' | 'streets';
  targetCoords?: [number, number] | null; // [lat, lng]
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

// Clean SVGs for large circular markers matching reference image
const MARKER_ICONS = {
  warningTriangle: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
      <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
    </svg>`,
  exclamation: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="3.2" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="13"></line>
      <circle cx="12" cy="18" r="1.5" fill="white"></circle>
    </svg>`,
  beaker: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
      <path d="M8.5 2h7"/>
      <path d="M7 16h10"/>
    </svg>`,
  home: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>`,
  verifiedHome: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>`,
  waterDrop: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="17" height="17" fill="white">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>`
};

const EMPTY_GEOJSON: any = { type: 'FeatureCollection', features: [] };

export const MapLibreMapView: React.FC<MapLibreMapViewProps> = ({
  monitoringSurface,
  boundaryData,
  waterways,
  stations,
  rainfallStations = [],
  observations,
  visibleLayers,
  selectedDistrict,
  onSelectDistrict,
  onSelectCell,
  onSelectMarker,
  surfaceOpacity = 0.50,
  basemap = 'satellite',
  targetCoords
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

    const initialStyle: maplibregl.StyleSpecification = {
      version: 8,
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
            'line-color': 'rgba(255, 255, 255, 0.42)',
            'line-width': 1.4
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
            'text-size': 11.5,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-max-angle': 30,
            'text-offset': [0, -1]
          },
          paint: {
            'text-color': '#e0f2fe',
            'text-halo-color': '#0c4a6e',
            'text-halo-width': 2.2
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
            'text-size': 13.5,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': false,
            'text-ignore-placement': false
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#0f172a',
            'text-halo-width': 2.8
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
            'text-size': 11.5,
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-allow-overlap': false,
            'text-ignore-placement': false
          },
          paint: {
            'text-color': '#f8fafc',
            'text-halo-color': '#1e293b',
            'text-halo-width': 2.2
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

      let factorsHtml = '';
      try {
        const factors = typeof props.contributing_factors === 'string' 
          ? JSON.parse(props.contributing_factors) 
          : props.contributing_factors;
        if (Array.isArray(factors)) {
          factorsHtml = factors.slice(0, 3).map((f: string) => `<li class="text-[11px] text-slate-700 leading-tight">${f}</li>`).join('');
        }
      } catch (_) {}

      const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '290px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-3 font-sans space-y-2">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <span class="text-xs font-bold text-slate-900">${props.cell_name || props.subdistrict}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-xs" style="background-color: ${props.color || '#0284c7'}">
                ${props.priority_level}
              </span>
            </div>
            <div class="text-[11px] text-slate-600">
              คะแนนความสำคัญ: <span class="font-bold text-slate-900">${props.priority_score ?? '-'}</span> / 1.00
            </div>
            ${factorsHtml ? `<ul class="space-y-1 my-1 pl-1">${factorsHtml}</ul>` : ''}
            <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>ความสดใหม่: ${props.freshness || 'ล่าสุด'}</span>
              <span class="text-[#0C65E8] font-bold">อ.${props.district}</span>
            </div>
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

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
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
    if (map.getLayer('monitoring-surface-fill')) {
      map.setLayoutProperty('monitoring-surface-fill', 'visibility', visibleLayers.monitoringSurface ? 'visible' : 'none');
      map.setPaintProperty('monitoring-surface-fill', 'fill-opacity', surfaceOpacity);
    }
    if (map.getLayer('monitoring-surface-lines')) {
      map.setLayoutProperty('monitoring-surface-lines', 'visibility', visibleLayers.monitoringSurface ? 'visible' : 'none');
    }
    if (map.getLayer('outside-mask-fill')) {
      map.setLayoutProperty('outside-mask-fill', 'visibility', visibleLayers.outsideMask ? 'visible' : 'none');
    }
    if (map.getLayer('waterways-glow')) {
      map.setLayoutProperty('waterways-glow', 'visibility', visibleLayers.waterways ? 'visible' : 'none');
      map.setLayoutProperty('waterways-core', 'visibility', visibleLayers.waterways ? 'visible' : 'none');
      map.setLayoutProperty('waterways-label', 'visibility', visibleLayers.waterways ? 'visible' : 'none');
    }
    if (map.getLayer('admin-district-labels')) {
      map.setLayoutProperty('admin-district-labels', 'visibility', visibleLayers.adminLabels ? 'visible' : 'none');
      map.setLayoutProperty('admin-tambon-labels', 'visibility', visibleLayers.adminLabels ? 'visible' : 'none');
    }
    if (map.getLayer('roads-overlay')) {
      map.setLayoutProperty('roads-overlay', 'visibility', visibleLayers.roadOverlay ? 'visible' : 'none');
    }
  }, [basemap, surfaceOpacity, visibleLayers, mapLoaded]);

  // Large Circular Status Markers matching the Reference Design
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const createCircularMarkerEl = (
      bgColor: string,
      svgIcon: string,
      countBadge?: number
    ) => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer relative';
      el.style.width = '38px';
      el.style.height = '38px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = bgColor;
      el.style.border = '2.5px solid #ffffff';
      el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.25)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.innerHTML = svgIcon;

      if (countBadge && countBadge > 1) {
        const badge = document.createElement('span');
        badge.innerText = `${countBadge}`;
        badge.style.position = 'absolute';
        badge.style.top = '-5px';
        badge.style.right = '-5px';
        badge.style.backgroundColor = '#0f172a';
        badge.style.color = '#ffffff';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = 'bold';
        badge.style.padding = '1px 5px';
        badge.style.borderRadius = '999px';
        badge.style.border = '1.5px solid #ffffff';
        badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.appendChild(badge);
      }

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.25)';
        el.style.zIndex = '999';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1.0)';
        el.style.zIndex = 'auto';
      });

      return el;
    };

    // 1. Water Level Gauge Stations (Alert Red, Warning Orange, or Cyan Water Drop)
    if (visibleLayers.stations && stations && stations.length > 0) {
      stations.forEach(st => {
        if (!st.latitude || !st.longitude) return;

        const isCritical = st.water_level_msl && st.critical_level_msl && st.water_level_msl >= st.critical_level_msl;
        const isWarning = st.water_level_msl && st.warning_level_msl && st.water_level_msl >= st.warning_level_msl;

        const bgColor = isCritical ? '#DC2626' : isWarning ? '#EA580C' : '#0284C7';
        const icon = isCritical ? MARKER_ICONS.warningTriangle : isWarning ? MARKER_ICONS.exclamation : MARKER_ICONS.waterDrop;

        const el = createCircularMarkerEl(bgColor, icon);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([st.longitude, st.latitude])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker(st);

          new maplibregl.Popup({ offset: 16 })
            .setLngLat([st.longitude, st.latitude])
            .setHTML(`
              <div class="p-3 font-sans space-y-1.5 min-w-[220px]">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${bgColor}"></span>
                  <span class="text-xs font-bold text-slate-900">${st.name_th || st.station_id}</span>
                </div>
                <div class="text-[11px] text-slate-600">
                  ระดับน้ำปัจจุบัน: <span class="font-bold text-slate-900">${st.water_level_msl ? `${st.water_level_msl.toFixed(2)} ม.รทก.` : 'กำลังตรวจวัด'}</span>
                </div>
                ${st.warning_level_msl ? `<div class="text-[10px] text-slate-500">ระดับเฝ้าระวัง: ${st.warning_level_msl.toFixed(2)} ม.รทก.</div>` : ''}
                <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>${st.district ? `อ.${st.district}` : 'ปราจีนบุรี'}</span>
                  <span class="text-emerald-700 font-medium">โทรมาตรทางการ</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }

    // 2. Representative Rainfall Stations (Purple Flask or Warning)
    if (visibleLayers.rainfallStations && rainfallStations && rainfallStations.length > 0) {
      const sampledRain = rainfallStations.filter((_, i) => i % 6 === 0);
      sampledRain.forEach(rs => {
        if (!rs.latitude || !rs.longitude) return;

        const rain24 = rs.rain_24h_mm || 0;
        const bgColor = rain24 >= 50 ? '#EA580C' : '#7C3AED';
        const icon = rain24 >= 50 ? MARKER_ICONS.exclamation : MARKER_ICONS.beaker;

        const el = createCircularMarkerEl(bgColor, icon);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rs.longitude, rs.latitude])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker(rs);

          new maplibregl.Popup({ offset: 16 })
            .setLngLat([rs.longitude, rs.latitude])
            .setHTML(`
              <div class="p-3 font-sans space-y-1.5 min-w-[220px]">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${bgColor}"></span>
                  <span class="text-xs font-bold text-slate-900">${rs.name_th || rs.station_id}</span>
                </div>
                <div class="text-[11px] text-slate-600">
                  ฝนสะสม 24 ชม.: <span class="font-bold text-slate-900">${rain24.toFixed(1)} มม.</span>
                </div>
                <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>${rs.district ? `อ.${rs.district}` : 'ปราจีนบุรี'}</span>
                  <span class="text-indigo-700 font-medium">สถานีวัดน้ำฝน</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }

    // 3. Citizen Community Observations (Blue Home or Green Verified Home)
    if (visibleLayers.observations && observations && observations.length > 0) {
      const clusterMap: Record<string, { lat: number; lng: number; count: number; verified: boolean; lastObs: any }> = {};

      observations.forEach(obs => {
        const lat = obs.generalized_latitude ?? obs.public_latitude ?? obs.latitude;
        const lng = obs.generalized_longitude ?? obs.public_longitude ?? obs.longitude;
        if (!lat || !lng) return;

        const key = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
        const isVerif = obs.verification_status === 'VERIFIED' || obs.verification_status === 'OFFICIAL_CONFIRMED' || obs.verification_status === 'VERIFIED_OBSERVATION';

        if (!clusterMap[key]) {
          clusterMap[key] = { lat, lng, count: 1, verified: isVerif, lastObs: obs };
        } else {
          clusterMap[key].count += 1;
          if (isVerif) clusterMap[key].verified = true;
        }
      });

      Object.values(clusterMap).forEach(cluster => {
        const bgColor = cluster.verified ? '#059669' : '#1D4ED8';
        const icon = cluster.verified ? MARKER_ICONS.verifiedHome : MARKER_ICONS.home;

        const el = createCircularMarkerEl(bgColor, icon, cluster.count > 1 ? cluster.count : undefined);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([cluster.lng, cluster.lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker(cluster.lastObs);

          new maplibregl.Popup({ offset: 16 })
            .setLngLat([cluster.lng, cluster.lat])
            .setHTML(`
              <div class="p-3 font-sans space-y-1.5 min-w-[240px]">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                  <span class="text-xs font-bold text-slate-900">${cluster.lastObs.category || 'ข้อสังเกตจากประชาชน'}</span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${cluster.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                    ${cluster.verified ? '✓ ตรวจสอบแล้ว' : 'รายงานชุมชน'}
                  </span>
                </div>
                <div class="text-[11px] text-slate-700">
                  พบรายงานในบริเวณนี้: <strong class="text-slate-900">${cluster.count} รายการ</strong>
                </div>
                <p class="text-[11px] text-slate-600 line-clamp-2">${cluster.lastObs.description || 'มีข้อสังเกตทางสิ่งแวดล้อมในพื้นที่'}</p>
                <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>${cluster.lastObs.district ? `อ.${cluster.lastObs.district}` : 'ปราจีนบุรี'}</span>
                  <span>ความแม่นยำระดับตำบล</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }
  }, [stations, rainfallStations, observations, visibleLayers.stations, visibleLayers.rainfallStations, visibleLayers.observations, mapLoaded]);

  // Fly to Target Coords
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (targetCoords) {
      map.flyTo({
        center: [targetCoords[1], targetCoords[0]],
        zoom: 12.5,
        speed: 1.2,
        curve: 1.4
      });
    }
  }, [targetCoords, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
