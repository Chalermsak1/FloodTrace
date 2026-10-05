import React, { useEffect, useState } from 'react';
import { EvidenceLabel } from '../components/ui/EvidenceLabel';
import { FeedbackState } from '../components/ui/FeedbackState';
import { PageHeader } from '../components/ui/PageHeader';

type SourceRecord = {
  source_id: string;
  agency: string;
  dataset: string;
  status?: string;
  source_status: string;
  runtime_status?: string;
  family?: string;
  role?: string;
  database_records: number | null;
  latest_source_timestamp: string | null;
  retrieved_at?: string | null;
  reason_code: string | null;
  refresh_interval: string | null;
};

export const DataMethodologyPage: React.FC = () => {
  const [sources, setSources] = useState<SourceRecord[] | null>(null);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/provenance')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        setSources(Array.isArray(data?.sources) ? data.sources : null);
        setLimitations(Array.isArray(data?.limitations) ? data.limitations : []);
      })
      .catch(() => setSources(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rw-page-shell space-y-4">
      <PageHeader eyebrow="ความโปร่งใสของข้อมูล" title="แหล่งข้อมูลและวิธีวิทยา"
        description="สถานะ จำนวนระเบียน เวลาแหล่งข้อมูล และช่วงปรับปรุงเป็นคนละรายการ ช่องที่ไม่มีหลักฐานจะแสดงว่าไม่มีข้อมูล" />
      <div className="flex flex-wrap gap-2" aria-label="ชนิดหลักฐาน">
        <EvidenceLabel family="OFFICIAL" /><EvidenceLabel family="COMMUNITY" /><EvidenceLabel family="MODEL" />
      </div>

      <section className="rw-card space-y-3" aria-label="สถานะแหล่งข้อมูล">
        <h2 className="text-lg font-bold text-[#063B70]">สถานะแหล่งข้อมูล</h2>
        {loading ? <FeedbackState kind="loading" title="กำลังโหลดสถานะแหล่งข้อมูล" />
          : sources === null ? <FeedbackState kind="unavailable" title="สถานะแหล่งข้อมูลไม่พร้อมใช้งาน" detail="ลองใหม่ภายหลัง" />
          : sources.length === 0 ? <FeedbackState kind="empty" title="ไม่มีรายการแหล่งข้อมูลที่รายงานได้" />
          : <div className="divide-y divide-slate-100">
              {sources.map((source) => (
                <article key={source.source_id} className="grid min-w-0 grid-cols-1 gap-3 py-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{source.dataset}</h3><p className="break-words text-xs text-slate-500">{source.agency}</p></div>
                  <dl className="min-w-0 text-sm"><dt className="text-xs font-semibold text-slate-500">สถานะล่าสุด</dt><dd className="break-words font-medium">{source.runtime_status || source.status || source.source_status || 'ไม่สามารถยืนยันได้'}</dd>{source.family && <dd className="text-xs text-slate-500">{source.family}{source.role ? ` · ${source.role}` : ''}</dd>}</dl>
                  <dl className="min-w-0 text-sm"><dt className="text-xs font-semibold text-slate-500">ระเบียนในระบบ</dt><dd>{source.database_records === null ? 'ไม่มีข้อมูล' : source.database_records}</dd></dl>
                  <div className="min-w-0 space-y-2 text-sm">
                    <dl><dt className="text-xs font-semibold text-slate-500">เวลาจากแหล่งข้อมูล</dt><dd className="break-words">{source.latest_source_timestamp || 'ไม่มีข้อมูล'}</dd></dl>
                    {source.retrieved_at && <dl><dt className="text-xs font-semibold text-slate-500">เวลาดึงแบบพยากรณ์</dt><dd className="break-words">{source.retrieved_at}</dd></dl>}
                    <dl><dt className="text-xs font-semibold text-slate-500">รหัสเหตุผล</dt><dd className="break-words">{source.reason_code || 'ไม่มีข้อมูล'}</dd></dl>
                    <dl><dt className="text-xs font-semibold text-slate-500">ช่วงปรับปรุง</dt><dd className="break-words">{source.refresh_interval || 'ไม่มีข้อมูล'}</dd></dl>
                  </div>
                </article>
              ))}
            </div>}
      </section>

      <section className="rw-card space-y-2">
        <h2 className="text-lg font-bold text-[#063B70]">ข้อจำกัด</h2>
        {limitations.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{limitations.map((item, index) => <li key={index} className="break-words">{item}</li>)}</ul>
          : <p className="text-sm text-slate-600">ไม่มีข้อมูลข้อจำกัดจาก API</p>}
      </section>
    </div>
  );
};
