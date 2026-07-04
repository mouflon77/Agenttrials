/** Payload embedded in the setup QR code / deep link. */
export interface DeviceLinkPayload {
    /** v2 includes sub-org + address from CLI provisioning. */
    v: 1 | 2;
    portalUrl: string;
    walletName: string;
    userName: string;
    linkId: string;
    /** ISO-8601 expiry — links are single-use and time-boxed. */
    expiresAt: string;
    /** Turnkey sub-org created by `npm run setup` (v2 only). */
    subOrganizationId?: string;
    /** Solana address to fund before / after linking (v2 only). */
    solanaAddress?: string;
}
export declare function createDeviceLinkPayload(input: {
    portalUrl: string;
    walletName: string;
    userName: string;
    ttlMs?: number;
    subOrganizationId?: string;
    solanaAddress?: string;
}): DeviceLinkPayload;
export declare function encodeDeviceLink(payload: DeviceLinkPayload): string;
export declare function decodeDeviceLink(setup: string): DeviceLinkPayload;
export declare function buildDeviceLinkUrl(payload: DeviceLinkPayload): string;
