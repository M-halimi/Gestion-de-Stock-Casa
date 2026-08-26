import Dropdown from './Dropdown';
import { useTranslation } from 'react-i18next';
import { changeLocale, supportedLocales } from '../i18n';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const current = supportedLocales.find((l) => l.code === i18n.language) ?? supportedLocales[0];

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button
                    type="button"
                    aria-label="Language"
                    className="flex h-9 items-center gap-2 rounded-md border border-hairline-input bg-canvas px-3 text-[14px] font-normal text-ink shadow-sm transition-colors hover:border-ink-mute focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <svg
                        className="h-4 w-4 shrink-0 text-ink-mute"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0a8.949 8.949 0 003-1.5 8.949 8.949 0 000-15A8.949 8.949 0 0012 3a8.949 8.949 0 000 15 8.949 8.949 0 003 1.5zM3 12h18"
                        />
                    </svg>
                    <span className="hidden leading-none sm:inline">{current.label}</span>
                    <svg
                        className="h-3.5 w-3.5 shrink-0 text-ink-mute"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="right">
                {supportedLocales.map((locale) => (
                    <button
                        key={locale.code}
                        type="button"
                        onClick={() => changeLocale(locale.code)}
                        className="block w-full px-4 py-2 text-start text-[14px] font-normal leading-5 text-ink transition duration-150 ease-in-out hover:bg-canvas-soft focus:bg-canvas-soft focus:outline-none"
                    >
                        {locale.label}
                    </button>
                ))}
            </Dropdown.Content>
        </Dropdown>
    );
}