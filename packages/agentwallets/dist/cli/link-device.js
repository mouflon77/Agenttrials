#!/usr/bin/env node
"use strict";
/** @deprecated Use `npm run setup` instead. */
Object.defineProperty(exports, "__esModule", { value: true });
const safe_agent_signer_1 = require("../core/safe-agent-signer");
function parseArg(flag) {
    const index = process.argv.indexOf(flag);
    if (index === -1)
        return undefined;
    return process.argv[index + 1];
}
async function main() {
    const userName = parseArg("--user-name") ?? "User";
    const walletName = parseArg("--wallet-name");
    const portalUrl = parseArg("--portal-url");
    const signer = await safe_agent_signer_1.SafeAgentSigner.init(portalUrl ? { approvalPortalUrl: portalUrl } : undefined);
    signer.setup({ userName, walletName });
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
