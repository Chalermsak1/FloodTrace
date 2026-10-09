import React, { useState } from 'react';
import { 
  Building2, 
  Clock, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  ImageIcon,
  Compass,
  AlertTriangle,
  Info
} from 'lucide-react';

export interface OfficialUpdateItem {
  id: string;
  agency?: string;
  source_name?: string;
  source_id?: string;
  source_type?: string;
  authority_level?: string;
  title: string;
  document_type?: string;
  published_at?: string;
  observed_at?: string;
  retrieved_at?: string;
  related_area?: string;
  district?: string;
  factual_summary?: string;
  summary?: string;
  source_url: string;
  canonical_url?: string;
  source_domain?: string;
  source_image_url?: string | null;
  source_image_fetched_at?: string | null;
  image_source_type?: 'OG_IMAGE' | 'TWITTER_IMAGE' | 'SOURCE_IMAGE' | 'PDF_PREVIEW' | 'FALLBACK' | 'NONE';
  verification_status?: string;
  spatial_relevance?: string;
  temporal_relevance?: string;
  event_relevance?: string;
  monitoring_event_id?: string;
  linked_event_title?: string;
  correlation_reasons?: string[];
  contradiction_note?: string;
  badge?: string;
  source_status?: string;
  is_demo?: boolean;
  [key: string]: any;
}

interface NewsCardProps {
  item: OfficialUpdateItem;
  onSelect?: (item: OfficialUpdateItem) => void;
}

/**
 * Format timestamp into Thai Buddhist Era Date (e.g., 30/09/2569 or 8 ต.ค. 2569)
 */
const formatThaiDate = (dateStr?: string) => {
  if (!dateStr) return 'ล่าสุด';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const NewsCard: React.FC<NewsCardProps> = ({ item, onSelect }) => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageFailed, setImageFailed] = useState<boolean>(false);

  const hasImage = Boolean(item.source_image_url && !imageFailed);
  const rawUrl = item.canonical_url || item.source_url || '';
  
  // Real Source URL Validation (Sections 2, 8, 9, 19)
  const isHttpScheme = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
  const isSyntheticHost = rawUrl.includes('.local') || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1') || rawUrl.includes('example.com') || rawUrl.includes('example.org');
  const isSourceAvailable = Boolean(
    isHttpScheme && 
    !isSyntheticHost && 
    (!item.source_status || item.source_status === 'AVAILABLE')
  );
  const isDemo = Boolean(item.is_demo || item.source_status === 'DEMO');

  const agencyName = item.agency || item.source_name || 'แหล่งข้อมูลสาธารณะ';
  const displaySummary = item.summary || item.factual_summary || item.related_area || 'รายงานข้อมูลสถานการณ์และผลการตรวจวัด';
  const displayDomain = item.source_domain || (rawUrl && isHttpScheme ? new URL(rawUrl, 'https://localhost').hostname : 'แหล่งข้อมูล');
  const altText = `ภาพประกอบข่าวจาก ${agencyName}`;

  // Authority badge determination
  const isCuratedNews = item.authority_level === 'CURATED_PUBLIC_SOURCE' || item.verification_status === 'CURATED';
  const isOfficial = item.authority_level === 'OFFICIAL' || item.source_type === 'OFFICIAL_ANNOUNCEMENT' || item.badge === 'OFFICIAL';
  const isNews = item.source_type === 'NEWS_MEDIA' || item.authority_level === 'SECONDARY' || isCuratedNews;
  const isPublicReport = item.source_type === 'PUBLIC_SOCIAL' || item.source_type === 'CITIZEN_OBSERVATION';
  const isDisputed = item.verification_status === 'DISPUTED' || Boolean(item.contradiction_note);

  const getSourceBadgeStyle = () => {
    if (isCuratedNews) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (isOfficial) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (isNews) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (isPublicReport) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getSourceBadgeLabel = () => {
    if (isCuratedNews) return 'ข่าว/บทความจริง';
    if (isOfficial) return 'ข้อมูลทางการ';
    if (isNews) return 'ข่าวสาร';
    if (isPublicReport) return 'รายงานสาธารณะ';
    return 'แหล่งข้อมูลภายนอก';
  };

  return (
    <article 
      className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-[#0C65E8]/35 transition-all duration-200 flex flex-col justify-between overflow-hidden group h-full cursor-pointer"
      aria-label={item.title}
      onClick={() => onSelect && onSelect(item)}
    >
      <div>
        {/* ============================================================== */}
        {/* 1. SOURCE IMAGE / ASPECT RATIO 16:9 CONTAINER                  */}
        {/* ============================================================== */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100 rounded-t-2xl">
          {hasImage ? (
            <>
              {/* Skeleton placeholder while image is downloading */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-slate-200/70 animate-pulse flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                </div>
              )}

              {/* Source Image */}
              <img
                src={item.source_image_url!}
                alt={altText}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageFailed(true)}
                className={`w-full h-full object-cover group-hover:scale-103 transition-transform duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Top Source Category Badge Overlaid on Image */}
              <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                <span className="px-2.5 py-1 rounded-lg text-3xs font-bold shadow-xs backdrop-blur-md bg-slate-900/80 text-white border border-white/20">
                  {getSourceBadgeLabel()}
                </span>
              </div>

              {/* Source Provenance Tag (Overlaid on Bottom of Image) */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                <span className="px-2 py-0.5 rounded-md text-3xs font-semibold bg-slate-900/75 text-white backdrop-blur-xs shadow-xs truncate max-w-[85%]">
                  ภาพจาก {displayDomain}
                </span>
                {item.image_source_type && item.image_source_type !== 'FALLBACK' && item.image_source_type !== 'NONE' && (
                  <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-[#0C65E8]/85 text-white backdrop-blur-xs">
                    {item.image_source_type === 'OG_IMAGE' ? 'OG' : item.image_source_type === 'TWITTER_IMAGE' ? 'TW' : 'SRC'}
                  </span>
                )}
              </div>
            </>
          ) : (
            /* Visually Consistent Fallback Placeholder (Clean, Neutral, Never broken, No fake AI images) */
            <div className="w-full h-full bg-gradient-to-br from-slate-50 via-slate-100/60 to-slate-200/50 flex flex-col items-center justify-center p-4 text-center border-b border-slate-200/60">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-2xs mb-2">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-xs font-bold text-slate-700 truncate max-w-[90%]">
                {agencyName}
              </span>
              <span className="text-2xs text-slate-400 mt-0.5 truncate max-w-[90%]">
                {getSourceBadgeLabel()}
              </span>
              <span className="text-3xs text-slate-400 mt-1 italic">
                (แหล่งต้นทางไม่มีภาพประกอบ)
              </span>
            </div>
          )}

          {/* Demo Data Indicator overlay if demo record */}
          {isDemo && (
            <div className="absolute top-2 right-2 z-10">
              <span className="px-2 py-0.5 rounded-md text-3xs font-black tracking-wider uppercase bg-amber-500 text-white shadow-xs">
                DEMO DATA
              </span>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 2. CARD CONTENT BODY                                           */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 space-y-2.5">
          {/* Header Row: Agency Name • Published Date */}
          <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <span 
                className="font-bold text-xs text-slate-700 truncate max-w-[170px]"
                title={agencyName}
              >
                {agencyName}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-500 text-2xs shrink-0">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatThaiDate(item.published_at || item.retrieved_at)}</span>
              </span>
            </div>

            {isDisputed && (
              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-3xs font-bold shrink-0">
                ข้อเท็จจริงขัดแย้ง
              </span>
            )}
          </div>

          {/* Linked Event Tag if present */}
          {(item.monitoring_event_id || item.event_relevance === 'HIGH') && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#0C65E8] text-3xs font-semibold border border-blue-100">
              <Compass className="w-3 h-3 text-[#0C65E8]" />
              <span className="truncate max-w-[200px]">
                {item.district ? `เหตุการณ์เฝ้าระวัง: ${item.district}` : 'เชื่อมโยงกับเหตุการณ์เฝ้าระวัง'}
              </span>
            </div>
          )}

          {/* Title */}
          <h4 
            className="font-bold text-sm sm:text-base text-[#063B70] group-hover:text-[#0C65E8] transition-colors line-clamp-2 leading-snug"
            title={item.title}
          >
            {item.title}
          </h4>

          {/* Short Description */}
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
            {displaySummary}
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. CARD FOOTER: READ ORIGINAL SOURCE ACTION                    */}
      {/* ============================================================== */}
      <div 
        className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {isDemo ? (
          <div className="text-2xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/80 flex items-center justify-between w-full">
            <span className="font-bold">ข้อมูลจำลองเพื่อการพัฒนา (DEMO DATA)</span>
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="text-xs text-[#0C65E8] hover:underline font-semibold"
              >
                ดูรายละเอียด
              </button>
            )}
          </div>
        ) : !isSourceAvailable ? (
          <div className="flex items-center justify-between w-full text-xs">
            <span 
              className="text-2xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1"
              title="แหล่งข้อมูลต้นทางไม่สามารถเข้าถึงได้ หรืออยู่ระหว่างการตรวจสอบความถูกต้อง"
            >
              <AlertTriangle className="w-3 h-3 text-slate-400" />
              <span>แหล่งต้นทางไม่พร้อมใช้งาน</span>
            </span>

            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="text-xs text-slate-500 hover:text-[#0C65E8] font-medium py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ดูรายละเอียด
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] text-xs sm:text-sm font-semibold text-[#0C65E8] hover:text-[#063B70] inline-flex items-center gap-1.5 transition-colors group/link focus:outline-none focus:ring-2 focus:ring-[#0C65E8] rounded-lg"
              title={`เปิดลิงก์ข่าวต้นฉบับจาก ${agencyName}`}
            >
              <span>อ่านจากแหล่งต้นทาง</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </a>

            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="text-xs text-slate-500 hover:text-[#0C65E8] font-medium py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ดูรายละเอียด
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
