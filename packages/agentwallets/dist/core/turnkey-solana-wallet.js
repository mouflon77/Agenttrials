"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnkeySolanaWallet = void 0;
const web3_js_1 = require("@solana/web3.js");
const solana_1 = require("@turnkey/solana");
const solana_2 = require("./solana");
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
class TurnkeySolanaWallet {
    publicKey;
    organizationId;
    address;
    turnkeySigner;
    connection;
    simulateBeforeSign;
    autoSignThresholdSol;
    onHumanApprovalRequired;
    constructor(config) {
        this.publicKey = new web3_js_1.PublicKey(config.address);
        this.organizationId = config.organizationId;
        this.address = config.address;
        this.connection = config.connection;
        this.simulateBeforeSign = config.simulateBeforeSign ?? Boolean(config.connection);
        this.autoSignThresholdSol = config.autoSignThresholdSol;
        this.onHumanApprovalRequired = config.onHumanApprovalRequired;
        this.turnkeySigner = new solana_1.TurnkeySigner({
            organizationId: config.organizationId,
            client: config.client,
        });
    }
    /** Build a wallet from an existing Turnkey API client. */
    static fromClient(config) {
        return new TurnkeySolanaWallet(config);
    }
    async signTransaction(transaction) {
        if (this.simulateBeforeSign && this.connection) {
            await this.simulate(this.connection, transaction);
        }
        return (await this.turnkeySigner.signTransaction(transaction, this.address, this.organizationId));
    }
    async signAllTransactions(transactions) {
        return (await this.turnkeySigner.signAllTransactions(transactions, this.address, this.organizationId));
    }
    async signMessage(message) {
        return this.turnkeySigner.signMessage(message, this.address, this.organizationId);
    }
    /**
     * Simulate before signing — always call this before sending to mainnet.
     */
    async simulate(connection, transaction) {
        const result = transaction instanceof web3_js_1.VersionedTransaction
            ? await connection.simulateTransaction(transaction, { sigVerify: false })
            : await connection.simulateTransaction(transaction, undefined, false);
        if (result.value.err) {
            throw new Error(`Transaction simulation failed: ${JSON.stringify(result.value.err)}`);
        }
    }
    /** Simulate, then sign. Safe default for agent workflows. */
    async simulateAndSign(connection, transaction) {
        await this.simulate(connection, transaction);
        return this.signTransaction(transaction);
    }
    /**
     * UX helper — queues large transfers for the portal instead of calling Turnkey.
     * **Security is enforced by Turnkey policies** uploaded via `syncPolicy()`.
     */
    async requestSignature(transaction) {
        if (this.autoSignThresholdSol === undefined) {
            return {
                status: "signed",
                signedTransaction: await this.signTransaction(transaction),
            };
        }
        const transferSol = (0, solana_2.getMaxNativeSolTransfer)(transaction);
        if (transferSol >= this.autoSignThresholdSol) {
            const approval = {
                status: "requires_human_approval",
                subOrganizationId: this.organizationId,
                solanaAddress: this.address,
                transferSol,
                thresholdSol: this.autoSignThresholdSol,
            };
            await this.onHumanApprovalRequired?.(approval);
            return approval;
        }
        return {
            status: "signed",
            signedTransaction: await this.signTransaction(transaction),
        };
    }
}
exports.TurnkeySolanaWallet = TurnkeySolanaWallet;
