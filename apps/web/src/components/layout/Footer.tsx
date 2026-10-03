import React from 'react';
import { Waves, ShieldAlert, FileText, Lock, MessageSquareWarning } from 'lucide-react';

interface FooterProps {
  lastUpdated?: string;
  onOpenGovernance: () => void;
  onOpenDisclaimer: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  lastUpdated,
  onOpenGovernance,
  onOpenDisclaimer,
  onOpenPrivacy
}) => {
  return (
    <footer className="w-full bg-[#103D76] text-white border-t border-[#0C57C7]/40 mt-8 py-8 px-4 sm:px-6">
      <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: Brand & Mission */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0C65E8] flex items-center justify-center shrink-0 border border-white/20">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white">Ruwaigon (ระวังก่อน)</div>
            <div className="text-xs text-sky-200/90 font-medium">
              เฝ้าระวังการปนเปื้อนในสิ่งแวดล้อม เพื่อชุมชนที่ปลอดภัย
            </div>
          </div>
        </div>

        {/* Center: Legal & Transparency Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-sky-200">
          <button
            type="button"
            onClick={onOpenDisclaimer}
            className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            ข้อจำกัดความรับผิดชอบ
          </button>
          <span className="text-white/30 hidden sm:inline">•</span>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-sky-300" />
            นโยบายความเป็นส่วนตัว
          </button>
          <span className="text-white/30 hidden sm:inline">•</span>
          <button
            type="button"
            onClick={onOpenGovernance}
            className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-sky-300" />
            เงื่อนไขการใช้งานและธรรมาภิบาล
          </button>
          <span className="text-white/30 hidden sm:inline">•</span>
          <a
            href="mailto:contact@floodtrace.local?subject=แจ้งข้อมูลที่ไม่ถูกต้อง"
            className="hover:text-white hover:underline transition-colors flex items-center gap-1.5"
          >
            <MessageSquareWarning className="w-3.5 h-3.5 text-rose-300" />
            แจ้งข้อมูลที่ไม่ถูกต้อง
          </a>
        </div>

        {/* Right: Timestamp & Provenance Notice */}
        <div className="text-center md:text-right">
          <div className="text-xs text-sky-200/90 font-medium">
            ข้อมูลอัปเดตล่าสุด:{' '}
            <span className="text-white font-semibold">
              {lastUpdated || '2 ต.ค. 2567 14:30 น.'}
            </span>
          </div>
          <div className="text-xs text-sky-300/80 mt-0.5">
            ระบบประมวลผลข้อมูลตามหลักการพิสูจน์แหล่งที่มา (Provenance-backed)
          </div>
        </div>

      </div>
    </footer>
  );
};
