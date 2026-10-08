import React, { useState } from 'react';
import { X, Upload, Satellite, Radio, AlertCircle } from 'lucide-react';
import { TaskItem } from './TaskCard';

interface SubmitDeliverableModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: number, metadataUrl: string, samplePreviewUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_DELIVERABLES = [
  {
    name: 'Compliant Optical Pass (Sentinel/WorldView)',
    meta: 'https://constellation-stac.io/passes/orbit_8912/stac.json',
    prev: 'https://constellation-stac.io/passes/orbit_8912/preview.jpg',
    desc: 'Simulates clean 4% cloud fringe and 28cm sub-meter GSD telemetry.',
  },
  {
    name: 'Marginal Usable Fringe Pass (PlanetScope)',
    meta: 'https://constellation-stac.io/passes/orbit_9100/stac.json',
    prev: 'https://constellation-stac.io/passes/orbit_9100/preview.jpg',
    desc: 'Simulates 22% peripheral cirrus clouds with center usable under mask.',
  },
  {
    name: 'Overcast Cloud Breach Pass (Defective)',
    meta: 'https://constellation-stac.io/passes/orbit_9021/stac.json',
    prev: 'https://constellation-stac.io/passes/orbit_9021/preview.jpg',
    desc: 'Simulates 65% dense stratus obscuration exceeding SLA threshold.',
  },
];

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [metaUrl, setMetaUrl] = useState(PRESET_DELIVERABLES[0].meta);
  const [prevUrl, setPrevUrl] = useState(PRESET_DELIVERABLES[0].prev);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handlePresetSelect = (preset: typeof PRESET_DELIVERABLES[0]) => {
    setMetaUrl(preset.meta);
    setPrevUrl(preset.prev);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!metaUrl.startsWith('http://') && !metaUrl.startsWith('https://')) {
      setError('Please provide a valid public STAC metadata URL (http:// or https://)');
      return;
    }
    if (!prevUrl.startsWith('http://') && !prevUrl.startsWith('https://')) {
      setError('Please provide a valid radiometric sample preview URL (http:// or https://)');
      return;
    }

    try {
      await onSubmit(task.task_id, metaUrl.trim(), prevUrl.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Deliverable submission failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-space-900 border border-telemetry-darkborder rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-telemetry-darkborder">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">Deliver Orbital Imagery</h2>
              <p className="text-xs text-slate-400">Task #{task.task_id} • Target: {task.target_bounding_box.slice(0, 22)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-space-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Presets */}
        <div className="mt-5">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 block">
            Constellation Delivery Telemetry Presets
          </label>
          <div className="space-y-2">
            {PRESET_DELIVERABLES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`w-full p-3 rounded-xl border text-left transition ${
                  metaUrl === preset.meta
                    ? 'border-orbit-light bg-sky-500/10 text-white'
                    : 'border-telemetry-darkborder bg-space-800/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>{preset.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
              STAC / GeoTIFF Metadata URL
            </label>
            <input
              type="url"
              value={metaUrl}
              onChange={(e) => setMetaUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-telemetry-darkborder focus:border-orbit-light text-white font-mono text-xs focus:outline-none"
              placeholder="https://..."
              required
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
              Processed Radiometric Preview URL
            </label>
            <input
              type="url"
              value={prevUrl}
              onChange={(e) => setPrevUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-telemetry-darkborder focus:border-orbit-light text-white font-mono text-xs focus:outline-none"
              placeholder="https://..."
              required
            />
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orbit-primary to-sky-500 hover:from-sky-600 hover:to-orbit-primary text-white text-sm font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-50 transition flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading to GenVM...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Transmit Deliverable</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
