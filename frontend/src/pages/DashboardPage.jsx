import StatusBadge from "../components/StatusBadge";
import { formatAmount, shortenAddress } from "../lib/utils";

export default function DashboardPage({
  escrows,
  walletAddress,
  onRelease,
  onRefund,
  onUnavailableAction,
  loadingId,
  escrowTxMap,
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-cyan-300">Escrow Dashboard</h2>
        <p className="text-xs text-slate-400">{escrows.length} escrows indexed</p>
      </div>
      <div className="space-y-3">
        {escrows.map((escrow) => {
          const isBuyer = walletAddress && walletAddress === escrow.buyer;
          const canAct = isBuyer && escrow.status === "Pending";
          const escrowTx = escrowTxMap?.[escrow.id];
          return (
            <article
              key={escrow.id}
              className="rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-sm"
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
              <div className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
                <p>Buyer: {shortenAddress(escrow.buyer)}</p>
                <p>Seller: {shortenAddress(escrow.seller)}</p>
              </div>
              <div className="mt-2 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
                <p className="text-[11px] text-slate-400">Latest escrow transaction</p>
                {escrowTx?.hash ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="truncate font-mono text-xs text-cyan-300">{escrowTx.hash}</p>
                    <a
                      href={escrowTx.explorer}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-cyan-700 px-2 py-1 text-[11px] text-cyan-300 hover:bg-cyan-950/40"
                    >
                      Explorer Link
                    </a>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Hash appears after create/release/refund is submitted from this app.
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loadingId === escrow.id}
                  onClick={() =>
                    canAct ? onRelease(escrow.id) : onUnavailableAction(escrow)
                  }
                  className={`rounded-md px-3 py-1 text-xs font-medium text-slate-950 ${
                    canAct
                      ? "bg-emerald-500"
                      : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                  } disabled:opacity-40`}
                >
                  {loadingId === escrow.id ? "Submitting..." : "Release Payment"}
                </button>
                <button
                  type="button"
                  disabled={loadingId === escrow.id}
                  onClick={() =>
                    canAct ? onRefund(escrow.id) : onUnavailableAction(escrow)
                  }
                  className={`rounded-md px-3 py-1 text-xs font-medium text-slate-950 ${
                    canAct
                      ? "bg-rose-500"
                      : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                  } disabled:opacity-40`}
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
