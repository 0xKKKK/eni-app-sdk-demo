# ENI Vue Widgets Demo

[中文文档](./README_zh-CN.md) | [Back to root](../../README.md)

This app demonstrates how to use `@eni-chain/app-sdk-widgets-vue` in a Vue 3 application. It includes a live widget preview, configurable module settings, and generated source code for the selected configuration.

## Live Demo

Open the hosted Vue demo: https://eni-widgets-vue-demo.vercel.app/

## Packages

Install the SDK, Vue bindings, and Vue widget package in your own Vue project:

```bash
pnpm add @eni-chain/app-sdk @eni-chain/app-sdk-vue @eni-chain/app-sdk-widgets-vue
```

Import the widget stylesheet once in your app entry or widget host component:

```ts
import "@eni-chain/app-sdk-widgets-vue/styles.css";
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

```vue
<script setup lang="ts">
import { computed } from "vue";
import {
  ENI_TOKENS,
  EniSDK,
  createEip1193WalletAdapter,
} from "@eni-chain/app-sdk";
import type { Eip1193Provider } from "@eni-chain/app-sdk";
import { EniProvider, EniWidgets } from "@eni-chain/app-sdk-widgets-vue";
import "@eni-chain/app-sdk-widgets-vue/styles.css";

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

const props = defineProps<{
  provider: Eip1193Provider | null;
  onConnectWallet: () => void | Promise<void>;
}>();

const wallet = computed(() =>
  props.provider ? createEip1193WalletAdapter(props.provider) : null,
);

const eni = computed(() => {
  if (!wallet.value) return null;

  return EniSDK.init({
    wallet: wallet.value,
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
});
</script>

<template>
  <button v-if="!wallet || !eni" type="button" @click="props.onConnectWallet">
    Connect wallet
  </button>

  <EniProvider v-else :sdk="eni" :wallet="wallet">
    <EniWidgets :on-connect-wallet="props.onConnectWallet" />
  </EniProvider>
</template>
```

## Standalone Widget Integration

If your app only needs one module, import the standalone widget component and render it inside `EniProvider`. The Vue package exports:

- `BridgeWidget`
- `SwapWidget`
- `GasExchangeWidget`
- `ToolsWidget`

### Bridge Only

```vue
<script setup lang="ts">
import { EniProvider, BridgeWidget } from "@eni-chain/app-sdk-widgets-vue";
import "@eni-chain/app-sdk-widgets-vue/styles.css";

defineProps<{
  eni: any;
  wallet: any;
}>();
</script>

<template>
  <EniProvider :sdk="eni" :wallet="wallet">
    <BridgeWidget
      default-amount="10"
      default-from-chain-id="56"
      default-to-chain-id="173"
      token-key="USDT"
      :on-bridge-complete="(result) => console.log('Bridge complete', result)"
    />
  </EniProvider>
</template>
```

### Swap Only

```vue
<script setup lang="ts">
import { ENI_TOKENS } from "@eni-chain/app-sdk";
import { EniProvider, SwapWidget } from "@eni-chain/app-sdk-widgets-vue";
import "@eni-chain/app-sdk-widgets-vue/styles.css";

defineProps<{
  eni: any;
  wallet: any;
}>();

const fromToken = ENI_TOKENS.mainnet.wegas;
const toToken = ENI_TOKENS.mainnet.usdt;
const swapPath = [fromToken.address, toToken.address] as const;
</script>

<template>
  <EniProvider :sdk="eni" :wallet="wallet">
    <SwapWidget
      :from-token="fromToken"
      :to-token="toToken"
      :path="swapPath"
      default-amount="1"
      default-input-side="from"
      :default-slippage-bps="50"
      :default-tax-bps="0"
      :on-swap-complete="(result) => console.log('Swap complete', result)"
    />
  </EniProvider>
</template>
```

Standalone widgets can also receive `client`, `wallet`, `testnet`, `account`, `recipient`, `theme`, and `language` props directly when you do not want to use provider context.

## Configuration Notes

- `language`: use `"auto"`, `"english"`, or `"chinese"`.
- `widgets.theme`: controls `mode`, `primaryColor`, `background`, and `radius`.
- `widgets.ui.defaultModule`: accepts `"bridge"`, `"gas"`, `"trade"`, or `"tools"`.
- `widgets.modules.trade`: configures the Swap module. The full SDK config key is `trade`, while the standalone component is named `SwapWidget`.
- `defaultSlippageBps` and `defaultTaxBps` both use `10000` as the denominator. The widget shows their sum as the effective slippage tolerance. A non-zero `defaultTaxBps` is for exact-in ERC20-to-ERC20 fee-on-transfer swaps.
- `EniWidgets` also supports direct visibility props such as `showBridge`, `showGasExchange`, `showSwap`, `showTools`, and `defaultMode` when you configure the shell without `widgets.modules`.

## Demo Files

- [src/App.vue](./src/App.vue): full demo UI, SDK initialization, widget configuration, and generated source example.
- [src/wallet.ts](./src/wallet.ts): injected wallet detection and `createEip1193WalletAdapter` usage.
- [src/styles.css](./src/styles.css): demo shell styling.
