import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Image as ImageIcon,
  ShieldCheck, 
  Plus, 
  Globe, 
  ExternalLink, 
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  InformationDetailModal, 
  ExternalInformationDetail 
} from '../components/news/InformationDetailModal';
import { getEvidencePhotoUrl } from '../components/sections/SituationHeroSection';
import { 
  Badge, 
  Button, 
  Modal, 
  Tabs, 
  EmptyState, 
  LoadingSkeleton,
  PageHeader,
  Card 
} from '../components/ui';

const FILTER_TABS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'near_me', label: 'ใกล้ฉัน' },
  { id: 'in_review', label: 'กำลังตรวจสอบ' },
  { id: 'verified', label: 'ตรวจสอบแล้ว' }
];

const CATEGORIES = [
  'ทั้งหมด',
  'น้ำเปลี่ยนสี',
  'คราบบนผิวน้ำ',
  'กลิ่นสารเคมี / กลิ่นผิดปกติ',
  'ฟอง / ตะกอนผิดปกติ',
  'สัตว์น้ำตาย',
  'ขยะ / วัสดุผิดปกติ'
];

const EXTERNAL_CATEGORIES = [
  'ทั้งหมด',
  'น้ำท่วม (Flood)',
  'การสัญจรและถนน (Road Access)',
  'ผลกระทบชุมชน (Community Impact)',
  'สภาพน้ำและสิ่งแวดล้อม (Environmental)',
  'การช่วยเหลือและอพยพ (Assistance & Evacuation)',
];

const DISTRICT_OPTIONS = [
  'ทุกอำเภอ',
  'กบินทร์บุรี',
  'ศรีมหาโพธิ',
  'เมืองปราจีนบุรี',
  'บ้านสร้าง',
];

export const CasesPage: React.FC = () => {
  const [dataMode, setDataMode] = useState<string>('citizen');
  const [observations, setObservations] = useState<any[]>([]);
  const [externalEvidence, setExternalEvidence] = useState<any[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [externalCategory, setExternalCategory] = useState<string>('ทั้งหมด');
  const [externalDistrict, setExternalDistrict] = useState<string>('ทุกอำเภอ');
  const [externalSort, setExternalSort] = useState<'desc' | 'asc'>('desc');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedEvidenceDetail, setSelectedEvidenceDetail] = useState<ExternalInformationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const handleEvidenceClick = (ev: any) => {
    const detail: ExternalInformationDetail = {
      id: ev.id,
      source_name: ev.source_name || 'สื่อสาธารณะ',
      source_type: ev.evidence_type || 'EXTERNAL_EVIDENCE',
      authority_level: ev.verification_status === 'OFFICIAL_VERIFIED' ? 'OFFICIAL' : 'SECONDARY',
      source_platform: ev.source_platform,
      source_url: ev.source_url,
      title: ev.title_or_summary || 'รายงานสังเกตการณ์',
      summary: ev.description,
      factual_details: ev.text_excerpt,
      published_at: ev.published_at,
      observed_at: ev.observed_at,
      retrieved_at: ev.retrieved_at,
      district: ev.district,
      subdistrict: ev.subdistrict,
      location_text: ev.location_text,
      public_latitude: ev.public_latitude ?? ev.latitude,
      public_longitude: ev.public_longitude ?? ev.longitude,
      location_precision: ev.location_precision,
      source_image_url: getEvidencePhotoUrl(ev),
      verification_status: ev.verification_status,
      provenance: ev.provenance,
      related_sources_count: ev.related_sources_count,
      related_sources: ev.related_sources,
      related_news: ev.related_news
    };
    setSelectedEvidenceDetail(detail);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/public/observations').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/public/external-evidence?group_by_event=true').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([obsData, evData]) => {
      setObservations(Array.isArray(obsData) ? obsData : []);
      setExternalEvidence(Array.isArray(evData) ? evData : []);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load observations/evidence:', err);
      setLoading(false);
    });
  }, []);

  // Filter logic for citizen reports
  const filteredReports = observations.filter(item => {
    // Filter by tab
    if (activeFilterTab === 'in_review') {
      if (item.status === 'VERIFIED') return false;
    } else if (activeFilterTab === 'verified') {
      if (item.status !== 'VERIFIED') return false;
    }

    // Filter by category
    if (selectedCategory !== 'ทั้งหมด') {
      if (!item.category?.includes(selectedCategory) && !selectedCategory.includes(item.category)) {
        return false;
      }
    }

    return true;
  });

  // Filter logic for external evidence
  const filteredEvidence = React.useMemo(() => {
    const seen = new Set<string>();
    return externalEvidence.filter(item => {
      // Deduplication safeguard
      if (item.is_duplicate) return false;
      const key = item.source_group_id || item.id;
      if (seen.has(key)) return false;
      seen.add(key);

      // 1. Status tab filter
      if (activeFilterTab === 'verified') {
        if (item.verification_status !== 'CORROBORATED' && item.verification_status !== 'OFFICIAL_VERIFIED') return false;
      } else if (activeFilterTab === 'in_review') {
        if (item.verification_status !== 'UNVERIFIED') return false;
      }

      // 2. District filter
      if (externalDistrict !== 'ทุกอำเภอ' && item.district !== externalDistrict) {
        return false;
      }

      // 3. Category filter
      if (externalCategory !== 'ทั้งหมด') {
        const evType = item.event_type || '';
        if (externalCategory.startsWith('น้ำท่วม') && evType !== 'FLOODING') return false;
        if (externalCategory.startsWith('การสัญจรและถนน') && !['ROAD_ACCESS', 'ROAD_FLOODING', 'TRAVEL_IMPACT'].includes(evType)) return false;
        if (externalCategory.startsWith('ผลกระทบชุมชน') && !['COMMUNITY_IMPACT', 'PROPERTY_IMPACT', 'INFRASTRUCTURE_IMPACT'].includes(evType)) return false;
        if (externalCategory.startsWith('สภาพน้ำและสิ่งแวดล้อม') && !['WATER_APPEARANCE', 'ENVIRONMENTAL_OBSERVATION', 'ABNORMAL_WATER_COLOR', 'FOAM'].includes(evType)) return false;
        if (externalCategory.startsWith('การช่วยเหลือและอพยพ') && !['ASSISTANCE_REQUEST', 'COMMUNITY_RESPONSE', 'EVACUATION'].includes(evType)) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.observed_at || a.published_at || 0).getTime();
      const timeB = new Date(b.observed_at || b.published_at || 0).getTime();
      return externalSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [externalEvidence, activeFilterTab, externalCategory, externalDistrict, externalSort]);

  const modeTabs = [
    {
      id: 'citizen',
      label: 'รายงานจากประชาชน',
      icon: <Eye className="w-4 h-4" />,
      badge: observations.length
    },
    {
      id: 'external',
      label: 'หลักฐานจากแหล่งสาธารณะ',
      icon: <Globe className="w-4 h-4" />,
      badge: externalEvidence.length
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Unified PageHeader */}
      <PageHeader
        title="รายงานและหลักฐานภาคสนาม"
        subtitle="ข้อมูลสังเกตการณ์เบื้องต้นจากชุมชนและหลักฐานสาธารณะในจังหวัดปราจีนบุรี เพื่อสนับสนุนการจัดลำดับการเฝ้าระวังและการสุ่มเก็บตัวอย่างน้ำ"
        badge={
          <Badge variant="watch" icon={<Eye className="w-3.5 h-3.5" />}>
            รายงานจากชุมชน & หลักฐาน
          </Badge>
        }
        actions={
          <Link to="/report">
            <Button
              variant="primary"
              size="md"
              iconLeft={<Plus className="w-4 h-4" />}
              className="w-full sm:w-auto shrink-0 shadow-xs"
            >
              + ส่งรายงานเหตุการณ์ใหม่
            </Button>
          </Link>
        }
      />

      {/* Data Mode Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs
          tabs={modeTabs}
          activeTab={dataMode}
          onChange={(id) => setDataMode(id)}
          variant="pills"
        />

        {dataMode === 'external' && (
          <Badge variant="evidence" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Truth & Provenance Verified
          </Badge>
        )}
      </div>

      {/* Provenance Separation Notice */}
      {dataMode === 'external' && (
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 text-sm text-purple-900 space-y-1 shadow-2xs animate-in fade-in duration-150">
          <div className="font-bold flex items-center gap-1.5 text-xs sm:text-sm">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
            <span>หลักการพิสูจน์ข้อเท็จจริง (Truth & Provenance Principle):</span>
          </div>
          <p className="text-purple-800 text-xs sm:text-sm leading-relaxed">
            ข้อมูลในหมวดนี้เป็นภาพ ข่าว และโพสต์ที่เผยแพร่ต่อสาธารณะที่เจ้าหน้าที่บันทึกและตรวจทานที่มา 
            <strong> ไม่นับรวมเป็นรายงานจากประชาชนโดยตรง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การยืนยันการปนเปื้อน</strong>
          </p>
        </div>
      )}

      {/* Horizontal Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[38px] cursor-pointer ${
                activeFilterTab === tab.id
                  ? (dataMode === 'external' 
                      ? 'bg-purple-700 text-white shadow-2xs' 
                      : 'bg-[#0A2540] text-white shadow-2xs')
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter Selector (Citizen reports only) */}
        {dataMode === 'citizen' && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-slate-500 shrink-0">หมวดหมู่:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0284C7] min-h-[38px] cursor-pointer"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filters for External Evidence */}
        {dataMode === 'external' && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 shrink-0">อำเภอ:</span>
              <select
                value={externalDistrict}
                onChange={(e) => setExternalDistrict(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[36px] cursor-pointer"
              >
                {DISTRICT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 shrink-0">หมวดหมู่:</span>
              <select
                value={externalCategory}
                onChange={(e) => setExternalCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[36px] cursor-pointer"
              >
                {EXTERNAL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 shrink-0">เรียงตาม:</span>
              <select
                value={externalSort}
                onChange={(e) => setExternalSort(e.target.value as 'desc' | 'asc')}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[36px] cursor-pointer"
              >
                <option value="desc">ล่าสุดก่อน</option>
                <option value="asc">เก่าสุดก่อน</option>
              </select>
            </div>
          </div>
        )}

      </div>

      {/* List Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoadingSkeleton count={4} className="h-44" />
          </div>
        ) : dataMode === 'citizen' ? (
          filteredReports.length === 0 ? (
            <EmptyState
              icon={<Eye className="w-8 h-8 text-slate-400" />}
              title="ไม่พบรายงานในหมวดหมู่นี้"
              description="ยังไม่มีรายงานข้อสังเกตที่ตรงกับตัวกรองที่เลือกในขณะนี้"
              action={
                <Link to="/report">
                  <Button variant="outline" size="sm" iconLeft={<Plus className="w-4 h-4" />}>
                    ส่งรายงานแรก
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedReport(item)}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-card hover:border-[#0284C7]/60 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/80 group-hover:bg-amber-100 transition-colors">
                      {item.has_image ? (
                        <ImageIcon className="w-6 h-6 text-amber-700" />
                      ) : (
                        <Eye className="w-6 h-6 text-amber-600" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="watch">
                          {item.category}
                        </Badge>

                        <Badge variant={item.status === 'VERIFIED' ? 'normal' : 'neutral'}>
                          {item.status_label || (item.status === 'VERIFIED' ? 'ตรวจสอบแล้ว' : 'กำลังตรวจสอบ')}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-base text-[#0A2540] leading-snug line-clamp-1 group-hover:text-[#0284C7] transition-colors">
                        {item.generalized_location || `บริเวณ อ.${item.district} จ.ปราจีนบุรี`}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {item.observation_time 
                            ? new Date(item.observation_time).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) 
                            : 'เมื่อเร็วๆ นี้'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-semibold text-[#0284C7]">
                    <span>ดูรายละเอียดข้อสังเกต</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* External Evidence List */
          filteredEvidence.length === 0 ? (
            <EmptyState
              icon={<Globe className="w-8 h-8 text-purple-400" />}
              title="ไม่พบหลักฐานจากแหล่งสาธารณะ"
              description="ยังไม่มีข้อมูลจากสื่อหรือข่าวสารสาธารณะที่เปิดเผยในหมวดหมู่นี้"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvidence.map((ev, idx) => (
                <div
                  key={ev.id || idx}
                  onClick={() => handleEvidenceClick(ev)}
                  className="bg-white rounded-2xl p-5 border border-purple-100/90 shadow-2xs hover:shadow-card hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-purple-200/80 shadow-2xs relative">
                      <img 
                        src={getEvidencePhotoUrl(ev)} 
                        alt={ev.title_or_summary} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('evd_013_bangtaen_road.jpg')) {
                            target.src = '/assets/evidence/evd_013_bangtaen_road.jpg';
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="evidence">
                          {ev.source_platform}
                        </Badge>

                        <Badge 
                          variant={
                            ev.verification_status === 'CORROBORATED' || ev.verification_status === 'OFFICIAL_VERIFIED'
                              ? 'evidence'
                              : 'watch'
                          }
                        >
                          {ev.verification_status === 'CORROBORATED' || ev.verification_status === 'OFFICIAL_VERIFIED'
                            ? 'สอดคล้องกับพื้นที่'
                            : 'อยู่ระหว่างตรวจสอบ'}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-base text-[#0A2540] leading-snug line-clamp-1 group-hover:text-purple-700 transition-colors">
                        {ev.title_or_summary}
                      </h3>

                      {ev.text_excerpt && (
                        <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                          "{ev.text_excerpt}"
                        </p>
                      )}

                      <div className="text-xs text-slate-600">
                        แหล่งที่มา: <span className="font-semibold text-purple-900">{ev.source_name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{ev.location_text || (ev.district ? `อ.${ev.district}` : 'จ.ปราจีนบุรี')} ({ev.location_precision})</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {ev.observed_at 
                            ? `พบเมื่อ ${new Date(ev.observed_at).toLocaleString('th-TH')}` 
                            : `เผยแพร่เมื่อ ${new Date(ev.published_at).toLocaleString('th-TH')}`}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-block text-2xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          หลักฐานจากแหล่งสาธารณะ (External Evidence)
                        </span>
                        {ev.related_sources_count && ev.related_sources_count > 1 && (
                          <span className="inline-block text-2xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            {ev.related_sources_count} แหล่งอ้างอิง
                          </span>
                        )}
                        {ev.related_news && ev.related_news.length > 0 && (
                          <span className="inline-block text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ข่าวสนับสนุน ({ev.related_news.length})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100/70 flex items-center justify-between text-xs sm:text-sm font-semibold text-purple-700">
                    <span>ดูรายละเอียดและหลักฐานต้นทาง</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Citizen Report Detail Modal using UI Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={selectedReport.category}
          subtitle={`รายงานข้อสังเกตจากประชาชน — ${selectedReport.generalized_location || `อำเภอ${selectedReport.district}`}`}
          badge={<Badge variant="watch">รายงานจากประชาชน</Badge>}
          footer={
            <Button
              variant="primary"
              size="md"
              onClick={() => setSelectedReport(null)}
            >
              ปิดหน้าต่าง
            </Button>
          }
        >
          <div className="space-y-3.5 text-sm sm:text-base text-slate-700 leading-relaxed">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <div className="font-semibold text-slate-800 text-xs sm:text-sm">พื้นที่โดยประมาณ (Generalized Area):</div>
              <div className="text-slate-900 font-bold">{selectedReport.generalized_location || `อำเภอ${selectedReport.district}`}</div>
              <div className="text-2xs text-slate-500 pt-1">
                * พิกัดตำแหน่งถูกปัดเศษตามมาตรฐานความปลอดภัยข้อมูลเพื่อปกป้องความเป็นส่วนตัวของผู้รายงาน
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <div className="font-semibold text-slate-800 text-xs sm:text-sm">เวลาที่สังเกตเห็น:</div>
              <div className="text-slate-800 font-medium">
                {selectedReport.observation_time ? new Date(selectedReport.observation_time).toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-900 leading-relaxed">
              <div className="font-bold mb-1">คำชี้แจงมาตรฐาน:</div>
              {selectedReport.classification_explanation || 'รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์เบื้องต้น ยังไม่ถือเป็นผลยืนยันทางห้องปฏิบัติการ และไม่ได้ระบุผู้ก่อมลพิษ'}
            </div>
          </div>
        </Modal>
      )}

      {/* External Evidence Detail Modal */}
      <InformationDetailModal
        item={selectedEvidenceDetail}
        onClose={() => setSelectedEvidenceDetail(null)}
      />

    </div>
  );
};
