"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcpAgent = exports.DEFAULT_GCP_SECRET_NAMES = void 0;
const secret_manager_1 = require("@google-cloud/secret-manager");
const sdk_server_1 = require("@turnkey/sdk-server");
const crypto_1 = require("@turnkey/crypto");
/** Sensible defaults — override via config or env. */
exports.DEFAULT_GCP_SECRET_NAMES = {
    apiPublicKey: "turnkey-api-public-key",
    apiPrivateKey: "turnkey-api-private-key",
    organizationId: "turnkey-organization-id",
};
/**
 * GCP Secret Manager integration for the Agent identity.
 *
 * Authenticates via Application Default Credentials (ADC):
 *   • Local dev  → `gcloud auth application-default login`
 *   • Cloud Run  → attached service account (automatic)
 *   • Vercel     → `GCP_SERVICE_ACCOUNT_JSON` env var (full service account JSON)
 *
 * Never reads Turnkey keys from `.env` at runtime — only from Secret Manager.
 */
function createSecretManagerClient() {
    const json = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (json) {
        return new secret_manager_1.SecretManagerServiceClient({
            credentials: JSON.parse(json),
        });
    }
    return new secret_manager_1.SecretManagerServiceClient();
}
/**
 * GCP Secret Manager integration for the Agent identity.
 */
class GcpAgent {
    config;
    secretClient;
    secretNames;
    constructor(config) {
        this.config = config;
        this.secretClient = createSecretManagerClient();
        this.secretNames = {
            ...exports.DEFAULT_GCP_SECRET_NAMES,
            ...config.secretNames,
        };
    }
    /** Build config from environment variables. */
    static fromEnv(overrides) {
        const projectId = overrides?.projectId ?? process.env.GCP_PROJECT_ID;
        if (!projectId) {
            throw new Error("GCP_PROJECT_ID is required. Set it in the environment or pass projectId explicitly.");
        }
        return new GcpAgent({
            projectId,
            secretNames: {
                apiPublicKey: process.env.GCP_SECRET_TURNKEY_API_PUBLIC_KEY ??
                    exports.DEFAULT_GCP_SECRET_NAMES.apiPublicKey,
                apiPrivateKey: process.env.GCP_SECRET_TURNKEY_API_PRIVATE_KEY ??
                    exports.DEFAULT_GCP_SECRET_NAMES.apiPrivateKey,
                organizationId: process.env.GCP_SECRET_TURNKEY_ORG_ID ??
                    exports.DEFAULT_GCP_SECRET_NAMES.organizationId,
            },
            ...overrides,
        });
    }
    /** Verify ADC + Secret Manager access before running the agent. */
    async verifyAccess() {
        await this.secretClient.listSecrets({
            parent: `projects/${this.config.projectId}`,
            pageSize: 1,
        });
    }
    secretPath(secretId) {
        return `projects/${this.config.projectId}/secrets/${secretId}`;
    }
    secretVersionPath(secretId, version = "latest") {
        return `${this.secretPath(secretId)}/versions/${version}`;
    }
    /** Fetch a single secret value as UTF-8 text. */
    async readSecret(secretId) {
        const [version] = await this.secretClient.accessSecretVersion({
            name: this.secretVersionPath(secretId),
        });
        const payload = version.payload?.data;
        if (!payload) {
            throw new Error(`Secret "${secretId}" is empty or missing.`);
        }
        return payload.toString();
    }
    /** Create the secret container if it does not exist yet. */
    async ensureSecretExists(secretId) {
        try {
            await this.secretClient.getSecret({
                name: this.secretPath(secretId),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.includes("NOT_FOUND") && !message.includes("Not found")) {
                throw error;
            }
            await this.secretClient.createSecret({
                parent: `projects/${this.config.projectId}`,
                secretId,
                secret: {
                    replication: { automatic: {} },
                    labels: {
                        managed_by: "agentwallets",
                        purpose: "turnkey-credentials",
                    },
                },
            });
        }
    }
    /** Write a new secret version (append-only in Secret Manager). */
    async writeSecret(secretId, value) {
        await this.ensureSecretExists(secretId);
        await this.secretClient.addSecretVersion({
            parent: this.secretPath(secretId),
            payload: { data: Buffer.from(value, "utf8") },
        });
    }
    /**
     * One-time bootstrap: upload Turnkey parent-org credentials into Secret Manager.
     * Run locally once, then delete the values from your shell history / .env.
     */
    async bootstrapTurnkeySecrets(secrets) {
        const { secretNames } = this;
        await Promise.all([
            this.writeSecret(secretNames.apiPublicKey, secrets.apiPublicKey),
            this.writeSecret(secretNames.apiPrivateKey, secrets.apiPrivateKey),
            this.writeSecret(secretNames.organizationId, secrets.organizationId),
        ]);
    }
    /** Load parent-org Turnkey credentials from Secret Manager. */
    async loadTurnkeySecrets() {
        const { secretNames } = this;
        const [apiPublicKey, apiPrivateKey, organizationId] = await Promise.all([
            this.readSecret(secretNames.apiPublicKey),
            this.readSecret(secretNames.apiPrivateKey),
            this.readSecret(secretNames.organizationId),
        ]);
        return { apiPublicKey, apiPrivateKey, organizationId };
    }
    /** Turnkey client for the parent organization (creates sub-orgs). */
    createParentClient(secrets) {
        return new sdk_server_1.Turnkey({
            apiBaseUrl: process.env.TURNKEY_API_BASE_URL ?? "https://api.turnkey.com",
            apiPublicKey: secrets.apiPublicKey,
            apiPrivateKey: secrets.apiPrivateKey,
            defaultOrganizationId: secrets.organizationId,
        });
    }
    /**
     * Turnkey client scoped to a wallet sub-org using the agent's API key.
     * This is the key that auto-signs small transactions.
     */
    createSubOrgAgentClient(subOrganizationId, agentApiPublicKey, agentApiPrivateKey) {
        return new sdk_server_1.Turnkey({
            apiBaseUrl: process.env.TURNKEY_API_BASE_URL ?? "https://api.turnkey.com",
            apiPublicKey: agentApiPublicKey,
            apiPrivateKey: agentApiPrivateKey,
            defaultOrganizationId: subOrganizationId,
        });
    }
    /** Generate a fresh P-256 API key pair for a new wallet agent. */
    generateAgentKeyPair() {
        const pair = (0, crypto_1.generateP256KeyPair)();
        return { publicKey: pair.publicKey, privateKey: pair.privateKey };
    }
    /** Load JSON payload from a secret. */
    async loadJsonSecret(secretId) {
        const raw = await this.readSecret(secretId);
        return JSON.parse(raw);
    }
    /** Store JSON payload as a new secret version. */
    async storeJsonSecret(secretId, data) {
        await this.writeSecret(secretId, JSON.stringify(data));
    }
    /** Persist per-wallet agent keys (JSON) in Secret Manager. */
    async storeAgentKeys(secretId, keys) {
        await this.writeSecret(secretId, JSON.stringify(keys));
    }
    /** Load per-wallet agent keys previously stored by `storeAgentKeys`. */
    async loadAgentKeys(secretId) {
        const raw = await this.readSecret(secretId);
        const parsed = JSON.parse(raw);
        if (!parsed.publicKey || !parsed.privateKey) {
            throw new Error(`Secret "${secretId}" is not a valid agent key pair.`);
        }
        return parsed;
    }
}
exports.GcpAgent = GcpAgent;
