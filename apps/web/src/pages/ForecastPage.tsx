import React, { useEffect, useState } from 'react';
import { EvidenceLabel } from '../components/ui/EvidenceLabel';
import { FeedbackState } from '../components/ui/FeedbackState';
import { PageHeader } from '../components/ui/PageHeader';

type ForecastResponse = {
  status?: string;
  reason?: string;
  forecast_days?: Array<{
    date: string;
    precipitation_sum_mm: number | null;
    precipitation_probability_max_pct: number | null;
    precipitation_hours: number | null;
    units?: {
      precipitation_sum?: string | null;
      precipitation_probability_max?: string | null;
      precipitation_hours?: string | null;
    };
  }>;
  selector?: { selector_label?: string; selector_label_th?: string; coordinate_role?: string };
  source_provenance?: {
    provider?: string;
    model_description?: string;
    retrieved_at?: string;
    limitations?: string;
  };
};

export const ForecastPage: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/forecast/?station=prachin_mueang')
      .then((response) => response.ok ? response.json() : null)
      .then(setForecast)
      .catch(() => setForecast(null))
      .finally(() => setLoading(false));
  }, []);

  const available = forecast?.status === 'AVAILABLE' && Array.isArray(forecast.forecast_days) && forecast.forecast_days.length > 0;

  return (
    <div className="rw-page-shell space-y-4">
      <PageHeader eyebrow="แนวโน้ม ไม่ใช่สภาพที่สังเกตในปัจจุบัน" title="แนวโน้มและการคาดการณ์"
        description="แสดงผลพยากรณ์แยกจากข้อมูลตรวจวัดและข้อสังเกตจากประชาชน" />
      <section className="rw-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-[#063B70]">สถานะการพยากรณ์</h2><EvidenceLabel family="MODEL" detail="FORECAST" /></div>
        {loading ? <FeedbackState kind="loading" title="กำลังตรวจสอบข้อมูลพยากรณ์" />
          : !forecast || !available ? <FeedbackState kind="unavailable" title="ข้อมูลพยากรณ์ไม่พร้อมใช้งาน" detail={forecast?.reason || forecast?.status || 'ไม่มีข้อมูลพยากรณ์ที่ระบบยืนยันได้'} />
          : <div role="status" className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
              <p className="font-semibold">{forecast.status}</p>
              {forecast.selector?.selector_label_th && <p className="mt-1 break-words">จุดอ้างอิง: {forecast.selector.selector_label_th} · {forecast.selector.coordinate_role || 'บทบาทพิกัดไม่ระบุ'}</p>}
              <p>{forecast.source_provenance?.provider || 'Open-Meteo'} · {forecast.source_provenance?.model_description || 'แบบจำลองที่ผู้ให้บริการเลือก'}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {forecast.forecast_days?.map((day) => (
                  <article key={day.date} className="rounded-lg border border-violet-200 bg-white p-3">
                    <h3 className="font-semibold">{day.date}</h3>
                    <dl className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between gap-2"><dt>ฝนคาดการณ์</dt><dd>{typeof day.precipitation_sum_mm === 'number' ? `${day.precipitation_sum_mm} ${day.units?.precipitation_sum || '(หน่วยไม่ระบุ)'}` : 'ไม่มีข้อมูล'}</dd></div>
                      <div className="flex justify-between gap-2"><dt>โอกาสฝนสูงสุด</dt><dd>{typeof day.precipitation_probability_max_pct === 'number' ? `${day.precipitation_probability_max_pct} ${day.units?.precipitation_probability_max || '(หน่วยไม่ระบุ)'}` : 'ไม่มีข้อมูล'}</dd></div>
                      <div className="flex justify-between gap-2"><dt>ชั่วโมงที่มีฝน</dt><dd>{typeof day.precipitation_hours === 'number' ? `${day.precipitation_hours} ${day.units?.precipitation_hours || '(หน่วยไม่ระบุ)'}` : 'ไม่มีข้อมูล'}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
              {forecast.source_provenance?.retrieved_at && <p className="text-xs">ดึงข้อมูลเมื่อ {forecast.source_provenance.retrieved_at}</p>}
              <p className="text-xs">{forecast.source_provenance?.limitations || 'ผลพยากรณ์เป็นแบบจำลอง ไม่ใช่การตรวจวัดปัจจุบันหรือผลยืนยันทางห้องปฏิบัติการ'}</p>
            </div>}
      </section>
    </div>
  );
};
