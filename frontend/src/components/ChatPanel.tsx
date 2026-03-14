import { useCallback, useEffect, useMemo, useState } from "react";
import { theme } from "../design/theme";
import type {
    FramingCanvasDraft,
    FramingRunResponse,
    FramingWorkspacePreview,
    GuidedExpansionResponse,
} from "../types/framing";
import type { GuidedOption } from "../schema/framingConstellationBot";
import {
    expandFramingIdea,
    generateFramingDirections,
    runFraming,
} from "../api/framing";
import { useI18n } from "../i18n/useI18n";

interface ChatPanelProps {
    onResult: (result: FramingRunResponse, owner?: string) => void;
    onPreviewChange?: (preview: FramingWorkspacePreview | null) => void;
}

const EMPTY_CANVAS: FramingCanvasDraft = {
    topic: "",
    context: "",
    gap: "",
    question: "",
    method: "",
};

function toggleId(ids: string[], id: string): string[] {
    return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

function buildRunContext(canvas: FramingCanvasDraft, steeringNote: string) {
    return {
        research_topic: canvas.topic.trim(),
        target_context: [canvas.context.trim(), canvas.gap.trim()]
            .filter(Boolean)
            .join("\nResearch gap: "),
        research_goal: canvas.question.trim(),
        method_or_constraints: [canvas.method.trim(), steeringNote.trim()]
            .filter(Boolean)
            .join("\n"),
    };
}

function GuidanceSection({
    label,
    options,
    selectedIds,
    onToggle,
}: {
    label: string;
    options: GuidedOption[];
    selectedIds: string[];
    onToggle: (id: string) => void;
}) {
    return (
        <div className="space-y-2">
            <div
                className={theme.typography.label}
                style={{ color: theme.colors.accent }}
            >
                {label}
            </div>
            <div className="space-y-2">
                {options.map((option) => {
                    const selected = selectedIds.includes(option.id);
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onToggle(option.id)}
                            className="w-full rounded-xl border px-3 py-3 text-left transition-all"
                            style={{
                                borderColor: selected
                                    ? "rgba(59, 130, 246, 0.75)"
                                    : "rgba(51, 65, 85, 0.6)",
                                background: selected
                                    ? "rgba(37, 99, 235, 0.18)"
                                    : "rgba(15, 23, 42, 0.55)",
                            }}
                        >
                            <div className="text-sm font-semibold text-slate-100">
                                {option.label}
                            </div>
                            <div
                                className={`${theme.typography.body} mt-1`}
                                style={{ color: theme.colors.text.dim }}
                            >
                                {option.rationale}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function ChatPanel({ onResult, onPreviewChange }: ChatPanelProps) {
    const { t } = useI18n();
    const [ideaSeed, setIdeaSeed] = useState("");
    const [owner, setOwner] = useState("");
    const [expansion, setExpansion] = useState<GuidedExpansionResponse | null>(null);
    const [selectedLensIds, setSelectedLensIds] = useState<string[]>([]);
    const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
    const [selectedTensionIds, setSelectedTensionIds] = useState<string[]>([]);
    const [steeringNote, setSteeringNote] = useState("");
    const [directions, setDirections] = useState<FramingWorkspacePreview["directions"]>([]);
    const [selectedDirectionId, setSelectedDirectionId] = useState<string | undefined>();
    const [canvas, setCanvas] = useState<FramingCanvasDraft>(EMPTY_CANVAS);
    const [expanding, setExpanding] = useState(false);
    const [loadingDirections, setLoadingDirections] = useState(false);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedLenses = useMemo(
        () => expansion?.lenses.filter((option) => selectedLensIds.includes(option.id)) ?? [],
        [expansion, selectedLensIds],
    );
    const selectedContexts = useMemo(
        () =>
            expansion?.contexts.filter((option) => selectedContextIds.includes(option.id))
            ?? [],
        [expansion, selectedContextIds],
    );
    const selectedTensions = useMemo(
        () =>
            expansion?.tensions.filter((option) => selectedTensionIds.includes(option.id))
            ?? [],
        [expansion, selectedTensionIds],
    );

    useEffect(() => {
        if (!ideaSeed.trim()) {
            onPreviewChange?.(null);
            return;
        }

        onPreviewChange?.({
            ideaSeed: ideaSeed.trim(),
            expansion,
            selectedLensIds,
            selectedContextIds,
            selectedTensionIds,
            steeringNote,
            directions,
            selectedDirectionId,
            canvas: directions.length > 0 ? canvas : undefined,
        });
    }, [
        canvas,
        directions,
        expansion,
        ideaSeed,
        onPreviewChange,
        selectedContextIds,
        selectedDirectionId,
        selectedLensIds,
        selectedTensionIds,
        steeringNote,
    ]);

    const handleExpand = useCallback(async () => {
        if (!ideaSeed.trim()) return;
        setExpanding(true);
        setError(null);
        try {
            const response = await expandFramingIdea({
                idea_seed: ideaSeed.trim(),
                owner: owner.trim() || undefined,
            });
            setExpansion(response);
            setSelectedLensIds(response.lenses.slice(0, 1).map((option) => option.id));
            setSelectedContextIds(response.contexts.slice(0, 1).map((option) => option.id));
            setSelectedTensionIds(response.tensions.slice(0, 1).map((option) => option.id));
            setDirections([]);
            setSelectedDirectionId(undefined);
            setCanvas(EMPTY_CANVAS);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Expansion failed");
        } finally {
            setExpanding(false);
        }
    }, [ideaSeed, owner]);

    const handleGenerateDirections = useCallback(async () => {
        if (!ideaSeed.trim() || !expansion) return;
        setLoadingDirections(true);
        setError(null);
        try {
            const response = await generateFramingDirections({
                idea_seed: ideaSeed.trim(),
                selected_lenses: selectedLenses,
                selected_contexts: selectedContexts,
                selected_tensions: selectedTensions,
                steering_note: steeringNote.trim() || undefined,
            });
            setDirections(response.directions);
            const first = response.directions[0];
            if (first) {
                setSelectedDirectionId(first.id);
                setCanvas({
                    topic: first.topic,
                    context: first.context,
                    gap: first.gap,
                    question: first.question,
                    method: first.methodHint ?? "",
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Direction generation failed");
        } finally {
            setLoadingDirections(false);
        }
    }, [
        expansion,
        ideaSeed,
        selectedContexts,
        selectedLenses,
        selectedTensions,
        steeringNote,
    ]);

    const handleSelectDirection = useCallback(
        (directionId: string) => {
            const direction = directions.find((item) => item.id === directionId);
            if (!direction) return;
            setSelectedDirectionId(directionId);
            setCanvas({
                topic: direction.topic,
                context: direction.context,
                gap: direction.gap,
                question: direction.question,
                method: direction.methodHint ?? "",
            });
        },
        [directions],
    );

    const handleCanvasChange = useCallback(
        (field: keyof FramingCanvasDraft, value: string) => {
            setCanvas((prev) => ({ ...prev, [field]: value }));
        },
        [],
    );

    const handleRun = useCallback(async () => {
        const context = buildRunContext(canvas, steeringNote);
        if (!context.research_topic || !context.target_context || !context.research_goal) {
            setError("Please select a direction and complete the framing canvas.");
            return;
        }

        setRunning(true);
        setError(null);
        try {
            const result = await runFraming({
                context,
                owner: owner.trim() || undefined,
            });
            onResult(result, owner.trim() || undefined);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Pipeline failed");
        } finally {
            setRunning(false);
        }
    }, [canvas, onResult, owner, steeringNote]);

    const canRun = Boolean(
        canvas.topic.trim() && canvas.context.trim() && canvas.question.trim(),
    );

    return (
        <div className={`${theme.components.glassCard} space-y-5`}>
            <h3 className={theme.typography.subheading}>{t("chat.title")}</h3>

            <div>
                <label
                    className={`${theme.typography.label} block mb-1`}
                    style={{ color: theme.colors.accent }}
                >
                    {t("chat.seed.label")}
                </label>
                <textarea
                    className={`${theme.components.input} w-full resize-none`}
                    rows={4}
                    value={ideaSeed}
                    placeholder={t("chat.seed.placeholder")}
                    onChange={(event) => setIdeaSeed(event.target.value)}
                    disabled={expanding || loadingDirections || running}
                />
                <p
                    className={`${theme.typography.mono} mt-1`}
                    style={{ color: theme.colors.text.dim }}
                >
                    {t("chat.seed.helper")}
                </p>
            </div>

            <button
                className={`${theme.components.buttonPrimary} w-full`}
                onClick={handleExpand}
                disabled={expanding || loadingDirections || running || !ideaSeed.trim()}
            >
                {expanding ? t("chat.expand.loading") : t("chat.expand")}
            </button>

            {expansion && (
                <div className="space-y-4">
                    <div>
                        <div className={theme.typography.subheading}>
                            {t("chat.guidance.title")}
                        </div>
                        <p
                            className={`${theme.typography.body} mt-2`}
                            style={{ color: theme.colors.text.dim }}
                        >
                            {t("chat.guidance.helper")}
                        </p>
                    </div>

                    <GuidanceSection
                        label={t("chat.guidance.lenses")}
                        options={expansion.lenses}
                        selectedIds={selectedLensIds}
                        onToggle={(id) => setSelectedLensIds((prev) => toggleId(prev, id))}
                    />

                    <GuidanceSection
                        label={t("chat.guidance.contexts")}
                        options={expansion.contexts}
                        selectedIds={selectedContextIds}
                        onToggle={(id) => setSelectedContextIds((prev) => toggleId(prev, id))}
                    />

                    <GuidanceSection
                        label={t("chat.guidance.tensions")}
                        options={expansion.tensions}
                        selectedIds={selectedTensionIds}
                        onToggle={(id) => setSelectedTensionIds((prev) => toggleId(prev, id))}
                    />

                    <div>
                        <label
                            className={`${theme.typography.label} block mb-1`}
                            style={{ color: theme.colors.accent }}
                        >
                            {t("chat.note.label")}
                        </label>
                        <textarea
                            className={`${theme.components.input} w-full resize-none`}
                            rows={3}
                            value={steeringNote}
                            placeholder={t("chat.note.placeholder")}
                            onChange={(event) => setSteeringNote(event.target.value)}
                            disabled={loadingDirections || running}
                        />
                    </div>

                    <button
                        className={`${theme.components.buttonGhost} w-full`}
                        onClick={handleGenerateDirections}
                        disabled={loadingDirections || running}
                    >
                        {loadingDirections
                            ? t("chat.directions.loading")
                            : t("chat.directions")}
                    </button>
                </div>
            )}

            {directions.length > 0 && (
                <div className="space-y-4">
                    <div className={theme.typography.subheading}>
                        {t("chat.direction.title")}
                    </div>
                    <div className="space-y-3">
                        {directions.map((direction) => {
                            const selected = direction.id === selectedDirectionId;
                            return (
                                <button
                                    key={direction.id}
                                    type="button"
                                    onClick={() => handleSelectDirection(direction.id)}
                                    className="w-full rounded-xl border px-4 py-4 text-left transition-all"
                                    style={{
                                        borderColor: selected
                                            ? "rgba(59, 130, 246, 0.75)"
                                            : "rgba(51, 65, 85, 0.6)",
                                        background: selected
                                            ? "rgba(37, 99, 235, 0.16)"
                                            : "rgba(15, 23, 42, 0.5)",
                                    }}
                                >
                                    <div className="text-sm font-semibold text-slate-100">
                                        {direction.title}
                                    </div>
                                    <div
                                        className={`${theme.typography.body} mt-2`}
                                        style={{ color: theme.colors.text.dim }}
                                    >
                                        {direction.summary}
                                    </div>
                                    <div
                                        className={`${theme.typography.mono} mt-3`}
                                        style={{ color: theme.colors.text.dim }}
                                    >
                                        {t("chat.direction.use")}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {directions.length > 0 && (
                <div className="space-y-3">
                    <div className={theme.typography.subheading}>
                        {t("chat.canvas.title")}
                    </div>
                    {(
                        [
                            ["topic", t("chat.canvas.topic")],
                            ["context", t("chat.canvas.context")],
                            ["gap", t("chat.canvas.gap")],
                            ["question", t("chat.canvas.question")],
                            ["method", t("chat.canvas.method")],
                        ] as Array<[keyof FramingCanvasDraft, string]>
                    ).map(([field, label]) => (
                        <div key={field}>
                            <label
                                className={`${theme.typography.label} block mb-1`}
                                style={{ color: theme.colors.accent }}
                            >
                                {label}
                            </label>
                            <textarea
                                className={`${theme.components.input} w-full resize-none`}
                                rows={field === "question" ? 3 : 2}
                                value={canvas[field]}
                                onChange={(event) =>
                                    handleCanvasChange(field, event.target.value)
                                }
                                disabled={running}
                            />
                        </div>
                    ))}
                    <p
                        className={theme.typography.mono}
                        style={{ color: theme.colors.text.dim }}
                    >
                        {t("chat.canvas.helper")}
                    </p>
                </div>
            )}

            <input
                className={`${theme.components.input} w-full`}
                type="text"
                placeholder={t("chat.owner.placeholder")}
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                disabled={expanding || loadingDirections || running}
            />

            {error && (
                <div
                    className={theme.typography.mono}
                    style={{ color: theme.colors.danger }}
                >
                    {error}
                </div>
            )}

            <button
                className={`${theme.components.buttonPrimary} w-full`}
                onClick={handleRun}
                disabled={running || !canRun}
            >
                {running ? t("chat.running") : t("chat.run")}
            </button>
        </div>
    );
}
