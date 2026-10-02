import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  Droplets, 
  Calendar, 
  CheckCircle2, 
  HelpCircle,
  Eye,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { ContinuousMapView } from '../components/map/ContinuousMapView';

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

const TIMELINE_HORIZONS = [
  { id: 'now', label: 'ขณะนี้', sub: 'สภาวะปัจจุบัน' },
  { id: '6h', label: '+6 ชม.', sub: 'ระยะสั้น' },
  { id: '12h', label: '+12 ชม.', sub: '12 ชั่วโมง' },
  { id: '24h', label: '+24 ชม.', sub: '24 ชั่วโมง' },
  { id: '3d', label: '3 วัน', sub: 'ระยะกลาง' },
  { id: '7d', label: '7 วัน', sub: 'พื้นที่ควรติดตามล่วงหน้า' }
];

export const MapPage: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('กบินทร์บุรี');
  const [selectedHorizon, setSelectedHorizon] = useState<string>('now');

  // GIS Data States
  const [zones, setZones] = useState<any>(null);
  const [floodExtent, setFloodExtent] = useState<any>(null);
  const [forecastZones, setForecastZones] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [selectedZoneData, setSelectedZoneData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Layer toggles
  const [visibleLayers, setVisibleLayers] = useState({
    watchZones: true,
    floodExtent: true,
    forecastZones: true,
    waterways: true,
    stations: true,
    observations: true
  });

  const toggleLayer = (key: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Fetch all GIS layers from Public API
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/zones').then(r => r.json()).catch(() => null),
      fetch('/api/public/flood-extent').then(r => r.json()).catch(() => null),
      fetch(`/api/public/forecast-zones?horizon=${selectedHorizon}`).then(r => r.json()).catch(() => null),
      fetch('/api/public/waterways').then(r => r.json()).catch(() => null),
      fetch('/api/public/stations').then(r => r.json()).catch(() => []),
      fetch('/api/public/observations').then(r => r.json()).catch(() => [])
    ]).then(([zonesRes, floodRes, forecastRes, waterRes, stationsRes, obsRes]) => {
      setZones(zonesRes);
      setFloodExtent(floodRes);
      setForecastZones(forecastRes);
      setWaterways(waterRes);
      setStations(Array.isArray(stationsRes) ? stationsRes : []);
      setObservations(Array.isArray(obsRes) ? obsRes : []);
      
      if (zonesRes?.features) {
        const found = zonesRes.features.find((f: any) => f.properties.district === selectedDistrict);
        if (found) setSelectedZoneData(found.properties);
      }
      setLoading(false);
    });
  }, [selectedHorizon, selectedDistrict]);

  const handleSelectDistrict = (d: string) => {
    setSelectedDistrict(d);
    if (zones?.features) {
      const found = zones.features.find((f: any) => f.properties.district === d);
      if (found) setSelectedZoneData(found.properties);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner / Disclaimer */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0C57C7] flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              แผนที่เฝ้าระวังด้านสิ่งแวดล้อม (Environmental Watch Map)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงขอบเขตพื้นที่น้ำท่วมปัจจุบันและพื้นที่เฝ้าระวังเชิงพื้นที่แบบต่อเนื่อง (Continuous Area Visualization)
            </p>
          </div>
        </div>

        {/* District Quick Switcher */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">อำเภอ:</span>
          {PRACHIN_DISTRICTS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleSelectDistrict(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] transition-colors ${
                selectedDistrict === d
                  ? 'bg-[#0C57C7] text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Layout: Desktop 70/30 split | Mobile vertical stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Map Container (Desktop: ~70% -> 8 or 9 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3 min-h-[520px] sm:min-h-[580px] lg:h-[680px]">
          <div className="flex-1 relative rounded-2xl overflow-hidden shadow-xs border border-slate-200">
            <ContinuousMapView
              zones={zones}
              floodExtent={floodExtent}
              forecastZones={forecastZones}
              waterways={waterways}
              stations={stations}
              observations={observations}
              visibleLayers={visibleLayers}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={handleSelectDistrict}
              onSelectZone={(props) => setSelectedZoneData(props)}
              forecastHorizon={selectedHorizon}
            />
          </div>

          {/* Timeline Bar (Forecast Timeline) */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Clock className="w-4 h-4 text-[#0C57C7]" />
                <span>แนวโน้มการขยายพื้นที่เฝ้าระวัง (Watch Area Horizon):</span>
              </div>
              <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                MODEL แบบจำลอง
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TIMELINE_HORIZONS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHorizon(h.id)}
                  className={`py-2 px-2 rounded-xl text-center transition-all min-h-[44px] flex flex-col justify-center items-center ${
                    selectedHorizon === h.id
                      ? 'bg-purple-600 text-white font-bold shadow-xs scale-102'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <span className="text-xs">{h.label}</span>
                  <span className={`text-[10px] ${selectedHorizon === h.id ? 'text-purple-200' : 'text-slate-400'}`}>
                    {h.sub}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 mt-2.5 px-1 leading-relaxed">
              * {forecastZones?.disclaimer || 'แนวโน้มที่แสดงเป็นผลจากแบบจำลองการขยายพื้นที่เฝ้าระวัง ไม่ใช่การคาดการณ์ตำแหน่งหรือการเคลื่อนที่ของสารปนเปื้อน และไม่ใช่ผลตรวจทางห้องปฏิบัติการ'}
            </p>
          </div>
        </div>

        {/* Right Info Panels (Desktop: ~30% -> 4 cols | Mobile: stacks below map) */}
        <div className="lg:col-span-4 flex flex-col gap-4 lg:h-[680px] lg:overflow-y-auto pr-0 lg:pr-1">
          
          {/* Layer Control Panel */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Layers className="w-4 h-4 text-[#0C57C7]" />
                <span>ชั้นข้อมูลแผนที่ (Map Layers)</span>
              </div>
              <span className="text-[11px] text-slate-400">ควบคุมการแสดงผล</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-red-500/30 border border-red-500" />
                  <span className="text-xs font-semibold text-slate-700">พื้นที่เฝ้าระวังสิ่งแวดล้อม (Watch Area)</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleLayers.watchZones}
                  onChange={() => toggleLayer('watchZones')}
                  className="w-4 h-4 text-[#0C57C7] rounded-md focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-blue-500/40 border border-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">พื้นที่น้ำท่วมปัจจุบัน (GISTDA/RID)</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleLayers.floodExtent}
                  onChange={() => toggleLayer('floodExtent')}
                  className="w-4 h-4 text-[#0C57C7] rounded-md focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-purple-500/30 border border-purple-500 border-dashed" />
                  <span className="text-xs font-semibold text-slate-700">แนวโน้มการขยายพื้นที่เฝ้าระวัง (Forecast)</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleLayers.forecastZones}
                  onChange={() => toggleLayer('forecastZones')}
                  className="w-4 h-4 text-[#0C57C7] rounded-md focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-1 bg-sky-500 rounded-full" />
                  <span className="text-xs font-semibold text-slate-700">โครงข่ายแม่น้ำและคลอง (Waterways)</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleLayers.waterways}
                  onChange={() => toggleLayer('waterways')}
                  className="w-4 h-4 text-[#0C57C7] rounded-md focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white" />
                  <span className="text-xs font-semibold text-slate-700">สถานีตรวจวัดโทรมาตร (Stations)</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleLayers.stations}
                  onChange={() => toggleLayer('stations')}
                  className="w-4 h-4 text-[#0C57C7] rounded-md focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors min-h-[44px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-white" />
                  <span className="text-xs font-semibold text-slate-700">ข้อสังเกตจากประชาชน (Observations)</span>
                </div>
                <input
                  type="checkbox"
                  checked={visibleLayers.observations}
                  onChange={() => toggleLayer('observations')}
                  className="w-4 h-4 text-[#0C57C7] rounded-md focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* Area Summary Panel */}
          {selectedZoneData ? (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedZoneData.zone_name}</h3>
                  <p className="text-xs text-slate-500">อำเภอ{selectedZoneData.district}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedZoneData.verification_priority === 'สูง'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : selectedZoneData.verification_priority === 'ปานกลาง'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {selectedZoneData.verification_priority_label}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">สถานะพื้นที่: </span>
                  <span className="font-semibold text-slate-800">{selectedZoneData.watch_status}</span>
                </div>
                <div>
                  <span className="text-slate-500">สถานการณ์น้ำ: </span>
                  <span className="font-semibold text-slate-800">{selectedZoneData.flood_status}</span>
                </div>
                <div>
                  <span className="text-slate-500">การเชื่อมต่อทางน้ำ: </span>
                  <span className="font-semibold text-slate-800">{selectedZoneData.hydrological_connectivity_status}</span>
                </div>
                <div>
                  <span className="text-slate-500">รายงานข้อสังเกต: </span>
                  <span className="font-semibold text-slate-800">{selectedZoneData.community_observation_count} รายการ</span>
                </div>
              </div>

              {/* Why This Area? Mini Box */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-1.5">ทำไมพื้นที่นี้จึงถูกเฝ้าระวัง?</span>
                <div className="space-y-1">
                  {selectedZoneData.why_this_area?.map((w: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-2.5 bg-slate-50 rounded-xl text-[10px] text-slate-500 leading-relaxed border border-slate-100">
                {selectedZoneData.verification_priority_explanation}
              </div>
            </div>
          ) : null}

        </div>

      </div>

    </div>
  );
};
