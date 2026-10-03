import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, CheckCircle2, WifiOff, RefreshCw, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

type DraftStatus = 'DRAFT' | 'PENDING_UPLOAD' | 'SUBMITTING' | 'SUBMITTED' | 'FAILED';

const DRAFT_STORAGE_KEY = 'floodtrace_citizen_report_draft_v1';

export const CitizenReportModal: React.FC<Props> = ({ isOpen, onClose, onReportSubmitted }) => {
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('กบินทร์บุรี');
  const [subdistrict, setSubdistrict] = useState('');
  const [lat, setLat] = useState(13.9912);
  const [lon, setLon] = useState(101.7231);
  const [depthCm, setDepthCm] = useState(25);
  const [flowSpeed, setFlowSpeed] = useState('SLOW');
  const [selectedSigns, setSelectedSigns] = useState<string[]>([]);
  const [desc, setDesc] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [status, setStatus] = useState<DraftStatus>('DRAFT');
  const [errorMessage, setErrorMessage] = useState('');

  // Restore saved local draft on modal open
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          setName(draft.name || '');
          setDistrict(draft.district || 'กบินทร์บุรี');
          setSubdistrict(draft.subdistrict || '');
          setDepthCm(draft.depthCm || 25);
          setFlowSpeed(draft.flowSpeed || 'SLOW');
          setSelectedSigns(draft.selectedSigns || []);
          setDesc(draft.desc || '');
          setIdempotencyKey(draft.idempotencyKey || `idemp_${Date.now()}`);
          if (draft.status === 'PENDING_UPLOAD') {
            setStatus('PENDING_UPLOAD');
          }
        } else {
          setIdempotencyKey(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        }
      } catch (e) {
        console.warn('Failed to parse saved report draft:', e);
      }
    }
  }, [isOpen]);

  // Auto-save local draft
  const saveDraftLocally = (forcedStatus?: DraftStatus) => {
    try {
      const draftData = {
        name,
        district,
        subdistrict,
        depthCm,
        flowSpeed,
        selectedSigns,
        desc,
        idempotencyKey,
        status: forcedStatus || status,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch (e) {
      console.warn('Failed to persist draft:', e);
    }
  };

  if (!isOpen) return null;

  const toggleSign = (sign: string) => {
    setSelectedSigns(prev => {
      const updated = prev.includes(sign) ? prev.filter(s => s !== sign) : [...prev, sign];
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus('SUBMITTING');

    // Section 35: Offline check before request
    if (!navigator.onLine) {
      setStatus('PENDING_UPLOAD');
      saveDraftLocally('PENDING_UPLOAD');
      setErrorMessage('ขณะนี้อุปกรณ์ออฟไลน์ บันทึกร่างรายงานไว้ในเครื่องแล้ว (Offline Draft) — จะส่งข้อมูลทันทีเมื่อออนไลน์');
      return;
    }

    try {
      const resp = await fetch('/api/v1/reports/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          reporter_name: name.trim() || 'พลเมืองปราจีนบุรี (ผู้สังเกตการณ์ในพื้นที่)',
          reporter_role: 'CITIZEN',
          latitude: Number(lat),
          longitude: Number(lon),
          district,
          subdistrict: subdistrict.trim() || 'ในพื้นที่',
          water_depth_cm: Number(depthCm),
          water_flow_speed: flowSpeed,
          contamination_signs: selectedSigns,
          description: desc.trim() || undefined,
          idempotency_key: idempotencyKey
        })
      });

      if (resp.ok) {
        setStatus('SUBMITTED');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setTimeout(() => {
          setStatus('DRAFT');
          onReportSubmitted();
          onClose();
        }, 1800);
      } else {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson?.error?.message || errJson?.detail || 'เกิดข้อผิดพลาดในการส่งข้อมูล';
        setErrorMessage(msg);
        setStatus('FAILED');
        saveDraftLocally('PENDING_UPLOAD');
      }
    } catch (err) {
      console.warn('Network submission failed:', err);
      setStatus('PENDING_UPLOAD');
      saveDraftLocally('PENDING_UPLOAD');
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ บันทึกร่างรายงานไว้ในอุปกรณ์เรียบร้อยแล้ว');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                แจ้งข้อมูลสถานการณ์น้ำภาคประชาชน
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Citizen Field Observation • ระบบรับรายงานข้อสังเกตในพื้นที่จริง
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Data Integrity & Privacy Safeguard Notice */}
        <div className="my-3.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm text-amber-200/90 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>นโยบายความถูกต้องของข้อมูลและการคุ้มครองความเป็นส่วนตัว</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-200/80">
            • ข้อมูลจะถูกจัดประเภทเป็น <strong>ข้อมูลจากประชาชน (CITIZEN_REPORTED)</strong> และมีสถานะเริ่มต้นเป็น <em>ยังไม่ได้รับการยืนยัน (UNVERIFIED)</em> จนกว่าจะได้รับการตรวจสอบภาคสนาม<br />
            • <strong>พิกัดที่พักอาศัยจะถูกแปลงเป็นพิกัดทั่วไป (~1.1 กม.)</strong> โดยอัตโนมัติ เพื่อคุ้มครองความเป็นส่วนตัวของผู้รายงาน
          </p>
        </div>

        {/* Offline / Pending Upload Banner */}
        {status === 'PENDING_UPLOAD' && (
          <div className="mb-3.5 p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-sm text-sky-200 flex items-start gap-2.5">
            <WifiOff className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <div className="flex-1 text-xs leading-relaxed">
              <strong className="text-sky-300">บันทึกร่างรายงานไว้ในอุปกรณ์แล้ว (Offline Draft):</strong>
              <p className="text-sky-200/80 mt-0.5">
                ข้อมูลถูกจัดเก็บในเครื่องอย่างปลอดภัย สามารถกดปุ่มส่งข้อมูลอีกครั้งเมื่ออุปกรณ์กลับมาเชื่อมต่อเครือข่าย
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-3.5 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        {status === 'SUBMITTED' ? (
          <div className="py-10 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-white">บันทึกข้อมูลรายงานเรียบร้อยแล้ว</h3>
            <p className="text-sm text-slate-300">
              ระบบได้สร้างรหัสติดตาม (Audit Trail) และเข้ารหัสคุ้มครองพิกัดความปลอดภัยแล้ว
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-200 text-sm sm:text-base font-semibold mb-1.5">
                  ชื่อผู้รายงาน (ระบุนามสมมุติได้)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); saveDraftLocally(); }}
                  placeholder="เช่น ประชาชน ต.ท่าตูม"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-base"
                />
              </div>
              <div>
                <label className="block text-slate-200 text-sm sm:text-base font-semibold mb-1.5">
                  อำเภอที่สังเกตการณ์
                </label>
                <select
                  value={district}
                  onChange={e => { setDistrict(e.target.value); saveDraftLocally(); }}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-base cursor-pointer"
                >
                  <option value="กบินทร์บุรี">อ.กบินทร์บุรี</option>
                  <option value="ศรีมหาโพธิ">อ.ศรีมหาโพธิ</option>
                  <option value="เมืองปราจีนบุรี">อ.เมืองปราจีนบุรี</option>
                  <option value="นาดี">อ.นาดี</option>
                  <option value="ประจันตคาม">อ.ประจันตคาม</option>
                  <option value="บ้านสร้าง">อ.บ้านสร้าง</option>
                  <option value="ศรีมโหสถ">อ.ศรีมโหสถ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-200 text-sm sm:text-base font-semibold mb-1.5">
                ตำบล / หมู่บ้าน / จุดสังเกต
              </label>
              <input
                type="text"
                value={subdistrict}
                onChange={e => { setSubdistrict(e.target.value); saveDraftLocally(); }}
                placeholder="เช่น ต.กบินทร์, ต.ท่าตูม, หมู่ 3 คลองระบายน้ำ..."
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-base"
              />
            </div>

            {/* Depth Slider */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-200 text-sm font-medium mb-2">
                <span>ระดับน้ำท่วมขังโดยประมาณ: <strong className="text-sky-400 text-base">{depthCm} ซม.</strong></span>
                <span className="text-slate-400 text-xs">
                  {depthCm >= 60 ? 'รถเล็กผ่านไม่ได้' : depthCm >= 30 ? 'ท่วมขังระดับทางเท้า' : 'ระดับข้อเท้า/ไหลผ่าน'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={depthCm}
                onChange={e => { setDepthCm(Number(e.target.value)); saveDraftLocally(); }}
                className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Contamination Signs (Section 32) */}
            <div>
              <label className="block text-slate-200 text-sm sm:text-base font-semibold mb-2">
                อาการผิดปกติทางสิ่งแวดล้อมที่สังเกตพบ (Environmental Signs)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'unusual_water_color', label: 'น้ำมีสีดำ / สีผิดธรรมชาติ' },
                  { id: 'unusual_odor', label: 'กลิ่นสารเคมี / กลิ่นฉุนผิดปกติ' },
                  { id: 'unusual_residue', label: 'คราบตะกอน / คราบฟิล์มผิวน้ำ' },
                  { id: 'foam_sediment', label: 'ฟองสารเคมี / ตะกอนหนาแน่น' },
                  { id: 'fish_death', label: 'พบปลาหรือสัตว์น้ำลอยตาย' },
                  { id: 'agricultural_impact', label: 'น้ำกระทบนาข้าว / บ่อเลี้ยงปลา' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { toggleSign(item.id); saveDraftLocally(); }}
                    className={`p-3 rounded-xl text-left border transition min-h-[48px] flex items-center ${
                      selectedSigns.includes(item.id)
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm leading-snug">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-200 text-sm sm:text-base font-semibold mb-1.5">
                รายละเอียดสภาพแวดล้อมเพิ่มเติม (Description)
              </label>
              <textarea
                rows={2}
                value={desc}
                onChange={e => { setDesc(e.target.value); saveDraftLocally(); }}
                placeholder="ระบุจุดสังเกต เช่น ใต้สะพานคลองสาขา หรือบริเวณคันกั้นน้ำ..."
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-base"
              />
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onClick={() => { saveDraftLocally('DRAFT'); onClose(); }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center gap-2 text-sm min-h-[46px]"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกร่าง</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition text-sm min-h-[46px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={status === 'SUBMITTING'}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/30 transition disabled:opacity-50 text-base min-h-[46px]"
                >
                  {status === 'SUBMITTING' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังส่ง...</span>
                    </>
                  ) : status === 'PENDING_UPLOAD' ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>ลองส่งใหม่อีกครั้ง</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งรายงาน</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
