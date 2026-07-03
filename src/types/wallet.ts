/** NPC bribe configuration — wallet created via AgentWallets `npm run setup`. */
export interface NpcBribeConfig {
  /** Solana address that receives bribes (agent MPC wallet public key). */
  walletAddress: string;
  /** Minimum SOL required to unlock the portal via bribe. */
  bribeAmountSol: number;
}

export interface BribeVerificationRequest {
  roomId: string;
  npcId: string;
  txSignature: string;
  playerWallet: string;
  npcWallet: string;
  minAmountSol: number;
}

export interface BribeVerificationResult {
  verified: boolean;
  amountSol: number;
  error?: string;
}

export interface NegotiateBribeContext {
  walletAddress: string;
  bribeAmountSol: number;
  /** Set when client verified an on-chain payment this session. */
  paymentVerified?: boolean;
  verifiedAmountSol?: number;
  txSignature?: string;
}
