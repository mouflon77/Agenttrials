"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentEngine = exports.EXECUTE_SOLANA_TRANSFER_TOOL = void 0;
exports.EXECUTE_SOLANA_TRANSFER_TOOL = {
    name: "execute_solana_transfer",
    description: "Send native SOL from the agent wallet to a recipient. Only call when the user clearly wants to move funds.",
    parameters: {
        type: "object",
        properties: {
            recipient: {
                type: "string",
                description: "Recipient Solana address (base58).",
            },
            amount_sol: {
                type: "number",
                description: "Amount to send in SOL (not lamports).",
            },
        },
        required: ["recipient", "amount_sol"],
    },
};
const DEFAULT_MODELS = {
    openai: "gpt-4o-mini",
    anthropic: "claude-sonnet-4-20250514",
    gemini: "gemini-2.0-flash",
};
const SYSTEM_PROMPT = `You are a Solana wallet agent. You can move funds only by calling execute_solana_transfer.
Never invent transaction signatures. If a transfer requires human approval, tell the user to open the Guardian app on their phone.`;
function resolveApiKey(provider, override) {
    const key = override ??
        (provider === "openai"
            ? process.env.OPENAI_API_KEY
            : provider === "anthropic"
                ? process.env.ANTHROPIC_API_KEY
                : process.env.GEMINI_API_KEY);
    if (!key) {
        throw new Error(`Missing API key for ${provider}. Set ${provider === "openai" ? "OPENAI_API_KEY" : provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY"} or pass apiKey.`);
    }
    return key;
}
function parseTransferArgs(raw) {
    const parsed = JSON.parse(raw);
    if (!parsed.recipient || typeof parsed.amount_sol !== "number") {
        throw new Error("execute_solana_transfer requires recipient (string) and amount_sol (number).");
    }
    return { recipient: parsed.recipient, amount_sol: parsed.amount_sol };
}
function formatTransferResult(result) {
    if (result.result.status === "signed") {
        return JSON.stringify({
            status: "signed",
            recipient: result.recipient,
            amount_sol: result.amountSol,
            signature: result.signature,
        });
    }
    return JSON.stringify({
        status: "requires_human_approval",
        recipient: result.recipient,
        amount_sol: result.amountSol,
        threshold_sol: result.result.thresholdSol,
        solana_address: result.result.solanaAddress,
        message: "Transfer queued — user must approve in the Guardian app (Face ID).",
    });
}
async function callOpenAi(apiKey, model, messages) {
    const OpenAI = (await Promise.resolve().then(() => __importStar(require("openai")))).default;
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
        model,
        messages,
        tools: [
            {
                type: "function",
                function: exports.EXECUTE_SOLANA_TRANSFER_TOOL,
            },
        ],
    });
    const choice = response.choices[0]?.message;
    const toolCalls = choice?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
    })) ?? [];
    return {
        assistantText: choice?.content ?? "",
        toolCalls,
    };
}
async function callAnthropic(apiKey, model, systemPrompt, userPrompt, toolResults) {
    const messages = [
        { role: "user", content: userPrompt },
    ];
    if (toolResults.length > 0) {
        messages.push({
            role: "user",
            content: toolResults.map((r) => ({
                type: "tool_result",
                tool_use_id: r.toolUseId,
                content: r.content,
            })),
        });
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            tools: [
                {
                    name: exports.EXECUTE_SOLANA_TRANSFER_TOOL.name,
                    description: exports.EXECUTE_SOLANA_TRANSFER_TOOL.description,
                    input_schema: exports.EXECUTE_SOLANA_TRANSFER_TOOL.parameters,
                },
            ],
            messages,
        }),
    });
    if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
    }
    const data = (await response.json());
    let assistantText = "";
    const toolCalls = [];
    for (const block of data.content) {
        if (block.type === "text")
            assistantText += block.text;
        if (block.type === "tool_use") {
            toolCalls.push({
                id: block.id,
                name: block.name,
                arguments: JSON.stringify(block.input),
            });
        }
    }
    return { assistantText, toolCalls };
}
async function callGemini(apiKey, model, systemPrompt, userPrompt, toolResults) {
    const contents = [
        { role: "user", parts: [{ text: userPrompt }] },
    ];
    for (const result of toolResults) {
        contents.push({
            role: "user",
            parts: [
                {
                    functionResponse: {
                        name: exports.EXECUTE_SOLANA_TRANSFER_TOOL.name,
                        response: JSON.parse(result.content),
                    },
                },
            ],
        });
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: [
                {
                    functionDeclarations: [
                        {
                            name: exports.EXECUTE_SOLANA_TRANSFER_TOOL.name,
                            description: exports.EXECUTE_SOLANA_TRANSFER_TOOL.description,
                            parameters: exports.EXECUTE_SOLANA_TRANSFER_TOOL.parameters,
                        },
                    ],
                },
            ],
        }),
    });
    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }
    const data = (await response.json());
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    let assistantText = "";
    const toolCalls = [];
    for (const part of parts) {
        if ("text" in part && part.text)
            assistantText += part.text;
        if ("functionCall" in part && part.functionCall) {
            toolCalls.push({
                id: `gemini-${toolCalls.length}`,
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args),
            });
        }
    }
    return { assistantText, toolCalls };
}
/**
 * LLM agent loop with a single privileged tool: `execute_solana_transfer`.
 * Tool output is routed through {@link SafeAgentSigner} (Turnkey MPC + policies).
 */
class AgentEngine {
    signer;
    provider;
    apiKey;
    model;
    maxToolRounds;
    systemPrompt;
    constructor(config) {
        this.signer = config.signer;
        this.provider = config.provider ?? "openai";
        this.apiKey = resolveApiKey(this.provider, config.apiKey);
        this.model = config.model ?? DEFAULT_MODELS[this.provider];
        this.maxToolRounds = config.maxToolRounds ?? 8;
        this.systemPrompt = config.systemPrompt ?? SYSTEM_PROMPT;
    }
    /** Run the agent on a user prompt; executes transfers via SafeAgentSigner when the LLM calls the tool. */
    async run(prompt) {
        this.signer.getWallet();
        const transfers = [];
        if (this.provider === "openai") {
            return this.runOpenAi(prompt, transfers);
        }
        return this.runSingleShotProviders(prompt, transfers);
    }
    async runOpenAi(prompt, transfers) {
        const messages = [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: prompt },
        ];
        let finalText = "";
        for (let round = 0; round < this.maxToolRounds; round++) {
            const turn = await callOpenAi(this.apiKey, this.model, messages);
            if (turn.toolCalls.length === 0) {
                finalText = turn.assistantText;
                break;
            }
            messages.push({
                role: "assistant",
                content: turn.assistantText || null,
                tool_calls: turn.toolCalls.map((call) => ({
                    id: call.id,
                    type: "function",
                    function: { name: call.name, arguments: call.arguments },
                })),
            });
            for (const call of turn.toolCalls) {
                const content = await this.handleToolCall(call, transfers);
                messages.push({ role: "tool", tool_call_id: call.id, content });
            }
            if (round === this.maxToolRounds - 1) {
                finalText =
                    turn.assistantText ||
                        "Stopped after max tool rounds. Check transfers for results.";
            }
        }
        return { text: finalText, transfers };
    }
    async runSingleShotProviders(prompt, transfers) {
        let finalText = "";
        const anthropicResults = [];
        const geminiResults = [];
        for (let round = 0; round < this.maxToolRounds; round++) {
            const turn = this.provider === "anthropic"
                ? await callAnthropic(this.apiKey, this.model, this.systemPrompt, prompt, anthropicResults)
                : await callGemini(this.apiKey, this.model, this.systemPrompt, prompt, geminiResults);
            if (turn.toolCalls.length === 0) {
                finalText = turn.assistantText;
                break;
            }
            for (const call of turn.toolCalls) {
                const content = await this.handleToolCall(call, transfers);
                if (this.provider === "anthropic") {
                    anthropicResults.push({ toolUseId: call.id, content });
                }
                else {
                    geminiResults.push({ content });
                }
            }
            if (round === this.maxToolRounds - 1) {
                finalText =
                    turn.assistantText ||
                        "Stopped after max tool rounds. Check transfers for results.";
            }
        }
        return { text: finalText, transfers };
    }
    async handleToolCall(call, transfers) {
        if (call.name !== exports.EXECUTE_SOLANA_TRANSFER_TOOL.name) {
            throw new Error(`Unknown tool: ${call.name}`);
        }
        const args = parseTransferArgs(call.arguments);
        const output = await this.signer.executeSolanaTransfer({
            recipient: args.recipient,
            amountSol: args.amount_sol,
        });
        transfers.push({
            tool: exports.EXECUTE_SOLANA_TRANSFER_TOOL.name,
            input: args,
            output,
        });
        return formatTransferResult(output);
    }
}
exports.AgentEngine = AgentEngine;
