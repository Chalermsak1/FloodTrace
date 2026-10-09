import React from 'react';
import {
  X,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Compass,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
  Share2,
  ImageIcon,
  Copy,
  Check,
  Layers,
  Newspaper
} from 'lucide-react';

export interface ExternalInformationDetail {
  id: string;
  source_id?: string;
  source_name: string;
  source_type: string;
  authority_level: string;
  source_platform?: string;
  source_domain?: string;
  source_url: string;
  canonical_url?: string;
  title: string;
  summary?: string;
  factual_details?: string;
  published_at?: string;
  observed_at?: string;
  retrieved_at?: string;
  district?: string;
  subdistrict?: string;
  location_text?: string;
  public_latitude?: number | null;
  public_longitude?: number | null;
  location_precision?: string;
  source_image_url?: string | null;
  image_source_type?: string;
  source_image_fetched_at?: string | null;
  verification_status: string;
  spatial_relevance?: string;
  temporal_relevance?: string;
  event_relevance?: string;
  correlation_reasons?: string[];
  monitoring_event_id?: string;
  linked_event_title?: string;
  contradiction_note?: string;
  source_status?: string;
  is_demo?: boolean;
  provenance?: any;
  related_sources_count?: number;
  related_sources?: Array<{
    id: string;
    source_platform?: string;
    source_name?: string;
    source_url?: string;
    title_or_summary?: string;
    description?: string;
    evidence_type?: string;
    verification_status?: string;
    district?: string;
    subdistrict?: string;
    location_text?: string;
    published_at?: string;
    observed_at?: string;
    media_references?: Array<{
      id?: string;
      media_type?: string;
      source_media_url?: string;
    }>;
  }>;
  related_news?: Array<{
    id: string;
    title: string;
    source_name: string;
    source_url: string;
    published_at?: string;
    summary?: string;
    authority_level?: string;
    verification_status?: string;
    source_image_url?: string;
  }>;
}

interface InformationDetailModalProps {
  item: ExternalInformationDetail | null;
  onClose: () => void;
}

const formatThaiDateTime = (dateStr?: string) => {
  if (!dateStr) return 'ไม่ระบุ';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export const InformationDetailModal: React.FC<InformationDetailModalProps> = ({ item, onClose }) => {
  const [imageLoaded, setImageLoaded] = React.useState<boolean>(false);
  const [imageFailed, setImageFailed] = React.useState<boolean>(false);
  const [copied, setCopied] = React.useState<boolean>(false);

  React.useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
    setCopied(false);
  }, [item?.id, item?.source_image_url]);

  if (!item) return null;

  const isOfficial = item.authority_level === 'OFFICIAL';
  const isCuratedNews = item.authority_level === 'CURATED_PUBLIC_SOURCE' || item.verification_status === 'CURATED';
  const isNews = item.source_type === 'NEWS_MEDIA' || isCuratedNews;
  const isPublicSocial = item.source_type === 'PUBLIC_SOCIAL' || item.source_type === 'CITIZEN_OBSERVATION';

  const getAuthorityBadge = () => {
    switch (item.authority_level) {
      case 'OFFICIAL':
        return { label: 'หน่วยงานทางการ (Official)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'PRIMARY':
        return { label: 'ข้อมูลปฐมภูมิ (Primary)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'CURATED_PUBLIC_SOURCE':
        return { label: 'แหล่งข่าวคัดสรร (Curated Public Source)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SECONDARY':
        return { label: 'สื่อมวลชน / ทุติยภูมิ (News Media)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'PUBLIC':
        return { label: 'แหล่งสาธารณะ (Public)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'แหล่งข้อมูลสาธารณะ', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getVerificationBadge = () => {
    switch (item.verification_status) {
      case 'OFFICIAL_VERIFIED':
        return { label: 'เอกสารทางการยืนยัน', color: 'bg-emerald-100 text-emerald-800' };
      case 'CORROBORATED':
        return { label: 'มีข้อมูลสอดคล้องกันหลายแหล่ง', color: 'bg-blue-100 text-blue-800' };
      case 'CURATED':
        return { label: 'คัดสรรโดยโครงการ (Curated)', color: 'bg-blue-100 text-blue-800' };
      case 'PUBLISHED':
        return { label: 'เผยแพร่แล้ว (Published)', color: 'bg-emerald-100 text-emerald-800' };
      case 'DISPUTED':
        return { label: 'มีข้อเท็จจริงขัดแย้ง', color: 'bg-rose-100 text-rose-800' };
      default:
        return { label: 'ข้อมูลสาธารณะ', color: 'bg-slate-100 text-slate-700' };
    }
  };

  const authBadge = getAuthorityBadge();
  const verBadge = getVerificationBadge();

  const rawUrl = item.canonical_url || item.source_url || '';
  const isHttpScheme = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
  const isSyntheticHost = rawUrl.includes('.local') || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1') || rawUrl.includes('example.com') || rawUrl.includes('example.org');
  const isSourceAvailable = Boolean(
    isHttpScheme && 
    !isSyntheticHost && 
    (!item.source_status || item.source_status === 'AVAILABLE')
  );
  const isDemo = Boolean(item.is_demo || item.source_status === 'DEMO');

  const handleCopyUrl = () => {
    if (!rawUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = rawUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Could not copy URL:', e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-3xs sm:text-2xs font-bold border ${authBadge.color}`}>
                {authBadge.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-3xs sm:text-2xs font-semibold ${verBadge.color}`}>
                {verBadge.label}
              </span>
              {isDemo && (
                <span className="px-2.5 py-0.5 rounded-full text-3xs sm:text-2xs font-black uppercase tracking-wider bg-amber-500 text-white">
                  DEMO DATA
                </span>
              )}
            </div>
            <h3 id="modal-title" className="text-base sm:text-xl font-bold text-[#063B70] leading-snug word-break-thai">
              {item.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-sm text-slate-700 overscroll-contain">
          
          {/* Source Image if present */}
          {item.source_image_url && !imageFailed ? (
            <div className="space-y-2">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-slate-200/70 animate-pulse flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                <img 
                  src={item.source_image_url} 
                  alt={item.title} 
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageFailed(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 rounded text-3xs font-medium bg-slate-900/80 text-white backdrop-blur-xs">
                    ภาพจากแหล่งต้นทาง ({item.source_domain || item.source_name})
                  </span>
                  {item.image_source_type && (
                    <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-[#0C65E8]/90 text-white">
                      {item.image_source_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : item.source_image_url && imageFailed ? (
            /* Graceful Fallback if image fails to load */
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-700">ภาพจากแหล่งต้นทาง ({item.source_name})</div>
                <div className="text-slate-500 text-3xs mt-0.5">
                  ไม่สามารถแสดงผลภาพถ่ายโดยตรงจากเซิร์ฟเวอร์ภายนอกได้ (สามารถตรวจสอบได้ที่ลิงก์แหล่งข้อมูลต้นฉบับ)
                </div>
              </div>
            </div>
          ) : null}

          {/* Archival guarantee banner (Section 22 & 23) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                <span>{isCuratedNews ? 'บันทึกข้อมูลและสรุปเนื้อหาข่าวสารไว้ในระบบแล้ว' : 'บันทึกข้อมูลหลักและข้อเท็จจริงไว้ใน FloodTrace แล้ว'}</span>
                <span className="px-1.5 py-0.2 rounded text-3xs font-semibold bg-emerald-200/80 text-emerald-900">สำเนาปลอดภัย</span>
              </div>
              <p className="text-emerald-800/90 text-2xs sm:text-xs leading-relaxed">
                {isCuratedNews 
                  ? 'หัวข้อข่าว, วันที่เผยแพร่, ภาพหน้าปกจริงจากแหล่งข่าว และสรุปเนื้อหา ได้รับการบันทึกไว้ในระบบเพื่อความสะดวกในการติดตามสถานการณ์ คุณสามารถกดอ่านเนื้อหาฉบับเต็มได้จากแหล่งต้นทาง'
                  : 'พิกัดพื้นที่เกิดเหตุ, เวลาสังเกตพบจริง, ข้อความที่ชุมชน/แหล่งข่าวรายงาน และภาพถ่ายหลักฐาน ถูกบันทึกเป็นหลักฐานอิเล็กทรอนิกส์ในระบบ คุณสามารถตรวจสอบข้อมูลทั้งหมดได้โดยตรงจากหน้านี้อย่างครบถ้วน แม้ว่าหน้าเว็บภายนอกจะเข้าถึงไม่ได้หรือเกิดข้อผิดพลาดทางเทคนิค'}
              </p>
            </div>
          </div>

          {/* Section: ข้อมูลพิกัดและพื้นที่ตรวจพบ (Geographic Scope & Observation Location) */}
          {(item.location_text || item.district || item.public_latitude) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-sky-950 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>พิกัดและพื้นที่เกิดเหตุ (Location & Spatial Scope)</span>
                </div>
                {item.location_precision && (
                  <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-sky-100 text-sky-800 border border-sky-300/60">
                    ความแม่นยำ: {item.location_precision === 'EXACT' ? 'จุดพิกัดสังเกตการณ์' : item.location_precision === 'NEARBY' ? 'บริเวณใกล้เคียง' : item.location_precision}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-800">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500 shrink-0">ตำแหน่งที่ระบุ:</span>
                  <span className="font-bold text-slate-900 text-sm">{item.location_text || (item.district ? `อ.${item.district} จ.ปราจีนบุรี` : 'จ.ปราจีนบุรี')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-2xs pt-1 border-t border-sky-200/60">
                  {item.subdistrict && (
                    <span>ตำบล: <strong>{item.subdistrict}</strong></span>
                  )}
                  {item.district && (
                    <span>อำเภอ: <strong>{item.district}</strong></span>
                  )}
                  <span>จังหวัด: <strong>ปราจีนบุรี</strong></span>
                  {item.public_latitude != null && item.public_longitude != null && (
                    <span className="font-mono text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded">
                      GPS: {item.public_latitude.toFixed(4)}° N, {item.public_longitude.toFixed(4)}° E
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section A: ข้อมูลจากแหล่งต้นทาง (Original Source Information) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0C65E8]" />
                <span>ข้อมูลจากแหล่งต้นทาง (Original Source Record)</span>
              </div>
              {item.source_platform && (
                <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-slate-200/80 text-slate-700 font-mono">
                  {item.source_platform}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">หน่วยงาน / แหล่งข่าว:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{item.source_name}</p>
              </div>
              <div>
                <span className="text-slate-400">ประเภทข้อมูล:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{item.source_type}</p>
              </div>
              {item.observed_at && (
                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60 sm:col-span-2">
                  <span className="text-amber-800 font-semibold flex items-center gap-1.5 text-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    เวลาที่สังเกตพบเหตุการณ์จริง (Observed Time):
                  </span>
                  <p className="font-bold text-amber-950 text-xs sm:text-sm mt-0.5">
                    {formatThaiDateTime(item.observed_at)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-slate-400">เวลาเผยแพร่ต้นทาง:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{formatThaiDateTime(item.published_at)}</p>
              </div>
              <div>
                <span className="text-slate-400">เวลาบันทึกเข้าสู่ FloodTrace:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{formatThaiDateTime(item.retrieved_at)}</p>
              </div>
            </div>

            {/* Original Text Excerpt / ข้อความหลักจากแหล่งต้นทาง */}
            {item.factual_details && (
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0C65E8]" />
                  <span>บันทึกข้อความจากแหล่งต้นทาง (Original Text Excerpt):</span>
                </span>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm font-normal leading-relaxed shadow-xs">
                  "{item.factual_details}"
                </div>
              </div>
            )}

            {/* สาระสำคัญ / คำอธิบายเพิ่มเติม */}
            {item.summary && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-xs font-medium text-slate-400">คำอธิบายและสาระสำคัญของเหตุการณ์:</span>
                <p className="text-slate-700 mt-1 leading-relaxed text-xs sm:text-sm">
                  {item.summary}
                </p>
              </div>
            )}
          </div>

          {/* Section B: การวิเคราะห์และการเชื่อมโยงของ FloodTrace (FloodTrace Correlation & Verification) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 border border-blue-200/70 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#063B70]">
              <Compass className="w-4 h-4 text-[#0C65E8]" />
              <span>การวิเคราะห์และสถานะการตรวจสอบ (FloodTrace Verification)</span>
            </div>

            {/* Linked Monitoring Event if correlated */}
            {item.monitoring_event_id ? (
              <div className="p-3 rounded-xl bg-white border border-blue-200/80 space-y-1">
                <span className="text-3xs font-bold text-[#0C65E8] uppercase tracking-wider">
                  เหตุการณ์เฝ้าระวังที่เชื่อมโยง
                </span>
                <p className="font-bold text-sm text-[#063B70]">
                  {item.linked_event_title || item.monitoring_event_id}
                </p>
                {item.district && (
                  <span className="inline-block text-2xs text-slate-500">
                    พื้นที่: อำเภอ{item.district}
                  </span>
                )}
              </div>
            ) : isCuratedNews ? (
              <div className="p-3.5 rounded-xl bg-white border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-bold text-[#0C65E8] uppercase tracking-wider">
                    สถานะการคัดสรรข่าวสาร (Curated Public Source)
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-3xs font-bold ${verBadge.color}`}>
                    {verBadge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  ข่าวสารและบทความนี้ได้รับการคัดสรรโดยโครงการ FloodTrace เพื่อสนับสนุนการติดตามสถานการณ์และเผยแพร่ข้อมูลสู่สาธารณะ ทั้งนี้ FloodTrace ไม่ได้เป็นผู้ตรวจพิสูจน์ข้อเท็จจริงทุกข้อความในบทความด้วยตนเอง โปรดอ่านและอ้างอิงจากแหล่งข่าวต้นทางเป็นหลัก
                </p>
                <div className="pt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500 border-t border-slate-100">
                  <span><strong className="text-slate-700">แหล่งข่าว:</strong> {item.source_name}</span>
                  {item.published_at && (
                    <span><strong className="text-slate-700">วันที่เผยแพร่:</strong> {formatThaiDateTime(item.published_at)}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white border border-purple-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-bold text-purple-700 uppercase tracking-wider">
                    สถานะการตรวจสอบหลักฐาน (Evidence Verification)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-3xs font-bold ${verBadge.color}`}>
                    {verBadge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  หลักฐานนี้จัดเก็บเป็นข้อมูลอ้างอิงเชิงสังเกตการณ์ (External Evidence) ที่ผ่านการกรองความปลอดภัยสาธารณะและจัดหมวดหมู่พิกัดตามลุ่มน้ำปราจีนบุรี ข้อมูลหลักและภาพถ่ายได้รับการบันทึกสำเนาไว้ในระบบ FloodTrace
                </p>
              </div>
            )}

            {/* Correlation Metrics if linked */}
            {item.monitoring_event_id && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <span className="text-slate-400 block text-3xs">ความสอดคล้องเชิงพื้นที่</span>
                  <span className="font-bold text-slate-800">{item.spatial_relevance || 'UNKNOWN'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <span className="text-slate-400 block text-3xs">ความสอดคล้องด้านเวลา</span>
                  <span className="font-bold text-slate-800">{item.temporal_relevance || 'UNKNOWN'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-blue-100 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-3xs">ระดับความเกี่ยวเนื่อง</span>
                  <span className={`font-bold ${
                    item.event_relevance === 'HIGH' ? 'text-blue-700' :
                    item.event_relevance === 'MEDIUM' ? 'text-indigo-600' : 'text-slate-600'
                  }`}>
                    {item.event_relevance || 'UNRELATED'}
                  </span>
                </div>
              </div>
            )}

            {/* Explainable Reasons */}
            {item.correlation_reasons && item.correlation_reasons.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-2xs font-semibold text-slate-500">เหตุผลที่เชื่อมโยงกับเหตุการณ์:</span>
                <ul className="space-y-1 text-xs text-slate-700">
                  {item.correlation_reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#0C65E8] font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contradicting notice if present */}
            {item.contradiction_note && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">ข้อสังเกตความขัดแย้ง:</span>
                  <span>{item.contradiction_note}</span>
                </div>
              </div>
            )}

            {/* Section C: แหล่งข้อมูลและหลักฐานต้นทางที่เกี่ยวข้อง (Grouped Distinct Sources) */}
            {item.related_sources && item.related_sources.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider text-purple-900">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>แหล่งข้อมูลและหลักฐานต้นทางที่เกี่ยวข้อง ({item.related_sources.length + 1} แหล่งอ้างอิง)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-purple-100 text-purple-800 border border-purple-300/60">
                    รวมกลุ่มตามเหตุการณ์
                  </span>
                </div>
                <p className="text-2xs sm:text-xs text-purple-800/90 leading-relaxed">
                  เหตุการณ์นี้มีรายงานจากแหล่งข้อมูลสาธารณะหลายแห่งที่สอดคล้องกัน ระบบจึงจัดกลุ่มไว้ภายใต้การเฝ้าระวังเดียวกัน โดยแยกบันทึกข้อมูลต้นฉบับของแต่ละแหล่งไว้อย่างครบถ้วน:
                </p>

                <div className="space-y-2.5 pt-1">
                  {item.related_sources.map((src, idx) => (
                    <div key={src.id || idx} className="p-3 bg-white rounded-xl border border-purple-200/70 shadow-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-purple-100 text-purple-800">
                              {src.source_platform || 'SOCIAL'}
                            </span>
                            <span className="text-2xs font-bold text-slate-700 truncate">
                              {src.source_name}
                            </span>
                            {src.observed_at && (
                              <span className="text-3xs text-slate-400">
                                • พบเมื่อ {formatThaiDateTime(src.observed_at)}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-semibold text-[#063B70] mt-1 line-clamp-2">
                            {src.title_or_summary}
                          </h4>
                        </div>
                        {src.source_url && (
                          <a
                            href={src.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-3xs font-semibold border border-purple-200 flex items-center gap-1 shrink-0 transition-colors"
                            title="ดูโพสต์/หลักฐานต้นฉบับ"
                          >
                            <span>ดูต้นทาง</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {src.description && (
                        <p className="text-2xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{src.description}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section D: ข่าวสารและรายงานสื่อมวลชนที่เกี่ยวข้อง (Supporting News Context) */}
            {item.related_news && item.related_news.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider text-indigo-900">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-indigo-600" />
                    <span>ข่าวสารและรายงานสื่อมวลชนที่เกี่ยวข้อง ({item.related_news.length} รายงาน)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300/60">
                    ข้อมูลสนับสนุน
                  </span>
                </div>
                <p className="text-2xs sm:text-xs text-indigo-800/90 leading-relaxed">
                  รายงานข่าวจากสื่อมวลชนที่เกี่ยวข้องกับเหตุการณ์นี้ ถูกเชื่อมโยงเป็นข้อมูลสนับสนุนบริบทเชิงสารสนเทศ โดยระบบคงสถานะเป็นหมวดหมู่ข่าวสารแยกต่างหาก ไม่นับรวมเป็นรายงานประชาชน:
                </p>

                <div className="space-y-2 pt-1">
                  {item.related_news.map((news, idx) => (
                    <div key={news.id || idx} className="p-3 bg-white rounded-xl border border-indigo-200/70 shadow-xs flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {news.source_name}
                          </span>
                          {news.published_at && (
                            <span className="text-3xs text-slate-400">
                              เผยแพร่เมื่อ {formatThaiDateTime(news.published_at)}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
                          {news.title}
                        </h4>
                        {news.summary && (
                          <p className="text-2xs text-slate-500 line-clamp-1">
                            {news.summary}
                          </p>
                        )}
                      </div>
                      {news.source_url && (
                        <a
                          href={news.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-3xs font-semibold border border-indigo-200 flex items-center gap-1 shrink-0 transition-colors"
                          title="อ่านข่าวต้นทาง"
                        >
                          <span>อ่านข่าว</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legal / Scientific Caution Notice */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-2xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                <span>ข้อกำหนดความถูกต้องและขอบเขตการใช้งาน</span>
              </div>
              <p className="leading-relaxed">
                ข้อมูลจัดทำเพื่อสนับสนุนการติดตามสถานการณ์และการตัดสินใจเบื้องต้น 
                <strong> ไม่นับเป็นการยืนยันความสัมพันธ์เชิงสาเหตุ (Causation)</strong> และไม่ใช่ผลตรวจรับรองทางห้องปฏิบัติการ
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Responsive touch controls & Safe-Area) */}
        <div className="p-3.5 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors min-h-[44px]"
            >
              ปิดหน้าต่าง
            </button>

            {rawUrl && !isSyntheticHost && (
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                title="คัดลอกลิงก์ต้นทาง"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">คัดลอกลิงก์แล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>คัดลอกลิงก์ต้นทาง</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <span 
              className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-3xs sm:text-2xs inline-flex items-center gap-1.5"
              title="ข้อมูลหลักทั้งหมดถูกบันทึกไว้ในระบบเรียบร้อยแล้ว"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>บันทึกข้อมูลหลักไว้ในระบบแล้ว</span>
            </span>

            {isDemo ? (
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
                DEMO DATA
              </span>
            ) : isSourceAvailable && (
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0C65E8] hover:bg-[#063B70] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs min-h-[44px]"
                title={`เปิดหน้าต้นทาง: ${item.source_name}`}
              >
                <span>เปิดหน้าเพจต้นทาง</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
