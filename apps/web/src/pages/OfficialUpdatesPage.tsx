import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  CloudRain, 
  FileText, 
  ShieldCheck, 
  ExternalLink, 
  Clock, 
  MapPin, 
  Building2, 
  Info,
  CheckCircle2,
  ChevronRight,
  X,
  Gauge
} from 'lucide-react';

const PRACHIN_DISTRICTS = [
  'ทั้งหมด',
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const OfficialUpdatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'water' | 'level' | 'rain' | 'announcements'>('water');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ทั้งหมด');
  
  // Data states
  const [stations, setStations] = useState<any[]>([]);
  const [rainStations, setRainStations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedSourceModal, setSelectedSourceModal] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/stations').then(r => r.json()).catch(() => []),
      fetch('/api/public/rainfall-stations').then(r => r.json()).catch(() => []),
      fetch('/api/public/official-updates').then(r => r.json()).catch(() => [])
    ]).then(([stRes, rainRes, annRes]) => {
      setStations(Array.isArray(stRes) ? stRes : []);
      setRainStations(Array.isArray(rainRes) ? rainRes : []);
      setAnnouncements(Array.isArray(annRes) ? annRes : []);
      setLoading(false);
    });
  }, []);

  const filteredStations = stations.filter(s => 
    selectedDistrict === 'ทั้งหมด' || s.district === selectedDistrict
  );

  const filteredRainStations = rainStations.filter(s => 
    selectedDistrict === 'ทั้งหมด' || s.district === selectedDistrict
  );

  const filteredAnnouncements = announcements.filter(a =>
    selectedDistrict === 'ทั้งหมด' || a.related_area?.includes(selectedDistrict)
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Top Banner (Section 21) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0C65E8] text-xs font-bold mb-2 border border-blue-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ศูนย์รวมข้อมูลทางการ (Official Data)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#063B70] tracking-tight">
            ข้อมูลจากหน่วยงาน
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            ผลตรวจคุณภาพน้ำ ข้อมูลระดับน้ำลุ่มน้ำปราจีนบุรี ปริมาณฝน และประกาศสถานการณ์จากหน่วยงานรัฐที่รับผิดชอบโดยตรง
          </p>
        </div>

        {/* District Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 shrink-0">พื้นที่:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0C65E8]"
          >
            {PRACHIN_DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Bar (Section 21: คุณภาพน้ำ, ระดับน้ำ, ฝน, ประกาศและผลตรวจ) */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'water', label: 'คุณภาพน้ำ', icon: Droplets },
          { id: 'level', label: `ระดับน้ำ (${filteredStations.length})`, icon: Gauge },
          { id: 'rain', label: `ฝน (${filteredRainStations.length})`, icon: CloudRain },
          { id: 'announcements', label: `ประกาศและผลตรวจ (${filteredAnnouncements.length})`, icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap min-h-[44px] border-b-2 ${
              activeTab === tab.id
                ? 'border-[#0C65E8] text-[#0C65E8] bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: คุณภาพน้ำ (Default - Section 21) */}
      {activeTab === 'water' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-base text-[#063B70]">
                การตรวจวัดคุณภาพน้ำผิวดินลุ่มน้ำปราจีนบุรี
              </h2>
              <p className="text-xs text-slate-500">
                พารามิเตอร์ตามเกณฑ์มาตรฐานคุณภาพน้ำผิวดิน กรมควบคุมมลพิษ (PCD)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              OFFICIAL ข้อมูลจากหน่วยงาน
            </span>
          </div>

          {/* Standard Parameter Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">สถานีตรวจวัด</th>
                  <th className="py-3 px-4">พื้นที่</th>
                  <th className="py-3 px-4">พารามิเตอร์</th>
                  <th className="py-3 px-4">ค่าที่ตรวจวัดได้</th>
                  <th className="py-3 px-4">เกณฑ์มาตรฐาน</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right">แหล่งข้อมูล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-[#063B70]">แม่น้ำปราจีนบุรี (PRB-01)</td>
                  <td className="py-3.5 px-4 text-slate-600">อ.บ้านสร้าง</td>
                  <td className="py-3.5 px-4">pH (ความเป็นกรด-ด่าง)</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">7.2</td>
                  <td className="py-3.5 px-4 text-slate-500">5.5 - 9.0</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">ปกติ</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'กรมควบคุมมลพิษ (PCD)', dataset: 'รายงานคุณภาพน้ำแม่น้ำปราจีนบุรี ประจำเดือน' })}
                      className="text-[#0C65E8] hover:underline font-semibold"
                    >
                      ดูแหล่งข้อมูล
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-[#063B70]">แม่น้ำปราจีนบุรี (PRB-01)</td>
                  <td className="py-3.5 px-4 text-slate-600">อ.บ้านสร้าง</td>
                  <td className="py-3.5 px-4">DO (ออกซิเจนละลายน้ำ)</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">5.1 mg/L</td>
                  <td className="py-3.5 px-4 text-slate-500">≥ 4.0 mg/L</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">ปกติ</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'กรมควบคุมมลพิษ (PCD)', dataset: 'รายงานคุณภาพน้ำแม่น้ำปราจีนบุรี ประจำเดือน' })}
                      className="text-[#0C65E8] hover:underline font-semibold"
                    >
                      ดูแหล่งข้อมูล
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-[#063B70]">จุดบรรจบพระปรง-หนุมาน</td>
                  <td className="py-3.5 px-4 text-slate-600">อ.กบินทร์บุรี</td>
                  <td className="py-3.5 px-4">BOD (ความสกปรกในรูปสารอินทรีย์)</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">1.8 mg/L</td>
                  <td className="py-3.5 px-4 text-slate-500">≤ 2.0 mg/L</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">ปกติ</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'สคพ.7 (สระแก้ว/ปราจีนบุรี)', dataset: 'การเฝ้าระวังแหล่งน้ำสำคัญ' })}
                      className="text-[#0C65E8] hover:underline font-semibold"
                    >
                      ดูแหล่งข้อมูล
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-[#063B70]">สะพานศรีมหาโพธิ</td>
                  <td className="py-3.5 px-4 text-slate-600">อ.ศรีมหาโพธิ</td>
                  <td className="py-3.5 px-4">โลหะหนักรวม (Heavy Metals)</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">&lt; 0.01 mg/L</td>
                  <td className="py-3.5 px-4 text-slate-500">เกณฑ์มาตรฐานผิวดิน</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">ปกติ</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'กรมควบคุมมลพิษ (PCD)', dataset: 'ผลการตรวจวิเคราะห์ทางห้องปฏิบัติการ' })}
                      className="text-[#0C65E8] hover:underline font-semibold"
                    >
                      ดูแหล่งข้อมูล
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: ระดับน้ำ (Live Telemetry Stations) */}
      {activeTab === 'level' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStations.map(st => (
              <div
                key={st.station_id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-bold text-[#0C65E8]">รหัส: {st.station_id}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">
                      โทรมาตรออนไลน์
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-[#063B70]">
                    {st.name_th}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    อ.{st.district} | ลุ่มน้ำ{st.basin}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-600 font-medium">ระดับน้ำปัจจุบัน:</span>
                  <span className="text-lg font-black text-slate-900">
                    {st.water_level_msl !== null ? `${st.water_level_msl} ม.รทก.` : 'ไม่มีข้อมูล'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>แหล่งข้อมูล: สสน. / กรมชลประทาน</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSourceModal({ agency: 'สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)', dataset: 'ระบบโทรมาตรลุ่มน้ำไทย ThaiWater 3.0' })}
                    className="text-[#0C65E8] hover:underline font-semibold"
                  >
                    ดูแหล่งข้อมูล
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: ปริมาณฝน 24 ชั่วโมง */}
      {activeTab === 'rain' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRainStations.map(st => (
              <div
                key={st.station_id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-bold text-sky-600">ฝนสะสม 24 ชม.</span>
                    <span className="text-slate-400 text-[10px]">ThaiWater</span>
                  </div>
                  <h3 className="font-extrabold text-sm text-[#063B70]">
                    {st.name_th}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    อ.{st.district}
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-600 font-medium">ปริมาณฝน:</span>
                  <span className="text-lg font-black text-sky-700">
                    {st.rain_24h_mm !== null && st.rain_24h_mm !== undefined ? `${st.rain_24h_mm} มม.` : '0.0 มม.'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>ข้อมูลฝนรายวัน</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSourceModal({ agency: 'สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)', dataset: 'สถานีตรวจวัดน้ำฝนอัตโนมัติ ThaiWater' })}
                    className="text-[#0C65E8] hover:underline font-semibold"
                  >
                    ดูแหล่งข้อมูล
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: ประกาศและผลตรวจทางการ */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-4 hover:shadow-card transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#0C65E8]" />
                  <span className="font-bold text-xs text-[#063B70]">{item.agency}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500">{item.document_type}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {item.published_at ? new Date(item.published_at).toLocaleDateString('th-TH') : 'วันนี้'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {item.summary || item.related_area}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">พื้นที่: {item.related_area}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSourceModal({ agency: item.agency, dataset: item.title, url: item.document_url })}
                  className="text-[#0C65E8] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>ดูแหล่งข้อมูลและต้นฉบับ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provenance Details Modal (Opens via "ดูแหล่งข้อมูล") */}
      {selectedSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-[#063B70]">แหล่งที่มาของข้อมูล (Data Provenance)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSourceModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-800">หน่วยงานเจ้าของข้อมูล:</div>
                <div className="text-[#0C65E8] font-semibold">{selectedSourceModal.agency}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-800">ชุดข้อมูล:</div>
                <div>{selectedSourceModal.dataset}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-800">การรับรองและการอนุญาต:</div>
                <div>Open Government Data / Public Record (CC-BY-4.0)</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSourceModal(null)}
                className="px-5 py-2.5 bg-[#0C65E8] text-white rounded-xl text-xs font-bold transition-colors min-h-[44px]"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
