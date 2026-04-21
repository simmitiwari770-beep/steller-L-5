import {
  getAddress,
  getNetwork,
  isConnected,
  isAllowed,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./constants";

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
      throw new Error(access.error.message || "Freighter access denied.");
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
  const signed = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    accountToSign,
  });
  if (signed.error || !signed.signedTxXdr) {
    throw new Error(
      signed.error?.message || "Transaction signature was rejected.",
    );
  }
  return signed.signedTxXdr;
}
