"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeviceLinkPayload = createDeviceLinkPayload;
exports.encodeDeviceLink = encodeDeviceLink;
exports.decodeDeviceLink = decodeDeviceLink;
exports.buildDeviceLinkUrl = buildDeviceLinkUrl;
const crypto_1 = require("crypto");
const LINK_TTL_MS = 15 * 60 * 1000;
function createDeviceLinkPayload(input) {
    const hasProvision = input.subOrganizationId !== undefined && input.solanaAddress !== undefined;
    return {
        v: hasProvision ? 2 : 1,
        portalUrl: input.portalUrl.replace(/\/$/, ""),
        walletName: input.walletName,
        userName: input.userName,
        linkId: (0, crypto_1.randomUUID)(),
        expiresAt: new Date(Date.now() + (input.ttlMs ?? LINK_TTL_MS)).toISOString(),
        ...(hasProvision
            ? {
                subOrganizationId: input.subOrganizationId,
                solanaAddress: input.solanaAddress,
            }
            : {}),
    };
}
function encodeDeviceLink(payload) {
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
}
function decodeDeviceLink(setup) {
    let parsed;
    try {
        parsed = JSON.parse(Buffer.from(setup, "base64url").toString("utf8"));
    }
    catch {
        throw new Error("Invalid setup link — could not decode payload.");
    }
    if (!isDeviceLinkPayload(parsed)) {
        throw new Error("Invalid setup link — malformed payload.");
    }
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
        throw new Error("This setup link has expired. Run the CLI again to generate a new QR code.");
    }
    return parsed;
}
function buildDeviceLinkUrl(payload) {
    const setup = encodeDeviceLink(payload);
    return `${payload.portalUrl}/?setup=${setup}`;
}
function isDeviceLinkPayload(value) {
    if (!value || typeof value !== "object")
        return false;
    const payload = value;
    return ((payload.v === 1 || payload.v === 2) &&
        typeof payload.portalUrl === "string" &&
        typeof payload.walletName === "string" &&
        typeof payload.userName === "string" &&
        typeof payload.linkId === "string" &&
        typeof payload.expiresAt === "string" &&
        (payload.subOrganizationId === undefined ||
            typeof payload.subOrganizationId === "string") &&
        (payload.solanaAddress === undefined || typeof payload.solanaAddress === "string"));
}
