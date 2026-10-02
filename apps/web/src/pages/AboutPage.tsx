import React from 'react';
import { 
  Waves, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  PhoneCall, 
  HelpCircle, 
  Eye, 
  FileCheck2, 
  ExternalLink 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B243D] pb-16">
      {/* Top Hero Banner */}
      <div className="bg-[#103D76] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#0C57C7]/30 shadow-inner">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-semibold mb-4 border border-white/20">
            <Waves className="w-4 h-4 text-sky-300" />
            เกี่ยวกับ FloodTrace ปราจีนบุรี
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            แพลตฟอร์มคัดกรองและเฝ้าระวังสิ่งแวดล้อมภาคประชาชน
          </h1>
          <p className="mt-3 text-sm sm:text-base text-sky-100 max-w-2xl leading-relaxed">
            FloodTrace พัฒนาขึ้นเพื่อช่วยตอบคำถามสำคัญของประชาชนในจังหวัดปราจีนบุรีว่า{' '}
            <span className="font-semibold text-white">
              "พื้นที่ของฉันควรได้รับการติดตามหรือตรวจสอบสิ่งแวดล้อมใกล้ชิดหรือไม่?"
            </span>
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Core Product Principle & What it is NOT */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                หลักการทำงานและข้อจำกัดของระบบ
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                สิ่งที่ FloodTrace เป็น และสิ่งที่ FloodTrace ไม่ใช่
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <h3 className="font-bold text-emerald-900 text-sm sm:text-base flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                สิ่งที่ระบบทำ (หน้าที่หลัก)
              </h3>
              <ul className="text-xs sm:text-sm text-emerald-950 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span><strong>จัดลำดับความสำคัญในการตรวจสอบ (Verification Priority):</strong> คัดกรองพื้นที่ที่ควรระมัดระวังและสุ่มตรวจคุณภาพน้ำก่อนตามหลักอุทกวิทยา</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span><strong>รวบรวมข้อสังเกตจากชุมชน:</strong> เปิดให้ประชาชนส่งภาพและบันทึกความผิดปกติ เช่น กลิ่น สี คราบน้ำ เพื่อเป็นฐานข้อมูลตรวจสอบ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span><strong>เชื่อมโยงข้อมูลเปิดจากภาครัฐ:</strong> นำข้อมูลโทรมาตรน้ำ ฝนดาวเทียม และประกาศทางการมารวมไว้ในจุดเดียว</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-rose-50/70 border border-rose-200/80">
              <h3 className="font-bold text-rose-900 text-sm sm:text-base flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                สิ่งที่ไม่ใช่หน้าที่ของระบบ (ข้อจำกัดสำคัญ)
              </h3>
              <ul className="text-xs sm:text-sm text-rose-950 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-rose-600">•</span>
                  <span><strong>ไม่ใช่การระบุผู้ก่อมลพิษ:</strong> ระบบไม่ระบุชื่อโรงงาน นิติบุคคล หรือกล่าวหาแหล่งกำเนิดมลพิษใด ๆ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-rose-600">•</span>
                  <span><strong>ไม่ใช่ผลตรวจทางห้องปฏิบัติการ:</strong> แบบจำลองการไหลและข้อสังเกตของประชาชนไม่สามารถทดแทนผลวิเคราะห์สารเคมีทางวิทยาศาสตร์ได้</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-rose-600">•</span>
                  <span><strong>ไม่ได้รับรองว่า "ปลอดภัย":</strong> สภาพแวดล้อมทางน้ำเปลี่ยนแปลงรวดเร็ว จึงระบุเป็น "ไม่มีพื้นที่เฝ้าระวังที่กำลังใช้งาน" แทนคำว่าปลอดภัย</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">ข้อความมาตรฐานกำกับข้อมูล: </span>
            "FloodTrace เป็นระบบคัดกรองและประเมินลำดับความสำคัญในการเฝ้าระวังสิ่งแวดล้อมภาคประชาชน 
            ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ได้ระบุความรับผิดทางกฎหมายของผู้ใด 
            หากสงสัยเหตุฉุกเฉินทางมลพิษ โปรดแจ้งสายด่วน 1650 หรือหน่วยงานที่มีอำนาจตามกฎหมาย"
          </div>
        </section>

        {/* 3 Information Classes */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                การจำแนกข้อมูล 3 หมวดหมู่อย่างโปร่งใส
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                ทุกข้อมูลบน FloodTrace มีการระบุแหล่งที่มาและระดับความเชื่อถืออย่างเคร่งครัด
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  OFFICIAL
                </span>
                <span className="font-bold text-sm text-slate-800">ข้อมูลจากหน่วยงาน</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ข้อมูลสถานีวัดระดับน้ำ ฝนโทรมาตร และประกาศตรวจวัดคุณภาพสิ่งแวดล้อมจากกรมควบคุมมลพิษ (PCD), 
                สำนักงานทรัพยากรน้ำแห่งชาติ (ONWR), กรมชลประทาน (RID), กรมอุตุนิยมวิทยา (TMD) และ GISTDA
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  COMMUNITY
                </span>
                <span className="font-bold text-sm text-slate-800">รายงานจากประชาชน</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ข้อสังเกตสภาพน้ำ กลิ่น คราบ หรือสัตว์น้ำผิดปกติที่ประชาชนส่งเข้ามา 
                <span className="text-amber-700 font-medium"> (มีข้อความกำกับเสมอ: "รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์ ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน")</span>
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  MODEL
                </span>
                <span className="font-bold text-sm text-slate-800">ผลจากแบบจำลอง</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                พื้นที่ประเมินลำดับความสำคัญในการตรวจสอบตามแนวลุ่มน้ำสาขา 
                <span className="text-amber-700 font-medium"> (มีข้อความกำกับเสมอ: "ผลจากแบบจำลองไม่ใช่ผลตรวจทางห้องปฏิบัติการ")</span>
              </p>
            </div>
          </div>
        </section>

        {/* Privacy & Safety by Design */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                การคุ้มครองความเป็นส่วนตัวและความปลอดภัย (Privacy by Design)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                มาตรการปกป้องข้อมูลส่วนบุคคลและป้องกันผลกระทบทางกฎหมายที่ไม่เป็นธรรม
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed pt-2">
            <div className="flex items-start gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span><strong>ลดทอนความแม่นยำของพิกัดรายงาน (Coordinate Generalization):</strong> พิกัดที่ประชาชนส่งเข้ามาจะถูกปัดเศษเป็นระดับตำบลหรือกริดหยาบ ~1.1 กิโลเมตร เพื่อไม่ให้ระบุตำแหน่งบ้านหรือที่พักอาศัยได้</span>
            </div>
            <div className="flex items-start gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span><strong>ลบข้อมูล EXIF/GPS ในรูปถ่าย:</strong> ระบบจะตัดข้อมูลระบุตำแหน่งและอุปกรณ์ที่ติดมากับไฟล์ภาพโดยอัตโนมัติก่อนจัดเก็บและเผยแพร่</span>
            </div>
            <div className="flex items-start gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span><strong>ไม่มีการเผยแพร่ข้อมูลระบุตัวบุคคล:</strong> ไม่เปิดเผยชื่อ เบอร์โทรศัพท์ หรืออีเมลของผู้ส่งรายงานในหน้าสาธารณะ</span>
            </div>
            <div className="flex items-start gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span><strong>ไม่มีการระบุพิกัดโรงงานหรือจุดกำเนิดมลพิษ:</strong> แผนที่แสดงผลเฉพาะรูปแปลงลุ่มน้ำสาขาและทางน้ำธรรมชาติ ไม่แสดงจุดที่ตั้งโรงงานหรือลูกศรชี้แหล่งกำเนิด</span>
            </div>
          </div>
        </section>

        {/* Emergency Contacts & Official Channels */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                ช่องทางแจ้งเหตุฉุกเฉินและหน่วยงานทางการ
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                หากพบเหตุด่วนด้านมลพิษ หรืออุทกภัยร้ายแรง โปรดติดต่อหน่วยงานโดยตรงทันที
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a 
              href="tel:1650" 
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-slate-500">กรมควบคุมมลพิษ (PCD)</div>
                <div className="font-bold text-slate-900 text-sm sm:text-base">สายด่วนร้องทุกข์มลพิษ</div>
              </div>
              <span className="text-base font-extrabold text-blue-600 px-3 py-1 bg-blue-100 rounded-lg">1650</span>
            </a>

            <a 
              href="tel:1784" 
              className="p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-slate-500">กรมป้องกันและบรรเทาสาธารณภัย (DDPM)</div>
                <div className="font-bold text-slate-900 text-sm sm:text-base">สายด่วนสาธารณภัย / น้ำท่วม</div>
              </div>
              <span className="text-base font-extrabold text-rose-600 px-3 py-1 bg-rose-100 rounded-lg">1784</span>
            </a>

            <a 
              href="tel:1460" 
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-slate-500">กรมชลประทาน (RID)</div>
                <div className="font-bold text-slate-900 text-sm sm:text-base">สายด่วนน้ำชลประทาน</div>
              </div>
              <span className="text-base font-extrabold text-sky-600 px-3 py-1 bg-sky-100 rounded-lg">1460</span>
            </a>

            <a 
              href="tel:1567" 
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-slate-500">กระทรวงมหาดไทย</div>
                <div className="font-bold text-slate-900 text-sm sm:text-base">ศูนย์ดำรงธรรม ร้องทุกข์</div>
              </div>
              <span className="text-base font-extrabold text-amber-600 px-3 py-1 bg-amber-100 rounded-lg">1567</span>
            </a>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between mt-2">
            <span>สำนักงานทรัพยากรธรรมชาติและสิ่งแวดล้อมจังหวัดปราจีนบุรี (ทสจ. ปราจีนบุรี)</span>
            <span className="font-semibold text-slate-800">โทร. 037-454-041</span>
          </div>
        </section>

        {/* Read More Links */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-sky-50 rounded-2xl border border-sky-200">
          <div>
            <h3 className="font-bold text-sky-950 text-base">ต้องการศึกษาวิธีวิทยาและแคตตาล็อกข้อมูล?</h3>
            <p className="text-xs sm:text-sm text-sky-800 mt-1">
              อ่านรายละเอียดสูตรการคำนวณ แหล่งข้อมูลโทรมาตร และข้อจำกัดทางวิชาการ
            </p>
          </div>
          <Link
            to="/data-methodology"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#103D76] text-white text-sm font-semibold hover:bg-[#0C57C7] transition-colors shrink-0 shadow-sm"
          >
            <span>ดูข้อมูลและวิธีวิทยา</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </section>

      </div>
    </div>
  );
};
