import { describe, expect, test } from "bun:test";

import {
  getAvailableProviders,
  getQuoteSteps,
  getRecommendedProvider,
  type QuoteResponse,
} from "./bridge-api";

const orbiterStep = {
  action: "bridge",
  tx: {
    to: "0x1111111111111111111111111111111111111111",
    data: "0x01",
    value: "0",
    chainId: 56,
  },
};

const hyperlaneStep = {
  action: "bridge",
  tx: {
    to: "0x2222222222222222222222222222222222222222",
    data: "0x02",
    value: "0",
    chainId: 56,
  },
};

const quoteResp: QuoteResponse = {
  status: "success",
  message: "ok",
  result: {
    fees: {},
    steps: [orbiterStep],
    details: {},
  },
  ext: {
    selection: {
      recommendedProvider: "orbiter",
      providerOrder: ["orbiter", "hyperlane"],
      visibleProviders: [
        { providerId: "orbiter", visible: true, reasons: [] },
        { providerId: "hyperlane", visible: true, reasons: [] },
      ],
    },
    providerQuotes: {
      orbiter: {
        providerId: "orbiter",
        hasQuote: true,
        quote: {
          status: "success",
          message: "ok",
          result: {
            steps: [orbiterStep],
          },
        },
      },
      hyperlane: {
        providerId: "hyperlane",
        hasQuote: true,
        quote: {
          status: "success",
          message: "ok",
          result: {
            steps: [hyperlaneStep],
          },
        },
      },
    },
  },
};

describe("bridge api quote helpers", () => {
  test("parses recommended and available providers from the quote response", () => {
    expect(getRecommendedProvider(quoteResp)).toBe("orbiter");
    expect(getAvailableProviders(quoteResp).map((provider) => provider.providerId)).toEqual([
      "orbiter",
      "hyperlane",
    ]);
  });

  test("parses steps for the selected provider and falls back to top-level steps", () => {
    expect(getQuoteSteps(quoteResp)).toEqual([orbiterStep]);
    expect(getQuoteSteps(quoteResp, "hyperlane")).toEqual([hyperlaneStep]);
  });

  test("uses provider quote metadata when selection visibility is absent", () => {
    const responseWithoutVisibleProviders: QuoteResponse = {
      ...quoteResp,
      ext: {
        selection: {
          recommendedProvider: null,
          visibleProviders: [],
        },
        providerQuotes: {
          hyperlane: quoteResp.ext?.providerQuotes?.hyperlane,
        },
      },
    };

    expect(
      getAvailableProviders(responseWithoutVisibleProviders).map((provider) => provider.providerId),
    ).toEqual(["hyperlane"]);
    expect(getRecommendedProvider(responseWithoutVisibleProviders)).toBe("hyperlane");
  });
});
