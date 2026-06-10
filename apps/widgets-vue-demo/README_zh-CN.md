# ENI Vue Widgets 示例

[English](./README.md) | [返回根文档](../../README_zh-CN.md)

这个应用演示如何在 Vue 3 项目中使用 `@eni-chain/app-sdk-widgets-vue`。示例包含实时预览、可配置模块，以及根据当前配置生成的源码片段。

## 在线示例

打开已部署的 Vue 示例：https://eni-widgets-vue-demo.vercel.app/

## 安装包

在自己的 Vue 项目中安装 SDK、Vue 绑定和 Vue widgets 包：

```bash
pnpm add @eni-chain/app-sdk @eni-chain/app-sdk-vue @eni-chain/app-sdk-widgets-vue
```

在应用入口或挂件宿主组件中引入一次样式：

```ts
import "@eni-chain/app-sdk-widgets-vue/styles.css";
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

## 引入独立挂件

如果业务项目只需要某一个模块，可以直接引入独立挂件组件，并放在 `EniProvider` 内渲染。Vue 包导出以下组件：

- `BridgeWidget`
- `SwapWidget`
- `GasExchangeWidget`
- `ToolsWidget`

### 只引入 Bridge

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

### 只引入 Swap

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
      :on-swap-complete="(result) => console.log('Swap complete', result)"
    />
  </EniProvider>
</template>
```

如果不想使用 provider context，独立挂件也可以直接接收 `client`、`wallet`、`testnet`、`account`、`recipient`、`theme`、`language` 等 props。

## 配置说明

- `language`：可设置为 `"auto"`、`"english"` 或 `"chinese"`。
- `widgets.theme`：配置 `mode`、`primaryColor`、`background`、`radius`。
- `widgets.ui.defaultModule`：可设置为 `"bridge"`、`"gas"`、`"trade"` 或 `"tools"`。
- `widgets.modules.trade`：对应 Swap 模块。完整 SDK 配置里 key 是 `trade`，独立组件名是 `SwapWidget`。
- `EniWidgets` 也支持 `showBridge`、`showGasExchange`、`showSwap`、`showTools`、`defaultMode` 等直接控制完整挂件 shell 的 props。

## 示例文件

- [src/App.vue](./src/App.vue)：完整示例 UI、SDK 初始化、挂件配置和源码生成逻辑。
- [src/wallet.ts](./src/wallet.ts)：注入式 wallet 检测和 `createEip1193WalletAdapter` 用法。
- [src/styles.css](./src/styles.css)：示例页面样式。
