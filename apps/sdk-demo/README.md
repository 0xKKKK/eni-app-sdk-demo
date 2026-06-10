# ENI SDK Demo

[中文文档](./README_zh-CN.md) | [Back to root](../../README.md)

This demo shows the minimal main flows for integrating `@eni-chain/app-sdk` without the React or Vue widget packages.

The SDK already wraps bridge API calls, gas exchange calldata generation, chain configuration, tokens, and wallet execution helpers. Use this demo when your application has its own UI and only needs the SDK integration layer.

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

Both scripts use fixed demo parameters and do not require a connected wallet. They prepare route or transaction steps that your application can display before asking the user to confirm execution.

## Bridge Demo

Source: [`src/bridge-demo.ts`](./src/bridge-demo.ts)

The bridge demo uses BSC `56` to ENI mainnet `173`, token `USDT`, and amount `1`.

```ts
const eni = createEniClient();

const quote = await eni.bridge.quote({
  sourceChainId: "56",
  destChainId: "173",
  tokenKey: "USDT",
  amount: "1",
  userAddress,
  // targetRecipient is optional. Omit it when the recipient is userAddress.
});
```

The quote response includes:

- `selectedProvider`: recommended bridge provider.
- `selection.providerOrder`: available providers in priority order.
- `steps`: wallet transaction steps for the selected route.

In a browser app, show the recommended route and available routes to the user first. After the user confirms a route, execute the returned steps with the connected wallet:

```ts
import { executeBridgeQuote } from "@eni-chain/app-sdk";

await executeBridgeQuote({ quote, wallet });
```

`targetRecipient` is optional. When it is omitted, the bridge recipient defaults to `userAddress` on the bridge API side. Set it only when the destination recipient is different from the connected wallet address.

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

The demo prints two approval modes:

- `approve`: standard ERC-20 approval. The SDK returns an `approve` step when allowance is insufficient, followed by the gas exchange transaction.
- `permit`: EIP-2612-style signature flow. The SDK returns a `permit` signing step. Use this mode only if your app implements the complete permit signing and submission flow.

When your app has a connected wallet, execute an approve-mode plan with:

```ts
const result = await eni.gasExchange.execute({ plan, wallet });
```

Always display the prepared steps before execution so the user understands how many wallet confirmations are required.
