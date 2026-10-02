import React from 'react';
import { CloudRain, AlertCircle, ShieldAlert, Clock, MapPin, Eye } from 'lucide-react';

interface ForecastSectionProps {
  isForecastBlocked: boolean;
  forecastData?: any;
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({
  isForecastBlocked = true,
  forecastData
}) => {
  return (
    <div id="section-forecast" className="ft-card p-4 sm:p-5 flex flex-col justify-between h-full text-[#0B243D]">
      
      {/* Header with Section 5 Badge */}
      <div>
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#C4C7D1]/70">
          <div className="ft-badge-num">5</div>
          <div>
            <h3 className="font-bold text-base text-[#0B243D] leading-tight">
              แนวโน้มการขยายตัว (Forecast)
            </h3>
            <p className="text-[11px] text-[#717F8F]">
              แสดงแนวโน้มพื้นที่เฝ้าระวังล่วงหน้า 3 วัน ตามแบบจำลองที่ได้รับอนุญาต
            </p>
          </div>
        </div>

        {/* Forecast Card Body */}
        <div className="mt-3.5 space-y-3">
          
          {/* Small Preview Map / Vector Graphic */}
          <div className="relative h-32 w-full rounded-xl overflow-hidden border border-[#C4C7D1] bg-[#103D76]/5 flex items-center justify-center p-3">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-slate-100/30 to-blue-200/50" />
            
            {/* Illustrated Reach Vector */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-3 h-3 rounded-full bg-[#E16434] inline-block"></span>
                <span className="text-xs font-bold text-[#0B243D]">จุดเฝ้าระวังหลัก (อ.กบินทร์บุรี)</span>
              </div>
              <div className="w-3/4 border-t-2 border-dashed border-[#5794E0] my-1 relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded text-[10px] font-bold text-[#0C57C7] border border-[#C4C7D1]">
                  ทิศทางการไหล +3 วัน
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#717F8F] mt-1">
                <MapPin className="w-3 h-3 text-[#5794E0]" />
                <span>แม่น้ำปราจีนบุรี → อ.ศรีมหาโพธิ → อ.เมือง</span>
              </div>
            </div>
          </div>

          {/* Forecast Access State Banner (Honest Fail-Closed) */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>สถานะข้อมูลคาดการณ์</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                {isForecastBlocked ? 'ACCESS REQUIRED' : 'MODELED'}
              </span>
            </div>
            
            <p className="text-[11px] text-amber-950 leading-relaxed pt-1">
              {isForecastBlocked ? (
                <>
                  <strong>แหล่งข้อมูลภายนอกถูกจำกัด:</strong> ระบบใช้งานนโยบายควบคุมความปลอดภัยในการผลิต (Production Gate) แหล่งข้อมูลพยากรณ์สาธารณะภายนอกถูกระงับจนกว่าจะได้รับสิทธิ์เข้าถึงข้อมูลทางการเฉพาะ
                </>
              ) : (
                <>
                  ปริมาณฝนสะสมคาดการณ์ 48 ชม. 10.2 มม. ตามแบบจำลองความละเอียดสูง ECMWF IFS 0.1°
                </>
              )}
            </p>
          </div>

          {/* Legend and Horizon */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-white rounded-lg border border-[#C4C7D1]/60">
              <div className="text-[10px] text-[#717F8F]">ช่วงเวลาคาดการณ์</div>
              <div className="font-bold text-[#0B243D] mt-0.5">+24H ถึง +72H</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-[#C4C7D1]/60">
              <div className="text-[10px] text-[#717F8F]">ประเภทข้อมูล</div>
              <div className="font-bold text-[#0C57C7] mt-0.5">แบบจำลอง (MODELED)</div>
            </div>
          </div>

        </div>
      </div>

      {/* Forecast Disclaimer */}
      <div className="mt-4 pt-2.5 border-t border-[#C4C7D1]/70">
        <p className="text-[10px] text-[#717F8F] leading-snug">
          * แบบจำลองเป็นข้อมูลประกอบการเฝ้าระวัง ไม่ใช่การยืนยันเหตุการณ์ล่วงหน้า
        </p>
      </div>

    </div>
  );
};
