import { useEffect, useMemo, useState } from "react";
import { ENI_TOKENS, EniSDK } from "@eni-chain/app-sdk";
import { EniProvider, EniWidgets } from "@eni-chain/app-sdk-widgets-react";
import type { Address, EniSdkLanguage, EniSdkToolLinkConfig, EniSdkWidgetModule, EniWalletAdapter, TokenInput } from "@eni-chain/app-sdk";
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

export function App() {
  const [page, setPage] = useState<DemoPage>(() => getPageFromPathname());
  const [address, setAddress] = useState<Address | null>(null);
  const [wallet, setWallet] = useState<EniWalletAdapter | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [sourceCopied, setSourceCopied] = useState(false);
  const [modules, setModules] = useState<DemoModuleState>(DEFAULT_MODULES);
  const [expandedModules, setExpandedModules] = useState<DemoExpandedState>(DEFAULT_EXPANDED);
  const [language, setLanguage] = useState<EniSdkLanguage>("auto");
  const [showToolbar, setShowToolbar] = useState(true);
  const [defaultModule, setDefaultModule] = useState<EniSdkWidgetModule>("bridge");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [primaryColor, setPrimaryColor] = useState("#705df6");
  const [panelBackgroundColor, setPanelBackgroundColor] = useState("#ffffff");
  const [radius, setRadius] = useState("18px");
  const [bridgeAmount, setBridgeAmount] = useState("");
  const [bridgeFromChainId, setBridgeFromChainId] = useState("56");
  const [bridgeToChainId, setBridgeToChainId] = useState("173");
  const [bridgeTokenKey, setBridgeTokenKey] = useState("USDT");
  const [gasAmount, setGasAmount] = useState("");
  const [gasDefaultGasless, setGasDefaultGasless] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapFromSymbol, setSwapFromSymbol] = useState<TokenSymbol>("PRJ");
  const [swapToSymbol, setSwapToSymbol] = useState<TokenSymbol>("USDT");
  const [swapInputSide, setSwapInputSide] = useState<"from" | "to">("from");
  const [slippageBps, setSlippageBps] = useState("50");
  const [taxBps, setTaxBps] = useState("0");
  const [toolsTokenSymbols, setToolsTokenSymbols] = useState("PRJ");
  const [defaultDetailsOpen, setDefaultDetailsOpen] = useState(false);
  const [defaultSettingsOpen, setDefaultSettingsOpen] = useState(false);

  const enabledModuleKeys = MODULE_OPTIONS.filter((module) => modules[module.key]).map((module) => module.key);
  const resolvedDefaultModule = modules[defaultModule as DemoModuleKey]
    ? defaultModule
    : enabledModuleKeys[0] ?? "bridge";
  const swapFromToken = TOKEN_OPTIONS[swapFromSymbol];
  const swapToToken = TOKEN_OPTIONS[swapToSymbol];
  const swapPath = useMemo(
    () => [swapFromToken.address, swapToToken.address] as readonly Address[],
    [swapFromToken.address, swapToToken.address],
  );
  const toolsTokens = useMemo(() => parseTokenList(toolsTokenSymbols), [toolsTokenSymbols]);
  const toolsLinks = useMemo(() => parseToolLinks(DEFAULT_TOOLS_LINKS_CONFIG), []);
  const parsedSlippageBps = Number.parseInt(slippageBps, 10) || 50;
  const parsedTaxBps = Number.parseInt(taxBps, 10) || 0;
  const sdk = useMemo(
    () => {
      if (!wallet) return null;

      return EniSDK.init({
        wallet,
        language,
        widgets: {
          language,
          theme: {
            mode: themeMode,
            primaryColor,
            background: panelBackgroundColor,
            radius,
          },
          ui: {
            showToolbar,
            defaultModule: resolvedDefaultModule,
          },
          modules: {
            bridge: {
              enabled: modules.bridge,
              defaultAmount: bridgeAmount,
              defaultFromChainId: bridgeFromChainId,
              defaultToChainId: bridgeToChainId,
              tokenKey: bridgeTokenKey,
            },
            gas: {
              enabled: modules.gas,
              defaultAmount: gasAmount,
              defaultDirection: "usdt-to-egas",
              defaultGasless: gasDefaultGasless,
            },
            trade: {
              enabled: modules.trade,
              fromToken: swapFromToken,
              toToken: swapToToken,
              path: swapPath,
              defaultAmount: swapAmount,
              defaultInputSide: swapInputSide,
              defaultSlippageBps: parsedSlippageBps,
              defaultTaxBps: parsedTaxBps,
              defaultDetailsOpen,
              defaultSettingsOpen,
            },
            tools: {
              enabled: modules.tools,
              tokens: toolsTokens,
              links: toolsLinks,
            },
          },
        },
      });
    },
    [
      bridgeAmount,
      bridgeFromChainId,
      bridgeToChainId,
      bridgeTokenKey,
      defaultDetailsOpen,
      defaultSettingsOpen,
      gasAmount,
      gasDefaultGasless,
      language,
      modules.bridge,
      modules.gas,
      modules.tools,
      modules.trade,
      parsedSlippageBps,
      parsedTaxBps,
      panelBackgroundColor,
      primaryColor,
      radius,
      resolvedDefaultModule,
      showToolbar,
      swapAmount,
      swapFromToken,
      swapInputSide,
      swapPath,
      swapToToken,
      themeMode,
      toolsTokens,
      toolsLinks,
      wallet,
    ],
  );

  const sourceCode = useMemo(
    () =>
      createSourceExample({
        bridgeAmount,
        bridgeFromChainId,
        bridgeToChainId,
        bridgeTokenKey,
        defaultDetailsOpen,
        defaultModule: resolvedDefaultModule,
        defaultSettingsOpen,
        gasAmount,
        gasDefaultGasless,
        language,
        modules,
        panelBackgroundColor,
        primaryColor,
        radius,
        showToolbar,
        slippageBps: parsedSlippageBps,
        taxBps: parsedTaxBps,
        swapAmount,
        swapFromSymbol,
        swapInputSide,
        swapToSymbol,
        themeMode,
        toolsTokenSymbols,
      }),
    [
      bridgeAmount,
      bridgeFromChainId,
      bridgeToChainId,
      bridgeTokenKey,
      defaultDetailsOpen,
      defaultSettingsOpen,
      gasAmount,
      gasDefaultGasless,
      language,
      modules,
      parsedSlippageBps,
      parsedTaxBps,
      panelBackgroundColor,
      primaryColor,
      radius,
      resolvedDefaultModule,
      showToolbar,
      swapAmount,
      swapFromSymbol,
      swapInputSide,
      swapToSymbol,
      themeMode,
      toolsTokenSymbols,
    ],
  );

  useEffect(() => {
    function handlePopState() {
      setPage(getPageFromPathname());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPage: DemoPage) {
    const nextPath = nextPage === "customize" ? CUSTOMIZE_PATH : "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
    setPage(nextPage);
  }

  async function connectWallet() {
    setConnecting(true);
    setWalletError(null);
    try {
      const connected = await connectInjectedWallet();
      setAddress(connected.address);
      setWallet(connected.wallet);
    } catch (error) {
      setWallet(null);
      setAddress(null);
      setWalletError(error instanceof Error ? error.message : "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }

  function toggleModule(key: DemoModuleKey) {
    setModules((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleExpandedModule(key: DemoModuleKey) {
    setExpandedModules((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateThemeMode(mode: "light" | "dark") {
    setThemeMode(mode);
    setPanelBackgroundColor(mode === "dark" ? "#111318" : "#ffffff");
  }

  async function copySourceCode() {
    await navigator.clipboard.writeText(sourceCode);
    setSourceCopied(true);
    window.setTimeout(() => setSourceCopied(false), 1600);
  }

  const previewPanel = (
    <section className={`demo-preview${page === "home" ? " demo-preview--home" : ""}`} aria-label="Live widget preview">
      <div className="demo-panel-header">
        <div>
          <span>Live preview</span>
          <small>{address ? address : "Connect a wallet to initialize widgets"}</small>
        </div>
      </div>
      <div className="demo-preview__stage">
        {!sdk || !wallet ? (
          <div className="demo-empty demo-empty--wallet">
            <p>Connect a wallet to load the widget with your provider and address.</p>
            <button className="demo-primary-button" type="button" onClick={connectWallet} disabled={connecting}>
              {connecting ? "Connecting..." : "Connect wallet"}
            </button>
          </div>
        ) : enabledModuleKeys.length > 0 ? (
          <EniProvider sdk={sdk} wallet={wallet}>
            <EniWidgets onConnectWallet={connectWallet} />
          </EniProvider>
        ) : (
          <div className="demo-empty">Select at least one feature to preview the widget.</div>
        )}
      </div>
    </section>
  );

  return (
    <main className={`shell${page === "home" ? " shell--home" : ""}`}>
      <header className="topbar">
        <div>
          <h1>ENI Widgets</h1>
          <p>React integration demo</p>
        </div>
        <div className="topbar__actions">
          <button
            className="demo-secondary-button topbar__button"
            type="button"
            onClick={() => navigate(page === "customize" ? "home" : "customize")}
          >
            {page === "customize" ? "Home" : "Customize"}
          </button>
          <button className="demo-primary-button topbar__button" type="button" onClick={connectWallet} disabled={connecting}>
            {address ? "Wallet connected" : connecting ? "Connecting..." : "Connect wallet"}
          </button>
        </div>
      </header>

      {page === "home" ? (
        <div className="demo-home">{previewPanel}</div>
      ) : (
        <div className="demo-layout">
          <aside className="demo-config" aria-label="Widget configuration">
            <section className="demo-section">
              <div className="demo-section__header">
                <span>Global</span>
              </div>
              <label className="demo-field">
                <span>Language</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value as EniSdkLanguage)}>
                  <option value="auto">Auto</option>
                  <option value="english">English</option>
                  <option value="chinese">Chinese</option>
                </select>
              </label>
              <label className="demo-field">
                <span>Default tab</span>
                <select value={resolvedDefaultModule} onChange={(event) => setDefaultModule(event.target.value as EniSdkWidgetModule)}>
                  {MODULE_OPTIONS.map((module) => (
                    <option key={module.key} value={module.key}>
                      {module.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="demo-toggle">
                <input type="checkbox" checked={showToolbar} onChange={(event) => setShowToolbar(event.target.checked)} />
                <span>Show module toolbar</span>
              </label>
              <label className="demo-field">
                <span>Theme</span>
                <select value={themeMode} onChange={(event) => updateThemeMode(event.target.value as "light" | "dark")}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label className="demo-field">
                <span>Primary color</span>
                <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
              </label>
              <label className="demo-field">
                <span>Panel background</span>
                <input type="color" value={panelBackgroundColor} onChange={(event) => setPanelBackgroundColor(event.target.value)} />
              </label>
              <label className="demo-field">
                <span>Radius</span>
                <select value={radius} onChange={(event) => setRadius(event.target.value)}>
                  <option value="12px">Compact</option>
                  <option value="18px">Default</option>
                  <option value="24px">Soft</option>
                </select>
              </label>
            </section>

          <section className="demo-section">
            <div className="demo-section__header">
              <span>Features</span>
              <small>{enabledModuleKeys.length} enabled</small>
            </div>
            <div className="demo-module-list">
              {MODULE_OPTIONS.map((module) => (
                <article className="demo-module-card" key={module.key}>
                  <div className="demo-module-card__top">
                    <label className="demo-module-row">
                      <input
                        type="checkbox"
                        checked={modules[module.key]}
                        onChange={() => toggleModule(module.key)}
                      />
                      <span>
                        <strong>{module.label}</strong>
                        <small>{module.description}</small>
                      </span>
                    </label>
                    <button
                      className="demo-expand-button"
                      type="button"
                      aria-label={`${expandedModules[module.key] ? "Collapse" : "Expand"} ${module.label} settings`}
                      aria-expanded={expandedModules[module.key]}
                      onClick={() => toggleExpandedModule(module.key)}
                    >
                      {expandedModules[module.key] ? "−" : "+"}
                    </button>
                  </div>
                  {expandedModules[module.key] ? (
                    <ModuleSettings
                      moduleKey={module.key}
                      bridgeAmount={bridgeAmount}
                      bridgeFromChainId={bridgeFromChainId}
                      bridgeToChainId={bridgeToChainId}
                      bridgeTokenKey={bridgeTokenKey}
                      gasAmount={gasAmount}
                      gasDefaultGasless={gasDefaultGasless}
                      swapAmount={swapAmount}
                      swapFromSymbol={swapFromSymbol}
                      swapToSymbol={swapToSymbol}
                      swapInputSide={swapInputSide}
                      slippageBps={slippageBps}
                      taxBps={taxBps}
                      toolsTokenSymbols={toolsTokenSymbols}
                      defaultDetailsOpen={defaultDetailsOpen}
                      defaultSettingsOpen={defaultSettingsOpen}
                      onBridgeAmountChange={setBridgeAmount}
                      onBridgeFromChainIdChange={setBridgeFromChainId}
                      onBridgeToChainIdChange={setBridgeToChainId}
                      onBridgeTokenKeyChange={setBridgeTokenKey}
                      onGasAmountChange={setGasAmount}
                      onGasDefaultGaslessChange={setGasDefaultGasless}
                      onSwapAmountChange={setSwapAmount}
                      onSwapFromSymbolChange={setSwapFromSymbol}
                      onSwapToSymbolChange={setSwapToSymbol}
                      onSwapInputSideChange={setSwapInputSide}
                      onSlippageBpsChange={setSlippageBps}
                      onTaxBpsChange={setTaxBps}
                      onToolsTokenSymbolsChange={setToolsTokenSymbols}
                      onDefaultDetailsOpenChange={setDefaultDetailsOpen}
                      onDefaultSettingsOpenChange={setDefaultSettingsOpen}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </aside>

        {previewPanel}

        <section className="demo-source" aria-label="Generated source example">
          <div className="demo-panel-header">
            <div>
              <span>Source example</span>
              <small>Updates from the selected configuration</small>
            </div>
            <button className="demo-copy-button" type="button" onClick={copySourceCode}>
              {sourceCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre><code>{sourceCode}</code></pre>
        </section>
      </div>
      )}

      {walletError ? <p className="note note--error">{walletError}</p> : null}
    </main>
  );
}

function getPageFromPathname(): DemoPage {
  if (typeof window === "undefined") return "home";
  return window.location.pathname === CUSTOMIZE_PATH ? "customize" : "home";
}

interface ModuleSettingsProps {
  moduleKey: DemoModuleKey;
  bridgeAmount: string;
  bridgeFromChainId: string;
  bridgeToChainId: string;
  bridgeTokenKey: string;
  gasAmount: string;
  gasDefaultGasless: boolean;
  swapAmount: string;
  swapFromSymbol: TokenSymbol;
  swapToSymbol: TokenSymbol;
  swapInputSide: "from" | "to";
  slippageBps: string;
  taxBps: string;
  toolsTokenSymbols: string;
  defaultDetailsOpen: boolean;
  defaultSettingsOpen: boolean;
  onBridgeAmountChange: (value: string) => void;
  onBridgeFromChainIdChange: (value: string) => void;
  onBridgeToChainIdChange: (value: string) => void;
  onBridgeTokenKeyChange: (value: string) => void;
  onGasAmountChange: (value: string) => void;
  onGasDefaultGaslessChange: (value: boolean) => void;
  onSwapAmountChange: (value: string) => void;
  onSwapFromSymbolChange: (value: TokenSymbol) => void;
  onSwapToSymbolChange: (value: TokenSymbol) => void;
  onSwapInputSideChange: (value: "from" | "to") => void;
  onSlippageBpsChange: (value: string) => void;
  onTaxBpsChange: (value: string) => void;
  onToolsTokenSymbolsChange: (value: string) => void;
  onDefaultDetailsOpenChange: (value: boolean) => void;
  onDefaultSettingsOpenChange: (value: boolean) => void;
}

function ModuleSettings(props: ModuleSettingsProps) {
  if (props.moduleKey === "bridge") {
    return (
      <div className="demo-module-card__settings">
        <DemoTextField label="Amount" value={props.bridgeAmount} onChange={props.onBridgeAmountChange} />
        <DemoTextField label="From chain" value={props.bridgeFromChainId} onChange={props.onBridgeFromChainIdChange} />
        <DemoTextField label="To chain" value={props.bridgeToChainId} onChange={props.onBridgeToChainIdChange} />
        <DemoTextField label="Token key" value={props.bridgeTokenKey} onChange={props.onBridgeTokenKeyChange} />
      </div>
    );
  }

  if (props.moduleKey === "gas") {
    return (
      <div className="demo-module-card__settings">
        <DemoTextField label="Amount" value={props.gasAmount} onChange={props.onGasAmountChange} />
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={props.gasDefaultGasless}
            onChange={(event) => props.onGasDefaultGaslessChange(event.target.checked)}
          />
          <span>{"Default gas sponsorship USDT -> EGAS"}</span>
        </label>
        <p className="demo-module-note">Gas sponsorship is only available for ENI-Peg USDT to EGAS and deducts a 1 EGAS fee after execution.</p>
      </div>
    );
  }

  if (props.moduleKey === "trade") {
    return (
      <div className="demo-module-card__settings">
        <DemoTextField label="Amount" value={props.swapAmount} onChange={props.onSwapAmountChange} />
        <DemoTokenField label="From token" value={props.swapFromSymbol} onChange={props.onSwapFromSymbolChange} />
        <DemoTokenField label="To token" value={props.swapToSymbol} onChange={props.onSwapToSymbolChange} />
        <label className="demo-field">
          <span>Input side</span>
          <select value={props.swapInputSide} onChange={(event) => props.onSwapInputSideChange(event.target.value as "from" | "to")}>
            <option value="from">Exact in</option>
            <option value="to">Exact out</option>
          </select>
        </label>
        <DemoTextField label="Slippage bps" value={props.slippageBps} onChange={props.onSlippageBpsChange} />
        <DemoTextField label="Tax bps" value={props.taxBps} onChange={props.onTaxBpsChange} />
        <label className="demo-toggle">
          <input type="checkbox" checked={props.defaultDetailsOpen} onChange={(event) => props.onDefaultDetailsOpenChange(event.target.checked)} />
          <span>Details open</span>
        </label>
        <label className="demo-toggle">
          <input type="checkbox" checked={props.defaultSettingsOpen} onChange={(event) => props.onDefaultSettingsOpenChange(event.target.checked)} />
          <span>Settings open</span>
        </label>
      </div>
    );
  }

  return (
    <div className="demo-module-card__settings">
      <DemoTextField label="Wallet tokens" value={props.toolsTokenSymbols} onChange={props.onToolsTokenSymbolsChange} />
      <p className="demo-module-note">Comma-separated token symbols from the demo token registry. USDT is always shown first.</p>
    </div>
  );
}

function DemoTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="demo-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DemoTokenField({ label, value, onChange }: { label: string; value: TokenSymbol; onChange: (value: TokenSymbol) => void }) {
  return (
    <label className="demo-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as TokenSymbol)}>
        {Object.keys(TOKEN_OPTIONS).map((symbol) => (
          <option key={symbol} value={symbol}>
            {symbol}
          </option>
        ))}
      </select>
    </label>
  );
}

function parseTokenList(value: string): readonly TokenInput[] {
  return value
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .map((symbol) => TOKEN_OPTIONS[symbol as TokenSymbol])
    .filter(Boolean);
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
      ? `      bridge: {
        enabled: true,
        defaultAmount: "${config.bridgeAmount}",
        defaultFromChainId: "${config.bridgeFromChainId}",
        defaultToChainId: "${config.bridgeToChainId}",
        tokenKey: "${config.bridgeTokenKey}",
      },`
      : `      bridge: { enabled: false },`,
    config.modules.gas
      ? `      gas: {
        enabled: true,
        defaultAmount: "${config.gasAmount}",
        defaultDirection: "usdt-to-egas",
        defaultGasless: ${config.gasDefaultGasless},
      },`
      : `      gas: { enabled: false },`,
    config.modules.trade
      ? `      trade: {
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
      : `      trade: { enabled: false },`,
    config.modules.tools
      ? `      tools: {
        enabled: true,
        tokens: [${toolTokenRefs}],
        links: toolLinks,
      },`
      : `      tools: { enabled: false },`,
  ].join("\n");

  return `import { useMemo } from "react";
import { ENI_TOKENS, EniSDK, createEip1193WalletAdapter } from "@eni-chain/app-sdk";
import type { Eip1193Provider } from "@eni-chain/app-sdk";
import { EniProvider, EniWidgets } from "@eni-chain/app-sdk-widgets-react";
import "@eni-chain/app-sdk-widgets-react/styles.css";

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

interface AppProps {
  provider: Eip1193Provider | null;
  onConnectWallet: () => void | Promise<void>;
}

export function App({ provider, onConnectWallet }: AppProps) {
  // Get provider from your wallet layer, such as wagmi, RainbowKit, or a custom connector.
  const wallet = useMemo(() => provider ? createEip1193WalletAdapter(provider) : null, [provider]);
  const eni = useMemo(() => {
    // Initialize widgets once the wallet provider is ready.
    if (!wallet) return null;

    return EniSDK.init({
      wallet,
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
  }, [wallet]);

  if (!eni || !wallet) {
    return <button type="button" onClick={onConnectWallet}>Connect wallet</button>;
  }

  return (
    <EniProvider sdk={eni} wallet={wallet}>
      <EniWidgets onConnectWallet={onConnectWallet} />
    </EniProvider>
  );
}`;
}

function formatSourceTokenReference(symbol: TokenSymbol): string {
  if (symbol === "PRJ") return "projectToken";
  return `ENI_TOKENS.mainnet.${symbol.toLowerCase()}`;
}
