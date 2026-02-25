// ═══════════════════════════════════════════════════════════════
// Framing types — matches frontend contract spec
// ═══════════════════════════════════════════════════════════════

import type { EpistemicProfile, ArtifactProfile } from "./keyword";

export interface FramingRunRequest {
    user_context: string;
    owner?: string;
}

export interface FramingRunResponse {
    title: string;
    research_question: string;
    background: string;
    purpose: string;
    method: string;
    result: string;
    contribution: string;
    abstract_en: string;
    abstract_zh: string;
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
