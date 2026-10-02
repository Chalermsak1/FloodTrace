import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Droplets, 
  Eye, 
  FileText, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const OverviewPage: React.FC = () => {
  const [district, setDistrict] = useState<string>('กบินทร์บุรี');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/overview?district=${encodeURIComponent(district)}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load overview:', err);
        setLoading(false);
      });
  }, [district]);

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & District Selector Banner */}
      <div className="bg-gradient-to-r from-[#103D76] to-[#0C57C7] rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-sky-100 text-xs font-semibold mb-4 backdrop-blur-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
            แพลตฟอร์มสารสนเทศภูมิศาสตร์และการเฝ้าระวังสิ่งแวดล้อมภาคประชาชน
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
            สถานการณ์น้ำและพื้นที่เฝ้าระวัง จ.ปราจีนบุรี
          </h1>
          <p className="text-sky-100/90 text-sm sm:text-base mt-2 leading-relaxed">
            ติดตามสถานการณ์น้ำท่วมขัง ทิศทางการไหลของน้ำ และจัดลำดับพื้นที่ที่ควรได้รับการตรวจสอบด้านสิ่งแวดล้อมเพิ่มเติมอย่างโปร่งใสและตรงตามข้อเท็จจริง
          </p>

          {/* District Picker */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-sky-200">เลือกอำเภอเพื่อตรวจสอบ:</span>
            {PRACHIN_DISTRICTS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDistrict(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center ${
                  district === d
                    ? 'bg-white text-[#103D76] shadow-sm font-bold scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-xs">
          <div className="animate-spin w-8 h-8 border-3 border-[#0C57C7] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">กำลังโหลดข้อมูลข้อเท็จจริงล่าสุด...</p>
        </div>
      ) : data ? (
        <>
          {/* Status Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Verification Priority */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ลำดับความสำคัญในการตรวจสอบ</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    MODEL
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-black ${
                    data.verification_priority === 'สูง' 
                      ? 'text-red-600' 
                      : data.verification_priority === 'ปานกลาง' 
                        ? 'text-orange-600' 
                        : 'text-amber-600'
                  }`}>
                    {data.verification_priority}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({data.verification_priority_label})
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {data.verification_priority_explanation}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>พื้นที่: {district}</span>
                <Link to="/map" className="text-[#0C57C7] font-semibold hover:underline flex items-center gap-0.5">
                  ดูบนแผนที่ <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 2: Current Flood Status */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานการณ์น้ำท่วมขัง</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    OFFICIAL
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2 text-[#0C57C7]">
                  <Droplets className="w-6 h-6 shrink-0" />
                  <span className="font-bold text-base text-slate-800 line-clamp-1">
                    {data.flood_status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เชื่อมต่อสถานีโทรมาตรตรวจวัดระดับน้ำลุ่มน้ำปราจีนบุรี อัปเดตรายชั่วโมงจาก สสน. และ กรมชลประทาน
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>สถานีตรวจวัดพร้อมใช้งาน</span>
                <span className="font-semibold text-emerald-600">{data.monitoring_stations_active ? `${data.monitoring_stations_active} สถานี` : 'พร้อมใช้งาน'}</span>
              </div>
            </div>

            {/* Card 3: Community Observations */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ข้อสังเกตจากประชาชน</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    COMMUNITY
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-black text-slate-800">
                    {data.community_observation_count}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">จุดรายงาน</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {data.community_observation_summary}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="text-amber-700 font-medium">* ยังไม่ถือเป็นผลยืนยัน</span>
                <Link to="/cases" className="text-[#0C57C7] font-semibold hover:underline flex items-center gap-0.5">
                  ดูรายงาน <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 4: Official Lab & Sampling Status */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ผลตรวจทางห้องปฏิบัติการ</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    OFFICIAL
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2 text-slate-800">
                  <FileText className="w-5 h-5 text-slate-600 shrink-0" />
                  <span className="font-bold text-sm text-slate-800">
                    {data.official_sampling_status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ข้อมูลทางการจากกรมควบคุมมลพิษ (PCD) และสำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7 (สคพ.7)
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>ประกาศล่าสุด</span>
                <Link to="/official-updates" className="text-[#0C57C7] font-semibold hover:underline flex items-center gap-0.5">
                  อ่านประกาศ <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>

          {/* Middle Section: Why This Area? & Data Confidence */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Why This Area? (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0C57C7] flex items-center justify-center font-bold">
                    ?
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      ทำไมพื้นที่ {district} จึงถูกเฝ้าระวัง?
                    </h2>
                    <p className="text-xs text-slate-500">
                      ปัจจัยประกอบการวิเคราะห์การเชื่อมต่อทางน้ำและความเปราะบางเชิงพื้นที่
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                  Sanitized Evidence
                </span>
              </div>

              <div className="space-y-2.5 pt-2">
                {data.why_this_area?.map((reason: string, idx: number) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
                ⚠️ {data.why_this_area_disclaimer}
              </div>
            </div>

            {/* Data Confidence & Freshness (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <Activity className="w-5 h-5 text-[#0C57C7]" />
                  <h3 className="font-bold text-sm text-slate-800">คุณภาพและความสดของข้อมูล</h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">ความสมบูรณ์ของหลักฐาน:</span>
                      <span className="font-bold text-emerald-600">{data.data_confidence}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[85%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">ความสดใหม่ของข้อมูล:</span>
                      <span className="font-bold text-[#0C57C7]">{data.data_freshness}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      ตรวจวัดความสดใหม่ตามเวลาจริง (โทรมาตรชั่วโมง/ดาวเทียมสัปดาห์)
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      อัปเดตล่าสุด: {data.last_updated}
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      แหล่งข้อมูล: {data.provenance?.source_agency}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                to="/data-methodology"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl text-center transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
              >
                ดูคู่มือข้อมูลและวิธีการทั้งหมด <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link
              to="/map"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#0C57C7] shadow-xs hover:shadow-md transition-all group flex items-center justify-between min-h-[56px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0C57C7] flex items-center justify-center group-hover:bg-[#0C57C7] group-hover:text-white transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">แผนที่เฝ้าระวังเชิงพื้นที่</h4>
                  <p className="text-xs text-slate-500">ดูขอบเขตน้ำท่วมและพื้นที่เฝ้าระวังแบบต่อเนื่อง</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0C57C7] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/my-area"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#0C57C7] shadow-xs hover:shadow-md transition-all group flex items-center justify-between min-h-[56px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">พื้นที่ของฉัน</h4>
                  <p className="text-xs text-slate-500">ปักหมุดติดตามตำบลและอำเภอที่คุณสนใจ</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/report"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-600 shadow-xs hover:shadow-md transition-all group flex items-center justify-between min-h-[56px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">รายงานเหตุการณ์</h4>
                  <p className="text-xs text-slate-500">ส่งข้อสังเกตน้ำเปลี่ยนสี มีกลิ่น หรือคราบน้ำ 3 ขั้นตอน</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </>
      ) : null}

    </div>
  );
};
