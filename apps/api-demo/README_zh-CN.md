# API Demo: Bridge API 和 GasExchange 接入

[English](./README.md) | [返回根文档](../../README_zh-CN.md)

这个目录演示两类直接接入方式：

- 跨链桥：调用 `bridge-api` 的 HTTP 接口获取链目录、路线和可执行交易步骤。
- Gas 兑换：直接调用 ENI 链上的 `GasExchange` 合约，用 ABI 构造 `approve` / `exchange` 交易，并准备 Gas 代付 relay payload。

它适合后端、中台、网关或已有自定义钱包层的前端参考。`src/lib` 目录是可复用封装，项目方可以直接复制到自己的项目中，并从 `src/lib/index.ts` 统一导入；`src/*-demo.ts` 只展示最小主流程。

## 运行

在仓库根目录安装依赖后运行：

```bash
pnpm install
cd apps/api-demo
bun run bridge
bun run gas
```

`bridge` 默认会请求正式环境：

```text
https://bridge-api.eniac.network
```

`gas` 默认是 dry-run，只打印 calldata 和 Gas 代付 payload 示例，不会发交易，也不会请求 relay。

## 跨链桥 API 流程

基础路径：

```text
GET  /v1/bridge/chains
GET  /v1/bridge/routers
GET  /v1/bridge/records
POST /v1/bridge/resolve
POST /v1/bridge/quote
```

典型流程：

1. 用 `/chains` 拉取可选链和 token 目录。
2. 用 `/routers` 获取可用路线范围。
3. 用 `/quote` 获取最终报价和 `steps`。
4. 钱包按 `steps` 顺序发送交易，通常是 `approve` 后 `bridge`。
5. 用 `/records` 按用户地址查询跨链历史记录。

`/resolve` 是可选接口，适合需要单独展示 provider 推荐、隐藏原因或选路解释的 UI。这个 demo 为了保持最小接入流程，不调用 `/resolve`。

关键规则：

- `chainId` 始终传字符串，例如 `"173"`、`"56"`。
- `/quote` 的 `amount` 传人类可读金额字符串，例如 `"1.23"`，不要传 wei 或最小单位。
- `/quote` 返回的 `steps[].tx.value`、`details.sourceTokenAmount`、`details.destTokenAmount` 通常是最小单位整数字符串。
- `tokenKey` 是统一资产标识，例如 `USDT`，不是链上 token 地址。
- 这个 demo 的 `/quote` helper 不暴露 provider override 参数；不传 provider 参数就是自动推荐路线。
- HTTP 200 不代表一定拿到可执行路线，仍需检查 `/quote` 的 `result` 和 `steps`。
- `/records` 返回 `{ code, msg, data }`，不是 `status/result` 包裹；`code !== 0` 或 `data = null` 都应按查询失败处理。

### Bridge demo 主流程

```bash
bun run bridge
```

主流程代码故意保持简单：直接定义参数、调用 lib、展示 provider、读取 steps、查询历史记录。

```ts
import {
  createBridgeApiClient,
  getAvailableProviders,
  getQuoteSteps,
  getRecommendedProvider,
} from "./lib";

const bridgeAPI = createBridgeApiClient();

const fromChain = 56;
const toChain = 173;
const tokenSymbol = "USDT";
const amount = "1";
const userAddress = "0x1234567890abcdef1234567890abcdef12345678";

const quoteResp = await bridgeAPI.quote({
  fromChain,
  toChain,
  tokenSymbol,
  amount,
  userAddress,
});

const recommendedProvider = getRecommendedProvider(quoteResp);
const availableProviders = getAvailableProviders(quoteResp);
const selectedProvider = recommendedProvider || availableProviders[0]?.providerId || null;
const selectedSteps = selectedProvider ? getQuoteSteps(quoteResp, selectedProvider) : [];

for (const step of selectedSteps) {
  // Send step.tx with your wallet layer.
  console.log(step.action, step.tx);
}

const records = await bridgeAPI.records({
  user: userAddress,
  page: 1,
  limit: 5,
  assetSymbol: tokenSymbol,
});
```

`/quote` 最小请求体：

```json
{
  "sourceChainId": "56",
  "destChainId": "173",
  "tokenKey": "USDT",
  "amount": "1",
  "userAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

`targetRecipient` 是可选字段，用于指定目标链收款地址；不传时默认等于 `userAddress`。如果需要单独指定收款地址：

```json
{
  "sourceChainId": "56",
  "destChainId": "173",
  "tokenKey": "USDT",
  "amount": "1",
  "userAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "targetRecipient": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
}
```

`/records` 请求参数：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `user` | 是 | 用户地址，当前 DTO 只要求非空字符串 |
| `page` | 否 | 页码，默认 `1` |
| `limit` | 否 | 每页数量，默认 `20`，最大 `100` |
| `assetSymbol` | 否 | 资产符号，例如 `USDT`；服务端会转成上游 `asset_key=USDT_EQ` |

`/records` 返回的 `data.list[]` 已由 bridge-api 归一化，常用字段包括：

```ts
type BridgeRecord = {
  protocol: "orbiter" | "hyperlane";
  direction: "in" | "out";
  status: "pending" | "completed" | "rejected";
  assetSymbol: string;
  sourceChainId: string | null;
  targetChainId: string | null;
  sourceAmount: string | null;
  targetAmount: string | null;
  sourceTxHash: string | null;
  targetTxHash: string | null;
  time: string | null;
};
```

核心代码在 [src/lib/bridge-api.ts](./src/lib/bridge-api.ts)、[src/lib/index.ts](./src/lib/index.ts) 和 [src/bridge-demo.ts](./src/bridge-demo.ts)。

## GasExchange 合约流程

`GasExchange` 支持三种方向：

- EGAS -> ERC20：`fromToken = 0x000...000`，交易 `value = amount`。
- ERC20 -> EGAS：先 `approve(fromToken, GasExchange, amount)`，再 `exchange(fromToken, 0x000...000, amount)`。
- ERC20 -> ERC20：先 approve `fromToken`，再 `exchange(fromToken, toToken, amount)`。

合约函数：

```solidity
function exchange(address fromToken, address toToken, uint256 amount)
  external
  payable
  returns (uint256)

function exchangeWithPermitV2(
  address fromToken,
  address toToken,
  address user,
  uint256 amount,
  uint256 deadline,
  uint8 v,
  bytes32 r,
  bytes32 s
) external
```

### 授权和代付方式

ERC20 兑换场景需要先允许 `GasExchange` 使用用户的 `fromToken`，常见有三种方式：

1. **标准 `approve`**

   用户先发一笔 ERC20 `approve(gasExchange, amount)`，再发一笔 `GasExchange.exchange(fromToken, toToken, amount)`。这是兼容性最好的方式，适合所有标准 ERC20；缺点是 ERC20 -> EGAS 或 ERC20 -> ERC20 至少需要两次钱包确认。

   ```ts
   const transactions = buildGasExchangeTransactions({
     gasExchangeAddress: deployment.gasExchange,
     fromToken: deployment.eniPegUsdt,
     toToken: ZERO_ADDRESS,
     amount: parseUnits("1", 18),
     includeApprove: true,
   });
   ```

2. **EIP-2612 `permit`**

   如果 `fromToken` 支持 `permit`，用户可以先在钱包里签 EIP-712 typed data，拿到 `deadline/v/r/s`，再直接发一笔 `exchangeWithPermitV2`。这种方式少一笔链上 approve 交易；缺点是依赖 token 合约支持 `permit`，并且前端需要实现 EIP-712 签名流程。

   ```ts
   const transaction = buildGasExchangePermitTransaction({
     gasExchangeAddress: deployment.gasExchange,
     fromToken: deployment.eniPegUsdt,
     toToken: ZERO_ADDRESS,
     user: userAddress,
     amount: parseUnits("1", 18),
     deadline,
     v,
     r,
     s,
   });
   ```

3. **Gas 代付 relay**

   SDK `0.1.4` 增加了 ENI-Peg USDT -> 原生 EGAS 的 Gas 代付能力。用户先签 EIP-2612 permit，业务方再把签名 payload 提交到 ENI relay，不需要用户钱包中已有 EGAS 支付网络 gas。relay 会提交 `exchangeWithPermitV2`，交易完成后从到账 EGAS 中扣除 `1 EGAS` 作为服务手续费。

   这个模式比普通 `permit` 更窄：

   - `fromToken` 必须是 ENI-Peg USDT。
   - `toToken` 必须是原生 EGAS，也就是 `ZERO_ADDRESS`。
   - 不支持自定义 recipient。
   - 签名前需要从 USDT 合约读取 `name`、`nonces(user)` 和 EIP-712 version。

   ```ts
   const typedData = buildGaslessPermitTypedData({
     chainId: deployment.chainId,
     tokenName,
     tokenVersion,
     tokenAddress: deployment.eniPegUsdt,
     owner: userAddress,
     gasExchangeAddress: deployment.gasExchange,
     amount: parseUnits("1", 18),
     nonce,
     deadline,
   });

   const signature = await wallet.signTypedData(typedData);
   const payload = buildGaslessRelayPayload({
     fromToken: deployment.eniPegUsdt,
     toToken: ZERO_ADDRESS,
     user: userAddress,
     amount: parseUnits("1", 18),
     deadline,
     signature,
   });

   await fetch(deployment.gaslessRelayUrl, {
     method: "POST",
     headers: { "content-type": "application/json" },
     body: JSON.stringify(payload),
   });
   ```

事件：

```solidity
event TokenExchanged(
  address indexed user,
  bool indexed isBuy,
  address indexed tokenAddress,
  uint256 fromAmount,
  uint256 toAmount
);
```

### 部署地址

Mainnet:

```text
GasExchange:   0x37CCd90ed5FA96207B41C4fBCB90b883e30e63DC
Gasless relay: https://xplan.eniac.network/api/gasless_approvalv2
ENI-Peg USDT:  0xDC1a8A35b0BaA3229b13f348ED708a2fd50b5e3a
Orbiter USDT:  0x47c98f74dBC1acc4cf2e04C4a729E22379EF4373
Hyperlane USDT:0x545E289B88c6d97b74eC0B96e308cae46Bf5f832
```

Testnet:

```text
GasExchange:   0x6741B16197ab5575d5A8C904159d4ef80ee1e6Bf
Gasless relay: https://xplan.eniapp.dev/api/gasless_approvalv2
ENI-Peg USDT:  0x605AfFcF6979AfddabE6A050b182bDC390fC71fF
```

### GasExchange demo 主流程

默认构造 ENI mainnet 的 ENI-Peg USDT -> EGAS 交易计划：

```bash
bun run gas
```

主流程代码会调用 lib 生成 `approve` 和 `exchange` 两步交易，并打印一组 Gas 代付 typed-data 和 relay-payload 示例。标准路径下项目方把 `transactions` 交给自己的钱包层按顺序发送；Gas 代付路径下则让用户签 typed data，再把 relay payload 提交到代付服务。

```ts
import { parseUnits } from "viem";
import {
  buildGaslessPermitTypedData,
  buildGasExchangeTransactions,
  GAS_EXCHANGE_DEPLOYMENTS,
  ZERO_ADDRESS,
} from "./lib";

const deployment = GAS_EXCHANGE_DEPLOYMENTS.mainnet;
const amount = parseUnits("1", 18);
const transactions = buildGasExchangeTransactions({
  gasExchangeAddress: deployment.gasExchange,
  fromToken: deployment.eniPegUsdt,
  toToken: ZERO_ADDRESS,
  amount,
  includeApprove: true,
});

const typedData = buildGaslessPermitTypedData({
  chainId: deployment.chainId,
  tokenName: "ENI-Peg USDT",
  tokenVersion: "1",
  tokenAddress: deployment.eniPegUsdt,
  owner: userAddress,
  gasExchangeAddress: deployment.gasExchange,
  amount,
  nonce,
  deadline,
});
```

真实发送前请确认：

- 钱包有足够 EGAS 支付 gas。
- `amount` 和输入 token 精度匹配。
- 合约有足够的目标资产流动性。

核心代码在 [src/lib/gas-exchange.ts](./src/lib/gas-exchange.ts)、[src/lib/gas-exchange.test.ts](./src/lib/gas-exchange.test.ts) 和 [src/gas-exchange-demo.ts](./src/gas-exchange-demo.ts)。
