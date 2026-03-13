// ═══════════════════════════════════════════════════════════════
// ChatPanel — NOVAFRAME themed input panel
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { theme } from "../design/theme";
import type { FramingRunResponse, ResearchContextInput } from "../types/framing";
import { runFraming } from "../api/framing";

interface ChatPanelProps {
    onResult: (result: FramingRunResponse, owner?: string) => void;
}

const EMPTY_CONTEXT: ResearchContextInput = {
    research_topic: "",
    target_context: "",
    research_goal: "",
    method_or_constraints: "",
};

const FIELD_CONFIG: Array<{
    key: keyof ResearchContextInput;
    label: string;
    placeholder: string;
    helper: string;
    rows: number;
    required: boolean;
}> = [
    {
        key: "research_topic",
        label: "Research Topic",
        placeholder: "What phenomenon, issue, or design space are you working on?",
        helper: "Name the topic, domain, or phenomenon you want to frame.",
        rows: 3,
        required: true,
    },
    {
        key: "target_context",
        label: "Target Context",
        placeholder: "Who, where, or what setting is this research situated in?",
        helper: "Describe the audience, setting, institution, or environment.",
        rows: 3,
        required: true,
    },
    {
        key: "research_goal",
        label: "Research Goal",
        placeholder: "What do you want to understand, challenge, construct, or improve?",
        helper: "State the main inquiry, ambition, or change you are aiming for.",
        rows: 3,
        required: true,
    },
    {
        key: "method_or_constraints",
        label: "Method / Constraints (Optional)",
        placeholder: "Methods, artifacts, practical limits, or framing preferences",
        helper: "Add preferred methods, material constraints, or anything the framing should respect.",
        rows: 3,
        required: false,
    },
];

export default function ChatPanel({ onResult }: ChatPanelProps) {
    const [context, setContext] = useState<ResearchContextInput>(EMPTY_CONTEXT);
    const [owner, setOwner] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = Boolean(
        context.research_topic.trim()
        && context.target_context.trim()
        && context.research_goal.trim(),
    );

    const handleContextChange = useCallback(
        (field: keyof ResearchContextInput, value: string) => {
            setContext((prev) => ({ ...prev, [field]: value }));
        },
        [],
    );

    const handleRun = useCallback(async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError(null);
        try {
            const trimmedContext: ResearchContextInput = {
                research_topic: context.research_topic.trim(),
                target_context: context.target_context.trim(),
                research_goal: context.research_goal.trim(),
                method_or_constraints:
                    context.method_or_constraints?.trim() || undefined,
            };
            const result = await runFraming({
                context: trimmedContext,
                owner: owner.trim() || undefined,
            });
            onResult(result, owner.trim() || undefined);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Pipeline failed");
        } finally {
            setLoading(false);
        }
    }, [canSubmit, context, onResult, owner]);

    return (
        <div className={theme.components.glassCard}>
            <h3 className={`${theme.typography.subheading} mb-4`}>
                Research Context
            </h3>

            <div className="space-y-4 mb-4">
                {FIELD_CONFIG.map((field) => (
                    <div key={field.key}>
                        <label
                            className={`${theme.typography.label} block mb-1`}
                            style={{ color: theme.colors.accent }}
                        >
                            {field.label}
                        </label>
                        <textarea
                            className={`${theme.components.input} w-full resize-none`}
                            rows={field.rows}
                            placeholder={field.placeholder}
                            value={context[field.key] ?? ""}
                            onChange={(e) =>
                                handleContextChange(field.key, e.target.value)
                            }
                            disabled={loading}
                        />
                        <p
                            className={`${theme.typography.mono} mt-1`}
                            style={{ color: theme.colors.text.dim }}
                        >
                            {field.helper}
                            {field.required ? " Required." : ""}
                        </p>
                    </div>
                ))}
            </div>

            <input
                className={`${theme.components.input} w-full mb-3`}
                type="text"
                placeholder="Owner (optional)"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                disabled={loading}
            />

            {error && (
                <div
                    className={`${theme.typography.mono} mb-3`}
                    style={{ color: theme.colors.danger }}
                >
                    {error}
                </div>
            )}

            <button
                className={`${theme.components.buttonPrimary} w-full`}
                onClick={handleRun}
                disabled={loading || !canSubmit}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className={theme.animation.spin}>⟳</span>
                        Running pipeline…
                    </span>
                ) : (
                    "Run Framing"
                )}
            </button>
        </div>
    );
}
