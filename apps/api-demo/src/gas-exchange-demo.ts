import { parseUnits } from "viem";
import {
  buildGaslessPermitTypedData,
  buildGaslessRelayPayload,
  buildGasExchangeTransactions,
  GAS_EXCHANGE_DEPLOYMENTS,
  ZERO_ADDRESS,
} from "./lib";

function stringifyBigInt(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

async function main() {
  const network = "mainnet";
  const deployment = GAS_EXCHANGE_DEPLOYMENTS[network];
  const fromToken = deployment.eniPegUsdt;
  const toToken = ZERO_ADDRESS;
  const amount = parseUnits("1", 18);
  const userAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const nonce = 0n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const demoSignature = `0x${"11".repeat(32)}${"22".repeat(32)}1b` as const;

  // Build the transaction plan for ENI-Peg USDT -> native EGAS on ENI.
  const transactions = buildGasExchangeTransactions({
    gasExchangeAddress: deployment.gasExchange,
    fromToken,
    toToken,
    amount,
    includeApprove: true,
  });
  const gaslessPermitTypedData = buildGaslessPermitTypedData({
    chainId: deployment.chainId,
    tokenName: "ENI-Peg USDT",
    tokenVersion: "1",
    tokenAddress: fromToken,
    owner: userAddress,
    gasExchangeAddress: deployment.gasExchange,
    amount,
    nonce,
    deadline,
  });
  const gaslessRelayPayload = buildGaslessRelayPayload({
    fromToken,
    toToken,
    user: userAddress,
    amount,
    deadline,
    signature: demoSignature,
  });

  // Send these transactions in order with your wallet layer.
  console.log(
    JSON.stringify(
      {
        network,
        chainId: deployment.chainId,
        gasExchange: deployment.gasExchange,
        fromToken,
        toToken,
        amount: amount.toString(),
        transactions,
        gaslessSponsorship: {
          relayUrl: deployment.gaslessRelayUrl,
          fee: "1 EGAS deducted from received EGAS after execution",
          typedDataToSign: gaslessPermitTypedData,
          relayPayloadAfterSigning: gaslessRelayPayload,
        },
      },
      stringifyBigInt,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
});
