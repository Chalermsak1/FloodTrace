import React from 'react';
import { HelpCircle } from 'lucide-react';
import { EvidenceLabel } from '../components/ui/EvidenceLabel';
import { PageHeader } from '../components/ui/PageHeader';

export const AboutPage: React.FC = () => (
  <div className="rw-page-shell space-y-4">
    <PageHeader eyebrow="พื้นที่ให้บริการ: จังหวัดปราจีนบุรี" title="เกี่ยวกับ Ruwaigon"
      description="Ruwaigon ช่วยให้ผู้ใช้พิจารณาว่าพื้นที่ควรได้รับการเฝ้าระวังหรือตรวจสอบเพิ่มเติมหรือไม่ น้ำท่วมเป็นหนึ่งในปัจจัยการเคลื่อนย้ายและการสัมผัสสิ่งแวดล้อม" />
    <section className="rw-card space-y-3">
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><HelpCircle className="w-4 h-4" aria-hidden="true" /> หลักฐานและข้อจำกัด</div>
      <div className="flex flex-wrap gap-2"><EvidenceLabel family="OFFICIAL" /><EvidenceLabel family="COMMUNITY" /><EvidenceLabel family="MODEL" /></div>
      <p className="text-sm text-slate-600">ไม่มีข้อมูลหมายถึงไม่มีข้อมูลที่ระบบยืนยันได้. รายงานจากประชาชนเป็นข้อสังเกต. แบบจำลองและการพยากรณ์ไม่ใช่ผลตรวจทางห้องปฏิบัติการ.</p>
      <p className="text-sm text-slate-600">สถานะของแต่ละแหล่งข้อมูลอยู่ในหน้าแหล่งข้อมูลและวิธีวิทยา.</p>
    </section>
  </div>
);
