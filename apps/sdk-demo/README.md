# ENI SDK Demo

[中文文档](./README_zh-CN.md) | [Back to root](../../README.md)

This demo shows the minimal main flows for integrating `@eni-chain/app-sdk` without the React or Vue widget packages.

The SDK already wraps bridge API calls, gas exchange calldata generation, gas sponsorship relay execution, chain configuration, tokens, and wallet execution helpers. Use this demo when your application has its own UI and only needs the SDK integration layer.

## Run

Install workspace dependencies from the repository root:

```bash
pnpm install
```

Run the bridge quote demo:

```bash
cd apps/sdk-demo
bun run bridge
```

Run the gas exchange plan demo:

```bash
cd apps/sdk-demo
bun run gas
```

Run the swap plan demo:

```bash
cd apps/sdk-demo
bun run swap
```

These scripts use fixed demo parameters and do not require a connected wallet. They prepare route or transaction steps that your application can display before asking the user to confirm execution.

## Bridge Demo

Source: [`src/bridge-demo.ts`](./src/bridge-demo.ts)

The bridge demo uses BSC `56` to ENI mainnet `173`, token `USDT`, and amount `1`.

### 1. Quote

```ts
const quoteResp = await eni.bridge.quote({
  sourceChainId: fromChain,
  destChainId: toChain,
  tokenKey: tokenSymbol,
  amount,
  userAddress,
});
```

The quote response includes:

- `selectedProvider`: recommended bridge provider.
- `selection.providerOrder`: available providers in priority order.
- `steps`: wallet transaction steps for the selected route.
- `providerQuotes`: per-provider quote state and structured raw provider quote payloads.
- `raw`: raw Bridge API response, useful when debugging provider selection or fallback.

### 2. Execute

To execute the recommended route directly:

```ts
await executeBridgeQuote({ quote: quoteResp, wallet });
```

If your UI lets the user manually choose a provider, render `allProviderQuotes`, then create an `executableQuote` from the selected provider. Do not parse `providerQuotes[provider].quote.result.steps` yourself.

```ts
const allProviderQuotes = quoteResp.selection.providerOrder
  .map((providerId) => quoteResp.providerQuotes[providerId])
  .filter((providerQuote) => providerQuote !== undefined);

const userSelectedProvider = allProviderQuotes[0]?.providerId;
if (!userSelectedProvider) {
  throw new Error("No bridge provider quotes returned");
}

const executableQuote = selectBridgeProviderQuote(quoteResp, userSelectedProvider);

console.log(
  "Bridge steps:",
  executableQuote.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    chainId: step.chainId,
    label: step.label,
    to: step.request?.to,
    data: step.request?.data,
    value: step.request?.value.toString(),
  })),
);
```

For execution, pass `executableQuote` to `executeBridgeQuote({ quote: executableQuote, wallet })`.

When debugging provider selection, failed quotes, or fallback behavior, log:

```ts
console.log("selected provider", quoteResp.selectedProvider);
console.log("provider quotes", quoteResp.providerQuotes);
console.log("raw bridge api response", quoteResp.raw);
```

### 3. Records

Query and display bridge records with the SDK records helper:

```ts
const recordsResp = await eni.bridge.records({
  user: userAddress,
  page: 1,
  limit: 10,
  assetSymbol: tokenSymbol,
});

if (recordsResp.code !== 0 || !recordsResp.data) {
  console.warn("Bridge records query failed:", recordsResp.msg);
} else {
  console.log(
    "Recent bridge records:",
    recordsResp.data.list.map((record) => ({
      protocol: record.protocol,
      direction: record.direction,
      status: record.status,
      route: `${record.sourceChainId || "?"} -> ${record.targetChainId || "?"}`,
      amount: `${record.sourceAmount || "0"} ${record.assetSymbol}`,
      sourceTxHash: record.sourceTxHash,
      targetTxHash: record.targetTxHash,
      time: record.time,
    })),
  );
}
```

## Gas Exchange Demo

Source: [`src/gas-exchange-demo.ts`](./src/gas-exchange-demo.ts)

The gas exchange demo uses ENI mainnet `173` and prepares `USDT -> EGAS` plans.

```ts
const eni = createEniClient();
const chain = eni.requireChain("173");

const plan = await eni.gasExchange.prepare({
  chain,
  allowance: 0n,
  request: {
    chainId: chain.chainId,
    fromToken: eni.tokens.usdt,
    toToken: eni.tokens.egas,
    amount: "1",
    userAddress,
    recipient: userAddress,
    approvalMode: "approve",
  },
});
```

The demo prints three gas exchange modes:

- `approve`: standard ERC-20 approval. The SDK returns an `approve` step when allowance is insufficient, followed by the gas exchange transaction.
- `permit`: EIP-2612-style signature flow. The SDK returns a `permit` signing step. Use this mode only if your app implements the complete permit signing and submission flow.
- `gasless`: gas sponsorship for ENI-Peg USDT -> EGAS. The SDK returns a `gasless-permit-0` step with relay metadata, signs the EIP-2612 permit during execution, submits the relay request, and reports the relay transaction hash.

Gas sponsorship uses `executionMode: "gasless"`:

```ts
const gaslessPlan = await eni.gasExchange.prepare({
  chain,
  request: {
    chainId: chain.chainId,
    fromToken: eni.tokens.usdt,
    toToken: eni.tokens.egas,
    amount: "1",
    userAddress,
    recipient: userAddress,
    executionMode: "gasless",
  },
});
```

This mode is only available for ENI-Peg USDT -> native EGAS and deducts `1 EGAS` from the received EGAS after execution. Custom recipients are not supported.

When your app has a connected wallet, execute an approve-mode plan with:

```ts
const result = await eni.gasExchange.execute({ plan, wallet });
```

To execute a gas sponsorship plan, pass the gasless plan to the same executor. The wallet adapter must support `readContract` and `signTypedData`, and the runtime must provide `fetch`:

```ts
const result = await eni.gasExchange.execute({ plan: gaslessPlan, wallet });
```

Always display the prepared steps before execution so the user understands how many wallet confirmations are required.

## Swap Demo

Source: [`src/swap-demo.ts`](./src/swap-demo.ts)

The swap demo prepares an exact-in `USDT -> WEGAS` swap with a project-configured slippage and swap tax.

```ts
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
  },
});
```

`slippageBps` and `taxBps` both use `10000` as the denominator. The SDK adds them together and uses the result as `effectiveSlippageBps` for `amountOutMin`.

When `taxBps` is non-zero, the SDK only supports exact-in ERC20-to-ERC20 swaps and encodes `swapExactTokensForTokensSupportingFeeOnTransferTokens`. When `taxBps` is omitted or `0`, the standard `swapExactTokensForTokens` path is used.
