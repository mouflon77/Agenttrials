import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";
import type { AgentWalletDocument, AgentWalletStatus } from "@/types/agent-wallet";

const COLLECTION = "agentWallets";

export async function listAgentWallets(): Promise<AgentWalletDocument[]> {
  const q = query(
    collection(getFirebaseDb(), COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AgentWalletDocument);
}

export async function getAgentWallet(
  id: string,
): Promise<AgentWalletDocument | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTION, id));
  if (!snap.exists()) return null;
  return snap.data() as AgentWalletDocument;
}

export async function saveProvisionedAgentWallet(input: {
  id: string;
  displayName: string;
  subOrganizationId: string;
  solanaAddress: string;
  walletSecretId: string;
  createdBy: string;
}): Promise<AgentWalletDocument> {
  const ref = doc(getFirebaseDb(), COLLECTION, input.id);
  const data = {
    id: input.id,
    displayName: input.displayName,
    subOrganizationId: input.subOrganizationId,
    solanaAddress: input.solanaAddress,
    walletSecretId: input.walletSecretId,
    status: "provisioned" as AgentWalletStatus,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  const created = await getDoc(ref);
  return created.data() as AgentWalletDocument;
}

export async function markAgentWalletLinked(id: string): Promise<void> {
  const ref = doc(getFirebaseDb(), COLLECTION, id);
  await updateDoc(ref, {
    status: "linked",
    updatedAt: serverTimestamp(),
  });
}

export function formatAgentWalletLabel(wallet: AgentWalletDocument): string {
  const status = wallet.status === "linked" ? "linked" : "needs guardian";
  return `${wallet.displayName} (${wallet.solanaAddress.slice(0, 6)}… · ${status})`;
}
