// ═══════════════════════════════════════════════════════════════
// ConstellationRuleEngine — deterministic skill
// ═══════════════════════════════════════════════════════════════

import type {
    EpistemicProfile,
    FramingBias,
    KeywordIndex,
    KeywordMapByOrientation,
    Orientation,
    ReasoningControl,
} from "../schema/framingConstellationBot.js";

// ─── Orientation → logic-pattern label ───────────────────────

const LOGIC_PATTERN_MAP: Record<Orientation, string> = {
    exploratory: "open_exploration",
    critical: "critical_questioning",
    problem_solving: "solution_oriented",
    constructive: "generative_construction",
};

const TIE_THRESHOLD = 0.01;

// ─── Input / Output types ────────────────────────────────────

export interface ConstellationRuleEngineInput {
    epistemic_profile: EpistemicProfile;
    keyword_map_by_orientation: KeywordMapByOrientation;
    keyword_index: KeywordIndex;
    framing_bias: FramingBias;
}

export interface ConstellationRuleEngineOutput {
    reasoning_control: ReasoningControl;
}

// ─── Helpers ─────────────────────────────────────────────────

function union(a: string[], b: string[]): string[] {
    return [...new Set([...a, ...b])];
}

function termsWithPipelineRole(
    keyword_index: KeywordIndex,
    role: string,
): string[] {
    return Object.entries(keyword_index)
        .filter(([, entry]) => entry.pipeline_role === role)
        .map(([term]) => term);
}

// ─── Main function ───────────────────────────────────────────

export function constellationRuleEngine(
    input: ConstellationRuleEngineInput,
): ConstellationRuleEngineOutput {
    const {
        epistemic_profile,
        keyword_index,
        framing_bias,
    } = input;

    // ── 1. logic_pattern ───────────────────────────────────────
    const orientations = Object.keys(epistemic_profile) as Orientation[];
    const sorted = [...orientations].sort(
        (a, b) => epistemic_profile[b] - epistemic_profile[a],
    );

    let logic_pattern = LOGIC_PATTERN_MAP[sorted[0]];

    if (
        sorted.length > 1 &&
        Math.abs(epistemic_profile[sorted[0]] - epistemic_profile[sorted[1]]) <=
        TIE_THRESHOLD
    ) {
        logic_pattern += `-${LOGIC_PATTERN_MAP[sorted[1]]}`;
    }

    // ── 2. rq_templates ────────────────────────────────────────
    const rqTriggerTerms = termsWithPipelineRole(keyword_index, "rq_trigger");
    const firstTemplate = framing_bias.rq_grammar_templates[0] ?? "How does … ";

    const rq_templates = [
        ...framing_bias.rq_grammar_templates,
        ...rqTriggerTerms.map((term) =>
            firstTemplate.replace("…", term),
        ),
    ];

    // ── 3. method_logic ────────────────────────────────────────
    const methodTerms = termsWithPipelineRole(keyword_index, "method_bias");
    const method_logic = union(framing_bias.method_bias, methodTerms);

    // ── 4. contribution_logic ──────────────────────────────────
    const contribTerms = termsWithPipelineRole(
        keyword_index,
        "contribution_frame",
    );
    const contribution_logic = union(
        framing_bias.contribution_bias,
        contribTerms,
    );

    // ── 5. constraints ─────────────────────────────────────────
    const dominantOrientation = sorted[0];
    const constraints = [
        `Must reference ≥1 keyword from the ${dominantOrientation} orientation`,
        `Must not contradict the ${logic_pattern} logic pattern`,
        "Each framing field must be 1-2 sentences",
    ];

    // ── 6. tone_lexicon ────────────────────────────────────────
    const toneTerms = termsWithPipelineRole(keyword_index, "tone_modifier");
    const tone_lexicon = union(framing_bias.tone_lexicon, toneTerms);

    // ── 7. Return ──────────────────────────────────────────────
    return {
        reasoning_control: {
            logic_pattern,
            rq_templates,
            method_logic,
            contribution_logic,
            constraints,
            tone_lexicon,
        },
    };
}
