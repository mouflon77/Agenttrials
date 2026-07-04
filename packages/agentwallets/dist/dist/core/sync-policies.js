"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPoliciesToTurnkey = syncPoliciesToTurnkey;
exports.thresholdSolFromEnv = thresholdSolFromEnv;
const policies_1 = require("./policies");
function isSecureWallet(wallet) {
    return "humanUserId" in wallet && Boolean(wallet.humanUserId);
}
/**
 * Push spend limits to Turnkey's policy engine (enclave-enforced).
 *
 * This is **Policy as Infrastructure** — not a local if/else. Even if an attacker
 * patches the agent's TypeScript, Turnkey refuses signatures that violate these rules.
 */
async function syncPoliciesToTurnkey(api, wallet, thresholdSol) {
    const subOrganizationId = wallet.subOrganizationId;
    const thresholdLamports = (0, policies_1.solToLamports)(thresholdSol);
    const agentDef = (0, policies_1.agentAutoSignPolicy)(wallet.agentUserId, thresholdLamports);
    const { policies: existingPolicies = [] } = await api.getPolicies({
        organizationId: subOrganizationId,
    });
    const agentPolicyId = await upsertPolicy(api, subOrganizationId, existingPolicies, policies_1.AGENT_AUTO_SIGN_POLICY_NAME, agentDef);
    let humanPolicyId;
    if (isSecureWallet(wallet)) {
        const humanDef = (0, policies_1.humanApprovalPolicy)(wallet.humanUserId, thresholdLamports);
        humanPolicyId = await upsertPolicy(api, subOrganizationId, existingPolicies, policies_1.HUMAN_APPROVAL_POLICY_NAME, humanDef);
    }
    return {
        subOrganizationId,
        thresholdLamports,
        agentPolicyId,
        humanPolicyId,
    };
}
async function upsertPolicy(api, organizationId, existingPolicies, policyName, definition) {
    const found = existingPolicies.find((p) => p.policyName === policyName);
    if (found) {
        await api.updatePolicy({
            organizationId,
            policyId: found.policyId,
            policyName: definition.policyName,
            policyEffect: definition.effect,
            policyCondition: definition.condition,
            policyConsensus: definition.consensus,
            policyNotes: definition.notes,
        });
        return found.policyId;
    }
    const created = await api.createPolicies({
        organizationId,
        policies: [
            {
                policyName: definition.policyName,
                effect: definition.effect,
                condition: definition.condition,
                consensus: definition.consensus,
                notes: definition.notes,
            },
        ],
    });
    const policyId = created.policyIds?.[0];
    if (!policyId) {
        throw new Error(`Turnkey did not return a policy id for "${policyName}".`);
    }
    return policyId;
}
/** Convenience: sync from SOL amount (matches AUTO_SIGN_THRESHOLD_SOL). */
function thresholdSolFromEnv(override, envValue = process.env.AUTO_SIGN_THRESHOLD_SOL) {
    if (override !== undefined)
        return override;
    return Number(envValue ?? "0.5");
}
