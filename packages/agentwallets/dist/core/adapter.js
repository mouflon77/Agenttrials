"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnkeyAgentSigner = void 0;
exports.isLegacyKeypairSigner = isLegacyKeypairSigner;
const web3_js_1 = require("@solana/web3.js");
const safe_agent_signer_1 = require("./safe-agent-signer");
class TurnkeyAgentSigner {
    publicKey;
    inner;
    connection;
    simulateBeforeSign;
    constructor(inner, connection, simulateBeforeSign) {
        this.inner = inner;
        this.publicKey = inner.publicKey;
        this.connection = connection;
        this.simulateBeforeSign = simulateBeforeSign;
    }
    /**
     * Connect to GCP + load wallet, then return a drop-in MPC signer.
     *
     * Env: `GCP_PROJECT_ID`, `WALLET_SECRET_ID`, optional `TURNKEY_ORGANIZATION_ID`
     * (parent org — used during bootstrap; signing uses the wallet sub-org from Secret Manager).
     */
    static async init(config = {}) {
        const safe = await safe_agent_signer_1.SafeAgentSigner.init(config);
        const walletSecretId = config.walletSecretId ?? process.env.WALLET_SECRET_ID;
        if (!walletSecretId) {
            throw new Error("WALLET_SECRET_ID is required. Run npm run setup and use the printed secret id.");
        }
        await safe.loadWallet(walletSecretId);
        return TurnkeyAgentSigner.fromSafeAgentSigner(safe, config);
    }
    /** Build from an already-initialized SafeAgentSigner with a loaded wallet. */
    static fromSafeAgentSigner(safe, config = {}) {
        const rpc = config.solanaRpcUrl ??
            process.env.SOLANA_RPC_URL ??
            "https://api.devnet.solana.com";
        return new TurnkeyAgentSigner(safe.getSolanaWallet(), new web3_js_1.Connection(rpc, "confirmed"), config.simulateBeforeSign ?? true);
    }
    async signTransaction(transaction) {
        if (this.simulateBeforeSign) {
            await this.inner.simulate(this.connection, transaction);
        }
        return this.inner.signTransaction(transaction);
    }
    async signAllTransactions(transactions) {
        if (this.simulateBeforeSign) {
            for (const tx of transactions) {
                await this.inner.simulate(this.connection, tx);
            }
        }
        return this.inner.signAllTransactions(transactions);
    }
    /** Access the underlying Turnkey wallet (policy-aware signing, etc.). */
    getTurnkeyWallet() {
        return this.inner;
    }
    /** Policy-aware path — auto-sign small txs, defer large ones to the portal. */
    requestSignature(transaction) {
        return this.inner.requestSignature(transaction);
    }
}
exports.TurnkeyAgentSigner = TurnkeyAgentSigner;
/** Type guard — legacy `transaction.sign(keypair)` expects sync Keypair; use async signing instead. */
function isLegacyKeypairSigner(signer) {
    return (typeof signer === "object" &&
        signer !== null &&
        "secretKey" in signer &&
        signer.secretKey instanceof Uint8Array);
}
