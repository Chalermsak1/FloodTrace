import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Clock, 
  ChevronRight,
  Camera,
  RotateCcw,
  Search,
  Copy,
  PhoneCall,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  Badge, 
  Button, 
  Tabs,
  PageHeader,
  Card 
} from '../components/ui';

const REPORT_CATEGORIES = [
  { id: 'น้ำเปลี่ยนสี', label: 'น้ำเปลี่ยนสี', desc: 'น้ำมีสีดำ คล้ำ เขียวข้น หรือมีตะกอนขุ่นผิดปกติ' },
  { id: 'คราบบนผิวน้ำ', label: 'คราบบนผิวน้ำ', desc: 'พบคราบน้ำมัน คราบเงาสะท้อน หรือฟิล์มลอยบนผิวน้ำ' },
  { id: 'กลิ่นผิดปกติ', label: 'กลิ่นผิดปกติ', desc: 'มีกลิ่นเหม็นไหม้ กลิ่นสารเคมี หรือกลิ่นฉุนรุนแรง' },
  { id: 'ฟอง / ตะกอนผิดปกติ', label: 'ฟอง / ตะกอนผิดปกติ', desc: 'มีฟองขาวหนาแน่นสะสมผิดธรรมชาติ หรือมีตะกอนตกค้าง' },
  { id: 'สัตว์น้ำตาย', label: 'สัตว์น้ำตาย', desc: 'พบปลาหรือสัตว์น้ำลอยตายผิดสังเกตเป็นจำนวนมาก' },
  { id: 'ขยะ / วัสดุผิดปกติ', label: 'ขยะ / วัสดุผิดปกติ', desc: 'พบเศษวัสดุ กากของเสีย หรือภาชนะบรรจุสิ่งของลอยในน้ำ' },
  { id: 'อื่น ๆ', label: 'ข้อสังเกตอื่น ๆ', desc: 'ข้อสังเกตสภาพแวดล้อมทางน้ำอื่นๆ ที่ควรเฝ้าระวัง' }
];

const DISTRICT_COORDS: Record<string, [number, number]> = {
  'กบินทร์บุรี': [13.995, 101.725],
  'ศรีมหาโพธิ': [13.882, 101.518],
  'เมืองปราจีนบุรี': [14.053, 101.372],
  'บ้านสร้าง': [13.985, 101.215],
  'ประจันตคาม': [14.112, 101.552],
  'นาดี': [14.135, 101.882],
  'ศรีมโหสถ': [13.865, 101.415]
};

type DraftStatus = 'DRAFT' | 'PENDING_UPLOAD' | 'SUBMITTING' | 'SUBMITTED' | 'FAILED';

export const ReportPage: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [category, setCategory] = useState<string>('น้ำเปลี่ยนสี');
  const [district, setDistrict] = useState<string>('กบินทร์บุรี');
  const [subdistrict, setSubdistrict] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(13.995);
  const [longitude, setLongitude] = useState<number>(101.725);
  const [description, setDescription] = useState<string>('');
  const [waterDepth, setWaterDepth] = useState<string>('');
  const [declaration, setDeclaration] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('DRAFT');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tracking state
  const [activeMode, setActiveMode] = useState<string>('create');
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [trackingIdInput, setTrackingIdInput] = useState<string>('');
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const handleTrackReport = async (e?: React.FormEvent, directId?: string) => {
    if (e) e.preventDefault();
    const idToTrack = (directId || trackingIdInput).trim();
    if (!idToTrack) return;
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingResult(null);
    try {
      const resp = await fetch(`/api/public/reports/track/${encodeURIComponent(idToTrack)}`);
      const data = await resp.json();
      if (resp.ok && data.success) {
        setTrackingResult(data);
      } else {
        setTrackingError(data.detail || 'ไม่พบรายงานที่ระบุ กรุณาตรวจสอบรหัสอีกครั้ง');
      }
    } catch (err) {
      setTrackingError('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruwaigon_report_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.subdistrict) setSubdistrict(parsed.subdistrict);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.waterDepth) setWaterDepth(parsed.waterDepth);
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (draftStatus !== 'SUBMITTED') {
      try {
        localStorage.setItem('ruwaigon_report_draft', JSON.stringify({
          category,
          district,
          subdistrict,
          description,
          waterDepth
        }));
      } catch (e) {
        console.warn('Failed to save draft:', e);
      }
    }
  }, [category, district, subdistrict, description, waterDepth, draftStatus]);

  const handleDistrictChange = (d: string) => {
    setDistrict(d);
    const coords = DISTRICT_COORDS[d];
    if (coords) {
      setLatitude(coords[0]);
      setLongitude(coords[1]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDraftStatus('PENDING_UPLOAD');

      const formData = new FormData();
      formData.append('photo', file);

      try {
        const res = await fetch('/api/public/reports/upload-photo', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.filename) {
          setUploadedFilename(data.filename);
          setDraftStatus('DRAFT');
        } else {
          setUploadedFilename(null);
        }
      } catch (err) {
        console.warn('Photo upload fallback:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declaration) {
      setErrorMessage('กรุณากดยืนยันคำรับรองก่อนส่งข้อมูล');
      return;
    }

    setDraftStatus('SUBMITTING');
    setErrorMessage(null);

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await fetch('/api/public/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          category,
          district,
          subdistrict: subdistrict.trim() || 'ในพื้นที่',
          latitude,
          longitude,
          description: description.trim(),
          photo_filename: uploadedFilename,
          water_depth_cm: waterDepth ? parseFloat(waterDepth) : 0.0,
          declaration_confirmed: declaration
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDraftStatus('SUBMITTED');
        setSubmittedReportId(data.report_id || null);
        setResultMessage(data.message || 'ส่งรายงานเรียบร้อยแล้ว');
        localStorage.removeItem('ruwaigon_report_draft');
        localStorage.removeItem('floodtrace_report_draft');
      } else {
        setDraftStatus('FAILED');
        setErrorMessage(data?.detail || data?.error?.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }
    } catch (err: any) {
      setDraftStatus('FAILED');
      setErrorMessage('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleReset = () => {
    setStep(1);
    setDescription('');
    setSelectedFile(null);
    setUploadedFilename(null);
    setDeclaration(false);
    setDraftStatus('DRAFT');
    setSubmittedReportId(null);
    setResultMessage(null);
    setErrorMessage(null);
  };

  const modeTabs = [
    { id: 'create', label: 'แจ้งข้อสังเกตใหม่', icon: <Eye className="w-4 h-4" /> },
    { id: 'track', label: 'ติดตามสถานะรายงาน', icon: <Search className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Unified PageHeader */}
      <PageHeader
        title="รายงานและติดตามข้อสังเกตสภาพน้ำ"
        subtitle="ร่วมเฝ้าระวังพื้นที่จังหวัดปราจีนบุรีโดยการรายงานข้อเท็จจริงที่พบเห็น ข้อมูลพิกัดละเอียดจะถูกจัดเก็บอย่างปลอดภัยและปัดเศษระดับตำบลเพื่อปกป้องความเป็นส่วนตัว"
        badge={
          <Badge variant="normal" icon={<Eye className="w-3.5 h-3.5" />}>
            Citizen Intelligence
          </Badge>
        }
        actions={
          <Link
            to="/cases"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 hover:text-[#0C65E8] hover:border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>ดูรายงานชุมชนทั้งหมด</span>
          </Link>
        }
      />

      {/* Main Flow Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
        {/* Mode Switch Tabs */}
        <div>
          <Tabs
            tabs={modeTabs}
            activeTab={activeMode}
            onChange={(id) => setActiveMode(id)}
            variant="pills"
          />
        </div>

        {/* 3-Step Wizard Indicator */}
        {activeMode === 'create' && draftStatus !== 'SUBMITTED' && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            {[
              { num: 1, title: 'สิ่งที่พบ', desc: 'เลือกหมวดหมู่' },
              { num: 2, title: 'ระบุตำแหน่ง', desc: 'อำเภอ/ตำบล' },
              { num: 3, title: 'ตรวจสอบ & ส่ง', desc: 'ภาพและคำอธิบาย' }
            ].map(item => {
              const isActive = step === item.num;
              const isPassed = step > item.num;
              return (
                <div
                  key={item.num}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center ${
                    isActive
                      ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-2xs'
                      : isPassed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                      : 'bg-slate-50 text-slate-500 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className={`w-4 h-4 rounded-full text-2xs flex items-center justify-center font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {item.num}
                      </span>
                    )}
                    <span>{item.title}</span>
                  </div>
                  <span className={`text-2xs hidden sm:block mt-0.5 ${
                    isActive ? 'text-blue-200' : isPassed ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    {item.desc}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Emergency Notice Callout (Public Safety Guardrail) */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-950 shadow-2xs">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm space-y-1.5 flex-1">
          <span className="font-bold block text-amber-900 text-sm">
            หากเป็นเหตุน้ำท่วมวิกฤติ หรือต้องการความช่วยเหลือฉุกเฉินทันที
          </span>
          <p className="text-amber-800 leading-relaxed text-xs">
            ระบบ FloodTrace เป็นแพลตฟอร์มเฝ้าระวังและรวบรวมข้อมูลสนับสนุนการตัดสินใจ หากมีผู้ประสบภัยติดค้างหรือเกิดเหตุด่วน กรุณาติดต่อสายด่วนกู้ภัยและหน่วยงานโดยตรง:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a href="tel:1784" className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-300 font-bold text-amber-950 text-xs transition-colors inline-flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-900" />
              <span>ปภ. กู้ภัยน้ำท่วม 1784</span>
            </a>
            <a href="tel:1650" className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-300 font-bold text-amber-950 text-xs transition-colors inline-flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-900" />
              <span>สายด่วนมลพิษ PCD 1650</span>
            </a>
            <a href="tel:1460" className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-300 font-bold text-amber-950 text-xs transition-colors inline-flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-900" />
              <span>ชลประทาน (ระดับน้ำ) 1460</span>
            </a>
            <a href="tel:1567" className="px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-300 font-bold text-amber-950 text-xs transition-colors inline-flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-900" />
              <span>ศูนย์ดำรงธรรม 1567</span>
            </a>
          </div>
        </div>
      </div>

      {/* TRACKING MODE VIEW */}
      {activeMode === 'track' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0A2540]">ค้นหาสถานะการตรวจสอบรายงาน</h2>
            <p className="text-sm text-slate-500 mt-1">กรอกรหัสรายงาน (เช่น FT-2026-XXXXXX หรือ obs_...) เพื่อติดตามความคืบหน้า</p>
          </div>

          <form onSubmit={handleTrackReport} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={trackingIdInput}
                onChange={(e) => setTrackingIdInput(e.target.value)}
                placeholder="ระบุรหัสรายงาน เช่น FT-2026-A1B2C3"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none font-mono min-h-[44px]"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={trackingLoading}
              disabled={!trackingIdInput.trim()}
              className="shrink-0"
            >
              ค้นหาสถานะ
            </Button>
          </form>

          {trackingError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-2xl flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{trackingError}</span>
            </div>
          )}

          {trackingResult && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">รหัสรายงาน</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{trackingResult.report_id}</span>
                </div>
                <Badge variant="live" pulse>
                  {trackingResult.public_status_th}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  <span className="text-xs text-slate-500 block">หมวดหมู่ข้อสังเกต</span>
                  <span className="font-semibold text-slate-900">{trackingResult.category}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">พื้นที่สังเกตการณ์</span>
                  <span className="font-semibold text-slate-900">
                    ต.{trackingResult.subdistrict || 'ในพื้นที่'} อ.{trackingResult.district || 'กบินทร์บุรี'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">เวลาที่แจ้งเรื่อง</span>
                  <span className="font-semibold text-slate-900">{trackingResult.created_at_human || 'เมื่อเร็วๆ นี้'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">ระดับการตรวจสอบ (Verification Level)</span>
                  <span className="font-semibold text-slate-900">{trackingResult.verification_level_th || 'รอการตรวจสอบ'}</span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/60 text-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">คำอธิบายสถานะ</span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {trackingResult.public_description_th}
                </p>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>การคุ้มครองความเป็นส่วนตัว: ไม่มีการเปิดเผยข้อมูลส่วนบุคคลหรือพิกัดที่พักอาศัยบนหน้าติดตามสถานะสาธารณะ</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE REPORT VIEW */}
      {activeMode === 'create' && (
        <>
          {draftStatus === 'SUBMITTED' ? (
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-200/90 shadow-2xs text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0A2540]">
                บันทึกรายงานข้อสังเกตเรียบร้อยแล้ว
              </h2>
              <p className="text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                {resultMessage}
              </p>

              {submittedReportId && (
                <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl max-w-lg mx-auto text-center space-y-2.5">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">รหัสติดตามรายงานของคุณ</span>
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white rounded-xl border border-emerald-300 font-mono text-lg font-bold text-slate-900 shadow-2xs">
                    <span>{submittedReportId}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(submittedReportId)}
                      title="คัดลอกรหัส"
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    กรุณาจดจำหรือคัดลอกรหัสนี้ไว้ เพื่อใช้ติดตามสถานะการคัดกรองและการตรวจสอบข้อเท็จจริงของเจ้าหน้าที่
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingIdInput(submittedReportId);
                        setActiveMode('track');
                        handleTrackReport(undefined, submittedReportId);
                      }}
                      className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" /> ตรวจสอบสถานะรายงานนี้ทันที
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-2xl max-w-lg mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed text-left border border-slate-200/80">
                <strong>นโยบายความโปร่งใส:</strong> ข้อมูลของคุณถูกจัดเก็บในหมวด <span className="font-bold text-amber-700">รายงานจากประชาชน (COMMUNITY)</span> ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน และพิกัดจะถูกปัดเศษระดับตำบลเพื่อปกป้องความปลอดภัยของคุณ
              </div>

              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleReset}
                >
                  ส่งรายงานเหตุการณ์อื่น
                </Button>
                <Link to="/cases">
                  <Button
                    variant="primary"
                    size="md"
                    iconRight={<ChevronRight className="w-4 h-4" />}
                  >
                    ดูเหตุการณ์ที่กำลังติดตาม
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
              
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-2xl flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: Select Observation Category */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#0A2540]">ขั้นตอนที่ 1: เลือกสิ่งที่ท่านพบเห็นในพื้นที่</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">เลือกหมวดหมู่ข้อสังเกตตรงตามสภาพความเป็นจริง</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {REPORT_CATEGORIES.map(cat => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#0284C7] bg-sky-50/60 ring-2 ring-[#0284C7]/20 shadow-2xs'
                              : 'border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base font-bold text-slate-900">{cat.label}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-slate-600 mt-1 leading-relaxed">{cat.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => setStep(2)}
                      iconRight={<ChevronRight className="w-4 h-4" />}
                      className="w-full sm:w-auto"
                    >
                      ถัดไป: ระบุตำแหน่ง
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Location */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#0A2540]">ขั้นตอนที่ 2: ระบุตำแหน่งที่พบเหตุการณ์</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      ระบบจะปัดเศษพิกัดระดับตำบลก่อนแสดงผลสู่สาธารณะเพื่อปกป้องความเป็นส่วนตัวของท่าน
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">อำเภอ *</label>
                      <select
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-semibold text-slate-900 min-h-[44px] focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none cursor-pointer"
                      >
                        {Object.keys(DISTRICT_COORDS).map(d => (
                          <option key={d} value={d}>อ.{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-1.5">ตำบล / บริเวณที่พบ</label>
                      <input
                        type="text"
                        value={subdistrict}
                        onChange={(e) => setSubdistrict(e.target.value)}
                        placeholder="เช่น ต.กบินทร์, ริมแม่น้ำพระปรง"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 min-h-[44px] focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      ความลึกน้ำโดยประมาณ (ซม.) ถ้ามี
                    </label>
                    <input
                      type="number"
                      value={waterDepth}
                      onChange={(e) => setWaterDepth(e.target.value)}
                      placeholder="เช่น 30"
                      className="w-full sm:w-1/2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 min-h-[44px] focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none"
                    />
                  </div>

                  <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl text-xs sm:text-sm text-sky-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#0284C7] mt-0.5 shrink-0" />
                    <span className="leading-relaxed">
                      พิกัดอ้างอิง: ละติจูด {latitude.toFixed(3)}, ลองจิจูด {longitude.toFixed(3)} (แปลงเป็นจุดกว้างระดับอนุภูมิภาคอัตโนมัติ ไม่ระบุตำแหน่งบ้าน)
                    </span>
                  </div>

                  <div className="pt-4 flex gap-3 justify-between">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => setStep(1)}
                    >
                      ย้อนกลับ
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => setStep(3)}
                      iconRight={<ChevronRight className="w-4 h-4" />}
                    >
                      ถัดไป: ตรวจสอบ/ส่ง
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Review & Submit */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#0A2540]">ขั้นตอนที่ 3: ตรวจสอบข้อมูลและยืนยันการส่ง</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">แนบภาพถ่าย (ลบข้อมูล EXIF/GPS อัตโนมัติ) และบันทึกคำอธิบายข้อเท็จจริง</p>
                  </div>

                  {/* Photo Upload Box */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      ภาพถ่ายประกอบเหตุการณ์ (ถ้ามี)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center hover:bg-slate-50/60 transition-colors">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="report-photo-input"
                      />
                      <label htmlFor="report-photo-input" className="cursor-pointer block">
                        <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-sm sm:text-base font-semibold text-[#0284C7] block truncate">
                          {selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกภาพถ่ายจากอุปกรณ์'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1 block">
                          รองรับ JPG, PNG, WebP (สูงสุด 5MB, ระบบจะตัดข้อมูลระบุพิกัดกล้องออกทั้งหมด)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      คำอธิบายข้อสังเกตเพิ่มเติม (ข้อเท็จจริงเท่านั้น)
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="ระบุสิ่งที่พบเห็น เช่น ลักษณะการไหล สภาพของสีน้ำ กลิ่น หรือผลกระทบต่อสิ่งแวดล้อม (ห้ามใส่ข้อความกล่าวหาบุคคลหรือโรงงาน)"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 outline-none min-h-[96px] leading-relaxed"
                    />
                  </div>

                  {/* Summary Review */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs sm:text-sm space-y-1.5 text-slate-700">
                    <div><strong>สิ่งที่พบ:</strong> {category}</div>
                    <div><strong>พื้นที่:</strong> ต.{subdistrict || 'ไม่ระบุ'} อ.{district} จ.ปราจีนบุรี</div>
                    {waterDepth && <div><strong>ความลึกน้ำ:</strong> {waterDepth} ซม.</div>}
                  </div>

                  {/* Declaration Checkbox */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={declaration}
                        onChange={(e) => setDeclaration(e.target.checked)}
                        className="w-4 h-4 text-[#0284C7] rounded focus:ring-0 mt-0.5 shrink-0 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                        ฉันยืนยันว่าข้อมูลนี้เป็นสิ่งที่ฉันพบเห็นหรือมีหลักฐานประกอบ และไม่ได้ส่งข้อมูลเพื่อกล่าวหาบุคคลหรือองค์กรโดยไม่มีหลักฐาน
                      </span>
                    </label>
                  </div>

                  <div className="pt-4 flex gap-3 justify-between">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => setStep(2)}
                    >
                      ย้อนกลับ
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={draftStatus === 'SUBMITTING'}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      ส่งรายงานข้อสังเกต
                    </Button>
                  </div>
                </div>
              )}

            </form>
          )}
        </>
      )}

    </div>
  );
};
