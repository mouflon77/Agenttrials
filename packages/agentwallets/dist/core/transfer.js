"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSolTransferTransactionWithConnection = buildSolTransferTransactionWithConnection;
exports.executeSolanaTransfer = executeSolanaTransfer;
const web3_js_1 = require("@solana/web3.js");
async function buildSolTransferTransactionWithConnection(connection, fromAddress, input) {
    if (input.amountSol <= 0) {
        throw new Error("amountSol must be greater than zero.");
    }
    const from = new web3_js_1.PublicKey(fromAddress);
    const to = new web3_js_1.PublicKey(input.recipient);
    const lamports = Math.floor(input.amountSol * web3_js_1.LAMPORTS_PER_SOL);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }));
    tx.feePayer = from;
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    return tx;
}
/** Policy-aware transfer — auto-signs small amounts, queues large ones for Guardian. */
async function executeSolanaTransfer(signer, input, connection) {
    const rpc = connection ?? signer.getConnection();
    const tx = await buildSolTransferTransactionWithConnection(rpc, signer.getWallet().solanaAddress, input);
    const result = await signer.requestSignature(tx);
    if (result.status === "signed") {
        const signature = await rpc.sendRawTransaction(result.signedTransaction.serialize(), { skipPreflight: false });
        return { recipient: input.recipient, amountSol: input.amountSol, result, signature };
    }
    return { recipient: input.recipient, amountSol: input.amountSol, result };
}
