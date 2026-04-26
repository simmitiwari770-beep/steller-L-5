import { describe, it, expect } from "vitest";
import { SOROBAN_RPC_URL, HORIZON_URL, getContractId, getTokenContractId } from "./constants";

describe("Constants module", () => {
  it("should have a valid testnet RPC URL", () => {
    expect(SOROBAN_RPC_URL).toBe("https://soroban-testnet.stellar.org");
  });

  it("should have a valid testnet Horizon URL", () => {
    expect(HORIZON_URL).toBe("https://horizon-testnet.stellar.org");
  });

  it("should export an ESCROW_CONTRACT_ID string", () => {
    expect(typeof getContractId()).toBe("string");
  });

  it("should export a TOKEN_CONTRACT_ID string", () => {
    expect(typeof getTokenContractId()).toBe("string");
  });
});
