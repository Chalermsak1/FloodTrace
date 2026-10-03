import React, { useState, useEffect } from 'react';
import { ForecastResponse } from '../types';
import { X, CloudRain, Calendar, AlertCircle, Droplets, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from 'recharts';
import { ProvenanceBadge } from './ProvenanceBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenProvenanceAudit: () => void;
}

export const ForecastModal: React.FC<Props> = ({ isOpen, onClose, onOpenProvenanceAudit }) => {
  const [station, setStation] = useState('prachin_mueang');
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/v1/forecast/?station=${station}`)
      .then(res => res.json())
      .then(data => {
        setForecast(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching forecast:', err);
        setLoading(false);
      });
  }, [isOpen, station]);

  if (!isOpen) return null;

  const chartData = (forecast?.forecast_days || []).map(d => ({
    date: (d.date || '').split('-').slice(1).join('/'),
    rainfall_mm: d.precipitation_sum_mm ?? 0,
    probability_pct: d.probability_max_pct ?? 0,
    risk: d.runoff_risk_level || 'NORMAL'
  }));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-panel rounded-2xl shadow-2xl border border-slate-700/60 p-6 text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-sky-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                7-Day Hydro-Meteorological Forecast
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              High-resolution numerical weather prediction (Open-Meteo & ECMWF IFS Model)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Station Selector */}
        <div className="flex items-center gap-2 my-4">
          <span className="text-xs text-slate-400 font-medium">Catchment Zone:</span>
          <div className="flex gap-2">
            {[
              { id: 'prachin_mueang', label: 'อ.เมืองปราจีนบุรี' },
              { id: 'kabin_buri', label: 'อ.กบินทร์บุรี (ต้นน้ำ)' },
              { id: 'si_maha_phot', label: 'อ.ศรีมหาโพธิ (นิคม 304)' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setStation(item.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  station === item.id
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Forecast Content: Active Chart or Access Blocked Banner */}
        {forecast?.status === 'FORECAST_UNAVAILABLE' || (forecast?.forecast_days && forecast.forecast_days.length === 0) ? (
          <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center my-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>DATA UNAVAILABLE — ACCESS REQUIRED</span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
              Production weather forecasting is blocked under the platform's private-only data access policy (<code>REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True</code>).
            </p>
            <div className="text-xs text-slate-300 bg-slate-900/90 p-4 rounded-lg border border-slate-800 text-left font-mono space-y-1.5 max-w-xl mx-auto">
              <div><strong className="text-slate-400">Status:</strong> <span className="text-amber-300">{forecast?.status || 'FORECAST_UNAVAILABLE'}</span></div>
              <div><strong className="text-slate-400">Reason:</strong> <span className="text-rose-400">{forecast?.reason || 'ACCESS_REQUIRED'}</span></div>
              <div><strong className="text-slate-400">Source Gate:</strong> <span className="text-sky-300">{forecast?.source_access || 'PUBLIC_ONLY (TMD / Open-Meteo)'}</span></div>
              <div><strong className="text-slate-400">Production Ingestion:</strong> <span className="text-rose-400">BLOCKED</span></div>
              <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800 leading-relaxed">
                Public NWP forecast feeds (TMD Open API, Open-Meteo) are restricted to isolated test/dev environments and blocked from production factual ingestion until an authorized institutional credential or MOU is verified.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chart View */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 my-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Daily Precipitation Volume (mm) vs Rain Probability (%)
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
                    <span>Precipitation (mm)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                    <span>Probability (%)</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  Loading forecast simulation...
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#38bdf8" fontSize={12} domain={[0, 'auto']} />
                      <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      />
                      <Bar yAxisId="left" dataKey="rainfall_mm" fill="#0284c7" radius={[4, 4, 0, 0]} name="Rainfall (mm)" />
                      <Line yAxisId="right" type="monotone" dataKey="probability_pct" stroke="#f59e0b" strokeWidth={2} name="Probability (%)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 7-Day Day Cards */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {(forecast?.forecast_days || []).map((d, i) => {
                const isHighRain = (d.precipitation_sum_mm ?? 0) >= 25.0;
                return (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      isHighRain 
                        ? 'bg-rose-500/10 border-rose-500/30' 
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-400">
                      {d.date.split('-').slice(1).join('/')}
                    </div>
                    <div className="text-sm font-bold text-white mt-1">
                      {d.precipitation_sum_mm} <span className="text-xs text-slate-400">mm</span>
                    </div>
                    <div className="text-xs text-amber-400 mt-0.5">
                      {d.probability_max_pct}% prob
                    </div>
                    <div className={`mt-1.5 text-2xs px-1.5 py-0.5 rounded font-semibold ${
                      (d.runoff_risk_level || '').includes('WARNING')
                        ? 'bg-rose-500/20 text-rose-300'
                        : (d.runoff_risk_level || '').includes('HIGH')
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {(d.runoff_risk_level || 'NORMAL').replace(/_/g, ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Provenance Footer */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-sky-400" />
            <span>Modeled forecast projection from ECMWF IFS ensemble numerical models.</span>
          </div>
          <ProvenanceBadge provenance={forecast?.provenance} onClick={onOpenProvenanceAudit} />
        </div>

      </div>
    </div>
  );
};
