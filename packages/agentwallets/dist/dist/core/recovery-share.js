"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecoveryMnemonic = void 0;
exports.generateRecoveryShare = generateRecoveryShare;
exports.printRecoveryShare = printRecoveryShare;
const crypto_1 = require("@turnkey/crypto");
/**
 * Export a Turnkey wallet mnemonic encrypted to a one-time local key, then decrypt
 * so the user can write it down as a recovery share (same role as a seed phrase).
 *
 * Call immediately after wallet creation — before the guardian raises quorum to 2-of-2.
 */
async function generateRecoveryShare(gcp, wallet) {
    const subOrgClient = gcp.createSubOrgAgentClient(wallet.subOrganizationId, wallet.agentApiPublicKey, wallet.agentApiPrivateKey);
    const api = subOrgClient.apiClient();
    const recoveryKeys = (0, crypto_1.generateP256KeyPair)();
    const result = await api.exportWallet({
        organizationId: wallet.subOrganizationId,
        walletId: wallet.walletId,
        targetPublicKey: recoveryKeys.publicKey,
    });
    const exportBundle = result.exportBundle;
    if (!exportBundle) {
        throw new Error("Turnkey did not return a recovery export bundle.");
    }
    const mnemonic = await (0, crypto_1.decryptExportBundle)({
        exportBundle,
        embeddedKey: recoveryKeys.privateKey,
        organizationId: wallet.subOrganizationId,
        returnMnemonic: true,
    });
    return {
        mnemonic,
        solanaAddress: wallet.solanaAddress,
        subOrganizationId: wallet.subOrganizationId,
        walletId: wallet.walletId,
    };
}
/** Alias for `generateRecoveryShare` — emergency offline backup mnemonic. */
exports.generateRecoveryMnemonic = generateRecoveryShare;
/** Print recovery instructions to the terminal during setup. */
function printRecoveryShare(share) {
    const words = share.mnemonic.trim().split(/\s+/);
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  RECOVERY SHARE — write this down and store offline");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("  If Turnkey is ever unavailable, import this phrase into any");
    console.log("  standard Solana wallet to recover your funds.");
    console.log("");
    console.log("  ⛔  Never paste this into .env, character.json, or GitHub.");
    console.log("  ⛔  Never share it with your AI agent or LLM.");
    console.log("");
    console.log(`  Address : ${share.solanaAddress}`);
    console.log(`  Words   : ${words.length}`);
    console.log("");
    console.log("  ┌─────────────────────────────────────────────────┐");
    for (let i = 0; i < words.length; i += 3) {
        const line = words
            .slice(i, i + 3)
            .map((word, j) => `${String(i + j + 1).padStart(2, " ")}. ${word}`)
            .join("   ");
        console.log(`  │ ${line.padEnd(47)} │`);
    }
    console.log("  └─────────────────────────────────────────────────┘");
    console.log("");
    console.log("  Store in a safe place (paper, password manager offline vault).");
    console.log("  This is shown once — it is NOT saved in GCP or Turnkey logs.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
}
