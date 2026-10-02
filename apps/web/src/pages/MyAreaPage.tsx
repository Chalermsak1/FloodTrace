import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Plus, 
  Trash2, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  Compass, 
  ShieldCheck,
  CheckCircle2,
  BellRing,
  X
} from 'lucide-react';

const ALL_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

interface AreaStatusMap {
  [district: string]: {
    priority: string;
    priorityLabel: string;
    watchStatus: string;
    lastUpdated: string;
    alertEnabled: boolean;
  };
}

export const MyAreaPage: React.FC = () => {
  // Followed districts stored in localStorage
  const [savedDistricts, setSavedDistricts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ruwaigon_followed_areas');
      return stored ? JSON.parse(stored) : ['บ้านสร้าง', 'กบินทร์บุรี'];
    } catch {
      return ['บ้านสร้าง', 'กบินทร์บุรี'];
    }
  });

  const [areaDetails, setAreaDetails] = useState<AreaStatusMap>({});
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string>('เมืองปราจีนบุรี');
  const [loading, setLoading] = useState<boolean>(true);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ruwaigon_followed_areas', JSON.stringify(savedDistricts));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [savedDistricts]);

  // Fetch status for all followed districts
  useEffect(() => {
    setLoading(true);
    fetch('/api/public/zones')
      .then(res => res.json())
      .then(data => {
        const statusMap: AreaStatusMap = {};
        if (data?.features) {
          data.features.forEach((f: any) => {
            const props = f.properties;
            statusMap[props.district] = {
              priority: props.verification_priority,
              priorityLabel: props.verification_priority_label,
              watchStatus: props.watch_status,
              lastUpdated: '02 ต.ค. 2569 22:00 น.',
              alertEnabled: true
            };
          });
        }
        setAreaDetails(statusMap);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleAddArea = () => {
    if (!savedDistricts.includes(selectedToAdd)) {
      setSavedDistricts([...savedDistricts, selectedToAdd]);
    }
    setShowAddModal(false);
  };

  const handleRemoveArea = (d: string) => {
    setSavedDistricts(savedDistricts.filter(item => item !== d));
  };

  const toggleNotification = (district: string) => {
    setAreaDetails(prev => ({
      ...prev,
      [district]: {
        ...prev[district],
        alertEnabled: !prev[district]?.alertEnabled
      }
    }));
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'สูงมาก') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (priority === 'สูง') return 'bg-red-50 text-red-700 border-red-200';
    if (priority === 'ปานกลาง') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0C65E8] text-xs font-bold mb-2 border border-blue-100">
            <Compass className="w-3.5 h-3.5" />
            <span>การติดตามสถานะพื้นที่ส่วนบุคคล</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#063B70] tracking-tight">
            พื้นที่ของฉัน
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            ปักหมุดติดตามตำบลและอำเภอที่คุณสนใจ เพื่อรับการแจ้งเตือนการเปลี่ยนแปลงสถานการณ์น้ำและสิ่งแวดล้อม
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มพื้นที่ติดตาม</span>
        </button>
      </div>

      {/* Followed Area Cards Grid (Section 25: Clean cards, NO large charts) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#063B70]">
          พื้นที่ที่กำลังติดตาม ({savedDistricts.length})
        </h2>

        {savedDistricts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">ยังไม่มีพื้นที่ที่ติดตาม</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              กดปุ่ม "+ เพิ่มพื้นที่ติดตาม" เพื่อเลือกอำเภอในจังหวัดปราจีนบุรีที่คุณต้องการเฝ้าระวัง
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedDistricts.map(districtName => {
              const status = areaDetails[districtName] || {
                priority: 'กำลังประเมิน',
                priorityLabel: 'ระดับเฝ้าระวัง',
                watchStatus: 'ติดตามสถานการณ์',
                lastUpdated: 'วันนี้',
                alertEnabled: true
              };

              return (
                <div
                  key={districtName}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#0C65E8]" />
                        <h3 className="text-base font-extrabold text-[#063B70]">
                          อำเภอ{districtName}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        จังหวัดปราจีนบุรี
                      </span>
                    </div>

                    {/* Current Watch Level Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getPriorityBadgeClass(status.priority)}`}>
                      {status.priority || 'ระดับเฝ้าระวังต่ำ'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>อัปเดตล่าสุด: {status.lastUpdated}</span>
                    </div>
                    <span className="text-slate-500 font-medium">
                      {status.watchStatus}
                    </span>
                  </div>

                  {/* Footer Action & Notification Toggle */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    
                    {/* Notification toggle */}
                    <button
                      type="button"
                      onClick={() => toggleNotification(districtName)}
                      className={`text-xs font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors ${
                        status.alertEnabled
                          ? 'text-[#0C65E8] bg-blue-50'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>{status.alertEnabled ? 'แจ้งเตือนเปิดอยู่' : 'ปิดแจ้งเตือน'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveArea(districtName)}
                        aria-label={`ยกเลิกติดตามอำเภอ${districtName}`}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <Link
                        to={`/area-detail?district=${encodeURIComponent(districtName)}`}
                        className="text-xs font-bold text-[#0C65E8] hover:text-[#063B70] flex items-center gap-1 py-1 px-2"
                      >
                        <span>ดูรายละเอียด</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Recent Important Changes (Section 25) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="w-5 h-5 text-[#0C65E8]" />
          <h2 className="text-base font-bold text-[#063B70]">การแจ้งเตือนล่าสุดในพื้นที่ของคุณ</h2>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <div className="font-bold text-sm text-amber-900">
                อ.บ้านสร้าง: มีมวลน้ำหลากระบายลงสู่ทุ่งรับน้ำตามฤดูกาล
              </div>
              <p className="text-slate-600 leading-relaxed">
                สถานีตรวจวัดระดับน้ำปากคลองบางพลวงบันทึกระดับน้ำเพิ่มขึ้น 12 ซม. ใน 24 ชม. ที่ผ่านมา แนะนำเกษตรกรเฝ้าระวังแปลงเพาะเลี้ยง
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                2 ชั่วโมงที่ผ่านมา • OFFICIAL กรมชลประทาน
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0C65E8] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-800 space-y-1">
              <div className="font-bold text-sm text-[#063B70]">
                อ.กบินทร์บุรี: รายงานผลตรวจคุณภาพน้ำผิวดินรอบประจำเดือน
              </div>
              <p className="text-slate-600 leading-relaxed">
                สำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7 (สคพ.7) เผยแพร่ผลวิเคราะห์ตัวอย่างน้ำจุดบรรจบแม่น้ำพระปรง-หนุมาน อยู่ในเกณฑ์มาตรฐานแหล่งน้ำประเภท 3
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                เมื่อวานนี้ • OFFICIAL กรมควบคุมมลพิษ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Area Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-[#063B70]">เพิ่มพื้นที่ติดตามใน จ.ปราจีนบุรี</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">เลือกอำเภอ:</label>
              <select
                value={selectedToAdd}
                onChange={(e) => setSelectedToAdd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0C65E8]"
              >
                {ALL_DISTRICTS.map(d => (
                  <option key={d} value={d} disabled={savedDistricts.includes(d)}>
                    {d} {savedDistricts.includes(d) ? '(ติดตามอยู่แล้ว)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddArea}
                className="px-5 py-2 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-xs font-bold transition-colors"
              >
                ยืนยันการเพิ่ม
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
