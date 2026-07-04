import type { SolanaTransaction } from "./types";
/** Largest single native SOL transfer inside the transaction. */
export declare function getMaxNativeSolTransfer(tx: SolanaTransaction): number;
