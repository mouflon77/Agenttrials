import { Connection, Transaction } from "@solana/web3.js";
import type { SafeAgentSigner } from "./safe-agent-signer";
import type { SignatureResult } from "./types";
export interface SolanaTransferInput {
    /** Base58 Solana address */
    recipient: string;
    /** Amount in SOL (not lamports) */
    amountSol: number;
}
export interface SolanaTransferResult {
    recipient: string;
    amountSol: number;
    result: SignatureResult;
    /** Set when the agent auto-signed and the tx was submitted. */
    signature?: string;
}
export declare function buildSolTransferTransactionWithConnection(connection: Connection, fromAddress: string, input: SolanaTransferInput): Promise<Transaction>;
/** Policy-aware transfer — auto-signs small amounts, queues large ones for Guardian. */
export declare function executeSolanaTransfer(signer: SafeAgentSigner, input: SolanaTransferInput, connection?: Connection): Promise<SolanaTransferResult>;
