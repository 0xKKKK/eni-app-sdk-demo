import { describe, expect, test } from "bun:test";
import type { Address } from "viem";

import {
  buildGaslessPermitTypedData,
  buildGaslessRelayPayload,
  GAS_EXCHANGE_DEPLOYMENTS,
  ZERO_ADDRESS,
} from "./gas-exchange";

const user = "0x1234567890abcdef1234567890abcdef12345678" as Address;
const signature = `0x${"11".repeat(32)}${"22".repeat(32)}1b` as const;

describe("gas exchange gasless helpers", () => {
  test("builds permit typed data with GasExchange as spender", () => {
    const deployment = GAS_EXCHANGE_DEPLOYMENTS.mainnet;
    const typedData = buildGaslessPermitTypedData({
      chainId: deployment.chainId,
      tokenName: "ENI-Peg USDT",
      tokenVersion: "1",
      tokenAddress: deployment.eniPegUsdt,
      owner: user,
      gasExchangeAddress: deployment.gasExchange,
      amount: 1_000_000_000_000_000_000n,
      nonce: 7n,
      deadline: 1_800_000_000n,
    });

    expect(typedData.domain).toEqual({
      name: "ENI-Peg USDT",
      version: "1",
      chainId: 173,
      verifyingContract: deployment.eniPegUsdt,
    });
    expect(typedData.message).toEqual({
      owner: user,
      spender: deployment.gasExchange,
      value: 1_000_000_000_000_000_000n,
      nonce: 7n,
      deadline: 1_800_000_000n,
    });
  });

  test("builds the gasless relay payload from a permit signature", () => {
    const deployment = GAS_EXCHANGE_DEPLOYMENTS.mainnet;
    const payload = buildGaslessRelayPayload({
      fromToken: deployment.eniPegUsdt,
      toToken: ZERO_ADDRESS,
      user,
      amount: 1_000_000_000_000_000_000n,
      deadline: 1_800_000_000n,
      signature,
    });

    expect(payload).toEqual({
      v: "27",
      r: `0x${"11".repeat(32)}`,
      s: `0x${"22".repeat(32)}`,
      tokenAddress: deployment.eniPegUsdt,
      toTokenAddress: ZERO_ADDRESS,
      user,
      deadline: "1800000000",
      amount: "1000000000000000000",
      signature,
    });
  });
});
