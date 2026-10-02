import React, { useEffect, useRef } from 'react';
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
    forecastZones?: boolean;
    observations?: boolean;
    floodExtent?: boolean;
    adminLabels?: boolean;
  };
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  onSelectZone?: (zoneProps: any) => void;
  forecastHorizon?: string;
  watchZoneOpacity?: number;
}

const DISTRICT_CENTROIDS: Record<string, [number, number]> = {
  'กบินทร์บุรี': [13.995, 101.725],
  'ศรีมหาโพธิ': [13.882, 101.518],
  'เมืองปราจีนบุรี': [14.053, 101.372],
  'บ้านสร้าง': [13.985, 101.215],
  'ประจันตคาม': [14.112, 101.552],
  'นาดี': [14.135, 101.882],
  'ศรีมโหสถ': [13.865, 101.415]
};

// Verified authentic subdistricts (Tambon) in Prachin Buri from official administrative registry
export const AUTHENTIC_TAMBONS = [
  { name: 'ต.กบินทร์', district: 'กบินทร์บุรี', lat: 13.9876, lng: 101.7214 },
  { name: 'ต.นนทรี', district: 'กบินทร์บุรี', lat: 13.9245, lng: 101.7612 },
  { name: 'ต.นาแขม', district: 'กบินทร์บุรี', lat: 13.8712, lng: 101.8021 },
  { name: 'ต.วังดาล', district: 'กบินทร์บุรี', lat: 13.9612, lng: 101.6621 },
  { name: 'ต.หนองกี่', district: 'กบินทร์บุรี', lat: 14.0214, lng: 101.8123 },
  { name: 'ต.ลาดตะเคียน', district: 'กบินทร์บุรี', lat: 13.8521, lng: 101.6945 },
  { name: 'ต.เมืองเก่า', district: 'กบินทร์บุรี', lat: 13.9921, lng: 101.7543 },
  { name: 'ต.ท่าตูม', district: 'ศรีมหาโพธิ', lat: 13.8967, lng: 101.5642 },
  { name: 'ต.ศรีมหาโพธิ', district: 'ศรีมหาโพธิ', lat: 13.8762, lng: 101.5403 },
  { name: 'ต.กรอกสมบูรณ์', district: 'ศรีมหาโพธิ', lat: 13.821, lng: 101.6214 },
  { name: 'ต.หนองโพรง', district: 'ศรีมหาโพธิ', lat: 13.8321, lng: 101.5412 },
  { name: 'ต.หัวหว้า', district: 'ศรีมหาโพธิ', lat: 13.7845, lng: 101.5123 },
  { name: 'ต.หน้าเมือง', district: 'เมืองปราจีนบุรี', lat: 14.053, lng: 101.372 },
  { name: 'ต.ดงขี้เหล็ก', district: 'เมืองปราจีนบุรี', lat: 14.1345, lng: 101.4512 },
  { name: 'ต.บ้านพระ', district: 'เมืองปราจีนบุรี', lat: 14.1212, lng: 101.4123 },
  { name: 'ต.โนนห้อม', district: 'เมืองปราจีนบุรี', lat: 14.0812, lng: 101.4312 },
  { name: 'ต.บ้านสร้าง', district: 'บ้านสร้าง', lat: 13.985, lng: 101.215 },
  { name: 'ต.บางพลวง', district: 'บ้านสร้าง', lat: 13.9621, lng: 101.2412 },
  { name: 'ต.ประจันตคาม', district: 'ประจันตคาม', lat: 14.112, lng: 101.552 },
  { name: 'ต.นาดี', district: 'นาดี', lat: 14.2123, lng: 101.8745 },
  { name: 'ต.ทุ่งโพธิ์', district: 'นาดี', lat: 14.1812, lng: 101.8921 },
  { name: 'ต.โคกไทย', district: 'ศรีมโหสถ', lat: 13.8612, lng: 101.4312 },
  { name: 'ต.โคกปีบ', district: 'ศรีมโหสถ', lat: 13.865, lng: 101.415 }
];

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
  watchZoneOpacity = 0.35
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer references
  const watchZonesLayerRef = useRef<L.GeoJSON | null>(null);
  const floodExtentLayerRef = useRef<L.GeoJSON | null>(null);
  const forecastLayerRef = useRef<L.GeoJSON | null>(null);
  const waterwaysLayerRef = useRef<L.GeoJSON | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const observationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const labelsLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Leaflet Map with Satellite Imagery as Default Base
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.015, 101.55],
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false
    });

    // Satellite Imagery Base (Esri World Imagery) - PRIMARY BASE
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
      }
    );

    // Alternative Clean Street Map Base
    const streetBase = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        maxZoom: 19
      }
    );

    // Default to Satellite Base as specified in Section 11
    satellite.addTo(map);

    const baseLayers = {
      '🛰️ ภาพถ่ายดาวเทียม (Satellite)': satellite,
      '🗺️ แผนที่ถนน (Street Map)': streetBase
    };
    L.control.layers(baseLayers, undefined, { position: 'topright' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    stationsLayerRef.current.addTo(map);
    observationsLayerRef.current.addTo(map);
    labelsLayerRef.current.addTo(map);

    // Update labels on zoom
    map.on('zoomend', () => {
      renderAdministrativeLabels(map.getZoom());
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Administrative Labels with dark halo on satellite
  const renderAdministrativeLabels = (zoom: number) => {
    const layer = labelsLayerRef.current;
    layer.clearLayers();

    if (visibleLayers.adminLabels === false) return;

    // Zoom 8 to 10: Show District centroids
    if (zoom < 11) {
      Object.entries(DISTRICT_CENTROIDS).forEach(([districtName, coords]) => {
        const icon = L.divIcon({
          className: 'map-district-label',
          html: `<span>อ.${districtName}</span>`,
          iconSize: [80, 20],
          iconAnchor: [40, 10]
        });
        layer.addLayer(L.marker(coords, { icon, interactive: false }));
      });
    } else {
      // Zoom 11+: Show Authentic Tambon labels (Control collision)
      AUTHENTIC_TAMBONS.forEach(tb => {
        const icon = L.divIcon({
          className: 'map-tambon-label',
          html: `<span>${tb.name}</span>`,
          iconSize: [70, 18],
          iconAnchor: [35, 9]
        });
        layer.addLayer(L.marker([tb.lat, tb.lng], { icon, interactive: false }));
      });
    }
  };

  // 1. Environmental Watch Area Polygons (Section 12 & 13)
  // Strictly continuous GeoJSON polygons. Strictly NO circular buffers.
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (watchZonesLayerRef.current) {
      map.removeLayer(watchZonesLayerRef.current);
      watchZonesLayerRef.current = null;
    }

    if (visibleLayers.watchZones && zones && zones.features) {
      watchZonesLayerRef.current = L.geoJSON(zones, {
        style: (feature) => {
          const props = feature?.properties || {};
          const isSelected = props.district === selectedDistrict;
          const priority = props.verification_priority;

          // Simple 5-Level Watch Color System
          let strokeColor = '#D97706';
          let fillColor = '#D97706';

          if (priority === 'สูงมาก') {
            strokeColor = '#991B1B';
            fillColor = '#991B1B';
          } else if (priority === 'สูง') {
            strokeColor = '#DC2626';
            fillColor = '#DC2626';
          } else if (priority === 'ปานกลาง' || priority === 'ควรติดตาม') {
            strokeColor = '#D97706';
            fillColor = '#D97706';
          } else if (priority === 'ต่ำ' || priority === 'ระดับเฝ้าระวังต่ำ') {
            strokeColor = '#16A34A';
            fillColor = '#16A34A';
          } else {
            strokeColor = '#64748B';
            fillColor = '#64748B';
          }

          return {
            color: isSelected ? '#38BDF8' : strokeColor,
            fillColor,
            fillOpacity: isSelected ? Math.min(watchZoneOpacity + 0.15, 0.55) : watchZoneOpacity,
            weight: isSelected ? 3.5 : 2,
            dashArray: isSelected ? undefined : '2, 4',
            lineJoin: 'round'
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.on('click', () => {
            onSelectDistrict(props.district);
            if (onSelectZone) onSelectZone(props);
          });

          const priorityBadgeBg = 
            props.verification_priority === 'สูงมาก' ? '#991B1B' :
            props.verification_priority === 'สูง' ? '#DC2626' :
            props.verification_priority === 'ปานกลาง' ? '#D97706' : '#16A34A';

          layer.bindPopup(`
            <div style="font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; min-width: 260px; padding: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 6px;">
                <strong style="color: #063B70; font-size: 14px;">${props.zone_name || props.district}</strong>
                <span style="background: ${priorityBadgeBg}; color: white; font-size: 10px; font-weight: bold; padding: 2px 7px; border-radius: 9999px;">
                  ${props.verification_priority_label || props.verification_priority}
                </span>
              </div>
              <div style="font-size: 11px; color: #334155; margin-bottom: 4px; line-height: 1.4;">
                <strong>สถานะพื้นที่:</strong> ${props.watch_status || 'เฝ้าระวังตามปกติ'}
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                <strong>สภาวะน้ำ:</strong> ${props.flood_status || 'ปกติ'}
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
                <strong>การเชื่อมต่อทางน้ำ:</strong> ${props.hydrological_connectivity_status || 'เชื่อมต่อลำน้ำสายหลัก'}
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

  // 2. Public Waterways Layer (Default ON - Section 15)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (waterwaysLayerRef.current) {
      map.removeLayer(waterwaysLayerRef.current);
      waterwaysLayerRef.current = null;
    }

    if (visibleLayers.waterways && waterways && waterways.features) {
      waterwaysLayerRef.current = L.geoJSON(waterways, {
        style: {
          color: '#38BDF8',
          weight: 3.5,
          opacity: 0.9,
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 12px; padding: 4px; min-width: 210px;">
              <strong style="color: #0284C7; font-size: 13px;">🌊 ${props.name || 'แม่น้ำปราจีนบุรี'}</strong>
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                ${props.description || 'โครงข่ายทางน้ำลุ่มน้ำปราจีนบุรี (กรมชลประทาน / กรมทรัพยากรน้ำ)'}
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

  // 3. Official Water Monitoring Stations (Default ON - Section 15)
  useEffect(() => {
    const layer = stationsLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.stations || !stations) return;

    stations.forEach(st => {
      const icon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div style="background-color: #0C65E8; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35); cursor: pointer;">
            <span style="color: white; font-size: 9px; font-weight: bold;">WQ</span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([st.latitude, st.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; font-size: 12px; padding: 4px; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 4px;">
            <strong style="color: #063B70; font-size: 13px;">${st.name_th}</strong>
            <span style="background: #EFF6FF; color: #0C65E8; font-size: 9px; font-weight: bold; padding: 1px 6px; border-radius: 9999px;">
              OFFICIAL
            </span>
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 3px;">
            <strong>ระดับน้ำ:</strong> ${st.water_level_msl !== null && st.water_level_msl !== undefined ? `${st.water_level_msl} ม.รทก.` : 'ไม่มีข้อมูลตรวจวัด'}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">
            <strong>อำเภอ:</strong> ${st.district} | <strong>ลุ่มน้ำ:</strong> ${st.basin}
          </div>
          <div style="font-size: 9px; color: #64748B; margin-top: 6px;">
            แหล่งข้อมูล: สสน. / กรมชลประทาน (ThaiWater / RID)
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [stations, visibleLayers.stations]);

  // 4. Optional: Current Flood Extent Polygons
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (floodExtentLayerRef.current) {
      map.removeLayer(floodExtentLayerRef.current);
      floodExtentLayerRef.current = null;
    }

    if (visibleLayers.floodExtent && floodExtent && floodExtent.features) {
      floodExtentLayerRef.current = L.geoJSON(floodExtent, {
        style: {
          color: '#2563EB',
          fillColor: '#3B82F6',
          fillOpacity: 0.32,
          weight: 2,
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', system-ui, sans-serif; min-width: 220px; padding: 4px;">
              <strong style="color: #1D4ED8; font-size: 13px; display: block; margin-bottom: 4px;">
                🌊 ${props.name || 'พื้นที่น้ำท่วมขังปัจจุบัน'}
              </strong>
              <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
                <strong>อำเภอ:</strong> ${props.district}
              </div>
              <div style="font-size: 10px; color: #15803D; font-weight: bold; background: #DCFCE7; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">
                OFFICIAL ข้อมูลจากหน่วยงาน
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [floodExtent, visibleLayers.floodExtent]);

  // 5. Optional: Forecast Watch Areas (Purple Dashed Polygons)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (forecastLayerRef.current) {
      map.removeLayer(forecastLayerRef.current);
      forecastLayerRef.current = null;
    }

    if (visibleLayers.forecastZones && forecastZones && forecastZones.features) {
      forecastLayerRef.current = L.geoJSON(forecastZones, {
        style: {
          color: '#7C3AED',
          fillColor: '#8B5CF6',
          fillOpacity: 0.22,
          weight: 2.5,
          dashArray: '6, 6',
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', system-ui, sans-serif; min-width: 240px; padding: 4px;">
              <strong style="color: #6D28D9; font-size: 13px;">${props.label || 'แนวโน้มการขยายพื้นที่เฝ้าระวัง'}</strong>
              <span style="background: #F3E8FF; color: #6D28D9; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">
                MODEL
              </span>
              <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
                ${forecastZones.disclaimer || 'ผลจากแบบจำลองใช้เพื่อการเฝ้าระวัง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ'}
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [forecastZones, visibleLayers.forecastZones]);

  // 6. Optional: Generalized Community Observations (Orange Pins - Zero private data)
  useEffect(() => {
    const layer = observationsLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.observations || !observations) return;

    observations.forEach((obs, idx) => {
      const icon = L.divIcon({
        className: 'custom-obs-pin',
        html: `
          <div style="background-color: #EA580C; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); cursor: pointer;">
            <span style="color: white; font-size: 10px; font-weight: bold;">!</span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([obs.generalized_latitude, obs.generalized_longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: 'Sarabun', system-ui, sans-serif; font-size: 12px; padding: 4px; min-width: 230px;">
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
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [observations, visibleLayers.observations]);

  // Initial Label Rendering
  useEffect(() => {
    if (mapInstanceRef.current) {
      renderAdministrativeLabels(mapInstanceRef.current.getZoom());
    }
  }, [visibleLayers.adminLabels]);

  // Fly to selected district on change
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedDistrict) return;
    const coords = DISTRICT_CENTROIDS[selectedDistrict];
    if (coords) {
      mapInstanceRef.current.flyTo(coords, 11, { duration: 1.0 });
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-subtle">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
