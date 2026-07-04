import { Connection, PublicKey } from "@solana/web3.js";
import { TurnkeySigner } from "@turnkey/solana";
import type { TurnkeyBrowserClient } from "@turnkey/sdk-browser";
import type { TurnkeyServerClient } from "@turnkey/sdk-server";
import type { HumanApprovalRequired, SignatureResult, SolanaTransaction } from "./types";
/** Any Turnkey client that can stamp signing requests. */
export type TurnkeySigningClient = TurnkeyBrowserClient | TurnkeyServerClient | TurnkeySigner["client"];
/**
 * Async wallet signer — drop-in for wallet-adapter style code paths.
 *
 * Turnkey MPC wallets never expose a local `secretKey`, so they cannot use
 * the synchronous `@solana/web3.js` Keypair `Signer` ({ publicKey, secretKey }).
 * Use `signTransaction()` instead of `transaction.sign(keypair)`.
 */
export interface SolanaWalletSigner {
    readonly publicKey: PublicKey;
    signTransaction<T extends SolanaTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends SolanaTransaction>(transactions: T[]): Promise<T[]>;
    signMessage(message: Uint8Array): Promise<Uint8Array>;
}
export interface TurnkeySolanaWalletConfig {
    organizationId: string;
    /** Base58 Solana address for this Turnkey wallet account. */
    address: string;
    client: TurnkeySigningClient;
    /** When set, simulates on RPC before every signTransaction call. */
    connection?: Connection;
    /** Default true when `connection` is set. */
    simulateBeforeSign?: boolean;
    /**
     * When set, `requestSignature` returns `requires_human_approval` at or above it.
     * This is a **UX hint only** — Turnkey enclave policies are authoritative.
     */
    autoSignThresholdSol?: number;
    onHumanApprovalRequired?: (approval: HumanApprovalRequired) => void | Promise<void>;
}
/**
 * Turnkey-backed Solana wallet — works like a Keypair in async code, but the
 * private key never leaves the MPC enclave.
 *
 * ```ts
 * const wallet = TurnkeySolanaWallet.fromClient({
 *   organizationId: subOrgId,
 *   address: solanaAddress,
 *   client: turnkey.apiClient(),
 * });
 *
 * tx.feePayer = wallet.publicKey;
 * const signed = await wallet.signTransaction(tx);
 * await connection.sendRawTransaction(signed.serialize());
 * ```
 */
export declare class TurnkeySolanaWallet implements SolanaWalletSigner {
    readonly publicKey: PublicKey;
    private readonly organizationId;
    private readonly address;
    private readonly turnkeySigner;
    private readonly connection?;
    private readonly simulateBeforeSign;
    private readonly autoSignThresholdSol?;
    private readonly onHumanApprovalRequired?;
    constructor(config: TurnkeySolanaWalletConfig);
    /** Build a wallet from an existing Turnkey API client. */
    static fromClient(config: Omit<TurnkeySolanaWalletConfig, "autoSignThresholdSol" | "onHumanApprovalRequired"> & Pick<Partial<TurnkeySolanaWalletConfig>, "autoSignThresholdSol" | "onHumanApprovalRequired">): TurnkeySolanaWallet;
    signTransaction<T extends SolanaTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends SolanaTransaction>(transactions: T[]): Promise<T[]>;
    signMessage(message: Uint8Array): Promise<Uint8Array>;
    /**
     * Simulate before signing — always call this before sending to mainnet.
     */
    simulate(connection: Connection, transaction: SolanaTransaction): Promise<void>;
    /** Simulate, then sign. Safe default for agent workflows. */
    simulateAndSign(connection: Connection, transaction: SolanaTransaction): Promise<SolanaTransaction>;
    /**
     * UX helper — queues large transfers for the portal instead of calling Turnkey.
     * **Security is enforced by Turnkey policies** uploaded via `syncPolicy()`.
     */
    requestSignature(transaction: SolanaTransaction): Promise<SignatureResult>;
}
