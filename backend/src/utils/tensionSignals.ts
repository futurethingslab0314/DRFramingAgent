import type {
    ArtifactRole,
    Keyword,
    Orientation,
    PipelineRole,
    TensionPatternType,
} from "../schema/framingConstellationBot.js";

export interface WeightedKeywordSignal {
    term: string;
    weight: number;
    orientation: Orientation;
    artifactRole: ArtifactRole;
    pipelineRole?: PipelineRole;
    notes?: string;
}

export interface TensionSignalSet {
    dominantOrientation?: Orientation;
    weightedKeywords: WeightedKeywordSignal[];
    patternHints: TensionPatternType[];
    termCueMatches: string[];
}

const TERM_CUES: Record<string, TensionPatternType[]> = {
    time: [
        "normative_system_vs_lived_experience",
        "collective_structure_vs_personal_difference",
    ],
    routine: [
        "normative_system_vs_lived_experience",
        "collective_structure_vs_personal_difference",
    ],
    ethnography: [
        "normative_system_vs_lived_experience",
        "functional_logic_vs_interpretive_inquiry",
    ],
    speculative: ["dominant_assumptions_vs_alternative_imagination"],
    fiction: ["dominant_assumptions_vs_alternative_imagination"],
    map: ["representation_vs_experience"],
    data: ["representation_vs_experience"],
    education: [
        "normative_system_vs_lived_experience",
        "functional_logic_vs_interpretive_inquiry",
    ],
    ai: ["functional_logic_vs_interpretive_inquiry"],
    interface: ["representation_vs_experience"],
};

function unique<T>(values: T[]): T[] {
    return Array.from(new Set(values));
}

function inferDominantOrientation(keywords: WeightedKeywordSignal[]): Orientation | undefined {
    const totals = new Map<Orientation, number>();

    for (const keyword of keywords) {
        totals.set(
            keyword.orientation,
            (totals.get(keyword.orientation) ?? 0) + keyword.weight,
        );
    }

    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function getPatternHintsFromOrientation(
    orientation: Orientation | undefined,
): TensionPatternType[] {
    switch (orientation) {
        case "critical":
            return [
                "normative_system_vs_lived_experience",
                "functional_logic_vs_interpretive_inquiry",
                "dominant_assumptions_vs_alternative_imagination",
            ];
        case "exploratory":
            return [
                "representation_vs_experience",
                "collective_structure_vs_personal_difference",
                "normative_system_vs_lived_experience",
            ];
        case "problem_solving":
            return [
                "functional_logic_vs_interpretive_inquiry",
                "representation_vs_experience",
            ];
        case "constructive":
            return [
                "dominant_assumptions_vs_alternative_imagination",
                "representation_vs_experience",
            ];
        default:
            return [];
    }
}

function getPatternHintsFromArtifactRole(
    artifactRole: ArtifactRole,
): TensionPatternType[] {
    switch (artifactRole) {
        case "critique_device":
            return [
                "dominant_assumptions_vs_alternative_imagination",
                "functional_logic_vs_interpretive_inquiry",
            ];
        case "epistemic_mediator":
            return [
                "representation_vs_experience",
                "normative_system_vs_lived_experience",
            ];
        case "solution_system":
            return ["functional_logic_vs_interpretive_inquiry"];
        default:
            return [];
    }
}

export function extractTensionSignals(input: {
    ideaSeed: string;
    keywords: Keyword[];
}): TensionSignalSet {
    const weightedKeywords = input.keywords
        .filter((keyword) => keyword.active)
        .map((keyword) => ({
            term: keyword.term,
            weight: keyword.weight,
            orientation: keyword.orientation,
            artifactRole: keyword.artifact_role,
            pipelineRole: keyword.pipeline_role,
            notes: keyword.notes,
        }))
        .sort((a, b) => b.weight - a.weight);

    const dominantOrientation = inferDominantOrientation(weightedKeywords);
    const normalizedText = [
        input.ideaSeed,
        ...weightedKeywords.map((keyword) => keyword.term),
        ...weightedKeywords.flatMap((keyword) => keyword.notes ? [keyword.notes] : []),
    ]
        .join(" ")
        .toLowerCase();

    const termCueMatches = Object.keys(TERM_CUES).filter((cue) =>
        normalizedText.includes(cue),
    );

    const patternHints = unique([
        ...getPatternHintsFromOrientation(dominantOrientation),
        ...weightedKeywords.flatMap((keyword) =>
            getPatternHintsFromArtifactRole(keyword.artifactRole),
        ),
        ...termCueMatches.flatMap((cue) => TERM_CUES[cue]),
    ]);

    return {
        dominantOrientation,
        weightedKeywords,
        patternHints,
        termCueMatches,
    };
}
