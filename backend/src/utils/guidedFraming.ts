import type {
    GuidedExpansion,
    GuidedOption,
    Keyword,
    Orientation,
} from "../schema/framingConstellationBot.js";

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

export function buildGuidedExpansion(keywords: Keyword[]): GuidedExpansion {
    const activeKeywords = keywords.filter((keyword) => keyword.active);

    const lenses = dedupeById(
        activeKeywords.map((keyword) => ({
            id: `lens-${slugify(keyword.orientation)}`,
            label: ORIENTATION_LABELS[keyword.orientation],
            rationale: ORIENTATION_RATIONALES[keyword.orientation],
        })),
    );

    const contexts = dedupeById(
        activeKeywords.slice(0, 6).map((keyword) => ({
            id: `context-${slugify(keyword.term)}`,
            label: keyword.term,
            rationale: `Derived from the active constellation term "${keyword.term}".`,
        })),
    );

    const tensions = dedupeById(
        activeKeywords.slice(0, 6).map((keyword) => ({
            id: `tension-${slugify(keyword.term)}`,
            label: `${keyword.term} vs default assumptions`,
            rationale: `Use this to frame a research gap around ${keyword.term}.`,
        })),
    );

    return { lenses, contexts, tensions };
}
