import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Waves, 
  Search, 
  Map, 
  LayoutDashboard, 
  Compass, 
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
  Clock
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

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [latestSystemUpdate, setLatestSystemUpdate] = useState<string | null>(null);

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
    setSearchTerm('');
    setIsMobileMenuOpen(false);
    navigate(`/overview?district=${encodeURIComponent(district)}`);
  };

  // Primary Navigation according to Section 5
  const primaryNavLinks = [
    { to: '/overview', label: 'หน้าหลัก', icon: LayoutDashboard },
    { to: '/map', label: 'แผนที่', icon: Map },
    { to: '/official-updates', label: 'ข้อมูล', icon: Bell },
    { to: '/cases', label: 'รายงาน', icon: FileWarning },
    { to: '/about', label: 'เกี่ยวกับเรา', icon: Info },
  ];

  // Secondary items for wide desktop / dropdown for compact desktop
  const secondaryNavLinks = [
    { to: '/my-area', label: 'พื้นที่ของฉัน', icon: Compass },
    { to: '/forecast', label: 'แนวโน้มและการคาดการณ์', icon: TrendingUp },
    { to: '/knowledge', label: 'ความรู้และคำแนะนำ', icon: BookOpen },
    { to: '/data-methodology', label: 'วิธีวิทยาและข้อจำกัด', icon: ShieldCheck },
  ];

  const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FC] text-[#073967]">
      
      {/* 1. Legal & Purpose Top Information Bar (Section 4 & 50.3) */}
      <aside aria-label="ข้อความชี้แจงแพลตฟอร์ม" className="bg-[#04274B] text-sky-100 text-xs sm:text-sm px-4 py-2 border-b border-[#063B70]">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm text-sky-100 font-medium">
              ข้อมูลจากหน่วยงานภาครัฐ ข้อมูลจากภาคประชาชน และการวิเคราะห์เชิงพื้นที่ เพื่อการเฝ้าระวังและลดความเสี่ยงด้านสิ่งแวดล้อม
            </span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs sm:text-sm text-sky-300 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{latestSystemUpdate ? `อัปเดตล่าสุด ${latestSystemUpdate}` : 'ตรวจสอบเวลาการอัปเดตล่าสุด'}</span>
            </span>
            <Link 
              to="/data-methodology" 
              className="text-xs sm:text-sm text-sky-300 hover:text-white underline hidden md:flex items-center gap-1 font-medium"
            >
              <span>ข้อจำกัดทางกฎหมาย</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </aside>

      {/* 2. Main Navigation Header (Section 5 & 50.6) */}
      <header className="sticky top-0 z-40 w-full bg-[#063B70] text-white shadow-md border-b border-[#0C65E8]/30">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-3 sm:gap-5">
          
          {/* Brand Logo & Subtitle */}
          <Link 
            to="/overview"
            className="flex items-center gap-3 select-none shrink-0 group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#0C65E8] flex items-center justify-center shadow-inner border border-white/20 group-hover:bg-[#0E62DE] transition-colors">
              <Waves className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-none">FloodTrace</span>
                <span className="text-xs font-semibold bg-white/15 text-sky-100 px-2 py-0.5 rounded-full border border-white/20">
                  Ruwaigon
                </span>
              </div>
              <p className="text-xs sm:text-sm text-sky-200/90 font-medium leading-tight mt-1 line-clamp-1">
                ระบบติดตามคุณภาพสิ่งแวดล้อมและน้ำท่วม
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links (Section 50.6: font-size 15-16px, weight 500-600) */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {primaryNavLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-[15px] transition-colors flex items-center gap-2 min-h-[40px] ${
                    isActive
                      ? 'bg-[#0C65E8] text-white shadow-sm font-semibold border border-white/25'
                      : 'text-white/90 hover:text-white hover:bg-white/10 font-medium'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}

            {/* Extra Links on Full Screen (2xl) */}
            <div className="hidden 2xl:flex items-center gap-1.5">
              {secondaryNavLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-xl text-[15px] transition-colors flex items-center gap-2 min-h-[40px] ${
                      isActive
                        ? 'bg-[#0C65E8] text-white shadow-sm font-semibold border border-white/25'
                        : 'text-white/90 hover:text-white hover:bg-white/10 font-medium'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Dropdown "เพิ่มเติม" on compact desktop (lg - xl) */}
            <div className="2xl:hidden relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`px-3.5 py-2 rounded-xl text-[15px] font-medium transition-colors flex items-center gap-1.5 min-h-[40px] ${
                  showMoreMenu
                    ? 'bg-white/20 text-white'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>เพิ่มเติม</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white text-[#073967] rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
                  {secondaryNavLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMoreMenu(false)}
                      className={({ isActive }) =>
                        `px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors ${
                          isActive
                            ? 'bg-[#0C65E8]/10 text-[#0C65E8] font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 text-slate-400" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                  <div className="my-1 border-t border-slate-100" />
                  <Link
                    to="/report"
                    onClick={() => setShowMoreMenu(false)}
                    className="px-4 py-2.5 text-sm font-semibold flex items-center gap-2.5 text-amber-700 hover:bg-amber-50"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-amber-600" />
                    <span>+ ส่งรายงานเหตุการณ์ใหม่</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>
          {/* Right: Search, Notification & TH Language Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Quick District Search Input (Section 50.12) */}
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
                  placeholder="ค้นหาพื้นที่ ตำบล อำเภอ หรือจังหวัด..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-36 sm:w-56 lg:w-72 bg-white/10 border border-white/20 text-white placeholder-white/65 text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] focus:bg-white/20 transition-all min-h-[42px]"
                />
                <Search className="w-4 h-4 text-white/70 absolute left-3 pointer-events-none" />
              </form>

              {/* Autocomplete Dropdown */}
              {showSearchResults && searchTerm.trim() && (
                <div 
                  className="absolute right-0 top-full mt-2 w-64 bg-white text-[#073967] rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden"
                  onMouseLeave={() => setShowSearchResults(false)}
                >
                  <div className="px-3.5 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>เลือกอำเภอในปราจีนบุรี</span>
                  </div>
                  {filteredDistricts.length > 0 ? (
                    filteredDistricts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDistrictSelect(d)}
                        className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-sky-50 transition-colors flex items-center justify-between group"
                      >
                        <span className="font-semibold text-slate-800 group-hover:text-[#0C65E8]">อ.{d}</span>
                        <span className="text-xs text-slate-500 font-medium">จ.ปราจีนบุรี</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3.5 py-3 text-sm text-slate-500 text-center">
                      ไม่พบชื่อพื้นที่ที่ค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="การแจ้งเตือน"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white text-[#073967] rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-bold text-[#063B70]">การแจ้งเตือนล่าสุด</span>
                    <Link 
                      to="/official-updates" 
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-[#0C65E8] hover:underline font-semibold"
                    >
                      ดูทั้งหมด
                    </Link>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                      <div className="font-semibold text-[#063B70] text-xs">รายงานผลตรวจคุณภาพน้ำผิวดิน</div>
                      <div className="text-xs text-slate-500 mt-0.5">กรมควบคุมมลพิษ / สคพ.7 ประจำเดือน</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                      <div className="font-semibold text-amber-900 text-xs">เฝ้าระวังพื้นที่ลุ่มน้ำตอนล่าง</div>
                      <div className="text-xs text-amber-700 mt-0.5">อ.บ้านสร้าง และ อ.ศรีมหาโพธิ</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Language Tag */}
            <div className="hidden sm:flex items-center justify-center bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm font-bold text-white select-none min-h-[40px]">
              <span>TH</span>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              className="lg:hidden p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Slide-down Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#04274B] border-t border-white/10 px-4 py-5 space-y-4 shadow-2xl animate-in slide-in-from-top duration-150">
            <div className="text-xs font-bold text-sky-300 uppercase tracking-wider px-2">
              เมนูทั้งหมด
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allNavLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors min-h-[48px] ${
                      isActive
                        ? 'bg-[#0C65E8] text-white font-semibold'
                        : 'text-sky-100 hover:bg-white/10'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 text-sky-300 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Send Report CTA */}
            <div className="pt-2">
              <Link
                to="/report"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2 min-h-[48px] transition-colors"
              >
                <MessageSquarePlus className="w-5 h-5" />
                <span>+ ส่งรายงานข้อสังเกตใหม่</span>
              </Link>
            </div>

            {/* Emergency Hotline Quick Access */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm text-sky-200 px-2">
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-rose-400" />
                สายด่วนมลพิษ PCD:
              </span>
              <a href="tel:1650" className="font-bold text-white bg-rose-600 px-3 py-1.5 rounded-lg text-sm min-h-[36px] flex items-center">
                1650
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. Page Content Outlet */}
      <main className="flex-1 pb-20 lg:pb-8">
        <Outlet />
      </main>

      {/* 4. Footer */}
      <footer className="w-full bg-[#063B70] text-white border-t border-[#0C65E8]/30 py-8 px-4 sm:px-6">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left: Brand & Mission */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0C65E8] flex items-center justify-center shrink-0 border border-white/20">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight text-white">FloodTrace</div>
              <div className="text-sm text-sky-200 font-medium">
                เฝ้าระวังการปนเปื้อนในสิ่งแวดล้อม เพื่อชุมชนที่ปลอดภัย
              </div>
            </div>
          </div>

          {/* Center: Transparency Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-sky-200">
            <Link
              to="/data-methodology"
              className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-sky-300" />
              <span>วิธีวิทยาและข้อจำกัด</span>
            </Link>
            <span className="text-white/30 hidden sm:inline">•</span>
            <Link
              to="/knowledge"
              className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>คำแนะนำการใช้น้ำ</span>
            </Link>
            <span className="text-white/30 hidden sm:inline">•</span>
            <Link
              to="/about"
              className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
            >
              <Info className="w-4 h-4 text-sky-300" />
              <span>เกี่ยวกับระบบ</span>
            </Link>
            <span className="text-white/30 hidden sm:inline">•</span>
            <a
              href="tel:1650"
              className="hover:text-white hover:underline transition-colors flex items-center gap-1.5 text-rose-300"
            >
              <PhoneCall className="w-4 h-4" />
              <span>แจ้งเหตุมลพิษ 1650</span>
            </a>
          </div>

          {/* Right: Disclaimer & Provenance Notice */}
          <div className="text-center md:text-right">
            <div className="text-sm text-sky-200 font-semibold">
              ข้อมูลเปิดเพื่อประโยชน์สาธารณะ
            </div>
            <div className="text-xs text-sky-300/80 mt-0.5">
              ประมวลผลข้อมูลตามหลักการพิสูจน์แหล่งที่มา (Provenance-backed)
            </div>
          </div>

        </div>
      </footer>

      {/* 5. Mobile Bottom Navigation Bar (Touch targets >= 44x44px) */}
      <nav aria-label="การนำทางบนมือถือ" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#063B70] border-t border-[#0C65E8]/40 shadow-2xl flex items-center justify-around h-16 px-1 safe-area-inset-bottom">
        <NavLink
          to="/overview"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-white font-bold' : 'text-sky-200/70 hover:text-white'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">หน้าหลัก</span>
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-white font-bold' : 'text-sky-200/70 hover:text-white'
            }`
          }
        >
          <Map className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">แผนที่</span>
        </NavLink>

        <NavLink
          to="/my-area"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-white font-bold' : 'text-sky-200/70 hover:text-white'
            }`
          }
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">พื้นที่ฉัน</span>
        </NavLink>

        <NavLink
          to="/cases"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-white font-bold' : 'text-sky-200/70 hover:text-white'
            }`
          }
        >
          <FileWarning className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">รายงาน</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="เมนูทั้งหมด"
          className="flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] text-sky-200/70 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">เมนู</span>
        </button>
      </nav>

    </div>
  );
};
