import { type DeviceLinkPayload } from "../core/link-payload";
import type { ProvisionedWallet } from "../core/types";
export interface PrintSetupQrInput {
    portalUrl: string;
    walletName: string;
    userName: string;
    ttlMinutes?: number;
    wallet: ProvisionedWallet;
}
export interface PrintSetupQrResult {
    url: string;
    payload: DeviceLinkPayload;
    wallet: ProvisionedWallet;
}
/**
 * Render a setup QR code directly in the VS Code / terminal.
 * Uses qrcode-terminal for crisp in-editor display.
 */
export declare function printSetupQr(input: PrintSetupQrInput): PrintSetupQrResult;
