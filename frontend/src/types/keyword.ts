// ═══════════════════════════════════════════════════════════════
// Keyword types — matches frontend contract spec
// All visual constants derived from NOVAFRAME theme.
// ═══════════════════════════════════════════════════════════════

import { theme } from "../design/theme";

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

export interface Keyword {
    id: string;
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    pipeline_role?: PipelineRole;
    weight: number;
    active: boolean;
    notes?: string;
    source?: string;
    updated_by?: string;
}

export interface EpistemicProfile {
    exploratory: number;
    critical: number;
    problem_solving: number;
    constructive: number;
}

export interface ArtifactProfile {
    probe: number;
    critique_device: number;
    generative_construct: number;
    solution_system: number;
    epistemic_mediator: number;
}

// ─── Layout constants ────────────────────────────────────────

export const ORIENTATION_CENTERS: Record<Orientation, { x: number; y: number }> = {
    exploratory: { x: 0, y: -400 },
    critical: { x: -500, y: 0 },
    problem_solving: { x: 0, y: 400 },
    constructive: { x: 500, y: 0 },
};

// Colors sourced from theme.colors.framing
export const ORIENTATION_COLORS: Record<Orientation, string> = {
    exploratory: theme.colors.framing.explorative,
    critical: theme.colors.framing.critical,
    problem_solving: theme.colors.framing.problemSolving,
    constructive: theme.colors.framing.constructive,
};

export const ARTIFACT_ROLE_SHAPES: Record<ArtifactRole, string> = {
    probe: "shape-circle",
    critique_device: "shape-diamond",
    generative_construct: "shape-hexagon",
    solution_system: "shape-rect",
    epistemic_mediator: "shape-octagon",
};

// Artifact role accent colors
export const ARTIFACT_ROLE_COLORS: Record<ArtifactRole, string> = {
    probe: "#14b8a6",
    critique_device: theme.colors.danger,
    generative_construct: theme.colors.warning,
    solution_system: theme.colors.primary,
    epistemic_mediator: "#8b5cf6",
};

export const MAX_RADIUS = 300;

/** Compute node position within orientation quadrant */
export function computeNodePosition(
    keyword: Keyword,
    index: number,
    groupSize: number,
): { x: number; y: number } {
    const center = ORIENTATION_CENTERS[keyword.orientation];
    const distance = MAX_RADIUS * (1 - keyword.weight);
    const angle = (index / Math.max(groupSize, 1)) * 2 * Math.PI;
    return {
        x: center.x + distance * Math.cos(angle),
        y: center.y + distance * Math.sin(angle),
    };
}

/** Compute node radius based on weight, using theme.viz.nodes */
export function computeNodeRadius(weight: number): number {
    return theme.viz.nodes.baseRadius + weight * theme.viz.nodes.growthFactor * 6;
}

/** Compute glow radius for highlighted nodes */
export function computeGlowRadius(weight: number): number {
    return computeNodeRadius(weight) * theme.viz.nodes.glowRadiusFactor;
}
