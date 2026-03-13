// ═══════════════════════════════════════════════════════════════
// bilingualFramingLocalizer — LLM-backed zh localization step
// ═══════════════════════════════════════════════════════════════

export interface BilingualFramingLocalizerInput {
    title: string;
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
}

export interface BilingualFramingLocalizedOutput {
    title: string;
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
}

const REQUIRED_KEYS = [
    "title_zh",
    "research_question_zh",
    "background_zh",
    "purpose_zh",
    "method_zh",
    "result_zh",
    "contribution_zh",
] as const;

export function buildSystemPrompt(): string {
    return [
        "You are a bilingual academic writing assistant specialising in design research.",
        "Your task is to produce natural, publication-ready Traditional Chinese versions of the provided English framing fields.",
        "",
        "Requirements:",
        "• Write in native academic Traditional Chinese (正體中文).",
        "• Preserve the original research meaning and logical structure.",
        "• Keep each field concise and parallel to the English source.",
        "• Do not output English text.",
        "• Return ONLY valid JSON.",
        "",
        "Return exactly these keys:",
        '  "title_zh": string',
        '  "research_question_zh": string',
        '  "background_zh": string',
        '  "purpose_zh": string',
        '  "method_zh": string',
        '  "result_zh": string',
        '  "contribution_zh": string',
    ].join("\n");
}

export function buildUserPrompt(
    input: BilingualFramingLocalizerInput,
): string {
    return [
        "── English framing package ──",
        `Title: ${input.title}`,
        `Research Question: ${input.research_question}`,
        `Background: ${input.background}`,
        `Purpose: ${input.purpose}`,
        `Method: ${input.method}`,
        `Result: ${input.result}`,
        `Contribution: ${input.contribution}`,
        "",
        "Generate the Traditional Chinese versions as JSON.",
    ].join("\n");
}

export function parseBilingualFramingLocalization(
    raw: string,
): BilingualFramingLocalizedOutput {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    for (const key of REQUIRED_KEYS) {
        const value = parsed[key];
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(`Missing or empty field: "${key}"`);
        }
    }

    return {
        title: String(parsed.title_zh).trim(),
        research_question: String(parsed.research_question_zh).trim(),
        background: String(parsed.background_zh).trim(),
        purpose: String(parsed.purpose_zh).trim(),
        method: String(parsed.method_zh).trim(),
        result: String(parsed.result_zh).trim(),
        contribution: String(parsed.contribution_zh).trim(),
    };
}

export async function bilingualFramingLocalizer(
    input: BilingualFramingLocalizerInput,
    callLLM: (system: string, user: string) => Promise<string>,
): Promise<BilingualFramingLocalizedOutput> {
    const raw = await callLLM(
        buildSystemPrompt(),
        buildUserPrompt(input),
    );
    return parseBilingualFramingLocalization(raw);
}
