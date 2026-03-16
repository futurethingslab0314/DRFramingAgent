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

test("candidate scoring favors research-oriented tensions over generic keyword carryover", () => {
    const result = buildStructuredTensionCandidates({
        ideaSeed: "AI in design education",
        signalSet: {
            dominantOrientation: "critical",
            weightedKeywords: [
                {
                    term: "education",
                    weight: 0.9,
                    orientation: "critical",
                    artifactRole: "critique_device",
                },
                {
                    term: "ai",
                    weight: 0.8,
                    orientation: "problem_solving",
                    artifactRole: "solution_system",
                },
            ],
            patternHints: [
                "functional_logic_vs_interpretive_inquiry",
                "normative_system_vs_lived_experience",
            ],
            termCueMatches: ["ai", "education"],
        },
    });

    assert.equal(result[0].score >= result[result.length - 1].score, true);
});
