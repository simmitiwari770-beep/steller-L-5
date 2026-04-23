export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const STELLAR_EXPERT_TX_BASE =
  "https://stellar.expert/explorer/testnet/tx/";

const LOCAL_CONTRACT_KEY = "trustpay_contract_id";
const LOCAL_TOKEN_KEY = "trustpay_token_contract_id";
const DEFAULT_ESCROW_CONTRACT_ID =
  "CA3225DNEQIIF3HI5FZNYBO4P56662OC4E4BW5C3JYRG345DRSV5WFE6";
const DEFAULT_TOKEN_CONTRACT_ID =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export function getContractId() {
  const local = typeof window !== "undefined"
    ? window.localStorage.getItem(LOCAL_CONTRACT_KEY)
    : "";
  return (
    local ||
    import.meta.env.VITE_SOROBAN_CONTRACT_ID ||
    DEFAULT_ESCROW_CONTRACT_ID
  );
}

export function getTokenContractId() {
  const local = typeof window !== "undefined"
    ? window.localStorage.getItem(LOCAL_TOKEN_KEY)
    : "";
  return (
    local ||
    import.meta.env.VITE_SOROBAN_TOKEN_CONTRACT_ID ||
    DEFAULT_TOKEN_CONTRACT_ID
  );
}

export function setRuntimeContractConfig(contractId, tokenContractId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_CONTRACT_KEY, contractId);
  window.localStorage.setItem(LOCAL_TOKEN_KEY, tokenContractId);
}

export function hasRuntimeConfig() {
  return Boolean(getContractId() && getTokenContractId());
}
