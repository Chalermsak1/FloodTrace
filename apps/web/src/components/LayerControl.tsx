import React from 'react';
import { Layers, Droplets, Shield, Factory, Flame, Waves, Users, Eye, EyeOff } from 'lucide-react';

interface Props {
  visibleLayers: {
    stations: boolean;
    reservoirs: boolean;
    facilities: boolean;
    hotspots: boolean;
    rivers: boolean;
    reports: boolean;
  };
  onToggleLayer: (layer: keyof Props['visibleLayers']) => void;
  counts: {
    stations: number;
    reservoirs: number;
    facilities: number;
    hotspots: number;
    reports: number;
  };
}

export const LayerControl: React.FC<Props> = ({ visibleLayers, onToggleLayer, counts }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const layerItems: Array<{
    key: keyof Props['visibleLayers'];
    label: string;
    count?: number;
    color: string;
    icon: React.ElementType;
  }> = [
    { key: 'hotspots', label: 'Priority Risk Hotspots', count: counts.hotspots, color: 'text-rose-400', icon: Flame },
    { key: 'facilities', label: 'DIW Waste Facilities (101/105/106)', count: counts.facilities, color: 'text-purple-400', icon: Factory },
    { key: 'stations', label: 'ThaiWater Gauges', count: counts.stations, color: 'text-emerald-400', icon: Droplets },
    { key: 'reservoirs', label: 'RID Dams & Reservoirs', count: counts.reservoirs, color: 'text-sky-400', icon: Shield },
    { key: 'rivers', label: 'River Corridors & Flow', color: 'text-blue-400', icon: Waves },
    { key: 'reports', label: 'Citizen Ground Reports', count: counts.reports, color: 'text-amber-400', icon: Users },
  ];

  return (
    <div className="absolute top-20 right-4 z-30 w-72 glass-panel rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden text-slate-100 transition-all">
      <div 
        onClick={() => setCollapsed(!collapsed)}
        className="p-3.5 flex items-center justify-between border-b border-slate-800/80 cursor-pointer hover:bg-slate-800/40 select-none"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Map Intelligence Layers
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {collapsed ? 'SHOW' : 'HIDE'}
        </span>
      </div>

      {!collapsed && (
        <div className="p-2 space-y-1">
          {layerItems.map(item => {
            const isVisible = visibleLayers[item.key];
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onToggleLayer(item.key)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm transition min-h-[38px] ${
                  isVisible 
                    ? 'bg-slate-800/80 text-white font-medium shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-900/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.count !== undefined && (
                    item.count === 0 && (item.key === 'facilities' || item.key === 'stations' || item.key === 'reservoirs') ? (
                      <span className="px-1.5 py-0.5 rounded text-2xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Blocked under REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True">
                        ACCESS REQ
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-900 text-slate-300 border border-slate-800">
                        {item.count}
                      </span>
                    )
                  )}
                  {isVisible ? (
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </button>
            );
          })}

          {/* Quick Legend Info */}
          <div className="pt-2 px-2 pb-1 border-t border-slate-800/60 mt-2 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-xs">Legend</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0"></span>
              <span>Pulsing #1-10: Critical Risk Priority</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block shrink-0"></span>
              <span>Type 101/106: Industrial Treatment/Recycle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
              <span>Water Level Gauges: Normal to Critical</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
