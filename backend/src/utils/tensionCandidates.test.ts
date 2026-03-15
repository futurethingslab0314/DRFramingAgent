import test from "node:test";
import assert from "node:assert/strict";
import { buildStructuredTensionCandidates } from "./tensionCandidates.js";

test("buildStructuredTensionCandidates returns paired poles instead of single keyword labels", () => {
    const result = buildStructuredTensionCandidates({
        ideaSeed: "A waking map that critiques standardized time",
        signalSet: {
            dominantOrientation: "critical",
            weightedKeywords: [
                {
                    term: "ethnography",
                    weight: 1,
                    orientation: "critical",
                    artifactRole: "critique_device",
                },
            ],
            patternHints: ["normative_system_vs_lived_experience"],
            termCueMatches: ["time"],
        },
    });

    assert.equal(result[0]?.leftPole.includes("system"), true);
    assert.equal(result[0]?.rightPole.length > 0, true);
});
