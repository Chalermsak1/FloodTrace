import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  MapPin,
  Droplets,
  CloudRain,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Send,
  Radio,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Key,
  LogOut,
  MessageSquare,
  Building,
  CheckSquare,
  XCircle,
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Share2,
  Activity,
  Server,
  Database,
  Play,
  HelpCircle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface StaffUser {
  id: string;
  username: string;
  display_name: string;
  role: 'ADMIN' | 'REVIEWER' | 'OPERATOR' | 'READ_ONLY';
  department: string;
  email: string;
}

interface ReportItem {
  id: string;
  category: string;
  district: string;
  subdistrict: string;
  latitude: number;
  longitude: number;
  is_exact_coordinates: boolean;
  status: string;
  priority: string;
  water_depth_cm: number;
  water_flow_speed: string;
  contamination_signs: string[];
  description: string;
  photo_url?: string;
  has_evidence: boolean;
  assigned_to?: string;
  assigned_at?: string;
  cluster_id?: string;
  cluster_role?: string;
  verification_status: string;
  publication_state: string;
  observed_at?: string;
  submitted_at?: string;
  updated_at?: string;
  reporter_name: string;
  reporter_role: string;
}

interface OperationalSummary {
  total_reports: number;
  new: number;
  triaging: number;
  assigned: number;
  in_review: number;
  need_more_info: number;
  under_verification: number;
  verified_observation: number;
  officially_confirmed: number;
  escalated: number;
  resolved: number;
  invalid: number;
  duplicate: number;
  spam: number;
  withdrawn: number;
  out_of_scope: number;
  unresolved: number;
  urgent_count: number;
  high_count: number;
  avg_time_to_first_review_hrs: number;
  avg_time_to_resolution_hrs: number;
  oldest_unresolved_days: number;
  oldest_unresolved_id?: string;
}

export const AdminReportsPage: React.FC = () => {
  // Authentication context is server-resolved for the fixed staff principal.
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  // Staff Authentication Gate (Eliminate hardcoded client secrets)
  const [staffKey, setStaffKey] = useState<string>(() => {
    return sessionStorage.getItem('floodtrace_staff_key') || '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem('floodtrace_staff_key'));
  });
  const [keyInput, setKeyInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);

  // Queue state & pagination
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Selected report detail
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<any | null>(null);
  const [evidenceMediaUrl, setEvidenceMediaUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [systemContext, setSystemContext] = useState<any | null>(null);
  const [auditTimeline, setAuditTimeline] = useState<any[]>([]);

  // Navigation Tabs (Queue vs System Health)
  const [adminActiveTab, setAdminActiveTab] = useState<'queue' | 'system_health'>('queue');
  const [systemHealthData, setSystemHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [triggeringSource, setTriggeringSource] = useState<string | null>(null);

  const fetchSystemHealth = async () => {
    setHealthLoading(true);
    try {
      const [srcResp, metricResp, schedResp] = await Promise.all([
        fetch('/health/sources', { headers: getAuthHeaders() }),
        fetch('/health/metrics', { headers: getAuthHeaders() }),
        fetch('/api/v1/admin/scheduler/status', { headers: getAuthHeaders() })
      ]);
      const sources = srcResp.ok ? await srcResp.json() : null;
      const metrics = metricResp.ok ? await metricResp.json() : null;
      const scheduler = schedResp.ok ? await schedResp.json() : null;
      setSystemHealthData({ sources, metrics, scheduler });
    } catch (err) {
      console.error('Failed to load system health:', err);
      setSystemHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleTriggerSource = async (sourceId: string) => {
    setTriggeringSource(sourceId);
    try {
      const resp = await fetch(`/api/v1/admin/scheduler/trigger/${sourceId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        await fetchSystemHealth();
      }
    } catch (err) {
      console.error('Trigger source failed:', err);
    } finally {
      setTriggeringSource(null);
    }
  };

  useEffect(() => {
    if (adminActiveTab === 'system_health') {
      fetchSystemHealth();
    }
  }, [adminActiveTab]);

  // Accordion collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    info: true,
    original: true,
    location: true,
    evidence: true,
    context: true,
    related: false,
    infoRequests: true,
    verification: true,
    escalation: false,
    resolution: false,
    timeline: false
  });

  // Action Modals State
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [assigneeInput, setAssigneeInput] = useState<string>('');
  const [assignNoteInput, setAssignNoteInput] = useState<string>('');

  const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
  const [infoRequestTypeInput, setInfoRequestTypeInput] = useState<string>('UPLOAD_ANOTHER_PHOTO');
  const [infoRequestTextInput, setInfoRequestTextInput] = useState<string>('');

  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [targetStatusInput, setTargetStatusInput] = useState<string>('');
  const [statusReasonInput, setStatusReasonInput] = useState<string>('');
  const [officialEvidenceInput, setOfficialEvidenceInput] = useState<string>('');

  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [verStatusInput, setVerStatusInput] = useState<string>('UNVERIFIED');
  const [verMethodInput, setVerMethodInput] = useState<string>('CROSS_CHECKED_SYSTEM_DATA');
  const [verNotesInput, setVerNotesInput] = useState<string>('');
  const [verReportedInput, setVerReportedInput] = useState<string>('');
  const [verObservedInput, setVerObservedInput] = useState<string>('');
  const [verSystemInput, setVerSystemInput] = useState<string>('');
  const [verModelInput, setVerModelInput] = useState<string>('');
  const [verUnknownInput, setVerUnknownInput] = useState<string>('');
  const [verActionInput, setVerActionInput] = useState<string>('');
  const [verOfficialCitation, setVerOfficialCitation] = useState<string>('');

  const [escalateModalOpen, setEscalateModalOpen] = useState<boolean>(false);
  const [escTeamInput, setEscTeamInput] = useState<string>('REGIONAL_WATER_OFFICE');
  const [escReasonInput, setEscReasonInput] = useState<string>('');
  const [escUrgencyInput, setEscUrgencyInput] = useState<string>('HIGH');
  const [escSummaryInput, setEscSummaryInput] = useState<string>('');

  const [resolveModalOpen, setResolveModalOpen] = useState<boolean>(false);
  const [resTypeInput, setResTypeInput] = useState<string>('VERIFIED_OBSERVATION');
  const [resSummaryInput, setResSummaryInput] = useState<string>('');

  const [pubModalOpen, setPubModalOpen] = useState<boolean>(false);
  const [pubStateInput, setPubStateInput] = useState<string>('PUBLIC_SAFE_SUMMARY');
  const [pubReasonInput, setPubReasonInput] = useState<string>('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Common Headers helper (No hardcoded credentials)
  const getAuthHeaders = () => ({
    'X-Admin-Key': staffKey,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const reportId = reportDetail?.id;
    const hasMedia = Boolean(reportDetail?.original_submission?.photo_url);
    setEvidenceMediaUrl(null);
    if (staffKey && reportId && hasMedia) {
      fetch(`/api/v1/admin/reports/${encodeURIComponent(reportId)}/media`, {
        headers: getAuthHeaders()
      })
        .then((response) => response.ok ? response.blob() : null)
        .then((blob) => {
          if (!blob) return;
          objectUrl = URL.createObjectURL(blob);
          if (active) setEvidenceMediaUrl(objectUrl);
          else URL.revokeObjectURL(objectUrl);
        })
        .catch(() => setEvidenceMediaUrl(null));
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [staffKey, reportDetail?.id, reportDetail?.original_submission?.photo_url]);

  // Staff Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateKey = keyInput.trim();
    if (!candidateKey) {
      setAuthError('กรุณาระบุ Staff Access Key');
      return;
    }
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const resp = await fetch('/api/v1/admin/auth/me', {
        headers: {
          'X-Admin-Key': candidateKey,
          'Content-Type': 'application/json'
        }
      });
      if (resp.ok) {
        sessionStorage.setItem('floodtrace_staff_key', candidateKey);
        setStaffKey(candidateKey);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setAuthError('คีย์การเข้าถึงไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าใช้งานระบบ (HTTP 401)');
      }
    } catch (err) {
      setAuthError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบสิทธิ์ได้');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('floodtrace_staff_key');
    setStaffKey('');
    setIsAuthenticated(false);
    setKeyInput('');
    setAuthError(null);
  };

  // 1. Fetch Staff Directory & Summary
  const fetchSummary = async () => {
    if (!staffKey) return;
    try {
      const resp = await fetch('/api/v1/admin/reports/summary', { headers: getAuthHeaders() });
      if (resp.status === 401) {
        handleLogout();
        return;
      }
      if (resp.ok) {
        const data = await resp.json();
        setSummary(data);
      }
    } catch (e) {
      console.error('Error fetching summary:', e);
    }
  };

  const fetchStaffUsers = async () => {
    if (!staffKey) return;
    try {
      const resp = await fetch('/api/v1/admin/staff/users', { headers: getAuthHeaders() });
      if (resp.status === 401) {
        handleLogout();
        return;
      }
      if (resp.ok) {
        const data = await resp.json();
        setStaffUsers(data);
      }
    } catch (e) {
      console.error('Error fetching staff users:', e);
    }
  };

  // 2. Fetch Reports Queue
  const fetchReports = async () => {
    if (!staffKey) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        sort_by: sortBy
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (districtFilter) params.append('district', districtFilter);

      const resp = await fetch(`/api/v1/admin/reports?${params.toString()}`, { headers: getAuthHeaders() });
      if (resp.status === 401) {
        handleLogout();
        return;
      }
      if (resp.ok) {
        const data = await resp.json();
        setReports(data.items || []);
        setTotalPages(data.total_pages || 1);
        setTotalCount(data.total_count || 0);
      }
    } catch (e) {
      console.error('Error fetching reports queue:', e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Selected Report Full Detail
  const fetchReportDetail = async (id: string) => {
    setDetailLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const [detailRes, ctxRes, timelineRes] = await Promise.all([
        fetch(`/api/v1/admin/reports/${id}`, { headers: getAuthHeaders() }),
        fetch(`/api/v1/admin/reports/${id}/context`, { headers: getAuthHeaders() }),
        fetch(`/api/v1/admin/reports/${id}/timeline`, { headers: getAuthHeaders() })
      ]);

      if (detailRes.ok) {
        const d = await detailRes.json();
        setReportDetail(d);
        // Pre-fill inputs
        setAssigneeInput(d.assignment?.assigned_to || '');
        setTargetStatusInput(d.status || 'TRIAGING');
        setPubStateInput(d.publication_state || 'PRIVATE');
        setVerReportedInput(d.original_submission?.description || '');
      }
      if (ctxRes.ok) {
        const ctx = await ctxRes.json();
        setSystemContext(ctx);
        setVerSystemInput(
          ctx.primary_water_station
            ? `สถานีระดับน้ำ ${ctx.primary_water_station.name_th} (${ctx.primary_water_station.distance_km} กม.) ระดับน้ำ: ${ctx.primary_water_station.water_level_msl ?? 'ไม่มีข้อมูล'} m MSL`
            : 'ไม่มีสถานีในระยะตรวจวัด'
        );
      }
      if (timelineRes.ok) {
        const tl = await timelineRes.json();
        setAuditTimeline(tl || []);
      }
    } catch (e) {
      console.error('Error loading report details:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchStaffUsers();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, priorityFilter, districtFilter, sortBy]);

  useEffect(() => {
    if (selectedReportId) {
      fetchReportDetail(selectedReportId);
    }
  }, [selectedReportId]);

  // Map Initialization & Marker Updates
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [14.0535, 101.3868],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri, Maxar, Earthstar Geographics',
        maxZoom: 18,
      }).addTo(map);

      // Add Prachin Buri analysis scope boundary (BBOX)
      const prachinBounds = [
        [13.5823, 101.1374],
        [14.4625, 102.1263]
      ];
      L.rectangle(prachinBounds as any, {
        color: '#0C65E8',
        weight: 2,
        fillColor: '#0C65E8',
        fillOpacity: 0.04,
        dashArray: '4, 4'
      }).addTo(map).bindTooltip('ขอบเขตพื้นที่วิเคราะห์หลัก (จังหวัดปราจีนบุรี)', { sticky: true });

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    // Refresh markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      reports.forEach((rep) => {
        const isSelected = rep.id === selectedReportId;
        const color = rep.status === 'RESOLVED' ? '#64748B' :
                      rep.priority === 'URGENT' ? '#DC2626' :
                      rep.priority === 'HIGH' ? '#EA580C' : '#0C65E8';

        const marker = L.circleMarker([rep.latitude, rep.longitude], {
          radius: isSelected ? 12 : 8,
          fillColor: color,
          color: isSelected ? '#FFFFFF' : '#063B70',
          weight: isSelected ? 3 : 1.5,
          opacity: 1,
          fillOpacity: 0.85
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px;">
            <div style="font-weight: bold; color: #063B70;">${rep.id} (${rep.category})</div>
            <div>${rep.subdistrict}, ${rep.district}</div>
            <div style="margin-top: 4px; font-size: 12px; color: ${color}; font-weight: bold;">
              สถานะ: ${rep.status} | ลำดับ: ${rep.priority}
            </div>
            ${rep.has_evidence ? '<div style="color: #059669; font-size: 11px;">📷 มีหลักฐานภาพถ่าย</div>' : ''}
          </div>
        `);

        marker.on('click', () => {
          setSelectedReportId(rep.id);
        });

        marker.addTo(markersLayerRef.current!);
      });

      // If report selected, center map
      if (selectedReportId) {
        const found = reports.find(r => r.id === selectedReportId);
        if (found && mapInstanceRef.current) {
          mapInstanceRef.current.setView([found.latitude, found.longitude], 13);
        }
      }
    }
  }, [reports, selectedReportId]);

  // Accordion Toggle Helper
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Operational Action Handlers
  const handleAssign = async () => {
    if (!selectedReportId || !assigneeInput) return;
    setActionError(null);
    try {
      const resp = await fetch(`/api/v1/admin/reports/${selectedReportId}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ assigned_to: assigneeInput, assignment_note: assignNoteInput })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาดในการมอบหมายงาน');
      setActionSuccess(`มอบหมายงานให้ ${assigneeInput} เรียบร้อยแล้ว`);
      setAssignModalOpen(false);
      fetchReportDetail(selectedReportId);
      fetchReports();
      fetchSummary();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedReportId || !infoRequestTextInput.trim()) {
      setActionError('กรุณากรอกรายละเอียดสิ่งที่ต้องการขอข้อมูลเพิ่มเติม');
      return;
    }
    setActionError(null);
    try {
      const resp = await fetch(`/api/v1/admin/reports/${selectedReportId}/request-info`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          request_type: infoRequestTypeInput,
          request_text: infoRequestTextInput.trim()
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาดในการขอข้อมูลเพิ่มเติม');
      setActionSuccess('ส่งคำขอข้อมูลเพิ่มเติมไปยังผู้แจ้งเหตุเรียบร้อยแล้ว');
      setInfoModalOpen(false);
      setInfoRequestTextInput('');
      fetchReportDetail(selectedReportId);
      fetchReports();
      fetchSummary();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedReportId || !targetStatusInput) return;
    setActionError(null);
    try {
      const resp = await fetch(`/api/v1/admin/reports/${selectedReportId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          new_status: targetStatusInput,
          reason: statusReasonInput || 'เปลี่ยนสถานะผ่านคอนโซลเจ้าหน้าที่',
          official_source_evidence: officialEvidenceInput || null
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'ไม่สามารถเปลี่ยนสถานะได้');
      setActionSuccess(`เปลี่ยนสถานะเป็น ${targetStatusInput} เรียบร้อยแล้ว`);
      setStatusModalOpen(false);
      fetchReportDetail(selectedReportId);
      fetchReports();
      fetchSummary();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleVerify = async () => {
    if (!selectedReportId) return;
    setActionError(null);
    try {
      const resp = await fetch(`/api/v1/admin/reports/${selectedReportId}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verification_status: verStatusInput,
          verification_method: verMethodInput,
          notes: verNotesInput,
          what_was_reported: verReportedInput.trim() || null,
          what_was_observed: verObservedInput.trim() || null,
          what_system_data_shows: verSystemInput.trim() || null,
          what_model_suggests: verModelInput.trim() || null,
          what_is_unknown: verUnknownInput.trim() || null,
          what_should_be_verified: verActionInput.trim() || null,
          official_source_evidence: verOfficialCitation || null
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาดในการบันทึกการตรวจสอบ');
      setActionSuccess(`บันทึกการตรวจสอบข้อเท็จจริง (${verStatusInput}) เรียบร้อยแล้ว`);
      setVerifyModalOpen(false);
      fetchReportDetail(selectedReportId);
      fetchReports();
      fetchSummary();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleEscalate = async () => {
    if (!selectedReportId) return;
    setActionError(null);
    try {
      const resp = await fetch(`/api/v1/admin/reports/${selectedReportId}/escalate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          destination_team: escTeamInput,
          escalation_reason: escReasonInput,
          urgency: escUrgencyInput,
          evidence_summary: escSummaryInput || 'ส่งต่อข้อมูลภาพถ่ายและพิกัดตรวจสอบ'
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาดในการส่งต่อเรื่อง');
      setActionSuccess(`ส่งต่อเรื่องไปยังหน่วยงาน ${escTeamInput} เรียบร้อยแล้ว`);
      setEscalateModalOpen(false);
      fetchReportDetail(selectedReportId);
      fetchReports();
      fetchSummary();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleResolve = async () => {
    if (!selectedReportId) return;
    setActionError(null);
    try {
      const resp = await fetch(`/api/v1/admin/reports/${selectedReportId}/resolve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          resolution_type: resTypeInput,
          resolution_summary: resSummaryInput || 'ดำเนินการตรวจสอบและจัดการตามขั้นตอนเสร็จสิ้น'
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาดในการยุติเรื่อง');
      setActionSuccess(`ยุติเรื่อง (${resTypeInput}) เรียบร้อยแล้ว`);
      setResolveModalOpen(false);
      fetchReportDetail(selectedReportId);
      fetchReports();
      fetchSummary();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handlePublicationUpdate = async () => {
    if (!selectedReportId) return;
    setActionError(null);
    try {
      const resp = await fetch(`/api/v1/admin/reports/${selectedReportId}/publication`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          publication_state: pubStateInput,
          reason: pubReasonInput || 'ปรับสถานะการเผยแพร่ผ่านคอนโซลแอดมิน'
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาดในการปรับสถานะการเผยแพร่');
      setActionSuccess(`ปรับสถานะการเผยแพร่เป็น ${pubStateInput} เรียบร้อยแล้ว`);
      setPubModalOpen(false);
      fetchReportDetail(selectedReportId);
      fetchReports();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Helper status color badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">รายงานใหม่</span>;
      case 'TRIAGING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">กำลังคัดกรอง</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">มอบหมายแล้ว</span>;
      case 'IN_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">กำลังตรวจสอบ</span>;
      case 'NEED_MORE_INFO':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">ขอข้อมูลเพิ่ม</span>;
      case 'UNDER_VERIFICATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">รอพิสูจน์ข้อเท็จจริง</span>;
      case 'VERIFIED_OBSERVATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">ยืนยันข้อสังเกตแล้ว</span>;
      case 'OFFICIAL_CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-300">หน่วยงานยืนยันแล้ว</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">ส่งต่อหน่วยงานแล้ว</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">ยุติเรื่องแล้ว</span>;
      case 'OUT_OF_SCOPE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">นอกพื้นที่วิเคราะห์</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white animate-pulse">ด่วนที่สุด</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white">ด่วน</span>;
      case 'NORMAL':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">ปกติ</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">ต่ำ</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{priority}</span>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#063B70] text-white mx-auto mb-5 shadow-md">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-center text-slate-900 mb-1">
            Ruwaigon Staff Operations Console
          </h2>
          <p className="text-xs text-center text-slate-500 mb-6">
            ระบบบริหารจัดการและตรวจสอบข้อเท็จจริงสำหรับเจ้าหน้าที่ (Internal Back-Office)
          </p>

          {authError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Staff Access Key (รหัสผ่านเจ้าหน้าที่)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="ป้อนรหัสคีย์การเข้าถึง..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authSubmitting || !keyInput.trim()}
              className="w-full py-2.5 px-4 bg-[#0C65E8] hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2"
            >
              {authSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังตรวจสอบสิทธิ์...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>เข้าสู่ระบบเจ้าหน้าที่</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <a href="/" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              ← กลับสู่หน้าหลักภาคประชาชน (Public Site)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-800 flex flex-col font-sans pb-12">
      {/* Top Staff Operations Bar */}
      <header className="bg-[#063B70] text-white border-b border-blue-900 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0C65E8] flex items-center justify-center text-white shadow-inner font-bold text-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-wide">Ruwaigon Staff Operations Console</span>
                <span className="px-2.5 py-0.5 text-xs rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-mono font-semibold">
                  INTERNAL
                </span>
              </div>
              <p className="text-sm text-blue-100">ระบบบริหารจัดการ ตรวจสอบข้อเท็จจริง และส่งต่อรายงานจากประชาชน</p>
            </div>
          </div>

          {/* Explicit refresh; this console does not claim continuous updates. */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                fetchReports();
                fetchSummary();
                if (selectedReportId) fetchReportDetail(selectedReportId);
              }}
              className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white transition"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 hover:text-white transition"
              title="ออกจากระบบ (Sign Out)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Staff Console Sub-navigation Tabs */}
      <div className="bg-[#052e59] border-b border-blue-900/80 px-4 sticky top-[61px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <button
            onClick={() => setAdminActiveTab('queue')}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              adminActiveTab === 'queue'
                ? 'border-white text-white bg-blue-900/50'
                : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-900/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>คิวจัดการรายงาน (Report Queue)</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              adminActiveTab === 'queue' ? 'bg-blue-800 text-blue-100 font-mono' : 'bg-blue-950 text-blue-300 font-mono'
            }`}>
              {totalCount}
            </span>
          </button>
          <button
            onClick={() => setAdminActiveTab('system_health')}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              adminActiveTab === 'system_health'
                ? 'border-white text-white bg-blue-900/50'
                : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-900/30'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>สถานะระบบและการดึงข้อมูล (System Health & Pipeline)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-5 flex-1 w-full space-y-5">
        {adminActiveTab === 'queue' ? (
          <>
            {/* Operational Metrics Cards (Section 5, 27, 50.14) */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-sm font-semibold text-slate-600">รายงานใหม่</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-700">{summary?.new ?? '-'}</span>
              <span className="text-xs text-slate-500">รายการ</span>
            </div>
            <div className="text-xs text-blue-600 font-medium mt-1">รอการคัดกรองเบื้องต้น</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-sm font-semibold text-slate-600">กำลังคัดกรอง / มอบหมาย</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-600">{(summary?.triaging ?? 0) + (summary?.assigned ?? 0)}</span>
              <span className="text-xs text-slate-500">รายการ</span>
            </div>
            <div className="text-xs text-amber-600 font-medium mt-1">รอรับเรื่องตรวจสอบ</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-sm font-semibold text-slate-600">อยู่ระหว่างตรวจสอบ</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-indigo-700">{(summary?.in_review ?? 0) + (summary?.under_verification ?? 0)}</span>
              <span className="text-xs text-slate-500">รายการ</span>
            </div>
            <div className="text-xs text-indigo-600 font-medium mt-1">เจ้าหน้าที่กำลังตรวจพยาน</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-sm font-semibold text-slate-600">ส่งต่อหน่วยงาน</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-rose-600">{summary?.escalated ?? '-'}</span>
              <span className="text-xs text-slate-500">เรื่อง</span>
            </div>
            <div className="text-xs text-rose-600 font-medium mt-1">ประสานงานภายนอก</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-sm font-semibold text-slate-600">ยืนยันข้อสังเกตแล้ว</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600">{summary?.verified_observation ?? '-'}</span>
              <span className="text-xs text-slate-500">จุด</span>
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-1">มีพยานหลักฐานประจักษ์</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between bg-blue-50/40">
            <span className="text-sm font-semibold text-slate-700">ค้างดำเนินการ (Unresolved)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#063B70]">{summary?.unresolved ?? '-'}</span>
              <span className="text-xs text-slate-600">
                (ด่วน {summary?.urgent_count ?? 0})
              </span>
            </div>
            <div className="text-xs text-slate-600 font-medium mt-1">
              ค้างนานสุด: {summary?.oldest_unresolved_days ?? 0} วัน
            </div>
          </div>
        </section>

        {/* Global Action Notifications */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">✕</button>
          </div>
        )}
        {actionError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 text-xs font-bold">✕</button>
          </div>
        )}

        {/* 3-Pane Synchronized Operations Layout (Section 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* =========================================================================
              LEFT PANE: Report Management Queue (5 cols)
             ========================================================================= */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[820px]">
            {/* Queue Filter Toolbar */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <h2 className="font-bold text-sm text-[#063B70]">คิวงานรายงานประชาชน</h2>
                </div>
                <span className="text-xs text-slate-500 font-medium font-mono">
                  ทั้งหมด {totalCount} รายการ
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา ID, อำเภอ, ตำบล, ข้อความ..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">สถานะทั้งหมด</option>
                  <option value="NEW">NEW (ใหม่)</option>
                  <option value="TRIAGING">TRIAGING (คัดกรอง)</option>
                  <option value="ASSIGNED">ASSIGNED (มอบหมาย)</option>
                  <option value="IN_REVIEW">IN_REVIEW (ตรวจ)</option>
                  <option value="NEED_MORE_INFO">NEED_MORE_INFO</option>
                  <option value="UNDER_VERIFICATION">UNDER_VERIFY</option>
                  <option value="VERIFIED_OBSERVATION">VERIFIED (ยืนยัน)</option>
                  <option value="OFFICIAL_CONFIRMED">OFFICIAL (ทางการ)</option>
                  <option value="ESCALATED">ESCALATED (ส่งต่อ)</option>
                  <option value="RESOLVED">RESOLVED (ยุติ)</option>
                  <option value="OUT_OF_SCOPE">OUT_OF_SCOPE</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">ความเร่งด่วน</option>
                  <option value="URGENT">ด่วนที่สุด (URGENT)</option>
                  <option value="HIGH">ด่วน (HIGH)</option>
                  <option value="NORMAL">ปกติ (NORMAL)</option>
                  <option value="LOW">ต่ำ (LOW)</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="newest">ล่าสุด</option>
                  <option value="priority">ด่วนที่สุดก่อน</option>
                  <option value="oldest">เก่าที่สุด</option>
                  <option value="latest_observed">เวลาสังเกต</option>
                </select>
              </div>
            </div>

            {/* Queue List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span>กำลังโหลดรายการรายงาน...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  ไม่พบรายงานที่ตรงกับเงื่อนไขการค้นหา
                </div>
              ) : (
                reports.map((r) => {
                  const isSelected = r.id === selectedReportId;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedReportId(r.id)}
                      className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-[#0C65E8] shadow-inner'
                          : 'hover:bg-slate-50 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#063B70]">{r.id}</span>
                          {getPriorityBadge(r.priority)}
                        </div>
                        {getStatusBadge(r.status)}
                      </div>

                      <div className="mt-1.5 text-sm font-semibold text-slate-900 line-clamp-1">
                        {r.category} — {r.subdistrict}, {r.district}
                      </div>

                      <p className="mt-1 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {r.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          {r.has_evidence && (
                            <span className="text-emerald-700 flex items-center gap-0.5 font-semibold">
                              📷 มีภาพ
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-slate-700 truncate max-w-[120px]">
                          {r.assigned_to ? `👤 ${r.assigned_to}` : <span className="text-slate-400 italic">ยังไม่มอบหมาย</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span>หน้า {page} จาก {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CENTER PANE: Interactive Operations Map (4 cols)
             ========================================================================= */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[820px] flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-[#063B70]">แผนที่ปฏิบัติการ GIS</h3>
              </div>
              <span className="text-xs text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded font-semibold">
                ปราจีนบุรี (Basin 03)
              </span>
            </div>

            <div className="flex-1 relative">
              <div ref={mapContainerRef} className="w-full h-full z-0" />
              
              {/* Floating Map Legend Overlay */}
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md z-10 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 mb-1">สัญลักษณ์แผนที่</div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600" />
                  <span className="font-medium text-slate-700">ด่วนที่สุด (URGENT)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="font-medium text-slate-700">ด่วน (HIGH)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="font-medium text-slate-700">ปกติ (NORMAL)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="font-medium text-slate-700">ยุติเรื่องแล้ว (RESOLVED)</span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT PANE: Selected Report Workspace (4 cols)
             ========================================================================= */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[820px] flex flex-col">
            {!selectedReportId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-200 mb-3" />
                <h4 className="font-bold text-sm text-slate-600">ยังไม่ได้เลือกรายงาน</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  กรุณาคลิกเลือกรายงานจากคิวด้านซ้าย หรือคลิกหมุดบนแผนที่เพื่อดูรายละเอียดและดำเนินการ
                </p>
              </div>
            ) : detailLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs">กำลังโหลดรายละเอียดรายงาน...</span>
              </div>
            ) : reportDetail && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Workspace Header */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#063B70]">{reportDetail.id}</span>
                      {getPriorityBadge(reportDetail.priority)}
                    </div>
                    {getStatusBadge(reportDetail.status)}
                  </div>

                  <div className="mt-2 text-sm text-slate-600 flex items-center justify-between">
                    <span>ผู้รับผิดชอบ: <strong className="text-slate-900">{reportDetail.assignment?.assigned_to || 'ยังไม่ระบุ'}</strong></span>
                    <span className="text-xs text-slate-500">
                      สังเกตเมื่อ: {reportDetail.original_submission?.observed_at ? new Date(reportDetail.original_submission.observed_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                    </span>
                  </div>

                  {/* Primary Operational Actions Bar */}
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/80">
                    <button
                      onClick={() => setAssignModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      มอบหมาย
                    </button>

                    <button
                      onClick={() => setInfoModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      ขอข้อมูลเพิ่ม
                    </button>

                    <button
                      onClick={() => setVerifyModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      ตรวจพิสูจน์
                    </button>

                    <button
                      onClick={() => setEscalateModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      ส่งต่อ
                    </button>

                    <button
                      onClick={() => setResolveModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ยุติเรื่อง
                    </button>

                    <button
                      onClick={() => setStatusModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                      เปลี่ยนสถานะ...
                    </button>

                    <button
                      onClick={() => setPubModalOpen(true)}
                      className="px-2 py-1 text-xs font-medium rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition flex items-center gap-1"
                      title="ควบคุมการเปิดเผยต่อสาธารณะ"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      เผยแพร่
                    </button>
                  </div>
                </div>

                {/* Collapsible Report Details Sections (Section 11) */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  
                  {/* Section 1: Preserved Original Citizen Report */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('original')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span>1. ข้อความดั้งเดิมจากประชาชน (Preserved)</span>
                      {openSections.original ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.original && (
                      <div className="p-3.5 text-sm space-y-2.5 bg-slate-50/30">
                        <div>
                          <span className="text-slate-500 block text-xs font-medium mb-1">รายละเอียดที่แจ้ง:</span>
                          <p className="mt-0.5 text-slate-900 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                            {reportDetail.original_submission?.description || 'ไม่มีข้อความระบุ'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                          <div>ระดับน้ำ: <strong>{reportDetail.original_submission?.water_depth_cm ?? 0} ซม.</strong></div>
                          <div>การไหล: <strong>{reportDetail.original_submission?.water_flow_speed || '-'}</strong></div>
                        </div>
                        {reportDetail.original_submission?.contamination_signs?.length > 0 && (
                          <div>
                            <span className="text-slate-500 block text-xs font-medium mb-1">ข้อสังเกตความผิดปกติ:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {reportDetail.original_submission.contamination_signs.map((sign: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                                  {sign}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                          <span>ผู้แจ้ง: {reportDetail.original_submission?.reporter_name}</span>
                          <span>บทบาท: {reportDetail.original_submission?.reporter_role}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Location & Boundaries */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('location')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span>2. พิกัดและขอบเขตพื้นที่ตรวจสอบ</span>
                      {openSections.location ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.location && (
                      <div className="p-3.5 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">พื้นที่:</span>
                          <span className="font-semibold">{reportDetail.subdistrict}, {reportDetail.district}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="text-slate-500">พิกัดเปิดเผย (Public):</span>
                          <span>{reportDetail.public_latitude}, {reportDetail.public_longitude}</span>
                        </div>
                        {reportDetail.is_exact_coordinates_visible && (
                          <div className="flex items-center justify-between font-mono text-xs text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-200">
                            <span className="flex items-center gap-1 font-bold">
                              <Lock className="w-3 h-3" /> พิกัดจริง (Internal):
                            </span>
                            <span>{reportDetail.exact_latitude}, {reportDetail.exact_longitude}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 mt-1">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>{systemContext?.scope_notice || 'อยู่ในพื้นที่เฝ้าระวังหลักจังหวัดปราจีนบุรี'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Evidence Panel */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('evidence')}
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-[#063B70]"
                    >
                      <span>3. หลักฐานที่ได้รับ (Evidence Viewer)</span>
                      {openSections.evidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.evidence && (
                      <div className="p-3 text-xs">
                        {reportDetail.original_submission?.photo_url ? (
                          <div className="space-y-2">
                            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                              <img
                                src={evidenceMediaUrl || undefined}
                                alt="หลักฐานจากประชาชน"
                                className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="text-emerald-600 font-medium">✓ ลบ EXIF พิกัดส่วนบุคคลแล้ว</span>
                              <a
                                href={evidenceMediaUrl || undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                ดูภาพเต็ม <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-center py-3">ไม่มีภาพถ่ายแนบมาด้วย</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 4: System Cross-Check Context (Section 15) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('context')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span className="flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-blue-600" />
                        4. ข้อมูลระบบประกอบการตรวจสอบ (System Context)
                      </span>
                      {openSections.context ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.context && (
                      <div className="p-3.5 text-sm space-y-2.5">
                        {systemContext?.primary_water_station ? (
                          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                            <div className="flex items-center justify-between font-bold text-[#063B70]">
                              <span className="text-sm">สถานีระดับน้ำใกล้สุด:</span>
                              <span className="text-xs text-blue-700 font-mono font-semibold bg-blue-100 px-2 py-0.5 rounded">
                                ห่าง {systemContext.primary_water_station.distance_km} กม.
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-800">
                              {systemContext.primary_water_station.name_th}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                              <div>ระดับน้ำ: <strong className="text-slate-900">{systemContext.primary_water_station.water_level_msl ?? 'ไม่มี'} m MSL</strong></div>
                              <div>ระดับเตือนภัย: <strong className="text-slate-900">{systemContext.primary_water_station.warning_level_msl ?? '-'} m</strong></div>
                            </div>
                            <div className="text-xs text-slate-500">Source time: {systemContext.primary_water_station.source_timestamp ?? 'Timestamp unavailable'}</div>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-sm">ไม่มีข้อมูลสถานีระดับน้ำใกล้เคียงที่ใช้ได้</div>
                        )}

                        {systemContext?.primary_rain_station && (
                          <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 space-y-1.5">
                            <div className="flex items-center justify-between font-bold text-[#063B70]">
                              <span className="text-sm">สถานีวัดน้ำฝนใกล้สุด:</span>
                              <span className="text-xs text-sky-700 font-mono font-semibold bg-sky-100 px-2 py-0.5 rounded">
                                ห่าง {systemContext.primary_rain_station.distance_km} กม.
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-800">
                              {systemContext.primary_rain_station.name_th}
                            </div>
                            <div className="text-xs text-slate-700 pt-0.5">
                              ฝนสะสม 24 ชม.: <strong className="text-slate-900">{systemContext.primary_rain_station.rain_24h_mm ?? 'ไม่มีข้อมูล'}{systemContext.primary_rain_station.rain_24h_mm != null ? ' มม.' : ''}</strong>
                            </div>
                            <div className="text-xs text-slate-500">Source time: {systemContext.primary_rain_station.source_timestamp ?? 'Timestamp unavailable'}</div>
                          </div>
                        )}

                        <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                          {systemContext?.disclaimer}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 4.5: Information Requests (Citizen Coordination) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('infoRequests')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-amber-600" />
                        5. การขอข้อมูลเพิ่มเติมจากประชาชน (Information Requests)
                        {reportDetail.info_requests && reportDetail.info_requests.length > 0 && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-full text-2xs bg-amber-100 text-amber-800 font-bold">
                            {reportDetail.info_requests.length}
                          </span>
                        )}
                      </span>
                      {openSections.infoRequests ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.infoRequests && (
                      <div className="p-3.5 text-sm space-y-3">
                        {reportDetail.info_requests && reportDetail.info_requests.length > 0 ? (
                          <div className="space-y-2.5">
                            {reportDetail.info_requests.map((ir: any) => (
                              <div key={ir.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                    {ir.request_type === 'UPLOAD_ANOTHER_PHOTO' ? 'ขอภาพถ่ายเพิ่มเติม' :
                                     ir.request_type === 'CONFIRM_LOCATION' ? 'ขอยืนยันจุดเกิดเหตุ' :
                                     ir.request_type === 'CONFIRM_OBSERVATION_TIME' ? 'ขอยืนยันวันเวลาสังเกตเห็น' :
                                     ir.request_type === 'DESCRIBE_WATER_DEPTH' ? 'ขอข้อมูลระดับความลึก' :
                                     ir.request_type === 'CONFIRM_CONDITION_STILL_PRESENT' ? 'สอบถามสภาพน้ำปัจจุบัน' : ir.request_type}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${ir.status === 'ANSWERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {ir.status === 'ANSWERED' ? 'ตอบแล้ว' : 'รอคำตอบ'}
                                  </span>
                                </div>
                                <p className="text-slate-800 font-medium">{ir.request_text}</p>
                                <div className="text-slate-400 text-2xs flex items-center justify-between pt-1 border-t border-amber-100">
                                  <span>โดย: {ir.requested_by}</span>
                                  <span>{ir.requested_at ? new Date(ir.requested_at).toLocaleString('th-TH') : ''}</span>
                                </div>
                                {ir.response_text && (
                                  <div className="mt-1 p-2 rounded bg-white border border-amber-200 text-slate-700">
                                    <strong className="text-emerald-700 block">คำตอบจากประชาชน:</strong>
                                    {ir.response_text}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-center py-2 text-sm">
                            ยังไม่มีการขอข้อมูลเพิ่มเติม
                            <button
                              onClick={() => setInfoModalOpen(true)}
                              className="block mx-auto mt-2 text-sm text-amber-600 font-bold hover:underline disabled:opacity-30"
                            >
                              + ขอข้อมูลเพิ่มเติมจากประชาชน
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 6: Structured Verification Workflow (Section 17) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('verification')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        6. บันทึกการพิสูจน์ข้อเท็จจริง (Structured Verification)
                      </span>
                      {openSections.verification ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.verification && (
                      <div className="p-3.5 text-sm space-y-3">
                        {reportDetail.verification ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">ผลการพิสูจน์:</span>
                              <span className="font-bold text-emerald-700">{reportDetail.verification.status}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>วิธีตรวจสอบ: {reportDetail.verification.method}</span>
                              <span>โดย: {reportDetail.verification.verified_by}</span>
                            </div>

                            {reportDetail.verification.structured_assessment && (
                              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                                <div>
                                  <span className="text-slate-500 block text-xs font-semibold mb-0.5">สิ่งที่ผู้แจ้งระบุ:</span>
                                  <span className="text-slate-800">{reportDetail.verification.structured_assessment.what_was_reported}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-xs font-semibold mb-0.5">สิ่งที่ประจักษ์จากพยานหลักฐาน:</span>
                                  <span className="text-slate-800 font-medium">{reportDetail.verification.structured_assessment.what_was_observed}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-xs font-semibold mb-0.5">ข้อมูลระบบแสดงอะไร:</span>
                                  <span className="text-slate-700">{reportDetail.verification.structured_assessment.what_system_data_shows}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-xs font-semibold mb-0.5">แบบจำลองระบุอะไร:</span>
                                  <span className="text-slate-700">{reportDetail.verification.structured_assessment.what_model_suggests}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-xs font-semibold mb-0.5">สิ่งที่ยังไม่ทราบ:</span>
                                  <span className="text-amber-800">{reportDetail.verification.structured_assessment.what_is_unknown}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-xs font-semibold mb-0.5">ขั้นตอนตรวจสอบถัดไป:</span>
                                  <span className="text-blue-800">{reportDetail.verification.structured_assessment.what_should_be_verified}</span>
                                </div>
                              </div>
                            )}

                            {reportDetail.verification.official_source_evidence && (
                              <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs">
                                <strong>หลักฐานทางการ:</strong> {reportDetail.verification.official_source_evidence}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-center py-2 text-sm">
                            ยังไม่มีการบันทึกการพิสูจน์ข้อเท็จจริง
                            <button
                              onClick={() => setVerifyModalOpen(true)}
                              className="block mx-auto mt-2 text-sm text-blue-600 font-bold hover:underline disabled:opacity-30"
                            >
                              + บันทึกการพิสูจน์ข้อเท็จจริง
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 6: Escalation & External Coordination */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('escalation')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span className="flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-rose-600" />
                        6. การส่งต่อหน่วยงานภายนอก (Escalation)
                      </span>
                      {openSections.escalation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.escalation && (
                      <div className="p-3.5 text-sm space-y-2.5">
                        {reportDetail.escalations?.length > 0 ? (
                          reportDetail.escalations.map((esc: any) => (
                            <div key={esc.id} className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5 text-sm">
                              <div className="flex items-center justify-between font-bold text-rose-900">
                                <span>{esc.destination_team}</span>
                                <span className="text-xs bg-rose-200/80 px-2 py-0.5 rounded font-semibold text-rose-800">{esc.urgency}</span>
                              </div>
                              <p className="text-rose-800 text-sm leading-relaxed">{esc.reason}</p>
                              <div className="text-xs text-slate-500 pt-1">
                                ส่งโดย {esc.escalated_by} เมื่อ {new Date(esc.escalated_at).toLocaleString('th-TH')}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 italic text-center py-2 text-sm">
                            ยังไม่มีการส่งต่อไปยังหน่วยงานภายนอก
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 7: Resolution */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('resolution')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-slate-600" />
                        7. การยุติเรื่องและข้อสรุป (Resolution)
                      </span>
                      {openSections.resolution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.resolution && (
                      <div className="p-3.5 text-sm space-y-2.5">
                        {reportDetail.resolution ? (
                          <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 space-y-1.5">
                            <div className="font-bold text-slate-900 text-sm">
                              ประเภท: {reportDetail.resolution.resolution_type}
                            </div>
                            <p className="text-slate-800 text-sm leading-relaxed">{reportDetail.resolution.resolution_summary}</p>
                            <div className="text-xs text-slate-500 pt-1">
                              ยุติเรื่องโดย {reportDetail.resolution.resolved_by} เมื่อ {new Date(reportDetail.resolution.resolved_at).toLocaleString('th-TH')}
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400 italic text-center py-2 text-sm">
                            รายงานนี้ยังอยู่ระหว่างดำเนินการ (Unresolved)
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 8: Immutable Audit Timeline (Section 22) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => toggleSection('timeline')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm font-bold text-[#063B70]"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        8. ประวัติการปฏิบัติงาน (Immutable Audit Trail)
                      </span>
                      {openSections.timeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSections.timeline && (
                      <div className="p-3.5 text-sm space-y-2.5 divide-y divide-slate-100">
                        {auditTimeline.length === 0 ? (
                          <div className="text-slate-400 italic text-center py-2 text-sm">ไม่มีประวัติ</div>
                        ) : (
                          auditTimeline.map((item) => (
                            <div key={item.audit_id} className="pt-2.5 first:pt-0 space-y-1 text-xs">
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="font-bold text-sm text-[#063B70]">{item.action}</span>
                                <span className="text-xs text-slate-500">
                                  {new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-slate-600">
                                ดำเนินการโดย: <strong className="text-slate-800">{item.actor_id}</strong> ({item.actor_role})
                              </div>
                              {item.reason && <p className="text-slate-700 italic text-xs leading-relaxed">"{item.reason}"</p>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>
          </>
        ) : (
          /* Evidence-backed system health view */
          <div className="space-y-4">
            {(() => {
              const sources = systemHealthData?.sources;
              const metrics = systemHealthData?.metrics;
              const scheduler = systemHealthData?.scheduler;
              const entries = sources?.sources && typeof sources.sources === 'object' ? Object.values(sources.sources) as any[] : null;
              const expectedCounts = entries ? {
                TOTAL_EXTERNAL_SOURCES: entries.length,
                REAL_EXTERNAL_API_SOURCES: entries.filter((item) => item.source_status === 'ACTIVE API').length,
                AUTOMATED_PRODUCTION_SOURCES: entries.filter((item) => item.AUTOMATED_REFRESH === true).length,
                PRODUCTION_REFERENCE_SOURCES: entries.filter((item) => item.source_status === 'LOCAL / VERIFIED REFERENCE').length,
                LOCAL_ONLY_SOURCES: entries.filter((item) => item.source_status === 'LOCAL / UNVERIFIED').length,
                BLOCKED_SOURCES: entries.filter((item) => item.source_status === 'BLOCKED').length,
                TEST_ONLY_SOURCES: entries.filter((item) => item.source_status === 'INTERNAL').length,
              } : null;
              const statusMap: Record<string, string> = {
                'ACTIVE API': 'PRODUCTION_ACTIVE', 'LOCAL / VERIFIED REFERENCE': 'PRODUCTION_REFERENCE',
                'LOCAL / UNVERIFIED': 'LOCAL_UNVERIFIED', INTERNAL: 'INTERNAL', BLOCKED: 'PRODUCTION_BLOCKED',
                'UNAVAILABLE / UNVERIFIED': 'UNAVAILABLE_UNVERIFIED',
              };
              const reasonCodes = new Set(['LOCAL_ARTIFACT_ABSENT', 'LOCAL_PROVENANCE_UNVERIFIED', 'ACCESS_BLOCKED', 'COUNT_NOT_APPLICABLE', 'TIMESTAMP_UNAVAILABLE', 'EVIDENCE_UNKNOWN']);
              const recordsValid = !!entries && entries.every((item) => {
                const countValid = (typeof item?.database_records === 'number' && Number.isInteger(item.database_records) && item.database_records >= 0) || item?.database_records === null;
                const timestampValid = item?.latest_source_timestamp === null || typeof item?.latest_source_timestamp === 'string';
                const missingEvidenceHasReason = (item?.database_records === null || item?.latest_source_timestamp === null)
                  ? reasonCodes.has(item?.reason_code)
                  : true;
                return !!item && typeof item.source_id === 'string' && statusMap[item.source_status] === item.production_status &&
                  typeof item.SOURCE_EXISTS === 'boolean' && countValid && timestampValid && missingEvidenceHasReason;
              });
              const reconciled = !!expectedCounts && Object.entries(expectedCounts).every(([key, value]) => sources.production_counts?.[key] === value) &&
                sources.total_sources_evaluated === entries!.length && recordsValid;
              const valid = !!entries && reconciled && !!metrics && ['healthy', 'degraded'].includes(metrics.status) && !!metrics.pipeline && typeof metrics.pipeline === 'object' &&
                !!scheduler && typeof scheduler.scheduler_active === 'boolean' && !!scheduler.sources && typeof scheduler.sources === 'object';
              const status = !valid ? 'UNKNOWN' : scheduler.scheduler_active === false ? 'INACTIVE' : metrics.status === 'healthy' && metrics.alert_level === 'INFO' ? 'HEALTHY' : metrics.status === 'degraded' ? 'DEGRADED' : 'PARTIAL';
              const color = status === 'HEALTHY' ? 'text-emerald-700 bg-emerald-50' : status === 'UNKNOWN' ? 'text-slate-700 bg-slate-100' : 'text-amber-800 bg-amber-50';
              const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : '—';
              return <>
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">System Health & Observability</h2>
                      <p className="text-xs text-slate-500 mt-1">Status uses source, metrics, and scheduler responses.</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>{status}</div>
                    <button onClick={fetchSystemHealth} disabled={healthLoading} className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${healthLoading ? 'animate-spin' : ''}`} />{healthLoading ? 'Loading' : 'Refresh'}
                    </button>
                  </div>
                  {!valid && <p role="status" className="text-sm text-slate-600">Health evidence is unavailable or malformed.</p>}
                  {valid && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><div className="text-xs text-slate-500">Scheduler</div><div className="font-semibold">{scheduler.scheduler_active ? 'ACTIVE' : 'INACTIVE'}</div><div className="text-xs text-slate-500">{scheduler.system_time ?? 'Timestamp unavailable'}</div></div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><div className="text-xs text-slate-500">Pipeline</div><div className="font-semibold">{metrics.status.toUpperCase()}</div><div className="text-xs text-slate-500">Processed: {number(metrics.pipeline.total_processed)} · Failed: {number(metrics.pipeline.failed_ingestions)}</div></div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><div className="text-xs text-slate-500">Source records</div><div className="font-semibold">{entries!.length}</div><div className="text-xs text-slate-500">Counts reconcile with source records.</div></div>
                  </div>}
                  {valid && Array.isArray(metrics.alert_reasons) && metrics.alert_reasons.length > 0 && <ul className="text-sm text-amber-800 list-disc pl-5">{metrics.alert_reasons.map((reason: string, index: number) => <li key={index}>{reason}</li>)}</ul>}
                </div>
                {valid && <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"><h3 className="font-bold text-sm mb-3">Source evidence</h3><div className="space-y-2">{entries!.map((source: any) => <div key={source.source_id} className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-slate-100 py-2 text-xs"><span className="font-semibold">{source.source_name}</span><span>{source.source_status}</span><span>Records: {number(source.database_records)}</span><span>{source.latest_source_timestamp ?? source.reason_code ?? 'Timestamp unavailable'}</span></div>)}</div></div>}
              </>;
            })()}
          </div>
        )}
      </main>

      {/* =========================================================================
          MODALS & ACTION DIALOGS
         ========================================================================= */}

      {/* 1. Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#063B70] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> มอบหมายงานตรวจสอบ
              </h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">เลือกเจ้าหน้าที่ผู้รับผิดชอบ:</label>
                <select
                  value={assigneeInput}
                  onChange={(e) => setAssigneeInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="">-- เลือกเจ้าหน้าที่ --</option>
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.display_name} ({u.role} - {u.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">คำแนะนำหรือคำสั่งการ:</label>
                <textarea
                  rows={3}
                  value={assignNoteInput}
                  onChange={(e) => setAssignNoteInput(e.target.value)}
                  placeholder="ระบุข้อแนะนำในการตรวจสอบ เช่น ให้ประสานผู้นำชุมชนเพื่อขอข้อมูลตัวอย่างน้ำ..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 font-medium">ยกเลิก</button>
              <button onClick={handleAssign} className="px-5 py-2 bg-[#0C65E8] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm min-h-[40px]">
                บันทึกการมอบหมาย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1.5 Info Request Modal (Citizen Coordination) */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#063B70] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" /> ขอข้อมูลเพิ่มเติมจากประชาชน
              </h3>
              <button onClick={() => setInfoModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">ประเภทข้อมูลที่ต้องการขอเพิ่ม:</label>
                <select
                  value={infoRequestTypeInput}
                  onChange={(e) => setInfoRequestTypeInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="UPLOAD_ANOTHER_PHOTO">ขอภาพถ่ายเพิ่มเติม (มุมกว้าง/ผิวน้ำ/สภาพแวดล้อม)</option>
                  <option value="CONFIRM_LOCATION">ขอยืนยันจุดหรือสถานที่เกิดเหตุชัดเจน</option>
                  <option value="CONFIRM_OBSERVATION_TIME">ขอยืนยันวันเวลาที่สังเกตเห็น</option>
                  <option value="DESCRIBE_WATER_DEPTH">ขอข้อมูลระดับความลึกหรือระยะท่วม</option>
                  <option value="CONFIRM_CONDITION_STILL_PRESENT">สอบถามว่าสภาพน้ำยังคงมีอาการดังกล่าวอยู่หรือไม่</option>
                  <option value="OTHER">ข้อซักถามอื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">ข้อความแจ้งผู้รายงาน:</label>
                <textarea
                  rows={3}
                  value={infoRequestTextInput}
                  onChange={(e) => setInfoRequestTextInput(e.target.value)}
                  placeholder="ระบุข้อความที่ต้องการสื่อสารกับผู้รายงาน เช่น รบกวนช่วยถ่ายภาพบริเวณผิวน้ำให้เห็นสภาพสีและคราบเพิ่มเติม..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button onClick={() => setInfoModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 font-medium">ยกเลิก</button>
              <button onClick={handleRequestInfo} className="px-5 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 shadow-sm min-h-[40px]">
                ส่งคำขอข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Structured Verification Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-[#063B70] flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" /> บันทึกการพิสูจน์ข้อเท็จจริง
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">แยกข้อเท็จจริงระหว่างสิ่งที่รายงานกับสิ่งที่ประจักษ์</p>
              </div>
              <button onClick={() => setVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">ผลการพิสูจน์:</label>
                  <select
                    value={verStatusInput}
                    onChange={(e) => setVerStatusInput(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="VERIFIED_OBSERVATION">VERIFIED_OBSERVATION (ยืนยันข้อสังเกต)</option>
                    <option value="PARTIALLY_VERIFIED">PARTIALLY_VERIFIED (ยืนยันบางส่วน)</option>
                    <option value="OFFICIAL_CONFIRMED">OFFICIAL_CONFIRMED (ทางการยืนยัน)</option>
                    <option value="UNVERIFIED">UNVERIFIED (ยังไม่สามารถยืนยัน)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">วิธีการตรวจสอบ:</label>
                  <select
                    value={verMethodInput}
                    onChange={(e) => setVerMethodInput(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="CROSS_CHECKED_SYSTEM_DATA">CROSS_CHECKED_SYSTEM_DATA (เทียบข้อมูลโทรมาตร)</option>
                    <option value="VISUAL_REVIEW">VISUAL_REVIEW (ตรวจพยานภาพถ่าย)</option>
                    <option value="FIELD_VERIFICATION">FIELD_VERIFICATION (ลงพื้นที่จริง)</option>
                    <option value="MULTIPLE_REPORTS">MULTIPLE_REPORTS (รายงานสอดคล้องกันหลายจุด)</option>
                    <option value="OFFICIAL_SOURCE">OFFICIAL_SOURCE (เอกสารราชการ)</option>
                    <option value="OTHER">OTHER (อื่น ๆ)</option>
                  </select>
                </div>
              </div>

              {verStatusInput === 'OFFICIAL_CONFIRMED' && (
                <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-300 space-y-1">
                  <label className="block text-teal-900 font-bold text-xs">
                    * อ้างอิงหลักฐานหรือหนังสือจากทางการ (Mandatory):
                  </label>
                  <input
                    type="text"
                    value={verOfficialCitation}
                    onChange={(e) => setVerOfficialCitation(e.target.value)}
                    placeholder="เช่น หนังสือราชการกรมควบคุมมลพิษ เลขที่ ทส 0305/..."
                    className="w-full p-2 border border-teal-300 rounded text-xs"
                  />
                </div>
              )}

              {/* 6 Structured Assessment Fields */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 text-sm block">เกณฑ์โครงสร้าง 6 มิติ (Mandatory Assessment):</span>

                <div>
                  <label className="block text-slate-600 text-xs mb-1 font-semibold">1. สิ่งที่ประชาชนรายงาน (What was reported):</label>
                  <input
                    type="text"
                    value={verReportedInput}
                    onChange={(e) => setVerReportedInput(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-xs mb-1 font-semibold">2. สิ่งที่ตรวจสอบพบประจักษ์ (What was observed):</label>
                  <input
                    type="text"
                    value={verObservedInput}
                    onChange={(e) => setVerObservedInput(e.target.value)}
                    placeholder="เช่น พบฟองสีขาวลอยเป็นแนวยาวและมีปลาตาย 4-5 ตัว"
                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-xs mb-1 font-semibold">3. ข้อมูลระบบโทรมาตรแสดงอะไร (System data):</label>
                  <input
                    type="text"
                    value={verSystemInput}
                    onChange={(e) => setVerSystemInput(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-xs mb-1 font-semibold">4. แบบจำลองแนวโน้มแสดงอะไร (Model suggests):</label>
                  <input
                    type="text"
                    value={verModelInput}
                    onChange={(e) => setVerModelInput(e.target.value)}
                    placeholder="เช่น ความเสี่ยงปานกลางในแนวคุ้งน้ำ"
                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-xs mb-1 font-semibold">5. สิ่งที่ยังไม่ทราบแน่ชัด (What is unknown):</label>
                  <input
                    type="text"
                    value={verUnknownInput}
                    onChange={(e) => setVerUnknownInput(e.target.value)}
                    placeholder="เช่น ยังไม่ทราบชนิดสารเคมีเนื่องจากต้องรอผลตรวจแล็บ"
                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-xs mb-1 font-semibold">6. ขั้นตอนการตรวจสอบที่ควรทำต่อไป (Next action):</label>
                  <input
                    type="text"
                    value={verActionInput}
                    onChange={(e) => setVerActionInput(e.target.value)}
                    placeholder="เช่น ส่งเจ้าหน้าที่เก็บตัวอย่างน้ำทดสอบค่า DO/BOD"
                    className="w-full p-2 border border-slate-300 rounded text-sm min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setVerifyModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 font-medium">ยกเลิก</button>
              <button onClick={handleVerify} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm">
                บันทึกผลการพิสูจน์ข้อเท็จจริง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Escalate Modal */}
      {escalateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#063B70] flex items-center gap-2">
                <Send className="w-5 h-5 text-rose-600" /> ส่งต่อรายงานให้หน่วยงาน
              </h3>
              <button onClick={() => setEscalateModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">หน่วยงานปลายทาง:</label>
                <select
                  value={escTeamInput}
                  onChange={(e) => setEscTeamInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="REGIONAL_WATER_OFFICE">สำนักงานทรัพยากรน้ำที่ 6 (สทน.6)</option>
                  <option value="PROVINCIAL_DISASTER_PREVENTION">สนง. ปภ. จังหวัดปราจีนบุรี</option>
                  <option value="POLLUTION_CONTROL_CENTER_7">สำนักงานสิ่งแวดล้อมและควบคุมมลพิษที่ 7</option>
                  <option value="LOCAL_ADMIN_ORG">องค์กรปกครองส่วนท้องถิ่น (อปท. ในพื้นที่)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">ระดับความเร่งด่วน:</label>
                <select
                  value={escUrgencyInput}
                  onChange={(e) => setEscUrgencyInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="URGENT">ด่วนที่สุด (URGENT)</option>
                  <option value="HIGH">ด่วน (HIGH)</option>
                  <option value="NORMAL">ปกติ (NORMAL)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">เหตุผลในการส่งต่อ:</label>
                <textarea
                  rows={2}
                  value={escReasonInput}
                  onChange={(e) => setEscReasonInput(e.target.value)}
                  placeholder="ระบุเหตุผลในการประสาน เช่น พบสัตว์น้ำตายในวงกว้างเกินขอบเขตอำนาจเบื้องต้น..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">สรุปพยานหลักฐานที่ส่งมอบ:</label>
                <textarea
                  rows={2}
                  value={escSummaryInput}
                  onChange={(e) => setEscSummaryInput(e.target.value)}
                  placeholder="เช่น ภาพถ่าย 2 ภาพ พร้อมพิกัด GPS ริมตลิ่งแม่น้ำปราจีนบุรี..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setEscalateModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 font-medium">ยกเลิก</button>
              <button onClick={handleEscalate} className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm">
                ยืนยันการส่งต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Resolve Modal */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#063B70] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-700" /> ยุติเรื่องและบันทึกข้อสรุป
              </h3>
              <button onClick={() => setResolveModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">ประเภทการยุติเรื่อง:</label>
                <select
                  value={resTypeInput}
                  onChange={(e) => setResTypeInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="VERIFIED_OBSERVATION">VERIFIED_OBSERVATION (บันทึกเป็นข้อสังเกตที่ยืนยันแล้ว)</option>
                  <option value="OFFICIAL_CONFIRMATION_RECEIVED">OFFICIAL_CONFIRMATION_RECEIVED (ได้รับผลยืนยันทางการ)</option>
                  <option value="NO_LONGER_PRESENT">NO_LONGER_PRESENT (สภาพความผิดปกติสลายตัวแล้ว)</option>
                  <option value="DUPLICATE">DUPLICATE (รายงานซ้ำซ้อน)</option>
                  <option value="INVALID">INVALID (รายงานไม่ถูกต้อง/ไม่พบเหตุ)</option>
                  <option value="REFERRED">REFERRED (ส่งต่อหน่วยงานรับผิดชอบแล้ว)</option>
                  <option value="INSUFFICIENT_EVIDENCE">INSUFFICIENT_EVIDENCE (หลักฐานไม่เพียงพอ)</option>
                  <option value="OTHER">OTHER (อื่น ๆ)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">สรุปข้อวินิจฉัยสุดท้าย:</label>
                <textarea
                  rows={3}
                  value={resSummaryInput}
                  onChange={(e) => setResSummaryInput(e.target.value)}
                  placeholder="ระบุข้อสรุปผลการปฏิบัติงาน..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setResolveModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 font-medium">ยกเลิก</button>
              <button onClick={handleResolve} className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 shadow-sm">
                บันทึกการยุติเรื่อง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Status Transition Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#063B70]">เปลี่ยนสถานะขั้นตอนการทำงาน</h3>
              <button onClick={() => setStatusModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">สถานะเป้าหมาย:</label>
                <select
                  value={targetStatusInput}
                  onChange={(e) => setTargetStatusInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="NEW">NEW (รายงานใหม่)</option>
                  <option value="TRIAGING">TRIAGING (กำลังคัดกรอง)</option>
                  <option value="ASSIGNED">ASSIGNED (มอบหมายแล้ว)</option>
                  <option value="IN_REVIEW">IN_REVIEW (อยู่ระหว่างตรวจสอบ)</option>
                  <option value="NEED_MORE_INFO">NEED_MORE_INFO (ขอข้อมูลเพิ่ม)</option>
                  <option value="UNDER_VERIFICATION">UNDER_VERIFICATION (รอพิสูจน์)</option>
                  <option value="VERIFIED_OBSERVATION">VERIFIED_OBSERVATION (ยืนยันข้อสังเกต)</option>
                  <option value="OFFICIAL_CONFIRMED">OFFICIAL_CONFIRMED (ทางการยืนยัน)</option>
                  <option value="ESCALATED">ESCALATED (ส่งต่อหน่วยงาน)</option>
                  <option value="RESOLVED">RESOLVED (ยุติเรื่อง)</option>
                  <option value="INVALID">INVALID (ไม่ถูกต้อง)</option>
                  <option value="DUPLICATE">DUPLICATE (ซ้ำซ้อน)</option>
                  <option value="OUT_OF_SCOPE">OUT_OF_SCOPE (อยู่นอกพื้นที่)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">เหตุผลการเปลี่ยนสถานะ:</label>
                <textarea
                  rows={2}
                  value={statusReasonInput}
                  onChange={(e) => setStatusReasonInput(e.target.value)}
                  placeholder="ระบุเหตุผลในการปรับสถานะสำหรับบันทึก Audit Log..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {targetStatusInput === 'OFFICIAL_CONFIRMED' && (
                <div>
                  <label className="block text-teal-800 font-bold mb-1">เอกสารอ้างอิงทางการ (จำเป็น):</label>
                  <input
                    type="text"
                    value={officialEvidenceInput}
                    onChange={(e) => setOfficialEvidenceInput(e.target.value)}
                    placeholder="หนังสือราชการหรือผลตรวจห้องแล็บ..."
                    className="w-full p-2 border border-teal-300 rounded text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setStatusModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 font-medium">ยกเลิก</button>
              <button onClick={handleStatusChange} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm">
                บันทึกการเปลี่ยนสถานะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Publication State Modal */}
      {pubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#063B70] flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-600" /> ควบคุมการเผยแพร่ต่อสาธารณะ
              </h3>
              <button onClick={() => setPubModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">สถานะการเผยแพร่สู่สาธารณะ:</label>
                <select
                  value={pubStateInput}
                  onChange={(e) => setPubStateInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="PRIVATE">PRIVATE (เก็บภายในเท่านั้น — ไม่แสดงผลต่อประชาชน)</option>
                  <option value="PUBLIC_SAFE_SUMMARY">PUBLIC_SAFE_SUMMARY (แสดงผลสรุปแบบปลอดภัย ไม่ระบุตัวบุคคล)</option>
                  <option value="PUBLIC_VERIFIED">PUBLIC_VERIFIED (แสดงเป็นข้อสังเกตที่มีการตรวจสอบแล้ว)</option>
                  <option value="WITHHELD">WITHHELD (ระงับการแสดงผลชั่วคราว)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">เหตุผลในการปรับสถานะการเผยแพร่:</label>
                <textarea
                  rows={2}
                  value={pubReasonInput}
                  onChange={(e) => setPubReasonInput(e.target.value)}
                  placeholder="ระบุเหตุผลเพื่อเก็บบันทึกประวัติ..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setPubModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 font-medium">ยกเลิก</button>
              <button onClick={handlePublicationUpdate} className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 shadow-sm">
                บันทึกสถานะการเผยแพร่
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReportsPage;
