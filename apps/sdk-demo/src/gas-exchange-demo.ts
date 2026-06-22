import { createEniClient } from "@eni-chain/app-sdk";
import type { Address, GasExchangeApprovalMode, GasExchangeExecutionMode } from "@eni-chain/app-sdk";

const eni = createEniClient();

const chain = eni.requireChain("173");
const amount = "1";
const userAddress = "0x1234567890abcdef1234567890abcdef12345678" as Address;

async function prepareGasExchange(params: {
  approvalMode?: GasExchangeApprovalMode;
  executionMode?: GasExchangeExecutionMode;
}) {
  return eni.gasExchange.prepare({
    chain,
    // Pass the known allowance if you already have it. This demo uses 0n so the
    // SDK returns the full approval flow without needing a wallet RPC call.
    allowance: 0n,
    request: {
      chainId: chain.chainId,
      fromToken: eni.tokens.usdt,
      toToken: eni.tokens.egas,
      amount,
      userAddress,
      recipient: userAddress,
      approvalMode: params.approvalMode,
      executionMode: params.executionMode,
    },
  });
}


// Standard approve flow: send approve first, then send the exchange transaction.
const approvePlan = await prepareGasExchange({ approvalMode: "approve" });

console.log(
  "Approve mode steps:",
  approvePlan.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    chainId: step.chainId,
    label: step.label,
    to: step.request?.to,
    value: step.request?.value.toString(),
  })),
);

// Permit flow: ask the user to sign typed data, then submit the permit-enabled exchange
const permitPlan = await prepareGasExchange({ approvalMode: "permit" });

console.log(
  "Permit mode steps:",
  permitPlan.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    chainId: step.chainId,
    label: step.label,
    metadata: step.metadata,
  })),
);

// Gas sponsorship flow: the user signs a permit and the ENI relay submits the
// GasExchange transaction. This is available only for ENI-Peg USDT -> EGAS.
const gaslessPlan = await prepareGasExchange({ executionMode: "gasless" });

console.log(
  "Gas sponsorship steps:",
  gaslessPlan.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    chainId: step.chainId,
    label: step.label,
    metadata: step.metadata,
  })),
);
