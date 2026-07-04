"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaxNativeSolTransfer = getMaxNativeSolTransfer;
const web3_js_1 = require("@solana/web3.js");
/** Read lamports from a System Program transfer instruction (type = 2). */
function lamportsFromTransferData(data) {
    if (data.length < 12)
        return null;
    if (data.readUInt32LE(0) !== 2)
        return null;
    return Number(data.readBigUInt64LE(4));
}
/** Max native SOL sent in a legacy transaction. */
function maxLamportsInLegacyTx(tx) {
    let max = 0;
    for (const ix of tx.instructions) {
        if (!ix.programId.equals(web3_js_1.SystemProgram.programId))
            continue;
        const lamports = lamportsFromTransferData(ix.data);
        if (lamports !== null)
            max = Math.max(max, lamports);
    }
    return max;
}
/** Max native SOL sent in a versioned transaction. */
function maxLamportsInVersionedTx(tx) {
    let max = 0;
    const message = tx.message;
    const keys = message.getAccountKeys();
    for (const ix of message.compiledInstructions) {
        const programId = keys.get(ix.programIdIndex);
        if (!programId?.equals(web3_js_1.SystemProgram.programId))
            continue;
        const lamports = lamportsFromTransferData(Buffer.from(ix.data));
        if (lamports !== null)
            max = Math.max(max, lamports);
    }
    return max;
}
/** Largest single native SOL transfer inside the transaction. */
function getMaxNativeSolTransfer(tx) {
    const lamports = tx instanceof web3_js_1.Transaction
        ? maxLamportsInLegacyTx(tx)
        : maxLamportsInVersionedTx(tx);
    return lamports / web3_js_1.LAMPORTS_PER_SOL;
}
