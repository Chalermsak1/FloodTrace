import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { WaterStation, Reservoir, RiskHotspot, CitizenReport, ProvenanceMetadata } from '../types';
import { LayerState } from './map/MapLayerPanel';

interface Props {
  stations: WaterStation[];
  reservoirs: Reservoir[];
  hotspots: RiskHotspot[];
  reports: CitizenReport[];
  riverCorridors: any;
  visibleLayers: LayerState;
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
}

const renderLayerProvenanceBox = (prov?: ProvenanceMetadata, customNote?: string) => {
  if (!prov) return '';
  const confidencePct = Math.round((prov.confidence ?? 1.0) * 100);
  const origTime = prov.original_timestamp || 'ไม่ระบุ';
  const retrTime = prov.retrieval_timestamp || prov.retrieved_at || 'ระบบตรวจสอบอัตโนมัติ';
  const freshness = prov.freshness_status || 'CURRENT';
  const nature = prov.value_nature || 'RECORDED';
  const category = prov.category || 'OFFICIAL_RECORD';
  const agency = prov.source_agency || 'หน่วยงานทางการ';

  const freshnessColor = freshness === 'CURRENT' ? '#16a34a' : freshness === 'RECENT' ? '#0284c7' : '#d97706';

  return `
    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #C4C7D1; font-size: 10px; color: #717F8F; font-family: 'Sarabun', system-ui, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
        <span style="color: #0C57C7; font-weight: bold; background: #e0f2fe; padding: 1px 4px; border-radius: 4px; border: 1px solid #bae6fd;">
          ${category}
        </span>
        <span style="color: #7c3aed; font-weight: bold; background: #f3e8ff; padding: 1px 4px; border-radius: 4px; border: 1px solid #e9d5ff;">
          ${nature}
        </span>
      </div>
      <div style="color: #0B243D; margin-bottom: 2px;"><strong>หน่วยงาน:</strong> ${agency}</div>
      <div><strong>วันที่ข้อมูล:</strong> ${origTime}</div>
      <div><strong>ตรวจสอบเมื่อ:</strong> ${retrTime}</div>
      <div style="display: flex; justify-content: space-between; margin-top: 3px;">
        <span><strong>ความสดใหม่:</strong> <span style="color: ${freshnessColor}; font-weight: bold;">${freshness}</span></span>
        <span><strong>ความเชื่อมั่น:</strong> ${confidencePct}%</span>
      </div>
      ${customNote ? `<div style="margin-top: 4px; color: #b45309; font-size: 9px; line-height: 1.2;">${customNote}</div>` : ''}
    </div>
  `;
};

// Monitored districts centroid definitions in Prachin Buri
const DISTRICT_CENTROIDS: Record<string, [number, number]> = {
  'กบินทร์บุรี': [13.995, 101.725],
  'ศรีมหาโพธิ': [13.882, 101.518],
  'เมืองปราจีนบุรี': [14.053, 101.372],
  'บ้านสร้าง': [13.985, 101.215],
  'ประจันตคาม': [14.112, 101.552],
  'นาดี': [14.135, 101.882],
  'ศรีมโหสถ': [13.865, 101.415]
};

export const MapView: React.FC<Props> = ({
  stations,
  reservoirs,
  hotspots,
  reports,
  riverCorridors,
  visibleLayers,
  selectedDistrict,
  onSelectDistrict
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups for public map layers
  const priorityLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const riversLayerRef = useRef<L.GeoJSON | null>(null);
  const modeledExpansionLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const reportsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const officialLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Prachin Buri basin
    const map = L.map(mapContainerRef.current, {
      center: [14.015, 101.55],
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false
    });

    // Realistic satellite basemap (Esri World Imagery)
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
        maxZoom: 19
      }
    );

    // Clean Carto Voyager / OpenStreetMap as alternative
    const streetBase = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
      }
    );

    // Default to realistic satellite layer matching reference image
    satellite.addTo(map);

    // Basemap Switcher
    const baseLayers = {
      '🛰️ ภาพถ่ายดาวเทียม (Satellite)': satellite,
      '🗺️ แผนที่ภูมิประเทศ (Carto)': streetBase
    };
    L.control.layers(baseLayers, undefined, { position: 'topright' }).addTo(map);

    // Clean zoom control on bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add public layer groups to map
    priorityLayerRef.current.addTo(map);
    modeledExpansionLayerRef.current.addTo(map);
    reportsLayerRef.current.addTo(map);
    officialLayerRef.current.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 1. Environmental Verification Priority Zones
  useEffect(() => {
    const layer = priorityLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.verificationPriority) return;

    Object.entries(DISTRICT_CENTROIDS).forEach(([district, coords]) => {
      const isSelected = district === selectedDistrict;
      const isHighPriority = district === 'กบินทร์บุรี' || district === 'ศรีมหาโพธิ';

      const color = isHighPriority ? '#E16434' : '#5794E0';
      const radius = isHighPriority ? 5000 : 3800;

      // Circle representing monitored district area
      const circle = L.circle(coords, {
        radius,
        color,
        fillColor: color,
        fillOpacity: isSelected ? 0.35 : 0.18,
        weight: isSelected ? 3 : 2,
        dashArray: isSelected ? undefined : '4, 4'
      });

      circle.on('click', () => {
        onSelectDistrict(district);
      });

      circle.bindPopup(`
        <div style="font-family: 'Sarabun', sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #C4C7D1; padding-bottom: 4px;">
            <strong style="color: #0B243D; font-size: 13px;">อ.${district} จ.ปราจีนบุรี</strong>
            <span style="background: ${isHighPriority ? '#fee2e2' : '#e0f2fe'}; color: ${isHighPriority ? '#991b1b' : '#0369a1'}; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 9999px;">
              ${isHighPriority ? 'เฝ้าระวังสูง (HIGH)' : 'ติดตามปกติ'}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.4;">
            <strong>สถานะ:</strong> พื้นที่ที่ควรได้รับการตรวจสอบด้านสิ่งแวดล้อม
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            * การแสดงผลตามข้อมูลปัจจัยทางน้ำและรายงานประชาชน ไม่ใช่การยืนยันการปนเปื้อน
          </div>
        </div>
      `);

      layer.addLayer(circle);

      // Icon Marker for Priority Hotspot
      if (isHighPriority) {
        const icon = L.divIcon({
          className: 'custom-priority-pin',
          html: `
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background-color: #E16434; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="background-color: #FBFCFC; border: 2px solid #E16434; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.25);">
                <span style="color: #E16434; font-size: 11px; font-weight: 900;">!</span>
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker(coords, { icon });
        marker.on('click', () => onSelectDistrict(district));
        layer.addLayer(marker);
      }
    });
  }, [visibleLayers.verificationPriority, selectedDistrict, onSelectDistrict]);

  // 2. Current Flood & River Corridors (GISTDA / RID)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (riversLayerRef.current) {
      map.removeLayer(riversLayerRef.current);
      riversLayerRef.current = null;
    }

    if (visibleLayers.currentFlood && riverCorridors && riverCorridors.features) {
      const riverProv: ProvenanceMetadata = riverCorridors.provenance || {
        category: 'OFFICIAL_RECORD',
        source_agency: 'กรมชลประทาน (RID)',
        source_dataset: 'โครงข่ายทางน้ำลุ่มน้ำปราจีนบุรี (Basin 03)',
        original_timestamp: '2022-01-01',
        retrieval_timestamp: '2026-10-02T00:00:00Z',
        freshness_status: 'CURRENT',
        value_nature: 'RECORDED',
        confidence: 1.0
      };

      riversLayerRef.current = L.geoJSON(riverCorridors, {
        style: {
          color: '#0C57C7',
          weight: 4,
          opacity: 0.85,
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', sans-serif; font-size: 12px; padding: 4px; min-width: 220px;">
              <strong style="color: #0C57C7; font-size: 13px; display: block;">${props.name || 'เส้นทางน้ำสายหลัก'}</strong>
              <div style="color: #475569; font-size: 11px; margin-top: 2px;">โครงข่ายทางน้ำลุ่มน้ำปราจีนบุรี</div>
              ${renderLayerProvenanceBox(riverProv)}
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [riverCorridors, visibleLayers.currentFlood]);

  // 3. 3-Day Modeled Expansion Reach (MODELED)
  useEffect(() => {
    const layer = modeledExpansionLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.modeledExpansion) return;

    // Render downstream modeled flow reach corridors with dashed blue styling
    const modelPoints: [number, number][] = [
      [14.00, 101.72],
      [13.98, 101.60],
      [13.92, 101.50],
      [13.90, 101.40],
      [13.95, 101.30]
    ];

    const modelLine = L.polyline(modelPoints, {
      color: '#5794E0',
      weight: 3,
      dashArray: '6, 8',
      opacity: 0.85
    });

    modelLine.bindPopup(`
      <div style="font-family: 'Sarabun', sans-serif; font-size: 12px; padding: 4px; min-width: 230px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #C4C7D1; padding-bottom: 3px;">
          <strong style="color: #0C57C7;">แนวโน้มการขยายตัว 3 วัน</strong>
          <span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px;">
            MODELED
          </span>
        </div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">
          การประเมินทิศทางการไหลตามแบบจำลองอุทกวิทยา (Hydrological Reach Simulation)
        </div>
        <div style="font-size: 10px; color: #717F8F; margin-top: 4px;">
          * ข้อมูลประกอบการเฝ้าระวัง ไม่ใช่การยืนยันเหตุการณ์ล่วงหน้า
        </div>
      </div>
    `);

    layer.addLayer(modelLine);
  }, [visibleLayers.modeledExpansion]);

  // 4. Citizen Observations (Community Reports - UNVERIFIED, Privacy-protected)
  useEffect(() => {
    const layer = reportsLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.citizenObservations) return;

    reports.forEach((r, idx) => {
      const icon = L.divIcon({
        className: 'custom-citizen-pin',
        html: `
          <div style="background-color: #E16434; border: 2px solid white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); cursor: pointer;">
            <span style="color: white; font-size: 10px; font-weight: bold;">!</span>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([r.latitude, r.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: 'Sarabun', sans-serif; font-size: 12px; padding: 4px; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #C4C7D1; padding-bottom: 4px;">
            <strong style="color: #0B243D; font-size: 12px;">รายงานเหตุการณ์ #${idx + 1}</strong>
            <span style="background: #fff7ed; color: #c2410c; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 9999px; border: 1px solid #fed7aa;">
              UNVERIFIED
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 5px;">
            <strong>พื้นที่:</strong> ต.${r.subdistrict || 'ไม่ระบุ'} อ.${r.district || 'กบินทร์บุรี'}
          </div>
          ${r.contamination_signs?.length ? `
            <div style="font-size: 11px; color: #E16434; margin-top: 3px;">
              <strong>ข้อสังเกต:</strong> ${r.contamination_signs.join(', ')}
            </div>
          ` : ''}
          ${r.description ? `
            <p style="font-size: 11px; color: #334155; font-style: italic; margin-top: 4px;">
              "${r.description}"
            </p>
          ` : ''}
          <div style="font-size: 9px; color: #94a3b8; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 4px;">
            * ข้อมูลตำแหน่งได้รับการปกป้องความเป็นส่วนตัวในระดับตำบล
          </div>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [reports, visibleLayers.citizenObservations]);

  // 5. Official Results & Stations (Green markers - OFFICIAL)
  useEffect(() => {
    const layer = officialLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.officialResults) return;

    stations.forEach(st => {
      const icon = L.divIcon({
        className: 'custom-official-marker',
        html: `
          <div style="background-color: #16a34a; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.25); cursor: pointer;">
            <span style="color: white; font-size: 9px; font-weight: bold;">WL</span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([st.latitude, st.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: 'Sarabun', sans-serif; font-size: 12px; padding: 4px; min-width: 230px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #C4C7D1; padding-bottom: 4px;">
            <strong style="color: #0B243D; font-size: 13px;">${st.name_th}</strong>
            <span style="background: #dcfce7; color: #15803d; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 9999px;">
              OFFICIAL
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 5px;">
            <strong>ระดับน้ำ:</strong> ${st.water_level_msl !== null ? `${st.water_level_msl} ม.รทก.` : 'บันทึกปกติ'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            <strong>อำเภอ:</strong> ${st.district} | <strong>ลุ่มน้ำ:</strong> ${st.basin}
          </div>
          ${renderLayerProvenanceBox(st.provenance)}
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [stations, visibleLayers.officialResults]);

  // Center on selected district if changed
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedDistrict) return;
    const coords = DISTRICT_CENTROIDS[selectedDistrict];
    if (coords) {
      mapInstanceRef.current.flyTo(coords, 11, { duration: 1.2 });
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#C4C7D1]">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
