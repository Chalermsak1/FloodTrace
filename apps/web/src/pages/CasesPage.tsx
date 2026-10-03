import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Plus,
  X,
  Compass
} from 'lucide-react';
import { Link } from 'react-router-dom';

const FILTER_TABS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'near_me', label: 'ใกล้ฉัน' },
  { id: 'in_review', label: 'กำลังตรวจสอบ' },
  { id: 'verified', label: 'ตรวจสอบแล้ว' }
];

const CATEGORIES = [
  'ทั้งหมด',
  'น้ำเปลี่ยนสี',
  'คราบบนผิวน้ำ',
  'กลิ่นสารเคมี / กลิ่นผิดปกติ',
  'ฟอง / ตะกอนผิดปกติ',
  'สัตว์น้ำตาย',
  'ขยะ / วัสดุผิดปกติ'
];

export const CasesPage: React.FC = () => {
  const [observations, setObservations] = useState<any[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/public/observations')
      .then(res => res.json())
      .then(data => {
        setObservations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load observations:', err);
        setLoading(false);
      });
  }, []);

  // Filter logic
  const filteredReports = observations.filter(item => {
    // Filter by tab
    if (activeFilterTab === 'in_review') {
      if (item.status === 'VERIFIED') return false;
    } else if (activeFilterTab === 'verified') {
      if (item.status !== 'VERIFIED') return false;
    }

    // Filter by category
    if (selectedCategory !== 'ทั้งหมด') {
      if (!item.category?.includes(selectedCategory) && !selectedCategory.includes(item.category)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Page Header (Section 20) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200">
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>รายงานข้อสังเกตจากชุมชน</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#063B70] tracking-tight">
            รายงานจากประชาชน
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl leading-relaxed">
            ข้อมูลสังเกตการณ์เบื้องต้นจากชุมชนในจังหวัดปราจีนบุรี เพื่อสนับสนุนการจัดลำดับการเฝ้าระวังและการสุ่มเก็บตัวอย่างน้ำ
          </p>
        </div>

        {/* Primary CTA Button */}
        <Link
          to="/report"
          className="px-5 py-3 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-base font-semibold transition-colors shadow-xs flex items-center justify-center gap-2 shrink-0 min-h-[48px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ รายงานเหตุการณ์ใหม่</span>
        </Link>
      </div>

      {/* Horizontal Filter Bar (Section 20) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] ${
                activeFilterTab === tab.id
                  ? 'bg-[#063B70] text-white shadow-xs font-semibold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 shrink-0">หมวดหมู่:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] min-h-[40px]"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Report List Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 text-base">
            กำลังโหลดข้อมูลรายงานจากประชาชน...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 space-y-2">
            <Eye className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-base font-bold text-slate-700">ไม่พบรายงานในหมวดหมู่นี้</p>
            <p className="text-sm text-slate-500">ยังไม่มีรายงานที่ตรงกับตัวกรองที่เลือก</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setSelectedReport(item)}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hover:shadow-card hover:border-[#0C65E8] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start gap-4">
                  
                  {/* Category / Photo Placeholder Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                    {item.has_image ? (
                      <ImageIcon className="w-6 h-6 text-amber-700" />
                    ) : (
                      <Eye className="w-6 h-6 text-amber-600" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        {item.category}
                      </span>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.status_label || (item.status === 'VERIFIED' ? 'ตรวจสอบแล้ว' : 'กำลังตรวจสอบ')}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#063B70] leading-snug line-clamp-1">
                      {item.generalized_location || `บริเวณ อ.${item.district} จ.ปราจีนบุรี`}
                    </h3>

                    <div className="flex items-center gap-1.5 text-sm text-slate-500 pt-1">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item.observation_time ? new Date(item.observation_time).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'เมื่อเร็วๆ นี้'}</span>
                    </div>
                  </div>

                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-[#0C65E8]">
                  <span>ดูรายละเอียดข้อสังเกต</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal (Opens after click - Privacy Protected) */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 text-slate-800">
            
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  รายงานข้อสังเกตจากประชาชน
                </span>
                <h3 className="font-bold text-lg text-[#063B70] mt-0.5">
                  {selectedReport.category}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="font-semibold text-slate-800">พื้นที่โดยประมาณ (Generalized Area):</div>
                <div className="text-slate-600">{selectedReport.generalized_location || `อำเภอ${selectedReport.district}`}</div>
                <div className="text-xs text-slate-500 pt-1">
                  * พิกัดตำแหน่งถูกปัดเศษตามมาตรฐานความปลอดภัยข้อมูลเพื่อปกป้องความเป็นส่วนตัวของผู้รายงาน
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="font-semibold text-slate-800">เวลาที่สังเกตเห็น:</div>
                <div className="text-slate-600">
                  {selectedReport.observation_time ? new Date(selectedReport.observation_time).toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-sm text-amber-900 leading-relaxed">
                <div className="font-semibold mb-1">คำชี้แจงมาตรฐาน:</div>
                {selectedReport.classification_explanation || 'รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์เบื้องต้น ยังไม่ถือเป็นผลยืนยันทางห้องปฏิบัติการ และไม่ได้ระบุผู้ก่อมลพิษ'}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
