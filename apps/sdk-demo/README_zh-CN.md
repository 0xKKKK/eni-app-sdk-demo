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

```ts
const eni = createEniClient();

const quote = await eni.bridge.quote({
  sourceChainId: "56",
  destChainId: "173",
  tokenKey: "USDT",
  amount: "1",
  userAddress,
  // targetRecipient 可选。收款地址和 userAddress 相同时可以不传。
});
```

quote 返回内容中常用字段：

- `selectedProvider`：推荐跨链 provider。
- `selection.providerOrder`：按优先级排列的可用 provider。
- `steps`：当前选中路线需要用户执行的钱包交易步骤。

在浏览器应用中，可以先展示推荐路线和所有可用路线。用户确认路线后，再用已连接的钱包执行 steps：

```ts
import { executeBridgeQuote } from "@eni-chain/app-sdk";

await executeBridgeQuote({ quote, wallet });
```

`targetRecipient` 是可选参数。不传时，bridge API 默认收款地址等于 `userAddress`。只有目标链收款地址和当前钱包地址不同时才需要传。

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
