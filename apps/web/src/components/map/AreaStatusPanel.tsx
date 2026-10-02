import React, { useState } from 'react';
import { AlertTriangle, Share2, ArrowRight, CheckCircle2, HelpCircle, Check, Info } from 'lucide-react';

interface AreaCardData {
  area_id: string;
  district: string;
  status: string;
  flood: string;
  water: string;
  hydrological_connectivity: string;
  nearby_facilities?: string;
  citizen_observations: string;
  current_laboratory_evidence: string;
  forecast: string;
  interpretation: string;
  disclaimer: string;
}

interface AreaStatusPanelProps {
  areaData: AreaCardData | null;
  loading: boolean;
  onViewDetail: () => void;
}

export const AreaStatusPanel: React.FC<AreaStatusPanelProps> = ({
  areaData,
  loading,
  onViewDetail
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (!areaData) return;
    const url = new URL(window.location.href);
    url.searchParams.set('district', areaData.district);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const district = areaData?.district || 'กบินทร์บุรี';
  const isHighPriority = areaData?.status === 'VERIFICATION RECOMMENDED' || areaData?.status === 'WATCH';

  return (
    <div className="bg-[#FBFCFC] border border-[#C4C7D1] rounded-xl shadow-sm h-full flex flex-col justify-between p-3.5 text-[#0B243D] overflow-y-auto">
      
      {/* Top Header & Share Button */}
      <div>
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#C4C7D1]/70">
          <div>
            <div className="text-[11px] font-semibold text-[#717F8F] uppercase tracking-wider">
              พื้นที่ที่เลือกตรวจสอบ
            </div>
            <h3 className="font-bold text-base text-[#0B243D] leading-tight mt-0.5">
              อำเภอ{district}
            </h3>
            <div className="text-xs text-[#717F8F]">
              จังหวัดปราจีนบุรี
            </div>
          </div>
          <button
            type="button"
            onClick={handleShare}
            title="แชร์ลิงก์พื้นที่นี้"
            className="p-1.5 rounded-lg border border-[#C4C7D1] text-[#717F8F] hover:text-[#0C57C7] hover:border-[#0C57C7] hover:bg-blue-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Status Highlight Card */}
        <div className="mt-3 p-3 rounded-xl bg-orange-50/70 border border-[#E16434]/40 flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E16434] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-[#717F8F]">
                สถานะพื้นที่
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E16434] text-white">
                สูง (HIGH)
              </span>
            </div>
            <div className="font-bold text-sm text-[#0B243D] mt-0.5 leading-snug">
              ควรได้รับการตรวจสอบด้านสิ่งแวดล้อม
            </div>
            <div className="text-[10px] text-[#717F8F] mt-1">
              ระดับความสำคัญในการตรวจสอบ (Environmental Verification Priority)
            </div>
          </div>
        </div>

        {/* 4 Compact Metric Rows */}
        <div className="mt-3 space-y-1.5 text-xs">
          
          {/* Row 1: Current Flood */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C4C7D1]/60">
            <span className="text-[#717F8F] font-medium">น้ำท่วมปัจจุบัน</span>
            <span className="font-semibold text-[#0B243D] text-right">
              {areaData?.flood?.includes('OFFICIAL') ? 'มีน้ำท่วมในพื้นที่' : 'ไม่พบน้ำท่วม'}
            </span>
          </div>

          {/* Row 2: Water Connectivity */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C4C7D1]/60">
            <span className="text-[#717F8F] font-medium">การเชื่อมต่อทางน้ำ</span>
            <span className="font-semibold text-[#0C57C7] text-right">
              มีเส้นทางน้ำที่เกี่ยวข้อง
            </span>
          </div>

          {/* Row 3: Citizen Reports */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C4C7D1]/60">
            <span className="text-[#717F8F] font-medium">รายงานจากประชาชน</span>
            <span className="font-bold text-[#717F8F] text-right">
              {areaData?.citizen_observations || '0 รายงาน'}
            </span>
          </div>

          {/* Row 4: Official Results */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C4C7D1]/60">
            <span className="text-[#717F8F] font-medium">ผลตรวจจากหน่วยงาน</span>
            <span className="font-semibold text-[#717F8F] text-right">
              {areaData?.current_laboratory_evidence === 'NONE AVAILABLE' ? 'ยังไม่มีผลตรวจ' : 'มีผลตรวจ'}
            </span>
          </div>

        </div>

        {/* "What Does This Data Mean?" Box */}
        <div className="mt-3 p-2.5 rounded-lg bg-[#E3EAF1]/70 border border-[#C4C7D1]/60 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#0B243D] text-[11px] mb-1">
            <Info className="w-3.5 h-3.5 text-[#0C57C7]" />
            <span>ข้อมูลนี้หมายถึงอะไร?</span>
          </div>
          <p className="text-[11px] text-[#0B243D]/80 leading-relaxed">
            พื้นที่นี้มีข้อมูลหลายแหล่งที่บ่งชี้ว่าควรได้รับการตรวจสอบด้านสิ่งแวดล้อมเพิ่มเติม แต่ไม่ได้หมายความว่าพื้นที่นั้นมีการปนเปื้อน หรือเป็นการระบุผู้รับผิดชอบ
          </p>
        </div>

      </div>

      {/* Primary CTA Button */}
      <div className="mt-3 pt-2">
        <button
          type="button"
          onClick={onViewDetail}
          className="w-full h-11 bg-[#0C57C7] hover:bg-[#103D76] text-white rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <span>ดูรายละเอียดพื้นที่</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
