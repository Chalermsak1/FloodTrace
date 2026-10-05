import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { EvidenceLabel } from '../components/ui/EvidenceLabel';
import { FeedbackState } from '../components/ui/FeedbackState';
import { PageHeader } from '../components/ui/PageHeader';

type OfficialUpdate = {
  id: string;
  agency: string;
  title: string;
  published_at: string;
  factual_summary: string;
  source_url: string;
};

export const OfficialUpdatesPage: React.FC = () => {
  const [items, setItems] = useState<OfficialUpdate[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/official-updates')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setItems(Array.isArray(data) ? data : null))
      .catch(() => setItems(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rw-page-shell space-y-4">
      <PageHeader eyebrow="ข้อมูลจากหน่วยงาน" title="ประกาศจากหน่วยงาน"
        description="รายการจะแสดงเมื่อ API มีข้อมูลต้นทางที่ตรวจสอบได้ เวลาเผยแพร่และสถานะจะแสดงตามข้อมูลที่ได้รับ" />
      <section className="rw-card space-y-4" aria-label="รายการประกาศ">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-[#063B70]">รายการที่มีข้อมูล</h2>
          <EvidenceLabel family="OFFICIAL" />
        </div>
        {loading ? <FeedbackState kind="loading" title="กำลังโหลดประกาศ" />
          : items === null ? <FeedbackState kind="unavailable" title="ข้อมูลประกาศไม่พร้อมใช้งาน" detail="ลองใหม่ภายหลัง หรือตรวจสอบสถานะแหล่งข้อมูลในหน้าแหล่งข้อมูลและวิธีวิทยา" />
          : items.length === 0 ? <FeedbackState kind="empty" title="ไม่มีรายการประกาศที่ยืนยันได้" detail="ไม่มีรายการที่ API ส่งกลับในขณะนี้" />
          : items.map((item) => (
            <article key={item.id} className="min-w-0 border-b border-slate-100 pb-4 last:border-b-0">
              <p className="break-words text-xs text-slate-500">{item.agency} · {item.published_at || 'ไม่มีข้อมูลเวลาเผยแพร่'}</p>
              <h3 className="mt-1 break-words font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 break-words text-sm text-slate-600">{item.factual_summary}</p>
              {item.source_url && <a className="mt-2 inline-flex min-h-11 max-w-full items-center gap-1 break-all text-sm text-blue-700 hover:underline" href={item.source_url} rel="noopener noreferrer" target="_blank">เปิดแหล่งที่มา <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" /></a>}
            </article>
          ))}
      </section>
    </div>
  );
};
