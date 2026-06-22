# ENI React Widgets 示例

[English](./README.md) | [返回根文档](../../README_zh-CN.md)

这个应用演示如何在 React 项目中使用 `@eni-chain/app-sdk-widgets-react`。示例包含实时预览、可配置模块、Gas 代付默认值，以及根据当前配置生成的源码片段。

## 在线示例

打开已部署的 React 示例：https://eni-widgets-react-demo.vercel.app/

## 安装包

在自己的 React 项目中安装 SDK、React 绑定和 React widgets 包：

```bash
pnpm add @eni-chain/app-sdk @eni-chain/app-sdk-react @eni-chain/app-sdk-widgets-react
```

在应用入口或挂件宿主组件中引入一次样式：

```ts
import "@eni-chain/app-sdk-widgets-react/styles.css";
```

## 运行当前示例

在当前 app 目录中执行：

```bash
pnpm install
bun run dev
```

示例依赖 OKX Wallet 或 MetaMask 这类注入式 EIP-1193 wallet provider。本地 wallet adapter helper 可以参考 [src/wallet.ts](./src/wallet.ts)。

## 引入完整挂件

当 wallet provider 准备好后，使用 `EniSDK.init` 创建 SDK 实例，然后渲染 `EniProvider` 和 `EniWidgets`。

```tsx
import { useMemo } from "react";
import {
  ENI_TOKENS,
  EniSDK,
  createEip1193WalletAdapter,
} from "@eni-chain/app-sdk";
import type { Eip1193Provider } from "@eni-chain/app-sdk";
import { EniProvider, EniWidgets } from "@eni-chain/app-sdk-widgets-react";
import "@eni-chain/app-sdk-widgets-react/styles.css";

const fromToken = ENI_TOKENS.mainnet.wegas;
const toToken = ENI_TOKENS.mainnet.usdt;

const toolLinks = [
  {
    title: "Bridge Hub",
    description: "Cross-chain bridge routing for ENI assets.",
    logoURI: "https://xplan.eniac.network/favicon.ico",
    href: "https://xplan.eniac.network/bridge?bridge=56&token=",
  },
] as const;

interface EniWidgetPanelProps {
  provider: Eip1193Provider | null;
  onConnectWallet: () => void | Promise<void>;
}

export function EniWidgetPanel({ provider, onConnectWallet }: EniWidgetPanelProps) {
  const wallet = useMemo(
    () => (provider ? createEip1193WalletAdapter(provider) : null),
    [provider],
  );

  const eni = useMemo(() => {
    if (!wallet) return null;

    return EniSDK.init({
      wallet,
      language: "auto",
      widgets: {
        language: "auto",
        theme: {
          mode: "light",
          primaryColor: "#705df6",
          background: "#ffffff",
          radius: "18px",
        },
        ui: {
          showToolbar: true,
          defaultModule: "bridge",
        },
        modules: {
          bridge: {
            enabled: true,
            defaultAmount: "",
            defaultFromChainId: "56",
            defaultToChainId: "173",
            tokenKey: "USDT",
          },
          gas: {
            enabled: true,
            defaultAmount: "",
            defaultDirection: "usdt-to-egas",
            defaultGasless: false,
          },
          trade: {
            enabled: true,
            fromToken,
            toToken,
            path: [fromToken.address, toToken.address] as const,
            defaultAmount: "",
            defaultInputSide: "from",
            defaultSlippageBps: 50,
            defaultTaxBps: 0,
            defaultDetailsOpen: false,
            defaultSettingsOpen: false,
          },
          tools: {
            enabled: true,
            tokens: [ENI_TOKENS.mainnet.usdt],
            links: toolLinks,
          },
        },
      },
    });
  }, [wallet]);

  if (!wallet || !eni) {
    return <button onClick={onConnectWallet}>Connect wallet</button>;
  }

  return (
    <EniProvider sdk={eni} wallet={wallet}>
      <EniWidgets onConnectWallet={onConnectWallet} />
    </EniProvider>
  );
}
```

## 引入独立挂件

如果业务项目只需要某一个模块，可以直接引入独立挂件组件，并放在 `EniProvider` 内渲染。React 包导出以下组件：

- `BridgeWidget`
- `SwapWidget`
- `GasExchangeWidget`
- `ToolsWidget`

### 只引入 Bridge

```tsx
import { EniProvider, BridgeWidget } from "@eni-chain/app-sdk-widgets-react";
import "@eni-chain/app-sdk-widgets-react/styles.css";

export function BridgeOnly({ eni, wallet }: { eni: any; wallet: any }) {
  return (
    <EniProvider sdk={eni} wallet={wallet}>
      <BridgeWidget
        defaultAmount="10"
        defaultFromChainId="56"
        defaultToChainId="173"
        tokenKey="USDT"
        onBridgeComplete={(result) => {
          console.log("Bridge complete", result);
        }}
      />
    </EniProvider>
  );
}
```

### 只引入 Gas Exchange

```tsx
import { EniProvider, GasExchangeWidget } from "@eni-chain/app-sdk-widgets-react";
import "@eni-chain/app-sdk-widgets-react/styles.css";

export function GasOnly({ eni, wallet }: { eni: any; wallet: any }) {
  return (
    <EniProvider sdk={eni} wallet={wallet}>
      <GasExchangeWidget
        defaultAmount=""
        defaultDirection="usdt-to-egas"
        defaultGasless={false}
      />
    </EniProvider>
  );
}
```

### 只引入 Swap

```tsx
import { ENI_TOKENS } from "@eni-chain/app-sdk";
import { EniProvider, SwapWidget } from "@eni-chain/app-sdk-widgets-react";
import "@eni-chain/app-sdk-widgets-react/styles.css";

const fromToken = ENI_TOKENS.mainnet.wegas;
const toToken = ENI_TOKENS.mainnet.usdt;

export function SwapOnly({ eni, wallet }: { eni: any; wallet: any }) {
  return (
    <EniProvider sdk={eni} wallet={wallet}>
      <SwapWidget
        fromToken={fromToken}
        toToken={toToken}
        path={[fromToken.address, toToken.address] as const}
        defaultAmount="1"
        defaultInputSide="from"
        defaultSlippageBps={50}
        defaultTaxBps={0}
        onSwapComplete={(result) => {
          console.log("Swap complete", result);
        }}
      />
    </EniProvider>
  );
}
```

如果不想使用 provider context，独立挂件也可以直接接收 `client`、`wallet`、`testnet`、`account`、`recipient`、`theme`、`language` 等 props。

## 配置说明

- `language`：可设置为 `"auto"`、`"english"` 或 `"chinese"`。
- `widgets.theme`：配置 `mode`、`primaryColor`、`background`、`radius`。
- `widgets.ui.defaultModule`：可设置为 `"bridge"`、`"gas"`、`"trade"` 或 `"tools"`。
- `widgets.modules.gas.defaultGasless`：默认开启 ENI-Peg USDT -> EGAS 的 Gas 代付。relay 会支付链上 gas，并在交易完成后从到账 EGAS 中扣除 `1 EGAS`。
- `widgets.modules.trade`：对应 Swap 模块。完整 SDK 配置里 key 是 `trade`，独立组件名是 `SwapWidget`。
- `defaultSlippageBps` 和 `defaultTaxBps` 的分母都是 `10000`。挂件会展示两者相加后的最终滑点容忍度。`defaultTaxBps` 不为 `0` 时用于 exact-in 的 ERC20-to-ERC20 带税交易。
- `EniWidgets` 也支持 `showBridge`、`showGasExchange`、`showSwap`、`showTools`、`defaultMode` 等直接控制完整挂件 shell 的 props。

## 示例文件

- [src/App.tsx](./src/App.tsx)：完整示例 UI、SDK 初始化、挂件配置和源码生成逻辑。
- [src/wallet.ts](./src/wallet.ts)：注入式 wallet 检测和 `createEip1193WalletAdapter` 用法。
- [src/styles.css](./src/styles.css)：示例页面样式。
