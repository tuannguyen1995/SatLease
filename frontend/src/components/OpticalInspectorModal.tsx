import React from 'react';
import { X, Satellite, CheckCircle, ShieldAlert, Cpu, ExternalLink, Hash, Compass, Eye, AlertOctagon } from 'lucide-react';
import { TaskItem } from './TaskCard';
import { formatAddress, formatGsd, VERDICT_MAP } from '../utils/formatters';

interface OpticalInspectorModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OpticalInspectorModal: React.FC<OpticalInspectorModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !task) return null;

  const verdictInfo = VERDICT_MAP[task.verdict] || VERDICT_MAP['PENDING'];
  const isCompliant = task.verdict === 'SLA_COMPLIANT_FULL';
  const isPartial = task.verdict === 'SLA_COMPLIANT_FULL' || task.verdict === 'PARTIAL_USABLE_COMPENSATION';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-space-900 border border-telemetry-darkborder rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-telemetry-darkborder">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-heading text-white">Optical SLA Audit Console</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                  PASS #{task.task_id}
                </span>
              </div>
              <p className="text-xs text-slate-400">GenLayer AI Remote Sensing Tribunal Consensus Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-space-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Verdict Banner */}
          <div className={`p-4 rounded-2xl border ${verdictInfo.bg} border-slate-700/80`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isCompliant ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : isPartial ? (
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                ) : (
                  <AlertOctagon className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <div className="text-xs font-mono uppercase text-slate-400">Consensus Verdict</div>
                  <div className={`text-sm font-bold ${verdictInfo.text}`}>{verdictInfo.label}</div>
                </div>
              </div>
              {task.confidence > 0 && (
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400">Jury Confidence</div>
                  <div className="text-base font-bold font-mono text-emerald-400">{task.confidence}%</div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-3 pt-3 border-t border-slate-800/80 leading-relaxed font-sans">
              <strong className="text-white">Arbiter Evaluation: </strong>
              {task.reason}
            </p>
          </div>

          {/* Optical Metrics Telemetry Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cloud Cover Meter */}
            <div className="p-4 rounded-2xl bg-space-800/60 border border-telemetry-darkborder">
              <div className="text-xs font-mono uppercase text-slate-400 flex items-center justify-between mb-2">
                <span>Cloud Cover Telemetry</span>
                <span className="text-slate-500">Max SLA: {task.max_cloud_cover_pct}%</span>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {task.measured_cloud_cover_pct}%
                </span>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                    task.measured_cloud_cover_pct <= task.max_cloud_cover_pct
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : task.measured_cloud_cover_pct <= task.max_cloud_cover_pct + 15
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {task.measured_cloud_cover_pct <= task.max_cloud_cover_pct
                    ? 'Within Limit'
                    : task.measured_cloud_cover_pct <= task.max_cloud_cover_pct + 15
                    ? 'Marginal Usable Fringe'
                    : 'Cloud Breach'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-space-950 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    task.measured_cloud_cover_pct <= task.max_cloud_cover_pct
                      ? 'bg-emerald-500'
                      : task.measured_cloud_cover_pct <= task.max_cloud_cover_pct + 15
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, task.measured_cloud_cover_pct)}%` }}
                ></div>
              </div>
            </div>

            {/* GSD Resolution Meter */}
            <div className="p-4 rounded-2xl bg-space-800/60 border border-telemetry-darkborder">
              <div className="text-xs font-mono uppercase text-slate-400 flex items-center justify-between mb-2">
                <span>GSD Ground Resolution</span>
                <span className="text-slate-500">Req: ≤ {task.min_resolution_cm}cm</span>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {formatGsd(task.measured_resolution_cm)}
                </span>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                    task.measured_resolution_cm <= task.min_resolution_cm
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {task.measured_resolution_cm <= task.min_resolution_cm ? 'High-Def SLA Met' : 'Degraded GSD'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 font-sans">
                Verified via optical radiometry bands and panchromatic nadir angles.
              </p>
            </div>
          </div>

          {/* Evidence Data & Cryptographic Hash */}
          <div className="p-4 rounded-2xl bg-space-950 border border-telemetry-darkborder space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Hash className="w-3.5 h-3.5 text-sky-400" />
                Evidence Snapshot Hash (SHA-256)
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Immutable On-Chain
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-space-900 border border-slate-800 text-slate-300 break-all select-all text-[11px]">
              {task.evidence_hash || 'Pending AI tribunal computation'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
              <div>
                <span className="text-slate-500 block mb-0.5">STAC Metadata URL:</span>
                {task.metadata_url ? (
                  <a
                    href={task.metadata_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{task.metadata_url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-600">Not provided yet</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Radiometric Sample Preview:</span>
                {task.sample_preview_url ? (
                  <a
                    href={task.sample_preview_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{task.sample_preview_url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-600">Not provided yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-telemetry-darkborder flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-space-800 hover:bg-space-700 text-slate-200 text-sm font-medium transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
