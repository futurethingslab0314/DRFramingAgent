import { useCallback, useMemo, useState, type ReactNode } from "react";
import { I18nContext } from "./context";
import { messages, type Language, type TranslationKey } from "./messages";

const STORAGE_KEY = "drframingagent-language";

function getInitialLanguage(): Language {
    if (typeof window === "undefined") {
        return "en";
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "zh" ? "zh" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(getInitialLanguage);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        window.localStorage.setItem(STORAGE_KEY, lang);
    }, []);

    const t = useCallback(
        (key: TranslationKey) => messages[language][key] ?? messages.en[key],
        [language],
    );

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            t,
        }),
        [language, setLanguage, t],
    );

    return (
        <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    );
}
