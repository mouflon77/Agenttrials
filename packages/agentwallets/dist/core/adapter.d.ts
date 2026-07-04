import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { SafeAgentSigner, type SafeAgentSignerConfig } from "./safe-agent-signer";
import { TurnkeySolanaWallet } from "./turnkey-solana-wallet";
import type { SolanaTransaction } from "./types";
/**
 * Drop-in transaction signer for Eliza, LangChain, and custom Solana bots.
 *
 * MPC wallets never expose a local `secretKey`, so this is an **async** signer
 * (`publicKey` + `signTransaction`) rather than `@solana/web3.js` Keypair's
 * synchronous `Signer` ({ publicKey, secretKey }).
 *
 * ```ts
 * const signer = await TurnkeyAgentSigner.init();
 * tx.feePayer = signer.publicKey;
 * const signed = await signer.signTransaction(tx);
 * await connection.sendRawTransaction(signed.serialize());
 * ```
 */
export interface TransactionSigner {
    readonly publicKey: PublicKey;
    signTransaction<T extends SolanaTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends SolanaTransaction>(transactions: T[]): Promise<T[]>;
}
export interface TurnkeyAgentSignerConfig extends SafeAgentSignerConfig {
    /** GCP Secret Manager wallet id, e.g. `wallet-<subOrgId>`. Defaults to `WALLET_SECRET_ID`. */
    walletSecretId?: string;
    /** Solana RPC for simulation. Falls back to config / `SOLANA_RPC_URL`. */
    solanaRpcUrl?: string;
    /** Simulate before every sign. Default `true`. */
    simulateBeforeSign?: boolean;
}
export declare class TurnkeyAgentSigner implements TransactionSigner {
    readonly publicKey: PublicKey;
    private readonly inner;
    private readonly connection;
    private readonly simulateBeforeSign;
    private constructor();
    /**
     * Connect to GCP + load wallet, then return a drop-in MPC signer.
     *
     * Env: `GCP_PROJECT_ID`, `WALLET_SECRET_ID`, optional `TURNKEY_ORGANIZATION_ID`
     * (parent org — used during bootstrap; signing uses the wallet sub-org from Secret Manager).
     */
    static init(config?: TurnkeyAgentSignerConfig): Promise<TurnkeyAgentSigner>;
    /** Build from an already-initialized SafeAgentSigner with a loaded wallet. */
    static fromSafeAgentSigner(safe: SafeAgentSigner, config?: Pick<TurnkeyAgentSignerConfig, "solanaRpcUrl" | "simulateBeforeSign">): TurnkeyAgentSigner;
    signTransaction<T extends SolanaTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends SolanaTransaction>(transactions: T[]): Promise<T[]>;
    /** Access the underlying Turnkey wallet (policy-aware signing, etc.). */
    getTurnkeyWallet(): TurnkeySolanaWallet;
    /** Policy-aware path — auto-sign small txs, defer large ones to the portal. */
    requestSignature(transaction: SolanaTransaction): Promise<import("./types").SignatureResult>;
}
/** Type guard — legacy `transaction.sign(keypair)` expects sync Keypair; use async signing instead. */
export declare function isLegacyKeypairSigner(signer: unknown): signer is {
    publicKey: PublicKey;
    secretKey: Uint8Array;
};
export type { Transaction, VersionedTransaction };
