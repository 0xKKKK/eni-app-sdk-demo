<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ENI_TOKENS, EniSDK } from "@eni-chain/app-sdk";
import { EniProvider, EniWidgets } from "@eni-chain/app-sdk-widgets-vue";
import type {
  Address,
  EniApp,
  EniSdkLanguage,
  EniSdkToolLinkConfig,
  EniSdkWidgetModule,
  EniWalletAdapter,
  TokenInput,
} from "@eni-chain/app-sdk";
import { connectInjectedWallet } from "./wallet";

const CUSTOMIZE_PATH = "/customize";
const PROJECT_TOKEN = {
  address: "0x6D1e851446F4D004AE2A72F9AfEd85e8829A205E",
  name: "Project Token",
  symbol: "PRJ",
  decimals: 18,
  icon: "https://s2.coinmarketcap.com/static/cloud/img/loyalty-program/diamond-icon.svg",
} as const satisfies TokenInput;
const TOKEN_OPTIONS = {
  EGAS: ENI_TOKENS.mainnet.egas,
  WEGAS: ENI_TOKENS.mainnet.wegas,
  USDT: ENI_TOKENS.mainnet.usdt,
  PRJ: PROJECT_TOKEN,
} as const satisfies Record<string, TokenInput>;
const DEFAULT_TOOLS_LINKS_CONFIG = [
  "Bridge Hub|Cross-chain bridge routing for ENI assets.|https://xplan.eniac.network/favicon.ico|https://xplan.eniac.network/bridge?bridge=56&token=",
].join("\n");
const MODULE_OPTIONS = [
  { key: "bridge", label: "Bridge", description: "Cross-chain USDT routing" },
  { key: "gas", label: "Gas", description: "USDT and EGAS exchange" },
  { key: "trade", label: "Swap", description: "Uniswap v2 compatible trading" },
  { key: "tools", label: "Quick Links", description: "Token tools and project links" },
] as const;

type DemoModuleKey = (typeof MODULE_OPTIONS)[number]["key"];
type DemoModuleState = Record<DemoModuleKey, boolean>;
type DemoExpandedState = Record<DemoModuleKey, boolean>;
type DemoPage = "home" | "customize";
type TokenSymbol = keyof typeof TOKEN_OPTIONS;

const DEFAULT_MODULES: DemoModuleState = {
  bridge: true,
  gas: true,
  trade: true,
  tools: true,
};
const DEFAULT_EXPANDED: DemoExpandedState = {
  bridge: true,
  gas: true,
  trade: true,
  tools: true,
};

const page = ref<DemoPage>(getPageFromPathname());
const address = ref<Address | null>(null);
const wallet = ref<EniWalletAdapter | null>(null);
const walletError = ref<string | null>(null);
const connecting = ref(false);
const sourceCopied = ref(false);
const modules = ref<DemoModuleState>({ ...DEFAULT_MODULES });
const expandedModules = ref<DemoExpandedState>({ ...DEFAULT_EXPANDED });
const language = ref<EniSdkLanguage>("auto");
const showToolbar = ref(true);
const defaultModule = ref<EniSdkWidgetModule>("bridge");
const themeMode = ref<"light" | "dark">("light");
const primaryColor = ref("#705df6");
const panelBackgroundColor = ref("#ffffff");
const radius = ref("18px");
const bridgeAmount = ref("");
const bridgeFromChainId = ref("56");
const bridgeToChainId = ref("173");
const bridgeTokenKey = ref("USDT");
const gasAmount = ref("");
const gasDefaultGasless = ref(false);
const swapAmount = ref("");
const swapFromSymbol = ref<TokenSymbol>("PRJ");
const swapToSymbol = ref<TokenSymbol>("USDT");
const swapInputSide = ref<"from" | "to">("from");
const slippageBps = ref("50");
const taxBps = ref("0");
const toolsTokenSymbols = ref("PRJ");
const defaultDetailsOpen = ref(false);
const defaultSettingsOpen = ref(false);

const enabledModuleKeys = computed(() => MODULE_OPTIONS.filter((module) => modules.value[module.key]).map((module) => module.key));
const resolvedDefaultModule = computed<EniSdkWidgetModule>(() =>
  modules.value[defaultModule.value as DemoModuleKey] ? defaultModule.value : enabledModuleKeys.value[0] ?? "bridge",
);
const swapFromToken = computed(() => TOKEN_OPTIONS[swapFromSymbol.value]);
const swapToToken = computed(() => TOKEN_OPTIONS[swapToSymbol.value]);
const swapPath = computed(() => [swapFromToken.value.address, swapToToken.value.address] as readonly Address[]);
const toolsTokens = computed(() => parseTokenList(toolsTokenSymbols.value));
const toolsLinks = computed(() => parseToolLinks(DEFAULT_TOOLS_LINKS_CONFIG));
const parsedSlippageBps = computed(() => Number.parseInt(slippageBps.value, 10) || 50);
const parsedTaxBps = computed(() => Number.parseInt(taxBps.value, 10) || 0);
const sdk = computed<EniApp | null>(() => {
  if (!wallet.value) return null;

  return EniSDK.init({
    wallet: wallet.value,
    language: language.value,
    widgets: {
      language: language.value,
      theme: {
        mode: themeMode.value,
        primaryColor: primaryColor.value,
        background: panelBackgroundColor.value,
        radius: radius.value,
      },
      ui: {
        showToolbar: showToolbar.value,
        defaultModule: resolvedDefaultModule.value,
      },
      modules: {
        bridge: {
          enabled: modules.value.bridge,
          defaultAmount: bridgeAmount.value,
          defaultFromChainId: bridgeFromChainId.value,
          defaultToChainId: bridgeToChainId.value,
          tokenKey: bridgeTokenKey.value,
        },
        gas: {
          enabled: modules.value.gas,
          defaultAmount: gasAmount.value,
          defaultDirection: "usdt-to-egas",
          defaultGasless: gasDefaultGasless.value,
        },
        trade: {
          enabled: modules.value.trade,
          fromToken: swapFromToken.value,
          toToken: swapToToken.value,
          path: swapPath.value,
          defaultAmount: swapAmount.value,
          defaultInputSide: swapInputSide.value,
          defaultSlippageBps: parsedSlippageBps.value,
          defaultTaxBps: parsedTaxBps.value,
          defaultDetailsOpen: defaultDetailsOpen.value,
          defaultSettingsOpen: defaultSettingsOpen.value,
        },
        tools: {
          enabled: modules.value.tools,
          tokens: toolsTokens.value,
          links: toolsLinks.value,
        },
      },
    },
  });
});
const sourceCode = computed(() =>
  createSourceExample({
    bridgeAmount: bridgeAmount.value,
    bridgeFromChainId: bridgeFromChainId.value,
    bridgeToChainId: bridgeToChainId.value,
    bridgeTokenKey: bridgeTokenKey.value,
    defaultDetailsOpen: defaultDetailsOpen.value,
    defaultModule: resolvedDefaultModule.value,
    defaultSettingsOpen: defaultSettingsOpen.value,
    gasAmount: gasAmount.value,
    gasDefaultGasless: gasDefaultGasless.value,
    language: language.value,
    modules: modules.value,
    panelBackgroundColor: panelBackgroundColor.value,
    primaryColor: primaryColor.value,
    radius: radius.value,
    showToolbar: showToolbar.value,
    slippageBps: parsedSlippageBps.value,
    taxBps: parsedTaxBps.value,
    swapAmount: swapAmount.value,
    swapFromSymbol: swapFromSymbol.value,
    swapInputSide: swapInputSide.value,
    swapToSymbol: swapToSymbol.value,
    themeMode: themeMode.value,
    toolsTokenSymbols: toolsTokenSymbols.value,
  }),
);

onMounted(() => {
  window.addEventListener("popstate", syncPageFromPathname);
});

onBeforeUnmount(() => {
  window.removeEventListener("popstate", syncPageFromPathname);
});

function syncPageFromPathname() {
  page.value = getPageFromPathname();
}

function navigate(nextPage: DemoPage) {
  const nextPath = nextPage === "customize" ? CUSTOMIZE_PATH : "/";
  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, "", nextPath);
  }
  page.value = nextPage;
}

async function connectWallet() {
  walletError.value = null;
  connecting.value = true;
  try {
    const nextWallet = await connectInjectedWallet();
    address.value = nextWallet.address;
    wallet.value = nextWallet.wallet;
  } catch (error) {
    wallet.value = null;
    address.value = null;
    walletError.value = error instanceof Error ? error.message : "Failed to connect wallet";
  } finally {
    connecting.value = false;
  }
}

function toggleModule(key: DemoModuleKey) {
  modules.value = { ...modules.value, [key]: !modules.value[key] };
}

function toggleExpandedModule(key: DemoModuleKey) {
  expandedModules.value = { ...expandedModules.value, [key]: !expandedModules.value[key] };
}

function updateThemeMode(mode: "light" | "dark") {
  themeMode.value = mode;
  panelBackgroundColor.value = mode === "dark" ? "#111318" : "#ffffff";
}

async function copySourceCode() {
  await navigator.clipboard.writeText(sourceCode.value);
  sourceCopied.value = true;
  window.setTimeout(() => {
    sourceCopied.value = false;
  }, 1600);
}

function getPageFromPathname(): DemoPage {
  if (typeof window === "undefined") return "home";
  return window.location.pathname === CUSTOMIZE_PATH ? "customize" : "home";
}

function parseTokenList(value: string): readonly TokenInput[] {
  return value
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .map((symbol) => TOKEN_OPTIONS[symbol as TokenSymbol])
    .filter((token): token is TokenInput => Boolean(token));
}

function parseToolLinks(value: string, options: { resolveLogo?: boolean } = {}): readonly EniSdkToolLinkConfig[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, description, logoURI, href] = line.split("|").map((part) => part.trim());
      if (!title || !href) return null;
      return {
        title,
        description,
        logoURI: options.resolveLogo === false ? logoURI : resolveDemoAssetPath(logoURI),
        href,
      };
    })
    .filter((link): link is EniSdkToolLinkConfig => Boolean(link));
}

function resolveDemoAssetPath(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value;
}

function createSourceExample(config: {
  bridgeAmount: string;
  bridgeFromChainId: string;
  bridgeToChainId: string;
  bridgeTokenKey: string;
  defaultDetailsOpen: boolean;
  defaultModule: EniSdkWidgetModule;
  defaultSettingsOpen: boolean;
  gasAmount: string;
  gasDefaultGasless: boolean;
  language: EniSdkLanguage;
  modules: DemoModuleState;
  panelBackgroundColor: string;
  primaryColor: string;
  radius: string;
  showToolbar: boolean;
  slippageBps: number;
  taxBps: number;
  swapAmount: string;
  swapFromSymbol: TokenSymbol;
  swapInputSide: "from" | "to";
  swapToSymbol: TokenSymbol;
  themeMode: "light" | "dark";
  toolsTokenSymbols: string;
}): string {
  const toolTokenRefs = parseTokenList(config.toolsTokenSymbols)
    .map((token) => formatSourceTokenReference(token.symbol as TokenSymbol))
    .join(", ");
  const toolLinksSource = JSON.stringify(parseToolLinks(DEFAULT_TOOLS_LINKS_CONFIG, { resolveLogo: false }), null, 2)
    .replace(/"([^"]+)":/g, "$1:");
  const sourceFromToken = formatSourceTokenReference(config.swapFromSymbol);
  const sourceToToken = formatSourceTokenReference(config.swapToSymbol);
  const enabledModules = [
    config.modules.bridge
      ? `        bridge: {
          enabled: true,
          defaultAmount: "${config.bridgeAmount}",
          defaultFromChainId: "${config.bridgeFromChainId}",
          defaultToChainId: "${config.bridgeToChainId}",
          tokenKey: "${config.bridgeTokenKey}",
        },`
      : `        bridge: { enabled: false },`,
    config.modules.gas
      ? `        gas: {
          enabled: true,
          defaultAmount: "${config.gasAmount}",
          defaultDirection: "usdt-to-egas",
          defaultGasless: ${config.gasDefaultGasless},
        },`
      : `        gas: { enabled: false },`,
    config.modules.trade
      ? `        trade: {
          enabled: true,
          fromToken,
          toToken,
          path: [fromToken.address, toToken.address] as const,
          defaultAmount: "${config.swapAmount}",
          defaultInputSide: "${config.swapInputSide}",
          defaultSlippageBps: ${config.slippageBps},
          defaultTaxBps: ${config.taxBps},
          defaultDetailsOpen: ${config.defaultDetailsOpen},
          defaultSettingsOpen: ${config.defaultSettingsOpen},
        },`
      : `        trade: { enabled: false },`,
    config.modules.tools
      ? `        tools: {
          enabled: true,
          tokens: [${toolTokenRefs}],
          links: toolLinks,
        },`
      : `        tools: { enabled: false },`,
  ].join("\n");

  const scriptClose = "</scr" + "ipt>";

  return `<script setup lang="ts">
import { computed } from "vue";
import { ENI_TOKENS, EniSDK, createEip1193WalletAdapter } from "@eni-chain/app-sdk";
import type { Eip1193Provider } from "@eni-chain/app-sdk";
import { EniProvider, EniWidgets } from "@eni-chain/app-sdk-widgets-vue";
import "@eni-chain/app-sdk-widgets-vue/styles.css";

const projectToken = {
  address: "${PROJECT_TOKEN.address}",
  name: "${PROJECT_TOKEN.name}",
  symbol: "${PROJECT_TOKEN.symbol}",
  decimals: ${PROJECT_TOKEN.decimals},
  icon: "${PROJECT_TOKEN.icon}",
} as const;

const toolLinks = ${toolLinksSource} as const;
const fromToken = ${sourceFromToken};
const toToken = ${sourceToToken};

const props = defineProps<{
  provider: Eip1193Provider | null;
  onConnectWallet: () => void | Promise<void>;
}>();

// Get provider from your wallet layer, such as wagmi, RainbowKit, or a custom connector.
const wallet = computed(() => props.provider ? createEip1193WalletAdapter(props.provider) : null);
const eni = computed(() => {
  // Initialize widgets once the wallet provider is ready.
  if (!wallet.value) return null;

  return EniSDK.init({
    wallet: wallet.value,
    language: "${config.language}",
    widgets: {
      language: "${config.language}",
      theme: {
        mode: "${config.themeMode}",
        primaryColor: "${config.primaryColor}",
        background: "${config.panelBackgroundColor}",
        radius: "${config.radius}",
      },
      ui: {
        showToolbar: ${config.showToolbar},
        defaultModule: "${config.defaultModule}",
      },
      modules: {
${enabledModules}
      },
    },
  });
});
${scriptClose}

<template>
  <button v-if="!eni || !wallet" type="button" @click="props.onConnectWallet">
    Connect wallet
  </button>

  <EniProvider v-else :sdk="eni" :wallet="wallet">
    <EniWidgets :on-connect-wallet="props.onConnectWallet" />
  </EniProvider>
</template>`;
}

function formatSourceTokenReference(symbol: TokenSymbol): string {
  if (symbol === "PRJ") return "projectToken";
  return `ENI_TOKENS.mainnet.${symbol.toLowerCase()}`;
}
</script>

<template>
  <main :class="['shell', page === 'home' ? 'shell--home' : '']">
    <header class="topbar">
      <div>
        <h1>ENI Widgets</h1>
        <p>Vue integration demo</p>
      </div>
      <div class="topbar__actions">
        <button class="demo-secondary-button topbar__button" type="button" @click="navigate(page === 'customize' ? 'home' : 'customize')">
          {{ page === "customize" ? "Home" : "Customize" }}
        </button>
        <button class="demo-primary-button topbar__button" type="button" @click="connectWallet" :disabled="connecting">
          {{ address ? "Wallet connected" : connecting ? "Connecting..." : "Connect wallet" }}
        </button>
      </div>
    </header>

    <div v-if="page === 'home'" class="demo-home">
      <section class="demo-preview demo-preview--home" aria-label="Live widget preview">
        <div class="demo-panel-header">
          <div>
            <span>Live preview</span>
            <small>{{ address ?? "Connect a wallet to initialize widgets" }}</small>
          </div>
        </div>
        <div class="demo-preview__stage">
          <div v-if="!sdk || !wallet" class="demo-empty demo-empty--wallet">
            <p>Connect a wallet to load the widget with your provider and address.</p>
            <button class="demo-primary-button" type="button" @click="connectWallet" :disabled="connecting">
              {{ connecting ? "Connecting..." : "Connect wallet" }}
            </button>
          </div>
          <EniProvider v-else-if="enabledModuleKeys.length > 0" :sdk="sdk" :wallet="wallet">
            <EniWidgets :on-connect-wallet="connectWallet" />
          </EniProvider>
          <div v-else class="demo-empty">Select at least one feature to preview the widget.</div>
        </div>
      </section>
    </div>

    <div v-else class="demo-layout">
      <aside class="demo-config" aria-label="Widget configuration">
        <section class="demo-section">
          <div class="demo-section__header">
            <span>Global</span>
          </div>
          <label class="demo-field">
            <span>Language</span>
            <select v-model="language">
              <option value="auto">Auto</option>
              <option value="english">English</option>
              <option value="chinese">Chinese</option>
            </select>
          </label>
          <label class="demo-field">
            <span>Default tab</span>
            <select v-model="defaultModule">
              <option v-for="module in MODULE_OPTIONS" :key="module.key" :value="module.key">
                {{ module.label }}
              </option>
            </select>
          </label>
          <label class="demo-toggle">
            <input v-model="showToolbar" type="checkbox" />
            <span>Show module toolbar</span>
          </label>
          <label class="demo-field">
            <span>Theme</span>
            <select :value="themeMode" @change="updateThemeMode(($event.target as HTMLSelectElement).value as 'light' | 'dark')">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label class="demo-field">
            <span>Primary color</span>
            <input v-model="primaryColor" type="color" />
          </label>
          <label class="demo-field">
            <span>Panel background</span>
            <input v-model="panelBackgroundColor" type="color" />
          </label>
          <label class="demo-field">
            <span>Radius</span>
            <select v-model="radius">
              <option value="12px">Compact</option>
              <option value="18px">Default</option>
              <option value="24px">Soft</option>
            </select>
          </label>
        </section>

        <section class="demo-section">
          <div class="demo-section__header">
            <span>Features</span>
            <small>{{ enabledModuleKeys.length }} enabled</small>
          </div>
          <div class="demo-module-list">
            <article v-for="module in MODULE_OPTIONS" :key="module.key" class="demo-module-card">
              <div class="demo-module-card__top">
                <label class="demo-module-row">
                  <input type="checkbox" :checked="modules[module.key]" @change="toggleModule(module.key)" />
                  <span>
                    <strong>{{ module.label }}</strong>
                    <small>{{ module.description }}</small>
                  </span>
                </label>
                <button
                  class="demo-expand-button"
                  type="button"
                  :aria-label="`${expandedModules[module.key] ? 'Collapse' : 'Expand'} ${module.label} settings`"
                  :aria-expanded="expandedModules[module.key]"
                  @click="toggleExpandedModule(module.key)"
                >
                  {{ expandedModules[module.key] ? "-" : "+" }}
                </button>
              </div>

              <div v-if="expandedModules[module.key] && module.key === 'bridge'" class="demo-module-card__settings">
                <label class="demo-field">
                  <span>Amount</span>
                  <input v-model="bridgeAmount" inputmode="decimal" />
                </label>
                <label class="demo-field">
                  <span>From chain</span>
                  <input v-model="bridgeFromChainId" />
                </label>
                <label class="demo-field">
                  <span>To chain</span>
                  <input v-model="bridgeToChainId" />
                </label>
                <label class="demo-field">
                  <span>Token key</span>
                  <input v-model="bridgeTokenKey" />
                </label>
              </div>

              <div v-else-if="expandedModules[module.key] && module.key === 'gas'" class="demo-module-card__settings">
                <label class="demo-field">
                  <span>Amount</span>
                  <input v-model="gasAmount" inputmode="decimal" />
                </label>
                <label class="demo-toggle">
                  <input v-model="gasDefaultGasless" type="checkbox" />
                  <span>Default gas sponsorship USDT -> EGAS</span>
                </label>
                <p class="demo-module-note">Gas sponsorship is only available for ENI-Peg USDT to EGAS and deducts a 1 EGAS fee after execution.</p>
              </div>

              <div v-else-if="expandedModules[module.key] && module.key === 'trade'" class="demo-module-card__settings">
                <label class="demo-field">
                  <span>Amount</span>
                  <input v-model="swapAmount" inputmode="decimal" />
                </label>
                <label class="demo-field">
                  <span>From token</span>
                  <select v-model="swapFromSymbol">
                    <option v-for="(_token, symbol) in TOKEN_OPTIONS" :key="symbol" :value="symbol">{{ symbol }}</option>
                  </select>
                </label>
                <label class="demo-field">
                  <span>To token</span>
                  <select v-model="swapToSymbol">
                    <option v-for="(_token, symbol) in TOKEN_OPTIONS" :key="symbol" :value="symbol">{{ symbol }}</option>
                  </select>
                </label>
                <label class="demo-field">
                  <span>Input side</span>
                  <select v-model="swapInputSide">
                    <option value="from">Exact in</option>
                    <option value="to">Exact out</option>
                  </select>
                </label>
                <label class="demo-field">
                  <span>Slippage bps</span>
                  <input v-model="slippageBps" inputmode="numeric" />
                </label>
                <label class="demo-field">
                  <span>Tax bps</span>
                  <input v-model="taxBps" inputmode="numeric" />
                </label>
                <label class="demo-toggle">
                  <input v-model="defaultDetailsOpen" type="checkbox" />
                  <span>Details open</span>
                </label>
                <label class="demo-toggle">
                  <input v-model="defaultSettingsOpen" type="checkbox" />
                  <span>Settings open</span>
                </label>
              </div>

              <div v-else-if="expandedModules[module.key]" class="demo-module-card__settings">
                <label class="demo-field">
                  <span>Wallet tokens</span>
                  <input v-model="toolsTokenSymbols" />
                </label>
                <p class="demo-module-note">Comma-separated token symbols from the demo token registry. USDT is always shown first.</p>
              </div>
            </article>
          </div>
        </section>
      </aside>

      <section class="demo-preview" aria-label="Live widget preview">
        <div class="demo-panel-header">
          <div>
            <span>Live preview</span>
            <small>{{ address ?? "Connect a wallet to initialize widgets" }}</small>
          </div>
        </div>
        <div class="demo-preview__stage">
          <div v-if="!sdk || !wallet" class="demo-empty demo-empty--wallet">
            <p>Connect a wallet to load the widget with your provider and address.</p>
            <button class="demo-primary-button" type="button" @click="connectWallet" :disabled="connecting">
              {{ connecting ? "Connecting..." : "Connect wallet" }}
            </button>
          </div>
          <EniProvider v-else-if="enabledModuleKeys.length > 0" :sdk="sdk" :wallet="wallet">
            <EniWidgets :on-connect-wallet="connectWallet" />
          </EniProvider>
          <div v-else class="demo-empty">Select at least one feature to preview the widget.</div>
        </div>
      </section>

      <section class="demo-source" aria-label="Generated source example">
        <div class="demo-panel-header">
          <div>
            <span>Source example</span>
            <small>Updates from the selected configuration</small>
          </div>
          <button class="demo-copy-button" type="button" @click="copySourceCode">
            {{ sourceCopied ? "Copied" : "Copy" }}
          </button>
        </div>
        <pre><code>{{ sourceCode }}</code></pre>
      </section>
    </div>

    <p v-if="walletError" class="note note--error">{{ walletError }}</p>
  </main>
</template>
