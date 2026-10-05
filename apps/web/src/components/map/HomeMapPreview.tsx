import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  RotateCcw,
  ShieldCheck,
  X
} from 'lucide-react';
import { MapLibreMapView } from './MapLibreMapView';
import { EvidenceLabel } from '../ui/EvidenceLabel';
import { FeedbackState } from '../ui/FeedbackState';

export const HomeMapPreview: React.FC = () => {
  // Telemetry & Geospatial Data
  const [monitoringSurface, setMonitoringSurface] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'partial' | 'empty' | 'unavailable'>('loading');

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
    const load = () => Promise.all([
      fetch('/api/public/map/monitoring-priority').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/map/boundary').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/waterways').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/stations').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/observations').then(r => r.ok ? r.json() : null).catch(() => null)
    ])
      .then(([surfaceRes, boundRes, waterRes, stationsRes, obsRes]) => {
        const results = [surfaceRes !== null, boundRes !== null, waterRes !== null, Array.isArray(stationsRes), Array.isArray(obsRes)];
        const hasAnyData = Boolean(surfaceRes?.features?.length || boundRes?.boundary?.features?.length || waterRes?.features?.length || stationsRes?.length || obsRes?.length);
        setMonitoringSurface(surfaceRes);
        setBoundaryData(boundRes);
        setWaterways(waterRes);
        setStations(Array.isArray(stationsRes) ? stationsRes : []);
        setObservations(Array.isArray(obsRes) ? obsRes : []);
        setMapStatus(results.every(Boolean) ? (hasAnyData ? 'ready' : 'empty') : results.some(Boolean) ? 'partial' : 'unavailable');
        setLoading(false);
      })
      .catch(() => {
        setMapStatus('unavailable');
        setLoading(false);
      });

    load();
    const refresh = window.setInterval(load, 60_000);
    return () => window.clearInterval(refresh);
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
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="mb-1"><EvidenceLabel family="MODEL" detail="ชั้นวิเคราะห์" /></div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#063B70] tracking-tight">
            แผนที่เฝ้าระวัง
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            ขอบเขตข้อมูล: จังหวัดปราจีนบุรี. ชั้นข้อมูลจะแสดงเฉพาะเมื่อ API ส่งกลับ
          </p>
        </div>

        <Link
          to="/map"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0C65E8] border border-[#0C65E8]/30 rounded-xl text-sm font-semibold transition-all shadow-xs shrink-0 self-start sm:self-auto group min-h-[44px]"
        >
          <span>เปิดแผนที่เฝ้าระวัง</span>
          <ChevronRight className="w-4 h-4 text-[#0C65E8] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Map Container */}
      {mapStatus === 'partial' && <FeedbackState kind="partial" title="แสดงชั้นข้อมูลได้บางส่วน" detail="บางคำขอไม่สำเร็จ ชั้นข้อมูลที่ไม่มีหลักฐานจะไม่แสดง" />}
      {mapStatus === 'empty' && <FeedbackState kind="empty" title="ไม่มีชั้นข้อมูลพร้อมแสดง" detail="API ยังไม่มีข้อมูลแผนที่ในขณะนี้" />}
      <div className="relative w-full h-[360px] sm:h-[400px] xl:h-[430px] rounded-2xl overflow-hidden shadow-card border border-slate-200/90 bg-slate-900">
        
        {loading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="bg-white/95 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
              <span className="w-4 h-4 border-2 border-[#0C65E8] border-t-transparent rounded-full animate-spin"></span>
              <span className="text-sm font-semibold text-slate-800">กำลังโหลดชั้นข้อมูล...</span>
            </div>
          </div>
        )}

        {mapStatus === 'unavailable' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-4 text-center z-20">
            <div className="max-w-sm rounded-xl bg-white p-4"><FeedbackState kind="unavailable" title="แผนที่ไม่พร้อมใช้งาน" detail="ไม่มีชั้นข้อมูลที่ API ส่งกลับ" />
              <Link to="/map" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#0C65E8]">เปิดหน้าแผนที่และตรวจสอบสถานะ</Link>
            </div>
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

        {/* Floating Reset View Button */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={handleResetView}
            title="รีเซ็ตมุมมอง จ.ปราจีนบุรี"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-medium border border-white/15 backdrop-blur-md transition-all shadow-md min-h-[44px]"
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
              จุดแบบจำลองจากสถานี (ไม่ประมาณพื้นที่)
            </span>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#DC2626] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">เกินวิกฤต</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#EA580C] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">ถึงเกณฑ์เตือน</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">ต่ำกว่าเตือน</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-sky-600 shadow-xs"></span>
                <span className="text-2xs text-slate-700 font-medium">ข้อมูลฝน</span>
              </div>
            </div>
            <p className="text-2xs leading-relaxed text-slate-500">สีระดับน้ำเทียบเกณฑ์จากต้นทาง จุดฝนไม่มีเกณฑ์จัดระดับ</p>
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
            <div className="flex flex-wrap gap-1.5 pt-1"><EvidenceLabel family="OFFICIAL" /><EvidenceLabel family="COMMUNITY" /></div>
          </div>

          <p className="text-2xs text-slate-500 leading-normal border-t border-slate-100 pt-1.5">
            จุดสถานีแสดงข้อมูลสำหรับจัดลำดับการติดตาม ไม่ใช่การยืนยันการปนเปื้อนหรือระดับความเป็นพิษ
          </p>
        </div>

        {/* Selected Cell Preview Card (If Clicked) */}
        {selectedCell && (
          <div className="absolute top-14 right-3 z-20 w-[min(90%,22rem)] max-h-[55%] overflow-y-auto bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-2">
              <div>
                <EvidenceLabel family="MODEL" detail="ระดับเฝ้าระวัง" />
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
                  {selectedCell.priority_level || 'ไม่สามารถยืนยันได้'}
                </span>
              </div>

              <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                <span>คะแนนความสำคัญ:</span>
                <span className="font-bold text-slate-900">{typeof selectedCell.priority_score === 'number' ? `${selectedCell.priority_score.toFixed(2)} / 1.00` : 'ไม่มีข้อมูล'}</span>
              </div>

              <div className="text-xs sm:text-sm text-slate-600 pt-0.5">
                <EvidenceLabel family="COMMUNITY" /> <strong className="text-slate-900">{typeof selectedCell.citizen_report_count === 'number' ? `${selectedCell.citizen_report_count} รายการ` : 'ไม่มีข้อมูล'}</strong>
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
