import React from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Layers2, 
  Info, 
  Globe, 
  Maximize2, 
  Minimize2,
  Compass,
  Crosshair
} from 'lucide-react';

interface WebGISControlDeckProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetExtent: () => void;
  showLayerPanel: boolean;
  onToggleLayerPanel: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  basemap: 'satellite' | 'streets';
  onToggleBasemap: () => void;
  isInspectorActive: boolean;
  onToggleInspector: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const WebGISControlDeck: React.FC<WebGISControlDeckProps> = ({
  onZoomIn,
  onZoomOut,
  onResetExtent,
  showLayerPanel,
  onToggleLayerPanel,
  showLegend,
  onToggleLegend,
  basemap,
  onToggleBasemap,
  isInspectorActive,
  onToggleInspector,
  isFullscreen,
  onToggleFullscreen
}) => {
  return (
    <div className="flex flex-col gap-2 z-20 select-none">
      
      {/* Group A: Map Zoom & Navigation Controls */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col divide-y divide-slate-100">
        <button
          type="button"
          onClick={onZoomIn}
          title="ซูมเข้า (+)"
          aria-label="ซูมเข้า"
          className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer active:bg-slate-200"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          title="ซูมออก (-)"
          aria-label="ซูมออก"
          className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer active:bg-slate-200"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onResetExtent}
          title="รีเซ็ตมุมมองภาพรวม จ.ปราจีนบุรี"
          aria-label="รีเซ็ตมุมมอง"
          className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer active:bg-slate-200"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Group B: WebGIS Feature & Layer Tools */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col divide-y divide-slate-100">
        <button
          type="button"
          onClick={onToggleLayerPanel}
          title="จัดการชั้นข้อมูลแผนที่ (Layer Manager)"
          aria-label="จัดการชั้นข้อมูลแผนที่"
          className={`p-2.5 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer ${
            showLayerPanel 
              ? 'bg-blue-600 text-white' 
              : 'hover:bg-slate-100 text-slate-700 hover:text-blue-600'
          }`}
        >
          <Layers2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleLegend}
          title="คำอธิบายสัญลักษณ์แผนที่ (Map Legend)"
          aria-label="คำอธิบายสัญลักษณ์แผนที่"
          className={`p-2.5 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer ${
            showLegend 
              ? 'bg-blue-600 text-white' 
              : 'hover:bg-slate-100 text-slate-700 hover:text-blue-600'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleInspector}
          title={isInspectorActive ? 'ปิดเครื่องมือตรวจวัดพิกัด' : 'เปิดเครื่องมือตรวจวัดพิกัด (Coordinate Inspector)'}
          aria-label="เครื่องมือตรวจวัดพิกัด"
          className={`p-2.5 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer ${
            isInspectorActive 
              ? 'bg-emerald-600 text-white' 
              : 'hover:bg-slate-100 text-slate-700 hover:text-emerald-600'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleBasemap}
          title={`สลับแผนที่ฐาน (ปัจจุบัน: ${basemap === 'satellite' ? 'ภาพถ่ายดาวเทียม' : 'แผนที่ถนน'})`}
          aria-label="สลับแผนที่ฐาน"
          className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
        >
          <Globe className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงแผนที่เต็มจอ'}
          aria-label="เต็มจอ"
          className="p-2.5 hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );
};
