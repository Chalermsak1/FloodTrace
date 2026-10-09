import React, { useState, useEffect } from 'react';
import {
  FileText,
  Globe,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  Share2,
  Layers,
  Activity,
  Droplets,
  CloudRain,
  ChevronRight,
  Database,
  Lock,
  Sparkles,
  Info
} from 'lucide-react';

interface StaffUserProps {
  currentRole: 'ADMIN' | 'REVIEWER' | 'OPERATOR' | 'READ_ONLY';
  currentUsername: string;
  getAuthHeaders: () => Record<string, string>;
}

interface EvidenceItem {
  id: string;
  source_platform: string;
  source_name: string;
  source_url: string;
  published_at?: string;
  observed_at?: string;
  retrieved_at: string;
  title_or_summary: string;
  description?: string;
  event_type: string;
  evidence_type: string;
  verification_status: string;
  publication_status: string;
  location_text?: string;
  district?: string;
  subdistrict?: string;
  latitude?: number;
  longitude?: number;
  location_precision: string;
  content_hash: string;
  submitter_notes?: string;
  provenance: any;
  created_at: string;
  updated_at: string;
  media_references?: any[];
  audit_logs?: any[];
}

export const ExternalEvidenceAdminView: React.FC<StaffUserProps> = ({
  currentRole,
  currentUsername,
  getAuthHeaders
}) => {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [publicationFilter, setPublicationFilter] = useState<string>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');

  // Modal states
  const [showIntakeModal, setShowIntakeModal] = useState<boolean>(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'correlation' | 'link_event' | 'review' | 'audit'>('details');

  // Intake Form State
  const [intakeForm, setIntakeForm] = useState({
    source_platform: 'ONLINE_NEWS',
    source_name: '',
    source_url: '',
    title_or_summary: '',
    description: '',
    event_type: 'ABNORMAL_WATER_COLOR',
    evidence_type: 'PHOTO',
    location_precision: 'DISTRICT',
    district: 'กบินทร์บุรี',
    subdistrict: '',
    location_text: '',
    latitude: '',
    longitude: '',
    published_at: '',
    observed_at: '',
    submitter_notes: '',
    media_url: ''
  });
  const [intakeSubmitting, setIntakeSubmitting] = useState<boolean>(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  // Review Form State
  const [reviewAction, setReviewAction] = useState<string>('ACCEPT');
  const [reviewPubStatus, setReviewPubStatus] = useState<string>('INTERNAL_ONLY');
  const [reviewReason, setReviewReason] = useState<string>('');
  const [reviewOfficialDoc, setReviewOfficialDoc] = useState<string>('');
  const [reviewLabSampleId, setReviewLabSampleId] = useState<string>('');
  const [reviewLabName, setReviewLabName] = useState<string>('');
  const [reviewLabDate, setReviewLabDate] = useState<string>('');
  const [reviewLabParam, setReviewLabParam] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Correlation & Event Link States
  const [correlations, setCorrelations] = useState<any | null>(null);
  const [corrLoading, setCorrLoading] = useState<boolean>(false);
  const [monitoringEvents, setMonitoringEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventLinkRole, setEventLinkRole] = useState<string>('SUPPORTING');
  const [eventLinkConfidence, setEventLinkConfidence] = useState<number>(0.8);
  const [linkSubmitting, setLinkSubmitting] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');

  const fetchEvidenceList = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/internal/external-evidence', {
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        const data = await resp.json();
        setEvidenceList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch external evidence list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoringEvents = async () => {
    try {
      const resp = await fetch('/api/internal/monitoring-events', {
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        const data = await resp.json();
        setMonitoringEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch monitoring events:', err);
    }
  };

  useEffect(() => {
    fetchEvidenceList();
    fetchMonitoringEvents();
  }, []);

  const fetchCorrelations = async (id: string) => {
    setCorrLoading(true);
    try {
      const resp = await fetch(`/api/internal/external-evidence/${id}/correlations`, {
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        const data = await resp.json();
        setCorrelations(data);
      }
    } catch (err) {
      console.error('Failed to fetch correlations:', err);
    } finally {
      setCorrLoading(false);
    }
  };

  const openEvidenceDetail = async (item: EvidenceItem) => {
    setSelectedEvidence(item);
    setActiveModalTab('details');
    setReviewAction('ACCEPT');
    setReviewPubStatus(item.publication_status || 'INTERNAL_ONLY');
    setReviewReason('');
    setReviewError(null);
    fetchCorrelations(item.id);

    // Fetch fresh detail with audit logs
    try {
      const resp = await fetch(`/api/internal/external-evidence/${item.id}`, {
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        const fullItem = await resp.json();
        setSelectedEvidence(fullItem);
      }
    } catch (err) {
      console.warn('Failed to load full evidence details:', err);
    }
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError(null);
    if (!intakeForm.source_name.trim() || !intakeForm.source_url.trim() || !intakeForm.title_or_summary.trim()) {
      setIntakeError('กรุณากรอกชื่อแหล่งข้อมูล, URL ต้นทาง และหัวข้อสรุปให้ครบถ้วน');
      return;
    }

    setIntakeSubmitting(true);
    try {
      const payload: any = {
        source_platform: intakeForm.source_platform,
        source_name: intakeForm.source_name.trim(),
        source_url: intakeForm.source_url.trim(),
        title_or_summary: intakeForm.title_or_summary.trim(),
        description: intakeForm.description.trim() || undefined,
        event_type: intakeForm.event_type,
        evidence_type: intakeForm.evidence_type,
        location_precision: intakeForm.location_precision,
        district: intakeForm.district || undefined,
        subdistrict: intakeForm.subdistrict.trim() || undefined,
        location_text: intakeForm.location_text.trim() || undefined,
        published_at: intakeForm.published_at ? new Date(intakeForm.published_at).toISOString() : undefined,
        observed_at: intakeForm.observed_at ? new Date(intakeForm.observed_at).toISOString() : undefined,
        submitter_notes: intakeForm.submitter_notes.trim() || undefined,
        media_references: intakeForm.media_url.trim() ? [{ media_type: 'IMAGE', source_media_url: intakeForm.media_url.trim() }] : undefined
      };

      if (intakeForm.latitude && intakeForm.longitude) {
        const lat = parseFloat(intakeForm.latitude);
        const lon = parseFloat(intakeForm.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          payload.latitude = lat;
          payload.longitude = lon;
        }
      }

      const resp = await fetch('/api/internal/external-evidence', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || 'เกิดข้อผิดพลาดในการบันทึกหลักฐาน');
      }

      setShowIntakeModal(false);
      setIntakeForm({
        source_platform: 'ONLINE_NEWS',
        source_name: '',
        source_url: '',
        title_or_summary: '',
        description: '',
        event_type: 'ABNORMAL_WATER_COLOR',
        evidence_type: 'PHOTO',
        location_precision: 'DISTRICT',
        district: 'กบินทร์บุรี',
        subdistrict: '',
        location_text: '',
        latitude: '',
        longitude: '',
        published_at: '',
        observed_at: '',
        submitter_notes: '',
        media_url: ''
      });
      await fetchEvidenceList();
    } catch (err: any) {
      setIntakeError(err.message || 'บันทึกหลักฐานไม่สำเร็จ');
    } finally {
      setIntakeSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidence) return;
    setReviewError(null);

    if (!reviewReason.trim()) {
      setReviewError('กรุณากรอกเหตุผลและบันทึกการตรวจทาน (Audit justification)');
      return;
    }

    if (reviewAction === 'OFFICIAL_VERIFY' && !reviewOfficialDoc.trim()) {
      setReviewError('การยืนยันระดับทางการ (OFFICIAL_VERIFIED) ต้องระบุเลขที่เอกสารหรือหนังสือราชการอ้างอิง');
      return;
    }

    if (reviewAction === 'LAB_CONFIRMED' && (!reviewLabSampleId.trim() || !reviewLabName.trim())) {
      setReviewError('การยืนยันด้วยผลตรวจห้องปฏิบัติการ (LAB_CONFIRMED) ต้องระบุชื่อห้องปฏิบัติการและรหัสตัวอย่างน้ำ');
      return;
    }

    setReviewSubmitting(true);
    try {
      const payload: any = {
        action: reviewAction,
        publication_status: reviewPubStatus,
        reason: reviewReason.trim(),
        official_document_ref: reviewOfficialDoc.trim() || undefined,
        lab_result_ref: reviewAction === 'LAB_CONFIRMED' ? {
          sample_id: reviewLabSampleId.trim(),
          laboratory: reviewLabName.trim(),
          test_date: reviewLabDate || new Date().toISOString().split('T')[0],
          parameter: reviewLabParam.trim() || 'Dissolved Oxygen / Heavy Metals'
        } : undefined
      };

      const resp = await fetch(`/api/internal/external-evidence/${selectedEvidence.id}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || 'การตรวจทานไม่สำเร็จ');
      }

      const updated = await resp.json();
      setSelectedEvidence(updated);
      await fetchEvidenceList();
      alert('บันทึกผลการตรวจทานเรียบร้อยแล้ว');
    } catch (err: any) {
      setReviewError(err.message || 'ตรวจทานไม่สำเร็จ');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleLinkEvent = async () => {
    if (!selectedEvidence) return;
    if (!selectedEventId && !newEventTitle.trim()) {
      alert('กรุณาเลือกเหตุการณ์เฝ้าระวังที่มีอยู่ หรือระบุชื่อเหตุการณ์ใหม่');
      return;
    }

    setLinkSubmitting(true);
    try {
      let targetEventId = selectedEventId;

      // If creating new event first
      if (!targetEventId && newEventTitle.trim()) {
        const createEvResp = await fetch('/api/internal/monitoring-events', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: newEventTitle.trim(),
            description: `สร้างจากหลักฐานภายนอก: ${selectedEvidence.title_or_summary}`,
            event_type: selectedEvidence.event_type,
            district: selectedEvidence.district || 'กบินทร์บุรี',
            subdistrict: selectedEvidence.subdistrict,
            latitude: selectedEvidence.latitude,
            longitude: selectedEvidence.longitude,
            location_precision: selectedEvidence.location_precision,
            monitoring_priority: 'MODERATE'
          })
        });
        if (!createEvResp.ok) throw new Error('สร้างเหตุการณ์เฝ้าระวังใหม่ไม่สำเร็จ');
        const newEv = await createEvResp.json();
        targetEventId = newEv.id;
        await fetchMonitoringEvents();
      }

      const linkResp = await fetch(`/api/internal/external-evidence/${selectedEvidence.id}/link-event`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          monitoring_event_id: targetEventId,
          association_role: eventLinkRole,
          confidence_score: eventLinkConfidence,
          notes: `เชื่อมโยงโดยเจ้าหน้าที่ ${currentUsername}`
        })
      });

      if (!linkResp.ok) throw new Error('เชื่อมโยงเหตุการณ์ไม่สำเร็จ');
      alert(`เชื่อมโยงหลักฐานเข้ากับเหตุการณ์ ${targetEventId} เรียบร้อยแล้ว`);
      await fetchEvidenceList();
      await fetchCorrelations(selectedEvidence.id);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเชื่อมโยง');
    } finally {
      setLinkSubmitting(false);
    }
  };

  // Filter evidence list
  const filteredList = evidenceList.filter(item => {
    if (statusFilter !== 'ALL' && item.verification_status !== statusFilter) return false;
    if (publicationFilter !== 'ALL' && item.publication_status !== publicationFilter) return false;
    if (eventTypeFilter !== 'ALL' && item.event_type !== eventTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title_or_summary.toLowerCase().includes(q);
      const matchSource = item.source_name.toLowerCase().includes(q);
      const matchDistrict = (item.district || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSource && !matchDistrict) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">หลักฐานทั้งหมด</span>
          <span className="text-xl font-bold text-slate-800">{evidenceList.length}</span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-amber-200 bg-amber-50/20 shadow-sm">
          <span className="text-xs font-semibold text-amber-700 block">รอการตรวจทาน</span>
          <span className="text-xl font-bold text-amber-800">
            {evidenceList.filter(e => e.verification_status === 'UNVERIFIED').length}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-purple-200 bg-purple-50/20 shadow-sm">
          <span className="text-xs font-semibold text-purple-700 block">มีข้อมูลสนับสนุน</span>
          <span className="text-xl font-bold text-purple-800">
            {evidenceList.filter(e => e.verification_status === 'CORROBORATED').length}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 block">ยืนยันทางการ</span>
          <span className="text-xl font-bold text-emerald-800">
            {evidenceList.filter(e => e.verification_status === 'OFFICIAL_VERIFIED').length}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-blue-200 bg-blue-50/20 shadow-sm">
          <span className="text-xs font-semibold text-blue-700 block">เปิดเผยสาธารณะ</span>
          <span className="text-xl font-bold text-blue-800">
            {evidenceList.filter(e => e.publication_status === 'PUBLIC').length}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">ไม่ใช้งาน / ปฏิเสธ</span>
          <span className="text-xl font-bold text-slate-600">
            {evidenceList.filter(e => e.verification_status === 'REJECTED' || e.verification_status === 'STALE').length}
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเรื่อง, สื่อ, อำเภอ..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="ALL">สถานะตรวจทาน: ทั้งหมด</option>
            <option value="UNVERIFIED">UNVERIFIED (รอตรวจทาน)</option>
            <option value="CORROBORATED">CORROBORATED (มีข้อมูลสนับสนุน)</option>
            <option value="OFFICIAL_VERIFIED">OFFICIAL_VERIFIED (ยืนยันทางการ)</option>
            <option value="LAB_CONFIRMED">LAB_CONFIRMED (ผลตรวจแล็บ)</option>
            <option value="DISPUTED">DISPUTED (ข้อมูลขัดแย้ง)</option>
            <option value="REJECTED">REJECTED (ปฏิเสธ)</option>
            <option value="STALE">STALE (ข้อมูลเก่าเกินไป)</option>
          </select>

          <select
            value={publicationFilter}
            onChange={(e) => setPublicationFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="ALL">สถานะเผยแพร่: ทั้งหมด</option>
            <option value="INTERNAL_ONLY">INTERNAL_ONLY (ภายในเท่านั้น)</option>
            <option value="PUBLIC">PUBLIC (เปิดเผยสาธารณะ)</option>
            <option value="WITHHELD">WITHHELD (ระงับการแสดงผล)</option>
          </select>

          <button
            onClick={fetchEvidenceList}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Button */}
        {currentRole !== 'READ_ONLY' && (
          <button
            onClick={() => setShowIntakeModal(true)}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึกหลักฐานภายนอกใหม่</span>
          </button>
        )}
      </div>

      {/* Evidence Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-4">รหัส / วันที่สังเกต</th>
                <th className="py-3 px-4">แหล่งที่มา</th>
                <th className="py-3 px-4">หัวข้อสรุปเหตุการณ์</th>
                <th className="py-3 px-4">ประเภทเหตุการณ์</th>
                <th className="py-3 px-4">พื้นที่ / ความแม่นยำ</th>
                <th className="py-3 px-4">สถานะตรวจทาน</th>
                <th className="py-3 px-4">การเผยแพร่</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    กำลังโหลดรายการหลักฐานภายนอก...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>ไม่พบรายการหลักฐานที่ตรงกับเงื่อนไข</span>
                  </td>
                </tr>
              ) : (
                filteredList.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">{item.id}</div>
                      <div className="text-2xs text-slate-500">
                        {item.observed_at ? new Date(item.observed_at).toLocaleDateString('th-TH') : 'ไม่ระบุวันพบ'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-purple-900">{item.source_name}</div>
                      <div className="text-2xs text-slate-500">{item.source_platform}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate" title={item.title_or_summary}>
                        {item.title_or_summary}
                      </div>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-2xs text-purple-700 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{item.source_url}</span>
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                        {item.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-slate-700">{item.district || 'จ.ปราจีนบุรี'}</div>
                      <div className="text-2xs text-slate-500 font-mono">[{item.location_precision}]</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        item.verification_status === 'OFFICIAL_VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                        item.verification_status === 'CORROBORATED' ? 'bg-purple-100 text-purple-800' :
                        item.verification_status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {item.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        item.publication_status === 'PUBLIC'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.publication_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEvidenceDetail(item)}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition"
                      >
                        ตรวจทาน & เชื่อมโยง
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTAKE MODAL (Section 4.1, 5, 6, 7, 8) */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-lg text-slate-900">บันทึกหลักฐานภายนอก (Manual Evidence Intake)</h3>
              </div>
              <button onClick={() => setShowIntakeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="space-y-4 text-sm">
              {intakeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                  {intakeError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">แพลตฟอร์มแหล่งที่มา *</label>
                  <select
                    value={intakeForm.source_platform}
                    onChange={(e) => setIntakeForm({ ...intakeForm, source_platform: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="ONLINE_NEWS">ข่าวออนไลน์ (ONLINE_NEWS)</option>
                    <option value="FACEBOOK">Facebook (FACEBOOK)</option>
                    <option value="X_TWITTER">X / Twitter (X_TWITTER)</option>
                    <option value="OFFICIAL_PUBLIC">ประกาศทางการสาธารณะ (OFFICIAL_PUBLIC)</option>
                    <option value="COMMUNITY_PAGE">เพจชุมชนท้องถิ่น (COMMUNITY_PAGE)</option>
                    <option value="PUBLIC_URL">ลิงก์สาธารณะทั่วไป (PUBLIC_URL)</option>
                    <option value="OTHER">อื่นๆ (OTHER)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้เผยแพร่ / สำนักข่าว *</label>
                  <input
                    type="text"
                    required
                    value={intakeForm.source_name}
                    onChange={(e) => setIntakeForm({ ...intakeForm, source_name: e.target.value })}
                    placeholder="เช่น ข่าวสด, เพจเรารักกบินทร์บุรี"
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL ต้นทาง (Source URL) *</label>
                <input
                  type="url"
                  required
                  value={intakeForm.source_url}
                  onChange={(e) => setIntakeForm({ ...intakeForm, source_url: e.target.value })}
                  placeholder="https://example.com/news/123"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทเหตุการณ์ที่รายงาน *</label>
                  <select
                    value={intakeForm.event_type}
                    onChange={(e) => setIntakeForm({ ...intakeForm, event_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="ABNORMAL_WATER_COLOR">น้ำเปลี่ยนสีผิดปกติ</option>
                    <option value="FOAM">ฟองหรือตะกอนผิดปกติ</option>
                    <option value="ODOR_REPORT">มีกลิ่นผิดปกติ / กลิ่นสารเคมี</option>
                    <option value="FISH_KILL">ปลาหรือสัตว์น้ำตาย</option>
                    <option value="OIL_LIKE_SURFACE">คราบคล้ายน้ำมันบนผิวน้ำ</option>
                    <option value="WASTE_OR_DEBRIS">ขยะหรือของเสียสะสม</option>
                    <option value="FLOODING">น้ำท่วม / การเอ่อล้น</option>
                    <option value="UNUSUAL_WATER_CONDITION">สภาพน้ำผิดปกติอื่นๆ</option>
                    <option value="OTHER_ENVIRONMENTAL_ANOMALY">ความผิดปกติด้านสิ่งแวดล้อมอื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทหลักฐาน (Evidence Type) *</label>
                  <select
                    value={intakeForm.evidence_type}
                    onChange={(e) => setIntakeForm({ ...intakeForm, evidence_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="PHOTO">ภาพถ่าย (PHOTO)</option>
                    <option value="VIDEO">วิดีโอ (VIDEO)</option>
                    <option value="NEWS_ARTICLE">บทความข่าว (NEWS_ARTICLE)</option>
                    <option value="SOCIAL_POST">โพสต์สื่อสังคม (SOCIAL_POST)</option>
                    <option value="OFFICIAL_POST">ประกาศราชการ (OFFICIAL_POST)</option>
                    <option value="PUBLIC_DOCUMENT">เอกสารสาธารณะ (PUBLIC_DOCUMENT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หัวข้อสรุปข้อเท็จจริงที่พบ *</label>
                <input
                  type="text"
                  required
                  value={intakeForm.title_or_summary}
                  onChange={(e) => setIntakeForm({ ...intakeForm, title_or_summary: e.target.value })}
                  placeholder="เช่น ชาวบ้านพบน้ำในคลองมีฟองสีขาวลอยเป็นระยะทาง 500 เมตร"
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดข้อความตามที่ต้นทางระบุ</label>
                <textarea
                  rows={3}
                  value={intakeForm.description}
                  onChange={(e) => setIntakeForm({ ...intakeForm, description: e.target.value })}
                  placeholder="ข้อความบรรยายหรือคำสัมภาษณ์ในโพสต์ต้นทาง..."
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Geospatial Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase block">ตำแหน่งและระดับความแม่นยำ (Section 5)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">ระดับความแม่นยำ *</label>
                    <select
                      value={intakeForm.location_precision}
                      onChange={(e) => setIntakeForm({ ...intakeForm, location_precision: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                    >
                      <option value="DISTRICT">ระดับอำเภอ (DISTRICT)</option>
                      <option value="NEARBY">บริเวณใกล้เคียง (NEARBY)</option>
                      <option value="EXACT">พิกัดชัดเจน (EXACT)</option>
                      <option value="PROVINCE">ระดับจังหวัด (PROVINCE)</option>
                      <option value="UNKNOWN">ไม่ทราบตำแหน่ง (UNKNOWN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">อำเภอ (จ.ปราจีนบุรี)</label>
                    <select
                      value={intakeForm.district}
                      onChange={(e) => setIntakeForm({ ...intakeForm, district: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                    >
                      <option value="กบินทร์บุรี">กบินทร์บุรี</option>
                      <option value="ศรีมหาโพธิ">ศรีมหาโพธิ</option>
                      <option value="เมืองปราจีนบุรี">เมืองปราจีนบุรี</option>
                      <option value="บ้านสร้าง">บ้านสร้าง</option>
                      <option value="ประจันตคาม">ประจันตคาม</option>
                      <option value="นาดี">นาดี</option>
                      <option value="ศรีมโหสถ">ศรีมโหสถ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">ตำบล / ชุมชน</label>
                    <input
                      type="text"
                      value={intakeForm.subdistrict}
                      onChange={(e) => setIntakeForm({ ...intakeForm, subdistrict: e.target.value })}
                      placeholder="เช่น ต.กบินทร์"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs text-slate-500 mb-1">Latitude (ถ้ามีพิกัดเฉพาะเจาะจง)</label>
                    <input
                      type="text"
                      value={intakeForm.latitude}
                      onChange={(e) => setIntakeForm({ ...intakeForm, latitude: e.target.value })}
                      placeholder="13.9876"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs text-slate-500 mb-1">Longitude (ถ้ามีพิกัดเฉพาะเจาะจง)</label>
                    <input
                      type="text"
                      value={intakeForm.longitude}
                      onChange={(e) => setIntakeForm({ ...intakeForm, longitude: e.target.value })}
                      placeholder="101.7214"
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาที่เผยแพร่ (Published At)</label>
                  <input
                    type="datetime-local"
                    value={intakeForm.published_at}
                    onChange={(e) => setIntakeForm({ ...intakeForm, published_at: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาที่สังเกตเห็นจริง (Observed At)</label>
                  <input
                    type="datetime-local"
                    value={intakeForm.observed_at}
                    onChange={(e) => setIntakeForm({ ...intakeForm, observed_at: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ภาพหรือสื่อต้นทาง (URL Reference)</label>
                <input
                  type="url"
                  value={intakeForm.media_url}
                  onChange={(e) => setIntakeForm({ ...intakeForm, media_url: e.target.value })}
                  placeholder="https://example.com/images/water1.jpg"
                  className="w-full border border-slate-200 rounded-lg p-2"
                />
                <span className="text-2xs text-slate-500">
                  * จัดเก็บเฉพาะลิงก์อ้างอิง ไม่ทำสำเนาถาวรโดยไม่ได้รับอนุญาต (ลิขสิทธิ์ปลอดภัย - Section 23)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={intakeSubmitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold transition"
                >
                  {intakeSubmitting ? 'กำลังบันทึก...' : 'บันทึกหลักฐาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVIDENCE DETAIL & REVIEW MODAL (Section 11, 14, 18, 35) */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-purple-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="text-xs font-mono text-purple-200">{selectedEvidence.id}</div>
                <h3 className="font-bold text-base line-clamp-1">{selectedEvidence.title_or_summary}</h3>
              </div>
              <button onClick={() => setSelectedEvidence(null)} className="text-purple-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 gap-2 shrink-0">
              <button
                onClick={() => setActiveModalTab('details')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                  activeModalTab === 'details' ? 'border-purple-700 text-purple-800 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                รายละเอียด & ที่มา
              </button>
              <button
                onClick={() => setActiveModalTab('correlation')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                  activeModalTab === 'correlation' ? 'border-purple-700 text-purple-800 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                ความสัมพันธ์แวดล้อม (Correlations)
              </button>
              <button
                onClick={() => setActiveModalTab('link_event')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                  activeModalTab === 'link_event' ? 'border-purple-700 text-purple-800 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                เชื่อมโยงเหตุการณ์ (Event Link)
              </button>
              {currentRole !== 'READ_ONLY' && (
                <button
                  onClick={() => setActiveModalTab('review')}
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                    activeModalTab === 'review' ? 'border-purple-700 text-purple-800 bg-white' : 'border-transparent text-slate-600'
                  }`}
                >
                  การตรวจทาน (Staff Review)
                </button>
              )}
              <button
                onClick={() => setActiveModalTab('audit')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                  activeModalTab === 'audit' ? 'border-purple-700 text-purple-800 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                ประวัติตรวจทาน (Audit Trail)
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
              {activeModalTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-2xs text-slate-500 block">แพลตฟอร์ม</span>
                      <span className="font-bold text-slate-800">{selectedEvidence.source_platform}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-500 block">ประเภทเหตุการณ์</span>
                      <span className="font-bold text-slate-800">{selectedEvidence.event_type}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-500 block">สถานะตรวจทาน</span>
                      <span className="font-bold text-purple-700">{selectedEvidence.verification_status}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-500 block">การเปิดเผย</span>
                      <span className="font-bold text-slate-800">{selectedEvidence.publication_status}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-500 block">ลิงก์ต้นทาง (Original Source)</span>
                    {selectedEvidence.source_url.includes('example.com') ? (
                      <div className="mt-1 p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-0.5">
                        <span className="font-bold text-amber-900 block">ลิงก์จำลองเพื่อการทดสอบ (Demo / Mock URL):</span>
                        <span className="font-mono text-2xs text-slate-600 break-all block">{selectedEvidence.source_url}</span>
                        <span className="text-2xs text-amber-700 block">* รายการนี้เป็นข้อมูลตัวอย่างเพื่อการทดสอบ ไม่ใช่โดเมนจริงบนอินเทอร์เน็ต</span>
                      </div>
                    ) : (
                      <a
                        href={selectedEvidence.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-semibold text-sm underline mt-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{selectedEvidence.source_url}</span>
                      </a>
                    )}
                  </div>

                  {selectedEvidence.description && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">เนื้อหาข้อความ:</span>
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedEvidence.description}</p>
                    </div>
                  )}

                  <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 text-xs text-purple-900 space-y-1">
                    <span className="font-bold block">ข้อมูลการระบุที่มา (Provenance Details):</span>
                    <div>SHA-256 Content Hash: <span className="font-mono">{selectedEvidence.content_hash}</span></div>
                    <div>พิกัดความแม่นยำ: {selectedEvidence.location_precision} (อ.{selectedEvidence.district || 'ไม่ระบุ'})</div>
                  </div>
                </div>
              )}

              {activeModalTab === 'correlation' && (
                <div className="space-y-4">
                  {corrLoading ? (
                    <div className="p-12 text-center text-slate-500">กำลังวิเคราะห์ความสัมพันธ์แวดล้อม...</div>
                  ) : correlations ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block">ระดับความสัมพันธ์แวดล้อม (Deterministic Correlation)</span>
                          <span className="text-lg font-bold text-slate-800">{correlations.correlation_strength}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">คะแนนความสัมพันธ์รวม</span>
                          <span className="text-lg font-bold text-purple-700">{correlations.composite_score}</span>
                        </div>
                      </div>

                      {/* Factors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                          <span className="text-xs font-bold text-slate-700 block mb-1">ความสัมพันธ์เชิงพื้นที่ (Spatial)</span>
                          <div className="text-xs text-slate-600">
                            อยู่ในเขตแม่น้ำ/ลำคลอง: {correlations.hydrological_correlation?.in_river_corridor ? '✓ ใช่' : '✗ ไม่'}
                          </div>
                          <div className="text-xs text-slate-600">
                            ลุ่มน้ำ: {correlations.hydrological_correlation?.sub_basin || 'ปราจีนบุรี'}
                          </div>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                          <span className="text-xs font-bold text-slate-700 block mb-0.5">ความสอดคล้องเชิงเวลา (Temporal Alignment)</span>
                          <span className="text-2xs text-slate-400 block mb-1.5 leading-tight">แสดงกรอบเวลา ไม่ใช่ข้อพิสูจน์เชิงสาเหตุ</span>
                          <div className="text-xs text-slate-600">
                            ความสดใหม่: {correlations.temporal_correlation?.temporal_category || correlations.temporal_correlation?.time_relevance_label || 'RECENT'}
                          </div>
                          <div className="text-xs text-slate-600">
                            ระยะเวลาห่างจากปัจจุบัน: {correlations.temporal_correlation?.age_hours?.toFixed(1) || correlations.temporal_correlation?.hours_ago?.toFixed(1) || '0'} ชั่วโมง
                          </div>
                        </div>
                      </div>

                      {/* Citizen reports correlation */}
                      <div className="p-3 bg-white border border-slate-200 rounded-lg">
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          รายงานข้อสังเกตจากประชาชนในบริเวณใกล้เคียง ({correlations.citizen_reports_correlation?.length || 0} รายการ)
                        </span>
                        {correlations.citizen_reports_correlation?.length === 0 ? (
                          <div className="text-xs text-slate-500">ไม่มีรายงานจากประชาชนในรัศมีใกล้เคียง</div>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {correlations.citizen_reports_correlation.map((cr: any) => (
                              <div key={cr.report_id} className="text-xs p-2 bg-slate-50 rounded border border-slate-100 flex justify-between">
                                <span>{cr.category} (ระยะ {cr.distance_km} กม.)</span>
                                <span className="text-slate-500">{cr.time_diff_hours} ชม. ที่ผ่านมา</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-2xs text-amber-900">
                        <em>หลักเกณฑ์ข้อเท็จจริง: ความสัมพันธ์แวดล้อมสนับสนุนการจัดลำดับการเฝ้าระวังเท่านั้น ไม่ใช่ข้อพิสูจน์การปนเปื้อน หรือการกระทำผิด</em>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500">ไม่สามารถดึงข้อมูลความสัมพันธ์ได้</div>
                  )}
                </div>
              )}

              {activeModalTab === 'link_event' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-800 block text-xs uppercase">
                      เชื่อมโยงหลักฐานเข้ากับเหตุการณ์เฝ้าระวัง (Monitoring Event Linkage)
                    </span>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">เลือกเหตุการณ์เฝ้าระวังที่มีอยู่:</label>
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      >
                        <option value="">-- เลือกเหตุการณ์เฝ้าระวัง --</option>
                        {monitoringEvents.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {ev.id}: {ev.title} ({ev.district})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-xs text-slate-500 text-center font-medium">หรือสร้างเหตุการณ์เฝ้าระวังใหม่:</div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อเหตุการณ์เฝ้าระวังใหม่:</label>
                      <input
                        type="text"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        placeholder="เช่น การเฝ้าระวังฟองผิดปกติในคลองระบม ต.กบินทร์"
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">บทบาทความเชื่อมโยง:</label>
                        <select
                          value={eventLinkRole}
                          onChange={(e) => setEventLinkRole(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                        >
                          <option value="PRIMARY">PRIMARY (หลักฐานหลัก)</option>
                          <option value="SUPPORTING">SUPPORTING (หลักฐานสนับสนุน)</option>
                          <option value="CORROBORATING">CORROBORATING (ข้อมูลสอดคล้อง)</option>
                          <option value="CONTRADICTING">CONTRADICTING (ข้อมูลขัดแย้ง)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">คะแนนความน่าเชื่อถือ (0.1 - 1.0):</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="1.0"
                          value={eventLinkConfidence}
                          onChange={(e) => setEventLinkConfidence(parseFloat(e.target.value))}
                          className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleLinkEvent}
                      disabled={linkSubmitting}
                      className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold transition"
                    >
                      {linkSubmitting ? 'กำลังเชื่อมโยง...' : 'ยืนยันการเชื่อมโยง'}
                    </button>
                  </div>
                </div>
              )}

              {activeModalTab === 'review' && (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {reviewError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                      {reviewError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">การตัดสินใจตรวจทาน (Review Action) *</label>
                      <select
                        value={reviewAction}
                        onChange={(e) => setReviewAction(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="ACCEPT">ACCEPT (ยอมรับเข้าสู่ระบบ)</option>
                        <option value="CORROBORATE">CORROBORATE (มีข้อมูลอิสระสนับสนุน)</option>
                        <option value="OFFICIAL_VERIFIED">OFFICIAL_VERIFIED (เจ้าหน้าที่ยืนยันทางการ)</option>
                        <option value="LAB_CONFIRMED">LAB_CONFIRMED (มีผลตรวจแล็บยืนยัน)</option>
                        <option value="DISPUTE">DISPUTE (มีข้อโต้แย้ง)</option>
                        <option value="REJECT">REJECT (ปฏิเสธ ไม่สามารถใช้ได้)</option>
                        <option value="MARK_STALE">MARK_STALE (เก่าเกินไป)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะการเผยแพร่ (Publication Status) *</label>
                      <select
                        value={reviewPubStatus}
                        onChange={(e) => setReviewPubStatus(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="INTERNAL_ONLY">INTERNAL_ONLY (เฉพาะเจ้าหน้าที่ภายใน)</option>
                        <option value="PUBLIC">PUBLIC (เปิดเผยต่อสาธารณะ)</option>
                        <option value="WITHHELD">WITHHELD (ระงับชั่วคราว)</option>
                      </select>
                    </div>
                  </div>

                  {reviewAction === 'OFFICIAL_VERIFIED' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <label className="block text-xs font-bold text-emerald-900 mb-1">
                        เลขที่หนังสือราชการ / เอกสารยืนยันทางการ (Mandatory):
                      </label>
                      <input
                        type="text"
                        required
                        value={reviewOfficialDoc}
                        onChange={(e) => setReviewOfficialDoc(e.target.value)}
                        placeholder="เช่น หนังสือราชการ ที่ ปจ 0014/1234"
                        className="w-full border border-emerald-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                  )}

                  {reviewAction === 'LAB_CONFIRMED' && (
                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <span className="text-xs font-bold text-blue-900 block">ข้อมูลผลตรวจแล็บอ้างอิง (Strict Lab Requirement):</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="รหัสตัวอย่างน้ำ (Sample ID)"
                          value={reviewLabSampleId}
                          onChange={(e) => setReviewLabSampleId(e.target.value)}
                          className="border border-blue-200 rounded-lg p-2 text-xs bg-white"
                        />
                        <input
                          type="text"
                          required
                          placeholder="ชื่อห้องปฏิบัติการที่รับรอง"
                          value={reviewLabName}
                          onChange={(e) => setReviewLabName(e.target.value)}
                          className="border border-blue-200 rounded-lg p-2 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เหตุผลและบันทึกการตรวจทาน (Mandatory Audit Justification) *</label>
                    <textarea
                      rows={3}
                      required
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="ระบุเหตุผลในการตัดสินใจ เช่น ภาพถ่ายตรงกับสภาพแม่น้ำจริง และสอดคล้องกับรายงานชาวบ้าน..."
                      className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold transition"
                    >
                      {reviewSubmitting ? 'กำลังบันทึก...' : 'บันทึกการตรวจทาน'}
                    </button>
                  </div>
                </form>
              )}

              {activeModalTab === 'audit' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase block">ประวัติการตรวจทานและแก้ไข (Immutable Audit Trail)</span>
                  {selectedEvidence.audit_logs && selectedEvidence.audit_logs.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEvidence.audit_logs.map((log: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{log.action}</span>
                            <span className="text-2xs text-slate-500">{new Date(log.created_at).toLocaleString('th-TH')}</span>
                          </div>
                          <div className="text-slate-600">โดย: <span className="font-medium">{log.staff_user_id}</span></div>
                          <div className="text-slate-700">เหตุผล: {log.reason}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-xs">ยังไม่มีประวัติการบันทึกการตรวจทานย้อนหลัง</div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedEvidence(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
