import type { Timestamp } from "firebase/firestore";

export type AgentWalletStatus = "provisioned" | "linked";

/** Registry entry for an MPC agent wallet (Turnkey + GCP). */
export interface AgentWalletDocument {
  /** Same as Turnkey sub-organization id. */
  id: string;
  displayName: string;
  subOrganizationId: string;
  solanaAddress: string;
  /** GCP Secret Manager id, e.g. wallet-{subOrgId} */
  walletSecretId: string;
  status: AgentWalletStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PendingTransactionDocument {
  id: string;
  subOrganizationId: string;
  serializedTx: string;
  transferSol: number;
  recipient: string;
  description: string;
  status: "pending" | "approved";
  createdAt: string;
}

export interface WalletSession {
  displayName: string;
  subOrganizationId: string;
  solanaAddress: string;
}
