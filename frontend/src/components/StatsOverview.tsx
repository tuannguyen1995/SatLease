import React from 'react';
import { ShieldAlert, Globe, Layers, Cpu, Compass, CheckCircle2 } from 'lucide-react';
import { formatGen } from '../utils/formatters';

interface StatsOverviewProps {
  totalTasks: number;
  totalLocked: string;
  totalSettled: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalTasks,
  totalLocked,
  totalSettled,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Metric 1 */}
      <div className="bg-space-900 border border-telemetry-darkborder rounded-2xl p-5 relative overflow-hidden group hover:border-orbit-light/50 transition">
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Escrow Locked</span>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
            <Compass className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight">
          {formatGen(totalLocked)}
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-sans">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          Guaranteed via GenVM Escrow
        </p>
      </div>

      {/* Metric 2 */}
      <div className="bg-space-900 border border-telemetry-darkborder rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">SLA Passes Settled</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
          {totalSettled}
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-sans">
          <span>{totalTasks > 0 ? `${((totalSettled / totalTasks) * 100).toFixed(0)}% completion rate` : 'Awaiting executions'}</span>
        </p>
      </div>

      {/* Metric 3 */}
      <div className="bg-space-900 border border-telemetry-darkborder rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Orbital Orders</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Globe className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight">
          {totalTasks}
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-sans">
          <span>Target Bounding Boxes Registered</span>
        </p>
      </div>

      {/* Metric 4 */}
      <div className="bg-space-900 border border-telemetry-darkborder rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/50 transition">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">AI Remote Sensing Tribunal</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
        <div className="text-sm font-semibold font-mono text-slate-200 tracking-tight">
          STAC & GeoTIFF On-Chain
        </div>
        <p className="text-xs text-amber-400 mt-2 flex items-center gap-1 font-sans">
          <ShieldAlert className="w-3.5 h-3.5 inline" />
          24-Block Cooling-Off Challenge
        </p>
      </div>
    </div>
  );
};
