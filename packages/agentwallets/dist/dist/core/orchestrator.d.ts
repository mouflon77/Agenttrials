import { Connection } from "@solana/web3.js";
import { GcpAgent } from "./auth/gcp";
import { TurnkeySolanaWallet } from "./turnkey-solana-wallet";
import type { PasskeyRegistration, ProvisionedWallet, SecureWallet, SignatureResult, SolanaTransaction } from "./types";
export interface SecureWalletOrchestratorConfig {
    gcp: ConstructorParameters<typeof GcpAgent>[0];
    /** Auto-sign with the GCP agent when the tx is strictly below this amount (SOL). */
    autoSignThresholdSol: number;
}
/**
 * Server-side orchestrator for 2-of-3 Solana wallets.
 *
 * Security model:
 *   1. Turnkey MPC holds the private key shards (always).
 *   2. GCP Agent — API key in the sub-org, auto-signs small txs.
 *   3. User Device — Passkey authenticator, approves large txs.
 */
export declare class SecureWalletOrchestrator {
    private readonly gcpAgent;
    private readonly autoSignThresholdSol;
    constructor(config: SecureWalletOrchestratorConfig);
    get gcp(): GcpAgent;
    provisionAgentWallet(input: {
        walletName: string;
    }): Promise<ProvisionedWallet>;
    /**
     * Link a Passkey-holding guardian to a provisioned wallet (2-of-3 quorum + policies).
     */
    linkGuardian(input: {
        wallet: ProvisionedWallet;
        userDisplayName: string;
        passkey: PasskeyRegistration;
    }): Promise<SecureWallet>;
    /**
     * Re-push spend limits to Turnkey (enclave). Call after changing AUTO_SIGN_THRESHOLD_SOL
     * or to verify policies match your config.
     */
    syncPolicy(wallet: ProvisionedWallet | SecureWallet): Promise<void>;
    createSecureWallet(input: {
        walletName: string;
        userDisplayName: string;
        passkey: PasskeyRegistration;
    }): Promise<SecureWallet>;
    requestSignature(tx: SolanaTransaction, wallet: SecureWallet): Promise<SignatureResult>;
    getAgentWallet(wallet: SecureWallet, options?: {
        connection?: Connection;
    }): TurnkeySolanaWallet;
    signWithAgent(tx: SolanaTransaction, wallet: SecureWallet): Promise<SolanaTransaction>;
}
export declare function createOrchestrator(config: SecureWalletOrchestratorConfig): Promise<SecureWalletOrchestrator>;
