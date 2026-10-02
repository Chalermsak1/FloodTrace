import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Waves, 
  Search, 
  Map, 
  LayoutDashboard, 
  Compass, 
  FileText, 
  Bell, 
  ShieldCheck, 
  Info, 
  Menu, 
  X, 
  AlertTriangle, 
  MessageSquarePlus, 
  ChevronRight, 
  PhoneCall, 
  FileWarning 
} from 'lucide-react';

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'เมืองปราจีนบุรี',
  'ศรีมหาโพธิ',
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

  const filteredDistricts = PRACHIN_DISTRICTS.filter(d =>
    d.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleDistrictSelect = (district: string) => {
    setShowSearchResults(false);
    setSearchTerm('');
    setIsMobileMenuOpen(false);
    navigate(`/overview?district=${encodeURIComponent(district)}`);
  };

  const navLinks = [
    { to: '/overview', label: 'ภาพรวม', icon: LayoutDashboard },
    { to: '/map', label: 'แผนที่พื้นที่', icon: Map },
    { to: '/my-area', label: 'พื้นที่ของฉัน', icon: Compass },
    { to: '/report', label: 'รายงานข้อสังเกต', icon: MessageSquarePlus, highlight: true },
    { to: '/cases', label: 'รายงานชุมชน', icon: FileWarning },
    { to: '/official-updates', label: 'ข้อมูลทางการ', icon: Bell },
    { to: '/data-methodology', label: 'วิธีวิทยาและข้อมูล', icon: ShieldCheck },
    { to: '/about', label: 'เกี่ยวกับระบบ', icon: Info },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0B243D]">
      
      {/* 1. Mandatory Top Legal & Methodology Disclaimer Banner */}
      <aside aria-label="ข้อความแจ้งเตือนทางกฎหมาย" className="bg-[#0B243D] text-sky-100 text-xs px-4 py-2 border-b border-sky-900/50">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px] shrink-0 border border-amber-400/30">
              ข้อจำกัดทางกฎหมาย
            </span>
            <span className="text-[11px] sm:text-xs text-sky-200">
              FloodTrace เป็นระบบคัดกรองและประเมินลำดับความสำคัญในการเฝ้าระวังสิ่งแวดล้อมภาคประชาชน ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ได้ระบุความรับผิดทางกฎหมายของผู้ใด
            </span>
          </div>
          <Link 
            to="/data-methodology" 
            className="text-[11px] text-sky-300 hover:text-white underline shrink-0 flex items-center gap-1 font-medium"
          >
            <span>อ่านวิธีวิทยาและข้อจำกัด</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </aside>

      {/* 2. Main Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-[#103D76] text-white shadow-md border-b border-[#0C57C7]/30">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-16 sm:h-[70px] flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <Link 
            to="/overview"
            className="flex items-center gap-3 select-none shrink-0 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0C57C7] flex items-center justify-center shadow-inner border border-white/20 group-hover:bg-[#0E62DE] transition-colors">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white leading-none">FloodTrace</span>
                <span className="text-[10px] font-medium bg-[#0C57C7]/80 text-sky-100 px-2 py-0.5 rounded-full border border-sky-300/30">
                  ปราจีนบุรี
                </span>
              </div>
              <p className="text-[11px] text-sky-200/90 font-medium leading-tight mt-0.5">
                เฝ้าระวังน้ำและลำดับความสำคัญสิ่งแวดล้อม
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0C57C7] text-white shadow-sm'
                      : item.highlight
                      ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-400/30'
                      : 'text-white/85 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right: Search, Language & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Quick District Search */}
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
                  placeholder="ค้นหาอำเภอ..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-36 sm:w-48 lg:w-56 bg-white/10 border border-white/20 text-white placeholder-white/60 text-xs rounded-lg pl-7 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5794E0] focus:bg-white/20 transition-all"
                />
                <Search className="w-3.5 h-3.5 text-white/60 absolute left-2 pointer-events-none" />
              </form>

              {/* Autocomplete Dropdown */}
              {showSearchResults && searchTerm.trim() && (
                <div 
                  className="absolute right-0 top-full mt-1.5 w-56 bg-white text-[#0B243D] rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 overflow-hidden"
                  onMouseLeave={() => setShowSearchResults(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    เลือกอำเภอในปราจีนบุรี
                  </div>
                  {filteredDistricts.length > 0 ? (
                    filteredDistricts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDistrictSelect(d)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800">อ.{d}</span>
                        <span className="text-[10px] text-slate-400">จ.ปราจีนบุรี</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400 text-center">
                      ไม่พบอำเภอที่ค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Language Tag */}
            <div className="hidden sm:flex items-center gap-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-semibold text-white select-none">
              <span>TH</span>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              className="xl:hidden p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Slide-down Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="xl:hidden bg-[#0B243D] border-t border-white/10 px-4 py-4 space-y-2 shadow-2xl animate-in slide-in-from-top duration-150">
            <div className="text-xs font-semibold text-sky-300 uppercase tracking-wider px-2 py-1">
              เมนูหลัก
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {navLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-[#0C57C7] text-white font-semibold'
                        : item.highlight
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                        : 'text-sky-100 hover:bg-white/10'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 text-sky-300" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Emergency Hotline Quick Access */}
            <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-sky-200 px-2">
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
                สายด่วนมลพิษ PCD:
              </span>
              <a href="tel:1650" className="font-bold text-white bg-rose-600 px-2 py-0.5 rounded text-xs min-h-[30px] flex items-center">
                1650
              </a>
            </div>
          </div>
        )}
      </header>

      {/* 3. Page Content Outlet */}
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* 4. Footer */}
      <footer className="w-full bg-[#103D76] text-white border-t border-[#0C57C7]/40 py-8 px-4 sm:px-6">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left: Brand & Mission */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0C57C7] flex items-center justify-center shrink-0 border border-white/20">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-white">FloodTrace</div>
              <div className="text-xs text-sky-200/90 font-medium">
                เฝ้าระวังน้ำและลำดับความสำคัญสิ่งแวดล้อม จังหวัดปราจีนบุรี
              </div>
            </div>
          </div>

          {/* Center: Legal & Transparency Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-sky-200">
            <Link
              to="/data-methodology"
              className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
              วิธีวิทยาและข้อจำกัด
            </Link>
            <span className="text-white/30 hidden sm:inline">•</span>
            <Link
              to="/about"
              className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-amber-300" />
              เกี่ยวกับเรา
            </Link>
            <span className="text-white/30 hidden sm:inline">•</span>
            <a
              href="tel:1650"
              className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-300" />
              แจ้งเหตุสายด่วน 1650
            </a>
          </div>

          {/* Right: Disclaimer & Provenance Notice */}
          <div className="text-center md:text-right">
            <div className="text-xs text-sky-200/90 font-medium">
              ข้อมูลเปิดเพื่อประโยชน์สาธารณะ
            </div>
            <div className="text-[11px] text-sky-300/70 mt-0.5">
              ระบบประมวลผลข้อมูลตามหลักการพิสูจน์แหล่งที่มา (Provenance-backed)
            </div>
          </div>

        </div>
      </footer>

      {/* 5. Mobile Bottom Navigation Bar (Thumb-friendly touch targets >= 44x44px) */}
      <nav aria-label="การนำทางบนมือถือ" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#103D76] border-t border-[#0C57C7]/50 shadow-2xl flex items-center justify-around h-16 px-1 safe-area-inset-bottom">
        <NavLink
          to="/overview"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-white font-bold' : 'text-sky-200/70 hover:text-white'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">ภาพรวม</span>
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
          <span className="text-[10px]">แผนที่</span>
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
          <span className="text-[10px]">พื้นที่ฉัน</span>
        </NavLink>

        <NavLink
          to="/report"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] transition-colors ${
              isActive ? 'text-amber-300 font-bold' : 'text-amber-200/80 hover:text-amber-200'
            }`
          }
        >
          <MessageSquarePlus className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">รายงาน</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="เมนูทั้งหมด"
          className="flex flex-col items-center justify-center w-full h-full min-h-[44px] min-w-[44px] text-sky-200/70 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">เมนู</span>
        </button>
      </nav>

    </div>
  );
};
