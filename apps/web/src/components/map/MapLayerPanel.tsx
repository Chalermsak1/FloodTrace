import React, { useState } from 'react';
import { Layers, ListChecks, Eye, EyeOff, AlertTriangle, Droplets, Clock, UserCheck, ShieldCheck } from 'lucide-react';

export interface LayerState {
  verificationPriority: boolean;
  currentFlood: boolean;
  modeledExpansion: boolean;
  citizenObservations: boolean;
  officialResults: boolean;
}

interface MapLayerPanelProps {
  layers: LayerState;
  onToggleLayer: (key: keyof LayerState) => void;
  counts: {
    verificationPriority: number;
    citizenObservations: number;
    officialResults: number;
  };
  floodSourceStatus?: string;
  forecastSourceStatus?: string;
}

export const MapLayerPanel: React.FC<MapLayerPanelProps> = ({
  layers,
  onToggleLayer,
  counts,
  floodSourceStatus = 'ACCESS REQUIRED',
  forecastSourceStatus = 'ACCESS REQUIRED'
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'symbols'>('layers');

  return (
    <div className="bg-[#FBFCFC] border border-[#C4C7D1] rounded-xl shadow-sm h-full flex flex-col overflow-hidden text-[#0B243D]">
      
      {/* Header Tabs: [ชั้นข้อมูล] [สัญลักษณ์] */}
      <div className="flex border-b border-[#C4C7D1] bg-[#F4F7FA] p-1.5 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'layers'
              ? 'bg-[#0C57C7] text-white shadow-sm'
              : 'text-[#717F8F] hover:text-[#0B243D] hover:bg-white/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ชั้นข้อมูล</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('symbols')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'symbols'
              ? 'bg-[#0C57C7] text-white shadow-sm'
              : 'text-[#717F8F] hover:text-[#0B243D] hover:bg-white/60'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          <span>สัญลักษณ์</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {activeTab === 'layers' ? (
          <>
            <div className="text-[11px] font-semibold text-[#717F8F] uppercase tracking-wider px-1">
              ชั้นข้อมูลสาธารณะ (Public GIS Layers)
            </div>

            {/* 1. Environmental Verification Priority */}
            <div 
              onClick={() => onToggleLayer('verificationPriority')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                layers.verificationPriority
                  ? 'bg-blue-50/60 border-[#5794E0]/50'
                  : 'bg-white border-[#C4C7D1]/60 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={layers.verificationPriority}
                  onChange={() => {}} // Controlled by parent div
                  className="mt-0.5 rounded text-[#0C57C7] focus:ring-[#0C57C7] cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-[#0B243D] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E16434] inline-block shrink-0"></span>
                    <span>พื้นที่ที่ควรตรวจสอบ</span>
                  </div>
                  <div className="text-[10px] text-[#717F8F] mt-0.5">
                    Environmental Verification Priority
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                {counts.verificationPriority} โซน
              </span>
            </div>

            {/* 2. Current Flood (GISTDA) */}
            <div 
              onClick={() => onToggleLayer('currentFlood')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                layers.currentFlood
                  ? 'bg-blue-50/60 border-[#5794E0]/50'
                  : 'bg-white border-[#C4C7D1]/60 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={layers.currentFlood}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-[#0C57C7] focus:ring-[#0C57C7] cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-[#0B243D] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0C57C7] inline-block shrink-0"></span>
                    <span>พื้นที่น้ำท่วมปัจจุบัน</span>
                  </div>
                  <div className="text-[10px] text-[#717F8F] mt-0.5">
                    GISTDA Flood Extent Archive
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                {floodSourceStatus === 'ACTIVE' ? 'ACTIVE' : 'ACCESS REQ'}
              </span>
            </div>

            {/* 3. Modeled Expansion 3 Days */}
            <div 
              onClick={() => onToggleLayer('modeledExpansion')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                layers.modeledExpansion
                  ? 'bg-blue-50/60 border-[#5794E0]/50'
                  : 'bg-white border-[#C4C7D1]/60 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={layers.modeledExpansion}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-[#0C57C7] focus:ring-[#0C57C7] cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-[#0B243D] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#5794E0] bg-[#5794E0]/30 inline-block shrink-0"></span>
                    <span>แนวโน้มการขยายตัว 3 วัน</span>
                  </div>
                  <div className="text-[10px] text-[#717F8F] mt-0.5">
                    แบบจำลองทางอุทกวิทยา (MODELED)
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                MODELED
              </span>
            </div>

            {/* 4. Citizen Observations */}
            <div 
              onClick={() => onToggleLayer('citizenObservations')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                layers.citizenObservations
                  ? 'bg-blue-50/60 border-[#5794E0]/50'
                  : 'bg-white border-[#C4C7D1]/60 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={layers.citizenObservations}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-[#0C57C7] focus:ring-[#0C57C7] cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-[#0B243D] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E16434] inline-block shrink-0"></span>
                    <span>จุดรายงานจากประชาชน</span>
                  </div>
                  <div className="text-[10px] text-[#717F8F] mt-0.5">
                    Community Observations (UNVERIFIED)
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-[#E16434] border border-orange-200">
                {counts.citizenObservations} รายงาน
              </span>
            </div>

            {/* 5. Official Results */}
            <div 
              onClick={() => onToggleLayer('officialResults')}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                layers.officialResults
                  ? 'bg-blue-50/60 border-[#5794E0]/50'
                  : 'bg-white border-[#C4C7D1]/60 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={layers.officialResults}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-[#0C57C7] focus:ring-[#0C57C7] cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-[#0B243D] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shrink-0"></span>
                    <span>ผลตรวจจากหน่วยงาน</span>
                  </div>
                  <div className="text-[10px] text-[#717F8F] mt-0.5">
                    Official Environmental Results
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                {counts.officialResults > 0 ? `${counts.officialResults} จุด` : 'NONE AVAIL'}
              </span>
            </div>

            {/* Policy note */}
            <div className="text-[10px] text-[#717F8F] bg-[#E3EAF1]/60 rounded-lg p-2 border border-[#C4C7D1]/50 mt-3 leading-relaxed">
              <strong>ข้อกำหนดด้านความปลอดภัย:</strong> แผนที่แสดงเฉพาะข้อมูลสังเกตการณ์ที่ยืนยันที่มา และแบบจำลองทางอุทกวิทยาที่ได้รับอนุญาตเท่านั้น (ไม่มีข้อมูลที่ตั้งโรงงานในมุมมองสาธารณะ)
            </div>
          </>
        ) : (
          /* Symbols / Legend Tab */
          <div className="space-y-3 p-1">
            <div className="text-[11px] font-semibold text-[#717F8F] uppercase tracking-wider">
              คำอธิบายสัญลักษณ์ (GIS Legend)
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-[#C4C7D1]/70">
              <div className="w-5 h-5 rounded-full bg-[#E16434] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <AlertTriangle className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-[#0B243D] text-xs">
                  พื้นที่ที่ควรได้รับการตรวจสอบ
                </div>
                <div className="text-[11px] text-[#717F8F] mt-0.5 leading-snug">
                  พื้นที่ที่มีปัจจัยทางน้ำและรายงานจากประชาชนบ่งชี้ว่าควรจัดลำดับการตรวจสอบเพิ่มเติม
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-[#C4C7D1]/70">
              <div className="w-5 h-5 rounded-full bg-[#0C57C7] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Droplets className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-[#0B243D] text-xs">
                  พื้นที่น้ำท่วมปัจจุบัน
                </div>
                <div className="text-[11px] text-[#717F8F] mt-0.5 leading-snug">
                  ขอบเขตน้ำท่วมจากภาพถ่ายดาวเทียมและข้อมูลอุทกวิทยาทางการ
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-[#C4C7D1]/70">
              <div className="w-5 h-5 rounded-md border-2 border-dashed border-[#5794E0] bg-[#5794E0]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3 h-3 text-[#0C57C7]" />
              </div>
              <div>
                <div className="font-semibold text-[#0B243D] text-xs">
                  แนวโน้มการขยายตัว 3 วัน
                </div>
                <div className="text-[11px] text-[#717F8F] mt-0.5 leading-snug">
                  แบบจำลองคาดการณ์การไหลและการแผ่ขยายของน้ำท่วม (MODELED)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-[#C4C7D1]/70">
              <div className="w-5 h-5 rounded-full bg-[#E16434] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <UserCheck className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-[#0B243D] text-xs">
                  รายงานจากประชาชน
                </div>
                <div className="text-[11px] text-[#717F8F] mt-0.5 leading-snug">
                  ข้อสังเกตความผิดปกติที่ประชาชนแจ้งเข้ามา (UNVERIFIED)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-[#C4C7D1]/70">
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <div>
                <div className="font-semibold text-[#0B243D] text-xs">
                  ผลตรวจจากหน่วยงาน
                </div>
                <div className="text-[11px] text-[#717F8F] mt-0.5 leading-snug">
                  จุดเก็บตัวอย่างและเอกสารผลตรวจจากห้องปฏิบัติการทางการ (OFFICIAL)
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
