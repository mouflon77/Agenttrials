"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureWalletOrchestrator = void 0;
exports.createOrchestrator = createOrchestrator;
const sdk_server_1 = require("@turnkey/sdk-server");
const gcp_1 = require("./auth/gcp");
const sync_policies_1 = require("./sync-policies");
const turnkey_solana_wallet_1 = require("./turnkey-solana-wallet");
/**
 * Server-side orchestrator for 2-of-3 Solana wallets.
 *
 * Security model:
 *   1. Turnkey MPC holds the private key shards (always).
 *   2. GCP Agent — API key in the sub-org, auto-signs small txs.
 *   3. User Device — Passkey authenticator, approves large txs.
 */
class SecureWalletOrchestrator {
    gcpAgent;
    autoSignThresholdSol;
    constructor(config) {
        this.gcpAgent = new gcp_1.GcpAgent(config.gcp);
        this.autoSignThresholdSol = config.autoSignThresholdSol;
    }
    get gcp() {
        return this.gcpAgent;
    }
    async provisionAgentWallet(input) {
        const parentSecrets = await this.gcpAgent.loadTurnkeySecrets();
        const parentClient = this.gcpAgent.createParentClient(parentSecrets);
        const api = parentClient.apiClient();
        const agentKeys = this.gcpAgent.generateAgentKeyPair();
        const result = await api.createSubOrganization({
            organizationId: parentSecrets.organizationId,
            subOrganizationName: input.walletName,
            rootQuorumThreshold: 1,
            rootUsers: [
                {
                    userName: "GCP Agent",
                    apiKeys: [
                        {
                            apiKeyName: "agent-signer",
                            publicKey: agentKeys.publicKey,
                            curveType: "API_KEY_CURVE_P256",
                        },
                    ],
                    authenticators: [],
                    oauthProviders: [],
                },
            ],
            wallet: {
                walletName: input.walletName,
                accounts: sdk_server_1.DEFAULT_SOLANA_ACCOUNTS,
            },
        });
        const subOrganizationId = result.subOrganizationId;
        const agentUserId = result.rootUserIds?.[0];
        const wallet = result.wallet;
        if (!subOrganizationId || !agentUserId || !wallet) {
            throw new Error("Turnkey did not return expected wallet metadata.");
        }
        const solanaAddress = wallet.addresses[0];
        if (!solanaAddress) {
            throw new Error("Turnkey wallet has no Solana address.");
        }
        const provisioned = {
            subOrganizationId,
            walletId: wallet.walletId,
            solanaAddress,
            agentUserId,
            agentApiPublicKey: agentKeys.publicKey,
            agentApiPrivateKey: agentKeys.privateKey,
        };
        await this.gcpAgent.storeAgentKeys(`wallet-${subOrganizationId}-agent-keys`, agentKeys);
        await this.gcpAgent.storeJsonSecret(`wallet-${subOrganizationId}`, provisioned);
        // Enclave policy before guardian links — agent cannot exceed threshold even with stolen API key.
        const subOrgClient = this.gcpAgent.createSubOrgAgentClient(subOrganizationId, agentKeys.publicKey, agentKeys.privateKey);
        await (0, sync_policies_1.syncPoliciesToTurnkey)(subOrgClient.apiClient(), provisioned, this.autoSignThresholdSol);
        return provisioned;
    }
    /**
     * Link a Passkey-holding guardian to a provisioned wallet (2-of-3 quorum + policies).
     */
    async linkGuardian(input) {
        const subOrganizationId = input.wallet.subOrganizationId;
        const subOrgClient = this.gcpAgent.createSubOrgAgentClient(subOrganizationId, input.wallet.agentApiPublicKey, input.wallet.agentApiPrivateKey);
        const api = subOrgClient.apiClient();
        const createUsersResult = await api.createUsers({
            organizationId: subOrganizationId,
            users: [
                {
                    userName: input.userDisplayName,
                    apiKeys: [],
                    authenticators: [
                        {
                            authenticatorName: "User Passkey",
                            challenge: input.passkey.encodedChallenge,
                            attestation: input.passkey.attestation,
                        },
                    ],
                    oauthProviders: [],
                    userTags: [],
                },
            ],
        });
        const humanUserId = createUsersResult.userIds?.[0];
        if (!humanUserId) {
            throw new Error("Turnkey did not return the guardian user id.");
        }
        await api.updateRootQuorum({
            organizationId: subOrganizationId,
            threshold: 2,
            userIds: [input.wallet.agentUserId, humanUserId],
        });
        const secureWallet = {
            ...input.wallet,
            humanUserId,
        };
        await (0, sync_policies_1.syncPoliciesToTurnkey)(api, secureWallet, this.autoSignThresholdSol);
        await this.gcpAgent.storeJsonSecret(`wallet-${subOrganizationId}`, secureWallet);
        return secureWallet;
    }
    /**
     * Re-push spend limits to Turnkey (enclave). Call after changing AUTO_SIGN_THRESHOLD_SOL
     * or to verify policies match your config.
     */
    async syncPolicy(wallet) {
        const subOrgClient = this.gcpAgent.createSubOrgAgentClient(wallet.subOrganizationId, wallet.agentApiPublicKey, wallet.agentApiPrivateKey);
        await (0, sync_policies_1.syncPoliciesToTurnkey)(subOrgClient.apiClient(), wallet, this.autoSignThresholdSol);
    }
    async createSecureWallet(input) {
        const provisioned = await this.provisionAgentWallet({
            walletName: input.walletName,
        });
        return this.linkGuardian({
            wallet: provisioned,
            userDisplayName: input.userDisplayName,
            passkey: input.passkey,
        });
    }
    async requestSignature(tx, wallet) {
        return this.getAgentWallet(wallet).requestSignature(tx);
    }
    getAgentWallet(wallet, options) {
        const agentTurnkey = this.gcpAgent.createSubOrgAgentClient(wallet.subOrganizationId, wallet.agentApiPublicKey, wallet.agentApiPrivateKey);
        return turnkey_solana_wallet_1.TurnkeySolanaWallet.fromClient({
            organizationId: wallet.subOrganizationId,
            address: wallet.solanaAddress,
            client: agentTurnkey.apiClient(),
            connection: options?.connection,
            simulateBeforeSign: options?.connection ? true : undefined,
            autoSignThresholdSol: this.autoSignThresholdSol,
        });
    }
    async signWithAgent(tx, wallet) {
        return this.getAgentWallet(wallet).signTransaction(tx);
    }
}
exports.SecureWalletOrchestrator = SecureWalletOrchestrator;
async function createOrchestrator(config) {
    return new SecureWalletOrchestrator(config);
}
