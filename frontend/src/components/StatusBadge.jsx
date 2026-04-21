export default function StatusBadge({ status }) {
  const map = {
    Pending: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    Released: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    Refunded: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  };
  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-medium ${map[status] || "bg-slate-700 text-slate-100 border-slate-600"}`}
    >
      {status}
    </span>
  );
}
