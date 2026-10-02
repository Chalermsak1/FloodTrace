import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  MapPin, 
  Clock, 
  Filter, 
  AlertCircle, 
  ChevronRight, 
  Image as ImageIcon,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  'ทั้งหมด',
  'น้ำเปลี่ยนสี',
  'คราบบนผิวน้ำ',
  'กลิ่นผิดปกติ',
  'ฟอง / ตะกอนผิดปกติ',
  'สัตว์น้ำตาย',
  'ขยะ / วัสดุผิดปกติ'
];

const DISTRICTS = [
  'ทั้งหมด',
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const CasesPage: React.FC = () => {
  const [observations, setObservations] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ทั้งหมด');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    let url = '/api/public/observations';
    const params = new URLSearchParams();
    if (selectedDistrict !== 'ทั้งหมด') params.append('district', selectedDistrict);
    if (selectedCategory !== 'ทั้งหมด') params.append('category', selectedCategory);
    
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setObservations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load observations:', err);
        setLoading(false);
      });
  }, [selectedDistrict, selectedCategory]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-2 border border-amber-200">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              รายงานข้อสังเกตจากชุมชน (Community Observations)
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              เหตุการณ์ที่กำลังติดตาม (Active Cases & Observations)
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              ข้อสังเกตภาคสนามที่ได้รับจากประชาชนในพื้นที่จังหวัดปราจีนบุรี เพื่อใช้เป็นข้อมูลสนับสนุนการจัดลำดับการเฝ้าระวังและการเก็บตัวอย่างตรวจวัด
            </p>
          </div>

          <Link
            to="/report"
            className="px-5 py-2.5 bg-[#0C57C7] hover:bg-[#103D76] text-white rounded-xl text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
          >
            + ส่งรายงานใหม่
          </Link>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="mt-5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed font-medium flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <span>
            <strong>คำชี้แจงสำคัญ:</strong> รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์เบื้องต้น ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน และพิกัดตำแหน่งถูกปัดเศษเพื่อปกป้องความปลอดภัยของผู้รายงาน
          </span>
        </div>

        {/* Filter Strip */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">กรองตามอำเภอ:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 min-h-[40px]"
            >
              {DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">กรองตามสิ่งที่พบ:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 min-h-[40px]"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Observations Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
          <div className="animate-spin w-8 h-8 border-3 border-[#0C57C7] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">กำลังโหลดรายการเหตุการณ์...</p>
        </div>
      ) : observations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
          <Eye className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-700">ไม่พบรายงานข้อสังเกตในเงื่อนไขนี้</h3>
          <p className="text-xs text-slate-400">ยังไม่มีประชาชนรายงานข้อสังเกตในอำเภอหรือหมวดหมู่นี้</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {observations.map((obs, idx) => (
            <div
              key={obs.id || idx}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Top Strip */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-xs text-slate-800 line-clamp-1">
                      {obs.category}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    COMMUNITY
                  </span>
                </div>

                {/* Location & Time */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="font-medium text-slate-700">{obs.generalized_location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>สังเกตการณ์: {obs.observation_time ? new Date(obs.observation_time).toLocaleDateString('th-TH') : 'วันนี้'}</span>
                  </div>
                </div>

                {/* Photo if available */}
                {obs.has_photo && obs.photo_url ? (
                  <div className="my-2.5 rounded-2xl overflow-hidden border border-slate-200/70 max-h-40 bg-slate-50 flex items-center justify-center">
                    <img
                      src={obs.photo_url}
                      alt={obs.category}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}

                {/* Status Badge */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed mb-3">
                  <span className="font-semibold text-slate-700">สถานะ: </span>
                  {obs.status_label || 'รายงานจากประชาชน (รอการตรวจสอบภาคสนาม)'}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{obs.classification_explanation}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
