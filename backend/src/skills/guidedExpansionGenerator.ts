import type {
    FramingDirectionOption,
    GuidedExpansion,
    GuidedOption,
    Keyword,
    Orientation,
} from "../schema/framingConstellationBot.js";
import { buildGuidedExpansion } from "../utils/guidedFraming.js";

const ORIENTATION_DIRECTION_HINT: Record<Orientation, string> = {
    exploratory: "map emerging patterns and ambiguities",
    critical: "question prevailing assumptions and norms",
    problem_solving: "identify where interventions may help",
    constructive: "explore how design artefacts could reframe practice",
};

function sentenceCase(value: string): string {
    const trimmed = value.trim();
    return trimmed.length === 0
        ? trimmed
        : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function chooseOptions(options: GuidedOption[] | undefined, fallback: GuidedOption[]): GuidedOption[] {
    return options && options.length > 0 ? options : fallback.slice(0, 1);
}

export function generateGuidedExpansion(
    keywords: Keyword[],
    ideaSeed: string,
): GuidedExpansion {
    const base = buildGuidedExpansion(keywords, { ideaSeed });
    const normalizedIdea = sentenceCase(ideaSeed);

    const contexts = base.contexts.length > 0
        ? base.contexts
        : [
            {
                id: "context-idea-seed",
                label: normalizedIdea,
                rationale: "Use the student's idea seed as the initial context anchor.",
            },
        ];

    return {
        lenses: base.lenses,
        contexts,
        tensions: base.tensions.length > 0
            ? base.tensions
            : [
                {
                    id: "tension-open-question",
                    label: `${normalizedIdea} vs default assumptions`,
                    rationale: "Surface a researchable tension even when constellation coverage is sparse.",
                },
            ],
    };
}

export function generateFramingDirections(input: {
    ideaSeed: string;
    expansion: GuidedExpansion;
    selectedLenses?: GuidedOption[];
    selectedContexts?: GuidedOption[];
    selectedTensions?: GuidedOption[];
    steeringNote?: string;
}): FramingDirectionOption[] {
    const lenses = chooseOptions(input.selectedLenses, input.expansion.lenses);
    const contexts = chooseOptions(input.selectedContexts, input.expansion.contexts);
    const tensions = chooseOptions(input.selectedTensions, input.expansion.tensions);
    const note = input.steeringNote?.trim();

    return lenses.slice(0, 3).map((lens, index) => {
        const context = contexts[index % contexts.length];
        const tension = tensions[index % tensions.length];
        const directionHint = ORIENTATION_DIRECTION_HINT[
            lens.id.includes("critical")
                ? "critical"
                : lens.id.includes("problem-solving")
                    ? "problem_solving"
                    : lens.id.includes("constructive")
                        ? "constructive"
                        : "exploratory"
        ];

        const title = `${sentenceCase(input.ideaSeed)} through ${lens.label.replace(" lens", "")}`;
        const summary = note
            ? `${directionHint}, with emphasis on ${note}.`
            : `${directionHint} in relation to ${context.label}.`;

        return {
            id: `direction-${index + 1}`,
            title,
            summary,
            topic: sentenceCase(input.ideaSeed),
            context: context.label,
            gap: tension.label,
            question: `How might research on ${input.ideaSeed.toLowerCase()} ${directionHint} in ${context.label.toLowerCase()}?`,
            methodHint: note
                ? `Keep the framing responsive to: ${note}.`
                : `Investigate this through research framing grounded in ${lens.label.toLowerCase()}.`,
        };
    });
}
