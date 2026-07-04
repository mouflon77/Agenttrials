"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HUMAN_APPROVAL_POLICY_NAME = exports.AGENT_AUTO_SIGN_POLICY_NAME = void 0;
exports.agentAutoSignPolicy = agentAutoSignPolicy;
exports.humanApprovalPolicy = humanApprovalPolicy;
exports.solToLamports = solToLamports;
/** Turnkey policy: agent may sign when every native SOL transfer is below the threshold. */
exports.AGENT_AUTO_SIGN_POLICY_NAME = "Agent auto-sign (low value)";
/** Turnkey policy: human must approve when any native SOL transfer meets or exceeds the threshold. */
exports.HUMAN_APPROVAL_POLICY_NAME = "Human approval (high value)";
function agentAutoSignPolicy(agentUserId, thresholdLamports) {
    return {
        policyName: exports.AGENT_AUTO_SIGN_POLICY_NAME,
        effect: "EFFECT_ALLOW",
        consensus: `approvers.any(user, user.id == '${agentUserId}')`,
        condition: `solana.tx.transfers.all(transfer, transfer.amount < ${thresholdLamports})`,
        notes: "GCP agent may sign transactions below the configured SOL threshold.",
    };
}
/** Turnkey policy: human must approve when any native SOL transfer meets or exceeds the threshold. */
function humanApprovalPolicy(humanUserId, thresholdLamports) {
    return {
        policyName: exports.HUMAN_APPROVAL_POLICY_NAME,
        effect: "EFFECT_ALLOW",
        consensus: `approvers.any(user, user.id == '${humanUserId}')`,
        condition: `solana.tx.transfers.any(transfer, transfer.amount >= ${thresholdLamports})`,
        notes: "Passkey holder must approve transactions at or above the configured SOL threshold.",
    };
}
function solToLamports(sol) {
    return Math.floor(sol * 1_000_000_000);
}
