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

export const DISTRICT_CENTROIDS: Record<string, [number, number]> = {};
export const AUTHENTIC_TAMBONS: Array<{ name: string; district: string; lat: number; lng: number }> = [];

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
    </svg>`
};

// Helper to format ISO timestamps to friendly Thai display
const formatThaiTime = (ts?: string | null) => {
  if (!ts) return 'ไม่ระบุเวลา';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  } catch (_) {
    return ts;
  }
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
      attributionControl: false
    });

    mapRef.current = map;
    let mapDestroyed = false;
    const resizeMap = () => {
      requestAnimationFrame(() => {
        if (!mapDestroyed && mapRef.current) mapRef.current.resize();
      });
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined' && mapContainerRef.current
      ? new ResizeObserver(resizeMap)
      : null;
    if (resizeObserver && mapContainerRef.current) resizeObserver.observe(mapContainerRef.current);
    window.addEventListener('resize', resizeMap);

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
          factorsHtml = factors.slice(0, 3).map((f: string) => `<li class="text-xs text-slate-700 leading-snug">${f}</li>`).join('');
        }
      } catch (_) {}

      const popup = new maplibregl.Popup({ offset: 12, closeButton: true, maxWidth: '300px' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-3 font-sans space-y-2">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <span class="text-sm font-bold text-slate-900">${props.cell_name || props.subdistrict}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full text-white shadow-xs" style="background-color: ${props.color || '#0284c7'}">
                ${props.priority_level}
              </span>
            </div>
            <div class="text-xs text-slate-600">
              คะแนนความสำคัญ: <span class="font-bold text-slate-900">${props.priority_score ?? '-'}</span> / 1.00
            </div>
            ${factorsHtml ? `<ul class="space-y-1 my-1 pl-1">${factorsHtml}</ul>` : ''}
            <div class="text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>ความสดใหม่: ${props.freshness || 'ไม่มีข้อมูล'}</span>
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
              Ruwaigon แสดงข้อมูลภายในขอบเขตจังหวัดปราจีนบุรี
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
      mapDestroyed = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeMap);
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
      title?: string
    ) => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer relative';
      el.style.width = '34px';
      el.style.height = '34px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = bgColor;
      el.style.border = '2px solid #ffffff';
      el.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.2)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.innerHTML = svgIcon;
      if (title) el.title = title;

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
        el.appendChild(badge);
      }

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.22)';
        el.style.zIndex = '999';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1.0)';
        el.style.zIndex = 'auto';
      });

      return el;
    };

    // 1. Water Level Gauge Stations (BLUE: #0284C7, Icon: water droplet)
    if (visibleLayers.stations && stations && stations.length > 0) {
      stations.forEach(st => {
        if (!st.latitude || !st.longitude) return;

        // BLUE is standard for water level station (Section 19)
        const bgColor = '#0284C7';
        const icon = MARKER_ICONS.waterDroplet;

        const el = createCircularMarkerEl(bgColor, icon, undefined, `สถานีระดับน้ำ: ${st.name_th || st.station_id}`);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([st.longitude, st.latitude])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker(st);

          new maplibregl.Popup({ offset: 16 })
            .setLngLat([st.longitude, st.latitude])
            .setHTML(`
              <div class="p-3.5 font-sans space-y-2 min-w-[250px]">
                <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span class="text-xs font-bold uppercase tracking-wider text-sky-700">สถานีตรวจวัดระดับน้ำ</span>
                  <span class="text-2xs px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800">โทรมาตร</span>
                </div>
                <div class="text-sm font-bold text-slate-900">${st.name_th || st.station_id}</div>
                <div class="text-xs text-slate-700 space-y-1">
                  <div>ระดับน้ำ: <strong class="text-slate-900">${st.water_level_msl != null ? `${st.water_level_msl.toFixed(2)} ม.รทก.` : 'ไม่มีข้อมูล'}</strong></div>
                  ${st.warning_level_msl != null ? `<div class="text-slate-600">ระดับเฝ้าระวัง: ${st.warning_level_msl.toFixed(2)} ม.รทก.</div>` : ''}
                  <div class="text-slate-500">เวลาต้นทาง: <span class="text-slate-700 font-medium">${formatThaiTime(st.provenance?.source_updated_at)}</span></div>
                  <div>สถานะ: <span class="font-medium text-slate-700">${st.status || 'ไม่สามารถยืนยันได้'}</span></div>
                  <div>แหล่งข้อมูล: <span class="font-medium text-slate-800">${st.provenance?.source_agency || 'ไม่สามารถยืนยันได้'}</span></div>
                </div>
                <div class="text-2xs text-slate-500 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>${st.district ? `อ.${st.district}` : 'จ.ปราจีนบุรี'}</span>
                  <span class="text-sky-700 font-semibold">ThaiWater API</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }

    // 2. Rainfall Monitoring Stations (ORANGE: #EA580C, Icon: rain / cloud)
    if (visibleLayers.rainfallStations && rainfallStations && rainfallStations.length > 0) {
      // Sample evenly or display based on zoom
      const sampledRain = rainfallStations.filter((_, i) => i % 5 === 0);
      sampledRain.forEach(rs => {
        if (!rs.latitude || !rs.longitude) return;

        // ORANGE is standard for rainfall station (Section 19)
        const bgColor = '#EA580C';
        const icon = MARKER_ICONS.rainCloud;
        const rain24 = rs.rain_24h_mm;

        const el = createCircularMarkerEl(bgColor, icon, undefined, `สถานีวัดน้ำฝน: ${rs.name_th || rs.station_id}`);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rs.longitude, rs.latitude])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker(rs);

          new maplibregl.Popup({ offset: 16 })
            .setLngLat([rs.longitude, rs.latitude])
            .setHTML(`
              <div class="p-3.5 font-sans space-y-2 min-w-[250px]">
                <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span class="text-xs font-bold uppercase tracking-wider text-orange-700">สถานีวัดน้ำฝน</span>
                  <span class="text-2xs px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800">อัตโนมัติ</span>
                </div>
                <div class="text-sm font-bold text-slate-900">${rs.name_th || rs.station_id}</div>
                <div class="text-xs text-slate-700 space-y-1">
                  <div>ฝนสะสม 24 ชั่วโมง: <strong class="text-slate-900">${rain24 != null ? `${rain24.toFixed(1)} มม.` : 'ไม่มีข้อมูล'}</strong></div>
                  ${rs.rain_1h_mm != null ? `<div class="text-slate-600">ฝน 1 ชม. ล่าสุด: ${rs.rain_1h_mm.toFixed(1)} มม.</div>` : ''}
                  <div class="text-slate-500">เวลาต้นทาง: <span class="text-slate-700 font-medium">${formatThaiTime(rs.provenance?.source_updated_at)}</span></div>
                  <div>แหล่งข้อมูล: <span class="font-medium text-slate-800">${rs.provenance?.source_agency || rs.agency || 'ไม่สามารถยืนยันได้'}</span></div>
                </div>
                <div class="text-2xs text-slate-500 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>${rs.district ? `อ.${rs.district}` : 'จ.ปราจีนบุรี'}</span>
                  <span class="text-orange-700 font-semibold">ThaiWater API</span>
                </div>
              </div>
            `)
            .addTo(map);
        });

        markersRef.current.push(marker);
      });
    }

    // 3. Citizen Community Observations (GREEN / TEAL: #0D9488 or #059669, Icon: community/report)
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
        // GREEN / TEAL is standard for citizen report (Section 19)
        const bgColor = cluster.verified ? '#059669' : '#0D9488';
        const icon = MARKER_ICONS.communityReport;

        const el = createCircularMarkerEl(
          bgColor, 
          icon, 
          cluster.count > 1 ? cluster.count : undefined,
          `รายงานชุมชน: ${cluster.lastObs.category || 'ข้อสังเกต'}`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([cluster.lng, cluster.lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectMarker) onSelectMarker(cluster.lastObs);

          new maplibregl.Popup({ offset: 16 })
            .setLngLat([cluster.lng, cluster.lat])
            .setHTML(`
              <div class="p-3.5 font-sans space-y-2 min-w-[250px]">
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <span class="text-xs font-bold uppercase tracking-wider text-teal-700">รายงานจากประชาชน</span>
                  <span class="text-2xs font-semibold px-2.5 py-0.5 rounded-full ${cluster.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'}">
                    ${cluster.verified ? '✓ ยืนยันแล้ว' : 'ข้อสังเกตชุมชน'}
                  </span>
                </div>
                <div class="text-sm font-bold text-slate-900">${cluster.lastObs.category_th || cluster.lastObs.category || 'รายงานข้อสังเกต'}</div>
                <div class="text-xs text-slate-700 space-y-1">
                  <div>ประเภท: <span class="font-medium">${cluster.lastObs.category || 'ข้อสังเกตสภาพน้ำ'}</span></div>
                  <div>เวลาที่แจ้ง: <span class="text-slate-600">${formatThaiTime(cluster.lastObs.observed_at || cluster.lastObs.created_at)}</span></div>
                  <div>สถานะ: <span class="font-medium text-slate-800">${cluster.verified ? 'VERIFIED_OBSERVATION' : cluster.lastObs.status || 'CITIZEN_REPORTED'}</span></div>
                  ${cluster.count > 1 ? `<div class="text-teal-700 font-semibold pt-0.5">พบรายงานในบริเวณนี้: ${cluster.count} รายการ</div>` : ''}
                </div>
                <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                  ${cluster.lastObs.description || 'มีข้อสังเกตสภาพแวดล้อมในพื้นที่'}
                </p>
                <div class="text-2xs text-slate-500 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>${cluster.lastObs.district ? `อ.${cluster.lastObs.district}` : 'จ.ปราจีนบุรี'}</span>
                  <span class="text-slate-500 font-medium">ความแม่นยำระดับตำบล (ปกป้องข้อมูลส่วนบุคคล)</span>
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
