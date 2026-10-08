export function formatAddress(addr: string | null | undefined): string {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return 'Unassigned';
  const clean = addr.toLowerCase();
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function formatGen(wei: string | bigint | number): string {
  try {
    const val = BigInt(wei.toString());
    const whole = val / 1_000_000_000_000_000_000n;
    const remainder = val % 1_000_000_000_000_000_000n;
    const remStr = remainder.toString().padStart(18, '0').slice(0, 4);
    if (remainder === 0n) return `${whole} GEN`;
    return `${whole}.${remStr} GEN`;
  } catch {
    return '0 GEN';
  }
}

export function formatGsd(cm: number): string {
  if (!cm || cm === 0) return 'Pending Scan';
  if (cm >= 100) return `${(cm / 100).toFixed(1)} m/px`;
  return `${cm} cm/px`;
}

export function formatCloud(pct: number): string {
  return `${pct}%`;
}

export const STATUS_MAP: Record<number, { label: string; bg: string; text: string; border: string }> = {
  0: { label: 'OPEN IN ORBIT', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  1: { label: 'TELEMETRY DELIVERED', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  2: { label: 'AWAITING PAYOUT (COOLING-OFF)', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  3: { label: 'SETTLED: FULL COMPLIANCE', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  4: { label: 'SETTLED: CLOUD BREACH REFUND', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  5: { label: 'SETTLED: PARTIAL USABILITY', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  6: { label: 'UNDER APPELLATE REVIEW', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  7: { label: 'CANCELLED & RECLAIMED', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

export const VERDICT_MAP: Record<string, { label: string; text: string; bg: string }> = {
  SLA_COMPLIANT_FULL: { label: 'Full SLA Met (100% Payout)', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  PARTIAL_USABLE_COMPENSATION: { label: 'Partial Usable (50/50 Split)', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  DEFECTIVE_CLOUD_BREACH: { label: 'Cloud Breach (100% Refund)', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  PENDING: { label: 'Pending AI Tribunal', text: 'text-slate-400', bg: 'bg-slate-500/10' },
  CANCELLED: { label: 'Cancelled', text: 'text-slate-400', bg: 'bg-slate-500/10' },
  DISPUTED: { label: 'Dispute Appealed', text: 'text-purple-400', bg: 'bg-purple-500/10' },
};
