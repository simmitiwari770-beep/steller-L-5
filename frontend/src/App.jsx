import { useCallback, useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import CreateEscrowPage from "./pages/CreateEscrowPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import { connectFreighter } from "./lib/freighter";
import {
  getContractId,
  getTokenContractId,
  hasRuntimeConfig,
  setRuntimeContractConfig,
} from "./lib/constants";
import {
  createEscrow,
  fetchEscrow,
  fetchEscrowIds,
  initializeContract,
  refundEscrow,
  releaseEscrow,
} from "./lib/soroban";

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
  const [txHistory, setTxHistory] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingEscrowId, setLoadingEscrowId] = useState(null);
  const [contractIdInput, setContractIdInput] = useState(getContractId());
  const [tokenIdInput, setTokenIdInput] = useState(getTokenContractId());
  const [configReady, setConfigReady] = useState(hasRuntimeConfig());

  const refreshEscrows = useCallback(async (sourceAddress = walletAddress) => {
    try {
      if (!sourceAddress) {
        setEscrows([]);
        return;
      }
      const ids = await fetchEscrowIds(sourceAddress);
      const rows = await Promise.all(ids.map((id) => fetchEscrow(id, sourceAddress)));
      setEscrows(
        rows.map((item) => ({
          id: Number(item.id),
          buyer: item.buyer,
          seller: item.seller,
          amount: item.amount,
          status: normalizeStatus(item.status),
        })),
      );
      setMessage("Escrows refreshed from testnet.");
    } catch (error) {
      setMessage(normalizeErrorMessage(error));
    }
  }, [walletAddress]);

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
      await refreshEscrows(addr);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsConnecting(false);
    }
  }

  async function onInitializeContract() {
    try {
      const tx = await initializeContract(walletAddress);
      setMessage(`Contract initialized: ${tx.hash}`);
      setTxHistory((prev) => [tx, ...prev].slice(0, 20));
    } catch (error) {
      setMessage(normalizeErrorMessage(error));
    }
  }

  async function onCreateEscrow(payload) {
    try {
      setIsCreating(true);
      const tx = await createEscrow(walletAddress, payload.seller, payload.amount);
      setMessage(`Escrow created. Tx: ${tx.hash}`);
      setTxHistory((prev) => [tx, ...prev].slice(0, 20));
      await refreshEscrows();
    } catch (error) {
      setMessage(normalizeErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function onReleaseEscrow(escrowId) {
    try {
      setLoadingEscrowId(escrowId);
      const latestEscrow = await fetchEscrow(escrowId, walletAddress);
      const latestStatus = normalizeStatus(latestEscrow.status);
      if (latestEscrow.buyer !== walletAddress) {
        setMessage(
          `Release not allowed. Only buyer ${latestEscrow.buyer} can release escrow #${escrowId}.`,
        );
        return;
      }
      if (latestStatus !== "Pending") {
        setMessage(
          `Escrow #${escrowId} is ${latestStatus}. Only pending escrows can be released.`,
        );
        await refreshEscrows();
        return;
      }
      const tx = await releaseEscrow(walletAddress, escrowId);
      setMessage(`Escrow released: ${tx.explorer}`);
      setTxHistory((prev) => [tx, ...prev].slice(0, 20));
      await refreshEscrows();
    } catch (error) {
      setMessage(normalizeErrorMessage(error));
    } finally {
      setLoadingEscrowId(null);
    }
  }

  async function onRefundEscrow(escrowId) {
    try {
      setLoadingEscrowId(escrowId);
      const latestEscrow = await fetchEscrow(escrowId, walletAddress);
      const latestStatus = normalizeStatus(latestEscrow.status);
      if (latestEscrow.buyer !== walletAddress) {
        setMessage(
          `Refund not allowed. Only buyer ${latestEscrow.buyer} can refund escrow #${escrowId}.`,
        );
        return;
      }
      if (latestStatus !== "Pending") {
        setMessage(
          `Escrow #${escrowId} is ${latestStatus}. Only pending escrows can be refunded.`,
        );
        await refreshEscrows();
        return;
      }
      const tx = await refundEscrow(walletAddress, escrowId);
      setMessage(`Escrow refunded: ${tx.explorer}`);
      setTxHistory((prev) => [tx, ...prev].slice(0, 20));
      await refreshEscrows();
    } catch (error) {
      setMessage(normalizeErrorMessage(error));
    } finally {
      setLoadingEscrowId(null);
    }
  }

  function onCopyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setMessage("Wallet address copied.");
  }

  function onSaveConfig() {
    const contractId = contractIdInput.trim();
    const tokenId = tokenIdInput.trim();
    if (!contractId || !tokenId) {
      setMessage("Please enter both Escrow Contract ID and Token Contract ID.");
      return;
    }
    setRuntimeContractConfig(contractId, tokenId);
    setConfigReady(true);
    setMessage("Contract config saved. Now click Initialize Contract once.");
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
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-cyan-300">
            Contract Configuration
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Set once if `.env` is missing. Values are saved in your browser.
          </p>
          <div className="mt-3 grid gap-2">
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              placeholder="Escrow Contract ID (C...)"
              value={contractIdInput}
              onChange={(event) => setContractIdInput(event.target.value)}
            />
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              placeholder="Token Contract ID (C...)"
              value={tokenIdInput}
              onChange={(event) => setTokenIdInput(event.target.value)}
            />
            <button
              type="button"
              onClick={onSaveConfig}
              className="w-fit rounded-md bg-cyan-400 px-3 py-1 text-xs font-semibold text-slate-950"
            >
              Save Config
            </button>
          </div>
        </section>
        {!configReady && (
          <p className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
            Contract IDs are missing. Add both IDs in Contract Configuration, then
            save.
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onInitializeContract}
            disabled={!walletAddress || !configReady}
            className="rounded-md border border-cyan-600 px-3 py-1 text-xs text-cyan-300 disabled:opacity-50"
          >
            Initialize Contract
          </button>
          <button
            type="button"
            onClick={refreshEscrows}
            disabled={!walletAddress || !configReady}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300"
          >
            Refresh Escrows
          </button>
        </div>
        {message && (
          <p className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            {message}
          </p>
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
            loadingId={loadingEscrowId}
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
            {txHistory.map((tx) => (
              <a
                key={tx.hash}
                href={tx.explorer}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs text-cyan-300 underline"
              >
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
    </div>
  );
}

export default App;
