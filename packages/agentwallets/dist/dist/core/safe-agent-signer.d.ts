import { Connection } from "@solana/web3.js";
import { GcpAgent } from "./auth/gcp";
import { SecureWalletOrchestrator } from "./orchestrator";
import { TurnkeyAgentSigner } from "./adapter";
import { type PrintSetupQrResult } from "../cli/setup-qr";
import { TurnkeySolanaWallet } from "./turnkey-solana-wallet";
import { type SolanaTransferResult } from "./transfer";
import type { PasskeyRegistration, SecureWallet, SignatureResult, SolanaTransaction } from "./types";
export interface SafeAgentSignerConfig {
    /** GCP project ID. Defaults to `GCP_PROJECT_ID`. */
    gcpProjectId?: string;
    /** Auto-sign below this SOL amount. Defaults to `0.5`. */
    autoSignThresholdSol?: number;
    /** Approval portal URL for phone linking. Defaults to `http://localhost:3000`. */
    approvalPortalUrl?: string;
    /** Solana RPC for simulation before signing. */
    solanaRpcUrl?: string;
}
export interface SafeAgentSetupInput {
    userName: string;
    walletName?: string;
    ttlMinutes?: number;
    /** Skip recovery mnemonic export (not recommended). */
    skipRecoveryShare?: boolean;
}
/**
 * Stupid-easy entry point for AI agents.
 *
 * ```ts
 * const signer = await SafeAgentSigner.init();
 * await signer.setup({ userName: "Alice" }); // sub-org, address, QR in terminal
 * await signer.loadWallet("wallet-<subOrgId>-agent-keys");
 * const result = await signer.requestSignature(tx);
 * ```
 */
export declare class SafeAgentSigner {
    readonly gcp: GcpAgent;
    readonly orchestrator: SecureWalletOrchestrator;
    private readonly approvalPortalUrl;
    private readonly solanaRpcUrl;
    private wallet;
    private constructor();
    /** Connect to GCP Secret Manager + verify Turnkey credentials. */
    static init(config?: SafeAgentSignerConfig): Promise<SafeAgentSigner>;
    /**
     * Setup flow:
     *   1. Create Turnkey sub-org for this agent
     *   2. Generate Solana wallet inside the sub-org
     *   3. Print the public address (fund with SOL)
     *   4. Print QR — phone becomes Guardian via Passkey
     */
    setup(input: SafeAgentSetupInput): Promise<PrintSetupQrResult>;
    /** Load a wallet record from GCP Secret Manager (`wallet-<subOrgId>`). */
    loadWallet(secretId: string): Promise<SecureWallet>;
    /** Attach a fully-provisioned wallet (e.g. after portal registration). */
    useWallet(wallet: SecureWallet): void;
    getWallet(): SecureWallet;
    /** Drop-in async signer for Eliza, LangChain, and custom bots. */
    getTurnkeyAgentSigner(): TurnkeyAgentSigner;
    /** Drop-in Solana signer backed by Turnkey MPC + GCP agent key. */
    getSolanaWallet(): TurnkeySolanaWallet;
    getConnection(): Connection;
    createSecureWallet(input: {
        walletName: string;
        userDisplayName: string;
        passkey: PasskeyRegistration;
    }): Promise<SecureWallet>;
    /**
     * Re-push spend limits to Turnkey's enclave policy engine.
     * Call after changing AUTO_SIGN_THRESHOLD_SOL or to verify infrastructure policy.
     */
    syncPolicy(): Promise<void>;
    /**
     * Policy-aware signing — small txs auto-sign, large txs need phone approval.
     * Turnkey enclave policies are authoritative; this also simulates on-chain first.
     */
    requestSignature(tx: SolanaTransaction): Promise<SignatureResult>;
    signTransaction(tx: SolanaTransaction): Promise<SolanaTransaction>;
    /** Build, sign (policy-aware), and optionally submit a native SOL transfer. */
    executeSolanaTransfer(input: {
        recipient: string;
        amountSol: number;
    }): Promise<SolanaTransferResult>;
}
/** Stupid-easy one-liner. */
export declare function createSafeAgentSigner(config?: SafeAgentSignerConfig): Promise<SafeAgentSigner>;
