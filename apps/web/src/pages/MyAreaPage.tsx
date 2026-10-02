import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Droplets, 
  Clock, 
  Eye,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ALL_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const MyAreaPage: React.FC = () => {
  // Saved areas in localStorage
  const [savedDistricts, setSavedDistricts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('floodtrace_followed_areas');
      return stored ? JSON.parse(stored) : ['กบินthบุรี', 'ศรีมหาโพธิ'];
    } catch {
      return ['กบินทร์บุรี', 'ศรีมหาโพธิ'];
    }
  });

  const [activeDistrict, setActiveDistrict] = useState<string>(savedDistricts[0] || 'กบินทร์บุรี');
  const [areaData, setAreaData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [alertEnabled, setAlertEnabled] = useState<boolean>(true);
  const [newDistrictInput, setNewDistrictInput] = useState<string>('เมืองปราจีนบุรี');

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('floodtrace_followed_areas', JSON.stringify(savedDistricts));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [savedDistricts]);

  // Fetch active district details
  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/my-area?district=${encodeURIComponent(activeDistrict)}`)
      .then(res => res.json())
      .then(json => {
        setAreaData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading my-area data:', err);
        setLoading(false);
      });
  }, [activeDistrict]);

  const handleAddArea = () => {
    if (!savedDistricts.includes(newDistrictInput)) {
      const updated = [...savedDistricts, newDistrictInput];
      setSavedDistricts(updated);
      setActiveDistrict(newDistrictInput);
    }
  };

  const handleRemoveArea = (d: string) => {
    const updated = savedDistricts.filter(item => item !== d);
    setSavedDistricts(updated);
    if (activeDistrict === d && updated.length > 0) {
      setActiveDistrict(updated[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0C57C7] text-xs font-bold mb-2 border border-sky-100">
              <MapPin className="w-3.5 h-3.5" />
              การติดตามสถานะพื้นที่ส่วนบุคคล
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              พื้นที่ของฉัน (My Area Watch)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              ปักหมุดติดตามสถานการณ์น้ำ ขอบเขตเฝ้าระวัง และรายงานจากประชาชนในพื้นที่ที่คุณสนใจ (ไม่เปิดเผยพิกัดบ้านสู่สาธารณะ)
            </p>
          </div>

          {/* Add Area Box */}
          <div className="flex items-center gap-2">
            <select
              value={newDistrictInput}
              onChange={(e) => setNewDistrictInput(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 min-h-[44px]"
            >
              {ALL_DISTRICTS.map(d => (
                <option key={d} value={d}>อ.{d}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddArea}
              className="px-4 py-2 bg-[#0C57C7] hover:bg-[#103D76] text-white rounded-xl text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              ติดตามพื้นที่
            </button>
          </div>
        </div>

        {/* Followed Areas Tab Strip */}
        <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 mr-1">พื้นที่ที่ติดตาม ({savedDistricts.length}):</span>
          {savedDistricts.map(d => (
            <div
              key={d}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeDistrict === d
                  ? 'bg-[#0C57C7] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveDistrict(d)}
                className="focus:outline-none"
              >
                อ.{d}
              </button>
              {savedDistricts.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveArea(d)}
                  className="hover:text-red-300 ml-1 p-0.5"
                  title="ยกเลิกติดตาม"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
          <div className="animate-spin w-8 h-8 border-3 border-[#0C57C7] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">กำลังโหลดสถานะพื้นที่...</p>
        </div>
      ) : areaData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Area Status Dashboard (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      อำเภอ{activeDistrict} จังหวัดปราจีนบุรี
                    </h2>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      รหัสโซน: {areaData.district}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    อัปเดตล่าสุด: {areaData.last_updated}
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  areaData.verification_priority === 'สูง'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : areaData.verification_priority === 'ปานกลาง'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {areaData.verification_priority_label}
                </span>
              </div>

              {/* Status 4-Box Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block mb-1">สถานะการเฝ้าระวัง</span>
                  <span className="font-bold text-slate-800 text-sm">{areaData.current_status}</span>
                  <p className="text-[11px] text-slate-400 mt-1">ประเมินจากปัจจัยทางน้ำและรายงานชุมชน</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block mb-1">สถานการณ์น้ำปัจจุบัน</span>
                  <span className="font-bold text-slate-800 text-sm">{areaData.flood_status}</span>
                  <p className="text-[11px] text-slate-400 mt-1">GISTDA & กรมชลประทาน</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block mb-1">ข้อสังเกตจากชุมชน</span>
                  <span className="font-bold text-slate-800 text-sm">{areaData.community_observation_summary}</span>
                  <p className="text-[11px] text-slate-400 mt-1">* รายงานยังไม่ถือเป็นผลตรวจยืนยัน</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block mb-1">แนวโน้มการขยายตัว (Forecast)</span>
                  <span className="font-bold text-purple-700 text-sm">{areaData.forecast_watch_summary}</span>
                  <p className="text-[11px] text-purple-500 mt-1">แบบจำลองอุทกวิทยา 24 ชม.</p>
                </div>
              </div>

              {/* Why This Area Box */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ทำไมพื้นที่นี้จึงถูกเฝ้าระวัง?
                </h3>
                <div className="space-y-1.5">
                  {areaData.why_this_area?.map((w: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 font-medium">
                  {areaData.why_this_area_disclaimer}
                </p>
              </div>
            </div>

            {/* Official Updates in this area */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0C57C7]" />
                  <h3 className="font-bold text-sm text-slate-800">ผลตรวจและการเก็บตัวอย่างจากหน่วยงาน</h3>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  OFFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-600">
                สถานะผลแล็บ: <strong className="text-slate-800">{areaData.official_sampling_status}</strong>
              </p>
              <div className="pt-2">
                <Link
                  to="/official-updates"
                  className="text-xs font-bold text-[#0C57C7] hover:underline flex items-center gap-1"
                >
                  ดูรายงานและประกาศทางการทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>

          {/* Right Sidebar: Notification Settings & Confidence (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Notification Control Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Bell className="w-5 h-5 text-[#0C57C7]" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800">การแจ้งเตือนพื้นที่เฝ้าระวัง</h3>
                  <p className="text-[11px] text-slate-500">จำลองการแจ้งเตือนตามเกณฑ์ความปลอดภัย</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-700">รับแจ้งเตือนเมื่อสถานะเปลี่ยน</span>
                <input
                  type="checkbox"
                  checked={alertEnabled}
                  onChange={(e) => setAlertEnabled(e.target.checked)}
                  className="w-4 h-4 text-[#0C57C7] rounded-md focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-xs text-blue-900 leading-relaxed">
                <strong className="block mb-1 font-bold">ตัวอย่างข้อความแจ้งเตือนที่ปลอดภัย:</strong>
                “พื้นที่ที่คุณติดตาม (อ.{activeDistrict}) เข้าสู่พื้นที่เฝ้าระวังจากแบบจำลองล่าสุด ขณะนี้ยังไม่มีผลตรวจทางห้องปฏิบัติการยืนยันการปนเปื้อน”
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                * นโยบายความปลอดภัย: ระบบจะไม่ส่งข้อความกล่าวหาหรือสร้างความตื่นตระหนก เช่น “สารพิษกำลังมา”
              </p>
            </div>

            {/* Data Confidence Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
                คุณภาพและความสดของข้อมูล
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">ระดับคุณภาพข้อมูล:</span>
                  <span className="font-bold text-emerald-600">{areaData.data_confidence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ความสดใหม่:</span>
                  <span className="font-bold text-[#0C57C7]">{areaData.data_freshness}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
                {areaData.provenance?.category_explanation}
              </div>
            </div>

          </div>

        </div>
      ) : null}

    </div>
  );
};
