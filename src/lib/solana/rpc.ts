import { Connection } from "@solana/web3.js";

const DEFAULT_DEVNET = "https://api.devnet.solana.com";

export function getSolanaRpcUrl(): string {
  return process.env.SOLANA_RPC_URL?.trim() || DEFAULT_DEVNET;
}

export function getSolanaConnection(): Connection {
  return new Connection(getSolanaRpcUrl(), "confirmed");
}
