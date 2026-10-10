import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  MapPin, 
  Droplets, 
  Calendar, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  CloudRain,
  Info,
  ChevronRight,
  Layers
} from 'lucide-react';
import { ContinuousMapView } from '../components/map/ContinuousMapView';
import { 
  Badge, 
  Button, 
  Modal,
  PageHeader,
  Card 
} from '../components/ui';

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
  { id: '6h', label: '+6 ชม.', sub: '6 ชั่วโมงข้างหน้า' },
  { id: '12h', label: '+12 ชม.', sub: '12 ชั่วโมงข้างหน้า' },
  { id: '24h', label: '+24 ชม.', sub: '24 ชั่วโมงข้างหน้า' },
  { id: '3d', label: '3 วัน', sub: 'ระยะกลาง' }
];

export const ForecastPage: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('กบินทร์บุรี');
  const [selectedHorizon, setSelectedHorizon] = useState<string>('now');
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);

  // GIS Data States
  const [zones, setZones] = useState<any>(null);
  const [floodExtent, setFloodExtent] = useState<any>(null);
  const [forecastZones, setForecastZones] = useState<any>(null);
  const [waterways, setWaterways] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch GIS Layers for Forecast
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/zones').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/flood-extent').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/public/forecast-zones?horizon=${selectedHorizon}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/waterways').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([zonesRes, floodRes, forecastRes, waterRes]) => {
      setZones(zonesRes);
      setFloodExtent(floodRes);
      setForecastZones(forecastRes);
      setWaterways(waterRes);
      setLoading(false);
    });
  }, [selectedHorizon]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Unified PageHeader */}
      <PageHeader
        title="แนวโน้มและการคาดการณ์"
        subtitle="แบบจำลองแนวโน้มพื้นที่ที่ควรเฝ้าระวัง ประเมินตามโครงข่ายทางน้ำ สถิติน้ำหลาก และสภาวะอุทกวิทยา"
        badge={
          <Badge variant="evidence" icon={<TrendingUp className="w-3.5 h-3.5" />}>
            แบบจำลองคาดการณ์เชิงพื้นที่
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="md"
            iconLeft={<Info className="w-4 h-4 text-[#0284C7]" />}
            onClick={() => setShowMethodologyModal(true)}
            className="self-start md:self-auto shadow-2xs"
          >
            วิธีการคำนวณและข้อจำกัด
          </Button>
        }
      />

      {/* Control Bar: Area Selector + Timeline Buttons */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* District Selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <span className="text-xs sm:text-sm font-medium text-slate-500 shrink-0">เลือกอำเภอ:</span>
          {PRACHIN_DISTRICTS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDistrict(d)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition-all min-h-[38px] flex items-center cursor-pointer ${
                selectedDistrict === d
                  ? 'bg-[#0A2540] text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Timeline Horizon Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start lg:self-auto overflow-x-auto no-scrollbar">
          <span className="text-xs font-medium text-slate-500 px-2 shrink-0">ช่วงเวลา:</span>
          {TIMELINE_HORIZONS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedHorizon(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[34px] flex items-center shrink-0 cursor-pointer ${
                selectedHorizon === t.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

      </div>

      {/* Main Grid: Forecast Map (75%) + Factor Summary (25%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Large Forecast Map Container */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-2xs flex flex-col">
          <div className="h-[520px] sm:h-[600px] w-full rounded-xl overflow-hidden relative">
            <ContinuousMapView
              zones={zones}
              floodExtent={floodExtent}
              forecastZones={forecastZones}
              waterways={waterways}
              stations={[]}
              observations={[]}
              visibleLayers={{
                watchZones: true,
                floodExtent: true,
                forecastZones: true,
                waterways: true,
                stations: false,
                observations: false
              }}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={setSelectedDistrict}
              forecastHorizon={selectedHorizon}
            />

            {/* Badge overlay on Map */}
            <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200 shadow-card text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
              <span className="font-bold text-xs sm:text-sm text-[#0A2540]">
                แนวโน้มช่วงเวลา: {TIMELINE_HORIZONS.find(h => h.id === selectedHorizon)?.label}
              </span>
              <Badge variant="evidence" size="xs">
                MODEL
              </Badge>
            </div>
          </div>

          {/* Mandatory Compact Disclaimer below Map */}
          <div className="mt-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="font-medium text-xs sm:text-sm">
                ผลจากแบบจำลองใช้เพื่อการเฝ้าระวัง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การระบุผู้ก่อมลพิษ
              </span>
            </div>
            <span className="text-2xs text-slate-500 shrink-0 hidden sm:inline">
              อัปเดตตามรอบโทรมาตรน้ำ
            </span>
          </div>
        </div>

        {/* Small Factor Summary Panel */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          
          {/* Factor Summary Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Compass className="w-5 h-5 text-[#0284C7]" />
              <h2 className="font-bold text-base sm:text-lg text-[#0A2540]">ปัจจัยที่ส่งผลต่อแนวโน้ม</h2>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-[#0284C7]" />
                  <span>การเชื่อมต่อทางน้ำ</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  มวลน้ำไหลผ่านจุดบรรจบแม่น้ำพระปรงและแควหนุมาน เข้าสู่แม่น้ำปราจีนบุรีอย่างต่อเนื่อง
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-sky-600" />
                  <span>สภาวะน้ำท่วมขัง</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  พบพื้นที่ลุ่มต่ำริมตลิ่งตามแนวลำน้ำหลักที่มีน้ำท่วมขังตามข้อมูลดาวเทียมและสถานีโทรมาตร
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>พื้นที่เปราะบางปลายน้ำ</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  มีชุมชนริมน้ำ แหล่งเกษตรกรรม และพื้นที่ประมงในเขต อ.ศรีมหาโพธิ และ อ.บ้านสร้าง
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-2xs text-slate-500 leading-relaxed">
                * สัญลักษณ์เส้นประสีม่วงบนแผนที่แสดงขอบเขตพื้นที่ที่แบบจำลองแนะนำให้ติดตามล่วงหน้า
              </div>
            </div>
          </div>

          {/* Citizen Recommendation Box */}
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 text-[#0A2540] space-y-2 shadow-2xs">
            <div className="font-bold flex items-center gap-1.5 text-sm sm:text-base text-[#0284C7]">
              <HelpCircle className="w-4 h-4" />
              <span>คำแนะนำสำหรับประชาชน</span>
            </div>
            <ul className="space-y-1.5 text-slate-700 leading-relaxed text-xs sm:text-sm">
              <li className="flex items-start gap-1.5">
                <span className="text-[#0284C7] font-bold">•</span>
                <span>หากอยู่ในพื้นที่แนวโน้มเฝ้าระวัง ควรติดตามระดับน้ำและประกาศทางการสม่ำเสมอ</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#0284C7] font-bold">•</span>
                <span>หลีกเลี่ยงการใช้น้ำที่มีสี กลิ่น หรือความผิดปกติโดยตรง</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Methodology Modal using UI Modal */}
      <Modal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
        title="วิธีการคำนวณและข้อจำกัดของแบบจำลอง"
        subtitle="ระเบียบวิธีวิเคราะห์การเชื่อมต่อทางน้ำและความปลอดภัยข้อมูล"
        badge={<Badge variant="evidence">ระเบียบวิธีวิเคราะห์</Badge>}
        footer={
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowMethodologyModal(false)}
          >
            เข้าใจแล้ว
          </Button>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            <strong className="text-slate-800">1. การจำลองขอบเขตพื้นที่เฝ้าระวัง:</strong> FloodTrace ใช้การวิเคราะห์โครงข่ายทางน้ำลุ่มน้ำย่อย (Sub-basin Network Topology) ร่วมกับข้อมูลทิศทางการไหล ความเร็วเฉลี่ยของน้ำ และข้อมูลขอบเขตน้ำท่วมขัง
          </p>
          <p>
            <strong className="text-slate-800">2. ไม่ใช่การระบุสารเคมีหรือผู้ก่อมลพิษ:</strong> แบบจำลองไม่สามารถระบุชนิดสารเคมี ความเข้มข้น หรือระบุชื่อสถานประกอบการได้ เป็นเพียงการประเมินพื้นที่ที่มีความเสี่ยงเชิงอุทกวิทยาที่ควรได้รับการสุ่มตรวจตัวอย่างน้ำก่อน
          </p>
          <p>
            <strong className="text-slate-800">3. ข้อจำกัดทางกฎหมาย:</strong> ข้อมูลแนวโน้มไม่สามารถนำไปใช้เป็นหลักฐานยืนยันความผิดทางกฎหมายหรือกล่าวหาบุคคลหรือนิติบุคคลใด ๆ ได้
          </p>
        </div>
      </Modal>

    </div>
  );
};
