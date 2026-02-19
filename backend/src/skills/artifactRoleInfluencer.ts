// ═══════════════════════════════════════════════════════════════
// ArtifactRoleInfluencer — deterministic skill
// ═══════════════════════════════════════════════════════════════

import type {
    ArtifactProfile,
    ArtifactRole,
    EpistemicProfile,
    FramingBias,
    KeywordIndex,
    KeywordMapByOrientation,
} from "../schema/framingConstellationBot.js";

// ─── Artifact-Role → Framing Mapping ─────────────────────────

interface RoleMappingRow {
    background: string;
    purpose: string;
    rq_grammar: string[];
    method: string[];
    result: string[];
    contribution: string[];
    tone: string[];
}

const ROLE_MAP: Record<ArtifactRole, RoleMappingRow> = {
    probe: {
        background: "surface / reveal patterns",
        purpose: "open-ended inquiry",
        rq_grammar: ["How does …", "In what ways …"],
        method: ["qualitative exploration", "thematic analysis"],
        result: ["insights", "reframings"],
        contribution: ["new lens", "sensitising concept"],
        tone: ["reveal", "surface", "illuminate", "uncover"],
    },
    critique_device: {
        background: "challenge / destabilise",
        purpose: "expose ideology",
        rq_grammar: ["What assumptions underlie …", "How is … reproduced through …"],
        method: ["critical discourse analysis", "deconstruction"],
        result: ["alternative framing", "counter-narrative"],
        contribution: ["repositioning the discourse"],
        tone: ["challenge", "destabilise", "expose", "interrogate"],
    },
    generative_construct: {
        background: "develop / construct / propose",
        purpose: "framework / model / system logic",
        rq_grammar: ["What framework can …", "How might we construct …"],
        method: ["constructive design research", "Research through Design"],
        result: ["novel framework", "design space"],
        contribution: ["new model", "generative theory"],
        tone: ["construct", "develop", "propose", "synthesise"],
    },
    solution_system: {
        background: "functional improvement",
        purpose: "evaluation",
        rq_grammar: ["How effectively does …", "To what extent does …"],
        method: ["user studies", "A/B testing", "benchmarking"],
        result: ["measurable outcomes"],
        contribution: ["validated solution", "design guideline"],
        tone: ["improve", "optimise", "evaluate", "validate"],
    },
    epistemic_mediator: {
        background: "bridge theory and lived experience",
        purpose: "RtD / material inquiry",
        rq_grammar: [
            "How can … mediate between …",
            "In what ways does … translate …",
        ],
        method: ["participatory methods", "autoethnography"],
        result: ["translation", "mediation"],
        contribution: ["connecting knowledge domains"],
        tone: ["bridge", "translate", "mediate", "negotiate"],
    },
};

// ─── Input type ───────────────────────────────────────────────

export interface ArtifactRoleInfluencerInput {
    artifact_profile: ArtifactProfile;
    epistemic_profile: EpistemicProfile;
    keyword_map_by_orientation: KeywordMapByOrientation;
    keyword_index: KeywordIndex;
}

// ─── Output type ──────────────────────────────────────────────

export interface ArtifactRoleInfluencerOutput {
    framing_bias: FramingBias;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Deduplicated union of two arrays, preserving insertion order. */
function union(a: string[], b: string[]): string[] {
    const set = new Set([...a, ...b]);
    return [...set];
}

/** Dominant threshold: second role is included if ≥ 0.8× the top weight. */
const SECONDARY_THRESHOLD = 0.8;

// ─── Main function ────────────────────────────────────────────

export function artifactRoleInfluencer(
    input: ArtifactRoleInfluencerInput,
): ArtifactRoleInfluencerOutput {
    const { artifact_profile, keyword_map_by_orientation, keyword_index } = input;

    // ── 1. Rank artifact roles by profile weight (desc) ────────
    const ranked = (Object.keys(artifact_profile) as ArtifactRole[]).sort(
        (a, b) => artifact_profile[b] - artifact_profile[a],
    );

    // ── 2. Select dominant role(s) ─────────────────────────────
    const topWeight = artifact_profile[ranked[0]];
    const dominants: ArtifactRole[] = [ranked[0]];

    if (
        ranked.length > 1 &&
        artifact_profile[ranked[1]] >= topWeight * SECONDARY_THRESHOLD
    ) {
        dominants.push(ranked[1]);
    }

    // ── 3. Look up mapping rows ────────────────────────────────
    const rows = dominants.map((role) => ROLE_MAP[role]);

    // ── 4. Merge into framing_bias ─────────────────────────────
    const background_bias = rows.map((r) => r.background).join("; ");
    const purpose_bias = rows.map((r) => r.purpose).join("; ");

    let rq_grammar_templates = rows[0].rq_grammar;
    let method_bias = rows[0].method;
    let result_bias = rows[0].result;
    let contribution_bias = rows[0].contribution;
    let tone_lexicon = rows[0].tone;

    if (rows.length > 1) {
        rq_grammar_templates = union(rq_grammar_templates, rows[1].rq_grammar);
        method_bias = union(method_bias, rows[1].method);
        result_bias = union(result_bias, rows[1].result);
        contribution_bias = union(contribution_bias, rows[1].contribution);
        tone_lexicon = union(tone_lexicon, rows[1].tone);
    }

    // ── 5. Enrich tone_lexicon with tone_modifier keywords ─────
    const allTerms = Object.values(keyword_map_by_orientation).flat();
    for (const term of allTerms) {
        const entry = keyword_index[term];
        if (entry?.pipeline_role === "tone_modifier") {
            tone_lexicon = union(tone_lexicon, [term]);
        }
    }

    // ── 6. Return ──────────────────────────────────────────────
    return {
        framing_bias: {
            background_bias,
            purpose_bias,
            rq_grammar_templates,
            method_bias,
            result_bias,
            contribution_bias,
            tone_lexicon,
        },
    };
}
