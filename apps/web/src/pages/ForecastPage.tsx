import React, { useEffect, useState } from 'react';
import { EvidenceLabel } from '../components/ui/EvidenceLabel';
import { FeedbackState } from '../components/ui/FeedbackState';
import { PageHeader } from '../components/ui/PageHeader';

type ForecastResponse = {
  status?: string;
  reason?: string;
  forecast_days?: unknown[];
  selector?: { selector_label?: string; selector_label_th?: string; coordinate_role?: string };
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
          : <div role="status" className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
              <p className="font-semibold">{forecast.status}</p>
              {forecast.selector?.selector_label_th && <p className="mt-1 break-words">จุดอ้างอิง: {forecast.selector.selector_label_th} · {forecast.selector.coordinate_role || 'บทบาทพิกัดไม่ระบุ'}</p>}
              <p className="mt-2">ผลพยากรณ์เป็นแบบจำลอง ไม่ใช่ผลตรวจทางห้องปฏิบัติการหรือการสังเกตปัจจุบัน</p>
            </div>}
      </section>
    </div>
  );
};
