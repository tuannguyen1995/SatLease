import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, Scale, AlertCircle } from 'lucide-react';
import { TaskItem } from './TaskCard';
import { formatGen } from '../utils/formatters';

interface AppealModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitAppeal: (taskId: number, reason: string, bondWei: bigint) => Promise<void>;
  isSubmitting: boolean;
}

export const AppealModal: React.FC<AppealModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmitAppeal,
  isSubmitting,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  // Calculate 10% required bond
  const escrowWei = BigInt(task.escrow_amount || '0');
  const requiredBondWei = escrowWei > 0n ? (escrowWei * 10n) / 100n : 1n;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setError('Please provide a detailed dispute justification (minimum 10 characters).');
      return;
    }

    try {
      await onSubmitAppeal(task.task_id, cleanReason, requiredBondWei);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Filing appeal failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-space-900 border border-telemetry-darkborder rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-telemetry-darkborder">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">Appellate Challenge Portal</h2>
              <p className="text-xs text-slate-400">Pass #{task.task_id} • 24-Block Cooling-off Challenge Window</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-space-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 10% Bond Notice */}
        <div className="mt-5 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-purple-300 flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              10% Anti-Griefing Dispute Bond Required
            </span>
            <span className="text-sm font-mono font-bold text-white">
              {formatGen(requiredBondWei.toString())}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
            To prevent frivolous disputes, appellants must stake 10% collateral. If the Supreme Space Chamber upholds your appeal with radar proof, 100% of your bond is returned. If dismissed, the bond is forfeited to the counterparty.
          </p>
        </div>

        {/* Prior Verdict Summary */}
        <div className="mt-4 p-3 rounded-xl bg-space-800 border border-telemetry-darkborder text-xs font-mono">
          <div className="text-slate-400 text-[11px] uppercase mb-1">Current Tribunal Verdict Under Appeal:</div>
          <div className="text-amber-400 font-bold">{task.verdict}</div>
          <div className="text-slate-400 text-[11px] mt-1 font-sans italic">"{task.reason}"</div>
        </div>

        {/* Dispute Justification Input */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
              Dispute Justification & Radar Calibration Evidence
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-telemetry-darkborder focus:border-purple-500 text-white font-sans text-xs focus:outline-none resize-none"
              placeholder="e.g. Synthetic Aperture Radar (SAR) channel penetrates cirrus cloud layer and proves 100% ground target visibility..."
              required
            ></textarea>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-telemetry-darkborder text-slate-300 hover:text-white hover:bg-space-800 text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 transition flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Staking Bond on GenVM...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Stake Bond & Appeal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
