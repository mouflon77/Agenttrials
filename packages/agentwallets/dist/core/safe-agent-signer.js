"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeAgentSigner = void 0;
exports.createSafeAgentSigner = createSafeAgentSigner;
const web3_js_1 = require("@solana/web3.js");
const gcp_1 = require("./auth/gcp");
const orchestrator_1 = require("./orchestrator");
const recovery_share_1 = require("./recovery-share");
const adapter_1 = require("./adapter");
const setup_qr_1 = require("../cli/setup-qr");
const transfer_1 = require("./transfer");
function resolveConfig(config = {}) {
    const gcpProjectId = config.gcpProjectId ?? process.env.GCP_PROJECT_ID;
    if (!gcpProjectId) {
        throw new Error("GCP_PROJECT_ID is required. Set it in the environment or pass gcpProjectId.");
    }
    return {
        gcpProjectId,
        autoSignThresholdSol: config.autoSignThresholdSol ??
            Number(process.env.AUTO_SIGN_THRESHOLD_SOL ?? "0.5"),
        approvalPortalUrl: config.approvalPortalUrl ??
            process.env.APPROVAL_PORTAL_URL ??
            "http://localhost:3000",
        solanaRpcUrl: config.solanaRpcUrl ??
            process.env.SOLANA_RPC_URL ??
            "https://api.devnet.solana.com",
    };
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
class SafeAgentSigner {
    gcp;
    orchestrator;
    approvalPortalUrl;
    solanaRpcUrl;
    wallet = null;
    constructor(gcp, orchestrator, runtime) {
        this.gcp = gcp;
        this.orchestrator = orchestrator;
        this.approvalPortalUrl = runtime.approvalPortalUrl;
        this.solanaRpcUrl = runtime.solanaRpcUrl;
    }
    /** Connect to GCP Secret Manager + verify Turnkey credentials. */
    static async init(config = {}) {
        const resolved = resolveConfig(config);
        const gcp = gcp_1.GcpAgent.fromEnv({ projectId: resolved.gcpProjectId });
        console.log("SafeAgentSigner — connecting to GCP Secret Manager…");
        await gcp.verifyAccess();
        await gcp.loadTurnkeySecrets();
        console.log("Turnkey credentials loaded from Secret Manager.\n");
        const orchestrator = new orchestrator_1.SecureWalletOrchestrator({
            gcp: { projectId: resolved.gcpProjectId },
            autoSignThresholdSol: resolved.autoSignThresholdSol,
        });
        return new SafeAgentSigner(gcp, orchestrator, {
            approvalPortalUrl: resolved.approvalPortalUrl,
            solanaRpcUrl: resolved.solanaRpcUrl,
        });
    }
    /**
     * Setup flow:
     *   1. Create Turnkey sub-org for this agent
     *   2. Generate Solana wallet inside the sub-org
     *   3. Print the public address (fund with SOL)
     *   4. Print QR — phone becomes Guardian via Passkey
     */
    async setup(input) {
        const walletName = input.walletName ?? `${input.userName} Agent Wallet`;
        console.log("Creating Turnkey sub-org and Solana wallet…\n");
        const wallet = await this.orchestrator.provisionAgentWallet({ walletName });
        if (!input.skipRecoveryShare) {
            const recovery = await (0, recovery_share_1.generateRecoveryMnemonic)(this.gcp, wallet);
            (0, recovery_share_1.printRecoveryShare)(recovery);
        }
        return (0, setup_qr_1.printSetupQr)({
            portalUrl: this.approvalPortalUrl,
            walletName,
            userName: input.userName,
            ttlMinutes: input.ttlMinutes,
            wallet,
        });
    }
    /** Load a wallet record from GCP Secret Manager (`wallet-<subOrgId>`). */
    async loadWallet(secretId) {
        const wallet = await this.gcp.loadJsonSecret(secretId);
        this.wallet = wallet;
        return wallet;
    }
    /** Attach a fully-provisioned wallet (e.g. after portal registration). */
    useWallet(wallet) {
        this.wallet = wallet;
    }
    getWallet() {
        if (!this.wallet) {
            throw new Error("No wallet loaded. Call loadWallet() or useWallet() first.");
        }
        return this.wallet;
    }
    /** Drop-in async signer for Eliza, LangChain, and custom bots. */
    getTurnkeyAgentSigner() {
        return adapter_1.TurnkeyAgentSigner.fromSafeAgentSigner(this, {
            solanaRpcUrl: this.solanaRpcUrl,
        });
    }
    /** Drop-in Solana signer backed by Turnkey MPC + GCP agent key. */
    getSolanaWallet() {
        return this.orchestrator.getAgentWallet(this.getWallet(), {
            connection: this.getConnection(),
        });
    }
    getConnection() {
        return new web3_js_1.Connection(this.solanaRpcUrl, "confirmed");
    }
    async createSecureWallet(input) {
        const wallet = await this.orchestrator.createSecureWallet(input);
        this.wallet = wallet;
        return wallet;
    }
    /**
     * Re-push spend limits to Turnkey's enclave policy engine.
     * Call after changing AUTO_SIGN_THRESHOLD_SOL or to verify infrastructure policy.
     */
    async syncPolicy() {
        await this.orchestrator.syncPolicy(this.getWallet());
    }
    /**
     * Policy-aware signing — small txs auto-sign, large txs need phone approval.
     * Turnkey enclave policies are authoritative; this also simulates on-chain first.
     */
    async requestSignature(tx) {
        const solanaWallet = this.getSolanaWallet();
        await solanaWallet.simulate(this.getConnection(), tx);
        return solanaWallet.requestSignature(tx);
    }
    async signTransaction(tx) {
        return this.getSolanaWallet().simulateAndSign(this.getConnection(), tx);
    }
    /** Build, sign (policy-aware), and optionally submit a native SOL transfer. */
    async executeSolanaTransfer(input) {
        return (0, transfer_1.executeSolanaTransfer)(this, input, this.getConnection());
    }
}
exports.SafeAgentSigner = SafeAgentSigner;
/** Stupid-easy one-liner. */
async function createSafeAgentSigner(config) {
    return SafeAgentSigner.init(config);
}
