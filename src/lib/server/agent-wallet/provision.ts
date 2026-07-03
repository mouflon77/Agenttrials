import {
  getAppOrigin,
  getAutoSignThresholdSol,
  getGcpProjectId,
} from "@/lib/server/agent-wallet/config";

export interface ProvisionAgentWalletInput {
  displayName: string;
  guardianName?: string;
}

export interface ProvisionAgentWalletResult {
  subOrganizationId: string;
  solanaAddress: string;
  walletSecretId: string;
  guardianLink: string;
}

export async function provisionAgentWallet(
  input: ProvisionAgentWalletInput,
): Promise<ProvisionAgentWalletResult> {
  const {
    GcpAgent,
    SecureWalletOrchestrator,
    createDeviceLinkPayload,
    buildDeviceLinkUrl,
  } = await import("agentwallets");

  const projectId = getGcpProjectId();
  const gcp = GcpAgent.fromEnv({ projectId });
  await gcp.verifyAccess();

  const orchestrator = new SecureWalletOrchestrator({
    gcp: { projectId },
    autoSignThresholdSol: getAutoSignThresholdSol(),
  });

  const wallet = await orchestrator.provisionAgentWallet({
    walletName: input.displayName.trim(),
  });

  const guardianName = input.guardianName?.trim() || "Guardian";
  const portalUrl = `${getAppOrigin()}/guardian`;

  const payload = createDeviceLinkPayload({
    portalUrl,
    walletName: input.displayName.trim(),
    userName: guardianName,
    subOrganizationId: wallet.subOrganizationId,
    solanaAddress: wallet.solanaAddress,
    ttlMs: 24 * 60 * 60 * 1000,
  });

  const walletSecretId = `wallet-${wallet.subOrganizationId}`;

  return {
    subOrganizationId: wallet.subOrganizationId,
    solanaAddress: wallet.solanaAddress,
    walletSecretId,
    guardianLink: buildDeviceLinkUrl(payload),
  };
}
