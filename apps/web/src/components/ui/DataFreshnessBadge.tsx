import React from 'react';
import { Activity, Radio, Wifi, WifiOff } from 'lucide-react';
import { Badge } from './Badge';

interface DataFreshnessBadgeProps {
  status?: string;
  ageSeconds?: number;
  lastUpdatedText?: string | null;
  latestObservedTime?: string | null;
  sseStatus?: 'connected' | 'reconnecting' | 'disconnected';
  className?: string;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  status = 'RECENT',
  ageSeconds,
  lastUpdatedText,
  latestObservedTime,
  sseStatus,
  className = ''
}) => {
  const displayTime = lastUpdatedText || latestObservedTime;
  const normStatus = (status || '').toUpperCase();
  
  if (sseStatus === 'connected') {
    return (
      <Badge
        variant="live"
        pulse
        icon={<Wifi className="w-3 h-3 text-emerald-600" />}
        size="xs"
        className={className}
        title="เชื่อมต่อระบบ Real-Time Live Stream (SSE) อัปเดตข้อมูลอัตโนมัติ"
      >
        <span>สดใหม่ (Real-Time)</span>
      </Badge>
    );
  }

  if (sseStatus === 'reconnecting') {
    return (
      <Badge
        variant="watch"
        pulse
        icon={<Radio className="w-3 h-3 text-amber-600 animate-spin" />}
        size="xs"
        className={className}
        title="กำลังเชื่อมต่อ Real-Time Stream ใหม่..."
      >
        <span>กำลังเชื่อมต่อ...</span>
      </Badge>
    );
  }

  if (normStatus === 'LIVE' || normStatus === 'RECENT') {
    return (
      <Badge
        variant="recent"
        pulse
        icon={<Activity className="w-3 h-3 text-emerald-600" />}
        size="xs"
        className={className}
        title={displayTime ? `อัปเดตล่าสุด: ${displayTime}` : 'ข้อมูลโทรมาตรปัจจุบัน'}
      >
        <span>ข้อมูลล่าสุด {displayTime ? `(${displayTime})` : ''}</span>
      </Badge>
    );
  }

  if (normStatus === 'DELAYED') {
    return (
      <Badge
        variant="watch"
        icon={<Activity className="w-3 h-3 text-amber-600" />}
        size="xs"
        className={className}
        title="ข้อมูลล่าช้ากว่ารอบเวลาปกติเล็กน้อย"
      >
        <span>ล่าช้าเล็กน้อย</span>
      </Badge>
    );
  }

  if (normStatus === 'STALE' || normStatus === 'OFFLINE') {
    return (
      <Badge
        variant="stale"
        icon={<WifiOff className="w-3 h-3 text-slate-400" />}
        size="xs"
        className={className}
        title="ข้อมูลค้างเก่าเกินกำหนดเวลา กรุณาตรวจสอบเวลาตรวจวัดจริง"
      >
        <span>ข้อมูลค้างเก่า</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="neutral"
      size="xs"
      className={className}
    >
      <span>{displayTime ? `เวลา: ${displayTime}` : 'โทรมาตร'}</span>
    </Badge>
  );
};
