import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Cpu, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink, 
  FileCheck, 
  Lock,
  Layers,
  Info
} from 'lucide-react';

export const DataMethodologyPage: React.FC = () => {
  const [provenanceData, setProvenanceData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/public/provenance')
      .then(res => res.json())
      .then(data => {
        setProvenanceData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load provenance catalog:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0C57C7] text-xs font-bold mb-3 border border-sky-100">
          <Database className="w-3.5 h-3.5" />
          ความโปร่งใสและระเบียบวิธีวิจัย (Transparency & Methodology)
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          ข้อมูลและวิธีการ (Data & Methodology)
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
          อธิบายที่มาของชุดข้อมูล สัญญาอนุญาตการใช้งาน ระเบียบวิธีวิเคราะห์การเชื่อมต่อทางน้ำ และข้อจำกัดทางเทคนิคของระบบ FloodTrace อย่างโปร่งใสและตรงไปตรงมา
        </p>
      </div>

      {/* SECTION A — DATA CATALOG */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0C57C7] flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ส่วนที่ 1: คลังข้อมูลและสัญญาอนุญาต (Data Catalog & Licensing)
            </h2>
            <p className="text-xs text-slate-500">
              แจกแจงแหล่งข้อมูลทางการที่เชื่อมต่อและสถานะสิทธิ์การใช้งาน
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">กำลังโหลดคลังข้อมูล...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {provenanceData?.datasets?.map((ds: any, idx: number) => (
              <div 
                key={idx} 
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-sm text-slate-900">{ds.provider}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ds.classification === 'OFFICIAL'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {ds.classification} {ds.classification_th}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-[#0C57C7] mb-1.5">{ds.agency_full}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    <strong>วัตถุประสงค์:</strong> {ds.purpose}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 text-[11px] space-y-1 text-slate-500">
                  <div><strong>ความถี่ในการอัปเดต:</strong> {ds.update_frequency}</div>
                  <div><strong>สัญญาอนุญาต:</strong> {ds.terms}</div>
                  {ds.source_link && ds.source_link !== '#' && (
                    <div className="pt-1">
                      <a 
                        href={ds.source_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#0C57C7] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        เยี่ยมชมแหล่งข้อมูล <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 leading-relaxed">
          <strong>หมายเหตุเกี่ยวกับแผนที่ฐาน (Longdo Map / OpenStreetMap):</strong> ใช้สำหรับเป็นแผนที่ฐาน (Base Map) และการค้นหาตำแหน่งสถานที่เท่านั้น ข้อมูลด้านสิ่งแวดล้อมและน้ำท่วมทั้งหมดนำมาจากหน่วยงานรัฐที่รับผิดชอบโดยตรง
        </div>
      </div>

      {/* SECTION B — METHODOLOGY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            B
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ส่วนที่ 2: ระเบียบวิธีวิจัยและแบบจำลอง (Methodology)
            </h2>
            <p className="text-xs text-slate-500">
              หลักการคัดกรองพื้นที่ที่ควรได้รับการตรวจสอบด้านสิ่งแวดล้อม (Environmental Verification Priority)
            </p>
          </div>
        </div>

        {/* Formula Diagram */}
        <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100 text-center space-y-3">
          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
            แบบจำลองการคัดกรองเชิงพื้นที่ (Spatial Screening Concept)
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-black text-slate-800">
            <span className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-purple-200">พื้นที่น้ำท่วมขัง</span>
            <span>+</span>
            <span className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-purple-200">ระดับน้ำโทรมาตร</span>
            <span>+</span>
            <span className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-purple-200">การเชื่อมต่อทางน้ำ</span>
            <span>+</span>
            <span className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-purple-200">ข้อสังเกตชุมชน</span>
            <span>+</span>
            <span className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-purple-200">แหล่งรับน้ำเปราะบาง</span>
            <span>➔</span>
            <span className="bg-purple-600 text-white px-3 py-1.5 rounded-xl shadow-xs">ลำดับการตรวจสอบด้านสิ่งแวดล้อม</span>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            ระบบ FloodTrace ประเมินระดับความสำคัญในการตรวจสอบโดยพิจารณาจาก <strong>การเชื่อมต่อทางกายภาพของโครงข่ายแม่น้ำ</strong> (แม่น้ำหนุมาน แม่น้ำพระปรง แม่น้ำปราจีนบุรี และคลองสาขา) ร่วมกับข้อมูลพื้นที่น้ำท่วมขังจากดาวเทียม Sentinel-1 และรายงานข้อสังเกตจากประชาชน
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-700 space-y-1.5">
            <strong>นโยบาย Safety-by-Design:</strong>
            <p>
              ระบบจะไม่เปิดเผยพิกัดโรงงานหรือข้อมูลอุตสาหกรรมในชั้นข้อมูลสาธารณะ และจะไม่ประเมินความผิดหรือกล่าวหาผู้ใด พื้นที่เฝ้าระวังที่แสดงบนแผนที่เป็นระดับลุ่มน้ำย่อย (Sub-basin) เพื่อให้ประชาชนและเจ้าหน้าที่สามารถเฝ้าระวังพื้นที่รับน้ำได้อย่างเหมาะสม
            </p>
          </div>
        </div>
      </div>

      {/* SECTION C — LIMITATIONS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            C
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ส่วนที่ 3: ข้อจำกัดของระบบ (System Limitations)
            </h2>
            <p className="text-xs text-slate-500">
              สิ่งที่ระบบทำได้และสิ่งที่ระบบไม่ได้ทำ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {provenanceData?.limitations?.map((lim: string, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs text-amber-950 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span>{lim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION D — PRIVACY & SAFETY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            D
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              ส่วนที่ 4: ความเป็นส่วนตัวและความปลอดภัย (Privacy & Safety by Design)
            </h2>
            <p className="text-xs text-slate-500">
              การคุ้มครองข้อมูลส่วนบุคคลและมาตรฐานการป้องกันการกล่าวหา
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {provenanceData?.privacy_and_safety?.map((item: string, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
