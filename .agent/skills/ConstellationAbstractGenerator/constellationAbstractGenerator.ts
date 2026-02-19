// ═══════════════════════════════════════════════════════════════
// ConstellationAbstractGenerator — LLM-backed skill
// ═══════════════════════════════════════════════════════════════

// ─── Input / Output types ────────────────────────────────────

export interface AbstractGeneratorInput {
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
}

export interface AbstractGeneratorOutput {
    abstract_en: string;
    abstract_zh: string;
}

// ─── Prompt builders ─────────────────────────────────────────

export function buildSystemPrompt(): string {
    return [
        "You are a bilingual academic writing assistant specialising in design research.",
        "",
        "You will receive five framing fields for a research paper.",
        "Your task is to produce two abstracts:",
        "",
        "1. **abstract_en** — an English abstract of approximately 150 words.",
        "   Weave the five fields into a single coherent paragraph.",
        "",
        "2. **abstract_zh** — a Traditional Chinese (正體中文) abstract of",
        "   approximately 150 characters.",
        "   This must be written NATIVELY in academic Traditional Chinese —",
        "   it is NOT a translation of the English abstract.",
        "   It should convey the same research scope but use idiomatic",
        "   Chinese academic phrasing and structure.",
        "",
        "── Constraints ──",
        "• abstract_en: 120-180 words.",
        "• abstract_zh: 120-180 characters (Chinese characters, excluding punctuation for counting purposes).",
        "• Do not include the field labels (background, purpose, etc.) in the output.",
        "• Return ONLY valid JSON with exactly two keys: \"abstract_en\" and \"abstract_zh\".",
    ].join("\n");
}

export function buildUserPrompt(input: AbstractGeneratorInput): string {
    return [
        "── Framing fields ──",
        "",
        `Background: ${input.background}`,
        `Purpose: ${input.purpose}`,
        `Method: ${input.method}`,
        `Result: ${input.result}`,
        `Contribution: ${input.contribution}`,
        "",
        "Generate the two abstracts as JSON.",
    ].join("\n");
}

// ─── LLM call wrapper ────────────────────────────────────────

/**
 * Generates English and Traditional Chinese abstracts.
 *
 * `callLLM` is injected so the skill stays runtime-agnostic —
 * callers supply their own OpenAI / Anthropic / local wrapper.
 */
export async function constellationAbstractGenerator(
    input: AbstractGeneratorInput,
    callLLM: (system: string, user: string) => Promise<string>,
): Promise<AbstractGeneratorOutput> {
    const system = buildSystemPrompt();
    const user = buildUserPrompt(input);

    const raw = await callLLM(system, user);

    // ── Parse & validate ───────────────────────────────────────
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const abstractEn = parsed.abstract_en;
    const abstractZh = parsed.abstract_zh;

    if (typeof abstractEn !== "string" || abstractEn.trim().length === 0) {
        throw new Error('Missing or empty field: "abstract_en"');
    }
    if (typeof abstractZh !== "string" || abstractZh.trim().length === 0) {
        throw new Error('Missing or empty field: "abstract_zh"');
    }

    return {
        abstract_en: abstractEn.trim(),
        abstract_zh: abstractZh.trim(),
    };
}
