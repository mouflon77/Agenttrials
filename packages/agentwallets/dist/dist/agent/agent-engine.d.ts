import type { SafeAgentSigner } from "../core/safe-agent-signer";
import type { SolanaTransferResult } from "../core/transfer";
/** LLM provider for AgentEngine. OpenAI has the most mature tool-calling API. */
export type LlmProvider = "openai" | "anthropic" | "gemini";
export declare const EXECUTE_SOLANA_TRANSFER_TOOL: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            recipient: {
                type: string;
                description: string;
            };
            amount_sol: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export interface AgentEngineConfig {
    /** Connected SafeAgentSigner with a loaded wallet. */
    signer: SafeAgentSigner;
    /** Defaults to `openai` — best-documented tool calling. */
    provider?: LlmProvider;
    /** API key; falls back to OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY. */
    apiKey?: string;
    /** Model override. Defaults vary by provider. */
    model?: string;
    /** Max tool-call rounds before returning. Default 8. */
    maxToolRounds?: number;
    /** Optional system prompt prepended to every run. */
    systemPrompt?: string;
}
export interface AgentToolCallRecord {
    tool: typeof EXECUTE_SOLANA_TRANSFER_TOOL.name;
    input: {
        recipient: string;
        amount_sol: number;
    };
    output: SolanaTransferResult;
}
export interface AgentRunResult {
    /** Final assistant text after tool rounds complete. */
    text: string;
    /** Transfers attempted during this run. */
    transfers: AgentToolCallRecord[];
}
/**
 * LLM agent loop with a single privileged tool: `execute_solana_transfer`.
 * Tool output is routed through {@link SafeAgentSigner} (Turnkey MPC + policies).
 */
export declare class AgentEngine {
    private readonly signer;
    private readonly provider;
    private readonly apiKey;
    private readonly model;
    private readonly maxToolRounds;
    private readonly systemPrompt;
    constructor(config: AgentEngineConfig);
    /** Run the agent on a user prompt; executes transfers via SafeAgentSigner when the LLM calls the tool. */
    run(prompt: string): Promise<AgentRunResult>;
    private runOpenAi;
    private runSingleShotProviders;
    private handleToolCall;
}
