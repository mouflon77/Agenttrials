"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSetupQr = printSetupQr;
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const link_payload_1 = require("../core/link-payload");
/**
 * Render a setup QR code directly in the VS Code / terminal.
 * Uses qrcode-terminal for crisp in-editor display.
 */
function printSetupQr(input) {
    const payload = (0, link_payload_1.createDeviceLinkPayload)({
        portalUrl: input.portalUrl,
        walletName: input.walletName,
        userName: input.userName,
        ttlMs: (input.ttlMinutes ?? 15) * 60 * 1000,
        subOrganizationId: input.wallet.subOrganizationId,
        solanaAddress: input.wallet.solanaAddress,
    });
    const url = (0, link_payload_1.buildDeviceLinkUrl)(payload);
    const secretId = `wallet-${input.wallet.subOrganizationId}`;
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Agent Solana Wallet — Setup complete");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("  1. Create Sub-Org   ✓  Turnkey sub-org for this agent");
    console.log(`     Sub-Org ID       ${input.wallet.subOrganizationId}`);
    console.log("");
    console.log("  2. Generate Wallet  ✓  Solana address created in sub-org");
    console.log("");
    console.log("  3. Turnkey policy   ✓  Spend limit pushed to enclave (not local code)");
    console.log("");
    console.log("  4. Fund AFTER guardian registration (recommended):");
    console.log("");
    console.log(`     ${input.wallet.solanaAddress}`);
    console.log("");
    console.log(`  GCP secret ID: ${secretId}`);
    console.log("");
    console.log("  ━━━ VERIFY BEFORE SCANNING QR (anti-phishing) ━━━");
    console.log("");
    console.log("  Your phone must show EXACTLY these values:");
    console.log(`    Sub-Org ID : ${input.wallet.subOrganizationId}`);
    console.log(`    Address    : ${input.wallet.solanaAddress}`);
    console.log("");
    console.log("  If the portal shows different IDs, STOP — do not register.");
    console.log("");
    console.log("  5. Scan QR — your phone becomes the Guardian for this wallet");
    console.log("");
    console.log(`  Wallet  : ${payload.walletName}`);
    console.log(`  User    : ${payload.userName}`);
    console.log(`  Expires : ${new Date(payload.expiresAt).toLocaleString()}`);
    console.log("");
    qrcode_terminal_1.default.generate(url, { small: true });
    console.log("");
    console.log("  Or open this URL on your phone:");
    console.log(`  ${url}`);
    console.log("");
    console.log("  After registering your Passkey, the agent can load:");
    console.log(`  await signer.loadWallet("${secretId}")`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    return { url, payload, wallet: input.wallet };
}
