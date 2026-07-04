"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAndConfirmWithWallet = sendAndConfirmWithWallet;
exports.sendWithWallet = sendWithWallet;
/**
 * Send a transaction signed by a Turnkey wallet.
 *
 * Replaces `sendAndConfirmTransaction(connection, tx, [keypair])` — no local
 * private key required.
 */
async function sendAndConfirmWithWallet(connection, transaction, wallet, options) {
    const signed = await wallet.simulateAndSign(connection, transaction);
    const signature = await connection.sendRawTransaction(signed.serialize(), options);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, options?.commitment ?? "confirmed");
    return signature;
}
/**
 * Sign and send without waiting for confirmation.
 */
async function sendWithWallet(connection, transaction, wallet, options) {
    const signed = await wallet.simulateAndSign(connection, transaction);
    return connection.sendRawTransaction(signed.serialize(), options);
}
