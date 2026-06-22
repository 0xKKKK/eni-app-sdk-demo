# API Demo: Bridge API and GasExchange

[中文文档](./README_zh-CN.md) | [Back to root](../../README.md)

This demo shows two direct integration paths:

- Bridge: call the `bridge-api` HTTP endpoints to get routes, quotes, executable transaction steps, and bridge history.
- Gas exchange: call the ENI `GasExchange` contract directly, build `approve` / `exchange` calldata, and prepare gas sponsorship relay payloads with ABI helpers.

It is intended for backend services, gateways, or applications that already have their own wallet layer. The reusable code lives in `src/lib`; project teams can copy that directory and import from `src/lib/index.ts`. The `src/*-demo.ts` files only show minimal main flows.

## Run

From this repository:

```bash
pnpm install
cd apps/api-demo
bun run bridge
bun run gas
```

`bridge` calls the production Bridge API by default:

```text
https://bridge-api.eniac.network
```

`gas` only prints calldata and gas sponsorship payload examples. It does not submit transactions or relay requests.

## Bridge API Flow

Base endpoints:

```text
GET  /v1/bridge/chains
GET  /v1/bridge/routers
GET  /v1/bridge/records
POST /v1/bridge/resolve
POST /v1/bridge/quote
```

Typical flow:

1. Use `/chains` to load supported chains and token directories.
2. Use `/routers` to inspect available route ranges.
3. Use `/quote` to get the final quote and executable `steps`.
4. Send wallet transactions in `steps` order, usually `approve` then `bridge`.
5. Use `/records` to query bridge history by user address.

`/resolve` is optional. Use it when your UI needs provider recommendation details, hidden reasons, or route selection explanations. This demo keeps the minimal flow and does not call `/resolve`.

Key rules:

- Always send `chainId` values as strings in raw API requests, for example `"173"` and `"56"`.
- `/quote` `amount` is a human-readable decimal string, for example `"1.23"`. Do not send wei or smallest-unit integers.
- `/quote` fields such as `steps[].tx.value`, `details.sourceTokenAmount`, and `details.destTokenAmount` are usually smallest-unit integer strings.
- `tokenKey` is the unified asset symbol, for example `USDT`, not an on-chain token address.
- This demo's `/quote` helper does not expose provider override parameters. Omitting provider parameters means automatic route recommendation.
- HTTP 200 does not guarantee an executable route. Check `/quote` `result` and `steps`.
- `/records` returns `{ code, msg, data }`, not the `status/result` envelope. Treat `code !== 0` or `data = null` as a failed query.

### Bridge Demo Main Flow

```bash
bun run bridge
```

The main flow intentionally stays small: define parameters, call the lib, display providers, read steps, and query history.

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

Minimal `/quote` body:

```json
{
  "sourceChainId": "56",
  "destChainId": "173",
  "tokenKey": "USDT",
  "amount": "1",
  "userAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

`targetRecipient` is optional. It sets the recipient address on the destination chain. If omitted, the API uses `userAddress` as the recipient.

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

`/records` query parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `user` | Yes | User address. The current DTO only requires a non-empty string. |
| `page` | No | Page number. Default: `1`. |
| `limit` | No | Page size. Default: `20`, max: `100`. |
| `assetSymbol` | No | Asset symbol such as `USDT`; the service maps it to upstream `asset_key=USDT_EQ`. |

`/records` returns normalized `data.list[]` items. Common fields:

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

Core files: [src/lib/bridge-api.ts](./src/lib/bridge-api.ts), [src/lib/index.ts](./src/lib/index.ts), and [src/bridge-demo.ts](./src/bridge-demo.ts).

## GasExchange Contract Flow

`GasExchange` supports three directions:

- EGAS -> ERC20: `fromToken = 0x000...000`, transaction `value = amount`.
- ERC20 -> EGAS: call `approve(fromToken, GasExchange, amount)`, then `exchange(fromToken, 0x000...000, amount)`.
- ERC20 -> ERC20: approve `fromToken`, then call `exchange(fromToken, toToken, amount)`.

Contract functions:

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

### Approval and Sponsorship Modes

ERC20 exchange flows must allow `GasExchange` to spend the user's `fromToken`. There are three common modes:

1. **Standard `approve`**

   The user sends ERC20 `approve(gasExchange, amount)`, then sends `GasExchange.exchange(fromToken, toToken, amount)`. This works with standard ERC20 tokens and has the best compatibility. The tradeoff is that ERC20 -> EGAS or ERC20 -> ERC20 requires at least two wallet confirmations.

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

   If `fromToken` supports `permit`, the user signs EIP-712 typed data in the wallet, producing `deadline/v/r/s`, then sends one `exchangeWithPermitV2` transaction. This avoids a separate on-chain approve transaction. The tradeoff is that the token must support `permit`, and the frontend must implement the EIP-712 signing flow.

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

3. **Gas sponsorship relay**

   In SDK `0.1.4`, gas sponsorship is available for ENI-Peg USDT -> native EGAS. The user signs an EIP-2612 permit, then the app submits the signed payload to the ENI relay instead of asking the user to pay network gas. The relay submits `exchangeWithPermitV2` and deducts `1 EGAS` from the received EGAS after execution.

   This mode is intentionally narrower than generic `permit`:

   - `fromToken` must be ENI-Peg USDT.
   - `toToken` must be native EGAS (`ZERO_ADDRESS`).
   - Custom recipients are not supported.
   - Read `name`, `nonces(user)`, and EIP-712 version from the USDT contract before signing.

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

Event:

```solidity
event TokenExchanged(
  address indexed user,
  bool indexed isBuy,
  address indexed tokenAddress,
  uint256 fromAmount,
  uint256 toAmount
);
```

### Deployments

Mainnet:

```text
GasExchange:    0x37CCd90ed5FA96207B41C4fBCB90b883e30e63DC
Gasless relay:  https://xplan.eniac.network/api/gasless_approvalv2
ENI-Peg USDT:   0xDC1a8A35b0BaA3229b13f348ED708a2fd50b5e3a
Orbiter USDT:   0x47c98f74dBC1acc4cf2e04C4a729E22379EF4373
Hyperlane USDT: 0x545E289B88c6d97b74eC0B96e308cae46Bf5f832
```

Testnet:

```text
GasExchange:   0x6741B16197ab5575d5A8C904159d4ef80ee1e6Bf
Gasless relay: https://xplan.eniapp.dev/api/gasless_approvalv2
ENI-Peg USDT:  0x605AfFcF6979AfddabE6A050b182bDC390fC71fF
```

### GasExchange Demo Main Flow

By default, the demo builds an ENI mainnet ENI-Peg USDT -> EGAS transaction plan:

```bash
bun run gas
```

The main flow calls the lib to build `approve` and `exchange` transactions, then prints a gas sponsorship typed-data and relay-payload example. In a real app, send `transactions` in order through your wallet layer for the standard path, or sign the typed data and post the relay payload for gas sponsorship.

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

Before sending real transactions, confirm:

- The wallet has enough EGAS to pay gas.
- `amount` matches the input token decimals.
- The contract has enough target-asset liquidity.

Core files: [src/lib/gas-exchange.ts](./src/lib/gas-exchange.ts), [src/lib/gas-exchange.test.ts](./src/lib/gas-exchange.test.ts), and [src/gas-exchange-demo.ts](./src/gas-exchange-demo.ts).
