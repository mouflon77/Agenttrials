import { NextResponse } from "next/server";

import {
  addPendingTransaction,
  agentWalletExists,
  listPendingTransactions,
} from "@/lib/server/pending-transactions";

export async function GET(request: Request) {
  const subOrganizationId = new URL(request.url).searchParams.get(
    "subOrganizationId",
  );

  if (!subOrganizationId?.trim()) {
    return NextResponse.json(
      { error: "subOrganizationId is required." },
      { status: 400 },
    );
  }

  const pending = await listPendingTransactions(subOrganizationId.trim());
  return NextResponse.json({ pending });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      subOrganizationId?: string;
      serializedTx?: string;
      transferSol?: number;
      recipient?: string;
      description?: string;
    };

    if (
      !body.subOrganizationId?.trim() ||
      !body.serializedTx?.trim() ||
      typeof body.transferSol !== "number" ||
      !body.recipient?.trim() ||
      !body.description?.trim()
    ) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (!(await agentWalletExists(body.subOrganizationId.trim()))) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const pending = await addPendingTransaction({
      subOrganizationId: body.subOrganizationId.trim(),
      serializedTx: body.serializedTx.trim(),
      transferSol: body.transferSol,
      recipient: body.recipient.trim(),
      description: body.description.trim(),
    });

    return NextResponse.json({ pending });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue transaction.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
