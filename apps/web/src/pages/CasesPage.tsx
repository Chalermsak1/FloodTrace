import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Plus,
  X,
  Compass,
  Globe,
  ExternalLink,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  InformationDetailModal, 
  ExternalInformationDetail 
} from '../components/news/InformationDetailModal';
import { getEvidencePhotoUrl } from '../components/sections/SituationHeroSection';

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
  const [dataMode, setDataMode] = useState<'citizen' | 'external'>('citizen');
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

  // Filter logic for external evidence (Section 23 & 24)
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

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Page Header (Section 20) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200">
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>รายงานข้อสังเกตจากชุมชน</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#063B70] tracking-tight">
            รายงานจากประชาชน
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl leading-relaxed">
            ข้อมูลสังเกตการณ์เบื้องต้นจากชุมชนในจังหวัดปราจีนบุรี เพื่อสนับสนุนการจัดลำดับการเฝ้าระวังและการสุ่มเก็บตัวอย่างน้ำ
          </p>
        </div>

        {/* Primary CTA Button */}
        <Link
          to="/report"
          className="px-5 py-3 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-base font-semibold transition-colors shadow-xs flex items-center justify-center gap-2 shrink-0 min-h-[48px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ รายงานเหตุการณ์ใหม่</span>
        </Link>
      </div>

      {/* Data Mode Switcher (Section 12: Citizen Report Separation - Responsive Stack) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setDataMode('citizen')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between sm:justify-start gap-2 transition-all min-h-[44px] ${
            dataMode === 'citizen'
              ? 'bg-[#063B70] text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>รายงานจากประชาชน (Citizen Reports)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-100/30 text-current">
            {observations.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDataMode('external')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between sm:justify-start gap-2 transition-all min-h-[44px] ${
            dataMode === 'external'
              ? 'bg-purple-800 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>หลักฐานจากแหล่งสาธารณะ (External Evidence)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-purple-100 text-purple-900">
            {externalEvidence.length}
          </span>
        </button>
      </div>

      {/* Provenance Separation Notice (Section 0 & 12) */}
      {dataMode === 'external' && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-sm text-purple-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>หลักการพิสูจน์ข้อเท็จจริง (Truth & Provenance Principle):</span>
          </div>
          <p className="text-purple-800 text-xs sm:text-sm leading-relaxed">
            ข้อมูลในหมวดนี้เป็นภาพ ข่าว และโพสต์ที่เผยแพร่ต่อสาธารณะที่เจ้าหน้าที่บันทึกและตรวจทานที่มา 
            <strong> ไม่นับรวมเป็นรายงานจากประชาชนโดยตรง ไม่ใช่ผลตรวจทางห้องปฏิบัติการ และไม่ใช่การยืนยันการปนเปื้อน</strong>
          </p>
        </div>
      )}

      {/* Horizontal Filter Bar (Section 20) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] ${
                activeFilterTab === tab.id
                  ? (dataMode === 'external' ? 'bg-purple-800 text-white shadow-xs font-semibold' : 'bg-[#063B70] text-white shadow-xs font-semibold')
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter Selector (Citizen reports only) */}
        {dataMode === 'citizen' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 shrink-0">หมวดหมู่:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C65E8] min-h-[40px]"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filters for External Evidence: District, Category, Sort Order (Section 23 & 24) */}
        {dataMode === 'external' && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600 shrink-0">อำเภอ:</span>
              <select
                value={externalDistrict}
                onChange={(e) => setExternalDistrict(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[38px]"
              >
                {DISTRICT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600 shrink-0">หมวดหมู่:</span>
              <select
                value={externalCategory}
                onChange={(e) => setExternalCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[38px]"
              >
                {EXTERNAL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600 shrink-0">เรียงตาม:</span>
              <select
                value={externalSort}
                onChange={(e) => setExternalSort(e.target.value as 'desc' | 'asc')}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[38px]"
              >
                <option value="desc">ล่าสุดก่อน</option>
                <option value="asc">เก่าสุดก่อน</option>
              </select>
            </div>
          </div>
        )}

      </div>

      {/* List Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 text-base">
            กำลังโหลดข้อมูล...
          </div>
        ) : dataMode === 'citizen' ? (
          filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 space-y-2">
              <Eye className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-bold text-slate-700">ไม่พบรายงานในหมวดหมู่นี้</p>
              <p className="text-sm text-slate-500">ยังไม่มีรายงานที่ตรงกับตัวกรองที่เลือก</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedReport(item)}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hover:shadow-card hover:border-[#0C65E8] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                      {item.has_image ? (
                        <ImageIcon className="w-6 h-6 text-amber-700" />
                      ) : (
                        <Eye className="w-6 h-6 text-amber-600" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          {item.category}
                        </span>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {item.status_label || (item.status === 'VERIFIED' ? 'ตรวจสอบแล้ว' : 'กำลังตรวจสอบ')}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-[#063B70] leading-snug line-clamp-1">
                        {item.generalized_location || `บริเวณ อ.${item.district} จ.ปราจีนบุรี`}
                      </h3>

                      <div className="flex items-center gap-1.5 text-sm text-slate-500 pt-1">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{item.observation_time ? new Date(item.observation_time).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'เมื่อเร็วๆ นี้'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-[#0C65E8]">
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
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 space-y-2">
              <Globe className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-base font-bold text-slate-700">ไม่พบหลักฐานจากแหล่งสาธารณะ</p>
              <p className="text-sm text-slate-500">ยังไม่มีข้อมูลจากสื่อหรือข่าวสารสาธารณะที่เปิดเผยในหมวดหมู่นี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvidence.map((ev, idx) => {
                const media = ev.media_references?.[0];
                return (
                  <div
                    key={ev.id || idx}
                    onClick={() => handleEvidenceClick(ev)}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hover:shadow-card hover:border-purple-600 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-purple-200 shadow-xs relative">
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                            {ev.source_platform}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            ev.verification_status === 'CORROBORATED' || ev.verification_status === 'OFFICIAL_VERIFIED'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {ev.verification_status === 'CORROBORATED' || ev.verification_status === 'OFFICIAL_VERIFIED'
                              ? 'สอดคล้องกับพื้นที่'
                              : 'อยู่ระหว่างตรวจสอบ'}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-[#063B70] leading-snug line-clamp-1">
                          {ev.title_or_summary}
                        </h3>

                        {ev.text_excerpt && (
                          <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                            "{ev.text_excerpt}"
                          </p>
                        )}

                        <div className="text-xs text-slate-600">
                          แหล่งที่มา: <span className="font-medium text-purple-900">{ev.source_name}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ev.location_text || (ev.district ? `อ.${ev.district}` : 'จ.ปราจีนบุรี')} ({ev.location_precision})</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{ev.observed_at ? `พบเมื่อ ${new Date(ev.observed_at).toLocaleString('th-TH')}` : `เผยแพร่เมื่อ ${new Date(ev.published_at).toLocaleString('th-TH')}`}</span>
                        </div>

                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block text-3xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            ข้อมูลอ้างอิงจากแหล่งสาธารณะภายนอก (External Evidence)
                          </span>
                          {ev.related_sources_count && ev.related_sources_count > 1 && (
                            <span className="inline-block text-3xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {ev.related_sources_count} แหล่งข้อมูลอ้างอิง
                            </span>
                          )}
                          {ev.related_news && ev.related_news.length > 0 && (
                            <span className="inline-block text-3xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ข่าวสนับสนุน ({ev.related_news.length})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-purple-700">
                      <span>ดูรายละเอียดและหลักฐานต้นทาง</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Citizen Report Detail Modal (Responsive Sheet on Mobile) */}
      {selectedReport && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedReport(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 text-slate-800 max-h-[90vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                  รายงานข้อสังเกตจากประชาชน
                </span>
                <h3 className="font-bold text-lg text-[#063B70] mt-0.5">
                  {selectedReport.category}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="font-semibold text-slate-800 text-xs sm:text-sm">พื้นที่โดยประมาณ (Generalized Area):</div>
                <div className="text-slate-700 font-medium">{selectedReport.generalized_location || `อำเภอ${selectedReport.district}`}</div>
                <div className="text-2xs text-slate-500 pt-1">
                  * พิกัดตำแหน่งถูกปัดเศษตามมาตรฐานความปลอดภัยข้อมูลเพื่อปกป้องความเป็นส่วนตัวของผู้รายงาน
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="font-semibold text-slate-800 text-xs sm:text-sm">เวลาที่สังเกตเห็น:</div>
                <div className="text-slate-700 font-medium">
                  {selectedReport.observation_time ? new Date(selectedReport.observation_time).toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900 leading-relaxed">
                <div className="font-semibold mb-1">คำชี้แจงมาตรฐาน:</div>
                {selectedReport.classification_explanation || 'รายงานจากประชาชนเป็นข้อมูลสังเกตการณ์เบื้องต้น ยังไม่ถือเป็นผลยืนยันทางห้องปฏิบัติการ และไม่ได้ระบุผู้ก่อมลพิษ'}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0C65E8] hover:bg-[#063B70] text-white rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Evidence Detail Modal */}
      <InformationDetailModal
        item={selectedEvidenceDetail}
        onClose={() => setSelectedEvidenceDetail(null)}
      />

    </div>
  );
};
