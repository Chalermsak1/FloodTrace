import React, { useState } from 'react';
import { ShieldCheck, FileCheck, ExternalLink, Calendar, MapPin, AlertCircle, Clock } from 'lucide-react';
import { WaterStation } from '../../types';

interface OfficialResultsSectionProps {
  stations: WaterStation[];
  onOpenAudit?: () => void;
}

export const OfficialResultsSection: React.FC<OfficialResultsSectionProps> = ({
  stations,
  onOpenAudit
}) => {
  const [activeTab, setActiveTab] = useState<'water' | 'sediment' | 'documents'>('water');

  return (
    <div id="section-official" className="ft-card p-4 sm:p-5 flex flex-col justify-between h-full text-[#0B243D]">
      
      {/* Header with Section 7 Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#C4C7D1]/70">
          <div className="flex items-center gap-2.5">
            <div className="ft-badge-num">7</div>
            <div>
              <h3 className="font-bold text-base text-[#0B243D] leading-tight">
                ผลตรวจจากหน่วยงาน (Official Results)
              </h3>
              <p className="text-xs text-[#717F8F]">
                แสดงผลตรวจและเอกสารจากหน่วยงานที่เผยแพร่ได้
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            OFFICIAL
          </span>
        </div>

        {/* 3 Tabs: [ผลตรวจคุณภาพน้ำ] [ผลตรวจตะกอน] [ประเภท/เอกสาร] */}
        <div className="mt-3 flex items-center gap-1.5 border-b border-[#C4C7D1]/60 pb-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('water')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors min-h-[36px] ${
              activeTab === 'water'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            ผลตรวจคุณภาพน้ำ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sediment')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors min-h-[36px] ${
              activeTab === 'sediment'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            ผลตรวจตะกอนดิน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors min-h-[36px] ${
              activeTab === 'documents'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            ประเภท/เอกสารทางการ
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="mt-3 text-xs sm:text-sm">
          {activeTab === 'water' && (
            <div className="space-y-2.5">
              
              {/* Sample Official Testing Card 1 */}
              <div className="p-3 rounded-xl bg-white border border-[#C4C7D1] shadow-2xs space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-xs text-[#717F8F] block">จุดเก็บตัวอย่าง:</span>
                    <span className="font-bold text-sm text-[#0B243D]">
                      แม่น้ำปราจีนบุรี บริเวณสะพานข้ามแม่น้ำ ต.ท่าตูม
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                    อยู่ระหว่างตรวจ
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#717F8F] pt-1.5 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#717F8F]" />
                    <span>วันที่: 2 ต.ค. 2567</span>
                  </span>
                  <span>หน่วยงาน: สคพ.7 (ปราจีนบุรี)</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#717F8F]">พารามิเตอร์: pH, DO, ค่าการนำไฟฟ้า</span>
                  <button
                    type="button"
                    onClick={onOpenAudit}
                    className="px-2.5 py-1.5 rounded bg-blue-50 text-[#0C57C7] font-semibold text-xs hover:bg-blue-100 flex items-center gap-1 transition-colors min-h-[36px]"
                  >
                    <span>ดูเอกสาร</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sample Official Testing Card 2 */}
              <div className="p-3 rounded-xl bg-white border border-[#C4C7D1] shadow-2xs space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-xs text-[#717F8F] block">จุดเก็บตัวอย่าง:</span>
                    <span className="font-bold text-sm text-[#0B243D]">
                      จุดตรวจสถานีวัดระดับน้ำบ้านโนนสุขภูมิ อ.กบินทร์บุรี
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    ผลตรวจพร้อมเผยแพร่
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#717F8F] pt-1.5 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#717F8F]" />
                    <span>วันที่: 28 ก.ย. 2567</span>
                  </span>
                  <span>หน่วยงาน: กรมชลประทาน / สสน.</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#717F8F]">สถานะ: อุทกวิทยาและระดับน้ำปกติ</span>
                  <button
                    type="button"
                    onClick={onOpenAudit}
                    className="px-2.5 py-1.5 rounded bg-blue-50 text-[#0C57C7] font-semibold text-xs hover:bg-blue-100 flex items-center gap-1 transition-colors min-h-[36px]"
                  >
                    <span>ดูเอกสาร</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'sediment' && (
            <div className="p-4 bg-slate-50 border border-[#C4C7D1]/70 rounded-xl text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-[#717F8F] mx-auto" />
              <div className="font-bold text-sm text-[#0B243D]">ยังไม่มีผลตรวจจากหน่วยงาน</div>
              <p className="text-xs text-[#717F8F] max-w-xs mx-auto leading-relaxed">
                ยังไม่มีการบันทึกผลการตรวจวิเคราะห์ตัวอย่างตะกอนดินฉบับสมบูรณ์ในระบบฐานข้อมูลสาธารณะ
              </p>
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                * การไม่มีผลตรวจไม่ได้หมายความว่าพื้นที่นั้นปลอดภัย (Absence of evidence is not evidence of safety)
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-white border border-[#C4C7D1] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-[#0B243D]">ประกาศสถานการณ์สิ่งแวดล้อม สคพ.7</div>
                  <div className="text-xs text-[#717F8F]">เอกสารรายงานคุณภาพน้ำลุ่มน้ำปราจีนบุรี ไตรมาส 3</div>
                </div>
                <button
                  type="button"
                  onClick={onOpenAudit}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0C57C7] text-xs sm:text-sm font-semibold rounded min-h-[36px]"
                >
                  เปิดอ่าน
                </button>
              </div>

              <div className="p-3 rounded-lg bg-white border border-[#C4C7D1] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-[#0B243D]">คู่มือการใช้น้ำปลอดภัยสำหรับประชาชน</div>
                  <div className="text-xs text-[#717F8F]">กรมควบคุมมลพิษ / จังหวัดปราจีนบุรี</div>
                </div>
                <button
                  type="button"
                  onClick={onOpenAudit}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0C57C7] text-xs sm:text-sm font-semibold rounded min-h-[36px]"
                >
                  เปิดอ่าน
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Provenance Footer Note */}
      <div className="mt-4 pt-2.5 border-t border-[#C4C7D1]/70">
        <p className="text-xs text-[#717F8F] leading-relaxed">
          * ข้อมูลผลตรวจทุกรายการเชื่อมโยงกับแหล่งที่มาทางการ (Provenance) สามารถตรวจสอบย้อนหลังได้
        </p>
      </div>

    </div>
  );
};
