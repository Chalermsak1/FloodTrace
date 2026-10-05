import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  Compass,
  FileText,
  Info,
  Map,
  Menu,
  Search,
  ShieldCheck,
  Waves,
  X,
} from 'lucide-react';

const PRACHIN_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ',
];

const primaryNavLinks = [
  { to: '/overview', label: 'หน้าหลัก', icon: Waves },
  { to: '/map', label: 'แผนที่เฝ้าระวัง', icon: Map },
  { to: '/my-area', label: 'พื้นที่ของฉัน', icon: Compass },
  { to: '/cases', label: 'รายงานจากประชาชน', icon: FileText },
  { to: '/data-methodology', label: 'แหล่งข้อมูลและวิธีวิทยา', icon: ShieldCheck },
];

const secondaryNavLinks = [
  { to: '/official-updates', label: 'ข้อมูลจากหน่วยงาน', icon: ShieldCheck },
  { to: '/forecast', label: 'แนวโน้มและการคาดการณ์', icon: Map },
  { to: '/knowledge', label: 'ความรู้และคำแนะนำ', icon: BookOpen },
  { to: '/about', label: 'เกี่ยวกับ Ruwaigon', icon: Info },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rw-nav-link ${isActive ? 'is-active' : ''}`;

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const filteredDistricts = PRACHIN_DISTRICTS.filter((district) =>
    district.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setShowSearchResults(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) setShowMoreMenu(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearchResults(false);
        setShowMoreMenu(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const handleDistrictSelect = (district: string) => {
    setShowSearchResults(false);
    setSearchTerm('');
    setIsMobileMenuOpen(false);
    navigate(`/overview?district=${encodeURIComponent(district)}`);
  };

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setShowMoreMenu(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FC] text-[#073967]">
      <aside className="rw-scope-bar" aria-label="ขอบเขตและชนิดข้อมูล">
        <div className="rw-shell rw-scope-bar-inner">
          <span className="rw-scope-label"><Map className="h-4 w-4" aria-hidden="true" /> ขอบเขตการใช้งาน: จังหวัดปราจีนบุรี</span>
          <span className="rw-scope-note">แยกข้อมูลตามหลักฐาน แหล่งที่มา และสถานะที่รายงานได้</span>
        </div>
      </aside>

      <header className="rw-site-header">
        <div className="rw-shell rw-header-inner">
          <Link to="/overview" onClick={closeMenus} className="rw-brand" aria-label="Ruwaigon หน้าหลัก">
            <span className="rw-brand-mark"><Waves className="h-5 w-5" aria-hidden="true" /></span>
            <span className="rw-brand-copy">
              <strong>Ruwaigon</strong>
              <span>การเฝ้าระวังสิ่งแวดล้อม · ปราจีนบุรี</span>
            </span>
          </Link>

          <nav className="rw-primary-nav" aria-label="เมนูหลัก">
            {primaryNavLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className="rw-more-wrap" ref={moreMenuRef}>
              <button
                type="button"
                className={`rw-nav-link ${showMoreMenu ? 'is-active' : ''}`}
                onClick={() => setShowMoreMenu((open) => !open)}
                aria-expanded={showMoreMenu}
                aria-haspopup="true"
              >
                <span>เพิ่มเติม</span><ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              {showMoreMenu && (
                <div className="rw-more-menu">
                  {secondaryNavLinks.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={closeMenus} className={navLinkClass}>
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="rw-header-actions">
            <div className="rw-district-search" ref={searchRef}>
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (filteredDistricts.length) handleDistrictSelect(filteredDistricts[0]);
                }}
              >
                <label className="sr-only" htmlFor="rw-district-search">ค้นหาอำเภอในจังหวัดปราจีนบุรี</label>
                <Search className="rw-search-icon h-4 w-4" aria-hidden="true" />
                <input
                  id="rw-district-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => { setSearchTerm(event.target.value); setShowSearchResults(true); }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="ค้นหาอำเภอ"
                  autoComplete="off"
                />
              </form>
              {showSearchResults && searchTerm.trim() && (
                <div className="rw-search-results" role="listbox" aria-label="อำเภอในจังหวัดปราจีนบุรี">
                  {filteredDistricts.length ? filteredDistricts.map((district) => (
                    <button key={district} type="button" role="option" onClick={() => handleDistrictSelect(district)}>
                      <Map className="h-4 w-4" aria-hidden="true" /> อำเภอ{district}
                    </button>
                  )) : <p>ไม่พบอำเภอในจังหวัดปราจีนบุรี</p>}
                </div>
              )}
            </div>
            <Link to="/report" className="rw-report-action" onClick={closeMenus}>
              <FileText className="h-4 w-4" aria-hidden="true" /> <span>ส่งรายงาน</span>
            </Link>
            <button
              type="button"
              className="rw-menu-toggle"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label={isMobileMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="rw-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav id="rw-mobile-menu" className="rw-mobile-menu" aria-label="เมนูทั้งหมด">
            <div className="rw-shell rw-mobile-menu-inner">
              {[...primaryNavLinks, ...secondaryNavLinks].map((item) => (
                <NavLink key={item.to} to={item.to} onClick={closeMenus} className={navLinkClass}>
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" /> <span>{item.label}</span>
                </NavLink>
              ))}
              <Link to="/report" onClick={closeMenus} className="rw-mobile-report">ส่งรายงานจากประชาชน</Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 pb-24 xl:pb-8">
        <Outlet />
      </main>

      <footer className="rw-site-footer">
        <div className="rw-shell rw-footer-inner">
          <Link to="/overview" className="rw-footer-brand">
            <span className="rw-brand-mark"><Waves className="h-5 w-5" aria-hidden="true" /></span>
            <span><strong>Ruwaigon</strong><small>ขอบเขตข้อมูล: จังหวัดปราจีนบุรี</small></span>
          </Link>
          <nav className="rw-footer-links" aria-label="ข้อมูลเพิ่มเติม">
            <Link to="/data-methodology">แหล่งข้อมูลและวิธีวิทยา</Link>
            <Link to="/official-updates">ข้อมูลจากหน่วยงาน</Link>
            <Link to="/about">เกี่ยวกับ Ruwaigon</Link>
          </nav>
          <p className="rw-footer-note">ข้อมูลที่ไม่พร้อมใช้งานหรือยังไม่ยืนยัน จะแสดงตามสถานะที่รายงานได้</p>
        </div>
      </footer>

      <nav className="rw-mobile-bottom-nav" aria-label="การนำทางบนมือถือ">
        <NavLink to="/overview" className={navLinkClass}><Waves className="h-5 w-5" aria-hidden="true" /><span>หน้าหลัก</span></NavLink>
        <NavLink to="/map" className={navLinkClass}><Map className="h-5 w-5" aria-hidden="true" /><span>แผนที่</span></NavLink>
        <NavLink to="/my-area" className={navLinkClass}><Compass className="h-5 w-5" aria-hidden="true" /><span>พื้นที่ฉัน</span></NavLink>
        <NavLink to="/report" className={navLinkClass}><FileText className="h-5 w-5" aria-hidden="true" /><span>ส่งรายงาน</span></NavLink>
      </nav>
    </div>
  );
};
