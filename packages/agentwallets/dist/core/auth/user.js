"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDevice = exports.TurnkeySolanaWallet = void 0;
const sdk_browser_1 = require("@turnkey/sdk-browser");
const turnkey_solana_wallet_1 = require("../turnkey-solana-wallet");
var turnkey_solana_wallet_2 = require("../turnkey-solana-wallet");
Object.defineProperty(exports, "TurnkeySolanaWallet", { enumerable: true, get: function () { return turnkey_solana_wallet_2.TurnkeySolanaWallet; } });
/**
 * Browser-only device module.
 *
 * Registers the user's Passkey as a Turnkey authenticator and signs
 * high-value transactions after human approval.
 *
 * Run this code in the browser — not on the server.
 */
class UserDevice {
    turnkey;
    passkeyClient;
    indexedDbClient = null;
    activeSubOrgId = null;
    activeAddress = null;
    constructor(config) {
        this.turnkey = new sdk_browser_1.Turnkey({
            rpId: config.rpId,
            apiBaseUrl: config.apiBaseUrl ?? "https://api.turnkey.com",
            defaultOrganizationId: config.organizationId,
        });
        this.passkeyClient = this.turnkey.passkeyClient();
    }
    async getIndexedDbClient() {
        if (!this.indexedDbClient) {
            this.indexedDbClient = await this.turnkey.indexedDbClient();
        }
        return this.indexedDbClient;
    }
    /**
     * Step 1 — Prompt the user to create a Passkey on their device.
     * Send the result to your backend's createSecureWallet call.
     */
    async registerPasskey(displayName) {
        const passkey = await this.passkeyClient.createUserPasskey({
            publicKey: {
                rp: { name: "Agent Wallet" },
                user: { name: displayName, displayName },
            },
        });
        return {
            encodedChallenge: passkey.encodedChallenge,
            attestation: passkey.attestation,
        };
    }
    /**
     * Step 2 — After wallet creation, log in with the Passkey.
     * Required before signing high-value transactions.
     */
    async login(subOrganizationId, solanaAddress) {
        const indexedDb = await this.getIndexedDbClient();
        await indexedDb.init();
        const publicKey = await indexedDb.getPublicKey();
        if (!publicKey) {
            throw new Error("IndexedDB key pair missing — call registerPasskey first.");
        }
        await this.passkeyClient.loginWithPasskey({
            organizationId: subOrganizationId,
            sessionType: sdk_browser_1.SessionType.READ_WRITE,
            publicKey,
            expirationSeconds: "3600",
        });
        this.activeSubOrgId = subOrganizationId;
        if (solanaAddress) {
            this.activeAddress = solanaAddress;
        }
    }
    /**
     * Returns a TurnkeySolanaWallet backed by the Passkey session.
     * Drop into existing Solana code that expects an async signer.
     */
    getWallet(subOrganizationId, solanaAddress) {
        return turnkey_solana_wallet_1.TurnkeySolanaWallet.fromClient({
            organizationId: subOrganizationId,
            address: solanaAddress,
            client: this.passkeyClient,
        });
    }
    /**
     * Step 3 — Human approval: sign a transaction with the Passkey session.
     */
    async signTransaction(tx, solanaAddress, subOrganizationId) {
        return this.getWallet(subOrganizationId, solanaAddress).signTransaction(tx);
    }
}
exports.UserDevice = UserDevice;
