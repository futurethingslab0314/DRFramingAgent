// ═══════════════════════════════════════════════════════════════
// FramingGeneratorMVP — LLM-backed skill
// ═══════════════════════════════════════════════════════════════

import type {
    ReasoningControl,
} from "../../frontend/src/schema/framingConstellationBot";

// ─── Input / Output types ────────────────────────────────────

export interface FramingGeneratorInput {
    user_context: string;
    rule_engine_output: ReasoningControl;
}

export interface FramingGeneratorOutput {
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
}

// ─── Prompt builder ──────────────────────────────────────────

export function buildSystemPrompt(
    rule: ReasoningControl,
): string {
    return [
        "You are an academic framing assistant for design research.",
        "Your task is to generate six concise framing fields for a research paper.",
        "",
        "── Epistemic stance ──",
        `Logic pattern: ${rule.logic_pattern}`,
        "",
        "── RQ templates (draw from these structures) ──",
        ...rule.rq_templates.map((t) => `• ${t}`),
        "",
        "── Method vocabulary (must reference) ──",
        ...rule.method_logic.map((m) => `• ${m}`),
        "",
        "── Contribution framing (must echo) ──",
        ...rule.contribution_logic.map((c) => `• ${c}`),
        "",
        "── Preferred tone lexicon (weave in where natural) ──",
        rule.tone_lexicon.join(", "),
        "",
        "── Hard constraints ──",
        ...rule.constraints.map((c) => `• ${c}`),
        "",
        "── Additional constraints ──",
        "• Not all RQs must be problem-solving; allow exploratory or meaning-making framings where the logic pattern calls for it.",
        "• Each field must be 1-2 sentences. Be concise.",
        "",
        "Return ONLY valid JSON with exactly these keys:",
        '  "research_question": string (1 sentence)',
        '  "background": string (1-2 sentences)',
        '  "purpose": string (1-2 sentences)',
        '  "method": string (1-2 sentences)',
        '  "result": string (1-2 sentences)',
        '  "contribution": string (1-2 sentences)',
    ].join("\n");
}

export function buildUserPrompt(userContext: string): string {
    return [
        "── Design / research context ──",
        userContext,
        "",
        "Generate the six framing fields as JSON.",
    ].join("\n");
}

// ─── LLM call wrapper ────────────────────────────────────────

/**
 * Calls the LLM and parses the JSON response.
 *
 * `callLLM` is injected so the skill stays runtime-agnostic —
 * callers supply their own OpenAI / Anthropic / local wrapper.
 */
export async function framingGeneratorMVP(
    input: FramingGeneratorInput,
    callLLM: (system: string, user: string) => Promise<string>,
): Promise<FramingGeneratorOutput> {
    const system = buildSystemPrompt(input.rule_engine_output);
    const user = buildUserPrompt(input.user_context);

    const raw = await callLLM(system, user);

    // ── Parse & validate ───────────────────────────────────────
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const REQUIRED_KEYS: (keyof FramingGeneratorOutput)[] = [
        "research_question",
        "background",
        "purpose",
        "method",
        "result",
        "contribution",
    ];

    const output: Record<string, string> = {};

    for (const key of REQUIRED_KEYS) {
        const value = parsed[key];
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(`Missing or empty field: "${key}"`);
        }
        output[key] = value.trim();
    }

    return output as unknown as FramingGeneratorOutput;
}
