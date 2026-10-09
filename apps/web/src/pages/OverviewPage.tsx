import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Compass, 
  ChevronRight, 
  ChevronDown,
  ShieldCheck, 
  AlertTriangle,
  Building2,
  Bell,
  Clock,
  Waves,
  Activity,
  Droplets,
  CloudRain,
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
import { NewsCard } from '../components/news/NewsCard';
import { InformationDetailModal, ExternalInformationDetail } from '../components/news/InformationDetailModal';
import { SituationHeroSection } from '../components/sections/SituationHeroSection';
import { MobileHomepageView } from '../components/mobile/MobileHomepageView';
import { DesktopMonitoringDashboard } from '../components/desktop/DesktopMonitoringDashboard';

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
  const [infoCategory, setInfoCategory] = useState<'ALL' | 'OFFICIAL' | 'NEWS' | 'PUBLIC'>('ALL');
  const [selectedInfoModal, setSelectedInfoModal] = useState<ExternalInformationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<boolean>(false);

  // Real External Evidence & Telemetry for Hero Situation View
  const [externalEvidence, setExternalEvidence] = useState<any[]>([]);
  const [waterStations, setWaterStations] = useState<any[]>([]);
  const [rainfallStations, setRainfallStations] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState<boolean>(true);
  const [evidenceError, setEvidenceError] = useState<boolean>(false);
  const [sseStatus, setSseStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Fetch Real Data from Public APIs with graceful cache retention
  const loadAllData = () => {
    Promise.all([
      fetch('/api/public/overview').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/external-evidence?group_by_event=true&limit=10').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/stations').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/rainfall-stations').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/public/information?limit=100')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(infoRes => {
          if (Array.isArray(infoRes) && infoRes.length > 0) return infoRes;
          return fetch('/api/public/official-updates').then(r => r.ok ? r.json() : null).catch(() => null);
        })
    ])
      .then(([overviewRes, evRes, waterRes, rainRes, updatesRes]) => {
        if (overviewRes) {
          setOverviewData(overviewRes);
          setFetchError(false);
          if (Array.isArray(updatesRes) && updatesRes.length > 0) {
            setOfficialUpdates(updatesRes);
          }
        } else {
          setOverviewData(prev => {
            if (!prev) setFetchError(true);
            return prev;
          });
        }

        if (Array.isArray(evRes) && evRes.length > 0) {
          setExternalEvidence(evRes);
          setEvidenceError(false);
        } else if (Array.isArray(evRes)) {
          setExternalEvidence(prev => prev.length > 0 ? prev : []);
        } else {
          // Transient failure: retain previously loaded evidence
          setExternalEvidence(prev => {
            if (!prev || prev.length === 0) setEvidenceError(true);
            return prev;
          });
        }

        if (Array.isArray(waterRes)) setWaterStations(waterRes);
        if (Array.isArray(rainRes)) setRainfallStations(rainRes);

        setEvidenceLoading(false);
        setLoading(false);
        setLastRefreshedAt(new Date());
      })
      .catch(() => {
        setOverviewData(prev => {
          if (!prev) setFetchError(true);
          return prev;
        });
        setExternalEvidence(prev => {
          if (!prev || prev.length === 0) setEvidenceError(true);
          return prev;
        });
        setLoading(false);
        setEvidenceLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    setEvidenceLoading(true);
    setFetchError(false);
    loadAllData();

    // Reusing application's existing SSE stream (/api/v1/realtime/events) (Section 23)
    let sse: EventSource | null = null;
    let reconnectTimeout: any = null;
    let retryCount = 0;

    const connectSSE = () => {
      if (sse) sse.close();
      setSseStatus('reconnecting');
      const sseUrl = window.location.hostname.includes('onrender.com')
        ? 'https://floodtrace-api.onrender.com/api/v1/realtime/events'
        : '/api/v1/realtime/events';
      sse = new EventSource(sseUrl);

      sse.addEventListener('open', () => {
        setSseStatus('connected');
        retryCount = 0;
      });

      sse.addEventListener('CONNECTED', () => {
        setSseStatus('connected');
        retryCount = 0;
      });

      sse.addEventListener('DATA_UPDATED', () => {
        setLastRefreshedAt(new Date());
        loadAllData();
      });

      sse.onerror = () => {
        setSseStatus('reconnecting');
        if (sse) sse.close();
        retryCount++;
        const backoff = Math.min(30000, 2000 * Math.pow(1.5, Math.min(retryCount, 5)));
        reconnectTimeout = setTimeout(connectSSE, backoff);
      };
    };

    connectSSE();

    // Periodic heartbeat sync every 30s to guarantee fresh telemetry
    const pollInterval = setInterval(() => {
      loadAllData();
    }, 30000);

    return () => {
      if (sse) sse.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, []);

  // Filter multi-source information by selected category tab (Section 59)
  const filteredUpdates = useMemo(() => {
    if (infoCategory === 'ALL') return officialUpdates;
    if (infoCategory === 'OFFICIAL') {
      return officialUpdates.filter(item => 
        item.authority_level === 'OFFICIAL' ||
        item.source_type === 'OFFICIAL_DATA' ||
        item.source_type === 'OFFICIAL_ANNOUNCEMENT' ||
        item.source_type === 'GOVERNMENT_WEBSITE' ||
        item.badge === 'OFFICIAL'
      );
    }
    if (infoCategory === 'NEWS') {
      return officialUpdates.filter(item =>
        item.source_type === 'NEWS_MEDIA' ||
        item.authority_level === 'SECONDARY' ||
        item.authority_level === 'CURATED_PUBLIC_SOURCE' ||
        item.verification_status === 'CURATED'
      );
    }
    if (infoCategory === 'PUBLIC') {
      return officialUpdates.filter(item =>
        item.source_type === 'PUBLIC_SOCIAL' ||
        item.source_type === 'CITIZEN_OBSERVATION' ||
        item.authority_level === 'PUBLIC' ||
        item.authority_level === 'UNVERIFIED'
      );
    }
    return officialUpdates;
  }, [officialUpdates, infoCategory]);

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
    <div className="w-full flex flex-col animate-fadeIn">
      
      {/* ============================================================ */}
      {/* MOBILE HOMEPAGE VIEW: Dedicated iPhone Reference Design       */}
      {/* (Active on mobile viewports: < 1024px)                       */}
      {/* ============================================================ */}
      <div className="block lg:hidden w-full">
        <MobileHomepageView
          overviewData={overviewData}
          externalEvidence={externalEvidence}
          waterStations={waterStations}
          rainfallStations={rainfallStations}
          officialUpdates={officialUpdates}
          evidenceLoading={evidenceLoading}
          evidenceError={evidenceError}
          lastRefreshedAt={lastRefreshedAt}
          onSelectEvidence={(item) => setSelectedInfoModal(item)}
        />
      </div>

      {/* ============================================================ */}
      {/* DESKTOP HOMEPAGE VIEW: MODERN MONITORING DASHBOARD (>= 1200px)*/}
      {/* Strict Reference Design: Blue/white, 3-column workspace       */}
      {/* ============================================================ */}
      <div className="hidden xl:flex w-full min-h-screen">
        <DesktopMonitoringDashboard
          overviewData={overviewData}
          waterStations={waterStations}
          rainfallStations={rainfallStations}
          officialUpdates={officialUpdates}
          externalEvidence={externalEvidence}
          evidenceLoading={evidenceLoading}
          evidenceError={evidenceError}
          sseStatus={sseStatus}
          lastRefreshedAt={lastRefreshedAt}
          onSelectEvidence={(item) => setSelectedInfoModal(item)}
        />
      </div>

      {/* ============================================================ */}
      {/* TABLET VIEW (1024px - 1199px): Responsive Adaptation         */}
      {/* ============================================================ */}
      <div className="hidden lg:flex xl:hidden lg:flex-col w-full">
        {/* SITUATION COMMAND VIEW HERO SECTION (Section 2 & 3) */}
        <SituationHeroSection
        overviewData={overviewData}
        externalEvidence={externalEvidence}
        waterStations={waterStations}
        rainfallStations={rainfallStations}
        evidenceLoading={evidenceLoading}
        evidenceError={evidenceError}
        sseStatus={sseStatus}
        lastRefreshedAt={lastRefreshedAt}
        onSelectEvidence={(item) => setSelectedInfoModal(item)}
        onScrollToContent={() => {
          const el = document.getElementById('overview-content');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* ============================================================ */}
      {/* MAIN CONTENT CONTAINER                                       */}
      {/* ============================================================ */}
      <div id="overview-content" className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 lg:space-y-12">
        
        {/* Scope & District Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-slate-700">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0C65E8] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">ขอบเขตการวิเคราะห์ปัจจุบัน:</span>
              <span className="text-sm sm:text-base font-bold text-slate-900">
                จังหวัดปราจีนบุรี (ครอบคลุม 7 อำเภอหลัก)
              </span>
            </div>
          </div>

          <div className="relative flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="ค้นหาพื้นที่ ตำบล อำเภอ หรือแม่น้ำ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 text-sm sm:text-base rounded-xl pl-10 pr-24 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] focus:border-transparent transition-all min-h-[44px]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1.5 px-4 py-1.5 bg-[#0C65E8] hover:bg-[#063B70] text-white text-sm font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1"
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
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                  <span>ผลการค้นหาใน จ.ปราจีนบุรี</span>
                  <span className="text-xs text-[#0C65E8] font-medium">{searchResults.length} รายการ</span>
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
                          <span className="font-semibold text-sm sm:text-base text-slate-800 group-hover:text-[#0C65E8]">
                            {item.label}
                          </span>
                          <span className="block text-xs text-slate-500 mt-0.5">{item.sub}</span>
                        </div>
                        <span className="text-xs sm:text-sm text-[#0C65E8] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          ดูแผนที่ <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500 text-center">
                    ไม่พบพื้นที่ที่ค้นหาในขอบเขตการวิเคราะห์ จ.ปราจีนบุรี
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* ============================================================ */}
      {/* SECTION D & 10: QUICK ACCESS CARDS                           */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* SECTION D & 11: QUICK ACCESS NAVIGATION SHORTCUTS            */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-[#063B70]">
            ทางลัดการใช้งานระบบ (Quick Access)
          </h2>
          <span className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:inline">
            เลือกส่วนงานที่ต้องการสำรวจหรือส่งข้อมูล
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: สถานการณ์ล่าสุด */}
          <Link
            to="/map"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-[#0C65E8]/60 transition-all group flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-base font-bold text-slate-800 group-hover:text-[#0C65E8] transition-colors">
                  สถานการณ์ล่าสุด
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#0C65E8] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                ตรวจสอบภาพรวมและระดับความสำคัญในการเฝ้าระวังเชิงพื้นที่
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0C65E8]">
              <span>เปิดแผนที่เฝ้าระวัง</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: ข้อมูลจากหน่วยงาน */}
          <Link
            to="/official-updates"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-[#0C65E8]/60 transition-all group flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-base font-bold text-slate-800 group-hover:text-[#0C65E8] transition-colors">
                  ข้อมูลจากหน่วยงาน
                </span>
                <span className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                ข้อมูลโทรมาตรระดับน้ำ ปริมาณฝน และข้อมูลสิ่งแวดล้อมทางการ
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0284C7]">
              <span>ดูข้อมูลโทรมาตร</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: รายงานจากประชาชน */}
          <Link
            to="/cases"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-[#0D9488]/60 transition-all group flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-base font-bold text-slate-800 group-hover:text-[#0D9488] transition-colors">
                  รายงานจากประชาชน
                </span>
                <span className="w-8 h-8 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                รวบรวมข้อสังเกตสภาพน้ำและสิ่งแวดล้อมจากชุมชนในพื้นที่
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0D9488]">
              <span>สำรวจรายงานชุมชน</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: พื้นที่เฝ้าระวัง */}
          <Link
            to="/my-area"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-card hover:border-[#7C3AED]/60 transition-all group flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-base font-bold text-slate-800 group-hover:text-[#7C3AED] transition-colors">
                  พื้นที่เฝ้าระวัง
                </span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                สำรวจข้อมูลพื้นที่ 7 อำเภอที่ควรได้รับการติดตามและตรวจสอบ
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#7C3AED]">
              <span>ดูข้อมูลรายอำเภอ</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>

        {/* Dynamic Telemetry Status Summary (Section 56 & 34) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="pt-2 md:pt-0 md:px-3 first:pl-0">
              <span className="text-xs text-slate-500 block mb-1">สถานีตรวจวัดอัตโนมัติ:</span>
              <span className="text-sm sm:text-base font-bold text-slate-900">
                {loading ? '...' : `${overviewData?.total_water_stations ?? 27} สถานีน้ำ + ${overviewData?.total_rainfall_stations ?? 77} สถานีฝน`}
              </span>
            </div>
            <div className="pt-2 md:pt-0 md:px-3">
              <span className="text-xs text-slate-500 block mb-1">พื้นที่ที่ควรติดตาม:</span>
              <span className="text-sm sm:text-base font-bold text-orange-600">
                {loading ? '...' : `${overviewData?.priority_counts?.high ?? 3} โซนเฝ้าระวัง`}
              </span>
            </div>
            <div className="pt-2 md:pt-0 md:px-3">
              <span className="text-xs text-slate-500 block mb-1">รายงานชุมชนที่ได้รับ:</span>
              <span className="text-sm sm:text-base font-bold text-teal-700">
                {loading ? '...' : `${overviewData?.total_citizen_reports ?? 0} รายการ`}
              </span>
            </div>
            <div className="pt-2 md:pt-0 md:px-3">
              <span className="text-xs text-slate-500 block mb-1">ข้อมูลล่าสุดในระบบ:</span>
              <span className="text-sm sm:text-base font-bold text-slate-700">
                {loading ? '...' : (overviewData?.system_updated_at_th ?? overviewData?.last_updated ?? 'ตรวจสอบเวลาล่าสุด')}
              </span>
            </div>
          </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#063B70]">
                ข่าวสารและข้อมูลล่าสุด
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                ข้อมูลทางการ ข่าวสาร และรายงานสาธารณะที่เชื่อมโยงกับเหตุการณ์เฝ้าระวัง
              </p>
            </div>
            <Link
              to="/official-updates"
              className="text-sm font-semibold text-[#0C65E8] hover:text-[#063B70] flex items-center gap-1 transition-colors self-start sm:self-auto shrink-0"
            >
              <span>ดูทั้งหมด</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Category Filter Tabs (Section 59) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setInfoCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 min-h-[38px] ${
                infoCategory === 'ALL'
                  ? 'bg-[#0C65E8] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setInfoCategory('OFFICIAL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 min-h-[38px] ${
                infoCategory === 'OFFICIAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              ข้อมูลทางการ
            </button>
            <button
              onClick={() => setInfoCategory('NEWS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 min-h-[38px] ${
                infoCategory === 'NEWS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              ข่าวสาร
            </button>
            <button
              onClick={() => setInfoCategory('PUBLIC')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 min-h-[38px] ${
                infoCategory === 'PUBLIC'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              รายงานสาธารณะ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUpdates.slice(0, 6).map((item) => (
              <NewsCard 
                key={item.id} 
                item={item} 
                onSelect={(selected) => setSelectedInfoModal(selected as any)}
              />
            ))}

            {filteredUpdates.length === 0 && (
              <div className="col-span-full text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-sm text-slate-400">
                ยังไม่พบข้อมูลสาธารณะที่ตรวจสอบแหล่งต้นทางได้
              </div>
            )}
          </div>
        </section>

        {/* CITIZEN PARTICIPATION PANEL (~35% -> 4 cols - Section 19 & 50.12) */}
        <section className="lg:col-span-4 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]/70 rounded-3xl p-6 sm:p-7 border border-[#BFDBFE] shadow-card space-y-4">
          <div className="w-11 h-11 rounded-2xl bg-[#0C65E8] text-white flex items-center justify-center shadow-sm">
            <MessageSquarePlus className="w-6 h-6" />
          </div>

          <div>
            <h3 className="font-bold text-xl sm:text-2xl text-[#063B70]">
              สำหรับประชาชน
            </h3>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed mt-1">
              พบเห็นปัญหา แจ้งข้อมูลได้ที่นี่ เพื่อช่วยให้ทีมงานและชุมชนติดตามสถานการณ์ได้
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-white/60 space-y-2.5 text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className="text-[#0C65E8] font-bold mt-0.5">•</span>
              <span className="leading-relaxed">แจ้งข้อสังเกตน้ำเปลี่ยนสี มีกลิ่น หรือพบคราบผิดปกติ</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-[#0C65E8] font-bold mt-0.5">•</span>
              <span className="leading-relaxed">ระบบรักษาความเป็นส่วนตัว ไม่เปิดเผยชื่อหรือพิกัดบ้านเรือน</span>
            </div>
          </div>

          <Link
            to="/report"
            className="w-full py-3.5 px-5 bg-[#0C65E8] hover:bg-[#063B70] text-white text-base font-semibold rounded-xl text-center flex items-center justify-center gap-2 shadow-sm transition-colors min-h-[48px]"
          >
            <span>แจ้งรายงานจากประชาชน</span>
            <ChevronRight className="w-5 h-5" />
          </Link>

          {/* Secondary Links (Section 19) */}
          <div className="pt-2 border-t border-[#BFDBFE]/60 flex items-center justify-between text-sm font-medium text-slate-600">
            <Link to="/knowledge" className="hover:text-[#0C65E8] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>วิธีการใช้งาน</span>
            </Link>
            <Link to="/knowledge" className="hover:text-[#0C65E8] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-400" />
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-slate-800">
              ความโปร่งใสและที่มาของข้อมูล (Data Provenance & Trust)
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              เชื่อมต่อข้อมูลเปิดจากสถาบันสารสนเทศทรัพยากรน้ำ (HII / ThaiWater), กรมควบคุมมลพิษ (PCD), GISTDA, รายงานจากประชาชน และแบบจำลอง FloodTrace
            </p>
          </div>
        </div>

        <Link
          to="/data-methodology"
          className="text-sm font-semibold text-[#0C65E8] hover:underline flex items-center gap-1.5 shrink-0 self-start md:self-auto"
        >
          <span>วิธีวิทยาและข้อจำกัด</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </section>
      </div>
      </div>

      {/* Information Detail Modal (Shared between Mobile & Desktop) */}
      <InformationDetailModal 
        item={selectedInfoModal} 
        onClose={() => setSelectedInfoModal(null)} 
      />

    </div>
  );
};
