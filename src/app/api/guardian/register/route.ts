import { NextResponse } from "next/server";
import type { PasskeyRegistration } from "agentwallets";

import { linkGuardianToProvisionedWallet } from "@/lib/server/agent-wallet/link-guardian";
import {
  adminMarkWalletLinked,
  agentWalletExists,
} from "@/lib/server/pending-transactions";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      displayName?: string;
      subOrganizationId?: string;
      passkey?: PasskeyRegistration;
    };

    if (!body.displayName?.trim() || !body.passkey || !body.subOrganizationId?.trim()) {
      return NextResponse.json(
        { error: "displayName, subOrganizationId, and passkey are required." },
        { status: 400 },
      );
    }

    const subOrganizationId = body.subOrganizationId.trim();

    if (!(await agentWalletExists(subOrganizationId))) {
      return NextResponse.json(
        { error: "Unknown agent wallet. Create it in admin first." },
        { status: 404 },
      );
    }

    const wallet = await linkGuardianToProvisionedWallet({
      subOrganizationId,
      userDisplayName: body.displayName.trim(),
      passkey: body.passkey,
    });

    await adminMarkWalletLinked(subOrganizationId);

    return NextResponse.json({
      subOrganizationId: wallet.subOrganizationId,
      solanaAddress: wallet.solanaAddress,
      walletId: wallet.walletId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Guardian registration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
