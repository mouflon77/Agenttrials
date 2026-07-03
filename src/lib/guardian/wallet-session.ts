import type { WalletSession } from "@/types/agent-wallet";

const STORAGE_KEY = "agenttrials-guardian-session";

export function loadWalletSession(): WalletSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WalletSession;
  } catch {
    return null;
  }
}

export function saveWalletSession(session: WalletSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearWalletSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
