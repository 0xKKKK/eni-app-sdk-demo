# ENI React Widgets Demo

[中文文档](./README_zh-CN.md) | [Back to root](../../README.md)

This app demonstrates how to use `@eni-chain/app-sdk-widgets-react` in a React application. It includes a live widget preview, configurable module settings, gas sponsorship defaults, and generated source code for the selected configuration.

## Live Demo

Open the hosted React demo: https://eni-widgets-react-demo.vercel.app/

## Packages

Install the SDK, React bindings, and React widget package in your own React project:

```bash
pnpm add @eni-chain/app-sdk @eni-chain/app-sdk-react @eni-chain/app-sdk-widgets-react
```

Import the widget stylesheet once in your app entry or widget host component:

```ts
import "@eni-chain/app-sdk-widgets-react/styles.css";
```

## Run This Demo

From this app directory:

```bash
pnpm install
bun run dev
```

The demo expects an injected EIP-1193 wallet provider such as OKX Wallet or MetaMask. See [src/wallet.ts](./src/wallet.ts) for the local wallet adapter helper.

## Full Widget Integration

Use `EniSDK.init` to create an SDK instance after your wallet provider is ready, then render `EniProvider` and `EniWidgets`.

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

## Standalone Widget Integration

If your app only needs one module, import the standalone widget component and render it inside `EniProvider`. The React package exports:

- `BridgeWidget`
- `SwapWidget`
- `GasExchangeWidget`
- `ToolsWidget`

### Bridge Only

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

### Gas Exchange Only

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

### Swap Only

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

Standalone widgets can also receive `client`, `wallet`, `testnet`, `account`, `recipient`, `theme`, and `language` props directly when you do not want to use provider context.

## Configuration Notes

- `language`: use `"auto"`, `"english"`, or `"chinese"`.
- `widgets.theme`: controls `mode`, `primaryColor`, `background`, and `radius`.
- `widgets.ui.defaultModule`: accepts `"bridge"`, `"gas"`, `"trade"`, or `"tools"`.
- `widgets.modules.gas.defaultGasless`: enables gas sponsorship by default for ENI-Peg USDT -> EGAS. The relay pays network gas and deducts `1 EGAS` from the received EGAS after execution.
- `widgets.modules.trade`: configures the Swap module. The full SDK config key is `trade`, while the standalone component is named `SwapWidget`.
- `defaultSlippageBps` and `defaultTaxBps` both use `10000` as the denominator. The widget shows their sum as the effective slippage tolerance. A non-zero `defaultTaxBps` is for exact-in ERC20-to-ERC20 fee-on-transfer swaps.
- `EniWidgets` also supports direct visibility props such as `showBridge`, `showGasExchange`, `showSwap`, `showTools`, and `defaultMode` when you configure the shell without `widgets.modules`.

## Demo Files

- [src/App.tsx](./src/App.tsx): full demo UI, SDK initialization, widget configuration, and generated source example.
- [src/wallet.ts](./src/wallet.ts): injected wallet detection and `createEip1193WalletAdapter` usage.
- [src/styles.css](./src/styles.css): demo shell styling.
