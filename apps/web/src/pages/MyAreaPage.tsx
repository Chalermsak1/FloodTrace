import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  Compass, 
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { FeedbackState } from '../components/ui/FeedbackState';
import { EvidenceLabel } from '../components/ui/EvidenceLabel';
import {
  fetchDistrictSummary,
  formatSummaryCount,
  getSummaryText,
  type DistrictSummaryState,
  type PublicAreaSummary,
} from './myAreaSummary';

const ALL_DISTRICTS = [
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
  'ประจันตคาม',
  'นาดี',
  'ศรีมโหสถ'
];

export const MyAreaPage: React.FC = () => {
  // Followed districts stored in localStorage
  const [savedDistricts, setSavedDistricts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ruwaigon_followed_areas');
      if (!stored) return [];
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? [...new Set(parsed.filter((item): item is string => typeof item === 'string' && ALL_DISTRICTS.includes(item)))] : [];
    } catch {
      return [];
    }
  });

  const [districtSummaries, setDistrictSummaries] = useState<Record<string, DistrictSummaryState>>({});
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const addAreaTriggerRef = useRef<HTMLButtonElement>(null);
  const addAreaDialogRef = useRef<HTMLDivElement>(null);
  const [selectedToAdd, setSelectedToAdd] = useState<string>('เมืองปราจีนบุรี');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ruwaigon_followed_areas', JSON.stringify(savedDistricts));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }, [savedDistricts]);

  // Fetch the sanitized public summary independently for every saved district.
  useEffect(() => {
    let active = true;
    setDistrictSummaries(Object.fromEntries(savedDistricts.map(district => [district, { status: 'loading' }])));

    Promise.all(savedDistricts.map(async district => [district, await fetchDistrictSummary(district)] as const))
      .then(entries => {
        if (active) setDistrictSummaries(Object.fromEntries(entries));
      });

    return () => { active = false; };
  }, [savedDistricts]);

  useEffect(() => {
    if (!showAddModal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => addAreaDialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex="0"]',
    );
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddModal(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    requestAnimationFrame(() => focusable()?.[0]?.focus());
    document.addEventListener('keydown', handleDialogKeys);
    return () => {
      document.removeEventListener('keydown', handleDialogKeys);
      previousFocus?.focus();
    };
  }, [showAddModal]);

  const handleAddArea = () => {
    if (!savedDistricts.includes(selectedToAdd)) {
      setSavedDistricts([...savedDistricts, selectedToAdd]);
    }
    setShowAddModal(false);
  };

  const handleRemoveArea = (d: string) => {
    setSavedDistricts(savedDistricts.filter(item => item !== d));
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'สูงมาก') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (priority === 'สูง') return 'bg-red-50 text-red-700 border-red-200';
    if (priority === 'ปานกลาง') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const unavailable = 'ไม่มีข้อมูล';
  const field = (label: string, value: React.ReactNode) => (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="break-words [overflow-wrap:anywhere] text-sm text-slate-700">{value}</dd>
    </div>
  );

  return (
    <div className="rw-page-shell space-y-5">
      
      {/* Page Header */}
      <PageHeader
        eyebrow="บันทึกไว้ในอุปกรณ์นี้"
        title="พื้นที่ของฉัน"
        description="เลือกอำเภอในจังหวัดปราจีนบุรีเพื่อบันทึกไว้ดูข้อมูลที่ระบบรายงานได้ พร้อมสถานะและข้อจำกัด"
        actions={<button
          ref={addAreaTriggerRef}
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-base font-semibold transition-colors shadow-xs flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Plus className="w-5 h-5" />
          <span>เพิ่มพื้นที่</span>
        </button>}
      />

      {/* Followed Area Cards Grid (Section 25: Clean cards, NO large charts) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#063B70]">
          พื้นที่ที่กำลังติดตาม ({savedDistricts.length})
        </h2>

        {savedDistricts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-base">ยังไม่มีพื้นที่ที่ติดตาม</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              ใช้ปุ่ม “เพิ่มพื้นที่” เพื่อเลือกอำเภอที่ต้องการบันทึก
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedDistricts.map(districtName => {
              const state = districtSummaries[districtName] || { status: 'loading' };
              const summary = state.status === 'populated' ? state.summary : null;
              const priority = summary ? getSummaryText(summary.verification_priority) : null;
              const category = summary ? getSummaryText(summary.provenance?.category) : null;
              const supportedCategory = category === 'OFFICIAL' || category === 'COMMUNITY' || category === 'MODEL'
                ? category
                : null;

              return (
                <div
                  key={districtName}
                  className="min-w-0 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0 text-[#0C65E8]" />
                        <h3 className="min-w-0 break-words text-lg font-bold text-[#063B70]">
                          อำเภอ{summary?.district || districtName}
                        </h3>
                      </div>
                    </div>

                    <div className="ml-2 flex max-w-[48%] shrink-0 flex-col items-end gap-1">
                      {supportedCategory
                        ? <EvidenceLabel family={supportedCategory} detail={getSummaryText(summary?.provenance?.category_th) || undefined} />
                        : <span className="text-xs text-slate-500">ประเภทข้อมูล: {unavailable}</span>}
                      <span className={`max-w-full break-words rounded-full border px-3 py-1 text-right text-xs font-semibold ${getPriorityBadgeClass(priority || '')}`}>
                        {priority || unavailable}
                      </span>
                    </div>
                  </div>

                  {state.status === 'loading' && (
                    <div role="status" className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm text-slate-600">
                      กำลังโหลดสรุปของอำเภอนี้…
                    </div>
                  )}
                  {state.status === 'error' && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                      โหลดสรุปของอำเภอนี้ไม่สำเร็จ ข้อมูลยังไม่พร้อมใช้งาน
                    </div>
                  )}
                  {state.status === 'unavailable' && (
                    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                      สรุปของอำเภอนี้ไม่มีข้อมูลที่พร้อมแสดง
                    </div>
                  )}
                  {summary && (
                    <dl className="grid min-w-0 grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                      {field('สถานะพื้นที่', getSummaryText(summary.current_status) || unavailable)}
                      {field('จำนวนรายงานจากประชาชน', formatSummaryCount(summary.community_observation_count) ?? unavailable)}
                      {field('สรุปรายงานจากประชาชน', getSummaryText(summary.community_observation_summary) || unavailable)}
                      {field('สถานะน้ำท่วม', getSummaryText(summary.flood_status) || unavailable)}
                      {field('การเก็บตัวอย่างจากหน่วยงาน', getSummaryText(summary.official_sampling_status) || unavailable)}
                      {field('สรุปการเฝ้าระวังจากพยากรณ์', getSummaryText(summary.forecast_watch_summary) || unavailable)}
                      {field('ความเชื่อมั่นของข้อมูล', getSummaryText(summary.data_confidence) || unavailable)}
                      {field('ความสดใหม่ของข้อมูล', getSummaryText(summary.data_freshness) || unavailable)}
                      {field(
                        'ปรับปรุงล่าสุด',
                        <span className="inline-flex min-w-0 items-start gap-1.5">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>{getSummaryText(summary.last_updated) || unavailable}</span>
                        </span>,
                      )}
                    </dl>
                  )}

                  {/* Saved area actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> บันทึกในอุปกรณ์นี้</span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveArea(districtName)}
                        aria-label={`ยกเลิกติดตามอำเภอ${districtName}`}
                        className="min-h-11 min-w-11 flex items-center justify-center text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <Link
                        to={`/area-detail?district=${encodeURIComponent(districtName)}`}
                        className="inline-flex min-h-11 items-center gap-1 break-words py-1 px-2 text-sm font-semibold text-[#0C65E8] hover:text-[#063B70]"
                      >
                        <span>ดูรายละเอียด</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Recent Important Changes (Section 25) */}
      <FeedbackState kind="unavailable" title="การแจ้งเตือนยังไม่พร้อมให้บริการ" detail="การบันทึกพื้นที่เก็บไว้ในอุปกรณ์นี้ และไม่ได้เปิดการส่งการแจ้งเตือน" />

      {/* Add Area Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div ref={addAreaDialogRef} role="dialog" aria-modal="true" aria-labelledby="add-area-title" tabIndex={-1} className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-slate-200 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="add-area-title" className="font-bold text-lg text-[#063B70]">เพิ่มพื้นที่ติดตามใน จ.ปราจีนบุรี</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">เลือกอำเภอ:</label>
              <select
                value={selectedToAdd}
                onChange={(e) => setSelectedToAdd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] min-h-[44px]"
              >
                {ALL_DISTRICTS.map(d => (
                  <option key={d} value={d} disabled={savedDistricts.includes(d)}>
                    {d} {savedDistricts.includes(d) ? '(ติดตามอยู่แล้ว)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors min-h-[44px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddArea}
                className="px-5 py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
              >
                ยืนยันการเพิ่ม
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
