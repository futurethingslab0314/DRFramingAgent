import { createContext } from "react";
import type { Language, TranslationKey } from "./messages";

export interface I18nValue {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);
