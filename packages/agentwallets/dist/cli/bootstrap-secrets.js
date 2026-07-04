#!/usr/bin/env node
"use strict";
/**
 * One-time bootstrap: upload Turnkey parent-org credentials to GCP Secret Manager.
 *
 * Usage:
 *   TURNKEY_API_PUBLIC_KEY=... TURNKEY_API_PRIVATE_KEY=... TURNKEY_ORGANIZATION_ID=... \
 *     npm run gcp:bootstrap
 */
Object.defineProperty(exports, "__esModule", { value: true });
const gcp_1 = require("../core/auth/gcp");
async function main() {
    const agent = gcp_1.GcpAgent.fromEnv();
    const apiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
    const apiPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;
    const organizationId = process.env.TURNKEY_ORGANIZATION_ID;
    if (!apiPublicKey || !apiPrivateKey || !organizationId) {
        throw new Error("Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, and TURNKEY_ORGANIZATION_ID in the environment for bootstrap.");
    }
    console.log(`Bootstrapping Turnkey secrets into project ${process.env.GCP_PROJECT_ID}…`);
    await agent.verifyAccess();
    await agent.bootstrapTurnkeySecrets({
        apiPublicKey,
        apiPrivateKey,
        organizationId,
    });
    console.log("Done. Turnkey credentials are now in Secret Manager.");
    console.log("Remove them from .env and rotate any keys that were exposed locally.");
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nError: ${message}\n`);
    process.exit(1);
});
