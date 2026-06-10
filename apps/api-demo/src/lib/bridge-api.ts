type BridgeProviderId = "orbiter" | "hyperlane";

type ProviderVisibility = {
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

type ChainIdInput = string | number;

type RouteInput = {
  fromChain?: ChainIdInput;
  toChain?: ChainIdInput;
  tokenSymbol?: string;
  sourceChainId?: ChainIdInput;
  destChainId?: ChainIdInput;
  tokenKey?: string;
};

type ResolveRequest = RouteInput & {
  amount: string;
  currentProvider?: BridgeProviderId;
};

type QuoteSelection = {
  recommendedProvider: BridgeProviderId | null;
  visibleProviders: ProviderVisibility[];
};

type QuoteRequest = ResolveRequest & {
  userAddress: string;
  targetRecipient?: string;
  slippage?: number | string;
};

export type QuoteStep = {
  action: string;
  tx: {
    to: string;
    data: string;
    value: string;
    chainId?: number;
  };
};

export type QuoteResponse = {
  status: string;
  message: string;
  result: {
    fees?: Record<string, string | number | undefined>;
    steps: QuoteStep[];
    details?: Record<string, unknown>;
  } | null;
  ext?: {
    selection?: QuoteSelection;
    providerQuotes?: Record<string, unknown>;
    rulesContext?: Record<string, unknown>;
  };
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

type BridgeRecordsRequest = {
  user: string;
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

type BridgeRecordsResponse = {
  code: number;
  msg: string;
  data: BridgeRecordsPayload | null;
};

type ApiEnvelope<T> = {
  result: T;
};

type BridgeApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

const DEFAULT_BRIDGE_API_BASE_URL = "https://bridge-api.eniac.network";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

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

export function createBridgeApiClient(options: BridgeApiClientOptions = {}) {
  const baseUrl =
    options.baseUrl || getRuntimeEnv("BRIDGE_API_BASE_URL") || DEFAULT_BRIDGE_API_BASE_URL;
  const fetchImpl = options.fetchImpl || fetch;

  return {
    chains: async () => {
      const data = await requestJson<ApiEnvelope<unknown[]>>(
        baseUrl,
        fetchImpl,
        "/v1/bridge/chains",
      );
      return data.result || [];
    },

    routers: async (params: Partial<RouteInput> = {}) => {
      const search = new URLSearchParams();
      const sourceChainId = params.sourceChainId ?? params.fromChain;
      const destChainId = params.destChainId ?? params.toChain;
      const tokenKey = params.tokenKey ?? params.tokenSymbol;
      if (sourceChainId !== undefined) search.set("sourceChainId", String(sourceChainId));
      if (destChainId !== undefined) search.set("destChainId", String(destChainId));
      if (tokenKey) search.set("tokenKey", tokenKey);

      const suffix = search.toString() ? `?${search.toString()}` : "";
      const data = await requestJson<ApiEnvelope<unknown[]>>(
        baseUrl,
        fetchImpl,
        `/v1/bridge/routers${suffix}`,
      );
      return data.result || [];
    },

    resolve: async (body: ResolveRequest) => {
      const route = normalizeRouteInput(body);
      const data = await requestJson<ApiEnvelope<unknown>>(
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

    quote: async (body: QuoteRequest) => {
      const route = normalizeRouteInput(body);
      return requestJson<QuoteResponse>(baseUrl, fetchImpl, "/v1/bridge/quote", {
        method: "POST",
        body: JSON.stringify({
          ...route,
          amount: body.amount,
          userAddress: body.userAddress,
          targetRecipient: body.targetRecipient,
          currentProvider: body.currentProvider,
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
  return quote.ext?.selection?.recommendedProvider ?? null;
}

export function getAvailableProviders(quote: QuoteResponse) {
  return quote.ext?.selection?.visibleProviders ?? [];
}

export function getQuoteSteps(quote: QuoteResponse) {
  return quote.result?.steps ?? [];
}
