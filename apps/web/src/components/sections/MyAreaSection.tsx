import React, { useState } from 'react';
import { Home, Bell, BellOff, Edit3, AlertTriangle, ShieldCheck, Droplets, Clock, Check } from 'lucide-react';

interface MyAreaSectionProps {
  district: string;
  onChangeDistrict: (district: string) => void;
  myAreaData: any;
  loading: boolean;
}

const DISTRICT_LIST = [
  'กบินทร์บุรี',
  'เมืองปราจีนบุรี',
  'ศรีมหาโพธิ',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const MyAreaSection: React.FC<MyAreaSectionProps> = ({
  district,
  onChangeDistrict,
  myAreaData,
  loading
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDist, setSelectedDist] = useState(district);

  const handleSaveDistrict = () => {
    onChangeDistrict(selectedDist);
    setIsEditing(false);
  };

  const floodStatus = myAreaData?.flood_status?.status || 'มีน้ำท่วมในพื้นที่';
  const watchPriority = myAreaData?.environmental_watch?.priority || 'VERIFICATION RECOMMENDED';
  const isHigh = watchPriority.includes('RECOMMENDED') || watchPriority.includes('HIGH');

  return (
    <div id="section-my-area" className="ft-card p-4 sm:p-5 flex flex-col justify-between h-full text-[#0B243D]">
      
      {/* Header with Section 2 Badge */}
      <div>
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#C4C7D1]/70">
          <div className="ft-badge-num">2</div>
          <div>
            <h3 className="font-bold text-base text-[#0B243D] leading-tight">
              พื้นที่ของฉัน (My Area)
            </h3>
            <p className="text-xs text-[#717F8F]">
              ติดตามพื้นที่ที่สนใจ และรับการแจ้งเตือน
            </p>
          </div>
        </div>

        {/* Selected Home Location Box */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-[#C4C7D1]/60 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0C57C7]/10 text-[#0C57C7] flex items-center justify-center shrink-0 mt-0.5 border border-[#0C57C7]/20">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#717F8F] uppercase">บ้านของฉัน</span>
              {isEditing ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <select
                    value={selectedDist}
                    onChange={(e) => setSelectedDist(e.target.value)}
                    className="text-xs bg-white border border-[#C4C7D1] rounded-md px-2 py-1 font-semibold text-[#0B243D] focus:ring-1 focus:ring-[#0C57C7]"
                  >
                    {DISTRICT_LIST.map((d) => (
                      <option key={d} value={d}>
                        อ.{d}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveDistrict}
                    className="px-2 py-1 bg-[#0C57C7] text-white rounded text-xs font-semibold hover:bg-[#103D76]"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="font-bold text-sm text-[#0B243D]">
                  อ.{district} จ.ปราจีนบุรี
                </div>
              )}
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-[#0C57C7] font-semibold hover:underline flex items-center gap-1 shrink-0"
            >
              <Edit3 className="w-3 h-3" />
              <span>แก้ไข</span>
            </button>
          )}
        </div>

        {/* Status Callout */}
        <div className="mt-3 p-3 rounded-xl bg-orange-50/80 border border-[#E16434]/40 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#E16434] text-white flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#717F8F]">สถานะพื้นที่ของคุณ</span>
              <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-[#E16434] text-white">
                HIGH
              </span>
            </div>
            <div className="font-bold text-xs text-[#0B243D] mt-0.5">
              ควรได้รับการตรวจสอบด้านสิ่งแวดล้อม
            </div>
          </div>
        </div>

        {/* 3 Status Metric Rows */}
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C4C7D1]/60">
            <span className="text-[#717F8F]">น้ำท่วมปัจจุบัน</span>
            <span className="font-semibold text-[#0B243D]">มีน้ำท่วมในพื้นที่</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C4C7D1]/60">
            <span className="text-[#717F8F]">แนวโน้ม 3 วัน</span>
            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
              ข้อมูลคาดการณ์ไม่พร้อมใช้งาน
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C4C7D1]/60">
            <span className="text-[#717F8F]">ผลตรวจจากหน่วยงาน</span>
            <span className="font-semibold text-[#717F8F]">ยังไม่มีผลตรวจ</span>
          </div>
        </div>

      </div>

      {/* Notification Toggle Control & Privacy Note */}
      <div className="mt-4 pt-3 border-t border-[#C4C7D1]/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notificationsEnabled ? (
              <Bell className="w-4 h-4 text-[#0C57C7]" />
            ) : (
              <BellOff className="w-4 h-4 text-[#717F8F]" />
            )}
            <span className="text-xs font-semibold text-[#0B243D]">
              รับการแจ้งเตือนสำหรับพื้นที่นี้
            </span>
          </div>

          <button
            type="button"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
              notificationsEnabled ? 'bg-[#0C57C7]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="text-xs text-[#717F8F] mt-2">
          * ตำแหน่งที่แม่นยำของท่านจะไม่ถูกเผยแพร่สู่สาธารณะ
        </div>
      </div>

    </div>
  );
};
