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

export interface BilingualText {
    en: string;
    zh: string;
}

export interface InterpretationSummary {
    topic_summary: string;
    context_summary: string;
    goal_summary: string;
    method_constraints_summary?: string;
    inferred_research_direction: string;
    inferred_contribution_mode: string;
    possible_risks: string[];
    steering_keywords: string[];
}

export interface GuidedOption {
    id: string;
    label: string;
    rationale: string;
}

export interface GuidedExpansion {
    lenses: GuidedOption[];
    contexts: GuidedOption[];
    tensions: GuidedOption[];
}

export interface FramingDirectionOption {
    id: string;
    title: string;
    summary: string;
    topic: string;
    context: string;
    gap: string;
    question: string;
    methodHint?: string;
}

export interface FramingOutput {
    title: BilingualText;
    /** 1-2 sentences */
    background: BilingualText;
    /** 1-2 sentences */
    purpose: BilingualText;
    /** 1-2 sentences */
    method: BilingualText;
    /** 1-2 sentences */
    result: BilingualText;
    /** 1-2 sentences */
    contribution: BilingualText;
    research_question: BilingualText;
    abstract: BilingualText;
    interpretation_summary: InterpretationSummary;
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
