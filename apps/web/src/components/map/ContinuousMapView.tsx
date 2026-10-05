import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface ContinuousMapViewProps {
  zones: any; // GeoJSON FeatureCollection of Environmental Watch Areas
  floodExtent: any; // GeoJSON FeatureCollection of Current Flood Extent
  forecastZones: any; // GeoJSON FeatureCollection of Modeled Forecast Watch Areas
  waterways: any; // GeoJSON FeatureCollection of Public Waterways
  stations: any[]; // Hydrological monitoring stations
  observations: any[]; // Generalized community observations
  visibleLayers: {
    watchZones: boolean;
    waterways: boolean;
    stations: boolean;
    adminLabels?: boolean;
    forecastZones?: boolean;
    observations?: boolean;
    floodExtent?: boolean;
  };
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  onSelectZone?: (zoneProps: any) => void;
  forecastHorizon?: string;
  watchZoneOpacity?: number;
  basemap?: 'satellite' | 'streets';
  onBasemapChange?: (base: 'satellite' | 'streets') => void;
  targetCoords?: [number, number] | null;
}

// No verified district or tambon coordinate artifact is available.
export const DISTRICT_CENTROIDS: Record<string, [number, number]> = {};
export const AUTHENTIC_TAMBONS: Array<{ name: string; district: string; lat: number; lng: number }> = [];

const COMMUNITY_RECEPTORS: any[] = [];

// SVG Icon Helpers matching Reference Style
const SVG_ICONS = {
  waterDrop: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="white">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>`,
  beaker: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
      <path d="M8.5 2h7"/>
      <path d="M7 16h10"/>
    </svg>`,
  warningTriangle: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="white">
      <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
    </svg>`,
  exclamation: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="13"></line>
      <circle cx="12" cy="18" r="1.5" fill="white"></circle>
    </svg>`,
  home: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>`
};

export const ContinuousMapView: React.FC<ContinuousMapViewProps> = ({
  zones,
  floodExtent,
  forecastZones,
  waterways,
  stations,
  observations,
  visibleLayers,
  selectedDistrict,
  onSelectDistrict,
  onSelectZone,
  watchZoneOpacity = 0.32,
  basemap = 'satellite',
  onBasemapChange,
  targetCoords
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Basemap Tile Layer Refs
  const satelliteTileRef = useRef<L.TileLayer | null>(null);
  const streetTileRef = useRef<L.TileLayer | null>(null);

  // Dedicated Leaflet Layer Refs
  const watchZonesLayerRef = useRef<L.GeoJSON | null>(null);
  const floodExtentLayerRef = useRef<L.GeoJSON | null>(null);
  const forecastLayerRef = useRef<L.GeoJSON | null>(null);
  const waterwaysLayerRef = useRef<L.GeoJSON | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const observationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const receptorsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const labelsLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Leaflet Map with Proper Stacking Panes (Section 14)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.00, 101.55],
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    // Explicit Visual Stacking via Panes (Bottom to Top)
    // 1. Basemap (200)
    // 2. Admin boundaries / base context (350)
    map.createPane('adminBoundaryPane');
    map.getPane('adminBoundaryPane')!.style.zIndex = '350';

    // 3. Flood extent (400)
    map.createPane('floodPane');
    map.getPane('floodPane')!.style.zIndex = '400';

    // 4. Current watch areas (450)
    map.createPane('watchZonesPane');
    map.getPane('watchZonesPane')!.style.zIndex = '450';

    // 5. Forecast watch areas (480)
    map.createPane('forecastPane');
    map.getPane('forecastPane')!.style.zIndex = '480';

    // 6. Rivers / Waterways (520)
    map.createPane('waterwaysPane');
    map.getPane('waterwaysPane')!.style.zIndex = '520';

    // 7. Official monitoring stations (580)
    map.createPane('stationsPane');
    map.getPane('stationsPane')!.style.zIndex = '580';

    // 8. Community observations (600)
    map.createPane('observationsPane');
    map.getPane('observationsPane')!.style.zIndex = '600';

    // 8b. Community receptor pins (610)
    map.createPane('receptorsPane');
    map.getPane('receptorsPane')!.style.zIndex = '610';

    // 9. Administrative labels (640 - Non-interactive)
    map.createPane('adminLabelsPane');
    const labelsPane = map.getPane('adminLabelsPane')!;
    labelsPane.style.zIndex = '640';
    labelsPane.style.pointerEvents = 'none';

    // 10. Selected-area highlight (680)
    map.createPane('selectedHighlightPane');
    map.getPane('selectedHighlightPane')!.style.zIndex = '680';

    // Primary Basemap: Esri World Imagery (Satellite)
    const satelliteTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
      }
    );
    satelliteTileRef.current = satelliteTile;

    // Alternative Basemap: CARTO Voyager
    const streetTile = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        maxZoom: 19
      }
    );
    streetTileRef.current = streetTile;

    // Default to Satellite Base as specified in Section 6
    if (basemap === 'streets') {
      streetTile.addTo(map);
    } else {
      satelliteTile.addTo(map);
    }

    // Add layer groups to map
    stationsLayerRef.current.addTo(map);
    observationsLayerRef.current.addTo(map);
    receptorsLayerRef.current.addTo(map);
    labelsLayerRef.current.addTo(map);

    // Dynamic Zoom-based Label Rendering
    map.on('zoomend', () => {
      renderAdministrativeLabels(map.getZoom());
    });

    mapInstanceRef.current = map;

    // Ensure container dimensions are recognized immediately and tiles load
    map.invalidateSize();
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Basemap Switch
  useEffect(() => {
    if (!mapInstanceRef.current || !satelliteTileRef.current || !streetTileRef.current) return;
    const map = mapInstanceRef.current;

    if (basemap === 'streets') {
      if (map.hasLayer(satelliteTileRef.current)) map.removeLayer(satelliteTileRef.current);
      if (!map.hasLayer(streetTileRef.current)) streetTileRef.current.addTo(map);
    } else {
      if (map.hasLayer(streetTileRef.current)) map.removeLayer(streetTileRef.current);
      if (!map.hasLayer(satelliteTileRef.current)) satelliteTileRef.current.addTo(map);
    }
  }, [basemap]);

  // Section 17, 18, 19: Administrative Labels with Dark Halo on Satellite
  const renderAdministrativeLabels = (zoom: number) => {
    const layer = labelsLayerRef.current;
    layer.clearLayers();

    if (visibleLayers.adminLabels === false) return;

    // Always show District labels with distinct, bold typography
    Object.entries(DISTRICT_CENTROIDS).forEach(([districtName, coords]) => {
      const isSelected = districtName === selectedDistrict;
      const icon = L.divIcon({
        className: 'map-district-label',
        html: `<span class="${isSelected ? 'selected-district-name' : ''}">อ.${districtName}</span>`,
        iconSize: [100, 22],
        iconAnchor: [50, 11]
      });
      const marker = L.marker(coords, {
        icon,
        pane: 'adminLabelsPane',
        interactive: false
      });
      layer.addLayer(marker);
    });

    // Zoom 11+: Show Authentic Tambon labels (Section 17 & 18)
    if (zoom >= 11) {
      AUTHENTIC_TAMBONS.forEach(tb => {
        // At zoom 11, show selected district tambons + major tambons; at zoom 12+ show all
        const shouldShow = zoom >= 12 || tb.district === selectedDistrict || [
          'ต.หน้าเมือง', 'ต.กบินทร์', 'ต.ศรีมหาโพธิ', 'ต.บ้านสร้าง', 'ต.ประจันตคาม', 'ต.นาดี', 'ต.โคกปีบ'
        ].includes(tb.name);

        if (shouldShow) {
          const icon = L.divIcon({
            className: 'map-tambon-label',
            html: `<span>${tb.name}</span>`,
            iconSize: [80, 18],
            iconAnchor: [40, 9]
          });
          const marker = L.marker([tb.lat, tb.lng], {
            icon,
            pane: 'adminLabelsPane',
            interactive: false
          });
          layer.addLayer(marker);
        }
      });
    }
  };

  // 1. Environmental Watch Area Polygons (Section 7, 8, 9 - Soft Choropleth)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (watchZonesLayerRef.current) {
      map.removeLayer(watchZonesLayerRef.current);
      watchZonesLayerRef.current = null;
    }

    if (visibleLayers.watchZones && zones && zones.features) {
      watchZonesLayerRef.current = L.geoJSON(zones, {
        pane: 'watchZonesPane',
        style: (feature) => {
          const props = feature?.properties || {};
          const isSelected = props.district === selectedDistrict;
          const priority = props.verification_priority;

          // Section 8: Watch Color Hierarchy
          let fill = '#F59E0B'; // Medium
          let stroke = '#D97706';

          if (priority === 'สูงมาก') {
            fill = '#DC2626';
            stroke = '#991B1B';
          } else if (priority === 'สูง') {
            fill = '#EA580C';
            stroke = '#C2410C';
          } else if (priority === 'ปานกลาง') {
            fill = '#F59E0B';
            stroke = '#D97706';
          } else if (priority === 'ควรติดตาม') {
            fill = '#FACC15';
            stroke = '#CA8A04';
          } else if (priority === 'ต่ำ' || priority === 'ระดับเฝ้าระวังต่ำ') {
            fill = '#10B981';
            stroke = '#059669';
          } else {
            fill = '#64748B';
            stroke = '#475569';
          }

          // Section 9: Normal Watch vs Selected Area
          return {
            fillColor: fill,
            fillOpacity: isSelected ? Math.min(watchZoneOpacity + 0.14, 0.48) : watchZoneOpacity,
            color: isSelected ? '#FFFFFF' : stroke, // Crisp white outline on select, matching tone on normal
            weight: isSelected ? 2.5 : 1.2,
            opacity: isSelected ? 0.95 : 0.65,
            dashArray: undefined, // NO dashed borders for normal watch zones
            lineJoin: 'round'
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.on('click', () => {
            onSelectDistrict(props.district);
            if (onSelectZone) onSelectZone(props);
          });

          const badgeBg = 
            props.verification_priority === 'สูงมาก' ? '#DC2626' :
            props.verification_priority === 'สูง' ? '#EA580C' :
            props.verification_priority === 'ปานกลาง' ? '#F59E0B' :
            props.verification_priority === 'ควรติดตาม' ? '#CA8A04' : '#10B981';

          layer.bindPopup(`
            <div style="font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; min-width: 250px; padding: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 6px;">
                <strong style="color: #063B70; font-size: 14px;">${props.zone_name || `อำเภอ${props.district}`}</strong>
                <span style="background: ${badgeBg}; color: white; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px;">
                  ${props.verification_priority_label || props.verification_priority}
                </span>
              </div>
              <div style="font-size: 11px; color: #334155; margin-bottom: 4px; line-height: 1.4;">
                <strong>สถานะ:</strong> ${props.watch_status || 'เฝ้าระวังเชิงพื้นที่'}
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                <strong>สภาวะน้ำ:</strong> ${props.flood_status || 'ไม่มีข้อมูล'}
              </div>
              <div style="font-size: 10px; color: #475569; background: #F8FAFC; padding: 6px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 6px; line-height: 1.4;">
                ${props.verification_priority_explanation || 'ระดับสีเป็นการประเมินเพื่อการเฝ้าระวัง ไม่ใช่ผลยืนยันการปนเปื้อน'}
              </div>
              <a href="/area-detail?district=${encodeURIComponent(props.district)}" style="display: block; text-align: center; background: #0C65E8; color: white; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; text-decoration: none;">
                ดูรายละเอียดพื้นที่
              </a>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [zones, visibleLayers.watchZones, selectedDistrict, onSelectDistrict, onSelectZone, watchZoneOpacity]);

  // 2. Public Waterways (Section 13 - Thinner, Cleaner Cyan-Blue)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (waterwaysLayerRef.current) {
      map.removeLayer(waterwaysLayerRef.current);
      waterwaysLayerRef.current = null;
    }

    if (visibleLayers.waterways && waterways && waterways.features) {
      waterwaysLayerRef.current = L.geoJSON(waterways, {
        pane: 'waterwaysPane',
        style: (feature) => {
          const isMainRiver = feature?.properties?.name?.includes('แม่น้ำ') || true;
          return {
            color: '#0EA5E9', // Clean Cyan-Blue
            weight: isMainRiver ? 2.2 : 1.2,
            opacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round'
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 12px; padding: 4px; min-width: 200px;">
              <strong style="color: #0284C7; font-size: 13px;">🌊 ${props.name || 'แม่น้ำปราจีนบุรี'}</strong>
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                ${props.description || 'โครงข่ายทางน้ำสายหลัก ลุ่มน้ำปราจีนบุรี (กรมชลประทาน / RID)'}
              </div>
              <div style="font-size: 10px; color: #16A34A; font-weight: bold; margin-top: 6px;">
                OFFICIAL ข้อมูลจากหน่วยงาน
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [waterways, visibleLayers.waterways]);

  // 3. Official Water Monitoring Stations (Section 20 - Clean Standardized SVG Icons)
  useEffect(() => {
    const layer = stationsLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.stations || !stations) return;

    stations.forEach((st) => {
      const bgColor = '#0284C7';
      const iconSvg = SVG_ICONS.waterDrop;

      const icon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div style="
            background: ${bgColor};
            border: 2px solid #FFFFFF;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: transform 0.2s ease;
          " class="hover:scale-115">
            ${iconSvg}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([st.latitude, st.longitude], {
        icon,
        pane: 'stationsPane'
      });

      marker.bindPopup(`
        <div style="font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 12px; padding: 4px; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 4px;">
            <strong style="color: #063B70; font-size: 13px;">${st.name_th}</strong>
            <span style="background: #EFF6FF; color: #0C65E8; font-size: 9px; font-weight: bold; padding: 1px 6px; border-radius: 9999px;">
              ${st.provenance?.category || 'UNAVAILABLE'}
            </span>
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 3px;">
            <strong>ระดับน้ำ:</strong> ${st.water_level_msl !== null && st.water_level_msl !== undefined ? `${st.water_level_msl} ม.รทก.` : 'ไม่มีข้อมูลตรวจวัด'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">
            <strong>อำเภอ:</strong> ${st.district} | <strong>ลุ่มน้ำ:</strong> ${st.basin}
          </div>
          <div style="font-size: 9px; color: #64748B; margin-top: 6px;">
            แหล่งข้อมูล: ${st.provenance?.source_agency || 'UNAVAILABLE'}
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [stations, visibleLayers.stations]);

  // 4. Community Receptor Pins (Section 4 - Reference Style House Badges)
  useEffect(() => {
    const layer = receptorsLayerRef.current;
    layer.clearLayers();

    COMMUNITY_RECEPTORS.forEach((rc, idx) => {
      const isGreen = idx % 2 === 0;
      const bgColor = isGreen ? '#10B981' : '#0284C7';

      const icon = L.divIcon({
        className: 'custom-receptor-pin',
        html: `
          <div style="
            background: ${bgColor};
            border: 2px solid #FFFFFF;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0,0,0,0.35);
            cursor: pointer;
            transition: transform 0.2s ease;
          " class="hover:scale-115">
            ${SVG_ICONS.home}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([rc.lat, rc.lng], {
        icon,
        pane: 'receptorsPane'
      });

      marker.bindPopup(`
        <div style="font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 12px; padding: 4px; min-width: 200px;">
          <strong style="color: #063B70; font-size: 13px;">🏡 ${rc.name}</strong>
          <div style="font-size: 11px; color: #475569; margin-top: 3px;">
            อ.${rc.district} จ.ปราจีนบุรี (จุดสังเกตการณ์ชุมชนริมน้ำ)
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, []);

  // 5. Generalized Community Observations (Section 21 - Orange Pins, Zero PII)
  useEffect(() => {
    const layer = observationsLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.observations || !observations) return;

    observations.forEach((obs, idx) => {
      const icon = L.divIcon({
        className: 'custom-obs-pin',
        html: `
          <div style="
            background: #EA580C;
            border: 2px solid #FFFFFF;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0,0,0,0.35);
            cursor: pointer;
            transition: transform 0.2s ease;
          " class="hover:scale-115">
            ${SVG_ICONS.exclamation}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([obs.generalized_latitude, obs.generalized_longitude], {
        icon,
        pane: 'observationsPane'
      });

      marker.bindPopup(`
        <div style="font-family: 'Sarabun', system-ui, sans-serif; font-size: 12px; padding: 4px; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 4px;">
            <strong style="color: #9A3412; font-size: 12px;">รายงานข้อสังเกต #${idx + 1}</strong>
            <span style="background: #FFEDD5; color: #9A3412; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 4px;">
              COMMUNITY
            </span>
          </div>
          <div style="font-size: 11px; color: #0F172A; font-weight: bold; margin-bottom: 2px;">
            หมวดหมู่: ${obs.category}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            พื้นที่: ${obs.generalized_location || obs.district}
          </div>
          <div style="font-size: 9px; color: #94A3B8; margin-top: 4px;">
            ตำแหน่งพิกัดถูกปรับเพื่อความเป็นส่วนตัวของประชาชน
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [observations, visibleLayers.observations]);

  // 6. Flood Extent Overlay (Section 12 - Soft Blue Supporting Layer)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (floodExtentLayerRef.current) {
      map.removeLayer(floodExtentLayerRef.current);
      floodExtentLayerRef.current = null;
    }

    if (visibleLayers.floodExtent && floodExtent && floodExtent.features) {
      floodExtentLayerRef.current = L.geoJSON(floodExtent, {
        pane: 'floodPane',
        style: {
          color: '#0284C7',
          fillColor: '#38BDF8',
          fillOpacity: 0.18,
          weight: 1.2,
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', system-ui, sans-serif; min-width: 210px; padding: 4px;">
              <strong style="color: #0284C7; font-size: 13px; display: block; margin-bottom: 4px;">
                🌊 ${props.name || 'พื้นที่น้ำท่วมขังปัจจุบัน'}
              </strong>
              <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
                <strong>อำเภอ:</strong> ${props.district}
              </div>
              <div style="font-size: 10px; color: #15803D; font-weight: bold; background: #DCFCE7; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">
                OFFICIAL GISTDA / RID
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [floodExtent, visibleLayers.floodExtent]);

  // 7. Forecast Watch Areas (Section 11 - Soft Translucent Purple Fill & Subtle Dash)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (forecastLayerRef.current) {
      map.removeLayer(forecastLayerRef.current);
      forecastLayerRef.current = null;
    }

    if (visibleLayers.forecastZones && forecastZones && forecastZones.features) {
      forecastLayerRef.current = L.geoJSON(forecastZones, {
        pane: 'forecastPane',
        style: {
          color: '#8B5CF6',
          fillColor: '#8B5CF6',
          fillOpacity: 0.14,
          weight: 1.5,
          dashArray: '4, 4',
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', system-ui, sans-serif; min-width: 240px; padding: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #6D28D9; font-size: 13px;">${props.label || 'แนวโน้มพื้นที่ที่อาจได้รับผลกระทบ'}</strong>
                <span style="background: #F3E8FF; color: #6D28D9; font-size: 9px; font-weight: bold; padding: 1px 6px; border-radius: 4px;">
                  MODEL
                </span>
              </div>
              <div style="font-size: 11px; color: #475569; line-height: 1.4;">
                ${forecastZones.disclaimer || 'ผลจากแบบจำลองใช้เพื่อการเฝ้าระวัง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การยืนยันการปนเปื้อน'}
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [forecastZones, visibleLayers.forecastZones]);

  // Initial Label Rendering
  useEffect(() => {
    if (mapInstanceRef.current) {
      renderAdministrativeLabels(mapInstanceRef.current.getZoom());
    }
  }, [visibleLayers.adminLabels, selectedDistrict]);

  // Fly to target coords or selected district
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (targetCoords) {
      mapInstanceRef.current.flyTo(targetCoords, 13, { duration: 1.0 });
      return;
    }

    if (selectedDistrict) {
      const coords = DISTRICT_CENTROIDS[selectedDistrict];
      if (coords) {
        mapInstanceRef.current.flyTo(coords, 11, { duration: 1.0 });
      }
    }
  }, [selectedDistrict, targetCoords]);

  return (
    <div className="relative w-full h-full min-h-[500px]" style={{ width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
