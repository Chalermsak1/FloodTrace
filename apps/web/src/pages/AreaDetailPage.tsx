import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Droplets, 
  Eye, 
  FileText, 
  TrendingUp, 
  Plus, 
  Check, 
  AlertCircle, 
  Compass, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const AreaDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const districtParam = searchParams.get('district') || 'บ้านสร้าง';

  const [district, setDistrict] = useState<string>(districtParam);
  const [activeTab, setActiveTab] = useState<'summary' | 'water' | 'factors' | 'reports' | 'forecast'>('summary');
  
  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // My Area Saved state
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ruwaigon_followed_areas') || '[]');
      setIsSaved(saved.includes(district));
    } catch {
      setIsSaved(false);
    }
  }, [district]);

  const toggleSaveArea = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('ruwaigon_followed_areas') || '[]');
      let updated: string[];
      if (saved.includes(district)) {
        updated = saved.filter((d: string) => d !== district);
        setIsSaved(false);
      } else {
        updated = [...saved, district];
        setIsSaved(true);
      }
      localStorage.setItem('ruwaigon_followed_areas', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setDistrict(districtParam);
  }, [districtParam]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/public/overview?district=${encodeURIComponent(district)}`).then(r => r.json()).catch(() => null),
      fetch('/api/public/stations').then(r => r.json()).catch(() => []),
      fetch(`/api/public/observations?district=${encodeURIComponent(district)}`).then(r => r.json()).catch(() => [])
    ]).then(([overviewRes, stationsRes, obsRes]) => {
      setOverview(overviewRes);
      const filteredStations = Array.isArray(stationsRes) 
        ? stationsRes.filter(s => s.district === district) 
        : [];
      setStations(filteredStations);
      setObservations(Array.isArray(obsRes) ? obsRes : []);
      setLoading(false);
    });
  }, [district]);

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'สูงมาก') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (priority === 'สูง') return 'bg-red-50 text-red-700 border-red-200';
    if (priority === 'ปานกลาง') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Back button & District selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#0C65E8] transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าก่อนหน้า</span>
        </button>

        {/* Change District dropdown/chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-sm font-medium text-slate-600 shrink-0">เปลี่ยนอำเภอ:</span>
          {PRACHIN_DISTRICTS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDistrict(d);
                navigate(`/area-detail?district=${encodeURIComponent(d)}`, { replace: true });
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium shrink-0 transition-colors ${
                district === d
                  ? 'bg-[#063B70] text-white font-semibold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Top Section: Area Header & Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-[#0C65E8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              จ.ปราจีนบุรี
            </span>
            <span className="text-sm text-slate-400">•</span>
            <span className="text-sm text-slate-500 font-medium">
              อัปเดตล่าสุด: {overview?.last_updated || 'วันนี้'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#063B70] tracking-tight">
            อำเภอ{district}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getPriorityBadgeClass(overview?.verification_priority)}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              <span>ระดับการเฝ้าระวัง: {overview?.verification_priority || 'ระดับเฝ้าระวังต่ำ'}</span>
            </span>

            <span className="text-sm text-slate-600">
              สถานะ: {overview?.current_status || 'ติดตามสถานการณ์ตามปกติ'}
            </span>
          </div>
        </div>

        {/* Action: Add to My Area & Map Link */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleSaveArea}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] flex items-center gap-2 shadow-xs ${
              isSaved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-white hover:bg-slate-50 text-[#063B70] border border-slate-200'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-[#0C65E8]" />}
            <span>{isSaved ? 'อยู่ในพื้นที่ของฉันแล้ว' : '+ เพิ่มในพื้นที่ของฉัน'}</span>
          </button>

          <Link
            to={`/map?district=${encodeURIComponent(district)}`}
            className="px-4 py-2.5 rounded-xl bg-[#0C65E8] hover:bg-[#063B70] text-white text-sm font-semibold transition-colors min-h-[44px] flex items-center gap-2 shadow-xs"
          >
            <Compass className="w-4 h-4" />
            <span>ดูบนแผนที่</span>
          </Link>
        </div>
      </div>

      {/* 5 Analytical Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'summary', label: 'ข้อมูลสรุป', icon: FileText },
          { id: 'water', label: 'คุณภาพน้ำ', icon: Droplets },
          { id: 'factors', label: 'ปัจจัยที่เกี่ยวข้อง', icon: Compass },
          { id: 'reports', label: `รายงานจากประชาชน (${observations.length})`, icon: Eye },
          { id: 'forecast', label: 'แนวโน้ม', icon: TrendingUp },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap min-h-[44px] border-b-2 ${
              activeTab === t.id
                ? 'border-[#0C65E8] text-[#0C65E8] bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: ข้อมูลสรุป (Summary - Default) */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* 4 Summary Stat Mini-Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs font-semibold text-slate-500 block mb-1">ระดับการเฝ้าระวัง</span>
              <div className="text-xl font-bold text-[#063B70]">
                {overview?.verification_priority || 'ระดับเฝ้าระวังต่ำ'}
              </div>
              <p className="text-sm text-slate-500 mt-1">ประเมินตามแบบจำลอง</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs font-semibold text-slate-500 block mb-1">ผลตรวจจากหน่วยงาน</span>
              <div className="text-base font-bold text-slate-800 line-clamp-1">
                {overview?.official_sampling_status || 'รอผลการตรวจวัด'}
              </div>
              <p className="text-sm text-slate-500 mt-1">PCD และ สคพ.7</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs font-semibold text-slate-500 block mb-1">ข้อสังเกตจากประชาชน</span>
              <div className="text-xl font-bold text-amber-600">
                {overview?.community_observation_count || observations.length} จุด
              </div>
              <p className="text-sm text-slate-500 mt-1">อยู่ระหว่างการติดตาม</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs font-semibold text-slate-500 block mb-1">ความสดใหม่ของข้อมูล</span>
              <div className="text-base font-bold text-emerald-600">
                {overview?.data_freshness || 'สดใหม่ (อัปเดตวันนี้)'}
              </div>
              <p className="text-sm text-slate-500 mt-1">{overview?.data_confidence || 'คุณภาพข้อมูล: สูง'}</p>
            </div>
          </div>

          {/* Why This Area & Citizen Guidance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Why This Area? (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-4">
              <h2 className="font-bold text-lg text-[#063B70] pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>ทำไมพื้นที่นี้จึงถูกเฝ้าระวัง?</span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">MODEL</span>
              </h2>

              <div className="space-y-2.5">
                {(overview?.why_this_area || [
                  '✓ เป็นพื้นที่ลุ่มน้ำเชื่อมต่อกับลำน้ำสายหลัก',
                  '✓ มีรายงานข้อสังเกตจากประชาชนในพื้นที่ใกล้เคียง',
                  '○ ยังไม่มีผลตรวจทางห้องปฏิบัติการยืนยันการปนเปื้อน'
                ]).map((reason: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm sm:text-base text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-sm text-amber-900 leading-relaxed">
                ⚠️ ระดับสีเป็นการประเมินเพื่อการเฝ้าระวังและจัดลำดับการตรวจสอบล่วงหน้า ไม่ใช่ผลยืนยันการปนเปื้อน
              </div>
            </div>

            {/* Citizen Guidance (5 cols - max 4 simple actions) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-4">
              <h2 className="font-bold text-lg text-[#063B70] pb-2 border-b border-slate-100">
                คำแนะนำสำหรับประชาชนในพื้นที่
              </h2>

              <div className="space-y-2.5">
                <Link
                  to="/official-updates"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0C65E8] text-white flex items-center justify-center shrink-0 text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-[#063B70]">ติดตามประกาศจากหน่วยงาน</h3>
                    <p className="text-xs text-slate-500">ตรวจสอบประกาศและผลวิเคราะห์ทางการ</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0C65E8] transition-transform" />
                </Link>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-800">หลีกเลี่ยงแหล่งน้ำที่ผิดปกติ</h3>
                    <p className="text-xs text-slate-500">หากพบน้ำมีกลิ่น สี หรือฟองผิดปกติ ไม่ควรสัมผัส</p>
                  </div>
                </div>

                <Link
                  to="/report"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/60 hover:bg-amber-50 border border-amber-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-amber-900">รายงานเหตุผิดปกติ</h3>
                    <p className="text-xs text-amber-700">ส่งภาพถ่ายและข้อสังเกตเพื่อช่วยตรวจสอบ</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform" />
                </Link>

                <Link
                  to="/official-updates"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-emerald-900">ดูผลตรวจล่าสุด</h3>
                    <p className="text-xs text-emerald-700">ดูรายงานคุณภาพน้ำและค่าการตรวจวัด</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab 2: คุณภาพน้ำ (Water Quality) */}
      {activeTab === 'water' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-[#063B70]">สถานีตรวจวัดคุณภาพน้ำและระดับน้ำ</h2>
              <p className="text-sm text-slate-500">ข้อมูลจากเครือข่ายสถานีโทรมาตร สสน. และ กรมชลประทาน</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              OFFICIAL
            </span>
          </div>

          {stations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              ยังไม่มีสถานีโทรมาตรประจำอำเภอ{district}ที่เชื่อมต่ออยู่ในขณะนี้ หรืออยู่ในระหว่างการบำรุงรักษา
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stations.map(st => (
                <div key={st.station_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-[#063B70]">{st.name_th}</span>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      ตรวจวัดปกติ
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div>ระดับน้ำ: <strong className="text-slate-800 font-semibold">{st.water_level_msl !== null ? `${st.water_level_msl} ม.รทก.` : 'ไม่มีข้อมูล'}</strong></div>
                    <div>ลุ่มน้ำ: {st.basin}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: ปัจจัยที่เกี่ยวข้อง (Associated Factors) */}
      {activeTab === 'factors' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-4">
          <h2 className="font-bold text-lg text-[#063B70] pb-2 border-b border-slate-100">
            ปัจจัยเชิงอุทกวิทยาและสภาพแวดล้อม
          </h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="block text-base text-slate-800 mb-1">การเชื่อมต่อทางน้ำ:</strong>
              {overview?.hydrological_connectivity_status || 'เชื่อมต่อกับแม่น้ำปราจีนบุรีและคลองสาขา'}
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="block text-base text-slate-800 mb-1">สถานการณ์น้ำท่วมขัง:</strong>
              {overview?.flood_status || 'ระดับน้ำในเกณฑ์ปกติ'}
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <strong className="block text-base text-slate-800 mb-1">บริบทพื้นที่อุตสาหกรรมแบบรวม:</strong>
              <p className="text-slate-600 leading-relaxed text-sm">
                พื้นที่กิจกรรมอุตสาหกรรมแบบรวมในเขตลุ่มน้ำปราจีนบุรีตอนบน (ระบบไม่ระบุชื่อโรงงานหรือผู้ก่อมลพิษ เพื่อความโปร่งใสและปฏิบัติตามมาตรฐานความปลอดภัยของข้อมูล)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: รายงานจากประชาชน (Community Reports) */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-lg text-[#063B70]">รายงานข้อสังเกตในเขต {district}</h2>
              <p className="text-sm text-slate-500">ข้อมูลสังเกตการณ์เบื้องต้นจากชุมชน</p>
            </div>
            <Link
              to="/report"
              className="px-4 py-2 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-sm font-semibold transition-colors flex items-center min-h-[40px]"
            >
              + ส่งรายงานใหม่
            </Link>
          </div>

          {observations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              ยังไม่มีรายงานข้อสังเกตจากประชาชนในอำเภอ{district}
            </div>
          ) : (
            <div className="space-y-3">
              {observations.map((obs, idx) => (
                <div key={obs.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold text-slate-800 text-base block">{obs.category}</span>
                    <span className="text-slate-500 text-sm">{obs.generalized_location || obs.district}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {obs.status_label || 'อยู่ระหว่างติดตาม'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: แนวโน้ม (Forecast) */}
      {activeTab === 'forecast' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle space-y-4">
          <h2 className="font-bold text-lg text-[#063B70] pb-2 border-b border-slate-100">
            แนวโน้มล่วงหน้าสำหรับอำเภอ{district}
          </h2>
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-sm text-purple-950 space-y-2">
            <div className="font-bold text-base text-purple-900">
              {overview?.forecast_watch_summary || 'แนวโน้มสภาวะน้ำทรงตัวในระยะ 24 ชั่วโมงข้างหน้า'}
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              แบบจำลองวิเคราะห์แนวโน้มการไหลและการระบายน้ำผ่านลุ่มน้ำย่อย หากมีฝนตกหนักสะสมในพื้นที่ต้นน้ำ อาจส่งผลให้ระดับน้ำในแม่น้ำสายหลักปรับตัวสูงขึ้น
            </p>
          </div>
          <Link
            to="/forecast"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C65E8] hover:underline"
          >
            <span>ดูแผนที่แนวโน้มและการคาดการณ์แบบเต็มรูปแบบ</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

    </div>
  );
};
