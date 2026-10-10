import React, { useState } from 'react';
import { 
  Layers, 
  X, 
  Eye, 
  EyeOff, 
  Sliders, 
  ChevronDown, 
  ChevronRight, 
  Info,
  Droplets,
  CloudRain,
  Newspaper,
  FlaskConical,
  Users,
  Compass,
  MapPin,
  CheckCircle2,
  Globe,
  Route,
  Tag
} from 'lucide-react';

export interface VisibleLayersState {
  flooding: boolean;
  environmental: boolean;
  monitoringStations: boolean;
  citizenReports: boolean;
  news: boolean;
  monitoringSurface: boolean;
  waterways: boolean;
  stations: boolean;
  rainfallStations: boolean;
  observations: boolean;
  externalEvidence: boolean;
  outsideMask: boolean;
  adminLabels: boolean;
  roadOverlay: boolean;
}

export interface LayerCountsState {
  floodPoints: number;
  waterways: number;
  environmental: number;
  monitoringStations: number;
  waterStations: number;
  rainfallStations: number;
  citizenReports: number;
  newsItems: number;
  verifiedCount: number;
}

export type ViewPreset = 'all' | 'flood' | 'hydro' | 'environmental' | 'news' | 'custom';

interface WebGISLayerManagerProps {
  visibleLayers: VisibleLayersState;
  onToggleLayer: (key: keyof VisibleLayersState) => void;
  surfaceOpacity: number;
  onChangeSurfaceOpacity: (opacity: number) => void;
  basemap: 'satellite' | 'streets';
  onChangeBasemap: (basemap: 'satellite' | 'streets') => void;
  layerCounts: LayerCountsState;
  activePreset: ViewPreset;
  onApplyPreset: (preset: ViewPreset) => void;
  onClose: () => void;
}

export const WebGISLayerManager: React.FC<WebGISLayerManagerProps> = ({
  visibleLayers,
  onToggleLayer,
  surfaceOpacity,
  onChangeSurfaceOpacity,
  basemap,
  onChangeBasemap,
  layerCounts,
  activePreset,
  onApplyPreset,
  onClose
}) => {
  // Collapsible Groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    hazard: false,
    hydro: false,
    field: false,
    base: false
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="w-full flex flex-col h-full bg-white text-slate-800 font-sans select-none">
      
      {/* 1. Header with MapStore-style clean title & close */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/90 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">จัดการชั้นข้อมูลแผนที่ (Layer Manager)</h3>
            <span className="text-3xs text-slate-500 font-medium">WebGIS • สารสนเทศลุ่มน้ำปราจีนบุรี</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          title="ปิดหน้าต่างชั้นข้อมูล"
          aria-label="ปิด"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Quick Presets Bar (MapStore Thematic Modes) */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-white">
        <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          โหมดการทำงานด่วน (Map View Presets)
        </span>
        <div className="grid grid-cols-5 gap-1 text-2xs font-semibold text-center">
          <button
            type="button"
            onClick={() => onApplyPreset('all')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              activePreset === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('flood')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              activePreset === 'flood'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            น้ำท่วม
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('hydro')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              activePreset === 'hydro'
                ? 'bg-[#D97706] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            อุทกวิทยา
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('environmental')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              activePreset === 'environmental'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            สิ่งแวดล้อม
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('news')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              activePreset === 'news'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ข่าวสาร
          </button>
        </div>
      </div>

      {/* 3. Scrollable Layer Tree */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 divide-y divide-slate-100">

        {/* ============================================================== */}
        {/* GROUP 1: สภาวะน้ำท่วมและขอบเขตวิเคราะห์ (Flood & Hazard)           */}
        {/* ============================================================== */}
        <div className="space-y-2 pt-1 first:pt-0">
          <div 
            onClick={() => toggleGroup('hazard')}
            className="flex items-center justify-between cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-blue-700">
              {collapsedGroups.hazard ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              <span>1. สภาวะน้ำท่วมและขอบเขตวิเคราะห์</span>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200/80">
              {layerCounts.floodPoints} จุด
            </span>
          </div>

          {!collapsedGroups.hazard && (
            <div className="space-y-2 pl-3.5 border-l-2 border-sky-100">
              
              {/* Layer 1.1: Flooding Points */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.flooding ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-[#0284C7] shrink-0 border border-white shadow-xs"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">จุดรายงานน้ำท่วมและน้ำขัง</div>
                      <div className="text-3xs text-sky-800">จุดสังเกตการณ์น้ำท่วมจากแหล่งสาธารณะ</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('flooding')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.flooding ? 'text-sky-700 hover:bg-sky-100' : 'text-slate-400 hover:bg-slate-200'}`}
                    title={visibleLayers.flooding ? 'ซ่อนชั้นข้อมูล' : 'แสดงชั้นข้อมูล'}
                  >
                    {visibleLayers.flooding ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Layer 1.2: Monitoring Priority Surface */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.monitoringSurface ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 shrink-0 border border-white shadow-xs"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">พื้นผิวการเฝ้าระวัง (Priority Surface)</div>
                      <div className="text-3xs text-slate-500">กริดวิเคราะห์ความเสี่ยงต่อเนื่อง 7 อำเภอ</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('monitoringSurface')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.monitoringSurface ? 'text-sky-700 hover:bg-sky-100' : 'text-slate-400 hover:bg-slate-200'}`}
                    title={visibleLayers.monitoringSurface ? 'ซ่อนชั้นข้อมูล' : 'แสดงชั้นข้อมูล'}
                  >
                    {visibleLayers.monitoringSurface ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Inline Opacity Slider for Priority Surface */}
                {visibleLayers.monitoringSurface && (
                  <div className="mt-2 pt-2 border-t border-sky-200/60 space-y-1">
                    <div className="flex items-center justify-between text-3xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-slate-400" />
                        <span>ความโปร่งแสงพื้นผิว</span>
                      </span>
                      <span className="font-bold text-slate-700">{Math.round(surfaceOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.65"
                      step="0.05"
                      value={surfaceOpacity}
                      onChange={(e) => onChangeSurfaceOpacity(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Layer 1.3: Outside Scope Mask */}
              <div className={`p-2 rounded-xl border transition-all ${visibleLayers.outsideMask ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-200/60 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-slate-800 shrink-0 border border-white"></span>
                    <div>
                      <div className="text-2xs font-semibold text-slate-800">หน้ากากนอกเขตปราจีนบุรี</div>
                      <div className="text-3xs text-slate-400">ควบคุมขอบเขตวิเคราะห์เชิงพื้นที่</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('outsideMask')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.outsideMask ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.outsideMask ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* GROUP 2: โครงข่ายอุทกวิทยา (Hydrological Network)                */}
        {/* ============================================================== */}
        <div className="space-y-2 pt-3">
          <div 
            onClick={() => toggleGroup('hydro')}
            className="flex items-center justify-between cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-blue-700">
              {collapsedGroups.hydro ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              <span>2. โครงข่ายอุทกวิทยา (Hydrology)</span>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
              {layerCounts.monitoringStations} สถานี • {layerCounts.waterways} ลำน้ำ
            </span>
          </div>

          {!collapsedGroups.hydro && (
            <div className="space-y-2 pl-3.5 border-l-2 border-amber-100">
              
              {/* Layer 2.1: Waterways Network */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.waterways ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3.5 h-1.5 rounded-full bg-[#0284c7] shrink-0 border border-white"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        แม่น้ำและลำคลองสายหลัก ({layerCounts.waterways} สาย)
                      </div>
                      <div className="text-3xs text-blue-900">
                        ทาสีตามโทรมาตรจริงเฉพาะ HIGH CONFIDENCE
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('waterways')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.waterways ? 'text-blue-700 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.waterways ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Layer 2.2: Water Level Stations */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.stations ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-[#D97706] shrink-0 border border-white shadow-xs"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        สถานีวัดระดับน้ำ ({layerCounts.waterStations} แห่ง)
                      </div>
                      <div className="text-3xs text-amber-800">โทรมาตรจาก สสน. (ThaiWater) & กรมชลประทาน (RID)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('stations')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.stations ? 'text-amber-700 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.stations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Layer 2.3: Rainfall Stations */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.rainfallStations ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B] shrink-0 border border-white shadow-xs"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        สถานีวัดน้ำฝนอัตโนมัติ ({layerCounts.rainfallStations} แห่ง)
                      </div>
                      <div className="text-3xs text-amber-800">ปริมาณฝนสะสม 24 ชม. และรายชั่วโมง</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('rainfallStations')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.rainfallStations ? 'text-amber-700 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.rainfallStations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* GROUP 3: ข้อมูลข่าวสารและหลักฐานภาคสนาม (News & Field)            */}
        {/* ============================================================== */}
        <div className="space-y-2 pt-3">
          <div 
            onClick={() => toggleGroup('field')}
            className="flex items-center justify-between cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-blue-700">
              {collapsedGroups.field ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              <span>3. ข่าวสารและข้อมูลภาคสนาม</span>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200/80">
              {layerCounts.newsItems} ข่าว • {layerCounts.environmental} หลักฐาน
            </span>
          </div>

          {!collapsedGroups.field && (
            <div className="space-y-2 pl-3.5 border-l-2 border-purple-100">
              
              {/* Layer 3.1: Curated News Locations (Navy #1E3A8A) */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.news ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-[#1E3A8A] shrink-0 border border-white shadow-xs"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                        <span>ข่าวสารจากสื่อมวลชน</span>
                        <span className="text-3xs font-bold px-1.5 py-0.2 rounded-full bg-indigo-200/70 text-indigo-950">
                          {layerCounts.newsItems} ข่าว
                        </span>
                      </div>
                      <div className="text-3xs text-indigo-900">ข่าวที่มีพิกัดอำเภอชัดเจน พร้อมภาพประกอบ</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('news')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.news ? 'text-indigo-700 hover:bg-indigo-100' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.news ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Layer 3.2: External Evidence (Purple #7C3AED) */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.environmental ? 'bg-purple-50/70 border-purple-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-[#7C3AED] shrink-0 border border-white shadow-xs"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                        <span>ข้อสังเกตสิ่งแวดล้อม (External Evidence)</span>
                        <span className="text-3xs font-bold px-1.5 py-0.2 rounded-full bg-purple-200/70 text-purple-950">
                          {layerCounts.environmental} รายการ
                        </span>
                      </div>
                      <div className="text-3xs text-purple-900">ฟอง คราบ สีน้ำผิดปกติ (สังเกตทางกายภาพ)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('environmental')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.environmental ? 'text-purple-700 hover:bg-purple-100' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.environmental ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-3xs text-slate-400 mt-1 pl-5 italic">
                  * ข้อสังเกตทางกายภาพ ไม่ใช่การยืนยันมลพิษทางเคมี
                </div>
              </div>

              {/* Layer 3.3: Citizen Reports (Orange #EA580C) */}
              <div className={`p-2.5 rounded-xl border transition-all ${visibleLayers.citizenReports ? 'bg-orange-50/70 border-orange-200' : 'bg-slate-50 border-slate-200/70 opacity-70'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full bg-[#EA580C] shrink-0 border border-white shadow-xs"></span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                        <span>รายงานจากประชาชน (Citizen Reports)</span>
                        <span className="text-3xs font-bold px-1.5 py-0.2 rounded-full bg-orange-200/70 text-orange-950">
                          {layerCounts.citizenReports} เรื่อง
                        </span>
                      </div>
                      <div className="text-3xs text-orange-900">พิกัดระดับตำบล (~1.1 กม.) เพื่อความเป็นส่วนตัว</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('citizenReports')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.citizenReports ? 'text-orange-700 hover:bg-orange-100' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.citizenReports ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Verification Ring Explanation Box */}
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-3xs font-bold">
                    ✓
                  </span>
                  <span className="text-xs font-bold text-emerald-950">สัญลักษณ์การยืนยัน (Verification Ring)</span>
                </div>
                <p className="text-3xs text-emerald-800 leading-relaxed">
                  วงแหวนสีเขียว <strong className="font-semibold text-emerald-900">#16A34A</strong> จะปรากฏบนหมุดเฉพาะเมื่อมีเอกสารยืนยันจากหน่วยงานหรือผลตรวจแล็บจริงเท่านั้น (พบ {layerCounts.verifiedCount} รายการ)
                </p>
              </div>

            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* GROUP 4: แผนที่ฐานและข้อมูลภูมิศาสตร์ (Basemap & Geography)        */}
        {/* ============================================================== */}
        <div className="space-y-2 pt-3">
          <div 
            onClick={() => toggleGroup('base')}
            className="flex items-center justify-between cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-blue-700">
              {collapsedGroups.base ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              <span>4. แผนที่ฐานและป้ายชื่อภูมิศาสตร์</span>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {basemap === 'satellite' ? 'ดาวเทียม' : 'ถนน'}
            </span>
          </div>

          {!collapsedGroups.base && (
            <div className="space-y-2 pl-3.5 border-l-2 border-slate-200">
              
              {/* Basemap Switcher Tiles */}
              <div className="space-y-1">
                <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">
                  เลือกแผนที่ฐาน (Base Maps):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeBasemap('satellite')}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                      basemap === 'satellite'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center text-xs">
                      🛰️
                    </div>
                    <div>
                      <div className="text-2xs font-bold text-slate-900">ภาพดาวเทียม</div>
                      <div className="text-3xs text-slate-500">ESRI World Imagery</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeBasemap('streets')}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                      basemap === 'streets'
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-blue-600 flex items-center justify-center text-xs">
                      🗺️
                    </div>
                    <div>
                      <div className="text-2xs font-bold text-slate-900">แผนที่ถนน</div>
                      <div className="text-3xs text-slate-500">Carto Positron / OSM</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Admin Labels */}
              <div className={`p-2 rounded-xl border transition-all ${visibleLayers.adminLabels ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-200/60 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <div>
                      <div className="text-2xs font-semibold text-slate-800">ป้ายชื่ออำเภอและตำบล</div>
                      <div className="text-3xs text-slate-400">ตัวอักษรตรวจจับการชนกันอัตโนมัติ</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('adminLabels')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.adminLabels ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.adminLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Roads Overlay */}
              <div className={`p-2 rounded-xl border transition-all ${visibleLayers.roadOverlay ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-200/60 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Route className="w-3.5 h-3.5 text-slate-500" />
                    <div>
                      <div className="text-2xs font-semibold text-slate-800">เส้นทางคมนาคมและทางหลวง</div>
                      <div className="text-3xs text-slate-400">โครงข่ายถนนเพื่อการสัญจร</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleLayer('roadOverlay')}
                    className={`p-1.5 rounded-lg transition-colors ${visibleLayers.roadOverlay ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {visibleLayers.roadOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* 4. Footer Note */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-3xs text-slate-500 flex items-center justify-between">
        <span>FloodTrace WebGIS v2.4</span>
        <span className="font-semibold text-slate-700">ลุ่มน้ำปราจีนบุรี</span>
      </div>

    </div>
  );
};
