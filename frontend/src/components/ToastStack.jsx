export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-700 bg-emerald-950/90 text-emerald-200"
              : toast.type === "error"
                ? "border-rose-700 bg-rose-950/90 text-rose-200"
                : "border-cyan-700 bg-cyan-950/90 text-cyan-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{toast.message}</p>
            <button
              type="button"
              className="text-xs opacity-80 hover:opacity-100"
              onClick={() => onDismiss(toast.id)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
