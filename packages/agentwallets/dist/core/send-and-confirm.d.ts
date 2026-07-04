import { Connection, type ConfirmOptions, type TransactionSignature } from "@solana/web3.js";
import type { TurnkeySolanaWallet } from "./turnkey-solana-wallet";
import type { SolanaTransaction } from "./types";
/**
 * Send a transaction signed by a Turnkey wallet.
 *
 * Replaces `sendAndConfirmTransaction(connection, tx, [keypair])` — no local
 * private key required.
 */
export declare function sendAndConfirmWithWallet(connection: Connection, transaction: SolanaTransaction, wallet: TurnkeySolanaWallet, options?: ConfirmOptions): Promise<TransactionSignature>;
/**
 * Sign and send without waiting for confirmation.
 */
export declare function sendWithWallet(connection: Connection, transaction: SolanaTransaction, wallet: TurnkeySolanaWallet, options?: ConfirmOptions): Promise<TransactionSignature>;
