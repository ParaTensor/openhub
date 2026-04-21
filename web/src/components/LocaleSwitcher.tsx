import React from 'react';
import {Check, ChevronDown, Globe} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '../lib/utils';
import {changeAppLanguage} from '../i18n';

const LOCALE_OPTIONS = [
  {code: 'en' as const, label: 'English'},
  {code: 'zh' as const, label: '中文'},
  {code: 'ja' as const, label: '日本語'},
  {code: 'ko' as const, label: '한국어'},
];

function normalizeLocaleCode(lang: string | undefined): (typeof LOCALE_OPTIONS)[number]['code'] {
  const l = lang ?? 'en';
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('ja')) return 'ja';
  if (l.startsWith('ko')) return 'ko';
  return 'en';
}

type LocaleSwitcherProps = {
  /** Extra classes on the outer relative wrapper */
  className?: string;
};

export default function LocaleSwitcher({className}: LocaleSwitcherProps) {
  const {t, i18n} = useTranslation();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeLocale = normalizeLocaleCode(i18n.resolvedLanguage ?? i18n.language);
  const activeLabel = LOCALE_OPTIONS.find((x) => x.code === activeLocale)?.label ?? 'English';

  return (
    <div ref={rootRef} className={cn('relative flex items-center', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('landing.lang_menu_button_aria', {current: activeLabel})}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 sm:text-sm"
      >
        <Globe className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        <span className="max-w-[5.5rem] truncate sm:max-w-none">{activeLabel}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform sm:h-4 sm:w-4', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('landing.lang_list_aria')}
          className="absolute right-0 top-[calc(100%+0.375rem)] z-[60] min-w-[11rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-sm shadow-lg shadow-zinc-200/80"
        >
          {LOCALE_OPTIONS.map(({code, label}) => (
            <li key={code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={code === activeLocale}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50"
                onClick={() => {
                  void changeAppLanguage(code);
                  setOpen(false);
                }}
              >
                <span className="flex-1">{label}</span>
                {code === activeLocale ? <Check className="h-4 w-4 shrink-0 text-purple-600" /> : <span className="w-4 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
