"use strict";
/**
 * Agent Solana Wallet SDK
 *
 * Stupid-easy setup:
 *
 * ```ts
 * import { SafeAgentSigner } from "agentwallets";
 *
 * const signer = await SafeAgentSigner.init();
 * signer.setup({ userName: "Alice" }); // QR appears in your terminal
 * ```
 *
 * Run `npm run setup` for the interactive CLI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeDeviceLink = exports.decodeDeviceLink = exports.createDeviceLinkPayload = exports.buildDeviceLinkUrl = exports.printSetupQr = exports.EXECUTE_SOLANA_TRANSFER_TOOL = exports.AgentEngine = exports.buildSolTransferTransactionWithConnection = exports.executeSolanaTransfer = exports.sendWithWallet = exports.sendAndConfirmWithWallet = exports.HUMAN_APPROVAL_POLICY_NAME = exports.AGENT_AUTO_SIGN_POLICY_NAME = exports.thresholdSolFromEnv = exports.syncPoliciesToTurnkey = exports.printRecoveryShare = exports.generateRecoveryMnemonic = exports.generateRecoveryShare = exports.isLegacyKeypairSigner = exports.TurnkeyAgentSigner = exports.TurnkeySolanaWallet = exports.createOrchestrator = exports.SecureWalletOrchestrator = exports.UserDevice = exports.DEFAULT_GCP_SECRET_NAMES = exports.GcpAgent = exports.createSafeAgentSigner = exports.SafeAgentSigner = void 0;
var safe_agent_signer_1 = require("./core/safe-agent-signer");
Object.defineProperty(exports, "SafeAgentSigner", { enumerable: true, get: function () { return safe_agent_signer_1.SafeAgentSigner; } });
Object.defineProperty(exports, "createSafeAgentSigner", { enumerable: true, get: function () { return safe_agent_signer_1.createSafeAgentSigner; } });
var gcp_1 = require("./core/auth/gcp");
Object.defineProperty(exports, "GcpAgent", { enumerable: true, get: function () { return gcp_1.GcpAgent; } });
Object.defineProperty(exports, "DEFAULT_GCP_SECRET_NAMES", { enumerable: true, get: function () { return gcp_1.DEFAULT_GCP_SECRET_NAMES; } });
var user_1 = require("./core/auth/user");
Object.defineProperty(exports, "UserDevice", { enumerable: true, get: function () { return user_1.UserDevice; } });
var orchestrator_1 = require("./core/orchestrator");
Object.defineProperty(exports, "SecureWalletOrchestrator", { enumerable: true, get: function () { return orchestrator_1.SecureWalletOrchestrator; } });
Object.defineProperty(exports, "createOrchestrator", { enumerable: true, get: function () { return orchestrator_1.createOrchestrator; } });
var turnkey_solana_wallet_1 = require("./core/turnkey-solana-wallet");
Object.defineProperty(exports, "TurnkeySolanaWallet", { enumerable: true, get: function () { return turnkey_solana_wallet_1.TurnkeySolanaWallet; } });
var adapter_1 = require("./core/adapter");
Object.defineProperty(exports, "TurnkeyAgentSigner", { enumerable: true, get: function () { return adapter_1.TurnkeyAgentSigner; } });
Object.defineProperty(exports, "isLegacyKeypairSigner", { enumerable: true, get: function () { return adapter_1.isLegacyKeypairSigner; } });
var recovery_share_1 = require("./core/recovery-share");
Object.defineProperty(exports, "generateRecoveryShare", { enumerable: true, get: function () { return recovery_share_1.generateRecoveryShare; } });
Object.defineProperty(exports, "generateRecoveryMnemonic", { enumerable: true, get: function () { return recovery_share_1.generateRecoveryMnemonic; } });
Object.defineProperty(exports, "printRecoveryShare", { enumerable: true, get: function () { return recovery_share_1.printRecoveryShare; } });
var sync_policies_1 = require("./core/sync-policies");
Object.defineProperty(exports, "syncPoliciesToTurnkey", { enumerable: true, get: function () { return sync_policies_1.syncPoliciesToTurnkey; } });
Object.defineProperty(exports, "thresholdSolFromEnv", { enumerable: true, get: function () { return sync_policies_1.thresholdSolFromEnv; } });
var policies_1 = require("./core/policies");
Object.defineProperty(exports, "AGENT_AUTO_SIGN_POLICY_NAME", { enumerable: true, get: function () { return policies_1.AGENT_AUTO_SIGN_POLICY_NAME; } });
Object.defineProperty(exports, "HUMAN_APPROVAL_POLICY_NAME", { enumerable: true, get: function () { return policies_1.HUMAN_APPROVAL_POLICY_NAME; } });
var send_and_confirm_1 = require("./core/send-and-confirm");
Object.defineProperty(exports, "sendAndConfirmWithWallet", { enumerable: true, get: function () { return send_and_confirm_1.sendAndConfirmWithWallet; } });
Object.defineProperty(exports, "sendWithWallet", { enumerable: true, get: function () { return send_and_confirm_1.sendWithWallet; } });
var transfer_1 = require("./core/transfer");
Object.defineProperty(exports, "executeSolanaTransfer", { enumerable: true, get: function () { return transfer_1.executeSolanaTransfer; } });
Object.defineProperty(exports, "buildSolTransferTransactionWithConnection", { enumerable: true, get: function () { return transfer_1.buildSolTransferTransactionWithConnection; } });
var agent_engine_1 = require("./agent/agent-engine");
Object.defineProperty(exports, "AgentEngine", { enumerable: true, get: function () { return agent_engine_1.AgentEngine; } });
Object.defineProperty(exports, "EXECUTE_SOLANA_TRANSFER_TOOL", { enumerable: true, get: function () { return agent_engine_1.EXECUTE_SOLANA_TRANSFER_TOOL; } });
var setup_qr_1 = require("./cli/setup-qr");
Object.defineProperty(exports, "printSetupQr", { enumerable: true, get: function () { return setup_qr_1.printSetupQr; } });
var link_payload_1 = require("./core/link-payload");
Object.defineProperty(exports, "buildDeviceLinkUrl", { enumerable: true, get: function () { return link_payload_1.buildDeviceLinkUrl; } });
Object.defineProperty(exports, "createDeviceLinkPayload", { enumerable: true, get: function () { return link_payload_1.createDeviceLinkPayload; } });
Object.defineProperty(exports, "decodeDeviceLink", { enumerable: true, get: function () { return link_payload_1.decodeDeviceLink; } });
Object.defineProperty(exports, "encodeDeviceLink", { enumerable: true, get: function () { return link_payload_1.encodeDeviceLink; } });
// ─── Boilerplate: run with `npm run setup` or `node dist/index.js` ───────────
const safe_agent_signer_2 = require("./core/safe-agent-signer");
async function main() {
    const userName = process.env.SETUP_USER_NAME ?? "User";
    const walletName = process.env.SETUP_WALLET_NAME;
    console.log("\nAgent Solana Wallet — setup\n");
    const signer = await safe_agent_signer_2.SafeAgentSigner.init();
    await signer.setup({ userName, walletName });
    console.log("Next steps:");
    console.log("  1. Fund the Solana address printed above");
    console.log("  2. Scan the QR code with your phone");
    console.log("  3. Register your Passkey on the approval portal");
    console.log("  4. Agent loads wallet via loadWallet() using the secret ID shown\n");
}
if (require.main === module) {
    main().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\nSetup failed: ${message}\n`);
        process.exit(1);
    });
}
