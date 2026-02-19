// ═══════════════════════════════════════════════════════════════
// PaperEpistemicProfiler — LLM-backed skill
// ═══════════════════════════════════════════════════════════════

import type {
    ArtifactRole,
    Orientation,
} from "../../frontend/src/schema/framingConstellationBot";

// ─── Input / Output types ────────────────────────────────────

export interface PaperProfilerInput {
    title: string;
    abstract: string;
    tags?: string[];
    year?: number;
}

export interface OrientationEstimate {
    exploratory: number;
    critical: number;
    problem_solving: number;
    constructive: number;
}

export interface ArtifactRoleEstimate {
    probe: number;
    critique_device: number;
    generative_construct: number;
    solution_system: number;
    epistemic_mediator: number;
}

export interface SuggestedKeyword {
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    weight: number;
    notes: string;
}

export interface PaperProfilerOutput {
    orientation_estimate: OrientationEstimate;
    artifact_role_estimate: ArtifactRoleEstimate;
    suggested_keywords: SuggestedKeyword[];
}

// ─── Constants ───────────────────────────────────────────────

const ORIENTATIONS: Orientation[] = [
    "exploratory",
    "critical",
    "problem_solving",
    "constructive",
];

const ARTIFACT_ROLES: ArtifactRole[] = [
    "probe",
    "critique_device",
    "generative_construct",
    "solution_system",
    "epistemic_mediator",
];

const DECIMALS = 4;

// ─── Helpers ─────────────────────────────────────────────────

function round(v: number): number {
    return Math.round(v * 10 ** DECIMALS) / 10 ** DECIMALS;
}

function normaliseRecord<K extends string>(
    rec: Record<K, number>,
): Record<K, number> {
    const total = Object.values<number>(rec).reduce((s, v) => s + v, 0);
    if (total === 0) return rec;
    const out = { ...rec };
    for (const k of Object.keys(out) as K[]) {
        out[k] = round(out[k] / total);
    }
    return out;
}

// ─── Prompt builders ─────────────────────────────────────────

export function buildSystemPrompt(): string {
    return [
        "You are an epistemic analysis expert for design research papers.",
        "",
        "── Orientations ──",
        "• exploratory — open-ended inquiry, surfacing phenomena, making visible",
        "• critical — challenging assumptions, exposing ideology, destabilising norms",
        "• problem_solving — addressing functional issues, optimising, evaluating solutions",
        "• constructive — building frameworks, proposing models, generative theory-making",
        "",
        "── Artifact Roles ──",
        "• probe — a device to surface or reveal patterns",
        "• critique_device — a device to challenge or destabilise assumptions",
        "• generative_construct — a framework, model, or system to develop new knowledge",
        "• solution_system — a system aimed at functional improvement / measurable outcomes",
        "• epistemic_mediator — a bridge between theory and lived experience",
        "",
        "── Task ──",
        "Given paper metadata, produce:",
        "",
        "1. orientation_estimate — normalised scores (sum = 1) for the four orientations.",
        "2. artifact_role_estimate — normalised scores (sum = 1) for the five artifact roles.",
        "3. suggested_keywords — 5 to 10 keywords that reflect the paper's conceptual",
        "   contributions. Each keyword must include:",
        "   • term: a meaningful concept (NOT generic stopwords like 'design', 'user', 'study')",
        "   • orientation: one of the four orientations",
        "   • artifact_role: one of the five artifact roles",
        "   • weight: 0.0–1.0 reflecting centrality within the paper",
        "   • notes: a short explanation of why this keyword matters",
        "",
        "── Rules ──",
        "• Estimate orientation and artifact role from epistemic language patterns",
        "  (e.g. verbs like 'reveal', 'challenge', 'propose', 'evaluate', 'bridge').",
        "• Keywords must reflect conceptual contributions, not generic terms.",
        "• Do not duplicate common stopwords or trivial phrases.",
        "• Weight reflects centrality: core concepts ≥ 0.8, supporting ≥ 0.5, peripheral ≥ 0.3.",
        "• All scores should be rounded to 4 decimal places.",
        "",
        "Return ONLY valid JSON matching this schema:",
        '{',
        '  "orientation_estimate": { "exploratory": N, "critical": N, "problem_solving": N, "constructive": N },',
        '  "artifact_role_estimate": { "probe": N, "critique_device": N, "generative_construct": N, "solution_system": N, "epistemic_mediator": N },',
        '  "suggested_keywords": [ { "term": "", "orientation": "", "artifact_role": "", "weight": N, "notes": "" } ]',
        '}',
    ].join("\n");
}

export function buildUserPrompt(input: PaperProfilerInput): string {
    const lines = [
        "── Paper metadata ──",
        "",
        `Title: ${input.title}`,
        "",
        `Abstract: ${input.abstract}`,
    ];

    if (input.tags && input.tags.length > 0) {
        lines.push("", `Tags: ${input.tags.join(", ")}`);
    }
    if (input.year !== undefined) {
        lines.push("", `Year: ${input.year}`);
    }

    lines.push("", "Analyse this paper and return the JSON.");
    return lines.join("\n");
}

// ─── LLM call wrapper ────────────────────────────────────────

/**
 * Analyses a paper's epistemic profile and suggests constellation keywords.
 *
 * `callLLM` is injected so the skill stays runtime-agnostic.
 */
export async function paperEpistemicProfiler(
    input: PaperProfilerInput,
    callLLM: (system: string, user: string) => Promise<string>,
): Promise<PaperProfilerOutput> {
    const system = buildSystemPrompt();
    const user = buildUserPrompt(input);

    const raw = await callLLM(system, user);

    // ── Parse ──────────────────────────────────────────────────
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // ── orientation_estimate ───────────────────────────────────
    const rawOrientation = parsed.orientation_estimate as
        | Record<string, number>
        | undefined;
    if (!rawOrientation) {
        throw new Error('Missing field: "orientation_estimate"');
    }
    for (const key of ORIENTATIONS) {
        if (typeof rawOrientation[key] !== "number") {
            throw new Error(`orientation_estimate.${key} must be a number`);
        }
    }
    const orientation_estimate = normaliseRecord(
        rawOrientation as OrientationEstimate,
    );

    // ── artifact_role_estimate ─────────────────────────────────
    const rawArtifact = parsed.artifact_role_estimate as
        | Record<string, number>
        | undefined;
    if (!rawArtifact) {
        throw new Error('Missing field: "artifact_role_estimate"');
    }
    for (const key of ARTIFACT_ROLES) {
        if (typeof rawArtifact[key] !== "number") {
            throw new Error(`artifact_role_estimate.${key} must be a number`);
        }
    }
    const artifact_role_estimate = normaliseRecord(
        rawArtifact as ArtifactRoleEstimate,
    );

    // ── suggested_keywords ─────────────────────────────────────
    const rawKeywords = parsed.suggested_keywords;
    if (!Array.isArray(rawKeywords) || rawKeywords.length === 0) {
        throw new Error(
            '"suggested_keywords" must be a non-empty array',
        );
    }

    const seen = new Set<string>();
    const suggested_keywords: SuggestedKeyword[] = [];

    for (const kw of rawKeywords) {
        const k = kw as Record<string, unknown>;
        const term = String(k.term ?? "").trim();
        if (!term || seen.has(term.toLowerCase())) continue;

        if (!ORIENTATIONS.includes(k.orientation as Orientation)) {
            throw new Error(`Invalid orientation "${k.orientation}" for term "${term}"`);
        }
        if (!ARTIFACT_ROLES.includes(k.artifact_role as ArtifactRole)) {
            throw new Error(`Invalid artifact_role "${k.artifact_role}" for term "${term}"`);
        }

        const weight = Number(k.weight);
        if (Number.isNaN(weight) || weight <= 0 || weight > 1) {
            throw new Error(`Invalid weight ${k.weight} for term "${term}"`);
        }

        seen.add(term.toLowerCase());
        suggested_keywords.push({
            term,
            orientation: k.orientation as Orientation,
            artifact_role: k.artifact_role as ArtifactRole,
            weight: round(weight),
            notes: String(k.notes ?? ""),
        });
    }

    if (suggested_keywords.length < 5) {
        throw new Error(
            `Expected 5-10 keywords, got ${suggested_keywords.length}`,
        );
    }

    return {
        orientation_estimate: orientation_estimate as OrientationEstimate,
        artifact_role_estimate: artifact_role_estimate as ArtifactRoleEstimate,
        suggested_keywords: suggested_keywords.slice(0, 10),
    };
}
