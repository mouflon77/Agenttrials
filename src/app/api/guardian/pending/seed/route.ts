import { NextResponse } from "next/server";

import { queueDemoPendingTransfer } from "@/lib/server/agent-wallet/demo-seed";
import { agentWalletExists } from "@/lib/server/pending-transactions";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      subOrganizationId?: string;
      transferSol?: number;
    };

    if (!body.subOrganizationId?.trim()) {
      return NextResponse.json(
        { error: "subOrganizationId is required." },
        { status: 400 },
      );
    }

    if (!(await agentWalletExists(body.subOrganizationId.trim()))) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const pending = await queueDemoPendingTransfer(
      body.subOrganizationId.trim(),
      body.transferSol ?? 1.0,
    );

    return NextResponse.json({ pending });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo seed failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
