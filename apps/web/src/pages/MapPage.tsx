import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  MapPin, 
  Compass, 
  Sliders, 
  Info, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle, 
  ShieldCheck, 
  Droplets, 
  Clock, 
  Eye, 
  FileText,
  SlidersHorizontal,
  ChevronDown
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

export const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const districtParam = searchParams.get('district') || 'กบินทร์บุรี';

  const [selectedDistrict, setSelectedDistrict] = useState<string>(districtParam);
  const [selectedZoneData, setSelectedZoneData] = useState<any>(null);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(true);
  const [showMobilePanel, setShowMobilePanel] = useState<boolean>(false);
  const [watchZoneOpacity, setWatchZoneOpacity] = useState<number>(0.35);

  // GIS Data States
  const [zones, setZones] = useState<any>(null);
  const [floodExtent, setFloodExtent] = useState<any>(null);
  const [forecastZones, setForecastZones] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Section 15: Clean Layer Toggles (Default ON vs Optional)
  const [visibleLayers, setVisibleLayers] = useState({
    watchZones: true,     // DEFAULT ON
    waterways: true,      // DEFAULT ON
    stations: true,       // DEFAULT ON
    adminLabels: true,    // DEFAULT ON (Tambon / District names)
    forecastZones: false, // OPTIONAL
    observations: false,  // OPTIONAL
    floodExtent: false,   // OPTIONAL
  });

  const [showOptionalLayers, setShowOptionalLayers] = useState<boolean>(false);

  const toggleLayer = (key: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (districtParam && PRACHIN_DISTRICTS.includes(districtParam)) {
      setSelectedDistrict(districtParam);
    }
  }, [districtParam]);

  // Fetch GIS Layers from Public API
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/zones').then(r => r.json()).catch(() => null),
      fetch('/api/public/flood-extent').then(r => r.json()).catch(() => null),
      fetch('/api/public/forecast-zones?horizon=now').then(r => r.json()).catch(() => null),
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
        if (found) {
          setSelectedZoneData(found.properties);
        }
      }
      setLoading(false);
    });
  }, []);

  const handleSelectDistrict = (d: string) => {
    setSelectedDistrict(d);
    if (zones?.features) {
      const found = zones.features.find((f: any) => f.properties.district === d);
      if (found) {
        setSelectedZoneData(found.properties);
        setShowMobilePanel(true);
      }
    }
  };

  const handleSelectZone = (props: any) => {
    setSelectedZoneData(props);
    setSelectedDistrict(props.district);
    setShowMobilePanel(true);
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'สูงมาก') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (priority === 'สูง') return 'bg-red-50 text-red-700 border-red-200';
    if (priority === 'ปานกลาง' || priority === 'ควรติดตาม') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4 space-y-4">
      
      {/* 1. Page Header (Title + Subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#063B70] tracking-tight">
            แผนที่เฝ้าระวังความเสี่ยงการปนเปื้อน
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
            ดูพื้นที่ที่ควรเฝ้าระวังจากข้อมูลสิ่งแวดล้อม การไหลของน้ำ ผลตรวจจากหน่วยงาน และรายงานจากประชาชน
          </p>
        </div>

        {/* Quick District Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-400 shrink-0">เลือกอำเภอ:</span>
          {PRACHIN_DISTRICTS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleSelectDistrict(d)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 transition-colors ${
                selectedDistrict === d
                  ? 'bg-[#063B70] text-white font-bold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Map Canvas Container (Occupies 75-80% visual area) */}
      <div className="relative w-full h-[620px] sm:h-[680px] lg:h-[720px] rounded-3xl overflow-hidden border border-slate-200 shadow-subtle bg-slate-900">
        
        {/* Full-bleed Leaflet Map */}
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
          onSelectZone={handleSelectZone}
          watchZoneOpacity={watchZoneOpacity}
        />

        {/* Floating Compact Layer Control (Top Left) */}
        <div className="absolute top-4 left-4 z-[400] max-w-[280px] w-full">
          {showLayerPanel ? (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xl space-y-3 animate-fadeIn text-[#073967]">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0C65E8]" />
                  <span className="font-bold text-xs text-[#063B70]">ชั้นข้อมูลแผนที่</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLayerPanel(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ย่อ ✕
                </button>
              </div>

              {/* Core Default ON Layers */}
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-[#DC2626] opacity-80 inline-block"></span>
                    <span className="font-medium text-slate-800">พื้นที่เฝ้าระวังการปนเปื้อน</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.watchZones}
                    onChange={() => toggleLayer('watchZones')}
                    className="rounded text-[#0C65E8] focus:ring-0 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-1 bg-[#38BDF8] inline-block"></span>
                    <span className="font-medium text-slate-800">แม่น้ำและคลอง</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.waterways}
                    onChange={() => toggleLayer('waterways')}
                    className="rounded text-[#0C65E8] focus:ring-0 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0C65E8] inline-block"></span>
                    <span className="font-medium text-slate-800">จุดตรวจคุณภาพน้ำ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.stations}
                    onChange={() => toggleLayer('stations')}
                    className="rounded text-[#0C65E8] focus:ring-0 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold">Aa</span>
                    <span className="font-medium text-slate-800">ชื่อตำบล / อำเภอ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleLayers.adminLabels}
                    onChange={() => toggleLayer('adminLabels')}
                    className="rounded text-[#0C65E8] focus:ring-0 w-4 h-4"
                  />
                </label>
              </div>

              {/* Opacity Slider for Watch Areas */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>ความโปร่งใสของสี:</span>
                  <span className="font-bold">{Math.round(watchZoneOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.65"
                  step="0.05"
                  value={watchZoneOpacity}
                  onChange={(e) => setWatchZoneOpacity(parseFloat(e.target.value))}
                  className="w-full accent-[#0C65E8] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Optional Grouped Layers */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOptionalLayers(!showOptionalLayers)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#0C65E8] hover:underline py-1"
                >
                  <span>ข้อมูลเพิ่มเติม ({visibleLayers.forecastZones || visibleLayers.observations || visibleLayers.floodExtent ? 'เปิดใช้งาน' : 'ปิดอยู่'})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOptionalLayers ? 'rotate-180' : ''}`} />
                </button>

                {showOptionalLayers && (
                  <div className="space-y-1.5 pt-2 text-xs">
                    <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 border border-purple-500 border-dashed inline-block"></span>
                        <span className="text-slate-700">แนวโน้มพื้นที่ล่วงหน้า</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={visibleLayers.forecastZones}
                        onChange={() => toggleLayer('forecastZones')}
                        className="rounded text-[#0C65E8] focus:ring-0 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                        <span className="text-slate-700">รายงานจากประชาชน</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={visibleLayers.observations}
                        onChange={() => toggleLayer('observations')}
                        className="rounded text-[#0C65E8] focus:ring-0 w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-blue-500 inline-block"></span>
                        <span className="text-slate-700">พื้นที่น้ำท่วมขัง</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={visibleLayers.floodExtent}
                        onChange={() => toggleLayer('floodExtent')}
                        className="rounded text-[#0C65E8] focus:ring-0 w-4 h-4"
                      />
                    </label>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLayerPanel(true)}
              className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-[#063B70] flex items-center gap-2 hover:bg-white"
            >
              <Layers className="w-4 h-4 text-[#0C65E8]" />
              <span>ชั้นข้อมูล</span>
            </button>
          )}
        </div>

        {/* Floating Compact Legend (Bottom Left - Section 14) */}
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2.5 border border-slate-200 shadow-lg text-[#073967] max-w-[340px]">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="font-bold text-xs text-[#063B70]">ระดับการเฝ้าระวัง</span>
            <div className="group relative flex items-center">
              <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl leading-normal z-50">
                ระดับสีเป็นการประเมินเพื่อการเฝ้าระวัง ไม่ใช่ผลยืนยันการปนเปื้อน
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#991B1B]"></span>
              <span>สูงมาก</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
              <span>สูง</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
              <span>ควรติดตาม</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
              <span>ต่ำ</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]"></span>
              <span>ไม่มีข้อมูล</span>
            </span>
          </div>
        </div>

        {/* Selected Area Panel (Right side ONLY when area is selected - Section 17) */}
        {selectedZoneData && (
          <div className="hidden lg:block absolute top-4 right-4 z-[400] w-[320px] bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-2xl space-y-4 animate-fadeIn text-[#073967]">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  พื้นที่ที่เลือก
                </span>
                <h3 className="font-extrabold text-base text-[#063B70] leading-snug">
                  {selectedZoneData.zone_name || `อำเภอ${selectedZoneData.district}`}
                </h3>
                <span className="text-xs text-slate-500">
                  อ.{selectedZoneData.district} จ.ปราจีนบุรี
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedZoneData(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Watch Level Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">ระดับการเฝ้าระวัง:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityBadgeClass(selectedZoneData.verification_priority)}`}>
                {selectedZoneData.verification_priority_label || selectedZoneData.verification_priority}
              </span>
            </div>

            {/* Why This Area? (3-4 points) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">ทำไมพื้นที่นี้จึงถูกเฝ้าระวัง?</span>
              <div className="space-y-1.5 text-xs text-slate-600">
                {(selectedZoneData.why_this_area || [
                  '✓ อยู่ในแนวพื้นที่ที่แบบจำลองแนะนำให้ติดตาม',
                  '✓ มีความเชื่อมโยงทางน้ำกับพื้นที่เฝ้าระวัง',
                  '○ ยังไม่มีผลตรวจทางห้องปฏิบัติการยืนยัน'
                ]).slice(0, 4).map((r: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-emerald-600 font-bold shrink-0">{r.startsWith('✓') ? '✓' : '○'}</span>
                    <span className="text-[11px] leading-relaxed">{r.replace(/^[✓○]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA: View Area Detail */}
            <Link
              to={`/area-detail?district=${encodeURIComponent(selectedZoneData.district)}`}
              className="w-full py-2.5 px-4 bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-bold rounded-xl text-center transition-colors shadow-xs flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <span>ดูรายละเอียดพื้นที่</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

          </div>
        )}

      </div>

      {/* Mobile Selected Area Bottom Drawer / Sheet */}
      {selectedZoneData && showMobilePanel && (
        <div className="lg:hidden bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3">
          <div className="flex items-start justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-extrabold text-base text-[#063B70]">
                {selectedZoneData.zone_name || `อำเภอ${selectedZoneData.district}`}
              </h3>
              <span className="text-xs text-slate-500">อ.{selectedZoneData.district} จ.ปราจีนบุรี</span>
            </div>
            <button
              type="button"
              onClick={() => setShowMobilePanel(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-semibold">ระดับการเฝ้าระวัง:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityBadgeClass(selectedZoneData.verification_priority)}`}>
              {selectedZoneData.verification_priority_label || selectedZoneData.verification_priority}
            </span>
          </div>

          <Link
            to={`/area-detail?district=${encodeURIComponent(selectedZoneData.district)}`}
            className="w-full py-2.5 px-4 bg-[#0C65E8] text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <span>ดูรายละเอียดพื้นที่ฉบับเต็ม</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

    </div>
  );
};
