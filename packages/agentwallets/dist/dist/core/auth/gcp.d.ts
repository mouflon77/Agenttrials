import { Turnkey } from "@turnkey/sdk-server";
/** Turnkey credentials stored in GCP Secret Manager. */
export interface TurnkeySecrets {
    apiPublicKey: string;
    apiPrivateKey: string;
    /** Parent org used to create sub-organizations. */
    organizationId: string;
}
/** Secret resource IDs inside GCP Secret Manager (not full paths). */
export interface GcpSecretNames {
    apiPublicKey: string;
    apiPrivateKey: string;
    organizationId: string;
}
/** Sensible defaults — override via config or env. */
export declare const DEFAULT_GCP_SECRET_NAMES: GcpSecretNames;
export interface GcpAgentConfig {
    projectId: string;
    secretNames?: Partial<GcpSecretNames>;
}
export interface AgentKeyPair {
    publicKey: string;
    privateKey: string;
}
/**
 * GCP Secret Manager integration for the Agent identity.
 */
export declare class GcpAgent {
    private readonly config;
    private readonly secretClient;
    private readonly secretNames;
    constructor(config: GcpAgentConfig);
    /** Build config from environment variables. */
    static fromEnv(overrides?: Partial<GcpAgentConfig>): GcpAgent;
    /** Verify ADC + Secret Manager access before running the agent. */
    verifyAccess(): Promise<void>;
    private secretPath;
    private secretVersionPath;
    /** Fetch a single secret value as UTF-8 text. */
    readSecret(secretId: string): Promise<string>;
    /** Create the secret container if it does not exist yet. */
    ensureSecretExists(secretId: string): Promise<void>;
    /** Write a new secret version (append-only in Secret Manager). */
    writeSecret(secretId: string, value: string): Promise<void>;
    /**
     * One-time bootstrap: upload Turnkey parent-org credentials into Secret Manager.
     * Run locally once, then delete the values from your shell history / .env.
     */
    bootstrapTurnkeySecrets(secrets: TurnkeySecrets): Promise<void>;
    /** Load parent-org Turnkey credentials from Secret Manager. */
    loadTurnkeySecrets(): Promise<TurnkeySecrets>;
    /** Turnkey client for the parent organization (creates sub-orgs). */
    createParentClient(secrets: TurnkeySecrets): Turnkey;
    /**
     * Turnkey client scoped to a wallet sub-org using the agent's API key.
     * This is the key that auto-signs small transactions.
     */
    createSubOrgAgentClient(subOrganizationId: string, agentApiPublicKey: string, agentApiPrivateKey: string): Turnkey;
    /** Generate a fresh P-256 API key pair for a new wallet agent. */
    generateAgentKeyPair(): AgentKeyPair;
    /** Load JSON payload from a secret. */
    loadJsonSecret<T>(secretId: string): Promise<T>;
    /** Store JSON payload as a new secret version. */
    storeJsonSecret(secretId: string, data: unknown): Promise<void>;
    /** Persist per-wallet agent keys (JSON) in Secret Manager. */
    storeAgentKeys(secretId: string, keys: AgentKeyPair): Promise<void>;
    /** Load per-wallet agent keys previously stored by `storeAgentKeys`. */
    loadAgentKeys(secretId: string): Promise<AgentKeyPair>;
}
