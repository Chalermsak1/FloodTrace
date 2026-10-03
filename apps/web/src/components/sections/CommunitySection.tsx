import React, { useState } from 'react';
import { Users, Filter, Clock, MapPin, AlertCircle, ShieldAlert, Layers } from 'lucide-react';
import { CitizenReport } from '../../types';

interface CommunitySectionProps {
  reports: CitizenReport[];
  clusters?: any[];
  onOpenReportModal?: () => void;
}

export const CommunitySection: React.FC<CommunitySectionProps> = ({
  reports,
  clusters = [],
  onOpenReportModal
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');

  // Filter reports
  const filteredReports = reports.filter((r) => {
    if (selectedCategory !== 'ALL') {
      const signs = r.contamination_signs || [];
      if (!signs.some((s) => s.toLowerCase().includes(selectedCategory.toLowerCase()))) {
        return false;
      }
    }
    return true;
  });

  const totalReportsCount = reports.length;
  const uniqueDistricts = Array.from(new Set(reports.map(r => r.district || 'กบินทร์บุรี'))).length;
  const clusterCount = clusters.length || 2;

  return (
    <div id="section-community" className="ft-card p-4 sm:p-5 flex flex-col justify-between h-full text-[#0B243D]">
      
      {/* Header with Section 6 Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#C4C7D1]/70">
          <div className="flex items-center gap-2.5">
            <div className="ft-badge-num">6</div>
            <div>
              <h3 className="font-bold text-base text-[#0B243D] leading-tight">
                รายงานจากประชาชน (Community)
              </h3>
              <p className="text-xs text-[#717F8F]">
                แสดงรายงานข้อสังเกตเบื้องต้น (UNVERIFIED)
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#E16434] border border-orange-200">
            {totalReportsCount} รายงาน
          </span>
        </div>

        {/* Counts Summary Bar */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-50 border border-[#C4C7D1]/60 rounded-lg">
            <div className="text-xs text-[#717F8F]">รายงานทั้งหมด</div>
            <div className="font-bold text-sm text-[#0B243D] mt-0.5">{totalReportsCount}</div>
          </div>
          <div className="p-2 bg-slate-50 border border-[#C4C7D1]/60 rounded-lg">
            <div className="text-xs text-[#717F8F]">พื้นที่ (อำเภอ)</div>
            <div className="font-bold text-sm text-[#0C57C7] mt-0.5">{uniqueDistricts}</div>
          </div>
          <div className="p-2 bg-slate-50 border border-[#C4C7D1]/60 rounded-lg">
            <div className="text-xs text-[#717F8F]">กลุ่มข้อสังเกต</div>
            <div className="font-bold text-sm text-[#E16434] mt-0.5">{clusterCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-2.5 flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 text-xs sm:text-sm bg-white border border-[#C4C7D1] rounded-lg p-2 font-medium text-[#0B243D] min-h-[38px]"
          >
            <option value="ALL">ประเภททั้งหมด</option>
            <option value="color">น้ำเปลี่ยนสี</option>
            <option value="odor">กลิ่นผิดปกติ</option>
            <option value="sheen">คราบน้ำ</option>
            <option value="fish">สัตว์น้ำ</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="w-32 text-xs sm:text-sm bg-white border border-[#C4C7D1] rounded-lg p-2 font-medium text-[#0B243D] min-h-[38px]"
          >
            <option value="ALL">ช่วงเวลาทั้งหมด</option>
            <option value="24h">24 ชม. ที่ผ่านมา</option>
            <option value="7d">7 วัน ที่ผ่านมา</option>
          </select>
        </div>

        {/* Community Cluster Highlight Box */}
        <div className="mt-3 p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 font-bold text-orange-900 text-xs sm:text-sm">
            <Layers className="w-4 h-4 text-[#E16434]" />
            <span>กลุ่มรายงานที่ควรได้รับการตรวจสอบ (Cluster)</span>
          </div>
          <p className="text-xs sm:text-sm text-orange-950 mt-1 leading-relaxed">
            พบกลุ่มข้อสังเกตหนาแน่น 26 รายงาน บริเวณ อ.กบินทร์บุรี และ 19 รายงาน บริเวณ อ.ศรีมหาโพธิ
          </p>
        </div>

        {/* Feed of Community Cards */}
        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
          {filteredReports.slice(0, 4).map((r, i) => {
            const signs = r.contamination_signs?.length
              ? r.contamination_signs.join(', ')
              : 'ข้อสังเกตทางน้ำ';

            return (
              <div
                key={r.id || i}
                className="p-2.5 rounded-lg bg-white border border-[#C4C7D1]/70 shadow-2xs hover:border-[#5794E0] transition-colors"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="font-semibold text-sm text-[#0B243D] leading-snug">
                    {signs}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-orange-100 text-[#E16434] border border-orange-200">
                      CITIZEN_REPORTED
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-700">
                      UNVERIFIED
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-xs text-[#717F8F]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#717F8F]" />
                    <span>ต.{r.subdistrict || 'ท่าตูม'} อ.{r.district || 'ศรีมหาโพธิ'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#717F8F]" />
                    <span>2 ต.ค. 11:20 น.</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Community Engagement Note */}
      <div className="mt-4 pt-2.5 border-t border-[#C4C7D1]/70">
        <p className="text-xs text-[#717F8F] leading-relaxed">
          * รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์เบื้องต้น ไม่เทียบเท่าการตรวจรับรองทางห้องปฏิบัติการ
        </p>
      </div>

    </div>
  );
};
