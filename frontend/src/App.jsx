import { useCallback, useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import CreateEscrowPage from "./pages/CreateEscrowPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import { connectFreighter } from "./lib/freighter";
import {
  getContractId,
  getTokenContractId,
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
  if (rawStatus === 0 || rawStatus === "Pending") return "Pending";
  if (rawStatus === 1 || rawStatus === "Released") return "Released";
  if (rawStatus === 2 || rawStatus === "Refunded") return "Refunded";
  return String(rawStatus);
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
    } catch (error) {
      setMessage(error.message);
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
      setMessage(error.message);
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
      setMessage(error.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function onReleaseEscrow(escrowId) {
    try {
      setLoadingEscrowId(escrowId);
      const tx = await releaseEscrow(walletAddress, escrowId);
      setMessage(`Escrow released: ${tx.explorer}`);
      setTxHistory((prev) => [tx, ...prev].slice(0, 20));
      await refreshEscrows();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingEscrowId(null);
    }
  }

  async function onRefundEscrow(escrowId) {
    try {
      setLoadingEscrowId(escrowId);
      const tx = await refundEscrow(walletAddress, escrowId);
      setMessage(`Escrow refunded: ${tx.explorer}`);
      setTxHistory((prev) => [tx, ...prev].slice(0, 20));
      await refreshEscrows();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingEscrowId(null);
    }
  }

  function onCopyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setMessage("Wallet address copied.");
  }

  function onSaveConfig() {
    setRuntimeContractConfig(contractIdInput.trim(), tokenIdInput.trim());
    setMessage("Contract config saved. Refresh escrows or initialize contract.");
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onInitializeContract}
            disabled={!walletAddress}
            className="rounded-md border border-cyan-600 px-3 py-1 text-xs text-cyan-300 disabled:opacity-50"
          >
            Initialize Contract
          </button>
          <button
            type="button"
            onClick={refreshEscrows}
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
