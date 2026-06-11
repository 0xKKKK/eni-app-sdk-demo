import { createEniClient, selectBridgeProviderQuote } from "@eni-chain/app-sdk";
import type { Address } from "@eni-chain/app-sdk";

const eni = createEniClient();

const fromChain = "56";
const toChain = "173";
const tokenSymbol = "USDT";
const amount = "1";
const userAddress = "0x1234567890abcdef1234567890abcdef12345678" as Address;

/**
 * 1. Quote
 *
 * Request a bridge quote.
 */
const quoteResp = await eni.bridge.quote({
  sourceChainId: fromChain,
  destChainId: toChain,
  tokenKey: tokenSymbol,
  amount,
  userAddress,
});

console.log("Recommended provider:", quoteResp.selectedProvider);
console.log("Available providers:", quoteResp.selection.providerOrder);

const recommendedProviderQuote = quoteResp.providerQuotes[quoteResp.selectedProvider]?.quote;
const allProviderQuotes = quoteResp.selection.providerOrder
  .map((providerId) => quoteResp.providerQuotes[providerId])
  .filter((providerQuote) => providerQuote !== undefined);

/**
 * 2. Execute
 *
 * You can use the recommended route directly with quoteResp.selectedProvider /
 * recommendedProviderQuote, or render allProviderQuotes in your UI and let the
 * user choose one provider.
 *
 * selectBridgeProviderQuote turns the selected provider quote into an executable
 * quote. In a browser app, pass executableQuote to executeBridgeQuote and execute
 * its normalized steps with the connected wallet.
 */
const userSelectedProvider = allProviderQuotes[0]?.providerId;
if (!userSelectedProvider) {
  throw new Error("No bridge provider quotes returned");
}

const executableQuote = selectBridgeProviderQuote(quoteResp, userSelectedProvider);

console.log("Recommended provider quote:", recommendedProviderQuote);
console.log("All provider quotes:", allProviderQuotes);
console.log("Raw bridge API response:", quoteResp.raw);
console.log("User selected provider:", userSelectedProvider);
console.log("Executable provider:", executableQuote.selectedProvider);

console.log(
  "Bridge steps:",
  executableQuote.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    chainId: step.chainId,
    label: step.label,
    to: step.request?.to,
    data: step.request?.data,
    value: step.request?.value.toString(),
  })),
);

/**
 * 3. Records
 *
 * Query bridge records after execution or on page load to show recent bridge
 * history for the current user.
 */
const recordsResp = await eni.bridge.records({
  user: userAddress,
  page: 1,
  limit: 10,
  assetSymbol: tokenSymbol,
});

if (recordsResp.code !== 0 || !recordsResp.data) {
  console.warn("Bridge records query failed:", recordsResp.msg);
} else {
  console.log(
    "Recent bridge records:",
    recordsResp.data.list.map((record) => ({
      protocol: record.protocol,
      direction: record.direction,
      status: record.status,
      route: `${record.sourceChainId || "?"} -> ${record.targetChainId || "?"}`,
      amount: `${record.sourceAmount || "0"} ${record.assetSymbol}`,
      sourceTxHash: record.sourceTxHash,
      targetTxHash: record.targetTxHash,
      time: record.time,
    })),
  );
}
