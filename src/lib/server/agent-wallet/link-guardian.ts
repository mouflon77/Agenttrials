import type { PasskeyRegistration, ProvisionedWallet, SecureWallet } from "agentwallets";

import {
  getAutoSignThresholdSol,
  getGcpProjectId,
} from "@/lib/server/agent-wallet/config";

/** Link a Passkey guardian to a wallet provisioned from admin. */
export async function linkGuardianToProvisionedWallet(input: {
  subOrganizationId: string;
  userDisplayName: string;
  passkey: PasskeyRegistration;
}): Promise<SecureWallet> {
  const { GcpAgent, SecureWalletOrchestrator } = await import("agentwallets");

  const projectId = getGcpProjectId();
  const gcp = GcpAgent.fromEnv({ projectId });
  const wallet = await gcp.loadJsonSecret<ProvisionedWallet>(
    `wallet-${input.subOrganizationId}`,
  );

  if (wallet.subOrganizationId !== input.subOrganizationId) {
    throw new Error("Wallet sub-org id mismatch.");
  }

  const orchestrator = new SecureWalletOrchestrator({
    gcp: { projectId },
    autoSignThresholdSol: getAutoSignThresholdSol(),
  });

  return orchestrator.linkGuardian({
    wallet,
    userDisplayName: input.userDisplayName,
    passkey: input.passkey,
  });
}
