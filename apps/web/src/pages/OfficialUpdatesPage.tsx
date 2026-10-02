import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Filter, 
  AlertCircle,
  Building2,
  CheckCircle2
} from 'lucide-react';

export const OfficialUpdatesPage: React.FC = () => {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/public/official-updates')
      .then(res => res.json())
      .then(data => {
        setUpdates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load official updates:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          ศูนย์รวมข้อมูลและประกาศทางการ (Official Update Center)
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          ผลตรวจและประกาศจากหน่วยงานรัฐ
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
          รวบรวมรายงานผลการตรวจวัดคุณภาพน้ำ ผลการวิเคราะห์จากห้องปฏิบัติการที่ได้รับการรับรอง และประกาศสถานการณ์น้ำจากหน่วยงานราชการที่รับผิดชอบโดยตรง
        </p>

        {/* Principle Alert Box */}
        <div className="mt-5 p-4 bg-sky-50/70 border border-sky-200/70 rounded-2xl text-xs text-sky-950 leading-relaxed font-medium">
          <strong className="block mb-1 font-bold text-[#0C57C7]">หลักการสำคัญตามหลักนิติวิทยาศาสตร์สิ่งแวดล้อม:</strong>
          การตรวจพบสารในตัวอย่างน้ำ (Detection) ไม่ได้หมายถึงการระบุแหล่งกำเนิดมลพิษ (Source Attribution) โดยอัตโนมัติ การระบุผู้รับผิดชอบต้องอาศัยผลการสืบสวนและหลักฐานทางกฎหมายของหน่วยงานที่มีอำนาจหน้าที่เท่านั้น
        </div>
      </div>

      {/* Updates Feed */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
          <div className="animate-spin w-8 h-8 border-3 border-[#0C57C7] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">กำลังโหลดรายงานทางการ...</p>
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500">
          <p className="text-sm">ยังไม่มีประกาศหรือรายงานผลตรวจเพิ่มเติมในขณะนี้</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0C57C7] flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#0C57C7]">{item.agency}</span>
                    <span className="text-slate-400 text-xs mx-1.5">•</span>
                    <span className="text-xs text-slate-500 font-medium">{item.document_type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {item.badge || 'OFFICIAL'} ข้อมูลจากหน่วยงาน
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.published_at ? new Date(item.published_at).toLocaleDateString('th-TH') : ''}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {item.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>พื้นที่เกี่ยวข้อง: {item.related_area}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <strong className="block mb-1 text-slate-900 font-bold">ข้อสรุปข้อเท็จจริง:</strong>
                {item.factual_summary}
              </div>

              {/* Attribution and Lab Findings Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
                  <span className="text-slate-500 block mb-0.5 font-medium">ผลตรวจสารเคมีในตัวอย่าง:</span>
                  <span className="font-bold text-slate-800">
                    {item.lab_detected_substance || 'อยู่ในเกณฑ์มาตรฐานแหล่งน้ำ'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60">
                  <span className="text-slate-500 block mb-0.5 font-medium">สถานะการระบุแหล่งกำเนิด:</span>
                  <span className="font-bold text-slate-800">
                    {item.attribution_status || 'ยังไม่ทราบ / อยู่ระหว่างตรวจสอบ'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">
                  ที่มา: {item.provenance?.dataset_name}
                </span>
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-colors inline-flex items-center gap-1.5 min-h-[40px]"
                >
                  เปิดเอกสารต้นทาง <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
