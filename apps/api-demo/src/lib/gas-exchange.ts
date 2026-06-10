import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const GAS_EXCHANGE_DEPLOYMENTS = {
  mainnet: {
    chainId: 173,
    chainName: "ENI Mainnet",
    rpcUrl: "https://rpc.eniac.network/",
    gasExchange: "0x37CCd90ed5FA96207B41C4fBCB90b883e30e63DC",
    eniPegUsdt: "0xDC1a8A35b0BaA3229b13f348ED708a2fd50b5e3a",
    orbiterUsdt: "0x47c98f74dBC1acc4cf2e04C4a729E22379EF4373",
    hyperlaneUsdt: "0x545E289B88c6d97b74eC0B96e308cae46Bf5f832",
  },
  testnet: {
    chainId: 174,
    chainName: "ENI Testnet",
    rpcUrl: "https://rpc-testnet.eniac.network/",
    gasExchange: "0x9ff6b6F822AB2e511980FCf6aBea11C69E0539C5",
    eniPegUsdt: "0xBaD8a472D4c42849b8E92fD983f7AA6Db385E1D0",
    orbiterUsdt: "0x11DebaaF02cBEE6Fc6c84988b03dC65D85Ba8768",
    hyperlaneUsdt: undefined,
  },
} as const;

export type GasExchangeNetwork = keyof typeof GAS_EXCHANGE_DEPLOYMENTS;

export type GasExchangeTransaction = {
  action: "approve" | "exchange" | "exchangeWithPermit";
  to: Address;
  data: Hex;
  value: bigint;
};

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const gasExchangeAbi = [
  {
    type: "function",
    name: "exchange",
    stateMutability: "payable",
    inputs: [
      { name: "fromToken", type: "address" },
      { name: "toToken", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "exchangeWithPermitV2",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fromToken", type: "address" },
      { name: "toToken", type: "address" },
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "TokenExchanged",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "isBuy", type: "bool", indexed: true },
      { name: "tokenAddress", type: "address", indexed: true },
      { name: "fromAmount", type: "uint256", indexed: false },
      { name: "toAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

export function buildGasExchangeTransactions(params: {
  gasExchangeAddress: Address;
  fromToken: Address;
  toToken: Address;
  amount: bigint;
  includeApprove?: boolean;
}) {
  const transactions: GasExchangeTransaction[] = [];

  if (params.includeApprove && params.fromToken !== ZERO_ADDRESS) {
    transactions.push({
      action: "approve",
      to: params.fromToken,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [params.gasExchangeAddress, params.amount],
      }),
    });
  }

  transactions.push({
    action: "exchange",
    to: params.gasExchangeAddress,
    value: params.fromToken === ZERO_ADDRESS ? params.amount : 0n,
    data: encodeFunctionData({
      abi: gasExchangeAbi,
      functionName: "exchange",
      args: [params.fromToken, params.toToken, params.amount],
    }),
  });

  return transactions;
}

export function buildGasExchangePermitTransaction(params: {
  gasExchangeAddress: Address;
  fromToken: Address;
  toToken: Address;
  user: Address;
  amount: bigint;
  deadline: bigint;
  v: number;
  r: Hex;
  s: Hex;
}) {
  return {
    action: "exchangeWithPermit",
    to: params.gasExchangeAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: gasExchangeAbi,
      functionName: "exchangeWithPermitV2",
      args: [
        params.fromToken,
        params.toToken,
        params.user,
        params.amount,
        params.deadline,
        params.v,
        params.r,
        params.s,
      ],
    }),
  } satisfies GasExchangeTransaction;
}

export function getGasExchangeChain(network: GasExchangeNetwork) {
  const deployment = GAS_EXCHANGE_DEPLOYMENTS[network];

  return defineChain({
    id: deployment.chainId,
    name: deployment.chainName,
    nativeCurrency: {
      name: "EGAS",
      symbol: "EGAS",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [deployment.rpcUrl],
      },
    },
  });
}

export async function executeGasExchangeTransactions(params: {
  network: GasExchangeNetwork;
  privateKey: Hex;
  transactions: GasExchangeTransaction[];
}) {
  const chain = getGasExchangeChain(params.network);
  const account = privateKeyToAccount(params.privateKey);
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const receipts = [];

  for (const transaction of params.transactions) {
    const hash = await walletClient.sendTransaction({
      account,
      chain,
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    receipts.push({ action: transaction.action, hash, status: receipt.status });
  }

  return receipts;
}
