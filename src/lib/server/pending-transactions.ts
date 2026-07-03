import { randomUUID } from "crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import type { PendingTransactionDocument } from "@/types/agent-wallet";

const COLLECTION = "pendingTransactions";

export async function listPendingTransactions(
  subOrganizationId: string,
): Promise<PendingTransactionDocument[]> {
  const snap = await getFirebaseAdminDb()
    .collection(COLLECTION)
    .where("subOrganizationId", "==", subOrganizationId)
    .get();

  return snap.docs
    .map((d) => d.data() as PendingTransactionDocument)
    .filter((item) => item.status === "pending")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function getPendingTransaction(
  id: string,
): Promise<PendingTransactionDocument | null> {
  const snap = await getFirebaseAdminDb().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as PendingTransactionDocument;
}

export async function addPendingTransaction(
  input: Omit<PendingTransactionDocument, "id" | "createdAt" | "status">,
): Promise<PendingTransactionDocument> {
  const id = randomUUID();
  const item: PendingTransactionDocument = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  await getFirebaseAdminDb().collection(COLLECTION).doc(id).set(item);
  return item;
}

export async function markPendingApproved(
  id: string,
  signedSerializedTx: string,
): Promise<PendingTransactionDocument | null> {
  const ref = getFirebaseAdminDb().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const current = snap.data() as PendingTransactionDocument;
  if (current.status !== "pending") return null;

  const updated: PendingTransactionDocument = {
    ...current,
    status: "approved",
    serializedTx: signedSerializedTx,
  };

  await ref.set(updated);
  return updated;
}

export async function agentWalletExists(subOrganizationId: string): Promise<boolean> {
  const snap = await getFirebaseAdminDb()
    .collection("agentWallets")
    .doc(subOrganizationId)
    .get();
  return snap.exists;
}

/** Server-side Firestore write helper for admin provisioning. */
export async function adminSaveProvisionedWallet(input: {
  id: string;
  displayName: string;
  subOrganizationId: string;
  solanaAddress: string;
  walletSecretId: string;
  createdBy: string;
}): Promise<void> {
  await getFirebaseAdminDb()
    .collection("agentWallets")
    .doc(input.id)
    .set({
      id: input.id,
      displayName: input.displayName,
      subOrganizationId: input.subOrganizationId,
      solanaAddress: input.solanaAddress,
      walletSecretId: input.walletSecretId,
      status: "provisioned",
      createdBy: input.createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function adminMarkWalletLinked(id: string): Promise<void> {
  await getFirebaseAdminDb().collection("agentWallets").doc(id).update({
    status: "linked",
    updatedAt: FieldValue.serverTimestamp(),
  });
}
