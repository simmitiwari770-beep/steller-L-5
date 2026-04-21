import { shortenAddress } from "../lib/utils";

const tabs = [
  { id: "home", label: "Home" },
  { id: "create", label: "Create Escrow" },
  { id: "dashboard", label: "Dashboard" },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  walletAddress,
  onConnect,
  isConnecting,
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-lg font-semibold text-cyan-300">TrustPay</p>
          <p className="text-xs text-slate-400">Soroban Escrow on Testnet</p>
        </div>
        <nav className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                activeTab === tab.id
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={onConnect}
          disabled={isConnecting}
          className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-70"
        >
          {walletAddress
            ? shortenAddress(walletAddress)
            : isConnecting
              ? "Connecting..."
              : "Connect Freighter"}
        </button>
      </div>
    </header>
  );
}
