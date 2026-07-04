import { TurnkeySolanaWallet } from "../turnkey-solana-wallet";
import type { PasskeyRegistration, SolanaTransaction } from "../types";
export type { PasskeyRegistration, SolanaTransaction } from "../types";
export { TurnkeySolanaWallet, type SolanaWalletSigner } from "../turnkey-solana-wallet";
export interface UserDeviceConfig {
    /** WebAuthn relying party ID (your domain, e.g. "app.example.com"). */
    rpId: string;
    /** Turnkey parent organization ID shown in the dashboard. */
    organizationId: string;
    apiBaseUrl?: string;
}
/**
 * Browser-only device module.
 *
 * Registers the user's Passkey as a Turnkey authenticator and signs
 * high-value transactions after human approval.
 *
 * Run this code in the browser — not on the server.
 */
export declare class UserDevice {
    private readonly turnkey;
    private readonly passkeyClient;
    private indexedDbClient;
    private activeSubOrgId;
    private activeAddress;
    constructor(config: UserDeviceConfig);
    private getIndexedDbClient;
    /**
     * Step 1 — Prompt the user to create a Passkey on their device.
     * Send the result to your backend's createSecureWallet call.
     */
    registerPasskey(displayName: string): Promise<PasskeyRegistration>;
    /**
     * Step 2 — After wallet creation, log in with the Passkey.
     * Required before signing high-value transactions.
     */
    login(subOrganizationId: string, solanaAddress?: string): Promise<void>;
    /**
     * Returns a TurnkeySolanaWallet backed by the Passkey session.
     * Drop into existing Solana code that expects an async signer.
     */
    getWallet(subOrganizationId: string, solanaAddress: string): TurnkeySolanaWallet;
    /**
     * Step 3 — Human approval: sign a transaction with the Passkey session.
     */
    signTransaction(tx: SolanaTransaction, solanaAddress: string, subOrganizationId: string): Promise<SolanaTransaction>;
}
