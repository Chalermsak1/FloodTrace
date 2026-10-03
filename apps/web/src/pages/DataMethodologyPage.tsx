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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0C57C7] text-xs font-semibold mb-3 border border-sky-100">
          <Database className="w-3.5 h-3.5" />
          ความโปร่งใสและระเบียบวิธีวิจัย (Transparency & Methodology)
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          ข้อมูลและวิธีการ (Data & Methodology)
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-3xl leading-relaxed">
          อธิบายที่มาของชุดข้อมูล สัญญาอนุญาตการใช้งาน ระเบียบวิธีวิเคราะห์การเชื่อมต่อทางน้ำ และข้อจำกัดทางเทคนิคของระบบ FloodTrace อย่างโปร่งใสและตรงไปตรงมา
        </p>
      </div>

      {/* SECTION A — DATA CATALOG (Sections 31, 32, 33, 35, 36) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0C57C7] flex items-center justify-center font-bold text-base">
            A
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              ส่วนที่ 1: คลังแหล่งข้อมูลและสัญญาอนุญาต (Data Sources & Provenance)
            </h2>
            <p className="text-sm text-slate-500">
              จำแนกแหล่งข้อมูลตามสถานะการเข้าถึงจริง ความถี่ในการอัปเดต และข้อกำหนดการใช้งาน
            </p>
          </div>
        </div>

        {/* 1. ACTIVE / AUTOMATED REFRESH */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs"></span>
            <h3 className="text-base font-bold text-slate-900">
              ข้อมูลที่เชื่อมต่ออัตโนมัติ (Active / Automated Refresh)
            </h3>
            <span className="text-2xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              🟢 กำลังอัปเดตอัตโนมัติ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            ระบบดึงข้อมูลผ่าน REST API ภายนอกจริงตามรอบเวลาที่กำหนด (Automated Refresh ทุก 15 นาที) พร้อมการตรวจสอบเวลาต้นทางและแปลงเขตเวลา Asia/Bangkok
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {provenanceData?.active_sources?.map((ds: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200/70 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm sm:text-base text-slate-900">{ds.dataset}</span>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                      {ds.status_th}
                    </span>
                  </div>
                  <div className="text-xs text-[#0C65E8] font-semibold mb-1">{ds.agency}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ds.provenance}
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-100 text-2xs space-y-1 text-slate-500">
                  <div><strong>รอบการดึงข้อมูล:</strong> {ds.refresh_interval} ({ds.update_mode})</div>
                  <div><strong>สัญญาอนุญาต:</strong> {ds.license}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. REFERENCE SOURCES */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-xs"></span>
            <h3 className="text-base font-bold text-slate-900">
              ข้อมูลอ้างอิงเชิงพื้นที่ (Reference Datasets)
            </h3>
            <span className="text-2xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
              🔵 ข้อมูลอ้างอิง
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            ชุดข้อมูลอ้างอิงโครงสร้างพื้นฐาน ภูมิศาสตร์ และสถิติประวัติศาสตร์ที่นำเข้าและจัดเก็บในระบบเพื่อใช้เป็นบริบทประกอบการวิเคราะห์
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {provenanceData?.reference_sources?.map((ds: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-blue-50/30 border border-blue-200/70 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm sm:text-base text-slate-900">{ds.dataset}</span>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-100 text-blue-800">
                      {ds.status_th}
                    </span>
                  </div>
                  <div className="text-xs text-[#0C65E8] font-semibold mb-1">{ds.agency}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ds.provenance}
                  </p>
                  {ds.disclaimer && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-2xs text-amber-900 leading-normal">
                      <strong>หมายเหตุสำคัญ:</strong> {ds.disclaimer}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-blue-100 text-2xs space-y-1 text-slate-500">
                  <div><strong>รูปแบบชุดข้อมูล:</strong> {ds.update_mode}</div>
                  <div><strong>สัญญาอนุญาต:</strong> {ds.license}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. BLOCKED / PENDING ACCESS */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-400 shadow-xs"></span>
            <h3 className="text-base font-bold text-slate-900">
              แหล่งข้อมูลที่ยังรอการอนุญาตให้เข้าถึง (Blocked / Pending Access)
            </h3>
            <span className="text-2xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold border border-slate-300">
              ⚪ ยังรอการอนุญาตให้เข้าถึง
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            ระบบระบุสถานะตรงไปตรงมา ไม่จำลองข้อมูลเท็จสำหรับแหล่งข้อมูลที่ยังไม่ได้รับอนุญาตเชื่อมต่อ API อัตโนมัติระดับการผลิต
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {provenanceData?.blocked_sources?.map((ds: any, idx: number) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs sm:text-sm text-slate-800">{ds.dataset}</span>
                  <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-200 text-slate-700">
                    {ds.status_th}
                  </span>
                </div>
                <div className="text-2xs text-slate-500 font-medium">{ds.agency}</div>
                <p className="text-2xs text-slate-600 leading-normal">
                  <strong>เหตุผล:</strong> {ds.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-1">
          <div><strong>หลักการด้านคำศัพท์ความสดใหม่ (Section 32):</strong> ระบบใช้คำว่า <code>AUTOMATED_REFRESH</code> แทน <code>REAL-TIME</code> สำหรับข้อมูลที่ดึงตามรอบกำหนด และแยกความแตกต่างระหว่าง <code>REAL_EXTERNAL_API</code>, <code>LOCAL_IMPORT</code>, และ <code>BLOCKED</code> ชัดเจนโดยไม่แปลงข้อมูลที่ขาดหายเป็น "ปกติ"</div>
        </div>
      </div>

      {/* SECTION B — METHODOLOGY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base">
            B
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              ส่วนที่ 2: ระเบียบวิธีวิจัยและแบบจำลอง (Methodology)
            </h2>
            <p className="text-sm text-slate-500">
              หลักการคัดกรองพื้นที่ที่ควรได้รับการตรวจสอบด้านสิ่งแวดล้อม (Environmental Verification Priority)
            </p>
          </div>
        </div>

        {/* Formula Diagram */}
        <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100 text-center space-y-3">
          <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider block">
            แบบจำลองการคัดกรองเชิงพื้นที่ (Spatial Screening Concept)
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base font-semibold text-slate-800">
            <span className="bg-white px-3.5 py-2 rounded-xl shadow-xs border border-purple-200">พื้นที่น้ำท่วมขัง</span>
            <span>+</span>
            <span className="bg-white px-3.5 py-2 rounded-xl shadow-xs border border-purple-200">ระดับน้ำโทรมาตร</span>
            <span>+</span>
            <span className="bg-white px-3.5 py-2 rounded-xl shadow-xs border border-purple-200">การเชื่อมต่อทางน้ำ</span>
            <span>+</span>
            <span className="bg-white px-3.5 py-2 rounded-xl shadow-xs border border-purple-200">ข้อสังเกตชุมชน</span>
            <span>+</span>
            <span className="bg-white px-3.5 py-2 rounded-xl shadow-xs border border-purple-200">แหล่งรับน้ำเปราะบาง</span>
            <span>➔</span>
            <span className="bg-purple-600 text-white px-3.5 py-2 rounded-xl shadow-xs font-bold">ลำดับการตรวจสอบด้านสิ่งแวดล้อม</span>
          </div>
        </div>

        <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          <p>
            ระบบ FloodTrace ประเมินระดับความสำคัญในการตรวจสอบโดยพิจารณาจาก <strong>การเชื่อมต่อทางกายภาพของโครงข่ายแม่น้ำ</strong> (แม่น้ำหนุมาน แม่น้ำพระปรง แม่น้ำปราจีนบุรี และคลองสาขา) ร่วมกับข้อมูลพื้นที่น้ำท่วมขังจากดาวเทียม Sentinel-1 และรายงานข้อสังเกตจากประชาชน
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-sm text-slate-700 space-y-1.5">
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
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-base">
            C
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              ส่วนที่ 3: ข้อจำกัดของระบบ (System Limitations)
            </h2>
            <p className="text-sm text-slate-500">
              สิ่งที่ระบบทำได้และสิ่งที่ระบบไม่ได้ทำ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {provenanceData?.limitations?.map((lim: string, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-sm text-amber-950 leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <span>{lim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION D — PRIVACY & SAFETY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base">
            D
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              ส่วนที่ 4: ความเป็นส่วนตัวและความปลอดภัย (Privacy & Safety by Design)
            </h2>
            <p className="text-sm text-slate-500">
              การคุ้มครองข้อมูลส่วนบุคคลและมาตรฐานการป้องกันการกล่าวหา
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {provenanceData?.privacy_and_safety?.map((item: string, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-sm text-slate-700 leading-relaxed flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
