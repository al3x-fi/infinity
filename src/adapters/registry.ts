import type { DexAdapter } from "./types/DexAdapter";

// The ONLY place that decides which DEXs INFINITY lists.
// Empty on purpose: no verified DEX deployment on Zero has been confirmed yet.
// To add a DEX: create src/adapters/<name>/ and add it to this array.
export const adapters: DexAdapter[] = [];

export function getAdapter(key: string): DexAdapter | undefined {
  return adapters.find((a) => a.key === key);
}
