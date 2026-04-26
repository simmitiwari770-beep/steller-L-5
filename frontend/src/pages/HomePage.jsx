import { HORIZON_URL } from "../lib/constants";

export default function HomePage({ walletAddress, onCopy }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-cyan-300">
        Decentralized escrow for peer payments
      </h1>
      <p className="text-sm text-slate-300">
        TrustPay locks funds in a Soroban contract until the buyer confirms
        delivery, then releases payment on-chain.
      </p>

      <div className="rounded-lg bg-slate-950 p-4">
        <p className="text-xs text-slate-400">Connected Wallet</p>
        <p className="mt-1 break-all font-mono text-sm text-slate-200">
          {walletAddress || "Connect Freighter to begin"}
        </p>
        {walletAddress && (
          <button
            type="button"
            onClick={onCopy}
            className="mt-3 rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-200"
          >
            Copy wallet address
          </button>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-cyan-800/60 bg-cyan-950/20 p-4 text-sm">
        <p className="font-semibold text-cyan-200">How to test</p>
        <ol className="list-decimal space-y-1 pl-4 text-slate-300">
          <li>Install Freighter wallet extension.</li>
          <li>Switch Freighter network to Testnet.</li>
          <li>Fund your wallet using Friendbot.</li>
          <li>Create escrow and approve signatures in Freighter.</li>
          <li>Open Dashboard and verify hash/explorer updates.</li>
        </ol>
        <a
          className="inline-block rounded border border-cyan-700 px-3 py-1 text-cyan-300 hover:bg-cyan-950/40"
          href={`${HORIZON_URL}/friendbot?addr=${walletAddress || ""}`}
          target="_blank"
          rel="noreferrer"
        >
          Open Friendbot
        </a>
      </div>
    </section>
  );
}
