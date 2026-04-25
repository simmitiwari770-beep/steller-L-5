import { useCallback, useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import ToastStack from "./components/ToastStack";
import CreateEscrowPage from "./pages/CreateEscrowPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import { connectFreighter } from "./lib/freighter";
import {
  createEscrow,
  fetchEscrow,
  fetchEscrowIds,
  initializeContract,
  refundEscrow,
  releaseEscrow,
} from "./lib/soroban";

const TX_HISTORY_KEY = "trustpay_tx_history";
const ESCROW_TX_MAP_KEY = "trustpay_escrow_tx_map";
const TOAST_TTL_MS = 4200;

function loadPersistedHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TX_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadEscrowTxMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ESCROW_TX_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeStatus(rawStatus) {
  const normalized =
    typeof rawStatus === "bigint" ? Number(rawStatus) : rawStatus;

  if (normalized === 0 || normalized === "0" || normalized === "Pending") {
    return "Pending";
  }
  if (normalized === 1 || normalized === "1" || normalized === "Released") {
    return "Released";
  }
  if (normalized === 2 || normalized === "2" || normalized === "Refunded") {
    return "Refunded";
  }
  return String(rawStatus);
}

function normalizeErrorMessage(error) {
  const message = error?.message || String(error);
  const lowered = message.toLowerCase();
  if (lowered.includes("bad union switch")) {
    return "Contract response decode issue detected. Raw error: " + message;
  }
  if (lowered.includes("encoded argument must be of type string")) {
    return "Transaction payload format error. Please try again.";
  }
  if (lowered.includes("not installed")) {
    return "Freighter not installed. Install from https://freighter.app/";
  }
  if (lowered.includes("rejected") || lowered.includes("declined")) {
    return "User rejected transaction in Freighter.";
  }
  if (lowered.includes("testnet") || lowered.includes("network")) {
    return "Wrong network detected. Switch Freighter to Stellar Testnet.";
  }
  if (lowered.includes("insufficient")) {
    return "Insufficient balance to complete this escrow transaction.";
  }
  if (
    message.includes("create_escrow") &&
    (message.includes("InvalidAction") || message.includes("UnreachableCodeReached"))
  ) {
    return "Escrow creation failed: buyer and seller cannot be the same address.";
  }
  if (
    message.includes("release_payment") &&
    (message.includes("InvalidAction") || message.includes("UnreachableCodeReached"))
  ) {
    return "Release failed: this escrow is no longer pending or you are not the authorized buyer.";
  }
  if (
    message.includes("refund_payment") &&
    (message.includes("InvalidAction") || message.includes("UnreachableCodeReached"))
  ) {
    return "Refund failed: this escrow is no longer pending or you are not the authorized buyer.";
  }
  if (
    message.includes("initialize") &&
    (message.includes("InvalidAction") || message.includes("UnreachableCodeReached"))
  ) {
    return "Contract is already initialized. You can directly create and refresh escrows.";
  }
  return message;
}

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [walletAddress, setWalletAddress] = useState("");
  const [escrows, setEscrows] = useState([]);
  const [message, setMessage] = useState("");
  const [txHistory, setTxHistory] = useState(loadPersistedHistory);
  const [escrowTxMap, setEscrowTxMap] = useState(loadEscrowTxMap);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingEscrowId, setLoadingEscrowId] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TX_HISTORY_KEY, JSON.stringify(txHistory));
  }, [txHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ESCROW_TX_MAP_KEY, JSON.stringify(escrowTxMap));
  }, [escrowTxMap]);

  const notify = useCallback((type, msg) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message: msg }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  function pushTxReceipt(tx, type, escrowId) {
    const safeTx = {
      hash: tx.hash,
      explorer: tx.explorer,
      type: type,
    };
    setLastReceipt(safeTx);
    setTxHistory((prev) => [safeTx, ...prev].slice(0, 30));
    if (escrowId !== undefined && escrowId !== null) {
      setEscrowTxMap((prev) => ({
        ...prev,
        [escrowId]: safeTx,
      }));
    }
  }

  const refreshEscrows = useCallback(async (sourceAddress = walletAddress) => {
    try {
      setIsRefreshing(true);
      if (!sourceAddress) {
        setEscrows([]);
        return;
      }
      const ids = await fetchEscrowIds(sourceAddress);
      const rows = await Promise.allSettled(
        ids.map((id) => fetchEscrow(id, sourceAddress)),
      );
      const fulfilled = rows
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .filter(Boolean);
      setEscrows(
        fulfilled
          .filter(Boolean)
          .map((item) => ({
            id: Number(item.id),
            buyer: item.buyer,
            seller: item.seller,
            amount: item.amount,
            status: normalizeStatus(item.status),
          }))
          .sort((a, b) => b.id - a.id),
      );
      const failedCount = rows.length - fulfilled.length;
      setMessage(
        failedCount > 0
          ? `Escrows refreshed with ${failedCount} item(s) skipped due to decode/read mismatch.`
          : "Escrows refreshed from testnet.",
      );
      notify("info", "Escrows refreshed from on-chain testnet data.");
    } catch (error) {
      const normalized = normalizeErrorMessage(error);
      setMessage(normalized);
      notify("error", normalized);
    } finally {
      setIsRefreshing(false);
    }
  }, [notify, walletAddress]);

  useEffect(() => {
    const load = async () => {
      await refreshEscrows();
    };
    load();
  }, [refreshEscrows]);

  async function onConnect() {
    try {
      setIsConnecting(true);
      const addr = await connectFreighter();
      setWalletAddress(addr);
      setMessage("Freighter connected on testnet.");
      notify("success", "Freighter connected on Testnet.");
      await refreshEscrows(addr);
    } catch (error) {
      const text = normalizeErrorMessage(error);
      setMessage(text);
      notify("error", text);
    } finally {
      setIsConnecting(false);
    }
  }

  async function onInitializeContract() {
    try {
      setIsInitializing(true);
      notify("info", "Transaction submitted. Check Freighter for signature.");
      const tx = await initializeContract(walletAddress);
      setMessage(`Contract initialized: ${tx.hash}`);
      pushTxReceipt(tx, "initialize");
      notify("success", "Contract initialized successfully.");
    } catch (error) {
      const normalized = normalizeErrorMessage(error);
      setMessage(normalized);
      notify("error", normalized);
    } finally {
      setIsInitializing(false);
    }
  }

  async function onCreateEscrow(payload) {
    try {
      setIsCreating(true);
      notify("info", "Transaction submitted. Confirm in Freighter.");
      const tx = await createEscrow(walletAddress, payload.seller, payload.amount);
      setMessage(`Escrow created. Tx: ${tx.hash}`);
      const escrowId = Number(tx.returnValue);
      pushTxReceipt(tx, "create_escrow", Number.isFinite(escrowId) ? escrowId : null);
      notify("success", "Escrow created on Stellar Testnet.");
      await refreshEscrows();
    } catch (error) {
      const normalized = normalizeErrorMessage(error);
      setMessage(normalized);
      notify("error", normalized);
    } finally {
      setIsCreating(false);
    }
  }

  async function onReleaseEscrow(escrowId) {
    try {
      setLoadingEscrowId(escrowId);
      const cachedEscrow = escrows.find((item) => item.id === escrowId);
      if (!cachedEscrow) {
        setMessage(`Escrow #${escrowId} not found. Refresh dashboard and retry.`);
        return;
      }
      let chainEscrow = cachedEscrow;
      try {
        const chainEscrowRaw = await fetchEscrow(escrowId, walletAddress);
        if (chainEscrowRaw) {
          chainEscrow = {
            ...chainEscrowRaw,
            status: normalizeStatus(chainEscrowRaw.status),
          };
        }
      } catch {
        notify("info", "Live escrow check skipped. Using latest dashboard state.");
      }

      if (chainEscrow.buyer !== walletAddress) {
        setMessage(
          `Release not allowed. Only buyer ${chainEscrow.buyer} can release escrow #${escrowId}.`,
        );
        return;
      }
      if (chainEscrow.status !== "Pending") {
        setMessage(
          `Escrow #${escrowId} is ${chainEscrow.status} on-chain. Only pending escrows can be released.`,
        );
        return;
      }
      setMessage("Opening Freighter for release signature...");
      notify("info", "Transaction submitted. Confirm release in Freighter.");
      const tx = await releaseEscrow(walletAddress, escrowId);
      setMessage(`Escrow released: ${tx.explorer}`);
      pushTxReceipt(tx, "release_payment", escrowId);
      notify("success", `Escrow #${escrowId} released.`);
      await refreshEscrows();
    } catch (error) {
      const normalized = normalizeErrorMessage(error);
      setMessage(normalized);
      notify("error", normalized);
    } finally {
      setLoadingEscrowId(null);
    }
  }

  async function onRefundEscrow(escrowId) {
    try {
      setLoadingEscrowId(escrowId);
      const cachedEscrow = escrows.find((item) => item.id === escrowId);
      if (!cachedEscrow) {
        setMessage(`Escrow #${escrowId} not found. Refresh dashboard and retry.`);
        return;
      }
      let chainEscrow = cachedEscrow;
      try {
        const chainEscrowRaw = await fetchEscrow(escrowId, walletAddress);
        if (chainEscrowRaw) {
          chainEscrow = {
            ...chainEscrowRaw,
            status: normalizeStatus(chainEscrowRaw.status),
          };
        }
      } catch {
        notify("info", "Live escrow check skipped. Using latest dashboard state.");
      }

      if (chainEscrow.buyer !== walletAddress) {
        setMessage(
          `Refund not allowed. Only buyer ${chainEscrow.buyer} can refund escrow #${escrowId}.`,
        );
        return;
      }
      if (chainEscrow.status !== "Pending") {
        setMessage(
          `Escrow #${escrowId} is ${chainEscrow.status} on-chain. Only pending escrows can be refunded.`,
        );
        return;
      }
      setMessage("Opening Freighter for refund signature...");
      notify("info", "Transaction submitted. Confirm refund in Freighter.");
      const tx = await refundEscrow(walletAddress, escrowId);
      setMessage(`Escrow refunded: ${tx.explorer}`);
      pushTxReceipt(tx, "refund_payment", escrowId);
      notify("success", `Escrow #${escrowId} refunded.`);
      await refreshEscrows();
    } catch (error) {
      const normalized = normalizeErrorMessage(error);
      setMessage(normalized);
      notify("error", normalized);
    } finally {
      setLoadingEscrowId(null);
    }
  }

  async function onCopyAddress() {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setMessage("Wallet address copied.");
      notify("success", "Wallet address copied.");
    } catch {
      setMessage("Unable to copy wallet address from this browser context.");
      notify("error", "Unable to copy wallet address.");
    }
  }

  function onUnavailableAction(escrow) {
    if (!walletAddress) {
      setMessage("Connect Freighter wallet first to sign transactions.");
      return;
    }
    if (escrow.buyer !== walletAddress) {
      setMessage(
        `Only buyer ${escrow.buyer} can approve Release/Refund for escrow #${escrow.id}.`,
      );
      return;
    }
    setMessage(
      `Escrow #${escrow.id} is ${escrow.status}. Actions work only for Pending status.`,
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        walletAddress={walletAddress}
        onConnect={onConnect}
        isConnecting={isConnecting}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onInitializeContract}
            disabled={!walletAddress || isInitializing}
            className="rounded-md border border-cyan-600 px-3 py-1 text-xs text-cyan-300 disabled:opacity-50"
          >
            {isInitializing ? "Initializing..." : "Initialize Contract"}
          </button>
          <button
            type="button"
            onClick={refreshEscrows}
            disabled={!walletAddress || isRefreshing}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300"
          >
            {isRefreshing ? "Refreshing..." : "Refresh Escrows"}
          </button>
        </div>
        {message && (
          <p className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            {message}
          </p>
        )}
        {lastReceipt && (
          <section className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4">
            <p className="text-xs text-emerald-300">Latest Transaction Receipt</p>
            <p className="mt-1 text-sm text-slate-100">{lastReceipt.type}</p>
            <a
              href={lastReceipt.explorer}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-xs text-cyan-300 underline"
            >
              {lastReceipt.hash}
            </a>
          </section>
        )}
        {activeTab === "create" && (
          <CreateEscrowPage
            walletAddress={walletAddress}
            onCreate={onCreateEscrow}
            loading={isCreating}
          />
        )}
        {activeTab === "dashboard" && (
          <DashboardPage
            escrows={escrows}
            walletAddress={walletAddress}
            onRelease={onReleaseEscrow}
            onRefund={onRefundEscrow}
            onUnavailableAction={onUnavailableAction}
            loadingId={loadingEscrowId}
            escrowTxMap={escrowTxMap}
          />
        )}
        {activeTab === "home" && (
          <HomePage walletAddress={walletAddress} onCopy={onCopyAddress} />
        )}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-cyan-300">
            Recent Transactions
          </h3>
          <div className="mt-2 space-y-2">
            {txHistory.map((tx, idx) => (
              <a
                key={`${tx.hash}-${idx}`}
                href={tx.explorer}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs text-cyan-300 underline"
              >
                {tx.type ? `${tx.type}: ` : ""}
                {tx.hash}
              </a>
            ))}
            {txHistory.length === 0 && (
              <p className="text-xs text-slate-400">
                No transactions yet from this session.
              </p>
            )}
          </div>
        </section>
      </main>
      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
      />
    </div>
  );
}

export default App;
