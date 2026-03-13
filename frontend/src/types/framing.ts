// ═══════════════════════════════════════════════════════════════
// Framing types — matches frontend contract spec
// ═══════════════════════════════════════════════════════════════

import type { EpistemicProfile, ArtifactProfile } from "./keyword";

export interface BilingualText {
    en: string;
    zh: string;
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
