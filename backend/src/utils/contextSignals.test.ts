import test from "node:test";
import assert from "node:assert/strict";

import { extractContextSignals } from "./contextSignals.js";

test("extractContextSignals derives actor, activity, domain, artifact, and topic anchors from idea seed", () => {
    const signalSet = extractContextSignals({
        ideaSeed:
            "I want to build a conversational agent for design students to rehearse design pitches in class",
        keywords: [
            {
                term: "design education",
                orientation: "constructive",
                artifact_role: "epistemic_mediator",
                weight: 1,
                active: true,
            },
        ],
    });

    assert.equal(signalSet.actorCues.includes("students"), true);
    assert.equal(signalSet.activityCues.includes("pitch"), true);
    assert.equal(signalSet.domainCues.includes("design"), true);
    assert.equal(signalSet.artifactCues.includes("agent"), true);
    assert.equal(signalSet.topicAnchors.includes("conversational"), true);
});
