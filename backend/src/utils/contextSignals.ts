import type {
    ArtifactRole,
    Keyword,
    Orientation,
    PipelineRole,
} from "../schema/framingConstellationBot.js";

export interface WeightedKeywordSignal {
    term: string;
    weight: number;
    orientation: Orientation;
    artifactRole: ArtifactRole;
    pipelineRole?: PipelineRole;
    notes?: string;
}

export interface ContextSignalSet {
    dominantOrientation?: Orientation;
    weightedKeywords: WeightedKeywordSignal[];
    actorCues: string[];
    activityCues: string[];
    settingCues: string[];
    domainCues: string[];
    artifactCues: string[];
    topicAnchors: string[];
}

const ACTOR_CUES: Record<string, string[]> = {
    students: ["student", "students"],
    teachers: ["teacher", "teachers"],
    peers: ["peer", "peers"],
};
const ACTIVITY_CUES: Record<string, string[]> = {
    pitch: ["pitch", "pitches"],
    practice: ["practice"],
    rehearse: ["rehearse", "rehearsal"],
    review: ["review"],
    critique: ["critique"],
    presentation: ["presentation", "presentations"],
    learning: ["learning"],
};
const SETTING_CUES: Record<string, string[]> = {
    class: ["class"],
    classroom: ["classroom"],
    studio: ["studio"],
    critique: ["critique"],
    review: ["review"],
    workshop: ["workshop"],
    course: ["course"],
};
const DOMAIN_CUES: Record<string, string[]> = {
    design: ["design"],
    education: ["education"],
    learning: ["learning"],
    pedagogy: ["pedagogy"],
    studio: ["studio"],
};
const ARTIFACT_CUES: Record<string, string[]> = {
    agent: ["agent"],
    tool: ["tool"],
    assistant: ["assistant"],
    system: ["system"],
    interface: ["interface"],
    platform: ["platform"],
};

function unique<T>(values: T[]): T[] {
    return Array.from(new Set(values));
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);
}

function matchCanonicalCues(
    tokens: string[],
    cueMap: Record<string, string[]>,
): string[] {
    return unique(
        Object.entries(cueMap)
            .filter(([, variants]) => variants.some((variant) => tokens.includes(variant)))
            .map(([canonical]) => canonical),
    );
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

export function extractContextSignals(input: {
    ideaSeed: string;
    keywords: Keyword[];
}): ContextSignalSet {
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

    const tokens = tokenize(input.ideaSeed);
    const topKeywordTokens = weightedKeywords
        .slice(0, 3)
        .flatMap((keyword) => tokenize(keyword.term));

    return {
        dominantOrientation: inferDominantOrientation(weightedKeywords),
        weightedKeywords,
        actorCues: matchCanonicalCues(tokens, ACTOR_CUES),
        activityCues: matchCanonicalCues(tokens, ACTIVITY_CUES),
        settingCues: matchCanonicalCues(tokens, SETTING_CUES),
        domainCues: matchCanonicalCues(tokens, DOMAIN_CUES),
        artifactCues: matchCanonicalCues(tokens, ARTIFACT_CUES),
        topicAnchors: unique([...tokens, ...topKeywordTokens]).slice(0, 12),
    };
}
