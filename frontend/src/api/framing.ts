// ═══════════════════════════════════════════════════════════════
// API client — framing pipeline
// ═══════════════════════════════════════════════════════════════

import type {
    FramingDirectionRequest,
    FramingDirectionResponse,
    GuidedExpansionRequest,
    GuidedExpansionResponse,
    FramingRunRequest,
    FramingRunResponse,
    FramingSaveResponse,
    FramingRefineRequest,
} from "../types/framing";

export async function expandFramingIdea(
    request: GuidedExpansionRequest,
): Promise<GuidedExpansionResponse> {
    const res = await fetch("/api/framing/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            (body as { error?: string }).error ?? `expandFramingIdea failed: ${res.status}`,
        );
    }
    return res.json();
}

export async function generateFramingDirections(
    request: FramingDirectionRequest,
): Promise<FramingDirectionResponse> {
    const res = await fetch("/api/framing/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            idea_seed: request.idea_seed,
            selected_lenses: request.selected_lenses,
            selected_contexts: request.selected_contexts,
            selected_tensions: request.selected_tensions,
            steering_note: request.steering_note,
        }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            (body as { error?: string }).error ?? `generateFramingDirections failed: ${res.status}`,
        );
    }
    return res.json();
}

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
    owner?: string,
): Promise<FramingSaveResponse> {
    const res = await fetch("/api/framing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ framing, title, owner }),
    });
    if (!res.ok) throw new Error(`saveFraming failed: ${res.status}`);
    return res.json();
}

/** Refine user-edited framing using LLM for academic polish */
export async function refineFraming(
    request: FramingRefineRequest,
): Promise<FramingRunResponse> {
    const res = await fetch("/api/framing/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
            (body as { error?: string }).error ?? `refineFraming failed: ${res.status}`,
        );
    }
    return res.json();
}
