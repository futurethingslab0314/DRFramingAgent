export interface StructuredResearchContext {
    research_topic: string;
    target_context: string;
    research_goal: string;
    method_or_constraints?: string;
}

type LegacyResearchContextPayload = {
    user_context?: unknown;
};

type StructuredResearchContextPayload = {
    context?: {
        research_topic?: unknown;
        target_context?: unknown;
        research_goal?: unknown;
        method_or_constraints?: unknown;
    };
};

type IdeaSeedPayload = {
    idea_seed?: unknown;
};

function trimRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${fieldName} is required`);
    }
    return value.trim();
}

function trimOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export function parseStructuredResearchContext(
    payload: StructuredResearchContextPayload & LegacyResearchContextPayload,
): StructuredResearchContext {
    const context = payload.context;

    if (context) {
        return {
            research_topic: trimRequiredString(
                context.research_topic,
                "research_topic",
            ),
            target_context: trimRequiredString(
                context.target_context,
                "target_context",
            ),
            research_goal: trimRequiredString(
                context.research_goal,
                "research_goal",
            ),
            method_or_constraints: trimOptionalString(
                context.method_or_constraints,
            ),
        };
    }

    const legacy = trimRequiredString(payload.user_context, "user_context");

    return {
        research_topic: legacy,
        target_context: "Legacy context",
        research_goal: "Generate framing from the provided research context.",
    };
}

export function parseIdeaSeedRequest(payload: IdeaSeedPayload): string {
    return trimRequiredString(payload.idea_seed, "idea_seed");
}

export function composeResearchContext(
    context: StructuredResearchContext,
): string {
    const sections = [
        ["Research topic:", context.research_topic],
        ["Target context:", context.target_context],
        ["Research goal:", context.research_goal],
    ];

    if (context.method_or_constraints) {
        sections.push([
            "Method or constraints:",
            context.method_or_constraints,
        ]);
    }

    return sections
        .flatMap(([label, value], index) =>
            index === 0 ? [label, value] : ["", label, value],
        )
        .join("\n");
}
