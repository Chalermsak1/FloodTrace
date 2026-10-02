import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface ContinuousMapViewProps {
  zones: any; // GeoJSON FeatureCollection of Environmental Watch Areas
  floodExtent: any; // GeoJSON FeatureCollection of Current Flood Extent
  forecastZones: any; // GeoJSON FeatureCollection of Modeled Forecast Watch Areas
  waterways: any; // GeoJSON FeatureCollection of Public Waterways
  stations: any[]; // Hydrological monitoring stations
  observations: any[]; // Generalized community observations
  visibleLayers: {
    watchZones: boolean;
    floodExtent: boolean;
    forecastZones: boolean;
    waterways: boolean;
    stations: boolean;
    observations: boolean;
  };
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  onSelectZone?: (zoneProps: any) => void;
  forecastHorizon?: string;
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
  onSelectZone
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer references for continuous GIS visualization
  const watchZonesLayerRef = useRef<L.GeoJSON | null>(null);
  const floodExtentLayerRef = useRef<L.GeoJSON | null>(null);
  const forecastLayerRef = useRef<L.GeoJSON | null>(null);
  const waterwaysLayerRef = useRef<L.GeoJSON | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const observationsLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.015, 101.55],
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false
    });

    // Satellite Imagery Base
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
      }
    );

    // Carto Voyager Street Map Base
    const streetBase = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        maxZoom: 19
      }
    );

    // Default to clean Street Base or Satellite
    satellite.addTo(map);

    const baseLayers = {
      '🛰️ ภาพถ่ายดาวเทียม (Satellite)': satellite,
      '🗺️ แผนที่ภูมิประเทศ (Carto)': streetBase
    };
    L.control.layers(baseLayers, undefined, { position: 'topright' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    stationsLayerRef.current.addTo(map);
    observationsLayerRef.current.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 1. Environmental Watch Area Layer (Continuous GeoJSON Polygons - Yellow / Orange / Red)
  // Strictly NO circles. Red means Higher Priority for Verification, NOT Toxic Concentration.
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

          // Color progression: Light Yellow -> Orange -> Red
          let color = '#CA8A04'; // Low (ต่ำ)
          let fillColor = '#FACC15';
          if (priority === 'สูง') {
            color = '#DC2626';
            fillColor = '#EF4444';
          } else if (priority === 'ปานกลาง') {
            color = '#EA580C';
            fillColor = '#F97316';
          }

          return {
            color: isSelected ? '#1E3A8A' : color,
            fillColor,
            fillOpacity: isSelected ? 0.38 : (props.fill_opacity || 0.22),
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

          const badgeBg = props.verification_priority === 'สูง' ? '#fee2e2' : props.verification_priority === 'ปานกลาง' ? '#ffedd5' : '#fef9c3';
          const badgeText = props.verification_priority === 'สูง' ? '#991b1b' : props.verification_priority === 'ปานกลาง' ? '#9a3412' : '#854d0e';

          layer.bindPopup(`
            <div style="font-family: 'Sarabun', system-ui, sans-serif; min-width: 250px; padding: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 6px;">
                <strong style="color: #0F172A; font-size: 13px;">${props.zone_name || props.district}</strong>
                <span style="background: ${badgeBg}; color: ${badgeText}; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 9999px;">
                  ${props.verification_priority_label}
                </span>
              </div>
              <div style="font-size: 11px; color: #334155; margin-bottom: 4px; line-height: 1.4;">
                <strong>สถานะพื้นที่:</strong> ${props.watch_status}
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                <strong>สถานการณ์น้ำ:</strong> ${props.flood_status}
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                <strong>การเชื่อมต่อทางน้ำ:</strong> ${props.hydrological_connectivity_status}
              </div>
              <div style="font-size: 10px; color: #64748B; background: #F8FAFC; padding: 4px 6px; border-radius: 6px; border: 1px solid #E2E8F0; margin-top: 6px; line-height: 1.3;">
                ${props.verification_priority_explanation}
              </div>
              <div style="font-size: 9px; color: #94A3B8; margin-top: 4px;">
                * ป้าย: ${props.badge || 'MODEL'} (ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ)
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [zones, visibleLayers.watchZones, selectedDistrict, onSelectDistrict, onSelectZone]);

  // 2. Current Flood Extent Layer (Semi-transparent Blue Continuous Polygon)
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
          fillOpacity: 0.35,
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
              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                <strong>ประมาณการระดับน้ำ:</strong> ${props.water_depth_est || 'ท่วมขังริมตลิ่ง'}
              </div>
              <div style="font-size: 10px; color: #15803D; font-weight: bold; background: #DCFCE7; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                OFFICIAL ข้อมูลจากหน่วยงาน
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [floodExtent, visibleLayers.floodExtent]);

  // 3. Forecast Watch Area Layer (Dashed purple polygon - distinct from current)
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
          fillOpacity: 0.16,
          weight: 2.5,
          dashArray: '6, 6',
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', system-ui, sans-serif; min-width: 240px; padding: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 4px;">
                <strong style="color: #6D28D9; font-size: 13px;">${props.label || 'แนวโน้มการขยายพื้นที่เฝ้าระวัง'}</strong>
                <span style="background: #F3E8FF; color: #6D28D9; font-size: 10px; font-weight: bold; padding: 1px 5px; border-radius: 4px;">
                  MODEL
                </span>
              </div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
                ${forecastZones.disclaimer || 'แนวโน้มที่แสดงเป็นผลจากแบบจำลองการขยายพื้นที่เฝ้าระวัง ไม่ใช่การคาดการณ์ตำแหน่งหรือการเคลื่อนที่ของสารปนเปื้อน และไม่ใช่ผลตรวจทางห้องปฏิบัติการ'}
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [forecastZones, visibleLayers.forecastZones]);

  // 4. Public Waterways Layer (DWR/RID GeoJSON LineStrings)
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
          color: '#0284C7',
          weight: 3.5,
          opacity: 0.85,
          lineJoin: 'round'
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(`
            <div style="font-family: 'Sarabun', system-ui, sans-serif; font-size: 12px; padding: 4px; min-width: 200px;">
              <strong style="color: #0369A1; font-size: 13px;">${props.name || 'ทางน้ำสายหลัก'}</strong>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                ${props.description || 'โครงข่ายทางน้ำลุ่มน้ำปราจีนบุรี (กรมทรัพยากรน้ำ / กรมชลประทาน)'}
              </div>
              <div style="font-size: 9px; color: #16A34A; font-weight: bold; margin-top: 4px;">
                OFFICIAL ข้อมูลจากหน่วยงาน
              </div>
            </div>
          `);
        }
      }).addTo(map);
    }
  }, [waterways, visibleLayers.waterways]);

  // 5. Public Telemetry Monitoring Stations (Gauges - Green Pins)
  useEffect(() => {
    const layer = stationsLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.stations || !stations) return;

    stations.forEach(st => {
      const icon = L.divIcon({
        className: 'custom-station-pin',
        html: `
          <div style="background-color: #10B981; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.25); cursor: pointer;">
            <span style="color: white; font-size: 9px; font-weight: bold;">WL</span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const rawTs = (st.provenance as any)?.source_updated_at || st.last_updated;
      const obsTimeStr = rawTs
        ? new Date(rawTs).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) + ' น.'
        : null;

      const marker = L.marker([st.latitude, st.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: 'Sarabun', system-ui, sans-serif; font-size: 12px; padding: 4px; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 4px;">
            <strong style="color: #0F172A; font-size: 13px;">${st.name_th}</strong>
            <span style="background: #DCFCE7; color: #15803D; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 4px;">
              OFFICIAL
            </span>
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
            <strong>ระดับน้ำ:</strong> ${st.water_level_msl !== null && st.water_level_msl !== undefined ? `${st.water_level_msl} ม.รทก.` : 'ไม่มีข้อมูลตรวจวัด'}
          </div>
          ${obsTimeStr ? `
          <div style="font-size: 11px; color: #0284C7; margin-bottom: 2px;">
            <strong>เวลาตรวจวัด:</strong> ${obsTimeStr} (Asia/Bangkok)
          </div>` : ''}
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>อำเภอ:</strong> ${st.district} | <strong>ลุ่มน้ำ:</strong> ${st.basin}
          </div>
          <div style="font-size: 9px; color: #64748B; margin-top: 4px;">
            แหล่งข้อมูล: สสน. / กรมชลประทาน (ThaiWater / RID)
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [stations, visibleLayers.stations]);

  // 6. Generalized Community Observations (No exact GPS - Orange/Amber Pins)
  useEffect(() => {
    const layer = observationsLayerRef.current;
    layer.clearLayers();

    if (!visibleLayers.observations || !observations) return;

    observations.forEach((obs, idx) => {
      const icon = L.divIcon({
        className: 'custom-obs-pin',
        html: `
          <div style="background-color: #F97316; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;">
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
            <strong style="color: #9A3412; font-size: 12px;">ข้อสังเกต #${idx + 1}</strong>
            <span style="background: #FFEDD5; color: #9A3412; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 4px;">
              COMMUNITY
            </span>
          </div>
          <div style="font-size: 11px; color: #0F172A; font-weight: bold; margin-bottom: 2px;">
            หมวดหมู่: ${obs.category}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            พื้นที่: ${obs.generalized_location}
          </div>
          <div style="font-size: 10px; color: #64748B; margin-top: 4px; line-height: 1.3; background: #F8FAFC; padding: 4px 6px; border-radius: 4px;">
            ${obs.classification_explanation || 'รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน'}
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [observations, visibleLayers.observations]);

  // Fly to selected district on change
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedDistrict) return;
    const coords = DISTRICT_CENTROIDS[selectedDistrict];
    if (coords) {
      mapInstanceRef.current.flyTo(coords, 11, { duration: 1.0 });
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
