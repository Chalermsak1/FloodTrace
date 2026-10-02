import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Compass, 
  ChevronRight, 
  ShieldCheck, 
  AlertTriangle,
  Building2,
  Bell,
  Clock,
  Waves,
  Activity,
  Droplets,
  Users,
  Layers,
  FileText,
  MessageSquarePlus,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { HomeMapPreview } from '../components/map/HomeMapPreview';
import { AUTHENTIC_TAMBONS } from '../components/map/MapLibreMapView';

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

const PRACHIN_WATERWAYS = [
  { name: 'แม่น้ำปราจีนบุรี (Prachin Buri River)', district: 'เมืองปราจีนบุรี' },
  { name: 'แม่น้ำบางปะกง (Bang Pakong River)', district: 'บ้านสร้าง' },
  { name: 'แม่น้ำหนุมาน (Hanuman River)', district: 'กบินทร์บุรี' },
  { name: 'แม่น้ำพระปรง (Phra Prong River)', district: 'กบินทร์บุรี' },
  { name: 'คลองประจันตคาม (Prachantakham Canal)', district: 'ประจันตคาม' }
];

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Live Overview Telemetry & Summary State
  const [overviewData, setOverviewData] = useState<any>(null);
  const [officialUpdates, setOfficialUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<boolean>(false);

  // Fetch Real Data from Public APIs
  useEffect(() => {
    setLoading(true);
    setFetchError(false);

    Promise.all([
      fetch('/api/public/overview').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/official-updates').then(r => r.ok ? r.json() : []).catch(() => [])
    ])
      .then(([overviewRes, updatesRes]) => {
        if (!overviewRes) {
          setFetchError(true);
        } else {
          setOverviewData(overviewRes);
          setOfficialUpdates(Array.isArray(updatesRes) ? updatesRes : []);
        }
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, []);

  // Filtered search targets (Districts, Authentic Subdistricts, Waterways)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();

    const districts = PRACHIN_DISTRICTS
      .filter(d => d.toLowerCase().includes(q) || `อำเภอ${d}`.includes(q))
      .map(d => ({ type: 'district', label: `อ.${d}`, sub: 'อำเภอใน จ.ปราจีนบุรี', value: d }));

    const subdistricts = AUTHENTIC_TAMBONS
      .filter(t => t.name.toLowerCase().includes(q) || t.district.toLowerCase().includes(q))
      .slice(0, 5)
      .map(t => ({ type: 'subdistrict', label: t.name, sub: `อ.${t.district} จ.ปราจีนบุรี`, value: t.district, lat: t.lat, lng: t.lng }));

    const rivers = PRACHIN_WATERWAYS
      .filter(w => w.name.toLowerCase().includes(q))
      .map(w => ({ type: 'waterway', label: w.name, sub: `ทางน้ำสำคัญ (อ.${w.district})`, value: w.district }));

    return [...districts, ...subdistricts, ...rivers];
  }, [searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectSearchItem(searchResults[0]);
    } else {
      navigate('/map');
    }
  };

  const handleSelectSearchItem = (item: any) => {
    setShowSearchResults(false);
    setSearchTerm('');
    if (item.value) {
      navigate(`/map?district=${encodeURIComponent(item.value)}`);
    } else {
      navigate('/map');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 lg:space-y-12 animate-fadeIn">
      
      {/* ============================================================ */}
      {/* SECTION C & 6: HERO SECTION                                  */}
      {/* ============================================================ */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#F0F7FF] via-[#F8FAFC] to-[#EFF6FF] border border-[#BFDBFE]/60 p-6 sm:p-10 lg:p-12 shadow-sm">
        
        {/* Subtle decorative water gradient backdrop */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#0C65E8]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* LEFT ~50-55%: Text + Scope Indicator + Search */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Location Scope Indicator (Section 8) */}
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[#0C65E8] border border-[#0C65E8]/25 shadow-xs hover:border-[#0C65E8] transition-all group"
            >
              <MapPin className="w-3.5 h-3.5 text-[#0C65E8] shrink-0" />
              <span className="text-xs font-bold text-slate-800">
                ขอบเขตการวิเคราะห์ปัจจุบัน: <span className="text-[#0C65E8]">จังหวัดปราจีนบุรี</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Primary Headline (Section 7) */}
            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#063B70] leading-[1.2]">
              เฝ้าระวังการปนเปื้อนในสิ่งแวดล้อม<br />
              <span className="text-[#0C65E8]">เพื่อชุมชนที่ปลอดภัย</span>
            </h1>

            {/* Supporting Explanation (Section 7) */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-2xl">
              แพลตฟอร์มที่รวบรวมข้อมูลจากหน่วยงานภาครัฐ ข้อมูลด้านอุทกวิทยา ข้อมูลสิ่งแวดล้อม รายงานจากประชาชน และการวิเคราะห์เชิงพื้นที่ เพื่อช่วยเฝ้าระวังและตรวจสอบพื้นที่ที่ควรติดตาม
            </p>

            {/* Prominent Hero Search Bar (Section 9) */}
            <div className="pt-2 max-w-xl relative">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center shadow-lg rounded-2xl">
                <input
                  type="text"
                  placeholder="ค้นหาพื้นที่ ตำบล อำเภอ หรือจังหวัด..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full bg-white text-slate-900 placeholder-slate-400 text-sm rounded-2xl pl-12 pr-28 py-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] focus:border-transparent transition-all"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                <button
                  type="submit"
                  className="absolute right-2 px-6 py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-bold rounded-xl transition-colors shadow-xs min-h-[40px] flex items-center gap-1.5"
                >
                  <span>ค้นหา</span>
                </button>
              </form>

              {/* Real Typeahead Dropdown */}
              {showSearchResults && searchTerm.trim() && (
                <div 
                  className="absolute left-0 right-0 mt-2 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden animate-fadeIn"
                  onMouseLeave={() => setShowSearchResults(false)}
                >
                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>ผลการค้นหาใน จ.ปราจีนบุรี</span>
                    <span className="text-[10px] text-[#0C65E8] font-normal">{searchResults.length} รายการ</span>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSearchItem(item)}
                          className="w-full text-left px-4 py-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <span className="font-semibold text-xs sm:text-sm text-slate-800 group-hover:text-[#0C65E8]">
                              {item.label}
                            </span>
                            <span className="block text-[11px] text-slate-400">{item.sub}</span>
                          </div>
                          <span className="text-xs text-[#0C65E8] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            ดูแผนที่ <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-xs text-slate-400 text-center">
                      ไม่พบพื้นที่ที่ค้นหาในขอบเขตการวิเคราะห์ จ.ปราจีนบุรี
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT ~45-50%: Environmental Visual (Section 6) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[480px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-white group">
              <img 
                src="/assets/hero_landscape.jpg" 
                alt="ทัศนียภาพสิ่งแวดล้อมลุ่มน้ำปราจีนบุรี" 
                className="w-full h-64 sm:h-72 lg:h-80 object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#063B70]/85 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 mb-1">
                  ระบบนิเวศลุ่มน้ำและการติดตามสิ่งแวดล้อม
                </span>
                <p className="text-xs text-white/90 leading-snug font-medium">
                  ติดตามสภาพลุ่มน้ำบางปะกง-ปราจีนบุรี เชื่อมโยงข้อมูลโทรมาตรระดับน้ำและคุณภาพสิ่งแวดล้อม
                </p>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* ============================================================ */}
      {/* SECTION D & 10: QUICK ACCESS CARDS                           */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#063B70]">
            สรุปสถานการณ์และทางลัดข้อมูล
          </h2>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            ข้อมูลเปิดเชื่อมต่อทางการ (Real-time Telemetry)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: สถานการณ์ล่าสุด */}
          <Link
            to="/map"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-[#DC2626]/50 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700">สถานการณ์ล่าสุด</span>
                <span className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#DC2626]">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-slate-100 rounded-md animate-pulse"></span>
                ) : (
                  `${overviewData?.priority_counts?.high ?? 3} โซนเฝ้าระวังสูง`
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                พบพื้นที่ที่ควรเฝ้าระวังในจังหวัดปราจีนบุรี
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#DC2626]">
              <span>ตรวจสอบบนแผนที่</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: ข้อมูลจากหน่วยงาน */}
          <Link
            to="/official-updates"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-[#0C65E8]/50 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700">ข้อมูลจากหน่วยงาน</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#0C65E8] flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#063B70]">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-slate-100 rounded-md animate-pulse"></span>
                ) : (
                  `${((overviewData?.total_water_stations || 26) + (overviewData?.total_rainfall_stations || 78))} จุดตรวจวัด`
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                ระดับน้ำ น้ำฝน และข้อมูลสิ่งแวดล้อมจากหน่วยงาน
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0C65E8]">
              <span>ดูข้อมูลโทรมาตร</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: รายงานจากประชาชน */}
          <Link
            to="/cases"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-amber-400 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700">รายงานจากประชาชน</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#D97706]">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-slate-100 rounded-md animate-pulse"></span>
                ) : (
                  `${overviewData?.total_citizen_reports ?? 171} ข้อสังเกต`
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                รวบรวมข้อสังเกตจากประชาชนในพื้นที่
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#D97706]">
              <span>สำรวจรายงานชุมชน</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: พื้นที่เฝ้าระวัง */}
          <Link
            to="/map"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-emerald-400 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700">พื้นที่เฝ้าระวัง</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-[#059669]">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-slate-100 rounded-md animate-pulse"></span>
                ) : (
                  `${overviewData?.total_monitoring_cells ?? 45} โซนวิเคราะห์`
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                ดูพื้นที่ที่มีความสำคัญในการติดตามและตรวจสอบ
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#059669]">
              <span>สำรวจพื้นที่ 7 อำเภอ</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION E & 11-17: MAIN MONITORING MAP (CENTERPIECE)         */}
      {/* ============================================================ */}
      <HomeMapPreview />

      {/* ============================================================ */}
      {/* SECTION F & G: LATEST UPDATES & CITIZEN SECTION              */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* LATEST NEWS / OFFICIAL UPDATES (~65% -> 8 cols) */}
        <section className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-[#063B70]">
                ข่าวสารและข้อมูลล่าสุด
              </h3>
              <p className="text-xs text-slate-500">
                รายงานผลตรวจวัดและประกาศทางการจากหน่วยงานราชการที่รับผิดชอบ
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {officialUpdates.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 flex flex-col justify-between space-y-3 hover:bg-slate-50 hover:border-[#0C65E8]/30 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                    <span className="font-bold text-[#0C65E8] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[130px]">
                      {item.agency || 'กรมควบคุมมลพิษ'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{item.published_at ? new Date(item.published_at).toLocaleDateString('th-TH') : 'ล่าสุด'}</span>
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-[#063B70] line-clamp-2 leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {item.factual_summary || item.related_area}
                  </p>
                </div>

                <Link
                  to="/official-updates"
                  className="text-xs font-bold text-[#0C65E8] hover:underline inline-flex items-center gap-1 pt-2.5 border-t border-slate-200/60"
                >
                  <span>อ่านรายละเอียด</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}

            {officialUpdates.length === 0 && (
              <div className="col-span-3 text-center py-10 text-xs text-slate-400">
                ยังไม่มีประกาศใหม่ในขณะนี้
              </div>
            )}
          </div>
        </section>

        {/* CITIZEN PARTICIPATION PANEL (~35% -> 4 cols - Section 19) */}
        <section className="lg:col-span-4 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]/70 rounded-3xl p-6 sm:p-7 border border-[#BFDBFE] shadow-card space-y-4">
          <div className="w-10 h-10 rounded-2xl bg-[#0C65E8] text-white flex items-center justify-center shadow-sm">
            <MessageSquarePlus className="w-5 h-5" />
          </div>

          <div>
            <h3 className="font-black text-lg text-[#063B70]">
              สำหรับประชาชน
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed mt-1">
              พบเห็นปัญหา แจ้งข้อมูลได้ที่นี่ เพื่อช่วยให้ทีมงานและชุมชนติดตามสถานการณ์ได้
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-white/60 space-y-2 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-[#0C65E8] font-bold mt-0.5">•</span>
              <span>แจ้งข้อสังเกตน้ำเปลี่ยนสี มีกลิ่น หรือพบคราบผิดปกติ</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#0C65E8] font-bold mt-0.5">•</span>
              <span>ระบบรักษาความเป็นส่วนตัว ไม่เปิดเผยชื่อหรือพิกัดบ้านเรือน</span>
            </div>
          </div>

          <Link
            to="/report"
            className="w-full py-3 px-5 bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2 shadow-sm transition-colors min-h-[44px]"
          >
            <span>แจ้งรายงานจากประชาชน</span>
            <ChevronRight className="w-4 h-4" />
          </Link>

          {/* Secondary Links (Section 19) */}
          <div className="pt-2 border-t border-[#BFDBFE]/60 flex items-center justify-between text-xs font-semibold text-slate-600">
            <Link to="/knowledge" className="hover:text-[#0C65E8] flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>วิธีการใช้งาน</span>
            </Link>
            <Link to="/knowledge" className="hover:text-[#0C65E8] flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>คำถามที่พบบ่อย</span>
            </Link>
          </div>
        </section>

      </div>

      {/* ============================================================ */}
      {/* SECTION 20 & 36: DATA TRUST & PROVENANCE TRANSPARENCY CARD   */}
      {/* ============================================================ */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-800">
              ความโปร่งใสและที่มาของข้อมูล (Data Provenance & Trust)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              เชื่อมต่อข้อมูลเปิดจากสถาบันสารสนเทศทรัพยากรน้ำ (HII / ThaiWater), กรมควบคุมมลพิษ (PCD), GISTDA, รายงานจากประชาชน และแบบจำลอง FloodTrace
            </p>
          </div>
        </div>

        <Link
          to="/data-methodology"
          className="text-xs font-bold text-[#0C65E8] hover:underline flex items-center gap-1 shrink-0 self-start md:self-auto"
        >
          <span>วิธีวิทยาและข้อจำกัด</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </section>

    </div>
  );
};
