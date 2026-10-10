import React, { useState, useEffect, useCallback } from 'react';
import { 
  Satellite, 
  RefreshCw, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Radio,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { TaskCard, TaskItem } from './components/TaskCard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { SubmitDeliverableModal } from './components/SubmitDeliverableModal';
import { OpticalInspectorModal } from './components/OpticalInspectorModal';
import { AppealModal } from './components/AppealModal';
import { 
  CONTRACT_ADDRESS, 
  STUDIONET_EXPLORER_URL, 
  readContract, 
  getGenBalance, 
  waitForTransactionReceipt, 
  switchToStudionet,
  encodeCalldata,
  STUDIONET_RPC_URL
} from './config/genlayer';

export const App: React.FC = () => {
  // Wallet State
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.000 GEN');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Contract State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [totalLocked, setTotalLocked] = useState<string>('0');
  const [totalSettled, setTotalSettled] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter State
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedTaskForDeliverable, setSelectedTaskForDeliverable] = useState<TaskItem | null>(null);
  const [selectedTaskForInspector, setSelectedTaskForInspector] = useState<TaskItem | null>(null);
  const [selectedTaskForAppeal, setSelectedTaskForAppeal] = useState<TaskItem | null>(null);

  // Transaction processing state & notification toast
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    txHash?: string;
  } | null>(null);

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setNotification({
        type: 'error',
        message: 'MetaMask is required to interact with GenLayer Studionet.',
      });
      return;
    }

    try {
      setIsConnecting(true);
      await switchToStudionet();
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        const bal = await getGenBalance(accounts[0]);
        setBalance(bal);
      }
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to connect wallet.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch Contract Data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      // 1. Fetch Stats
      const stats = await readContract('get_stats', []);
      if (stats && typeof stats === 'object') {
        setTotalTasks(stats.total_tasks || 0);
        setTotalLocked(stats.total_imaging_locked || '0');
        setTotalSettled(stats.total_tasks_settled || 0);
      }

      // 2. Fetch Tasks
      const allTasks = await readContract('get_all_tasks', []);
      if (Array.isArray(allTasks)) {
        // Reverse to show newest on top
        setTasks(allTasks.slice().reverse());
      }

      // 3. Update Balance if connected
      if (account) {
        const bal = await getGenBalance(account);
        setBalance(bal);
      }
    } catch (err) {
      console.error('Error fetching contract data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [account]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Account Change
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccounts = (accs: string[]) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          getGenBalance(accs[0]).then(setBalance);
        } else {
          setAccount(null);
          setBalance('0.000 GEN');
        }
      };
      (window as any).ethereum.on('accountsChanged', handleAccounts);
      return () => {
        (window as any).ethereum.removeListener('accountsChanged', handleAccounts);
      };
    }
  }, []);

  // Generic Write Method Runner
  const sendWriteTransaction = async (
    method: string,
    args: any[],
    valueWei: bigint = 0n
  ): Promise<string> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask is not available.');
    }
    await switchToStudionet();

    const fromAddress = account || (await (window as any).ethereum.request({ method: 'eth_requestAccounts' }))[0];
    const calldata = encodeCalldata(method, args);

    const txParams: any = {
      from: fromAddress,
      to: CONTRACT_ADDRESS,
      data: calldata,
    };
    if (valueWei > 0n) {
      txParams.value = `0x${valueWei.toString(16)}`;
    }

    setNotification({
      type: 'info',
      message: `Broadcasting ${method} to GenLayer Studionet validators...`,
    });

    const txHash = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });

    setNotification({
      type: 'info',
      message: `Transaction ${txHash.slice(0, 10)}... submitted. Awaiting validator consensus...`,
      txHash,
    });

    await waitForTransactionReceipt(txHash);

    setNotification({
      type: 'success',
      message: `${method} executed successfully on-chain!`,
      txHash,
    });

    await fetchData();
    return txHash;
  };

  // Actions
  const handleCreateTask = async (params: {
    targetBoundingBox: string;
    maxCloudCoverPct: number;
    minResolutionCm: number;
    durationBlocks: number;
    depositGen: string;
  }) => {
    setIsProcessing(true);
    try {
      const wei = BigInt(Math.floor(parseFloat(params.depositGen) * 1e18));
      await sendWriteTransaction(
        'create_imaging_task',
        [
          params.targetBoundingBox,
          params.maxCloudCoverPct,
          params.minResolutionCm,
          params.durationBlocks,
        ],
        wei
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitDeliverable = async (
    taskId: number,
    metadataUrl: string,
    samplePreviewUrl: string
  ) => {
    setIsProcessing(true);
    try {
      await sendWriteTransaction(
        'submit_capture_deliverable',
        [taskId, metadataUrl, samplePreviewUrl]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjudicate = async (taskId: number) => {
    setIsProcessing(true);
    try {
      await sendWriteTransaction('adjudicate_imaging_sla', [taskId]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAppeal = async (taskId: number, reason: string, bondWei: bigint, supplementalUrl: string) => {
    setIsProcessing(true);
    try {
      await sendWriteTransaction('appeal_verdict', [taskId, reason, supplementalUrl], bondWei);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjudicateAppeal = async (taskId: number) => {
    setIsProcessing(true);
    try {
      await sendWriteTransaction('adjudicate_appeal', [taskId]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async (taskId: number) => {
    setIsProcessing(true);
    try {
      await sendWriteTransaction('finalize_settlement', [taskId]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrReclaim = async (taskId: number) => {
    setIsProcessing(true);
    try {
      await sendWriteTransaction('cancel_or_reclaim', [taskId]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter Logic
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'open' && t.status !== 0) return false;
    if (activeFilter === 'captured' && t.status !== 1) return false;
    if (activeFilter === 'cooling' && t.status !== 2) return false;
    if (activeFilter === 'settled' && t.status !== 3 && t.status !== 4 && t.status !== 5) return false;
    if (activeFilter === 'disputed' && t.status !== 6) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = t.task_id.toString().includes(q);
      const matchBbox = t.target_bounding_box.toLowerCase().includes(q);
      const matchClient = t.client.toLowerCase().includes(q);
      const matchOperator = t.operator.toLowerCase().includes(q);
      const matchVerdict = t.verdict.toLowerCase().includes(q);
      return matchId || matchBbox || matchClient || matchOperator || matchVerdict;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col font-sans selection:bg-orbit-primary selection:text-white">
      {/* Navbar */}
      <Navbar
        account={account}
        balance={balance}
        isConnecting={isConnecting}
        onConnect={connectWallet}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 shadow-lg ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
              )}
              <div>
                <p className="font-medium">{notification.message}</p>
                {notification.txHash && (
                  <a
                    href={`${STUDIONET_EXPLORER_URL}/tx/${notification.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono underline mt-1 opacity-90 hover:opacity-100"
                  >
                    <span>View Transaction on GenLayer Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1 text-xs font-mono"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Banner */}
        <div className="relative mb-8 rounded-3xl bg-gradient-to-br from-space-900 via-space-900 to-space-800 border border-telemetry-darkborder p-6 sm:p-10 overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-orbit-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute right-10 bottom-6 opacity-10 pointer-events-none hidden lg:block">
            <Satellite className="w-72 h-72 text-sky-400" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-sky-400 radar-live"></span>
              <span>GENLAYER DEPIN & EARTH OBSERVATION SLA PROTOCOL</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold font-heading text-white tracking-tight leading-tight">
              Autonomous Orbital Satellite Imaging SLA Escrow
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
              Precision optical & SAR Earth observation orders secured by GenVM Intelligent Contracts.
              Validators render live GeoTIFF/STAC metadata on-chain via <code className="text-sky-300 bg-space-950 px-1.5 py-0.5 rounded font-mono text-xs">gl.nondet.web.render</code> to objectively adjudicate cloud obscuration breaches and Ground Sample Distance (GSD) SLAs without centralized intermediaries.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orbit-primary to-sky-500 hover:from-sky-600 hover:to-orbit-primary text-white text-sm font-semibold shadow-lg shadow-sky-500/20 transition flex items-center space-x-2"
              >
                <Compass className="w-4 h-4" />
                <span>Request Bounding Box Imaging</span>
              </button>
              <a
                href={`${STUDIONET_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl border border-telemetry-darkborder bg-space-800/80 hover:bg-space-700 text-slate-300 hover:text-white text-sm font-medium transition flex items-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify Contract #{CONTRACT_ADDRESS.slice(0, 8)}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>
          </div>
        </div>

        {/* Global Protocol Telemetry Metrics */}
        <StatsOverview
          totalTasks={totalTasks}
          totalLocked={totalLocked}
          totalSettled={totalSettled}
        />

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-space-900 border border-telemetry-darkborder overflow-x-auto w-full md:w-auto">
            {[
              { id: 'all', label: 'All Passes' },
              { id: 'open', label: 'Open for Constellations' },
              { id: 'captured', label: 'Ready for AI Tribunal' },
              { id: 'cooling', label: 'Cooling-Off / Review' },
              { id: 'settled', label: 'Settled Passes' },
              { id: 'disputed', label: 'Appeals' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  activeFilter === tab.id
                    ? 'bg-orbit-primary text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-space-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Filter by ID, polygon, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-space-900 border border-telemetry-darkborder focus:border-orbit-light text-white font-mono text-xs focus:outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Tasks Grid */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-mono text-slate-400">Loading satellite observation passes from GenLayer Studionet...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center bg-space-900 border border-telemetry-darkborder rounded-3xl p-8">
            <Satellite className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold font-heading text-white">No orbital tasks match your criteria</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Launch a new observation pass to request satellite capture of your target bounding box with automated SLA guarantees.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-orbit-primary hover:bg-sky-600 text-white text-xs font-semibold shadow-md transition"
            >
              Order First Orbital Pass
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.task_id}
                task={task}
                currentAddress={account}
                onOpenDeliverableModal={(t) => setSelectedTaskForDeliverable(t)}
                onOpenInspectorModal={(t) => setSelectedTaskForInspector(t)}
                onOpenAppealModal={(t) => setSelectedTaskForAppeal(t)}
                onAdjudicate={handleAdjudicate}
                onFinalize={handleFinalize}
                onCancelOrReclaim={handleCancelOrReclaim}
                onAdjudicateAppeal={handleAdjudicateAppeal}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-telemetry-darkborder bg-space-900/60 py-6 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>SatLease v1.2.4 • GenLayer Studionet (Chain 61999)</span>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href={`${STUDIONET_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition"
            >
              Smart Contract
            </a>
            <span>•</span>
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition"
            >
              GenLayer Studio
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTask}
        isSubmitting={isProcessing}
      />

      <SubmitDeliverableModal
        task={selectedTaskForDeliverable}
        isOpen={Boolean(selectedTaskForDeliverable)}
        onClose={() => setSelectedTaskForDeliverable(null)}
        onSubmit={handleSubmitDeliverable}
        isSubmitting={isProcessing}
      />

      <OpticalInspectorModal
        task={selectedTaskForInspector}
        isOpen={Boolean(selectedTaskForInspector)}
        onClose={() => setSelectedTaskForInspector(null)}
      />

      <AppealModal
        task={selectedTaskForAppeal}
        isOpen={Boolean(selectedTaskForAppeal)}
        onClose={() => setSelectedTaskForAppeal(null)}
        onSubmitAppeal={handleAppeal}
        isSubmitting={isProcessing}
      />
    </div>
  );
};

export default App;
