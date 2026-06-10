import { createEniClient } from "@eni-chain/app-sdk";
import type { Address } from "@eni-chain/app-sdk";

const eni = createEniClient();

const fromChain = "56";
const toChain = "173";
const tokenSymbol = "USDT";
const amount = "1";
const userAddress = "0x1234567890abcdef1234567890abcdef12345678" as Address;

const quote = await eni.bridge.quote({
  sourceChainId: fromChain,
  destChainId: toChain,
  tokenKey: tokenSymbol,
  amount,
  userAddress,
  // targetRecipient is optional. Omit it when the recipient is the same as userAddress.
});

// Show the recommended route first, then show all available routes for user selection.
console.log("Recommended provider:", quote.selectedProvider);
console.log("Available providers:", quote.selection.providerOrder);

type ProviderQuoteWithSteps = {
  result?: {
    steps?: unknown[];
  };
};

const recommendedProviderQuote = quote.providerQuotes[quote.selectedProvider]?.quote;
const allProviderQuotes = quote.providerQuotes;

// quote.steps is the normalized SDK steps for the recommended route.
// If your UI lets the user choose a provider, you can also read that provider's raw quote steps.
const userSelectedProvider = quote.selection.providerOrder[0];
const userSelectedProviderQuote = userSelectedProvider
  ? (quote.providerQuotes[userSelectedProvider]?.quote as ProviderQuoteWithSteps | null | undefined)
  : undefined;
const userSelectedProviderSteps = userSelectedProviderQuote?.result?.steps;

console.log("Recommended provider quote:", recommendedProviderQuote);
console.log("All provider quotes:", allProviderQuotes);
console.log("User selected provider steps:", userSelectedProviderSteps);

// After the user selects a route, execute every returned step with the connected wallet.
// In a browser app, call executeBridgeQuote({ quote, wallet }) after user confirmation.
console.log(
  "Bridge steps:",
  quote.steps.map((step) => ({
    id: step.id,
    kind: step.kind,
    chainId: step.chainId,
    label: step.label,
    to: step.request?.to,
    data: step.request?.data,
    value: step.request?.value.toString(),
  })),
);
