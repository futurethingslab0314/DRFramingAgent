import type {
    ContextType,
    StructuredContextCandidate,
} from "../schema/framingConstellationBot.js";
import type { ContextSignalSet } from "./contextSignals.js";

function uniqueByLabel(
    candidates: StructuredContextCandidate[],
): StructuredContextCandidate[] {
    return Array.from(
        new Map(
            candidates.map((candidate) => [candidate.label.toLowerCase(), candidate]),
        ).values(),
    );
}

function overlapScore(text: string, topicAnchors: string[]): number {
    const normalized = text.toLowerCase();
    const hits = topicAnchors.filter((anchor) => normalized.includes(anchor)).length;
    return topicAnchors.length === 0 ? 0 : hits / topicAnchors.length;
}

function hasActorAndActivity(label: string, signalSet: ContextSignalSet): boolean {
    const normalized = label.toLowerCase();
    return signalSet.actorCues.some((cue) => normalized.includes(cue))
        && signalSet.activityCues.some((cue) => normalized.includes(cue));
}

function sourceKeywords(signalSet: ContextSignalSet): string[] {
    return signalSet.weightedKeywords.slice(0, 3).map((keyword) => keyword.term);
}

function buildSettingContexts(signalSet: ContextSignalSet): StructuredContextCandidate[] {
    const domain = signalSet.domainCues[0] ?? "design";
    const actor = signalSet.actorCues[0] ?? "students";
    const activity = signalSet.activityCues.includes("pitch")
        ? "rehearse design pitches"
        : signalSet.activityCues.includes("critique")
            ? "participate in critique conversations"
            : signalSet.activityCues[0]
                ? `${signalSet.activityCues[0]} design ideas`
                : undefined;
    const setting = signalSet.settingCues.includes("studio")
        ? "studio critique sessions"
        : signalSet.settingCues.includes("classroom") || signalSet.settingCues.includes("class")
            ? "classroom settings"
            : signalSet.settingCues[0]
                ? `${signalSet.settingCues[0]} settings`
                : "design learning settings";

    const candidates: StructuredContextCandidate[] = [];

    if (activity) {
        candidates.push({
            id: "context-setting-primary",
            label: `${setting} where ${domain} ${actor} ${activity}`,
            rationale: "Use a concrete setting that stays close to the student's original idea and activity.",
            contextType: "setting_oriented",
            sourceKeywords: sourceKeywords(signalSet),
            sourceOrientation: signalSet.dominantOrientation,
            score: 0,
        });
    }

    candidates.push({
        id: "context-setting-secondary",
        label: `${domain} peer feedback settings for ${actor} developing presentation confidence`,
        rationale: "Use a peer-facing setting when the idea suggests rehearsal, feedback, or presentation support.",
        contextType: "setting_oriented",
        sourceKeywords: sourceKeywords(signalSet),
        sourceOrientation: signalSet.dominantOrientation,
        score: 0,
    });

    return candidates;
}

function buildResearchFrames(signalSet: ContextSignalSet): StructuredContextCandidate[] {
    const domain = signalSet.domainCues[0] ?? "design";
    const artifact = signalSet.artifactCues[0] ?? "agent";

    return [
        {
            id: "context-frame-primary",
            label: `${artifact}-mediated ${domain} learning`,
            rationale: "Use a broader research frame when the setting should be interpreted through mediation or pedagogy.",
            contextType: "research_frame",
            sourceKeywords: sourceKeywords(signalSet),
            sourceOrientation: signalSet.dominantOrientation,
            score: 0,
        },
        {
            id: "context-frame-secondary",
            label: `pedagogies of critique and presentation in ${domain} education`,
            rationale: "Use a research frame that opens discussion about how critique and presentation are taught.",
            contextType: "research_frame",
            sourceKeywords: sourceKeywords(signalSet),
            sourceOrientation: signalSet.dominantOrientation,
            score: 0,
        },
    ];
}

function scoreCandidate(
    candidate: StructuredContextCandidate,
    signalSet: ContextSignalSet,
): number {
    const topicAnchorScore = overlapScore(candidate.label, signalSet.topicAnchors);
    const settingBonus = candidate.contextType === "setting_oriented" ? 0.25 : 0;
    const actorActivityBonus = hasActorAndActivity(candidate.label, signalSet) ? 0.2 : 0;
    const constellationAlignment = Math.min(
        1,
        signalSet.weightedKeywords.slice(0, 3).reduce((sum, keyword) => sum + keyword.weight, 0) / 2,
    );
    const driftPenalty = topicAnchorScore < 0.15 ? 0.2 : 0;

    return Number(
        (
            topicAnchorScore * 0.35 +
            constellationAlignment * 0.25 +
            settingBonus +
            actorActivityBonus -
            driftPenalty
        ).toFixed(3),
    );
}

function fallbackContexts(signalSet: ContextSignalSet): StructuredContextCandidate[] {
    const domain = signalSet.domainCues[0] ?? "design";
    const actor = signalSet.actorCues[0] ?? "students";

    return [
        {
            id: "context-fallback-domain-setting",
            label: `${domain} learning settings for ${actor}`,
            rationale: "Use a domain-anchored setting when context signals are sparse.",
            contextType: "setting_oriented",
            sourceKeywords: sourceKeywords(signalSet),
            sourceOrientation: signalSet.dominantOrientation,
            score: 0.3,
        },
    ];
}

export function buildStructuredContextCandidates(input: {
    ideaSeed: string;
    signalSet: ContextSignalSet;
}): StructuredContextCandidate[] {
    const candidates = [
        ...buildSettingContexts(input.signalSet),
        ...buildResearchFrames(input.signalSet),
    ];

    const scored = uniqueByLabel(candidates)
        .map((candidate) => ({
            ...candidate,
            score: scoreCandidate(candidate, input.signalSet),
        }))
        .filter((candidate) => candidate.score > 0.15)
        .sort((a, b) => {
            if (a.contextType !== b.contextType) {
                return a.contextType === "setting_oriented" ? -1 : 1;
            }

            return b.score - a.score;
        });

    if (scored.length > 0) {
        return scored.slice(0, 5);
    }

    return fallbackContexts(input.signalSet);
}
