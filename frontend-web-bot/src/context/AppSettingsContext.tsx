import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { translations, type Locale, type Theme, type TranslationStrings } from '../i18n/translations';
import { getBotMode, type BotMode } from '../utils/botMode';
import { portfolioWhatsAppWelcomeLine } from '../utils/whatsappLink';

const THEME_KEY = 'webbot-theme';
const LOCALE_KEY = 'webbot-locale';
const WHATSAPP_PHONE = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.trim();

type AppSettingsContextValue = {
  theme: Theme;
  locale: Locale;
  botMode: BotMode;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: TranslationStrings;
  welcomeMessage: string;
  subtitle: string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  return navigator.language.startsWith('es') ? 'es' : 'en';
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);
  const botMode = useMemo(() => getBotMode(), []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'es' ? 'en' : 'es');
  }, [locale, setLocale]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.lang = locale;
  }, [theme, locale]);

  const value = useMemo<AppSettingsContextValue>(
    () => {
      const strings = translations[locale];
      const isPortfolio = botMode === 'portfolio';
      const whatsappLine =
        isPortfolio && WHATSAPP_PHONE ? portfolioWhatsAppWelcomeLine(locale, WHATSAPP_PHONE) : '';
      const portfolioWelcome = strings.welcomePortfolio.replace('{{whatsapp}}', whatsappLine);
      return {
        theme,
        locale,
        botMode,
        setTheme,
        toggleTheme,
        setLocale,
        toggleLocale,
        t: strings,
        welcomeMessage: isPortfolio ? portfolioWelcome : strings.welcomeStandalone,
        subtitle: isPortfolio ? strings.subtitlePortfolio : strings.subtitleStandalone,
      };
    },
    [theme, locale, botMode, setTheme, toggleTheme, setLocale, toggleLocale]
  );

  return (
    <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
