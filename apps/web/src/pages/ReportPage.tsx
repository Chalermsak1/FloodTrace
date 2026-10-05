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
  Copy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EvidenceLabel } from '../components/ui/EvidenceLabel';

const REPORT_CATEGORIES = [
  { id: 'น้ำเปลี่ยนสี', label: 'น้ำเปลี่ยนสี', desc: 'น้ำมีสีดำ คล้ำ เขียวข้น หรือมีตะกอนขุ่นผิดปกติ' },
  { id: 'คราบบนผิวน้ำ', label: 'คราบบนผิวน้ำ', desc: 'พบคราบน้ำมัน คราบเงาสะท้อน หรือฟิล์มลอยบนผิวน้ำ' },
  { id: 'กลิ่นผิดปกติ', label: 'กลิ่นผิดปกติ', desc: 'มีกลิ่นเหม็นไหม้ กลิ่นสารเคมี หรือกลิ่นฉุนรุนแรง' },
  { id: 'ฟอง / ตะกอนผิดปกติ', label: 'ฟอง / ตะกอนผิดปกติ', desc: 'มีฟองขาวหนาแน่นสะสมผิดธรรมชาติ หรือมีตะกอนตกค้าง' },
  { id: 'สัตว์น้ำตาย', label: 'สัตว์น้ำตาย', desc: 'พบปลาหรือสัตว์น้ำลอยตายผิดสังเกตเป็นจำนวนมาก' },
  { id: 'ขยะ / วัสดุผิดปกติ', label: 'ขยะ / วัสดุผิดปกติ', desc: 'พบเศษวัสดุ กากของเสีย หรือภาชนะบรรจุสิ่งของลอยในน้ำ' },
  { id: 'อื่น ๆ', label: 'ข้อสังเกตอื่น ๆ', desc: 'ข้อสังเกตสภาพแวดล้อมทางน้ำอื่นๆ ที่ควรเฝ้าระวัง' }
];

const REPORT_DISTRICTS = ['กบินทร์บุรี', 'ศรีมหาโพธิ', 'เมืองปราจีนบุรี', 'บ้านสร้าง', 'ประจันตคาม', 'นาดี', 'ศรีมโหสถ'];

type DraftStatus = 'DRAFT' | 'PENDING_UPLOAD' | 'SUBMITTING' | 'SUBMITTED' | 'FAILED';

export const ReportPage: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [category, setCategory] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [subdistrict, setSubdistrict] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [description, setDescription] = useState<string>('');
  const [waterDepth, setWaterDepth] = useState<string>('');
  const [declaration, setDeclaration] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('DRAFT');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tracking state
  const [activeMode, setActiveMode] = useState<'create' | 'track'>('create');
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
    setLatitude(null);
    setLongitude(null);
    setLocationStatus('ระบุตำแหน่งที่พบใหม่หลังเปลี่ยนอำเภอ');
    setErrorMessage(null);
  };

  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }
    setLocationStatus('กำลังขอตำแหน่งจากอุปกรณ์');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setErrorMessage(null);
        setLocationStatus('ได้ตำแหน่งจากอุปกรณ์แล้ว โปรดตรวจสอบอำเภอก่อนส่ง');
      },
      () => setLocationStatus('ไม่สามารถอ่านตำแหน่งจากอุปกรณ์ได้ ระบุตำแหน่งด้วยตนเองได้'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadedFilename(null);
      setErrorMessage(null);
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
          setDraftStatus('FAILED');
          setErrorMessage('อัปโหลดภาพไม่สำเร็จ คุณยังส่งรายงานโดยไม่แนบภาพได้');
        }
      } catch (err) {
        console.warn('Photo upload fallback:', err);
        setUploadedFilename(null);
        setDraftStatus('FAILED');
        setErrorMessage('อัปโหลดภาพไม่สำเร็จ คุณยังส่งรายงานโดยไม่แนบภาพได้');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declaration) {
      setErrorMessage('กรุณากดยืนยันคำรับรองก่อนส่งข้อมูล');
      return;
    }
    if (!category || !REPORT_DISTRICTS.includes(district) || latitude === null || longitude === null) {
      setErrorMessage('กรุณาเลือกสิ่งที่พบ อำเภอ และระบุตำแหน่งจริงก่อนส่งรายงาน');
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
          ...(subdistrict.trim() ? { subdistrict: subdistrict.trim() } : {}),
          latitude,
          longitude,
          description: description.trim(),
          photo_filename: uploadedFilename,
          ...(waterDepth.trim() ? { water_depth_cm: parseFloat(waterDepth) } : {}),
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
    setCategory('');
    setDistrict('');
    setSubdistrict('');
    setLatitude(null);
    setLongitude(null);
    setWaterDepth('');
    setLocationStatus('');
    setDescription('');
    setSelectedFile(null);
    setUploadedFilename(null);
    setDeclaration(false);
    setDraftStatus('DRAFT');
    setSubmittedReportId(null);
    setResultMessage(null);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-0 py-4 space-y-4">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <EvidenceLabel family="COMMUNITY" detail="ข้อสังเกต" />
          </div>
          <div className="sr-only">
            <Eye className="w-4 h-4" />
            ระบบรายงานเหตุการณ์ภาคประชาชน (Community Observation Flow)
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            รายงานและติดตามข้อสังเกตสภาพน้ำ
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed max-w-2xl">
            ร่วมเฝ้าระวังพื้นที่จังหวัดปราจีนบุรีโดยการรายงานข้อเท็จจริงที่พบเห็น ข้อมูลพิกัดละเอียดจะถูกจัดเก็บอย่างปลอดภัยและปัดเศษเพื่อปกป้องความเป็นส่วนตัว
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveMode('create')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeMode === 'create'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            แจ้งข้อสังเกตใหม่
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('track')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeMode === 'track'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            ติดตามสถานะรายงาน
          </button>
        </div>

        {/* 3-Step Wizard Indicator (Only when creating report and not submitted) */}
        {activeMode === 'create' && draftStatus !== 'SUBMITTED' && (
          <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-100 text-sm sm:text-base font-semibold">
            <div className={`p-3 rounded-xl border text-center transition-all min-h-[48px] flex items-center justify-center ${
              step === 1 ? 'bg-[#0C57C7] text-white border-[#0C57C7]' : 'bg-slate-50 text-slate-600 border-slate-200/60'
            }`}>
              1. เลือกสิ่งที่พบ
            </div>
            <div className={`p-3 rounded-xl border text-center transition-all min-h-[48px] flex items-center justify-center ${
              step === 2 ? 'bg-[#0C57C7] text-white border-[#0C57C7]' : 'bg-slate-50 text-slate-600 border-slate-200/60'
            }`}>
              2. ระบุตำแหน่ง
            </div>
            <div className={`p-3 rounded-xl border text-center transition-all min-h-[48px] flex items-center justify-center ${
              step === 3 ? 'bg-[#0C57C7] text-white border-[#0C57C7]' : 'bg-slate-50 text-slate-600 border-slate-200/60'
            }`}>
              3. ตรวจสอบและส่ง
            </div>
          </div>
        )}
      </div>

      {/* TRACKING MODE VIEW */}
      {activeMode === 'track' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">ค้นหาสถานะการตรวจสอบรายงาน</h2>
            <p className="text-sm text-slate-500 mt-1">กรอกรหัสรายงาน (เช่น FT-2026-XXXXXX หรือ obs_...) เพื่อติดตามความคืบหน้า</p>
          </div>

          <form onSubmit={handleTrackReport} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={trackingIdInput}
                onChange={(e) => setTrackingIdInput(e.target.value)}
                placeholder="ระบุรหัสรายงาน เช่น FT-2026-A1B2C3"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:bg-white focus:border-[#0C57C7] outline-none font-mono"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <button
              type="submit"
              disabled={trackingLoading || !trackingIdInput.trim()}
              className="px-6 py-3 bg-[#0C57C7] hover:bg-[#103D76] disabled:bg-slate-300 text-white rounded-xl text-base font-semibold min-h-[48px] transition-colors shrink-0"
            >
              {trackingLoading ? 'กำลังตรวจสอบ...' : 'ค้นหาสถานะ'}
            </button>
          </form>

          {trackingError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-2xl flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{trackingError}</span>
            </div>
          )}

          {trackingResult && (
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">รหัสรายงาน</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{trackingResult.report_id}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0C57C7] font-semibold text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#0C57C7] animate-pulse"></span>
                  {trackingResult.public_status_th}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  <span className="text-xs text-slate-500 block">หมวดหมู่ข้อสังเกต</span>
                  <span className="font-semibold text-slate-900">{trackingResult.category}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">พื้นที่สังเกตการณ์</span>
                  <span className="font-semibold text-slate-900">
                    ต.{trackingResult.subdistrict || 'ไม่ระบุ'} อ.{trackingResult.district || 'ไม่ระบุ'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">เวลาที่แจ้งเรื่อง</span>
                  <span className="font-semibold text-slate-900">{trackingResult.created_at_human || 'ไม่มีข้อมูลเวลา'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">ระดับการตรวจสอบ (Verification Level)</span>
                  <span className="font-semibold text-slate-900">{trackingResult.verification_level_th || 'ไม่สามารถยืนยันได้'}</span>
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
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-200 shadow-sm text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                บันทึกรายงานข้อสังเกตเรียบร้อยแล้ว
              </h2>
              <p className="text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
                {resultMessage}
              </p>

              {submittedReportId && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl max-w-lg mx-auto text-center space-y-2">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">รหัสติดตามรายงานของคุณ</span>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-emerald-300 font-mono text-lg font-bold text-slate-900 shadow-xs">
                    <span>{submittedReportId}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(submittedReportId)}
                      title="คัดลอกรหัส"
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    กรุณาจดจำหรือคัดลอกรหัสนี้ไว้ เพื่อใช้ติดตามสถานะการคัดกรองและการตรวจสอบข้อเท็จจริงของเจ้าหน้าที่
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingIdInput(submittedReportId);
                        setActiveMode('track');
                        handleTrackReport(undefined, submittedReportId);
                      }}
                      className="text-xs font-semibold text-[#0C57C7] hover:underline inline-flex items-center gap-1"
                    >
                      <Search className="w-3.5 h-3.5" /> ตรวจสอบสถานะรายงานนี้ทันที
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-2xl max-w-lg mx-auto text-sm text-slate-600 leading-relaxed text-left border border-slate-100">
                <strong>นโยบายความโปร่งใส:</strong> ข้อมูลของคุณถูกจัดเก็บในหมวด <span className="font-bold text-amber-700">รายงานจากประชาชน (COMMUNITY)</span> ยังไม่ถือเป็นผลยืนยันจากหน่วยงาน และพิกัดจะถูกปัดเศษระดับตำบลเพื่อปกป้องความปลอดภัยของคุณ
              </div>
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-base font-semibold min-h-[48px]"
                >
                  ส่งรายงานเหตุการณ์อื่น
                </button>
                <Link
                  to="/cases"
                  className="px-6 py-3 bg-[#0C57C7] hover:bg-[#103D76] text-white rounded-xl text-base font-semibold min-h-[48px] flex items-center gap-2"
                >
                  ดูเหตุการณ์ที่กำลังติดตาม <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-2xl flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Select Observation Category */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">ขั้นตอนที่ 1: เลือกสิ่งที่ท่านพบเห็นในพื้นที่</h2>
                <p className="text-sm text-slate-500 mt-1">เลือกหมวดหมู่ข้อสังเกตตรงตามสภาพความเป็นจริง</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {REPORT_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setCategory(cat.id); setErrorMessage(null); }}
                    className={`p-4 rounded-2xl text-left border transition-all min-h-[72px] flex flex-col justify-center ${
                      category === cat.id
                        ? 'border-[#0C57C7] bg-blue-50/60 shadow-xs'
                        : 'border-slate-200/80 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-base font-bold text-slate-900">{cat.label}</span>
                    <span className="text-sm text-slate-600 mt-1 leading-normal">{cat.desc}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!category}
                  className="px-6 py-3 bg-[#0C57C7] hover:bg-[#103D76] disabled:bg-slate-300 text-white rounded-xl text-base font-semibold min-h-[48px] flex items-center gap-2 shadow-xs"
                >
                  ถัดไป: ระบุตำแหน่ง <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">ขั้นตอนที่ 2: ระบุตำแหน่งที่พบเหตุการณ์</h2>
                <p className="text-sm text-slate-500 mt-1">
                  ระบบจะปัดเศษพิกัดระดับตำบลก่อนแสดงผลสู่สาธารณะเพื่อปกป้องความเป็นส่วนตัวของท่าน
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-slate-800 mb-1.5">อำเภอ *</label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-900 min-h-[48px] focus:bg-white focus:border-[#0C57C7] outline-none"
                  >
                    <option value="">เลือกอำเภอ</option>
                    {REPORT_DISTRICTS.map(d => (
                      <option key={d} value={d}>อ.{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-semibold text-slate-800 mb-1.5">ตำบล / บริเวณที่พบ</label>
                  <input
                    type="text"
                    value={subdistrict}
                    onChange={(e) => setSubdistrict(e.target.value)}
                    placeholder="เช่น ต.กบินทร์, ริมแม่น้ำพระปรง"
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 min-h-[48px] focus:bg-white focus:border-[#0C57C7] outline-none"
                  />
                </div>
              </div>

              <section className="space-y-3 rounded-xl border border-slate-200 p-4" aria-labelledby="report-location-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 id="report-location-title" className="font-semibold text-slate-900">ตำแหน่งที่พบ</h3>
                    <p className="text-sm text-slate-600">ใช้ตำแหน่งอุปกรณ์โดยสมัครใจ หรือกรอกพิกัดที่ทราบเอง</p>
                  </div>
                  <button type="button" onClick={handleUseDeviceLocation} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-[#063B70] hover:bg-slate-50">
                    ใช้ตำแหน่งอุปกรณ์
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-slate-700">ละติจูด
                    <input type="number" inputMode="decimal" step="any" value={latitude ?? ''} onChange={(event) => { setLatitude(event.target.value === '' ? null : Number(event.target.value)); setLocationStatus('ระบุตำแหน่งด้วยตนเอง'); setErrorMessage(null); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">ลองจิจูด
                    <input type="number" inputMode="decimal" step="any" value={longitude ?? ''} onChange={(event) => { setLongitude(event.target.value === '' ? null : Number(event.target.value)); setLocationStatus('ระบุตำแหน่งด้วยตนเอง'); setErrorMessage(null); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base" />
                  </label>
                </div>
                <p role="status" className="text-sm text-slate-600">{locationStatus || (latitude !== null && longitude !== null ? 'ระบุตำแหน่งแล้ว' : 'ยังไม่ได้ระบุตำแหน่ง')}</p>
                <p className="text-xs text-slate-500">พิกัดที่ส่งใช้เพื่อบันทึกรายงานส่วนตัว ระบบแสดงตำแหน่งทั่วไปแก่สาธารณะตามขอบเขตที่อนุมัติ</p>
              </section>

              <div>
                <label className="block text-base font-semibold text-slate-800 mb-1.5">
                  ความลึกน้ำโดยประมาณ (ซม.) ถ้ามี
                </label>
                <input
                  type="number"
                  value={waterDepth}
                  onChange={(e) => setWaterDepth(e.target.value)}
                  placeholder="เช่น 30"
                  className="w-full sm:w-1/2 px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 min-h-[48px] focus:bg-white focus:border-[#0C57C7] outline-none"
                />
              </div>

              <div className="p-3.5 bg-sky-50 border border-sky-200/60 rounded-xl text-sm text-sky-900 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#0C57C7] mt-0.5 shrink-0" />
                <span className="leading-relaxed">{latitude !== null && longitude !== null ? 'ระบุตำแหน่งแล้ว' : 'ยังไม่ได้ระบุตำแหน่งจริง'} พิกัดแน่นอนจะไม่แสดงในข้อมูลสาธารณะ</span>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-base font-semibold min-h-[48px]"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!REPORT_DISTRICTS.includes(district) || latitude === null || longitude === null}
                  className="px-6 py-3 bg-[#0C57C7] hover:bg-[#103D76] disabled:bg-slate-300 text-white rounded-xl text-base font-semibold min-h-[48px] flex items-center gap-2 shadow-xs"
                >
                  ถัดไป: ตรวจสอบและส่ง <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">ขั้นตอนที่ 3: ตรวจสอบข้อมูลและยืนยันการส่ง</h2>
                <p className="text-sm text-slate-500 mt-1">แนบภาพถ่าย (ลบข้อมูล EXIF/GPS อัตโนมัติ) และบันทึกคำอธิบายข้อเท็จจริง</p>
              </div>

              {/* Photo Upload Box */}
              <div>
                <label className="block text-base font-semibold text-slate-800 mb-1.5">
                  ภาพถ่ายประกอบเหตุการณ์ (ถ้ามี)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="report-photo-input"
                  />
                  <label htmlFor="report-photo-input" className="cursor-pointer block">
                    <Camera className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                    <span className="text-base font-semibold text-[#0C57C7] block">
                      {selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกภาพถ่ายจากอุปกรณ์'}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 mt-1 block">
                      รองรับ JPG, PNG, WebP (สูงสุด 5MB, ระบบจะตัดข้อมูลระบุพิกัดกล้องออกทั้งหมด)
                    </span>
                  </label>
                  <p role="status" className="mt-3 text-sm text-slate-600">{draftStatus === 'PENDING_UPLOAD' ? 'กำลังอัปโหลดภาพ' : uploadedFilename ? 'ภาพพร้อมแนบในรายงาน' : selectedFile ? 'อัปโหลดไม่สำเร็จ ภาพจะไม่แนบ' : 'ยังไม่ได้แนบภาพ'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-base font-semibold text-slate-800 mb-1.5">
                  คำอธิบายข้อสังเกตเพิ่มเติม (ข้อเท็จจริงเท่านั้น)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุสิ่งที่พบเห็น เช่น ลักษณะการไหล สภาพของสีน้ำ กลิ่น หรือผลกระทบต่อสิ่งแวดล้อม (ห้ามใส่ข้อความกล่าวหาบุคคลหรือโรงงาน)"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:bg-white focus:border-[#0C57C7] outline-none min-h-[96px] leading-relaxed"
                />
              </div>

              {/* Summary Review */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-sm space-y-1.5 text-slate-700">
                <div><strong>สิ่งที่พบ:</strong> {category}</div>
                <div><strong>พื้นที่:</strong> {subdistrict ? `ต.${subdistrict} ` : ''}อ.{district} จ.ปราจีนบุรี</div>
                {waterDepth && <div><strong>ความลึกน้ำ:</strong> {waterDepth} ซม.</div>}
              </div>

              {/* Declaration Checkbox */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration}
                    onChange={(e) => setDeclaration(e.target.checked)}
                    className="w-5 h-5 text-[#0C57C7] rounded-md focus:ring-0 mt-0.5 shrink-0"
                  />
                  <span className="text-sm sm:text-base text-amber-950 font-medium leading-relaxed">
                    ฉันยืนยันว่าข้อมูลนี้เป็นสิ่งที่ฉันพบเห็นหรือมีหลักฐานประกอบ และไม่ได้ส่งข้อมูลเพื่อกล่าวหาบุคคลหรือองค์กรโดยไม่มีหลักฐาน
                  </span>
                </label>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-base font-semibold min-h-[48px]"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={draftStatus === 'SUBMITTING'}
                  className="px-7 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-base font-semibold min-h-[48px] flex items-center gap-2 shadow-xs transition-colors"
                >
                  {draftStatus === 'SUBMITTING' ? 'กำลังส่งข้อมูล...' : 'ส่งรายงานข้อสังเกต'}
                </button>
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
