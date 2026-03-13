// ═══════════════════════════════════════════════════════════════
// ChatPanel — NOVAFRAME themed input panel
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { theme } from "../design/theme";
import type { FramingRunResponse, ResearchContextInput } from "../types/framing";
import { runFraming } from "../api/framing";
import { useI18n } from "../i18n/useI18n";

interface ChatPanelProps {
    onResult: (result: FramingRunResponse, owner?: string) => void;
}

const EMPTY_CONTEXT: ResearchContextInput = {
    research_topic: "",
    target_context: "",
    research_goal: "",
    method_or_constraints: "",
};

type FieldConfig = {
    key: keyof ResearchContextInput;
    label: string;
    placeholder: string;
    helper: string;
    rows: number;
    required: boolean;
};

export default function ChatPanel({ onResult }: ChatPanelProps) {
    const { t } = useI18n();
    const [context, setContext] = useState<ResearchContextInput>(EMPTY_CONTEXT);
    const [owner, setOwner] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fieldConfig: FieldConfig[] = [
        {
            key: "research_topic",
            label: t("chat.field.research_topic.label"),
            placeholder: t("chat.field.research_topic.placeholder"),
            helper: t("chat.field.research_topic.helper"),
            rows: 3,
            required: true,
        },
        {
            key: "target_context",
            label: t("chat.field.target_context.label"),
            placeholder: t("chat.field.target_context.placeholder"),
            helper: t("chat.field.target_context.helper"),
            rows: 3,
            required: true,
        },
        {
            key: "research_goal",
            label: t("chat.field.research_goal.label"),
            placeholder: t("chat.field.research_goal.placeholder"),
            helper: t("chat.field.research_goal.helper"),
            rows: 3,
            required: true,
        },
        {
            key: "method_or_constraints",
            label: t("chat.field.method_or_constraints.label"),
            placeholder: t("chat.field.method_or_constraints.placeholder"),
            helper: t("chat.field.method_or_constraints.helper"),
            rows: 3,
            required: false,
        },
    ];

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
                {t("chat.title")}
            </h3>

            <div className="space-y-4 mb-4">
                {fieldConfig.map((field) => (
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
                            {field.required ? ` ${t("common.required")}` : ""}
                        </p>
                    </div>
                ))}
            </div>

            <input
                className={`${theme.components.input} w-full mb-3`}
                type="text"
                placeholder={t("chat.owner.placeholder")}
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
                        {t("chat.running")}
                    </span>
                ) : (
                    t("chat.run")
                )}
            </button>
        </div>
    );
}
