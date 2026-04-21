import StatusBadge from "../components/StatusBadge";
import { formatAmount, shortenAddress } from "../lib/utils";

export default function DashboardPage({
  escrows,
  walletAddress,
  onRelease,
  onRefund,
  loadingId,
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-cyan-300">Escrow Dashboard</h2>
        <p className="text-xs text-slate-400">{escrows.length} escrows indexed</p>
      </div>
      <div className="space-y-3">
        {escrows.map((escrow) => {
          const isBuyer = walletAddress && walletAddress === escrow.buyer;
          const canAct = isBuyer && escrow.status === "Pending";
          return (
            <article
              key={escrow.id}
              className="rounded-lg border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">Escrow #{escrow.id}</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {formatAmount(escrow.amount)} XLM
                  </p>
                </div>
                <StatusBadge status={escrow.status} />
              </div>
              <p className="mt-2 text-xs text-slate-300">
                Buyer: {shortenAddress(escrow.buyer)} | Seller:{" "}
                {shortenAddress(escrow.seller)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canAct || loadingId === escrow.id}
                  onClick={() => onRelease(escrow.id)}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-slate-950 disabled:opacity-40"
                >
                  {loadingId === escrow.id ? "Submitting..." : "Release Payment"}
                </button>
                <button
                  type="button"
                  disabled={!canAct || loadingId === escrow.id}
                  onClick={() => onRefund(escrow.id)}
                  className="rounded-md bg-rose-500 px-3 py-1 text-xs font-medium text-slate-950 disabled:opacity-40"
                >
                  Refund
                </button>
              </div>
            </article>
          );
        })}
        {escrows.length === 0 && (
          <p className="text-sm text-slate-400">
            No escrows yet. Create your first escrow.
          </p>
        )}
      </div>
    </section>
  );
}
