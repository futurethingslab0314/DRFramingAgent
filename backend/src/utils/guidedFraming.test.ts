import test from "node:test";
import assert from "node:assert/strict";

import { buildGuidedExpansion } from "./guidedFraming.js";

test("buildGuidedExpansion returns student-facing guidance buckets", () => {
    const result = buildGuidedExpansion([
        {
            term: "critical design",
            active: true,
            orientation: "critical",
            artifact_role: "critique_device",
            weight: 1,
        },
    ]);

    assert.ok(Array.isArray(result.lenses));
    assert.ok(Array.isArray(result.contexts));
    assert.ok(Array.isArray(result.tensions));
});
