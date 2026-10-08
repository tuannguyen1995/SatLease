import React from 'react';
import { Satellite, ExternalLink, ShieldCheck, Wallet, RefreshCw, Copy, Check } from 'lucide-react';
import { CONTRACT_ADDRESS, STUDIONET_EXPLORER_URL, switchToStudionet } from '../config/genlayer';
import { formatAddress } from '../utils/formatters';

interface NavbarProps {
  account: string | null;
  balance: string;
  isConnecting: boolean;
  onConnect: () => void;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  isConnecting,
  onConnect,
  onOpenCreateModal,
  onRefresh,
  isRefreshing,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-space-900/90 backdrop-blur-md border-b border-telemetry-darkborder/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orbit-primary to-sky-600 text-white shadow-lg shadow-sky-500/20">
              <Satellite className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-heading">
                  Sat<span className="text-orbit-light">Lease</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  LEO SLA ESCROW
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span>Studionet (Chain 61999)</span>
                <span>•</span>
                <button
                  onClick={handleCopy}
                  className="hover:text-sky-300 flex items-center gap-1 transition-colors"
                  title="Click to copy contract address"
                >
                  <span>{formatAddress(CONTRACT_ADDRESS)}</span>
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </p>
            </div>
          </div>

          {/* Action Center & Wallet Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-lg border border-telemetry-darkborder bg-space-800 text-slate-300 hover:text-white hover:bg-space-700 transition"
              title="Refresh Telemetry Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orbit-light' : ''}`} />
            </button>

            <a
              href={`${STUDIONET_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-telemetry-darkborder bg-space-800 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Contract Explorer</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-orbit-primary to-sky-500 hover:from-sky-600 hover:to-orbit-primary text-white text-sm font-semibold shadow-md shadow-sky-500/20 transition flex items-center space-x-2"
            >
              <Satellite className="w-4 h-4" />
              <span className="hidden sm:inline">Order Orbital Pass</span>
              <span className="sm:hidden">Order</span>
            </button>

            {account ? (
              <div className="flex items-center space-x-2 bg-space-800 border border-telemetry-darkborder rounded-lg px-3 py-1.5">
                <div className="text-right">
                  <div className="text-[11px] font-mono text-slate-400">{formatAddress(account)}</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">{balance}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-space-700 flex items-center justify-center text-sky-400 font-mono text-xs font-bold border border-slate-600">
                  {account.slice(2, 4).toUpperCase()}
                </div>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="px-4 py-2.5 rounded-lg bg-space-800 border border-slate-700 hover:border-orbit-light text-slate-200 hover:text-white text-sm font-medium transition flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4 text-orbit-light" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
