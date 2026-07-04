import type { GcpAgent } from "./auth/gcp";
import type { ProvisionedWallet } from "./types";
export interface RecoveryShare {
    /** BIP-39 mnemonic — write this down and store offline. Never commit or `.env` this. */
    mnemonic: string;
    solanaAddress: string;
    subOrganizationId: string;
    walletId: string;
}
/**
 * Export a Turnkey wallet mnemonic encrypted to a one-time local key, then decrypt
 * so the user can write it down as a recovery share (same role as a seed phrase).
 *
 * Call immediately after wallet creation — before the guardian raises quorum to 2-of-2.
 */
export declare function generateRecoveryShare(gcp: GcpAgent, wallet: ProvisionedWallet): Promise<RecoveryShare>;
/** Alias for `generateRecoveryShare` — emergency offline backup mnemonic. */
export declare const generateRecoveryMnemonic: typeof generateRecoveryShare;
/** Print recovery instructions to the terminal during setup. */
export declare function printRecoveryShare(share: RecoveryShare): void;
