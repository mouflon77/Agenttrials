import {
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";

import { getSolanaConnection } from "@/lib/solana/rpc";
import type { BribeVerificationResult } from "@/types/wallet";

function isValidBase58Address(value: string): boolean {
  try {
    const key = new PublicKey(value);
    return key.toBase58() === value;
  } catch {
    return false;
  }
}

/**
 * Confirms a successful SOL transfer from player → NPC wallet meets the minimum bribe.
 */
export async function verifyBribeTransaction(
  txSignature: string,
  playerWallet: string,
  npcWallet: string,
  minAmountSol: number,
): Promise<BribeVerificationResult> {
  if (!txSignature.trim()) {
    return { verified: false, amountSol: 0, error: "Missing transaction signature." };
  }
  if (!isValidBase58Address(playerWallet) || !isValidBase58Address(npcWallet)) {
    return { verified: false, amountSol: 0, error: "Invalid wallet address." };
  }
  if (minAmountSol <= 0) {
    return { verified: false, amountSol: 0, error: "Invalid bribe amount." };
  }

  const connection = getSolanaConnection();
  const fromKey = new PublicKey(playerWallet);
  const toKey = new PublicKey(npcWallet);
  const minLamports = Math.floor(minAmountSol * LAMPORTS_PER_SOL);

  try {
    const status = await connection.getSignatureStatus(txSignature, {
      searchTransactionHistory: true,
    });
    const confirmation = status.value;
    if (!confirmation || confirmation.err) {
      return {
        verified: false,
        amountSol: 0,
        error: "Transaction failed or not found on chain.",
      };
    }

    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx?.meta || tx.meta.err) {
      return {
        verified: false,
        amountSol: 0,
        error: "Could not read transaction details.",
      };
    }

    let transferredLamports = 0;

    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if (!("parsed" in ix) || ix.program !== "system") continue;
      const parsed = ix.parsed;
      if (
        parsed?.type !== "transfer" ||
        !parsed.info ||
        typeof parsed.info !== "object"
      ) {
        continue;
      }

      const info = parsed.info as {
        source?: string;
        destination?: string;
        lamports?: number;
      };

      if (
        info.source === fromKey.toBase58() &&
        info.destination === toKey.toBase58() &&
        typeof info.lamports === "number"
      ) {
        transferredLamports += info.lamports;
      }
    }

    // Fallback: inspect inner instructions (e.g. wrapped routes)
    if (transferredLamports === 0 && tx.meta.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          if (!("parsed" in ix) || ix.program !== "system") continue;
          const parsed = ix.parsed;
          if (parsed?.type !== "transfer") continue;
          const info = parsed.info as {
            source?: string;
            destination?: string;
            lamports?: number;
          };
          if (
            info.source === fromKey.toBase58() &&
            info.destination === toKey.toBase58() &&
            typeof info.lamports === "number"
          ) {
            transferredLamports += info.lamports;
          }
        }
      }
    }

    const amountSol = transferredLamports / LAMPORTS_PER_SOL;

    if (transferredLamports < minLamports) {
      return {
        verified: false,
        amountSol,
        error: `Payment too low (${amountSol.toFixed(4)} SOL; need ${minAmountSol} SOL).`,
      };
    }

    return { verified: true, amountSol };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "On-chain verification failed.";
    return { verified: false, amountSol: 0, error: message };
  }
}
