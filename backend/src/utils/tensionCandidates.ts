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

function baseScore(signalSet: TensionSignalSet, patternType: TensionPatternType): number {
    const orientationBonus = signalSet.patternHints.indexOf(patternType);
    const keywordBonus = signalSet.weightedKeywords[0]?.weight ?? 0;
    const cueBonus = signalSet.termCueMatches.length > 0 ? 0.1 : 0;

    return Number((keywordBonus + cueBonus + Math.max(0, 0.3 - orientationBonus * 0.05)).toFixed(3));
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
                score: baseScore(input.signalSet, patternType),
                rationale: pattern.rationaleTemplate,
                draftLabel: `${pattern.leftPole} vs ${pattern.rightPole}`,
            },
        ];
    });

    return uniqueByDraftLabel(candidates);
}
