import { collection, onSnapshot, setDoc, doc, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { HeadgearItem } from "@/types/avatar";

export const HEADGEAR_COLLECTION = "headgear";

const DEFAULT_HEADGEAR: HeadgearItem[] = [
  { id: "none", name: "None", textureUrl: "" },
  { id: "cap_red", name: "Red Cap", textureUrl: "" },
  { id: "cap_blue", name: "Blue Cap", textureUrl: "" },
  { id: "horns", name: "Horns", textureUrl: "" },
  { id: "crown", name: "Crown", textureUrl: "" },
];

export function subscribeToHeadgear(
  onData: (items: HeadgearItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = collection(getFirebaseDb(), HEADGEAR_COLLECTION);
  return onSnapshot(
    col,
    (snapshot) => {
      if (snapshot.empty) {
        onData(DEFAULT_HEADGEAR);
        return;
      }
      const items: HeadgearItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Partial<HeadgearItem>;
        items.push({
          id: d.id,
          name: data.name ?? d.id,
          textureUrl: data.textureUrl ?? "",
        });
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    },
    (error) => onError?.(error),
  );
}

export async function seedDefaultHeadgear(): Promise<void> {
  const db = getFirebaseDb();
  for (const item of DEFAULT_HEADGEAR) {
    await setDoc(doc(db, HEADGEAR_COLLECTION, item.id), item, { merge: true });
  }
}

export function getHeadgearTexture(
  items: HeadgearItem[],
  headgearId: string,
): string | undefined {
  const item = items.find((h) => h.id === headgearId);
  return item?.textureUrl || undefined;
}
