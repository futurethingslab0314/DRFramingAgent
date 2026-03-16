import test from "node:test";
import assert from "node:assert/strict";

import { buildStructuredContextCandidates } from "./contextCandidates.js";

test("buildStructuredContextCandidates generates setting-oriented contexts from actor and activity cues", () => {
    const result = buildStructuredContextCandidates({
        ideaSeed:
            "I want to make a conversational agent that helps design students practice design pitch",
        signalSet: {
            dominantOrientation: "constructive",
            weightedKeywords: [
                {
                    term: "design education",
                    weight: 0.95,
                    orientation: "constructive",
                    artifactRole: "epistemic_mediator",
                },
                {
                    term: "critique culture",
                    weight: 0.75,
                    orientation: "critical",
                    artifactRole: "critique_device",
                },
            ],
            actorCues: ["students"],
            activityCues: ["practice", "pitch"],
            settingCues: ["classroom"],
            domainCues: ["design"],
            artifactCues: ["agent"],
            topicAnchors: ["design", "students", "practice", "pitch", "agent"],
        },
    });

    assert.equal(result[0]?.contextType, "setting_oriented");
    assert.equal(result.some((candidate) => candidate.label.includes("students")), true);
});

test("setting-oriented contexts rank above abstract research frames for top results", () => {
    const result = buildStructuredContextCandidates({
        ideaSeed:
            "a conversational agent for design students to practice pitch presentations",
        signalSet: {
            dominantOrientation: "constructive",
            weightedKeywords: [
                {
                    term: "design education",
                    weight: 0.95,
                    orientation: "constructive",
                    artifactRole: "epistemic_mediator",
                },
                {
                    term: "AI-mediated learning",
                    weight: 0.8,
                    orientation: "problem_solving",
                    artifactRole: "solution_system",
                },
            ],
            actorCues: ["students"],
            activityCues: ["practice", "pitch"],
            settingCues: ["classroom"],
            domainCues: ["design"],
            artifactCues: ["agent"],
            topicAnchors: ["design", "students", "pitch", "agent"],
        },
    });

    assert.equal(result[0]?.contextType, "setting_oriented");
    assert.equal(result[0]?.label.includes("students"), true);
});

test("buildStructuredContextCandidates falls back to a topic-anchored context when signals are sparse", () => {
    const result = buildStructuredContextCandidates({
        ideaSeed: "tool for design students",
        signalSet: {
            dominantOrientation: "constructive",
            weightedKeywords: [
                {
                    term: "design education",
                    weight: 0.9,
                    orientation: "constructive",
                    artifactRole: "epistemic_mediator",
                },
            ],
            actorCues: ["students"],
            activityCues: [],
            settingCues: [],
            domainCues: ["design"],
            artifactCues: ["tool"],
            topicAnchors: ["tool", "design", "students"],
        },
    });

    assert.equal(result.length > 0, true);
    assert.equal(result[0]?.label.toLowerCase().includes("students"), true);
});
