/** Turnkey policy: agent may sign when every native SOL transfer is below the threshold. */
export declare const AGENT_AUTO_SIGN_POLICY_NAME = "Agent auto-sign (low value)";
/** Turnkey policy: human must approve when any native SOL transfer meets or exceeds the threshold. */
export declare const HUMAN_APPROVAL_POLICY_NAME = "Human approval (high value)";
export declare function agentAutoSignPolicy(agentUserId: string, thresholdLamports: number): {
    policyName: string;
    effect: "EFFECT_ALLOW";
    consensus: string;
    condition: string;
    notes: string;
};
/** Turnkey policy: human must approve when any native SOL transfer meets or exceeds the threshold. */
export declare function humanApprovalPolicy(humanUserId: string, thresholdLamports: number): {
    policyName: string;
    effect: "EFFECT_ALLOW";
    consensus: string;
    condition: string;
    notes: string;
};
export declare function solToLamports(sol: number): number;
