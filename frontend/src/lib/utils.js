import { StrKey } from "@stellar/stellar-sdk";

export function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function isValidPublicKey(publicKey) {
  try {
    return StrKey.isValidEd25519PublicKey(publicKey);
  } catch {
    return false;
  }
}

export function formatAmount(stroops) {
  if (stroops === undefined || stroops === null) return "0";
  return (Number(stroops) / 10_000_000).toFixed(2);
}
