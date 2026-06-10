import { parseUnits } from "viem";
import {
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

  // Build the transaction plan for ENI-Peg USDT -> native EGAS on ENI.
  const transactions = buildGasExchangeTransactions({
    gasExchangeAddress: deployment.gasExchange,
    fromToken,
    toToken,
    amount,
    includeApprove: true,
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
      },
      stringifyBigInt,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
});
