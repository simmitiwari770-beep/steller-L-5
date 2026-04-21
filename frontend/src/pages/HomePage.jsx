import { HORIZON_URL } from "../lib/constants";

export default function HomePage({ walletAddress, onCopy }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
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
        <p className="font-semibold text-cyan-200">Onboarding</p>
        <ol className="list-decimal space-y-1 pl-4 text-slate-300">
          <li>Install Freighter and switch network to Testnet.</li>
          <li>Fund your buyer account with Friendbot test XLM.</li>
          <li>Create escrow and approve transaction in Freighter.</li>
          <li>Release payment after service/product delivery.</li>
        </ol>
        <a
          className="text-cyan-300 underline"
          href={`${HORIZON_URL}/friendbot?addr=${walletAddress || ""}`}
          target="_blank"
          rel="noreferrer"
        >
          Open Friendbot funding link
        </a>
      </div>
    </section>
  );
}
