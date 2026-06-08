import { createEip1193WalletAdapter } from "@eni-chain/app-sdk";
import type { Address, Eip1193Provider, EniWalletAdapter } from "@eni-chain/app-sdk";

interface InjectedWalletProvider extends Eip1193Provider {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
}

declare global {
  interface Window {
    ethereum?: InjectedWalletProvider | InjectedWalletProvider[];
    okxwallet?: InjectedWalletProvider;
  }
}

function firstAddress(accounts: unknown): Address | null {
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") return null;
  return accounts[0] as Address;
}

export function getInjectedProvider(): InjectedWalletProvider | null {
  if (typeof window === "undefined") return null;
  if (window.okxwallet) return window.okxwallet;
  if (Array.isArray(window.ethereum)) return window.ethereum[0] ?? null;
  return window.ethereum ?? null;
}

export async function connectInjectedWallet(): Promise<{
  address: Address;
  wallet: EniWalletAdapter;
}> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No injected EIP-1193 wallet provider found");
  }

  const address = firstAddress(await provider.request({ method: "eth_requestAccounts" }));
  if (!address) {
    throw new Error("Wallet returned no account");
  }

  return {
    address,
    wallet: createEip1193WalletAdapter(provider),
  };
}

export function formatAddress(address: Address | null): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect wallet";
}
