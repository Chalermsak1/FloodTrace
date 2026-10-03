import React, { useState } from 'react';
import { Play, Pause, AlertCircle, Clock } from 'lucide-react';

interface MapTimelineProps {
  forecastStatus?: string;
  isForecastBlocked?: boolean;
}

const TIMELINE_STEPS = [
  { id: 'now', label: 'ขณะนี้' },
  { id: '6h', label: '+6 ชั่วโมง' },
  { id: '12h', label: '+12 ชั่วโมง' },
  { id: '24h', label: '+24 ชั่วโมง' },
  { id: '3d', label: '3 วัน' },
];

export const MapTimeline: React.FC<MapTimelineProps> = ({
  forecastStatus,
  isForecastBlocked = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState('now');

  const handleStepClick = (stepId: string) => {
    setActiveStep(stepId);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="absolute bottom-3 left-4 right-4 z-[400] bg-[#FBFCFC]/95 backdrop-blur-sm border border-[#C4C7D1] rounded-xl px-3.5 py-2.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
      
      {/* Play Button & Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-lg bg-[#0C57C7] hover:bg-[#103D76] text-white flex items-center justify-center shadow-sm transition-colors"
          title={isPlaying ? 'หยุดชั่วคราว' : 'เล่นภาพจำลอง'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex items-center gap-1.5 text-[#0B243D] font-bold text-xs sm:text-sm">
          <Clock className="w-4 h-4 text-[#0C57C7]" />
          <span>เส้นเวลาจำลอง (Timeline)</span>
        </div>
      </div>

      {/* Steps Slider */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center flex-1 max-w-lg">
        {TIMELINE_STEPS.map((step) => {
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all min-h-[36px] ${
                isActive
                  ? 'bg-[#0C57C7] text-white shadow-sm'
                  : 'bg-slate-100 text-[#717F8F] hover:bg-slate-200 hover:text-[#0B243D]'
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>

      {/* Honest Data Availability State */}
      <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300/80 text-xs font-semibold">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
        <span>
          {isForecastBlocked ? 'ต้องได้รับสิทธิ์เข้าถึง (ACCESS REQ)' : 'แบบจำลองล่วงหน้า 3 วัน'}
        </span>
      </div>

    </div>
  );
};
