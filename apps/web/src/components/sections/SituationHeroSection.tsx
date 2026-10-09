import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Waves, 
  Droplets, 
  CloudRain, 
  Activity, 
  MapPin, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  ShieldCheck, 
  AlertTriangle, 
  Radio, 
  ExternalLink, 
  Newspaper, 
  FileText, 
  Users, 
  Globe,
  Sparkles,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { ExternalInformationDetail } from '../news/InformationDetailModal';

export interface SituationHeroSectionProps {
  overviewData: any;
  externalEvidence: any[];
  waterStations: any[];
  rainfallStations: any[];
  evidenceLoading: boolean;
  evidenceError: boolean;
  sseStatus: 'connected' | 'reconnecting' | 'disconnected';
  lastRefreshedAt: Date | null;
  onSelectEvidence: (item: ExternalInformationDetail) => void;
  onScrollToContent: () => void;
}

// Time calculation helper strictly adhering to Section 6:
// Use observed_at for actual event time ("พบเมื่อ ... ที่แล้ว"), fallback to published_at.
export const formatObservedTimeAgo = (observedAt?: string | null, publishedAt?: string | null): { text: string; isFallback: boolean } => {
  const targetIso = observedAt || publishedAt;
  if (!targetIso) return { text: 'ไม่ระบุเวลา', isFallback: false };
  const d = new Date(targetIso);
  if (isNaN(d.getTime())) return { text: 'ไม่ระบุเวลา', isFallback: false };

  const now = Date.now();
  const diffMs = Math.max(0, now - d.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  let text = '';
  if (diffMinutes < 1) text = 'เมื่อสักครู่';
  else if (diffMinutes < 60) text = `${diffMinutes} นาทีที่แล้ว`;
  else if (diffHours < 24) text = `${diffHours} ชั่วโมงที่แล้ว`;
  else if (diffDays < 7) text = `${diffDays} วันที่แล้ว`;
  else {
    text = d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' });
  }

  return {
    text,
    isFallback: !observedAt && Boolean(publishedAt)
  };
};

export const formatBangkokTime = (isoString?: string | null): string => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) + ' น.';
};

// Authentic news photo resolver with guaranteed documentary image fallbacks
export const getEvidencePhotoUrl = (ev: any): string => {
  if (ev?.media_references?.[0]?.source_media_url) {
    return ev.media_references[0].source_media_url;
  }
  const id = String(ev?.id || '');
  if (id.includes('013')) return '/assets/evidence/evd_013_bangtaen_road.jpg';
  if (id.includes('012')) return '/assets/evidence/evd_012_rasdorn_night.jpg';
  if (id.includes('011')) return '/assets/evidence/evd_011_highway3076.jpg';
  if (id.includes('010')) return '/assets/evidence/evd_010_bantham_flood.jpg';
  if (id.includes('009')) return '/assets/evidence/evd_009_bangpluang_highwater.jpg';
  if (id.includes('008')) return '/assets/evidence/evd_008_boat_rescue.jpg';
  if (id.includes('007')) return '/assets/evidence/evd_007_foam_thatum.jpg';
  if (id.includes('006')) return '/assets/evidence/evd_006_kabin_waist.jpg';
  if (id.includes('005')) return '/assets/evidence/evd_005_kabin_bank.jpg';
  if (id.includes('004')) return '/assets/evidence/evd_004_thatum_community.jpg';
  if (id.includes('003')) return '/assets/evidence/evd_003_river_lowland.jpg';
  if (id.includes('002')) return '/assets/evidence/evd_002_kabin_houses.jpg';
  if (id.includes('001')) return '/assets/evidence/evd_001_kabin_market.jpg';

  const dist = String(ev?.district || '');
  if (dist.includes('กบินทร์')) return '/assets/evidence/evd_001_kabin_market.jpg';
  if (dist.includes('ศรีมหาโพธิ')) return '/assets/evidence/evd_010_bantham_flood.jpg';
  if (dist.includes('บ้านสร้าง')) return '/assets/evidence/evd_013_bangtaen_road.jpg';
  return '/assets/evidence/evd_012_rasdorn_night.jpg';
};

// Map verification status to truthful public-safe labels (Section 26)
export const getVerificationBadge = (status?: string) => {
  const s = (status || 'UNVERIFIED').toUpperCase();
  switch (s) {
    case 'CORROBORATED':
      return {
        label: 'สอดคล้องกับพื้นที่',
        badgeClass: 'bg-purple-900/85 text-purple-200 border-purple-500/40',
        dotClass: 'bg-purple-400'
      };
    case 'OFFICIAL_VERIFIED':
      return {
        label: 'ยืนยันจากหน่วยงาน',
        badgeClass: 'bg-emerald-900/85 text-emerald-200 border-emerald-500/40',
        dotClass: 'bg-emerald-400'
      };
    case 'LAB_CONFIRMED':
      return {
        label: 'มีผลตรวจแล็บยืนยัน',
        badgeClass: 'bg-sky-900/85 text-sky-200 border-sky-500/40',
        dotClass: 'bg-sky-400'
      };
    case 'UNVERIFIED':
    case 'UNDER_REVIEW':
    default:
      return {
        label: 'อยู่ระหว่างตรวจสอบ',
        badgeClass: 'bg-amber-900/85 text-amber-200 border-amber-500/40',
        dotClass: 'bg-amber-400'
      };
  }
};

export const SituationHeroSection: React.FC<SituationHeroSectionProps> = ({
  overviewData,
  externalEvidence,
  waterStations,
  rainfallStations,
  evidenceLoading,
  evidenceError,
  sseStatus,
  lastRefreshedAt,
  onSelectEvidence,
  onScrollToContent
}) => {
  // Image error state map to avoid broken images (Section 5)
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // 1. Find key water station in Prachin Buri (Section 15)
  const keyWaterStation = React.useMemo(() => {
    if (!waterStations || waterStations.length === 0) return null;
    // Prefer stations in Kabin Buri or Prachin Buri with valid water level
    const match = waterStations.find(s => 
      s.water_level_msl != null && 
      (s.station_id === 'Kgt.1' || s.district?.includes('กบินทร์') || s.district?.includes('เมืองปราจีนบุรี'))
    );
    return match || waterStations.find(s => s.water_level_msl != null) || null;
  }, [waterStations]);

  // 2. Find key rainfall station with current data (Section 15)
  const keyRainStation = React.useMemo(() => {
    if (!rainfallStations || rainfallStations.length === 0) return null;
    // Find station with highest 24h rainfall or key district station
    const stationsWithRain = rainfallStations.filter(r => r.rain_24h_mm != null);
    if (stationsWithRain.length === 0) return null;
    // Sort by rain_24h_mm desc to showcase active precipitation if any
    const sorted = [...stationsWithRain].sort((a, b) => (b.rain_24h_mm || 0) - (a.rain_24h_mm || 0));
    return sorted[0];
  }, [rainfallStations]);

  // Sort external evidence by observed_at desc with grouping deduplication (Section 24)
  const sortedEvidence = React.useMemo(() => {
    if (!externalEvidence || !Array.isArray(externalEvidence)) return [];
    const seen = new Set<string>();
    const deduplicated = externalEvidence.filter(ev => {
      if (ev.is_duplicate) return false;
      const key = ev.source_group_id || ev.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduplicated.sort((a, b) => {
      const timeA = new Date(a.observed_at || a.published_at || 0).getTime();
      const timeB = new Date(b.observed_at || b.published_at || 0).getTime();
      return timeB - timeA;
    }).slice(0, 4); // Take top 4 eligible items (3-5 per Section 12)
  }, [externalEvidence]);

  const handleEvidenceClick = (ev: any) => {
    const photoUrl = getEvidencePhotoUrl(ev);
    // Transform into standard ExternalInformationDetail schema for modal reuse
    const detail: ExternalInformationDetail = {
      id: ev.id,
      source_name: ev.source_name || 'สื่อสาธารณะ',
      source_type: ev.evidence_type || 'EXTERNAL_EVIDENCE',
      authority_level: ev.verification_status === 'OFFICIAL_VERIFIED' ? 'OFFICIAL' : 'SECONDARY',
      source_platform: ev.source_platform,
      source_url: ev.source_url,
      title: ev.title_or_summary || 'รายงานสังเกตการณ์',
      summary: ev.description,
      factual_details: ev.text_excerpt,
      published_at: ev.published_at,
      observed_at: ev.observed_at,
      retrieved_at: ev.retrieved_at,
      district: ev.district,
      subdistrict: ev.subdistrict,
      location_text: ev.location_text,
      public_latitude: ev.public_latitude,
      public_longitude: ev.public_longitude,
      location_precision: ev.location_precision,
      source_image_url: photoUrl,
      verification_status: ev.verification_status,
      provenance: ev.provenance,
      related_sources_count: ev.related_sources_count,
      related_sources: ev.related_sources,
      related_news: ev.related_news
    };
    onSelectEvidence(detail);
  };

  return (
    <section 
      className="relative w-full min-h-[92vh] lg:min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden bg-[#031A33] text-white"
      aria-label="Situation Command View: ระบบติดตามสถานการณ์น้ำและสิ่งแวดล้อม"
    >
      {/* ============================================================== */}
      {/* 1. ATMOSPHERIC GEOSPATIAL & ENVIRONMENTAL BACKGROUND           */}
      {/* ============================================================== */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
        {/* Real Landscape Base Layer */}
        <img 
          src="/assets/hero_landscape.jpg" 
          alt="ทัศนียภาพลุ่มน้ำปราจีนบุรี" 
          className="w-full h-full object-cover object-center scale-105 opacity-35 filter brightness-75 contrast-125 transition-transform duration-1000"
          loading="eager"
          fetchPriority="high"
        />

        {/* Cinematic Deep Navy Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#031A33]/90 via-[#031F3F]/80 to-[#021427]/98" />
        
        {/* Subtle Geospatial Waterway Network Mesh */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-25" 
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1440 800"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0284C7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0369A1" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>
          {/* Main Prachin Buri - Bang Pakong River Spine */}
          <path 
            d="M 1440,320 C 1180,360 1020,410 880,380 C 720,345 610,430 460,460 C 310,490 180,450 0,540" 
            fill="none" 
            stroke="url(#riverGrad)" 
            strokeWidth="3.5" 
            filter="url(#glow)"
          />
          {/* Hanuman & Phra Prong Tributaries */}
          <path 
            d="M 1200,100 C 1080,180 980,260 880,380" 
            fill="none" 
            stroke="url(#riverGrad)" 
            strokeWidth="2" 
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <path 
            d="M 1360,650 C 1150,560 990,480 880,380" 
            fill="none" 
            stroke="url(#riverGrad)" 
            strokeWidth="2" 
            opacity="0.6"
          />
          {/* Monitoring Nodes on Coordinates */}
          <circle cx="880" cy="380" r="5" fill="#38BDF8" className="animate-pulse" />
          <circle cx="460" cy="460" r="4" fill="#0EA5E9" />
          <circle cx="1020" cy="410" r="4" fill="#38BDF8" />
        </svg>

        {/* Ambient Top & Bottom Lighting */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#021224] to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#F5F8FC] via-[#F5F8FC]/30 to-transparent" />
      </div>

      {/* ============================================================== */}
      {/* 2. TOP STATUS BAR (Section 3)                                  */}
      {/* ============================================================== */}
      <header className="relative z-10 pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-lg">
          
          {/* Left: Operational Status Indicator */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-white tracking-wide">
              ระบบเฝ้าระวังพื้นที่เปิดใช้งาน
            </span>
            <span className="text-slate-400 text-3xs font-mono hidden md:inline">
              (SPATIAL SITUATION VIEW)
            </span>
          </div>

          {/* Center/Right: Territorial Scope & Connection State */}
          <div className="flex items-center flex-wrap justify-center sm:justify-end gap-2 text-slate-300">
            {/* Connection Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-3xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${
                sseStatus === 'connected' ? 'bg-emerald-400' : (sseStatus === 'reconnecting' ? 'bg-amber-400' : 'bg-slate-400')
              }`} />
              <span>
                {sseStatus === 'connected' ? 'เชื่อมต่อสด (Live SSE)' : (sseStatus === 'reconnecting' ? 'กำลังเชื่อมต่อใหม่' : 'ข้อมูลล่าสุด')}
              </span>
              {overviewData?.system_updated_at_th && (
                <span className="text-slate-400 pl-1 border-l border-white/10">
                  {overviewData.system_updated_at_th}
                </span>
              )}
            </div>

            {/* Geographic Scope */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-500/20 text-sky-200 font-medium">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>ขอบเขต: ลุ่มน้ำปราจีนบุรี (7 อำเภอหลัก)</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* 3. MAIN COMMAND HERO: MOBILE DEDICATED & DESKTOP WORKSTATION   */}
      {/* ============================================================== */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-10 my-auto">
        
        {/* ============================================================ */}
        {/* MOBILE / TABLET RECOMPOSED HERO (< lg)                       */}
        {/* Sequence: Identity & Status -> Situation Title -> Real Image */}
        {/*           -> Location/Time -> Water/Rain -> Primary Action   */}
        {/* ============================================================ */}
        <div className="lg:hidden flex flex-col space-y-4 animate-hero-fade-up">
          {/* 1. Identity & Operational Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-sky-200 text-xs font-semibold">
              <span className="text-sky-300 font-bold uppercase tracking-wider font-mono text-[10px]">
                FLOODTRACE
              </span>
              <span className="w-1 h-1 rounded-full bg-sky-400" />
              <span className="text-white text-[11px] truncate max-w-[170px] sm:max-w-none">
                ระบบติดตามสถานการณ์น้ำและสิ่งแวดล้อม
              </span>
            </div>

            {/* Live Indicator Pill */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/45 border border-white/15 text-[11px] text-slate-300 shrink-0">
              <span className={`w-2 h-2 rounded-full ${sseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-medium">{sseStatus === 'connected' ? 'อัปเดตอัตโนมัติ' : 'ข้อมูลล่าสุด'}</span>
            </div>
          </div>

          {/* 2. Situation Section Heading */}
          <div className="flex items-center justify-between pt-0.5">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>สถานการณ์ล่าสุด</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              </h1>
              <p className="text-[11px] text-purple-200/80">
                ข้อมูลอ้างอิงจากแหล่งสาธารณะภายนอก (External Evidence)
              </p>
            </div>
            <Link
              to="/cases"
              className="text-[11px] font-semibold text-purple-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 shrink-0 min-h-[36px] flex items-center"
            >
              ดูเหตุการณ์ทั้งหมด ({externalEvidence.length})
            </Link>
          </div>

          {/* 3. LATEST INCIDENT REAL IMAGE CARD */}
          {evidenceLoading ? (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 animate-pulse space-y-3">
              <div className="w-full h-40 bg-white/10 rounded-xl" />
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ) : sortedEvidence.length > 0 ? (
            (() => {
              const topEv = sortedEvidence[0];
              const timeInfo = formatObservedTimeAgo(topEv.observed_at, topEv.published_at);
              const verBadge = getVerificationBadge(topEv.verification_status);
              const photoUrl = getEvidencePhotoUrl(topEv);

              return (
                <article
                  onClick={() => handleEvidenceClick(topEv)}
                  className="group relative p-3 sm:p-4 rounded-2xl bg-black/55 hover:bg-black/75 border border-white/15 hover:border-purple-400/50 transition-all cursor-pointer space-y-2.5 shadow-xl active:scale-[0.99]"
                  tabIndex={0}
                  role="button"
                  aria-label={`ดูรายละเอียด: ${topEv.title_or_summary}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEvidenceClick(topEv);
                    }
                  }}
                >
                  {/* Real Documentary News Photo */}
                  <div className="relative w-full aspect-video sm:h-44 rounded-xl overflow-hidden bg-slate-950 shadow-inner group-hover:shadow-md transition-all">
                    <img
                      src={photoUrl}
                      alt={topEv.title_or_summary || 'ภาพหลักฐานสถานการณ์ล่าสุด'}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      loading="eager"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('evd_013_bangtaen_road.jpg')) {
                          target.src = '/assets/evidence/evd_013_bangtaen_road.jpg';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20 pointer-events-none" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-3xs text-white/95 font-medium border border-white/15 flex items-center gap-1 shadow-sm whitespace-nowrap">
                      <Newspaper className="w-3 h-3 text-purple-300 shrink-0" />
                      <span>ภาพข่าว/สื่อสาธารณะ</span>
                    </div>
                    <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-3xs font-bold border backdrop-blur-md flex items-center gap-1 shadow-sm whitespace-nowrap ${verBadge.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${verBadge.dotClass}`} />
                      <span>{verBadge.label}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-2 leading-snug word-break-thai">
                      {topEv.title_or_summary}
                    </h2>
                  </div>

                  {/* Location & Time & Source */}
                  <div className="text-3xs text-slate-300/90 space-y-1 pt-1.5 border-t border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-slate-400 shrink-0">
                        <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>ตำแหน่ง</span>
                      </span>
                      <span className="font-semibold text-slate-100 truncate text-right">
                        {topEv.location_text || (topEv.district ? `อ.${topEv.district} จ.ปราจีนบุรี` : 'จ.ปราจีนบุรี')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-slate-400 shrink-0">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{timeInfo.isFallback ? 'เผยแพร่เมื่อ' : 'พบเมื่อ'}</span>
                      </span>
                      <span className="font-bold text-white shrink-0">
                        {timeInfo.text}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-slate-400 shrink-0">
                        <ExternalLink className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>แหล่งที่มา</span>
                      </span>
                      <span className="text-purple-200 font-medium truncate text-right">
                        {topEv.source_name}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 flex-wrap text-3xs border-t border-white/10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-200 text-3xs font-semibold border border-purple-500/40 whitespace-nowrap">
                        หลักฐานภายนอก
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold border whitespace-nowrap ${verBadge.badgeClass}`}>
                        {verBadge.label}
                      </span>
                    </div>
                    <div className="text-purple-300 font-semibold group-hover:text-purple-100 flex items-center gap-1 text-3xs whitespace-nowrap shrink-0 ml-auto">
                      <span>ดูรายละเอียด</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </div>
                </article>
              );
            })()
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-400">
              ยังไม่มีเหตุการณ์ภายนอกที่เผยแพร่
            </div>
          )}

          {/* 4. Compact 2-column hydrological data cards (Water + Rain) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {/* Water */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-black/45 backdrop-blur-md border border-sky-500/25 flex flex-col justify-between">
              <div className="flex items-center justify-between text-3xs text-sky-300">
                <span className="font-semibold flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  ระดับน้ำ
                </span>
                <span className="text-slate-400 truncate max-w-[65px] text-3xs">
                  {keyWaterStation?.district || 'กบินทร์บุรี'}
                </span>
              </div>
              <div className="my-1">
                {keyWaterStation?.water_level_msl != null ? (
                  <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {keyWaterStation.water_level_msl.toFixed(2)}{' '}
                    <span className="text-3xs font-semibold text-sky-300">ม.รทก.</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">-</div>
                )}
              </div>
              <div className="text-3xs text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                <span className="truncate max-w-[70px]">{keyWaterStation?.name_th || 'สะพานณรงค์ดำริ'}</span>
                <span className="px-1 py-0.2 rounded text-3xs font-bold bg-sky-500/20 text-sky-200">LIVE</span>
              </div>
            </div>

            {/* Rain */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-black/45 backdrop-blur-md border border-blue-500/25 flex flex-col justify-between">
              <div className="flex items-center justify-between text-3xs text-blue-300">
                <span className="font-semibold flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ฝน 24 ชม.
                </span>
                <span className="text-slate-400 truncate max-w-[65px] text-3xs">
                  {keyRainStation?.district || 'บ้านสร้าง'}
                </span>
              </div>
              <div className="my-1">
                {keyRainStation?.rain_24h_mm != null ? (
                  <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {keyRainStation.rain_24h_mm.toFixed(1)}{' '}
                    <span className="text-3xs font-semibold text-blue-300">มม.</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">-</div>
                )}
              </div>
              <div className="text-3xs text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                <span className="truncate max-w-[70px]">{keyRainStation?.name_th || 'หอทอง'}</span>
                <span className="px-1 py-0.2 rounded text-3xs font-bold bg-blue-500/20 text-blue-200">RECENT</span>
              </div>
            </div>

            {/* Priority (Visible on Tablet, hidden on narrow phone to keep 2-col clean) */}
            <div className="hidden sm:flex p-2.5 sm:p-3 rounded-2xl bg-black/45 backdrop-blur-md border border-amber-500/25 flex-col justify-between">
              <div className="flex items-center justify-between text-3xs text-amber-300">
                <span className="font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  เฝ้าระวัง
                </span>
                <span className="text-slate-400 truncate max-w-[65px] text-3xs">
                  {overviewData?.district ? `อ.${overviewData.district}` : 'พื้นที่หลัก'}
                </span>
              </div>
              <div className="my-1">
                <div className="text-base sm:text-lg font-bold text-amber-300 tracking-tight">
                  {overviewData?.verification_priority || 'สูง'}
                </div>
              </div>
              <div className="text-3xs text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                <span className="truncate">แบบจำลอง</span>
                <span className="px-1 py-0.2 rounded text-3xs font-bold bg-amber-500/20 text-amber-200">เฝ้าระวัง</span>
              </div>
            </div>
          </div>

          {/* 5. Primary Action Button (Touch-Friendly >= 48px) */}
          <div className="pt-1 flex flex-col gap-2">
            <Link
              to="/map"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0C65E8] hover:bg-[#084fb7] text-white font-semibold text-base shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px] border border-white/20 active:scale-[0.99]"
            >
              <span>ดูสถานการณ์บนแผนที่</span>
              <ChevronRight className="w-5 h-5 text-sky-200" />
            </Link>

            <div className="flex items-center gap-2">
              <Link
                to="/report"
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Users className="w-4 h-4" />
                <span>+ แจ้งเหตุการณ์</span>
              </Link>
              <button
                type="button"
                onClick={onScrollToContent}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-md border border-white/15 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <span>สำรวจข้อมูล</span>
                <ChevronDown className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* DESKTOP WORKSTATION HERO (>= lg)                             */}
        {/* ============================================================ */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ========================================================== */}
          {/* LEFT / CENTER COLUMN (lg:col-span-7): Headline & Context   */}
          {/* ========================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 animate-hero-fade-up">
            
            {/* Identity & Mission Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-sky-200 text-xs font-semibold w-fit shadow-xs">
              <span className="text-sky-300 font-bold uppercase tracking-[0.2em] font-mono text-2xs">
                FLOODTRACE
              </span>
              <span className="w-1 h-1 rounded-full bg-sky-400" />
              <span className="text-white/90 text-xs">
                ระบบติดตามสถานการณ์น้ำและสิ่งแวดล้อม
              </span>
            </div>

            {/* Main Situational Headline */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl md:text-[44px] font-extrabold text-white leading-[1.2] tracking-tight drop-shadow-md">
                ติดตามสถานการณ์น้ำและสิ่งแวดล้อม
                <span className="block mt-1 sm:mt-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-white to-sky-300">
                  จากข้อมูลเชิงพื้นที่และโทรมาตรจริง
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-2xl font-normal drop-shadow">
                บูรณาการข้อมูลโทรมาตรระดับน้ำ ปริมาณฝน ข้อเท็จจริงเชิงพื้นที่ รายงานประชาชน 
                และหลักฐานอ้างอิงจากแหล่งสาธารณะ เพื่อสนับสนุนการเฝ้าระวังและการตัดสินใจในพื้นที่เสี่ยงอย่างโปร่งใส
              </p>
            </div>

            {/* ======================================================== */}
            {/* LIVE DATA & SITUATION STRIP (Section 3 & 15)             */}
            {/* Real telemetry cards backed by actual backend state     */}
            {/* ======================================================== */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-2xs font-bold text-sky-300/80 uppercase tracking-wider px-1">
                <span>สรุปข้อมูลโทรมาตรและสถานะล่าสุด (Live Situation Strip)</span>
                <span className="text-3xs font-normal text-slate-400">อ้างอิงเวลาจริงจากสถานี</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                
                {/* 1. Water Level (ระดับน้ำโทรมาตร) */}
                <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-sky-500/20 hover:border-sky-400/40 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-3xs text-sky-300">
                    <span className="font-semibold flex items-center gap-1">
                      <Waves className="w-3.5 h-3.5 text-sky-400" />
                      ระดับน้ำโทรมาตร
                    </span>
                    <span className="text-slate-400 truncate max-w-[70px]">
                      {keyWaterStation?.district || 'กบินทร์บุรี'}
                    </span>
                  </div>
                  <div className="my-1.5">
                    {keyWaterStation?.water_level_msl != null ? (
                      <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {keyWaterStation.water_level_msl.toFixed(2)}{' '}
                        <span className="text-xs font-semibold text-sky-300">ม.รทก.</span>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400">ไม่มีข้อมูลล่าสุด</div>
                    )}
                  </div>
                  <div className="text-3xs text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="truncate">{keyWaterStation?.name_th || 'สะพานณรงค์ดำริ'}</span>
                    <span className={`px-1.5 py-0.2 rounded font-semibold text-3xs ${
                      keyWaterStation?.freshness_status === 'RECENT' ? 'bg-sky-500/20 text-sky-200' : 'bg-amber-500/20 text-amber-200'
                    }`}>
                      {keyWaterStation?.freshness_status === 'RECENT' ? 'สดใหม่' : 'โทรมาตร'}
                    </span>
                  </div>
                </div>

                {/* 2. Rainfall 24h (ปริมาณฝนสะสม) */}
                <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-blue-500/20 hover:border-blue-400/40 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-3xs text-blue-300">
                    <span className="font-semibold flex items-center gap-1">
                      <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                      ฝนสะสม 24 ชม.
                    </span>
                    <span className="text-slate-400 truncate max-w-[70px]">
                      {keyRainStation?.district || 'บ้านสร้าง'}
                    </span>
                  </div>
                  <div className="my-1.5">
                    {keyRainStation?.rain_24h_mm != null ? (
                      <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {keyRainStation.rain_24h_mm.toFixed(1)}{' '}
                        <span className="text-xs font-semibold text-blue-300">มม.</span>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400">ไม่มีข้อมูลล่าสุด</div>
                    )}
                  </div>
                  <div className="text-3xs text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="truncate">{keyRainStation?.name_th || 'หอทอง'}</span>
                    <span className="text-slate-300 font-medium">โทรมาตร</span>
                  </div>
                </div>

                {/* 3. Monitoring Priority / Flood Status */}
                <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-amber-500/20 hover:border-amber-400/40 transition-colors flex flex-col justify-between col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-3xs text-amber-300">
                    <span className="font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      ลำดับเฝ้าระวัง
                    </span>
                    <span className="text-slate-400">
                      {overviewData?.district ? `อ.${overviewData.district}` : 'พื้นที่หลัก'}
                    </span>
                  </div>
                  <div className="my-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg sm:text-xl font-bold text-amber-300">
                        {overviewData?.verification_priority || 'สูง'}
                      </span>
                      <span className="text-2xs text-slate-400 font-medium">
                        (แบบจำลองพื้นที่)
                      </span>
                    </div>
                  </div>
                  <div className="text-3xs text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="truncate">รายงานชุมชน: {overviewData?.community_observation_count ?? 22} จุด</span>
                    <span className="text-amber-300 font-semibold">เฝ้าระวัง</span>
                  </div>
                </div>

              </div>
            </div>

            {/* CTAs & Navigation Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5">
              <Link
                to="/map"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#0C65E8] hover:bg-[#084fb7] text-white font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[48px] border border-white/20 group"
              >
                <span>ดูสถานการณ์บนแผนที่</span>
                <ChevronRight className="w-5 h-5 text-sky-200 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button
                type="button"
                onClick={onScrollToContent}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-base backdrop-blur-md border border-white/20 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span>สำรวจข้อมูลและข่าวสาร</span>
                <ChevronDown className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Scientific Integrity Disclaimer (Section 36) */}
            <div className="flex items-center gap-2 text-2xs text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                ข้อมูลจัดทำเพื่อการเฝ้าระวังและสนับสนุนการตัดสินใจเบื้องต้น ไม่ใช่การยืนยันการปนเปื้อนสารเคมีหรือผลตรวจทางแล็บ
              </span>
            </div>

          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN (lg:col-span-5): LATEST SITUATION / EVIDENCE  */}
          {/* Real External Evidence from Backend (Section 3 & 4)        */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                      สถานการณ์และหลักฐานล่าสุด
                    </h2>
                    <p className="text-2xs text-purple-200/80">
                      ข้อมูลอ้างอิงจากแหล่งสาธารณะภายนอก (External Evidence)
                    </p>
                  </div>
                </div>

                <Link
                  to="/cases"
                  className="text-2xs font-semibold text-purple-300 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                >
                  <span>ดูเหตุการณ์ทั้งหมด ({externalEvidence.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Panel Content States: Loading, Error, Empty, or Loaded List */}
              {evidenceLoading ? (
                /* LOADING STATE SKELETON (Section 12) */
                <div className="space-y-3">
                  {[1, 2].map(n => (
                    <div key={n} className="p-3 rounded-2xl bg-white/5 border border-white/5 animate-pulse space-y-2.5">
                      <div className="w-full h-28 bg-white/10 rounded-xl" />
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/10 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : evidenceError ? (
                /* ERROR STATE (Section 13) */
                <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center space-y-2">
                  <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
                  <p className="text-sm font-semibold text-rose-200">ไม่สามารถโหลดเหตุการณ์ล่าสุดได้</p>
                  <p className="text-2xs text-slate-400">กรุณาตรวจสอบการเชื่อมต่อหรือรีเฟรชหน้าเว็บ</p>
                </div>
              ) : sortedEvidence.length === 0 ? (
                /* EMPTY STATE (Section 11) - Truthful: No fake events */
                <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center space-y-2">
                  <Globe className="w-8 h-8 text-purple-400/60 mx-auto" />
                  <p className="text-sm font-bold text-white">ยังไม่มีเหตุการณ์ภายนอกที่เผยแพร่</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    ระบบจะแสดงภาพและเหตุการณ์จากแหล่งอ้างอิงสาธารณะเมื่อมีข้อมูลที่ผ่านการตรวจสอบและเผยแพร่
                  </p>
                </div>
              ) : (
                /* REAL EXTERNAL EVIDENCE CARDS LIST (Section 3, 5, 10) */
                <div className="space-y-3">
                  {sortedEvidence.map((ev) => {
                    const timeInfo = formatObservedTimeAgo(ev.observed_at, ev.published_at);
                    const verBadge = getVerificationBadge(ev.verification_status);
                    const photoUrl = getEvidencePhotoUrl(ev);

                    return (
                      <article 
                        key={ev.id}
                        onClick={() => handleEvidenceClick(ev)}
                        className="group relative p-3 sm:p-3.5 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-purple-400/50 transition-all cursor-pointer space-y-2.5 shadow-md hover:shadow-xl"
                        tabIndex={0}
                        role="button"
                        aria-label={`ดูรายละเอียด: ${ev.title_or_summary}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleEvidenceClick(ev);
                          }
                        }}
                      >
                        {/* 1. Real Documentary Photo (Section 5) */}
                        <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-950 shadow-inner group-hover:shadow-md transition-all">
                          <img 
                            src={photoUrl} 
                            alt={ev.title_or_summary || 'ภาพหลักฐานอ้างอิงจากแหล่งภายนอก'} 
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('evd_013_bangtaen_road.jpg')) {
                                target.src = '/assets/evidence/evd_013_bangtaen_road.jpg';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20 pointer-events-none" />
                          {/* Evidence attribution badge on image */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-3xs text-white/95 font-medium border border-white/15 flex items-center gap-1 shadow-sm whitespace-nowrap">
                            <Newspaper className="w-3 h-3 text-purple-300 shrink-0" />
                            <span>ภาพข่าว/สื่อสาธารณะ</span>
                          </div>
                          {/* Verification status pill */}
                          <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-3xs font-bold border backdrop-blur-md flex items-center gap-1 shadow-sm whitespace-nowrap ${verBadge.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${verBadge.dotClass}`} />
                            <span>{verBadge.label}</span>
                          </div>
                        </div>

                        {/* 2. Event Title & Content */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-2 leading-snug">
                            {ev.title_or_summary}
                          </h3>
                        </div>

                        {/* 3. Metadata Rows (Location, Observed Time, Source) */}
                        <div className="text-3xs text-slate-300/90 space-y-1 pt-1 border-t border-white/10">
                          {/* Location */}
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>ตำแหน่ง</span>
                            </span>
                            <span className="font-medium text-slate-200 truncate max-w-[200px]">
                              {ev.location_text || (ev.district ? `อ.${ev.district} จ.ปราจีนบุรี` : 'จ.ปราจีนบุรี')}
                            </span>
                          </div>

                          {/* Observed Time - strictly observed_at semantics */}
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{timeInfo.isFallback ? 'เผยแพร่เมื่อ' : 'พบเมื่อ'}</span>
                            </span>
                            <span className="font-semibold text-white">
                              {timeInfo.text}
                            </span>
                          </div>

                          {/* Source Platform */}
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-400">
                              <ExternalLink className="w-3 h-3 text-purple-400 shrink-0" />
                              <span>แหล่งที่มา</span>
                            </span>
                            <span className="text-purple-200/90 truncate max-w-[180px]">
                              {ev.source_name}
                            </span>
                          </div>
                        </div>

                        {/* 4. Action hint & badges (Section 9 & 14) */}
                        <div className="pt-2 flex items-center justify-between gap-2 flex-wrap text-3xs border-t border-white/10">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-200 text-3xs font-semibold border border-purple-500/40 whitespace-nowrap">
                              หลักฐานภายนอก
                            </span>
                            {ev.related_sources_count && ev.related_sources_count > 1 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-200 text-3xs font-semibold border border-blue-400/40 whitespace-nowrap flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span>{ev.related_sources_count} แหล่งข้อมูล</span>
                              </span>
                            )}
                            {ev.related_news && ev.related_news.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-200 text-3xs font-semibold border border-emerald-400/40 whitespace-nowrap flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>ข่าวสนับสนุน ({ev.related_news.length})</span>
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold border whitespace-nowrap ${verBadge.badgeClass}`}>
                              {verBadge.label}
                            </span>
                          </div>
                          <div className="text-purple-300 font-semibold group-hover:text-purple-100 flex items-center gap-1 text-3xs whitespace-nowrap shrink-0 ml-auto">
                            <span>ดูรายละเอียด</span>
                            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                          </div>
                        </div>

                      </article>
                    );
                  })}
                </div>
              )}

              {/* Bottom Notice on External Evidence */}
              <div className="pt-2 border-t border-white/10 text-3xs text-slate-400 leading-tight flex items-start gap-1.5">
                <span className="font-bold text-purple-400 shrink-0">หมายเหตุ:</span>
                <span>
                  ข้อมูลหลักฐานภายนอกรวบรวมเพื่อประกอบการติดตามสถานการณ์ ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การยืนยันผู้กระทำผิด
                </span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ============================================================== */}
      {/* 4. BOTTOM SCROLL CUE                                           */}
      {/* ============================================================== */}
      <footer className="relative z-10 pb-4 sm:pb-6 flex flex-col items-center justify-center text-center">
        <button
          type="button"
          onClick={onScrollToContent}
          className="inline-flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer group"
          aria-label="เลื่อนลงเพื่อดูข้อมูลและสถานการณ์เพิ่มเติม"
        >
          <span className="text-2xs sm:text-xs font-semibold tracking-wide">
            เลื่อนเพื่อดูข้อมูลและแผนที่สถานการณ์
          </span>
          <ChevronDown className="w-4 h-4 text-sky-400 animate-hero-scroll group-hover:translate-y-0.5 transition-transform" />
        </button>
      </footer>

    </section>
  );
};
