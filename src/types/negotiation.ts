export interface NegotiationMessage {
  role: "user" | "npc";
  text: string;
  at: string;
}

export interface NegotiationChatDocument {
  roomId: string;
  npcId: string;
  npcName: string;
  passed: boolean;
  messages: NegotiationMessage[];
  /** Rolling notes the gatekeeper keeps about this player (updated server-side). */
  playerMemory?: string;
  updatedAt: string;
  createdAt: string;
}

export const MAX_NEGOTIATION_MESSAGES = 48;
export const NEGOTIATION_HISTORY_FOR_MODEL = 20;

export function negotiationChatId(roomId: string, npcId: string): string {
  return `${roomId}__${npcId}`;
}
