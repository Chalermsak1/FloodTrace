import React, { useState } from 'react';
import { Search, Waves, ChevronDown, ShieldCheck, Info } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onSearchSelect: (district: string) => void;
  onOpenGovernance: () => void;
  onOpenAbout: () => void;
  systemMode?: 'DEVELOPMENT' | 'PRODUCTION';
  onToggleMode?: () => void;
  switchingMode?: boolean;
}

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'เมืองปราจีนบุรี',
  'ศรีมหาโพธิ',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onSearchSelect,
  onOpenGovernance,
  onOpenAbout,
  systemMode = 'DEVELOPMENT',
  onToggleMode,
  switchingMode = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const filteredDistricts = PRACHIN_DISTRICTS.filter(d =>
    d.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredDistricts.length > 0) {
      onSearchSelect(filteredDistricts[0]);
      setShowSearchResults(false);
      setSearchTerm('');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#103D76] text-white shadow-md border-b border-[#0C57C7]/30">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-16 sm:h-[70px] flex items-center justify-between gap-4">
        
        {/* Left: FloodTrace Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          onClick={() => {
            onSelectTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#0C65E8] flex items-center justify-center shadow-inner border border-white/20">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white leading-none">Ruwaigon</span>
              <span className="text-xs font-medium bg-[#0C65E8]/80 text-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300/30">
                ปราจีนบุรี
              </span>
            </div>
            <p className="text-xs text-sky-200/90 font-medium leading-tight mt-0.5">
              เฝ้าระวังการปนเปื้อนในสิ่งแวดล้อม เพื่อชุมชนที่ปลอดภัย
            </p>
          </div>
        </div>

        {/* Center: Main Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onSelectTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'home'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            หน้าหลัก
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTab('my-area');
              const el = document.getElementById('section-my-area');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'my-area'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            พื้นที่ของฉัน
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTab('report');
              const el = document.getElementById('section-report');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'report'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            รายงานเหตุการณ์
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTab('official');
              const el = document.getElementById('section-official');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'official'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-white/85 hover:text-white hover:bg-white/10'
            }`}
          >
            ผลตรวจจากหน่วยงาน
          </button>
          <button
            type="button"
            onClick={onOpenGovernance}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-sky-300" />
            ข้อมูลและวิธีการ
          </button>
          <button
            type="button"
            onClick={onOpenAbout}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/85 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <Info className="w-4 h-4 text-sky-300" />
            เกี่ยวกับเรา
          </button>
        </nav>

        {/* Right: Search, Language & System Mode */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Search Field */}
          <div className="relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="ค้นหาพื้นที่ ตำบล อำเภอ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-44 sm:w-56 md:w-64 bg-white/10 border border-white/20 text-white placeholder-white/60 text-xs sm:text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5794E0] focus:bg-white/20 transition-all"
              />
              <Search className="w-4 h-4 text-white/60 absolute left-2.5 pointer-events-none" />
            </form>

            {/* Search Dropdown Results */}
            {showSearchResults && searchTerm.trim() && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-64 bg-white text-[#0B243D] rounded-lg shadow-xl border border-[#C4C7D1] py-1.5 z-50 overflow-hidden"
                onMouseLeave={() => setShowSearchResults(false)}
              >
                <div className="px-3 py-1.5 text-xs font-semibold text-[#717F8F] uppercase tracking-wider border-b border-slate-100">
                  อำเภอในจังหวัดปราจีนบุรี
                </div>
                {filteredDistricts.length > 0 ? (
                  filteredDistricts.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        onSearchSelect(d);
                        setShowSearchResults(false);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#E3EAF1] transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-[#0B243D]">อ.{d}</span>
                      <span className="text-xs text-[#717F8F]">จ.ปราจีนบุรี</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-xs text-[#717F8F] text-center">
                    ไม่พบพื้นที่ที่ระบุ
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white select-none cursor-pointer hover:bg-white/20 transition-colors">
            <span>TH</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/70" />
          </div>

          {/* Mode Badge / Toggle (Audit Safety Gate) */}
          {onToggleMode && (
            <button
              type="button"
              onClick={onToggleMode}
              disabled={switchingMode}
              title={`สลับโหมดระบบ (ปัจจุบัน: ${systemMode})`}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                systemMode === 'PRODUCTION'
                  ? 'bg-rose-950/80 text-rose-200 border-rose-500/50 hover:bg-rose-900'
                  : 'bg-emerald-950/80 text-emerald-200 border-emerald-500/50 hover:bg-emerald-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${systemMode === 'PRODUCTION' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              <span>{systemMode === 'PRODUCTION' ? 'PROD (BLOCKED)' : 'DEV MODE'}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
