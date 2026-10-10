import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Plus, 
  Trash2, 
  MapPin, 
  Clock, 
  ChevronRight, 
  AlertCircle, 
  Compass, 
  ShieldCheck, 
  BellRing,
  X
} from 'lucide-react';
import { 
  Badge, 
  Button, 
  Modal, 
  EmptyState 
} from '../components/ui';

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

  const getPriorityVariant = (priority: string) => {
    if (priority === 'สูงมาก' || priority === 'สูง') return 'critical';
    if (priority === 'ปานกลาง') return 'watch';
    return 'normal';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="unmonitored" icon={<Compass className="w-3.5 h-3.5" />}>
              การติดตามสถานะพื้นที่ส่วนบุคคล
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540] tracking-tight">
            พื้นที่ของฉัน
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl leading-relaxed">
            ปักหมุดติดตามตำบลและอำเภอที่คุณสนใจ เพื่อรับการแจ้งเตือนการเปลี่ยนแปลงสถานการณ์น้ำและสิ่งแวดล้อม
          </p>
        </div>

        {/* Primary Action Button */}
        <Button
          variant="primary"
          size="md"
          iconLeft={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
          className="shrink-0"
        >
          เพิ่มพื้นที่ติดตาม
        </Button>
      </div>

      {/* Followed Area Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0A2540]">
            พื้นที่ที่กำลังติดตาม ({savedDistricts.length})
          </h2>
          <span className="text-xs text-slate-500">ข้อมูลอัปเดตตามสถานีโทรมาตรประจำอำเภอ</span>
        </div>

        {savedDistricts.length === 0 ? (
          <EmptyState
            icon={<MapPin className="w-8 h-8 text-slate-400" />}
            title="ยังไม่มีพื้นที่ที่ติดตาม"
            description="กดปุ่ม 'เพิ่มพื้นที่ติดตาม' เพื่อเลือกอำเภอในจังหวัดปราจีนบุรีที่คุณต้องการเฝ้าระวัง"
            action={
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddModal(true)}
              >
                เลือกอำเภอแรก
              </Button>
            }
          />
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
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-card hover:border-[#0284C7]/60 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#0284C7]" />
                        <h3 className="text-lg font-bold text-[#0A2540] group-hover:text-[#0284C7] transition-colors">
                          อำเภอ{districtName}
                        </h3>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500 mt-0.5 block">
                        จังหวัดปราจีนบุรี
                      </span>
                    </div>

                    {/* Current Watch Level Badge */}
                    <Badge variant={getPriorityVariant(status.priority)}>
                      {status.priority || 'ระดับเฝ้าระวังต่ำ'}
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>อัปเดตล่าสุด: {status.lastUpdated}</span>
                    </div>
                    <span className="text-slate-700 font-medium">
                      {status.watchStatus}
                    </span>
                  </div>

                  {/* Footer Action & Notification Toggle */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    {/* Notification toggle */}
                    <button
                      type="button"
                      onClick={() => toggleNotification(districtName)}
                      className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
                        status.alertEnabled
                          ? 'text-[#0284C7] bg-sky-50 border border-sky-100'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      <BellRing className="w-4 h-4" />
                      <span>{status.alertEnabled ? 'แจ้งเตือนเปิดอยู่' : 'ปิดแจ้งเตือน'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveArea(districtName)}
                        aria-label={`ยกเลิกติดตามอำเภอ${districtName}`}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title="ยกเลิกติดตาม"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <Link
                        to={`/area-detail?district=${encodeURIComponent(districtName)}`}
                        className="text-xs sm:text-sm font-semibold text-[#0284C7] hover:text-[#0A2540] flex items-center gap-1 py-1 px-2"
                      >
                        <span>ดูรายละเอียด</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Recent Important Changes */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="w-5 h-5 text-[#0284C7]" />
          <h2 className="text-lg font-bold text-[#0A2540]">การแจ้งเตือนล่าสุดในพื้นที่ของคุณ</h2>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-950 space-y-1">
              <div className="font-bold text-base text-amber-900">
                อ.บ้านสร้าง: มีมวลน้ำหลากระบายลงสู่ทุ่งรับน้ำตามฤดูกาล
              </div>
              <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                สถานีตรวจวัดระดับน้ำปากคลองบางพลวงบันทึกระดับน้ำเพิ่มขึ้น 12 ซม. ใน 24 ชม. ที่ผ่านมา แนะนำเกษตรกรเฝ้าระวังแปลงเพาะเลี้ยง
              </p>
              <div className="text-xs text-slate-500 pt-1 flex items-center gap-2">
                <span>2 ชั่วโมงที่ผ่านมา</span>
                <span>•</span>
                <Badge variant="official" size="xs">OFFICIAL กรมชลประทาน</Badge>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
            <div className="text-sm text-slate-800 space-y-1">
              <div className="font-bold text-base text-[#0A2540]">
                อ.กบินทร์บุรี: รายงานผลตรวจคุณภาพน้ำผิวดินรอบประจำเดือน
              </div>
              <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                สำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7 (สคพ.7) เผยแพร่ผลวิเคราะห์ตัวอย่างน้ำจุดบรรจบแม่น้ำพระปรง-หนุมาน อยู่ในเกณฑ์มาตรฐานแหล่งน้ำประเภท 3
              </p>
              <div className="text-xs text-slate-500 pt-1 flex items-center gap-2">
                <span>เมื่อวานนี้</span>
                <span>•</span>
                <Badge variant="official" size="xs">OFFICIAL กรมควบคุมมลพิษ</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Area Modal using UI Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="เพิ่มพื้นที่ติดตามใน จ.ปราจีนบุรี"
        subtitle="เลือกอำเภอเพื่อรับข้อมูลการเฝ้าระวังน้ำและแจ้งเตือนอย่างต่อเนื่อง"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowAddModal(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleAddArea}
            >
              ยืนยันการเพิ่ม
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 block">เลือกอำเภอ:</label>
          <select
            value={selectedToAdd}
            onChange={(e) => setSelectedToAdd(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm sm:text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] min-h-[44px] cursor-pointer"
          >
            {ALL_DISTRICTS.map(d => (
              <option key={d} value={d} disabled={savedDistricts.includes(d)}>
                {d} {savedDistricts.includes(d) ? '(ติดตามอยู่แล้ว)' : ''}
              </option>
            ))}
          </select>
        </div>
      </Modal>

    </div>
  );
};
