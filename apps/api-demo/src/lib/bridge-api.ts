export type ChainId = string;
export type Address = `0x${string}`;
export type Hex = `0x${string}`;
export type DecimalAmount = string;

export type BridgeProviderId = "orbiter" | "hyperlane";

export type ProviderVisibility = {
  providerId: BridgeProviderId;
  visible: boolean;
  reasons: Array<{ code: string; message?: string }>;
  amountRange?: {
    minAmount: string;
    maxAmount: string | null;
    maxAmountUnlimited?: boolean;
  };
  liquidity?: {
    currentBalance: string | null;
    requiredBalance: string | null;
    decimals?: number;
    sufficient?: boolean;
  };
};

type ChainIdInput = ChainId | number;

export type RouteInput = {
  fromChain?: ChainIdInput;
  toChain?: ChainIdInput;
  tokenSymbol?: string;
  sourceChainId?: ChainIdInput;
  destChainId?: ChainIdInput;
  tokenKey?: string;
};

export type BridgeResolveRequest = RouteInput & {
  amount: DecimalAmount;
  // Resolve-only hint for route explanation. The quote helper intentionally omits provider override params.
  currentProvider?: BridgeProviderId;
};

export type BridgeRulesContext = {
  amount: string;
  orbiterCheckAmount: string;
  isEniToBscUsdt: boolean;
  isBscToEni: boolean;
  tokenKey: string;
};

export type ResolveBridgeResponse = {
  routeGroupId: string | null;
  sourceChainId: ChainId;
  destChainId: ChainId;
  tokenKey: string;
  recommendedProvider: BridgeProviderId | null;
  priorityRank: Partial<Record<BridgeProviderId, number>>;
  providerOrder?: BridgeProviderId[];
  visibleProviders: ProviderVisibility[];
  hiddenProviders?: ProviderVisibility[];
  reasonCodes?: string[];
  rulesContext: BridgeRulesContext;
  tokensByProvider?: Record<
    string,
    {
      fromToken: string;
      toToken: string;
    }
  >;
};

export type BridgeProviderQuoteResult = {
  fees?: Record<string, unknown>;
  steps?: BridgeApiTransactionStep[];
  details?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProviderQuotePayload = {
  status?: string;
  message?: string;
  result?: BridgeProviderQuoteResult | null;
  [key: string]: unknown;
};

export type ProviderQuoteState = {
  providerId: BridgeProviderId;
  quote: ProviderQuotePayload | null;
  hasQuote: boolean;
  error?: string;
  validationSkipped?: boolean;
  maintenance?: unknown;
};

export type BridgeQuoteRequest = RouteInput & {
  amount: DecimalAmount;
  userAddress: Address;
  targetRecipient?: Address;
  slippage?: number | string;
};

export type BridgeApiTransactionStep = {
  action: string;
  tx: {
    to: string;
    data: string;
    value: string;
    chainId?: ChainId | number | bigint;
  };
};

export type QuoteStep = BridgeApiTransactionStep;

export type QuoteBridgeApiResponse = {
  status: string;
  message: string;
  result: {
    fees: Record<string, unknown>;
    steps: QuoteStep[];
    details: Record<string, unknown>;
  } | null;
  ext?: {
    selection?: ResolveBridgeResponse;
    providerQuotes?: Record<string, ProviderQuoteState | undefined>;
    rulesContext?: BridgeRulesContext;
  };
};

export type QuoteResponse = QuoteBridgeApiResponse;

export type AvailableProvider = ProviderVisibility & {
  quote: ProviderQuotePayload | null;
  hasQuote: boolean;
  error?: string;
  validationSkipped?: boolean;
  maintenance?: unknown;
};

export type BridgeRecord = {
  protocol: BridgeProviderId;
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

export type BridgeChainDirectory = {
  chainId: ChainId;
  chainName?: string;
  name?: string;
  vm?: string;
  rpc?: string[];
  explorers?: Array<{
    name?: string;
    url?: string;
  }>;
  nativeCurrency?: {
    name?: string;
    symbol: string;
    decimals: number;
    coinKey?: string;
    address?: string;
  };
  tokens?: BridgeChainToken[];
  logo?: string;
  contract?: Record<string, string>;
};

export type BridgeChainToken = {
  tokenKey: string;
  address: string;
  decimals: number;
  symbol: string;
  name?: string;
  chainId: ChainId;
  logoURI?: string;
  originalTokenAddress?: string;
  originalTokenDecimals?: number;
  noWrap?: boolean;
  providerTokenMap?: Record<string, BridgeProviderToken>;
};

export type BridgeProviderToken = {
  address: string;
  decimals: number;
  symbol: string;
  name?: string;
  chainId: ChainId;
  logoURI?: string;
  originalTokenAddress?: string;
  originalTokenDecimals?: number;
  noWrap?: boolean;
};

export type BridgeRouter = {
  srcChain: ChainId;
  tgtChain: ChainId;
  srcToken: string;
  tgtToken: string;
  state: string;
  minAmt: string;
  maxAmt: string | null;
  maxAmtUnlimited?: boolean;
  midTokenSymbol: string;
  providerId: BridgeProviderId;
  tokenKey: string;
  routeGroupId: string;
  providerTokenMap?: Record<
    string,
    {
      fromToken: string;
      toToken: string;
    }
  >;
  [key: string]: unknown;
};

export type BridgeRecordsRequest = {
  user: Address;
  page?: number;
  limit?: number;
  assetSymbol?: string;
};

export type BridgeRecordsPayload = {
  list: BridgeRecord[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type BridgeRecordsResponse = {
  code: number;
  msg: string;
  data: BridgeRecordsPayload | null;
};

export type BridgeApiEnvelope<T> = {
  status?: string;
  message?: string;
  result: T;
};

export type BridgeRoutersParams = Partial<RouteInput>;

export type BridgeApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

export type BridgeApiClient = {
  chains: () => Promise<BridgeChainDirectory[]>;
  routers: (params?: BridgeRoutersParams) => Promise<BridgeRouter[]>;
  resolve: (body: BridgeResolveRequest) => Promise<ResolveBridgeResponse | null>;
  quote: (body: BridgeQuoteRequest) => Promise<QuoteResponse>;
  records: (params: BridgeRecordsRequest) => Promise<BridgeRecordsPayload>;
};

const DEFAULT_BRIDGE_API_BASE_URL = "https://bridge-api.eniac.network";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function isBridgeProviderId(value: string): value is BridgeProviderId {
  return value === "orbiter" || value === "hyperlane";
}

function getRuntimeEnv(name: string) {
  const runtime = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[name];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function normalizeRouteInput(params: RouteInput) {
  const sourceChainId = params.sourceChainId ?? params.fromChain;
  const destChainId = params.destChainId ?? params.toChain;
  const tokenKey = params.tokenKey ?? params.tokenSymbol;

  if (sourceChainId === undefined) {
    throw new Error("sourceChainId or fromChain is required");
  }
  if (destChainId === undefined) {
    throw new Error("destChainId or toChain is required");
  }
  if (!tokenKey) {
    throw new Error("tokenKey or tokenSymbol is required");
  }

  return {
    sourceChainId: String(sourceChainId),
    destChainId: String(destChainId),
    tokenKey,
  };
}

async function requestJson<T>(
  baseUrl: string,
  fetchImpl: FetchLike,
  path: string,
  init?: RequestInit,
) {
  const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bridge API HTTP ${response.status}: ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

export function createBridgeApiClient(options: BridgeApiClientOptions = {}): BridgeApiClient {
  const baseUrl =
    options.baseUrl || getRuntimeEnv("BRIDGE_API_BASE_URL") || DEFAULT_BRIDGE_API_BASE_URL;
  const fetchImpl = options.fetchImpl || fetch;

  return {
    chains: async () => {
      const data = await requestJson<BridgeApiEnvelope<BridgeChainDirectory[]>>(
        baseUrl,
        fetchImpl,
        "/v1/bridge/chains",
      );
      return data.result || [];
    },

    routers: async (params: BridgeRoutersParams = {}) => {
      const search = new URLSearchParams();
      const sourceChainId = params.sourceChainId ?? params.fromChain;
      const destChainId = params.destChainId ?? params.toChain;
      const tokenKey = params.tokenKey ?? params.tokenSymbol;
      if (sourceChainId !== undefined) search.set("sourceChainId", String(sourceChainId));
      if (destChainId !== undefined) search.set("destChainId", String(destChainId));
      if (tokenKey) search.set("tokenKey", tokenKey);

      const suffix = search.toString() ? `?${search.toString()}` : "";
      const data = await requestJson<BridgeApiEnvelope<BridgeRouter[]>>(
        baseUrl,
        fetchImpl,
        `/v1/bridge/routers${suffix}`,
      );
      return data.result || [];
    },

    resolve: async (body: BridgeResolveRequest) => {
      const route = normalizeRouteInput(body);
      const data = await requestJson<BridgeApiEnvelope<ResolveBridgeResponse | null>>(
        baseUrl,
        fetchImpl,
        "/v1/bridge/resolve",
        {
          method: "POST",
          body: JSON.stringify({
            ...route,
            amount: body.amount,
            currentProvider: body.currentProvider,
          }),
        },
      );
      return data.result;
    },

    quote: async (body: BridgeQuoteRequest) => {
      const route = normalizeRouteInput(body);
      return requestJson<QuoteResponse>(baseUrl, fetchImpl, "/v1/bridge/quote", {
        method: "POST",
        body: JSON.stringify({
          ...route,
          amount: body.amount,
          userAddress: body.userAddress,
          targetRecipient: body.targetRecipient,
          slippage: body.slippage,
        }),
      });
    },

    records: async (params: BridgeRecordsRequest) => {
      const search = new URLSearchParams({
        user: params.user,
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 20),
      });
      if (params.assetSymbol) {
        search.set("assetSymbol", params.assetSymbol);
      }

      const response = await requestJson<BridgeRecordsResponse>(
        baseUrl,
        fetchImpl,
        `/v1/bridge/records?${search.toString()}`,
      );

      if (response.code !== 0 || !response.data) {
        throw new Error(response.msg || "Bridge records query failed");
      }

      return response.data;
    },
  };
}

export function getRecommendedProvider(quote: QuoteResponse) {
  const recommendedProvider = quote.ext?.selection?.recommendedProvider;
  return recommendedProvider ?? getAvailableProviders(quote)[0]?.providerId ?? null;
}

export function getAvailableProviders(quote: QuoteResponse): AvailableProvider[] {
  const selection = quote.ext?.selection;
  const visibleProviders = selection?.visibleProviders ?? [];
  const providerQuotes = quote.ext?.providerQuotes ?? {};
  const orderedProviderIds = [
    ...(selection?.providerOrder ?? []),
    ...visibleProviders.map((provider) => provider.providerId),
    ...Object.values(providerQuotes)
      .map((providerQuote) => providerQuote?.providerId)
      .filter((providerId): providerId is BridgeProviderId => Boolean(providerId)),
    ...Object.keys(providerQuotes).filter(isBridgeProviderId),
  ].filter((providerId, index, allProviderIds) => allProviderIds.indexOf(providerId) === index);

  return orderedProviderIds
    .map((providerId): AvailableProvider | null => {
      const visibility = visibleProviders.find((provider) => provider.providerId === providerId);
      const providerQuote = providerQuotes[providerId];
      if (!visibility && !providerQuote?.hasQuote) {
        return null;
      }

      return {
        providerId,
        visible: visibility?.visible ?? true,
        reasons: visibility?.reasons ?? [],
        amountRange: visibility?.amountRange,
        liquidity: visibility?.liquidity,
        quote: providerQuote?.quote ?? null,
        hasQuote: providerQuote?.hasQuote ?? Boolean(providerQuote?.quote?.result?.steps?.length),
        error: providerQuote?.error,
        validationSkipped: providerQuote?.validationSkipped,
        maintenance: providerQuote?.maintenance,
      };
    })
    .filter((provider): provider is AvailableProvider => provider !== null);
}

export function getProviderQuote(quote: QuoteResponse, providerId: BridgeProviderId) {
  return quote.ext?.providerQuotes?.[providerId] ?? null;
}

export function getQuoteSteps(quote: QuoteResponse, providerId?: BridgeProviderId) {
  if (!providerId) {
    return quote.result?.steps ?? [];
  }

  const providerSteps = getProviderQuote(quote, providerId)?.quote?.result?.steps;
  if (providerSteps && providerSteps.length > 0) {
    return providerSteps;
  }

  return providerId === getRecommendedProvider(quote) ? (quote.result?.steps ?? []) : [];
}
