// ═══════════════════════════════════════════════════════════════
// TitleGenerator — LLM-backed skill
// ═══════════════════════════════════════════════════════════════

import type {
    EpistemicProfile,
    KeywordMapByOrientation,
    Orientation,
} from "../../frontend/src/schema/framingConstellationBot";

// ─── Input / Output types ────────────────────────────────────

export interface TitleGeneratorInput {
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
    abstract_en: string;
    abstract_zh: string;
    keyword_map_by_orientation: KeywordMapByOrientation;
    epistemic_profile: EpistemicProfile;
}

export interface TitleGeneratorOutput {
    title: string;
}

// ─── Helpers ──────────────────────────────────────────────────

const ORIENTATION_ORDER: Orientation[] = [
    "exploratory",
    "critical",
    "problem_solving",
    "constructive",
];

function getSalientKeywords(
    keywordMap: KeywordMapByOrientation,
    profile: EpistemicProfile,
    limitPerOrientation = 3,
): string[] {
    const ranked = [...ORIENTATION_ORDER].sort(
        (a, b) => profile[b] - profile[a],
    );

    const picked: string[] = [];
    for (const orientation of ranked) {
        const terms = keywordMap[orientation].slice(0, limitPerOrientation);
        for (const term of terms) {
            if (!picked.includes(term)) {
                picked.push(term);
            }
        }
    }
    return picked;
}

// ─── Prompt builders ─────────────────────────────────────────

export function buildSystemPrompt(): string {
    return [
        "You are an academic title assistant for design research papers.",
        "Generate ONE publication-ready title based on the provided research framing.",
        "",
        "── Constraints ──",
        "• Output exactly one title.",
        "• Keep it concise: 8-18 words.",
        "• Reflect method and contribution, not only topic.",
        "• Maintain an academic design-research tone.",
        "• Avoid hype, clickbait, and vague generic wording.",
        "• Do not output quotation marks around the title.",
        "",
        "Return ONLY valid JSON with exactly one key:",
        '  "title": string',
    ].join("\n");
}

export function buildUserPrompt(input: TitleGeneratorInput): string {
    const salientKeywords = getSalientKeywords(
        input.keyword_map_by_orientation,
        input.epistemic_profile,
    );

    return [
        "── Framing fields ──",
        `Research Question: ${input.research_question}`,
        `Background: ${input.background}`,
        `Purpose: ${input.purpose}`,
        `Method: ${input.method}`,
        `Result: ${input.result}`,
        `Contribution: ${input.contribution}`,
        "",
        "── Abstracts ──",
        `Abstract (EN): ${input.abstract_en}`,
        `Abstract (ZH): ${input.abstract_zh}`,
        "",
        "── Salient keywords ──",
        salientKeywords.join(", "),
        "",
        "Generate one title as JSON.",
    ].join("\n");
}

// ─── LLM call wrapper ────────────────────────────────────────

export async function titleGenerator(
    input: TitleGeneratorInput,
    callLLM: (system: string, user: string) => Promise<string>,
): Promise<TitleGeneratorOutput> {
    const system = buildSystemPrompt();
    const user = buildUserPrompt(input);

    const raw = await callLLM(system, user);
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const title = parsed.title;
    if (typeof title !== "string" || title.trim().length === 0) {
        throw new Error('Missing or empty field: "title"');
    }

    return { title: title.trim() };
}
