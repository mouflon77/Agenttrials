import { NextResponse } from "next/server";

import { AdminAuthError, requireAdminRequest } from "@/lib/server/admin-auth";
import { provisionAgentWallet } from "@/lib/server/agent-wallet/provision";
import { adminSaveProvisionedWallet } from "@/lib/server/pending-transactions";

export async function POST(request: Request) {
  try {
    const { uid } = await requireAdminRequest(request);
    const body = (await request.json()) as {
      displayName?: string;
      guardianName?: string;
    };

    if (!body.displayName?.trim()) {
      return NextResponse.json(
        { error: "displayName is required." },
        { status: 400 },
      );
    }

    const result = await provisionAgentWallet({
      displayName: body.displayName.trim(),
      guardianName: body.guardianName?.trim(),
    });

    await adminSaveProvisionedWallet({
      id: result.subOrganizationId,
      displayName: body.displayName.trim(),
      subOrganizationId: result.subOrganizationId,
      solanaAddress: result.solanaAddress,
      walletSecretId: result.walletSecretId,
      createdBy: uid,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Wallet provisioning failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
