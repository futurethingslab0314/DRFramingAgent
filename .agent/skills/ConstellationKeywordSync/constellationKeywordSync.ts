// ═══════════════════════════════════════════════════════════════
// ConstellationKeywordSync — deterministic skill
// ═══════════════════════════════════════════════════════════════

import type {
    ArtifactProfile,
    ArtifactRole,
    EpistemicProfile,
    Keyword,
    KeywordIndex,
    KeywordIndexEntry,
    KeywordMapByOrientation,
    Orientation,
} from "../../frontend/src/schema/framingConstellationBot";

// ─── Constants ────────────────────────────────────────────────

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

// ─── Input type (lenient — accepts partial / missing defaults) ─

export interface KeywordInput {
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    pipeline_role?: Keyword["pipeline_role"];
    weight?: number;
    active?: boolean;
    notes?: string;
}

// ─── Output type ──────────────────────────────────────────────

export interface ConstellationKeywordSyncOutput {
    keyword_map_by_orientation: KeywordMapByOrientation;
    keyword_index: KeywordIndex;
    epistemic_profile: EpistemicProfile;
    artifact_profile: ArtifactProfile;
}

// ─── Helpers ──────────────────────────────────────────────────

function round(value: number): number {
    return Math.round(value * 10 ** DECIMALS) / 10 ** DECIMALS;
}

/** Normalise a record of numbers so they sum to 1. */
function normalise<K extends string>(
    raw: Record<K, number>,
    fallback: number,
): Record<K, number> {
    const total = Object.values<number>(raw).reduce((s, v) => s + v, 0);
    const result = { ...raw };

    if (total === 0) {
        for (const key of Object.keys(result) as K[]) {
            result[key] = round(fallback);
        }
    } else {
        for (const key of Object.keys(result) as K[]) {
            result[key] = round(result[key] / total);
        }
    }
    return result;
}

// ─── Main sync function ──────────────────────────────────────

export function constellationKeywordSync(
    keywords: KeywordInput[],
): ConstellationKeywordSyncOutput {
    // ── 1. Apply defaults & filter active ──────────────────────
    const active: Keyword[] = keywords
        .map((kw) => ({
            term: kw.term,
            orientation: kw.orientation,
            artifact_role: kw.artifact_role,
            pipeline_role: kw.pipeline_role,
            weight: kw.weight ?? 1.0,
            active: kw.active ?? true,
            notes: kw.notes,
        }))
        .filter((kw) => kw.active);

    // ── 2. keyword_map_by_orientation ──────────────────────────
    const keyword_map_by_orientation: KeywordMapByOrientation = {
        exploratory: [],
        critical: [],
        problem_solving: [],
        constructive: [],
    };

    for (const kw of active) {
        keyword_map_by_orientation[kw.orientation].push(kw.term);
    }

    // ── 3. keyword_index (higher weight wins on duplicates) ────
    const keyword_index: KeywordIndex = {};

    for (const kw of active) {
        const existing = keyword_index[kw.term];
        if (!existing || kw.weight > existing.weight) {
            const entry: KeywordIndexEntry = {
                orientation: kw.orientation,
                artifact_role: kw.artifact_role,
                weight: kw.weight,
            };
            if (kw.pipeline_role) {
                entry.pipeline_role = kw.pipeline_role;
            }
            keyword_index[kw.term] = entry;
        }
    }

    // ── 4. epistemic_profile ───────────────────────────────────
    const rawEpistemic = Object.fromEntries(
        ORIENTATIONS.map((o) => [o, 0]),
    ) as Record<Orientation, number>;

    for (const kw of active) {
        rawEpistemic[kw.orientation] += kw.weight;
    }

    const epistemic_profile = normalise<Orientation>(
        rawEpistemic,
        1 / ORIENTATIONS.length,
    ) as EpistemicProfile;

    // ── 5. artifact_profile ────────────────────────────────────
    const rawArtifact = Object.fromEntries(
        ARTIFACT_ROLES.map((r) => [r, 0]),
    ) as Record<ArtifactRole, number>;

    for (const kw of active) {
        rawArtifact[kw.artifact_role] += kw.weight;
    }

    const artifact_profile = normalise<ArtifactRole>(
        rawArtifact,
        1 / ARTIFACT_ROLES.length,
    ) as ArtifactProfile;

    // ── 6. Return ──────────────────────────────────────────────
    return {
        keyword_map_by_orientation,
        keyword_index,
        epistemic_profile,
        artifact_profile,
    };
}
