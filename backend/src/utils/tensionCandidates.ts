import type {
    StructuredTensionCandidate,
    TensionPatternType,
} from "../schema/framingConstellationBot.js";
import type { TensionSignalSet } from "./tensionSignals.js";

const TENSION_PATTERNS: Record<TensionPatternType, Array<{
    leftPole: string;
    rightPole: string;
    rationaleTemplate: string;
}>> = {
    normative_system_vs_lived_experience: [
        {
            leftPole: "standardized temporal systems",
            rightPole: "lived and subjective rhythms",
            rationaleTemplate:
                "Use this to frame how institutional or normative systems may suppress lived experience.",
        },
    ],
    functional_logic_vs_interpretive_inquiry: [
        {
            leftPole: "solution-driven system logic",
            rightPole: "interpretive understanding of everyday practice",
            rationaleTemplate:
                "Use this to frame a gap between intervention logic and situated interpretation.",
        },
    ],
    dominant_assumptions_vs_alternative_imagination: [
        {
            leftPole: "taken-for-granted assumptions",
            rightPole: "speculative alternatives",
            rationaleTemplate:
                "Use this to frame how speculative design can challenge dominant assumptions.",
        },
    ],
    representation_vs_experience: [
        {
            leftPole: "formal representation",
            rightPole: "embodied and situated experience",
            rationaleTemplate:
                "Use this to frame a gap between what can be represented and what is actually lived.",
        },
    ],
    collective_structure_vs_personal_difference: [
        {
            leftPole: "collective synchronization",
            rightPole: "personal temporal difference",
            rationaleTemplate:
                "Use this to frame tensions between shared coordination and personal variation.",
        },
    ],
};

function uniqueByDraftLabel(
    candidates: StructuredTensionCandidate[],
): StructuredTensionCandidate[] {
    return Array.from(
        new Map(
            candidates.map((candidate) => [candidate.draftLabel.toLowerCase(), candidate]),
        ).values(),
    );
}

function includesAny(text: string, needles: string[]): boolean {
    return needles.some((needle) => text.includes(needle));
}

function topicAnchorSimilarity(
    signalSet: TensionSignalSet,
    patternType: TensionPatternType,
): number {
    const anchors = signalSet.topicAnchors;

    switch (patternType) {
        case "normative_system_vs_lived_experience":
            return includesAny(anchors.join(" "), [
                "time",
                "routine",
                "education",
                "work",
                "daily",
            ])
                ? 0.85
                : 0.2;
        case "functional_logic_vs_interpretive_inquiry":
            return includesAny(anchors.join(" "), [
                "agent",
                "conversation",
                "conversational",
                "pitch",
                "tool",
                "system",
                "ai",
                "student",
            ])
                ? 0.95
                : 0.25;
        case "dominant_assumptions_vs_alternative_imagination":
            return includesAny(anchors.join(" "), [
                "fiction",
                "speculative",
                "future",
                "alternative",
            ])
                ? 0.85
                : 0.2;
        case "representation_vs_experience":
            return includesAny(anchors.join(" "), [
                "map",
                "data",
                "visual",
                "representation",
                "agent",
                "conversation",
                "pitch",
            ])
                ? 0.8
                : 0.25;
        case "collective_structure_vs_personal_difference":
            return includesAny(anchors.join(" "), [
                "timezone",
                "global",
                "coordination",
                "personal",
                "time",
            ])
                ? 0.8
                : 0.15;
    }
}

function topicDriftPenalty(
    signalSet: TensionSignalSet,
    patternType: TensionPatternType,
): number {
    const similarity = topicAnchorSimilarity(signalSet, patternType);
    return similarity >= 0.6 ? 0 : 0.25;
}

function researchValue(patternType: TensionPatternType): number {
    switch (patternType) {
        case "functional_logic_vs_interpretive_inquiry":
        case "normative_system_vs_lived_experience":
            return 0.9;
        case "representation_vs_experience":
            return 0.8;
        default:
            return 0.7;
    }
}

function expansionPotential(signalSet: TensionSignalSet, patternType: TensionPatternType): number {
    const hintIndex = signalSet.patternHints.indexOf(patternType);
    return hintIndex === -1 ? 0.35 : Math.max(0.35, 0.75 - hintIndex * 0.1);
}

function scoreCandidate(input: {
    ideaSeed: string;
    signalSet: TensionSignalSet;
    patternType: TensionPatternType;
}): number {
    const ideaSeed = input.ideaSeed.toLowerCase();
    const keywordWeightTotal = input.signalSet.weightedKeywords
        .slice(0, 3)
        .reduce((sum, keyword) => sum + keyword.weight, 0);
    const constellationAlignment = Math.min(1, keywordWeightTotal / 2);
    const anchorSimilarity = topicAnchorSimilarity(
        input.signalSet,
        input.patternType,
    );
    const value = researchValue(input.patternType);
    const antiSolutionismBonus = input.patternType === "functional_logic_vs_interpretive_inquiry"
        || input.patternType === "normative_system_vs_lived_experience"
        ? 0.9
        : 0.55;
    const expansion = expansionPotential(input.signalSet, input.patternType);
    const driftPenalty = topicDriftPenalty(input.signalSet, input.patternType);

    const score =
        anchorSimilarity * 0.3 +
        constellationAlignment * 0.25 +
        value * 0.2 +
        antiSolutionismBonus * 0.15 +
        expansion * 0.1 -
        driftPenalty;

    return Number(score.toFixed(3));
}

export function buildStructuredTensionCandidates(input: {
    ideaSeed: string;
    signalSet: TensionSignalSet;
}): StructuredTensionCandidate[] {
    const topKeywords = input.signalSet.weightedKeywords.slice(0, 3).map((keyword) => keyword.term);

    const candidates = input.signalSet.patternHints.flatMap((patternType, index) => {
        const pattern = TENSION_PATTERNS[patternType]?.[0];
        if (!pattern) {
            return [];
        }

        return [
            {
                id: `candidate-${index + 1}`,
                leftPole: pattern.leftPole,
                rightPole: pattern.rightPole,
                patternType,
                sourceKeywords: topKeywords,
                sourceOrientation: input.signalSet.dominantOrientation,
                score: scoreCandidate({
                    ideaSeed: input.ideaSeed,
                    signalSet: input.signalSet,
                    patternType,
                }),
                rationale: pattern.rationaleTemplate,
                draftLabel: `${pattern.leftPole} vs ${pattern.rightPole}`,
            },
        ];
    });

    return uniqueByDraftLabel(candidates)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}
