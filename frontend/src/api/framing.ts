// ═══════════════════════════════════════════════════════════════
// API client — framing pipeline
// ═══════════════════════════════════════════════════════════════

import type {
    FramingRunRequest,
    FramingRunResponse,
    FramingSaveResponse,
} from "../types/framing";

export async function runFraming(
    request: FramingRunRequest,
): Promise<FramingRunResponse> {
    const res = await fetch("/api/framing/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            (body as { error?: string }).error ?? `runFraming failed: ${res.status}`,
        );
    }
    return res.json();
}

export async function saveFraming(
    framing: FramingRunResponse,
    title?: string,
): Promise<FramingSaveResponse> {
    const res = await fetch("/api/framing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ framing, title }),
    });
    if (!res.ok) throw new Error(`saveFraming failed: ${res.status}`);
    return res.json();
}
