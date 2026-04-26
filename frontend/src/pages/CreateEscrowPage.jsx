import { useState } from "react";
import { isValidPublicKey } from "../lib/utils";

export default function CreateEscrowPage({ walletAddress, onCreate, loading }) {
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!walletAddress) {
      setError("Connect Freighter first.");
      return;
    }
    if (!isValidPublicKey(seller)) {
      setError("Seller address is invalid.");
      return;
    }
    if (seller === walletAddress) {
      setError("Buyer and seller must be different wallet addresses.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (numericAmount > 10_000_000) {
      setError("Amount is too large for a single escrow.");
      return;
    }
    const decimals = String(amount).split(".")[1]?.length || 0;
    if (decimals > 7) {
      setError("Amount supports up to 7 decimal places.");
      return;
    }
    await onCreate({ seller, amount: numericAmount });
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <h2 className="text-xl font-semibold text-cyan-300">Create Escrow</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <label className="block text-sm text-slate-300">
          Seller wallet address
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs"
            value={seller}
            onChange={(e) => setSeller(e.target.value.trim())}
            placeholder="G..."
          />
        </label>
        <label className="block text-sm text-slate-300">
          Amount (XLM)
          <input
            type="number"
            step="0.0000001"
            min="0.0000001"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
          />
        </label>
        {(error || !walletAddress) && (
          <p className="text-sm text-rose-300">{error || "Wallet not connected."}</p>
        )}
        <button
          type="submit"
          className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
          disabled={loading || !walletAddress}
        >
          {loading ? "Locking funds..." : "Lock Funds"}
        </button>
      </form>
    </section>
  );
}
