import { theme } from "../design/theme";
import type { ArtifactProfile, EpistemicProfile } from "../types/keyword";
import type { InterpretationSummary } from "../types/framing";
import { useI18n } from "../i18n/useI18n";

interface FramingInterpretationSummaryProps {
    interpretationSummary: InterpretationSummary;
    epistemicProfile: EpistemicProfile;
    artifactProfile: ArtifactProfile;
}

function topKey<K extends string>(profile: Record<K, number>): K {
    return (Object.entries(profile) as [K, number][])
        .sort(([, a], [, b]) => b - a)[0][0];
}

export default function FramingInterpretationSummary({
    interpretationSummary,
    epistemicProfile,
    artifactProfile,
}: FramingInterpretationSummaryProps) {
    const { t } = useI18n();
    const dominantEpistemic = topKey(epistemicProfile);
    const dominantArtifact = topKey(artifactProfile);

    return (
        <div className={theme.components.innerCard}>
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className={`${theme.typography.subheading} mb-1`}>
                        {t("interpretation.title")}
                    </h3>
                    <p className={theme.typography.body}>
                        {t("interpretation.subtitle")}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    <span className={theme.components.badge}>
                        {t("interpretation.epistemic")}: {t(`orientation.${dominantEpistemic}` as const)}
                    </span>
                    <span className={theme.components.badge}>
                        {t("interpretation.artifact")}: {t(`artifact.${dominantArtifact}` as const)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <div className={`${theme.typography.label} mb-1`}>{t("interpretation.topic")}</div>
                    <p className={theme.typography.body}>{interpretationSummary.topic_summary}</p>
                </div>
                <div>
                    <div className={`${theme.typography.label} mb-1`}>{t("interpretation.context")}</div>
                    <p className={theme.typography.body}>{interpretationSummary.context_summary}</p>
                </div>
                <div>
                    <div className={`${theme.typography.label} mb-1`}>{t("interpretation.goal")}</div>
                    <p className={theme.typography.body}>{interpretationSummary.goal_summary}</p>
                </div>
                <div>
                    <div className={`${theme.typography.label} mb-1`}>{t("interpretation.direction")}</div>
                    <p className={theme.typography.body}>{interpretationSummary.inferred_research_direction}</p>
                </div>
            </div>

            {interpretationSummary.method_constraints_summary && (
                <div className="mb-4">
                    <div className={`${theme.typography.label} mb-1`}>{t("interpretation.constraints")}</div>
                    <p className={theme.typography.body}>{interpretationSummary.method_constraints_summary}</p>
                </div>
            )}

            <div className="mb-4">
                <div className={`${theme.typography.label} mb-1`}>{t("interpretation.contribution_mode")}</div>
                <p className={theme.typography.body}>{interpretationSummary.inferred_contribution_mode}</p>
            </div>

            <div className="mb-4">
                <div className={`${theme.typography.label} mb-2`}>{t("interpretation.steering_keywords")}</div>
                <div className="flex flex-wrap gap-2">
                    {interpretationSummary.steering_keywords.map((keyword) => (
                        <span key={keyword} className={theme.components.badge}>
                            {keyword}
                        </span>
                    ))}
                </div>
            </div>

            {interpretationSummary.possible_risks.length > 0 && (
                <div>
                    <div className={`${theme.typography.label} mb-1`}>{t("interpretation.risks")}</div>
                    <ul className="space-y-1">
                        {interpretationSummary.possible_risks.map((risk) => (
                            <li key={risk} className={theme.typography.body}>
                                {risk}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
