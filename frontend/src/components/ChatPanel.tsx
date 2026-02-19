// ═══════════════════════════════════════════════════════════════
// ChatPanel — NOVAFRAME themed input panel
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { theme } from "../design/theme";
import type { FramingRunResponse } from "../types/framing";
import { runFraming } from "../api/framing";

interface ChatPanelProps {
    onResult: (result: FramingRunResponse) => void;
}

export default function ChatPanel({ onResult }: ChatPanelProps) {
    const [context, setContext] = useState("");
    const [owner, setOwner] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRun = useCallback(async () => {
        if (!context.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const result = await runFraming({
                user_context: context.trim(),
                owner: owner.trim() || undefined,
            });
            onResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Pipeline failed");
        } finally {
            setLoading(false);
        }
    }, [context, owner, onResult]);

    return (
        <div className={theme.components.glassCard}>
            <h3 className={`${theme.typography.subheading} mb-4`}>
                Research Context
            </h3>

            <textarea
                className={`${theme.components.input} w-full mb-3 resize-none`}
                rows={6}
                placeholder="Describe your research context, goals, and the phenomenon you are investigating…"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={loading}
            />

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
                disabled={loading || !context.trim()}
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
