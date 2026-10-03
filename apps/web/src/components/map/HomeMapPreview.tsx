import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  ChevronRight, 
  ExternalLink, 
  Layers, 
  MapPin, 
  Info, 
  Plus, 
  Minus, 
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';
import { MapLibreMapView, DISTRICT_CENTROIDS } from './MapLibreMapView';

export const HomeMapPreview: React.FC = () => {
  const navigate = useNavigate();

  // Telemetry & Geospatial Data
  const [monitoringSurface, setMonitoringSurface] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<boolean>(false);

  // Selected Preview Cell / Marker
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('กบินทร์บุรี');
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);

  // Focused layers for Home Page Situational Preview (Section 37)
  const [visibleLayers] = useState({
    monitoringSurface: true,
    waterways: true,
    stations: true,
    rainfallStations: false, // Hidden on home preview to avoid clutter
    observations: true,
    outsideMask: true,
    adminLabels: true,
    roadOverlay: false
  });

  useEffect(() => {
    setLoading(true);
    setMapError(false);

    Promise.all([
      fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/map/boundary').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/waterways').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/stations').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/public/observations').then(r => r.ok ? r.json() : []).catch(() => [])
    ])
      .then(([surfaceRes, boundRes, waterRes, stationsRes, obsRes]) => {
        if (!surfaceRes && !boundRes) {
          setMapError(true);
        } else {
          setMonitoringSurface(surfaceRes);
          setBoundaryData(boundRes);
          setWaterways(waterRes);
          setStations(Array.isArray(stationsRes) ? stationsRes : []);
          setObservations(Array.isArray(obsRes) ? obsRes : []);
        }
        setLoading(false);
      })
      .catch(() => {
        setMapError(true);
        setLoading(false);
      });
  }, []);

  const handleSelectCell = (props: any) => {
    setSelectedCell(props);
    if (props.district) {
      setSelectedDistrict(props.district);
    }
  };

  const handleResetView = () => {
    setSelectedCell(null);
    setTargetCoords([14.05, 101.55]);
  };

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0C65E8] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#0C65E8] tracking-wider uppercase">
              ภาพรวมเชิงพื้นที่ (Spatial Situational Overview)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#063B70] tracking-tight">
            แผนที่เฝ้าระวังสิ่งแวดล้อม
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl leading-relaxed">
            ติดตามพื้นที่ที่ควรได้รับการตรวจสอบ โครงข่ายแม่น้ำสายหลัก และหมุดสังเกตการณ์ในจังหวัดปราจีนบุรี
          </p>
        </div>

        <Link
          to="/map"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-[#0C65E8] border border-[#0C65E8]/30 rounded-xl text-sm font-semibold transition-all shadow-xs shrink-0 self-start sm:self-auto group min-h-[44px]"
        >
          <span>เปิดแผนที่ความเสี่ยงเต็มรูปแบบ</span>
          <ChevronRight className="w-4 h-4 text-[#0C65E8] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Map Container */}
      <div className="relative w-full h-[480px] sm:h-[580px] lg:h-[620px] rounded-3xl overflow-hidden shadow-card border border-slate-200/90 bg-slate-900">
        
        {loading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="bg-white/95 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
              <span className="w-4 h-4 border-2 border-[#0C65E8] border-t-transparent rounded-full animate-spin"></span>
              <span className="text-sm font-semibold text-slate-800">กำลังเชื่อมต่อข้อมูลดาวเทียมและโทรมาตร...</span>
            </div>
          </div>
        )}

        {mapError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center z-20">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
            <h3 className="font-bold text-lg">ไม่สามารถโหลดแผนที่เฝ้าระวังได้ในขณะนี้</h3>
            <p className="text-sm text-slate-400 max-w-md mt-1 mb-4 leading-relaxed">
              ระบบกำลังเชื่อมต่อสถานีโทรมาตรและข้อมูลเชิงพื้นที่ กรุณาลองใหม่อีกครั้ง
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#0C65E8] text-white text-sm font-semibold rounded-xl hover:bg-[#063B70] transition-colors min-h-[44px]"
            >
              โหลดใหม่อีกครั้ง
            </button>
          </div>
        ) : (
          <MapLibreMapView
            monitoringSurface={monitoringSurface}
            boundaryData={boundaryData}
            waterways={waterways}
            stations={stations}
            rainfallStations={[]}
            observations={observations}
            visibleLayers={visibleLayers}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            onSelectCell={handleSelectCell}
            surfaceOpacity={0.35}
            basemap="satellite"
            targetCoords={targetCoords}
          />
        )}

        {/* Floating Top CTA Button on Map (Section 17) */}
        <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-2">
          <Link
            to="/map"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#063B70]/90 hover:bg-[#063B70] text-white text-sm font-semibold shadow-xl border border-white/20 backdrop-blur-md transition-all group hover:scale-[1.02] min-h-[44px]"
          >
            <Compass className="w-4 h-4 text-[#38BDF8]" />
            <span>เปิดแผนที่ความเสี่ยง</span>
            <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white" />
          </Link>
        </div>

        {/* Floating Reset View Button */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={handleResetView}
            title="รีเซ็ตมุมมอง จ.ปราจีนบุรี"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-medium border border-white/15 backdrop-blur-md transition-all shadow-md min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="hidden sm:inline">จ.ปราจีนบุรี</span>
          </button>
        </div>

        {/* Floating Split Map Legend (Section 13, 23, 50.9, 50.10) */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-xl border border-slate-200/90 max-w-[320px] sm:max-w-sm animate-fadeIn space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">คำอธิบายสัญลักษณ์ (Map Legends)</span>
            <span className="text-2xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">จ.ปราจีนบุรี</span>
          </div>

          {/* LEGEND A */}
          <div className="space-y-1">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
              ระดับความสำคัญในการเฝ้าระวัง (Priority Surface)
            </span>
            <div className="grid grid-cols-5 gap-1 text-center">
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#DC2626] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">สูงมาก</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#EA580C] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">สูง</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#EAB308] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">ปานกลาง</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">ต่ำ</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#64748B] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">ไม่มีข้อมูล</span>
              </div>
            </div>
          </div>

          {/* LEGEND B */}
          <div className="space-y-1 pt-1.5 border-t border-slate-100">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
              ข้อมูลบนแผนที่ (Map Markers)
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] shrink-0"></span>
                <span className="text-2xs">สถานีระดับน้ำ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] shrink-0"></span>
                <span className="text-2xs">รายงานประชาชน</span>
              </div>
            </div>
          </div>

          <p className="text-2xs text-slate-500 leading-normal border-t border-slate-100 pt-1.5">
            พื้นที่สีแสดงระดับ Monitoring Priority เชิงพื้นที่ ไม่ใช่การยืนยันการปนเปื้อนหรือระดับความเป็นพิษ
          </p>
        </div>

        {/* Selected Cell Preview Card (If Clicked) */}
        {selectedCell && (
          <div className="absolute top-4 right-4 sm:top-16 sm:right-4 z-20 w-[90%] sm:w-80 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-2">
              <div>
                <h4 className="font-bold text-base text-[#063B70] leading-snug">
                  {selectedCell.cell_name || selectedCell.subdistrict}
                </h4>
                <span className="text-xs text-slate-500">อ.{selectedCell.district} จ.ปราจีนบุรี</span>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 text-xs sm:text-sm">ลำดับการเฝ้าระวัง:</span>
                <span 
                  className="font-bold px-2.5 py-1 rounded-full text-white text-xs"
                  style={{ backgroundColor: selectedCell.color || '#0284c7' }}
                >
                  {selectedCell.priority_level}
                </span>
              </div>

              <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                <span>คะแนนความสำคัญ:</span>
                <span className="font-bold text-slate-900">{selectedCell.priority_score ?? '-'} / 1.00</span>
              </div>

              <div className="text-xs sm:text-sm text-slate-600 pt-0.5">
                รายงานประชาชนในพื้นที่: <strong className="text-slate-900">{selectedCell.citizen_report_count ?? 0} รายการ</strong>
              </div>

              <Link
                to={`/map?district=${encodeURIComponent(selectedCell.district)}`}
                className="mt-3 w-full py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white text-sm font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
              >
                <span>ดูรายละเอียดในแผนที่ใหญ่</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
