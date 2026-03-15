// ═══════════════════════════════════════════════════════════════
// Framing types — matches frontend contract spec
// ═══════════════════════════════════════════════════════════════

import type { EpistemicProfile, ArtifactProfile } from "./keyword";
import type {
    GuidedExpansion,
    GuidedOption,
    FramingDirectionOption,
    StructuredTensionCandidate,
    TensionMetadata,
    TensionPatternType,
} from "../schema/framingConstellationBot";

export type { StructuredTensionCandidate, TensionMetadata, TensionPatternType };

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

export interface ResearchContextInput {
    research_topic: string;
    target_context: string;
    research_goal: string;
    method_or_constraints?: string;
}

export interface FramingRunRequest {
    context: ResearchContextInput;
    owner?: string;
}

export interface GuidedExpansionRequest {
    idea_seed: string;
    owner?: string;
}

export interface GuidedExpansionResponse extends GuidedExpansion {
    idea_seed: string;
}

export interface FramingDirectionRequest {
    idea_seed: string;
    selected_lenses?: GuidedOption[];
    selected_contexts?: GuidedOption[];
    selected_tensions?: GuidedOption[];
    steering_note?: string;
}

export interface FramingDirectionResponse {
    directions: FramingDirectionOption[];
}

export interface FramingCanvasDraft {
    topic: string;
    context: string;
    gap: string;
    question: string;
    method: string;
}

export interface FramingWorkspacePreview {
    ideaSeed: string;
    expansion: GuidedExpansionResponse | null;
    selectedLensIds: string[];
    selectedContextIds: string[];
    selectedTensionIds: string[];
    steeringNote: string;
    directions: FramingDirectionOption[];
    selectedDirectionId?: string;
    canvas?: FramingCanvasDraft;
}

export interface FramingRunResponse {
    title: BilingualText;
    research_question: BilingualText;
    background: BilingualText;
    purpose: BilingualText;
    method: BilingualText;
    result: BilingualText;
    contribution: BilingualText;
    abstract: BilingualText;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
    interpretation_summary: InterpretationSummary;
}

export interface FramingSaveRequest {
    framing: FramingRunResponse;
    title?: string;
    owner?: string;
}

export interface FramingSaveResponse {
    saved: boolean;
    notion_page_id: string;
}

/** Core editable framing fields (excluding abstracts and profiles) */
export const FRAMING_FIELDS = [
    "title",
    "research_question",
    "background",
    "purpose",
    "method",
    "result",
    "contribution",
] as const;

export type FramingField = (typeof FRAMING_FIELDS)[number];

export type EditableFramingPayload = Omit<
    FramingRunResponse,
    "epistemic_profile" | "artifact_profile"
>;
