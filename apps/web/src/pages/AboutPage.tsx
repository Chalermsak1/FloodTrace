import React from 'react';
import { 
  Waves, 
  ShieldCheck, 
  AlertTriangle, 
  PhoneCall, 
  HelpCircle, 
  Eye, 
  Database,
  Compass,
  ArrowDown,
  Building2,
  FileCheck2,
  ExternalLink,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, PageHeader, Card } from '../components/ui';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Unified PageHeader */}
      <PageHeader
        title="เกี่ยวกับ FloodTrace (ระวังก่อน)"
        subtitle="เฝ้าระวังการปนเปื้อนในสิ่งแวดล้อม เพื่อชุมชนที่ปลอดภัย พัฒนาขึ้นเพื่อช่วยตอบคำถามสำคัญของประชาชนว่า 'พื้นที่ของฉันควรได้รับการเฝ้าระวังหรือตรวจสอบเพิ่มเติมหรือไม่?'"
        badge={
          <Badge variant="official" icon={<Waves className="w-3.5 h-3.5" />}>
            แพลตฟอร์มภาคประชาชน
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/data-methodology">
              <Button variant="outline" size="sm">
                วิธีวิทยาและข้อจำกัด
              </Button>
            </Link>
            <Link to="/knowledge">
              <Button variant="outline" size="sm">
                คำแนะนำการใช้น้ำ
              </Button>
            </Link>
          </div>
        }
      />

      {/* 1. FloodTrace คืออะไร */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <h2 className="text-xl font-bold text-[#0A2540] pb-2 border-b border-slate-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#0284C7]" />
          <span>FloodTrace คืออะไร?</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
          FloodTrace เป็นแพลตฟอร์มสารสนเทศภูมิศาสตร์และประเมินความเสี่ยงด้านสิ่งแวดล้อมเชิงพื้นที่สำหรับประชาชนในจังหวัดปราจีนบุรี โดยไม่จำกัดเฉพาะช่วงน้ำท่วม แต่มีประโยชน์ต่อเนื่องทั้งก่อนน้ำหลาก ระหว่างน้ำท่วม หลังน้ำลด และการเฝ้าระวังคุณภาพน้ำและสิ่งแวดล้อมในระยะยาว เพื่อให้ประชาชนมีความตระหนักรู้และดูแลความปลอดภัยในชีวิตประจำวันได้อย่างทันท่วงที
        </p>
      </section>

      {/* 2. Simple Flow Diagram */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#0A2540]">
            ระบบวิเคราะห์อย่างไร? (Workflow Diagram)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            แผนผังกระบวนการประมวลผลข้อมูลอย่างเป็นระบบและโปร่งใส
          </p>
        </div>

        {/* 3-Step Flow Diagram */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-6">
          
          {/* Step 1: Input sources */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              ขั้นที่ 1: แหล่งข้อมูลนำเข้า (Data Inputs)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <Building2 className="w-5 h-5 text-[#0284C7] mx-auto mb-1" />
                <span className="font-semibold text-sm text-[#0A2540] block">ข้อมูลหน่วยงาน</span>
                <span className="text-xs text-slate-500">PCD / สสน. / RID</span>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <Compass className="w-5 h-5 text-sky-600 mx-auto mb-1" />
                <span className="font-semibold text-sm text-[#0A2540] block">สภาพแวดล้อม</span>
                <span className="text-xs text-slate-500">โครงข่ายทางน้ำ / ฝน</span>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <Eye className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <span className="font-semibold text-sm text-[#0A2540] block">รายงานประชาชน</span>
                <span className="text-xs text-slate-500">ข้อสังเกตชุมชน</span>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <Database className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <span className="font-semibold text-sm text-[#0A2540] block">ผลจากแบบจำลอง</span>
                <span className="text-xs text-slate-500">การไหลและลุ่มน้ำย่อย</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-slate-400">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* Step 2: Processing */}
          <div className="max-w-md mx-auto p-4 bg-sky-50/80 border border-sky-200/80 rounded-2xl text-center space-y-1 shadow-2xs">
            <div className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
              ขั้นที่ 2: การประมวลผลเชิงพื้นที่ (Spatial Analysis)
            </div>
            <div className="font-bold text-base sm:text-lg text-[#0A2540]">
              วิเคราะห์และจัดลำดับพื้นที่เฝ้าระวัง
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ประเมินความเชื่อมโยงทางน้ำ พื้นที่รับน้ำตอนล่าง และข้อสังเกตชุมชน
            </p>
          </div>

          <div className="flex justify-center text-slate-400">
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </div>

          {/* Step 3: Citizen Delivery */}
          <div className="max-w-md mx-auto p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-center space-y-1 shadow-2xs">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              ขั้นที่ 3: สารสนเทศเพื่อประชาชน (Citizen Value)
            </div>
            <div className="font-bold text-base sm:text-lg text-emerald-900">
              แสดงผลให้ประชาชนเข้าใจง่าย และปลอดภัย
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              แผนที่ภาพถ่ายดาวเทียม, ระดับสีเฝ้าระวัง 5 ระดับ, และคำแนะนำการดูแลตนเอง
            </p>
          </div>

        </div>
      </section>

      {/* 3. Core Principles & System Limitations */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-xl font-bold text-[#0A2540]">ข้อจำกัดสำคัญของระบบ</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>🚫 ไม่ระบุความรับผิดทางกฎหมาย</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              FloodTrace ไม่ได้ถูกสร้างขึ้นเพื่อตัดสินหรือระบุความรับผิดทางกฎหมายของผู้ใด การดำเนินคดีเป็นอำนาจของหน่วยงานรัฐตามกฎหมาย
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>🏭 ไม่ระบุชื่อโรงงานหรือผู้ก่อมลพิษ</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ระบบไม่เปิดเผยชื่อโรงงานหรือชี้เป้าแหล่งกำเนิดมลพิษ เพื่อความโปร่งใสและปฏิบัติตามมาตรฐานการปกป้องข้อมูลสาธารณะ
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <span>🧪 ไม่สามารถทดแทนผลแล็บได้</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              แบบจำลองอุทกวิทยาและข้อสังเกตจากชุมชนเป็นเพียงข้อมูลสนับสนุนการเฝ้าระวังเบื้องต้น ไม่ใช่ผลการวิเคราะห์สารเคมีทางวิทยาศาสตร์
            </p>
          </div>
        </div>
      </section>

      {/* 4. Emergency Contacts */}
      <div className="p-6 rounded-3xl bg-sky-50/70 border border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#0A2540]">
              พบเห็นเหตุมลพิษร้ายแรง หรือต้องการความช่วยเหลือเร่งด่วน?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              แจ้งตรงศูนย์ปฏิบัติการฉุกเฉินมลพิษ กรมควบคุมมลพิษ (PCD)
            </p>
          </div>
        </div>

        <a
          href="tel:1650"
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-colors min-h-[44px] flex items-center gap-2 shrink-0 shadow-xs"
        >
          <span>โทรฟรีสายด่วน 1650</span>
        </a>
      </div>

    </div>
  );
};
