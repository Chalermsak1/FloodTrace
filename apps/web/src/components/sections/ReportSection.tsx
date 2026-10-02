import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Upload, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Image as ImageIcon,
  RotateCw,
  X,
  FileText
} from 'lucide-react';

interface ReportSectionProps {
  onReportSubmitted: () => void;
  selectedDistrict: string;
}

type SubmissionState = 'DRAFT' | 'PENDING_UPLOAD' | 'SUBMITTING' | 'SUBMITTED' | 'FAILED';

const REPORT_CATEGORIES = [
  { id: 'water_color', label: 'น้ำเปลี่ยนสี' },
  { id: 'surface_sheen', label: 'คราบน้ำ / คราบบนผิว' },
  { id: 'unusual_odor', label: 'กลิ่นผิดปกติ' },
  { id: 'foam_sediment', label: 'ฟอง / ตะกอนผิดปกติ' },
  { id: 'fish_kill', label: 'สัตว์น้ำตาย' },
  { id: 'debris_waste', label: 'ขยะ / วัสดุผิดปกติ' },
  { id: 'flood_area', label: 'พื้นที่น้ำท่วม' },
  { id: 'other', label: 'อื่นๆ' },
];

const DRAFT_STORAGE_KEY = 'floodtrace_report_draft_v1';

export const ReportSection: React.FC<ReportSectionProps> = ({
  onReportSubmitted,
  selectedDistrict
}) => {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('water_color');
  const [district, setDistrict] = useState(selectedDistrict || 'กบินทร์บุรี');
  const [subdistrict, setSubdistrict] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Resilient State Machine: DRAFT, PENDING_UPLOAD, SUBMITTING, SUBMITTED, FAILED
  const [submissionState, setSubmissionState] = useState<SubmissionState>('DRAFT');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  // Restore draft from localStorage on initial load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedCategory) setSelectedCategory(parsed.selectedCategory);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.subdistrict) setSubdistrict(parsed.subdistrict);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.idempotencyKey) setIdempotencyKey(parsed.idempotencyKey);
        setHasSavedDraft(true);
      }
    } catch (e) {
      console.warn('Failed to parse saved report draft', e);
    }
  }, []);

  // Sync draft to localStorage when user edits
  useEffect(() => {
    if (submissionState === 'SUBMITTED') return;
    try {
      const draftObj = {
        selectedCategory,
        district,
        subdistrict,
        description,
        idempotencyKey: idempotencyKey || `ft_idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftObj));
      if (!idempotencyKey) {
        setIdempotencyKey(draftObj.idempotencyKey);
      }
    } catch (e) {
      console.warn('Failed to save draft to localStorage', e);
    }
  }, [selectedCategory, district, subdistrict, description, submissionState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const executeSubmission = async () => {
    setErrorMsg(null);
    const key = idempotencyKey || `ft_idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setIdempotencyKey(key);

    try {
      let photoUrl: string | undefined = undefined;

      // 1. Photo upload with EXIF stripping
      if (selectedFile) {
        setSubmissionState('PENDING_UPLOAD');
        const formData = new FormData();
        formData.append('file', selectedFile);
        try {
          const uploadRes = await fetch('/api/v1/reports/upload-photo', {
            method: 'POST',
            body: formData
          });
          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            photoUrl = uploadJson.photo_url;
          }
        } catch (e) {
          console.warn('Photo upload skipped or failed, proceeding with report submission', e);
        }
      }

      // 2. Submit citizen report with Idempotency Key
      setSubmissionState('SUBMITTING');
      const payload = {
        reporter_name: 'Citizen Observation',
        reporter_role: 'Resident',
        latitude: district === 'กบินทร์บุรี' ? 13.99 : 14.05,
        longitude: district === 'กบินทร์บุรี' ? 101.72 : 101.37,
        district: district,
        subdistrict: subdistrict || 'ทั่วไป',
        water_depth_cm: 25,
        water_flow_speed: 'MODERATE',
        contamination_signs: [selectedCategory],
        description: description || undefined,
        photo_url: photoUrl,
        idempotency_key: key
      };

      const res = await fetch('/api/v1/reports/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': key
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const serverMsg = errorJson?.error?.message || errorJson?.detail;
        throw new Error(serverMsg || 'ไม่สามารถส่งรายงานได้ กรุณากดลองส่งอีกครั้ง');
      }

      // Success: Clear local draft
      setSubmissionState('SUBMITTED');
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasSavedDraft(false);
      onReportSubmitted();
    } catch (err: any) {
      setSubmissionState('FAILED');
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณากดลองส่งอีกครั้ง');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSubmission();
  };

  const handleReset = () => {
    setStep(1);
    setSelectedCategory('water_color');
    setDescription('');
    setSelectedFile(null);
    setSubmissionState('DRAFT');
    setErrorMsg(null);
    setIdempotencyKey(`ft_idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasSavedDraft(false);
  };

  return (
    <div id="section-report" className="ft-card p-4 sm:p-5 flex flex-col justify-between h-full text-[#0B243D]">
      
      {/* Header with Section 3 Badge */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-[#C4C7D1]/70">
          <div className="flex items-center gap-2.5">
            <div className="ft-badge-num">3</div>
            <div>
              <h3 className="font-bold text-base text-[#0B243D] leading-tight">
                รายงานเหตุการณ์ (Report)
              </h3>
              <p className="text-[11px] text-[#717F8F]">
                ให้ประชาชนรายงานสิ่งที่พบแบบปลอดภัยและถูกกฎหมาย
              </p>
            </div>
          </div>
          {hasSavedDraft && submissionState === 'DRAFT' && (
            <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <FileText className="w-3 h-3" /> ร่างที่บันทึกไว้
            </span>
          )}
        </div>

        {/* Stepper (1 ข้อมูลเหตุการณ์ -> 2 ระบุตำแหน่ง -> 3 ส่งรายงาน) */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 1 ? 'text-[#0C57C7]' : 'text-[#717F8F]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 1 ? 'bg-[#0C57C7]' : 'bg-slate-300'}`}>
              1
            </span>
            <span>ข้อมูลเหตุการณ์</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#C4C7D1]" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 2 ? 'text-[#0C57C7]' : 'text-[#717F8F]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 2 ? 'bg-[#0C57C7]' : 'bg-slate-300'}`}>
              2
            </span>
            <span>ระบุตำแหน่ง</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#C4C7D1]" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 3 ? 'text-[#0C57C7]' : 'text-[#717F8F]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 3 ? 'bg-[#0C57C7]' : 'bg-slate-300'}`}>
              3
            </span>
            <span>ส่งรายงาน</span>
          </div>
        </div>

        {submissionState === 'SUBMITTED' ? (
          /* Success Confirmation Screen */
          <div className="mt-6 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-[#0B243D]">ส่งรายงานเรียบร้อยแล้ว</h4>
            <p className="text-xs text-[#717F8F] mt-1 max-w-xs mx-auto leading-relaxed">
              ข้อมูลของท่านถูกบันทึกในสถานะ <span className="font-semibold text-orange-600">CITIZEN_REPORTED (UNVERIFIED)</span> เพื่อรอการตรวจสอบและส่งต่อให้หน่วยงานที่เกี่ยวข้อง
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 px-4 py-2 bg-[#0C57C7] hover:bg-[#103D76] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              รายงานเหตุการณ์เพิ่มเติม
            </button>
          </div>
        ) : (
          /* Step-by-step Form Content */
          <div className="mt-3.5">
            {step === 1 && (
              <div>
                <label className="text-xs font-bold text-[#0B243D] block mb-2">
                  คุณพบสิ่งใด? (เลือกข้อสังเกต)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-[#0C57C7] text-[#0C57C7] shadow-sm'
                            : 'bg-white border-[#C4C7D1] text-[#0B243D] hover:bg-slate-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#0B243D] block mb-1">
                    อำเภอที่พบเหตุการณ์
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-xs bg-white border border-[#C4C7D1] rounded-lg p-2 font-medium focus:ring-1 focus:ring-[#0C57C7]"
                  >
                    <option value="กบินทร์บุรี">อ.กบินทร์บุรี</option>
                    <option value="ศรีมหาโพธิ">อ.ศรีมหาโพธิ</option>
                    <option value="เมืองปราจีนบุรี">อ.เมืองปราจีนบุรี</option>
                    <option value="บ้านสร้าง">อ.บ้านสร้าง</option>
                    <option value="ประจันตคาม">อ.ประจันตคาม</option>
                    <option value="นาดี">อ.นาดี</option>
                    <option value="ศรีมโหสถ">อ.ศรีมโหสถ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0B243D] block mb-1">
                    ตำบล / จุดสังเกตใกล้เคียง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ต.ท่าตูม หรือ ใกล้สะพานข้ามแม่น้ำ"
                    value={subdistrict}
                    onChange={(e) => setSubdistrict(e.target.value)}
                    className="w-full text-xs bg-white border border-[#C4C7D1] rounded-lg p-2 placeholder-[#717F8F] focus:ring-1 focus:ring-[#0C57C7]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0B243D] block mb-1">
                    รายละเอียดเพิ่มเติม (ถ้ามี)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ระบุสิ่งที่พบเห็น เช่น สีของน้ำ กลิ่น หรือความผิดปกติ..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs bg-white border border-[#C4C7D1] rounded-lg p-2 placeholder-[#717F8F] focus:ring-1 focus:ring-[#0C57C7]"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#0B243D] block">
                  เพิ่มรูปภาพ (ไม่บังคับ)
                </label>

                <div className="p-3 border-2 border-dashed border-[#C4C7D1] rounded-xl bg-slate-50 text-center relative hover:bg-slate-100 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#0C57C7]">
                      <ImageIcon className="w-4 h-4" />
                      <span>{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-rose-500 hover:text-rose-700 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Upload className="w-5 h-5 text-[#0C57C7] mx-auto mb-1" />
                      <div className="text-xs font-semibold text-[#0B243D]">+ อัปโหลดรูปถ่าย</div>
                      <div className="text-[10px] text-[#717F8F]">รองรับ JPG, PNG สูงสุด 5MB</div>
                    </div>
                  )}
                </div>

                {/* Privacy Safeguard Notice */}
                <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-[11px] text-[#0B243D] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0C57C7] shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    ระบบจะปกป้องข้อมูลตำแหน่งและข้อมูลส่วนบุคคล (EXIF & GPS) จากภาพก่อนนำไปแสดงในระบบสาธารณะ
                  </p>
                </div>

                {submissionState === 'FAILED' && errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={executeSubmission}
                      className="self-end px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>ลองส่งใหม่อีกครั้ง</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Stepper Navigation Buttons */}
      {submissionState !== 'SUBMITTED' && (
        <div className="mt-4 pt-3 border-t border-[#C4C7D1]/70 flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-3 py-2 border border-[#C4C7D1] rounded-lg text-xs font-semibold text-[#0B243D] hover:bg-slate-50 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ย้อนกลับ</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 bg-[#0C57C7] hover:bg-[#103D76] text-white rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto shadow-sm"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submissionState === 'SUBMITTING' || submissionState === 'PENDING_UPLOAD'}
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#0C57C7] hover:bg-[#103D76] disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {submissionState === 'PENDING_UPLOAD' ? 'กำลังอัปโหลดรูป...' :
                 submissionState === 'SUBMITTING' ? 'กำลังส่งข้อมูล...' : 
                 submissionState === 'FAILED' ? 'ลองส่งอีกครั้ง' : 'ส่งรายงาน'}
              </span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
