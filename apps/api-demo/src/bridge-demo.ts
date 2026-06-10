import {
  createBridgeApiClient,
  getAvailableProviders,
  getQuoteSteps,
  getRecommendedProvider,
  type QuoteStep,
} from "./lib";

async function main() {
  const bridgeAPI = createBridgeApiClient();

  const fromChain = 56;
  const toChain = 173;
  const tokenSymbol = "USDT";
  const amount = "1";
  const userAddress = "0x1234567890abcdef1234567890abcdef12345678";
  const targetRecipient = userAddress;

  // 1. Request a quote. The bridge API returns the recommended provider,
  // available providers, fees, and executable transaction steps.
  // targetRecipient is optional. If omitted, the API uses userAddress as the recipient.
  const quoteResp = await bridgeAPI.quote({
    fromChain,
    toChain,
    tokenSymbol,
    amount,
    userAddress,
    targetRecipient,
  });

  // 2. Show the recommended route and all currently available routes.
  // In a real app, render these providers and let the user choose one.
  const recommendedProvider = getRecommendedProvider(quoteResp);
  const availableProviders = getAvailableProviders(quoteResp);

  printJson("route selection", {
    route: `${fromChain} -> ${toChain}`,
    tokenSymbol,
    amount,
    recommendedProvider,
    availableProviders: availableProviders.map((provider) => ({
      providerId: provider.providerId,
      reasons: provider.reasons.map((reason) => reason.code),
      amountRange: provider.amountRange,
      liquidity: provider.liquidity,
    })),
  });

  // 3. Read the transaction steps for the selected provider.
  // The top-level quote result contains the steps selected by the API.
  const selectedProvider = recommendedProvider || availableProviders[0]?.providerId || null;
  const selectedSteps = getQuoteSteps(quoteResp);

  printJson("selected route steps", {
    selectedProvider,
    steps: selectedSteps.map(summarizeStep),
  });

  // 4. Execute the steps in order in your wallet layer.
  // For EVM wallets, each step.tx can be sent with eth_sendTransaction.
  for (const step of selectedSteps) {
    printJson(`wallet transaction: ${step.action}`, step.tx);
  }

  // 5. Query bridge history for the user after execution or on page load.
  const records = await bridgeAPI.records({
    user: userAddress,
    page: 1,
    limit: 5,
    assetSymbol: tokenSymbol,
  });

  printJson("recent bridge records", {
    total: records.total,
    hasMore: records.hasMore,
    list: records.list.map((record) => ({
      protocol: record.protocol,
      direction: record.direction,
      status: record.status,
      route: `${record.sourceChainId || "?"} -> ${record.targetChainId || "?"}`,
      amount: `${record.sourceAmount || "0"} ${record.assetSymbol}`,
      sourceTxHash: record.sourceTxHash,
      targetTxHash: record.targetTxHash,
      time: record.time,
    })),
  });
}

function printJson(title: string, value: unknown) {
  console.log(`\n${title}`);
  console.log(JSON.stringify(value, null, 2));
}

function summarizeStep(step: QuoteStep, index: number) {
  return {
    index: index + 1,
    action: step.action,
    to: step.tx.to,
    value: step.tx.value,
    chainId: step.tx.chainId,
    dataPreview: `${step.tx.data.slice(0, 18)}...${step.tx.data.slice(-10)}`,
  };
}

function setExitCode(code: number) {
  const runtime = globalThis as unknown as {
    process?: { exitCode?: number };
  };
  if (runtime.process) {
    runtime.process.exitCode = code;
  }
}

main().catch((error) => {
  console.error(error);
  setExitCode(1);
});
