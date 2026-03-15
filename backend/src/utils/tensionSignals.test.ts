import test from "node:test";
import assert from "node:assert/strict";
import { extractTensionSignals } from "./tensionSignals.js";

test("extractTensionSignals classifies pattern cues from active keywords", () => {
    const result = extractTensionSignals({
        ideaSeed: "A waking map that critiques standardized time",
        keywords: [
            {
                term: "ethnography",
                active: true,
                orientation: "critical",
                artifact_role: "critique_device",
                weight: 0.8,
            },
        ] as never,
    });

    assert.ok(
        result.patternHints.includes("normative_system_vs_lived_experience"),
    );
});
