/**
 * Agent Solana Wallet SDK
 *
 * Stupid-easy setup:
 *
 * ```ts
 * import { SafeAgentSigner } from "agentwallets";
 *
 * const signer = await SafeAgentSigner.init();
 * signer.setup({ userName: "Alice" }); // QR appears in your terminal
 * ```
 *
 * Run `npm run setup` for the interactive CLI.
 */
export { SafeAgentSigner, createSafeAgentSigner, type SafeAgentSignerConfig, type SafeAgentSetupInput, } from "./core/safe-agent-signer";
export { GcpAgent, DEFAULT_GCP_SECRET_NAMES } from "./core/auth/gcp";
export { UserDevice } from "./core/auth/user";
export { SecureWalletOrchestrator, createOrchestrator, type SecureWalletOrchestratorConfig, } from "./core/orchestrator";
export { TurnkeySolanaWallet, type SolanaWalletSigner, type TurnkeySolanaWalletConfig, type TurnkeySigningClient, } from "./core/turnkey-solana-wallet";
export { TurnkeyAgentSigner, type TurnkeyAgentSignerConfig, type TransactionSigner, isLegacyKeypairSigner, } from "./core/adapter";
export { generateRecoveryShare, generateRecoveryMnemonic, printRecoveryShare, type RecoveryShare, } from "./core/recovery-share";
export { syncPoliciesToTurnkey, thresholdSolFromEnv, type SyncPoliciesResult, } from "./core/sync-policies";
export { AGENT_AUTO_SIGN_POLICY_NAME, HUMAN_APPROVAL_POLICY_NAME, } from "./core/policies";
export { sendAndConfirmWithWallet, sendWithWallet } from "./core/send-and-confirm";
export { executeSolanaTransfer, buildSolTransferTransactionWithConnection, type SolanaTransferInput, type SolanaTransferResult, } from "./core/transfer";
export { AgentEngine, EXECUTE_SOLANA_TRANSFER_TOOL, type AgentEngineConfig, type AgentRunResult, type AgentToolCallRecord, type LlmProvider, } from "./agent/agent-engine";
export { printSetupQr, type PrintSetupQrInput, type PrintSetupQrResult } from "./cli/setup-qr";
export { buildDeviceLinkUrl, createDeviceLinkPayload, decodeDeviceLink, encodeDeviceLink, type DeviceLinkPayload, } from "./core/link-payload";
export type { GcpAgentConfig, GcpSecretNames, TurnkeySecrets, AgentKeyPair, } from "./core/auth/gcp";
export type { UserDeviceConfig } from "./core/auth/user";
export type { PasskeyRegistration, ProvisionedWallet, SecureWallet, SignatureResult, HumanApprovalRequired, SignedResult, SolanaTransaction, } from "./core/types";
