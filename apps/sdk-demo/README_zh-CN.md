# ENI SDK 示例

[English](./README.md) | [返回根文档](../../README_zh-CN.md)

这个 demo 展示如何在不使用 React/Vue widgets 的情况下，通过 `@eni-chain/app-sdk` 接入最小主流程。

SDK 已经封装了 bridge API 调用、gas exchange calldata 生成、链配置、token 配置和钱包执行 helper。适合业务项目已有自己的 UI，只需要直接接入 SDK 的场景。

## 运行

在仓库根目录安装依赖：

```bash
pnpm install
```

运行跨链 quote demo：

```bash
cd apps/sdk-demo
bun run bridge
```

运行 gas exchange plan demo：

```bash
cd apps/sdk-demo
bun run gas
```

两个脚本都使用固定示例参数，不需要连接钱包。它们只准备 route 或 transaction steps，业务应用可以先展示给用户，再让用户确认执行。

## 跨链 Demo

源码：[`src/bridge-demo.ts`](./src/bridge-demo.ts)

跨链 demo 默认使用 BSC `56` 到 ENI mainnet `173`，token 为 `USDT`，数量为 `1`。

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

quote response 返回内容中常用字段：

- `selectedProvider`：推荐跨链 provider。
- `selection.providerOrder`：按优先级排列的可用 provider。
- `steps`：当前选中路线需要用户执行的钱包交易步骤。
- `providerQuotes`：各 provider 的报价状态和结构化原始报价。
- `raw`：bridge API 原始响应，排查 provider 选择和 fallback 时建议打印。

### 2. Execute

可以直接执行推荐路线：

```ts
await executeBridgeQuote({ quote: quoteResp, wallet });
```

如果业务 UI 允许用户手动选择 provider，可以展示 `allProviderQuotes`，再用用户选择的 provider 生成 `executableQuote`。不要自己解析 `providerQuotes[provider].quote.result.steps`。

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

最终执行时把 `executableQuote` 传给 `executeBridgeQuote({ quote: executableQuote, wallet })`。

排查 provider 选择、报价失败或 fallback 时，建议打印：

```ts
console.log("selected provider", quoteResp.selectedProvider);
console.log("provider quotes", quoteResp.providerQuotes);
console.log("raw bridge api response", quoteResp.raw);
```

### 3. Records

跨链记录可以通过 SDK 的 records helper 查询并展示：

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

源码：[`src/gas-exchange-demo.ts`](./src/gas-exchange-demo.ts)

gas exchange demo 默认使用 ENI mainnet `173`，准备 `USDT -> EGAS` 的兑换 plan。

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

demo 会打印两种授权模式：

- `approve`：标准 ERC-20 授权。如果 allowance 不足，SDK 会返回一个 `approve` step，然后返回 gas exchange 交易 step。
- `permit`：EIP-2612 风格的签名授权。SDK 会返回一个 `permit` 签名 step。只有业务方已经实现完整 permit 签名和提交流程时才建议使用。

连接钱包后，可以这样执行 approve 模式的 plan：

```ts
const result = await eni.gasExchange.execute({ plan, wallet });
```

执行前建议先展示 plan steps，让用户知道需要确认几次钱包操作。
