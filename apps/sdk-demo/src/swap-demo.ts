import { createEniClient } from "@eni-chain/app-sdk";
import type { Address, EniWalletAdapter } from "@eni-chain/app-sdk";

const eni = createEniClient();
const chain = eni.requireChain("173");
const userAddress = "0x1234567890abcdef1234567890abcdef12345678" as Address;
type ReadContract = NonNullable<EniWalletAdapter["readContract"]>;

const wallet = {
  async readContract<T>(params: Parameters<ReadContract>[0]): Promise<T> {
    if (params.functionName === "getAmountsOut") {
      return [1000000000000000000n, 2000000000000000000n] as T;
    }

    throw new Error(`Unexpected swap read: ${params.functionName}`);
  },
} satisfies Pick<EniWalletAdapter, "readContract">;

const plan = await eni.swap.prepare({
  chain,
  allowance: 1000000000000000000n,
  wallet,
  request: {
    chainId: chain.chainId,
    fromToken: eni.tokens.usdt,
    toToken: eni.tokens.wegas,
    amount: "1",
    amountMode: "exact-in",
    slippageBps: 50,
    taxBps: 0,
    userAddress,
    recipient: userAddress,
    deadlineTimestamp: 2000000000n,
  },
});

console.log("Swap tax bps:", plan.taxBps);
console.log("Effective slippage bps:", plan.effectiveSlippageBps);
console.log("Amount out min:", plan.amountOutMin?.toString());
console.log(
  "Swap steps:",
  plan.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    chainId: step.chainId,
    label: step.label,
    to: step.request?.to,
    data: step.request?.data,
    value: step.request?.value.toString(),
  })),
);
