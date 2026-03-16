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
            topicAnchors: ["waking", "map", "time"],
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
            topicAnchors: ["ai", "design", "education"],
        },
    });

    assert.equal(result[0].score >= result[result.length - 1].score, true);
});

test("topic-anchor-first ranking keeps design pitch agent tensions ahead of distant temporal tensions", () => {
    const result = buildStructuredTensionCandidates({
        ideaSeed:
            "I want to make a conversational agent that helps design students practice design pitch",
        signalSet: {
            dominantOrientation: "critical",
            weightedKeywords: [
                {
                    term: "design education",
                    weight: 0.95,
                    orientation: "critical",
                    artifactRole: "critique_device",
                },
                {
                    term: "conversational agent",
                    weight: 0.9,
                    orientation: "problem_solving",
                    artifactRole: "solution_system",
                },
                {
                    term: "subjective time",
                    weight: 0.85,
                    orientation: "exploratory",
                    artifactRole: "epistemic_mediator",
                },
            ],
            patternHints: [
                "normative_system_vs_lived_experience",
                "functional_logic_vs_interpretive_inquiry",
                "representation_vs_experience",
            ],
            termCueMatches: ["design", "pitch", "agent", "education"],
            topicAnchors: [
                "design",
                "pitch",
                "agent",
                "conversational",
                "education",
                "student",
            ],
        },
    });

    assert.equal(
        result[0].draftLabel.includes("solution-driven system logic")
            || result[0].draftLabel.includes("formal representation"),
        true,
    );
});
