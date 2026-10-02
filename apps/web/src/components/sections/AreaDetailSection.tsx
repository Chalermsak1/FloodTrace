import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  ShieldAlert, 
  Layers, 
  Droplets, 
  Calendar,
  Compass,
  FileCheck
} from 'lucide-react';

interface AreaDetailSectionProps {
  district: string;
  areaData: any;
  loading: boolean;
}

export const AreaDetailSection: React.FC<AreaDetailSectionProps> = ({
  district,
  areaData,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'forecast' | 'reports' | 'official' | 'situation'
  >('overview');

  const citizenCount = areaData?.citizen_observations || '0 UNVERIFIED';

  return (
    <div id="section-area-detail" className="ft-card p-4 sm:p-5 flex flex-col justify-between h-full text-[#0B243D]">
      
      {/* Header with Section 4 Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#C4C7D1]/70">
          <div className="flex items-center gap-2.5">
            <div className="ft-badge-num">4</div>
            <div>
              <h3 className="font-bold text-base text-[#0B243D] leading-tight">
                รายละเอียดพื้นที่ (Area Detail)
              </h3>
              <p className="text-[11px] text-[#717F8F]">
                อำเภอ{district} จังหวัดปราจีนบุรี
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E16434] text-white">
            HIGH
          </span>
        </div>

        {/* 5 Analytical Tabs (NO Facility Tab!) */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#C4C7D1]/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            ภาพรวม
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              activeTab === 'forecast'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            แนวโน้ม 3 วัน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              activeTab === 'reports'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            รายงานจากประชาชน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              activeTab === 'official'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            ข้อมูลทางการ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('situation')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              activeTab === 'situation'
                ? 'bg-[#0C57C7] text-white shadow-sm'
                : 'text-[#717F8F] hover:bg-slate-100 hover:text-[#0B243D]'
            }`}
          >
            สถานการณ์
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="mt-3 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              
              {/* Evidence Checklist */}
              <div>
                <span className="text-[11px] font-bold text-[#717F8F] uppercase tracking-wider block mb-1.5">
                  รายการหลักฐานในพื้นที่ (Evidence Checklist)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  <div className="flex items-center gap-2 p-1.5 bg-white border border-[#C4C7D1]/60 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>น้ำท่วมในพื้นที่</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white border border-[#C4C7D1]/60 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>การเชื่อมต่อทางน้ำ</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white border border-[#C4C7D1]/60 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>มีรายงานจากประชาชน</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white border border-[#C4C7D1]/60 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-[#0C57C7] shrink-0" />
                    <span>มีข้อมูลที่ควรพิจารณาตรวจ</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white border border-[#C4C7D1]/60 rounded-md sm:col-span-2">
                    <XCircle className="w-4 h-4 text-[#717F8F] shrink-0" />
                    <span className="text-[#717F8F]">ยังไม่มีผลตรวจจากห้องปฏิบัติการ</span>
                  </div>
                </div>
              </div>

              {/* "Why This Area?" 5 Evidence Tiers */}
              <div className="p-3 bg-slate-50 border border-[#C4C7D1]/70 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-[#0B243D] block">
                  ทำไมพื้นที่นี้จึงถูกแสดง? (Evidence Tiers)
                </span>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-start justify-between gap-2 border-b border-[#C4C7D1]/40 pb-1">
                    <span className="text-[#717F8F]">1. น้ำท่วม</span>
                    <span className="font-semibold text-right text-[#0B243D]">
                      OFFICIAL / MEASURED (GISTDA Satellite Extent)
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 border-b border-[#C4C7D1]/40 pb-1">
                    <span className="text-[#717F8F]">2. การเชื่อมต่อทางน้ำ</span>
                    <span className="font-semibold text-right text-[#0C57C7]">
                      MODELED / DERIVED (โครงข่ายลุ่มน้ำปราจีนบุรี)
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 border-b border-[#C4C7D1]/40 pb-1">
                    <span className="text-[#717F8F]">3. รายงานประชาชน</span>
                    <span className="font-semibold text-right text-[#E16434]">
                      CITIZEN_REPORTED / UNVERIFIED ({citizenCount})
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 border-b border-[#C4C7D1]/40 pb-1">
                    <span className="text-[#717F8F]">4. ผลตรวจหน่วยงาน</span>
                    <span className="font-semibold text-right text-[#717F8F]">
                      OFFICIAL / NONE AVAILABLE
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 pt-0.5">
                    <span className="text-[#0B243D] font-bold">5. สรุปความสำคัญ</span>
                    <span className="font-bold text-right text-[#E16434]">
                      VERIFICATION PRIORITY (ควรตรวจสอบเพิ่มเติม)
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'forecast' && (
            <div className="p-3 bg-slate-50 border border-[#C4C7D1]/60 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-[#0B243D]">การประเมินล่วงหน้า 3 วัน</div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                ตามการประเมินทางอุทกวิทยา พื้นที่ปลายน้ำตามแนวทางน้ำเชื่อมต่อมีโอกาสได้รับผลกระทบจากปริมาณน้ำหลากสะสม
              </p>
              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                <strong>สถานะการเข้าถึง:</strong> แหล่งข้อมูลพยากรณ์สาธารณะภายนอกถูกจำกัดตามนโยบายความปลอดภัยการผลิต (ACCESS REQUIRED)
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-2">
              <div className="text-[11px] text-[#717F8F]">
                รายงานข้อสังเกตจากประชาชนในพื้นที่ (ปกป้องข้อมูลส่วนบุคคล)
              </div>
              <div className="p-2.5 rounded-lg bg-orange-50/70 border border-orange-200 text-xs">
                <div className="flex items-center justify-between font-bold text-orange-800 text-[11px]">
                  <span>ข้อสังเกตเรื่องน้ำเปลี่ยนสีและกลิ่น</span>
                  <span>UNVERIFIED</span>
                </div>
                <div className="text-[11px] text-slate-700 mt-1">
                  มีข้อสังเกตสะสม 26 รายการในเขตพื้นที่ อ.{district}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'official' && (
            <div className="p-3 bg-slate-50 border border-[#C4C7D1]/60 rounded-xl text-xs space-y-2">
              <div className="font-bold text-[#0B243D]">ข้อมูลอย่างเป็นทางการจากหน่วยงาน</div>
              <div className="text-[11px] text-[#717F8F]">
                สำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7 (สคพ.7) / กรมควบคุมมลพิษ
              </div>
              <div className="p-2 rounded bg-slate-100 text-[#717F8F] text-[11px]">
                ขณะนี้ยังไม่มีผลตรวจห้องปฏิบัติการฉบับรับรองสำหรับสารเคมีในพิกัดนี้ (NONE AVAILABLE)
              </div>
            </div>
          )}

          {activeTab === 'situation' && (
            <div className="p-3 bg-slate-50 border border-[#C4C7D1]/60 rounded-xl text-xs space-y-2">
              <div className="font-bold text-[#0B243D]">สรุปภาพรวมสถานการณ์สิ่งแวดล้อม</div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                การติดตามเน้นการเชื่อมต่อของมวลน้ำและการแจ้งเตือนประชาชนให้หลีกเลี่ยงการใช้น้ำดิบจากแหล่งน้ำธรรมชาติที่ยังไม่ผ่านการบำบัด
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Mandatory Environmental Screening Legal Disclaimer */}
      <div className="mt-4 pt-2.5 border-t border-[#C4C7D1]/70">
        <div className="p-2 rounded-lg bg-[#E3EAF1]/70 border border-[#C4C7D1]/50 text-[10px] text-[#0B243D]/80 flex items-start gap-1.5 leading-snug">
          <ShieldAlert className="w-3.5 h-3.5 text-[#E16434] shrink-0 mt-0.5" />
          <span>
            <strong>ข้อความชี้แจง:</strong> ผลนี้ไม่ได้ยืนยันการปนเปื้อน ไม่ได้ยืนยันสาเหตุ ไม่ได้ระบุผู้รับผิดชอบ และไม่ได้ยืนยันความผิดทางกฎหมาย
          </span>
        </div>
      </div>

    </div>
  );
};
