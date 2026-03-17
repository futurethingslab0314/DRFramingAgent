import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const pageSource = readFileSync(
    path.join(workspaceRoot, "src/pages/FramingPage.tsx"),
    "utf8",
);
const chatPanelSource = readFileSync(
    path.join(workspaceRoot, "src/components/ChatPanel.tsx"),
    "utf8",
);

test("framing sidebar uses ChatPanel as the only scroll owner", () => {
    assert.match(
        pageSource,
        /className=\{`\$\{theme\.layout\.asideWidth\} flex min-h-0 flex-col border-r \$\{theme\.layout\.glassBorder\} p-4`\}/,
    );
    assert.doesNotMatch(
        pageSource,
        /className=\{`\$\{theme\.layout\.asideWidth\}[^`]*overflow-y-auto[^`]*`\}/,
    );
});

test("ChatPanel reserves full height and keeps footer outside the scroll area", () => {
    assert.match(
        chatPanelSource,
        /theme\.components\.glassCard\} flex h-full min-h-0 flex-col overflow-hidden/,
    );
    assert.match(
        chatPanelSource,
        /flex-1 min-h-0 space-y-5 overflow-y-auto pr-1 pb-6 \$\{theme\.layout\.scrollbar\}/,
    );
    assert.match(
        chatPanelSource,
        /className="mt-4 shrink-0 border-t border-slate-800\/70 pt-4"/,
    );
});
