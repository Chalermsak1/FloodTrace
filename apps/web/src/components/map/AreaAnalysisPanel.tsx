import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  ArrowRight, 
  CloudRain, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin,
  Newspaper
} from 'lucide-react';

export interface AreaAnalysisData {
  cell_id?: string;
  cell_name?: string;
  subdistrict?: string;
  district?: string;
  priority_level?: string;
  priority_label_th?: string;
  priority_score?: number;
  priority_badge?: string;
  color?: string;
  freshness?: string;
  contributing_factors?: string[];
  water_summary?: string;
  rain_24h_mm?: number | null;
  citizen_report_count?: number;
  verified_report_count?: number;
  external_evidence_count?: number;
  independent_evidence_count?: number;
  contradicting_evidence_count?: number;
  waterway_name?: string;
  distance_to_waterway_km?: number;
  [key: string]: any;
}

interface AreaAnalysisPanelProps {
  data: AreaAnalysisData | null;
  onClose: () => void;
}

/**
 * Parses raw contributing factor strings into structured items for compact rendering.
 */
const parseFactor = (raw: string) => {
  const text = raw.trim();
  let type: 'verified' | 'warning' | 'limitation' | 'general' = 'general';
  let cleanText = text;

  if (text.startsWith('✓')) {
    type = 'verified';
    cleanText = text.replace(/^✓\s*/, '');
  } else if (text.startsWith('⚠️') || text.startsWith('!')) {
    type = 'warning';
    cleanText = text.replace(/^(⚠️|!)\s*/, '');
  } else if (text.startsWith('○')) {
    type = 'limitation';
    cleanText = text.replace(/^○\s*/, '');
  }

  let title = cleanText;
  let detail: string | null = null;

  if (cleanText.includes(':')) {
    const parts = cleanText.split(':');
    title = parts[0].trim();
    detail = parts.slice(1).join(':').trim();
  } else if (cleanText.includes('—')) {
    const parts = cleanText.split('—');
    title = parts[0].trim();
    detail = parts.slice(1).join('—').trim();
  } else if (cleanText.includes('(') && cleanText.endsWith(')')) {
    const match = cleanText.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      title = match[1].trim();
      detail = match[2].trim();
    }
  }

  return { type, title, detail, original: cleanText };
};

export const AreaAnalysisPanel: React.FC<AreaAnalysisPanelProps> = ({ data, onClose }) => {
  // Mobile sheet expansion state (default expanded when user picks an area)
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(true);
  
  // Touch swipe handling for mobile
  const touchStartY = useRef<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!data) return null;

  const areaTitle = data.cell_name || (data.subdistrict ? `ต.${data.subdistrict} (อ.${data.district})` : `อ.${data.district || 'เมืองปราจีนบุรี'} (ปราจีนบุรี)`);
  const priorityColor = data.color || '#0284c7';
  const priorityBadge = data.priority_badge || data.priority_level || 'ปานกลาง';
  const priorityScore = data.priority_score != null ? Number(data.priority_score).toFixed(2) : '-';
  const scorePercent = Math.min(100, Math.max(5, (data.priority_score || 0) * 100));

  // Parse and prioritize factors
  const factors = (data.contributing_factors || []).map(parseFactor);
  const warningFactors = factors.filter(f => f.type === 'warning');
  const verifiedFactors = factors.filter(f => f.type === 'verified');
  const limitationFactors = factors.filter(f => f.type === 'limitation');
  const generalFactors = factors.filter(f => f.type === 'general');

  // Sorted list: Warnings & High-value factors first, general next
  const displayFactors = [...warningFactors, ...verifiedFactors, ...generalFactors];

  // Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY.current;

    // Swipe down on handle (> 40px) collapses the sheet
    if (diff > 40 && isMobileExpanded) {
      setIsMobileExpanded(false);
    }
    // Swipe up on collapsed bar (< -30px) expands the sheet
    else if (diff < -30 && !isMobileExpanded) {
      setIsMobileExpanded(true);
    }
    touchStartY.current = null;
  };

  return (
    <>
      {/* ============================================================== */}
      {/* MOBILE BOTTOM SHEET (< md, 320px - 767px)                      */}
      {/* Fixed viewport anchoring right above mobile bottom navigation  */}
      {/* ============================================================== */}
      <div className="md:hidden">
        {/* Backdrop when expanded */}
        {isMobileExpanded && (
          <div 
            onClick={() => setIsMobileExpanded(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-35 animate-in fade-in duration-150"
            aria-hidden="true"
          />
        )}

        {/* COLLAPSED MOBILE MINI-BAR */}
        {!isMobileExpanded ? (
          <div 
            onClick={() => setIsMobileExpanded(true)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-40 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl px-3 py-2 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-150 transition-all hover:bg-white"
            role="region"
            aria-label="สรุปข้อมูลพื้นที่วิเคราะห์ ย่อส่วน"
          >
            {/* Drag Handle Indicator */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1.5" />

            <div className="flex items-center justify-between gap-2 min-h-[44px]">
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="px-2.5 py-1 rounded-full text-2xs font-bold text-white shrink-0 shadow-2xs"
                  style={{ backgroundColor: priorityColor }}
                >
                  {priorityBadge}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                    {areaTitle}
                  </h4>
                  <span className="text-2xs text-slate-500 font-medium block truncate">
                    คะแนน {priorityScore} / 1.00 • แตะเพื่อขยาย
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileExpanded(true);
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 hover:text-[#0C65E8] rounded-xl active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] transition-colors"
                  aria-label="ขยายดูรายละเอียดพื้นที่"
                  aria-expanded="false"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] transition-colors"
                  aria-label="ปิดการเลือกพื้นที่"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* EXPANDED MOBILE BOTTOM SHEET */
          <div 
            className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 max-h-[72vh] bg-white/98 backdrop-blur-md border-t border-slate-200/90 rounded-t-3xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="รายละเอียดพื้นที่วิเคราะห์"
          >
            {/* Drag Handle & Sticky Header on Mobile */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="px-4 pt-2.5 pb-2.5 border-b border-slate-100 shrink-0 bg-white/80 rounded-t-3xl"
            >
              <button 
                type="button"
                onClick={() => setIsMobileExpanded(false)}
                className="w-full flex justify-center py-1 group cursor-pointer"
                aria-label="ย่อหน้าต่างรายละเอียดพื้นที่"
              >
                <div className="w-12 h-1.5 bg-slate-300 group-hover:bg-slate-400 rounded-full transition-colors" />
              </button>

              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0C65E8]" />
                    <span>พื้นที่วิเคราะห์</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug truncate">
                    {areaTitle}
                  </h3>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    อ.{data.district || 'เมืองปราจีนบุรี'} จ.ปราจีนบุรี
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMobileExpanded(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-xl active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] transition-colors"
                    aria-label="ย่อหน้าต่างรายละเอียด"
                    aria-expanded="true"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] transition-colors"
                    aria-label="ปิดหน้ารายละเอียดพื้นที่วิเคราะห์"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content Body on Mobile */}
            <div className="overflow-y-auto px-4 py-3 space-y-2.5 overscroll-contain">
              {/* Priority & Score Card */}
              <div className="p-2.5 rounded-2xl bg-slate-50/90 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: priorityColor }}
                    />
                    <span className="text-xs font-semibold text-slate-600">ลำดับการเฝ้าระวัง:</span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-2xs font-bold text-white shadow-2xs"
                      style={{ backgroundColor: priorityColor }}
                    >
                      {data.priority_label_th || priorityBadge}
                    </span>
                    <span className="text-3xs text-slate-400 font-normal">
                      ({priorityBadge})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900">{priorityScore}</span>
                    <span className="text-2xs text-slate-400 font-medium"> / 1.00</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${scorePercent}%`,
                      backgroundColor: priorityColor
                    }}
                  />
                </div>
              </div>

              {/* Factors List */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">ปัจจัยประมวลผลสำคัญ:</span>
                <div className="space-y-1">
                  {displayFactors.map((f, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded-xl text-xs flex items-start gap-2 border leading-tight ${
                        f.type === 'warning'
                          ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}
                    >
                      {f.type === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0C65E8] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold block">{f.title}</span>
                        {f.detail && (
                          <span className="text-slate-500 block text-2xs mt-0.5">{f.detail}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Data Limitations Note */}
                  {limitationFactors.map((f, idx) => (
                    <div 
                      key={`lim-${idx}`}
                      className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs flex items-start gap-1.5 leading-snug"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold block text-2xs uppercase text-amber-800 tracking-wider">ข้อจำกัดข้อมูล</span>
                        <span className="text-2xs text-amber-900/90 leading-tight block">{f.original}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compact 2-Column Metrics Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-2xs text-slate-400 font-medium">ฝน 24 ชม.</span>
                      <span className="text-3xs text-sky-600 font-medium">โทรมาตร</span>
                    </div>
                    <span className="font-bold text-sm text-slate-800">
                      {data.rain_24h_mm != null ? `${data.rain_24h_mm.toFixed(1)} มม.` : <span className="text-slate-400 font-normal text-xs">ไม่มีข้อมูล</span>}
                    </span>
                  </div>
                  <CloudRain className="w-4 h-4 text-sky-500 shrink-0" />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-2xs text-slate-400 font-medium">รายงานชุมชน</span>
                      <span className="text-3xs text-teal-600 font-medium">พลเมือง</span>
                    </div>
                    <span className="font-bold text-sm text-slate-800">
                      {data.citizen_report_count ?? 0} รายการ
                    </span>
                  </div>
                  <Users className="w-4 h-4 text-teal-600 shrink-0" />
                </div>
              </div>

              {/* External Evidence Card */}
              {(data.external_evidence_count ?? 0) > 0 && (
                <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100/80 flex items-center justify-between text-xs text-purple-900">
                  <div className="flex items-center gap-1.5">
                    <Newspaper className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="text-2xs font-medium text-purple-800">หลักฐานจากสื่อสาธารณะ:</span>
                  </div>
                  <span className="text-xs font-bold text-purple-950">{data.external_evidence_count} รายการ</span>
                </div>
              )}

              {/* Freshness & Primary Action Link */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 pb-1">
                <div className="text-2xs text-slate-500 flex items-center gap-1 truncate">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">ความสดใหม่: {data.freshness || 'สดใหม่ (< 1 ชม.)'}</span>
                </div>

                <Link 
                  to={`/my-area?district=${encodeURIComponent(data.district || 'กบินทร์บุรี')}`}
                  className="min-h-[44px] px-4 py-2 bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] focus:ring-offset-1"
                >
                  <span>ดูข้อมูลลึก</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP FLOATING CARD (md: 768px+, approx 460–520px)           */}
      {/* ============================================================== */}
      <div 
        className="hidden md:flex flex-col absolute top-20 left-4 z-20 w-[380px] lg:w-[460px] xl:w-[500px] max-w-[90vw] max-h-[calc(100%-6rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-3.5 lg:p-4 space-y-2.5 animate-in fade-in slide-in-from-left-2 duration-150 overflow-hidden"
        role="dialog"
        aria-label="รายละเอียดพื้นที่วิเคราะห์"
      >
        {/* Desktop Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#0C65E8]" />
              <span>พื้นที่วิเคราะห์</span>
            </div>
            <h3 className="text-base lg:text-lg font-bold text-slate-900 leading-snug truncate">
              {areaTitle}
            </h3>
            <span className="text-xs text-slate-500 block mt-0.5">
              อ.{data.district || 'เมืองปราจีนบุรี'} จ.ปราจีนบุรี
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] transition-colors shrink-0"
            aria-label="ปิดหน้ารายละเอียดพื้นที่วิเคราะห์"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content on Desktop */}
        <div className="overflow-y-auto space-y-2 pr-1 text-slate-700 overscroll-contain">
          {/* Priority Status & Score Bar */}
          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: priorityColor }}
                />
                <span className="text-xs font-semibold text-slate-600">ลำดับการเฝ้าระวัง:</span>
                <span 
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white shadow-2xs"
                  style={{ backgroundColor: priorityColor }}
                >
                  {data.priority_label_th || priorityBadge}
                </span>
                <span className="text-3xs text-slate-400 font-normal">
                  ({priorityBadge})
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{priorityScore}</span>
                <span className="text-2xs text-slate-400 font-medium"> / 1.00</span>
              </div>
            </div>

            {/* Compact Progress Bar */}
            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${scorePercent}%`,
                  backgroundColor: priorityColor
                }}
              />
            </div>
          </div>

          {/* Factors List */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 block">ปัจจัยประมวลผลสำคัญ:</span>
            <div className="space-y-1">
              {displayFactors.map((f, idx) => (
                <div 
                  key={idx} 
                  className={`p-1.5 rounded-lg text-xs flex items-start gap-1.5 border leading-tight ${
                    f.type === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-100 text-slate-800'
                  }`}
                >
                  {f.type === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0C65E8] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold block">{f.title}</span>
                    {f.detail && (
                      <span className="text-slate-500 block text-2xs mt-0.5">{f.detail}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Data Limitations Note */}
              {limitationFactors.map((f, idx) => (
                <div 
                  key={`lim-${idx}`}
                  className="p-1.5 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs flex items-start gap-1.5 leading-snug"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold block text-2xs uppercase text-amber-800 tracking-wider">ข้อจำกัดข้อมูล</span>
                    <span className="text-2xs text-amber-900/90 leading-tight block">{f.original}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compact 2-Column Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-2xs text-slate-400 font-medium">ฝน 24 ชม.</span>
                  <span className="text-3xs text-sky-600 font-medium">โทรมาตร</span>
                </div>
                <span className="font-bold text-sm text-slate-800">
                  {data.rain_24h_mm != null ? `${data.rain_24h_mm.toFixed(1)} มม.` : <span className="text-slate-400 font-normal text-xs">ไม่มีข้อมูล</span>}
                </span>
              </div>
              <CloudRain className="w-4 h-4 text-sky-500 shrink-0" />
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-2xs text-slate-400 font-medium">รายงานชุมชน</span>
                  <span className="text-3xs text-teal-600 font-medium">ประชาชน</span>
                </div>
                <span className="font-bold text-sm text-slate-800">
                  {data.citizen_report_count ?? 0} รายการ
                </span>
              </div>
              <Users className="w-4 h-4 text-teal-600 shrink-0" />
            </div>
          </div>

          {/* External Evidence Card */}
          {(data.external_evidence_count ?? 0) > 0 && (
            <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100/80 flex items-center justify-between text-xs text-purple-900">
              <div className="flex items-center gap-1.5">
                <Newspaper className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="text-2xs font-medium text-purple-800">หลักฐานจากสื่อสาธารณะ:</span>
              </div>
              <span className="text-xs font-bold text-purple-950">{data.external_evidence_count} รายการ</span>
            </div>
          )}

          {/* Freshness & Primary Action Link */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="text-2xs text-slate-500 flex items-center gap-1 truncate">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">ความสดใหม่: {data.freshness || 'สดใหม่ (< 1 ชม.)'}</span>
            </div>

            <Link 
              to={`/my-area?district=${encodeURIComponent(data.district || 'กบินทร์บุรี')}`}
              className="px-3.5 py-1.5 bg-[#0C65E8] hover:bg-[#063B70] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] focus:ring-offset-1"
              title="ดูข้อมูลเจาะลึกระดับพื้นที่"
            >
              <span>ดูข้อมูลลึก</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
