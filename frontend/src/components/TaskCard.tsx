import React from 'react';
import { 
  Satellite, 
  CloudRain, 
  Scan, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Upload, 
  Scale, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { 
  formatAddress, 
  formatGen, 
  formatGsd, 
  formatCloud, 
  STATUS_MAP, 
  VERDICT_MAP 
} from '../utils/formatters';

export interface TaskItem {
  task_id: number;
  client: string;
  operator: string;
  dispute_initiator: string;
  escrow_amount: string;
  dispute_bond: string;
  target_bounding_box: string;
  max_cloud_cover_pct: number;
  min_resolution_cm: number;
  metadata_url: string;
  sample_preview_url: string;
  evidence_hash: string;
  status: number;
  verdict: string;
  reason: string;
  confidence: number;
  measured_cloud_cover_pct: number;
  measured_resolution_cm: number;
  created_at_block: string;
  expires_at_block: string;
  audit_completed_block: string;
}

interface TaskCardProps {
  task: TaskItem;
  currentAddress: string | null;
  onOpenDeliverableModal: (task: TaskItem) => void;
  onOpenInspectorModal: (task: TaskItem) => void;
  onOpenAppealModal: (task: TaskItem) => void;
  onAdjudicate: (taskId: number) => Promise<void>;
  onFinalize: (taskId: number) => Promise<void>;
  onCancelOrReclaim: (taskId: number) => Promise<void>;
  onAdjudicateAppeal: (taskId: number) => Promise<void>;
  isProcessing: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  currentAddress,
  onOpenDeliverableModal,
  onOpenInspectorModal,
  onOpenAppealModal,
  onAdjudicate,
  onFinalize,
  onCancelOrReclaim,
  onAdjudicateAppeal,
  isProcessing,
}) => {
  const statusInfo = STATUS_MAP[task.status] || STATUS_MAP[0];
  const verdictInfo = VERDICT_MAP[task.verdict] || VERDICT_MAP['PENDING'];

  const isClient = currentAddress && currentAddress.toLowerCase() === task.client.toLowerCase();
  const isOperator = currentAddress && currentAddress.toLowerCase() === task.operator.toLowerCase();

  return (
    <div className="bg-space-900 border border-telemetry-darkborder hover:border-slate-700/80 rounded-2xl p-6 transition-all shadow-xl hover:shadow-2xl hover:shadow-sky-500/5 text-left relative overflow-hidden flex flex-col justify-between">
      {/* Top Bar: ID, Status, Value */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-space-800 text-sky-400 border border-slate-700">
              PASS #{task.task_id}
            </span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-bold text-emerald-400 block">
              {formatGen(task.escrow_amount)}
            </span>
            {BigInt(task.dispute_bond || '0') > 0n && (
              <span className="text-[10px] font-mono text-purple-400 block">
                Bond: +{formatGen(task.dispute_bond)}
              </span>
            )}
          </div>
        </div>

        {/* Target Bounding Box */}
        <div className="mb-4 bg-space-950 p-3 rounded-xl border border-telemetry-darkborder/50">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between mb-1">
            <span className="flex items-center gap-1">
              <Satellite className="w-3 h-3 text-sky-400" />
              Target Bounding Box
            </span>
            <span className="text-[10px] text-slate-500 font-normal">WGS-84</span>
          </div>
          <div className="text-xs font-mono text-slate-200 truncate select-all" title={task.target_bounding_box}>
            {task.target_bounding_box}
          </div>
        </div>

        {/* SLA Requirements & Measured Performance Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Cloud Cover */}
          <div className="p-3 rounded-xl bg-space-800/60 border border-telemetry-darkborder/50">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                Cloud Cover
              </span>
              <span>Req ≤ {task.max_cloud_cover_pct}%</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold font-mono text-white">
                {task.status >= 2 ? `${task.measured_cloud_cover_pct}%` : 'Pending Pass'}
              </span>
              {task.status >= 2 && (
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    task.measured_cloud_cover_pct <= task.max_cloud_cover_pct
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : task.measured_cloud_cover_pct <= task.max_cloud_cover_pct + 15
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {task.measured_cloud_cover_pct <= task.max_cloud_cover_pct
                    ? 'PASSED'
                    : task.measured_cloud_cover_pct <= task.max_cloud_cover_pct + 15
                    ? 'PARTIAL'
                    : 'BREACH'}
                </span>
              )}
            </div>
          </div>

          {/* GSD Resolution */}
          <div className="p-3 rounded-xl bg-space-800/60 border border-telemetry-darkborder/50">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1">
                <Scan className="w-3.5 h-3.5 text-sky-400" />
                GSD Resolution
              </span>
              <span>Req ≤ {task.min_resolution_cm}cm</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold font-mono text-white">
                {task.status >= 2 ? formatGsd(task.measured_resolution_cm) : 'Pending Pass'}
              </span>
              {task.status >= 2 && (
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    task.measured_resolution_cm <= task.min_resolution_cm
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {task.measured_resolution_cm <= task.min_resolution_cm ? 'PASSED' : 'DEGRADED'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stakeholder Addresses */}
        <div className="text-[11px] font-mono text-slate-400 space-y-1 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Client:</span>
            <span className="text-slate-300 flex items-center gap-1">
              {formatAddress(task.client)}
              {isClient && <span className="text-[9px] px-1 bg-sky-500/20 text-sky-300 rounded">YOU</span>}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Constellation Operator:</span>
            <span className="text-slate-300 flex items-center gap-1">
              {task.operator && task.operator !== '0x0000000000000000000000000000000000000000'
                ? formatAddress(task.operator)
                : 'Awaiting Operator'}
              {isOperator && <span className="text-[9px] px-1 bg-sky-500/20 text-sky-300 rounded">YOU</span>}
            </span>
          </div>
        </div>

        {/* Verdict Box if adjudicated */}
        {task.status >= 2 && (
          <div className={`p-3 rounded-xl border mb-4 ${verdictInfo.bg} border-slate-700/60`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                AI Tribunal Ruling
              </span>
              {task.confidence > 0 && (
                <span className="text-[10px] font-mono text-emerald-400">
                  {task.confidence}% Confidence
                </span>
              )}
            </div>
            <div className={`text-xs font-semibold ${verdictInfo.text}`}>
              {verdictInfo.label}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 italic">
              "{task.reason}"
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons Matrix */}
      <div className="pt-2 border-t border-telemetry-darkborder/60 flex flex-wrap gap-2">
        {/* Status 0: OPEN -> Operator can submit deliverable */}
        {task.status === 0 && (
          <>
            <button
              onClick={() => onOpenDeliverableModal(task)}
              disabled={isProcessing}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orbit-primary to-sky-500 hover:from-sky-600 hover:to-orbit-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Operator: Submit STAC Deliverable</span>
            </button>
            {isClient && (
              <button
                onClick={() => onCancelOrReclaim(task.task_id)}
                disabled={isProcessing}
                className="py-2 px-3 rounded-xl border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 text-xs transition"
              >
                Reclaim
              </button>
            )}
          </>
        )}

        {/* Status 1: CAPTURED -> Client/Operator/Owner triggers AI Tribunal */}
        {task.status === 1 && (
          <button
            onClick={() => onAdjudicate(task.task_id)}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
          >
            <Scale className="w-4 h-4" />
            <span>Convene AI Remote Sensing Tribunal</span>
          </button>
        )}

        {/* Status 2: AWAITING_PAYOUT -> Cooling-off window */}
        {task.status === 2 && (
          <>
            <button
              onClick={() => onOpenInspectorModal(task)}
              className="flex-1 py-2 px-3 rounded-xl bg-space-800 border border-telemetry-darkborder hover:border-slate-600 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Optical Diagnosis</span>
            </button>
            <button
              onClick={() => onOpenAppealModal(task)}
              disabled={isProcessing}
              className="py-2 px-3 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Appeal (10% Bond)</span>
            </button>
            <button
              onClick={() => onFinalize(task.task_id)}
              disabled={isProcessing}
              className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              title="Finalize settlement strictly after cooling-off window (24 blocks)"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Finalize Payout</span>
            </button>
          </>
        )}

        {/* Status 6: DISPUTED -> Re-evaluate appeal */}
        {task.status === 6 && (
          <button
            onClick={() => onAdjudicateAppeal(task.task_id)}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 transition"
          >
            <Scale className="w-4 h-4" />
            <span>Adjudicate Space Appellate Chamber</span>
          </button>
        )}

        {/* Status 3, 4, 5, 7: SETTLED or CANCELLED -> View Audit */}
        {(task.status === 3 || task.status === 4 || task.status === 5 || task.status === 7) && (
          <button
            onClick={() => onOpenInspectorModal(task)}
            className="w-full py-2 px-3 rounded-xl bg-space-800 border border-telemetry-darkborder hover:border-slate-600 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Immutable On-Chain Audit & Proof</span>
          </button>
        )}
      </div>
    </div>
  );
};
