import {
  Address,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  getContractId,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
  STELLAR_EXPERT_TX_BASE,
  getTokenContractId,
} from "./constants";
import { signTxXdr } from "./freighter";

const server = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });
const TX_POLL_TIMEOUT_MS = 45_000;

function parseResult(resultXdr) {
  if (!resultXdr) return null;
  try {
    if (typeof resultXdr === "string") {
      return scValToNative(xdr.ScVal.fromXDR(resultXdr, "base64"));
    }
    return scValToNative(resultXdr);
  } catch {
    // Return null if SDK cannot decode a specific union variant.
    return null;
  }
}

function decodeScVal(retval) {
  if (!retval) return null;
  try {
    if (typeof retval === "string") {
      return scValToNative(xdr.ScVal.fromXDR(retval, "base64"));
    }
    return scValToNative(retval);
  } catch {
    // Newer SDK responses may already be decoded native values.
    return retval;
  }
}

function normalizeSignedXdrPayload(signedXdr) {
  if (typeof signedXdr === "string") return signedXdr;
  if (signedXdr && typeof signedXdr.signedTxXdr === "string") {
    return signedXdr.signedTxXdr;
  }
  if (signedXdr && typeof signedXdr.xdr === "string") {
    return signedXdr.xdr;
  }
  return "";
}

async function buildAndSendContractTx(walletAddress, method, args = []) {
  const contractId = getContractId();
  if (!contractId) {
    throw new Error(
      "Escrow Contract ID missing. Set it in frontend/.env.",
    );
  }

  const sourceAccount = await server.getAccount(walletAddress);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error || "Contract call simulation failed.");
  }

  const preparedTx = rpc.assembleTransaction(tx, sim).build();
  const txXdrBase64 = preparedTx.toXDR("base64");
  const signedXdrRaw = await signTxXdr(txXdrBase64, walletAddress);
  const signedXdr = normalizeSignedXdrPayload(signedXdrRaw);
  if (!signedXdr) {
    throw new Error("Invalid signed transaction payload from wallet.");
  }
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sent = await server.sendTransaction(signedTx);
  if (sent.status === "ERROR") {
    throw new Error(sent.errorResultXdr || "Transaction submission failed.");
  }
  if (sent.status !== "PENDING") {
    throw new Error("Transaction was not accepted by Soroban RPC.");
  }

  let txResult = null;
  const startTime = Date.now();
  while (!txResult) {
    const fetched = await server.getTransaction(sent.hash);
    if (fetched.status === "SUCCESS") {
      txResult = fetched;
      break;
    }
    if (fetched.status === "FAILED") {
      throw new Error("Transaction failed on chain.");
    }
    if (Date.now() - startTime > TX_POLL_TIMEOUT_MS) {
      throw new Error(
        `Transaction submission timed out. Check explorer: ${STELLAR_EXPERT_TX_BASE}${sent.hash}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }

  return {
    hash: sent.hash,
    explorer: `${STELLAR_EXPERT_TX_BASE}${sent.hash}`,
    resultMetaXdr: txResult.resultMetaXdr,
    returnValue: parseResult(txResult.returnValue),
  };
}

export async function initializeContract(walletAddress) {
  const tokenContractId = getTokenContractId();
  if (!tokenContractId) {
    throw new Error(
      "Token Contract ID missing. Set it in frontend/.env.",
    );
  }
  return buildAndSendContractTx(walletAddress, "initialize", [
    Address.fromString(tokenContractId).toScVal(),
  ]);
}

export async function createEscrow(walletAddress, sellerAddress, amountXlm) {
  const amountStroops = BigInt(Math.round(Number(amountXlm) * 10_000_000));
  if (amountStroops <= 0n) {
    throw new Error("Amount must be greater than 0 XLM.");
  }
  return buildAndSendContractTx(walletAddress, "create_escrow", [
    Address.fromString(walletAddress).toScVal(),
    Address.fromString(sellerAddress).toScVal(),
    nativeToScVal(amountStroops, { type: "i128" }),
  ]);
}

export async function releaseEscrow(walletAddress, escrowId) {
  return buildAndSendContractTx(walletAddress, "release_payment", [
    nativeToScVal(Number(escrowId), { type: "u64" }),
  ]);
}

export async function refundEscrow(walletAddress, escrowId) {
  return buildAndSendContractTx(walletAddress, "refund_payment", [
    nativeToScVal(Number(escrowId), { type: "u64" }),
  ]);
}

async function readContract(method, args, sourceAddress) {
  const contractId = getContractId();
  if (!contractId) {
    throw new Error(
      "Escrow Contract ID missing. Set it in frontend/.env.",
    );
  }
  if (!sourceAddress) {
    throw new Error("Connect Freighter before reading escrow data.");
  }
  const contract = new Contract(contractId);
  const account = await server.getAccount(sourceAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();
  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(simulated.error || "Failed to read contract from Soroban RPC.");
  }
  return simulated.result?.retval || null;
}

export async function fetchEscrow(escrowId, sourceAddress) {
  const retval = await readContract(
    "get_escrow",
    [nativeToScVal(Number(escrowId), { type: "u64" })],
    sourceAddress,
  );
  if (!retval) return null;
  try {
    const decoded = decodeScVal(retval);
    return decoded && typeof decoded === "object" ? decoded : null;
  } catch {
    throw new Error("Failed to decode escrow data from chain. Please refresh.");
  }
}

export async function fetchEscrowIds(sourceAddress) {
  const retval = await readContract("list_escrows", [], sourceAddress);
  if (!retval) return [];
  try {
    const decoded = decodeScVal(retval);
    if (!Array.isArray(decoded)) return [];
    return decoded.map((entry) => Number(entry));
  } catch {
    throw new Error("Failed to decode escrow ids from chain. Please refresh.");
  }
}
