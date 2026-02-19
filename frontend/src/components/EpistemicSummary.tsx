// ═══════════════════════════════════════════════════════════════
// EpistemicSummary — profile bars styled with NOVAFRAME theme
// ═══════════════════════════════════════════════════════════════

import { theme } from "../design/theme";
import type { EpistemicProfile, ArtifactProfile } from "../types/keyword";
import { ORIENTATION_COLORS, ARTIFACT_ROLE_COLORS } from "../types/keyword";

interface EpistemicSummaryProps {
    epistemicProfile: EpistemicProfile;
    artifactProfile: ArtifactProfile;
}

function Bar({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="flex items-center gap-2 mb-1.5">
            <span
                className={theme.typography.mono}
                style={{
                    width: 110,
                    color: theme.colors.text.dim,
                    flexShrink: 0,
                }}
            >
                {label.replace(/_/g, " ")}
            </span>
            <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: `${color}22` }}
            >
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${Math.round(value * 100)}%`,
                        backgroundColor: color,
                        transition: "width 400ms ease",
                    }}
                />
            </div>
            <span
                className={theme.typography.mono}
                style={{
                    width: 32,
                    textAlign: "right",
                    color: theme.colors.text.normal,
                }}
            >
                {(value * 100).toFixed(0)}%
            </span>
        </div>
    );
}

export default function EpistemicSummary({
    epistemicProfile,
    artifactProfile,
}: EpistemicSummaryProps) {
    return (
        <div className={theme.components.innerCard}>
            {/* Epistemic */}
            <section className="mb-4">
                <h4
                    className={`${theme.typography.subheading} mb-2`}
                >
                    Epistemic Profile
                </h4>
                {(
                    Object.entries(epistemicProfile) as [
                        keyof EpistemicProfile,
                        number,
                    ][]
                ).map(([key, val]) => (
                    <Bar
                        key={key}
                        label={key}
                        value={val}
                        color={ORIENTATION_COLORS[key]}
                    />
                ))}
            </section>

            {/* Artifact */}
            <section>
                <h4
                    className={`${theme.typography.subheading} mb-2`}
                >
                    Artifact Profile
                </h4>
                {(
                    Object.entries(artifactProfile) as [
                        keyof ArtifactProfile,
                        number,
                    ][]
                ).map(([key, val]) => (
                    <Bar
                        key={key}
                        label={key}
                        value={val}
                        color={
                            ARTIFACT_ROLE_COLORS[
                            key as keyof typeof ARTIFACT_ROLE_COLORS
                            ] ?? theme.colors.text.muted
                        }
                    />
                ))}
            </section>
        </div>
    );
}
