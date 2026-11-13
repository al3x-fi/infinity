// Read-only chain access for the admin wallet tracker. Nothing here can sign or send.
import { JsonRpcProvider, getAddress, isAddress } from "ethers";

export type NetworkKey = "mainnet" | "sepolia";

export const NETWORKS: Record<NetworkKey, { name: string; symbol: string; chainId: number; rpc: string; explorer: string }> = {
  mainnet: { name: "Ethereum", symbol: "ETH", chainId: 1, rpc: "https://ethereum-rpc.publicnode.com", explorer: "https://etherscan.io" },
  sepolia: { name: "Sepolia", symbol: "SepoliaETH", chainId: 11155111, rpc: "https://ethereum-sepolia-rpc.publicnode.com", explorer: "https://sepolia.etherscan.io" },
};

const providers = new Map<NetworkKey, JsonRpcProvider>();
function provider(n: NetworkKey) {
  let p = providers.get(n);
  if (!p) {
    p = new JsonRpcProvider(NETWORKS[n].rpc, NETWORKS[n].chainId, { staticNetwork: true });
    providers.set(n, p);
  }
  return p;
}

// EIP-7702: an ordinary wallet that delegates to code has code 0xef0100 + target address.
export interface ChainState { wei: bigint; nonce: number; isContract: boolean; delegated: boolean }

export async function fetchWallet(n: NetworkKey, address: string): Promise<ChainState> {
  const p = provider(n);
  const [wei, nonce, code] = await Promise.all([p.getBalance(address), p.getTransactionCount(address), p.getCode(address)]);
  const delegated = code.toLowerCase().startsWith("0xef0100");
  return { wei, nonce, isContract: code !== "0x" && !delegated, delegated };
}

/** Accepts a 0x address or an ENS name (resolved on Ethereum mainnet). */
export async function resolveInput(input: string): Promise<{ address: string; ens?: string }> {
  const v = input.trim();
  const name = v.toLowerCase();
  if (isAddress(v)) return { address: getAddress(v) };
  if (/^[^\s]+\.eth$/i.test(v)) {
    const a = await provider("mainnet").resolveName(name);
    if (!a) throw new Error(`${name} does not resolve to an address`);
    return { address: getAddress(a), ens: name };
  }
  throw new Error("Enter a valid 0x address or .eth name");
}

export const explorerUrl = (n: NetworkKey, address: string) => `${NETWORKS[n].explorer}/address/${address}`;
