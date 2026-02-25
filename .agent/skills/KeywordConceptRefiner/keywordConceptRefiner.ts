// ═══════════════════════════════════════════════════════════════
// KeywordConceptRefiner — deterministic keyword filtering/merging
// ═══════════════════════════════════════════════════════════════

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

export interface KeywordInput {
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    pipeline_role?: PipelineRole;
    weight?: number;
    active?: boolean;
    notes?: string;
}

export type RefinementMode = "balanced" | "conceptual_strict";

export interface RefinerConfig {
    mode?: RefinementMode;
    max_keywords?: number;
    min_weight?: number;
    keep_domain_terms?: string[];
    drop_terms?: string[];
    canonical_overrides?: Record<string, string>;
}

export interface DroppedKeyword {
    term: string;
    reason:
        | "inactive"
        | "below_min_weight"
        | "generic_noise"
        | "domain_specific_filtered"
        | "manual_drop";
}

export interface MergeReport {
    canonical_term: string;
    merged_from: string[];
}

export interface RefinedKeyword {
    term: string;
    orientation: Orientation;
    artifact_role: ArtifactRole;
    pipeline_role?: PipelineRole;
    weight: number;
    active: boolean;
    notes?: string;
}

export interface KeywordConceptRefinerOutput {
    refined_keywords: RefinedKeyword[];
    dropped_keywords: DroppedKeyword[];
    merge_report: MergeReport[];
}

type BucketType =
    | "conceptual"
    | "methodological"
    | "domain_specific"
    | "generic_noise";

interface WorkingKeyword {
    originalTerm: string;
    canonicalTerm: string;
    orientation: Orientation;
    artifactRole: ArtifactRole;
    pipelineRole?: PipelineRole;
    weight: number;
    active: boolean;
    notes?: string;
    bucket: BucketType;
}

const DEFAULT_CONFIG: Required<Pick<RefinerConfig, "mode" | "max_keywords" | "min_weight">> = {
    mode: "conceptual_strict",
    max_keywords: 12,
    min_weight: 0.35,
};

const DEFAULT_CANONICAL_MAP: Record<string, string> = {
    "smart home": "domestic technology",
    "smart homes": "domestic technology",
    "iot home device": "domestic technology",
    "privacy concern": "privacy",
    "data privacy": "privacy",
    "user trust": "trust",
    "trust building": "trust",
    "speculative design": "design fiction",
};

const GENERIC_NOISE_TERMS = new Set<string>([
    "system",
    "systems",
    "platform",
    "platforms",
    "technology",
    "technologies",
    "model",
    "models",
    "framework",
    "frameworks",
    "application",
    "applications",
    "tool",
    "tools",
]);

const CONCEPTUAL_TERMS = new Set<string>([
    "privacy",
    "trust",
    "agency",
    "autonomy",
    "care",
    "ethics",
    "ambiguity",
    "exploration",
    "meaning-making",
    "design intervention",
    "design fiction",
]);

const METHODOLOGICAL_TERMS = new Set<string>([
    "participatory design",
    "critical design",
    "speculative design",
    "research through design",
    "co-design",
    "autoethnography",
    "probe study",
]);

const DOMAIN_MARKERS = [
    "smart",
    "home",
    "iot",
    "alarm",
    "wearable",
    "healthcare",
    "classroom",
    "urban",
    "retail",
    "device",
];

function normalizeTerm(term: string): string {
    return term
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

function round4(value: number): number {
    return Math.round(value * 10000) / 10000;
}

function pickMaxKey<K extends string>(record: Record<K, number>): K {
    let bestKey = Object.keys(record)[0] as K;
    let bestVal = record[bestKey];
    for (const key of Object.keys(record) as K[]) {
        if (record[key] > bestVal) {
            bestKey = key;
            bestVal = record[key];
        }
    }
    return bestKey;
}

function classifyBucket(term: string): BucketType {
    if (GENERIC_NOISE_TERMS.has(term)) return "generic_noise";
    if (CONCEPTUAL_TERMS.has(term)) return "conceptual";
    if (METHODOLOGICAL_TERMS.has(term)) return "methodological";
    if (DOMAIN_MARKERS.some((m) => term.includes(m))) return "domain_specific";
    return "conceptual";
}

export function keywordConceptRefiner(
    keywords: KeywordInput[],
    config: RefinerConfig = {},
): KeywordConceptRefinerOutput {
    const mode = config.mode ?? DEFAULT_CONFIG.mode;
    const maxKeywords = config.max_keywords ?? DEFAULT_CONFIG.max_keywords;
    const minWeight = config.min_weight ?? DEFAULT_CONFIG.min_weight;

    const keepDomain = new Set((config.keep_domain_terms ?? []).map(normalizeTerm));
    const manualDrop = new Set((config.drop_terms ?? []).map(normalizeTerm));

    const canonicalMap: Record<string, string> = {
        ...DEFAULT_CANONICAL_MAP,
        ...Object.fromEntries(
            Object.entries(config.canonical_overrides ?? {}).map(([k, v]) => [
                normalizeTerm(k),
                normalizeTerm(v),
            ]),
        ),
    };

    const dropped_keywords: DroppedKeyword[] = [];
    const working: WorkingKeyword[] = [];

    for (const kw of keywords) {
        const active = kw.active ?? true;
        const weight = kw.weight ?? 1.0;
        const originalTerm = kw.term;
        const normalized = normalizeTerm(originalTerm);

        if (!active) {
            dropped_keywords.push({ term: originalTerm, reason: "inactive" });
            continue;
        }
        if (weight < minWeight) {
            dropped_keywords.push({ term: originalTerm, reason: "below_min_weight" });
            continue;
        }
        if (manualDrop.has(normalized)) {
            dropped_keywords.push({ term: originalTerm, reason: "manual_drop" });
            continue;
        }

        const canonicalTerm = canonicalMap[normalized] ?? normalized;
        const bucket = classifyBucket(canonicalTerm);

        if (bucket === "generic_noise") {
            dropped_keywords.push({ term: originalTerm, reason: "generic_noise" });
            continue;
        }

        if (
            mode === "conceptual_strict" &&
            bucket === "domain_specific" &&
            !keepDomain.has(canonicalTerm)
        ) {
            dropped_keywords.push({ term: originalTerm, reason: "domain_specific_filtered" });
            continue;
        }

        working.push({
            originalTerm,
            canonicalTerm,
            orientation: kw.orientation,
            artifactRole: kw.artifact_role,
            pipelineRole: kw.pipeline_role,
            weight,
            active,
            notes: kw.notes,
            bucket,
        });
    }

    const grouped = new Map<string, WorkingKeyword[]>();
    for (const kw of working) {
        const list = grouped.get(kw.canonicalTerm) ?? [];
        list.push(kw);
        grouped.set(kw.canonicalTerm, list);
    }

    const refined_keywords: RefinedKeyword[] = [];
    const merge_report: MergeReport[] = [];

    for (const [canonicalTerm, group] of grouped) {
        if (group.length > 1) {
            merge_report.push({
                canonical_term: canonicalTerm,
                merged_from: [...new Set(group.map((g) => g.originalTerm))],
            });
        }

        const orientationVotes: Record<Orientation, number> = {
            exploratory: 0,
            critical: 0,
            problem_solving: 0,
            constructive: 0,
        };
        const roleVotes: Record<ArtifactRole, number> = {
            probe: 0,
            critique_device: 0,
            generative_construct: 0,
            solution_system: 0,
            epistemic_mediator: 0,
        };
        const pipelineVotes: Record<PipelineRole, number> = {
            rq_trigger: 0,
            method_bias: 0,
            contribution_frame: 0,
            tone_modifier: 0,
        };

        let maxWeight = 0;
        const notes: string[] = [];
        for (const item of group) {
            maxWeight = Math.max(maxWeight, item.weight);
            orientationVotes[item.orientation] += item.weight;
            roleVotes[item.artifactRole] += item.weight;
            if (item.pipelineRole) pipelineVotes[item.pipelineRole] += item.weight;
            if (item.notes) notes.push(item.notes);
        }

        const resolvedPipelineRole =
            Object.values(pipelineVotes).some((v) => v > 0)
                ? pickMaxKey(pipelineVotes)
                : undefined;

        refined_keywords.push({
            term: canonicalTerm,
            orientation: pickMaxKey(orientationVotes),
            artifact_role: pickMaxKey(roleVotes),
            pipeline_role: resolvedPipelineRole,
            weight: round4(maxWeight),
            active: true,
            notes:
                group.length > 1
                    ? `merged from: ${[...new Set(group.map((g) => g.originalTerm))].join(", ")}`
                    : notes[0],
        });
    }

    const bucketRank: Record<BucketType, number> = {
        conceptual: 3,
        methodological: 2,
        domain_specific: 1,
        generic_noise: 0,
    };

    refined_keywords.sort((a, b) => {
        const aBucket = classifyBucket(a.term);
        const bBucket = classifyBucket(b.term);
        const bucketDelta = bucketRank[bBucket] - bucketRank[aBucket];
        if (bucketDelta !== 0) return bucketDelta;
        return b.weight - a.weight;
    });

    return {
        refined_keywords: refined_keywords.slice(0, maxKeywords),
        dropped_keywords,
        merge_report,
    };
}
