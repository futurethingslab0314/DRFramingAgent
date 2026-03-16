import type {
    GuidedExpansion,
    GuidedOption,
    Keyword,
    Orientation,
} from "../schema/framingConstellationBot.js";
import { buildStructuredContextCandidates } from "./contextCandidates.js";
import { extractContextSignals } from "./contextSignals.js";
import { buildStructuredTensionCandidates } from "./tensionCandidates.js";
import { extractTensionSignals } from "./tensionSignals.js";

const ORIENTATION_LABELS: Record<Orientation, string> = {
    exploratory: "Exploratory lens",
    critical: "Critical lens",
    problem_solving: "Problem-solving lens",
    constructive: "Constructive lens",
};

const ORIENTATION_RATIONALES: Record<Orientation, string> = {
    exploratory: "Useful when the idea is still open-ended and needs research direction.",
    critical: "Useful when the framing should question assumptions rather than propose a solution.",
    problem_solving: "Useful when the framing should stay grounded in interventions and applied outcomes.",
    constructive: "Useful when the framing should focus on design proposals and generative making.",
};

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function dedupeById(options: GuidedOption[]): GuidedOption[] {
    return Array.from(new Map(options.map((option) => [option.id, option])).values());
}

export function buildGuidedExpansion(
    keywords: Keyword[],
    options?: { ideaSeed?: string },
): GuidedExpansion {
    const activeKeywords = keywords.filter((keyword) => keyword.active);

    const lenses = dedupeById(
        activeKeywords.map((keyword) => ({
            id: `lens-${slugify(keyword.orientation)}`,
            label: ORIENTATION_LABELS[keyword.orientation],
            rationale: ORIENTATION_RATIONALES[keyword.orientation],
        })),
    );

    const baseIdeaSeed = options?.ideaSeed ?? activeKeywords.map((keyword) => keyword.term).join(" ");
    const contextSignalSet = extractContextSignals({
        ideaSeed: baseIdeaSeed,
        keywords: activeKeywords,
    });
    const contextCandidates = buildStructuredContextCandidates({
        ideaSeed: baseIdeaSeed,
        signalSet: contextSignalSet,
    });

    const contexts = dedupeById(
        contextCandidates.map((candidate) => ({
            id: candidate.id,
            label: candidate.label,
            rationale: candidate.rationale,
            metadata: {
                contextType: candidate.contextType,
                sourceKeywords: candidate.sourceKeywords,
                sourceOrientation: candidate.sourceOrientation,
                score: candidate.score,
            },
        })),
    );

    const signalSet = extractTensionSignals({
        ideaSeed: baseIdeaSeed,
        keywords: activeKeywords,
    });

    const candidates = buildStructuredTensionCandidates({
        ideaSeed: baseIdeaSeed,
        signalSet,
    });

    const tensions = dedupeById(
        candidates.map((candidate) => ({
            id: candidate.id,
            label: candidate.draftLabel,
            rationale: candidate.rationale,
            metadata: {
                patternType: candidate.patternType,
                sourceKeywords: candidate.sourceKeywords,
                sourceOrientation: candidate.sourceOrientation,
                score: candidate.score,
            },
        })),
    );

    return { lenses, contexts, tensions };
}
