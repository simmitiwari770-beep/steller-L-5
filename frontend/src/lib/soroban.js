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

function parseResult(resultXdr) {
  return resultXdr ? resultXdr.value() : null;
}

async function buildAndSendContractTx(walletAddress, method, args = []) {
  const contractId = getContractId();
  if (!contractId) {
    throw new Error("Missing VITE_SOROBAN_CONTRACT_ID in frontend .env.");
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
    throw new Error(sim.error);
  }

  const preparedTx = rpc.assembleTransaction(tx, sim).build();
  const signedXdr = await signTxXdr(preparedTx.toXDR(), walletAddress);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sent = await server.sendTransaction(signedTx);
  if (sent.status === "ERROR") {
    throw new Error(sent.errorResultXdr || "Transaction submission failed.");
  }

  let txResult = null;
  while (!txResult) {
    const fetched = await server.getTransaction(sent.hash);
    if (fetched.status === "SUCCESS") {
      txResult = fetched;
      break;
    }
    if (fetched.status === "FAILED") {
      throw new Error("Transaction failed on chain.");
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
    throw new Error("Missing VITE_SOROBAN_TOKEN_CONTRACT_ID in frontend .env.");
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
    throw new Error("Missing VITE_SOROBAN_CONTRACT_ID in frontend .env.");
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
    throw new Error(simulated.error);
  }
  return simulated.result?.retval
    ? scValToNative(
        xdr.ScVal.fromXDR(simulated.result.retval.toXDR("base64"), "base64"),
      )
    : null;
}

export async function fetchEscrow(escrowId, sourceAddress) {
  return readContract(
    "get_escrow",
    [nativeToScVal(Number(escrowId), { type: "u64" })],
    sourceAddress,
  );
}

export async function fetchEscrowIds(sourceAddress) {
  const result = await readContract("list_escrows", [], sourceAddress);
  const vec = Array.isArray(result) ? result : [];
  return vec.map((entry) => Number(entry));
}
