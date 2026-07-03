"use client";

import { Turnkey, SessionType } from "@turnkey/sdk-browser";
import { TurnkeySigner } from "@turnkey/solana";
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

export interface PasskeyRegistration {
  encodedChallenge: string;
  attestation: object;
}

export interface UserDeviceConfig {
  rpId: string;
  organizationId: string;
  apiBaseUrl?: string;
}

type SolanaTransaction = Transaction | VersionedTransaction;

/** Browser Passkey client for guardian registration and transaction signing. */
export class UserDevice {
  private readonly turnkey: Turnkey;
  private readonly passkeyClient: ReturnType<Turnkey["passkeyClient"]>;
  private indexedDbClient: Awaited<
    ReturnType<Turnkey["indexedDbClient"]>
  > | null = null;

  constructor(config: UserDeviceConfig) {
    this.turnkey = new Turnkey({
      rpId: config.rpId,
      apiBaseUrl: config.apiBaseUrl ?? "https://api.turnkey.com",
      defaultOrganizationId: config.organizationId,
    });
    this.passkeyClient = this.turnkey.passkeyClient();
  }

  private async getIndexedDbClient() {
    if (!this.indexedDbClient) {
      this.indexedDbClient = await this.turnkey.indexedDbClient();
    }
    return this.indexedDbClient;
  }

  async registerPasskey(displayName: string): Promise<PasskeyRegistration> {
    const passkey = await this.passkeyClient.createUserPasskey({
      publicKey: {
        rp: { name: "Agent Wallet" },
        user: { name: displayName, displayName },
      },
    });

    return {
      encodedChallenge: passkey.encodedChallenge,
      attestation: passkey.attestation,
    };
  }

  async login(subOrganizationId: string, _solanaAddress?: string): Promise<void> {
    const indexedDb = await this.getIndexedDbClient();
    await indexedDb.init();

    const publicKey = await indexedDb.getPublicKey();
    if (!publicKey) {
      throw new Error("IndexedDB key pair missing — call registerPasskey first.");
    }

    await this.passkeyClient.loginWithPasskey({
      organizationId: subOrganizationId,
      sessionType: SessionType.READ_WRITE,
      publicKey,
      expirationSeconds: "3600",
    });
  }

  getWallet(subOrganizationId: string, solanaAddress: string) {
    const signer = new TurnkeySigner({
      organizationId: subOrganizationId,
      client: this.passkeyClient,
    });
    const address = solanaAddress;

    return {
      publicKey: new PublicKey(address),
      signTransaction: async <T extends SolanaTransaction>(tx: T): Promise<T> =>
        (await signer.signTransaction(tx, address)) as T,
    };
  }
}
