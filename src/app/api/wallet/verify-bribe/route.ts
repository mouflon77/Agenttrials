import { NextResponse } from "next/server";

import { verifyBribeTransaction } from "@/lib/solana/verify-bribe";

export interface VerifyBribeRequest {
  roomId: string;
  npcId: string;
  txSignature: string;
  playerWallet: string;
  npcWallet: string;
  minAmountSol: number;
}

export interface VerifyBribeResponse {
  verified: boolean;
  amountSol: number;
  error?: string;
}

export async function POST(request: Request) {
  let body: VerifyBribeRequest;
  try {
    body = (await request.json()) as VerifyBribeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    roomId,
    npcId,
    txSignature,
    playerWallet,
    npcWallet,
    minAmountSol,
  } = body;

  if (
    !roomId?.trim() ||
    !npcId?.trim() ||
    !txSignature?.trim() ||
    !playerWallet?.trim() ||
    !npcWallet?.trim() ||
    typeof minAmountSol !== "number"
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await verifyBribeTransaction(
    txSignature.trim(),
    playerWallet.trim(),
    npcWallet.trim(),
    minAmountSol,
  );

  return NextResponse.json({
    verified: result.verified,
    amountSol: result.amountSol,
    error: result.error,
  } satisfies VerifyBribeResponse);
}
