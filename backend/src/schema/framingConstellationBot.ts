// ═══════════════════════════════════════════════════════════════
// FramingConstellationBot — Agent Schema
// ═══════════════════════════════════════════════════════════════

// ─── Enums ────────────────────────────────────────────────────

export type Orientation =
    | "exploratory"
    | "critical"
    | "problem_solving"
    | "constructive";

export type ArtifactRole =
    | "probe"
    | "critique_device"
    | "generative_construct"
    | "solution_system"
    | "epistemic_mediator";

export type PipelineRole =
    | "rq_trigger"
    | "method_bias"
    | "contribution_frame"
    | "tone_modifier";

// ─── Keyword ──────────────────────────────────────────────────

export interface Keyword {
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    pipeline_role?: PipelineRole;
    /** 0–1, default 1.0 */
    weight: number;
    /** default true */
    active: boolean;
    notes?: string;
}

// ─── Derived Fields ───────────────────────────────────────────

/** Terms grouped by orientation */
export interface KeywordMapByOrientation {
    exploratory: string[];
    critical: string[];
    problem_solving: string[];
    constructive: string[];
}

/** Fast lookup: term → metadata */
export interface KeywordIndexEntry {
    orientation: Orientation;
    artifact_role: ArtifactRole;
    pipeline_role?: PipelineRole;
    weight: number;
}

export type KeywordIndex = Record<string, KeywordIndexEntry>;

/** Normalized distribution (sum = 1) over orientations */
export interface EpistemicProfile {
    exploratory: number;
    critical: number;
    problem_solving: number;
    constructive: number;
}

/** Normalized distribution (sum = 1) over artifact roles */
export interface ArtifactProfile {
    probe: number;
    critique_device: number;
    generative_construct: number;
    solution_system: number;
    epistemic_mediator: number;
}

// ─── Framing Bias (produced by ArtifactRoleInfluencer) ────────

export interface FramingBias {
    background_bias: string;
    purpose_bias: string;
    rq_grammar_templates: string[];
    method_bias: string[];
    result_bias: string[];
    contribution_bias: string[];
    tone_lexicon: string[];
}

// ─── Reasoning Control (produced by ConstellationRuleEngine) ──

export interface ReasoningControl {
    logic_pattern: string;
    rq_templates: string[];
    method_logic: string[];
    contribution_logic: string[];
    constraints: string[];
    tone_lexicon: string[];
}

// ─── Framing Output ───────────────────────────────────────────

export interface FramingOutput {
    title: string;
    /** 1-2 sentences */
    background: string;
    /** 1-2 sentences */
    purpose: string;
    /** 1-2 sentences */
    method: string;
    /** 1-2 sentences */
    result: string;
    /** 1-2 sentences */
    contribution: string;
    research_question: string;
    abstract_en: string;
    abstract_zh: string;
}

// ─── Shared State ─────────────────────────────────────────────

export interface FramingConstellationBotState {
    // ── Primary data ──
    keywords: Keyword[];

    // ── Derived (computed from keywords) ──
    keyword_map_by_orientation: KeywordMapByOrientation;
    keyword_index: KeywordIndex;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;

    // ── Framing output ──
    framing: FramingOutput;
}
