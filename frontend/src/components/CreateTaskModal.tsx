import React, { useState } from 'react';
import { X, Satellite, Compass, Shield, AlertCircle, Info } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    targetBoundingBox: string;
    maxCloudCoverPct: number;
    minResolutionCm: number;
    durationBlocks: number;
    depositGen: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_TARGETS = [
  {
    name: 'California Central Valley (Agriculture)',
    coords: '[36.7783, -119.4179, 37.2000, -119.0000]',
    cloud: 15,
    gsd: 30,
    deposit: '0.05',
    desc: 'Precision irrigation & crop moisture NDVI indexing',
  },
  {
    name: 'Tokyo Bay Maritime Port (Logistics)',
    coords: '[35.6762, 139.6503, 35.7000, 139.7000]',
    cloud: 10,
    gsd: 25,
    deposit: '0.1',
    desc: 'Container shipping traffic & berth occupancy tracking',
  },
  {
    name: 'Amazon Rainforest Basin (Deforestation)',
    coords: '[-3.4653, -62.2159, -3.2000, -61.9000]',
    cloud: 20,
    gsd: 50,
    deposit: '0.02',
    desc: 'Canopy canopy loss verification & carbon offset monitoring',
  },
  {
    name: 'Rhine Valley Industrial Zone (Germany)',
    coords: '[50.9375, 6.9603, 51.1000, 7.1500]',
    cloud: 12,
    gsd: 30,
    deposit: '0.05',
    desc: 'Industrial thermal footprint & facility emission analysis',
  },
];

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [targetBbox, setTargetBbox] = useState(PRESET_TARGETS[0].coords);
  const [maxCloud, setMaxCloud] = useState<number>(15);
  const [minGsd, setMinGsd] = useState<number>(30);
  const [durationBlocks, setDurationBlocks] = useState<number>(6000);
  const [depositGen, setDepositGen] = useState<string>('0.05');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_TARGETS[0]) => {
    setTargetBbox(preset.coords);
    setMaxCloud(preset.cloud);
    setMinGsd(preset.gsd);
    setDepositGen(preset.deposit);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetBbox || targetBbox.trim().length < 8) {
      setError('Please provide a valid polygon or bounding box coordinate string.');
      return;
    }

    const depNum = parseFloat(depositGen);
    if (isNaN(depNum) || depNum <= 0) {
      setError('Escrow deposit must be greater than 0 GEN.');
      return;
    }

    try {
      await onSubmit({
        targetBoundingBox: targetBbox.trim(),
        maxCloudCoverPct: Number(maxCloud),
        minResolutionCm: Number(minGsd),
        durationBlocks: Number(durationBlocks),
        depositGen,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Transaction failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-space-900 border border-telemetry-darkborder rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-telemetry-darkborder">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orbit-primary/10 text-orbit-light border border-orbit-primary/20">
              <Satellite className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">Order Orbital Satellite Pass</h2>
              <p className="text-xs text-slate-400">Lock GEN escrow with cryptographic SLA verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-space-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selector */}
        <div className="mt-5">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 block">
            Target Presets (Click to Auto-fill)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_TARGETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-xl border text-left transition ${
                  targetBbox === preset.coords
                    ? 'border-orbit-light bg-sky-500/10 text-white'
                    : 'border-telemetry-darkborder bg-space-800/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-semibold text-sky-300">{preset.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{preset.desc}</div>
                <div className="text-[10px] font-mono text-slate-500 mt-1 flex gap-2">
                  <span>Cloud ≤ {preset.cloud}%</span>
                  <span>•</span>
                  <span>GSD ≤ {preset.gsd}cm</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
              Target Bounding Box Coordinates (Lat/Long GeoJSON or WKT)
            </label>
            <input
              type="text"
              value={targetBbox}
              onChange={(e) => setTargetBbox(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-telemetry-darkborder focus:border-orbit-light text-white font-mono text-xs focus:outline-none"
              placeholder="[min_lat, min_lon, max_lat, max_lon]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Max Allowable Cloud Cover
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">{maxCloud}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={maxCloud}
                onChange={(e) => setMaxCloud(parseInt(e.target.value))}
                className="w-full accent-amber-400 bg-space-800 rounded-lg h-2 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">Over {maxCloud + 15}% triggers 100% refund breach</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Required GSD Resolution
                </label>
                <span className="text-xs font-mono font-bold text-sky-400">{minGsd} cm/pixel</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={minGsd}
                onChange={(e) => setMinGsd(parseInt(e.target.value))}
                className="w-full accent-sky-400 bg-space-800 rounded-lg h-2 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">Ground Sample Distance (30cm = Sub-meter WorldView)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
                Escrow Deposit Amount (GEN)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={depositGen}
                  onChange={(e) => setDepositGen(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-telemetry-darkborder focus:border-orbit-light text-white font-mono text-sm focus:outline-none"
                  placeholder="0.05"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400 font-bold">GEN</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5 block">
                Capture Window Duration (Blocks)
              </label>
              <input
                type="number"
                min="100"
                max="50000"
                value={durationBlocks}
                onChange={(e) => setDurationBlocks(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-telemetry-darkborder focus:border-orbit-light text-white font-mono text-sm focus:outline-none"
                placeholder="6000"
                required
              />
            </div>
          </div>

          {/* SLA Protocol Rules Card */}
          <div className="p-3.5 rounded-xl bg-space-800/70 border border-slate-700/80 text-xs space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>SatLease Autonomous SLA Settlement Guarantees:</span>
            </div>
            <ul className="text-slate-400 space-y-1 pl-5 list-disc text-[11px]">
              <li><strong className="text-emerald-400">100% Payout:</strong> Measured cloud ≤ {maxCloud}% and GSD ≤ {minGsd}cm.</li>
              <li><strong className="text-amber-400">50/50 Fair Compensation:</strong> Peripheral fringe cloud ({maxCloud + 1}% - {maxCloud + 15}%).</li>
              <li><strong className="text-rose-400">100% Refund:</strong> Heavy clouds (&gt; {maxCloud + 15}%) or missed coordinates.</li>
              <li><strong className="text-sky-300">Cooling-off Challenge:</strong> 24-block window with 10% appeal bond.</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
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
                  <span>Transacting on GenVM...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Deposit Escrow & Launch Pass</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
