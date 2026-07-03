import { NextResponse } from "next/server";

import {
  getPendingTransaction,
  markPendingApproved,
} from "@/lib/server/pending-transactions";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { signedSerializedTx?: string };
    if (!body.signedSerializedTx?.trim()) {
      return NextResponse.json(
        { error: "signedSerializedTx is required." },
        { status: 400 },
      );
    }

    const existing = await getPendingTransaction(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Already processed." }, { status: 409 });
    }

    const approved = await markPendingApproved(id, body.signedSerializedTx.trim());
    return NextResponse.json({ approved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Approval failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
