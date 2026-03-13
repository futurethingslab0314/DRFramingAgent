// ═══════════════════════════════════════════════════════════════
// interpretContext — LLM-backed interpretation layer
// ═══════════════════════════════════════════════════════════════

import type {
    ArtifactProfile,
    EpistemicProfile,
    InterpretationSummary,
    KeywordIndex,
    KeywordMapByOrientation,
    ReasoningControl,
} from "../schema/framingConstellationBot.js";
import type { StructuredResearchContext } from "../utils/researchContext.js";

export interface InterpretContextInput {
    context: StructuredResearchContext;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
    keyword_map_by_orientation: KeywordMapByOrientation;
    keyword_index: KeywordIndex;
    reasoning_control: ReasoningControl;
}

function topSteeringKeywords(input: InterpretContextInput, limit = 5): string[] {
    const weighted = Object.entries(input.keyword_index)
        .sort(([, a], [, b]) => b.weight - a.weight)
        .slice(0, limit)
        .map(([term]) => term);

    return weighted;
}

export function buildSystemPrompt(): string {
    return [
        "You are an interpretation assistant for design-research framing.",
        "Your job is to summarize how the system is reading the user's research input before final framing generation.",
        "",
        "Requirements:",
        "• Be concise and operator-readable.",
        "• Do not generate final framing prose.",
        "• Mention ambiguity only when it matters.",
        "• Return ONLY valid JSON.",
        "",
        "Return exactly these keys:",
        '  "topic_summary": string',
        '  "context_summary": string',
        '  "goal_summary": string',
        '  "method_constraints_summary": string',
        '  "inferred_research_direction": string',
        '  "inferred_contribution_mode": string',
        '  "possible_risks": string[]',
        '  "steering_keywords": string[]',
    ].join("\n");
}

export function buildUserPrompt(input: InterpretContextInput): string {
    const steeringKeywords = topSteeringKeywords(input);

    return [
        "── Structured research context ──",
        `Research topic: ${input.context.research_topic}`,
        `Target context: ${input.context.target_context}`,
        `Research goal: ${input.context.research_goal}`,
        `Method or constraints: ${input.context.method_or_constraints ?? "None provided"}`,
        "",
        "── Steering signals ──",
        `Logic pattern: ${input.reasoning_control.logic_pattern}`,
        `RQ templates: ${input.reasoning_control.rq_templates.join("; ")}`,
        `Method logic: ${input.reasoning_control.method_logic.join("; ")}`,
        `Contribution logic: ${input.reasoning_control.contribution_logic.join("; ")}`,
        `Tone lexicon: ${input.reasoning_control.tone_lexicon.join(", ")}`,
        `Steering keywords: ${steeringKeywords.join(", ")}`,
        "",
        "Generate the interpretation summary as JSON.",
    ].join("\n");
}

function requireString(parsed: Record<string, unknown>, key: string): string {
    const value = parsed[key];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Missing or empty field: "${key}"`);
    }
    return value.trim();
}

function requireStringArray(parsed: Record<string, unknown>, key: string): string[] {
    const value = parsed[key];
    if (!Array.isArray(value)) {
        throw new Error(`Missing or invalid field: "${key}"`);
    }

    const output = value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim());

    if (output.length === 0) {
        throw new Error(`Missing or empty field: "${key}"`);
    }

    return output;
}

export function parseInterpretationSummary(raw: string): InterpretationSummary {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
        topic_summary: requireString(parsed, "topic_summary"),
        context_summary: requireString(parsed, "context_summary"),
        goal_summary: requireString(parsed, "goal_summary"),
        method_constraints_summary:
            typeof parsed.method_constraints_summary === "string"
                ? parsed.method_constraints_summary.trim() || undefined
                : undefined,
        inferred_research_direction: requireString(
            parsed,
            "inferred_research_direction",
        ),
        inferred_contribution_mode: requireString(
            parsed,
            "inferred_contribution_mode",
        ),
        possible_risks: requireStringArray(parsed, "possible_risks"),
        steering_keywords: requireStringArray(parsed, "steering_keywords"),
    };
}

export async function interpretContext(
    input: InterpretContextInput,
    callLLM: (system: string, user: string) => Promise<string>,
): Promise<InterpretationSummary> {
    const raw = await callLLM(buildSystemPrompt(), buildUserPrompt(input));
    return parseInterpretationSummary(raw);
}
