import React from 'react';
import { MapView } from '../MapView';
import { MapLayerPanel, LayerState } from '../map/MapLayerPanel';
import { AreaStatusPanel } from '../map/AreaStatusPanel';
import { MapTimeline } from '../map/MapTimeline';
import { WaterStation, Reservoir, RiskHotspot, CitizenReport } from '../../types';

interface MainMapSectionProps {
  stations: WaterStation[];
  reservoirs: Reservoir[];
  hotspots: RiskHotspot[];
  reports: CitizenReport[];
  riverCorridors: any;
  visibleLayers: LayerState;
  onToggleLayer: (key: keyof LayerState) => void;
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  areaData: any;
  loadingAreaData: boolean;
  onViewAreaDetail: () => void;
  isForecastBlocked: boolean;
}

export const MainMapSection: React.FC<MainMapSectionProps> = ({
  stations,
  reservoirs,
  hotspots,
  reports,
  riverCorridors,
  visibleLayers,
  onToggleLayer,
  selectedDistrict,
  onSelectDistrict,
  areaData,
  loadingAreaData,
  onViewAreaDetail,
  isForecastBlocked
}) => {
  return (
    <section className="w-full mb-6">
      
      {/* Section Header with Number 1 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-7 h-7 rounded-full bg-[#0C57C7] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
          1
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0B243D] leading-tight">
            แผนที่หลัก (Map) — ภาพรวมสถานการณ์
          </h2>
          <p className="text-xs text-[#717F8F]">
            ให้ประชาชนเห็นภาพรวมพื้นที่เสี่ยงด้านน้ำท่วม และเฝ้าระวังด้านสิ่งแวดล้อม
          </p>
        </div>
      </div>

      {/* Hero 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-auto lg:h-[500px]">
        
        {/* Left Column: Map Layer Panel (approx 22% -> 3 of 12 cols) */}
        <div className="lg:col-span-3 h-[320px] lg:h-full order-2 lg:order-1">
          <MapLayerPanel
            layers={visibleLayers}
            onToggleLayer={onToggleLayer}
            counts={{
              verificationPriority: 7,
              citizenObservations: reports.length,
              officialResults: stations.length
            }}
            floodSourceStatus="ACTIVE"
            forecastSourceStatus={isForecastBlocked ? 'ACCESS REQUIRED' : 'ACTIVE'}
          />
        </div>

        {/* Center Column: Large GIS Map (approx 53% -> 6 of 12 cols or 7 of 12) */}
        <div className="lg:col-span-6 h-[420px] lg:h-full relative order-1 lg:order-2">
          <MapView
            stations={stations}
            reservoirs={reservoirs}
            hotspots={hotspots}
            reports={reports}
            riverCorridors={riverCorridors}
            visibleLayers={visibleLayers}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={onSelectDistrict}
          />
          <MapTimeline isForecastBlocked={isForecastBlocked} />
        </div>

        {/* Right Column: Area Status Panel (approx 25% -> 3 of 12 cols) */}
        <div className="lg:col-span-3 h-auto lg:h-full order-3">
          <AreaStatusPanel
            areaData={areaData}
            loading={loadingAreaData}
            onViewDetail={onViewAreaDetail}
          />
        </div>

      </div>

    </section>
  );
};
