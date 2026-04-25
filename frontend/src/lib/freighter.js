import {
  getAddress,
  getNetwork,
  isConnected,
  isAllowed,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./constants";

function normalizeFreighterError(error, fallback) {
  const raw = error?.message || String(error || "");
  const lowered = raw.toLowerCase();
  if (lowered.includes("rejected") || lowered.includes("declined")) {
    return "User rejected transaction in Freighter.";
  }
  if (lowered.includes("not installed") || lowered.includes("freighter")) {
    return "Freighter not installed. Install from https://freighter.app/";
  }
  if (lowered.includes("testnet") || lowered.includes("network")) {
    return "Switch Freighter network to Stellar Testnet.";
  }
  return raw || fallback;
}

export async function connectFreighter() {
  const connected = await isConnected();
  if (connected.error || !connected.isConnected) {
    throw new Error(
      "Freighter is not installed. Install from https://freighter.app/",
    );
  }

  const allowed = await isAllowed();
  if (allowed.error || !allowed.isAllowed) {
    const access = await requestAccess();
    if (access.error) {
      throw new Error(normalizeFreighterError(access.error, "Freighter access denied."));
    }
  }

  const address = await getAddress();
  if (address.error || !address.address) {
    throw new Error(address.error?.message || "Unable to read wallet address.");
  }

  const network = await getNetwork();
  if (network.error) {
    throw new Error(network.error.message || "Unable to read wallet network.");
  }

  if (
    network.networkPassphrase &&
    network.networkPassphrase !== NETWORK_PASSPHRASE
  ) {
    throw new Error("Switch Freighter network to Stellar Testnet.");
  }

  return address.address;
}

export async function signTxXdr(txXdr, accountToSign) {
  const xdrPayload = typeof txXdr === "string" ? txXdr : txXdr?.toString?.() || "";
  if (!xdrPayload) {
    throw new Error("Invalid transaction payload for Freighter signature.");
  }
  const signed = await signTransaction(xdrPayload, {
    networkPassphrase: NETWORK_PASSPHRASE,
    accountToSign,
  });
  if (signed.error || !signed.signedTxXdr) {
    throw new Error(normalizeFreighterError(signed.error, "Transaction signature was rejected."));
  }
  return signed.signedTxXdr;
}
