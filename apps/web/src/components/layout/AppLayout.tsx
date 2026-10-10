import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Waves, 
  Search, 
  Map, 
  LayoutDashboard, 
  Bell, 
  ShieldCheck, 
  Info, 
  Menu, 
  X, 
  MessageSquarePlus, 
  ChevronRight, 
  PhoneCall, 
  FileWarning,
  TrendingUp,
  BookOpen,
  ChevronDown,
  Clock,
  Home,
  Newspaper,
  Compass,
  Radio,
  ExternalLink,
  Layers,
  Sparkles
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

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMapPage = location.pathname === '/map';
  const isOverview = location.pathname === '/overview' || location.pathname === '/';

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedScope, setSelectedScope] = useState('จ.ปราจีนบุรี');
  const [latestSystemUpdate, setLatestSystemUpdate] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (districtRef.current && !districtRef.current.contains(event.target as Node)) {
        setShowDistrictDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch telemetry status timestamp
  useEffect(() => {
    fetch('/api/public/overview')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.system_updated_at_th) {
          setLatestSystemUpdate(data.system_updated_at_th);
        }
      })
      .catch(() => {});
  }, []);

  const filteredDistricts = PRACHIN_DISTRICTS.filter(d =>
    d.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleDistrictSelect = (district: string) => {
    setShowSearchResults(false);
    setShowDistrictDropdown(false);
    setSearchTerm('');
    setIsMobileMenuOpen(false);
    setSelectedScope(district === 'ทั้งหมด' ? 'จ.ปราจีนบุรี' : `อ.${district}`);
    navigate(district === 'ทั้งหมด' ? '/overview' : `/overview?district=${encodeURIComponent(district)}`);
  };

  // Primary Navigation organized by the 6 core user tasks
  const primaryNavLinks = [
    { 
      to: '/overview', 
      label: 'หน้าหลัก', 
      desc: 'สรุปสถานการณ์น้ำและคุณภาพสิ่งแวดล้อม',
      icon: LayoutDashboard 
    },
    { 
      to: '/map', 
      label: 'แผนที่สถานการณ์', 
      desc: 'สำรวจพื้นที่น้ำท่วม โครงข่ายน้ำ และสถานีโทรมาตร',
      icon: Map 
    },
    { 
      to: '/official-updates', 
      label: 'ข่าวสาร & ข้อสังเกต', 
      desc: 'รายงานข่าวสารจากสื่อมวลชน และหลักฐานกายภาพ',
      icon: Newspaper 
    },
    { 
      to: '/report', 
      label: 'รายงานเหตุการณ์', 
      desc: 'ส่งรายงานข้อสังเกตสภาพน้ำ และติดตามสถานะ',
      icon: MessageSquarePlus 
    },
    { 
      to: '/forecast', 
      label: 'ข้อมูลเชิงลึก & คาดการณ์', 
      desc: 'แนวโน้มระดับน้ำ คาดการณ์ และไทม์ไลน์เชิงเวลา',
      icon: TrendingUp 
    },
    { 
      to: '/about', 
      label: 'เกี่ยวกับระบบ & แหล่งข้อมูล', 
      desc: 'วิธีวิทยา แหล่งข้อมูลเปิด และข้อจำกัดทางกฎหมาย',
      icon: Info 
    },
  ];

  // Secondary sub-links for knowledge and methodology
  const secondaryNavLinks = [
    { to: '/cases', label: 'ติดตามรายงานชุมชน', icon: FileWarning },
    { to: '/my-area', label: 'พื้นที่ของฉัน', icon: Compass },
    { to: '/data-methodology', label: 'วิธีวิทยาและที่มาข้อมูล', icon: ShieldCheck },
    { to: '/knowledge', label: 'คำแนะนำความปลอดภัย', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* 1. Global Environmental Intelligence Banner (Top Legal Bar) */}
      <aside aria-label="ข้อความชี้แจงแพลตฟอร์ม" className="bg-[#0A2540] text-slate-300 text-xs px-4 py-1.5 border-b border-white/10 shrink-0">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium text-slate-200 text-2xs sm:text-xs">
              ข้อมูลเปิดจากภาครัฐและประชาชน เพื่อการเฝ้าระวังและลดความเสี่ยงสิ่งแวดล้อมเชิงพื้นที่ จ.ปราจีนบุรี
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-2xs sm:text-xs text-sky-300 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>{latestSystemUpdate ? `อัปเดต ${latestSystemUpdate}` : 'โทรมาตรสด Real-time'}</span>
            </span>
            <span className="text-white/20 hidden sm:inline">•</span>
            <Link 
              to="/data-methodology" 
              className="text-2xs sm:text-xs text-sky-300 hover:text-white underline hidden sm:flex items-center gap-0.5 font-medium transition-colors"
            >
              <span>ข้อจำกัดทางกฎหมาย</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </aside>

      {/* 2. Main Desktop Layout Wrapper: Sidebar + Content */}
      <div className="flex-1 flex w-full relative">
        
        {/* ========================================================== */}
        {/* DESKTOP PERSISTENT LEFT SIDEBAR (Visible on lg: 1024px+)    */}
        {/* ========================================================== */}
        <aside 
          aria-label="เมนูหลัก"
          className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200/90 shadow-2xs sticky top-0 h-[calc(100vh-29px)] z-30"
        >
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <Link 
              to="/overview"
              className="flex items-center gap-2.5 group select-none"
              title="FloodTrace - กลับหน้าหลัก"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0C65E8] flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors shrink-0">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold text-slate-900 tracking-tight leading-tight">FloodTrace</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0C65E8] border border-blue-100">
                    Ruwaigon
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-tight">
                  ระบบเฝ้าระวังสิ่งแวดล้อม & น้ำท่วม
                </p>
              </div>
            </Link>
          </div>

          {/* Quick CTA: Send Report */}
          <div className="p-3 border-b border-slate-100">
            <Link
              to="/report"
              className="w-full py-2.5 px-3 bg-[#0C65E8] hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all group"
            >
              <MessageSquarePlus className="w-4.5 h-4.5 text-white group-hover:scale-110 transition-transform" />
              <span>+ ส่งรายงานเหตุการณ์</span>
            </Link>
          </div>

          {/* Navigation Links Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            
            {/* Section 1: Main Workflows */}
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                เมนูหลัก (Main Navigation)
              </div>
              {primaryNavLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                      isActive
                        ? 'bg-blue-50 text-[#0C65E8] border border-blue-100 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                        isActive ? 'text-[#0C65E8]' : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Section 2: Secondary / Citizen Tools */}
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                ข้อมูลเพิ่มเติม & ชุมชน
              </div>
              {secondaryNavLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-[#0C65E8] font-bold'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>

          </div>

          {/* Sidebar Footer: System Status & Hotline */}
          <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/60">
            {/* Stream Status */}
            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-slate-500">โทรมาตร RID & สสน.:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>สด (Live)</span>
              </span>
            </div>

            {/* Emergency Hotline */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-700">สายด่วนมลพิษ:</span>
              </div>
              <a 
                href="tel:1650"
                className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition-colors"
              >
                1650
              </a>
            </div>
          </div>
        </aside>

        {/* ========================================================== */}
        {/* RIGHT / MAIN CONTENT AREA                                  */}
        {/* ========================================================== */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Utility Bar */}
          <header className="sticky top-0 z-20 h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-2xs">
            
            {/* Left: Mobile Brand & Geographic Scope Indicator */}
            <div className="flex items-center gap-3">
              
              {/* Mobile Hamburger Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "ปิดเมนู" : "เปิดเมนูหลัก"}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Mobile Brand */}
              <Link to="/overview" className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0C65E8] flex items-center justify-center text-white">
                  <Waves className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-base">FloodTrace</span>
              </Link>

              {/* Geographic Scope Selector Dropdown */}
              <div className="relative" ref={districtRef}>
                <button
                  type="button"
                  onClick={() => setShowDistrictDropdown(!showDistrictDropdown)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors border border-slate-200/70 cursor-pointer"
                  title="เปลี่ยนขอบเขตพื้นที่อำเภอ"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>{selectedScope}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showDistrictDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      เลือกอำเภอในปราจีนบุรี
                    </div>
                    {PRACHIN_DISTRICTS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDistrictSelect(d)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${
                          selectedScope === (d === 'ทั้งหมด' ? 'จ.ปราจีนบุรี' : `อ.${d}`)
                            ? 'font-bold text-[#0C65E8] bg-blue-50/50'
                            : 'text-slate-700'
                        }`}
                      >
                        <span>{d === 'ทั้งหมด' ? 'ทั้งหมด (ทั้งจังหวัด)' : `อ.${d}`}</span>
                        {selectedScope === (d === 'ทั้งหมด' ? 'จ.ปราจีนบุรี' : `อ.${d}`) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0C65E8]"></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center/Right: Unified Search, Notifications & Report CTA */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Quick Search Bar */}
              <div className="relative">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (filteredDistricts.length > 0) {
                      handleDistrictSelect(filteredDistricts[0]);
                    }
                  }} 
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    placeholder="ค้นหาตำบล อำเภอ หรือจุดตรวจ..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="w-36 sm:w-56 md:w-72 bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 text-slate-800 placeholder-slate-400 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] focus:border-transparent transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                </form>

                {/* Autocomplete Dropdown */}
                {showSearchResults && searchTerm.trim() && (
                  <div 
                    className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100"
                    onMouseLeave={() => setShowSearchResults(false)}
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      พื้นที่ที่ค้นพบ
                    </div>
                    {filteredDistricts.length > 0 ? (
                      filteredDistricts.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDistrictSelect(d)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex items-center justify-between text-slate-700 hover:text-[#0C65E8]"
                        >
                          <span className="font-semibold">{d === 'ทั้งหมด' ? 'ทั้งหมด' : `อ.${d}`}</span>
                          <span className="text-[10px] text-slate-400">จ.ปราจีนบุรี</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-400 text-center">
                        ไม่พบชื่อพื้นที่
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="การแจ้งเตือน"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors relative"
                  title="การแจ้งเตือนสถานการณ์"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 space-y-2 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900">แจ้งเตือนสถานการณ์ล่าสุด</span>
                      <Link 
                        to="/official-updates" 
                        onClick={() => setShowNotifications(false)}
                        className="text-[11px] text-[#0C65E8] hover:underline font-semibold"
                      >
                        ดูทั้งหมด
                      </Link>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 space-y-0.5">
                        <div className="font-semibold text-blue-900 text-xs">เฝ้าระวังระดับน้ำลุ่มน้ำปราจีนบุรี</div>
                        <div className="text-[11px] text-slate-500">สถานี Kgt.3 กบินทร์บุรี และ Kgt.19 ศรีมหาโพธิ</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 space-y-0.5">
                        <div className="font-semibold text-amber-900 text-xs">จุดสังเกตสภาพน้ำผิดปกติ</div>
                        <div className="text-[11px] text-amber-700">อ.บ้านสร้าง มีรายงานน้ำขุ่นคราบบนผิวน้ำ</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Header Action Button on Small Screens */}
              <Link
                to="/report"
                className="sm:hidden p-2 rounded-xl bg-[#0C65E8] text-white flex items-center justify-center"
                title="ส่งรายงานเหตุการณ์"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </Link>
            </div>
          </header>

          {/* Page Main Content */}
          <main className={`flex-1 w-full ${isMapPage ? 'h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden relative' : 'overflow-y-auto pb-16 lg:pb-0'}`}>
            <Outlet />
          </main>

          {/* Footer (Rendered for content pages, hidden on full map) */}
          {!isMapPage && (
            <footer className="w-full bg-white border-t border-slate-200/80 py-6 px-4 sm:px-6 shrink-0 text-xs text-slate-500">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-[#0C65E8]" />
                  <span className="font-bold text-slate-800">FloodTrace</span>
                  <span>— ระบบติดตามคุณภาพสิ่งแวดล้อมและน้ำท่วม จ.ปราจีนบุรี</span>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <Link to="/data-methodology" className="hover:text-slate-800 hover:underline">
                    วิธีวิทยาและที่มาข้อมูล
                  </Link>
                  <span>•</span>
                  <Link to="/knowledge" className="hover:text-slate-800 hover:underline">
                    คำแนะนำการใช้น้ำ
                  </Link>
                  <span>•</span>
                  <Link to="/about" className="hover:text-slate-800 hover:underline">
                    เกี่ยวกับระบบ
                  </Link>
                  <span>•</span>
                  <a href="tel:1650" className="text-rose-600 hover:underline font-semibold flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" />
                    <span>แจ้งเหตุมลพิษ 1650</span>
                  </a>
                </div>
              </div>
            </footer>
          )}

        </div>
      </div>

      {/* ========================================================== */}
      {/* MOBILE DRAWER MENU (< lg)                                  */}
      {/* ========================================================== */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-start animate-in fade-in duration-100">
          <div className="w-[80%] max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-4 space-y-4">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0C65E8] flex items-center justify-center text-white">
                    <Waves className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">FloodTrace</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">จ.ปราจีนบุรี</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile CTA */}
              <Link
                to="/report"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 bg-[#0C65E8] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>+ ส่งรายงานเหตุการณ์ใหม่</span>
              </Link>

              {/* Main Links */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  เมนูหลัก
                </div>
                {primaryNavLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive ? 'bg-blue-50 text-[#0C65E8] font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Secondary Links */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  ข้อมูลเพิ่มเติม
                </div>
                {secondaryNavLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-[#0C65E8] font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    <item.icon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Drawer Bottom Hotline */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
                สายด่วนมลพิษ PCD:
              </span>
              <a href="tel:1650" className="font-bold text-white bg-rose-600 px-2.5 py-1 rounded-lg">
                1650
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< lg)                        */}
      {/* ========================================================== */}
      <nav 
        aria-label="การนำทางบนมือถือ" 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] flex items-center justify-around h-[calc(3.75rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-1"
      >
        <NavLink
          to="/overview"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-all py-1 ${
              isActive ? 'text-[#0C65E8] font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`
          }
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">หน้าหลัก</span>
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-all py-1 ${
              isActive ? 'text-[#0C65E8] font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`
          }
        >
          <Map className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">แผนที่</span>
        </NavLink>

        <NavLink
          to="/official-updates"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-all py-1 ${
              isActive ? 'text-[#0C65E8] font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`
          }
        >
          <Newspaper className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">ข่าวสาร</span>
        </NavLink>

        <NavLink
          to="/report"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-all py-1 ${
              isActive ? 'text-[#0C65E8] font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`
          }
        >
          <MessageSquarePlus className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">รายงาน</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="เปิดเมนูเพิ่มเติม"
          className="flex flex-col items-center justify-center flex-1 h-full transition-all py-1 text-slate-400 hover:text-slate-600 font-medium"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">เมนู</span>
        </button>
      </nav>

    </div>
  );
};
