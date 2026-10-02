import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Compass, 
  Eye, 
  FileText, 
  ChevronRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Bell,
  Clock,
  Waves
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

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Live API States
  const [zones, setZones] = useState<any>(null);
  const [officialUpdates, setOfficialUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const filteredDistricts = PRACHIN_DISTRICTS.filter(d =>
    d.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredDistricts.length > 0) {
      navigate(`/map?district=${encodeURIComponent(filteredDistricts[0])}`);
    } else {
      navigate('/map');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/zones').then(r => r.json()).catch(() => null),
      fetch('/api/public/official-updates').then(r => r.json()).catch(() => [])
    ]).then(([zonesRes, updatesRes]) => {
      setZones(zonesRes);
      setOfficialUpdates(Array.isArray(updatesRes) ? updatesRes : []);
      setLoading(false);
    });
  }, []);

  // Compute 4 Summary Counts from Real API Zones
  const countHigh = zones?.features?.filter((f: any) => f.properties.verification_priority === 'สูง').length || 0;
  const countMedium = zones?.features?.filter((f: any) => f.properties.verification_priority === 'ปานกลาง').length || 0;
  const countFollow = zones?.features?.filter((f: any) => f.properties.watch_status === 'มีรายงานจากประชาชน').length || 0;
  const countLow = zones?.features?.filter((f: any) => f.properties.verification_priority === 'ต่ำ').length || 0;

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
      
      {/* 1. Hero Section (Simple, Trustworthy & Spacious) */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#063B70] via-[#073967] to-[#0A4D8C] text-white p-6 sm:p-10 lg:p-12 shadow-card">
        
        {/* Subtle decorative background water wave effect */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-sky-200 text-xs font-semibold border border-white/15 backdrop-blur-xs">
            <Waves className="w-4 h-4 text-[#38BDF8]" />
            <span>แพลตฟอร์มเฝ้าระวังสิ่งแวดล้อมภาคประชาชน จ.ปราจีนบุรี</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            เฝ้าระวังสารปนเปื้อนในสิ่งแวดล้อม<br className="hidden sm:inline" /> เพื่อชุมชนที่ปลอดภัย
          </h1>

          <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed font-normal">
            Ruwaigon รวบรวมข้อมูลคุณภาพน้ำจากหน่วยงานรัฐ สภาพการไหลของน้ำ ข้อสังเกตจากประชาชนในพื้นที่ และแบบจำลองทางอุทกวิทยา เพื่อช่วยให้ชุมชนสามารถติดตามและตรวจสอบพื้นที่ที่ควรได้รับการเฝ้าระวังล่วงหน้าได้อย่างโปร่งใส
          </p>

          {/* Prominent Search Bar */}
          <div className="pt-4 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="ค้นหาพื้นที่ ตำบล อำเภอ จังหวัด..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full bg-white text-[#073967] placeholder-slate-400 text-sm rounded-2xl pl-11 pr-24 py-3.5 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0C65E8] transition-all"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2 bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-bold rounded-xl transition-colors shadow-sm min-h-[38px]"
              >
                ค้นหา
              </button>
            </form>

            {/* Search Dropdown */}
            {showSearchResults && searchTerm.trim() && (
              <div 
                className="absolute left-6 right-6 sm:left-auto sm:w-[500px] mt-2 bg-white text-[#073967] rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden animate-fadeIn"
                onMouseLeave={() => setShowSearchResults(false)}
              >
                <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  เลือกอำเภอในปราจีนบุรี
                </div>
                {filteredDistricts.length > 0 ? (
                  filteredDistricts.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setShowSearchResults(false);
                        navigate(`/map?district=${encodeURIComponent(d)}`);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">อำเภอ{d}</span>
                      <span className="text-xs text-[#0C65E8] font-bold flex items-center gap-1">
                        ดูแผนที่ <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-400 text-center">
                    ไม่พบข้อมูลพื้นที่ที่ค้นหา
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </section>

      {/* 2. Primary Status (Exactly 4 Summary Cards - Section 9) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#063B70]">
            สรุปสถานการณ์พื้นที่เฝ้าระวังปัจจุบัน
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            ข้อมูลเปิดเชื่อมต่อทางการ (Real-time GIS)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: พื้นที่เฝ้าระวังสูง (Red) */}
          <Link
            to="/map"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-red-400 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">พื้นที่เฝ้าระวังสูง</span>
                <span className="w-3 h-3 rounded-full bg-[#DC2626] animate-pulse"></span>
              </div>
              <div className="text-3xl font-black text-[#DC2626]">
                {loading ? '-' : countHigh}
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                พื้นที่ลุ่มน้ำที่แบบจำลองแนะนำให้สุ่มตรวจตัวอย่างก่อน
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#DC2626]">
              <span>ตรวจสอบบนแผนที่</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: พื้นที่เฝ้าระวัง (Orange) */}
          <Link
            to="/map"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-amber-400 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">พื้นที่เฝ้าระวังปานกลาง</span>
                <span className="w-3 h-3 rounded-full bg-[#EA580C]"></span>
              </div>
              <div className="text-3xl font-black text-[#EA580C]">
                {loading ? '-' : countMedium}
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                พื้นที่ลุ่มต่ำรับน้ำหลากและแนวระเบียงทางน้ำเชื่อมต่อ
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#EA580C]">
              <span>ตรวจสอบบนแผนที่</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: พื้นที่ที่ติดตาม (Yellow) */}
          <Link
            to="/cases"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-yellow-400 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">พื้นที่ที่มีรายงานข้อสังเกต</span>
                <span className="w-3 h-3 rounded-full bg-[#D97706]"></span>
              </div>
              <div className="text-3xl font-black text-[#D97706]">
                {loading ? '-' : countFollow}
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                มีรายงานกลิ่น สี หรือคราบน้ำจากประชาชนในพื้นที่
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#D97706]">
              <span>ดูรายงานชุมชน</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: พื้นที่ที่ยังไม่มีสัญญาณสำคัญ (Green) */}
          <Link
            to="/map"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-emerald-400 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">ระดับเฝ้าระวังต่ำ</span>
                <span className="w-3 h-3 rounded-full bg-[#16A34A]"></span>
              </div>
              <div className="text-3xl font-black text-[#16A34A]">
                {loading ? '-' : countLow}
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                ยังไม่มีสัญญาณสำคัญจากข้อมูลและโทรมาตรปัจจุบัน
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#16A34A]">
              <span>ตรวจสอบบนแผนที่</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

      {/* 3. Main Actions (4 Simple Action Cards - Section 9) */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#063B70]">
          บริการหลักสำหรับประชาชน
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Link
            to="/map"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-[#0C65E8] transition-all group flex items-start gap-4 min-h-[100px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0C65E8] group-hover:bg-[#0C65E8] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#063B70] group-hover:text-[#0C65E8] transition-colors">
                ดูแผนที่ความเสี่ยง
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                สำรวจพื้นที่เฝ้าระวัง ขอบเขตน้ำท่วม และทางน้ำบนภาพถ่ายดาวเทียม
              </p>
            </div>
          </Link>

          <Link
            to="/my-area"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-[#0C65E8] transition-all group flex items-start gap-4 min-h-[100px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#063B70] group-hover:text-purple-600 transition-colors">
                ติดตามพื้นที่ของฉัน
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                บันทึกตำบลและอำเภอที่คุณอาศัยเพื่อรับข้อมูลสถานะล่าสุด
              </p>
            </div>
          </Link>

          <Link
            to="/report"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-[#0C65E8] transition-all group flex items-start gap-4 min-h-[100px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#063B70] group-hover:text-amber-600 transition-colors">
                รายงานเหตุการณ์
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ส่งภาพถ่ายและข้อสังเกตน้ำผิดปกติ 3 ขั้นตอนอย่างปลอดภัย
              </p>
            </div>
          </Link>

          <Link
            to="/official-updates"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-[#0C65E8] transition-all group flex items-start gap-4 min-h-[100px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#063B70] group-hover:text-emerald-600 transition-colors">
                ดูผลตรวจจากหน่วยงาน
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                รายงานผลการตรวจวัดคุณภาพน้ำและประกาศทางการจาก PCD/สคพ.7
              </p>
            </div>
          </Link>

        </div>
      </section>

      {/* 4. Latest Information (Approx 3 items only + "ดูทั้งหมด" button - Section 9) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-subtle space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-[#063B70]">
              ข่าวสารและประกาศสำคัญ
            </h2>
            <p className="text-xs text-slate-500">
              ประกาศและรายงานผลการตรวจวัดล่าสุดจากหน่วยงานราชการที่รับผิดชอบ
            </p>
          </div>
          <Link
            to="/official-updates"
            className="text-xs font-bold text-[#0C65E8] hover:text-[#063B70] flex items-center gap-1 transition-colors"
          >
            <span>ดูทั้งหมด</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3 Latest Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(officialUpdates.slice(0, 3)).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="font-bold text-[#0C65E8]">{item.agency || 'กรมควบคุมมลพิษ'}</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{item.published_at ? new Date(item.published_at).toLocaleDateString('th-TH') : 'วันนี้'}</span>
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#063B70] line-clamp-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {item.summary || item.related_area}
                </p>
              </div>

              <Link
                to="/official-updates"
                className="text-xs font-bold text-[#0C65E8] hover:underline inline-flex items-center gap-1 pt-2 border-t border-slate-200/60"
              >
                <span>อ่านรายละเอียด</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}

          {officialUpdates.length === 0 && (
            <div className="col-span-3 text-center py-8 text-xs text-slate-400">
              ยังไม่มีประกาศใหม่ในขณะนี้
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
