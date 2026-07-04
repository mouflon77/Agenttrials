import type { TurnkeyServerClient } from "@turnkey/sdk-server";
import type { ProvisionedWallet, SecureWallet } from "./types";
export interface SyncPoliciesResult {
    subOrganizationId: string;
    thresholdLamports: number;
    agentPolicyId: string;
    humanPolicyId?: string;
}
type TurnkeyPolicyApi = Pick<TurnkeyServerClient, "getPolicies" | "createPolicies" | "updatePolicy">;
/**
 * Push spend limits to Turnkey's policy engine (enclave-enforced).
 *
 * This is **Policy as Infrastructure** — not a local if/else. Even if an attacker
 * patches the agent's TypeScript, Turnkey refuses signatures that violate these rules.
 */
export declare function syncPoliciesToTurnkey(api: TurnkeyPolicyApi, wallet: ProvisionedWallet | SecureWallet, thresholdSol: number): Promise<SyncPoliciesResult>;
/** Convenience: sync from SOL amount (matches AUTO_SIGN_THRESHOLD_SOL). */
export declare function thresholdSolFromEnv(override?: number, envValue?: string | undefined): number;
export {};
