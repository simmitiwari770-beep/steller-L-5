import { describe, it, expect } from "vitest";
import { shortenAddress, isValidPublicKey, formatAmount } from "./utils";

describe("Utils module", () => {
  it("should shorten a stellar public key correctly", () => {
    const address = "GBMX2P9TF1ZVQS8VMH4SK3QZKRJ9MWQN7VJ4XNPQJHFZV1RFDS9TA7Z";
    expect(shortenAddress(address)).toBe("GBMX2P...S9TA7Z");
  });

  it("should return empty string for missing address", () => {
    expect(shortenAddress("")).toBe("");
  });

  it("should validate a correct Ed25519 public key", () => {
    const address = "GB3WWZDR4MAGWTOL4BAJOZGTIYT72RCJXRIR5TSK6HIFEBJKHYB44KRH";
    expect(isValidPublicKey(address)).toBe(true);
  });

  it("should format stroops to XLM correctly", () => {
    expect(formatAmount(10000000)).toBe("1.00");
  });
});
