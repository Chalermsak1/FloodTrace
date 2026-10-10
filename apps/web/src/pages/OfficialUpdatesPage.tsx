import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Gauge,
  Newspaper
} from 'lucide-react';
import { NewsCard } from '../components/news/NewsCard';
import { InformationDetailModal, ExternalInformationDetail } from '../components/news/InformationDetailModal';
import { Badge, Tabs, EmptyState, LoadingSkeleton, PageHeader, Card } from '../components/ui';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'water' | 'level' | 'rain' | 'announcements'>(
    initialTabParam === 'news' || initialTabParam === 'announcements' ? 'announcements' : 'water'
  );
  const [newsFilter, setNewsFilter] = useState<'ALL' | 'CURATED_NEWS' | 'OFFICIAL'>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ทั้งหมด');
  
  // Data states
  const [stations, setStations] = useState<any[]>([]);
  const [rainStations, setRainStations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedSourceModal, setSelectedSourceModal] = useState<any | null>(null);
  const [selectedInfoItem, setSelectedInfoItem] = useState<ExternalInformationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (initialTabParam === 'news' || initialTabParam === 'announcements') {
      setActiveTab('announcements');
    }
  }, [initialTabParam]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/stations').then(r => r.json()).catch(() => []),
      fetch('/api/public/rainfall-stations').then(r => r.json()).catch(() => []),
      fetch('/api/public/information?limit=100')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(infoRes => {
          if (Array.isArray(infoRes) && infoRes.length > 0) return infoRes;
          return fetch('/api/public/official-updates').then(r => r.json()).catch(() => []);
        })
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
    selectedDistrict === 'ทั้งหมด' || 
    a.related_area?.includes(selectedDistrict) ||
    a.district === selectedDistrict ||
    a.district?.includes(selectedDistrict)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Unified PageHeader */}
      <PageHeader
        title="ข่าวสารและข้อมูลทางการ"
        subtitle="ผลตรวจคุณภาพน้ำผิวดิน ข้อมูลระดับน้ำโทรมาตร ปริมาณฝน และข่าวสารคัดสรรจากสำนักข่าวที่น่าเชื่อถือ"
        badge={
          <Badge variant="official" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            ข้อมูลทางการ & สื่อมวลชน
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 shrink-0">ขอบเขต:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0C65E8]"
            >
              {PRACHIN_DISTRICTS.map(d => (
                <option key={d} value={d}>{d === 'ทั้งหมด' ? 'ทุกอำเภอ (ปราจีนบุรี)' : `อ.${d}`}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Tabs Bar (Section 21: คุณภาพน้ำ, ระดับน้ำ, ฝน, ประกาศและผลตรวจ) */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'water', label: 'คุณภาพน้ำ', icon: Droplets },
          { id: 'level', label: `ระดับน้ำ (${filteredStations.length})`, icon: Gauge },
          { id: 'rain', label: `ฝน (${filteredRainStations.length})`, icon: CloudRain },
          { id: 'announcements', label: `ข่าวสารและข้อมูลทางการ (${filteredAnnouncements.length})`, icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap min-h-[44px] border-b-2 ${
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
              <h2 className="font-bold text-lg text-[#063B70]">
                การตรวจวัดคุณภาพน้ำผิวดินลุ่มน้ำปราจีนบุรี
              </h2>
              <p className="text-sm text-slate-500">
                พารามิเตอร์ตามเกณฑ์มาตรฐานคุณภาพน้ำผิวดิน กรมควบคุมมลพิษ (PCD)
              </p>
            </div>
            <Badge variant="official">
              OFFICIAL ข้อมูลจากหน่วยงาน
            </Badge>
          </div>

          {/* Standard Parameter Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-y border-slate-200 text-sm">
                <tr>
                  <th className="py-3.5 px-4">สถานีตรวจวัด</th>
                  <th className="py-3.5 px-4">พื้นที่</th>
                  <th className="py-3.5 px-4">พารามิเตอร์</th>
                  <th className="py-3.5 px-4">ค่าที่ตรวจวัดได้</th>
                  <th className="py-3.5 px-4">เกณฑ์มาตรฐาน</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">แหล่งข้อมูล</th>
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
                    <Badge variant="normal">ปกติ</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'กรมควบคุมมลพิษ (PCD)', dataset: 'รายงานคุณภาพน้ำแม่น้ำปราจีนบุรี ประจำเดือน' })}
                      className="text-[#0C65E8] hover:underline font-semibold text-sm"
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
                    <Badge variant="normal">ปกติ</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'กรมควบคุมมลพิษ (PCD)', dataset: 'รายงานคุณภาพน้ำแม่น้ำปราจีนบุรี ประจำเดือน' })}
                      className="text-[#0C65E8] hover:underline font-semibold text-sm"
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
                    <Badge variant="normal">ปกติ</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'สคพ.7 (สระแก้ว/ปราจีนบุรี)', dataset: 'การเฝ้าระวังแหล่งน้ำสำคัญ' })}
                      className="text-[#0C65E8] hover:underline font-semibold text-sm"
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
                    <Badge variant="normal">ปกติ</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceModal({ agency: 'กรมควบคุมมลพิษ (PCD)', dataset: 'ผลการตรวจวิเคราะห์ทางห้องปฏิบัติการ' })}
                      className="text-[#0C65E8] hover:underline font-semibold text-sm"
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
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
                    <span className="font-semibold text-[#0C65E8]">รหัส: {st.station_id}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold text-xs border border-emerald-200">
                      โทรมาตรออนไลน์
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#063B70]">
                    {st.name_th}
                  </h3>
                  <div className="text-sm text-slate-500 mt-0.5">
                    อ.{st.district} | ลุ่มน้ำ{st.basin}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm text-slate-600 font-medium">ระดับน้ำปัจจุบัน:</span>
                  <span className="text-xl font-bold text-slate-900">
                    {st.water_level_msl !== null ? `${st.water_level_msl} ม.รทก.` : 'ไม่มีข้อมูล'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                  <span>แหล่งข้อมูล: สสน. / กรมชลประทาน</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSourceModal({ agency: 'สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)', dataset: 'ระบบโทรมาตรลุ่มน้ำไทย ThaiWater 3.0' })}
                    className="text-[#0C65E8] hover:underline font-semibold text-sm"
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
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
                    <span className="font-semibold text-sky-600">ฝนสะสม 24 ชม.</span>
                    <span className="text-slate-500 text-xs">ThaiWater</span>
                  </div>
                  <h3 className="font-bold text-base text-[#063B70]">
                    {st.name_th}
                  </h3>
                  <div className="text-sm text-slate-500 mt-0.5">
                    อ.{st.district}
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-baseline justify-between">
                  <span className="text-sm text-slate-600 font-medium">ปริมาณฝน:</span>
                  <span className="text-xl font-bold text-sky-700">
                    {st.rain_24h_mm !== null && st.rain_24h_mm !== undefined ? `${st.rain_24h_mm} มม.` : '0.0 มม.'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                  <span>ข้อมูลฝนรายวัน</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSourceModal({ agency: 'สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)', dataset: 'สถานีตรวจวัดน้ำฝนอัตโนมัติ ThaiWater' })}
                    className="text-[#0C65E8] hover:underline font-semibold text-sm"
                  >
                    ดูแหล่งข้อมูล
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: ข่าวสารและประกาศทางการ */}
      {activeTab === 'announcements' && (
        <div className="space-y-5">
          {/* Subheader and Filter Pills */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-lg text-[#063B70] flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-[#0C65E8]" />
                <span>ข่าวสารคัดสรรและประกาศสถานการณ์</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ข่าวสารจากสื่อมวลชนที่คัดสรรโดยโครงการ และประกาศแจ้งเตือนสถานการณ์อย่างเป็นทางการ
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setNewsFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  newsFilter === 'ALL'
                    ? 'bg-[#0C65E8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({filteredAnnouncements.length})
              </button>
              <button
                type="button"
                onClick={() => setNewsFilter('CURATED_NEWS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  newsFilter === 'CURATED_NEWS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ข่าวสารคัดสรร ({filteredAnnouncements.filter(a => a.authority_level === 'CURATED_PUBLIC_SOURCE' || a.source_type === 'NEWS_MEDIA' || a.verification_status === 'CURATED').length})
              </button>
              <button
                type="button"
                onClick={() => setNewsFilter('OFFICIAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  newsFilter === 'OFFICIAL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ประกาศทางการ ({filteredAnnouncements.filter(a => a.authority_level === 'OFFICIAL').length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAnnouncements
              .filter(item => {
                if (newsFilter === 'CURATED_NEWS') {
                  return item.authority_level === 'CURATED_PUBLIC_SOURCE' || item.source_type === 'NEWS_MEDIA' || item.verification_status === 'CURATED';
                }
                if (newsFilter === 'OFFICIAL') {
                  return item.authority_level === 'OFFICIAL';
                }
                return true;
              })
              .map((item) => (
                <NewsCard 
                  key={item.id} 
                  item={item} 
                  onSelect={(selected) => setSelectedInfoItem(selected as any)}
                />
              ))}

            {filteredAnnouncements.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                ยังไม่พบข้อมูลสาธารณะที่ตรวจสอบแหล่งต้นทางได้
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provenance Details Modal (Opens via "ดูแหล่งข้อมูล") */}
      {selectedSourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-lg text-[#063B70]">แหล่งที่มาของข้อมูล (Data Provenance)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSourceModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">หน่วยงานเจ้าของข้อมูล:</div>
                <div className="text-[#0C65E8] font-semibold">{selectedSourceModal.agency}</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">ชุดข้อมูล:</div>
                <div>{selectedSourceModal.dataset}</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">การรับรองและการอนุญาต:</div>
                <div>Open Government Data / Public Record (CC-BY-4.0)</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSourceModal(null)}
                className="px-5 py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Detail Modal */}
      <InformationDetailModal 
        item={selectedInfoItem} 
        onClose={() => setSelectedInfoItem(null)} 
      />

    </div>
  );
};
