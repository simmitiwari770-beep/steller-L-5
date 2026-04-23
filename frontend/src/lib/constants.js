export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const STELLAR_EXPERT_TX_BASE =
  "https://stellar.expert/explorer/testnet/tx/";

const LOCAL_CONTRACT_KEY = "trustpay_contract_id";
const LOCAL_TOKEN_KEY = "trustpay_token_contract_id";

export function getContractId() {
  const local = typeof window !== "undefined"
    ? window.localStorage.getItem(LOCAL_CONTRACT_KEY)
    : "";
  return local || import.meta.env.VITE_SOROBAN_CONTRACT_ID || "";
}

export function getTokenContractId() {
  const local = typeof window !== "undefined"
    ? window.localStorage.getItem(LOCAL_TOKEN_KEY)
    : "";
  return local || import.meta.env.VITE_SOROBAN_TOKEN_CONTRACT_ID || "";
}

export function setRuntimeContractConfig(contractId, tokenContractId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_CONTRACT_KEY, contractId);
  window.localStorage.setItem(LOCAL_TOKEN_KEY, tokenContractId);
}

export function hasRuntimeConfig() {
  return Boolean(getContractId() && getTokenContractId());
}
